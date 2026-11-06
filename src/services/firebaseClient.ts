import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  collection,
  onSnapshot,
  query,
  where,
  setLogLevel,
  terminate
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal @firebase/firestore WebChannel backoff logs when free-tier daily quota is reached
try {
  setLogLevel('silent');
} catch {
  // ignore
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

let firestoreUnavailable = false;
let permissionErrorLogged = false;
const lastSyncedSerialized = new Map<string, string>();

function isQuotaOrNetworkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  const code = (error as any)?.code || '';
  return (
    code === 'resource-exhausted' ||
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('client is offline') ||
    msg.includes('terminated')
  );
}

function tripCircuitBreaker() {
  if (firestoreUnavailable) return;
  firestoreUnavailable = true;
  try {
    terminate(db).catch(() => {});
  } catch {
    // ignore
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isQuotaOrNetworkError(error)) {
    tripCircuitBreaker();
    throw new Error('FIRESTORE_QUOTA_OR_OFFLINE');
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  if (!permissionErrorLogged) {
    permissionErrorLogged = true;
    tripCircuitBreaker();
  }
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  if (firestoreUnavailable) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (isQuotaOrNetworkError(error)) {
      tripCircuitBreaker();
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

const KV_COLLECTION = 'realtime_kv';
const CHUNKS_COLLECTION = 'realtime_kv_chunks';
const SINGLE_DOC_MAX_CHARS = 650000;
const MAX_CHUNKS = 25;

export function sanitizeFirestoreKey(rawKey: string): string {
  const cleaned = String(rawKey || '')
    .replace(/[^a-zA-Z0-9_-]/g, ch => `-u${(ch.codePointAt(0) || 0).toString(36)}-`)
    .slice(0, 120);
  return cleaned || 'default_key';
}

export function unsanitizeFirestoreKey(docId: string): string {
  return String(docId || '').replace(/-u([0-9a-z]+)-/g, (_m, code) => {
    const cp = parseInt(code, 36);
    return Number.isFinite(cp) && cp > 0 ? String.fromCodePoint(cp) : _m;
  });
}

export async function saveKeyToFirestore(
  rawKey: string,
  value: any,
  updatedAt: number,
  clientId: string
): Promise<boolean> {
  if (firestoreUnavailable) return false;

  const docId = sanitizeFirestoreKey(rawKey);
  if (!docId || docId === 'ams_session') return false;

  const serialized = JSON.stringify(value ?? null);
  if (!serialized) return false;

  // Deduplicate identical writes to preserve daily Firestore write quota
  if (lastSyncedSerialized.get(docId) === serialized) {
    return true;
  }

  const safeClientId = String(clientId || 'client').slice(0, 120);
  const safeUpdatedAt = Number(updatedAt) > 0 ? Number(updatedAt) : Date.now();

  try {
    if (serialized.length <= SINGLE_DOC_MAX_CHARS) {
      const path = `${KV_COLLECTION}/${docId}`;
      try {
        await setDoc(doc(db, KV_COLLECTION, docId), {
          id: docId,
          valueJson: serialized,
          updatedAt: safeUpdatedAt,
          chunkCount: 0,
          clientId: safeClientId,
        });
        lastSyncedSerialized.set(docId, serialized);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      return true;
    }

    // Large payload (> 650KB): split into chunks in realtime_kv_chunks
    const chunks: string[] = [];
    for (let i = 0; i < serialized.length; i += SINGLE_DOC_MAX_CHARS) {
      chunks.push(serialized.slice(i, i + SINGLE_DOC_MAX_CHARS));
    }
    if (chunks.length > MAX_CHUNKS) {
      return false;
    }

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkId = `${docId}__part_${idx}`;
      const chunkPath = `${CHUNKS_COLLECTION}/${chunkId}`;
      try {
        await setDoc(doc(db, CHUNKS_COLLECTION, chunkId), {
          id: chunkId,
          parentKey: docId,
          partIndex: idx,
          data: chunks[idx],
          updatedAt: safeUpdatedAt,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, chunkPath);
      }
    }

    const manifestPath = `${KV_COLLECTION}/${docId}`;
    try {
      await setDoc(doc(db, KV_COLLECTION, docId), {
        id: docId,
        valueJson: '',
        updatedAt: safeUpdatedAt,
        chunkCount: chunks.length,
        clientId: safeClientId,
      });
      lastSyncedSerialized.set(docId, serialized);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, manifestPath);
    }

    return true;
  } catch {
    return false;
  }
}

async function resolveEntryValue(
  data: any
): Promise<{ key: string; value: any; updatedAt: number; clientId: string } | null> {
  if (firestoreUnavailable || !data || typeof data.id !== 'string') return null;
  const docId = data.id;
  const rawKey = unsanitizeFirestoreKey(docId);
  const updatedAt = Number(data.updatedAt) || Date.now();
  const chunkCount = Number(data.chunkCount) || 0;
  const clientId = String(data.clientId || '');

  try {
    let fullJson = typeof data.valueJson === 'string' ? data.valueJson : '';

    if (chunkCount > 0) {
      const parts: string[] = [];
      for (let idx = 0; idx < chunkCount; idx++) {
        const chunkId = `${docId}__part_${idx}`;
        const chunkPath = `${CHUNKS_COLLECTION}/${chunkId}`;
        try {
          const snap = await getDoc(doc(db, CHUNKS_COLLECTION, chunkId));
          if (!snap.exists()) return null;
          const cData = snap.data();
          parts.push(typeof cData.data === 'string' ? cData.data : '');
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, chunkPath);
        }
      }
      fullJson = parts.join('');
    }

    if (!fullJson) return null;
    lastSyncedSerialized.set(docId, fullJson);
    const parsed = JSON.parse(fullJson);
    return { key: rawKey, value: parsed, updatedAt, clientId };
  } catch {
    return null;
  }
}

export async function pullAllFromFirestore(): Promise<{
  store: Record<string, any>;
  timestamps: Record<string, number>;
}> {
  const store: Record<string, any> = {};
  const timestamps: Record<string, number> = {};

  if (firestoreUnavailable) {
    return { store, timestamps };
  }

  try {
    let snap;
    try {
      const kvQuery = query(collection(db, KV_COLLECTION), where('updatedAt', '>', 0));
      snap = await getDocs(kvQuery);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, KV_COLLECTION);
    }

    const promises: Promise<{ key: string; value: any; updatedAt: number; clientId: string } | null>[] = [];
    snap.forEach(docSnap => {
      promises.push(resolveEntryValue(docSnap.data()));
    });

    const resolvedList = await Promise.all(promises);
    for (const item of resolvedList) {
      if (!item) continue;
      store[item.key] = item.value;
      timestamps[item.key] = item.updatedAt;
    }
  } catch {
    // Gracefully fallback to Express Real-Time Server & Cloud KV
  }

  return { store, timestamps };
}

export function subscribeToFirestoreRealtime(
  onDelta: (updates: Record<string, any>, timestamps: Record<string, number>, sourceClientId: string) => void
): () => void {
  if (firestoreUnavailable) {
    return () => {};
  }

  try {
    const kvQuery = query(collection(db, KV_COLLECTION), where('updatedAt', '>', 0));
    const unsubscribe = onSnapshot(
      kvQuery,
      async snapshot => {
        if (firestoreUnavailable) return;
        const changes = snapshot.docChanges();
        if (changes.length === 0) return;

        const updates: Record<string, any> = {};
        const timestamps: Record<string, number> = {};
        let lastClientId = 'firestore-live';

        const tasks: Promise<void>[] = [];
        for (const change of changes) {
          if (change.type === 'added' || change.type === 'modified') {
            const rawData = change.doc.data();
            tasks.push(
              resolveEntryValue(rawData).then(resolved => {
                if (resolved) {
                  updates[resolved.key] = resolved.value;
                  timestamps[resolved.key] = resolved.updatedAt;
                  if (resolved.clientId) lastClientId = resolved.clientId;
                }
              })
            );
          }
        }

        await Promise.all(tasks);
        if (Object.keys(updates).length > 0) {
          onDelta(updates, timestamps, lastClientId);
        }
      },
      error => {
        try {
          handleFirestoreError(error, OperationType.LIST, KV_COLLECTION);
        } catch {
          // Circuit breaker engaged
        }
      }
    );

    return unsubscribe;
  } catch {
    return () => {};
  }
}
