import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  onSnapshot,
  query,
  where,
  setLogLevel,
  terminate
} from 'firebase/firestore';

process.env.DISABLE_HMR = 'true';

try {
  setLogLevel('silent');
} catch {
  // ignore
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const FILES_DIR = path.join(DATA_DIR, 'files');
const STORE_FILE = path.join(DATA_DIR, 'realtime-store.json');
const FIREBASE_CONFIG_FILE = path.join(__dirname, 'firebase-applet-config.json');

// Initialize Firebase Firestore on Server for cross-container (ais-dev <-> ais-pre) & cross-device persistence
let firestoreDb: ReturnType<typeof getFirestore> | null = null;
let serverFirestoreUnavailable = false;
const lastServerFirestoreSerialized = new Map<string, string>();

function tripServerFirestoreBreaker() {
  if (serverFirestoreUnavailable) return;
  serverFirestoreUnavailable = true;
  if (firestoreDb) {
    try {
      terminate(firestoreDb).catch(() => {});
    } catch {
      // ignore
    }
  }
}

try {
  if (fs.existsSync(FIREBASE_CONFIG_FILE)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_FILE, 'utf-8'));
    if (firebaseConfig && firebaseConfig.projectId) {
      const fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      firestoreDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
    }
  }
} catch {
  serverFirestoreUnavailable = true;
}

const KV_COLLECTION = 'realtime_kv';
const CHUNKS_COLLECTION = 'realtime_kv_chunks';
const SINGLE_DOC_MAX_CHARS = 650000;
const MAX_FIRESTORE_CHUNKS = 25;

// Legacy Google Apps Script fallback constants
const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbzol007NNSB5uYI_no15j6GB5Ej3IQ2MuN50Sud7mQKMYloHBYxoxv6N8PVLgSfsNjlZw/exec';
const MASTER_SPREADSHEET_ID = '1mVJl2FSHiJmQlOR8t-7h1Z4wXfbMWepUU_Qzkd1FSAM';
const CLOUD_KV_SHEET = 'RealtimeCloudKV';
const CHUNK_SIZE = 38000;
const MAX_CHUNKS = 12;

interface PersistedState {
  rev: number;
  store: Record<string, any>;
  timestamps: Record<string, number>;
}

// Ensure .data and .data/files directories exist
for (const dir of [DATA_DIR, FILES_DIR]) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }
}

interface HostedFileRecord {
  id: string;
  fileName: string;
  dataUrl: string;
  driveFileId?: string;
  driveUrl?: string;
  downloadUrl?: string;
  taskId?: string;
  memberId?: string;
  schoolId?: string;
  updatedAt: number;
}

const hostedFilesMemCache = new Map<string, HostedFileRecord>();

async function saveHostedFileToFirestoreChunks(record: HostedFileRecord): Promise<void> {
  if (!firestoreDb || serverFirestoreUnavailable || !record.id || !record.dataUrl) return;
  try {
    const safeId = String(record.id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const parentKey = `fblob_${safeId}`;
    const payloadStr = JSON.stringify({
      id: record.id,
      fileName: record.fileName,
      dataUrl: record.dataUrl,
      driveFileId: record.driveFileId || '',
      driveUrl: record.driveUrl || '',
      updatedAt: record.updatedAt
    });
    const CHUNK_LEN = 650000;
    const chunks: string[] = [];
    for (let i = 0; i < payloadStr.length; i += CHUNK_LEN) {
      chunks.push(payloadStr.slice(i, i + CHUNK_LEN));
    }
    if (chunks.length > 24) return;
    const nowTs = record.updatedAt || Date.now();
    // Part 0 stores manifest + first slice if small, or manifest in part 0 and slices in 1..N
    const metaStr = JSON.stringify({
      totalParts: chunks.length,
      fileName: record.fileName,
      driveFileId: record.driveFileId || ''
    });
    await setDoc(doc(firestoreDb, CHUNKS_COLLECTION, `${parentKey}__p0`), {
      id: `${parentKey}__p0`,
      parentKey,
      partIndex: 0,
      data: metaStr,
      updatedAt: nowTs
    });
    for (let idx = 0; idx < chunks.length; idx++) {
      const partIdx = idx + 1;
      const chunkId = `${parentKey}__p${partIdx}`;
      await setDoc(doc(firestoreDb, CHUNKS_COLLECTION, chunkId), {
        id: chunkId,
        parentKey,
        partIndex: partIdx,
        data: chunks[idx],
        updatedAt: nowTs
      });
    }
  } catch {
    // ignore Firestore chunk backup error
  }
}

async function loadHostedFileFromFirestoreChunks(fileId: string): Promise<HostedFileRecord | null> {
  if (!firestoreDb || serverFirestoreUnavailable || !fileId) return null;
  try {
    const safeId = String(fileId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const parentKey = `fblob_${safeId}`;
    const metaSnap = await getDoc(doc(firestoreDb, CHUNKS_COLLECTION, `${parentKey}__p0`));
    if (!metaSnap.exists()) return null;
    const metaData = metaSnap.data();
    const meta = JSON.parse(String(metaData.data || '{}'));
    const totalParts = Number(meta.totalParts) || 0;
    if (totalParts <= 0 || totalParts > 25) return null;
    const parts: string[] = [];
    for (let idx = 0; idx < totalParts; idx++) {
      const partIdx = idx + 1;
      const snap = await getDoc(doc(firestoreDb, CHUNKS_COLLECTION, `${parentKey}__p${partIdx}`));
      if (!snap.exists()) return null;
      parts.push(String(snap.data().data || ''));
    }
    const parsed = JSON.parse(parts.join('')) as HostedFileRecord;
    if (parsed && parsed.dataUrl) {
      hostedFilesMemCache.set(safeId, parsed);
      try {
        fs.writeFileSync(path.join(FILES_DIR, `${safeId}.json`), JSON.stringify(parsed), 'utf-8');
      } catch {}
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveServerHostedFile(
  fileId: string,
  fileName: string,
  dataUrl: string,
  extraMeta?: Partial<HostedFileRecord>
): string {
  const safeId = String(fileId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safeId || !dataUrl || !dataUrl.startsWith('data:')) return '';
  try {
    const existing = loadServerHostedFile(safeId);
    const record: HostedFileRecord = {
      ...(existing || {}),
      ...(extraMeta || {}),
      id: safeId,
      fileName: fileName || existing?.fileName || safeId,
      dataUrl,
      updatedAt: Date.now()
    };
    hostedFilesMemCache.set(safeId, record);
    const filePath = path.join(FILES_DIR, `${safeId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record), 'utf-8');
    saveHostedFileToFirestoreChunks(record).catch(() => {});
    return `/api/files/${safeId}`;
  } catch {
    return '';
  }
}

function updateServerHostedFileMeta(fileId: string, meta: Partial<HostedFileRecord>): void {
  const safeId = String(fileId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safeId) return;
  const existing = loadServerHostedFile(safeId);
  if (!existing) return;
  const updated: HostedFileRecord = { ...existing, ...meta, updatedAt: Date.now() };
  hostedFilesMemCache.set(safeId, updated);
  try {
    fs.writeFileSync(path.join(FILES_DIR, `${safeId}.json`), JSON.stringify(updated), 'utf-8');
  } catch {}
}

function loadServerHostedFile(fileId: string): HostedFileRecord | null {
  const safeId = String(fileId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safeId) return null;
  if (hostedFilesMemCache.has(safeId)) {
    return hostedFilesMemCache.get(safeId)!;
  }
  try {
    const filePath = path.join(FILES_DIR, `${safeId}.json`);
    if (!fs.existsSync(filePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as HostedFileRecord;
    if (parsed && parsed.dataUrl) {
      hostedFilesMemCache.set(safeId, parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

async function loadServerHostedFileAsync(fileId: string): Promise<HostedFileRecord | null> {
  const local = loadServerHostedFile(fileId);
  if (local && local.dataUrl) return local;
  return await loadHostedFileFromFirestoreChunks(fileId);
}

function findServerHostedFileByMatch(opts: {
  driveId?: string;
  fileName?: string;
  taskId?: string;
  memberId?: string;
}): HostedFileRecord | null {
  const { driveId, fileName, taskId, memberId } = opts;
  if (taskId && memberId) {
    const tClean = String(taskId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const mClean = String(memberId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const bySubId = loadServerHostedFile(`sub_${tClean}_${mClean}`);
    if (bySubId && bySubId.dataUrl) return bySubId;
  }

  const cleanName = (fileName || '').trim().toLowerCase();
  const cleanDriveId = (driveId || '').trim();

  // Check memory cache first
  for (const rec of hostedFilesMemCache.values()) {
    if (!rec || !rec.dataUrl) continue;
    if (cleanDriveId && rec.driveFileId === cleanDriveId) return rec;
    if (cleanName && cleanName !== 'download' && String(rec.fileName || '').trim().toLowerCase() === cleanName) {
      return rec;
    }
  }

  // Scan FILES_DIR on disk
  try {
    if (fs.existsSync(FILES_DIR)) {
      const files = fs.readdirSync(FILES_DIR);
      for (let i = files.length - 1; i >= 0; i--) {
        const f = files[i];
        if (!f.endsWith('.json')) continue;
        const id = f.slice(0, -5);
        const rec = loadServerHostedFile(id);
        if (!rec || !rec.dataUrl) continue;
        if (cleanDriveId && rec.driveFileId === cleanDriveId) return rec;
        if (cleanName && cleanName !== 'download' && String(rec.fileName || '').trim().toLowerCase() === cleanName) {
          return rec;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function deleteServerHostedFile(fileId: string): boolean {
  const safeId = String(fileId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safeId) return false;
  hostedFilesMemCache.delete(safeId);
  try {
    const filePath = path.join(FILES_DIR, `${safeId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

// Server-side Tombstones & Recent Mutation Protection
const deletedDocIdsServer = new Set<string>();
const deletedTaskIdsServer = new Set<string>();
const deletedSubmissionKeysServer = new Set<string>();
const deletedLeaveIdsServer = new Set<string>();
const deletedDutyLogIdsServer = new Set<string>();
const deletedSubjectIdsServer = new Set<string>();
const recentServerMutationTs = new Map<string, number>();

function makeSubTombstoneKeyServer(taskId: string, identifier?: string): string {
  if (!taskId || !identifier) return '';
  return `${taskId.trim()}__${String(identifier).trim().toLowerCase().replace(/\s+/g, '')}`;
}

function isSubmissionKeyDeletedServer(taskId: string, ...identifiers: (string | undefined)[]): boolean {
  if (!taskId) return false;
  for (const id of identifiers) {
    if (!id) continue;
    const k = makeSubTombstoneKeyServer(taskId, id);
    if (k && deletedSubmissionKeysServer.has(k)) return true;
  }
  return false;
}

function isSubjectKeyName(key: string): boolean {
  return key === 'ams_subjects' || key.startsWith('ams_subjects__');
}

function addSubjectTombstoneServer(rawId: any): void {
  const strId = String(rawId || '').trim();
  if (strId && !strId.startsWith('subkey:') && !strId.startsWith('subcode:')) {
    deletedSubjectIdsServer.add(strId);
  }
}

function isSubjectDeletedServer(s: any): boolean {
  if (!s || !s.id) return true;
  return deletedSubjectIdsServer.has(String(s.id));
}

function filterSubjectListServer(list: any): any[] {
  if (!Array.isArray(list)) return [];
  return list.filter(s => !isSubjectDeletedServer(s));
}

function mergeSubjectListsServer(existingList: any, incomingList: any): any[] {
  if (!Array.isArray(incomingList)) {
    return Array.isArray(existingList)
      ? existingList.filter(s => !isSubjectDeletedServer(s))
      : [];
  }
  if (!Array.isArray(existingList) || existingList.length === 0) {
    return incomingList.filter(s => !isSubjectDeletedServer(s));
  }

  const existingMap = new Map<string, any>();
  for (const s of existingList) {
    if (!isSubjectDeletedServer(s)) {
      existingMap.set(String(s.id), s);
    }
  }

  const result: any[] = [];
  const handledIds = new Set<string>();

  for (const inc of incomingList) {
    if (isSubjectDeletedServer(inc)) continue;
    const sId = String(inc.id);
    if (handledIds.has(sId)) continue;
    handledIds.add(sId);
    const ex = existingMap.get(sId);
    if (ex) {
      result.push({ ...ex, ...inc });
    } else {
      result.push(inc);
    }
  }

  // Preserve any subject that exists in existingList but has not reached incomingList yet (prevents disappearing newly created subjects)
  for (const ex of existingList) {
    if (isSubjectDeletedServer(ex)) continue;
    const sId = String(ex.id);
    if (!handledIds.has(sId)) {
      handledIds.add(sId);
      result.unshift(ex);
    }
  }

  return result;
}

function isLeaveKeyName(key: string): boolean {
  return key === 'ams_leave_requests_v1' || key.startsWith('ams_leave_requests_v1__');
}

function mergeLeaveListsServer(existingList: any, incomingList: any): any[] {
  if (!Array.isArray(incomingList)) {
    return Array.isArray(existingList)
      ? existingList.filter(l => l && l.id && !deletedLeaveIdsServer.has(String(l.id)))
      : [];
  }
  if (!Array.isArray(existingList) || existingList.length === 0) {
    return incomingList.filter(l => l && l.id && !deletedLeaveIdsServer.has(String(l.id)));
  }

  const existingMap = new Map<string, any>();
  for (const l of existingList) {
    if (l && l.id && !deletedLeaveIdsServer.has(String(l.id))) {
      existingMap.set(String(l.id), l);
    }
  }

  const result: any[] = [];
  const handledIds = new Set<string>();

  for (const inc of incomingList) {
    if (!inc || !inc.id || deletedLeaveIdsServer.has(String(inc.id))) continue;
    const lId = String(inc.id);
    handledIds.add(lId);
    const ex = existingMap.get(lId);
    if (ex) {
      result.push({ ...ex, ...inc });
    } else {
      result.push(inc);
    }
  }

  // Preserve any leave request that exists in existingList but has not reached incomingList yet (prevents disappearing leave requests)
  for (const ex of existingList) {
    if (!ex || !ex.id) continue;
    const lId = String(ex.id);
    if (!handledIds.has(lId) && !deletedLeaveIdsServer.has(lId)) {
      result.push(ex);
    }
  }

  return result;
}

function isDutyLogKeyName(key: string): boolean {
  return key === 'ams_daily_duty_logs_v1' || key.startsWith('ams_daily_duty_logs_v1__');
}

function mergeDutyLogListsServer(existingList: any, incomingList: any): any[] {
  if (!Array.isArray(incomingList)) {
    return Array.isArray(existingList)
      ? existingList.filter(d => d && d.id && !deletedDutyLogIdsServer.has(String(d.id)))
      : [];
  }
  if (!Array.isArray(existingList) || existingList.length === 0) {
    return incomingList.filter(d => d && d.id && !deletedDutyLogIdsServer.has(String(d.id)));
  }

  const existingMap = new Map<string, any>();
  for (const d of existingList) {
    if (d && d.id && !deletedDutyLogIdsServer.has(String(d.id))) {
      existingMap.set(String(d.id), d);
    }
  }

  const result: any[] = [];
  const handledIds = new Set<string>();

  for (const inc of incomingList) {
    if (!inc || !inc.id || deletedDutyLogIdsServer.has(String(inc.id))) continue;
    const dId = String(inc.id);
    handledIds.add(dId);
    const ex = existingMap.get(dId);
    if (ex) {
      const exTime = ex.createdAt ? new Date(ex.createdAt).getTime() : 0;
      const incTime = inc.createdAt ? new Date(inc.createdAt).getTime() : 0;
      result.push(exTime > incTime ? { ...inc, ...ex } : { ...ex, ...inc });
    } else {
      result.push(inc);
    }
  }

  // Preserve any duty log that exists in existingList but has not reached incomingList yet (prevents disappearing duty logs)
  for (const ex of existingList) {
    if (!ex || !ex.id) continue;
    const dId = String(ex.id);
    if (!handledIds.has(dId) && !deletedDutyLogIdsServer.has(dId)) {
      result.unshift(ex);
    }
  }

  return result;
}

// Load initial state from disk
let state: PersistedState = {
  rev: 1,
  store: {},
  timestamps: {}
};

if (fs.existsSync(STORE_FILE)) {
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.store === 'object') {
      state = {
        rev: Number(parsed.rev) || 1,
        store: parsed.store || {},
        timestamps: parsed.timestamps || {}
      };
      const now = Date.now();
      for (const k of Object.keys(state.store)) {
        if (!state.timestamps[k]) {
          state.timestamps[k] = now - 60000;
        }
      }
      if (Array.isArray(state.store['ams_deleted_doc_ids'])) {
        for (const id of state.store['ams_deleted_doc_ids']) {
          if (id) deletedDocIdsServer.add(String(id));
        }
      }
      if (Array.isArray(state.store['ams_deleted_task_ids'])) {
        for (const id of state.store['ams_deleted_task_ids']) {
          if (id) deletedTaskIdsServer.add(String(id));
        }
      }
      if (Array.isArray(state.store['ams_deleted_submission_keys'])) {
        for (const k of state.store['ams_deleted_submission_keys']) {
          if (k) deletedSubmissionKeysServer.add(String(k));
        }
      }
      if (Array.isArray(state.store['ams_deleted_leave_ids'])) {
        for (const id of state.store['ams_deleted_leave_ids']) {
          if (id) deletedLeaveIdsServer.add(String(id));
        }
      }
      if (Array.isArray(state.store['ams_deleted_duty_log_ids'])) {
        for (const id of state.store['ams_deleted_duty_log_ids']) {
          if (id) deletedDutyLogIdsServer.add(String(id));
        }
      }
      if (Array.isArray(state.store['ams_deleted_subject_ids'])) {
        for (const id of state.store['ams_deleted_subject_ids']) {
          addSubjectTombstoneServer(id);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load persisted realtime store, starting fresh:', err);
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleDiskSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(state), 'utf-8');
    } catch (err) {
      console.warn('Failed to write realtime store to disk:', err);
    }
  }, 120);
}

// Connected SSE Clients for instant real-time broadcast across all devices & browsers
const sseClients = new Set<express.Response>();

function broadcastDelta(clientId: string, updates: Record<string, any>, timestamps: Record<string, number>) {
  const payload = JSON.stringify({
    type: 'delta',
    rev: state.rev,
    clientId,
    updates,
    timestamps,
    serverTime: Date.now()
  });
  const message = `data: ${payload}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(message);
    } catch {
      sseClients.delete(res);
    }
  }
}

// ============================================================================
// FIREBASE FIRESTORE CLOUD SYNC (Primary Global Multi-Device / Multi-Email Store)
// ============================================================================
function sanitizeDocKey(rawKey: string): string {
  const cleaned = String(rawKey || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned || 'default_key';
}

async function pushKeyToFirestoreServer(rawKey: string, value: any, updatedAt: number): Promise<void> {
  if (!firestoreDb || serverFirestoreUnavailable || !rawKey || rawKey === 'ams_session') return;
  const docId = sanitizeDocKey(rawKey);
  let serialized = JSON.stringify(value ?? null);
  if (!serialized) return;
  if (serialized.length > SINGLE_DOC_MAX_CHARS * MAX_FIRESTORE_CHUNKS) {
    serialized = JSON.stringify(sanitizeForCloudKv(value));
  }
  if (lastServerFirestoreSerialized.get(docId) === serialized) return;

  const safeUpdatedAt = Number(updatedAt) > 0 ? Number(updatedAt) : Date.now();

  try {
    if (serialized.length <= SINGLE_DOC_MAX_CHARS) {
      await setDoc(doc(firestoreDb, KV_COLLECTION, docId), {
        id: docId,
        valueJson: serialized,
        updatedAt: safeUpdatedAt,
        chunkCount: 0,
        clientId: 'server-node'
      });
      lastServerFirestoreSerialized.set(docId, serialized);
      return;
    }

    const chunks: string[] = [];
    for (let i = 0; i < serialized.length; i += SINGLE_DOC_MAX_CHARS) {
      chunks.push(serialized.slice(i, i + SINGLE_DOC_MAX_CHARS));
    }
    if (chunks.length > MAX_FIRESTORE_CHUNKS) return;

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkId = `${docId}__part_${idx}`;
      await setDoc(doc(firestoreDb, CHUNKS_COLLECTION, chunkId), {
        id: chunkId,
        parentKey: docId,
        partIndex: idx,
        data: chunks[idx],
        updatedAt: safeUpdatedAt
      });
    }

    await setDoc(doc(firestoreDb, KV_COLLECTION, docId), {
      id: docId,
      valueJson: '',
      updatedAt: safeUpdatedAt,
      chunkCount: chunks.length,
      clientId: 'server-node'
    });
    lastServerFirestoreSerialized.set(docId, serialized);
  } catch {
    tripServerFirestoreBreaker();
  }
}

async function resolveFirestoreDocServer(data: any): Promise<{ key: string; value: any; updatedAt: number } | null> {
  if (!firestoreDb || serverFirestoreUnavailable || !data || typeof data.id !== 'string') return null;
  const docId = data.id;
  const updatedAt = Number(data.updatedAt) || Date.now();
  const chunkCount = Number(data.chunkCount) || 0;

  try {
    let fullJson = typeof data.valueJson === 'string' ? data.valueJson : '';
    if (chunkCount > 0) {
      const parts: string[] = [];
      for (let idx = 0; idx < chunkCount; idx++) {
        const chunkSnap = await getDoc(doc(firestoreDb, CHUNKS_COLLECTION, `${docId}__part_${idx}`));
        if (!chunkSnap.exists()) return null;
        const cData = chunkSnap.data();
        parts.push(typeof cData.data === 'string' ? cData.data : '');
      }
      fullJson = parts.join('');
    }
    if (!fullJson) return null;
    lastServerFirestoreSerialized.set(docId, fullJson);
    return { key: docId, value: JSON.parse(fullJson), updatedAt };
  } catch {
    return null;
  }
}

let isSyncingFirestore = false;
async function syncWithFirestoreServer(seedMissingLocalToFirestore = false): Promise<number> {
  if (!firestoreDb || serverFirestoreUnavailable || isSyncingFirestore) return 0;
  isSyncingFirestore = true;
  let appliedCount = 0;

  try {
    const kvQuery = query(collection(firestoreDb, KV_COLLECTION), where('updatedAt', '>', 0));
    const snap = await getDocs(kvQuery);
    const remoteTimestamps = new Map<string, number>();
    const appliedUpdates: Record<string, any> = {};
    const appliedTimestamps: Record<string, number> = {};
    const keysToPushBack: string[] = [];

    const tasks: Promise<{ key: string; value: any; updatedAt: number } | null>[] = [];
    snap.forEach(docSnap => {
      tasks.push(resolveFirestoreDocServer(docSnap.data()));
    });

    const resolvedList = await Promise.all(tasks);
    const nowMs = Date.now();
    for (const item of resolvedList) {
      if (!item) continue;
      remoteTimestamps.set(item.key, item.updatedAt);

      if (item.key === 'ams_deleted_doc_ids' && Array.isArray(item.value)) {
        for (const id of item.value) {
          if (id) deletedDocIdsServer.add(String(id));
        }
      } else if (item.key === 'ams_deleted_task_ids' && Array.isArray(item.value)) {
        for (const id of item.value) {
          if (id) deletedTaskIdsServer.add(String(id));
        }
      } else if (item.key === 'ams_deleted_submission_keys' && Array.isArray(item.value)) {
        for (const k of item.value) {
          if (k) deletedSubmissionKeysServer.add(String(k));
        }
      } else if (item.key === 'ams_deleted_leave_ids' && Array.isArray(item.value)) {
        for (const id of item.value) {
          if (id) deletedLeaveIdsServer.add(String(id));
        }
      } else if (item.key === 'ams_deleted_duty_log_ids' && Array.isArray(item.value)) {
        for (const id of item.value) {
          if (id) deletedDutyLogIdsServer.add(String(id));
        }
      } else if (item.key === 'ams_deleted_subject_ids' && Array.isArray(item.value)) {
        for (const id of item.value) {
          addSubjectTombstoneServer(id);
        }
      }

      if (pendingCloudPushKeys.has(item.key) || inFlightCloudPushKeys.has(item.key)) continue;

      const localTs = Number(state.timestamps[item.key]) || 0;
      const lastMutated = recentServerMutationTs.get(item.key) || 0;
      if (nowMs - lastMutated < 15000 && item.updatedAt <= localTs) {
        continue;
      }

      const isTask = isTaskKeyName(item.key);
      const isDoc = isDocumentKeyName(item.key);
      const isLeave = isLeaveKeyName(item.key);
      const isDutyLog = isDutyLogKeyName(item.key);
      const isSub = isSubjectKeyName(item.key);
      const nextValue =
        isTask && item.key in state.store
          ? item.updatedAt >= localTs
            ? mergeTaskListsServer(state.store[item.key], item.value)
            : mergeTaskListsServer(item.value, state.store[item.key])
          : isDoc && item.key in state.store
          ? item.updatedAt >= localTs
            ? mergeDocumentListsServer(state.store[item.key], item.value)
            : mergeDocumentListsServer(item.value, state.store[item.key])
          : isLeave && item.key in state.store
          ? item.updatedAt >= localTs
            ? mergeLeaveListsServer(state.store[item.key], item.value)
            : mergeLeaveListsServer(item.value, state.store[item.key])
          : isDutyLog && item.key in state.store
          ? item.updatedAt >= localTs
            ? mergeDutyLogListsServer(state.store[item.key], item.value)
            : mergeDutyLogListsServer(item.value, state.store[item.key])
          : isSub && item.key in state.store
          ? item.updatedAt >= localTs
            ? mergeSubjectListsServer(state.store[item.key], item.value)
            : mergeSubjectListsServer(item.value, state.store[item.key])
          : isSub
          ? filterSubjectListServer(item.value)
          : item.value;
      const localSerialized = item.key in state.store ? JSON.stringify(state.store[item.key]) : undefined;
      const remoteSerialized = JSON.stringify(item.value);
      const nextSerialized = JSON.stringify(nextValue);

      if (!(item.key in state.store) || item.updatedAt > localTs || ((isTask || isDoc || isLeave || isDutyLog || isSub) && nextSerialized !== localSerialized)) {
        const effTs = Math.max(localTs, item.updatedAt || Date.now());
        state.store[item.key] = nextValue;
        state.timestamps[item.key] = effTs;
        if (localSerialized !== nextSerialized) {
          appliedUpdates[item.key] = nextValue;
          appliedTimestamps[item.key] = effTs;
          appliedCount++;
        }
      }
      if ((isTask || isDoc || isLeave || isDutyLog || isSub) && nextSerialized !== remoteSerialized) {
        keysToPushBack.push(item.key);
      }
    }

    if (appliedCount > 0) {
      state.rev += 1;
      scheduleDiskSave();
      broadcastDelta('firestore-cloud', appliedUpdates, appliedTimestamps);
    }

    if (keysToPushBack.length > 0) {
      scheduleCloudKvPush(keysToPushBack);
    }

    if (seedMissingLocalToFirestore && !serverFirestoreUnavailable) {
      for (const [key, val] of Object.entries(state.store)) {
        if (!key || key === 'ams_session' || serverFirestoreUnavailable) continue;
        const docId = sanitizeDocKey(key);
        if (!remoteTimestamps.has(docId)) {
          const localTs = Number(state.timestamps[key]) || Date.now();
          await pushKeyToFirestoreServer(key, val, localTs);
        }
      }
    }
  } catch {
    tripServerFirestoreBreaker();
  } finally {
    isSyncingFirestore = false;
  }

  return appliedCount;
}

function startServerFirestoreListener() {
  if (!firestoreDb || serverFirestoreUnavailable) return;
  try {
    const kvQuery = query(collection(firestoreDb, KV_COLLECTION), where('updatedAt', '>', 0));
    onSnapshot(
      kvQuery,
      async snapshot => {
        if (serverFirestoreUnavailable) return;
        const changes = snapshot.docChanges();
        if (changes.length === 0) return;

        const appliedUpdates: Record<string, any> = {};
        const appliedTimestamps: Record<string, number> = {};
        const nowMs = Date.now();

        for (const change of changes) {
          if (change.type === 'added' || change.type === 'modified') {
            const raw = change.doc.data();
            if (raw.clientId === 'server-node') continue;
            const resolved = await resolveFirestoreDocServer(raw);
            if (!resolved) continue;

            if (resolved.key === 'ams_deleted_doc_ids' && Array.isArray(resolved.value)) {
              for (const id of resolved.value) {
                if (id) deletedDocIdsServer.add(String(id));
              }
            } else if (resolved.key === 'ams_deleted_task_ids' && Array.isArray(resolved.value)) {
              for (const id of resolved.value) {
                if (id) deletedTaskIdsServer.add(String(id));
              }
            } else if (resolved.key === 'ams_deleted_submission_keys' && Array.isArray(resolved.value)) {
              for (const k of resolved.value) {
                if (k) deletedSubmissionKeysServer.add(String(k));
              }
            } else if (resolved.key === 'ams_deleted_leave_ids' && Array.isArray(resolved.value)) {
              for (const id of resolved.value) {
                if (id) deletedLeaveIdsServer.add(String(id));
              }
            } else if (resolved.key === 'ams_deleted_duty_log_ids' && Array.isArray(resolved.value)) {
              for (const id of resolved.value) {
                if (id) deletedDutyLogIdsServer.add(String(id));
              }
            } else if (resolved.key === 'ams_deleted_subject_ids' && Array.isArray(resolved.value)) {
              for (const id of resolved.value) {
                addSubjectTombstoneServer(id);
              }
            }

            if (pendingCloudPushKeys.has(resolved.key) || inFlightCloudPushKeys.has(resolved.key)) continue;

            const localTs = Number(state.timestamps[resolved.key]) || 0;
            const lastMutated = recentServerMutationTs.get(resolved.key) || 0;
            if (nowMs - lastMutated < 15000 && resolved.updatedAt <= localTs) {
              continue;
            }

            const isTask = isTaskKeyName(resolved.key);
            const isDoc = isDocumentKeyName(resolved.key);
            const isLeave = isLeaveKeyName(resolved.key);
            const isDutyLog = isDutyLogKeyName(resolved.key);
            const isSub = isSubjectKeyName(resolved.key);
            const nextValue =
              isTask && resolved.key in state.store
                ? resolved.updatedAt >= localTs
                  ? mergeTaskListsServer(state.store[resolved.key], resolved.value)
                  : mergeTaskListsServer(resolved.value, state.store[resolved.key])
                : isDoc && resolved.key in state.store
                ? resolved.updatedAt >= localTs
                  ? mergeDocumentListsServer(state.store[resolved.key], resolved.value)
                  : mergeDocumentListsServer(resolved.value, state.store[resolved.key])
                : isLeave && resolved.key in state.store
                ? resolved.updatedAt >= localTs
                  ? mergeLeaveListsServer(state.store[resolved.key], resolved.value)
                  : mergeLeaveListsServer(resolved.value, state.store[resolved.key])
                : isDutyLog && resolved.key in state.store
                ? resolved.updatedAt >= localTs
                  ? mergeDutyLogListsServer(state.store[resolved.key], resolved.value)
                  : mergeDutyLogListsServer(resolved.value, state.store[resolved.key])
                : isSub && resolved.key in state.store
                ? resolved.updatedAt >= localTs
                  ? mergeSubjectListsServer(state.store[resolved.key], resolved.value)
                  : mergeSubjectListsServer(resolved.value, state.store[resolved.key])
                : isSub
                ? filterSubjectListServer(resolved.value)
                : resolved.value;
            const prevSerialized =
              resolved.key in state.store ? JSON.stringify(state.store[resolved.key]) : undefined;
            const nextSerialized = JSON.stringify(nextValue);

            if (!(resolved.key in state.store) || resolved.updatedAt > localTs || ((isTask || isDoc || isLeave || isDutyLog || isSub) && prevSerialized !== nextSerialized)) {
              const effTs = Math.max(localTs, resolved.updatedAt || Date.now());
              state.store[resolved.key] = nextValue;
              state.timestamps[resolved.key] = effTs;
              if (prevSerialized !== nextSerialized) {
                appliedUpdates[resolved.key] = nextValue;
                appliedTimestamps[resolved.key] = effTs;
              }
            }
          }
        }

        if (Object.keys(appliedUpdates).length > 0) {
          state.rev += 1;
          scheduleDiskSave();
          broadcastDelta('firestore-live', appliedUpdates, appliedTimestamps);
        }
      },
      () => {
        tripServerFirestoreBreaker();
      }
    );
  } catch {
    tripServerFirestoreBreaker();
  }
}

// ============================================================================
// GLOBAL CLOUD KV BRIDGE (Syncs with Firestore + Google Apps Script fallback)
// ============================================================================
function getGasWebAppUrl(): string {
  const cfg = state.store['ams_google_config'];
  if (cfg && typeof cfg.webAppUrl === 'string' && cfg.webAppUrl.startsWith('https://script.google.com/')) {
    return cfg.webAppUrl;
  }
  return DEFAULT_GAS_URL;
}

function getDriveFolderId(): string {
  const cfg = state.store['ams_google_config'];
  if (cfg && typeof cfg.driveFolderId === 'string' && cfg.driveFolderId.trim()) {
    return cfg.driveFolderId.trim();
  }
  return '11IXjrNHXyGpf3A-7ZT38t8B_jXtoFGS9';
}

const inFlightDriveUploads = new Set<string>();

function ensureTaskFilesHostedAndUploaded(key: string, tasksList: any): any {
  if (!isTaskKeyName(key) || !Array.isArray(tasksList)) return tasksList;
  const schoolId = key.includes('__') ? key.split('__').slice(1).join('__') : 'admin-school-01';
  const admins: any[] = Array.isArray(state.store['ams_school_admins']) ? state.store['ams_school_admins'] : [];
  const matchedAdmin = admins.find(a => a && a.id === schoolId);
  const schoolName = matchedAdmin?.schoolName || schoolId;

  for (const task of tasksList) {
    if (!task || typeof task !== 'object') continue;
    const subs: any[] = Array.isArray(task.submissions) ? task.submissions : [];
    for (const sub of subs) {
      if (!sub || typeof sub !== 'object') continue;
      const rawUrl = String(sub.fileUrl || '');
      if (rawUrl.startsWith('data:')) {
        const subIdClean = String(sub.memberId || sub.memberName || 'member').replace(/[^a-zA-Z0-9_-]/g, '_');
        const taskIdClean = String(task.id || 'task').replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileNameClean = String(sub.fileName || 'file').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
        const fileId = sub.id
          ? String(sub.id).replace(/[^a-zA-Z0-9_-]/g, '_')
          : `sub_${taskIdClean}_${subIdClean}_${fileNameClean}`;
        sub.id = sub.id || fileId;
        // Save locally immediately so /api/files/:fileId works with 0ms latency
        const hostedPath = saveServerHostedFile(fileId, sub.fileName || 'submission', rawUrl, {
          schoolId,
          taskId: String(task.id || ''),
          memberId: String(sub.memberId || '')
        });
        if (hostedPath) {
          sub.localHostedUrl = hostedPath;
          sub.fileUrl = hostedPath;
        }

        // Upload to Google Drive in background so cross-container (ais-dev <-> ais-pre) & Google Sheets get a permanent Drive link
        const uploadLockKey = `${key}::${task.id}::${sub.memberId}::${sub.fileName || ''}::${sub.submittedAt || ''}`;
        if (!inFlightDriveUploads.has(uploadLockKey)) {
          inFlightDriveUploads.add(uploadLockKey);
          fetch(getGasWebAppUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'uploadDriveFile',
              spreadsheetId: matchedAdmin?.googleSheetId || '',
              schoolId,
              schoolName,
              schoolDriveFolderId: matchedAdmin?.driveFolderId || '',
              driveFolderId: getDriveFolderId(),
              category: `TaskSubmissions_${task.academicYear || '2569'}`,
              fileName: sub.fileName || `submission_${sub.memberId}`,
              fileBase64: rawUrl,
              uploadedBy: sub.memberName || sub.memberId || ''
            })
          })
            .then(r => r.json())
            .then((resData: any) => {
              if (resData && resData.status === 'success' && resData.fileUrl) {
                const driveUrl = String(resData.fileUrl);
                const fid = String(resData.fileId || extractDriveIdServer(driveUrl));
                updateServerHostedFileMeta(fileId, {
                  driveFileId: fid,
                  driveUrl,
                  downloadUrl: resData.downloadUrl
                });
                const nowTs = Date.now();
                const deltaUpdates: Record<string, any> = {};
                const deltaTimestamps: Record<string, number> = {};

                for (const tk of Object.keys(state.store)) {
                  if (!isTaskKeyName(tk) || !Array.isArray(state.store[tk])) continue;
                  let updatedInKey = false;
                  const nextList = state.store[tk].map((t: any) => {
                    if (!t || t.id !== task.id) return t;
                    const nextSubs = (Array.isArray(t.submissions) ? t.submissions : []).map((s: any) => {
                      const isSameSub =
                        s &&
                        ((sub.id && s.id === sub.id) ||
                          ((s.memberId === sub.memberId || s.memberName === sub.memberName) &&
                            (!sub.fileName || !s.fileName || s.fileName === sub.fileName)));
                      if (
                        isSameSub &&
                        (!s.fileUrl || String(s.fileUrl).startsWith('data:') || String(s.fileUrl).startsWith('/api/files/'))
                      ) {
                        updatedInKey = true;
                        return {
                          ...s,
                          fileUrl: driveUrl,
                          driveFileId: fid || s.driveFileId,
                          downloadUrl: resData.downloadUrl || s.downloadUrl,
                          localHostedUrl: hostedPath || s.localHostedUrl
                        };
                      }
                      return s;
                    });
                    return {
                      ...t,
                      submissions: nextSubs,
                      submittedFileUrl:
                        t.submittedBy === sub.memberId ? driveUrl : t.submittedFileUrl
                    };
                  });

                  if (updatedInKey) {
                    state.store[tk] = nextList;
                    state.timestamps[tk] = Math.max(nowTs, (Number(state.timestamps[tk]) || 0) + 1);
                    deltaUpdates[tk] = nextList;
                    deltaTimestamps[tk] = state.timestamps[tk];
                  }
                }

                const changedKeys = Object.keys(deltaUpdates);
                if (changedKeys.length > 0) {
                  state.rev += 1;
                  scheduleDiskSave();
                  broadcastDelta('server-drive-sync', deltaUpdates, deltaTimestamps);
                  scheduleCloudKvPush(changedKeys);
                }
              }
            })
            .catch(() => {})
            .finally(() => {
              inFlightDriveUploads.delete(uploadLockKey);
            });
        }
      }
    }
  }
  return tasksList;
}

function isDocumentKeyName(key: string): boolean {
  return key === 'ams_documents' || key.startsWith('ams_documents__');
}

function ensureDocumentFilesHostedAndUploaded(key: string, docsList: any): any {
  if (!isDocumentKeyName(key) || !Array.isArray(docsList)) return docsList;
  const schoolId = key.includes('__') ? key.split('__').slice(1).join('__') : 'admin-school-01';
  const admins: any[] = Array.isArray(state.store['ams_school_admins']) ? state.store['ams_school_admins'] : [];
  const matchedAdmin = admins.find(a => a && a.id === schoolId);
  const schoolName = matchedAdmin?.schoolName || schoolId;

  for (const doc of docsList) {
    if (!doc || typeof doc !== 'object') continue;
    const rawUrl = String(doc.fileData || doc.fileUrl || '');
    if (rawUrl.startsWith('data:')) {
      const docIdClean = String(doc.id || 'doc').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileId = `doc_${docIdClean}`;
      const hostedPath = saveServerHostedFile(fileId, doc.fileName || doc.title || 'document', rawUrl, { schoolId });
      if (hostedPath) {
        doc.localHostedUrl = hostedPath;
        if (!doc.fileUrl || String(doc.fileUrl).startsWith('data:')) {
          doc.fileUrl = hostedPath;
        }
      }

      const uploadLockKey = `${key}::${doc.id}::${doc.date || ''}`;
      if (!inFlightDriveUploads.has(uploadLockKey)) {
        inFlightDriveUploads.add(uploadLockKey);
        fetch(getGasWebAppUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'uploadDriveFile',
            spreadsheetId: matchedAdmin?.googleSheetId || '',
            schoolId,
            schoolName,
            schoolDriveFolderId: matchedAdmin?.driveFolderId || '',
            driveFolderId: getDriveFolderId(),
            category: `Documents_${doc.academicYear || (doc.docType === 'order' ? 'Orders' : 'General')}`,
            fileName: doc.fileName || `${doc.title || 'document'}.pdf`,
            fileBase64: rawUrl,
            uploadedBy: doc.uploadedBy || 'Admin'
          })
        })
          .then(r => r.json())
          .then((resData: any) => {
            if (resData && resData.status === 'success' && resData.fileUrl) {
              const driveUrl = String(resData.fileUrl);
              const fid = String(resData.fileId || extractDriveIdServer(driveUrl));
              updateServerHostedFileMeta(fileId, {
                driveFileId: fid,
                driveUrl,
                downloadUrl: resData.downloadUrl
              });
              const curList = state.store[key];
              if (Array.isArray(curList)) {
                let updatedAny = false;
                const nextList = curList.map((d: any) => {
                  if (!d || d.id !== doc.id) return d;
                  if (!d.fileUrl || String(d.fileUrl).startsWith('data:') || String(d.fileUrl).startsWith('/api/files/')) {
                    updatedAny = true;
                    return {
                      ...d,
                      fileUrl: driveUrl,
                      driveFileId: fid || d.driveFileId,
                      downloadUrl: resData.downloadUrl || d.downloadUrl
                    };
                  }
                  return d;
                });

                if (updatedAny) {
                  const nowTs = Date.now();
                  state.store[key] = nextList;
                  state.timestamps[key] = Math.max(nowTs, (Number(state.timestamps[key]) || 0) + 1);
                  state.rev += 1;
                  scheduleDiskSave();
                  broadcastDelta('server-drive-sync', { [key]: nextList }, { [key]: state.timestamps[key] });
                  scheduleCloudKvPush([key]);
                }
              }
            }
          })
          .catch(() => {})
          .finally(() => {
            inFlightDriveUploads.delete(uploadLockKey);
          });
      }
    }
  }
  return docsList;
}

function sanitizeForCloudKv(val: any): any {
  if (!val) return val;
  if (typeof val === 'string') {
    if (val.startsWith('data:') && val.length > 30000) {
      return '';
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(item => sanitizeForCloudKv(item));
  }
  if (typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if ((k === 'fileUrl' || k === 'fileData') && typeof v === 'string' && v.startsWith('data:') && val.localHostedUrl) {
        out[k] = val.localHostedUrl;
      } else {
        out[k] = sanitizeForCloudKv(v);
      }
    }
    return out;
  }
  return val;
}

function normalizeSubKeyServer(sub: any): string {
  if (!sub) return '';
  const memPart = String(sub.memberId || sub.memberName || '').trim().toLowerCase();
  const filePart = String(sub.fileName || '').trim().toLowerCase();
  if (memPart && filePart) return `${memPart}__${filePart}`;
  if (sub.id) return String(sub.id).trim().toLowerCase();
  return memPart || filePart;
}

function clearSubmissionTombstonesForSubServer(taskId: string, sub: any, deletedMap?: Record<string, string>): void {
  if (!taskId || !sub) return;
  const subKey = normalizeSubKeyServer(sub);
  const membersList: any[] = Array.isArray(state.store['ams_members']) ? state.store['ams_members'] : [];
  const matchedMember = membersList.find(
    m =>
      m &&
      ((sub.memberId && (m.id === sub.memberId || String(m.username || '').toLowerCase() === String(sub.memberId).toLowerCase())) ||
        (sub.memberName && String(m.fullName || '').trim() === String(sub.memberName).trim()))
  );
  const candidates = [
    sub.id,
    sub.memberId,
    sub.memberName,
    matchedMember?.id,
    matchedMember?.username,
    matchedMember?.fullName,
    sub.fileName,
    subKey,
    sub.memberId && sub.fileName ? `${sub.memberId}_${sub.fileName}` : undefined,
    sub.memberName && sub.fileName ? `${sub.memberName}_${sub.fileName}` : undefined,
    matchedMember?.id && sub.fileName ? `${matchedMember.id}_${sub.fileName}` : undefined,
    matchedMember?.username && sub.fileName ? `${matchedMember.username}_${sub.fileName}` : undefined
  ];
  for (const c of candidates) {
    if (!c) continue;
    const tk = makeSubTombstoneKeyServer(taskId, String(c));
    if (tk) deletedSubmissionKeysServer.delete(tk);
    if (deletedMap) {
      delete deletedMap[String(c)];
      delete deletedMap[String(c).toLowerCase()];
    }
  }
}

function mergeSingleTaskSubmissionsServer(existingTask: any, incomingTask: any): any {
  if (!existingTask || typeof existingTask !== 'object') return incomingTask;
  if (!incomingTask || typeof incomingTask !== 'object') return incomingTask;

  const deletedMap: Record<string, string> = {
    ...(existingTask.deletedSubmissionsMap || {}),
    ...(incomingTask.deletedSubmissionsMap || {})
  };

  const exSubs: any[] = Array.isArray(existingTask.submissions) ? existingTask.submissions : [];
  const incSubs: any[] = Array.isArray(incomingTask.submissions) ? incomingTask.submissions : [];

  const mergedSubsMap = new Map<string, any>();

  const targetTaskId = String(incomingTask?.id || existingTask?.id || '').trim();

  // If incomingTask has active submissions that are newer than deletedMap (or deletedMap no longer has them), clear stale tombstones
  for (const incSub of incSubs) {
    if (!incSub || typeof incSub !== 'object') continue;
    const subTime = String(incSub.submittedAt || '');
    const incDeletedMap = incomingTask.deletedSubmissionsMap || {};
    const delById = incSub.memberId ? (incDeletedMap[String(incSub.memberId).trim()] || incDeletedMap[String(incSub.memberId).trim().toLowerCase()]) : undefined;
    const delByName = incSub.memberName ? (incDeletedMap[String(incSub.memberName).trim()] || incDeletedMap[String(incSub.memberName).trim().toLowerCase()]) : undefined;
    const delByFile = incSub.fileName ? incDeletedMap[String(incSub.fileName).trim()] : undefined;
    const activeDelTime = delByFile || delById || delByName;
    if (!activeDelTime || (subTime && subTime > activeDelTime)) {
      clearSubmissionTombstonesForSubServer(targetTaskId, incSub, deletedMap);
    }
  }

  const considerSub = (sub: any) => {
    if (!sub || typeof sub !== 'object') return;
    const key = normalizeSubKeyServer(sub);
    if (!key) return;
    const subTime = String(sub.submittedAt || '');
    const delById = sub.memberId ? (deletedMap[String(sub.memberId).trim()] || deletedMap[String(sub.memberId).trim().toLowerCase()]) : undefined;
    const delByName = sub.memberName ? (deletedMap[String(sub.memberName).trim()] || deletedMap[String(sub.memberName).trim().toLowerCase()]) : undefined;
    const delByFile = sub.fileName ? (deletedMap[String(sub.fileName).trim()] || (sub.memberId ? deletedMap[`${sub.memberId}_${sub.fileName}`] : undefined)) : undefined;
    const delTime = delByFile || (delById && delByName ? (delById > delByName ? delById : delByName) : (delById || delByName));
    if (delTime && (!subTime || delTime >= subTime)) {
      return;
    }
    if (delTime && subTime && subTime > delTime) {
      clearSubmissionTombstonesForSubServer(targetTaskId, sub, deletedMap);
    }
    if (isSubmissionKeyDeletedServer(targetTaskId, sub.id, sub.fileName, key) && (!subTime || delTime)) {
      return;
    }

    const prev = mergedSubsMap.get(key);
    if (!prev) {
      const cloned = { ...sub };
      if (!cloned.fileUrl && (cloned.downloadUrl || cloned.driveFileId || cloned.localHostedUrl)) {
        cloned.fileUrl = cloned.downloadUrl || cloned.localHostedUrl || `https://lh3.googleusercontent.com/d/${cloned.driveFileId}`;
      }
      mergedSubsMap.set(key, cloned);
    } else {
      const prevTime = String(prev.submittedAt || '');
      const newer = subTime >= prevTime ? { ...prev, ...sub } : { ...sub, ...prev };
      // Preserve non-empty fileUrl (prefer http Drive URL over /api/files/ over data: over empty string)
      const prevUrl = String(prev.fileUrl || '');
      const subUrl = String(sub.fileUrl || '');
      if (subUrl.startsWith('http')) {
        newer.fileUrl = subUrl;
      } else if (prevUrl.startsWith('http') && subTime <= prevTime) {
        newer.fileUrl = prevUrl;
      } else if (subUrl.startsWith('/api/files/') && !prevUrl.startsWith('http')) {
        newer.fileUrl = subUrl;
      } else if (prevUrl.startsWith('/api/files/') && !subUrl.startsWith('http') && subTime <= prevTime) {
        newer.fileUrl = prevUrl;
      } else if (!newer.fileUrl && (subUrl || prevUrl)) {
        newer.fileUrl = subUrl || prevUrl;
      }
      if (!newer.fileUrl && (newer.downloadUrl || newer.driveFileId || newer.localHostedUrl)) {
        newer.fileUrl = newer.downloadUrl || newer.localHostedUrl || `https://lh3.googleusercontent.com/d/${newer.driveFileId}`;
      }
      newer.localHostedUrl = sub.localHostedUrl || prev.localHostedUrl;
      newer.driveFileId = sub.driveFileId || prev.driveFileId;
      newer.downloadUrl = sub.downloadUrl || prev.downloadUrl;
      mergedSubsMap.set(key, newer);
    }
  };

  exSubs.forEach(considerSub);
  incSubs.forEach(considerSub);

  const mergedSubmissions = Array.from(mergedSubsMap.values());
  let finalSubUrl = incomingTask.submittedFileUrl || existingTask.submittedFileUrl;
  let finalSubBy = incomingTask.submittedBy || existingTask.submittedBy;
  let finalSubByName = incomingTask.submittedByName || existingTask.submittedByName;
  let finalSubFileName = incomingTask.submittedFileName || existingTask.submittedFileName;

  if (
    mergedSubmissions.length === 0 &&
    ((finalSubBy && isSubmissionKeyDeletedServer(targetTaskId, finalSubBy, finalSubByName, finalSubFileName)) ||
      (finalSubFileName && isSubmissionKeyDeletedServer(targetTaskId, finalSubFileName)))
  ) {
    finalSubUrl = undefined;
    finalSubBy = undefined;
    finalSubByName = undefined;
    finalSubFileName = undefined;
  } else if (mergedSubmissions.length > 0 && !finalSubUrl) {
    const latestSub = mergedSubmissions[mergedSubmissions.length - 1];
    finalSubUrl = latestSub.fileUrl || latestSub.localHostedUrl || latestSub.downloadUrl;
    finalSubBy = finalSubBy || latestSub.memberId;
    finalSubByName = finalSubByName || latestSub.memberName;
    finalSubFileName = finalSubFileName || latestSub.fileName;
  }

  const result: any = {
    ...existingTask,
    ...incomingTask,
    submissions: mergedSubmissions,
    isCompleted: Boolean(incomingTask.isManualCompleted ?? existingTask.isManualCompleted),
    submittedFileUrl: finalSubUrl,
    submittedBy: finalSubBy,
    submittedByName: finalSubByName,
    submittedFileName: finalSubFileName
  };
  if (Object.keys(deletedMap).length > 0) {
    result.deletedSubmissionsMap = deletedMap;
  } else {
    delete result.deletedSubmissionsMap;
  }
  return result;
}

function mergeTaskListsServer(existingList: any, incomingList: any): any {
  if (!Array.isArray(incomingList)) {
    return Array.isArray(existingList)
      ? existingList.filter(t => t && t.id && !deletedTaskIdsServer.has(String(t.id)))
      : [];
  }
  if (!Array.isArray(existingList) || existingList.length === 0) {
    return incomingList.filter(t => t && t.id && !deletedTaskIdsServer.has(String(t.id)));
  }

  const existingById = new Map<string, any>();
  for (const t of existingList) {
    if (t && t.id && !deletedTaskIdsServer.has(String(t.id))) {
      existingById.set(String(t.id), t);
    }
  }

  const result: any[] = [];
  const handledIds = new Set<string>();

  for (const incTask of incomingList) {
    if (!incTask || !incTask.id || deletedTaskIdsServer.has(String(incTask.id))) continue;
    const taskId = String(incTask.id);
    handledIds.add(taskId);
    const exTask = existingById.get(taskId);
    if (exTask) {
      result.push(mergeSingleTaskSubmissionsServer(exTask, incTask));
    } else {
      result.push(incTask);
    }
  }

  // Preserve any task in existingList that has not arrived in incomingList yet (prevents tasks from disappearing)
  for (const exTask of existingList) {
    if (!exTask || !exTask.id) continue;
    const taskId = String(exTask.id);
    if (!handledIds.has(taskId) && !deletedTaskIdsServer.has(taskId)) {
      result.push(exTask);
    }
  }

  return result;
}

function isTaskKeyName(key: string): boolean {
  return key === 'ams_tasks' || key.startsWith('ams_tasks__');
}

function mergeSingleDocumentServer(existingDoc: any, incomingDoc: any): any {
  if (!existingDoc || typeof existingDoc !== 'object') return incomingDoc;
  if (!incomingDoc || typeof incomingDoc !== 'object') return existingDoc;

  const result = { ...existingDoc, ...incomingDoc };

  const exUrl = String(existingDoc.fileUrl || '');
  const inUrl = String(incomingDoc.fileUrl || '');
  const exDriveId = existingDoc.driveFileId || extractDriveIdServer(exUrl);
  const inDriveId = incomingDoc.driveFileId || extractDriveIdServer(inUrl);

  if (inUrl.startsWith('http') && !inUrl.startsWith('/api/files/')) {
    result.fileUrl = inUrl;
  } else if (exUrl.startsWith('http') && !exUrl.startsWith('/api/files/')) {
    result.fileUrl = exUrl;
  } else if (inUrl.startsWith('/api/files/')) {
    result.fileUrl = inUrl;
  } else if (exUrl.startsWith('/api/files/')) {
    result.fileUrl = exUrl;
  } else if (inUrl.startsWith('data:')) {
    result.fileUrl = inUrl;
  } else if (exUrl.startsWith('data:')) {
    result.fileUrl = exUrl;
  }

  result.driveFileId = inDriveId || exDriveId || result.driveFileId;
  if (!result.fileUrl && result.driveFileId) {
    result.fileUrl = `https://drive.google.com/file/d/${result.driveFileId}/view?usp=sharing`;
  }
  result.localHostedUrl = incomingDoc.localHostedUrl || existingDoc.localHostedUrl;

  return result;
}

function mergeDocumentListsServer(existingList: any, incomingList: any): any {
  if (!Array.isArray(incomingList)) {
    return Array.isArray(existingList)
      ? existingList.filter(d => d && d.id && !deletedDocIdsServer.has(String(d.id)))
      : [];
  }
  if (!Array.isArray(existingList) || existingList.length === 0) {
    return incomingList.filter(d => d && d.id && !deletedDocIdsServer.has(String(d.id)));
  }

  const existingMap = new Map<string, any>();
  for (const d of existingList) {
    if (d && d.id && !deletedDocIdsServer.has(String(d.id))) {
      existingMap.set(String(d.id), d);
    }
  }

  const incomingMap = new Map<string, any>();
  for (const d of incomingList) {
    if (d && d.id && !deletedDocIdsServer.has(String(d.id))) {
      incomingMap.set(String(d.id), d);
    }
  }

  const result: any[] = [];
  const handledIds = new Set<string>();

  for (const incDoc of incomingList) {
    if (!incDoc || !incDoc.id || deletedDocIdsServer.has(String(incDoc.id))) continue;
    const docId = String(incDoc.id);
    handledIds.add(docId);
    const exDoc = existingMap.get(docId);
    if (exDoc) {
      result.push(mergeSingleDocumentServer(exDoc, incDoc));
    } else {
      result.push(incDoc);
    }
  }

  // Preserve any document that exists in existingList but has not reached incomingList yet (prevents disappearing documents)
  for (const exDoc of existingList) {
    if (!exDoc || !exDoc.id) continue;
    const docId = String(exDoc.id);
    if (!handledIds.has(docId) && !deletedDocIdsServer.has(docId)) {
      result.push(exDoc);
    }
  }

  return result;
}

function buildCloudKvRow(key: string, value: any, updatedAt: number): Record<string, any> | null {
  try {
    let serialized = JSON.stringify(value);
    if (serialized && serialized.length > CHUNK_SIZE * MAX_CHUNKS) {
      serialized = JSON.stringify(sanitizeForCloudKv(value));
    }
    if (!serialized || serialized.length > CHUNK_SIZE * MAX_CHUNKS) {
      return null;
    }
    const firstSlice = serialized.slice(0, CHUNK_SIZE);
    const row: Record<string, any> = {
      id: key,
      updatedAt,
      valueJson: firstSlice ? `~${firstSlice}` : ''
    };
    for (let i = 1; i < MAX_CHUNKS; i++) {
      const part = serialized.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      row[`c${i}`] = part ? `~${part}` : '';
    }
    return row;
  } catch {
    return null;
  }
}

function parseCloudKvRow(row: any): { key: string; value: any; updatedAt: number } | null {
  if (!row || !row.id || row.id === '_sync_test') return null;
  try {
    const stripTilde = (s: any): string => {
      if (s === undefined || s === null || s === '') return '';
      const str = String(s);
      return str.startsWith('~') ? str.slice(1) : str;
    };
    let fullJson = stripTilde(row.valueJson);
    for (let i = 1; i < MAX_CHUNKS; i++) {
      const part = stripTilde(row[`c${i}`]);
      if (part) fullJson += part;
    }
    if (!fullJson) return null;
    const value = JSON.parse(fullJson);
    const updatedAt = Number(row.updatedAt) || 0;
    return { key: String(row.id), value, updatedAt };
  } catch {
    return null;
  }
}

const pendingCloudPushKeys = new Set<string>();
const inFlightCloudPushKeys = new Set<string>();
let cloudPushTimer: ReturnType<typeof setTimeout> | null = null;
let isPushingToCloud = false;

function scheduleCloudKvPush(keys: string[]) {
  for (const k of keys) {
    if (k && k !== 'ams_session') {
      pendingCloudPushKeys.add(k);
      // Immediately push to Firebase Firestore
      if (k in state.store) {
        pushKeyToFirestoreServer(k, state.store[k], state.timestamps[k] || Date.now()).catch(() => {});
      }
    }
  }
  if (cloudPushTimer) clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(() => {
    flushCloudKvPush();
  }, 200);
}

async function flushCloudKvPush() {
  if (isPushingToCloud || pendingCloudPushKeys.size === 0) return;
  isPushingToCloud = true;

  const keysBatch = Array.from(pendingCloudPushKeys);
  pendingCloudPushKeys.clear();
  for (const k of keysBatch) {
    inFlightCloudPushKeys.add(k);
  }

  try {
    const records: Record<string, any>[] = [];
    for (const key of keysBatch) {
      if (!(key in state.store)) continue;
      const row = buildCloudKvRow(key, state.store[key], state.timestamps[key] || Date.now());
      if (row) records.push(row);
    }

    if (records.length > 0) {
      const url = getGasWebAppUrl();
      for (let i = 0; i < records.length; i += 8) {
        const slice = records.slice(i, i + 8);
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'batchSaveEntities',
            spreadsheetId: MASTER_SPREADSHEET_ID,
            sheetName: CLOUD_KV_SHEET,
            keyField: 'id',
            records: slice
          })
        });
      }
    }
  } catch {
    // ignore GAS fallback error since Firestore is primary
  } finally {
    for (const k of keysBatch) {
      inFlightCloudPushKeys.delete(k);
    }
    isPushingToCloud = false;
    if (pendingCloudPushKeys.size > 0) {
      scheduleCloudKvPush([]);
    }
  }
}

let isPullingFromCloud = false;
async function pullFromCloudKV(seedMissingToCloud = false): Promise<number> {
  // Always sync with Firebase Firestore first
  const firestoreApplied = await syncWithFirestoreServer(seedMissingToCloud);

  if (isPullingFromCloud) return firestoreApplied;
  isPullingFromCloud = true;
  let appliedCount = firestoreApplied;

  try {
    const url = `${getGasWebAppUrl()}?action=getSheet&spreadsheetId=${MASTER_SPREADSHEET_ID}&sheet=${CLOUD_KV_SHEET}&_t=${Date.now()}`;
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return appliedCount;
    const json: any = await res.json();
    if (!json || json.status !== 'success' || !Array.isArray(json.data)) return appliedCount;

    const appliedUpdates: Record<string, any> = {};
    const appliedTimestamps: Record<string, number> = {};
    const keysToPushBack: string[] = [];

    const nowMs = Date.now();
    // Deduplicate rows by key first so older duplicate rows in RealtimeCloudKV never shadow newer rows
    const dedupedRows = new Map<string, { key: string; value: any; updatedAt: number }>();
    for (const rawRow of json.data) {
      const parsed = parseCloudKvRow(rawRow);
      if (!parsed) continue;
      const existing = dedupedRows.get(parsed.key);
      if (!existing) {
        dedupedRows.set(parsed.key, parsed);
      } else if (isTaskKeyName(parsed.key)) {
        const mergedVal =
          parsed.updatedAt >= existing.updatedAt
            ? mergeTaskListsServer(existing.value, parsed.value)
            : mergeTaskListsServer(parsed.value, existing.value);
        dedupedRows.set(parsed.key, {
          key: parsed.key,
          value: mergedVal,
          updatedAt: Math.max(existing.updatedAt, parsed.updatedAt)
        });
      } else if (parsed.updatedAt >= existing.updatedAt) {
        dedupedRows.set(parsed.key, parsed);
      }
    }

    for (const parsed of dedupedRows.values()) {
      const { key, value, updatedAt } = parsed;

      if (key === 'ams_deleted_doc_ids' && Array.isArray(value)) {
        for (const id of value) {
          if (id) deletedDocIdsServer.add(String(id));
        }
      } else if (key === 'ams_deleted_task_ids' && Array.isArray(value)) {
        for (const id of value) {
          if (id) deletedTaskIdsServer.add(String(id));
        }
      } else if (key === 'ams_deleted_leave_ids' && Array.isArray(value)) {
        for (const id of value) {
          if (id) deletedLeaveIdsServer.add(String(id));
        }
      } else if (key === 'ams_deleted_duty_log_ids' && Array.isArray(value)) {
        for (const id of value) {
          if (id) deletedDutyLogIdsServer.add(String(id));
        }
      } else if (key === 'ams_deleted_subject_ids' && Array.isArray(value)) {
        for (const id of value) {
          addSubjectTombstoneServer(id);
        }
      }

      if (pendingCloudPushKeys.has(key) || inFlightCloudPushKeys.has(key)) continue;

      const localTs = Number(state.timestamps[key]) || 0;
      const lastMutated = recentServerMutationTs.get(key) || 0;
      // Never allow lagging Google Sheets RealtimeCloudKV rows to overwrite recent server mutations
      if (nowMs - lastMutated < 20000 && updatedAt <= localTs) {
        continue;
      }

      const isTask = isTaskKeyName(key);
      const isDoc = isDocumentKeyName(key);
      const isLeave = isLeaveKeyName(key);
      const isDutyLog = isDutyLogKeyName(key);
      const isSub = isSubjectKeyName(key);
      const nextValue = isTask
        ? updatedAt >= localTs
          ? mergeTaskListsServer(state.store[key], value)
          : mergeTaskListsServer(value, state.store[key])
        : isDoc
        ? updatedAt >= localTs
          ? mergeDocumentListsServer(state.store[key], value)
          : mergeDocumentListsServer(value, state.store[key])
        : isLeave
        ? updatedAt >= localTs
          ? mergeLeaveListsServer(state.store[key], value)
          : mergeLeaveListsServer(value, state.store[key])
        : isDutyLog
        ? updatedAt >= localTs
          ? mergeDutyLogListsServer(state.store[key], value)
          : mergeDutyLogListsServer(value, state.store[key])
        : isSub && key in state.store
        ? updatedAt >= localTs
          ? mergeSubjectListsServer(state.store[key], value)
          : mergeSubjectListsServer(value, state.store[key])
        : isSub
        ? filterSubjectListServer(value)
        : value;
      const localSerialized = key in state.store ? JSON.stringify(state.store[key]) : undefined;
      const remoteSerialized = JSON.stringify(value);
      const cloudSerialized = JSON.stringify(nextValue);

      if (!(key in state.store) || updatedAt > localTs || ((isTask || isDoc || isLeave || isDutyLog || isSub) && localSerialized !== cloudSerialized)) {
        const effTs = Math.max(localTs, updatedAt || Date.now());
        state.store[key] = nextValue;
        state.timestamps[key] = effTs;
        if (localSerialized !== cloudSerialized) {
          appliedUpdates[key] = nextValue;
          appliedTimestamps[key] = effTs;
          appliedCount++;
        }
      }

      if ((isTask || isDoc || isLeave || isDutyLog || isSub) && cloudSerialized !== remoteSerialized) {
        keysToPushBack.push(key);
      }
    }

    if (Object.keys(appliedUpdates).length > 0) {
      state.rev += 1;
      scheduleDiskSave();
      broadcastDelta('cloud-kv', appliedUpdates, appliedTimestamps);
    }

    if (keysToPushBack.length > 0) {
      scheduleCloudKvPush(keysToPushBack);
    }

    // Automatically heal any task submission that has a fileName but empty fileUrl
    healMissingTaskSubmissionUrlsServer().catch(() => {});
  } catch {
    // ignore transient network errors
  } finally {
    isPullingFromCloud = false;
  }

  return appliedCount;
}

function getFileExtServer(fileName?: string): string {
  if (!fileName) return '';
  const m = fileName.trim().match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : '';
}

function getMimeByFilename(fileName: string, fallback = 'application/octet-stream'): string {
  const ext = getFileExtServer(fileName);
  switch (ext) {
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'csv':
      return 'text/csv;charset=utf-8';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'zip':
      return 'application/zip';
    case 'rar':
      return 'application/vnd.rar';
    case 'txt':
      return 'text/plain;charset=utf-8';
    default:
      return fallback;
  }
}

function detectFormatFromBuffer(buf: Buffer): { ext: string; mime: string } | null {
  if (!buf || buf.length < 4) return null;
  // 1. PDF (%PDF-)
  const headSearch = buf.subarray(0, Math.min(buf.length, 1024)).toString('latin1');
  if (headSearch.includes('%PDF-')) {
    return { ext: 'pdf', mime: 'application/pdf' };
  }
  // 2. PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { ext: 'png', mime: 'image/png' };
  }
  // 3. JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // 4. GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return { ext: 'gif', mime: 'image/gif' };
  }
  // 5. WEBP (RIFF....WEBP)
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  // 6. ZIP / Office Open XML (.docx, .xlsx, .pptx, .zip)
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) {
    const sample =
      buf.subarray(0, Math.min(buf.length, 65536)).toString('latin1') +
      (buf.length > 65536 ? buf.subarray(Math.max(0, buf.length - 65536)).toString('latin1') : '');
    if (sample.includes('word/document.xml') || sample.includes('word/')) {
      return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    }
    if (sample.includes('xl/workbook.xml') || sample.includes('xl/')) {
      return { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }
    if (sample.includes('ppt/presentation.xml') || sample.includes('ppt/')) {
      return { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
    }
    return { ext: 'zip', mime: 'application/zip' };
  }
  // 7. Legacy OLE2 Compound Document (.doc, .xls, .ppt)
  if (buf.length >= 8 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    const sample = buf.subarray(0, Math.min(buf.length, 131072)).toString('latin1');
    if (sample.includes('WordDocument')) {
      return { ext: 'doc', mime: 'application/msword' };
    }
    if (sample.includes('Workbook') || sample.includes('Book')) {
      return { ext: 'xls', mime: 'application/vnd.ms-excel' };
    }
    if (sample.includes('PowerPoint')) {
      return { ext: 'ppt', mime: 'application/vnd.ms-powerpoint' };
    }
    return { ext: 'doc', mime: 'application/msword' };
  }
  // 8. RAR (Rar!)
  if (buf[0] === 0x52 && buf[1] === 0x61 && buf[2] === 0x72 && buf[3] === 0x21) {
    return { ext: 'rar', mime: 'application/vnd.rar' };
  }
  return null;
}

function isValidBinaryBufferForFile(buf: Buffer, requestedExt: string): boolean {
  if (!buf || buf.length === 0) return false;
  const headAscii = buf.subarray(0, Math.min(buf.length, 256)).toString('utf8').trimStart();
  const headLower = headAscii.toLowerCase();
  if (
    headLower.startsWith('<!doctype html') ||
    headLower.startsWith('<html') ||
    headLower.startsWith('<head') ||
    headLower.startsWith('<script') ||
    headLower.startsWith('{"status":"error"')
  ) {
    return false;
  }
  const isImageExt = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(requestedExt);
  const isDocExt = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'pptx', 'ppt', 'zip', 'rar', 'txt'].includes(requestedExt);

  // Reject PNG thumbnails returned by Google Drive lh3 when downloading a document
  if (isDocExt && !isImageExt && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return false;
  }
  // If specifically requesting PDF, verify %PDF- signature exists
  if (requestedExt === 'pdf') {
    const pdfCheck = buf.subarray(0, Math.min(buf.length, 1024)).toString('latin1');
    if (!pdfCheck.includes('%PDF-')) return false;
  }
  // If specifically requesting OOXML (.docx, .xlsx, .pptx) or .zip, verify PK zip header
  if (['docx', 'xlsx', 'pptx', 'zip'].includes(requestedExt)) {
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) return false;
  }
  return true;
}

function extractFilenameFromDisposition(disp?: string | null): string {
  if (!disp) return '';
  const utf8Match = disp.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }
  const quotedMatch = disp.match(/filename="([^"]+)"/i);
  if (quotedMatch && quotedMatch[1]) {
    try {
      // Handle Latin1-encoded UTF-8 bytes from Google Drive headers
      const raw = quotedMatch[1];
      if (/[\x80-\xff]/.test(raw)) {
        const decoded = Buffer.from(raw, 'latin1').toString('utf8');
        if (!decoded.includes('\ufffd')) return decoded;
      }
      return raw;
    } catch {
      return quotedMatch[1];
    }
  }
  return '';
}

function finalizeDownloadHeadersAndSend(
  res: express.Response,
  buf: Buffer,
  rawName: string,
  isInline: boolean,
  fallbackMime = 'application/octet-stream',
  upstreamDisposition?: string | null
) {
  let finalName = (rawName || 'download').trim();
  let ext = getFileExtServer(finalName);
  const detected = detectFormatFromBuffer(buf);

  if (!ext || finalName === 'download' || finalName === 'task-attachment' || finalName === 'announcement-attachment' || finalName === 'ไฟล์งานที่ส่ง') {
    const dispName = extractFilenameFromDisposition(upstreamDisposition);
    const dispExt = getFileExtServer(dispName);
    if (dispName && dispExt && (finalName === 'download' || finalName === 'task-attachment' || finalName === 'announcement-attachment' || finalName === 'ไฟล์งานที่ส่ง')) {
      finalName = dispName;
      ext = dispExt;
    } else if (detected && detected.ext) {
      ext = detected.ext;
      finalName = `${finalName}.${ext}`;
    } else if (dispExt) {
      ext = dispExt;
      finalName = `${finalName}.${ext}`;
    }
  }

  const mime = getMimeByFilename(finalName, detected?.mime || fallbackMime || 'application/octet-stream');
  const safeAsciiName = finalName.replace(/[^\x20-\x7E]/g, '_').replace(/_+/g, '_').trim();
  const cleanAscii = safeAsciiName.replace(/^[_\.]+|[_\.]+$/g, '');
  const fallbackFilename = ext
    ? cleanAscii && cleanAscii !== ext
      ? cleanAscii.endsWith(`.${ext}`)
        ? cleanAscii
        : `${cleanAscii}.${ext}`
      : `document_${Date.now()}.${ext}`
    : 'document.bin';
  const encodedName = encodeURIComponent(finalName);
  const disposition = `${isInline ? 'inline' : 'attachment'}; filename="${fallbackFilename}"; filename*=UTF-8''${encodedName}`;

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Length', String(buf.length));
  res.setHeader('Content-Disposition', disposition);
  res.setHeader('X-Resolved-Filename', encodedName);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length, X-Resolved-Filename');
  res.send(buf);
}

function extractDriveIdServer(urlOrId: string): string {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const str = urlOrId.trim();
  if (str.startsWith('data:') || str.startsWith('/api/files/')) return '';
  const m1 = str.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m1 && m1[1]) return m1[1];
  const m2 = str.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m2 && m2[1]) return m2[1];
  const m3 = str.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m3 && m3[1]) return m3[1];
  const m4 = str.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
  if (m4 && m4[1]) return m4[1];
  if (/^[a-zA-Z0-9_-]{25,60}$/.test(str)) return str;
  return '';
}

const schoolSheetsRowCache = new Map<string, { fetchedAt: number; rows: any[] }>();
let isHealingTaskUrls = false;

async function fetchSchoolSheetRowsCached(schoolId: string, sheetName: string): Promise<any[]> {
  const cacheKey = `${schoolId || 'default'}::${sheetName}`;
  const cached = schoolSheetsRowCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < 12000) {
    return cached.rows;
  }

  const admins: any[] = Array.isArray(state.store['ams_school_admins']) ? state.store['ams_school_admins'] : [];
  const matchedAdmin = admins.find(a => a && a.id === schoolId);
  const spreadsheetId = matchedAdmin?.googleSheetId || '';

  const q = new URLSearchParams({
    action: 'getSheet',
    sheet: sheetName,
    ...(spreadsheetId ? { spreadsheetId } : {}),
    ...(schoolId ? { schoolId } : {}),
    _t: String(Date.now())
  });

  try {
    const res = await fetch(`${getGasWebAppUrl()}?${q.toString()}`);
    if (!res.ok) return cached?.rows || [];
    const json: any = await res.json();
    if (json && json.status === 'success' && Array.isArray(json.data)) {
      schoolSheetsRowCache.set(cacheKey, { fetchedAt: Date.now(), rows: json.data });
      return json.data;
    }
  } catch {
    // ignore
  }
  return cached?.rows || [];
}

async function fetchSchoolDriveFilesRows(schoolId: string): Promise<any[]> {
  return fetchSchoolSheetRowsCached(schoolId, 'DriveFiles');
}

function isFilenameMatchStrict(candidateName: string, targetName: string): boolean {
  const c = (candidateName || '').trim().toLowerCase();
  const t = (targetName || '').trim().toLowerCase();
  if (!c || !t || t === 'download') return false;
  if (c === t || c.endsWith('_' + t)) return true;
  const cExt = getFileExtServer(c);
  const tExt = getFileExtServer(t);
  if (cExt && tExt && cExt !== tExt) return false;
  return t.length >= 5 && c.includes(t);
}

const lastSchoolTaskReconcileMap = new Map<string, number>();

async function healMissingTaskSubmissionUrlsServer(forceReconcile = false): Promise<void> {
  if (isHealingTaskUrls) return;
  isHealingTaskUrls = true;
  try {
    const changedKeys: string[] = [];
    const nowMs = Date.now();

    for (const [key, val] of Object.entries(state.store)) {
      if (!isTaskKeyName(key) || !Array.isArray(val)) continue;
      const schoolId = key.includes('__') ? key.split('__').slice(1).join('__') : 'admin-school-01';
      const needsUrlHeal = val.some(
        (t: any) =>
          t &&
          Array.isArray(t.submissions) &&
          t.submissions.some(
            (s: any) =>
              s &&
              s.fileName &&
              (!s.fileUrl || String(s.fileUrl).startsWith('/api/files/')) &&
              !s.driveFileId
          )
      );
      const lastReconciled = lastSchoolTaskReconcileMap.get(key) || 0;
      const shouldReconcileSheet = forceReconcile || needsUrlHeal || nowMs - lastReconciled > 8000;
      if (!shouldReconcileSheet) continue;
      lastSchoolTaskReconcileMap.set(key, nowMs);

      const [driveRows, subRows, sheetTaskRows] = await Promise.all([
        fetchSchoolDriveFilesRows(schoolId),
        fetchSchoolSheetRowsCached(schoolId, 'TaskSubmissions'),
        fetchSchoolSheetRowsCached(schoolId, 'Tasks')
      ]);
      if (
        (!driveRows || driveRows.length === 0) &&
        (!subRows || subRows.length === 0) &&
        (!sheetTaskRows || sheetTaskRows.length === 0)
      ) {
        continue;
      }

      // 0. Reconcile any submissions present in the School's Tasks or TaskSubmissions sheets into current tasks
      let workingTasks = val;
      let keyChanged = false;

      if (Array.isArray(sheetTaskRows) && sheetTaskRows.length > 0) {
        const parsedSheetTasks: any[] = [];
        for (const stRow of sheetTaskRows) {
          if (!stRow || !stRow.id || deletedTaskIdsServer.has(String(stRow.id))) continue;
          let subs = stRow.submissions;
          if (typeof subs === 'string' && subs.trim().startsWith('[')) {
            try {
              subs = JSON.parse(subs);
            } catch {
              subs = [];
            }
          }
          parsedSheetTasks.push({
            ...stRow,
            id: String(stRow.id),
            title: String(stRow.title ?? ''),
            submissions: Array.isArray(subs) ? subs : []
          });
        }
        if (parsedSheetTasks.length > 0) {
          const mergedFromTasksSheet = mergeTaskListsServer(workingTasks, parsedSheetTasks);
          if (JSON.stringify(mergedFromTasksSheet) !== JSON.stringify(workingTasks)) {
            workingTasks = mergedFromTasksSheet;
            keyChanged = true;
          }
        }
      }

      if (Array.isArray(subRows) && subRows.length > 0) {
        const subsByTaskId = new Map<string, any[]>();
        for (const sr of subRows) {
          if (!sr || !sr.taskId || !sr.fileName) continue;
          const tId = String(sr.taskId).trim();
          if (deletedTaskIdsServer.has(tId)) continue;
          if (isSubmissionKeyDeletedServer(tId, sr.memberId, sr.memberName, sr.fileName)) continue;
          const fid = extractDriveIdServer(String(sr.fileUrl || sr.driveFileId || ''));
          const viewUrl = fid
            ? `https://drive.google.com/file/d/${fid}/view?usp=sharing`
            : String(sr.fileUrl || '');
          const subObj = {
            id: String(sr.id || `sub_${tId}_${sr.memberId || 'mem'}_${sr.fileName}`),
            memberId: String(sr.memberId || ''),
            memberName: String(sr.memberName || ''),
            fileName: String(sr.fileName || ''),
            fileSize: String(sr.fileSize || '0.2 MB'),
            fileUrl: viewUrl,
            driveFileId: fid || undefined,
            submittedAt: String(sr.submittedAt || new Date().toISOString())
          };
          if (!subsByTaskId.has(tId)) subsByTaskId.set(tId, []);
          subsByTaskId.get(tId)!.push(subObj);
        }
        if (subsByTaskId.size > 0) {
          workingTasks = workingTasks.map((t: any) => {
            if (!t || !t.id || !subsByTaskId.has(String(t.id))) return t;
            const merged = mergeSingleTaskSubmissionsServer(t, {
              ...t,
              submissions: subsByTaskId.get(String(t.id))
            });
            if (JSON.stringify(merged) !== JSON.stringify(t)) {
              keyChanged = true;
            }
            return merged;
          });
        }
      }

      const nextTasks = workingTasks.map((t: any) => {
        if (!t || !Array.isArray(t.submissions)) return t;
        let taskChanged = false;
        let recoveredMainUrl = t.submittedFileUrl;
        const nextSubs = t.submissions
          .filter((s: any) => s && !isSubmissionKeyDeletedServer(t.id, s.memberId, s.memberName, s.fileName))
          .map((s: any) => {
            if (!s || !s.fileName) return s;
            if (s.fileUrl && String(s.fileUrl).startsWith('http')) return s;
            const targetName = String(s.fileName).trim().toLowerCase();

            // 1. Check TaskSubmissions sheet by taskId + memberId or fileName
            for (let i = (subRows || []).length - 1; i >= 0; i--) {
              const sr = subRows[i];
              if (!sr) continue;
              if (isSubmissionKeyDeletedServer(t.id, sr.memberId, sr.memberName, sr.fileName)) continue;
              const matchTaskMember =
                String(sr.taskId || '') === String(t.id || '') &&
                (String(sr.memberId || '') === String(s.memberId || '') ||
                  String(sr.memberName || '').trim() === String(s.memberName || '').trim()) &&
                isFilenameMatchStrict(String(sr.fileName || ''), targetName);
              const matchFile = isFilenameMatchStrict(String(sr.fileName || ''), targetName);
              if (matchTaskMember || matchFile) {
                const fid = extractDriveIdServer(String(sr.fileUrl || sr.driveFileId || ''));
                if (fid) {
                  const viewUrl = `https://drive.google.com/file/d/${fid}/view?usp=sharing`;
                  const dlUrl = `https://drive.google.com/uc?export=download&id=${fid}`;
                  taskChanged = true;
                  keyChanged = true;
                  if (!recoveredMainUrl && t.submittedBy === s.memberId) recoveredMainUrl = viewUrl;
                  return {
                    ...s,
                    fileUrl: viewUrl,
                    driveFileId: fid,
                    downloadUrl: dlUrl
                  };
                }
              }
            }

            // 2. Check DriveFiles sheet
            for (let i = (driveRows || []).length - 1; i >= 0; i--) {
              const row = driveRows[i];
              if (!row) continue;
              if (isFilenameMatchStrict(String(row.fileName || ''), targetName)) {
                const fid =
                  String(row.driveFileId || '').trim() ||
                  extractDriveIdServer(String(row.driveViewUrl || row.driveDownloadUrl || ''));
                if (fid) {
                  const viewUrl = String(row.driveViewUrl || `https://drive.google.com/file/d/${fid}/view?usp=sharing`);
                  const dlUrl = String(row.driveDownloadUrl || `https://drive.google.com/uc?export=download&id=${fid}`);
                  taskChanged = true;
                  keyChanged = true;
                  if (!recoveredMainUrl && t.submittedBy === s.memberId) recoveredMainUrl = viewUrl;
                  return {
                    ...s,
                    fileUrl: viewUrl,
                    driveFileId: fid,
                    downloadUrl: dlUrl
                  };
                }
              }
            }
            return s;
          });

        if (
          (recoveredMainUrl && t.submittedBy && isSubmissionKeyDeletedServer(t.id, t.submittedBy, t.submittedByName, t.submittedFileName)) ||
          (t.submittedFileName && isSubmissionKeyDeletedServer(t.id, t.submittedFileName))
        ) {
          recoveredMainUrl = undefined;
          taskChanged = true;
        }

        if (!taskChanged && nextSubs.length === t.submissions.length) return t;
        return {
          ...t,
          submissions: nextSubs,
          submittedFileUrl: recoveredMainUrl || t.submittedFileUrl
        };
      });

      if (keyChanged) {
        const nowTs = Date.now();
        state.store[key] = nextTasks;
        state.timestamps[key] = Math.max(nowTs, (Number(state.timestamps[key]) || 0) + 1);
        changedKeys.push(key);
      }
    }

    if (changedKeys.length > 0) {
      state.rev += 1;
      scheduleDiskSave();
      const updatesObj: Record<string, any> = {};
      const tsObj: Record<string, number> = {};
      for (const k of changedKeys) {
        updatesObj[k] = state.store[k];
        tsObj[k] = state.timestamps[k];
      }
      broadcastDelta('server-heal-urls', updatesObj, tsObj);
      scheduleCloudKvPush(changedKeys);
    }
  } finally {
    isHealingTaskUrls = false;
  }
}

async function resolveDriveIdFromStoreOrSheet(
  rawUrl: string,
  fileName: string,
  schoolIdHint?: string,
  taskIdHint?: string,
  memberIdHint?: string
): Promise<string> {
  const directId = extractDriveIdServer(rawUrl);
  if (directId) return directId;

  const cleanName = (fileName || '').trim().toLowerCase();

  // 1. Search in-memory state.store across all task submissions and documents
  for (const [k, v] of Object.entries(state.store)) {
    if (isTaskKeyName(k) && Array.isArray(v)) {
      for (const t of v) {
        if (!t) continue;
        if (taskIdHint && String(t.id) === taskIdHint && Array.isArray(t.submissions)) {
          for (const s of t.submissions) {
            if (!s) continue;
            if (memberIdHint && (String(s.memberId) === memberIdHint || String(s.memberName) === memberIdHint)) {
              const fid = String(s.driveFileId || '').trim() || extractDriveIdServer(String(s.fileUrl || s.downloadUrl || ''));
              if (fid) return fid;
            }
          }
        }
        if (!Array.isArray(t.submissions)) continue;
        for (const s of t.submissions) {
          if (!s) continue;
          const matchUrl = rawUrl && (s.localHostedUrl === rawUrl || s.fileUrl === rawUrl);
          const matchName = cleanName && cleanName !== 'download' && isFilenameMatchStrict(String(s.fileName || ''), cleanName);
          if (matchUrl || matchName) {
            const fid = String(s.driveFileId || '').trim() || extractDriveIdServer(String(s.fileUrl || s.downloadUrl || ''));
            if (fid) return fid;
          }
        }
      }
    } else if (isDocumentKeyName(k) && Array.isArray(v)) {
      for (const d of v) {
        if (!d) continue;
        const matchUrl = rawUrl && (d.localHostedUrl === rawUrl || d.fileUrl === rawUrl || d.fileData === rawUrl);
        const matchName =
          cleanName &&
          cleanName !== 'download' &&
          (isFilenameMatchStrict(String(d.fileName || ''), cleanName) ||
            String(d.title || '').trim().toLowerCase() === cleanName);
        if (matchUrl || matchName) {
          const fid = String(d.driveFileId || '').trim() || extractDriveIdServer(String(d.fileUrl || d.downloadUrl || ''));
          if (fid) return fid;
        }
      }
    }
  }

  // 2. Search in TaskSubmissions, DriveFiles, and Documents sheets of the school
  if ((cleanName && cleanName !== 'download') || (taskIdHint && memberIdHint)) {
    const schoolIdsToCheck: string[] = [];
    if (schoolIdHint) schoolIdsToCheck.push(schoolIdHint);
    const admins: any[] = Array.isArray(state.store['ams_school_admins']) ? state.store['ams_school_admins'] : [];
    for (const adm of admins) {
      if (adm && adm.id && !schoolIdsToCheck.includes(adm.id)) {
        schoolIdsToCheck.push(adm.id);
      }
    }

    for (const sid of schoolIdsToCheck) {
      const [subRows, driveRows] = await Promise.all([
        fetchSchoolSheetRowsCached(sid, 'TaskSubmissions'),
        fetchSchoolDriveFilesRows(sid)
      ]);

      // Check TaskSubmissions first
      for (let i = (subRows || []).length - 1; i >= 0; i--) {
        const sr = subRows[i];
        if (!sr) continue;
        const matchTaskMember =
          taskIdHint &&
          memberIdHint &&
          String(sr.taskId || '') === taskIdHint &&
          (String(sr.memberId || '') === memberIdHint || String(sr.memberName || '') === memberIdHint);
        const matchFile = cleanName && cleanName !== 'download' && isFilenameMatchStrict(String(sr.fileName || ''), cleanName);
        if (matchTaskMember || matchFile) {
          const fid = extractDriveIdServer(String(sr.fileUrl || sr.driveFileId || ''));
          if (fid) {
            healMissingTaskSubmissionUrlsServer().catch(() => {});
            return fid;
          }
        }
      }

      // Check DriveFiles second
      for (let i = (driveRows || []).length - 1; i >= 0; i--) {
        const row = driveRows[i];
        if (!row) continue;
        if (cleanName && isFilenameMatchStrict(String(row.fileName || ''), cleanName)) {
          const fid =
            String(row.driveFileId || '').trim() ||
            extractDriveIdServer(String(row.driveViewUrl || row.driveDownloadUrl || ''));
          if (fid) {
            healMissingTaskSubmissionUrlsServer().catch(() => {});
            return fid;
          }
        }
      }
    }
  }

  return '';
}

async function fetchGoogleDriveBinaryWithConfirmation(driveId: string, fetchUrl: string): Promise<{ buf: Buffer; contentType: string; disposition: string | null } | null> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: '*/*'
  };
  const upstream = await fetch(fetchUrl, { headers, redirect: 'follow' });
  if (!upstream.ok) return null;
  const upstreamType = String(upstream.headers.get('content-type') || '').toLowerCase();
  const disp = upstream.headers.get('content-disposition');
  const arrayBuf = await upstream.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  if (buf.length === 0) return null;

  if (upstreamType.includes('text/html')) {
    const htmlStr = buf.subarray(0, Math.min(buf.length, 32768)).toString('utf8');
    const uuidMatch = htmlStr.match(/name="uuid"\s+value="([^"]+)"/i) || htmlStr.match(/[?&]uuid=([a-zA-Z0-9_-]+)/i);
    const confirmMatch = htmlStr.match(/name="confirm"\s+value="([^"]+)"/i);
    if (uuidMatch && uuidMatch[1]) {
      const confirmVal = confirmMatch && confirmMatch[1] ? confirmMatch[1] : 't';
      const retryUrl = `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=${encodeURIComponent(confirmVal)}&uuid=${encodeURIComponent(uuidMatch[1])}`;
      const retryRes = await fetch(retryUrl, { headers, redirect: 'follow' });
      if (retryRes.ok) {
        const rType = String(retryRes.headers.get('content-type') || '').toLowerCase();
        if (!rType.includes('text/html')) {
          const rBuf = Buffer.from(await retryRes.arrayBuffer());
          if (rBuf.length > 0) {
            return { buf: rBuf, contentType: rType, disposition: retryRes.headers.get('content-disposition') };
          }
        }
      }
    }
    return null;
  }

  return { buf, contentType: upstreamType, disposition: disp };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Support large payloads (up to 50MB for base64 documents, PDFs, school logos, task submissions)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Universal CORS headers so any preview/domain can reach the API
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // 0. Universal File Proxy & Hosted File Download/Preview Endpoint
  app.get('/api/files/download', async (req, res) => {
    const rawUrl = String(req.query.url || '').trim();
    const explicitId = String(req.query.id || '').trim();
    const rawName = String(req.query.name || req.query.filename || 'download').trim() || 'download';
    const schoolIdHint = String(req.query.schoolId || '').trim();
    const taskIdHint = String(req.query.taskId || '').trim();
    const memberIdHint = String(req.query.memberId || '').trim();
    const isInline = req.query.inline === '1';
    const ext = getFileExtServer(rawName);
    const isExpectedImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
    const isNonImageDoc = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'pptx', 'ppt', 'zip', 'rar', 'txt'].includes(ext);

    try {
      // Source 1: Direct data: URL passed to download endpoint
      if (rawUrl.startsWith('data:') && rawUrl.includes(';base64,')) {
        const parts = rawUrl.split(';base64,');
        const mime = parts[0].replace('data:', '') || 'application/octet-stream';
        const buf = Buffer.from(parts[1] || '', 'base64');
        if (buf.length > 0) {
          finalizeDownloadHeadersAndSend(res, buf, rawName, isInline, mime);
          return;
        }
      }

      // Source 2: Local or Firestore-backed hosted file by explicit /api/files/:fileId, submission.id, localHostedUrl, or deterministic taskId+memberId
      const candidateFileIds: string[] = [];
      const addCandidateFid = (val?: string) => {
        if (!val) return;
        const clean = val.startsWith('/api/files/')
          ? val.replace('/api/files/', '').split('?')[0].trim()
          : val.trim();
        if (clean && !candidateFileIds.includes(clean)) {
          candidateFileIds.push(clean);
        }
      };

      if (rawUrl.startsWith('/api/files/')) {
        addCandidateFid(rawUrl);
      }
      if (taskIdHint && memberIdHint) {
        const tClean = taskIdHint.replace(/[^a-zA-Z0-9_-]/g, '_');
        const mClean = memberIdHint.replace(/[^a-zA-Z0-9_-]/g, '_');
        addCandidateFid(`sub_${tClean}_${mClean}`);
        if (rawName && rawName !== 'download') {
          const fClean = rawName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
          addCandidateFid(`sub_${tClean}_${mClean}_${fClean}`);
        }
      }

      // Also inspect state.store task submissions for matching s.id or s.localHostedUrl
      const cleanNameLowerForCand = rawName.toLowerCase();
      for (const [k, v] of Object.entries(state.store)) {
        if (isTaskKeyName(k) && Array.isArray(v)) {
          for (const t of v) {
            if (!t || !Array.isArray(t.submissions)) continue;
            if (taskIdHint && String(t.id) !== taskIdHint) continue;
            for (const s of t.submissions) {
              if (!s) continue;
              const matchName =
                cleanNameLowerForCand !== 'download' &&
                String(s.fileName || '').trim().toLowerCase() === cleanNameLowerForCand;
              const matchMem =
                memberIdHint &&
                (String(s.memberId) === memberIdHint || String(s.memberName) === memberIdHint);
              if (matchName || (matchMem && cleanNameLowerForCand === 'download')) {
                if (s.id) addCandidateFid(String(s.id));
                if (s.localHostedUrl) addCandidateFid(String(s.localHostedUrl));
                if (typeof s.fileUrl === 'string' && s.fileUrl.startsWith('/api/files/')) {
                  addCandidateFid(s.fileUrl);
                }
              }
            }
          }
        }
      }

      for (const fid of candidateFileIds) {
        const record = await loadServerHostedFileAsync(fid);
        if (record && record.dataUrl && record.dataUrl.includes(';base64,')) {
          const parts = record.dataUrl.split(';base64,');
          const mime = parts[0].replace('data:', '') || 'application/octet-stream';
          const buf = Buffer.from(parts[1] || '', 'base64');
          if (buf.length > 0) {
            const effName = rawName !== 'download' ? rawName : record.fileName || rawName;
            finalizeDownloadHeadersAndSend(res, buf, effName, isInline, mime);
            return;
          }
        }
      }

      // Source 3: Local hosted file matched by driveId or fileName
      const initialDriveId = explicitId || extractDriveIdServer(rawUrl);
      const matchedHosted = findServerHostedFileByMatch({
        driveId: initialDriveId,
        fileName: rawName,
        taskId: taskIdHint,
        memberId: memberIdHint
      });
      if (matchedHosted && matchedHosted.dataUrl && matchedHosted.dataUrl.includes(';base64,')) {
        const parts = matchedHosted.dataUrl.split(';base64,');
        const mime = parts[0].replace('data:', '') || 'application/octet-stream';
        const buf = Buffer.from(parts[1] || '', 'base64');
        if (buf.length > 0) {
          const effName = rawName !== 'download' ? rawName : matchedHosted.fileName || rawName;
          finalizeDownloadHeadersAndSend(res, buf, effName, isInline, mime);
          return;
        }
      }

      // Source 4: In-memory state.store data: URLs (if task submission or document still holds a data: URL in memory)
      const cleanNameLower = rawName.toLowerCase();
      for (const [k, v] of Object.entries(state.store)) {
        if (isTaskKeyName(k) && Array.isArray(v)) {
          for (const t of v) {
            if (!t || !Array.isArray(t.submissions)) continue;
            for (const s of t.submissions) {
              if (!s) continue;
              const matchTM =
                taskIdHint &&
                memberIdHint &&
                String(t.id) === taskIdHint &&
                (String(s.memberId) === memberIdHint || String(s.memberName) === memberIdHint);
              const matchN = cleanNameLower !== 'download' && String(s.fileName || '').trim().toLowerCase() === cleanNameLower;
              if ((matchTM || matchN) && typeof s.fileUrl === 'string' && s.fileUrl.startsWith('data:') && s.fileUrl.includes(';base64,')) {
                const parts = s.fileUrl.split(';base64,');
                const buf = Buffer.from(parts[1] || '', 'base64');
                if (buf.length > 0) {
                  finalizeDownloadHeadersAndSend(res, buf, s.fileName || rawName, isInline, parts[0].replace('data:', ''));
                  return;
                }
              }
            }
          }
        } else if (isDocumentKeyName(k) && Array.isArray(v)) {
          for (const d of v) {
            if (!d) continue;
            const matchN = cleanNameLower !== 'download' && String(d.fileName || d.title || '').trim().toLowerCase() === cleanNameLower;
            const dData = String(d.fileData || d.fileUrl || '');
            if (matchN && dData.startsWith('data:') && dData.includes(';base64,')) {
              const parts = dData.split(';base64,');
              const buf = Buffer.from(parts[1] || '', 'base64');
              if (buf.length > 0) {
                finalizeDownloadHeadersAndSend(res, buf, d.fileName || rawName, isInline, parts[0].replace('data:', ''));
                return;
              }
            }
          }
        }
      }

      // Source 5: Resolve Google Drive ID and fetch binary stream from Google Drive
      const driveId =
        initialDriveId ||
        (await resolveDriveIdFromStoreOrSheet(rawUrl, rawName, schoolIdHint, taskIdHint, memberIdHint));

      // Also check if we have a local hosted file for the newly resolved driveId
      if (driveId && driveId !== initialDriveId) {
        const matchedByResolvedDrive = findServerHostedFileByMatch({ driveId });
        if (matchedByResolvedDrive && matchedByResolvedDrive.dataUrl && matchedByResolvedDrive.dataUrl.includes(';base64,')) {
          const parts = matchedByResolvedDrive.dataUrl.split(';base64,');
          const buf = Buffer.from(parts[1] || '', 'base64');
          if (buf.length > 0) {
            finalizeDownloadHeadersAndSend(res, buf, rawName, isInline, parts[0].replace('data:', ''));
            return;
          }
        }
      }

      const candidateUrls: string[] = [];
      if (driveId) {
        candidateUrls.push(`https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`);
        candidateUrls.push(`https://drive.google.com/uc?export=download&id=${driveId}&confirm=t`);
        if (isExpectedImage || !isNonImageDoc) {
          candidateUrls.push(`https://lh3.googleusercontent.com/d/${driveId}`);
        }
      } else if (rawUrl.startsWith('http') && !rawUrl.includes('drive.google.com/file/d/')) {
        candidateUrls.push(rawUrl);
      }

      for (const fetchUrl of candidateUrls) {
        try {
          const result = await fetchGoogleDriveBinaryWithConfirmation(driveId, fetchUrl);
          if (!result) continue;
          const { buf, contentType, disposition: upDisp } = result;
          if (isNonImageDoc && contentType.startsWith('image/')) {
            continue;
          }
          if (!isValidBinaryBufferForFile(buf, ext)) {
            continue;
          }
          finalizeDownloadHeadersAndSend(res, buf, rawName, isInline, contentType || 'application/octet-stream', upDisp);
          return;
        } catch {
          // try next candidate URL
        }
      }

      res.status(404).json({ status: 'error', message: 'File not found or unavailable' });
    } catch {
      res.status(404).json({ status: 'error', message: 'File not found' });
    }
  });

  // Endpoint to open file in Google Drive (or inline preview if Drive sync is still in progress)
  app.get('/api/files/open', async (req, res) => {
    try {
      const rawUrl = String(req.query.url || '').trim();
      const rawName = String(req.query.name || 'file').trim();
      const taskIdHint = String(req.query.taskId || '').trim();
      const memberIdHint = String(req.query.memberId || '').trim();
      const schoolIdHint = String(req.query.schoolId || '').trim();
      const explicitId = String(req.query.id || '').trim();

      let driveId = explicitId || extractDriveIdServer(rawUrl);

      if (!driveId && rawUrl.startsWith('/api/files/')) {
        const fid = rawUrl.replace('/api/files/', '').split('?')[0].trim();
        const rec = await loadServerHostedFileAsync(fid);
        if (rec?.driveFileId) driveId = rec.driveFileId;
      }

      if (!driveId) {
        const matched = findServerHostedFileByMatch({
          fileName: rawName,
          taskId: taskIdHint,
          memberId: memberIdHint
        });
        if (matched?.driveFileId) driveId = matched.driveFileId;
      }

      if (!driveId) {
        driveId = await resolveDriveIdFromStoreOrSheet(rawUrl, rawName, schoolIdHint, taskIdHint, memberIdHint);
      }

      if (driveId) {
        res.redirect(`https://drive.google.com/file/d/${encodeURIComponent(driveId)}/view?usp=sharing`);
        return;
      }

      // Fallback: open inline directly via /api/files/download
      const qs = new URLSearchParams();
      if (rawUrl) qs.set('url', rawUrl);
      if (rawName) qs.set('name', rawName);
      if (taskIdHint) qs.set('taskId', taskIdHint);
      if (memberIdHint) qs.set('memberId', memberIdHint);
      if (schoolIdHint) qs.set('schoolId', schoolIdHint);
      qs.set('inline', '1');
      res.redirect(`/api/files/download?${qs.toString()}`);
    } catch {
      res.status(404).json({ status: 'error', message: 'File not found' });
    }
  });

  app.get('/api/files/:fileId', async (req, res) => {
    const fileId = String(req.params.fileId || '').trim();
    const record = await loadServerHostedFileAsync(fileId);
    if (record && record.dataUrl && record.dataUrl.includes(';base64,')) {
      const parts = record.dataUrl.split(';base64,');
      const mime = parts[0].replace('data:', '') || 'application/octet-stream';
      const buf = Buffer.from(parts[1] || '', 'base64');
      const isDownload = req.query.download === '1';
      finalizeDownloadHeadersAndSend(res, buf, record.fileName || 'file', !isDownload, mime);
      return;
    }

    // Fallback: if local file is missing on this container, resolve via Drive ID in state.store
    const driveId = record?.driveFileId || (await resolveDriveIdFromStoreOrSheet(`/api/files/${fileId}`, record?.fileName || ''));
    if (driveId) {
      res.redirect(
        `/api/files/download?id=${encodeURIComponent(driveId)}&name=${encodeURIComponent(record?.fileName || 'download')}`
      );
      return;
    }

    res.status(404).json({ status: 'error', message: 'File not found' });
  });

  // Fast direct file upload endpoint with optional server-side Google Drive sync
  app.post('/api/files/upload', async (req, res) => {
    try {
      const { fileName, dataUrl, id, schoolId, category, uploadedBy, uploadToDrive, taskId, memberId } = req.body || {};
      if (!dataUrl || typeof dataUrl !== 'string') {
        res.status(400).json({ status: 'error', message: 'Missing dataUrl' });
        return;
      }
      const safeId = String(id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`).replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );
      const hostedUrl = saveServerHostedFile(safeId, fileName || 'upload', dataUrl, {
        schoolId: schoolId || '',
        taskId: taskId || '',
        memberId: memberId || ''
      });

      let driveFileId = '';
      let driveUrl = '';
      let driveDownloadUrl = '';

      if (uploadToDrive) {
        const targetSchoolId = schoolId || 'admin-school-01';
        const admins: any[] = Array.isArray(state.store['ams_school_admins']) ? state.store['ams_school_admins'] : [];
        const matchedAdmin = admins.find(a => a && a.id === targetSchoolId);
        const schoolName = matchedAdmin?.schoolName || targetSchoolId;

        const driveUploadTask = fetch(getGasWebAppUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'uploadDriveFile',
            spreadsheetId: matchedAdmin?.googleSheetId || '',
            schoolId: targetSchoolId,
            schoolName,
            schoolDriveFolderId: matchedAdmin?.driveFolderId || '',
            driveFolderId: getDriveFolderId(),
            category: category || 'TaskSubmissions',
            fileName: fileName || 'upload',
            fileBase64: dataUrl,
            uploadedBy: uploadedBy || ''
          })
        })
          .then(r => r.json())
          .then((resData: any) => {
            if (resData && resData.status === 'success' && (resData.fileUrl || resData.fileId)) {
              const fid = String(resData.fileId || extractDriveIdServer(resData.fileUrl || ''));
              const fUrl = String(resData.fileUrl || (fid ? `https://drive.google.com/file/d/${fid}/view?usp=sharing` : ''));
              const dUrl = String(resData.downloadUrl || (fid ? `https://drive.google.com/uc?export=download&id=${fid}` : ''));
              updateServerHostedFileMeta(safeId, {
                driveFileId: fid,
                driveUrl: fUrl,
                downloadUrl: dUrl
              });
              // Invalidate cached DriveFiles rows for this school so next lookup sees the new file
              schoolSheetsRowCache.delete(`${targetSchoolId}::DriveFiles`);

              // Also update any matching task submission in state.store if the task was already saved before Drive finished
              if (taskId) {
                const nowTs = Date.now();
                const deltaUpdates: Record<string, any> = {};
                const deltaTimestamps: Record<string, number> = {};
                for (const tk of Object.keys(state.store)) {
                  if (!isTaskKeyName(tk) || !Array.isArray(state.store[tk])) continue;
                  let changedInKey = false;
                  const nextTasks = state.store[tk].map((t: any) => {
                    if (!t || String(t.id) !== String(taskId)) return t;
                    const nextSubs = (Array.isArray(t.submissions) ? t.submissions : []).map((s: any) => {
                      if (!s) return s;
                      const matchSub =
                        s.id === safeId ||
                        s.localHostedUrl === hostedUrl ||
                        s.fileUrl === hostedUrl ||
                        (memberId && s.memberId === memberId && fileName && s.fileName === fileName);
                      if (matchSub) {
                        changedInKey = true;
                        return {
                          ...s,
                          fileUrl: fUrl || s.fileUrl,
                          driveFileId: fid || s.driveFileId,
                          downloadUrl: dUrl || s.downloadUrl,
                          localHostedUrl: hostedUrl || s.localHostedUrl
                        };
                      }
                      return s;
                    });
                    if (!changedInKey) return t;
                    return {
                      ...t,
                      submissions: nextSubs,
                      submittedFileUrl: t.submittedBy === memberId ? (fUrl || t.submittedFileUrl) : t.submittedFileUrl
                    };
                  });
                  if (changedInKey) {
                    state.store[tk] = nextTasks;
                    state.timestamps[tk] = Math.max(nowTs, (Number(state.timestamps[tk]) || 0) + 1);
                    deltaUpdates[tk] = nextTasks;
                    deltaTimestamps[tk] = state.timestamps[tk];
                  }
                }
                const changedKeys = Object.keys(deltaUpdates);
                if (changedKeys.length > 0) {
                  state.rev += 1;
                  scheduleDiskSave();
                  broadcastDelta('server-upload-drive-sync', deltaUpdates, deltaTimestamps);
                  scheduleCloudKvPush(changedKeys);
                }
              }

              return { fid, fUrl, dUrl };
            }
            return null;
          })
          .catch(() => null);

        const awaited = await Promise.race([
          driveUploadTask,
          new Promise<null>(r => setTimeout(() => r(null), 10000))
        ]);
        if (awaited) {
          driveFileId = awaited.fid;
          driveUrl = awaited.fUrl;
          driveDownloadUrl = awaited.dUrl;
        }
      }

      res.json({
        status: 'success',
        fileId: safeId,
        url: hostedUrl,
        driveFileId: driveFileId || undefined,
        driveUrl: driveUrl || undefined,
        driveDownloadUrl: driveDownloadUrl || undefined,
        downloadUrl: `/api/files/download?url=${encodeURIComponent(driveUrl || hostedUrl)}&name=${encodeURIComponent(fileName || 'upload')}`
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message || 'Upload failed' });
    }
  });

  // Direct file delete endpoint: cleans up local cache and deletes file from Google Drive
  app.post('/api/files/delete', async (req, res) => {
    try {
      const { fileId, fileUrl, driveFileId, schoolId, documentId, taskId, memberId, fileName } = req.body || {};
      const safeDocId = documentId ? String(documentId).trim() : '';
      if (safeDocId) {
        deletedDocIdsServer.add(safeDocId);
        state.store['ams_deleted_doc_ids'] = Array.from(deletedDocIdsServer).slice(-2000);
        for (const k of Object.keys(state.store)) {
          if (isDocumentKeyName(k) && Array.isArray(state.store[k])) {
            state.store[k] = state.store[k].filter((d: any) => d && d.id !== safeDocId);
          }
        }
        scheduleDiskSave();
      }

      // 1. Delete local hosted cache
      if (fileId) {
        deleteServerHostedFile(fileId);
      }
      if (fileUrl && typeof fileUrl === 'string' && fileUrl.startsWith('/api/files/')) {
        const fId = fileUrl.replace('/api/files/', '').split('?')[0];
        deleteServerHostedFile(fId);
      }
      if (taskId && memberId) {
        const tClean = String(taskId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const mClean = String(memberId).replace(/[^a-zA-Z0-9_-]/g, '_');
        deleteServerHostedFile(`sub_${tClean}_${mClean}`);
      }
      if (fileName) {
        const match = findServerHostedFileByMatch({ fileName, taskId, memberId });
        if (match?.id) {
          deleteServerHostedFile(match.id);
        }
      }

      // 2. Trash file from Google Drive via Google Apps Script
      const driveId = driveFileId || extractDriveIdServer(fileUrl || '');
      if (driveId) {
        const admins: any[] = Array.isArray(state.store['ams_school_admins']) ? state.store['ams_school_admins'] : [];
        const matchedAdmin = admins.find(a => a && a.id === (schoolId || 'admin-school-01'));
        fetch(getGasWebAppUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'deleteDriveFile',
            fileId: driveId,
            driveFileId: driveId,
            fileUrl: fileUrl || `https://drive.google.com/file/d/${driveId}/view`,
            spreadsheetId: matchedAdmin?.googleSheetId || '',
            schoolId: schoolId || 'admin-school-01',
            schoolName: matchedAdmin?.schoolName || '',
            schoolDriveFolderId: matchedAdmin?.driveFolderId || '',
            driveFolderId: getDriveFolderId()
          })
        }).catch(() => {});
      }

      res.json({ status: 'success', message: 'File delete request processed' });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err?.message || 'Delete failed' });
    }
  });

  // 1. Server-Sent Events (SSE) Real-Time Stream
  app.get('/api/realtime/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    res.write(
      `data: ${JSON.stringify({
        type: 'connected',
        rev: state.rev,
        serverTime: Date.now()
      })}\n\n`
    );

    sseClients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // 2. Fast Authoritative State Fetch (supports ?sinceRev= and ?forceCloud=1)
  let lastStateEndpointCloudPull = 0;
  app.get('/api/realtime/state', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const forceCloud = req.query.forceCloud === '1';
    const nowMs = Date.now();
    const missingAccounts = !Array.isArray(state.store['ams_school_admins']) || state.store['ams_school_admins'].length === 0 || !Array.isArray(state.store['ams_members']) || state.store['ams_members'].length === 0;
    if (forceCloud || missingAccounts) {
      lastStateEndpointCloudPull = nowMs;
      await Promise.race([
        pullFromCloudKV(false).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 4500))
      ]);
    } else if (nowMs - lastStateEndpointCloudPull > 3500) {
      lastStateEndpointCloudPull = nowMs;
      pullFromCloudKV(false).catch(() => {});
    }

    const sinceRev = Number(req.query.sinceRev || 0);
    if (sinceRev > 0 && sinceRev === state.rev) {
      res.json({
        status: 'up_to_date',
        rev: state.rev,
        serverTime: Date.now()
      });
      return;
    }

    res.json({
      status: 'success',
      rev: state.rev,
      store: state.store,
      timestamps: state.timestamps,
      serverTime: Date.now()
    });
  });

  // 3. Real-Time Mutation Endpoint (optimistic update + instant SSE broadcast + Firestore & Cloud KV push)
  app.post('/api/realtime/mutate', (req, res) => {
    const { clientId = 'unknown', updates = {}, timestamps = {}, isInitialSeed = false } = req.body || {};
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ status: 'error', message: 'Invalid updates payload' });
      return;
    }

    const appliedUpdates: Record<string, any> = {};
    const appliedTimestamps: Record<string, number> = {};
    const now = Date.now();

    for (const [key, value] of Object.entries(updates)) {
      if (!key || key === 'ams_session') continue;

      if (isInitialSeed && key in state.store) {
        continue;
      }

      const incomingTs = Number(timestamps[key]) || now;
      const existingTs = Number(state.timestamps[key]) || 0;
      const effectiveTs = isInitialSeed ? incomingTs : Math.max(now, existingTs + 1, incomingTs);

      if (!isInitialSeed || effectiveTs >= existingTs || !(key in state.store)) {
        let finalValue = value;
        if (value === null || value === undefined) {
          delete state.store[key];
        } else {
          if (isTaskKeyName(key)) {
            if (Array.isArray(value)) {
              for (const incTask of value) {
                if (incTask && incTask.id && Array.isArray(incTask.submissions)) {
                  const incDelMap = incTask.deletedSubmissionsMap || {};
                  for (const s of incTask.submissions) {
                    if (!s) continue;
                    const subTime = String(s.submittedAt || '');
                    const delById = s.memberId ? (incDelMap[String(s.memberId).trim()] || incDelMap[String(s.memberId).trim().toLowerCase()]) : undefined;
                    const delByFile = s.fileName ? incDelMap[String(s.fileName).trim()] : undefined;
                    const activeDel = delByFile || delById;
                    if (!activeDel || (subTime && subTime > activeDel)) {
                      clearSubmissionTombstonesForSubServer(String(incTask.id), s);
                    }
                  }
                }
              }
            }
            if (key in state.store) {
              finalValue = mergeTaskListsServer(state.store[key], value);
            }
            finalValue = ensureTaskFilesHostedAndUploaded(key, finalValue);

            // Propagate merged tasks with matching IDs to any other ams_tasks* keys in state.store so Admin & Member always stay in sync
            if (Array.isArray(finalValue)) {
              const byId = new Map<string, any>();
              for (const t of finalValue) {
                if (t && t.id) byId.set(String(t.id), t);
              }
              for (const otherKey of Object.keys(state.store)) {
                if (otherKey === key || !isTaskKeyName(otherKey) || !Array.isArray(state.store[otherKey])) continue;
                let otherChanged = false;
                const nextOtherList = state.store[otherKey].map((ot: any) => {
                  if (!ot || !ot.id || !byId.has(String(ot.id))) return ot;
                  otherChanged = true;
                  return mergeSingleTaskSubmissionsServer(ot, byId.get(String(ot.id)));
                });
                if (otherChanged) {
                  state.store[otherKey] = nextOtherList;
                  state.timestamps[otherKey] = effectiveTs;
                  recentServerMutationTs.set(otherKey, effectiveTs);
                  appliedUpdates[otherKey] = nextOtherList;
                  appliedTimestamps[otherKey] = effectiveTs;
                }
              }
            }
          } else if (isDocumentKeyName(key)) {
            if (key in state.store) {
              finalValue = mergeDocumentListsServer(state.store[key], value);
            }
            finalValue = ensureDocumentFilesHostedAndUploaded(key, finalValue);
          } else if (key === 'ams_deleted_doc_ids' && Array.isArray(value)) {
            for (const dId of value) {
              if (dId) deletedDocIdsServer.add(String(dId));
            }
            // Purge deleted documents from all loaded stores immediately
            for (const k of Object.keys(state.store)) {
              if (isDocumentKeyName(k) && Array.isArray(state.store[k])) {
                state.store[k] = state.store[k].filter((d: any) => d && d.id && !deletedDocIdsServer.has(String(d.id)));
              }
            }
          } else if (key === 'ams_deleted_task_ids' && Array.isArray(value)) {
            for (const tId of value) {
              if (tId) deletedTaskIdsServer.add(String(tId));
            }
            // Purge deleted tasks from all loaded stores immediately
            for (const k of Object.keys(state.store)) {
              if (isTaskKeyName(k) && Array.isArray(state.store[k])) {
                state.store[k] = state.store[k].filter((t: any) => t && t.id && !deletedTaskIdsServer.has(String(t.id)));
              }
            }
          } else if (key === 'ams_deleted_submission_keys' && Array.isArray(value)) {
            for (const k of value) {
              if (k) deletedSubmissionKeysServer.add(String(k));
            }
            // Purge deleted submissions from all loaded task stores immediately
            for (const tk of Object.keys(state.store)) {
              if (isTaskKeyName(tk) && Array.isArray(state.store[tk])) {
                state.store[tk] = state.store[tk].map((t: any) => {
                  if (!t || !Array.isArray(t.submissions)) return t;
                  const filtered = t.submissions.filter((s: any) => !isSubmissionKeyDeletedServer(t.id, s?.memberId, s?.memberName, s?.fileName));
                  let subUrl = t.submittedFileUrl;
                  let subBy = t.submittedBy;
                  let subByName = t.submittedByName;
                  let subFileName = t.submittedFileName;
                  if (
                    (subBy && isSubmissionKeyDeletedServer(t.id, subBy, subByName, subFileName)) ||
                    (subFileName && isSubmissionKeyDeletedServer(t.id, subFileName))
                  ) {
                    subUrl = undefined;
                    subBy = undefined;
                    subByName = undefined;
                    subFileName = undefined;
                  }
                  return {
                    ...t,
                    submissions: filtered,
                    submittedFileUrl: subUrl,
                    submittedBy: subBy,
                    submittedByName: subByName,
                    submittedFileName: subFileName
                  };
                });
              }
            }
          } else if (key === 'ams_deleted_leave_ids' && Array.isArray(value)) {
            for (const lId of value) {
              if (lId) deletedLeaveIdsServer.add(String(lId));
            }
            // Purge deleted leave requests from all loaded stores immediately
            for (const k of Object.keys(state.store)) {
              if (isLeaveKeyName(k) && Array.isArray(state.store[k])) {
                state.store[k] = state.store[k].filter((l: any) => l && l.id && !deletedLeaveIdsServer.has(String(l.id)));
              }
            }
          } else if (key === 'ams_deleted_duty_log_ids' && Array.isArray(value)) {
            for (const dId of value) {
              if (dId) deletedDutyLogIdsServer.add(String(dId));
            }
            // Purge deleted duty logs from all loaded stores immediately
            for (const k of Object.keys(state.store)) {
              if (isDutyLogKeyName(k) && Array.isArray(state.store[k])) {
                state.store[k] = state.store[k].filter((d: any) => d && d.id && !deletedDutyLogIdsServer.has(String(d.id)));
              }
            }
          } else if (key === 'ams_deleted_subject_ids' && Array.isArray(value)) {
            for (const sId of value) {
              addSubjectTombstoneServer(sId);
            }
            finalValue = Array.from(deletedSubjectIdsServer);
            // Purge deleted subjects from all loaded stores immediately
            for (const k of Object.keys(state.store)) {
              if (isSubjectKeyName(k) && Array.isArray(state.store[k])) {
                const filtered = filterSubjectListServer(state.store[k]);
                if (filtered.length !== state.store[k].length) {
                  state.store[k] = filtered;
                  state.timestamps[k] = effectiveTs;
                  recentServerMutationTs.set(k, effectiveTs);
                  appliedUpdates[k] = filtered;
                  appliedTimestamps[k] = effectiveTs;
                }
              }
            }
          } else if (isSubjectKeyName(key) && Array.isArray(value)) {
            if (key in state.store) {
              finalValue = mergeSubjectListsServer(state.store[key], value);
            } else {
              finalValue = filterSubjectListServer(value);
            }
          } else if (isLeaveKeyName(key)) {
            if (key in state.store) {
              finalValue = mergeLeaveListsServer(state.store[key], value);
            }
          } else if (isDutyLogKeyName(key)) {
            if (key in state.store) {
              finalValue = mergeDutyLogListsServer(state.store[key], value);
            }
          } else if (key === 'ams_school_admins' && Array.isArray(value)) {
            const existingAdmins: any[] = Array.isArray(state.store['ams_school_admins'])
              ? state.store['ams_school_admins']
              : [];
            finalValue = value.map((adm: any) => {
              if (!adm || typeof adm !== 'object') return adm;
              const prev = existingAdmins.find(
                e =>
                  e &&
                  (e.id === adm.id ||
                    (e.username && adm.username && String(e.username).toLowerCase() === String(adm.username).toLowerCase()))
              );
              const merged = prev ? { ...prev, ...adm } : { ...adm };
              // Never overwrite a real Google Sheet ID or Drive Folder ID with an empty or placeholder 'sheet_...' ID
              if (
                prev &&
                prev.googleSheetId &&
                !String(prev.googleSheetId).startsWith('sheet_') &&
                (!adm.googleSheetId || String(adm.googleSheetId).startsWith('sheet_'))
              ) {
                merged.googleSheetId = prev.googleSheetId;
                merged.googleSheetUrl = prev.googleSheetUrl || `https://docs.google.com/spreadsheets/d/${prev.googleSheetId}/edit`;
              }
              if (prev && prev.driveFolderId && !adm.driveFolderId) {
                merged.driveFolderId = prev.driveFolderId;
                merged.driveFolderUrl = prev.driveFolderUrl || `https://drive.google.com/drive/folders/${prev.driveFolderId}`;
              }
              return merged;
            });
          }
          state.store[key] = finalValue;
        }
        state.timestamps[key] = effectiveTs;
        recentServerMutationTs.set(key, effectiveTs);
        appliedUpdates[key] = finalValue;
        appliedTimestamps[key] = effectiveTs;
      }
    }

    const updatedKeys = Object.keys(appliedUpdates);
    if (updatedKeys.length > 0) {
      state.rev += 1;
      scheduleDiskSave();
      broadcastDelta(clientId, appliedUpdates, appliedTimestamps);
      scheduleCloudKvPush(updatedKeys);
    }

    res.json({
      status: 'success',
      rev: state.rev,
      appliedCount: updatedKeys.length,
      mergedUpdates: appliedUpdates,
      serverTime: now
    });
  });

  const inFlightSheetProvisions = new Map<string, Promise<any>>();

  function isRealSheetIdServer(id?: string): boolean {
    if (!id || typeof id !== 'string') return false;
    const t = id.trim();
    return t.length >= 15 && !t.startsWith('sheet_');
  }

  function syncAdminToMasterSheetServer(admin: any): void {
    if (!admin || !admin.id) return;
    const gasUrl = getGasWebAppUrl();
    const adminRow = {
      id: admin.id,
      username: admin.username || '',
      password: admin.password || '123456',
      fullName: admin.fullName || `ผู้ดูแลระบบ ${admin.schoolName || ''}`,
      schoolName: admin.schoolName || '',
      schoolCode: admin.schoolCode || '',
      affiliation: admin.affiliation || '',
      directorName: admin.directorName || '',
      googleSheetId: isRealSheetIdServer(admin.googleSheetId) ? admin.googleSheetId : '',
      googleSheetUrl: isRealSheetIdServer(admin.googleSheetId)
        ? admin.googleSheetUrl || `https://docs.google.com/spreadsheets/d/${admin.googleSheetId}/edit`
        : '',
      driveFolderId: admin.driveFolderId || '',
      driveFolderUrl: admin.driveFolderUrl || '',
      isSuspended: Boolean(admin.isSuspended),
      createdAt: admin.createdAt || new Date().toISOString().split('T')[0]
    };

    fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveEntity',
        spreadsheetId: MASTER_SPREADSHEET_ID,
        sheetName: 'Admins',
        keyField: 'id',
        data: adminRow
      })
    }).catch(() => {});
  }

  function syncMemberToSheetsServer(member: any): void {
    if (!member || !member.id) return;
    const gasUrl = getGasWebAppUrl();
    const admins: any[] = Array.isArray(state.store['ams_school_admins']) ? state.store['ams_school_admins'] : [];
    const matchedAdmin = admins.find(
      a => a && (a.id === member.schoolId || (a.schoolName && member.schoolName && a.schoolName === member.schoolName))
    );

    if (matchedAdmin && isRealSheetIdServer(matchedAdmin.googleSheetId)) {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveMember',
          spreadsheetId: matchedAdmin.googleSheetId,
          schoolId: matchedAdmin.id,
          schoolName: matchedAdmin.schoolName,
          member
        })
      }).catch(() => {});
    }

    fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveMember',
        spreadsheetId: MASTER_SPREADSHEET_ID,
        member
      })
    }).catch(() => {});
  }

  async function provisionSchoolSheetOnServer(adminInput: any): Promise<any> {
    const adminId = String(adminInput?.adminId || adminInput?.id || '').trim();
    const schoolName = String(adminInput?.schoolName || '').trim();
    if (!schoolName) {
      return { status: 'error', message: 'Missing schoolName' };
    }

    // Check if this Admin already has a real Google Sheet ID in state.store
    const currentAdmins: any[] = Array.isArray(state.store['ams_school_admins']) ? state.store['ams_school_admins'] : [];
    const existingAdmin = currentAdmins.find(
      a => a && ((adminId && a.id === adminId) || (a.schoolName && String(a.schoolName).trim() === schoolName))
    );
    if (existingAdmin && isRealSheetIdServer(existingAdmin.googleSheetId) && !adminInput?.forceRecreate) {
      return {
        status: 'success',
        spreadsheetId: existingAdmin.googleSheetId,
        spreadsheetUrl:
          existingAdmin.googleSheetUrl || `https://docs.google.com/spreadsheets/d/${existingAdmin.googleSheetId}/edit`,
        driveFolderId: existingAdmin.driveFolderId || '',
        driveFolderUrl: existingAdmin.driveFolderUrl || '',
        schoolName,
        message: `เชื่อมต่อ Google Sheet และโฟลเดอร์ Google Drive ประจำโรงเรียน "${schoolName}" สำเร็จ`
      };
    }

    const cleanSchoolKey = schoolName.replace(/^โรงเรียน/, '').replace(/\s+/g, '').trim().toLowerCase() || schoolName;
    const lockKey = cleanSchoolKey;
    if (inFlightSheetProvisions.has(lockKey)) {
      return inFlightSheetProvisions.get(lockKey)!;
    }

    const task = (async () => {
      const gasUrl = getGasWebAppUrl();
      const folderId = adminInput?.folderId || getDriveFolderId();
      let lastError = 'ไม่สามารถสร้าง Google Sheet ได้';

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'createSchoolSheet',
              schoolName,
              schoolCode: adminInput?.schoolCode || existingAdmin?.schoolCode || '',
              adminId: adminId || existingAdmin?.id || '',
              username: adminInput?.username || existingAdmin?.username || '',
              password: adminInput?.password || existingAdmin?.password || '123456',
              fullName: adminInput?.fullName || existingAdmin?.fullName || `ผู้ดูแลระบบ ${schoolName}`,
              affiliation: adminInput?.affiliation || existingAdmin?.affiliation || 'สพป.',
              directorName: adminInput?.directorName || existingAdmin?.directorName || '',
              masterSpreadsheetId: MASTER_SPREADSHEET_ID,
              folderId
            })
          });

          const text = await response.text();
          let data: any = null;
          try {
            data = JSON.parse(text);
          } catch {
            lastError = 'GAS response was not valid JSON';
          }

          if (data && data.status === 'success' && isRealSheetIdServer(data.spreadsheetId)) {
            const spreadsheetId = String(data.spreadsheetId).trim();
            const spreadsheetUrl =
              data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
            const driveFolderId = data.driveFolderId || existingAdmin?.driveFolderId || '';
            const driveFolderUrl =
              data.driveFolderUrl ||
              (driveFolderId ? `https://drive.google.com/drive/folders/${driveFolderId}` : '');

            // Update state.store['ams_school_admins'] immediately and broadcast to all connected clients
            const latestAdmins: any[] = Array.isArray(state.store['ams_school_admins'])
              ? [...state.store['ams_school_admins']]
              : [];
            const targetIdx = latestAdmins.findIndex(
              a => a && ((adminId && a.id === adminId) || (a.schoolName && String(a.schoolName).trim() === schoolName))
            );

            if (targetIdx >= 0) {
              const updatedAdmin = {
                ...latestAdmins[targetIdx],
                googleSheetId: spreadsheetId,
                googleSheetUrl: spreadsheetUrl,
                driveFolderId: driveFolderId || latestAdmins[targetIdx].driveFolderId,
                driveFolderUrl: driveFolderUrl || latestAdmins[targetIdx].driveFolderUrl
              };
              latestAdmins[targetIdx] = updatedAdmin;
              const nowTs = Math.max(Date.now(), (Number(state.timestamps['ams_school_admins']) || 0) + 1);
              state.store['ams_school_admins'] = latestAdmins;
              state.timestamps['ams_school_admins'] = nowTs;
              recentServerMutationTs.set('ams_school_admins', nowTs);
              state.rev += 1;
              scheduleDiskSave();
              broadcastDelta(
                'server-sheet-provisioned',
                { ams_school_admins: latestAdmins },
                { ams_school_admins: nowTs }
              );
              scheduleCloudKvPush(['ams_school_admins']);
              syncAdminToMasterSheetServer(updatedAdmin);
            }

            return {
              status: 'success',
              spreadsheetId,
              spreadsheetUrl,
              driveFolderId,
              driveFolderUrl,
              schoolName,
              message:
                data.message ||
                `สร้างไฟล์ Google Sheet และโฟลเดอร์ Google Drive ประจำโรงเรียน "${schoolName}" สำเร็จเรียบร้อยแล้ว`
            };
          } else if (data && data.message) {
            lastError = data.message;
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
        }

        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1200 * attempt));
        }
      }

      return { status: 'error', message: lastError };
    })();

    inFlightSheetProvisions.set(lockKey, task);
    try {
      return await task;
    } finally {
      inFlightSheetProvisions.delete(lockKey);
    }
  }

  // Server-side Google Sheet Provisioning, Proxy & Deduplication Endpoints
  app.post('/api/google/create-school-sheet', async (req, res) => {
    try {
      const result = await provisionSchoolSheetOnServer(req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err?.message || 'Internal error' });
    }
  });

  app.post('/api/google/deduplicate-school-folders', async (req, res) => {
    try {
      const schoolName = req.body?.schoolName || '';
      const folderId = req.body?.folderId || getDriveFolderId();
      const gasUrl = getGasWebAppUrl();
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deduplicateSchoolFolders',
          schoolName,
          folderId
        })
      });
      const text = await response.text();
      try {
        res.json(JSON.parse(text));
      } catch {
        res.json({ status: 'success', raw: text });
      }
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err?.message || 'Error deduplicating folders' });
    }
  });

  app.post('/api/google/proxy', async (req, res) => {
    try {
      const payload = req.body || {};
      const gasUrl = payload.gasUrl || getGasWebAppUrl();
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      try {
        res.json(JSON.parse(text));
      } catch {
        res.json({ status: 'success', raw: text });
      }
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err?.message || 'GAS proxy error' });
    }
  });

  // 4. Compatible /api/d1 Endpoint
  app.all('/api/d1', async (req, res) => {
    const action = String(req.query.action || 'ping');

    if (action === 'ping') {
      res.json({
        status: 'success',
        message: 'Firebase Firestore & Real-Time Cloud Sync is online',
        isD1Available: true,
        result: { isOnline: 1 }
      });
      return;
    }

    if (action === 'getAll') {
      await Promise.all([
        syncWithFirestoreServer(false).catch(() => {}),
        Promise.race([
          pullFromCloudKV(false).catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 4500))
        ])
      ]);
      const developer = state.store['ams_developer_account'] || { username: 'airfan', password: '456789' };
      const admins = state.store['ams_school_admins'] || [];
      const members = state.store['ams_members'] || [];
      const academicYears = state.store['ams_academic_years'] || ['2568', '2569'];

      res.json({
        status: 'success',
        isD1Available: true,
        data: { developer, admins, members, academicYears }
      });
      return;
    }

    if (action === 'getRealtimeState') {
      res.json({
        status: 'success',
        isD1Available: true,
        rev: state.rev,
        store: state.store,
        timestamps: state.timestamps
      });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const now = Date.now();

      if (action === 'saveRealtimeState') {
        const { key, value, updatedAt = now, clientId = 'd1-client' } = body;
        if (key) {
          const finalVal =
            isTaskKeyName(key) && key in state.store
              ? mergeTaskListsServer(state.store[key], value)
              : isDutyLogKeyName(key) && key in state.store
              ? mergeDutyLogListsServer(state.store[key], value)
              : value;
          const effTs = Math.max(now, Number(state.timestamps[key]) + 1 || 0, Number(updatedAt) || 0);
          state.store[key] = finalVal;
          state.timestamps[key] = effTs;
          recentServerMutationTs.set(key, effTs);
          state.rev += 1;
          scheduleDiskSave();
          broadcastDelta(clientId, { [key]: finalVal }, { [key]: effTs });
          scheduleCloudKvPush([key]);
        }
        res.json({ status: 'success', rev: state.rev });
        return;
      }

      if (action === 'updateDevPassword') {
        const dev = { username: 'airfan', password: body.password || '456789' };
        const effTs = Math.max(now, (Number(state.timestamps['ams_developer_account']) || 0) + 1);
        state.store['ams_developer_account'] = dev;
        state.timestamps['ams_developer_account'] = effTs;
        recentServerMutationTs.set('ams_developer_account', effTs);
        state.rev += 1;
        scheduleDiskSave();
        broadcastDelta('server-d1', { ams_developer_account: dev }, { ams_developer_account: effTs });
        scheduleCloudKvPush(['ams_developer_account']);
        res.json({ status: 'success', message: 'Updated developer password' });
        return;
      }

      if (action === 'saveAdmin') {
        const admins: any[] = Array.isArray(state.store['ams_school_admins']) ? [...state.store['ams_school_admins']] : [];
        const idx = admins.findIndex(
          a =>
            a &&
            (a.id === body.id ||
              (a.username && body.username && String(a.username).toLowerCase() === String(body.username).toLowerCase()))
        );
        let savedAdmin: any;
        if (idx >= 0) {
          const prev = admins[idx];
          savedAdmin = { ...prev, ...body };
          if (isRealSheetIdServer(prev.googleSheetId) && !isRealSheetIdServer(body.googleSheetId)) {
            savedAdmin.googleSheetId = prev.googleSheetId;
            savedAdmin.googleSheetUrl = prev.googleSheetUrl || `https://docs.google.com/spreadsheets/d/${prev.googleSheetId}/edit`;
          }
          if (prev.driveFolderId && !body.driveFolderId) {
            savedAdmin.driveFolderId = prev.driveFolderId;
            savedAdmin.driveFolderUrl = prev.driveFolderUrl || `https://drive.google.com/drive/folders/${prev.driveFolderId}`;
          }
          admins[idx] = savedAdmin;
        } else {
          savedAdmin = { ...body };
          admins.unshift(savedAdmin);
        }
        const effTs = Math.max(now, (Number(state.timestamps['ams_school_admins']) || 0) + 1);
        state.store['ams_school_admins'] = admins;
        state.timestamps['ams_school_admins'] = effTs;
        recentServerMutationTs.set('ams_school_admins', effTs);
        state.rev += 1;
        scheduleDiskSave();
        broadcastDelta('server-d1', { ams_school_admins: admins }, { ams_school_admins: effTs });
        scheduleCloudKvPush(['ams_school_admins']);
        syncAdminToMasterSheetServer(savedAdmin);
        if (!isRealSheetIdServer(savedAdmin.googleSheetId)) {
          provisionSchoolSheetOnServer(savedAdmin).catch(() => {});
        }
        res.json({ status: 'success', message: 'Saved admin', admin: savedAdmin });
        return;
      }

      if (action === 'deleteAdmin') {
        const admins: any[] = Array.isArray(state.store['ams_school_admins']) ? state.store['ams_school_admins'] : [];
        const targetAdmin = admins.find(a => a.id === body.id);
        const members: any[] = Array.isArray(state.store['ams_members']) ? state.store['ams_members'] : [];
        const nextAdmins = admins.filter(a => a.id !== body.id);
        const nextMembers = members.filter(
          m => m.schoolId !== body.id && (!targetAdmin || m.schoolName !== targetAdmin.schoolName)
        );
        const effTs = Math.max(now, (Number(state.timestamps['ams_school_admins']) || 0) + 1);
        state.store['ams_school_admins'] = nextAdmins;
        state.store['ams_members'] = nextMembers;
        state.timestamps['ams_school_admins'] = effTs;
        state.timestamps['ams_members'] = effTs;
        recentServerMutationTs.set('ams_school_admins', effTs);
        recentServerMutationTs.set('ams_members', effTs);

        const deltaUpdates: Record<string, any> = {
          ams_school_admins: nextAdmins,
          ams_members: nextMembers
        };
        const deltaTimestamps: Record<string, number> = {
          ams_school_admins: effTs,
          ams_members: effTs
        };

        // Cascade delete tenant-scoped keys for this school
        const suffix = `__${body.id}`;
        for (const k of Object.keys(state.store)) {
          if (k.endsWith(suffix)) {
            delete state.store[k];
            state.timestamps[k] = effTs;
            recentServerMutationTs.set(k, effTs);
            deltaUpdates[k] = null;
            deltaTimestamps[k] = effTs;
          }
        }

        state.rev += 1;
        scheduleDiskSave();
        broadcastDelta('server-d1', deltaUpdates, deltaTimestamps);
        scheduleCloudKvPush(['ams_school_admins', 'ams_members']);

        // Also trigger Google Sheets cleanup from server
        const gasUrl = getGasWebAppUrl();
        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'deleteSchoolSheet',
            spreadsheetId: MASTER_SPREADSHEET_ID,
            masterSpreadsheetId: MASTER_SPREADSHEET_ID,
            schoolSpreadsheetId: targetAdmin?.googleSheetId || '',
            googleSheetId: targetAdmin?.googleSheetId || '',
            adminId: body.id,
            schoolName: targetAdmin?.schoolName || ''
          })
        }).catch(() => {});

        res.json({ status: 'success', message: 'Deleted admin, school sheet, and cascade members' });
        return;
      }

      if (action === 'saveMember') {
        const members: any[] = Array.isArray(state.store['ams_members']) ? [...state.store['ams_members']] : [];
        const idx = members.findIndex(m => m && m.id === body.id);
        let savedMember: any;
        if (idx >= 0) {
          savedMember = { ...members[idx], ...body };
          members[idx] = savedMember;
        } else {
          savedMember = { ...body };
          members.unshift(savedMember);
        }
        const effTs = Math.max(now, (Number(state.timestamps['ams_members']) || 0) + 1);
        state.store['ams_members'] = members;
        state.timestamps['ams_members'] = effTs;
        recentServerMutationTs.set('ams_members', effTs);
        state.rev += 1;
        scheduleDiskSave();
        broadcastDelta('server-d1', { ams_members: members }, { ams_members: effTs });
        scheduleCloudKvPush(['ams_members']);
        syncMemberToSheetsServer(savedMember);
        res.json({ status: 'success', message: 'Saved member', member: savedMember });
        return;
      }

      if (action === 'deleteMember') {
        const members: any[] = Array.isArray(state.store['ams_members']) ? state.store['ams_members'] : [];
        const nextMembers = members.filter(m => m.id !== body.id);
        const effTs = Math.max(now, (Number(state.timestamps['ams_members']) || 0) + 1);
        state.store['ams_members'] = nextMembers;
        state.timestamps['ams_members'] = effTs;
        recentServerMutationTs.set('ams_members', effTs);
        state.rev += 1;
        scheduleDiskSave();
        broadcastDelta('server-d1', { ams_members: nextMembers }, { ams_members: effTs });
        scheduleCloudKvPush(['ams_members']);
        res.json({ status: 'success', message: 'Deleted member' });
        return;
      }

      if (action === 'saveYear') {
        const years: string[] = Array.isArray(state.store['ams_academic_years']) ? [...state.store['ams_academic_years']] : ['2568', '2569'];
        if (body.year && !years.includes(body.year)) {
          years.push(body.year);
          years.sort((a, b) => Number(a) - Number(b));
        }
        const effTs = Math.max(now, (Number(state.timestamps['ams_academic_years']) || 0) + 1);
        state.store['ams_academic_years'] = years;
        state.timestamps['ams_academic_years'] = effTs;
        recentServerMutationTs.set('ams_academic_years', effTs);
        state.rev += 1;
        scheduleDiskSave();
        broadcastDelta('server-d1', { ams_academic_years: years }, { ams_academic_years: effTs });
        scheduleCloudKvPush(['ams_academic_years']);
        res.json({ status: 'success', message: 'Saved academic year' });
        return;
      }

      if (action === 'deleteYear') {
        const targetYear = String(body.year || '').trim();
        const gregorianYear = String(Number(targetYear) - 543);
        const years: string[] = Array.isArray(state.store['ams_academic_years']) ? state.store['ams_academic_years'] : ['2568', '2569'];
        const nextYears = years.filter(y => y !== targetYear);
        const fallbackYear = nextYears[nextYears.length - 1] || '2568';

        const deltaUpdates: Record<string, any> = {
          ams_academic_years: nextYears.length > 0 ? nextYears : ['2568']
        };
        const deltaTimestamps: Record<string, number> = {
          ams_academic_years: now
        };

        state.store['ams_academic_years'] = deltaUpdates.ams_academic_years;
        state.timestamps['ams_academic_years'] = now;

        const isDateMatchingYear = (d?: string) => {
          if (!d || typeof d !== 'string') return false;
          if (d.includes(targetYear)) return true;
          if (!isNaN(Number(targetYear)) && d.includes(gregorianYear)) return true;
          return false;
        };

        // Sweep all keys in state.store across all school tenants
        for (const [k, v] of Object.entries(state.store)) {
          if (!k || k === 'ams_academic_years' || k === 'ams_school_admins' || k === 'ams_members' || k === 'ams_developer_account') continue;
          const baseKey = k.includes('__') ? k.split('__')[0] : k;

          if (baseKey === 'ams_school_info' && v && typeof v === 'object') {
            if (v.academicYear === targetYear) {
              const nextInfo = { ...v, academicYear: fallbackYear };
              state.store[k] = nextInfo;
              state.timestamps[k] = now;
              deltaUpdates[k] = nextInfo;
              deltaTimestamps[k] = now;
            }
          } else if (Array.isArray(v)) {
            if (
              baseKey === 'ams_students' ||
              baseKey === 'ams_personnel' ||
              baseKey === 'ams_websites' ||
              baseKey === 'ams_custom_buttons' ||
              baseKey === 'ams_custom_pages' ||
              baseKey === 'ams_duty_assignments_v1'
            ) {
              continue;
            }
            const filtered = v.filter((item: any) => {
              if (!item || typeof item !== 'object') return true;
              if (String(item.academicYear || '') === targetYear) return false;
              if (item.date && isDateMatchingYear(item.date)) return false;
              if (item.dueDate && isDateMatchingYear(item.dueDate)) return false;
              if (item.startDate && isDateMatchingYear(item.startDate)) return false;
              if (baseKey === 'ams_documents' && item.docNumber && String(item.docNumber).endsWith('/' + targetYear)) return false;
              return true;
            });
            if (filtered.length !== v.length) {
              state.store[k] = filtered;
              state.timestamps[k] = now;
              deltaUpdates[k] = filtered;
              deltaTimestamps[k] = now;
            }
          } else if (v && typeof v === 'object') {
            if (
              baseKey === 'ams_behavior_evaluations' ||
              baseKey === 'ams_attendance_configs_by_term' ||
              baseKey === 'ams_reading_writing_config_v2' ||
              baseKey === 'ams_assessment_3_booklets_v2' ||
              baseKey.startsWith('pp6_')
            ) {
              let modified = false;
              const nextObj: Record<string, any> = {};
              for (const [subK, subV] of Object.entries(v)) {
                const keyHasYear = subK.includes(targetYear);
                const valHasYear = subV && typeof subV === 'object' && String((subV as any).academicYear || '') === targetYear;
                if (keyHasYear || valHasYear) {
                  modified = true;
                } else {
                  nextObj[subK] = subV;
                }
              }
              if (modified) {
                state.store[k] = nextObj;
                state.timestamps[k] = now;
                deltaUpdates[k] = nextObj;
                deltaTimestamps[k] = now;
              }
            }
          }
        }

        state.rev += 1;
        scheduleDiskSave();
        broadcastDelta('server-d1', deltaUpdates, deltaTimestamps);
        scheduleCloudKvPush(Object.keys(deltaUpdates));
        res.json({ status: 'success', message: 'Deleted academic year and cascaded all store keys' });
        return;
      }
    }

    res.status(400).json({ status: 'error', message: 'Unknown action' });
  });

  // 5. Vite middleware in development, static files in production
  const distPath = path.join(__dirname, 'dist');
  // Always serve self-destructing service worker at /sw.js and /registerSW.js so any browser with a cached PWA ServiceWorker immediately clears its cache
  app.get(['/sw.js', '/registerSW.js'], (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.send(`
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        for (const c of clients) {
          if (c.url && 'navigate' in c) c.navigate(c.url).catch(() => {});
        }
      })
  );
});
`);
  });

  if (process.env.NODE_ENV !== 'production' || !fs.existsSync(distPath)) {
    // Also serve built /assets from dist if a stale cached index.html requests /assets/index-*.js before SW unregisters
    if (fs.existsSync(path.join(distPath, 'assets'))) {
      app.use('/assets', express.static(path.join(distPath, 'assets')));
    }
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    // Ensure any persisted task submissions with base64 data URLs are hosted & uploaded to Google Drive
    for (const [k, v] of Object.entries(state.store)) {
      if (isTaskKeyName(k)) {
        state.store[k] = ensureTaskFilesHostedAndUploaded(k, v);
      }
    }
    // Initial global cloud sync
    syncWithFirestoreServer(false).catch(() => {});
    startServerFirestoreListener();
    pullFromCloudKV(false).catch(() => {});
    // Continuous background cloud KV reconciliation every 5 seconds
    setInterval(() => {
      pullFromCloudKV(false).catch(() => {});
    }, 5000);
  });
}

startServer();
