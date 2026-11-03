/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserSession, 
  SchoolInfo, 
  MemberAccount, 
  Student, 
  Personnel, 
  DailyTracking, 
  Subject, 
  GradeRecord, 
  AttendanceRecord, 
  AttendanceDayConfig, 
  SavingsRecord, 
  TaskItem, 
  DocumentItem, 
  RecommendedWebsite, 
  CalendarEvent, 
  GoogleConfig, 
  ToastMessage,
  SchoolAdminAccount,
  CustomButton
} from './types';
import { StorageService } from './services/storage';

import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { Module1ClassroomAdmin } from './components/Module1ClassroomAdmin';
import { ModuleDataOthers } from './components/ModuleDataOthers';
import { Module2Grading } from './components/Module2Grading';
import { Module3AttendanceSavings } from './components/Module3AttendanceSavings';
import { Module4Assignments } from './components/Module4Assignments';
import { Module5Documents } from './components/Module5Documents';
import { Module6Websites } from './components/Module6Websites';
import { Module7Reports } from './components/Module7Reports';
import { SettingsView } from './components/SettingsView';
import { LoginPage } from './components/LoginPage';
import { LightboxModal } from './components/LightboxModal';
import { DeveloperConsole } from './components/DeveloperConsole';
import { Toast } from './components/Toast';

export default function App() {
  // Global State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [previousTab, setPreviousTab] = useState<NavTab>('dashboard');
  const [user, setUser] = useState<UserSession | null>(() => StorageService.getSession());
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(() => StorageService.getSchoolInfo());
  const [admins, setAdmins] = useState<SchoolAdminAccount[]>(() => StorageService.getAdmins());
  const [academicYears, setAcademicYears] = useState<string[]>(() => StorageService.getAcademicYears());
  const [members, setMembers] = useState<MemberAccount[]>(() => StorageService.getMembers());
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [personnel, setPersonnel] = useState<Personnel[]>(() => StorageService.getPersonnel());
  const [dailyTracking, setDailyTracking] = useState<DailyTracking[]>(() => StorageService.getDailyTracking());
  const [subjects, setSubjects] = useState<Subject[]>(() => StorageService.getSubjects());
  const [grades, setGrades] = useState<GradeRecord[]>(() => StorageService.getGrades());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceDayConfig>(() => StorageService.getAttendanceConfig());
  const [savings, setSavings] = useState<SavingsRecord[]>(() => StorageService.getSavings());
  const [tasks, setTasks] = useState<TaskItem[]>(() => StorageService.getTasks());
  const [documents, setDocuments] = useState<DocumentItem[]>(() => StorageService.getDocuments());
  const [websites, setWebsites] = useState<RecommendedWebsite[]>(() => StorageService.getWebsites());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => StorageService.getCalendarEvents());
  const [customButtons, setCustomButtons] = useState<CustomButton[]>(() => StorageService.getCustomButtons());
  const [googleConfig, setGoogleConfig] = useState<GoogleConfig>(() => StorageService.getGoogleConfig());

  // UI state
  const [isInspectingSchool, setIsInspectingSchool] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Lightbox state
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
    subtitle?: string;
  }>({
    isOpen: false,
    imageUrl: '',
    title: ''
  });

  // Toast Dispatcher
  const showToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const id = 'toast-' + Date.now() + Math.random().toString(36).substring(2, 6);
    const newToast: ToastMessage = { id, type, title, message };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Lightbox opener
  const handleOpenLightbox = (imageUrl: string, title: string, subtitle?: string) => {
    setLightboxState({
      isOpen: true,
      imageUrl,
      title,
      subtitle
    });
  };

  const reloadAllStates = (changedKeys?: string[]) => {
    const isSelective = Array.isArray(changedKeys) && changedKeys.length > 0;
    const baseKeySet = isSelective
      ? new Set(changedKeys.map(k => (k ? k.split('__')[0] : '')))
      : null;

    const shouldUpdate = (baseKey: string) => !baseKeySet || baseKeySet.has(baseKey);

    if (shouldUpdate('ams_school_admins') || shouldUpdate('ams_members')) {
      const latestAdmins = StorageService.getAdmins();
      const latestMembers = StorageService.getMembers();
      if (shouldUpdate('ams_school_admins')) setAdmins(latestAdmins);
      if (shouldUpdate('ams_members')) setMembers(latestMembers);

      // Ensure active session's schoolId stays strictly aligned with latest synced admins/members
      const currentSession = StorageService.getSession();
      if (currentSession && currentSession.role !== 'developer') {
        let resolvedSchoolId = StorageService.getNormalizedSchoolId(currentSession.schoolId, currentSession.schoolName);
        if (currentSession.role === 'member') {
          const matchedMem = latestMembers.find(
            m => m.id === currentSession.id || m.username.toLowerCase() === currentSession.username.toLowerCase()
          );
          if (matchedMem && matchedMem.schoolId) {
            resolvedSchoolId = StorageService.getNormalizedSchoolId(matchedMem.schoolId, matchedMem.schoolName);
          }
        } else if (currentSession.role === 'admin') {
          const matchedAdm = latestAdmins.find(
            a => a.id === currentSession.id || a.username.toLowerCase() === currentSession.username.toLowerCase()
          );
          if (matchedAdm) {
            resolvedSchoolId = matchedAdm.id;
          }
        }
        const matchedSchool = latestAdmins.find(a => a.id === resolvedSchoolId);
        const matchedMemberObj =
          currentSession.role === 'member'
            ? latestMembers.find(m => m.id === currentSession.id || m.username.toLowerCase() === currentSession.username.toLowerCase())
            : undefined;

        // Enforce temporary suspension: if the school's Admin is suspended, block both the Admin and all Members of that school immediately
        if (matchedSchool?.isSuspended || matchedMemberObj?.isSuspended) {
          StorageService.setSession(null);
          setUser(null);
          setIsInspectingSchool(false);
          showToast(
            'error',
            'ระงับการใช้งานชั่วคราว',
            matchedSchool?.isSuspended
              ? `โรงเรียน "${matchedSchool.schoolName}" ถูกระงับการใช้งานชั่วคราวโดยผู้พัฒนาระบบ ทั้ง Admin และสมาชิกในสังกัดไม่สามารถเข้าใช้งานได้ในขณะนี้`
              : 'บัญชีของคุณถูกระงับการใช้งานชั่วคราว ไม่สามารถเข้าใช้งานได้ในขณะนี้'
          );
          return;
        }

        const expectedRoom = matchedMemberObj
          ? (matchedMemberObj.room || (matchedMemberObj.gradeLevel ? '1' : undefined))
          : currentSession.assignedRoom;
        const expectedGrade = matchedMemberObj ? matchedMemberObj.gradeLevel : currentSession.assignedGrade;
        const expectedAvatar = matchedMemberObj?.avatarUrl || currentSession.avatarUrl;

        if (
          resolvedSchoolId !== currentSession.schoolId ||
          (matchedSchool?.schoolName && matchedSchool.schoolName !== currentSession.schoolName) ||
          (matchedMemberObj && (expectedGrade !== currentSession.assignedGrade || expectedRoom !== currentSession.assignedRoom || expectedAvatar !== currentSession.avatarUrl))
        ) {
          const updatedSession: UserSession = {
            ...currentSession,
            schoolId: resolvedSchoolId,
            schoolName: matchedSchool?.schoolName || currentSession.schoolName,
            assignedGrade: expectedGrade,
            assignedRoom: expectedRoom,
            avatarUrl: expectedAvatar
          };
          StorageService.setSession(updatedSession);
          setUser(updatedSession);
        }
      }
    }

    if (shouldUpdate('ams_academic_years')) setAcademicYears(StorageService.getAcademicYears());
    if (shouldUpdate('ams_school_info') || shouldUpdate('ams_school_admins')) setSchoolInfo(StorageService.getSchoolInfo());
    if (shouldUpdate('ams_students')) setStudents(StorageService.getStudents());
    if (shouldUpdate('ams_personnel')) setPersonnel(StorageService.getPersonnel());
    if (shouldUpdate('ams_daily_tracking')) setDailyTracking(StorageService.getDailyTracking());
    if (shouldUpdate('ams_subjects')) setSubjects(StorageService.getSubjects());
    if (shouldUpdate('ams_grades')) setGrades(StorageService.getGrades());
    if (shouldUpdate('ams_attendance')) setAttendance(StorageService.getAttendance());
    if (shouldUpdate('ams_attendance_config') || shouldUpdate('ams_attendance_configs_by_term')) {
      setAttendanceConfig(StorageService.getAttendanceConfig());
    }
    if (shouldUpdate('ams_savings')) setSavings(StorageService.getSavings());
    if (shouldUpdate('ams_tasks')) setTasks(StorageService.getTasks());
    if (shouldUpdate('ams_documents')) setDocuments(StorageService.getDocuments());
    if (shouldUpdate('ams_websites')) setWebsites(StorageService.getWebsites());
    if (shouldUpdate('ams_calendar')) setCalendarEvents(StorageService.getCalendarEvents());
    if (shouldUpdate('ams_custom_buttons')) setCustomButtons(StorageService.getCustomButtons());
    if (shouldUpdate('ams_google_config')) setGoogleConfig(StorageService.getGoogleConfig());
  };

  // Real-Time Cross-Device / Cross-Browser / Cross-Email Sync Engine
  useEffect(() => {
    StorageService.initRealtimeSync();
    const unsubscribe = StorageService.subscribe((changedKeys) => {
      reloadAllStates(changedKeys);
    });
    return () => {
      unsubscribe();
    };
  }, [user?.schoolId, user?.role]);

  // Auth Handlers
  const handleLogin = async (username: string, password: string) => {
    // Always pull latest cloud state before authenticating on any device/browser/PWA
    await Promise.race([
      StorageService.pullRemoteState(true),
      new Promise(resolve => setTimeout(resolve, 2200))
    ]);
    reloadAllStates();

    let res = StorageService.authenticate(username, password);

    // If authentication fails (e.g., freshly installed mobile PWA with empty/default localStorage or pending Cloud KV fetch),
    // await full authoritative account synchronization from Cloud KV, Server, and Master/School Google Sheets and retry
    if (!res.success) {
      await Promise.race([
        StorageService.syncAccountsForLogin(),
        new Promise(resolve => setTimeout(resolve, 7500))
      ]);
      reloadAllStates();
      res = StorageService.authenticate(username, password);
    }

    if (res.success && res.user) {
      setUser(res.user);
      setIsInspectingSchool(false);
      reloadAllStates();
      StorageService.pullRemoteState(true).then(() => {
        reloadAllStates();
      });
      showToast('success', 'เข้าสู่ระบบสำเร็จ', res.message);
    }
    return res;
  };

  const handleLogout = () => {
    StorageService.setSession(null);
    setUser(null);
    setIsInspectingSchool(false);
    showToast('info', 'ออกจากระบบแล้ว', 'ออกจากระบบสำเร็จ นำท่านสู่หน้าลงชื่อเข้าใช้งาน');
  };

  // 15-Minute Inactivity Auto-Logout Security Watcher (throttled to avoid mobile touch/scroll lag)
  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setTimeout>;
    let lastResetMs = 0;

    const resetInactivityTimer = () => {
      const now = Date.now();
      if (now - lastResetMs < 15000) return;
      lastResetMs = now;
      clearTimeout(timer);
      timer = setTimeout(() => {
        StorageService.setSession(null);
        setUser(null);
        setIsInspectingSchool(false);
        showToast('warning', 'เซสชันหมดอายุ', 'ระบบได้ออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งานเกิน 15 นาที เพื่อความปลอดภัย');
      }, 15 * 60 * 1000); // 15 minutes
    };

    const trackedEvents = ['pointerdown', 'keydown', 'touchstart'];
    trackedEvents.forEach(evt => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      clearTimeout(timer);
      trackedEvents.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [user]);

  // Sync with Google Sheets
  const handleSyncAll = async () => {
    setIsSyncing(true);
    const res = await StorageService.syncAllToGoogle();
    setIsSyncing(false);
    if (res.success) {
      setGoogleConfig(StorageService.getGoogleConfig());
      showToast('success', 'ซิงค์สำเร็จ', res.message);
    } else {
      showToast('warning', 'แจ้งเตือนการซิงค์', res.message);
    }
    return res;
  };

  // Reset to demo data
  const handleResetData = () => {
    StorageService.resetAllData();
    setUser(StorageService.getSession());
    setSchoolInfo(StorageService.getSchoolInfo());
    setAdmins(StorageService.getAdmins());
    setAcademicYears(StorageService.getAcademicYears());
    setMembers(StorageService.getMembers());
    setStudents(StorageService.getStudents());
    setPersonnel(StorageService.getPersonnel());
    setDailyTracking(StorageService.getDailyTracking());
    setSubjects(StorageService.getSubjects());
    setGrades(StorageService.getGrades());
    setAttendance(StorageService.getAttendance());
    setAttendanceConfig(StorageService.getAttendanceConfig());
    setSavings(StorageService.getSavings());
    setTasks(StorageService.getTasks());
    setDocuments(StorageService.getDocuments());
    setWebsites(StorageService.getWebsites());
    setCalendarEvents(StorageService.getCalendarEvents());
    setGoogleConfig(StorageService.getGoogleConfig());
  };

  // Check Developer Read-Only Guard
  const verifyCanEdit = (): boolean => {
    if (user?.role === 'developer') {
      showToast('warning', 'ไม่มีสิทธิ์แก้ไข', 'ระดับผู้พัฒนา (Developer) ไม่สามารถแก้ไขหรือบันทึกข้อมูลโรงเรียนได้');
      return false;
    }
    return true;
  };

  // Module 1 Handlers
  const handleSaveStudent = (student: Student) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveStudent(student);
    setStudents(updated);
  };

  const handleSaveBulkStudents = (updatedStudents: Student[]) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveBulkStudents(updatedStudents);
    setStudents(updated);
  };

  const handleDeleteStudent = (id: string) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.deleteStudent(id);
    setStudents(updated);
  };

  const handleSavePersonnel = (person: Personnel) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.savePersonnel(person);
    setPersonnel(updated);
  };

  const handleDeletePersonnel = (id: string) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.deletePersonnel(id);
    setPersonnel(updated);
  };

  const handleSaveSchoolInfo = (info: SchoolInfo) => {
    if (!verifyCanEdit()) return;
    StorageService.setSchoolInfo(info);
    setSchoolInfo(info);
  };

  const handleSaveDailyTracking = (rec: DailyTracking) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveDailyTracking(rec);
    setDailyTracking(updated);
  };

  // Module 2 Handlers
  const handleSaveSubject = (subject: Subject) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveSubject(subject);
    setSubjects(updated);
  };

  const handleDeleteSubject = (id: string) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.deleteSubject(id);
    setSubjects(updated);
    setGrades(StorageService.getGrades());
  };

  const handleSaveBulkSubjects = (newSubs: Subject[]) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveBulkSubjects(newSubs);
    setSubjects(updated);
  };

  const handleUpdateSubjectsList = (updatedSubs: Subject[]) => {
    if (!verifyCanEdit()) return;
    setSubjects(updatedSubs);
  };

  const handleSaveBulkGrades = (newGrades: GradeRecord[]) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveBulkGrades(newGrades);
    setGrades(updated);
  };

  // Module 3 Handlers
  const handleSaveBulkAttendance = (records: AttendanceRecord[]) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveBulkAttendance(records);
    setAttendance(updated);
  };

  const handleSaveSavingsRecord = (rec: Omit<SavingsRecord, 'balanceAfter'>) => {
    if (!verifyCanEdit()) {
      const dummy: SavingsRecord = {
        ...rec,
        balanceAfter: 0
      };
      return {
        record: dummy,
        updated: savings
      };
    }
    const res = StorageService.saveSavingsRecord(rec);
    setSavings(res.updated);
    return res;
  };

  const handleDeleteSavingsRecord = (id: string) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.deleteSavingsRecord(id);
    setSavings(updated);
  };

  const handleUpdateAllSavings = (records: SavingsRecord[]) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.setAllSavings(records);
    setSavings(updated);
  };

  const handleSaveAttendanceConfig = (cfg: AttendanceDayConfig) => {
    if (!verifyCanEdit()) return;
    StorageService.setAttendanceConfig(cfg);
    setAttendanceConfig(cfg);
  };

  // Module 4 Handlers
  const handleSaveTask = (task: TaskItem) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveTask(task);
    setTasks(updated);
  };

  // "Tasks disappear immediately once completed/submitted."
  const handleCompleteTask = (id: string) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.completeTask(id);
    setTasks(updated);
    showToast('success', 'ส่งงานสำเร็จ 🎉', 'ส่งภาระงานเรียบร้อยแล้ว รายการจะถูกนำออกจากวิดเจ็ตทันที');
  };

  const handleDeleteTask = (id: string) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.deleteTask(id);
    setTasks(updated);
    setCalendarEvents(StorageService.getCalendarEvents());
  };

  const handleReorderTasks = (newTasks: TaskItem[]) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.reorderTasks(newTasks);
    setTasks(updated);
  };

  // Module 5 Handlers
  const handleSaveDocument = (doc: DocumentItem) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveDocument(doc);
    setDocuments(updated);
  };

  const handleDeleteDocument = (id: string) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.deleteDocument(id);
    setDocuments(updated);
  };

  const handleReorderDocuments = (newDocs: DocumentItem[]) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.reorderDocuments(newDocs);
    setDocuments(updated);
  };

  // Module 6 Handlers
  const handleSaveWebsite = (site: RecommendedWebsite) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveWebsite(site);
    setWebsites(updated);
  };

  const handleDeleteWebsite = (id: string) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.deleteWebsite(id);
    setWebsites(updated);
  };

  const handleReorderWebsites = (newWebsites: RecommendedWebsite[]) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.reorderWebsites(newWebsites);
    setWebsites(updated);
  };

  // Calendar Event Handlers
  const handleSaveCalendarEvent = (event: CalendarEvent) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveCalendarEvent(event);
    setCalendarEvents(updated);
    showToast('success', 'ปฏิทินวิชาการ', `บันทึก "${event.title}" และเชื่อมโยงข้อมูลเรียบร้อยแล้ว`);
  };

  const handleDeleteCalendarEvent = (id: string) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.deleteCalendarEvent(id);
    setCalendarEvents(updated);
    setTasks(StorageService.getTasks());
    showToast('info', 'ปฏิทินวิชาการ', 'ลบรายการในปฏิทินและรายการที่เชื่อมโยงในหน้ามอบหมายเรียบร้อยแล้ว');
  };

  // Custom Buttons Handlers (Admin & Member future-ready dynamic buttons)
  const handleSaveCustomButton = (btn: CustomButton) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveCustomButton(btn);
    setCustomButtons(updated);
    showToast('success', 'บันทึกปุ่มใหม่แล้ว', `บันทึกปุ่ม "${btn.label}" และส่งซิงค์ลง Google Sheets เรียบร้อยแล้ว`);
  };

  const handleDeleteCustomButton = (id: string) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.deleteCustomButton(id);
    setCustomButtons(updated);
    showToast('info', 'ลบปุ่มแล้ว', 'ลบปุ่มออกจากระบบและสั่งลบแถวออกจาก Google Sheets เรียบร้อย');
  };

  // Member & User Session management handlers
  const handleSaveUserSession = (updatedUser: UserSession) => {
    if (!verifyCanEdit()) return;
    StorageService.setSession(updatedUser);
    setUser(updatedUser);
  };

  const handleSaveMember = (mem: MemberAccount) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.saveMember(mem);
    setMembers(updated);
  };

  const handleDeleteMember = (id: string) => {
    if (!verifyCanEdit()) return;
    const updated = StorageService.deleteMember(id);
    setMembers(updated);
  };

  const handleSaveGoogleConfig = (cfg: GoogleConfig) => {
    if (!verifyCanEdit()) return;
    StorageService.setGoogleConfig(cfg);
    setGoogleConfig(cfg);
  };

  const handleTestConnection = async (url: string, driveFolderId?: string) => {
    return await StorageService.testGoogleConnection(url, driveFolderId);
  };

  const currentUserSchoolIdForTasks = user ? StorageService.getNormalizedSchoolId(user.schoolId, user.schoolName) : '';
  const currentSchoolAdminForAccess = user && user.role !== 'developer'
    ? admins.find(
        a =>
          StorageService.getNormalizedSchoolId(a.id, a.schoolName) === currentUserSchoolIdForTasks ||
          a.id === currentUserSchoolIdForTasks
      )
    : undefined;
  const disableAssignments = Boolean(currentSchoolAdminForAccess?.disableAssignments);
  const disableDocuments = Boolean(currentSchoolAdminForAccess?.disableDocuments);

  // Auto-redirect away from assignments or documents if Developer turns it OFF in real-time
  useEffect(() => {
    if (!user || user.role === 'developer') return;
    if (activeTab === 'assignments' && disableAssignments) {
      setActiveTab('dashboard');
      setPreviousTab('dashboard');
      showToast(
        'warning',
        'หน้ามอบหมายถูกปิดใช้งาน (OFF)',
        'ผู้พัฒนาระบบได้ปิดการใช้งานหน้ามอบหมายสำหรับโรงเรียนของท่าน'
      );
    } else if (activeTab === 'documents' && disableDocuments) {
      setActiveTab('dashboard');
      setPreviousTab('dashboard');
      showToast(
        'warning',
        'หน้าศูนย์เอกสารถูกปิดใช้งาน (OFF)',
        'ผู้พัฒนาระบบได้ปิดการใช้งานหน้าศูนย์เอกสารสำหรับโรงเรียนของท่าน'
      );
    }
  }, [activeTab, disableAssignments, disableDocuments, user?.id, user?.role]);

  const schoolMembersForTasks = useMemo(() => {
    return (currentUserSchoolIdForTasks
      ? members.filter(m => StorageService.getNormalizedSchoolId(m.schoolId, m.schoolName) === currentUserSchoolIdForTasks)
      : members
    ).filter(m => m.role !== 'admin');
  }, [members, currentUserSchoolIdForTasks]);

  const totalSchoolMembersCount = schoolMembersForTasks.length > 0 ? schoolMembersForTasks.length : 1;

  const pendingTasksCount = useMemo(() => {
    if (disableAssignments) return 0;
    return tasks.filter(t => {
      if (t.type === 'announcement') return false;
      if (t.isManualCompleted) return false;
      if (user?.role === 'member') {
        const hasSubmitted =
          (t.submissions || []).some(s => s.memberId === user.id || (user.fullName && s.memberName === user.fullName)) ||
          t.submittedBy === user.id;
        return !hasSubmitted;
      }
      const submittedCount = new Set(
        (t.submissions || [])
          .filter(s => s && (s.memberId || s.memberName))
          .map(s => String(s.memberId || s.memberName).trim().toLowerCase())
      ).size;
      return submittedCount < totalSchoolMembersCount;
    }).length;
  }, [tasks, disableAssignments, user?.role, user?.id, user?.fullName, totalSchoolMembersCount]);

  // Header quick statistics
  const attendanceRate = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === todayStr);
    const presentCount = todayAttendance.filter(a => a.status === 'present').length;
    return todayAttendance.length > 0
      ? Math.round((presentCount / todayAttendance.length) * 100)
      : 100;
  }, [attendance]);

  const handleSelectTab = (tab: NavTab) => {
    if (tab === 'assignments' && disableAssignments) {
      showToast(
        'warning',
        'หน้านี้ถูกปิดการใช้งาน (OFF)',
        'หน้ามอบหมายของโรงเรียนนี้ถูกปิดการใช้งาน (OFF) โดยผู้พัฒนาระบบ'
      );
      return;
    }
    if (tab === 'documents' && disableDocuments) {
      showToast(
        'warning',
        'หน้านี้ถูกปิดการใช้งาน (OFF)',
        'หน้าศูนย์เอกสารของโรงเรียนนี้ถูกปิดการใช้งาน (OFF) โดยผู้พัฒนาระบบ'
      );
      return;
    }
    if (tab !== 'settings') {
      setPreviousTab(tab);
    }
    setActiveTab(tab);
  };

  const effectiveTab = activeTab === 'settings' ? previousTab : activeTab;

  // Production Login Screen (Strictly Pure White Background)
  if (!user) {
    return (
      <>
        <LoginPage
          onLogin={handleLogin}
        />
        <Toast toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  // Level 1: Developer Console View (STRICT SECURITY CONSTRAINT: Developer can NEVER enter Admin/School workspace)
  if (user.role === 'developer') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        <DeveloperConsole
          currentUser={user}
          admins={admins}
          members={members}
          academicYears={academicYears}
          googleConfig={googleConfig}
          onSaveGoogleConfig={handleSaveGoogleConfig}
          onTestConnection={handleTestConnection}
          onSyncAll={handleSyncAll}
          onResetData={handleResetData}
          onRefreshData={() => {
            setAdmins(StorageService.getAdmins());
            setMembers(StorageService.getMembers());
            setAcademicYears(StorageService.getAcademicYears());
            setGoogleConfig(StorageService.getGoogleConfig());
          }}
          onLogout={handleLogout}
          onShowToast={showToast}
        />

        {/* Floating Action Toasts */}
        <Toast toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    );
  }

  // Multi-Tenant Isolation: Filter members strictly belonging to the logged-in Admin/Member's school
  const currentUserSchoolId = StorageService.getNormalizedSchoolId(user.schoolId, user.schoolName);
  const tenantMembers = useMemo(() => {
    return currentUserSchoolId
      ? members.filter(m => {
          const memberSchoolId = StorageService.getNormalizedSchoolId(m.schoolId, m.schoolName);
          return memberSchoolId === currentUserSchoolId;
        })
      : members;
  }, [members, currentUserSchoolId]);

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col text-slate-800">
      {/* Dynamic Header */}
      <Header
        schoolInfo={schoolInfo}
        user={user}
        googleConfig={googleConfig}
        studentsCount={students.length}
        personnelCount={personnel.length}
        attendanceRate={attendanceRate}
        onOpenSettings={() => handleSelectTab('settings')}
        onLogout={handleLogout}
        onSyncAll={handleSyncAll}
        isSyncing={isSyncing}
        isInspectingSchool={false}
        onReturnToDevConsole={() => {}}
      />

      {/* Top Navigation Bar: Always visible across all tabs */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        pendingTasksCount={pendingTasksCount}
        user={user}
        disableAssignments={disableAssignments}
        disableDocuments={disableDocuments}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-6 pb-36 sm:pb-6">
        {effectiveTab === 'dashboard' && (
          <DashboardView
            user={user}
            schoolInfo={schoolInfo}
            calendarEvents={calendarEvents}
            tasks={tasks}
            students={students}
            personnel={personnel}
            members={tenantMembers}
            savings={savings}
            attendance={attendance}
            onCompleteTask={handleCompleteTask}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            onShowToast={showToast}
            onSaveCalendarEvent={handleSaveCalendarEvent}
            onDeleteCalendarEvent={handleDeleteCalendarEvent}
            onNavigateToTab={handleSelectTab}
            customButtons={customButtons}
            onSaveCustomButton={handleSaveCustomButton}
            onDeleteCustomButton={handleDeleteCustomButton}
            disableAssignments={disableAssignments}
          />
        )}

        {effectiveTab === 'classroom' && (
          <Module1ClassroomAdmin
            user={user}
            students={students}
            dailyTracking={dailyTracking}
            onSaveDailyTracking={handleSaveDailyTracking}
            onShowToast={showToast}
            schoolInfo={schoolInfo}
            personnel={personnel}
            members={tenantMembers}
          />
        )}

        {effectiveTab === 'data_others' && (
          <ModuleDataOthers
            user={user}
            students={students}
            attendance={attendance}
            personnel={personnel}
            schoolInfo={schoolInfo}
            onSaveStudent={handleSaveStudent}
            onSaveBulkStudents={handleSaveBulkStudents}
            onDeleteStudent={handleDeleteStudent}
            onSavePersonnel={handleSavePersonnel}
            onDeletePersonnel={handleDeletePersonnel}
            onSaveSchoolInfo={handleSaveSchoolInfo}
            onOpenLightbox={handleOpenLightbox}
            onShowToast={showToast}
          />
        )}

        {effectiveTab === 'grading' && (
          <Module2Grading
            user={user}
            subjects={subjects}
            grades={grades}
            students={students}
            members={tenantMembers}
            academicYear={schoolInfo.academicYear}
            semester={schoolInfo.semester}
            attendance={attendance}
            attendanceConfig={attendanceConfig}
            onSemesterChange={(newSem) => {
              setSchoolInfo(prev => {
                const updated = { ...prev, semester: newSem };
                StorageService.setSchoolInfo(updated);
                return updated;
              });
            }}
            onAcademicYearChange={(newYear) => {
              setSchoolInfo(prev => {
                const updated = { ...prev, academicYear: newYear };
                StorageService.setSchoolInfo(updated);
                return updated;
              });
            }}
            onSaveSubject={handleSaveSubject}
            onSaveBulkSubjects={handleSaveBulkSubjects}
            onUpdateSubjectsList={handleUpdateSubjectsList}
            onDeleteSubject={handleDeleteSubject}
            onSaveBulkGrades={handleSaveBulkGrades}
            onSaveBulkAttendance={handleSaveBulkAttendance}
            onShowToast={showToast}
          />
        )}

        {effectiveTab === 'attendance_savings' && (
          <Module3AttendanceSavings
            user={user}
            schoolInfo={schoolInfo}
            students={students}
            attendance={attendance}
            savings={savings}
            attendanceConfig={attendanceConfig}
            members={tenantMembers}
            onSaveBulkAttendance={handleSaveBulkAttendance}
            onSaveSavingsRecord={handleSaveSavingsRecord}
            onDeleteSavingsRecord={handleDeleteSavingsRecord}
            onUpdateAllSavings={handleUpdateAllSavings}
            onSaveAttendanceConfig={handleSaveAttendanceConfig}
            onShowToast={showToast}
          />
        )}

        {effectiveTab === 'assignments' && !disableAssignments && (
          <Module4Assignments
            user={user}
            tasks={tasks}
            members={tenantMembers}
            academicYear={schoolInfo.academicYear}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            onCompleteTask={handleCompleteTask}
            onReorderTasks={handleReorderTasks}
            onShowToast={showToast}
          />
        )}

        {effectiveTab === 'documents' && !disableDocuments && (
          <Module5Documents
            user={user}
            documents={documents}
            googleConfig={googleConfig}
            academicYear={schoolInfo.academicYear}
            onSaveDocument={handleSaveDocument}
            onDeleteDocument={handleDeleteDocument}
            onReorderDocuments={handleReorderDocuments}
            onShowToast={showToast}
          />
        )}

        {effectiveTab === 'websites' && (
          <Module6Websites
            user={user}
            websites={websites}
            onSaveWebsite={handleSaveWebsite}
            onDeleteWebsite={handleDeleteWebsite}
            onReorderWebsites={handleReorderWebsites}
            onShowToast={showToast}
          />
        )}

        {effectiveTab === 'reports' && (
          <Module7Reports
            user={user}
            students={students}
            personnel={personnel}
            schoolInfo={schoolInfo}
            subjects={subjects}
            grades={grades}
            attendance={attendance}
            savings={savings}
            dailyTracking={dailyTracking}
            onShowToast={showToast}
            onOpenLightbox={handleOpenLightbox}
          />
        )}
      </main>

      {/* Pop-up Settings Modal */}
      {activeTab === 'settings' && (
        <SettingsView
          user={user}
          schoolInfo={schoolInfo}
          members={tenantMembers}
          students={students}
          onClose={() => setActiveTab(previousTab || 'dashboard')}
          onSaveSchoolInfo={handleSaveSchoolInfo}
          onSaveMember={handleSaveMember}
          onDeleteMember={handleDeleteMember}
          onShowToast={showToast}
          onSaveUserSession={handleSaveUserSession}
          onLogout={handleLogout}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-4 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{schoolInfo.schoolName} • ระบบบริหารจัดการงานวิชาการและธุรการ</span>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Database: Google Sheets & Google Drive</span>
            <span>·</span>
            <button
              onClick={() => setActiveTab('settings')}
              className="text-indigo-600 hover:underline"
            >
              ตั้งค่าระบบ
            </button>
          </div>
        </div>
      </footer>


      {/* Lightbox Modal */}
      <LightboxModal
        isOpen={lightboxState.isOpen}
        imageUrl={lightboxState.imageUrl}
        title={lightboxState.title}
        subtitle={lightboxState.subtitle}
        onClose={() => setLightboxState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Floating Action Toasts */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
