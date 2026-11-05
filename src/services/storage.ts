import {
  Student,
  Personnel,
  SchoolInfo,
  DailyTracking,
  Subject,
  GradeRecord,
  AttendanceRecord,
  AttendanceDayConfig,
  SavingsRecord,
  TaskItem,
  TaskSubmission,
  DocumentItem,
  RecommendedWebsite,
  CalendarEvent,
  MemberAccount,
  GoogleConfig,
  UserSession,
  SchoolAdminAccount,
  CommentSession,
  StudentBehaviorEvaluation,
  CustomButton,
  CustomPage,
  LeaveRequestRecord
} from '../types';
import { D1Service } from './d1Service';
import {
  saveKeyToFirestore,
  pullAllFromFirestore,
  subscribeToFirestoreRealtime
} from './firebaseClient';

import {
  INITIAL_SCHOOL_INFO,
  INITIAL_MEMBERS,
  INITIAL_ADMINS,
  INITIAL_STUDENTS,
  INITIAL_PERSONNEL,
  INITIAL_DAILY_TRACKING,
  INITIAL_SUBJECTS,
  PRIMARY_DEFAULT_SUBJECT_TEMPLATES,
  buildDefaultPrimarySubjectsForYears,
  INITIAL_GRADES,
  INITIAL_ATTENDANCE_CONFIG,
  INITIAL_ATTENDANCE,
  INITIAL_SAVINGS,
  INITIAL_TASKS,
  INITIAL_DOCUMENTS,
  INITIAL_WEBSITES,
  INITIAL_CALENDAR_EVENTS
} from './initialData';

const KEYS = {
  SESSION: 'ams_session',
  GOOGLE_CONFIG: 'ams_google_config',
  SCHOOL_INFO: 'ams_school_info',
  ADMINS: 'ams_school_admins',
  MEMBERS: 'ams_members',
  STUDENTS: 'ams_students',
  PERSONNEL: 'ams_personnel',
  DAILY_TRACKING: 'ams_daily_tracking',
  SUBJECTS: 'ams_subjects',
  GRADES: 'ams_grades',
  ATTENDANCE_CONFIG: 'ams_attendance_config',
  ATTENDANCE: 'ams_attendance',
  SAVINGS: 'ams_savings',
  TASKS: 'ams_tasks',
  DOCUMENTS: 'ams_documents',
  WEBSITES: 'ams_websites',
  CALENDAR: 'ams_calendar',
  ACADEMIC_YEARS: 'ams_academic_years',
  LOCKED_SEMESTERS: 'ams_locked_semesters',
  ATTENDANCE_CONFIGS_BY_TERM: 'ams_attendance_configs_by_term',
  COMMENT_SESSIONS: 'ams_comment_sessions',
  BEHAVIOR_EVALUATIONS: 'ams_behavior_evaluations',
  CUSTOM_BUTTONS: 'ams_custom_buttons',
  CUSTOM_PAGES: 'ams_custom_pages',
  LEAVE_REQUESTS: 'ams_leave_requests_v1',
  DUTY_ASSIGNMENTS: 'ams_duty_assignments_v1',
  DUTY_LOGS: 'ams_daily_duty_logs_v1',
  GENERIC_ENTITIES: 'ams_generic_entities',
  DEVELOPER_ACCOUNT: 'ams_developer_account'
};

// Keys shared globally across all schools so any user can sign in from any device/browser/email
const GLOBAL_KEYS = new Set<string>([
  KEYS.SESSION,
  KEYS.GOOGLE_CONFIG,
  KEYS.ADMINS,
  KEYS.MEMBERS,
  KEYS.ACADEMIC_YEARS,
  KEYS.DEVELOPER_ACCOUNT,
  'ams_deleted_subject_ids',
  'ams_deleted_task_ids',
  'ams_deleted_submission_keys',
  'ams_deleted_doc_ids',
  'ams_deleted_leave_ids',
  'ams_deleted_duty_log_ids'
]);

// Keys that must be strictly isolated per School (Multi-Tenant Data Isolation)
const TENANT_SCOPED_KEYS = new Set<string>([
  KEYS.SCHOOL_INFO,
  KEYS.STUDENTS,
  KEYS.PERSONNEL,
  KEYS.DAILY_TRACKING,
  KEYS.SUBJECTS,
  KEYS.GRADES,
  KEYS.ATTENDANCE_CONFIG,
  KEYS.ATTENDANCE,
  KEYS.SAVINGS,
  KEYS.TASKS,
  KEYS.DOCUMENTS,
  KEYS.WEBSITES,
  KEYS.CALENDAR,
  KEYS.LOCKED_SEMESTERS,
  KEYS.ATTENDANCE_CONFIGS_BY_TERM,
  KEYS.COMMENT_SESSIONS,
  KEYS.BEHAVIOR_EVALUATIONS,
  KEYS.CUSTOM_BUTTONS,
  KEYS.CUSTOM_PAGES,
  KEYS.LEAVE_REQUESTS,
  KEYS.DUTY_ASSIGNMENTS,
  KEYS.DUTY_LOGS,
  'ams_reading_writing_config_v2',
  'ams_assessment_3_booklets_v2',
  'ams_weight_height_sessions_v2'
]);

const DEFAULT_GAS_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbzol007NNSB5uYI_no15j6GB5Ej3IQ2MuN50Sud7mQKMYloHBYxoxv6N8PVLgSfsNjlZw/exec';
const MASTER_SPREADSHEET_ID = '1mVJl2FSHiJmQlOR8t-7h1Z4wXfbMWepUU_Qzkd1FSAM';
const CLOUD_KV_SHEET = 'RealtimeCloudKV';
const CLOUD_CHUNK_SIZE = 38000;
const CLOUD_MAX_CHUNKS = 12;

const INTERNAL_SKIP_KEYS = new Set<string>([
  KEYS.SESSION,
  'ams_attendance_reset_clean_v6',
  'ams_savings_reset_clean_v7',
  'ams_savings_cleared_v3',
  'ams_attendance_initialized'
]);

function cleanSchoolNameForMatch(name?: string): string {
  if (!name) return '';
  return name.replace(/^โรงเรียน/, '').replace(/\s+/g, '').trim().toLowerCase();
}

function normalizeSchoolId(rawSchoolId?: string, rawSchoolName?: string, adminsList?: SchoolAdminAccount[]): string {
  if (!rawSchoolId && !rawSchoolName) return 'admin-school-01';

  let admins = adminsList;
  if (!admins) {
    try {
      const cached = memoryCache.get(KEYS.ADMINS);
      if (Array.isArray(cached) && cached.length > 0) {
        admins = cached;
      } else if (typeof window !== 'undefined') {
        const raw = nativeGetItem ? nativeGetItem(KEYS.ADMINS) : localStorage.getItem(KEYS.ADMINS);
        admins = raw ? JSON.parse(raw) : INITIAL_ADMINS;
      }
    } catch {
      admins = INITIAL_ADMINS;
    }
  }

  // 1. Check exact match in admins list
  if (rawSchoolId && Array.isArray(admins)) {
    const exact = admins.find(a => a.id === rawSchoolId);
    if (exact) {
      // If rawSchoolId is the default 'admin-school-01' but rawSchoolName explicitly matches a different school, prefer the name match
      if ((rawSchoolId === 'admin-school-01' || rawSchoolId === 'admin-01') && rawSchoolName) {
        const targetClean = cleanSchoolNameForMatch(rawSchoolName);
        const exactClean = cleanSchoolNameForMatch(exact.schoolName);
        if (targetClean && targetClean !== exactClean) {
          const byNameOther = admins.find(a => cleanSchoolNameForMatch(a.schoolName) === targetClean);
          if (byNameOther) return byNameOther.id;
        }
      }
      return exact.id;
    }
  }

  // 2. Match by schoolName (ignoring "โรงเรียน" prefix and spaces)
  if (rawSchoolName && Array.isArray(admins)) {
    const targetClean = cleanSchoolNameForMatch(rawSchoolName);
    if (targetClean) {
      const byName = admins.find(a => cleanSchoolNameForMatch(a.schoolName) === targetClean);
      if (byName) return byName.id;
    }
  }

  if (rawSchoolId === 'admin-01' || rawSchoolId === 'admin-school-01') return 'admin-school-01';
  return rawSchoolId || 'admin-school-01';
}

// Cached active school ID & session for O(1) tenant key resolution on mobile/PWA
let cachedActiveSchoolId: string | null | undefined = undefined;
let cachedSessionRaw: string | null | undefined = undefined;
let cachedSessionObj: UserSession | null = null;

function invalidateActiveSchoolIdCache(): void {
  cachedActiveSchoolId = undefined;
}

function getActiveSchoolId(): string | null {
  if (cachedActiveSchoolId !== undefined) {
    return cachedActiveSchoolId;
  }
  try {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(KEYS.SESSION);
    if (!raw) {
      cachedActiveSchoolId = null;
      return null;
    }
    const session = (raw === cachedSessionRaw && cachedSessionObj)
      ? cachedSessionObj
      : (JSON.parse(raw) as UserSession);
    cachedSessionRaw = raw;
    cachedSessionObj = session;

    if (session && session.role !== 'developer') {
      const adminsCached = memoryCache.get(KEYS.ADMINS);
      let admins: SchoolAdminAccount[];
      if (Array.isArray(adminsCached)) {
        admins = adminsCached;
      } else {
        const adminsRaw = nativeGetItem ? nativeGetItem(KEYS.ADMINS) : localStorage.getItem(KEYS.ADMINS);
        admins = adminsRaw ? JSON.parse(adminsRaw) : INITIAL_ADMINS;
        memoryCache.set(KEYS.ADMINS, admins);
      }

      if (session.role === 'admin') {
        const matchedAdmin = admins.find(
          a => a.id === session.id || a.username?.toLowerCase() === session.username?.toLowerCase()
        );
        if (matchedAdmin) {
          cachedActiveSchoolId = normalizeSchoolId(matchedAdmin.id, matchedAdmin.schoolName, admins);
          return cachedActiveSchoolId;
        }
      } else if (session.role === 'member') {
        const membersCached = memoryCache.get(KEYS.MEMBERS);
        let members: MemberAccount[];
        if (Array.isArray(membersCached)) {
          members = membersCached;
        } else {
          const membersRaw = nativeGetItem ? nativeGetItem(KEYS.MEMBERS) : localStorage.getItem(KEYS.MEMBERS);
          members = membersRaw ? JSON.parse(membersRaw) : INITIAL_MEMBERS;
          memoryCache.set(KEYS.MEMBERS, members);
        }
        const matchedMember = members.find(
          m => m.id === session.id || m.username?.toLowerCase() === session.username?.toLowerCase()
        );
        if (matchedMember) {
          cachedActiveSchoolId = normalizeSchoolId(
            matchedMember.schoolId || session.schoolId,
            matchedMember.schoolName || session.schoolName,
            admins
          );
          return cachedActiveSchoolId;
        }
      }
      cachedActiveSchoolId = normalizeSchoolId(session.schoolId, session.schoolName, admins);
      return cachedActiveSchoolId;
    }
    cachedActiveSchoolId = null;
    return null;
  } catch {
    cachedActiveSchoolId = null;
    return null;
  }
}

function resolveTenantKey(key: string): string {
  if (!key || GLOBAL_KEYS.has(key) || INTERNAL_SKIP_KEYS.has(key) || key.includes('__')) {
    return key;
  }
  const isTenantScoped =
    TENANT_SCOPED_KEYS.has(key) ||
    key.startsWith('ams_') ||
    key.startsWith('pp6_') ||
    key.startsWith('school_');
  if (!isTenantScoped) return key;

  const schoolId = getActiveSchoolId();
  if (schoolId && schoolId !== 'admin-school-01' && schoolId !== 'admin-01') {
    return `${key}__${schoolId}`;
  }
  return key;
}

// ============================================================================
// HIGH-SPEED IN-MEMORY CACHE & REAL-TIME MULTI-DEVICE / MULTI-BROWSER ENGINE
// ============================================================================
const CLIENT_ID = `client_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
const memoryCache = new Map<string, any>();
const serializedMemoryCache = new Map<string, string>();
const keyTimestamps = new Map<string, number>();
const locallyModifiedKeys = new Set<string>();
const localWriteTimestamps = new Map<string, number>();
const subscribers = new Set<(changedKeys: string[]) => void>();
let lastKnownRev = 0;
let realtimeInitialized = false;
let isInternalStorageWrite = false;
let broadcastChannel: BroadcastChannel | null = null;
let sseConnection: EventSource | null = null;
let firestoreUnsubscribe: (() => void) | null = null;
let isPullingRemoteState = false;
let isPullingCloudKV = false;
let lastRemotePullTime = 0;

const pendingDiskWrites = new Map<string, { value: any; skipRemotePush: boolean; timestamp: number }>();
let diskFlushTimer: ReturnType<typeof setTimeout> | null = null;

function flushPendingDiskWrites(): void {
  if (diskFlushTimer) {
    clearTimeout(diskFlushTimer);
    diskFlushTimer = null;
  }
  if (pendingDiskWrites.size === 0) return;
  const entries = Array.from(pendingDiskWrites.entries());
  pendingDiskWrites.clear();

  for (const [resolvedKey, item] of entries) {
    try {
      const serialized =
        typeof item.value === 'string' ? item.value : JSON.stringify(item.value);
      serializedMemoryCache.set(resolvedKey, serialized);
      if (nativeSetItem) {
        isInternalStorageWrite = true;
        try {
          nativeSetItem(resolvedKey, serialized);
        } finally {
          isInternalStorageWrite = false;
        }
      } else {
        localStorage.setItem(resolvedKey, serialized);
      }
    } catch {
      try {
        const compactSerialized = JSON.stringify(sanitizeValueForSync(item.value));
        serializedMemoryCache.set(resolvedKey, compactSerialized);
        if (nativeSetItem) {
          isInternalStorageWrite = true;
          try {
            nativeSetItem(resolvedKey, compactSerialized);
          } finally {
            isInternalStorageWrite = false;
          }
        } else {
          localStorage.setItem(resolvedKey, compactSerialized);
        }
      } catch {
        // Ignore quota overflow; memoryCache & remote server still hold full data
      }
    }

    if (!item.skipRemotePush) {
      pushToRemoteServer(resolvedKey, item.value, item.timestamp);
    }
  }
}

// Preserve native localStorage methods before hooking
const nativeSetItem: ((key: string, value: string) => void) | null =
  typeof window !== 'undefined' && window.localStorage
    ? window.localStorage.setItem.bind(window.localStorage)
    : null;
const nativeGetItem: ((key: string) => string | null) | null =
  typeof window !== 'undefined' && window.localStorage
    ? window.localStorage.getItem.bind(window.localStorage)
    : null;

function notifySubscribers(changedKeys: string[]) {
  if (changedKeys.length === 0) return;
  subscribers.forEach(listener => {
    try {
      listener(changedKeys);
    } catch (err) {
      console.error('Subscriber error:', err);
    }
  });
}

function buildCloudKvRowClient(key: string, value: any, updatedAt: number): Record<string, any> | null {
  try {
    let serialized = JSON.stringify(value);
    if (serialized && serialized.length > CLOUD_CHUNK_SIZE * CLOUD_MAX_CHUNKS) {
      serialized = JSON.stringify(sanitizeValueForSync(value));
    }
    if (!serialized || serialized.length > CLOUD_CHUNK_SIZE * CLOUD_MAX_CHUNKS) {
      return null;
    }
    const firstSlice = serialized.slice(0, CLOUD_CHUNK_SIZE);
    const row: Record<string, any> = {
      id: key,
      updatedAt,
      valueJson: firstSlice ? `~${firstSlice}` : ''
    };
    for (let i = 1; i < CLOUD_MAX_CHUNKS; i++) {
      const part = serialized.slice(i * CLOUD_CHUNK_SIZE, (i + 1) * CLOUD_CHUNK_SIZE);
      row[`c${i}`] = part ? `~${part}` : '';
    }
    return row;
  } catch {
    return null;
  }
}

function parseCloudKvRowClient(row: any): { key: string; value: any; updatedAt: number } | null {
  if (!row || !row.id || row.id === '_sync_test') return null;
  try {
    const stripTilde = (s: any): string => {
      if (s === undefined || s === null || s === '') return '';
      const str = String(s);
      return str.startsWith('~') ? str.slice(1) : str;
    };
    let fullJson = stripTilde(row.valueJson);
    for (let i = 1; i < CLOUD_MAX_CHUNKS; i++) {
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

function pushToGoogleCloudKVDirect(resolvedKey: string, value: any, timestamp: number) {
  if (typeof window === 'undefined') return;
  const row = buildCloudKvRowClient(resolvedKey, value, timestamp);
  if (!row) return;

  fetch(DEFAULT_GAS_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'batchSaveEntities',
      spreadsheetId: MASTER_SPREADSHEET_ID,
      sheetName: CLOUD_KV_SHEET,
      keyField: 'id',
      records: [row]
    })
  }).catch(() => {});
}

const tenantGoogleSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

function sanitizeValueForSync(val: any): any {
  if (!val) return val;
  if (typeof val === 'string') {
    // If it's a huge base64 data URL, do not re-upload via generic background sync
    if (val.startsWith('data:') && val.includes(';base64,')) {
      return '';
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(item => sanitizeValueForSync(item));
  }
  if (typeof val === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (
        (k === 'fileUrl' || k === 'fileData') &&
        typeof v === 'string' &&
        v.startsWith('data:') &&
        v.includes(';base64,') &&
        typeof val.localHostedUrl === 'string' &&
        val.localHostedUrl
      ) {
        res[k] = k === 'fileUrl' ? val.localHostedUrl : '';
      } else {
        res[k] = sanitizeValueForSync(v);
      }
    }
    return res;
  }
  return val;
}

function scheduleTenantKeySyncToSchoolSheet(resolvedKey: string, value: any, timestamp: number) {
  if (typeof window === 'undefined' || GLOBAL_KEYS.has(resolvedKey) || INTERNAL_SKIP_KEYS.has(resolvedKey)) return;

  let baseKey = resolvedKey;
  let explicitSchoolId = '';
  if (resolvedKey.includes('__')) {
    const parts = resolvedKey.split('__');
    baseKey = parts[0];
    explicitSchoolId = parts.slice(1).join('__');
  }

  const isTenantData =
    TENANT_SCOPED_KEYS.has(baseKey) ||
    baseKey.startsWith('ams_') ||
    baseKey.startsWith('pp6_') ||
    baseKey.startsWith('school_');
  if (!isTenantData) return;

  const existingTimer = tenantGoogleSyncTimers.get(resolvedKey);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    tenantGoogleSyncTimers.delete(resolvedKey);
    try {
      const targetSchoolId = explicitSchoolId || getActiveSchoolId() || 'admin-school-01';
      const adminsCached = memoryCache.get(KEYS.ADMINS);
      const adminsRaw = nativeGetItem ? nativeGetItem(KEYS.ADMINS) : localStorage.getItem(KEYS.ADMINS);
      const admins: SchoolAdminAccount[] = Array.isArray(adminsCached)
        ? adminsCached
        : adminsRaw
        ? JSON.parse(adminsRaw)
        : INITIAL_ADMINS;
      const matchedAdmin = admins.find(a => a.id === targetSchoolId);

      const cfgCached = memoryCache.get(KEYS.GOOGLE_CONFIG);
      const cfgRaw = nativeGetItem ? nativeGetItem(KEYS.GOOGLE_CONFIG) : localStorage.getItem(KEYS.GOOGLE_CONFIG);
      const cfg: GoogleConfig = cfgCached || (cfgRaw ? JSON.parse(cfgRaw) : { webAppUrl: DEFAULT_GAS_WEBAPP_URL, driveFolderId: '11IXjrNHXyGpf3A-7ZT38t8B_jXtoFGS9' });
      const gasUrl = cfg?.webAppUrl || DEFAULT_GAS_WEBAPP_URL;
      if (!gasUrl) return;

      const sanitizedValue = sanitizeValueForSync(value);

      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'syncTenantKey',
          spreadsheetId: matchedAdmin?.googleSheetId || '',
          schoolId: targetSchoolId,
          schoolName: matchedAdmin?.schoolName || '',
          schoolDriveFolderId: matchedAdmin?.driveFolderId || '',
          driveFolderId: cfg?.driveFolderId || '11IXjrNHXyGpf3A-7ZT38t8B_jXtoFGS9',
          baseKey,
          key: resolvedKey,
          value: sanitizedValue,
          updatedAt: timestamp
        })
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, 600);

  tenantGoogleSyncTimers.set(resolvedKey, timer);
}

function isTaskStorageKey(key: string): boolean {
  return key === KEYS.TASKS || key.startsWith(`${KEYS.TASKS}__`);
}

const deletedSubmissionKeysSet = new Set<string>();

function makeSubTombstoneKey(taskId: string, identifier?: string): string {
  if (!taskId || !identifier) return '';
  return `${taskId.trim()}__${String(identifier).trim().toLowerCase().replace(/\s+/g, '')}`;
}

function isSubmissionKeyDeleted(taskId: string, ...identifiers: (string | undefined)[]): boolean {
  if (!taskId) return false;
  for (const id of identifiers) {
    if (!id) continue;
    const k = makeSubTombstoneKey(taskId, id);
    if (k && deletedSubmissionKeysSet.has(k)) return true;
  }
  return false;
}


function clearSubmissionTombstonesForSubClient(
  taskId: string,
  s: TaskSubmission,
  deletedMap?: Record<string, string>
): boolean {
  if (!taskId || !s) return false;
  let removedAny = false;
  const mem = String(s.memberId || s.memberName || '').trim().toLowerCase();
  const file = String(s.fileName || '').trim().toLowerCase();
  const subKey = mem && file ? `${mem}__${file}` : String((s as any).id || mem || file).trim().toLowerCase();
  const cachedMembers: MemberAccount[] = Array.isArray(memoryCache.get(KEYS.MEMBERS))
    ? memoryCache.get(KEYS.MEMBERS)
    : [];
  const matchedMember = cachedMembers.find(
    m =>
      m &&
      ((s.memberId && (m.id === s.memberId || String(m.username || '').toLowerCase() === String(s.memberId).toLowerCase())) ||
        (s.memberName && String(m.fullName || '').trim() === String(s.memberName).trim()))
  );
  const candidates = [
    (s as any).id,
    s.memberId,
    s.memberName,
    matchedMember?.id,
    matchedMember?.username,
    matchedMember?.fullName,
    s.fileName,
    subKey,
    s.memberId && s.fileName ? `${s.memberId}_${s.fileName}` : undefined,
    s.memberName && s.fileName ? `${s.memberName}_${s.fileName}` : undefined,
    matchedMember?.id && s.fileName ? `${matchedMember.id}_${s.fileName}` : undefined,
    matchedMember?.username && s.fileName ? `${matchedMember.username}_${s.fileName}` : undefined
  ];
  for (const c of candidates) {
    if (!c) continue;
    const tk = makeSubTombstoneKey(taskId, String(c));
    if (tk && deletedSubmissionKeysSet.has(tk)) {
      deletedSubmissionKeysSet.delete(tk);
      removedAny = true;
    }
    if (deletedMap) {
      delete deletedMap[String(c)];
      delete deletedMap[String(c).toLowerCase()];
    }
  }
  return removedAny;
}

function mergeSingleTaskSubmissionsClient(existingTask: TaskItem, incomingTask: TaskItem, preferIncomingMeta = true): TaskItem {
  if (!existingTask) return incomingTask;
  if (!incomingTask) return existingTask;

  const base: TaskItem = preferIncomingMeta
    ? { ...existingTask, ...incomingTask }
    : { ...incomingTask, ...existingTask };

  const deletedMap: Record<string, string> = {
    ...(existingTask.deletedSubmissionsMap || {}),
    ...(incomingTask.deletedSubmissionsMap || {})
  };

  const existingSubs = Array.isArray(existingTask.submissions) ? existingTask.submissions : [];
  const incomingSubs = Array.isArray(incomingTask.submissions) ? incomingTask.submissions : [];

  const subMap = new Map<string, TaskSubmission>();
  const getKey = (s: TaskSubmission) => {
    if (!s) return '';
    const mem = String(s.memberId || s.memberName || '').trim().toLowerCase();
    const file = String(s.fileName || '').trim().toLowerCase();
    if (mem && file) return `${mem}__${file}`;
    if ((s as any).id) return String((s as any).id).trim().toLowerCase();
    return mem || file;
  };

  // Clear stale tombstones for active incoming submissions that are newer than deletedMap (or not in incomingTask.deletedSubmissionsMap)
  const incDelMap = incomingTask.deletedSubmissionsMap || {};
  for (const incSub of incomingSubs) {
    if (!incSub) continue;
    const subTime = incSub.submittedAt ? new Date(incSub.submittedAt).getTime() : 0;
    const delAt =
      (incSub.fileName && incSub.memberId ? incDelMap[`${incSub.memberId}_${incSub.fileName}`] : '') ||
      (incSub.fileName ? incDelMap[incSub.fileName] : '') ||
      (incSub.memberId ? (incDelMap[incSub.memberId] || incDelMap[incSub.memberId.toLowerCase()]) : '') ||
      (incSub.memberName ? (incDelMap[incSub.memberName] || incDelMap[incSub.memberName.toLowerCase()]) : '');
    const delTime = delAt ? new Date(delAt).getTime() : 0;
    if (!delAt || (subTime > 0 && subTime > delTime)) {
      clearSubmissionTombstonesForSubClient(base.id, incSub, deletedMap);
    }
  }

  const isSubDeleted = (taskId: string, s: TaskSubmission): boolean => {
    if (!s) return true;
    const k = getKey(s);
    const delAt =
      ((s as any).id ? deletedMap[(s as any).id] : '') ||
      (s.fileName && s.memberId ? deletedMap[`${s.memberId}_${s.fileName}`] : '') ||
      (s.fileName ? deletedMap[s.fileName] : '') ||
      (k ? deletedMap[k] : '') ||
      (s.memberId ? (deletedMap[s.memberId] || deletedMap[s.memberId.toLowerCase()]) : '') ||
      (s.memberName ? (deletedMap[s.memberName] || deletedMap[s.memberName.toLowerCase()]) : '');
    if (delAt) {
      if (!s.submittedAt) return true;
      const delTime = new Date(delAt).getTime();
      const subTime = new Date(s.submittedAt).getTime();
      if (isNaN(subTime) || delTime >= subTime) return true;
      // Submission is newer than deletion timestamp -> clear stale tombstones
      clearSubmissionTombstonesForSubClient(taskId, s, deletedMap);
      return false;
    }
    if ((s as any).id && isSubmissionKeyDeleted(taskId, (s as any).id)) return true;
    if (s.fileName && isSubmissionKeyDeleted(taskId, s.fileName, k) && !s.submittedAt) return true;
    return false;
  };

  for (const s of existingSubs) {
    const k = getKey(s);
    if (!k || isSubDeleted(base.id, s)) continue;
    subMap.set(k, s);
  }

  for (const s of incomingSubs) {
    const k = getKey(s);
    if (!k || isSubDeleted(base.id, s)) continue;
    const prev = subMap.get(k);
    if (!prev) {
      subMap.set(k, s);
    } else {
      const prevTime = prev.submittedAt ? new Date(prev.submittedAt).getTime() : 0;
      const nextTime = s.submittedAt ? new Date(s.submittedAt).getTime() : 0;
      const isReplacedWithNewFile =
        nextTime > prevTime &&
        Boolean(s.fileName && prev.fileName && s.fileName.trim() !== prev.fileName.trim());

      const mergedSub: TaskSubmission = isReplacedWithNewFile
        ? { ...s }
        : nextTime >= prevTime
        ? { ...prev, ...s }
        : { ...s, ...prev };

      const prevUrl = isReplacedWithNewFile ? '' : prev.fileUrl || (prev as any).downloadUrl || '';
      const nextUrl = s.fileUrl || (s as any).downloadUrl || '';
      if (nextUrl.startsWith('http')) {
        mergedSub.fileUrl = nextUrl;
      } else if (prevUrl.startsWith('http')) {
        mergedSub.fileUrl = prevUrl;
      } else if (nextUrl.startsWith('/api/files/')) {
        mergedSub.fileUrl = nextUrl;
      } else if (prevUrl.startsWith('/api/files/')) {
        mergedSub.fileUrl = prevUrl;
      } else if (nextUrl.startsWith('data:')) {
        mergedSub.fileUrl = nextUrl;
      } else if (prevUrl.startsWith('data:')) {
        mergedSub.fileUrl = prevUrl;
      } else {
        const fallbackDriveId =
          (s as any).driveFileId || (isReplacedWithNewFile ? '' : (prev as any).driveFileId);
        if (fallbackDriveId) {
          mergedSub.fileUrl = `https://drive.google.com/file/d/${fallbackDriveId}/view?usp=sharing`;
          mergedSub.driveFileId = fallbackDriveId;
        } else {
          mergedSub.fileUrl =
            nextUrl ||
            prevUrl ||
            (s as any).localHostedUrl ||
            (isReplacedWithNewFile ? '' : (prev as any).localHostedUrl) ||
            '';
        }
      }
      subMap.set(k, mergedSub);
    }
  }

  const mergedSubmissions = Array.from(subMap.values());

  let finalSubmittedFileUrl = base.submittedFileUrl || existingTask.submittedFileUrl || incomingTask.submittedFileUrl;
  let finalSubmittedBy = base.submittedBy || existingTask.submittedBy || incomingTask.submittedBy;
  let finalSubmittedByName = base.submittedByName || existingTask.submittedByName || incomingTask.submittedByName;
  let finalSubmittedFileName = base.submittedFileName || existingTask.submittedFileName || incomingTask.submittedFileName;

  if (
    mergedSubmissions.length === 0 &&
    finalSubmittedBy &&
    (isSubmissionKeyDeleted(base.id, finalSubmittedBy, finalSubmittedByName, finalSubmittedFileName) ||
     deletedMap[finalSubmittedBy] ||
     deletedMap[finalSubmittedBy.toLowerCase()] ||
     (finalSubmittedByName && (deletedMap[finalSubmittedByName] || deletedMap[finalSubmittedByName.toLowerCase()])))
  ) {
    finalSubmittedFileUrl = undefined;
    finalSubmittedBy = undefined;
    finalSubmittedByName = undefined;
    finalSubmittedFileName = undefined;
  } else if (mergedSubmissions.length > 0 && !finalSubmittedFileUrl) {
    const latest = mergedSubmissions[mergedSubmissions.length - 1];
    finalSubmittedFileUrl = latest.fileUrl || (latest as any).localHostedUrl || (latest as any).downloadUrl;
    finalSubmittedBy = finalSubmittedBy || latest.memberId;
    finalSubmittedByName = finalSubmittedByName || latest.memberName;
    finalSubmittedFileName = finalSubmittedFileName || latest.fileName;
  }

  return {
    ...base,
    submissions: mergedSubmissions,
    isCompleted: Boolean(base.isManualCompleted ?? incomingTask.isManualCompleted ?? existingTask.isManualCompleted),
    deletedSubmissionsMap: Object.keys(deletedMap).length > 0 ? deletedMap : undefined,
    attachmentUrl: base.attachmentUrl || existingTask.attachmentUrl || incomingTask.attachmentUrl,
    submittedFileUrl: finalSubmittedFileUrl,
    submittedBy: finalSubmittedBy,
    submittedByName: finalSubmittedByName,
    submittedFileName: finalSubmittedFileName
  };
}

const deletedTaskIdsSet = new Set<string>();
const deletedDocIdsSet = new Set<string>();
const deletedLeaveIdsSet = new Set<string>();
const deletedDutyLogIdsSet = new Set<string>();
const deletedSubjectIdsSet = new Set<string>();

if (typeof window !== 'undefined') {
  try {
    const rawTasks = localStorage.getItem('ams_deleted_task_ids');
    if (rawTasks) {
      const arr = JSON.parse(rawTasks);
      if (Array.isArray(arr)) {
        arr.forEach(id => {
          if (id) deletedTaskIdsSet.add(String(id));
        });
      }
    }
  } catch {
    // ignore
  }
  try {
    const rawSubKeys = localStorage.getItem('ams_deleted_submission_keys');
    if (rawSubKeys) {
      const arr = JSON.parse(rawSubKeys);
      if (Array.isArray(arr)) {
        arr.forEach(k => {
          if (k) deletedSubmissionKeysSet.add(String(k));
        });
      }
    }
  } catch {
    // ignore
  }
  try {
    const raw = localStorage.getItem('ams_deleted_doc_ids');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(id => {
          if (id) deletedDocIdsSet.add(String(id));
        });
      }
    }
  } catch {
    // ignore
  }
  try {
    const rawLeaves = localStorage.getItem('ams_deleted_leave_ids');
    if (rawLeaves) {
      const arr = JSON.parse(rawLeaves);
      if (Array.isArray(arr)) {
        arr.forEach(id => {
          if (id) deletedLeaveIdsSet.add(String(id));
        });
      }
    }
  } catch {
    // ignore
  }
  try {
    const rawDutyLogs = localStorage.getItem('ams_deleted_duty_log_ids');
    if (rawDutyLogs) {
      const arr = JSON.parse(rawDutyLogs);
      if (Array.isArray(arr)) {
        arr.forEach(id => {
          if (id) deletedDutyLogIdsSet.add(String(id));
        });
      }
    }
  } catch {
    // ignore
  }
  try {
    const rawSubjects = localStorage.getItem('ams_deleted_subject_ids');
    if (rawSubjects) {
      const arr = JSON.parse(rawSubjects);
      if (Array.isArray(arr)) {
        arr.forEach(id => {
          const strId = String(id || '').trim();
          if (strId && !strId.startsWith('subkey:') && !strId.startsWith('subcode:')) {
            deletedSubjectIdsSet.add(strId);
          }
        });
      }
    }
  } catch {
    // ignore
  }
}

const DEMO_ADMIN_IDS_CLIENT = new Set(['admin-school-01', 'admin-school-02', 'admin-01']);
const DEMO_MEMBER_IDS_CLIENT = new Set(['mem-01', 'mem-02', 'mem-03', 'mem-04', 'mem-admin']);

function isBooleanSuspended(val: any): boolean {
  if (val === true) return true;
  if (typeof val === 'string') {
    const clean = val.trim().toLowerCase();
    return clean === 'true';
  }
  return false;
}

function normalizeAdminAccountClient(raw: any): SchoolAdminAccount | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id ?? '').trim();
  const username = String(raw.username ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  if (!id || !username) return null;
  const password =
    raw.password !== undefined && raw.password !== null && String(raw.password).trim() !== ''
      ? String(raw.password)
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .trim()
      : '123456';
  return {
    ...raw,
    id,
    username,
    password,
    fullName: String(raw.fullName || raw.schoolName || username).trim(),
    schoolName: String(raw.schoolName || raw.fullName || '').trim(),
    schoolCode: raw.schoolCode !== undefined && raw.schoolCode !== null ? String(raw.schoolCode).trim() : '',
    isSuspended: isBooleanSuspended(raw.isSuspended)
  };
}

function normalizeMemberAccountClient(raw: any): MemberAccount | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id ?? '').trim();
  const username = String(raw.username ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  if (!id || !username) return null;

  // Detect shifted row from MASTER_SPREADSHEET_ID Members sheet where firstName === 'member'/'admin' or gradeLevel starts with 'admin-'
  const isShiftedMasterRow =
    (raw.firstName === 'member' || raw.firstName === 'admin') &&
    (String(raw.gradeLevel || '').startsWith('admin-') || typeof raw.isSuspended === 'string');

  if (isShiftedMasterRow) {
    const prefix = String(raw.fullName ?? '').trim();
    const fullName = String(raw.role ?? '').trim();
    const firstName = String(raw.position ?? '').trim();
    const lastName = String(raw.prefix ?? '').trim();
    const role = (raw.firstName === 'admin' ? 'admin' : 'member') as 'admin' | 'member';
    const gradeLevel = String(raw.lastName ?? '').trim();
    const position = String(raw.learningGroup ?? 'ครูประจำชั้น').trim();
    const learningGroup = String(raw.avatarUrl ?? '').trim();
    const schoolId = String(raw.gradeLevel ?? '').trim();
    const schoolName = String(raw.isSuspended ?? '').trim();
    const isSuspended = isBooleanSuspended(raw.schoolId);
    const avatarUrl = String(raw.schoolName ?? '').startsWith('http') ? String(raw.schoolName).trim() : '';
    const password =
      raw.password !== undefined && raw.password !== null
        ? String(raw.password)
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim()
        : '';

    return {
      id,
      username,
      password,
      prefix,
      fullName: fullName || `${prefix}${firstName} ${lastName}`.trim() || username,
      firstName,
      lastName,
      role: role as any,
      gradeLevel: gradeLevel as any,
      position,
      learningGroup,
      schoolId,
      schoolName,
      isSuspended,
      avatarUrl
    };
  }

  const password =
    raw.password !== undefined && raw.password !== null
      ? String(raw.password)
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .trim()
      : '';
  const roleVal = String(raw.role || 'member').trim().toLowerCase();
  const validRole: 'admin' | 'member' = roleVal === 'admin' ? 'admin' : 'member';

  return {
    ...raw,
    id,
    username,
    password,
    role: validRole,
    fullName: String(raw.fullName || `${raw.prefix || ''}${raw.firstName || ''} ${raw.lastName || ''}`.trim() || username).trim(),
    firstName: raw.firstName !== undefined && raw.firstName !== null ? String(raw.firstName).trim() : '',
    lastName: raw.lastName !== undefined && raw.lastName !== null ? String(raw.lastName).trim() : '',
    isSuspended: isBooleanSuspended(raw.isSuspended)
  };
}

function mergeAdminListsClient(
  localList: SchoolAdminAccount[],
  incomingList: SchoolAdminAccount[],
  preferIncoming = true
): SchoolAdminAccount[] {
  const cleanLocal = (Array.isArray(localList) ? localList : [])
    .map(normalizeAdminAccountClient)
    .filter((a): a is SchoolAdminAccount => Boolean(a));
  const cleanIncoming = (Array.isArray(incomingList) ? incomingList : [])
    .map(normalizeAdminAccountClient)
    .filter((a): a is SchoolAdminAccount => Boolean(a));

  if (cleanIncoming.length === 0) return cleanLocal;
  if (cleanLocal.length === 0) return cleanIncoming;

  // If one list only has initial demo accounts while the other has real school admin accounts, drop unconfirmed demo accounts
  const incomingHasReal = cleanIncoming.some(a => !DEMO_ADMIN_IDS_CLIENT.has(a.id));
  const incomingHasDemo = cleanIncoming.some(a => DEMO_ADMIN_IDS_CLIENT.has(a.id));
  const localHasReal = cleanLocal.some(a => !DEMO_ADMIN_IDS_CLIENT.has(a.id));
  const localHasDemo = cleanLocal.some(a => DEMO_ADMIN_IDS_CLIENT.has(a.id));

  const filteredLocal =
    incomingHasReal && !incomingHasDemo && !localHasReal
      ? cleanLocal.filter(a => !DEMO_ADMIN_IDS_CLIENT.has(a.id))
      : cleanLocal;
  const filteredIncoming =
    localHasReal && !localHasDemo && !incomingHasReal
      ? cleanIncoming.filter(a => !DEMO_ADMIN_IDS_CLIENT.has(a.id))
      : cleanIncoming;

  const byKey = new Map<string, SchoolAdminAccount>();
  const primary = preferIncoming ? filteredIncoming : filteredLocal;
  const secondary = preferIncoming ? filteredLocal : filteredIncoming;

  for (const item of secondary) {
    byKey.set(item.id, item);
  }
  for (const item of primary) {
    const existing =
      byKey.get(item.id) ||
      Array.from(byKey.values()).find(e => e.username.toLowerCase() === item.username.toLowerCase());
    if (existing) {
      const merged: SchoolAdminAccount = { ...existing, ...item };
      if (
        existing.googleSheetId &&
        !existing.googleSheetId.startsWith('sheet_') &&
        (!item.googleSheetId || item.googleSheetId.startsWith('sheet_'))
      ) {
        merged.googleSheetId = existing.googleSheetId;
        merged.googleSheetUrl =
          existing.googleSheetUrl || `https://docs.google.com/spreadsheets/d/${existing.googleSheetId}/edit`;
      }
      if (existing.driveFolderId && !item.driveFolderId) {
        merged.driveFolderId = existing.driveFolderId;
        merged.driveFolderUrl =
          existing.driveFolderUrl || `https://drive.google.com/drive/folders/${existing.driveFolderId}`;
      }
      byKey.set(existing.id, merged);
    } else {
      byKey.set(item.id, item);
    }
  }
  return Array.from(byKey.values());
}

function mergeMemberListsClient(
  localList: MemberAccount[],
  incomingList: MemberAccount[],
  preferIncoming = true
): MemberAccount[] {
  const cleanLocal = (Array.isArray(localList) ? localList : [])
    .map(normalizeMemberAccountClient)
    .filter((m): m is MemberAccount => Boolean(m) && m!.username.toLowerCase() !== 'admin');
  const cleanIncoming = (Array.isArray(incomingList) ? incomingList : [])
    .map(normalizeMemberAccountClient)
    .filter((m): m is MemberAccount => Boolean(m) && m!.username.toLowerCase() !== 'admin');

  if (cleanIncoming.length === 0) return cleanLocal;
  if (cleanLocal.length === 0) return cleanIncoming;

  const incomingHasReal = cleanIncoming.some(m => !DEMO_MEMBER_IDS_CLIENT.has(m.id));
  const incomingHasDemo = cleanIncoming.some(m => DEMO_MEMBER_IDS_CLIENT.has(m.id));
  const localHasReal = cleanLocal.some(m => !DEMO_MEMBER_IDS_CLIENT.has(m.id));
  const localHasDemo = cleanLocal.some(m => DEMO_MEMBER_IDS_CLIENT.has(m.id));

  const filteredLocal =
    incomingHasReal && !incomingHasDemo && !localHasReal
      ? cleanLocal.filter(m => !DEMO_MEMBER_IDS_CLIENT.has(m.id))
      : cleanLocal;
  const filteredIncoming =
    localHasReal && !localHasDemo && !incomingHasReal
      ? cleanIncoming.filter(m => !DEMO_MEMBER_IDS_CLIENT.has(m.id))
      : cleanIncoming;

  const byKey = new Map<string, MemberAccount>();
  const primary = preferIncoming ? filteredIncoming : filteredLocal;
  const secondary = preferIncoming ? filteredLocal : filteredIncoming;

  for (const item of secondary) {
    byKey.set(item.id, item);
  }
  for (const item of primary) {
    const existing =
      byKey.get(item.id) ||
      Array.from(byKey.values()).find(e => e.username.toLowerCase() === item.username.toLowerCase());
    if (existing) {
      const merged: MemberAccount = {
        ...existing,
        ...item,
        avatarUrl: item.avatarUrl || existing.avatarUrl || ''
      };
      byKey.set(existing.id, merged);
    } else {
      byKey.set(item.id, item);
    }
  }
  return Array.from(byKey.values());
}

function isUsernameMatchClient(storedUsername: any, inputUsername: string): boolean {
  const s = String(storedUsername ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();
  const i = String(inputUsername ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();
  if (!s || !i) return false;
  if (s === i) return true;
  if (/^\d+$/.test(s) && /^\d+$/.test(i)) {
    const sNoZero = s.replace(/^0+/, '');
    const iNoZero = i.replace(/^0+/, '');
    if (sNoZero && sNoZero === iNoZero) return true;
  }
  return false;
}

function isPasswordMatchClient(storedPassword: any, inputPassword: string): boolean {
  const s = String(storedPassword ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  const i = String(inputPassword ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  if (!s || !i) return false;
  if (s === i) return true;
  // Mobile keyboard auto-capitalization resilience
  if (s.toLowerCase() === i.toLowerCase()) return true;
  // Google Sheets numeric coercion stripping leading zero (e.g. '012345' -> 12345)
  if (/^\d+$/.test(s) && /^\d+$/.test(i)) {
    const sNoZero = s.replace(/^0+/, '');
    const iNoZero = i.replace(/^0+/, '');
    if (sNoZero.length >= 2 && sNoZero === iNoZero) return true;
  }
  return false;
}

function isSubjectStorageKey(key: string): boolean {
  return key === KEYS.SUBJECTS || key.startsWith(`${KEYS.SUBJECTS}__`);
}

function isSubjectDeletedClient(s: any): boolean {
  if (!s || !s.id) return true;
  return deletedSubjectIdsSet.has(String(s.id));
}

function mergeSubjectListsClient(localList: Subject[], incomingList: Subject[], preferIncoming = true): Subject[] {
  if (!Array.isArray(incomingList)) {
    return Array.isArray(localList)
      ? localList.filter(s => !isSubjectDeletedClient(s))
      : [];
  }
  if (!Array.isArray(localList) || localList.length === 0) {
    return incomingList.filter(s => !isSubjectDeletedClient(s));
  }

  const localMap = new Map<string, Subject>();
  for (const s of localList) {
    if (!isSubjectDeletedClient(s)) {
      localMap.set(String(s.id), s);
    }
  }

  const incomingMap = new Map<string, Subject>();
  for (const s of incomingList) {
    if (!isSubjectDeletedClient(s)) {
      incomingMap.set(String(s.id), s);
    }
  }

  const result: Subject[] = [];
  const handledIds = new Set<string>();
  const primaryList = preferIncoming ? incomingList : localList;

  for (const item of primaryList) {
    if (isSubjectDeletedClient(item)) continue;
    const sId = String(item.id);
    if (handledIds.has(sId)) continue;
    handledIds.add(sId);
    const locItem = localMap.get(sId);
    const incItem = incomingMap.get(sId);
    if (locItem && incItem) {
      const legacyNames = new Set([
        'ภาษาไทยพื้นฐาน 1',
        'คณิตศาสตร์ 1',
        'วิทยาศาสตร์และเทคโนโลยี 1',
        'ภาษาอังกฤษพื้นฐาน 1',
        'วิทยาศาสตร์และเทคโนโลยี 2'
      ]);
      const incIsUnmigratedLegacy =
        legacyNames.has(String(incItem.name || '').trim()) && Number(incItem.totalScore) === 100;
      const locIsMigrated = Number(locItem.totalScore) === 50 && !legacyNames.has(String(locItem.name || '').trim());
      if (incIsUnmigratedLegacy && locIsMigrated) {
        result.push({
          ...incItem,
          ...locItem,
          teacherId: incItem.teacherId || locItem.teacherId || '',
          teacherName: incItem.teacherName || locItem.teacherName || ''
        });
      } else {
        result.push(preferIncoming ? { ...locItem, ...incItem } : { ...incItem, ...locItem });
      }
    } else {
      result.push(item);
    }
  }

  // Preserve any local subject that has not arrived in incomingList yet (prevents newly created subjects from disappearing)
  for (const locItem of localList) {
    if (isSubjectDeletedClient(locItem)) continue;
    const sId = String(locItem.id);
    if (!handledIds.has(sId)) {
      handledIds.add(sId);
      result.unshift(locItem);
    }
  }

  return result;
}

const EXPANDED_INITIAL_SUBJECTS: Subject[] = (() => {
  const normalized: Subject[] = INITIAL_SUBJECTS.map(s => ({
    ...s,
    academicYear: s.academicYear || '2568'
  }));
  const existingKeys = new Set(
    normalized.map(s => `${s.academicYear || '2568'}_${s.semester || '1'}_${s.code}_${s.gradeLevel}`)
  );
  const additions: Subject[] = [];
  normalized.forEach(s => {
    const yr = s.academicYear || '2568';
    const sem = s.semester || '1';
    const otherSem: '1' | '2' = sem === '1' ? '2' : '1';
    const otherKey = `${yr}_${otherSem}_${s.code}_${s.gradeLevel}`;
    if (!existingKeys.has(otherKey)) {
      existingKeys.add(otherKey);
      additions.push({
        ...s,
        id: `${s.id}-sem${otherSem}`,
        semester: otherSem,
        academicYear: yr,
        teacherId: '',
        teacherName: '',
        assignmentItems: s.assignmentItems ? [...s.assignmentItems] : []
      });
    }
  });
  const baseAll = [...normalized, ...additions];
  const year2569Subs = baseAll.filter(s => s.academicYear === '2569');
  if (year2569Subs.length === 0) {
    baseAll
      .filter(s => s.academicYear === '2568')
      .forEach(s => {
        additions.push({
          ...s,
          id: `sub-${s.code}-${s.semester}-2569`,
          academicYear: '2569',
          teacherId: s.teacherId || '',
          teacherName: s.teacherName || '',
          assignmentItems: s.assignmentItems ? [...s.assignmentItems] : []
        });
      });
  }
  return [...normalized, ...additions];
})();

function mergeTaskListsClient(localList: TaskItem[], incomingList: TaskItem[], preferIncomingOrder = true): TaskItem[] {
  if (!Array.isArray(localList)) {
    return Array.isArray(incomingList)
      ? incomingList.filter(t => t && t.id && !deletedTaskIdsSet.has(t.id))
      : [];
  }
  if (!Array.isArray(incomingList)) {
    return localList.filter(t => t && t.id && !deletedTaskIdsSet.has(t.id));
  }

  const localMap = new Map<string, TaskItem>();
  for (const t of localList) {
    if (t && t.id && !deletedTaskIdsSet.has(t.id)) {
      localMap.set(t.id, t);
    }
  }

  const incomingMap = new Map<string, TaskItem>();
  for (const t of incomingList) {
    if (t && t.id && !deletedTaskIdsSet.has(t.id)) {
      incomingMap.set(t.id, t);
    }
  }

  const result: TaskItem[] = [];
  const handledIds = new Set<string>();
  const primaryList = preferIncomingOrder ? incomingList : localList;

  for (const item of primaryList) {
    if (!item || !item.id || deletedTaskIdsSet.has(item.id)) continue;
    handledIds.add(item.id);
    const loc = localMap.get(item.id);
    const inc = incomingMap.get(item.id);
    if (loc && inc) {
      result.push(mergeSingleTaskSubmissionsClient(loc, inc, preferIncomingOrder));
    } else {
      result.push(item);
    }
  }

  // Preserve any local task that has not arrived in incomingList yet (prevents newly created tasks from disappearing)
  for (const locItem of localList) {
    if (!locItem || !locItem.id) continue;
    if (!handledIds.has(locItem.id) && !deletedTaskIdsSet.has(locItem.id)) {
      result.push(locItem);
    }
  }

  return result;
}

function extractDriveFileIdClient(urlOrId?: string): string {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const str = urlOrId.trim();
  const m1 = str.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m1 && m1[1]) return m1[1];
  const m2 = str.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m2 && m2[1]) return m2[1];
  const m3 = str.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m3 && m3[1]) return m3[1];
  const m4 = str.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]{20,})/);
  if (m4 && m4[1]) return m4[1];
  if (/^[a-zA-Z0-9_-]{25,60}$/.test(str)) return str;
  return '';
}

function isDocumentStorageKey(key: string): boolean {
  return key === KEYS.DOCUMENTS || key.startsWith(`${KEYS.DOCUMENTS}__`);
}

function mergeSingleDocumentClient(existingDoc: DocumentItem, incomingDoc: DocumentItem, preferIncoming = true): DocumentItem {
  if (!existingDoc) return incomingDoc;
  if (!incomingDoc) return existingDoc;

  const base: DocumentItem = preferIncoming ? { ...existingDoc, ...incomingDoc } : { ...incomingDoc, ...existingDoc };

  const exUrl = String(existingDoc.fileUrl || '');
  const inUrl = String(incomingDoc.fileUrl || '');
  const exDriveId = existingDoc.driveFileId || extractDriveFileIdClient(exUrl);
  const inDriveId = incomingDoc.driveFileId || extractDriveFileIdClient(inUrl);

  if (inUrl.startsWith('http') && !inUrl.startsWith('/api/files/')) {
    base.fileUrl = inUrl;
  } else if (exUrl.startsWith('http') && !exUrl.startsWith('/api/files/')) {
    base.fileUrl = exUrl;
  } else if (inUrl.startsWith('/api/files/')) {
    base.fileUrl = inUrl;
  } else if (exUrl.startsWith('/api/files/')) {
    base.fileUrl = exUrl;
  } else if (inUrl.startsWith('data:')) {
    base.fileUrl = inUrl;
  } else if (exUrl.startsWith('data:')) {
    base.fileUrl = exUrl;
  }

  base.driveFileId = inDriveId || exDriveId || base.driveFileId;
  if ((!base.fileUrl || base.fileUrl === '#') && base.driveFileId) {
    base.fileUrl = `https://drive.google.com/file/d/${base.driveFileId}/view?usp=sharing`;
  }

  if (existingDoc.fileData && !incomingDoc.fileData) {
    base.fileData = existingDoc.fileData;
  }

  return base;
}

function mergeDocumentListsClient(
  localList: DocumentItem[],
  incomingList: DocumentItem[],
  preferIncoming = true
): DocumentItem[] {
  if (!Array.isArray(localList)) {
    return Array.isArray(incomingList)
      ? incomingList.filter(d => d && d.id && !deletedDocIdsSet.has(d.id))
      : [];
  }
  if (!Array.isArray(incomingList)) {
    return localList.filter(d => d && d.id && !deletedDocIdsSet.has(d.id));
  }

  const localMap = new Map<string, DocumentItem>();
  for (const d of localList) {
    if (d && d.id && !deletedDocIdsSet.has(d.id)) {
      localMap.set(d.id, d);
    }
  }

  const incomingMap = new Map<string, DocumentItem>();
  for (const d of incomingList) {
    if (d && d.id && !deletedDocIdsSet.has(d.id)) {
      incomingMap.set(d.id, d);
    }
  }

  const result: DocumentItem[] = [];
  const handledIds = new Set<string>();
  const primaryList = preferIncoming ? incomingList : localList;

  for (const item of primaryList) {
    if (!item || !item.id || deletedDocIdsSet.has(item.id)) continue;
    handledIds.add(item.id);
    const loc = localMap.get(item.id);
    const inc = incomingMap.get(item.id);
    if (loc && inc) {
      result.push(mergeSingleDocumentClient(loc, inc, preferIncoming));
    } else {
      result.push(item);
    }
  }

  // Preserve any local document that has not arrived in incomingList yet (prevents disappearing on client)
  for (const locItem of localList) {
    if (!locItem || !locItem.id) continue;
    if (!handledIds.has(locItem.id) && !deletedDocIdsSet.has(locItem.id)) {
      result.push(locItem);
    }
  }

  return result;
}

function isLeaveStorageKey(key: string): boolean {
  return key === KEYS.LEAVE_REQUESTS || key.startsWith(`${KEYS.LEAVE_REQUESTS}__`);
}

function mergeLeaveListsClient(localList: any[], incomingList: any[], preferIncoming = true): any[] {
  if (!Array.isArray(incomingList)) {
    return Array.isArray(localList)
      ? localList.filter(l => l && l.id && !deletedLeaveIdsSet.has(String(l.id)))
      : [];
  }
  if (!Array.isArray(localList) || localList.length === 0) {
    return incomingList.filter(l => l && l.id && !deletedLeaveIdsSet.has(String(l.id)));
  }

  const localMap = new Map<string, any>();
  for (const l of localList) {
    if (l && l.id && !deletedLeaveIdsSet.has(String(l.id))) {
      localMap.set(String(l.id), l);
    }
  }

  const result: any[] = [];
  const handledIds = new Set<string>();

  for (const item of incomingList) {
    if (!item || !item.id || deletedLeaveIdsSet.has(String(item.id))) continue;
    const lId = String(item.id);
    handledIds.add(lId);
    const locItem = localMap.get(lId);
    if (locItem) {
      result.push(preferIncoming ? { ...locItem, ...item } : { ...item, ...locItem });
    } else {
      result.push(item);
    }
  }

  // Preserve any local leave request that has not arrived in incomingList yet (prevents disappearing on client)
  for (const locItem of localList) {
    if (!locItem || !locItem.id) continue;
    const lId = String(locItem.id);
    if (!handledIds.has(lId) && !deletedLeaveIdsSet.has(lId)) {
      result.push(locItem);
    }
  }

  return result;
}

function isDutyLogStorageKey(key: string): boolean {
  return key === KEYS.DUTY_LOGS || key.startsWith(`${KEYS.DUTY_LOGS}__`);
}

function mergeDutyLogListsClient(localList: any[], incomingList: any[], preferIncoming = true): any[] {
  if (!Array.isArray(incomingList)) {
    return Array.isArray(localList)
      ? localList.filter(d => d && d.id && !deletedDutyLogIdsSet.has(String(d.id)))
      : [];
  }
  if (!Array.isArray(localList) || localList.length === 0) {
    return incomingList.filter(d => d && d.id && !deletedDutyLogIdsSet.has(String(d.id)));
  }

  const localMap = new Map<string, any>();
  for (const d of localList) {
    if (d && d.id && !deletedDutyLogIdsSet.has(String(d.id))) {
      localMap.set(String(d.id), d);
    }
  }

  const incomingMap = new Map<string, any>();
  for (const d of incomingList) {
    if (d && d.id && !deletedDutyLogIdsSet.has(String(d.id))) {
      incomingMap.set(String(d.id), d);
    }
  }

  const result: any[] = [];
  const handledIds = new Set<string>();
  const primaryList = preferIncoming ? incomingList : localList;

  for (const item of primaryList) {
    if (!item || !item.id || deletedDutyLogIdsSet.has(String(item.id))) continue;
    const dId = String(item.id);
    handledIds.add(dId);
    const locItem = localMap.get(dId);
    const incItem = incomingMap.get(dId);
    if (locItem && incItem) {
      const locTime = locItem.createdAt ? new Date(locItem.createdAt).getTime() : 0;
      const incTime = incItem.createdAt ? new Date(incItem.createdAt).getTime() : 0;
      if (locTime > incTime) {
        result.push({ ...incItem, ...locItem });
      } else if (incTime > locTime) {
        result.push({ ...locItem, ...incItem });
      } else {
        result.push(preferIncoming ? { ...locItem, ...incItem } : { ...incItem, ...locItem });
      }
    } else {
      result.push(item);
    }
  }

  // Preserve any local duty log that has not arrived in incomingList yet (prevents disappearing on client)
  for (const locItem of localList) {
    if (!locItem || !locItem.id) continue;
    const dId = String(locItem.id);
    if (!handledIds.has(dId) && !deletedDutyLogIdsSet.has(dId)) {
      result.unshift(locItem);
    }
  }

  return result;
}

let lastDirectCloudPullTime = 0;

function hasPendingBase64SubmissionInTasks(val: any): boolean {
  if (!Array.isArray(val)) return false;
  return val.some(
    (t: any) =>
      t &&
      Array.isArray(t.submissions) &&
      t.submissions.some((s: any) => s && typeof s.fileUrl === 'string' && s.fileUrl.startsWith('data:'))
  );
}

function pushToRemoteServer(resolvedKey: string, value: any, timestamp: number) {
  if (typeof window === 'undefined' || INTERNAL_SKIP_KEYS.has(resolvedKey)) return;

  localWriteTimestamps.set(resolvedKey, timestamp);

  const isTask = isTaskStorageKey(resolvedKey);
  const hasBase64TaskSub = isTask && hasPendingBase64SubmissionInTasks(value);
  const cloudSafeValue = hasBase64TaskSub ? sanitizeValueForSync(value) : value;

  // 1. Primary Cloud Database: Firebase Firestore (syncs across all devices, browsers, emails, ais-dev & ais-pre in real time)
  saveKeyToFirestore(resolvedKey, cloudSafeValue, timestamp, CLIENT_ID).catch(() => {});

  // 2. Automatic Per-School Google Sheets Sync for every piece of data filled by Member or Admin
  if (!hasBase64TaskSub) {
    scheduleTenantKeySyncToSchoolSheet(resolvedKey, value, timestamp);
  }

  // 3. For task keys and account keys, also push directly to RealtimeCloudKV immediately
  if (
    isTask ||
    resolvedKey === KEYS.ADMINS ||
    resolvedKey === KEYS.MEMBERS ||
    resolvedKey === KEYS.DEVELOPER_ACCOUNT
  ) {
    pushToGoogleCloudKVDirect(resolvedKey, cloudSafeValue, timestamp);
  }

  const payload = {
    clientId: CLIENT_ID,
    updates: { [resolvedKey]: value },
    timestamps: { [resolvedKey]: timestamp }
  };

  // 4. Real-Time Express Server Mutation (triggers instant SSE broadcast + .data disk persistence + server Drive upload)
  fetch('/api/realtime/mutate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(r => {
      if (!r.ok) {
        pushToGoogleCloudKVDirect(resolvedKey, sanitizeValueForSync(value), timestamp);
        return null;
      }
      return r.json();
    })
    .then(data => {
      const latestLocalWrite = localWriteTimestamps.get(resolvedKey) || 0;
      // Ignore response if a newer local save happened while this request was in flight
      if (latestLocalWrite > timestamp) {
        return;
      }
      locallyModifiedKeys.delete(resolvedKey);
      if (data && typeof data.rev === 'number' && data.rev > lastKnownRev) {
        lastKnownRev = data.rev;
      }
      if (data && typeof data.serverTime === 'number') {
        const currentTs = keyTimestamps.get(resolvedKey) || 0;
        if (data.serverTime > currentTs) {
          keyTimestamps.set(resolvedKey, data.serverTime);
        }
      }
      if (data && data.mergedUpdates && data.mergedUpdates[resolvedKey] !== undefined) {
        const serverMerged = data.mergedUpdates[resolvedKey];
        const currentCached = memoryCache.get(resolvedKey);
        if (JSON.stringify(serverMerged) !== JSON.stringify(currentCached)) {
          memoryCache.set(resolvedKey, serverMerged);
          notifySubscribers([resolvedKey]);
        }
      }
    })
    .catch(() => {
      const latestLocalWrite = localWriteTimestamps.get(resolvedKey) || 0;
      if (latestLocalWrite <= timestamp) {
        locallyModifiedKeys.delete(resolvedKey);
      }
      pushToGoogleCloudKVDirect(resolvedKey, sanitizeValueForSync(value), timestamp);
      // Fallback for static Cloudflare Pages D1 when Express /api/realtime/mutate is unavailable
      fetch('/api/d1?action=saveRealtimeState', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: CLIENT_ID,
          key: resolvedKey,
          value: sanitizeValueForSync(value),
          updatedAt: timestamp
        })
      }).catch(() => {});
    });
}

function applyIncomingUpdates(
  updates: Record<string, any>,
  timestamps: Record<string, number> = {},
  fromStorageEvent = false,
  forceAcceptAccounts = false
): string[] {
  const changedKeys: string[] = [];
  const now = Date.now();

  for (const [resolvedKey, rawValue] of Object.entries(updates)) {
    if (INTERNAL_SKIP_KEYS.has(resolvedKey)) continue;
    const incomingTs = Number(timestamps[resolvedKey]) || (fromStorageEvent ? now : 0);
    const localTs = keyTimestamps.get(resolvedKey) || 0;
    const lastLocalWrite = localWriteTimestamps.get(resolvedKey) || 0;

    // Auto-expire locallyModifiedKeys after 8 seconds
    if (locallyModifiedKeys.has(resolvedKey) && now - lastLocalWrite > 8000) {
      locallyModifiedKeys.delete(resolvedKey);
    }

    let value = rawValue;

    if (resolvedKey === 'ams_deleted_doc_ids' && Array.isArray(value)) {
      let changedTombstones = false;
      for (const dId of value) {
        if (dId && !deletedDocIdsSet.has(String(dId))) {
          deletedDocIdsSet.add(String(dId));
          changedTombstones = true;
        }
      }
      if (changedTombstones && typeof window !== 'undefined') {
        try {
          localStorage.setItem('ams_deleted_doc_ids', JSON.stringify(Array.from(deletedDocIdsSet).slice(-2000)));
        } catch {
          // ignore
        }
      }
    } else if (resolvedKey === 'ams_deleted_task_ids' && Array.isArray(value)) {
      let changedTaskTombstones = false;
      for (const tId of value) {
        if (tId && !deletedTaskIdsSet.has(String(tId))) {
          deletedTaskIdsSet.add(String(tId));
          changedTaskTombstones = true;
        }
      }
      if (changedTaskTombstones && typeof window !== 'undefined') {
        try {
          localStorage.setItem('ams_deleted_task_ids', JSON.stringify(Array.from(deletedTaskIdsSet).slice(-2000)));
        } catch {
          // ignore
        }
      }
    } else if (resolvedKey === 'ams_deleted_submission_keys' && Array.isArray(value)) {
      let changedSubKeyTombstones = false;
      for (const k of value) {
        if (k && !deletedSubmissionKeysSet.has(String(k))) {
          deletedSubmissionKeysSet.add(String(k));
          changedSubKeyTombstones = true;
        }
      }
      if (changedSubKeyTombstones && typeof window !== 'undefined') {
        try {
          localStorage.setItem('ams_deleted_submission_keys', JSON.stringify(Array.from(deletedSubmissionKeysSet).slice(-3000)));
        } catch {
          // ignore
        }
      }
    } else if (resolvedKey === 'ams_deleted_leave_ids' && Array.isArray(value)) {
      let changedLeaveTombstones = false;
      for (const lId of value) {
        if (lId && !deletedLeaveIdsSet.has(String(lId))) {
          deletedLeaveIdsSet.add(String(lId));
          changedLeaveTombstones = true;
        }
      }
      if (changedLeaveTombstones && typeof window !== 'undefined') {
        try {
          localStorage.setItem('ams_deleted_leave_ids', JSON.stringify(Array.from(deletedLeaveIdsSet).slice(-2000)));
        } catch {
          // ignore
        }
      }
    } else if (resolvedKey === 'ams_deleted_duty_log_ids' && Array.isArray(value)) {
      let changedDutyLogTombstones = false;
      for (const dId of value) {
        if (dId && !deletedDutyLogIdsSet.has(String(dId))) {
          deletedDutyLogIdsSet.add(String(dId));
          changedDutyLogTombstones = true;
        }
      }
      if (changedDutyLogTombstones && typeof window !== 'undefined') {
        try {
          localStorage.setItem('ams_deleted_duty_log_ids', JSON.stringify(Array.from(deletedDutyLogIdsSet).slice(-2000)));
        } catch {
          // ignore
        }
      }
    } else if (resolvedKey === 'ams_deleted_subject_ids' && Array.isArray(value)) {
      let changedSubjectTombstones = false;
      for (const sId of value) {
        const strId = String(sId || '').trim();
        if (!strId || strId.startsWith('subkey:') || strId.startsWith('subcode:')) continue;
        if (!deletedSubjectIdsSet.has(strId)) {
          deletedSubjectIdsSet.add(strId);
          changedSubjectTombstones = true;
        }
      }
      if (changedSubjectTombstones && typeof window !== 'undefined') {
        try {
          localStorage.setItem('ams_deleted_subject_ids', JSON.stringify(Array.from(deletedSubjectIdsSet).slice(-2000)));
        } catch {
          // ignore
        }
        // Immediately purge deleted subjects from cached subject stores so Member & Admin UIs update right away
        for (const [cacheKey, cachedVal] of Array.from(memoryCache.entries())) {
          if (isSubjectStorageKey(cacheKey) && Array.isArray(cachedVal)) {
            const filteredSubs = cachedVal.filter(s => !isSubjectDeletedClient(s));
            if (filteredSubs.length !== cachedVal.length) {
              memoryCache.set(cacheKey, filteredSubs);
              if (nativeSetItem) {
                try {
                  isInternalStorageWrite = true;
                  nativeSetItem(cacheKey, JSON.stringify(filteredSubs));
                } catch {
                  // ignore
                } finally {
                  isInternalStorageWrite = false;
                }
              }
              changedKeys.push(cacheKey);
            }
          }
        }
      }
    } else if (isTaskStorageKey(resolvedKey) && Array.isArray(value)) {
      // Protect recent local task saves from stale background polls unless incomingTs is strictly newer
      if (!fromStorageEvent && now - lastLocalWrite < 12000 && incomingTs <= localTs) {
        const currentCachedTasks = memoryCache.get(resolvedKey);
        if (Array.isArray(currentCachedTasks)) {
          value = mergeTaskListsClient(currentCachedTasks, value, false);
        }
      } else {
        const currentCachedTasks = memoryCache.get(resolvedKey);
        if (Array.isArray(currentCachedTasks)) {
          value = mergeTaskListsClient(currentCachedTasks, value, incomingTs >= localTs && localTs > 0 ? true : localTs === 0);
        } else {
          value = value.filter(t => t && t.id && !deletedTaskIdsSet.has(t.id));
        }
      }
    } else if (isDocumentStorageKey(resolvedKey) && Array.isArray(value)) {
      if (!fromStorageEvent && now - lastLocalWrite < 12000 && incomingTs <= localTs) {
        const currentCachedDocs = memoryCache.get(resolvedKey);
        if (Array.isArray(currentCachedDocs)) {
          value = mergeDocumentListsClient(currentCachedDocs, value, false);
        }
      } else {
        const currentCachedDocs = memoryCache.get(resolvedKey);
        if (Array.isArray(currentCachedDocs)) {
          value = mergeDocumentListsClient(currentCachedDocs, value, incomingTs >= localTs && localTs > 0 ? true : localTs === 0);
        } else {
          value = value.filter(d => d && d.id && !deletedDocIdsSet.has(d.id));
        }
      }
    } else if (isLeaveStorageKey(resolvedKey) && Array.isArray(value)) {
      if (!fromStorageEvent && now - lastLocalWrite < 12000 && incomingTs <= localTs) {
        const currentCachedLeaves = memoryCache.get(resolvedKey);
        if (Array.isArray(currentCachedLeaves)) {
          value = mergeLeaveListsClient(currentCachedLeaves, value, false);
        }
      } else {
        const currentCachedLeaves = memoryCache.get(resolvedKey);
        if (Array.isArray(currentCachedLeaves)) {
          value = mergeLeaveListsClient(currentCachedLeaves, value, incomingTs >= localTs && localTs > 0 ? true : localTs === 0);
        } else {
          value = value.filter(l => l && l.id && !deletedLeaveIdsSet.has(String(l.id)));
        }
      }
    } else if (isDutyLogStorageKey(resolvedKey) && Array.isArray(value)) {
      if (!fromStorageEvent && now - lastLocalWrite < 12000 && incomingTs <= localTs) {
        const currentCachedDutyLogs = memoryCache.get(resolvedKey);
        if (Array.isArray(currentCachedDutyLogs)) {
          value = mergeDutyLogListsClient(currentCachedDutyLogs, value, false);
        }
      } else {
        const currentCachedDutyLogs = memoryCache.get(resolvedKey);
        if (Array.isArray(currentCachedDutyLogs)) {
          value = mergeDutyLogListsClient(currentCachedDutyLogs, value, incomingTs >= localTs && localTs > 0 ? true : localTs === 0);
        } else {
          value = value.filter(d => d && d.id && !deletedDutyLogIdsSet.has(String(d.id)));
        }
      }
    } else if (isSubjectStorageKey(resolvedKey) && Array.isArray(value)) {
      if (!fromStorageEvent && now - lastLocalWrite < 12000 && incomingTs <= localTs) {
        const currentCachedSubs = memoryCache.get(resolvedKey);
        if (Array.isArray(currentCachedSubs)) {
          value = mergeSubjectListsClient(currentCachedSubs, value, false);
        }
      } else {
        const currentCachedSubs = memoryCache.get(resolvedKey);
        if (Array.isArray(currentCachedSubs)) {
          value = mergeSubjectListsClient(currentCachedSubs, value, incomingTs >= localTs && localTs > 0 ? true : localTs === 0);
        } else {
          value = value.filter(s => !isSubjectDeletedClient(s));
        }
      }
    } else if (resolvedKey === KEYS.ADMINS && Array.isArray(value)) {
      const currentCachedAdmins = memoryCache.get(resolvedKey);
      const preferInc = forceAcceptAccounts || fromStorageEvent || localTs === 0 || incomingTs >= localTs || now - lastLocalWrite > 12000;
      if (Array.isArray(currentCachedAdmins)) {
        value = mergeAdminListsClient(currentCachedAdmins, value, preferInc);
      } else {
        value = value.map(normalizeAdminAccountClient).filter(Boolean);
      }
    } else if (resolvedKey === KEYS.MEMBERS && Array.isArray(value)) {
      const currentCachedMembers = memoryCache.get(resolvedKey);
      const preferInc = forceAcceptAccounts || fromStorageEvent || localTs === 0 || incomingTs >= localTs || now - lastLocalWrite > 12000;
      if (Array.isArray(currentCachedMembers)) {
        value = mergeMemberListsClient(currentCachedMembers, value, preferInc);
      } else {
        value = value
          .map(normalizeMemberAccountClient)
          .filter((m): m is MemberAccount => Boolean(m) && m!.username.toLowerCase() !== 'admin');
      }
    } else if (resolvedKey === KEYS.DEVELOPER_ACCOUNT && value && typeof value === 'object') {
      if (!forceAcceptAccounts && !fromStorageEvent && now - lastLocalWrite < 12000 && incomingTs <= localTs) {
        continue;
      }
      value = {
        username: String(value.username || 'airfan').trim(),
        password: String(value.password || '456789').trim()
      };
    } else {
      // Strict monotonic protection for other keys:
      // Never allow an older or untimestamped incoming update to overwrite a newer local state!
      if (!fromStorageEvent) {
        if (locallyModifiedKeys.has(resolvedKey) && incomingTs <= localTs) {
          continue;
        }
        if (now - lastLocalWrite < 12000 && incomingTs <= localTs) {
          continue;
        }
        if (localTs > 0 && (incomingTs === 0 || incomingTs < localTs)) {
          continue;
        }
      }
    }

    if (value === null || value === undefined) {
      if (memoryCache.has(resolvedKey) || (nativeGetItem && nativeGetItem(resolvedKey) !== null)) {
        memoryCache.delete(resolvedKey);
        serializedMemoryCache.delete(resolvedKey);
        pendingDiskWrites.delete(resolvedKey);
        if (resolvedKey === KEYS.ADMINS || resolvedKey === KEYS.MEMBERS) {
          invalidateActiveSchoolIdCache();
        }
        keyTimestamps.set(resolvedKey, Math.max(localTs, incomingTs || now));
        try {
          window.localStorage.removeItem(resolvedKey);
        } catch {
          // ignore
        }
        changedKeys.push(resolvedKey);
      }
      continue;
    }

    const currentCached = memoryCache.get(resolvedKey);
    const serializedIncoming = JSON.stringify(value);
    const cachedSerialized = serializedMemoryCache.get(resolvedKey);
    const serializedCurrent =
      cachedSerialized !== undefined
        ? cachedSerialized
        : currentCached !== undefined
        ? JSON.stringify(currentCached)
        : nativeGetItem
        ? nativeGetItem(resolvedKey)
        : null;

    memoryCache.set(resolvedKey, value);
    serializedMemoryCache.set(resolvedKey, serializedIncoming);
    if (resolvedKey === KEYS.ADMINS || resolvedKey === KEYS.MEMBERS) {
      invalidateActiveSchoolIdCache();
    }
    keyTimestamps.set(resolvedKey, Math.max(localTs, incomingTs || 1));

    if (serializedIncoming !== serializedCurrent) {
      if (!fromStorageEvent && nativeSetItem) {
        try {
          isInternalStorageWrite = true;
          nativeSetItem(resolvedKey, serializedIncoming);
        } catch {
          try {
            const compact = JSON.stringify(sanitizeValueForSync(value));
            serializedMemoryCache.set(resolvedKey, compact);
            nativeSetItem(resolvedKey, compact);
          } catch {
            // ignore quota error
          }
        } finally {
          isInternalStorageWrite = false;
        }
      }
      changedKeys.push(resolvedKey);
    }
  }

  if (changedKeys.length > 0) {
    notifySubscribers(changedKeys);
  }
  return changedKeys;
}

function getLocal<T>(key: string, fallback: T): T {
  try {
    const resolvedKey = resolveTenantKey(key);
    if (memoryCache.has(resolvedKey)) {
      return memoryCache.get(resolvedKey) as T;
    }

    const val = nativeGetItem ? nativeGetItem(resolvedKey) : localStorage.getItem(resolvedKey);
    if (!val) {
      // If secondary tenant school has no initialized data yet, return clean isolated fallback (except default primary subjects)
      if (resolvedKey !== key) {
        if (key === KEYS.SUBJECTS) {
          return fallback;
        }
        if (Array.isArray(fallback)) return [] as unknown as T;
        if (key === KEYS.SCHOOL_INFO) {
          const schoolId = getActiveSchoolId();
          const adminsCached = memoryCache.get(KEYS.ADMINS);
          let admins: SchoolAdminAccount[];
          if (Array.isArray(adminsCached)) {
            admins = adminsCached;
          } else {
            const adminsRaw = nativeGetItem ? nativeGetItem(KEYS.ADMINS) : localStorage.getItem(KEYS.ADMINS);
            admins = adminsRaw ? JSON.parse(adminsRaw) : INITIAL_ADMINS;
          }
          const match = admins.find(a => a.id === schoolId);
          return {
            ...INITIAL_SCHOOL_INFO,
            schoolName: match?.schoolName || 'โรงเรียนใหม่',
            schoolCode: match?.schoolCode || '',
            affiliation: match?.affiliation || 'สพป.',
            directorName: match?.directorName || '',
            googleSheetId: match?.googleSheetId,
            googleSheetUrl: match?.googleSheetUrl
          } as unknown as T;
        }
      }
      return fallback;
    }

    const parsed = JSON.parse(val) as T;
    memoryCache.set(resolvedKey, parsed);
    serializedMemoryCache.set(resolvedKey, val);
    return parsed;
  } catch (err) {
    console.error('Failed to parse from localStorage key:', key, err);
    return fallback;
  }
}

function setLocal<T>(key: string, value: T, skipRemotePush = false): void {
  try {
    const resolvedKey = resolveTenantKey(key);
    const now = Date.now();
    memoryCache.set(resolvedKey, value);
    // Invalidate cached serialized string so any immediate localStorage.getItem(key) re-serializes on demand
    serializedMemoryCache.delete(resolvedKey);
    if (resolvedKey === KEYS.ADMINS || resolvedKey === KEYS.MEMBERS) {
      invalidateActiveSchoolIdCache();
    }
    keyTimestamps.set(resolvedKey, now);
    localWriteTimestamps.set(resolvedKey, now);
    if (!skipRemotePush) {
      locallyModifiedKeys.add(resolvedKey);
    }

    // 1. Instant 0ms Cross-Tab Broadcast in same browser
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({
          type: 'delta',
          clientId: CLIENT_ID,
          updates: { [resolvedKey]: value },
          timestamps: { [resolvedKey]: now }
        });
      } catch {
        // ignore
      }
    }

    // 2. Notify local React subscribers immediately (0ms main-thread UI response on mobile)
    notifySubscribers([resolvedKey]);

    // 3. Defer heavy JSON.stringify + localStorage disk write + remote push by 16ms so mobile tap animations paint at 60fps
    pendingDiskWrites.set(resolvedKey, { value, skipRemotePush, timestamp: now });
    if (!diskFlushTimer) {
      diskFlushTimer = setTimeout(flushPendingDiskWrites, 16);
    }
  } catch (err) {
    console.error('Failed to save to localStorage key:', key, err);
  }
}

// Hook window.localStorage.getItem & setItem so sub-components writing directly to localStorage (e.g. PP6, Assessment3Booklets, WeightSessions) are tenant-isolated per school AND sync via Firestore across all devices/browsers
function installLocalStorageSyncHook() {
  if (typeof window === 'undefined' || !nativeSetItem || !nativeGetItem) return;
  try {
    window.localStorage.getItem = function (key: string): string | null {
      if (
        !key ||
        INTERNAL_SKIP_KEYS.has(key) ||
        key.startsWith('ams_cleared_') ||
        (!key.startsWith('ams_') && !key.startsWith('pp6_') && !key.startsWith('school_'))
      ) {
        return nativeGetItem(key);
      }
      const resolvedKey = resolveTenantKey(key);
      const cachedStr = serializedMemoryCache.get(resolvedKey);
      if (cachedStr !== undefined) {
        return cachedStr;
      }
      if (memoryCache.has(resolvedKey)) {
        const cached = memoryCache.get(resolvedKey);
        const str = typeof cached === 'string' ? cached : JSON.stringify(cached);
        serializedMemoryCache.set(resolvedKey, str);
        return str;
      }
      const raw = nativeGetItem(resolvedKey);
      if (raw !== null) {
        serializedMemoryCache.set(resolvedKey, raw);
      }
      return raw;
    };

    window.localStorage.setItem = function (key: string, value: string) {
      if (isInternalStorageWrite) {
        nativeSetItem(key, value);
        return;
      }
      if (
        !key ||
        INTERNAL_SKIP_KEYS.has(key) ||
        key.startsWith('ams_cleared_') ||
        (!key.startsWith('ams_') && !key.startsWith('pp6_') && !key.startsWith('school_'))
      ) {
        nativeSetItem(key, value);
        return;
      }
      const resolvedKey = resolveTenantKey(key);
      serializedMemoryCache.set(resolvedKey, value);
      try {
        let parsed: any = value;
        try {
          parsed = JSON.parse(value);
        } catch {
          parsed = value;
        }
        const now = Date.now();
        memoryCache.set(resolvedKey, parsed);
        if (resolvedKey === KEYS.ADMINS || resolvedKey === KEYS.MEMBERS) {
          invalidateActiveSchoolIdCache();
        }
        keyTimestamps.set(resolvedKey, now);
        localWriteTimestamps.set(resolvedKey, now);
        locallyModifiedKeys.add(resolvedKey);
        if (broadcastChannel) {
          broadcastChannel.postMessage({
            type: 'delta',
            clientId: CLIENT_ID,
            updates: { [resolvedKey]: parsed },
            timestamps: { [resolvedKey]: now }
          });
        }
        notifySubscribers([resolvedKey]);
        pendingDiskWrites.set(resolvedKey, { value: parsed, skipRemotePush: false, timestamp: now });
        if (!diskFlushTimer) {
          diskFlushTimer = setTimeout(flushPendingDiskWrites, 16);
        }
      } catch {
        nativeSetItem(resolvedKey, value);
      }
    };
  } catch {
    // ignore if localStorage methods are non-writable in restricted webviews
  }
}

export const StorageService = {
  // Helper: Normalize School ID across Admin and Member accounts
  getNormalizedSchoolId(rawSchoolId?: string, rawSchoolName?: string): string {
    return normalizeSchoolId(rawSchoolId, rawSchoolName);
  },

  // Subscribe to real-time updates (returns unsubscribe function)
  subscribe(listener: (changedKeys: string[]) => void): () => void {
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  },

  // Pull directly from Global Cloud KV (Google Apps Script RealtimeCloudKV)
  async pullFromGoogleCloudKV(forceAcceptAccounts = false): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (isPullingCloudKV && !forceAcceptAccounts) return false;
    isPullingCloudKV = true;
    try {
      const url = `${DEFAULT_GAS_WEBAPP_URL}?action=getSheet&spreadsheetId=${MASTER_SPREADSHEET_ID}&sheet=${CLOUD_KV_SHEET}&_t=${Date.now()}`;
      const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
      if (!res.ok) return false;
      const json: any = await res.json();
      if (!json || json.status !== 'success' || !Array.isArray(json.data)) return false;

      const incoming: Record<string, any> = {};
      const incomingTs: Record<string, number> = {};

      for (const rawRow of json.data) {
        const parsed = parseCloudKvRowClient(rawRow);
        if (!parsed) continue;
        const rowTs = parsed.updatedAt || 0;
        if (!(parsed.key in incoming)) {
          incoming[parsed.key] = parsed.value;
          incomingTs[parsed.key] = rowTs;
        } else if (isTaskStorageKey(parsed.key)) {
          const prevTs = incomingTs[parsed.key] || 0;
          incoming[parsed.key] = mergeTaskListsClient(
            incoming[parsed.key],
            parsed.value,
            rowTs >= prevTs
          );
          incomingTs[parsed.key] = Math.max(prevTs, rowTs);
        } else if (parsed.key === KEYS.ADMINS && Array.isArray(parsed.value)) {
          const prevTs = incomingTs[parsed.key] || 0;
          incoming[parsed.key] = mergeAdminListsClient(
            incoming[parsed.key],
            parsed.value,
            rowTs >= prevTs
          );
          incomingTs[parsed.key] = Math.max(prevTs, rowTs);
        } else if (parsed.key === KEYS.MEMBERS && Array.isArray(parsed.value)) {
          const prevTs = incomingTs[parsed.key] || 0;
          incoming[parsed.key] = mergeMemberListsClient(
            incoming[parsed.key],
            parsed.value,
            rowTs >= prevTs
          );
          incomingTs[parsed.key] = Math.max(prevTs, rowTs);
        } else if (rowTs >= (incomingTs[parsed.key] || 0)) {
          incoming[parsed.key] = parsed.value;
          incomingTs[parsed.key] = rowTs;
        }
      }

      if (Object.keys(incoming).length > 0) {
        const changed = applyIncomingUpdates(incoming, incomingTs, false, forceAcceptAccounts);
        return changed.length > 0;
      }
    } catch {
      // ignore
    } finally {
      isPullingCloudKV = false;
    }
    return false;
  },

  // Authoritative multi-source account synchronization for Login (especially on newly installed mobile PWAs)
  async syncAccountsForLogin(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    let updatedAny = false;
    try {
      const fetchJsonSafe = (url: string) =>
        fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null);

      const [kvUpdated, serverState, d1Master, masterAdminsSheet, masterMembersSheet] = await Promise.all([
        this.pullFromGoogleCloudKV(true).catch(() => false),
        fetchJsonSafe(`/api/realtime/state?sinceRev=0&forceCloud=1&_t=${Date.now()}`),
        D1Service.fetchAll().catch(() => ({ success: false, data: undefined })),
        fetchJsonSafe(
          `${DEFAULT_GAS_WEBAPP_URL}?action=getSheet&spreadsheetId=${MASTER_SPREADSHEET_ID}&sheet=Admins&_t=${Date.now()}`
        ),
        fetchJsonSafe(
          `${DEFAULT_GAS_WEBAPP_URL}?action=getSheet&spreadsheetId=${MASTER_SPREADSHEET_ID}&sheet=Members&_t=${Date.now()}`
        )
      ]);

      if (kvUpdated) updatedAny = true;

      const incoming: Record<string, any> = {};
      const incomingTs: Record<string, number> = {};
      const now = Date.now();

      if (serverState && serverState.status === 'success' && serverState.store) {
        if (typeof serverState.rev === 'number') {
          lastKnownRev = Math.max(lastKnownRev, serverState.rev);
        }
        for (const [k, v] of Object.entries(serverState.store)) {
          if (!k || INTERNAL_SKIP_KEYS.has(k)) continue;
          incoming[k] = v;
          incomingTs[k] = Number(serverState.timestamps?.[k]) || now;
        }
      }

      if (d1Master && d1Master.success && d1Master.data) {
        if (d1Master.data.developer) {
          incoming[KEYS.DEVELOPER_ACCOUNT] = incoming[KEYS.DEVELOPER_ACCOUNT] || d1Master.data.developer;
          incomingTs[KEYS.DEVELOPER_ACCOUNT] = Math.max(incomingTs[KEYS.DEVELOPER_ACCOUNT] || 0, now);
        }
        if (Array.isArray(d1Master.data.admins) && d1Master.data.admins.length > 0) {
          incoming[KEYS.ADMINS] = Array.isArray(incoming[KEYS.ADMINS])
            ? mergeAdminListsClient(d1Master.data.admins, incoming[KEYS.ADMINS], true)
            : d1Master.data.admins;
          incomingTs[KEYS.ADMINS] = Math.max(incomingTs[KEYS.ADMINS] || 0, now);
        }
        if (Array.isArray(d1Master.data.members) && d1Master.data.members.length > 0) {
          incoming[KEYS.MEMBERS] = Array.isArray(incoming[KEYS.MEMBERS])
            ? mergeMemberListsClient(d1Master.data.members, incoming[KEYS.MEMBERS], true)
            : d1Master.data.members;
          incomingTs[KEYS.MEMBERS] = Math.max(incomingTs[KEYS.MEMBERS] || 0, now);
        }
      }

      if (masterAdminsSheet && masterAdminsSheet.status === 'success' && Array.isArray(masterAdminsSheet.data)) {
        const sheetAdmins = masterAdminsSheet.data
          .map(normalizeAdminAccountClient)
          .filter((a: SchoolAdminAccount | null): a is SchoolAdminAccount => Boolean(a));
        if (sheetAdmins.length > 0) {
          incoming[KEYS.ADMINS] = Array.isArray(incoming[KEYS.ADMINS])
            ? mergeAdminListsClient(sheetAdmins, incoming[KEYS.ADMINS], true)
            : sheetAdmins;
          incomingTs[KEYS.ADMINS] = Math.max(incomingTs[KEYS.ADMINS] || 0, now);
        }
      }

      if (masterMembersSheet && masterMembersSheet.status === 'success' && Array.isArray(masterMembersSheet.data)) {
        const sheetMembers = masterMembersSheet.data
          .map(normalizeMemberAccountClient)
          .filter(
            (m: MemberAccount | null): m is MemberAccount =>
              Boolean(m) && m!.username.toLowerCase() !== 'admin'
          );
        if (sheetMembers.length > 0) {
          incoming[KEYS.MEMBERS] = Array.isArray(incoming[KEYS.MEMBERS])
            ? mergeMemberListsClient(sheetMembers, incoming[KEYS.MEMBERS], true)
            : sheetMembers;
          incomingTs[KEYS.MEMBERS] = Math.max(incomingTs[KEYS.MEMBERS] || 0, now);
        }
      }

      // Also check per-school Members sheets for any school admin with a googleSheetId
      const currentAdminsList: SchoolAdminAccount[] = Array.isArray(incoming[KEYS.ADMINS])
        ? incoming[KEYS.ADMINS]
        : this.getAdmins();
      const schoolSheetIds = Array.from(
        new Set(
          currentAdminsList
            .map(a => a?.googleSheetId)
            .filter((id): id is string => Boolean(id && id.length >= 15 && !id.startsWith('sheet_')))
        )
      );

      if (schoolSheetIds.length > 0) {
        const schoolMemberResults = await Promise.all(
          schoolSheetIds.map(sid =>
            fetchJsonSafe(`${DEFAULT_GAS_WEBAPP_URL}?action=getSheet&spreadsheetId=${sid}&sheet=Members&_t=${Date.now()}`)
          )
        );
        for (const smRes of schoolMemberResults) {
          if (smRes && smRes.status === 'success' && Array.isArray(smRes.data)) {
            const sMembers = smRes.data
              .map(normalizeMemberAccountClient)
              .filter(
                (m: MemberAccount | null): m is MemberAccount =>
                  Boolean(m) && m!.username.toLowerCase() !== 'admin'
              );
            if (sMembers.length > 0) {
              incoming[KEYS.MEMBERS] = Array.isArray(incoming[KEYS.MEMBERS])
                ? mergeMemberListsClient(sMembers, incoming[KEYS.MEMBERS], true)
                : sMembers;
              incomingTs[KEYS.MEMBERS] = Math.max(incomingTs[KEYS.MEMBERS] || 0, now);
            }
          }
        }
      }

      if (Object.keys(incoming).length > 0) {
        const changed = applyIncomingUpdates(incoming, incomingTs, false, true);
        if (changed.length > 0) updatedAny = true;
      }
    } catch {
      // ignore
    }
    return updatedAny;
  },

  // Pull latest state from Firebase Firestore, Real-Time Server, Cloudflare D1, and Global Cloud KV
  async pullRemoteState(forceFull = false): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!forceFull) {
      if (isPullingRemoteState) return false;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
      const nowCheck = Date.now();
      if (nowCheck - lastRemotePullTime < 2500) return false;
    }
    isPullingRemoteState = true;
    lastRemotePullTime = Date.now();

    try {
      let updatedAny = false;
      let serverReached = false;

      const mergedStore: Record<string, any> = {};
      const mergedTimestamps: Record<string, number> = {};

      const mergeInto = (storeObj: Record<string, any>, tsObj: Record<string, number>) => {
        for (const [k, v] of Object.entries(storeObj)) {
          if (!k || INTERNAL_SKIP_KEYS.has(k)) continue;
          const ts = Number(tsObj[k]) || 0;
          const existingTs = mergedTimestamps[k] || 0;
          if (!(k in mergedStore) || ts >= existingTs) {
            mergedStore[k] = v;
            mergedTimestamps[k] = ts;
          }
        }
      };

      // Periodically also pull from Google Cloud KV directly (every 20s or on forceFull) so cross-container sync works without clogging mobile CPU
      const nowMs = Date.now();
      let directCloudKvPromise: Promise<boolean> = Promise.resolve(false);
      if (forceFull || nowMs - lastDirectCloudPullTime > 20000) {
        lastDirectCloudPullTime = nowMs;
        directCloudKvPromise = this.pullFromGoogleCloudKV().catch(() => false);
      }

      // 1. Pull from Firebase Firestore on initial boot or forced full sync (live changes arrive via onSnapshot)
      const firestorePromise = forceFull
        ? pullAllFromFirestore().catch(() => ({
            store: {} as Record<string, any>,
            timestamps: {} as Record<string, number>
          }))
        : Promise.resolve({
            store: {} as Record<string, any>,
            timestamps: {} as Record<string, number>
          });

      // 2. Pull from Express Server (/api/realtime/state)
      const sinceParam = forceFull ? 0 : lastKnownRev;
      const forceCloudParam = forceFull ? '&forceCloud=1' : '';
      const serverPromise = fetch(`/api/realtime/state?sinceRev=${sinceParam}${forceCloudParam}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
        .then(async res => {
          if (!res.ok) return null;
          serverReached = true;
          return await res.json();
        })
        .catch(() => null);

      const [firestoreData, serverData] = await Promise.all([
        firestorePromise,
        serverPromise,
        forceFull
          ? Promise.race([directCloudKvPromise, new Promise<boolean>(r => setTimeout(() => r(false), 3500))])
          : Promise.resolve(false)
      ]);

      if (serverData && serverData.status === 'success' && serverData.store && typeof serverData.store === 'object') {
        if (typeof serverData.rev === 'number') {
          lastKnownRev = serverData.rev;
        }
        mergeInto(serverData.store, serverData.timestamps || {});
      }

      if (firestoreData && firestoreData.store && Object.keys(firestoreData.store).length > 0) {
        mergeInto(firestoreData.store, firestoreData.timestamps || {});
      }

      if (Object.keys(mergedStore).length > 0) {
        const changed = applyIncomingUpdates(mergedStore, mergedTimestamps);
        if (changed.length > 0) updatedAny = true;
        return updatedAny;
      }

      if (serverData && serverData.status === 'up_to_date') {
        return false;
      }

      // Fallback if both Firestore and /api/realtime/state are unreachable
      if (!serverReached && Object.keys(mergedStore).length === 0) {
        try {
          const [d1Master, d1Kv, cloudUpdated] = await Promise.all([
            D1Service.fetchAll(),
            fetch('/api/d1?action=getRealtimeState', { cache: 'no-store' })
              .then(r => (r.ok ? r.json() : null))
              .catch(() => null),
            this.pullFromGoogleCloudKV()
          ]);

          if (cloudUpdated) updatedAny = true;

          const incoming: Record<string, any> = {};
          const incomingTs: Record<string, number> = {};

          if (d1Master.success && d1Master.data) {
            if (d1Master.data.developer) {
              incoming[KEYS.DEVELOPER_ACCOUNT] = d1Master.data.developer;
              incomingTs[KEYS.DEVELOPER_ACCOUNT] = 1;
            }
            if (Array.isArray(d1Master.data.admins) && d1Master.data.admins.length > 0) {
              incoming[KEYS.ADMINS] = d1Master.data.admins;
              incomingTs[KEYS.ADMINS] = 1;
            }
            if (Array.isArray(d1Master.data.members) && d1Master.data.members.length > 0) {
              incoming[KEYS.MEMBERS] = d1Master.data.members;
              incomingTs[KEYS.MEMBERS] = 1;
            }
            if (Array.isArray(d1Master.data.academicYears) && d1Master.data.academicYears.length > 0) {
              incoming[KEYS.ACADEMIC_YEARS] = d1Master.data.academicYears;
              incomingTs[KEYS.ACADEMIC_YEARS] = 1;
            }
          }

          if (d1Kv && d1Kv.status === 'success' && d1Kv.store) {
            Object.assign(incoming, d1Kv.store);
            Object.assign(incomingTs, d1Kv.timestamps || {});
          }

          if (Object.keys(incoming).length > 0) {
            const changed = applyIncomingUpdates(incoming, incomingTs);
            if (changed.length > 0) updatedAny = true;
          } else {
            this.seedServerWithLocalData();
          }
        } catch {
          // ignore
        }
      }

      return updatedAny;
    } finally {
      isPullingRemoteState = false;
    }
  },

  seedServerWithLocalData(): void {
    if (typeof window === 'undefined') return;
    const updates: Record<string, any> = {};
    const timestamps: Record<string, number> = {};
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || INTERNAL_SKIP_KEYS.has(k) || (!k.startsWith('ams_') && !k.startsWith('pp6_') && !k.startsWith('school_'))) {
        continue;
      }
      try {
        const raw = nativeGetItem ? nativeGetItem(k) : localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          const ts = keyTimestamps.get(k) || now - 30000;
          updates[k] = parsed;
          timestamps[k] = ts;
        }
      } catch {
        // ignore
      }
    }

    if (Object.keys(updates).length === 0) return;

    fetch('/api/realtime/mutate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        updates,
        timestamps,
        isInitialSeed: true
      })
    }).catch(() => {});
  },

  // Initialize Real-Time Synchronization (Firebase Firestore onSnapshot + SSE + BroadcastChannel + Storage Event)
  initRealtimeSync(): void {
    if (typeof window === 'undefined' || realtimeInitialized) return;
    realtimeInitialized = true;

    installLocalStorageSyncHook();

    // 1. Immediate initial pull from Firebase Firestore & Server
    this.pullRemoteState(true);

    // 2. Real-time Firebase Firestore onSnapshot listener (< 100ms across all devices, browsers, and emails)
    if (!firestoreUnsubscribe) {
      firestoreUnsubscribe = subscribeToFirestoreRealtime((updates, timestamps, sourceClientId) => {
        if (sourceClientId !== CLIENT_ID) {
          applyIncomingUpdates(updates, timestamps);
        }
      });
    }

    // 3. BroadcastChannel for 0ms cross-tab sync within same browser
    if ('BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel('nexus_realtime_channel');
        broadcastChannel.onmessage = (event) => {
          const msg = event.data;
          if (msg && msg.type === 'delta' && msg.clientId !== CLIENT_ID && msg.updates) {
            applyIncomingUpdates(msg.updates, msg.timestamps || {});
          }
        };
      } catch {
        // ignore
      }
    }

    // 4. Native window 'storage' event listener
    window.addEventListener('storage', (e) => {
      if (!e.key || INTERNAL_SKIP_KEYS.has(e.key) || !e.newValue) return;
      if (!e.key.startsWith('ams_') && !e.key.startsWith('pp6_') && !e.key.startsWith('school_')) return;
      try {
        const parsed = JSON.parse(e.newValue);
        applyIncomingUpdates({ [e.key]: parsed }, { [e.key]: Date.now() }, true);
      } catch {
        // ignore
      }
    });

    // 5. Persistent Server-Sent Events (SSE) stream for < 30ms push
    const connectSSE = () => {
      if (sseConnection) {
        try {
          sseConnection.close();
        } catch {
          // ignore
        }
      }

      try {
        const es = new EventSource('/api/realtime/stream');
        sseConnection = es;

        es.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data);
            if (payload.type === 'connected') {
              if (typeof payload.rev === 'number' && payload.rev > lastKnownRev) {
                this.pullRemoteState(false);
              }
            } else if (payload.type === 'delta') {
              if (typeof payload.rev === 'number' && payload.rev > lastKnownRev) {
                lastKnownRev = payload.rev;
              }
              if (payload.clientId !== CLIENT_ID && payload.updates) {
                applyIncomingUpdates(payload.updates, payload.timestamps || {});
              }
            }
          } catch {
            // ignore
          }
        };

        es.onerror = () => {
          try {
            es.close();
          } catch {
            // ignore
          }
          setTimeout(connectSSE, 3000);
        };
      } catch {
        // EventSource not supported or offline
      }
    };

    connectSSE();

    // 6. Lightweight delta check every 5 seconds & on focus/visibility/online (SSE + Firestore onSnapshot handle real-time push)
    setInterval(() => {
      this.pullRemoteState(false);
    }, 5000);

    window.addEventListener('focus', () => {
      this.pullRemoteState(false);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushPendingDiskWrites();
      } else if (document.visibilityState === 'visible') {
        this.pullRemoteState(false);
      }
    });

    window.addEventListener('pagehide', () => {
      flushPendingDiskWrites();
    });

    window.addEventListener('online', () => {
      this.pullRemoteState(true);
      connectSSE();
    });
  },

  // Developer Account Credentials (Default: airfan / 456789, changeable by Developer)
  getDeveloperCredentials(): { username: string; password: string } {
    return getLocal<{ username: string; password: string }>(KEYS.DEVELOPER_ACCOUNT, {
      username: 'airfan',
      password: '456789'
    });
  },

  updateDeveloperPassword(newPassword: string): void {
    const current = this.getDeveloperCredentials();
    const cleaned = newPassword.trim();
    setLocal(KEYS.DEVELOPER_ACCOUNT, {
      ...current,
      password: cleaned
    });
    D1Service.updateDeveloperPassword(cleaned).catch(() => {});
  },

  // Session & Auth
  getSession(): UserSession | null {
    try {
      if (typeof window === 'undefined') return null;
      const val = sessionStorage.getItem(KEYS.SESSION);
      if (!val) {
        cachedSessionRaw = null;
        cachedSessionObj = null;
        return null;
      }
      if (val === cachedSessionRaw && cachedSessionObj) {
        return cachedSessionObj;
      }
      const parsed = JSON.parse(val) as UserSession;
      if (parsed && parsed.username && parsed.isLoggedIn) {
        if (parsed.role !== 'developer') {
          parsed.schoolId = normalizeSchoolId(parsed.schoolId, parsed.schoolName);
        }
        cachedSessionRaw = val;
        cachedSessionObj = parsed;
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  setSession(session: UserSession | null): void {
    try {
      invalidateActiveSchoolIdCache();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(KEYS.SESSION);
      }
      if (session) {
        if (session.role !== 'developer') {
          session.schoolId = normalizeSchoolId(session.schoolId, session.schoolName);
        }
        const serialized = JSON.stringify(session);
        cachedSessionRaw = serialized;
        cachedSessionObj = session;
        sessionStorage.setItem(KEYS.SESSION, serialized);
      } else {
        cachedSessionRaw = null;
        cachedSessionObj = null;
        sessionStorage.removeItem(KEYS.SESSION);
      }
    } catch (err) {
      console.error('Failed to update session:', err);
    }
  },

  // School Admins (Level 2: Multiple Admins for Multi-Schools)
  getAdmins(): SchoolAdminAccount[] {
    return getLocal<SchoolAdminAccount[]>(KEYS.ADMINS, INITIAL_ADMINS);
  },

  saveAdmin(admin: SchoolAdminAccount): SchoolAdminAccount[] {
    const list = this.getAdmins();
    const idx = list.findIndex(a => a.id === admin.id || a.username.toLowerCase() === admin.username.toLowerCase());
    let mergedAdmin = admin;
    let updated: SchoolAdminAccount[];
    if (idx >= 0) {
      const prev = list[idx];
      mergedAdmin = { ...prev, ...admin };
      if (
        prev.googleSheetId &&
        !prev.googleSheetId.startsWith('sheet_') &&
        (!admin.googleSheetId || admin.googleSheetId.startsWith('sheet_'))
      ) {
        mergedAdmin.googleSheetId = prev.googleSheetId;
        mergedAdmin.googleSheetUrl = prev.googleSheetUrl || `https://docs.google.com/spreadsheets/d/${prev.googleSheetId}/edit`;
      }
      if (prev.driveFolderId && !admin.driveFolderId) {
        mergedAdmin.driveFolderId = prev.driveFolderId;
        mergedAdmin.driveFolderUrl = prev.driveFolderUrl || `https://drive.google.com/drive/folders/${prev.driveFolderId}`;
      }
      updated = [...list];
      updated[idx] = mergedAdmin;
    } else {
      updated = [admin, ...list];
    }
    setLocal(KEYS.ADMINS, updated);
    D1Service.saveAdmin(mergedAdmin).catch(() => {});
    this.syncAdminRecordToGoogleSheets(mergedAdmin);
    return updated;
  },

  updateAdminPassword(adminId: string, newPassword: string): { updated: SchoolAdminAccount[]; targetAdmin?: SchoolAdminAccount } {
    const cleanPass = newPassword.trim();
    const list = this.getAdmins();
    let targetAdmin: SchoolAdminAccount | undefined;
    const updated = list.map(a => {
      if (a.id === adminId) {
        targetAdmin = { ...a, password: cleanPass };
        return targetAdmin;
      }
      return a;
    });
    if (targetAdmin) {
      setLocal(KEYS.ADMINS, updated);
      D1Service.saveAdmin(targetAdmin).catch(() => {});
      this.syncAdminRecordToGoogleSheets(targetAdmin);
    }
    return { updated, targetAdmin };
  },

  deleteAdmin(id: string): SchoolAdminAccount[] {
    const currentAdmins = this.getAdmins();
    const targetAdmin = currentAdmins.find(a => a.id === id);
    const updated = currentAdmins.filter(a => a.id !== id);
    setLocal(KEYS.ADMINS, updated);

    // 1. Cascade delete members belonging to this School Admin
    const currentMembers = getLocal<MemberAccount[]>(KEYS.MEMBERS, INITIAL_MEMBERS);
    const deletedMembers = currentMembers.filter(
      m => m.schoolId === id || (targetAdmin && m.schoolName === targetAdmin.schoolName)
    );
    const remainingMembers = currentMembers.filter(
      m => m.schoolId !== id && (!targetAdmin || m.schoolName !== targetAdmin.schoolName)
    );
    if (remainingMembers.length !== currentMembers.length) {
      setLocal(KEYS.MEMBERS, remainingMembers);
    }

    // 2. Cascade delete all tenant-scoped keys (__<schoolId>) from localStorage, memoryCache, and real-time server
    const deletedTenantKeys: string[] = [];
    const suffix = `__${id}`;
    TENANT_SCOPED_KEYS.forEach(baseKey => {
      deletedTenantKeys.push(`${baseKey}${suffix}`);
    });

    if (typeof window !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.endsWith(suffix)) {
          if (!deletedTenantKeys.includes(k)) {
            deletedTenantKeys.push(k);
          }
        }
      }
      memoryCache.forEach((_val, k) => {
        if (k.endsWith(suffix) && !deletedTenantKeys.includes(k)) {
          deletedTenantKeys.push(k);
        }
      });

      const now = Date.now();
      const nullUpdates: Record<string, any> = {};
      const nullTimestamps: Record<string, number> = {};

      for (const tKey of deletedTenantKeys) {
        memoryCache.delete(tKey);
        keyTimestamps.set(tKey, now);
        try {
          window.localStorage.removeItem(tKey);
        } catch {
          // ignore
        }
        nullUpdates[tKey] = null;
        nullTimestamps[tKey] = now;
      }

      if (Object.keys(nullUpdates).length > 0) {
        fetch('/api/realtime/mutate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: CLIENT_ID,
            updates: nullUpdates,
            timestamps: nullTimestamps
          })
        }).catch(() => {});
      }
    }

    // 3. Delete from Cloudflare D1 & Google Sheets (Trash school's Google Sheet + remove Admin row & tenant KV rows)
    D1Service.deleteAdmin(id).catch(() => {});
    this.deleteAdminAndSchoolSheetFromGoogle(id, targetAdmin, deletedMembers, deletedTenantKeys);
    return updated;
  },

  toggleSuspendAdmin(id: string): { updated: SchoolAdminAccount[]; targetAdmin?: SchoolAdminAccount } {
    const list = this.getAdmins();
    let targetAdmin: SchoolAdminAccount | undefined;
    const updated = list.map(a => {
      if (a.id === id) {
        targetAdmin = { ...a, isSuspended: !a.isSuspended };
        return targetAdmin;
      }
      return a;
    });
    if (targetAdmin) {
      setLocal(KEYS.ADMINS, updated);
      D1Service.saveAdmin(targetAdmin).catch(() => {});
      this.syncAdminRecordToGoogleSheets(targetAdmin);
      const config = this.getGoogleConfig();
      const gasUrl = config.webAppUrl || DEFAULT_GAS_WEBAPP_URL;
      if (gasUrl) {
        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'toggleSuspendAdmin',
            spreadsheetId: MASTER_SPREADSHEET_ID,
            adminId: targetAdmin.id,
            isSuspended: Boolean(targetAdmin.isSuspended),
            admin: targetAdmin
          })
        }).catch(() => {});
      }
    }
    return { updated, targetAdmin };
  },

  isSchoolSuspended(schoolId?: string, schoolName?: string): boolean {
    const admins = this.getAdmins();
    const normId = normalizeSchoolId(schoolId, schoolName, admins);
    const matchedAdmin = admins.find(
      a => a.id === normId || (schoolName && cleanSchoolNameForMatch(a.schoolName) === cleanSchoolNameForMatch(schoolName))
    );
    return Boolean(matchedAdmin?.isSuspended);
  },

  toggleSchoolModuleAccess(
    id: string,
    moduleKey: 'disableAssignments' | 'disableDocuments'
  ): { updated: SchoolAdminAccount[]; targetAdmin?: SchoolAdminAccount } {
    const list = this.getAdmins();
    let targetAdmin: SchoolAdminAccount | undefined;
    const updated = list.map(a => {
      if (a.id === id) {
        targetAdmin = { ...a, [moduleKey]: !a[moduleKey] };
        return targetAdmin;
      }
      return a;
    });
    if (targetAdmin) {
      setLocal(KEYS.ADMINS, updated);
      D1Service.saveAdmin(targetAdmin).catch(() => {});
      this.syncAdminRecordToGoogleSheets(targetAdmin);
    }
    return { updated, targetAdmin };
  },

  getSchoolModuleAccess(
    schoolId?: string,
    schoolName?: string
  ): { disableAssignments: boolean; disableDocuments: boolean } {
    const admins = this.getAdmins();
    const normId = normalizeSchoolId(schoolId, schoolName, admins);
    const matchedAdmin = admins.find(
      a => a.id === normId || (schoolName && cleanSchoolNameForMatch(a.schoolName) === cleanSchoolNameForMatch(schoolName))
    );
    return {
      disableAssignments: Boolean(matchedAdmin?.disableAssignments),
      disableDocuments: Boolean(matchedAdmin?.disableDocuments)
    };
  },

  authenticate(username: string, password: string): { success: boolean; user?: UserSession; message: string } {
    const trimmedUser = String(username ?? '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
    const trimmedPass = String(password ?? '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
    const devCreds = this.getDeveloperCredentials();

    // 1. Level 1: Developer Account (Default ID: airfan | Password: 456789 or updated password)
    if (
      isUsernameMatchClient(devCreds.username || 'airfan', trimmedUser) &&
      (isPasswordMatchClient(devCreds.password || '456789', trimmedPass) ||
        (!devCreds.password && isPasswordMatchClient('456789', trimmedPass)))
    ) {
      const devUser: UserSession = {
        id: 'dev-01',
        username: 'airfan',
        fullName: 'Airfan (Developer)',
        role: 'developer',
        position: 'ผู้ดูแลระบบสูงสุดระดับโครงสร้าง (Developer)',
        isLoggedIn: true
      };
      this.setSession(devUser);
      return {
        success: true,
        user: devUser,
        message: 'เข้าสู่ระบบในฐานะ Developer (airfan) ระดับที่ 1 สำเร็จ'
      };
    }

    // 2. Level 2: School Admins List
    const admins = this.getAdmins();
    const foundAdmin = admins.find(
      a =>
        a &&
        isUsernameMatchClient(a.username, trimmedUser) &&
        (isPasswordMatchClient(a.password, trimmedPass) ||
          ((!a.password || String(a.password).trim() === '') && isPasswordMatchClient('123456', trimmedPass)))
    );
    if (foundAdmin) {
      if (isBooleanSuspended(foundAdmin.isSuspended)) {
        return {
          success: false,
          message: `บัญชีผู้ดูแลระบบของ "${foundAdmin.schoolName}" ถูกระงับการใช้งานชั่วคราวโดยผู้พัฒนาระบบ (Developer) ไม่สามารถเข้าใช้งานได้ในขณะนี้`
        };
      }
      const normAdminSchoolId = normalizeSchoolId(foundAdmin.id, foundAdmin.schoolName, admins);
      const adminUser: UserSession = {
        id: foundAdmin.id,
        username: String(foundAdmin.username).trim(),
        fullName: foundAdmin.fullName,
        role: 'admin',
        position: 'ผู้ดูแลระบบโรงเรียน',
        schoolId: normAdminSchoolId,
        schoolName: foundAdmin.schoolName,
        isLoggedIn: true
      };
      this.setSession(adminUser);
      return {
        success: true,
        user: adminUser,
        message: `ยินดีต้อนรับผู้ดูแลระบบ ${foundAdmin.schoolName} (${foundAdmin.fullName})`
      };
    }

    // Default legacy Admin fallback
    if (isUsernameMatchClient('admin', trimmedUser) && isPasswordMatchClient('123456', trimmedPass)) {
      const defaultAdm = admins.find(a => a.id === 'admin-school-01');
      if (isBooleanSuspended(defaultAdm?.isSuspended)) {
        return {
          success: false,
          message: `บัญชีผู้ดูแลระบบของ "${defaultAdm?.schoolName}" ถูกระงับการใช้งานชั่วคราวโดยผู้พัฒนาระบบ (Developer) ไม่สามารถเข้าใช้งานได้ในขณะนี้`
        };
      }
      const adminUser: UserSession = {
        id: 'admin-school-01',
        username: 'Admin',
        fullName: 'ผู้ดูแลระบบโรงเรียน (Administrator)',
        role: 'admin',
        position: 'ผู้ดูแลระบบโรงเรียน',
        schoolId: 'admin-school-01',
        schoolName: defaultAdm?.schoolName || 'โรงเรียนอนุบาลเทศบาลดอนวิทยา',
        isLoggedIn: true
      };
      this.setSession(adminUser);
      return { success: true, user: adminUser, message: 'เข้าสู่ระบบในฐานะผู้ดูแลระบบ (Admin) สำเร็จ' };
    }

    // 3. Level 3: Members (Teachers / Staff)
    const members = this.getMembers();
    const found = members.find(
      m =>
        m &&
        isUsernameMatchClient(m.username, trimmedUser) &&
        (isPasswordMatchClient(m.password, trimmedPass) || !m.password || String(m.password).trim() === '')
    );
    if (found) {
      const memberSchoolId = normalizeSchoolId(found.schoolId, found.schoolName, admins);
      const matchedAdmin = admins.find(
        a =>
          a.id === memberSchoolId ||
          (found.schoolName && cleanSchoolNameForMatch(a.schoolName) === cleanSchoolNameForMatch(found.schoolName))
      );
      if (isBooleanSuspended(matchedAdmin?.isSuspended)) {
        return {
          success: false,
          message: `โรงเรียนต้นสังกัด (${matchedAdmin?.schoolName}) ถูกระงับการใช้งานชั่วคราว สมาชิกในสังกัดไม่มีสิทธิ์เข้าใช้งานในขณะนี้`
        };
      }
      if (isBooleanSuspended(found.isSuspended)) {
        return {
          success: false,
          message: 'บัญชีสมาชิกนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ (Admin) หรือ Developer'
        };
      }
      const memberUser: UserSession = {
        id: found.id,
        username: String(found.username).trim(),
        prefix: found.prefix,
        fullName: found.fullName,
        firstName: found.firstName,
        lastName: found.lastName,
        role: found.role || 'member',
        assignedGrade: found.gradeLevel,
        assignedRoom: found.room || (found.gradeLevel ? '1' : undefined),
        assignedClasses: found.assignedClasses,
        position: found.position,
        learningGroup: found.learningGroup,
        avatarUrl: found.avatarUrl,
        schoolId: memberSchoolId,
        schoolName: matchedAdmin?.schoolName || found.schoolName,
        isLoggedIn: true
      };
      this.setSession(memberUser);
      return {
        success: true,
        user: memberUser,
        message: `ยินดีต้อนรับ ${found.fullName} (สมาชิกบุคลากร)`
      };
    }

    return {
      success: false,
      message: 'ID หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง'
    };
  },

  // Google Config
  getGoogleConfig(): GoogleConfig {
    const config = getLocal<GoogleConfig>(KEYS.GOOGLE_CONFIG, {
      webAppUrl: DEFAULT_GAS_WEBAPP_URL,
      driveFolderId: '11IXjrNHXyGpf3A-7ZT38t8B_jXtoFGS9',
      isConnected: true,
      lastSynced: new Date().toISOString()
    });
    if (!config.webAppUrl) {
      config.webAppUrl = DEFAULT_GAS_WEBAPP_URL;
      config.driveFolderId = '11IXjrNHXyGpf3A-7ZT38t8B_jXtoFGS9';
      config.isConnected = true;
    }
    return config;
  },

  setGoogleConfig(config: GoogleConfig): void {
    setLocal(KEYS.GOOGLE_CONFIG, config);
  },

  // School Info
  getSchoolInfo(): SchoolInfo {
    return getLocal<SchoolInfo>(KEYS.SCHOOL_INFO, INITIAL_SCHOOL_INFO);
  },

  setSchoolInfo(info: SchoolInfo): void {
    setLocal(KEYS.SCHOOL_INFO, info);
    // Keep School Admin entry & Member schoolName synchronized with updated SchoolInfo
    const activeSchoolId = getActiveSchoolId() || 'admin-school-01';
    const admins = this.getAdmins();
    const adminIdx = admins.findIndex(a => normalizeSchoolId(a.id, a.schoolName, admins) === activeSchoolId);
    if (adminIdx >= 0 && info.schoolName) {
      const updatedAdmin: SchoolAdminAccount = {
        ...admins[adminIdx],
        schoolName: info.schoolName,
        schoolCode: info.schoolCode || admins[adminIdx].schoolCode,
        affiliation: info.affiliation || admins[adminIdx].affiliation,
        directorName: info.directorName || admins[adminIdx].directorName
      };
      const nextAdmins = [...admins];
      nextAdmins[adminIdx] = updatedAdmin;
      setLocal(KEYS.ADMINS, nextAdmins);
      D1Service.saveAdmin(updatedAdmin).catch(() => {});

      // Also synchronize schoolName on all members belonging to this schoolId
      const currentMembers = getLocal<MemberAccount[]>(KEYS.MEMBERS, INITIAL_MEMBERS);
      let membersUpdated = false;
      const nextMembers = currentMembers.map(m => {
        const mSchoolId = normalizeSchoolId(m.schoolId, m.schoolName, nextAdmins);
        if (mSchoolId === activeSchoolId && (m.schoolId !== activeSchoolId || m.schoolName !== info.schoolName)) {
          membersUpdated = true;
          return { ...m, schoolId: activeSchoolId, schoolName: info.schoolName };
        }
        return m;
      });
      if (membersUpdated) {
        setLocal(KEYS.MEMBERS, nextMembers);
      }
    }
    this.syncPostToGoogle('saveSchoolInfo', { schoolInfo: info }).then(res => {
      if (res && res.schoolInfo && res.schoolInfo.logoUrl && res.schoolInfo.logoUrl.startsWith('http')) {
        const cur = this.getSchoolInfo();
        if (cur.logoUrl !== res.schoolInfo.logoUrl) {
          setLocal(KEYS.SCHOOL_INFO, { ...cur, logoUrl: res.schoolInfo.logoUrl }, true);
        }
      }
    }).catch(() => {});
  },

  // Members
  getMembers(): MemberAccount[] {
    const list = getLocal<MemberAccount[]>(KEYS.MEMBERS, INITIAL_MEMBERS);
    const admins = this.getAdmins();
    return list.map(m => {
      const normId = normalizeSchoolId(m.schoolId, m.schoolName, admins);
      const matchedAdmin = admins.find(a => a.id === normId);
      return {
        ...m,
        schoolId: normId,
        schoolName: matchedAdmin?.schoolName || m.schoolName || 'โรงเรียนอนุบาลเทศบาลดอนวิทยา'
      };
    });
  },

  saveMember(member: MemberAccount): MemberAccount[] {
    const admins = this.getAdmins();
    const normSchoolId = normalizeSchoolId(member.schoolId, member.schoolName, admins);
    const matchedAdmin = admins.find(a => a.id === normSchoolId);
    const normalizedMember: MemberAccount = {
      ...member,
      schoolId: normSchoolId,
      schoolName: matchedAdmin?.schoolName || member.schoolName
    };
    const list = this.getMembers();
    const idx = list.findIndex(m => m.id === normalizedMember.id);
    let updated: MemberAccount[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = normalizedMember;
    } else {
      updated = [normalizedMember, ...list];
    }
    setLocal(KEYS.MEMBERS, updated);
    D1Service.saveMember(normalizedMember).catch(() => {});
    if (matchedAdmin?.googleSheetId && !matchedAdmin.googleSheetId.startsWith('sheet_')) {
      this.syncPostToGoogle('saveMember', {
        member: normalizedMember,
        spreadsheetId: matchedAdmin.googleSheetId
      });
    }
    this.syncPostToGoogle('saveMember', {
      member: normalizedMember,
      spreadsheetId: MASTER_SPREADSHEET_ID
    });
    return updated;
  },

  updateMemberPassword(memberId: string, newPassword: string): { updated: MemberAccount[]; targetMember?: MemberAccount } {
    const cleanPass = newPassword.trim();
    const list = this.getMembers();
    const found = list.find(m => m.id === memberId);
    if (!found) {
      return { updated: list };
    }
    const targetMember: MemberAccount = {
      ...found,
      password: cleanPass
    };
    const updated = this.saveMember(targetMember);
    return { updated, targetMember };
  },

  deleteMember(id: string): MemberAccount[] {
    const currentList = this.getMembers();
    const targetMember = currentList.find(m => m.id === id);
    const updated = currentList.filter(m => m.id !== id);
    setLocal(KEYS.MEMBERS, updated);
    D1Service.deleteMember(id).catch(() => {});
    const avatarUrl = targetMember?.avatarUrl;
    if (targetMember) {
      const admins = this.getAdmins();
      const matchedAdmin = admins.find(a => a.id === targetMember.schoolId);
      if (matchedAdmin?.googleSheetId && !matchedAdmin.googleSheetId.startsWith('sheet_')) {
        this.syncPostToGoogle('deleteMember', {
          id,
          avatarUrl,
          spreadsheetId: matchedAdmin.googleSheetId
        });
      }
    }
    this.syncPostToGoogle('deleteMember', {
      id,
      avatarUrl,
      spreadsheetId: MASTER_SPREADSHEET_ID
    });
    return updated;
  },

  // Students
  getStudents(): Student[] {
    const list = getLocal<Student[]>(KEYS.STUDENTS, INITIAL_STUDENTS);
    return list.map(s => {
      const initMatch = INITIAL_STUDENTS.find(init => init.id === s.id);
      return {
        ...initMatch,
        ...s,
        nickname: s.nickname || initMatch?.nickname || '',
        chronicDisease: s.chronicDisease || initMatch?.chronicDisease || 'ไม่มี',
        fatherOccupation: s.fatherOccupation || initMatch?.fatherOccupation || '',
        fatherIncome: s.fatherIncome ?? initMatch?.fatherIncome,
        fatherPhone: s.fatherPhone || initMatch?.fatherPhone || '',
        motherOccupation: s.motherOccupation || initMatch?.motherOccupation || '',
        motherIncome: s.motherIncome ?? initMatch?.motherIncome,
        motherPhone: s.motherPhone || initMatch?.motherPhone || '',
        parentsMaritalStatus: s.parentsMaritalStatus || initMatch?.parentsMaritalStatus || 'อยู่ด้วยกัน',
        parentsMaritalStatusOther: s.parentsMaritalStatusOther || initMatch?.parentsMaritalStatusOther || '',
        guardianRelation: s.guardianRelation || initMatch?.guardianRelation || 'บิดา',
        guardianName: s.guardianName || initMatch?.guardianName || s.fatherName || s.motherName || '',
        guardianAge: s.guardianAge ?? initMatch?.guardianAge ?? s.fatherAge ?? s.motherAge,
        guardianOccupation: s.guardianOccupation || initMatch?.guardianOccupation || s.fatherOccupation || s.motherOccupation || s.parentOccupation || '',
        guardianIncome: s.guardianIncome ?? initMatch?.guardianIncome ?? s.fatherIncome ?? s.motherIncome,
        guardianPhone: s.guardianPhone || initMatch?.guardianPhone || s.fatherPhone || s.motherPhone || '',
        guardianAddress: s.guardianAddress || initMatch?.guardianAddress || s.address || '',
        guardianRelationOther: s.guardianRelationOther || initMatch?.guardianRelationOther || '',
        birthOrder: s.birthOrder ?? initMatch?.birthOrder ?? 1,
        totalSiblings: s.totalSiblings ?? initMatch?.totalSiblings ?? 1,
        brothersCount: s.brothersCount ?? initMatch?.brothersCount ?? 0,
        sistersCount: s.sistersCount ?? initMatch?.sistersCount ?? 0,
        hasOlderHalfSiblings: s.hasOlderHalfSiblings ?? initMatch?.hasOlderHalfSiblings ?? false,
        olderHalfSiblingsCount: s.olderHalfSiblingsCount ?? initMatch?.olderHalfSiblingsCount ?? 0,
        hasYoungerHalfSiblings: s.hasYoungerHalfSiblings ?? initMatch?.hasYoungerHalfSiblings ?? false,
        youngerHalfSiblingsCount: s.youngerHalfSiblingsCount ?? initMatch?.youngerHalfSiblingsCount ?? 0,
        hasHalfSiblings: s.hasHalfSiblings ?? initMatch?.hasHalfSiblings ?? false,
        halfSiblingsCount: s.halfSiblingsCount ?? initMatch?.halfSiblingsCount ?? 0,
        studyingSiblingsCount: s.studyingSiblingsCount ?? initMatch?.studyingSiblingsCount ?? 1,
        housingStatus: s.housingStatus || initMatch?.housingStatus || 'บ้านตัวเอง',
        rentAmount: s.rentAmount ?? initMatch?.rentAmount,
        housingStatusOther: s.housingStatusOther || initMatch?.housingStatusOther || '',
        houseType: s.houseType || initMatch?.houseType || 'บ้านชั้นเดียว',
        houseTypeOther: s.houseTypeOther || initMatch?.houseTypeOther || '',
        householdBurden: s.householdBurden || initMatch?.householdBurden || ['ครัวเรือนไม่มีภาระพึ่งพิง'],
        livingWith: s.livingWith || initMatch?.livingWith || 'บิดามารดา',
        livingWithOther: s.livingWithOther || initMatch?.livingWithOther || '',
        travelMethod: s.travelMethod || initMatch?.travelMethod || 'เดินเท้า',
        travelMethodOther: s.travelMethodOther || initMatch?.travelMethodOther || '',
      };
    });
  },

  saveStudent(student: Student): Student[] {
    const list = this.getStudents();
    const idx = list.findIndex(s => s.id === student.id);
    let updated: Student[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = student;
    } else {
      updated = [student, ...list];
    }
    setLocal(KEYS.STUDENTS, updated);
    this.syncPostToGoogle('saveStudent', { student }).then(res => {
      if (res && res.student && res.student.photoUrl && res.student.photoUrl.startsWith('http')) {
        const curList = this.getStudents();
        const sIdx = curList.findIndex(s => s.id === student.id);
        if (sIdx >= 0 && curList[sIdx].photoUrl !== res.student.photoUrl) {
          const next = [...curList];
          next[sIdx] = { ...next[sIdx], photoUrl: res.student.photoUrl };
          setLocal(KEYS.STUDENTS, next, true);
        }
      }
    }).catch(() => {});
    return updated;
  },

  saveBulkStudents(studentsToUpdate: Student[]): Student[] {
    const list = this.getStudents();
    const updateMap = new Map<string, Student>();
    for (const s of studentsToUpdate) {
      updateMap.set(s.id, s);
    }
    const updated = list.map(s => updateMap.get(s.id) || s);
    for (const s of studentsToUpdate) {
      if (!list.some(existing => existing.id === s.id)) {
        updated.push(s);
      }
    }
    setLocal(KEYS.STUDENTS, updated);
    this.syncPostToGoogle('saveBulkStudents', { students: studentsToUpdate }).catch(() => {});
    return updated;
  },

  deleteStudent(id: string): Student[] {
    const list = this.getStudents();
    const target = list.find(s => s.id === id);
    const updated = list.filter(s => s.id !== id);
    setLocal(KEYS.STUDENTS, updated);
    this.syncPostToGoogle('deleteStudent', { id, photoUrl: target?.photoUrl });
    return updated;
  },

  // Personnel
  getPersonnel(): Personnel[] {
    return getLocal<Personnel[]>(KEYS.PERSONNEL, INITIAL_PERSONNEL);
  },

  savePersonnel(person: Personnel): Personnel[] {
    const list = this.getPersonnel();
    const idx = list.findIndex(p => p.id === person.id);
    let updated: Personnel[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = person;
    } else {
      updated = [person, ...list];
    }
    setLocal(KEYS.PERSONNEL, updated);
    this.syncPostToGoogle('savePersonnel', { personnel: person }).then(res => {
      if (res && res.personnel && res.personnel.photoUrl && res.personnel.photoUrl.startsWith('http')) {
        const curList = this.getPersonnel();
        const pIdx = curList.findIndex(p => p.id === person.id);
        if (pIdx >= 0 && curList[pIdx].photoUrl !== res.personnel.photoUrl) {
          const next = [...curList];
          next[pIdx] = { ...next[pIdx], photoUrl: res.personnel.photoUrl };
          setLocal(KEYS.PERSONNEL, next, true);
        }
      }
    }).catch(() => {});
    return updated;
  },

  deletePersonnel(id: string): Personnel[] {
    const list = this.getPersonnel();
    const target = list.find(p => p.id === id);
    const updated = list.filter(p => p.id !== id);
    setLocal(KEYS.PERSONNEL, updated);
    this.syncPostToGoogle('deletePersonnel', { id, photoUrl: target?.photoUrl });
    return updated;
  },

  // Daily Tracking
  getDailyTracking(): DailyTracking[] {
    return getLocal<DailyTracking[]>(KEYS.DAILY_TRACKING, INITIAL_DAILY_TRACKING);
  },

  saveDailyTracking(record: DailyTracking): DailyTracking[] {
    const list = this.getDailyTracking();
    const idx = list.findIndex(d => d.id === record.id || (d.date === record.date && d.studentId === record.studentId));
    let updated: DailyTracking[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = record;
    } else {
      updated = [record, ...list];
    }
    setLocal(KEYS.DAILY_TRACKING, updated);
    this.syncPostToGoogle('saveDailyTracking', { record });
    return updated;
  },

  // Subjects
  getSubjects(): Subject[] {
    const list = getLocal<Subject[]>(KEYS.SUBJECTS, EXPANDED_INITIAL_SUBJECTS);
    if (!Array.isArray(list)) return [];

    let changed = false;
    const dedupMap = new Map<string, Subject>();

    for (const rawSub of list) {
      if (!rawSub || !rawSub.id) {
        changed = true;
        continue;
      }
      const s: Subject = rawSub.academicYear ? rawSub : { ...rawSub, academicYear: '2568' };
      if (!rawSub.academicYear) {
        changed = true;
      }
      if (isSubjectDeletedClient(s)) {
        changed = true;
        continue;
      }
      const sId = String(s.id);
      if (!dedupMap.has(sId)) {
        dedupMap.set(sId, s);
      } else {
        changed = true;
      }
    }

    let result = Array.from(dedupMap.values());

    // One-time per-tenant migration to populate the 9 standard Primary subjects (ป.1 - ป.6)
    // and upgrade legacy initial subjects while allowing subsequent user edits/deletions
    const migrationKey = resolveTenantKey('ams_primary_subjects_default_v2');
    let isMigrated = Boolean(memoryCache.get(migrationKey));
    if (!isMigrated) {
      try {
        isMigrated = (nativeGetItem ? nativeGetItem(migrationKey) : localStorage.getItem(migrationKey)) === 'true';
      } catch {
        isMigrated = false;
      }
    }

    if (!isMigrated) {
      // Mark migrated immediately in memory & storage to prevent any re-entrant recursion
      memoryCache.set(migrationKey, true);
      try {
        if (nativeSetItem) {
          nativeSetItem(migrationKey, 'true');
        } else {
          localStorage.setItem(migrationKey, 'true');
        }
      } catch {
        // ignore
      }

      const legacyNames = new Set([
        'ภาษาไทยพื้นฐาน 1',
        'คณิตศาสตร์ 1',
        'วิทยาศาสตร์และเทคโนโลยี 1',
        'ภาษาอังกฤษพื้นฐาน 1',
        'วิทยาศาสตร์และเทคโนโลยี 2'
      ]);

      // 1. Upgrade any legacy default primary subjects to the new 50-point standard
      result = result.map(s => {
        const gMatch = String(s.gradeLevel || '').trim().match(/^ป\.([1-6])$/);
        if (!gMatch) return s;
        const gradeNum = Number(gMatch[1]);
        const isLower = gradeNum <= 3;
        const codeTrim = String(s.code || '').trim();
        const tpl = PRIMARY_DEFAULT_SUBJECT_TEMPLATES.find(
          t => `${t.prefix}1${gradeNum}101` === codeTrim || t.name === String(s.name || '').trim()
        );
        if (tpl && (legacyNames.has(String(s.name || '').trim()) || (s.id.startsWith('sub-00') && s.totalScore === 100))) {
          changed = true;
          return {
            ...s,
            code: `${tpl.prefix}1${gradeNum}101`,
            name: tpl.name,
            hoursPerWeek: isLower ? tpl.lowerHours : tpl.upperHours,
            totalScore: tpl.totalScore,
            courseworkScore: tpl.courseworkScore,
            examScore: tpl.examScore
          };
        }
        return s;
      });

      // 2. Ensure all 9 primary subjects exist across ป.1-ป.6 for Semesters 1 & 2 in active academic years
      const yearsSet = new Set<string>(['2568', '2569']);
      result.forEach(s => {
        if (s.academicYear) yearsSet.add(String(s.academicYear).trim());
      });
      try {
        const rawSavedYears = getLocal<string[]>(KEYS.ACADEMIC_YEARS, ['2568', '2569']);
        if (Array.isArray(rawSavedYears)) {
          rawSavedYears.forEach(y => {
            if (y) yearsSet.add(String(y).trim());
          });
        }
        const schoolInfo = this.getSchoolInfo();
        if (schoolInfo?.academicYear) {
          yearsSet.add(String(schoolInfo.academicYear).trim());
        }
      } catch {
        // ignore
      }

      const defaultPrimaryList = buildDefaultPrimarySubjectsForYears(Array.from(yearsSet));
      const existingComboKeys = new Set(
        result.map(
          s =>
            `${String(s.academicYear || '2568').trim()}_${String(s.semester || '1').trim()}_${String(s.gradeLevel || '').trim()}_${String(s.code || '').trim().toUpperCase()}`
        )
      );

      for (const defSub of defaultPrimaryList) {
        if (isSubjectDeletedClient(defSub)) continue;
        const comboKey = `${defSub.academicYear}_${defSub.semester}_${defSub.gradeLevel}_${defSub.code.toUpperCase()}`;
        if (!existingComboKeys.has(comboKey) && !dedupMap.has(defSub.id)) {
          existingComboKeys.add(comboKey);
          dedupMap.set(defSub.id, defSub);
          result.push(defSub);
          changed = true;
        }
      }

      if (changed) {
        setLocal(KEYS.SUBJECTS, result);
        return result;
      }
    }

    if (changed) {
      memoryCache.set(resolveTenantKey(KEYS.SUBJECTS), result);
    }
    return result;
  },

  saveSubject(subject: Subject): Subject[] {
    if (subject.id && deletedSubjectIdsSet.has(String(subject.id))) {
      deletedSubjectIdsSet.delete(String(subject.id));
      if (typeof window !== 'undefined') {
        const tombArr = Array.from(deletedSubjectIdsSet).slice(-2000);
        try {
          localStorage.setItem('ams_deleted_subject_ids', JSON.stringify(tombArr));
        } catch {
          // ignore
        }
        pushToRemoteServer('ams_deleted_subject_ids', tombArr, Date.now());
      }
    }

    const list = this.getSubjects();
    const idx = list.findIndex(s => s.id === subject.id);
    let updated: Subject[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = subject;
    } else {
      updated = [subject, ...list];
    }
    setLocal(KEYS.SUBJECTS, updated);
    this.syncPostToGoogle('saveSubject', { subject });
    return updated;
  },

  deleteSubject(id: string): Subject[] {
    const rawList = getLocal<Subject[]>(KEYS.SUBJECTS, EXPANDED_INITIAL_SUBJECTS);
    const safeList = Array.isArray(rawList) ? rawList : [];
    const target = safeList.find(s => s && s.id === id);

    const removedSubjectIds = new Set<string>([String(id)]);
    deletedSubjectIdsSet.add(String(id));

    if (target) {
      const targetYr = String(target.academicYear || '2568').trim();
      const targetSem = String(target.semester || '1').trim();
      const targetCode = String(target.code || '').trim();
      const targetGrade = String(target.gradeLevel || '').trim();
      const targetName = String(target.name || '').trim();

      // Also catch any duplicate or auto-generated clones of this exact subject in the same semester & year
      for (const s of safeList) {
        if (!s || !s.id) continue;
        const sYr = String(s.academicYear || '2568').trim();
        const sSem = String(s.semester || '1').trim();
        const sCode = String(s.code || '').trim();
        const sGrade = String(s.gradeLevel || '').trim();
        const sName = String(s.name || '').trim();
        const isSameSubject =
          sYr === targetYr &&
          sSem === targetSem &&
          sGrade === targetGrade &&
          sName === targetName &&
          sCode === targetCode;
        if (isSameSubject) {
          removedSubjectIds.add(String(s.id));
          deletedSubjectIdsSet.add(String(s.id));
        }
      }
    }

    const tombArr = Array.from(deletedSubjectIdsSet).slice(-2000);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ams_deleted_subject_ids', JSON.stringify(tombArr));
      } catch {
        // ignore
      }
    }
    pushToRemoteServer('ams_deleted_subject_ids', tombArr, Date.now());

    const updated = safeList
      .map(s => (s && !s.academicYear ? { ...s, academicYear: '2568' } : s))
      .filter(s => s && s.id && !removedSubjectIds.has(String(s.id)) && !isSubjectDeletedClient(s));

    setLocal(KEYS.SUBJECTS, updated);
    this.syncPostToGoogle('deleteSubject', { id });

    // Cascade delete any student grades/scores recorded under the deleted subject
    const currentGrades = this.getGrades();
    const updatedGrades = currentGrades.filter(g => {
      if (!g) return false;
      if (removedSubjectIds.has(String(g.subjectId))) return false;
      return true;
    });
    if (updatedGrades.length !== currentGrades.length) {
      setLocal(KEYS.GRADES, updatedGrades);
    }

    return updated;
  },

  saveBulkSubjects(newSubs: Subject[]): Subject[] {
    let tombstonesChanged = false;
    for (const sub of newSubs) {
      if (sub.id && deletedSubjectIdsSet.has(String(sub.id))) {
        deletedSubjectIdsSet.delete(String(sub.id));
        tombstonesChanged = true;
      }
    }
    if (tombstonesChanged && typeof window !== 'undefined') {
      const tombArr = Array.from(deletedSubjectIdsSet).slice(-2000);
      try {
        localStorage.setItem('ams_deleted_subject_ids', JSON.stringify(tombArr));
      } catch {
        // ignore
      }
      pushToRemoteServer('ams_deleted_subject_ids', tombArr, Date.now());
    }

    const list = this.getSubjects();
    const map = new Map<string, Subject>();
    newSubs.forEach(s => map.set(s.id, s));
    list.forEach(s => {
      if (!map.has(s.id)) {
        map.set(s.id, s);
      }
    });
    const updated = Array.from(map.values());
    setLocal(KEYS.SUBJECTS, updated);
    return updated;
  },

  // Locked Semesters (Admin can lock semester to prevent members from entering scores in wrong semester)
  getLockedSemesters(): Record<string, boolean> {
    return getLocal<Record<string, boolean>>(KEYS.LOCKED_SEMESTERS, {});
  },

  saveLockedSemesters(locked: Record<string, boolean>): Record<string, boolean> {
    setLocal(KEYS.LOCKED_SEMESTERS, locked);
    return locked;
  },

  isSemesterLocked(academicYear: string, semester: '1' | '2'): boolean {
    const map = this.getLockedSemesters();
    return Boolean(map[`${academicYear}_${semester}`]);
  },

  toggleSemesterLocked(academicYear: string, semester: '1' | '2'): { locked: boolean; allLocked: Record<string, boolean> } {
    const map = { ...this.getLockedSemesters() };
    const key = `${academicYear}_${semester}`;
    const newStatus = !map[key];
    if (newStatus) {
      map[key] = true;
    } else {
      delete map[key];
    }
    this.saveLockedSemesters(map);
    return { locked: newStatus, allLocked: map };
  },

  // Grades
  getGrades(): GradeRecord[] {
    const raw = getLocal<GradeRecord[]>(KEYS.GRADES, INITIAL_GRADES);
    if (!Array.isArray(raw)) return [];
    const legacyDemoIds = new Set(['grd-001', 'grd-002', 'grd-003']);
    const cleaned = raw.filter(g => g && !legacyDemoIds.has(g.id));
    if (cleaned.length !== raw.length) {
      setLocal(KEYS.GRADES, cleaned, false);
    }
    return cleaned;
  },

  saveGrade(grade: GradeRecord): GradeRecord[] {
    const list = this.getGrades();
    const idx = list.findIndex(
      g =>
        g.id === grade.id ||
        (g.studentId === grade.studentId &&
          g.subjectId === grade.subjectId &&
          String(g.semester) === String(grade.semester) &&
          String(g.academicYear || '') === String(grade.academicYear || ''))
    );
    let updated: GradeRecord[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = grade;
    } else {
      updated = [grade, ...list];
    }
    setLocal(KEYS.GRADES, updated);
    this.syncPostToGoogle('saveGrades', { grades: [grade] });
    return updated;
  },

  saveBulkGrades(grades: GradeRecord[]): GradeRecord[] {
    const current = this.getGrades();
    const map = new Map<string, GradeRecord>();
    current.forEach(g => map.set(`${g.studentId}_${g.subjectId}_${g.semester}_${g.academicYear || ''}`, g));
    grades.forEach(g => map.set(`${g.studentId}_${g.subjectId}_${g.semester}_${g.academicYear || ''}`, g));
    const updated = Array.from(map.values());
    setLocal(KEYS.GRADES, updated);
    this.syncPostToGoogle('saveGrades', { grades });
    return updated;
  },

  // Attendance
  getAttendanceConfig(): AttendanceDayConfig {
    const cfg = getLocal<AttendanceDayConfig>(KEYS.ATTENDANCE_CONFIG, INITIAL_ATTENDANCE_CONFIG);
    if (!cfg.startDate || cfg.startDate === '2026-05-16' || cfg.endDate === '2026-10-10' || cfg.endDate === '2026-10-31') {
      const updated: AttendanceDayConfig = {
        ...cfg,
        startDate: '2026-05-18',
        endDate: '2026-10-07'
      };
      memoryCache.set(resolveTenantKey(KEYS.ATTENDANCE_CONFIG), updated);
      return updated;
    }
    return cfg;
  },

  setAttendanceConfig(config: AttendanceDayConfig): void {
    setLocal(KEYS.ATTENDANCE_CONFIG, config);
    if (config && config.semester && config.academicYear) {
      const termKey = `${config.semester}_${config.academicYear}`;
      const all = { ...this.getAttendanceConfigsByTerm() };
      all[termKey] = config;
      localStorage.removeItem(`ams_cleared_${termKey}`);
      setLocal(KEYS.ATTENDANCE_CONFIGS_BY_TERM, all);
    }
  },

  getAttendanceConfigsByTerm(): Record<string, AttendanceDayConfig> {
    const current = { ...getLocal<Record<string, AttendanceDayConfig>>(KEYS.ATTENDANCE_CONFIGS_BY_TERM, {}) };
    const isCleared = localStorage.getItem('ams_cleared_1_2569');
    if (!current['1_2569'] && !isCleared) {
      const base = this.getAttendanceConfig();
      current['1_2569'] = base;
    }
    return current;
  },

  setAttendanceConfigForTerm(config: AttendanceDayConfig): Record<string, AttendanceDayConfig> {
    const termKey = `${config.semester}_${config.academicYear}`;
    const all = { ...this.getAttendanceConfigsByTerm() };
    all[termKey] = config;
    localStorage.removeItem(`ams_cleared_${termKey}`);
    setLocal(KEYS.ATTENDANCE_CONFIGS_BY_TERM, all);
    setLocal(KEYS.ATTENDANCE_CONFIG, config);
    return all;
  },

  deleteAttendanceConfigForTerm(termKey: string): Record<string, AttendanceDayConfig> {
    const all = { ...this.getAttendanceConfigsByTerm() };
    if (all[termKey]) {
      all[termKey] = {
        ...all[termKey],
        startDate: '',
        endDate: '',
        targetDays: 0,
        schoolDays: []
      };
    } else {
      const parts = termKey.split('_');
      all[termKey] = {
        semester: (parts[0] || '1') as any,
        academicYear: parts[1] || '2569',
        startDate: '',
        endDate: '',
        targetDays: 0,
        schoolDays: []
      };
    }
    localStorage.setItem(`ams_cleared_${termKey}`, 'true');
    setLocal(KEYS.ATTENDANCE_CONFIGS_BY_TERM, all);
    return all;
  },

  deleteAllAttendanceConfigs(): Record<string, AttendanceDayConfig> {
    const all = { ...this.getAttendanceConfigsByTerm() };
    Object.keys(all).forEach(k => {
      all[k] = {
        ...all[k],
        startDate: '',
        endDate: '',
        targetDays: 0,
        schoolDays: []
      };
      localStorage.setItem(`ams_cleared_${k}`, 'true');
    });
    setLocal(KEYS.ATTENDANCE_CONFIGS_BY_TERM, all);
    return all;
  },

  getAttendance(): AttendanceRecord[] {
    return getLocal<AttendanceRecord[]>(KEYS.ATTENDANCE, []);
  },

  saveBulkAttendance(records: AttendanceRecord[]): AttendanceRecord[] {
    const current = this.getAttendance();
    const map = new Map<string, AttendanceRecord>();
    current.forEach(r => map.set(`${r.date}_${r.studentId}`, r));
    records.forEach(r => map.set(`${r.date}_${r.studentId}`, r));
    const updated = Array.from(map.values());
    setLocal(KEYS.ATTENDANCE, updated);
    this.syncPostToGoogle('saveAttendance', { records });
    return updated;
  },

  // Savings
  getSavings(): SavingsRecord[] {
    return getLocal<SavingsRecord[]>(KEYS.SAVINGS, []);
  },

  calculateStudentBalance(studentId: string, semester?: '1' | '2', academicYear?: string): number {
    const list = this.getSavings().filter(s => {
      if (s.studentId !== studentId) return false;
      if (semester && s.semester && s.semester !== semester) return false;
      if (academicYear && s.academicYear && s.academicYear !== academicYear) return false;
      return true;
    });
    const deposits = list.filter(s => s.type === 'deposit').reduce((sum, r) => sum + r.amount, 0);
    const withdrawals = list.filter(s => s.type === 'withdrawal' && !s.deductedFromDeposits).reduce((sum, r) => sum + r.amount, 0);
    return Math.max(0, deposits - withdrawals);
  },

  saveSavingsRecord(record: Omit<SavingsRecord, 'balanceAfter'>): { record: SavingsRecord; updated: SavingsRecord[] } {
    const list = this.getSavings();
    const recordId = (record as any).id || ('sav-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6));

    const existingIdx = list.findIndex(s => s.id === recordId);
    let interimList: SavingsRecord[];
    if (existingIdx >= 0) {
      interimList = [...list];
      interimList[existingIdx] = { ...record, id: recordId, balanceAfter: 0 };
    } else {
      interimList = [{ ...record, id: recordId, balanceAfter: 0 }, ...list];
    }

    // Recalculate true balance for this student in this term
    let runningBal = 0;
    const studentRecords = interimList
      .filter(s => s.studentId === record.studentId &&
        (!record.semester || !s.semester || s.semester === record.semester) &&
        (!record.academicYear || !s.academicYear || s.academicYear === record.academicYear)
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    studentRecords.forEach(r => {
      if (r.type === 'deposit') runningBal += r.amount;
      else if (!r.deductedFromDeposits) runningBal -= r.amount;
    });
    const finalBal = Math.max(0, runningBal);

    const fullRecord: SavingsRecord = {
      ...record,
      id: recordId,
      balanceAfter: finalBal
    };

    const updated = interimList.map(s => s.id === recordId ? fullRecord : s);
    setLocal(KEYS.SAVINGS, updated);
    this.syncPostToGoogle('saveSavings', { record: fullRecord });
    return { record: fullRecord, updated };
  },

  deleteSavingsRecord(id: string): SavingsRecord[] {
    const list = this.getSavings();
    const updated = list.filter(s => s.id !== id);
    setLocal(KEYS.SAVINGS, updated);
    this.syncPostToGoogle('deleteSavings', { id });
    return updated;
  },

  setAllSavings(records: SavingsRecord[]): SavingsRecord[] {
    setLocal(KEYS.SAVINGS, records);
    this.syncPostToGoogle('setAllSavings', { records });
    return records;
  },

  // Tasks
  getTasks(): TaskItem[] {
    const list = getLocal<TaskItem[]>(KEYS.TASKS, INITIAL_TASKS);
    if (!Array.isArray(list)) return [];

    // Also merge any submissions from other ams_tasks* keys in memoryCache for matching task IDs
    const mergedById = new Map<string, TaskItem>();
    for (const t of list) {
      if (t && t.id && !deletedTaskIdsSet.has(t.id)) {
        mergedById.set(t.id, t);
      }
    }
    const activeTaskKey = resolveTenantKey(KEYS.TASKS);
    for (const [k, cachedVal] of memoryCache.entries()) {
      if (k === activeTaskKey || !isTaskStorageKey(k) || !Array.isArray(cachedVal)) continue;
      for (const otherTask of cachedVal) {
        if (!otherTask || !otherTask.id || deletedTaskIdsSet.has(otherTask.id)) continue;
        const existing = mergedById.get(otherTask.id);
        if (existing) {
          mergedById.set(otherTask.id, mergeSingleTaskSubmissionsClient(existing, otherTask, false));
        }
      }
    }

    const filteredTasks = Array.from(mergedById.values());
    if (deletedSubmissionKeysSet.size === 0) return filteredTasks;

    return filteredTasks.map(t => {
      if (!t || !Array.isArray(t.submissions)) return t;
      const delMap = t.deletedSubmissionsMap || {};
      let changed = false;
      const cleanSubs = t.submissions.filter(s => {
        if (!s) return false;
        const delAt =
          ((s as any).id ? delMap[(s as any).id] : '') ||
          (s.fileName && s.memberId ? delMap[`${s.memberId}_${s.fileName}`] : '') ||
          (s.fileName ? delMap[s.fileName] : '') ||
          (s.memberId ? (delMap[s.memberId] || delMap[s.memberId.toLowerCase()]) : '') ||
          (s.memberName ? (delMap[s.memberName] || delMap[s.memberName.toLowerCase()]) : '');
        if (delAt) {
          const delTime = new Date(delAt).getTime();
          const subTime = s.submittedAt ? new Date(s.submittedAt).getTime() : 0;
          if (!subTime || delTime >= subTime) {
            changed = true;
            return false;
          }
          return true;
        }
        if ((s as any).id && isSubmissionKeyDeleted(t.id, (s as any).id)) {
          changed = true;
          return false;
        }
        if (isSubmissionKeyDeleted(t.id, s.memberId, s.memberName, s.fileName) && !s.submittedAt) {
          changed = true;
          return false;
        }
        return true;
      });
      let cleanSubmittedFileUrl = t.submittedFileUrl;
      let cleanSubmittedBy = t.submittedBy;
      let cleanSubmittedByName = t.submittedByName;
      let cleanSubmittedFileName = t.submittedFileName;
      if (
        cleanSubs.length === 0 &&
        ((cleanSubmittedBy && isSubmissionKeyDeleted(t.id, cleanSubmittedBy, cleanSubmittedByName, cleanSubmittedFileName)) ||
          (cleanSubmittedFileName && isSubmissionKeyDeleted(t.id, cleanSubmittedFileName)))
      ) {
        cleanSubmittedFileUrl = undefined;
        cleanSubmittedBy = undefined;
        cleanSubmittedByName = undefined;
        cleanSubmittedFileName = undefined;
        changed = true;
      }
      if (!changed) return t;
      return {
        ...t,
        submissions: cleanSubs,
        submittedFileUrl: cleanSubmittedFileUrl,
        submittedBy: cleanSubmittedBy,
        submittedByName: cleanSubmittedByName,
        submittedFileName: cleanSubmittedFileName
      };
    });
  },

  saveTask(task: TaskItem): TaskItem[] {
    if (deletedTaskIdsSet.has(task.id)) {
      deletedTaskIdsSet.delete(task.id);
      try {
        localStorage.setItem('ams_deleted_task_ids', JSON.stringify(Array.from(deletedTaskIdsSet).slice(-2000)));
      } catch {
        // ignore
      }
    }

    // Clear any stale submission tombstones for active submissions in the task being saved
    let tombstonesChanged = false;
    if (Array.isArray(task.submissions)) {
      const delMap = task.deletedSubmissionsMap || {};
      for (const s of task.submissions) {
        if (!s) continue;
        const delAt =
          (s.fileName && s.memberId ? delMap[`${s.memberId}_${s.fileName}`] : '') ||
          (s.fileName ? delMap[s.fileName] : '') ||
          (s.memberId ? (delMap[s.memberId] || delMap[s.memberId.toLowerCase()]) : '');
        const delTime = delAt ? new Date(delAt).getTime() : 0;
        const subTime = s.submittedAt ? new Date(s.submittedAt).getTime() : Date.now();
        if (!delAt || subTime > delTime) {
          if (clearSubmissionTombstonesForSubClient(task.id, s)) {
            tombstonesChanged = true;
          }
        }
      }
    }
    if (tombstonesChanged) {
      const nextTombstones = Array.from(deletedSubmissionKeysSet).slice(-4000);
      try {
        localStorage.setItem('ams_deleted_submission_keys', JSON.stringify(nextTombstones));
      } catch {
        // ignore
      }
    }

    const list = this.getTasks();
    const idx = list.findIndex(t => t.id === task.id);
    let mergedTask = task;
    let updated: TaskItem[];
    if (idx >= 0) {
      mergedTask = mergeSingleTaskSubmissionsClient(list[idx], task, true);
      updated = [...list];
      updated[idx] = mergedTask;
    } else {
      updated = [mergedTask, ...list];
    }
    setLocal(KEYS.TASKS, updated);

    // Also keep any other ams_tasks* key in memoryCache synchronized if it holds this task.id
    const activeTaskKey = resolveTenantKey(KEYS.TASKS);
    for (const [k, cachedVal] of memoryCache.entries()) {
      if (k === activeTaskKey || !isTaskStorageKey(k) || !Array.isArray(cachedVal)) continue;
      const otherIdx = cachedVal.findIndex((ot: any) => ot && ot.id === mergedTask.id);
      if (otherIdx >= 0) {
        const nextOther = [...cachedVal];
        nextOther[otherIdx] = mergeSingleTaskSubmissionsClient(nextOther[otherIdx], mergedTask, true);
        memoryCache.set(k, nextOther);
        pushToRemoteServer(k, nextOther, Date.now());
      }
    }

    // Background upload any base64 member submission files to Google Drive so Drive links sync across all devices & Firestore
    let hasDataUrlSub = false;
    if (Array.isArray(mergedTask.submissions)) {
      mergedTask.submissions.forEach(sub => {
        if (sub && sub.fileUrl && sub.fileUrl.startsWith('data:')) {
          hasDataUrlSub = true;
          this.uploadFileToGoogleDrive(
            sub.fileUrl,
            sub.fileName || `submission_${sub.memberId}`,
            `TaskSubmissions_${mergedTask.academicYear || '2569'}`
          )
            .then(driveUrl => {
              if (driveUrl && driveUrl.startsWith('http')) {
                const latestTasks = this.getTasks();
                const tIndex = latestTasks.findIndex(t => t.id === mergedTask.id);
                if (tIndex >= 0) {
                  const target = latestTasks[tIndex];
                  const nextSubs = (target.submissions || []).map(s =>
                    (sub.id && s.id === sub.id) ||
                    ((s.memberId === sub.memberId || s.memberName === sub.memberName) &&
                      (!sub.fileName || s.fileName === sub.fileName))
                      ? { ...s, fileUrl: driveUrl }
                      : s
                  );
                  const nextTask: TaskItem = {
                    ...target,
                    submissions: nextSubs,
                    submittedFileUrl:
                      target.submittedBy === sub.memberId ? driveUrl : target.submittedFileUrl
                  };
                  const nextList = [...latestTasks];
                  nextList[tIndex] = nextTask;
                  setLocal(KEYS.TASKS, nextList, false);
                  this.syncPostToGoogle('saveTask', { task: nextTask }).catch(() => {});
                }
              }
            })
            .catch(() => {});
        }
      });
    }

    if (!hasDataUrlSub) {
      this.syncPostToGoogle('saveTask', { task: mergedTask })
        .then(res => {
          if (res && res.task && typeof res.task === 'object') {
            const curTasks = this.getTasks();
            const tIdx = curTasks.findIndex(t => t.id === mergedTask.id);
            if (tIdx >= 0) {
              const nextTasks = [...curTasks];
              nextTasks[tIdx] = mergeSingleTaskSubmissionsClient(nextTasks[tIdx], res.task, false);
              setLocal(KEYS.TASKS, nextTasks, true);
            }
          }
        })
        .catch(() => {});
    }
    return updated;
  },

  async recoverMissingTaskFileUrls(forceSheetSync = false): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const currentTasks = this.getTasks();
    const needsRecovery = currentTasks.some(
      t =>
        t &&
        Array.isArray(t.submissions) &&
        t.submissions.some(
          s =>
            s &&
            s.fileName &&
            (!s.fileUrl || s.fileUrl.startsWith('/api/files/') || !extractDriveFileIdClient(s.fileUrl))
        )
    );
    if (!needsRecovery && !forceSheetSync) return false;

    const getExtLower = (name: string) => {
      const idx = name.lastIndexOf('.');
      return idx >= 0 ? name.slice(idx).toLowerCase() : '';
    };
    const isStrictNameMatch = (rowFileName: string, targetName: string) => {
      const r = String(rowFileName || '').trim().toLowerCase();
      const t = String(targetName || '').trim().toLowerCase();
      if (!r || !t) return false;
      const rExt = getExtLower(r);
      const tExt = getExtLower(t);
      if (tExt && rExt && tExt !== rExt) return false;
      return r === t || r.endsWith('_' + t);
    };

    try {
      const config = this.getGoogleConfig();
      const gasUrl = config.webAppUrl || DEFAULT_GAS_WEBAPP_URL;
      const session = this.getSession();
      const admins = this.getAdmins();
      const activeSchoolId = session?.schoolId
        ? normalizeSchoolId(session.schoolId, session.schoolName, admins)
        : 'admin-school-01';
      const matchedAdmin = admins.find(a => a.id === activeSchoolId);
      const spreadsheetId = matchedAdmin?.googleSheetId || this.getCurrentSchoolSpreadsheetId() || '';

      const fetchSheetRows = async (sheetName: string): Promise<any[]> => {
        try {
          const q = new URLSearchParams({
            action: 'getSheet',
            sheet: sheetName,
            ...(spreadsheetId ? { spreadsheetId } : {}),
            ...(activeSchoolId ? { schoolId: activeSchoolId } : {}),
            _t: String(Date.now())
          });
          const res = await fetch(`${gasUrl}?${q.toString()}`);
          if (!res.ok) return [];
          const json = await res.json();
          return json && json.status === 'success' && Array.isArray(json.data) ? json.data : [];
        } catch {
          return [];
        }
      };

      const [subRows, driveRows, tasksRows] = await Promise.all([
        fetchSheetRows('TaskSubmissions'),
        fetchSheetRows('DriveFiles'),
        fetchSheetRows('Tasks')
      ]);
      if (subRows.length === 0 && driveRows.length === 0 && tasksRows.length === 0) return false;

      let updatedAny = false;
      let latestTasks = this.getTasks();

      // Reconcile submissions from the School's Tasks sheet first
      if (tasksRows.length > 0) {
        const parsedSheetTasks: TaskItem[] = [];
        for (const r of tasksRows) {
          if (!r || !r.id || deletedTaskIdsSet.has(String(r.id))) continue;
          let subs = r.submissions;
          if (typeof subs === 'string' && subs.trim().startsWith('[')) {
            try {
              subs = JSON.parse(subs);
            } catch {
              subs = [];
            }
          }
          parsedSheetTasks.push({
            ...r,
            id: String(r.id),
            title: String(r.title ?? ''),
            submissions: Array.isArray(subs) ? subs : []
          });
        }
        if (parsedSheetTasks.length > 0) {
          const mergedFromSheet = mergeTaskListsClient(latestTasks, parsedSheetTasks, false);
          if (JSON.stringify(mergedFromSheet) !== JSON.stringify(latestTasks)) {
            latestTasks = mergedFromSheet;
            updatedAny = true;
          }
        }
      }

      // Also merge any rows from TaskSubmissions sheet that aren't in latestTasks yet
      if (subRows.length > 0) {
        const subsByTask = new Map<string, TaskSubmission[]>();
        for (const sr of subRows) {
          if (!sr || !sr.taskId || !sr.fileName) continue;
          const tId = String(sr.taskId).trim();
          if (deletedTaskIdsSet.has(tId)) continue;
          if (isSubmissionKeyDeleted(tId, sr.memberId, sr.memberName, sr.fileName)) continue;
          const fid =
            String(sr.driveFileId || '').trim() ||
            extractDriveFileIdClient(String(sr.fileUrl || sr.downloadUrl || ''));
          const viewUrl = fid
            ? `https://drive.google.com/file/d/${fid}/view?usp=sharing`
            : String(sr.fileUrl || '');
          const sObj: TaskSubmission = {
            id: String(sr.id || `sub_${tId}_${sr.memberId || 'mem'}_${sr.fileName}`),
            memberId: String(sr.memberId || ''),
            memberName: String(sr.memberName || ''),
            fileName: String(sr.fileName || ''),
            fileSize: String(sr.fileSize || '0.2 MB'),
            fileUrl: viewUrl,
            driveFileId: fid || undefined,
            submittedAt: String(sr.submittedAt || new Date().toISOString())
          };
          if (!subsByTask.has(tId)) subsByTask.set(tId, []);
          subsByTask.get(tId)!.push(sObj);
        }
        if (subsByTask.size > 0) {
          latestTasks = latestTasks.map(t => {
            if (!t || !t.id || !subsByTask.has(t.id)) return t;
            const merged = mergeSingleTaskSubmissionsClient(
              t,
              { ...t, submissions: subsByTask.get(t.id) },
              false
            );
            if (JSON.stringify(merged) !== JSON.stringify(t)) {
              updatedAny = true;
            }
            return merged;
          });
        }
      }

      const nextTasks = latestTasks.map(t => {
        if (!t || !Array.isArray(t.submissions)) return t;
        let taskUpdated = false;
        let nextMainUrl = t.submittedFileUrl;
        const nextSubs = t.submissions
          .filter(s => s && !isSubmissionKeyDeleted(t.id, s.memberId, s.memberName, s.fileName))
          .map(s => {
            if (!s || !s.fileName) return s;
            if (s.driveFileId || extractDriveFileIdClient(s.fileUrl)) return s;

            // 1. Check TaskSubmissions sheet by taskId + memberId + strict filename extension match
            for (let i = subRows.length - 1; i >= 0; i--) {
              const row = subRows[i];
              if (!row) continue;
              const rowTaskId = String(row.taskId || '').trim();
              const rowMemberId = String(row.memberId || '').trim();
              const rowMemberName = String(row.memberName || '').trim();
              const rowFileName = String(row.fileName || '').trim();
              if (isSubmissionKeyDeleted(t.id, rowMemberId, rowMemberName, rowFileName)) continue;

              const matchesTaskMember =
                rowTaskId === t.id &&
                rowMemberId === s.memberId &&
                (!rowFileName || isStrictNameMatch(rowFileName, s.fileName));
              if (matchesTaskMember || isStrictNameMatch(rowFileName, s.fileName)) {
                const fid =
                  String(row.driveFileId || '').trim() ||
                  extractDriveFileIdClient(String(row.fileUrl || row.downloadUrl || ''));
                if (fid) {
                  const viewUrl = `https://drive.google.com/file/d/${fid}/view?usp=sharing`;
                  taskUpdated = true;
                  updatedAny = true;
                  if (!nextMainUrl || t.submittedBy === s.memberId) nextMainUrl = viewUrl;
                  return {
                    ...s,
                    fileUrl: viewUrl,
                    driveFileId: fid
                  };
                }
              }
            }

            // 2. Check DriveFiles sheet with strict filename + extension match
            for (let i = driveRows.length - 1; i >= 0; i--) {
              const row = driveRows[i];
              if (!row) continue;
              const rName = String(row.fileName || '').trim();
              if (isSubmissionKeyDeleted(t.id, rName)) continue;
              if (isStrictNameMatch(rName, s.fileName)) {
                const fid =
                  String(row.driveFileId || '').trim() ||
                  extractDriveFileIdClient(String(row.driveViewUrl || row.downloadUrl || ''));
                if (fid) {
                  const viewUrl = `https://drive.google.com/file/d/${fid}/view?usp=sharing`;
                  taskUpdated = true;
                  updatedAny = true;
                  if (!nextMainUrl || t.submittedBy === s.memberId) nextMainUrl = viewUrl;
                  return {
                    ...s,
                    fileUrl: viewUrl,
                    driveFileId: fid
                  };
                }
              }
            }
            return s;
          });

        if (
          (nextMainUrl && t.submittedBy && isSubmissionKeyDeleted(t.id, t.submittedBy, t.submittedByName, t.submittedFileName)) ||
          (t.submittedFileName && isSubmissionKeyDeleted(t.id, t.submittedFileName))
        ) {
          nextMainUrl = undefined;
          taskUpdated = true;
        }

        if (!taskUpdated && nextSubs.length === t.submissions.length) return t;
        return {
          ...t,
          submissions: nextSubs,
          submittedFileUrl: nextMainUrl || t.submittedFileUrl
        };
      });

      if (updatedAny) {
        setLocal(KEYS.TASKS, nextTasks, false);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  },

  // Mark task completed without deleting it so it stays at the bottom of Module4Assignments in green
  completeTask(id: string): TaskItem[] {
    const list = this.getTasks();
    const updated = list.map(t =>
      t.id === id ? { ...t, isCompleted: true, isManualCompleted: true } : t
    );
    setLocal(KEYS.TASKS, updated);
    this.syncPostToGoogle('completeTask', { id });
    return updated;
  },

  deleteTask(id: string): TaskItem[] {
    const allTasks = this.getTasks();
    const targetTask = allTasks.find(t => t.id === id);
    const updated = allTasks.filter(t => t.id !== id);

    deletedTaskIdsSet.add(id);
    try {
      localStorage.setItem('ams_deleted_task_ids', JSON.stringify(Array.from(deletedTaskIdsSet).slice(-2000)));
    } catch {
      // ignore
    }

    setLocal(KEYS.TASKS, updated);
    pushToRemoteServer('ams_deleted_task_ids', Array.from(deletedTaskIdsSet).slice(-2000), Date.now());

    this.syncPostToGoogle('deleteTask', {
      id,
      attachmentUrl: targetTask?.attachmentUrl,
      submissions: targetTask?.submissions
    });

    // Cascade delete or clean up linked CalendarEvent
    if (targetTask) {
      const allEvents = this.getCalendarEvents();
      let eventsChanged = false;
      const updatedEvents: CalendarEvent[] = [];

      for (const ev of allEvents) {
        const isLinkedById =
          (targetTask.calendarEventId && ev.id === targetTask.calendarEventId) ||
          (ev.linkedTaskIds && ev.linkedTaskIds.includes(id));

        const isLegacyLinked =
          ev.date === targetTask.dueDate &&
          ((ev.taskDue && ev.taskDue === targetTask.title) ||
            (ev.announcement &&
              (ev.announcement === targetTask.description ||
                ev.announcement === targetTask.title)) ||
            ev.title === targetTask.title ||
            ev.title === `กำหนดส่ง: ${targetTask.title}` ||
            (targetTask.description &&
              ev.title === `แจ้ง: ${targetTask.description.slice(0, 30)}`));

        if (isLinkedById || isLegacyLinked) {
          eventsChanged = true;
          const remainingLinkedIds = (ev.linkedTaskIds || []).filter(tid => tid !== id);
          const isAnnouncementTask = targetTask.type === 'announcement';

          if (isAnnouncementTask && ev.taskDue && ev.taskDue !== targetTask.title) {
            updatedEvents.push({
              ...ev,
              announcement: undefined,
              linkedTaskIds: remainingLinkedIds,
              title: ev.title.startsWith('แจ้ง:') ? `กำหนดส่ง: ${ev.taskDue}` : ev.title,
              description: ev.taskDue
            });
          } else if (!isAnnouncementTask && ev.announcement && ev.announcement !== targetTask.description) {
            updatedEvents.push({
              ...ev,
              taskDue: undefined,
              taskPriority: undefined,
              linkedTaskIds: remainingLinkedIds,
              title: ev.title.startsWith('กำหนดส่ง:') ? `แจ้ง: ${ev.announcement.slice(0, 30)}` : ev.title,
              description: ev.announcement
            });
          } else {
            // Remove the calendar event completely
            this.syncPostToGoogle('deleteCalendarEvent', { id: ev.id });
          }
        } else {
          updatedEvents.push(ev);
        }
      }

      if (eventsChanged) {
        setLocal(KEYS.CALENDAR, updatedEvents);
      }
    }

    return updated;
  },

  isSubmissionDeleted(taskId: string, ...identifiers: (string | undefined)[]): boolean {
    return isSubmissionKeyDeleted(taskId, ...identifiers);
  },

  deleteTaskSubmission(taskId: string, memberId: string, memberName?: string, fileName?: string): TaskItem[] {
    const allTasks = this.getTasks();
    const targetTask = allTasks.find(t => t.id === taskId);
    if (!targetTask) return allTasks;

    const normId = String(memberId || '').trim();
    const normName = String(memberName || '').trim();
    const normFile = String(fileName || '').trim();

    // 1. Register permanent tombstone keys
    const tombstoneKeys: string[] = [];
    if (normFile) {
      // Deleting a specific file
      const k1 = makeSubTombstoneKey(taskId, normFile);
      if (k1) {
        deletedSubmissionKeysSet.add(k1);
        tombstoneKeys.push(k1);
      }
      if (normId) {
        const k2 = makeSubTombstoneKey(taskId, `${normId}_${normFile}`);
        if (k2) {
          deletedSubmissionKeysSet.add(k2);
          tombstoneKeys.push(k2);
        }
      }
    } else {
      // Deleting the entire member's submissions
      [normId, normName].forEach(id => {
        if (id) {
          const k = makeSubTombstoneKey(taskId, id);
          if (k) {
            deletedSubmissionKeysSet.add(k);
            tombstoneKeys.push(k);
          }
        }
      });
    }

    try {
      localStorage.setItem('ams_deleted_submission_keys', JSON.stringify(Array.from(deletedSubmissionKeysSet).slice(-3000)));
    } catch {
      // ignore
    }
    pushToRemoteServer('ams_deleted_submission_keys', Array.from(deletedSubmissionKeysSet).slice(-3000), Date.now());

    // 2. Update task's deletedSubmissionsMap
    const nowIso = new Date().toISOString();
    const nextDeletedMap: Record<string, string> = { ...(targetTask.deletedSubmissionsMap || {}) };
    if (normFile) {
      nextDeletedMap[normFile] = nowIso;
      if (normId) {
        nextDeletedMap[`${normId}_${normFile}`] = nowIso;
      }
    } else {
      if (normId) {
        nextDeletedMap[normId] = nowIso;
        nextDeletedMap[normId.toLowerCase()] = nowIso;
      }
      if (normName) {
        nextDeletedMap[normName] = nowIso;
        nextDeletedMap[normName.toLowerCase()] = nowIso;
      }
    }

    // Find the submission being removed to get file info for deletion
    const existingSub = (targetTask.submissions || []).find(s =>
      (normId && (s.memberId === normId || s.memberId?.toLowerCase() === normId.toLowerCase())) ||
      (normName && (s.memberName === normName || s.memberName?.toLowerCase() === normName.toLowerCase())) ||
      (normFile && s.fileName === normFile)
    );

    // 3. Filter out submissions
    const nextSubs = (targetTask.submissions || []).filter(s => {
      if (!s) return false;
      if (normFile) {
        const matchesMember = !normId || s.memberId === normId || s.memberId?.toLowerCase() === normId.toLowerCase() || s.memberName === normName;
        if (s.fileName === normFile && matchesMember) return false;
        return true;
      }
      if (normId && (s.memberId === normId || s.memberId?.toLowerCase() === normId.toLowerCase())) return false;
      if (normName && (s.memberName === normName || s.memberName?.toLowerCase() === normName.toLowerCase())) return false;
      if (isSubmissionKeyDeleted(taskId, s.memberId, s.memberName, s.fileName)) return false;
      return true;
    });

    let nextSubmittedFileUrl = targetTask.submittedFileUrl;
    let nextSubmittedBy = targetTask.submittedBy;
    let nextSubmittedByName = targetTask.submittedByName;
    let nextSubmittedFileName = targetTask.submittedFileName;

    if (normFile && nextSubmittedFileName === normFile) {
      const remainingForMember = nextSubs.filter(s =>
        s.memberId === normId || s.memberId?.toLowerCase() === normId.toLowerCase() || s.memberName === normName
      );
      if (remainingForMember.length > 0) {
        const last = remainingForMember[remainingForMember.length - 1];
        nextSubmittedFileUrl = last.fileUrl;
        nextSubmittedFileName = last.fileName;
      } else {
        nextSubmittedFileUrl = undefined;
        nextSubmittedBy = undefined;
        nextSubmittedByName = undefined;
        nextSubmittedFileName = undefined;
      }
    } else if (!normFile && (
      (nextSubmittedBy && (nextSubmittedBy === normId || nextSubmittedBy.toLowerCase() === normId.toLowerCase())) ||
      (nextSubmittedByName && (nextSubmittedByName === normName || nextSubmittedByName.toLowerCase() === normName.toLowerCase()))
    )) {
      nextSubmittedFileUrl = undefined;
      nextSubmittedBy = undefined;
      nextSubmittedByName = undefined;
      nextSubmittedFileName = undefined;
    }

    const updatedTask: TaskItem = {
      ...targetTask,
      submissions: nextSubs,
      deletedSubmissionsMap: nextDeletedMap,
      submittedFileUrl: nextSubmittedFileUrl,
      submittedBy: nextSubmittedBy,
      submittedByName: nextSubmittedByName,
      submittedFileName: nextSubmittedFileName
    };

    const updatedList = allTasks.map(t => t.id === taskId ? updatedTask : t);
    setLocal(KEYS.TASKS, updatedList);

    // 4. Delete physical file if cached on server
    const targetFile = normFile || existingSub?.fileName;
    if (targetFile) {
      fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: targetFile,
          taskId: taskId,
          memberId: normId
        })
      }).catch(() => {});
    }

    // 5. Post to Google Apps Script to permanently remove submission row from Sheet
    this.syncPostToGoogle('deleteTaskSubmission', {
      taskId,
      memberId: normId,
      memberName: normName,
      fileName: targetFile,
      task: updatedTask
    }).catch(() => {});

    return updatedList;
  },

  reorderTasks(tasks: TaskItem[]): TaskItem[] {
    setLocal(KEYS.TASKS, tasks);
    this.syncPostToGoogle('saveAllTasks', { tasks });
    return tasks;
  },

  // Documents
  getDocuments(): DocumentItem[] {
    const list = getLocal<DocumentItem[]>(KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    if (!Array.isArray(list)) return [];
    if (deletedDocIdsSet.size === 0) return list;
    return list.filter(d => d && d.id && !deletedDocIdsSet.has(d.id));
  },

  saveDocument(doc: DocumentItem): DocumentItem[] {
    if (deletedDocIdsSet.has(doc.id)) {
      deletedDocIdsSet.delete(doc.id);
      try {
        localStorage.setItem('ams_deleted_doc_ids', JSON.stringify(Array.from(deletedDocIdsSet).slice(-2000)));
      } catch {
        // ignore
      }
    }

    const list = this.getDocuments();
    const idx = list.findIndex(d => d.id === doc.id);
    let updated: DocumentItem[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = mergeSingleDocumentClient(list[idx], doc, true);
    } else {
      updated = [doc, ...list];
    }
    setLocal(KEYS.DOCUMENTS, updated);

    const rawDataUrl = doc.fileData || (doc.fileUrl && doc.fileUrl.startsWith('data:') ? doc.fileUrl : '');
    if (rawDataUrl) {
      // 1. Pre-upload to local node server cache so members can download it immediately with 0ms delay
      fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: doc.fileName || `${doc.title || 'document'}.pdf`,
          dataUrl: rawDataUrl,
          id: `doc_${doc.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`
        })
      }).catch(() => {});

      // 2. Upload to Google Drive dedicated school folder
      const category = `Documents_${doc.academicYear || (doc.docType === 'order' ? 'Orders' : 'General')}`;
      this.uploadFileToGoogleDrive(rawDataUrl, doc.fileName || doc.title, category)
        .then(driveUrl => {
          if (driveUrl && driveUrl.startsWith('http')) {
            const curDocs = this.getDocuments();
            const dIdx = curDocs.findIndex(d => d.id === doc.id);
            if (dIdx >= 0) {
              const nextDocs = [...curDocs];
              nextDocs[dIdx] = {
                ...nextDocs[dIdx],
                fileUrl: driveUrl,
                driveFileId: extractDriveFileIdClient(driveUrl) || nextDocs[dIdx].driveFileId
              };
              setLocal(KEYS.DOCUMENTS, nextDocs, false);
            }
          }
        })
        .catch(() => {});
    }

    this.syncPostToGoogle('uploadDocument', doc).then(res => {
      if (res && res.document && res.document.fileUrl && res.document.fileUrl.startsWith('http')) {
        const curDocs = this.getDocuments();
        const dIdx = curDocs.findIndex(d => d.id === doc.id);
        if (dIdx >= 0) {
          const nextDocs = [...curDocs];
          nextDocs[dIdx] = mergeSingleDocumentClient(nextDocs[dIdx], res.document, true);
          setLocal(KEYS.DOCUMENTS, nextDocs, true);
        }
      }
    }).catch(() => {});
    return updated;
  },

  deleteDocument(id: string): DocumentItem[] {
    const list = this.getDocuments();
    const targetDoc = list.find(d => d.id === id);
    const updated = list.filter(d => d.id !== id);

    // 1. Add to deleted tombstone set permanently
    deletedDocIdsSet.add(id);
    try {
      localStorage.setItem('ams_deleted_doc_ids', JSON.stringify(Array.from(deletedDocIdsSet).slice(-2000)));
    } catch {
      // ignore
    }

    setLocal(KEYS.DOCUMENTS, updated);

    // Sync deleted IDs list to server & Firestore
    const now = Date.now();
    pushToRemoteServer('ams_deleted_doc_ids', Array.from(deletedDocIdsSet).slice(-2000), now);

    const fileUrl = targetDoc?.fileUrl || '';
    const driveFileId = (targetDoc as any)?.driveFileId || extractDriveFileIdClient(fileUrl);

    // 2. Remove local hosted file and trigger server/GAS Drive deletion
    fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: id,
        fileUrl,
        fileId: fileUrl.startsWith('/api/files/') ? fileUrl.replace('/api/files/', '').split('?')[0] : '',
        driveFileId,
        schoolId: getActiveSchoolId() || 'admin-school-01'
      })
    }).catch(() => {});

    // 3. Call Google Apps Script deleteDocument (removes row from sheet and trashes file from Google Drive)
    this.syncPostToGoogle('deleteDocument', {
      id,
      docId: id,
      fileUrl,
      driveFileId
    }).catch(() => {});

    // 4. Also call Google Apps Script deleteDriveFile directly if Drive ID exists
    if (driveFileId) {
      this.syncPostToGoogle('deleteDriveFile', {
        fileId: driveFileId,
        driveFileId,
        fileUrl
      }).catch(() => {});
    }

    return updated;
  },

  reorderDocuments(docs: DocumentItem[]): DocumentItem[] {
    setLocal(KEYS.DOCUMENTS, docs);
    this.syncPostToGoogle('saveAllDocuments', { documents: docs });
    return docs;
  },

  // Websites
  getWebsites(): RecommendedWebsite[] {
    return getLocal<RecommendedWebsite[]>(KEYS.WEBSITES, INITIAL_WEBSITES);
  },

  saveWebsite(site: RecommendedWebsite): RecommendedWebsite[] {
    const list = this.getWebsites();
    const idx = list.findIndex(w => w.id === site.id);
    let updated: RecommendedWebsite[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = site;
    } else {
      updated = [site, ...list];
    }
    setLocal(KEYS.WEBSITES, updated);
    this.syncPostToGoogle('saveWebsite', { website: site }).then(res => {
      if (res && res.website && res.website.logoUrl && res.website.logoUrl.startsWith('http')) {
        const curWebs = this.getWebsites();
        const wIdx = curWebs.findIndex(w => w.id === site.id);
        if (wIdx >= 0 && curWebs[wIdx].logoUrl !== res.website.logoUrl) {
          const nextWebs = [...curWebs];
          nextWebs[wIdx] = { ...nextWebs[wIdx], logoUrl: res.website.logoUrl };
          setLocal(KEYS.WEBSITES, nextWebs, true);
        }
      }
    }).catch(() => {});
    return updated;
  },

  deleteWebsite(id: string): RecommendedWebsite[] {
    const list = this.getWebsites();
    const target = list.find(w => w.id === id);
    const updated = list.filter(w => w.id !== id);
    setLocal(KEYS.WEBSITES, updated);
    this.syncPostToGoogle('deleteWebsite', { id, logoUrl: target?.logoUrl });
    return updated;
  },

  reorderWebsites(newWebsites: RecommendedWebsite[]): RecommendedWebsite[] {
    setLocal(KEYS.WEBSITES, newWebsites);
    this.syncPostToGoogle('saveAllWebsites', { websites: newWebsites });
    return newWebsites;
  },

  // Calendar
  getCalendarEvents(): CalendarEvent[] {
    return getLocal<CalendarEvent[]>(KEYS.CALENDAR, INITIAL_CALENDAR_EVENTS);
  },

  saveCalendarEvent(event: CalendarEvent): CalendarEvent[] {
    const list = this.getCalendarEvents();
    const idx = list.findIndex(c => c.id === event.id);
    let updated: CalendarEvent[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = event;
    } else {
      updated = [event, ...list];
    }
    setLocal(KEYS.CALENDAR, updated);
    this.syncPostToGoogle('saveCalendarEvent', { event });
    return updated;
  },

  deleteCalendarEvent(id: string): CalendarEvent[] {
    const allEvents = this.getCalendarEvents();
    const targetEvent = allEvents.find(c => c.id === id);
    const updated = allEvents.filter(c => c.id !== id);
    setLocal(KEYS.CALENDAR, updated);
    this.syncPostToGoogle('deleteCalendarEvent', { id });

    // Cascade delete linked TaskItems in หน้ามอบหมาย
    if (targetEvent) {
      const allTasks = this.getTasks();
      const remainingTasks = allTasks.filter(t => {
        const isLinkedById =
          t.calendarEventId === id ||
          (targetEvent.linkedTaskIds && targetEvent.linkedTaskIds.includes(t.id));

        const isLegacyLinked =
          t.dueDate === targetEvent.date &&
          ((targetEvent.taskDue && t.title === targetEvent.taskDue) ||
            (targetEvent.announcement &&
              (t.description === targetEvent.announcement ||
                t.title === targetEvent.announcement ||
                t.title === targetEvent.announcement.slice(0, 60))) ||
            t.title === targetEvent.title ||
            targetEvent.title === `กำหนดส่ง: ${t.title}` ||
            (t.description && targetEvent.title === `แจ้ง: ${t.description.slice(0, 30)}`));

        if (isLinkedById || isLegacyLinked) {
          deletedTaskIdsSet.add(t.id);
          this.syncPostToGoogle('deleteTask', { id: t.id });
          return false;
        }
        return true;
      });

      if (remainingTasks.length !== allTasks.length) {
        try {
          localStorage.setItem('ams_deleted_task_ids', JSON.stringify(Array.from(deletedTaskIdsSet).slice(-2000)));
        } catch {}
        setLocal(KEYS.TASKS, remainingTasks);
        pushToRemoteServer('ams_deleted_task_ids', Array.from(deletedTaskIdsSet).slice(-2000), Date.now());
      }
    }

    return updated;
  },

  // Academic Years Management (Developer feature: can delete academic year and wipe its data)
  getAcademicYears(): string[] {
    const rawList = getLocal<string[]>(KEYS.ACADEMIC_YEARS, ['2568', '2569']);
    const list = Array.isArray(rawList) ? [...rawList] : ['2568', '2569'];
    const schoolInfo = this.getSchoolInfo();
    if (schoolInfo.academicYear && !list.includes(schoolInfo.academicYear)) {
      list.push(schoolInfo.academicYear);
    }
    const rawSubs = getLocal<Subject[]>(KEYS.SUBJECTS, EXPANDED_INITIAL_SUBJECTS);
    if (Array.isArray(rawSubs)) {
      rawSubs.forEach(s => {
        if (s && s.academicYear && !isSubjectDeletedClient(s) && !list.includes(s.academicYear)) {
          list.push(s.academicYear);
        }
      });
    }
    list.sort((a, b) => Number(a) - Number(b));
    return list;
  },

  saveAcademicYears(years: string[]): string[] {
    setLocal(KEYS.ACADEMIC_YEARS, years);
    return years;
  },

  addAcademicYear(year: string): string[] {
    const years = this.getAcademicYears();
    if (!years.includes(year)) {
      const updated = [...years, year].sort((a, b) => Number(a) - Number(b));
      setLocal(KEYS.ACADEMIC_YEARS, updated);
      D1Service.saveYear(year).catch(() => {});
      return updated;
    }
    return years;
  },

  deleteAcademicYear(year: string): {
    years: string[];
    subjects: Subject[];
    deletedGrades: number;
    deletedAttendance: number;
    deletedDailyTracking: number;
    deletedSavings: number;
    deletedSubjects: number;
    deletedTasks?: number;
    deletedDocuments?: number;
  } {
    const targetYear = String(year).trim();
    const gregorianYear = String(Number(targetYear) - 543);
    D1Service.deleteYear(targetYear).catch(() => {});

    // 1. Remove year from list
    const currentYears = this.getAcademicYears();
    const updatedYears = currentYears.filter(y => y !== targetYear);
    const fallbackYear = updatedYears[0] || '2568';
    setLocal(KEYS.ACADEMIC_YEARS, updatedYears.length > 0 ? updatedYears : ['2568']);

    // Helper to match date string (YYYY-MM-DD, DD-MM-YYYY, or Buddhist/Gregorian year) against target academic year
    const isDateInYear = (dateStr?: string) => {
      if (!dateStr) return false;
      const s = String(dateStr);
      return s.includes(targetYear) || (!isNaN(Number(targetYear)) && s.includes(gregorianYear));
    };

    const isItemInYear = (item: any): boolean => {
      if (!item || typeof item !== 'object') return false;
      if (item.academicYear && String(item.academicYear).trim() === targetYear) return true;
      if (item.fiscalYear && String(item.fiscalYear).trim() === targetYear) return true;
      if (item.year && String(item.year).trim() === targetYear) return true;
      if (!item.academicYear) {
        if (item.date && isDateInYear(item.date)) return true;
        if (item.dueDate && isDateInYear(item.dueDate)) return true;
        if (item.startDate && isDateInYear(item.startDate)) return true;
      }
      return false;
    };

    // Collect all Google Drive file URLs & IDs belonging to this academic year so GAS can trash them in Google Drive
    const fileUrlsToTrash = new Set<string>();
    const driveFileIdsToTrash = new Set<string>();
    const collectFilesFromItem = (item: any) => {
      if (!item || typeof item !== 'object') return;
      const urlFields = ['attachmentUrl', 'submittedFileUrl', 'fileUrl', 'documentUrl'];
      for (const f of urlFields) {
        if (typeof item[f] === 'string' && item[f].startsWith('http')) {
          fileUrlsToTrash.add(item[f]);
        }
      }
      if (typeof item.driveFileId === 'string' && item.driveFileId.trim()) {
        driveFileIdsToTrash.add(item.driveFileId.trim());
      }
      if (Array.isArray(item.submissions)) {
        for (const sub of item.submissions) {
          if (sub?.fileUrl && typeof sub.fileUrl === 'string' && sub.fileUrl.startsWith('http')) {
            fileUrlsToTrash.add(sub.fileUrl);
          }
          if (sub?.driveFileId && typeof sub.driveFileId === 'string') {
            driveFileIdsToTrash.add(sub.driveFileId);
          }
        }
      }
    };

    // If current school year was this year, fall back to another available year
    const schoolInfo = this.getSchoolInfo();
    if (schoolInfo.academicYear === targetYear) {
      schoolInfo.academicYear = fallbackYear;
      this.setSchoolInfo(schoolInfo);
    }

    // 2. Wipe grades stored in that academic year
    const grades = this.getGrades();
    const remainingGrades = grades.filter(g => g.academicYear !== targetYear);
    const deletedGrades = grades.length - remainingGrades.length;
    setLocal(KEYS.GRADES, remainingGrades);

    // 3. Wipe attendance & 100-day attendance configs stored in that academic year
    const attendance = this.getAttendance();
    const remainingAttendance = attendance.filter(a => a.academicYear !== targetYear && !isDateInYear(a.date));
    const deletedAttendance = attendance.length - remainingAttendance.length;
    setLocal(KEYS.ATTENDANCE, remainingAttendance);

    const attConfigs = { ...this.getAttendanceConfigsByTerm() };
    let attConfigsChanged = false;
    Object.keys(attConfigs).forEach(k => {
      if (k.endsWith(`_${targetYear}`) || attConfigs[k]?.academicYear === targetYear) {
        delete attConfigs[k];
        attConfigsChanged = true;
      }
    });
    if (attConfigsChanged) {
      setLocal(KEYS.ATTENDANCE_CONFIGS_BY_TERM, attConfigs);
    }

    // Wipe locked semesters for that academic year
    const lockedMap = { ...this.getLockedSemesters() };
    let lockedChanged = false;
    Object.keys(lockedMap).forEach(k => {
      if (k.startsWith(`${targetYear}_`)) {
        delete lockedMap[k];
        lockedChanged = true;
      }
    });
    if (lockedChanged) {
      setLocal(KEYS.LOCKED_SEMESTERS, lockedMap);
    }

    // 4. Wipe savings stored in that academic year
    const savings = this.getSavings();
    const remainingSavings = savings.filter(s => s.academicYear !== targetYear && !isDateInYear(s.date));
    const deletedSavings = savings.length - remainingSavings.length;
    setLocal(KEYS.SAVINGS, remainingSavings);

    // 5. Wipe subjects stored in that academic year
    const subjects = getLocal<Subject[]>(KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const remainingSubjects = subjects.filter(s => s.academicYear !== targetYear);
    const deletedSubjects = subjects.length - remainingSubjects.length;
    setLocal(KEYS.SUBJECTS, remainingSubjects);

    // 6. Wipe daily tracking for that year
    const dailyTracking = this.getDailyTracking();
    const remainingDaily = dailyTracking.filter(d => !isDateInYear(d.date));
    const deletedDailyTracking = dailyTracking.length - remainingDaily.length;
    setLocal(KEYS.DAILY_TRACKING, remainingDaily);

    // 7. Wipe tasks & submissions for that academic year (and collect their Drive files)
    const tasks = this.getTasks();
    tasks.filter(t => isItemInYear(t)).forEach(collectFilesFromItem);
    const remainingTasks = tasks.filter(t => !isItemInYear(t));
    const deletedTasks = tasks.length - remainingTasks.length;
    setLocal(KEYS.TASKS, remainingTasks);

    // 8. Wipe documents for that academic year (and collect their Drive files)
    const docs = this.getDocuments();
    docs.filter(d => isItemInYear(d)).forEach(collectFilesFromItem);
    const remainingDocs = docs.filter(d => !isItemInYear(d));
    const deletedDocuments = docs.length - remainingDocs.length;
    setLocal(KEYS.DOCUMENTS, remainingDocs);

    // 9. Wipe Calendar Events, Comment Sessions, Behavior Evaluations, Leave Requests, Duty Logs, 3 Booklets, Reading/Writing, Weight/Height
    const calendarEvents = this.getCalendarEvents();
    const remainingCalendar = calendarEvents.filter(e => !isItemInYear(e));
    if (remainingCalendar.length !== calendarEvents.length) {
      setLocal(KEYS.CALENDAR, remainingCalendar);
    }

    const commentSessions = this.getCommentSessions();
    const removedSessionIds = new Set(
      commentSessions.filter(cs => cs.academicYear === targetYear || isDateInYear(cs.date)).map(cs => cs.id)
    );
    const remainingSessions = commentSessions.filter(cs => !removedSessionIds.has(cs.id));
    if (remainingSessions.length !== commentSessions.length) {
      setLocal(KEYS.COMMENT_SESSIONS, remainingSessions);
    }

    const evaluationsMap = { ...this.getBehaviorEvaluations() };
    let evalsChanged = false;
    Object.entries(evaluationsMap).forEach(([k, ev]) => {
      if (
        k.includes(`_${targetYear}_`) ||
        (ev && (ev.academicYear === targetYear || Boolean(ev.sessionId && removedSessionIds.has(ev.sessionId)) || isItemInYear(ev)))
      ) {
        delete evaluationsMap[k];
        evalsChanged = true;
      }
    });
    if (evalsChanged) {
      setLocal(KEYS.BEHAVIOR_EVALUATIONS, evaluationsMap);
    }

    const leaves = this.getLeaveRequests();
    leaves.filter(l => isItemInYear(l)).forEach(collectFilesFromItem);
    const remainingLeaves = leaves.filter(l => !isItemInYear(l));
    if (remainingLeaves.length !== leaves.length) {
      setLocal(KEYS.LEAVE_REQUESTS, remainingLeaves);
    }

    const dutyLogs = getLocal<any[]>(KEYS.DUTY_LOGS, []);
    const remainingDuty = dutyLogs.filter((d: any) => !isItemInYear(d));
    if (remainingDuty.length !== dutyLogs.length) {
      setLocal(KEYS.DUTY_LOGS, remainingDuty);
    }

    // 10. Cascade delete across all keys (both base keys & Multi-Tenant __<schoolId> keys) in memoryCache, localStorage & real-time server
    if (typeof window !== 'undefined') {
      const now = Date.now();
      const allCandidateKeys = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) allCandidateKeys.add(k);
      }
      memoryCache.forEach((_v, k) => allCandidateKeys.add(k));

      for (const storageKey of allCandidateKeys) {
        if (!storageKey || GLOBAL_KEYS.has(storageKey) || INTERNAL_SKIP_KEYS.has(storageKey)) continue;
        const baseKey = storageKey.includes('__') ? storageKey.split('__')[0] : storageKey;
        if (
          baseKey === KEYS.STUDENTS ||
          baseKey === KEYS.PERSONNEL
        ) {
          continue;
        }

        // Delete keys whose name explicitly embeds the deleted academic year (e.g. pp6_2568, ams_cleared_1_2568)
        if (storageKey.includes(targetYear)) {
          memoryCache.delete(storageKey);
          keyTimestamps.set(storageKey, now);
          try {
            window.localStorage.removeItem(storageKey);
          } catch {
            // ignore
          }
          pushToRemoteServer(storageKey, null, now);
          continue;
        }

        try {
          const cachedVal = memoryCache.has(storageKey)
            ? memoryCache.get(storageKey)
            : JSON.parse((nativeGetItem ? nativeGetItem(storageKey) : localStorage.getItem(storageKey)) || 'null');
          if (!cachedVal) continue;

          if (baseKey === KEYS.SCHOOL_INFO && typeof cachedVal === 'object' && cachedVal.academicYear === targetYear) {
            const updatedInfo = { ...cachedVal, academicYear: fallbackYear };
            memoryCache.set(storageKey, updatedInfo);
            keyTimestamps.set(storageKey, now);
            try {
              if (nativeSetItem) nativeSetItem(storageKey, JSON.stringify(updatedInfo));
            } catch {}
            pushToRemoteServer(storageKey, updatedInfo, now);
            continue;
          }

          if (Array.isArray(cachedVal)) {
            cachedVal.filter(isItemInYear).forEach(collectFilesFromItem);
            const filtered = cachedVal.filter(item => !isItemInYear(item));
            if (filtered.length !== cachedVal.length) {
              memoryCache.set(storageKey, filtered);
              keyTimestamps.set(storageKey, now);
              try {
                if (nativeSetItem) nativeSetItem(storageKey, JSON.stringify(filtered));
              } catch {}
              pushToRemoteServer(storageKey, filtered, now);
            }
          } else if (typeof cachedVal === 'object') {
            let objChanged = false;
            const nextObj: Record<string, any> = { ...cachedVal };
            for (const [k, v] of Object.entries(nextObj)) {
              if (k.includes(targetYear) || isItemInYear(v)) {
                collectFilesFromItem(v);
                delete nextObj[k];
                objChanged = true;
              }
            }
            if (objChanged) {
              memoryCache.set(storageKey, nextObj);
              keyTimestamps.set(storageKey, now);
              try {
                if (nativeSetItem) nativeSetItem(storageKey, JSON.stringify(nextObj));
              } catch {}
              pushToRemoteServer(storageKey, nextObj, now);
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // 11. Cascade delete in Google Sheets & Google Drive across Master Spreadsheet AND every School Admin's Spreadsheet & Drive folder
    const fileUrlsArr = Array.from(fileUrlsToTrash);
    const driveFileIdsArr = Array.from(driveFileIdsToTrash);

    this.syncPostToGoogle('deleteAcademicYearCascade', {
      academicYear: targetYear,
      fileUrls: fileUrlsArr,
      driveFileIds: driveFileIdsArr
    });

    const config = this.getGoogleConfig();
    const gasUrl = config.webAppUrl || DEFAULT_GAS_WEBAPP_URL;
    if (gasUrl) {
      const admins = this.getAdmins();
      const targetSpreadsheets = new Set<string>([MASTER_SPREADSHEET_ID]);
      admins.forEach(adm => {
        if (adm.googleSheetId && !adm.googleSheetId.startsWith('sheet_')) {
          targetSpreadsheets.add(adm.googleSheetId);
        }
      });

      targetSpreadsheets.forEach(sheetId => {
        const matchedAdmin = admins.find(a => a.googleSheetId === sheetId);
        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'deleteAcademicYearCascade',
            academicYear: targetYear,
            spreadsheetId: sheetId,
            schoolDriveFolderId: matchedAdmin?.driveFolderId || '',
            driveFolderId: config.driveFolderId || '11IXjrNHXyGpf3A-7ZT38t8B_jXtoFGS9',
            fileUrls: fileUrlsArr,
            driveFileIds: driveFileIdsArr
          })
        }).catch(() => {});
      });
    }

    return {
      years: updatedYears,
      subjects: remainingSubjects,
      deletedGrades,
      deletedAttendance,
      deletedDailyTracking,
      deletedSavings,
      deletedSubjects,
      deletedTasks,
      deletedDocuments
    };
  },

  // Comment Sessions & Behavior Evaluations
  getCommentSessions(): CommentSession[] {
    const defaultSessions: CommentSession[] = [
      {
        id: 'cs-term1',
        title: 'การประเมินผลและพัฒนาการ (ภาคเรียนที่ 1)',
        date: '2026-09-25',
        academicYear: '2569',
        semester: '1',
        createdAt: '2026-05-18T08:00:00.000Z'
      },
      {
        id: 'cs-term2',
        title: 'การประเมินผลและพัฒนาการ (ภาคเรียนที่ 2)',
        date: '2027-02-28',
        academicYear: '2569',
        semester: '2',
        createdAt: '2026-11-01T08:00:00.000Z'
      }
    ];
    return getLocal<CommentSession[]>(KEYS.COMMENT_SESSIONS, defaultSessions);
  },

  saveCommentSession(session: CommentSession): CommentSession[] {
    const list = this.getCommentSessions();
    const idx = list.findIndex(s => s.id === session.id);
    let updated: CommentSession[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = session;
    } else {
      updated = [session, ...list];
    }
    setLocal(KEYS.COMMENT_SESSIONS, updated);
    return updated;
  },

  deleteCommentSession(id: string): CommentSession[] {
    const list = this.getCommentSessions().filter(s => s.id !== id);
    setLocal(KEYS.COMMENT_SESSIONS, list);
    return list;
  },

  getBehaviorEvaluations(): Record<string, StudentBehaviorEvaluation> {
    return getLocal<Record<string, StudentBehaviorEvaluation>>(KEYS.BEHAVIOR_EVALUATIONS, {});
  },

  saveBehaviorEvaluation(evalData: StudentBehaviorEvaluation): Record<string, StudentBehaviorEvaluation> {
    const all = this.getBehaviorEvaluations();
    const payload = {
      ...evalData,
      updatedAt: new Date().toISOString()
    };
    if (evalData.academicYear && evalData.semester) {
      all[`${evalData.studentId}_${evalData.academicYear}_${evalData.semester}`] = payload;
    }
    const legacyKey = `${evalData.studentId}_${evalData.sessionId || 'default'}`;
    all[legacyKey] = payload;
    all[`${evalData.studentId}_default`] = payload;
    setLocal(KEYS.BEHAVIOR_EVALUATIONS, all);
    return all;
  },

  saveBulkBehaviorEvaluations(evalList: StudentBehaviorEvaluation[]): Record<string, StudentBehaviorEvaluation> {
    const all = this.getBehaviorEvaluations();
    evalList.forEach(e => {
      const payload = {
        ...e,
        updatedAt: new Date().toISOString()
      };
      if (e.academicYear && e.semester) {
        all[`${e.studentId}_${e.academicYear}_${e.semester}`] = payload;
      }
      const legacyKey = `${e.studentId}_${e.sessionId || 'default'}`;
      all[legacyKey] = payload;
      all[`${e.studentId}_default`] = payload;
    });
    setLocal(KEYS.BEHAVIOR_EVALUATIONS, all);
    return all;
  },

  // Reset to initial demo data
  resetAllData(): void {
    localStorage.clear();
    memoryCache.clear();
    keyTimestamps.clear();
    setLocal(KEYS.ADMINS, INITIAL_ADMINS);
    setLocal(KEYS.SCHOOL_INFO, INITIAL_SCHOOL_INFO);
    setLocal(KEYS.MEMBERS, INITIAL_MEMBERS);
    setLocal(KEYS.STUDENTS, INITIAL_STUDENTS);
    setLocal(KEYS.PERSONNEL, INITIAL_PERSONNEL);
    setLocal(KEYS.DAILY_TRACKING, INITIAL_DAILY_TRACKING);
    setLocal(KEYS.SUBJECTS, INITIAL_SUBJECTS);
    setLocal(KEYS.GRADES, INITIAL_GRADES);
    setLocal(KEYS.ATTENDANCE_CONFIG, INITIAL_ATTENDANCE_CONFIG);
    setLocal(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    setLocal(KEYS.SAVINGS, INITIAL_SAVINGS);
    setLocal(KEYS.TASKS, INITIAL_TASKS);
    setLocal(KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    setLocal(KEYS.WEBSITES, INITIAL_WEBSITES);
    setLocal(KEYS.CALENDAR, INITIAL_CALENDAR_EVENTS);
    setLocal(KEYS.ACADEMIC_YEARS, ['2568', '2569']);
  },

  // Helper: Retrieve active school Google Sheet ID
  getCurrentSchoolSpreadsheetId(): string | undefined {
    const session = this.getSession();
    if (session && session.schoolId) {
      const admin = this.getAdmins().find(a => a.id === session.schoolId);
      if (admin && admin.googleSheetId) return admin.googleSheetId;
    }
    const schoolInfo = this.getSchoolInfo();
    return schoolInfo.googleSheetId;
  },

  // Upload any file or image (Base64 Data URL) to Google Drive inside the school's dedicated category folder
  async uploadFileToGoogleDrive(
    fileDataUrl: string,
    fileName: string,
    category: 'assignment' | 'document' | 'school_logo' | 'website_logo' | 'student_photo' | 'personnel_photo' | string
  ): Promise<string> {
    if (!fileDataUrl || !fileDataUrl.startsWith('data:')) {
      return fileDataUrl;
    }
    const config = this.getGoogleConfig();
    const gasUrl = config.webAppUrl || DEFAULT_GAS_WEBAPP_URL;
    if (!gasUrl) return fileDataUrl;

    const session = this.getSession();
    const schoolInfo = this.getSchoolInfo();
    const admins = this.getAdmins();
    const activeSchoolId = session?.schoolId ? normalizeSchoolId(session.schoolId, session.schoolName, admins) : 'admin-school-01';
    const matchedAdmin = admins.find(a => a.id === activeSchoolId);

    try {
      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'uploadDriveFile',
          spreadsheetId: matchedAdmin?.googleSheetId || schoolInfo.googleSheetId || '',
          schoolId: activeSchoolId,
          schoolName: matchedAdmin?.schoolName || schoolInfo.schoolName || session?.schoolName || 'โรงเรียนทั่วไป',
          schoolDriveFolderId: matchedAdmin?.driveFolderId || '',
          driveFolderId: config.driveFolderId || '11IXjrNHXyGpf3A-7ZT38t8B_jXtoFGS9',
          category,
          fileName,
          fileBase64: fileDataUrl,
          uploadedBy: session?.fullName || session?.username || ''
        })
      });
      const data = await res.json();
      if (data && data.status === 'success' && data.fileUrl) {
        return data.fileUrl;
      }
    } catch {
      // Keep local dataUrl if offline or unreachable
    }
    return fileDataUrl;
  },

  // Sync Admin record to Master Google Spreadsheet's "Admins" sheet
  syncAdminRecordToGoogleSheets(admin: SchoolAdminAccount): void {
    if (typeof window === 'undefined') return;
    const config = this.getGoogleConfig();
    const gasUrl = config.webAppUrl || DEFAULT_GAS_WEBAPP_URL;
    if (!gasUrl) return;

    const existing = this.getAdmins().find(a => a.id === admin.id);
    const resolvedSheetId =
      admin.googleSheetId && !admin.googleSheetId.startsWith('sheet_')
        ? admin.googleSheetId
        : existing?.googleSheetId && !existing.googleSheetId.startsWith('sheet_')
        ? existing.googleSheetId
        : '';
    const resolvedSheetUrl = resolvedSheetId
      ? admin.googleSheetUrl || existing?.googleSheetUrl || `https://docs.google.com/spreadsheets/d/${resolvedSheetId}/edit`
      : '';

    const adminRow = {
      id: admin.id,
      username: admin.username,
      password: admin.password || '123456',
      fullName: admin.fullName,
      schoolName: admin.schoolName,
      schoolCode: admin.schoolCode || '',
      affiliation: admin.affiliation || '',
      directorName: admin.directorName || '',
      googleSheetId: resolvedSheetId,
      googleSheetUrl: resolvedSheetUrl,
      driveFolderId: admin.driveFolderId || existing?.driveFolderId || '',
      driveFolderUrl: admin.driveFolderUrl || existing?.driveFolderUrl || '',
      isSuspended: Boolean(admin.isSuspended),
      createdAt: admin.createdAt || new Date().toISOString().split('T')[0]
    };

    const reqBody = {
      gasUrl,
      action: 'saveEntity',
      spreadsheetId: MASTER_SPREADSHEET_ID,
      sheetName: 'Admins',
      keyField: 'id',
      data: adminRow
    };

    fetch('/api/google/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    }).catch(() => {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(reqBody)
      }).catch(() => {});
    });
  },

  // Delete Admin row, cascade members, tenant Cloud KV keys, and trash dedicated School Google Sheet
  deleteAdminAndSchoolSheetFromGoogle(
    adminId: string,
    targetAdmin?: SchoolAdminAccount,
    deletedMembers: MemberAccount[] = [],
    deletedTenantKeys: string[] = []
  ): void {
    if (typeof window === 'undefined') return;
    const config = this.getGoogleConfig();
    const gasUrl = config.webAppUrl || DEFAULT_GAS_WEBAPP_URL;
    if (!gasUrl) return;

    // 1. Call deleteSchoolSheet to trash the school's dedicated Google Spreadsheet & Drive Folder & clean up Master Sheet
    fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'deleteSchoolSheet',
        spreadsheetId: MASTER_SPREADSHEET_ID,
        masterSpreadsheetId: MASTER_SPREADSHEET_ID,
        schoolSpreadsheetId: targetAdmin?.googleSheetId || '',
        googleSheetId: targetAdmin?.googleSheetId || '',
        schoolDriveFolderId: targetAdmin?.driveFolderId || '',
        adminId,
        schoolName: targetAdmin?.schoolName || ''
      })
    }).catch(() => {});

    // 2. Also call deleteEntity on "Admins" sheet in Master Spreadsheet (works even on legacy deployed GAS scripts)
    fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'deleteEntity',
        spreadsheetId: MASTER_SPREADSHEET_ID,
        sheetName: 'Admins',
        keyField: 'id',
        id: adminId
      })
    }).catch(() => {});

    // 3. Delete members belonging to this school from "Members" sheet in Master Spreadsheet
    for (const mem of deletedMembers) {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteMember',
          spreadsheetId: MASTER_SPREADSHEET_ID,
          id: mem.id
        })
      }).catch(() => {});
    }

    // 4. Delete tenant-scoped keys from "RealtimeCloudKV" sheet in Master Spreadsheet
    for (const tKey of deletedTenantKeys) {
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteEntity',
          spreadsheetId: MASTER_SPREADSHEET_ID,
          sheetName: CLOUD_KV_SHEET,
          keyField: 'id',
          id: tKey
        })
      }).catch(() => {});
    }
  },

  // Automated Google Sheet and Drive Folder creation per School Admin (1 Admin = 1 Sheet & 1 Drive Folder)
  async createSchoolGoogleSheet(
    schoolName: string,
    schoolCode?: string,
    adminId?: string,
    extraAdminInfo?: Partial<SchoolAdminAccount>
  ): Promise<{ success: boolean; spreadsheetId: string; spreadsheetUrl: string; driveFolderId?: string; driveFolderUrl?: string; message: string }> {
    const config = this.getGoogleConfig();
    const gasUrl = config.webAppUrl || DEFAULT_GAS_WEBAPP_URL;

    const payload = {
      action: 'createSchoolSheet',
      schoolName,
      schoolCode: schoolCode || '',
      adminId: adminId || '',
      username: extraAdminInfo?.username || '',
      password: extraAdminInfo?.password || '123456',
      fullName: extraAdminInfo?.fullName || `ผู้ดูแลระบบ ${schoolName}`,
      affiliation: extraAdminInfo?.affiliation || 'สพป.',
      directorName: extraAdminInfo?.directorName || '',
      masterSpreadsheetId: MASTER_SPREADSHEET_ID,
      folderId: config.driveFolderId || '11IXjrNHXyGpf3A-7ZT38t8B_jXtoFGS9'
    };

    // 1. Primary path: server-side reliable Google Sheet + Drive Folder provisioning (no CORS / browser timeout issues)
    try {
      const serverRes = await fetch('/api/google/create-school-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (serverRes.ok) {
        const sData = await serverRes.json();
        if (sData && sData.status === 'success' && sData.spreadsheetId && !String(sData.spreadsheetId).startsWith('sheet_')) {
          const finalUrl = sData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sData.spreadsheetId}/edit`;
          return {
            success: true,
            spreadsheetId: sData.spreadsheetId,
            spreadsheetUrl: finalUrl,
            driveFolderId: sData.driveFolderId,
            driveFolderUrl: sData.driveFolderUrl,
            message: sData.message || `สร้าง Google Sheet และโฟลเดอร์ Google Drive ประจำโรงเรียน ${schoolName} เรียบร้อยแล้ว`
          };
        }
      }
    } catch {
      // fall through to direct GAS call
    }

    // 2. Fallback path: direct GAS call
    if (gasUrl) {
      try {
        const response = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data && data.status === 'success' && data.spreadsheetId && !String(data.spreadsheetId).startsWith('sheet_')) {
          const finalUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`;
          return {
            success: true,
            spreadsheetId: data.spreadsheetId,
            spreadsheetUrl: finalUrl,
            driveFolderId: data.driveFolderId,
            driveFolderUrl: data.driveFolderUrl,
            message: data.message || `สร้าง Google Sheet และโฟลเดอร์ Google Drive ประจำโรงเรียน ${schoolName} เรียบร้อยแล้ว`
          };
        }
      } catch {
        // ignore
      }
    }

    return {
      success: false,
      spreadsheetId: '',
      spreadsheetUrl: '',
      message: `ไม่สามารถติดต่อ Google Apps Script เพื่อสร้าง Google Sheet สำหรับ "${schoolName}" ได้ กรุณากดปุ่มสร้าง Sheet อีกครั้ง`
    };
  },

  // Deduplicate and consolidate Google Drive School Folders (Strict 1 School = 1 Folder)
  async deduplicateSchoolDriveFolders(schoolName?: string): Promise<{ success: boolean; message: string; cleanedSummary?: any[] }> {
    try {
      const config = this.getGoogleConfig();
      const res = await fetch('/api/google/deduplicate-school-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: schoolName || '',
          folderId: config.driveFolderId || '11IXjrNHXyGpf3A-7ZT38t8B_jXtoFGS9'
        })
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: data.status === 'success',
          message: data.message || 'ตรวจสอบและจัดระเบียบโฟลเดอร์ใน Google Drive เรียบร้อยแล้ว (1 โรงเรียน = 1 โฟลเดอร์จริง)',
          cleanedSummary: data.cleanedSummary
        };
      }
    } catch {
      // ignore
    }
    return {
      success: false,
      message: 'ไม่สามารถติดต่อ Google Apps Script เพื่อจัดระเบียบโฟลเดอร์ได้'
    };
  },

  // Background Google Apps Script sync with Per-School Spreadsheet Routing
  async syncPostToGoogle(action: string, payload: Record<string, any>): Promise<any> {
    const config = this.getGoogleConfig();
    if (!config.webAppUrl || !config.isConnected) {
      return null;
    }

    const session = this.getSession();
    const schoolInfo = this.getSchoolInfo();
    const admins = this.getAdmins();
    const activeSchoolId = session?.schoolId ? normalizeSchoolId(session.schoolId, session.schoolName, admins) : 'admin-school-01';
    const matchedAdmin = admins.find(a => a.id === activeSchoolId);
    const spreadsheetId = payload.spreadsheetId || matchedAdmin?.googleSheetId || this.getCurrentSchoolSpreadsheetId();
    const schoolName = payload.schoolName || matchedAdmin?.schoolName || schoolInfo.schoolName || session?.schoolName || '';
    const schoolDriveFolderId = payload.schoolDriveFolderId || matchedAdmin?.driveFolderId || '';

    try {
      const response = await fetch(config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids preflight issues in Google Apps Script
        body: JSON.stringify({
          action,
          driveFolderId: config.driveFolderId,
          spreadsheetId,
          schoolId: activeSchoolId,
          schoolName,
          schoolDriveFolderId,
          ...payload
        })
      });
      return await response.json();
    } catch (err) {
      console.warn('Google Apps Script background sync failed (offline or pending):', err);
      return null;
    }
  },

  async testGoogleConnection(url: string, driveFolderId?: string): Promise<{ success: boolean; message: string }> {
    if (!url) return { success: false, message: 'กรุณากรอก Web App URL ของ Google Apps Script' };
    try {
      const pingUrl = url.includes('?') ? `${url}&action=ping` : `${url}?action=ping`;
      const res = await fetch(pingUrl, { method: 'GET' });
      const data = await res.json();
      if (data && data.status === 'success') {
        const current = this.getGoogleConfig();
        this.setGoogleConfig({
          webAppUrl: url,
          driveFolderId: driveFolderId || current.driveFolderId || '',
          isConnected: true,
          lastSynced: new Date().toISOString()
        });
        return { success: true, message: 'เชื่อมต่อ Google Apps Script สำเร็จแล้ว!' };
      }
      return { success: false, message: 'ตอบกลับแต่สถานะไม่ใช่ success: ' + JSON.stringify(data) };
    } catch (err: any) {
      return { success: false, message: 'ไม่สามารถเชื่อมต่อได้: ' + (err.message || String(err)) };
    }
  },

  // Custom Buttons Management (Admin & Member future-ready dynamic buttons)
  getCustomButtons(): CustomButton[] {
    const defaultButtons: CustomButton[] = [
      {
        id: 'btn-emmis',
        label: 'ระบบจัดเก็บข้อมูลนักเรียน (EMIS)',
        actionUrl: 'https://emis.bopp.go.th',
        category: 'ระบบราชการ',
        icon: 'Globe',
        color: 'indigo',
        targetRole: 'all',
        openInNewTab: true,
        order: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: 'btn-dopa',
        label: 'ตรวจสอบรหัสบัตรประชาชน (DOPA)',
        actionUrl: 'https://stat.bora.dopa.go.th',
        category: 'ทะเบียนราษฎร์',
        icon: 'Shield',
        color: 'emerald',
        targetRole: 'all',
        openInNewTab: true,
        order: 2,
        createdAt: new Date().toISOString()
      }
    ];
    return getLocal<CustomButton[]>(KEYS.CUSTOM_BUTTONS, defaultButtons);
  },

  saveCustomButton(button: CustomButton): CustomButton[] {
    const list = this.getCustomButtons();
    const idx = list.findIndex(b => b.id === button.id);
    let updated: CustomButton[];
    const payload = {
      ...button,
      schoolId: button.schoolId || this.getSession()?.schoolId || '',
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = payload;
    } else {
      updated = [payload, ...list];
    }
    setLocal(KEYS.CUSTOM_BUTTONS, updated);
    this.syncPostToGoogle('saveCustomButton', { button: payload });
    return updated;
  },

  deleteCustomButton(id: string): CustomButton[] {
    const updated = this.getCustomButtons().filter(b => b.id !== id);
    setLocal(KEYS.CUSTOM_BUTTONS, updated);
    this.syncPostToGoogle('deleteCustomButton', { id });
    return updated;
  },

  // Custom Pages Management (Admin & Member future-ready dynamic pages)
  getCustomPages(): CustomPage[] {
    return getLocal<CustomPage[]>(KEYS.CUSTOM_PAGES, []);
  },

  saveCustomPage(page: CustomPage): CustomPage[] {
    const list = this.getCustomPages();
    const idx = list.findIndex(p => p.id === page.id || p.slug === page.slug);
    let updated: CustomPage[];
    const payload = {
      ...page,
      schoolId: page.schoolId || this.getSession()?.schoolId || '',
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = payload;
    } else {
      updated = [payload, ...list];
    }
    setLocal(KEYS.CUSTOM_PAGES, updated);
    this.syncPostToGoogle('saveCustomPage', { page: payload });
    return updated;
  },

  deleteCustomPage(id: string): CustomPage[] {
    const updated = this.getCustomPages().filter(p => p.id !== id);
    setLocal(KEYS.CUSTOM_PAGES, updated);
    this.syncPostToGoogle('deleteCustomPage', { id });
    return updated;
  },

  // Administrative Leave & Duty Sync Handlers
  getLeaveRequests(fallback: any[] = []): any[] {
    const list = getLocal<any[]>(KEYS.LEAVE_REQUESTS, fallback);
    if (!Array.isArray(list) || deletedLeaveIdsSet.size === 0) return list || [];
    return list.filter(r => r && r.id && !deletedLeaveIdsSet.has(String(r.id)));
  },

  setLeaveRequests(records: any[]): any[] {
    const cleaned = Array.isArray(records)
      ? records.filter(r => r && r.id && !deletedLeaveIdsSet.has(String(r.id)))
      : [];
    setLocal(KEYS.LEAVE_REQUESTS, cleaned);
    return cleaned;
  },

  saveLeaveRequest(record: any): any[] {
    if (!record || !record.id) return this.getLeaveRequests();
    const cleanId = String(record.id);
    if (deletedLeaveIdsSet.has(cleanId)) {
      deletedLeaveIdsSet.delete(cleanId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ams_deleted_leave_ids', JSON.stringify(Array.from(deletedLeaveIdsSet).slice(-2000)));
        } catch {}
      }
    }
    const list = this.getLeaveRequests();
    const idx = list.findIndex(r => String(r.id) === cleanId);
    let updated = idx >= 0 ? list.map(r => String(r.id) === cleanId ? record : r) : [record, ...list];
    setLocal(KEYS.LEAVE_REQUESTS, updated);
    this.syncPostToGoogle('saveLeaveRequest', { record });
    return updated;
  },

  deleteLeaveRequest(id: string): any[] {
    const cleanId = String(id);
    deletedLeaveIdsSet.add(cleanId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ams_deleted_leave_ids', JSON.stringify(Array.from(deletedLeaveIdsSet).slice(-2000)));
      } catch {}
    }
    const updated = this.getLeaveRequests().filter(r => String(r.id) !== cleanId);
    setLocal(KEYS.LEAVE_REQUESTS, updated);
    pushToRemoteServer('ams_deleted_leave_ids', Array.from(deletedLeaveIdsSet).slice(-2000), Date.now());
    this.syncPostToGoogle('deleteLeaveRequest', { id: cleanId });
    return updated;
  },

  getDutyAssignments(fallback: any[] = []): any[] {
    return getLocal<any[]>(KEYS.DUTY_ASSIGNMENTS, fallback);
  },

  setDutyAssignments(records: any[]): any[] {
    setLocal(KEYS.DUTY_ASSIGNMENTS, records);
    return records;
  },

  saveDutyAssignment(record: any): any[] {
    const list = this.getDutyAssignments();
    const idx = list.findIndex(r => r.id === record.id);
    let updated = idx >= 0 ? list.map(r => r.id === record.id ? record : r) : [record, ...list];
    setLocal(KEYS.DUTY_ASSIGNMENTS, updated);
    this.syncPostToGoogle('saveDutyAssignment', { record });
    return updated;
  },

  deleteDutyAssignment(id: string): any[] {
    const updated = this.getDutyAssignments().filter(r => r.id !== id);
    setLocal(KEYS.DUTY_ASSIGNMENTS, updated);
    this.syncPostToGoogle('deleteDutyAssignment', { id });
    return updated;
  },

  getDailyDutyLogs(fallback: any[] = []): any[] {
    const list = getLocal<any[]>(KEYS.DUTY_LOGS, fallback);
    if (!Array.isArray(list)) return [];
    if (deletedDutyLogIdsSet.size === 0) return list;
    return list.filter(r => r && r.id && !deletedDutyLogIdsSet.has(String(r.id)));
  },

  setDailyDutyLogs(records: any[]): any[] {
    const cleaned = Array.isArray(records)
      ? records.filter(r => r && r.id && !deletedDutyLogIdsSet.has(String(r.id)))
      : [];
    setLocal(KEYS.DUTY_LOGS, cleaned);
    return cleaned;
  },

  saveDailyDutyLog(record: any): any[] {
    if (!record || !record.id) return this.getDailyDutyLogs();
    const cleanId = String(record.id);
    if (deletedDutyLogIdsSet.has(cleanId)) {
      deletedDutyLogIdsSet.delete(cleanId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ams_deleted_duty_log_ids', JSON.stringify(Array.from(deletedDutyLogIdsSet).slice(-2000)));
        } catch {}
      }
    }
    const list = this.getDailyDutyLogs();
    const idx = list.findIndex(r => String(r.id) === cleanId);
    const updated = idx >= 0 ? list.map(r => String(r.id) === cleanId ? record : r) : [record, ...list];
    setLocal(KEYS.DUTY_LOGS, updated);
    this.syncPostToGoogle('saveDutyLog', { record });
    return updated;
  },

  deleteDailyDutyLog(id: string): any[] {
    const cleanId = String(id);
    deletedDutyLogIdsSet.add(cleanId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ams_deleted_duty_log_ids', JSON.stringify(Array.from(deletedDutyLogIdsSet).slice(-2000)));
      } catch {}
    }
    const updated = this.getDailyDutyLogs().filter(r => String(r.id) !== cleanId);
    setLocal(KEYS.DUTY_LOGS, updated);
    pushToRemoteServer('ams_deleted_duty_log_ids', Array.from(deletedDutyLogIdsSet).slice(-2000), Date.now());
    this.syncPostToGoogle('deleteDutyLog', { id: cleanId });
    return updated;
  },

  // Future-proof Generic Entity Handlers
  saveGenericEntity(sheetName: string, item: any, keyField: string = 'id'): void {
    this.syncPostToGoogle('saveEntity', { sheetName, data: item, keyField });
  },

  deleteGenericEntity(sheetName: string, id: string, keyField: string = 'id'): void {
    this.syncPostToGoogle('deleteEntity', { sheetName, id, keyField });
  },

  async syncAllToGoogle(): Promise<{ success: boolean; message: string }> {
    const config = this.getGoogleConfig();
    if (!config.webAppUrl) {
      return { success: false, message: 'ยังไม่ได้ตั้งค่า Google Apps Script Web App URL' };
    }

    const allData = {
      schoolInfo: this.getSchoolInfo(),
      students: this.getStudents(),
      personnel: this.getPersonnel(),
      dailyTracking: this.getDailyTracking(),
      subjects: this.getSubjects(),
      grades: this.getGrades(),
      attendance: this.getAttendance(),
      savings: this.getSavings(),
      tasks: this.getTasks(),
      documents: this.getDocuments(),
      websites: this.getWebsites(),
      calendar: this.getCalendarEvents(),
      members: this.getMembers(),
      customButtons: this.getCustomButtons(),
      customPages: this.getCustomPages(),
      leaveRequests: this.getLeaveRequests(),
      dutyAssignments: this.getDutyAssignments(),
      dailyDutyLogs: this.getDailyDutyLogs()
    };

    const session = this.getSession();
    const schoolInfo = this.getSchoolInfo();
    const admins = this.getAdmins();
    const activeSchoolId = session?.schoolId ? normalizeSchoolId(session.schoolId, session.schoolName, admins) : 'admin-school-01';
    const matchedAdmin = admins.find(a => a.id === activeSchoolId);
    const spreadsheetId = matchedAdmin?.googleSheetId || this.getCurrentSchoolSpreadsheetId();
    const schoolName = matchedAdmin?.schoolName || schoolInfo.schoolName || session?.schoolName || '';

    try {
      const response = await fetch(config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'syncAll',
          driveFolderId: config.driveFolderId,
          spreadsheetId,
          schoolId: activeSchoolId,
          schoolName,
          data: allData
        })
      });
      const resJson = await response.json();
      if (resJson.status === 'success') {
        this.setGoogleConfig({
          ...config,
          isConnected: true,
          lastSynced: new Date().toISOString()
        });
        return { success: true, message: 'ซิงค์ข้อมูลทั้งหมดลง Google Sheets ประจำโรงเรียนสำเร็จเรียบร้อยแล้ว' };
      }
      return { success: false, message: resJson.message || 'ซิงค์ไม่สำเร็จ' };
    } catch (err: any) {
      return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message };
    }
  }
};
