import React, { useState, useRef, useEffect } from 'react';
import { TaskItem, UserSession, MemberAccount, TaskSubmission } from '../types';
import { 
  ClipboardList, 
  Plus,
  Trash2, 
  CheckCircle2, 
  Clock, 
  Download,
  Upload,
  GripVertical,
  Megaphone,
  FileText,
  Calendar,
  Sparkles,
  Users,
  Loader2,
  Edit,
  X,
  FileCheck,
  ExternalLink
} from 'lucide-react';
import {
  downloadRealFile,
  getPreviewableFileUrl,
  getDirectFileDownloadUrl,
  getGoogleDriveViewUrl,
  extractDriveFileId,
  resolveDriveIdByFileNameFromGas,
  isWordFile,
  isExcelFile,
  isImageFile,
  isPdfFile
} from '../services/fileDownloadHelper';
import { StorageService } from '../services/storage';

interface Module4Props {
  user: UserSession;
  tasks: TaskItem[];
  members: MemberAccount[];
  academicYear?: string;
  onSaveTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onReorderTasks?: (tasks: TaskItem[]) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

export const Module4Assignments: React.FC<Module4Props> = ({
  user,
  tasks,
  members,
  academicYear,
  onSaveTask,
  onDeleteTask,
  onCompleteTask,
  onReorderTasks,
  onShowToast
}) => {
  const currentAcademicYear = academicYear || '2569';
  const [activeSubTab, setActiveSubTab] = useState<'assignment' | 'announcement'>('assignment');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'assignment' | 'announcement'>('assignment');
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Pop-up modal state for viewing full assignment / announcement title on mobile
  const [selectedTaskDetailModal, setSelectedTaskDetailModal] = useState<TaskItem | null>(null);

  // Confirmation modal state for deleting tasks/announcements/submissions
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    type: 'task' | 'submission';
    id: string;
    title: string;
    isAnnouncement?: boolean;
    memberId?: string;
    memberName?: string;
    fileName?: string;
  } | null>(null);

  // Form states for creating & editing tasks/announcements
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<'urgent' | 'high' | 'normal'>('normal');

  // Compact calendar popup states
  const [isCalendarPopupOpen, setIsCalendarPopupOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>('');

  // Helper to filter out auto-generated description prefixes
  const cleanDescription = (desc?: string) => {
    if (!desc) return '';
    let d = desc.trim();
    if (
      d.startsWith('ภาระงานเนื่องใน:') || 
      d.startsWith('เนื่องใน:') || 
      d.includes('โดย ผู้ดูแลระบบโรงเรียน') || 
      d.includes('Administrator')
    ) {
      return '';
    }
    return d;
  };

  // Helper: Format date string or range to Thai พ.ศ. DD-MM-YYYY format (e.g. 2026-10-20 -> 20-10-2569)
  const formatThaiTaskDate = (dateRangeStr?: string) => {
    if (!dateRangeStr) return '';
    const convertSingleDate = (dStr: string) => {
      const trimmed = dStr.trim();
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        return trimmed;
      }
      const parts = trimmed.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        if (!isNaN(year)) {
          const thaiYear = year > 2400 ? year : year + 543;
          return `${day}-${month}-${thaiYear}`;
        }
      }
      return trimmed;
    };

    if (dateRangeStr.includes(' ถึง ')) {
      const parts = dateRangeStr.split(' ถึง ');
      return `${convertSingleDate(parts[0])} ถึง ${convertSingleDate(parts[1])}`;
    }
    return convertSingleDate(dateRangeStr);
  };

  const handleOpenModal = (taskToEdit?: TaskItem) => {
    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setModalType(taskToEdit.type || 'assignment');
      setFormTitle(taskToEdit.title || '');
      setFormDesc(taskToEdit.description || '');
      setFormPriority(taskToEdit.priority || 'normal');
      if (taskToEdit.dueDate) {
        const parts = taskToEdit.dueDate.split(' ถึง ');
        setStartDate(parts[0] || todayStr);
        setEndDate(parts[1] || '');
      } else {
        setStartDate(todayStr);
        setEndDate('');
      }
    } else {
      setEditingTask(null);
      setModalType(activeSubTab);
      setFormTitle('');
      setFormDesc('');
      setFormPriority('normal');
      setStartDate(todayStr);
      setEndDate('');
    }
    setIsModalOpen(true);
  };

  // Admin submission status modal state
  const [statusTaskModal, setStatusTaskModal] = useState<TaskItem | null>(null);
  const [downloadingFileKey, setDownloadingFileKey] = useState<string | null>(null);

  // Submission modal state (for members) with 0-100% progress tracking
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [submittedFile, setSubmittedFile] = useState<{
    name: string;
    url: string;
    size: string;
    hostedUrl?: string;
    driveFileId?: string;
    driveUrl?: string;
    downloadUrl?: string;
  } | null>(null);
  const [isUploadingSubmission, setIsUploadingSubmission] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStepText, setUploadStepText] = useState<string>('');
  const uploadPromiseRef = useRef<Promise<{
    url: string;
    hostedUrl?: string;
    driveFileId?: string;
    driveUrl?: string;
    downloadUrl?: string;
  }> | null>(null);

  // Drag and drop state for reordering
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const schoolMembers = members.filter(m => m.role !== 'admin');
  const totalSchoolMembers = schoolMembers.length || 1;

  // Keep Admin and Member assignments & submissions continuously synchronized in real time
  useEffect(() => {
    StorageService.pullRemoteState(false).catch(() => {});
    StorageService.recoverMissingTaskFileUrls().catch(() => {});
    const timer = setInterval(() => {
      StorageService.pullRemoteState(false).catch(() => {});
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hasMissingUrl = tasks.some(
      t =>
        t &&
        Array.isArray(t.submissions) &&
        t.submissions.some(s => s && s.fileName && (!s.fileUrl || s.fileUrl.startsWith('/api/files/')))
    );
    if (hasMissingUrl) {
      StorageService.recoverMissingTaskFileUrls().catch(() => {});
    }
  }, [tasks]);

  useEffect(() => {
    if (statusTaskModal) {
      StorageService.pullRemoteState(false).catch(() => {});
      StorageService.recoverMissingTaskFileUrls().catch(() => {});
    }
  }, [statusTaskModal?.id]);

  const isTaskInYear = (task: TaskItem, yr: string = currentAcademicYear) => {
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

  const yearTasks = tasks.filter(t => isTaskInYear(t, currentAcademicYear));

  const filteredTasks = yearTasks.filter(t => {
    const tType = t.type || 'assignment';
    return tType === activeSubTab;
  });

  const normalizePersonName = (name?: string) => {
    if (!name) return '';
    return name
      .replace(/^(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|ครู|ผอ\.|ดร\.|ว่าที่ร้อยตรี|ว่าที่\s*ร\.ต\.)/g, '')
      .replace(/\s+/g, '')
      .trim()
      .toLowerCase();
  };

  // Robust matcher for finding a member's submission in a task (handles ID, username, fullName, and prefix-stripped name)
  const findMemberSubmission = (task: TaskItem, member: MemberAccount): TaskSubmission | undefined => {
    if (!task || !member) return undefined;
    const normMemberName = normalizePersonName(member.fullName);

    // Check if permanently deleted via tombstone or deletedSubmissionsMap
    if (StorageService.isSubmissionDeleted(task.id, member.id, member.username, member.fullName, normMemberName)) {
      return undefined;
    }
    const delMap = task.deletedSubmissionsMap || {};
    if (delMap[member.id] || (member.username && delMap[member.username]) || (member.fullName && delMap[member.fullName])) {
      return undefined;
    }

    const subs = task.submissions || [];
    const found = subs.find(s => {
      if (!s) return false;
      if (StorageService.isSubmissionDeleted(task.id, s.memberId, s.memberName, s.fileName)) return false;
      if (s.memberId === member.id) return true;
      if (member.username && s.memberId?.toLowerCase() === member.username.toLowerCase()) return true;
      if (member.fullName && s.memberName === member.fullName) return true;
      if (normMemberName && normalizePersonName(s.memberName) === normMemberName) return true;
      return false;
    });
    if (found) return found;

    if (
      task.submittedFileUrl &&
      (task.submittedBy === member.id ||
       (member.username && task.submittedBy?.toLowerCase() === member.username.toLowerCase()) ||
       (member.fullName && task.submittedByName === member.fullName) ||
       (normMemberName && normalizePersonName(task.submittedByName) === normMemberName))
    ) {
      if (StorageService.isSubmissionDeleted(task.id, task.submittedBy, task.submittedByName, task.submittedFileName)) {
        return undefined;
      }
      return {
        memberId: member.id,
        memberName: member.fullName,
        fileUrl: task.submittedFileUrl,
        fileName: task.submittedFileName || 'ไฟล์งานที่ส่ง',
        fileSize: task.submittedFileSize || '1.0 MB',
        driveFileId: task.driveFileId,
        submittedAt: task.submittedAt || new Date().toISOString()
      };
    }
    return undefined;
  };

  const resolveSubmissionDriveUrl = (s?: TaskSubmission, fallbackTaskUrl?: string, task?: TaskItem): string => {
    if (!s) return fallbackTaskUrl || '';
    const ownFid =
      s.driveFileId ||
      extractDriveFileId(s.fileUrl) ||
      extractDriveFileId((s as any).downloadUrl);
    if (ownFid) {
      return `https://drive.google.com/file/d/${ownFid}/view?usp=sharing`;
    }
    const ownDirectUrl = s.fileUrl || (s as any).localHostedUrl || (s as any).downloadUrl;
    if (ownDirectUrl) {
      return ownDirectUrl;
    }
    const canUseTaskFallback =
      !task ||
      task.submittedBy === s.memberId ||
      (s.fileName && task.submittedFileName === s.fileName);
    if (canUseTaskFallback && fallbackTaskUrl) {
      const fallbackFid = extractDriveFileId(fallbackTaskUrl);
      if (fallbackFid) {
        return `https://drive.google.com/file/d/${fallbackFid}/view?usp=sharing`;
      }
      return fallbackTaskUrl;
    }
    return '';
  };

  const getMySubmission = (task: TaskItem): TaskSubmission | undefined => {
    if (!task || !user) return undefined;
    const normMyName = normalizePersonName(user.fullName);

    if (StorageService.isSubmissionDeleted(task.id, user.id, user.username, user.fullName, normMyName)) {
      return undefined;
    }
    const delMap = task.deletedSubmissionsMap || {};
    if (delMap[user.id] || (user.username && delMap[user.username]) || (user.fullName && delMap[user.fullName])) {
      return undefined;
    }

    const subs = task.submissions || [];
    const found = subs.find(s => {
      if (!s) return false;
      if (StorageService.isSubmissionDeleted(task.id, s.memberId, s.memberName, s.fileName)) return false;
      if (s.memberId === user.id) return true;
      if (user.username && s.memberId?.toLowerCase() === user.username.toLowerCase()) return true;
      if (user.fullName && s.memberName === user.fullName) return true;
      if (normMyName && normalizePersonName(s.memberName) === normMyName) return true;
      return false;
    });
    if (found) {
      return {
        ...found,
        fileUrl: resolveSubmissionDriveUrl(found, task.submittedFileUrl, task)
      };
    }

    if (
      task.submittedFileUrl &&
      (task.submittedBy === user.id ||
       (user.username && task.submittedBy?.toLowerCase() === user.username.toLowerCase()) ||
       (user.fullName && task.submittedByName === user.fullName) ||
       (normMyName && normalizePersonName(task.submittedByName) === normMyName))
    ) {
      if (StorageService.isSubmissionDeleted(task.id, task.submittedBy, task.submittedByName, task.submittedFileName)) {
        return undefined;
      }
      return {
        memberId: user.id,
        memberName: user.fullName,
        fileUrl: task.driveFileId
          ? `https://drive.google.com/file/d/${task.driveFileId}/view?usp=sharing`
          : task.submittedFileUrl,
        fileName: task.submittedFileName || 'ไฟล์งานที่ส่ง',
        fileSize: task.submittedFileSize || '1.0 MB',
        driveFileId: task.driveFileId,
        submittedAt: task.submittedAt || new Date().toISOString()
      };
    }
    return undefined;
  };

  const getTaskEffectiveSubmissions = (task: TaskItem): TaskSubmission[] => {
    if (!task) return [];
    const result: TaskSubmission[] = [];
    const seenKeys = new Set<string>();

    const addSub = (s: TaskSubmission, fallbackName?: string) => {
      if (!s) return;
      if (StorageService.isSubmissionDeleted(task.id, s.memberId, s.memberName, s.fileName)) return;
      const key = String(s.memberId || s.memberName || '').trim().toLowerCase();
      if (!key || seenKeys.has(key)) return;
      seenKeys.add(key);
      const effectiveUrl = resolveSubmissionDriveUrl(s, task.submittedFileUrl, task);
      result.push({
        ...s,
        memberName: fallbackName || s.memberName || s.memberId || 'สมาชิก',
        fileUrl: effectiveUrl,
        fileName: s.fileName || task.submittedFileName || 'ไฟล์งานที่ส่ง'
      });
    };

    schoolMembers.forEach(m => {
      const sub = findMemberSubmission(task, m);
      if (sub) {
        addSub(sub, m.fullName);
      }
    });

    (task.submissions || []).forEach(s => {
      if (s && (s.memberId || s.memberName)) {
        addSub(s);
      }
    });

    if (result.length === 0 && task.submittedFileUrl && (task.submittedBy || task.submittedByName)) {
      if (!StorageService.isSubmissionDeleted(task.id, task.submittedBy, task.submittedByName, task.submittedFileName)) {
        addSub({
          memberId: task.submittedBy || 'member',
          memberName: task.submittedByName || task.submittedBy || 'สมาชิก',
          fileUrl: task.submittedFileUrl,
          fileName: task.submittedFileName || 'ไฟล์งานที่ส่ง',
          fileSize: task.submittedFileSize || '1.0 MB',
          submittedAt: task.submittedAt || new Date().toISOString()
        });
      }
    }

    return result;
  };

  const getTaskSubmittedCount = (task: TaskItem): number => {
    return getTaskEffectiveSubmissions(task).length;
  };

  const isTaskDoneForUser = (task: TaskItem) => {
    const subsCount = getTaskSubmittedCount(task);
    const isFull =
      (totalSchoolMembers > 0 && subsCount >= totalSchoolMembers) ||
      Boolean(task.isManualCompleted) ||
      Boolean(task.isCompleted);

    if (user.role === 'member') {
      const mySub = getMySubmission(task);
      return Boolean(mySub) || isFull;
    }
    return isFull;
  };

  // Sort tasks such that completed/submitted tasks for the current user move to the bottom
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aDone = isTaskDoneForUser(a);
    const bDone = isTaskDoneForUser(b);
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;
    return 0;
  });

  const isOverdue = (dueDateStr: string) => {
    if (!dueDateStr) return false;
    const parts = dueDateStr.split(' ถึง ');
    const lastDate = parts[parts.length - 1].trim();
    return todayStr > lastDate;
  };

  const handleToggleManualComplete = (task: TaskItem) => {
    const subCount = (task.submissions || []).length;
    const isCurrentlyDone =
      (totalSchoolMembers > 0 && subCount >= totalSchoolMembers) ||
      Boolean(task.isManualCompleted) ||
      Boolean(task.isCompleted);
    const nextManualCompleted = !isCurrentlyDone;
    const updated: TaskItem = {
      ...task,
      isManualCompleted: nextManualCompleted,
      isCompleted: nextManualCompleted
    };
    onSaveTask(updated);
    onShowToast(
      'success', 
      nextManualCompleted ? 'ทำเครื่องหมายว่าส่งครบแล้ว' : 'ยกเลิกเครื่องหมายส่งครบ', 
      `อัปเดตสถานะงาน "${task.title}" ${nextManualCompleted ? 'ย้ายไปอยู่ด้านล่างสุด (สีเขียว)' : 'กลับสู่รายการรอดำเนินการ'} เรียบร้อย`
    );
  };

  const handleReorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIndex = tasks.findIndex(t => t.id === fromId);
    const toIndex = tasks.findIndex(t => t.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...tasks];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    if (onReorderTasks) {
      onReorderTasks(next);
    }
    onShowToast('info', 'จัดลำดับแล้ว', `ย้ายรายการเรียบร้อย`);
  };

  const handleTouchStart = (id: string) => {
    if (user.role !== 'admin') return;
    touchTimerRef.current = setTimeout(() => {
      setDraggedId(id);
    }, 250);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (user.role !== 'admin' || !draggedId) return;
    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const rowEl = targetEl?.closest('[data-task-id]');
    if (rowEl) {
      const id = rowEl.getAttribute('data-task-id');
      if (id && id !== dragOverId) {
        setDragOverId(id);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    if (draggedId && dragOverId && draggedId !== dragOverId) {
      handleReorder(draggedId, dragOverId);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleCreateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (user.role === 'developer') {
      onShowToast('warning', 'ไม่มีสิทธิ์', 'ระดับผู้พัฒนา (Developer) ไม่สามารถสร้างรายการได้');
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    let finalDueDate = startDate;
    if (startDate && endDate && endDate !== startDate) {
      finalDueDate = `${startDate} ถึง ${endDate}`;
    } else if (startDate) {
      finalDueDate = startDate;
    } else {
      finalDueDate = todayStr;
    }

    const titleVal = formTitle.trim() || ((formData.get('title') as string) || '').trim();
    const descVal = formDesc.trim() || ((formData.get('description') as string) || '').trim();
    const priorityVal = modalType === 'announcement' ? 'normal' : (formPriority || 'normal');

    if (!titleVal.trim()) {
      onShowToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณาระบุหัวข้อ');
      return;
    }

    const taskToSave: TaskItem = {
      id: editingTask ? editingTask.id : 'task-' + Date.now(),
      title: titleVal.trim(),
      description: descVal.trim(),
      type: modalType,
      academicYear: editingTask?.academicYear || currentAcademicYear,
      priority: priorityVal,
      dueDate: finalDueDate,
      isCompleted: editingTask ? editingTask.isCompleted : false,
      createdBy: editingTask ? editingTask.createdBy : user.fullName,
      assignedTo: 'all',
      submissions: editingTask ? editingTask.submissions : [],
      isManualCompleted: editingTask ? editingTask.isManualCompleted : false,
      attachmentUrl: editingTask ? editingTask.attachmentUrl : undefined
    };

    onSaveTask(taskToSave);
    setIsModalOpen(false);
    setEditingTask(null);
    setStartDate(todayStr);
    setEndDate('');
    onShowToast('success', editingTask ? 'แก้ไขเรียบร้อย' : (modalType === 'assignment' ? 'มอบหมายงานสำเร็จ' : 'สร้างประกาศสำเร็จ'), `บันทึก "${taskToSave.title}" เรียบร้อยแล้ว`);
  };

  const handleCalendarDayClick = (dateStr: string) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr);
      setEndDate('');
    } else if (startDate && !endDate) {
      if (dateStr === startDate) {
        setEndDate(dateStr);
        setIsCalendarPopupOpen(false);
      } else if (dateStr < startDate) {
        setStartDate(dateStr);
      } else {
        setEndDate(dateStr);
        setIsCalendarPopupOpen(false);
      }
    }
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit per file

  const handleFileSubmitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Constraint 3: Strict 5MB file size limit
    if (file.size > MAX_FILE_SIZE) {
      onShowToast(
        'warning',
        'ขนาดไฟล์เกินกำหนด (สูงสุด 5MB)',
        `ไฟล์ "${file.name}" มีขนาด ${(file.size / (1024 * 1024)).toFixed(2)} MB ซึ่งเกินขนาดสูงสุด 5MB ต่อไฟล์ เพื่อประหยัดพื้นที่จัดเก็บ กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB`
      );
      e.target.value = '';
      return;
    }

    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const activeTaskId = submittingTaskId || 'task';
    const detId =
      'sub_' +
      String(activeTaskId).replace(/[^a-zA-Z0-9_-]/g, '_') +
      '_' +
      String(user.id || 'member').replace(/[^a-zA-Z0-9_-]/g, '_');
    const deterministicHostedUrl = `/api/files/${detId}`;

    setIsUploadingSubmission(true);
    setUploadProgress(15);
    setUploadStepText(`กำลังอ่านและเตรียมไฟล์ "${file.name}"...`);

    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        const pct = Math.min(40, Math.round((ev.loaded / ev.total) * 40));
        setUploadProgress(Math.max(15, pct));
      }
    };

    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setSubmittedFile({
        name: file.name,
        url: deterministicHostedUrl,
        size: sizeStr,
        hostedUrl: deterministicHostedUrl
      });
      setUploadProgress(45);
      setUploadStepText('กำลังอัปโหลดไฟล์ไปยังคลาวด์และ Google Drive ประจำโรงเรียน...');

      // Smooth progress ticker while uploading to server and Google Drive (45% -> 95%)
      let currentPct = 45;
      const progressTimer = setInterval(() => {
        currentPct = Math.min(95, currentPct + 6);
        setUploadProgress(currentPct);
        if (currentPct >= 80) {
          setUploadStepText('กำลังประมวลผลและเชื่อมโยงข้อมูลกับระบบ Google Drive...');
        }
      }, 100);

      try {
        const res = await fetch('/api/files/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: detId,
            fileName: file.name,
            dataUrl: base64,
            schoolId: user.schoolId,
            category: `TaskSubmissions_${currentAcademicYear}`,
            uploadedBy: user.fullName || user.id,
            uploadToDrive: true,
            taskId: activeTaskId,
            memberId: user.id
          })
        });

        clearInterval(progressTimer);

        let hostedUrl = deterministicHostedUrl;
        let driveFileId = '';
        let driveUrl = '';
        let downloadUrl = deterministicHostedUrl;

        if (res.ok) {
          const data = await res.json();
          hostedUrl = data?.url || deterministicHostedUrl;
          driveFileId = data?.driveFileId || extractDriveFileId(data?.driveUrl) || '';
          driveUrl = data?.driveUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing` : '');
          downloadUrl = data?.downloadUrl || (driveFileId ? `https://drive.google.com/uc?export=download&id=${driveFileId}` : hostedUrl);
        } else {
          // Client-side fallback to Google Drive
          try {
            const clientDriveUrl = await StorageService.uploadFileToGoogleDrive(
              base64,
              file.name,
              `TaskSubmissions_${currentAcademicYear}`
            );
            driveFileId = extractDriveFileId(clientDriveUrl);
            driveUrl = clientDriveUrl && clientDriveUrl.startsWith('http') ? clientDriveUrl : '';
          } catch {}
        }

        const bestUrl = driveUrl || hostedUrl;
        setSubmittedFile({
          name: file.name,
          url: bestUrl,
          size: sizeStr,
          hostedUrl,
          driveFileId: driveFileId || undefined,
          driveUrl: driveUrl || undefined,
          downloadUrl: downloadUrl || bestUrl
        });

        setUploadProgress(100);
        setIsUploadingSubmission(false);
        setUploadStepText('✓ อัปโหลดไฟล์เสร็จสมบูรณ์ 100% พร้อมกดยืนยันการส่งงาน');
        onShowToast(
          'success',
          'อัปโหลดไฟล์ครบ 100% แล้ว',
          `อัปโหลด "${file.name}" (${sizeStr}) ครบ 100% เรียบร้อยแล้ว กดยืนยันการส่งงานได้ทันที`
        );
      } catch {
        clearInterval(progressTimer);
        setSubmittedFile({
          name: file.name,
          url: deterministicHostedUrl,
          size: sizeStr,
          hostedUrl: deterministicHostedUrl,
          downloadUrl: deterministicHostedUrl
        });
        setUploadProgress(100);
        setIsUploadingSubmission(false);
        setUploadStepText('✓ อัปโหลดไฟล์เสร็จสมบูรณ์ 100% พร้อมกดยืนยันการส่งงาน');
        onShowToast(
          'success',
          'อัปโหลดไฟล์ครบ 100% แล้ว',
          `อัปโหลด "${file.name}" ครบ 100% เรียบร้อยแล้ว กดยืนยันการส่งงานได้ทันที`
        );
      }
    };

    reader.onerror = () => {
      setIsUploadingSubmission(false);
      setUploadProgress(0);
      setUploadStepText('');
      onShowToast('error', 'อ่านไฟล์ไม่สำเร็จ', 'ไม่สามารถอ่านไฟล์ได้ โปรดลองใหม่อีกครั้ง');
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFinalSubmitTask = async (taskId: string) => {
    if (!submittedFile || uploadProgress < 100 || isUploadingSubmission) {
      onShowToast('warning', 'ยังไม่พร้อมส่ง', 'กรุณารอให้อัปโหลดไฟล์ให้ครบ 100% ก่อนกดยืนยันการส่งงาน');
      return;
    }
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const finalFileUrl = submittedFile.url || submittedFile.hostedUrl || '';
    const nowIso = new Date().toISOString();
    const newSub: TaskSubmission = {
      memberId: user.id,
      memberName: user.fullName,
      fileUrl: finalFileUrl,
      fileName: submittedFile.name,
      fileSize: submittedFile.size,
      driveFileId: submittedFile.driveFileId,
      localHostedUrl: submittedFile.hostedUrl,
      downloadUrl: submittedFile.downloadUrl || finalFileUrl,
      submittedAt: nowIso
    };

    const normMyName = normalizePersonName(user.fullName);
    const currentSubs = task.submissions || [];
    const updatedSubs = [
      ...currentSubs.filter(s => 
        s.memberId !== user.id && 
        (!user.username || s.memberId?.toLowerCase() !== user.username.toLowerCase()) && 
        s.memberName !== user.fullName &&
        (!normMyName || normalizePersonName(s.memberName) !== normMyName)
      ),
      newSub
    ];

    const nextDeletedMap = { ...(task.deletedSubmissionsMap || {}) };
    delete nextDeletedMap[user.id];
    if (user.username) delete nextDeletedMap[user.username];
    if (user.fullName) delete nextDeletedMap[user.fullName];

    const isAllMembersDone = updatedSubs.length >= totalSchoolMembers;

    const updatedTask: TaskItem = {
      ...task,
      submissions: updatedSubs,
      deletedSubmissionsMap: Object.keys(nextDeletedMap).length > 0 ? nextDeletedMap : undefined,
      isCompleted: isAllMembersDone,
      submittedFileUrl: finalFileUrl,
      driveFileId: submittedFile.driveFileId || task.driveFileId,
      submittedFileName: submittedFile.name,
      submittedFileSize: submittedFile.size,
      submittedBy: user.id,
      submittedByName: user.fullName,
      submittedAt: nowIso
    };

    onSaveTask(updatedTask);

    setIsUploadingSubmission(false);
    setUploadProgress(0);
    setUploadStepText('');
    setSubmittingTaskId(null);
    setSubmittedFile(null);
    uploadPromiseRef.current = null;
    onShowToast(
      'success',
      'ส่งงานสำเร็จ 🎉',
      `ส่งงาน "${task.title}" เรียบร้อยแล้ว ระบบซิงค์ข้อมูลและไฟล์ไปยังหน้าผู้ดูแลระบบ (Admin) ทันที`
    );
  };

  // Member can remove their old submitted file to upload a new one
  const handleMemberRemoveOldFile = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const normMyName = normalizePersonName(user.fullName);
    const updatedSubs = (task.submissions || []).filter(s => 
      s.memberId !== user.id && 
      (!user.username || s.memberId?.toLowerCase() !== user.username.toLowerCase()) && 
      s.memberName !== user.fullName &&
      (!normMyName || normalizePersonName(s.memberName) !== normMyName)
    );
    const delIso = new Date().toISOString();
    const nextDeletedMap: Record<string, string> = {
      ...(task.deletedSubmissionsMap || {}),
      [user.id]: delIso
    };
    if (user.username) nextDeletedMap[user.username] = delIso;
    if (user.fullName) nextDeletedMap[user.fullName] = delIso;

    const updatedTask: TaskItem = {
      ...task,
      submissions: updatedSubs,
      deletedSubmissionsMap: nextDeletedMap,
      isCompleted: false,
      isManualCompleted: false,
      submittedFileUrl: undefined,
      submittedFileName: undefined,
      submittedFileSize: undefined,
      submittedBy: undefined,
      submittedByName: undefined
    };
    onSaveTask(updatedTask);
    setSubmittedFile(null);
    onShowToast('info', 'ลบไฟล์เดิมแล้ว', 'กรุณาเลือกไฟล์ใหม่ที่ต้องการส่ง');
  };

  const handleDeleteMemberSubmission = (
    taskId: string,
    memberId: string,
    memberName?: string,
    fileName?: string
  ) => {
    const updatedTasks = StorageService.deleteTaskSubmission(taskId, memberId, memberName, fileName);
    const updatedTask = updatedTasks.find(t => t.id === taskId);
    if (updatedTask) {
      onSaveTask(updatedTask);
      setStatusTaskModal(updatedTask);
    }
    onShowToast('info', 'ลบงานแล้ว', 'ลบงานที่สมาชิกส่งเรียบร้อยแล้ว และจะไม่กู้คืนกลับมา');
  };

  const handleDownloadFile = async (
    url: string,
    filename: string,
    key?: string,
    taskId?: string,
    memberId?: string
  ) => {
    if ((!url || url === '#') && !filename && !taskId) {
      onShowToast('info', 'ไม่มีไฟล์', 'รายการนี้ยังไม่มีไฟล์แนบ');
      return;
    }
    const safeKey = key || filename || url;
    setDownloadingFileKey(safeKey);
    try {
      const ok = await downloadRealFile(url, filename, undefined, user.schoolId, undefined, taskId, memberId);
      if (ok) {
        onShowToast('success', 'ดาวน์โหลดสำเร็จ', `ดาวน์โหลด "${filename || 'ไฟล์งาน'}" เรียบร้อยแล้ว`);
      } else {
        onShowToast('warning', 'เกิดข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      onShowToast('error', 'ดาวน์โหลดไม่สำเร็จ', err?.message || 'เกิดข้อผิดพลาดในการดาวน์โหลด');
    } finally {
      setDownloadingFileKey(null);
    }
  };

  // Render Centered Modal Popup Calendar
  const renderPopupCalendar = () => {
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(calMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${calYear}-${monthStr}-${dayStr}`;

      const isStart = startDate === dateStr;
      const isEnd = endDate === dateStr;
      const isInRange = startDate && endDate && dateStr > startDate && dateStr < endDate;

      days.push(
        <button
          key={dateStr}
          type="button"
          onClick={() => handleCalendarDayClick(dateStr)}
          className={`h-8 w-8 mx-auto rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
            isStart || isEnd ? 'bg-purple-600 text-white shadow-xs' :
            isInRange ? 'bg-purple-100 text-purple-900 rounded-none' :
            'hover:bg-slate-100 text-slate-700'
          }`}
        >
          {d}
        </button>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-800">
              เลือกวันที่
            </h4>
            <button
              type="button"
              onClick={() => setIsCalendarPopupOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => {
                if (calMonth === 0) {
                  setCalMonth(11);
                  setCalYear(y => y - 1);
                } else {
                  setCalMonth(m => m - 1);
                }
              }}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
            >
              ◀
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={calMonth}
                onChange={(e) => setCalMonth(Number(e.target.value))}
                className="text-xs font-bold bg-slate-100 px-2.5 py-1.5 rounded-xl border-0 cursor-pointer"
              >
                {thaiMonths.map((mName, idx) => (
                  <option key={idx} value={idx}>{mName}</option>
                ))}
              </select>
              <select
                value={calYear}
                onChange={(e) => setCalYear(Number(e.target.value))}
                className="text-xs font-bold bg-slate-100 px-2.5 py-1.5 rounded-xl border-0 cursor-pointer"
              >
                {[calYear - 2, calYear - 1, calYear, calYear + 1, calYear + 2].map(y => (
                  <option key={y} value={y}>{y + 543}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (calMonth === 11) {
                  setCalMonth(0);
                  setCalYear(y => y + 1);
                } else {
                  setCalMonth(m => m + 1);
                }
              }}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
            <span>อา</span><span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span>ส</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCalendarPopupOpen(false)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Sub-Tab Bar: มอบหมาย (ซ้าย) / ประกาศใหม่ (ขวา) ในบรรทัดสีม่วงอ่อน */}
      <div className="bg-purple-100/90 p-2 sm:p-2.5 rounded-2xl border border-purple-300/90 shadow-xs flex items-center justify-between gap-2 sm:gap-3 flex-nowrap overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          {/* Tab 1: มอบหมาย */}
          <button
            type="button"
            onClick={() => setActiveSubTab('assignment')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              activeSubTab === 'assignment'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white/80 hover:bg-white text-purple-900 border border-purple-200/60'
            }`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span className="truncate">{user.role === 'member' ? 'ส่งงาน' : 'มอบหมาย'}</span>
            <span className={`text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
              activeSubTab === 'assignment'
                ? 'bg-purple-700 text-white'
                : 'bg-purple-100 text-purple-800'
            }`}>
              {yearTasks.filter(t => (t.type || 'assignment') === 'assignment').length}
            </span>
          </button>

          {/* Tab 2: ประกาศใหม่ */}
          <button
            type="button"
            onClick={() => setActiveSubTab('announcement')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              activeSubTab === 'announcement'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white/80 hover:bg-white text-purple-900 border border-purple-200/60'
            }`}
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span className="truncate">ประกาศใหม่</span>
            <span className={`text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
              activeSubTab === 'announcement'
                ? 'bg-amber-700 text-white'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {yearTasks.filter(t => t.type === 'announcement').length}
            </span>
          </button>
        </div>

        {/* ปีการศึกษา (แสดงผลตามที่ Admin กำหนดในหน้าตั้งค่า) และปุ่มสร้างรายการ (+) */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div className="hidden sm:flex items-center gap-1.5 bg-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-purple-300/90 shadow-2xs shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800 whitespace-nowrap">ปีการศึกษา {currentAcademicYear}</span>
          </div>

          {user.role === 'admin' ? (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className={`w-8 h-8 text-white rounded-xl shadow-xs transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                activeSubTab === 'assignment' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
              title={activeSubTab === 'assignment' ? 'สร้างงานมอบหมาย (+)' : 'สร้างประกาศใหม่ (+)'}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          ) : null}
        </div>
      </div>

      {/* PAGE 1: งานมอบหมาย (ASSIGNMENT PAGE) */}
      {activeSubTab === 'assignment' && (
        <div className="bg-slate-50/80 p-4 sm:p-5 rounded-3xl border border-slate-200/80 space-y-4">

          <div className="space-y-3">
            {yearTasks.filter(t => (t.type || 'assignment') === 'assignment').length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">ไม่มีภาระงานมอบหมายในปีการศึกษา {currentAcademicYear}</p>
                <p className="text-xs text-slate-400">เมื่อมีงานใหม่ในปีการศึกษานี้จะปรากฏให้ส่งภาระงานที่นี่</p>
              </div>
            ) : (
              [...yearTasks.filter(t => (t.type || 'assignment') === 'assignment')]
                .sort((a, b) => {
                  const aDone = isTaskDoneForUser(a);
                  const bDone = isTaskDoneForUser(b);
                  if (aDone && !bDone) return 1;
                  if (!aDone && bDone) return -1;
                  return 0;
                })
                .map((task, index) => {
                  const isUrgent = task.priority === 'urgent';
                  const isHigh = task.priority === 'high';
                  const isDragging = draggedId === task.id;
                  const isDragOver = dragOverId === task.id;
                  const submittedCount = getTaskSubmittedCount(task);
                  const isFullySubmitted =
                    (totalSchoolMembers > 0 && submittedCount >= totalSchoolMembers) ||
                    Boolean(task.isManualCompleted) ||
                    Boolean(task.isCompleted);
                  const mySubmission = getMySubmission(task);
                  const hasMemberSubmitted = Boolean(mySubmission) || isFullySubmitted;
                  const isGreenCompleted = user.role === 'member' ? hasMemberSubmitted : isFullySubmitted;
                  const displayDesc = cleanDescription(task.description);

                  return (
                    <div
                      key={task.id}
                      data-task-id={task.id}
                      onTouchStart={() => handleTouchStart(task.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={() => setSelectedTaskDetailModal(task)}
                      className={`p-2.5 sm:py-3 sm:px-4 rounded-2xl border shadow-2xs transition-all flex items-center justify-between gap-2 sm:gap-3 cursor-pointer ${
                        isGreenCompleted 
                          ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 shadow-xs' 
                          : 'bg-white border-slate-200/90 hover:border-slate-300 text-slate-800'
                      } ${isDragging ? 'opacity-50 scale-[1.01]' : ''} ${isDragOver ? 'border-2 border-purple-500' : ''}`}
                    >
                      {/* ฝั่งซ้าย: ลำดับ แท็ก วันที่บรรทัดเดียว และชื่อเรื่อง */}
                      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                        {/* Grip Icon สำหรับ Admin */}
                        {user.role === 'admin' && (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 shrink-0" 
                            title="กดค้างเพื่อเลื่อนขึ้น-ลง"
                          >
                            <GripVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </div>
                        )}

                        {/* ลำดับรายการ */}
                        <span className={`w-5 sm:w-7 text-center text-xs sm:text-sm font-bold font-mono shrink-0 ${
                          isGreenCompleted ? 'text-emerald-800' : 'text-purple-800'
                        }`}>
                          {index + 1}.
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto max-w-full no-scrollbar pb-0.5">
                            <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-1 ${
                              isGreenCompleted ? 'bg-emerald-600 text-white shadow-2xs' :
                              isUrgent ? 'bg-rose-100 text-rose-700' :
                              isHigh ? 'bg-amber-100 text-amber-700' :
                              'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {isGreenCompleted
                                ? (user.role === 'member'
                                    ? (isFullySubmitted ? '✓ ส่งแล้ว (ส่งครบ)' : '✓ ส่งแล้ว')
                                    : '✓ ส่งครบแล้ว')
                                : (isUrgent ? 'ด่วนที่สุด' : isHigh ? 'ด่วน' : 'ปกติ')}
                            </span>

                            {task.dueDate && (
                              <span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 ${
                                isGreenCompleted 
                                  ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300' 
                                  : 'text-purple-900 bg-purple-50 border-purple-200'
                              }`}>
                                <Clock className={`w-3 h-3 shrink-0 ${isGreenCompleted ? 'text-emerald-700' : 'text-purple-600'}`} />
                                <span className="whitespace-nowrap">กำหนดส่ง: {formatThaiTaskDate(task.dueDate)}</span>
                              </span>
                            )}
                          </div>

                          <h4 
                            className={`text-xs sm:text-sm font-bold leading-tight truncate mt-0.5 cursor-pointer ${
                              isGreenCompleted ? 'text-emerald-950 hover:text-emerald-700' : 'text-slate-800 hover:text-purple-700'
                            }`}
                            title="กดเพื่อดูรายละเอียดภาระงานเต็ม"
                          >
                            {task.title}
                          </h4>
                          {displayDesc && (
                            <p 
                              className={`text-[11px] truncate mt-0.5 cursor-pointer hidden sm:block ${
                                isGreenCompleted ? 'text-emerald-800/80 hover:text-emerald-900' : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              {displayDesc}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ฝั่งขวา: ปุ่มการกระทำ (แสดงทั้งบน Mobile และ Desktop) */}
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap"
                      >
                        {user.role === 'admin' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleManualComplete(task)}
                              className={`w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-xl transition-colors cursor-pointer border inline-flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold shrink-0 ${
                                isFullySubmitted 
                                  ? 'bg-emerald-600 text-white border-emerald-600' 
                                  : 'bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border-slate-200'
                              }`}
                              title={isFullySubmitted ? 'ยกเลิกเครื่องหมายส่งครบ' : 'ทำเครื่องหมายว่าส่งครบแล้ว'}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="hidden md:inline">{isFullySubmitted ? 'ส่งครบแล้ว' : 'ส่งครบ'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setStatusTaskModal(task)}
                              className={`h-7 px-1.5 sm:h-auto sm:px-2.5 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer border shrink-0 ${
                                isFullySubmitted || submittedCount > 0
                                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
                                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                              }`}
                              title="สถานะการส่งงาน"
                            >
                              <Users className={`w-3.5 h-3.5 shrink-0 ${isFullySubmitted || submittedCount > 0 ? 'text-emerald-700' : 'text-purple-600'}`} />
                              <span className="font-mono">({submittedCount}/{totalSchoolMembers})</span>
                            </button>
                          </>
                        )}

                        {user.role === 'member' && (
                          <>
                            {mySubmission?.fileUrl && (
                              <>
                                <button
                                  type="button"
                                  disabled={downloadingFileKey === `my-sub-${task.id}`}
                                  onClick={() =>
                                    handleDownloadFile(
                                      mySubmission.fileUrl,
                                      mySubmission.fileName,
                                      `my-sub-${task.id}`,
                                      task.id,
                                      user.id
                                    )
                                  }
                                  className="h-7 px-2 sm:h-auto sm:px-2.5 sm:py-1.5 bg-white hover:bg-emerald-50 disabled:opacity-60 text-emerald-700 border border-emerald-300 rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors shadow-2xs"
                                  title={`ดาวน์โหลดไฟล์ที่ส่งแล้ว (${mySubmission.fileName})`}
                                >
                                  {downloadingFileKey === `my-sub-${task.id}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span className="hidden md:inline">
                                    {downloadingFileKey === `my-sub-${task.id}` ? 'กำลังโหลด...' : 'ดาวน์โหลด'}
                                  </span>
                                </button>

                                {/* ไอคอนแก้ไขสำหรับสมาชิก: แก้ไขโดยลบไฟล์เก่าและอัปโหลดไฟล์ใหม่ */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubmittingTaskId(task.id);
                                    setSubmittedFile(null);
                                  }}
                                  className="h-7 px-2 sm:h-auto sm:px-2.5 sm:py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors shadow-2xs"
                                  title="แก้ไขงานที่ส่ง (ลบไฟล์เก่าและอัปโหลดไฟล์ใหม่)"
                                >
                                  <Edit className="w-3.5 h-3.5 shrink-0" />
                                  <span className="hidden sm:inline">แก้ไข</span>
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSubmittingTaskId(task.id);
                                setSubmittedFile(null);
                              }}
                              className={`px-2.5 sm:px-3.5 py-1.5 text-white text-[11px] sm:text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                                hasMemberSubmitted
                                  ? 'bg-emerald-600 hover:bg-emerald-700'
                                  : 'bg-purple-600 hover:bg-purple-700'
                              }`}
                              title={hasMemberSubmitted ? 'ส่งงานแล้ว (คลิกหากต้องการแก้ไขหรืออัปโหลดไฟล์ใหม่)' : 'คลิกเพื่อส่งงาน'}
                            >
                              {hasMemberSubmitted ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>ส่งแล้ว</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5 shrink-0" />
                                  <span>ส่งงาน</span>
                                </>
                              )}
                            </button>
                          </>
                        )}

                        {user.role === 'admin' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenModal(task)}
                              className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors shrink-0"
                              title="แก้ไขงานมอบหมาย"
                            >
                              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteModal({
                                  type: 'task',
                                  id: task.id,
                                  title: task.title,
                                  isAnnouncement: false
                                });
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors shrink-0"
                              title="ลบรายการ"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* PAGE 2: ประกาศใหม่ (ANNOUNCEMENT PAGE) */}
      {activeSubTab === 'announcement' && (
        <div className="bg-slate-50/80 p-4 sm:p-5 rounded-3xl border border-slate-200/80 space-y-4">
          <div className="space-y-3">
            {yearTasks.filter(t => t.type === 'announcement').length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
                <Megaphone className="w-10 h-10 text-amber-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">ไม่มีประกาศแจ้งให้ทราบในปีการศึกษา {currentAcademicYear}</p>
              </div>
            ) : (
              yearTasks.filter(t => t.type === 'announcement').map((task, index) => {
                const isDragging = draggedId === task.id;
                const isDragOver = dragOverId === task.id;
                const displayDesc = cleanDescription(task.description);

                return (
                  <div
                    key={task.id}
                    data-task-id={task.id}
                    onTouchStart={() => handleTouchStart(task.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => setSelectedTaskDetailModal(task)}
                    className={`p-2.5 sm:py-3 sm:px-4 rounded-2xl border bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs transition-all flex items-center justify-between gap-2 sm:gap-3 text-slate-800 cursor-pointer ${
                      isDragging ? 'opacity-50 scale-[1.01]' : ''
                    } ${isDragOver ? 'border-2 border-amber-500' : ''}`}
                  >
                    {/* ฝั่งซ้าย: ลำดับ วันที่ และหัวข้อประกาศ */}
                    <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                      {user.role === 'admin' && (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 shrink-0" 
                          title="กดค้างเพื่อเลื่อนขึ้น-ลง"
                        >
                          <GripVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                      )}

                      <span className="w-5 sm:w-7 text-center text-xs sm:text-sm font-bold text-amber-800 font-mono shrink-0">
                        {index + 1}.
                      </span>

                      <div className="min-w-0 flex-1">
                        {task.dueDate && (
                          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto max-w-full no-scrollbar mb-0.5">
                            <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-lg border flex items-center gap-1 text-amber-900 bg-amber-50 border-amber-200 whitespace-nowrap shrink-0">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="whitespace-nowrap">วันที่: {formatThaiTaskDate(task.dueDate)}</span>
                            </span>
                          </div>
                        )}

                        <h4 
                          onClick={() => setSelectedTaskDetailModal(task)}
                          className="text-xs sm:text-sm font-bold leading-tight text-slate-800 truncate hover:text-amber-700 cursor-pointer" 
                          title="กดเพื่อดูประกาศเต็ม"
                        >
                          {task.title}
                        </h4>
                        {displayDesc && (
                          <p 
                            onClick={() => setSelectedTaskDetailModal(task)}
                            className="text-[11px] text-slate-500 truncate mt-0.5 cursor-pointer hover:text-slate-700 hidden sm:block"
                          >
                            {displayDesc}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ฝั่งขวา: ปุ่มดาวน์โหลด/แก้ไข/ลบ (แสดงทั้งบน Mobile และ Desktop) */}
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap"
                    >
                      {task.attachmentUrl && (
                        <button
                          type="button"
                          disabled={downloadingFileKey === `attach-${task.id}`}
                          onClick={() =>
                            handleDownloadFile(
                              task.attachmentUrl!,
                              task.submittedFileName || task.title || 'เอกสารแนบประกาศ',
                              `attach-${task.id}`,
                              task.id
                            )
                          }
                          className="h-7 px-2 sm:h-auto sm:px-2.5 sm:py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 rounded-xl text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                          title="ดาวน์โหลดไฟล์แนบ"
                        >
                          {downloadingFileKey === `attach-${task.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                          ) : (
                            <Download className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="hidden sm:inline">
                            {downloadingFileKey === `attach-${task.id}` ? 'กำลังโหลด...' : 'ดาวน์โหลด'}
                          </span>
                        </button>
                      )}

                      {user.role === 'admin' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenModal(task)}
                            className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors shrink-0"
                            title="แก้ไขประกาศ"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteModal({
                                type: 'task',
                                id: task.id,
                                title: task.title,
                                isAnnouncement: true
                              });
                            }}
                            className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors shrink-0"
                            title="ลบประกาศ"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: Admin Submission Status Modal */}
      {statusTaskModal && (() => {
        const liveStatusTask = tasks.find(t => t.id === statusTaskModal.id) || statusTaskModal;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  สถานะการส่งงาน: {liveStatusTask.title}
                </h3>
                <p className="text-xs text-slate-500">
                  กำหนดส่ง: {liveStatusTask.dueDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatusTaskModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {schoolMembers.length === 0 && getTaskEffectiveSubmissions(liveStatusTask).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">ไม่มีสมาชิกในระบบ</div>
              ) : (
                <>
                  {schoolMembers.map((mem, idx) => {
                    const submission = findMemberSubmission(liveStatusTask, mem);
                    const hasSubmitted = !!submission;
                    const effectiveFileUrl = resolveSubmissionDriveUrl(submission, liveStatusTask.submittedFileUrl, liveStatusTask);
                    const overdue = isOverdue(liveStatusTask.dueDate);
                    const dlKey = `sub-${liveStatusTask.id}-${mem.id}`;

                    return (
                      <div 
                        key={mem.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                          hasSubmitted ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 font-mono font-bold text-xs text-slate-700 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                              {mem.fullName} {mem.position ? `(${mem.position})` : ''}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {hasSubmitted ? (
                                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md truncate max-w-[220px]">
                                  ✓ ส่งแล้ว ({submission.fileName})
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                    ยังไม่ส่งงาน
                                  </span>
                                  {overdue && (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                      เลยกำหนด
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {hasSubmitted && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Download button - In-page direct download without navigating away */}
                            <button
                              type="button"
                              disabled={downloadingFileKey === dlKey}
                              onClick={() =>
                                handleDownloadFile(
                                  effectiveFileUrl,
                                  submission.fileName,
                                  dlKey,
                                  liveStatusTask.id,
                                  submission.memberId || mem.id
                                )
                              }
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="ดาวน์โหลดไฟล์ต้นฉบับแท้"
                            >
                              {downloadingFileKey === dlKey ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                  <span>กำลังดาวน์โหลด...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  <span>ดาวน์โหลด</span>
                                </>
                              )}
                            </button>

                            {/* Open in Google Drive */}
                            {getGoogleDriveViewUrl(effectiveFileUrl) && (
                              <a
                                href={getGoogleDriveViewUrl(effectiveFileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs no-underline"
                                title="เปิดดู/ดาวน์โหลดบน Google Drive โดยตรง"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Drive</span>
                              </a>
                            )}

                            {/* Delete submission icon */}
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteModal({
                                  type: 'submission',
                                  id: liveStatusTask.id,
                                  memberId: submission?.memberId || mem.id,
                                  memberName: submission?.memberName || mem.fullName,
                                  fileName: submission?.fileName,
                                  title: `งานที่ส่งของ ${mem.fullName}`
                                });
                              }}
                              className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                              title="ลบงานที่ส่ง"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* แสดงรายการส่งงานเพิ่มเติมหากมีสมาชิกที่ส่งเข้ามาแต่ไม่ได้อยู่ในรายการ schoolMembers */}
                  {(liveStatusTask.submissions || [])
                    .filter(s => s && !StorageService.isSubmissionDeleted(liveStatusTask.id, s.memberId, s.memberName, s.fileName) && !schoolMembers.some(m => findMemberSubmission(liveStatusTask, m)?.memberId === s.memberId || findMemberSubmission(liveStatusTask, m)?.memberName === s.memberName))
                    .map((sub, extraIdx) => {
                      const effectiveFileUrl = resolveSubmissionDriveUrl(sub, liveStatusTask.submittedFileUrl, liveStatusTask);
                      const extraDlKey = `sub-extra-${liveStatusTask.id}-${sub.memberId || extraIdx}`;
                      return (
                        <div
                          key={`extra-${sub.memberId}-${extraIdx}`}
                          className="p-3 rounded-2xl border bg-emerald-50/70 border-emerald-300 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 font-mono font-bold text-xs text-slate-700 flex items-center justify-center shrink-0">
                              {schoolMembers.length + extraIdx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                                {sub.memberName || sub.memberId}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md truncate max-w-[220px]">
                                  ✓ ส่งแล้ว ({sub.fileName})
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Download button - In-page direct download without navigating away */}
                            <button
                              type="button"
                              disabled={downloadingFileKey === extraDlKey}
                              onClick={() =>
                                handleDownloadFile(
                                  effectiveFileUrl,
                                  sub.fileName,
                                  extraDlKey,
                                  liveStatusTask.id,
                                  sub.memberId
                                )
                              }
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="ดาวน์โหลดไฟล์ต้นฉบับแท้"
                            >
                              {downloadingFileKey === extraDlKey ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                  <span>กำลังดาวน์โหลด...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  <span>ดาวน์โหลด</span>
                                </>
                              )}
                            </button>
                            {getGoogleDriveViewUrl(effectiveFileUrl) && (
                              <a
                                href={getGoogleDriveViewUrl(effectiveFileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs no-underline"
                                title="เปิดดู/ดาวน์โหลดบน Google Drive โดยตรง"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Drive</span>
                              </a>
                            )}
                            {/* Delete submission icon for extra submission */}
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteModal({
                                  type: 'submission',
                                  id: liveStatusTask.id,
                                  memberId: sub.memberId,
                                  memberName: sub.memberName,
                                  fileName: sub.fileName,
                                  title: `งานที่ส่งของ ${sub.memberName || sub.memberId || 'สมาชิก'}`
                                });
                              }}
                              className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                              title="ลบงานที่ส่ง"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setStatusTaskModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* MODAL: Create (แบ่งหน้า งานใหม่ กับ ประกาศใหม่) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-800">
                  สร้างรายการใหม่
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Sub-tabs inside modal: งานใหม่ / ประกาศใหม่ */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setModalType('assignment');
                  setIsCalendarPopupOpen(false);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modalType === 'assignment'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                งานใหม่
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalType('announcement');
                  setIsCalendarPopupOpen(false);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modalType === 'announcement'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ประกาศใหม่
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หัวข้อ *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={modalType === 'assignment' ? 'เช่น ส่งแผนการสอน ภาคเรียนที่ 1' : 'เช่น ประกาศกำหนดการประชุมประจำเดือน'}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รายละเอียด (ไม่บังคับ)
                </label>
                <textarea
                  name="description"
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="ระบุรายละเอียดข้อกำหนด หรือเนื้อหาประกาศ (เว้นว่างได้)"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Conditional inputs based on modalType */}
              {modalType === 'assignment' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      กำหนดส่ง (Due Date) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCalendarPopupOpen(true)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-mono font-bold text-slate-800 cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="truncate">
                          {formatThaiTaskDate(
                            startDate && endDate && endDate !== startDate
                              ? `${startDate} ถึง ${endDate}`
                              : startDate
                              ? startDate
                              : todayStr
                          )}
                        </span>
                      </span>
                      <span className="text-[10px] text-purple-700 font-sans font-semibold bg-purple-100 px-2 py-0.5 rounded-md shrink-0 ml-2">
                        เลือกปฏิทิน
                      </span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ระดับความเร่งด่วน
                    </label>
                    <select
                      name="priority"
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as 'urgent' | 'high' | 'normal')}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                    >
                      <option value="normal">ปกติ</option>
                      <option value="high">ด่วน</option>
                      <option value="urgent">ด่วนที่สุด</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เลือกวัน / ช่วงเวลาประกาศ *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCalendarPopupOpen(true)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-mono font-bold text-slate-800 cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="truncate">
                          {formatThaiTaskDate(
                            startDate && endDate && endDate !== startDate
                              ? `${startDate} ถึง ${endDate}`
                              : startDate
                              ? startDate
                              : todayStr
                          )}
                        </span>
                      </span>
                      <span className="text-[10px] text-purple-700 font-sans font-semibold bg-purple-100 px-2 py-0.5 rounded-md shrink-0 ml-2">
                        เลือกปฏิทิน
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Centered Popup Calendar Modal */}
      {isCalendarPopupOpen && renderPopupCalendar()}

      {/* MODAL: Member Submit / Edit File Upload */}
      {submittingTaskId && (() => {
        const currentTask = tasks.find(t => t.id === submittingTaskId);
        const mySub = currentTask ? getMySubmission(currentTask) : undefined;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="min-w-0 pr-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    {mySub ? 'แก้ไขงานที่ส่ง / เปลี่ยนไฟล์ใหม่' : 'ส่งงาน / อัปโหลดไฟล์แนบ'}
                  </h3>
                  {currentTask && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      ภาระงาน: {currentTask.title}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittingTaskId(null);
                    setSubmittedFile(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* กรณีมีไฟล์เดิมที่ส่งไว้แล้ว: แสดงไฟล์เดิม พร้อมปุ่มดาวน์โหลด และปุ่มลบไฟล์เดิม */}
              {mySub && !submittedFile && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-lg">
                      ไฟล์เดิมที่ส่งไว้แล้ว
                    </span>
                    <button
                      type="button"
                      disabled={downloadingFileKey === mySub.fileName}
                      onClick={() => handleDownloadFile(mySub.fileUrl, mySub.fileName, mySub.fileName, currentTask?.id, user.id)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {downloadingFileKey === mySub.fileName ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>กำลังดาวน์โหลด...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>ดาวน์โหลดไฟล์เดิม</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-emerald-200/80 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate" title={mySub.fileName}>
                        {mySub.fileName}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        ({mySub.fileSize || '1.0 MB'})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMemberRemoveOldFile(currentTask!.id)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                      title="กดลบไฟล์เก่าเพื่อเลือกไฟล์ใหม่"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>ลบไฟล์เก่า</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    * ท่านสามารถกด "ลบไฟล์เก่า" เพื่อยกเลิกไฟล์เดิม หรือเลือกไฟล์ใหม่ด้านล่างเพื่อส่งแทนที่ไฟล์เดิมได้ทันที
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <label className="border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-purple-50/40 hover:bg-purple-50/70 transition-colors">
                  <Upload className="w-8 h-8 text-purple-600 mb-2" />
                  <span className="text-xs font-bold text-slate-800">
                    {mySub ? 'คลิกเพื่อเลือกไฟล์ใหม่ (ส่งแทนที่ไฟล์เดิม)' : 'คลิกเพื่ออัปโหลดไฟล์งาน'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    รองรับทุกประเภทไฟล์ (Word .docx, Excel .xlsx, PDF, รูปภาพ ฯลฯ สูงสุดไม่เกิน 5MB ต่อไฟล์)
                  </span>
                  <input
                    type="file"
                    onChange={handleFileSubmitUpload}
                    className="hidden"
                  />
                </label>

                {submittedFile && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-950">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <div className="font-bold truncate">{submittedFile.name}</div>
                        <div className="text-[10px] text-emerald-700">ขนาด: {submittedFile.size} • พร้อมส่งแทนที่</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedFile(null);
                        setUploadProgress(0);
                        setUploadStepText('');
                      }}
                      className="text-rose-600 hover:text-rose-800 font-bold text-xs px-2 py-1 bg-white border border-rose-200 rounded-lg shrink-0 cursor-pointer"
                    >
                      ยกเลิกไฟล์นี้
                    </button>
                  </div>
                )}

                {/* Upload Progress Indicator with Percentage 0% - 100% */}
                {(isUploadingSubmission || uploadProgress > 0) && (
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-purple-900 truncate pr-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 shrink-0" />
                        <span className="truncate">{uploadStepText || 'กำลังประมวลผลและอัปโหลดไฟล์...'}</span>
                      </span>
                      <span className="font-mono text-purple-800 font-extrabold shrink-0 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md">
                        {uploadProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-purple-200/80 h-2.5 rounded-full overflow-hidden p-0.5">
                      <div
                        className="bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${Math.max(4, uploadProgress)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-purple-700 font-medium">
                      <span>{uploadProgress < 100 ? 'กำลังอัปโหลดข้อมูลและเชื่อมโยงระบบ...' : '✓ อัปโหลดครบ 100% พร้อมกดยืนยันการส่งงาน'}</span>
                      <span className="font-bold">{uploadProgress === 100 ? 'เสร็จสิ้น 100%' : `${uploadProgress}% / 100%`}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittingTaskId(null);
                      setSubmittedFile(null);
                      setUploadProgress(0);
                      setUploadStepText('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    ปิด
                  </button>
                  <button
                    type="button"
                    disabled={!submittedFile || isUploadingSubmission || uploadProgress < 100}
                    onClick={() => handleFinalSubmitTask(submittingTaskId)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all ${
                      uploadProgress === 100 && submittedFile && !isUploadingSubmission
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isUploadingSubmission ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                    ) : uploadProgress === 100 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>
                      {isUploadingSubmission
                        ? `กำลังอัปโหลดไฟล์... ${uploadProgress}%`
                        : !submittedFile
                        ? 'กรุณาเลือกไฟล์งาน'
                        : uploadProgress < 100
                        ? `รออัปโหลดครบ 100% (${uploadProgress}%)`
                        : mySub
                        ? 'บันทึกส่งงานใหม่'
                        : 'ยืนยันการส่งงาน'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pop-up Modal: แสดงข้อมูลภาระงาน/ประกาศแบบเต็มๆ */}
      {selectedTaskDetailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col space-y-4 p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                  {selectedTaskDetailModal.type === 'announcement' ? (
                    <Megaphone className="w-5 h-5 text-amber-600" />
                  ) : (
                    <FileCheck className="w-5 h-5 text-purple-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                      selectedTaskDetailModal.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                      selectedTaskDetailModal.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedTaskDetailModal.priority === 'urgent' ? 'ด่วนที่สุด' : selectedTaskDetailModal.priority === 'high' ? 'ด่วน' : 'ปกติ'}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                      {selectedTaskDetailModal.type === 'announcement' ? 'ประกาศข่าวสาร' : 'งานมอบหมาย'}
                    </span>
                    <span className="hidden sm:inline-block text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-mono">
                      ปีการศึกษา {selectedTaskDetailModal.academicYear || currentAcademicYear}
                    </span>
                  </div>
                  {selectedTaskDetailModal.dueDate && (
                    <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-600" />
                      <span>กำหนดส่ง: {formatThaiTaskDate(selectedTaskDetailModal.dueDate)}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskDetailModal(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Full Task Title Display */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ชื่อเรื่องเต็ม
              </label>
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm font-bold text-slate-800 break-words leading-relaxed max-h-48 overflow-y-auto">
                {selectedTaskDetailModal.title}
              </div>
            </div>

            {/* Full Description if available */}
            {cleanDescription(selectedTaskDetailModal.description) && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  รายละเอียด
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-700 break-words leading-relaxed max-h-36 overflow-y-auto">
                  {cleanDescription(selectedTaskDetailModal.description)}
                </div>
              </div>
            )}

            {/* Attachment download if available */}
            {selectedTaskDetailModal.attachmentUrl && (
              <div className="pt-1">
                <button
                  type="button"
                  disabled={downloadingFileKey === 'task-attachment'}
                  onClick={() =>
                    handleDownloadFile(
                      selectedTaskDetailModal.attachmentUrl!,
                      selectedTaskDetailModal.submittedFileName || selectedTaskDetailModal.title || 'เอกสารแนบ',
                      'task-attachment',
                      selectedTaskDetailModal.id
                    )
                  }
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {downloadingFileKey === 'task-attachment' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>กำลังดาวน์โหลดไฟล์แนบ...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-indigo-600" />
                      <span>ดาวน์โหลดไฟล์แนบ</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Action Buttons Footer */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {/* Member Action: Send / Edit Submission */}
              {user.role === 'member' && selectedTaskDetailModal.type !== 'announcement' && (() => {
                const mySubInModal = getMySubmission(selectedTaskDetailModal);
                return (
                  <div className="space-y-2">
                    {mySubInModal && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-800 truncate">ส่งแล้ว: {mySubInModal.fileName}</span>
                        </div>
                        <button
                          type="button"
                          disabled={downloadingFileKey === mySubInModal.fileName}
                          onClick={() =>
                            handleDownloadFile(
                              mySubInModal.fileUrl,
                              mySubInModal.fileName,
                              mySubInModal.fileName,
                              selectedTaskDetailModal.id,
                              user.id
                            )
                          }
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 shrink-0 inline-flex items-center gap-1 cursor-pointer"
                        >
                          {downloadingFileKey === mySubInModal.fileName ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>กำลังดาวน์โหลด...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              <span>ดาวน์โหลด</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittingTaskId(selectedTaskDetailModal.id);
                        setSelectedTaskDetailModal(null);
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      {mySubInModal ? <Edit className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                      <span>{mySubInModal ? 'แก้ไขงานที่ส่ง (ลบไฟล์เก่า / อัปโหลดใหม่)' : 'ส่งงานภาระงานนี้'}</span>
                    </button>
                  </div>
                );
              })()}

              {/* Admin Actions: Toggle Complete + Submission Status (View/Download inside Submission Status Modal) */}
              {user.role === 'admin' && selectedTaskDetailModal.type !== 'announcement' && (() => {
                const liveDetailTask = tasks.find(t => t.id === selectedTaskDetailModal.id) || selectedTaskDetailModal;
                const detailSubs = getTaskEffectiveSubmissions(liveDetailTask);
                return (
                <div className="space-y-2">
                  {/* Complete Checkmark Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleManualComplete(liveDetailTask);
                      setSelectedTaskDetailModal(null);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border transition-all ${
                      liveDetailTask.isManualCompleted || detailSubs.length >= totalSchoolMembers
                        ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {liveDetailTask.isManualCompleted || detailSubs.length >= totalSchoolMembers
                        ? 'ยกเลิกเครื่องหมายส่งครบ' 
                        : 'ทำเครื่องหมายว่าส่งครบแล้ว'}
                    </span>
                  </button>

                  {/* View Status */}
                  <button
                    type="button"
                    onClick={() => {
                      setStatusTaskModal(liveDetailTask);
                      setSelectedTaskDetailModal(null);
                    }}
                    className="w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>ดูสถานะการส่งงาน ({detailSubs.length}/{totalSchoolMembers} คน)</span>
                  </button>
                </div>
                );
              })()}

              {/* Edit & Delete in 2 columns (Admin only) */}
              {user.role === 'admin' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenModal(selectedTaskDetailModal);
                      setSelectedTaskDetailModal(null);
                    }}
                    className="py-2.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4 text-purple-600" />
                    <span>แก้ไข</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteModal({
                        type: 'task',
                        id: selectedTaskDetailModal.id,
                        title: selectedTaskDetailModal.title,
                        isAnnouncement: selectedTaskDetailModal.type === 'announcement'
                      });
                    }}
                    className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>ลบรายการ</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedTaskDetailModal(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer mt-1"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ยืนยันการลบ (ถามยืนยันทุกครั้งเมื่อกดลบ) */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">
                {confirmDeleteModal.type === 'submission'
                  ? 'ยืนยันการลบงานที่ส่ง'
                  : confirmDeleteModal.isAnnouncement
                  ? 'ยืนยันการลบประกาศ'
                  : 'ยืนยันการลบงานมอบหมาย'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed break-words">
                คุณต้องการลบ <span className="font-bold text-slate-800">"{confirmDeleteModal.title}"</span> ใช่หรือไม่?
              </p>
              <p className="text-[11px] text-rose-600 font-medium">
                เมื่อลบแล้วจะไม่สามารถกู้คืนข้อมูลได้
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteModal.type === 'submission' && (confirmDeleteModal.memberId || confirmDeleteModal.memberName)) {
                    handleDeleteMemberSubmission(
                      confirmDeleteModal.id,
                      confirmDeleteModal.memberId || '',
                      confirmDeleteModal.memberName,
                      confirmDeleteModal.fileName
                    );
                  } else {
                    onDeleteTask(confirmDeleteModal.id);
                    if (selectedTaskDetailModal?.id === confirmDeleteModal.id) {
                      setSelectedTaskDetailModal(null);
                    }
                    onShowToast(
                      'info',
                      confirmDeleteModal.isAnnouncement ? 'ลบประกาศสำเร็จ' : 'ลบรายการสำเร็จ',
                      `ลบ "${confirmDeleteModal.title}" เรียบร้อยแล้ว`
                    );
                  }
                  setConfirmDeleteModal(null);
                }}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
