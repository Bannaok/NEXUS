import React, { useState } from 'react';
import { 
  CalendarEvent, 
  TaskItem, 
  UserSession, 
  Student, 
  Personnel, 
  SavingsRecord,
  AttendanceRecord,
  SchoolInfo,
  CustomButton,
  MemberAccount,
  TaskSubmission
} from '../types';
import { StorageService } from '../services/storage';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Paperclip, 
  Trash2, 
  Flame,
  Check,
  Bell,
  ClipboardList,
  Tag,
  Megaphone,
  ExternalLink,
  ArrowRight,
  Lock,
  Globe,
  Shield,
  Layers,
  Sparkles,
  Upload
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface DashboardViewProps {
  user: UserSession;
  schoolInfo?: SchoolInfo;
  calendarEvents: CalendarEvent[];
  tasks: TaskItem[];
  students: Student[];
  personnel: Personnel[];
  members?: MemberAccount[];
  savings: SavingsRecord[];
  attendance: AttendanceRecord[];
  customButtons?: CustomButton[];
  onCompleteTask: (taskId: string) => void;
  onSaveTask?: (task: TaskItem) => void;
  onDeleteTask?: (id: string) => void;
  onShowToast?: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  onSaveCalendarEvent: (event: CalendarEvent) => void;
  onDeleteCalendarEvent: (eventId: string) => void;
  onNavigateToTab: (tab: any) => void;
  onSaveCustomButton?: (btn: CustomButton) => void;
  onDeleteCustomButton?: (id: string) => void;
  disableAssignments?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  schoolInfo,
  calendarEvents,
  tasks,
  students,
  personnel,
  members = [],
  savings,
  attendance,
  customButtons = [],
  onCompleteTask,
  onSaveTask,
  onDeleteTask,
  onShowToast,
  onSaveCalendarEvent,
  onDeleteCalendarEvent,
  onNavigateToTab,
  onSaveCustomButton,
  onDeleteCustomButton,
  disableAssignments = false
}) => {
  // Custom Buttons State
  const [isAddButtonModalOpen, setIsAddButtonModalOpen] = useState(false);
  const [newBtnLabel, setNewBtnLabel] = useState('');
  const [newBtnUrl, setNewBtnUrl] = useState('');
  const [newBtnCategory, setNewBtnCategory] = useState('ระบบงานทั่วไป');
  const [newBtnColor, setNewBtnColor] = useState('indigo');
  const [newBtnRole, setNewBtnRole] = useState<'all' | 'admin' | 'member'>('all');
  const [newBtnOpenNewTab, setNewBtnOpenNewTab] = useState(true);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ 
    dateStr: string; 
    events: CalendarEvent[];
    announcements: TaskItem[];
    assignments: TaskItem[];
  } | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  // Confirmation modal state when deleting an item from the Academic Calendar
  const [confirmDeleteCalendarModal, setConfirmDeleteCalendarModal] = useState<{
    mode: 'event' | 'task';
    id: string;
    title: string;
    categoryLabel: string;
  } | null>(null);
  
  // Specific event fields matching user prompt: เป็นวันอะไร / แจ้งอะไร / ให้ส่งงานอะไร (สอดคล้อง-เชื่อมกับ หน้ามอบหมาย)
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventAnnouncement, setNewEventAnnouncement] = useState('');
  const [newEventSyncAnnouncement, setNewEventSyncAnnouncement] = useState(true);
  const [newEventTaskDue, setNewEventTaskDue] = useState('');
  const [newEventTaskPriority, setNewEventTaskPriority] = useState<'urgent' | 'high' | 'normal'>('normal');
  const [newEventSyncTask, setNewEventSyncTask] = useState(true);
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventType, setNewEventType] = useState<'academic' | 'holiday' | 'exam' | 'activity' | 'meeting'>('activity');

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Days in month calculation
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  // Submission Modal State for "งานที่ต้องส่ง"
  const [taskToSubmit, setTaskToSubmit] = useState<TaskItem | null>(null);
  const [submitFile, setSubmitFile] = useState<{
    id?: string;
    name: string;
    url: string;
    size: string;
    hostedUrl?: string;
    driveFileId?: string;
    downloadUrl?: string;
  } | null>(null);
  const [isUploadingSubmit, setIsUploadingSubmit] = useState(false);

  const handleFileChangeForSubmission = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      if (onShowToast) {
        onShowToast('warning', 'ขนาดไฟล์เกิน 5MB', 'กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB');
      }
      e.target.value = '';
      return;
    }

    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeStr = sizeInMB + ' MB';
    const fileIndexId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const deterministicHostedUrl = `/api/files/${fileIndexId}`;

    setIsUploadingSubmit(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      let hostedUrl = deterministicHostedUrl;
      let driveFileId = '';
      let driveUrl = '';
      let downloadUrl = deterministicHostedUrl;

      try {
        const res = await fetch('/api/files/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: fileIndexId,
            fileName: file.name,
            dataUrl: base64,
            schoolId: user.schoolId,
            category: `TaskSubmissions_${taskToSubmit?.academicYear || schoolInfo?.academicYear || '2569'}`,
            uploadedBy: user.fullName || user.id,
            uploadToDrive: true,
            taskId: taskToSubmit?.id || 'task',
            memberId: user.id
          })
        });
        if (res.ok) {
          const data = await res.json();
          hostedUrl = data?.url || deterministicHostedUrl;
          driveFileId = data?.driveFileId || '';
          driveUrl = data?.driveUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing` : '');
          downloadUrl = data?.downloadUrl || hostedUrl;
        }
      } catch {
        // Fallback to local
      }

      const bestUrl = driveUrl || hostedUrl || base64;
      setSubmitFile({
        id: fileIndexId,
        name: file.name,
        url: bestUrl,
        size: sizeStr,
        hostedUrl,
        driveFileId: driveFileId || undefined,
        downloadUrl
      });
      setIsUploadingSubmit(false);
      if (onShowToast) {
        onShowToast('info', 'อัปโหลดไฟล์เรียบร้อย', `พร้อมส่งไฟล์ "${file.name}" (${sizeStr}) กดยืนยันส่งงานได้ทันที`);
      }
    };
    reader.onerror = () => {
      setIsUploadingSubmit(false);
      if (onShowToast) {
        onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้ โปรดลองอีกครั้ง');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToSubmit) return;

    if (!submitFile) {
      if (onShowToast) {
        onShowToast('warning', 'โปรดแนบไฟล์งาน', 'กรุณาเลือกหรืออัปโหลดไฟล์งานก่อนกดยืนยันส่ง');
      }
      return;
    }

    setIsUploadingSubmit(true);
    let finalFileUrl = submitFile.url || submitFile.hostedUrl || '';
    try {
      if (finalFileUrl.startsWith('data:')) {
        const uploadedUrl = await StorageService.uploadFileToGoogleDrive(
          finalFileUrl,
          submitFile.name,
          `TaskSubmissions_${taskToSubmit.academicYear || schoolInfo?.academicYear || '2569'}`
        );
        if (uploadedUrl && uploadedUrl.startsWith('http')) {
          finalFileUrl = uploadedUrl;
        }
      }
    } catch {
      // Keep local url if offline
    } finally {
      setIsUploadingSubmit(false);
    }

    const nowIso = new Date().toISOString();
    const newSub: TaskSubmission = {
      id: submitFile.id || `sub_${Date.now()}`,
      memberId: user.id,
      memberName: user.fullName || user.username,
      fileUrl: finalFileUrl,
      fileName: submitFile.name,
      fileSize: submitFile.size,
      driveFileId: submitFile.driveFileId,
      localHostedUrl: submitFile.hostedUrl,
      downloadUrl: submitFile.downloadUrl || finalFileUrl,
      submittedAt: nowIso
    };

    const currentSubs = taskToSubmit.submissions || [];
    const updatedSubs = [
      ...currentSubs.filter(
        s =>
          !(
            (s.memberId === user.id ||
              (user.username && s.memberId?.toLowerCase() === user.username.toLowerCase()) ||
              s.memberName === user.fullName) &&
            s.fileName === submitFile.name
          )
      ),
      newSub
    ];

    const nextDeletedMap = { ...(taskToSubmit.deletedSubmissionsMap || {}) };
    delete nextDeletedMap[user.id];
    delete nextDeletedMap[user.id.toLowerCase()];
    if (user.username) {
      delete nextDeletedMap[user.username];
      delete nextDeletedMap[user.username.toLowerCase()];
    }
    if (user.fullName) {
      delete nextDeletedMap[user.fullName];
      delete nextDeletedMap[user.fullName.toLowerCase()];
    }
    delete nextDeletedMap[submitFile.name];
    delete nextDeletedMap[`${user.id}_${submitFile.name}`];

    const schoolMembers = (members || []).filter(m => m.role !== 'admin');
    const totalMembersCountForSubmit = schoolMembers.length > 0 ? schoolMembers.length : 1;
    const uniqueSubMembers = new Set(
      updatedSubs
        .filter(s => s && (s.memberId || s.memberName))
        .map(s => String(s.memberId || s.memberName).trim().toLowerCase())
    );
    const isNowAllSubmitted = uniqueSubMembers.size >= totalMembersCountForSubmit;

    const updatedTask: TaskItem = {
      ...taskToSubmit,
      submissions: updatedSubs,
      deletedSubmissionsMap: Object.keys(nextDeletedMap).length > 0 ? nextDeletedMap : undefined,
      isCompleted: isNowAllSubmitted,
      submittedFileUrl: finalFileUrl || undefined,
      submittedFileName: submitFile.name,
      submittedFileSize: submitFile.size,
      submittedBy: user.id,
      submittedByName: user.fullName || user.username,
      submittedAt: nowIso
    };

    if (onSaveTask) {
      onSaveTask(updatedTask);
    }

    if (onShowToast) {
      onShowToast(
        'success',
        'ส่งงานสำเร็จ 🎉',
        `ส่งไฟล์ "${submitFile.name}" เรียบร้อยแล้ว รายการนี้ย้ายไปแสดงด้านล่างสุด (สีเขียว) ในหน้ามอบหมายแจ้งให้ทราบ`
      );
    }

    setTaskToSubmit(null);
    setSubmitFile(null);
  };

  // Filter tasks for Dashboard "งานที่ต้องส่ง":
  // - For Member: shows task ONLY IF this member hasn't submitted yet (disappears immediately when submitted, moves to bottom of Assignments page in green)
  // - For Admin: shows task UNTIL all school members have submitted (disappears immediately when all members have submitted, moves to bottom of Assignments page in green)
  const schoolMembersList = (members || []).filter(m => m.role !== 'admin');
  const totalMembersCount = schoolMembersList.length > 0 ? schoolMembersList.length : 1;

  const activeAcademicYear = schoolInfo?.academicYear || '2569';
  const isTaskInYear = (task: TaskItem, yr: string = activeAcademicYear) => {
    if (task.academicYear) {
      return task.academicYear === yr;
    }
    if (task.dueDate) {
      if (task.dueDate.includes(yr)) return true;
      const gregYear = String(Number(yr) - 543);
      if (!isNaN(Number(yr)) && task.dueDate.includes(gregYear)) return true;
      return false;
    }
    return yr === '2569' || yr === '2568';
  };

  const visibleTasks = tasks.filter(t => {
    if (!isTaskInYear(t, activeAcademicYear)) return false;
    if (t.type === 'announcement') return false;
    if (t.isManualCompleted) return false;

    if (user.role === 'member') {
      const hasMemberSubmitted =
        (t.submissions && t.submissions.some(s => s.memberId === user.id || (user.fullName && s.memberName === user.fullName))) ||
        t.submittedBy === user.id;
      return !hasMemberSubmitted;
    } else {
      const uniqueSubmittedCount = new Set(
        (t.submissions || [])
          .filter(s => s && (s.memberId || s.memberName))
          .map(s => String(s.memberId || s.memberName).trim().toLowerCase())
      ).size;
      return uniqueSubmittedCount < totalMembersCount;
    }
  });

  const monthShortNamesThai = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return `${d} ${monthNamesThai[m]} พ.ศ. ${y + 543}`;
      }
    } catch {
      return dateStr;
    }
    return dateStr;
  };

  const formatThaiDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return `${d} ${monthShortNamesThai[m]} พ.ศ. ${y + 543}`;
      }
    } catch {
      return dateStr;
    }
    return dateStr;
  };

  // Helper to check if a task's dueDate matches or covers dateStr
  const isTaskOnDate = (task: TaskItem, dateStr: string) => {
    if (!task.dueDate) return false;
    if (task.dueDate.includes(' ถึง ')) {
      const parts = task.dueDate.split(' ถึง ').map(s => s.trim());
      if (parts.length === 2) {
        return dateStr >= parts[0] && dateStr <= parts[1];
      }
    }
    return task.dueDate === dateStr;
  };

  const handleOpenAddForDate = (dateStr?: string) => {
    if (dateStr) {
      setNewEventDate(dateStr);
    } else {
      setNewEventDate(new Date().toISOString().split('T')[0]);
    }
    setNewEventTitle('');
    setNewEventAnnouncement('');
    setNewEventSyncAnnouncement(true);
    setNewEventTaskDue('');
    setNewEventTaskPriority('normal');
    setNewEventSyncTask(true);
    setNewEventDesc('');
    setNewEventType('activity');
    setIsAddEventOpen(true);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    
    const titleToSave = newEventTitle.trim() || 
      (newEventTaskDue.trim() ? `กำหนดส่ง: ${newEventTaskDue.trim()}` : 
      (newEventAnnouncement.trim() ? `แจ้ง: ${newEventAnnouncement.trim().slice(0, 30)}` : ''));
      
    if (!titleToSave && !newEventAnnouncement.trim() && !newEventTaskDue.trim()) {
      if (onShowToast) {
        onShowToast('warning', 'กรุณาระบุข้อมูล', 'โปรดระบุมอบหมายงาน หรือประกาศใหม่ อย่างน้อย 1 รายการ');
      }
      return;
    }

    const finalTitle = titleToSave || 'กิจกรรม/นัดหมาย';

    const colors: Record<string, string> = {
      academic: '#2563EB',
      holiday: '#059669',
      exam: '#DC2626',
      activity: '#7C3AED',
      meeting: '#D97706'
    };

    const now = Date.now();
    const eventId = 'cal-' + now;
    const linkedTaskIds: string[] = [];
    let syncedCount = 0;

    // 1. สอดคล้อง-เชื่อมกับ หน้ามอบหมาย: หมวด "2. ประกาศใหม่" -> บันทึกเป็น TaskItem (type: 'announcement') ในหน้ามอบหมายเสมอ
    if (newEventAnnouncement.trim() && onSaveTask) {
      const annTitle = newEventTitle.trim() || newEventAnnouncement.trim().slice(0, 60);
      const annTask: TaskItem = {
        id: 'task-ann-' + now,
        title: annTitle,
        description: newEventAnnouncement.trim(),
        dueDate: newEventDate,
        type: 'announcement',
        academicYear: activeAcademicYear,
        priority: 'normal',
        createdBy: user.fullName || user.username || 'สมาชิก',
        createdAt: new Date().toISOString(),
        assignedTo: 'all',
        calendarEventId: eventId
      };
      linkedTaskIds.push(annTask.id);
      onSaveTask(annTask);
      syncedCount++;
    }

    // 2. สอดคล้อง-เชื่อมกับ หน้ามอบหมาย: หมวด "1. มอบหมายงาน" -> บันทึกเป็น TaskItem (type: 'assignment') ในหน้ามอบหมายเสมอ
    if (newEventTaskDue.trim() && onSaveTask) {
      const assignTask: TaskItem = {
        id: 'task-assn-' + (now + 1),
        title: newEventTaskDue.trim(),
        description: newEventAnnouncement.trim()
          ? `เนื่องใน: ${finalTitle} - ${newEventAnnouncement.trim()}`
          : '',
        dueDate: newEventDate,
        type: 'assignment',
        academicYear: activeAcademicYear,
        priority: newEventTaskPriority,
        createdBy: user.fullName || user.username || 'สมาชิก',
        createdAt: new Date().toISOString(),
        assignedTo: 'all',
        isCompleted: false,
        submissions: [],
        calendarEventId: eventId
      };
      linkedTaskIds.push(assignTask.id);
      onSaveTask(assignTask);
      syncedCount++;
    }

    // กรณีระบุเฉพาะหัวข้อกิจกรรมอย่างเดียว ให้เชื่อมไปหน้ามอบหมายด้วยเช่นกัน
    if (!newEventAnnouncement.trim() && !newEventTaskDue.trim() && finalTitle && onSaveTask) {
      const fallbackTask: TaskItem = {
        id: 'task-cal-' + now,
        title: finalTitle,
        description: newEventDesc.trim() || '',
        dueDate: newEventDate,
        type: 'assignment',
        academicYear: activeAcademicYear,
        priority: newEventTaskPriority,
        createdBy: user.fullName || user.username || 'สมาชิก',
        createdAt: new Date().toISOString(),
        assignedTo: 'all',
        isCompleted: false,
        submissions: [],
        calendarEventId: eventId
      };
      linkedTaskIds.push(fallbackTask.id);
      onSaveTask(fallbackTask);
      syncedCount++;
    }

    // 3. บันทึกลงปฏิทินวิชาการ (CalendarEvent) พร้อมผูก linkedTaskIds
    const newEvent: CalendarEvent = {
      id: eventId,
      title: finalTitle,
      description: newEventAnnouncement.trim() || newEventTaskDue.trim() || '',
      date: newEventDate,
      type: newEventType,
      color: colors[newEventType] || '#4F46E5',
      announcement: newEventAnnouncement.trim() || undefined,
      taskDue: newEventTaskDue.trim() || undefined,
      taskPriority: newEventTaskDue.trim() ? newEventTaskPriority : undefined,
      linkedTaskIds
    };

    onSaveCalendarEvent(newEvent);

    if (onShowToast) {
      onShowToast(
        'success', 
        'บันทึกและเชื่อมลิงก์เรียบร้อย', 
        `บันทึกรายการวันที่ ${formatThaiDate(newEventDate)} และเชื่อมลิงก์ไปยังหน้ามอบหมาย (${syncedCount} รายการ) แล้ว`
      );
    }

    setIsAddEventOpen(false);
    setNewEventTitle('');
    setNewEventAnnouncement('');
    setNewEventTaskDue('');
    setNewEventDesc('');
  };

  const filteredCustomButtons = customButtons.filter(btn => {
    if (!btn.targetRole || btn.targetRole === 'all') return true;
    if (btn.targetRole === 'admin') return user.role === 'admin' || user.role === 'developer';
    if (btn.targetRole === 'member') return user.role === 'member' || user.role === 'admin' || user.role === 'developer';
    return true;
  });

  const handleCreateCustomButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBtnLabel.trim() || !newBtnUrl.trim()) return;

    let targetUrl = newBtnUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const newBtn: CustomButton = {
      id: 'btn-' + Date.now(),
      label: newBtnLabel.trim(),
      actionUrl: targetUrl,
      category: newBtnCategory.trim() || 'ระบบงานทั่วไป',
      color: newBtnColor,
      targetRole: newBtnRole,
      openInNewTab: newBtnOpenNewTab,
      order: (customButtons.length || 0) + 1,
      schoolId: user.schoolId || '',
      createdBy: user.fullName || user.username,
      createdAt: new Date().toISOString()
    };

    if (onSaveCustomButton) {
      onSaveCustomButton(newBtn);
    }

    setIsAddButtonModalOpen(false);
    setNewBtnLabel('');
    setNewBtnUrl('');
  };

  return (
    <div className="space-y-6">
      {/* Main Grid: Interactive Calendar (Left) + Pending Tasks Widget (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Interactive Calendar (7 Cols on LG) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-800 leading-tight">
                    ปฏิทินวิชาการ
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center gap-1" title="กำหนดโดย Admin">
                    <Lock className="w-2.5 h-2.5 text-indigo-500" />
                    <span>ปีการศึกษา {schoolInfo?.academicYear || '2569'} ภาคเรียนที่ {schoolInfo?.semester || '1'}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {monthNamesThai[month]} พ.ศ. {year + 543}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {user.role === 'admin' && (
                <button
                  onClick={() => handleOpenAddForDate()}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="เพิ่มรายการปฏิทิน / แจ้งประกาศ / มอบหมายงาน (+)"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span className="hidden sm:inline">เพิ่มข้อมูล</span>
                </button>
              )}
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((dayName, idx) => (
              <div
                key={dayName}
                className={`py-1.5 font-bold rounded-lg ${
                  idx === 0 || idx === 6 ? 'text-rose-500 bg-rose-50/50' : 'text-slate-600 bg-slate-50'
                }`}
              >
                {dayName}
              </div>
            ))}

            {calendarDays.map((dayNum, idx) => {
              if (dayNum === null) {
                return <div key={`empty-${idx}`} className="h-16 sm:h-20 p-1.5 rounded-xl bg-slate-50/20" />;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = calendarEvents.filter(ev => {
                if (ev.date === dateStr) return true;
                if (ev.endDate && dateStr >= ev.date && dateStr <= ev.endDate) return true;
                return false;
              });

              // Announcements & Assignments matching this date (connected to Module4Assignments)
              const dayAnnouncements = tasks.filter(t => t.type === 'announcement' && isTaskOnDate(t, dateStr));
              const dayAssignments = tasks.filter(t => t.type !== 'announcement' && isTaskOnDate(t, dateStr));
              const dayPendingAssignments = dayAssignments.filter(t => !t.isCompleted && !t.isManualCompleted);

              const isToday =
                new Date().getDate() === dayNum &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => {
                    setSelectedDayEvents({ 
                      dateStr, 
                      events: dayEvents, 
                      announcements: dayAnnouncements, 
                      assignments: dayAssignments 
                    });
                  }}
                  className={`group relative h-16 sm:h-20 p-1.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                    isToday
                      ? 'border-indigo-500 bg-indigo-50/30 font-bold shadow-xs ring-1 ring-indigo-400/40'
                      : 'border-slate-100 bg-white hover:border-indigo-300 hover:bg-slate-50/90 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] leading-none ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs'
                          : 'text-slate-700 font-semibold'
                      }`}
                    >
                      {dayNum}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Indicator dots for quick visual cues */}
                      <div className="flex items-center gap-0.5">
                        {dayPendingAssignments.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600" title="มีภาระงานที่ต้องส่ง (สีม่วง)" />
                        )}
                        {dayAnnouncements.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="มีประกาศใหม่ (สีเหลือง)" />
                        )}
                        {dayEvents.length > 0 && dayPendingAssignments.length === 0 && dayAnnouncements.length === 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="มีกิจกรรมโรงเรียน" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Micro event & task pills */}
                  {(() => {
                    const unlinkedEvents = dayEvents.filter(ev => {
                      const inAssignments = dayAssignments.some(
                        t =>
                          t.calendarEventId === ev.id ||
                          (ev.linkedTaskIds && ev.linkedTaskIds.includes(t.id)) ||
                          t.title === ev.taskDue ||
                          t.title === ev.title ||
                          ev.title === `กำหนดส่ง: ${t.title}`
                      );
                      const inAnnouncements = dayAnnouncements.some(
                        a =>
                          a.calendarEventId === ev.id ||
                          (ev.linkedTaskIds && ev.linkedTaskIds.includes(a.id)) ||
                          a.description === ev.announcement ||
                          a.title === ev.announcement
                      );
                      return !inAssignments && !inAnnouncements;
                    });
                    const totalItemsCount = unlinkedEvents.length + dayAnnouncements.length + dayAssignments.length;

                    return (
                      <div className="space-y-0.5 overflow-hidden">
                        {/* Assignment from Module4Assignments / Calendar (Purple) */}
                        {dayAssignments.slice(0, 1).map((t) => (
                          <div
                            key={t.id}
                            className={`text-[9px] truncate px-1 py-0.5 rounded border-l-2 leading-tight flex items-center gap-0.5 font-medium ${
                              t.isCompleted || t.isManualCompleted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-500'
                                : 'bg-purple-50 text-purple-900 border-purple-600'
                            }`}
                            title={`${t.isCompleted || t.isManualCompleted ? 'ส่งแล้ว' : 'ต้องส่ง'}: ${t.title}`}
                          >
                            <ClipboardList className={`w-2.5 h-2.5 shrink-0 ${t.isCompleted || t.isManualCompleted ? 'text-emerald-600' : 'text-purple-600'}`} />
                            <span className="truncate">{t.isCompleted || t.isManualCompleted ? '✓ ' : 'ส่ง: '}{t.title}</span>
                          </div>
                        ))}

                        {/* Announcement from Module4Assignments / Calendar (Yellow / Amber) */}
                        {dayAnnouncements.slice(0, 1).map((ann) => (
                          <div
                            key={ann.id}
                            className="text-[9px] truncate px-1 py-0.5 rounded bg-amber-50 text-amber-900 border-l-2 border-amber-500 leading-tight flex items-center gap-0.5 font-medium"
                            title={`แจ้งประกาศ: ${ann.title}`}
                          >
                            <Megaphone className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            <span className="truncate">{ann.title}</span>
                          </div>
                        ))}

                        {/* Standalone Events */}
                        {unlinkedEvents.slice(0, 1).map((ev) => (
                          <div
                            key={ev.id}
                            style={{ borderLeftColor: ev.color || '#2563EB' }}
                            className="text-[9px] truncate px-1 py-0.5 rounded bg-slate-100 text-slate-800 border-l-2 leading-tight flex items-center gap-0.5"
                            title={`${ev.title}${ev.announcement ? ` | แจ้ง: ${ev.announcement}` : ''}${ev.taskDue ? ` | ส่งงาน: ${ev.taskDue}` : ''}`}
                          >
                            <span className="truncate">{ev.title}</span>
                          </div>
                        ))}

                        {totalItemsCount > 2 && (
                          <span className="text-[8px] text-slate-400 font-medium leading-none">
                            +{totalItemsCount - 2} เพิ่มเติม
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Quick Legend */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="font-medium text-slate-700">ประเภท:</span>
            <span className="flex items-center gap-1 font-semibold text-purple-700">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> มอบหมายงาน
            </span>
            <span className="flex items-center gap-1 font-semibold text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> ประกาศใหม่
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> กิจกรรมโรงเรียน
            </span>
          </div>
        </div>

        {/* Beside Calendar: Pending Tasks Widget ("งานที่ต้องส่ง") (5 Cols on LG) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Flame className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 leading-tight">
                  งานที่ต้องส่ง (Pending Tasks)
                </h2>
                <p className="text-xs text-slate-500">
                  {visibleTasks.length > 0
                    ? `มีงานค้างส่ง ${visibleTasks.length} รายการ`
                    : 'ไม่มีงานค้างส่งในขณะนี้'}
                </p>
              </div>
            </div>

            {user.role === 'admin' && !disableAssignments && (
              <button
                onClick={() => onNavigateToTab('assignments')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                จัดการงาน →
              </button>
            )}
          </div>

          {/* Prompt constraint: "Beside the calendar, display a Pending Tasks / Assignments widget ('งานที่ต้องส่ง'). Tasks disappear immediately once completed/submitted." */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {disableAssignments ? (
              <div className="py-12 px-4 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-2.5">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">ระบบมอบหมายงานถูกปิดใช้งาน (OFF)</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  ผู้พัฒนาระบบได้ปิดการใช้งานหน้ามอบหมายสำหรับโรงเรียนนี้ชั่วคราว
                </p>
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="py-12 px-4 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">ส่งงานครบเรียบร้อยแล้ว!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  ยอดเยี่ยมมาก ไม่มีภาระงานค้างส่งในระบบในขณะนี้
                </p>
              </div>
            ) : (
              visibleTasks.map((task) => {
                const isUrgent = task.priority === 'urgent';
                const isHigh = task.priority === 'high';
                const submittedCount = task.submissions?.length || (task.submittedBy ? 1 : 0);

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl border transition-all duration-200 hover:shadow-sm ${
                      isUrgent
                        ? 'border-rose-200 bg-rose-50/30'
                        : isHigh
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isUrgent
                                ? 'bg-rose-100 text-rose-700'
                                : isHigh
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isUrgent ? 'ด่วนที่สุด' : isHigh ? 'ด่วน' : 'ปกติ'}
                          </span>
                          <span className="text-[11px] text-slate-400">จาก: {task.createdBy}</span>
                          {user.role === 'admin' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              ส่งแล้ว {submittedCount}/{totalMembersCount} คน
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-800 mt-1 leading-snug">
                          {task.title}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                          {task.description}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 text-rose-600 font-medium">
                            <Clock className="w-3 h-3" />
                            กำหนดส่ง: {task.dueDate}
                          </span>
                          {task.attachmentUrl && (
                            <a
                              href={task.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-indigo-600 hover:underline"
                            >
                              <Paperclip className="w-3 h-3" />
                              ดูเอกสารแนบ
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Action Button: Member triggers File Upload Pop-up Modal */}
                      {user.role === 'member' ? (
                        <button
                          onClick={() => {
                            setTaskToSubmit(task);
                            setSubmitFile(null);
                          }}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                          title="กดเพื่ออัปโหลดไฟล์ส่งงาน"
                        >
                          <Upload className="w-4 h-4" />
                          <span>ส่งงาน</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigateToTab('assignments')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-900 border border-slate-200 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer"
                          title="ดูตารางตรวจงานมอบหมาย"
                        >
                          ตรวจงาน →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>



      {/* Modal: View Selected Day Events & Tasks */}
      {selectedDayEvents && (() => {
        const activeDateStr = selectedDayEvents.dateStr;
        const liveDayEvents = calendarEvents.filter(ev => {
          if (ev.date === activeDateStr) return true;
          if (ev.endDate && activeDateStr >= ev.date && activeDateStr <= ev.endDate) return true;
          return false;
        });
        const liveDayAnnouncements = tasks.filter(t => t.type === 'announcement' && isTaskOnDate(t, activeDateStr));
        const liveDayAssignments = tasks.filter(t => t.type !== 'announcement' && isTaskOnDate(t, activeDateStr));

        const unlinkedAssignmentEvents = liveDayEvents.filter(ev => {
          const isPureAnnouncement = Boolean(ev.announcement && !ev.taskDue && ev.title.startsWith('แจ้ง:'));
          if (isPureAnnouncement) return false;
          const alreadyInAssignments = liveDayAssignments.some(
            t =>
              t.calendarEventId === ev.id ||
              (ev.linkedTaskIds && ev.linkedTaskIds.includes(t.id)) ||
              t.title === ev.taskDue ||
              t.title === ev.title ||
              ev.title === `กำหนดส่ง: ${t.title}`
          );
          return !alreadyInAssignments;
        });

        const unlinkedAnnouncementEvents = liveDayEvents.filter(ev => {
          const annText = ev.announcement;
          if (!annText) return false;
          const alreadyInAnnouncements = liveDayAnnouncements.some(
            a =>
              a.calendarEventId === ev.id ||
              (ev.linkedTaskIds && ev.linkedTaskIds.includes(a.id)) ||
              a.description === annText ||
              a.title === annText ||
              a.title === annText.slice(0, 60)
          );
          return !alreadyInAnnouncements;
        });

        const hasSection1 = liveDayAssignments.length > 0 || unlinkedAssignmentEvents.length > 0;
        const hasSection2 = liveDayAnnouncements.length > 0 || unlinkedAnnouncementEvents.length > 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {formatThaiDateShort(activeDateStr)}
                    </h3>
                    <p className="text-[11px] text-slate-500">เชื่อมลิงก์ข้อมูลกับหน้ามอบหมายอัตโนมัติ</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        setSelectedDayEvents(null);
                        handleOpenAddForDate(activeDateStr);
                      }}
                      className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
                      title="เพิ่มข้อมูล (มอบหมายงาน / ประกาศใหม่)"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedDayEvents(null)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                {!hasSection1 && !hasSection2 ? (
                  <div className="text-center py-10 text-slate-400 text-xs space-y-2">
                    <CalendarIcon className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">ยังไม่มีบันทึกข้อมูลในวันนี้</p>
                  </div>
                ) : (
                  <>
                    {/* ส่วนที่ 1: มอบหมายงาน (Admin) / ส่งงาน (สมาชิก) */}
                    {hasSection1 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                          <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
                          <span>{user.role === 'admin' ? '1. มอบหมายงาน' : '1. ส่งงาน'}</span>
                        </div>
                        <div className="space-y-2">
                          {liveDayAssignments.map((task) => (
                            <div
                              key={task.id}
                              className={`p-3 rounded-xl border space-y-1 shadow-2xs ${
                                task.isCompleted || task.isManualCompleted
                                  ? 'bg-emerald-50/80 border-emerald-200/90 border-l-4 border-l-emerald-600'
                                  : 'bg-purple-50/80 border-purple-200/90 border-l-4 border-l-purple-600'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <h4 className="text-sm font-bold text-slate-800">{task.title}</h4>
                                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                    task.isCompleted || task.isManualCompleted
                                      ? 'text-emerald-800 bg-emerald-100/80'
                                      : 'text-purple-800 bg-purple-100/80'
                                  }`}>
                                    {task.isCompleted || task.isManualCompleted ? '✓ ส่งแล้ว' : 'เชื่อมลิงก์กับหน้ามอบหมาย'}
                                  </span>
                                </div>
                                {user.role === 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDeleteCalendarModal({
                                        mode: 'task',
                                        id: task.id,
                                        title: task.title,
                                        categoryLabel: 'งานมอบหมาย'
                                      });
                                    }}
                                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer"
                                    title="ลบรายการนี้"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-xs text-slate-600 pl-0.5 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          ))}

                          {unlinkedAssignmentEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className="p-3 rounded-xl bg-purple-50/80 border border-purple-200/90 border-l-4 border-l-purple-600 space-y-1 shadow-2xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-bold text-slate-800">{ev.title}</h4>
                                {user.role === 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDeleteCalendarModal({
                                        mode: 'event',
                                        id: ev.id,
                                        title: ev.title,
                                        categoryLabel: 'รายการปฏิทิน'
                                      });
                                    }}
                                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer"
                                    title="ลบรายการนี้"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {ev.description && ev.description !== ev.announcement && (
                                <p className="text-xs text-slate-600 pl-0.5 leading-relaxed">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ส่วนที่ 2: ประกาศใหม่ */}
                    {hasSection2 && (
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                            <Bell className="w-3.5 h-3.5 text-amber-600" />
                            <span>2. ประกาศใหม่</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {/* Announcements from Module4Assignments / Calendar */}
                          {liveDayAnnouncements.map((ann) => {
                            let displayTitle = ann.title || '';
                            if (displayTitle.startsWith('[ประกาศแจ้ง] ')) {
                              displayTitle = displayTitle.replace('[ประกาศแจ้ง] ', '');
                            }
                            if (displayTitle.startsWith('ประกาศแจ้งประจำวันที่')) {
                              displayTitle = ann.description || displayTitle;
                            }

                            return (
                              <div
                                key={ann.id}
                                className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/90 border-l-4 border-l-amber-500 space-y-1 shadow-2xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <h4 className="text-sm font-bold text-slate-800">
                                      {displayTitle}
                                    </h4>
                                    <span className="inline-block text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                                      เชื่อมลิงก์กับหน้ามอบหมาย
                                    </span>
                                  </div>
                                  {user.role === 'admin' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmDeleteCalendarModal({
                                          mode: 'task',
                                          id: ann.id,
                                          title: displayTitle,
                                          categoryLabel: 'ประกาศใหม่'
                                        });
                                      }}
                                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer"
                                      title="ลบประกาศนี้"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                {ann.description && ann.description !== displayTitle && (
                                  <p className="text-xs text-slate-600 pl-0.5 leading-relaxed whitespace-pre-wrap">
                                    {ann.description}
                                  </p>
                                )}
                              </div>
                            );
                          })}

                          {/* Calendar event inline announcements */}
                          {unlinkedAnnouncementEvents.map((ev) => (
                            <div
                              key={'ev-ann-' + ev.id}
                              className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/90 border-l-4 border-l-amber-500 space-y-1 shadow-2xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-bold text-slate-800">
                                  {ev.announcement}
                                </h4>
                                {user.role === 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDeleteCalendarModal({
                                        mode: 'event',
                                        id: ev.id,
                                        title: ev.announcement || ev.title,
                                        categoryLabel: 'ประกาศใหม่'
                                      });
                                    }}
                                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer"
                                    title="ลบประกาศนี้"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {ev.title && (
                                <p className="text-xs text-slate-600 pl-0.5 leading-relaxed">
                                  เนื่องจาก: {ev.title}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedDayEvents(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: ยืนยันการลบรายการในปฏิทินวิชาการ */}
      <ConfirmDeleteModal
        isOpen={Boolean(confirmDeleteCalendarModal)}
        title={`ยืนยันการลบ${confirmDeleteCalendarModal?.categoryLabel || 'รายการ'}`}
        categoryLabel={confirmDeleteCalendarModal?.categoryLabel}
        itemTitle={confirmDeleteCalendarModal?.title || ''}
        itemSubtitle="รายการในปฏิทินวิชาการและหน้ามอบหมาย"
        warningText="รายการนี้และข้อมูลที่เชื่อมโยงจะถูกลบถาวร"
        onCancel={() => setConfirmDeleteCalendarModal(null)}
        onConfirm={() => {
          if (!confirmDeleteCalendarModal) return;
          if (confirmDeleteCalendarModal.mode === 'task' && onDeleteTask) {
            onDeleteTask(confirmDeleteCalendarModal.id);
            if (onShowToast) {
              onShowToast(
                'info',
                'ลบรายการเรียบร้อย',
                `ลบ "${confirmDeleteCalendarModal.title}" ในปฏิทินและหน้ามอบหมายเรียบร้อยแล้ว`
              );
            }
          } else {
            onDeleteCalendarEvent(confirmDeleteCalendarModal.id);
          }
          setConfirmDeleteCalendarModal(null);
        }}
      />

      {/* Modal: Add Day Details (เป็นวันอะไร / แจ้งอะไร / ให้ส่งงานอะไร - สอดคล้องและเชื่อมกับหน้ามอบหมาย) */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    กำหนดปฏิทินวิชาการ
                  </h3>
                  <p className="text-[11px] text-indigo-600 font-medium">
                    ทุกรายการที่สร้างจะเชื่อมลิงก์ไปแสดงใน "หน้ามอบหมาย" อัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEventOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 overflow-y-auto flex-1 pr-1">
              {/* วันที่ */}
              <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ระบุวันที่:</span>
                </label>
                <input
                  type="date"
                  required
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* ส่วนที่ 1: มอบหมายงาน (สีม่วง) */}
              <div className="p-3.5 bg-purple-50/55 rounded-2xl border border-purple-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                    <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
                    <span>1. มอบหมายงาน</span>
                  </label>
                  <span className="text-[10px] text-purple-700 font-medium">📋 เชื่อมลิงก์ไปแท็บงานมอบหมายอัตโนมัติ</span>
                </div>
                <input
                  type="text"
                  value={newEventTaskDue}
                  onChange={(e) => setNewEventTaskDue(e.target.value)}
                  placeholder="เช่น ส่งสมุด ปพ.5, ส่งแผนการจัดการเรียนรู้, ส่งรายงานเงินออมทรัพย์"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-2xs"
                />

                {newEventTaskDue.trim() && (
                  <div className="pt-1 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-semibold text-purple-900">ระดับความเร่งด่วน:</span>
                      <div className="flex items-center gap-3">
                        {(['normal', 'high', 'urgent'] as const).map((p) => (
                          <label key={p} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="taskPriority"
                              value={p}
                              checked={newEventTaskPriority === p}
                              onChange={() => setNewEventTaskPriority(p)}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-[11px] text-slate-700">
                              {p === 'urgent' ? 'ด่วนที่สุด' : p === 'high' ? 'ด่วน' : 'ปกติ'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ส่วนที่ 2: ประกาศใหม่ (สีส้ม/แอมเบอร์) */}
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                    <Bell className="w-3.5 h-3.5 text-amber-600" />
                    <span>2. ประกาศใหม่</span>
                  </label>
                  <span className="text-[10px] text-amber-800 font-medium">📢 เชื่อมลิงก์ไปแท็บประกาศใหม่อัตโนมัติ</span>
                </div>
                <textarea
                  rows={2}
                  value={newEventAnnouncement}
                  onChange={(e) => setNewEventAnnouncement(e.target.value)}
                  placeholder="เช่น แจ้งคุณครูทุกท่านแต่งกายด้วยชุดผ้าไทย, แจ้งนัดหมายประชุมเวลา 09.00 น. ณ ห้องประชุม 1"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-2xs"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: สร้างปุ่มลัดใหม่ (บันทึกลง Google Sheets อัตโนมัติ) */}
      {isAddButtonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">สร้างปุ่มลัดใหม่</h3>
                  <p className="text-[11px] text-slate-500">บันทึกเก็บใน Google Sheets ประจำโรงเรียนอัตโนมัติ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddButtonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomButton} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ชื่อปุ่ม (Label) *
                </label>
                <input
                  type="text"
                  required
                  value={newBtnLabel}
                  onChange={(e) => setNewBtnLabel(e.target.value)}
                  placeholder="เช่น ระบบสารสนเทศทางการศึกษา (DMC)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ลิงก์ URL ปลายทาง *
                </label>
                <input
                  type="text"
                  required
                  value={newBtnUrl}
                  onChange={(e) => setNewBtnUrl(e.target.value)}
                  placeholder="https://... หรือเว็บระบบงานที่ต้องการ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    หมวดหมู่ / หน่วยงาน
                  </label>
                  <input
                    type="text"
                    value={newBtnCategory}
                    onChange={(e) => setNewBtnCategory(e.target.value)}
                    placeholder="เช่น งานวิชาการ, สพฐ."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    โทนสีปุ่ม
                  </label>
                  <select
                    value={newBtnColor}
                    onChange={(e) => setNewBtnColor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="indigo">สีคราม (Indigo)</option>
                    <option value="purple">สีม่วง (Purple)</option>
                    <option value="emerald">สีเขียว (Emerald)</option>
                    <option value="blue">สีฟ้า (Blue)</option>
                    <option value="amber">สีส้ม (Amber)</option>
                    <option value="rose">สีแดง (Rose)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ผู้มีสิทธิ์มองเห็นปุ่มนี้
                </label>
                <select
                  value={newBtnRole}
                  onChange={(e) => setNewBtnRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white cursor-pointer"
                >
                  <option value="all">ทุกคน (All - ทั้ง Admin และ สมาชิก)</option>
                  <option value="admin">เฉพาะผู้ดูแลระบบ (Admin Only)</option>
                  <option value="member">เฉพาะสมาชิกบุคลากร (Members Only)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={newBtnOpenNewTab}
                    onChange={(e) => setNewBtnOpenNewTab(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>เปิดลิงก์ในหน้าต่างใหม่ (New Tab)</span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddButtonModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>บันทึกปุ่มลง Google Sheets</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Modal: Upload File for Submitting Work (งานที่ต้องส่ง) */}
      {taskToSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                  <Upload className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">อัปโหลดไฟล์ส่งงาน</h3>
                  <p className="text-[11px] text-slate-500">แนบไฟล์รายงาน/การปฏิบัติงานเพื่อส่งมอบหมาย</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTaskToSubmit(null);
                  setSubmitFile(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Task Info Summary */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">{taskToSubmit.title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  กำหนดส่ง: {taskToSubmit.dueDate}
                </span>
              </div>
              {taskToSubmit.description && (
                <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-wrap pt-1">
                  {taskToSubmit.description}
                </p>
              )}
            </div>

            <form onSubmit={handleConfirmSubmitTask} className="space-y-4">
              {/* File Upload Drop Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  แนบไฟล์ผลงาน / เอกสารรายงาน *
                </label>
                <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl p-5 text-center bg-purple-50/40 hover:bg-purple-50/80 transition-all">
                  <input
                    type="file"
                    id="dashboard-task-file-input"
                    className="hidden"
                    onChange={handleFileChangeForSubmission}
                  />
                  
                  {submitFile ? (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-800 truncate max-w-xs mx-auto">
                        {submitFile.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ขนาดไฟล์: {submitFile.size}
                      </div>
                      <label
                        htmlFor="dashboard-task-file-input"
                        className="inline-block text-[11px] font-bold text-purple-700 hover:underline cursor-pointer pt-1"
                      >
                        เปลี่ยนไฟล์อื่น
                      </label>
                    </div>
                  ) : (
                    <label
                      htmlFor="dashboard-task-file-input"
                      className="cursor-pointer space-y-2 block"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-purple-900">
                        {isUploadingSubmit ? 'กำลังโหลดไฟล์...' : 'กดเพื่อเลือกไฟล์จากอุปกรณ์'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        รองรับไฟล์ PDF, Word, Excel, รูปภาพ หรือไฟล์อื่นๆ
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setTaskToSubmit(null);
                    setSubmitFile(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!submitFile || isUploadingSubmit}
                  className={`px-5 py-2 text-xs text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    submitFile && !isUploadingSubmit
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>ยืนยันส่งงาน</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
