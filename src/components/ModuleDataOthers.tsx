import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Student, 
  Personnel, 
  SchoolInfo, 
  GradeLevel, 
  UserSession,
  ParentsMaritalStatus,
  AttendanceRecord
} from '../types';
import { StorageService } from '../services/storage';
import { 
  Users, 
  UserPlus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Save, 
  Building2, 
  Smile, 
  Upload, 
  Phone, 
  Shield, 
  HeartPulse, 
  Calendar,
  Briefcase,
  DollarSign,
  Heart,
  Home,
  AlertCircle,
  Download,
  Printer,
  FileText,
  X,
  Clock,
  Plus,
  CheckCircle2,
  RotateCcw,
  FileCheck,
  MapPin,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CreditCard,
  Loader2,
  Edit3,
  ArrowRightLeft,
  ArrowRight,
  Maximize2,
  CheckSquare,
  Square
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { StudentCardBatchModal, captureElementAsA4Canvas } from './StudentCardBatchModal';
import { ThaiDatePicker, formatIsoToThaiDisplay } from './ThaiDatePicker';
import { exportSheetsToPdf } from '../utils/pdfExport';

export const RELIGION_OPTIONS = ['พุทธ', 'อิสลาม', 'คริสต์', 'พราหมณ์-ฮินดู', 'ซิกข์', 'ไม่มีศาสนา', 'อื่นๆ'];

export const EDUCATION_LEVEL_OPTIONS = [
  'ไม่ได้ศึกษา',
  'ต่ำกว่าประถมศึกษา',
  'ประถมศึกษา',
  'มัธยมศึกษาตอนต้น (ม.3)',
  'มัธยมศึกษาตอนปลาย / ปวช.',
  'อนุปริญญา / ปวส.',
  'ปริญญาตรี',
  'สูงกว่าปริญญาตรี (ปริญญาโท/เอก)',
  'อื่นๆ'
];

export const PARENTS_MARITAL_STATUS_OPTIONS = [
  'อยู่ด้วยกัน',
  'แยกกันอยู่',
  'หย่าร้าง',
  'พ่อหรือแม่เสียชีวิต/สาบสูญ',
  'แม่สมรสใหม่',
  'พ่อสมรสใหม่',
  'พ่อแม่ทอดทิ้ง',
  'อื่นๆ'
];

export const HOUSING_STATUS_OPTIONS = [
  'บ้านตัวเอง',
  'เช่า',
  'อาศัยอยู่กับผู้อื่นไม่เสียค่าใช้จ่าย',
  'บ้านพัก/หอพัก',
  'อื่นๆ'
];

export const LIVING_WITH_OPTIONS = [
  'บิดามารดา',
  'บิดา',
  'มารดา',
  'ปู่ / ย่า',
  'ตา / ยาย',
  'ญาติ',
  'อื่นๆ'
];

export const TRAVEL_METHOD_OPTIONS = [
  'เดิน',
  'จักรยาน',
  'รถโรงเรียน',
  'จักรยานยนต์ส่วนตัว',
  'รถส่วนตัว',
  'รถโดยสารประจำทาง',
  'อื่นๆ'
];

export const formatDutySignatureName = (rawName: string): string => {
  if (!rawName) return '';
  let name = rawName.trim().replace(/^ครู\s*/u, '');
  return name.replace(/^(นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|ดร\.|ว่าที่\s*ร\.ต\.|ผศ\.|รศ\.|ศ\.|นายแพทย์|แพทย์หญิง|ครู)\s+/u, '$1');
};

export interface LeaveRequest {
  id: string;
  userId?: string;
  username?: string;
  teacherName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  directorName?: string;
  personnelOfficer?: string;
  supervisorName?: string;
  supervisorPosition?: string;
  status: 'รออนุมัติ' | 'อนุมัติ' | 'ไม่อนุมัติ';
  fiscalYear?: number;
  leaveRound?: '1' | '2';
  schoolId?: string;
  createdAt: string;
}

export const SUPERVISOR_POSITION_OPTIONS = [
  'ผู้อำนวยการ',
  'รองผู้อำนวยการ',
  'ชำนาญการ',
  'ชำนาญการพิเศษ',
  'เชี่ยวชาญ',
  'ครูชำนาญการ',
  'ครูชำนาญการพิเศษ',
  'ครูเชี่ยวชาญ',
  'อื่นๆ'
] as const;

export const formatThaiPersonName = (raw?: string): string => {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^(ครู|นาย|นางสาว|นาง|ดร\.|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี)\s+(?=(นาย|นางสาว|นาง|ดร\.|ครู|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี))/u, '')
    .replace(/^(นางสาว|นาย|นาง|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|ดร\.|ครู|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี)\s+/u, '$1');
};

export const getThaiFiscalYear = (dateStr?: string): number => {
  if (!dateStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const thaiYear = y > 2400 ? y : y + 543;
    return m >= 10 ? thaiYear + 1 : thaiYear;
  }
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const thaiYear = y > 2400 ? y : y + 543;
    return m >= 10 ? thaiYear + 1 : thaiYear;
  }
  return 2569;
};

export interface LeaveRoundInfo {
  fiscalYear: number;
  round: '1' | '2';
  roundTitle: string;
  roundShort: string;
  periodDateRange: string;
}

export const getLeaveRoundInfo = (dateStr?: string): LeaveRoundInfo => {
  const fy = getThaiFiscalYear(dateStr);
  let round: '1' | '2' = '1';
  if (dateStr) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10);
      // ครั้งที่ 1 (1 ตุลาคม – 31 มีนาคม): เดือน 10, 11, 12, 1, 2, 3
      // ครั้งที่ 2 (1 เมษายน – 30 กันยายน): เดือน 4, 5, 6, 7, 8, 9
      round = (m >= 10 || m <= 3) ? '1' : '2';
    }
  } else {
    const now = new Date();
    const m = now.getMonth() + 1;
    round = (m >= 10 || m <= 3) ? '1' : '2';
  }
  return {
    fiscalYear: fy,
    round,
    roundTitle: round === '1' ? 'ครั้งที่ 1 (1 ตุลาคม – 31 มีนาคม)' : 'ครั้งที่ 2 (1 เมษายน – 30 กันยายน)',
    roundShort: round === '1' ? 'ครั้งที่ 1' : 'ครั้งที่ 2',
    periodDateRange: round === '1' ? '1 ต.ค. – 31 มี.ค.' : '1 เม.ย. – 30 ก.ย.'
  };
};

export const cleanTeacherName = (str?: string): string =>
  (str || '')
    .replace(/^(ครู|นาย|นาง|นางสาว|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี|ดร\.)\s*/, '')
    .trim()
    .toLowerCase();

export const calculateLeaveDaysCount = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 1;
  const s = new Date(startDate);
  const e = new Date(endDate);
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return isNaN(diff) || diff < 0 ? 1 : diff + 1;
};

export interface DutyAssignment {
  id: string;
  dayOfWeek: 'วันจันทร์' | 'วันอังคาร' | 'วันพุธ' | 'วันพฤหัสบดี' | 'วันศุกร์';
  teacherNames: string;
  dutyType: 'ครูเวรประจำวัน' | 'เวรยามรักษาความปลอดภัย' | 'เวรโภชนาการ';
  location: string;
  note?: string;
}

export interface DutyTimeSlot {
  id: string;
  time: string; // e.g. "07:00 น.", "07:50 น.", "08:10 น.", "15:30 น." or custom
  description: string;
}

export interface DailyDutyLog {
  id: string;
  date: string; // YYYY-MM-DD
  dutyTeacherName: string;
  dutyType: string;
  location: string;
  weatherCondition?: string;
  overallStatus?: string;
  timeSlots: DutyTimeSlot[];
  incidentsNote?: string;
  academicYear?: string;
  semester?: string;
  createdAt: string;
}

export const DEFAULT_DUTY_SLOTS: DutyTimeSlot[] = [
  {
    id: 'slot-700',
    time: '07:00 น.',
    description: 'ปฏิบัติหน้าที่ต้อนรับนักเรียนหน้าประตูโรงเรียน ตรวจดูความเรียบร้อยการแต่งกาย และกำกับดูแลความปลอดภัยการเดินทาง'
  },
  {
    id: 'slot-750',
    time: '07:50 น.',
    description: 'กำกับดูแลนักเรียนเข้าแถวเคารพธงชาติ สวดมนต์ แผ่เมตตา และทำกิจกรรมหน้าเสาธง'
  },
  {
    id: 'slot-810',
    time: '08:10 น.',
    description: 'อบรมให้โอวาทนักเรียนหลังเคารพธงชาติ ตรวจเช็กระเบียบวินัย และส่งนักเรียนเข้าห้องเรียนตามปกติ'
  },
  {
    id: 'slot-1530',
    time: '15:30 น.',
    description: 'ปฏิบัติหน้าที่ส่งนักเรียนกลับบ้าน ควบคุมรถรับส่งนักเรียน และตรวจความเรียบร้อยรอบบริเวณโรงเรียนก่อนปิดประตู'
  }
];

export interface DutyGradeOption {
  grade: GradeLevel;
  shortLabel: string;
  label: string;
  group: 'kindergarten' | 'primary' | 'secondary';
  groupLabel: string;
}

export const DUTY_REPORT_GRADE_OPTIONS: DutyGradeOption[] = [
  { grade: 'อ.1', shortLabel: 'อ.1', label: 'อนุบาล 1', group: 'kindergarten', groupLabel: 'ระดับปฐมวัย (อนุบาล)' },
  { grade: 'อ.2', shortLabel: 'อ.2', label: 'อนุบาล 2', group: 'kindergarten', groupLabel: 'ระดับปฐมวัย (อนุบาล)' },
  { grade: 'อ.3', shortLabel: 'อ.3', label: 'อนุบาล 3', group: 'kindergarten', groupLabel: 'ระดับปฐมวัย (อนุบาล)' },
  { grade: 'ป.1', shortLabel: 'ป.1', label: 'ประถมศึกษาปีที่ 1', group: 'primary', groupLabel: 'ระดับประถมศึกษา' },
  { grade: 'ป.2', shortLabel: 'ป.2', label: 'ประถมศึกษาปีที่ 2', group: 'primary', groupLabel: 'ระดับประถมศึกษา' },
  { grade: 'ป.3', shortLabel: 'ป.3', label: 'ประถมศึกษาปีที่ 3', group: 'primary', groupLabel: 'ระดับประถมศึกษา' },
  { grade: 'ป.4', shortLabel: 'ป.4', label: 'ประถมศึกษาปีที่ 4', group: 'primary', groupLabel: 'ระดับประถมศึกษา' },
  { grade: 'ป.5', shortLabel: 'ป.5', label: 'ประถมศึกษาปีที่ 5', group: 'primary', groupLabel: 'ระดับประถมศึกษา' },
  { grade: 'ป.6', shortLabel: 'ป.6', label: 'ประถมศึกษาปีที่ 6', group: 'primary', groupLabel: 'ระดับประถมศึกษา' },
  { grade: 'ม.1', shortLabel: 'ม.1', label: 'มัธยมศึกษาปีที่ 1', group: 'secondary', groupLabel: 'ระดับมัธยมศึกษาตอนต้น' },
  { grade: 'ม.2', shortLabel: 'ม.2', label: 'มัธยมศึกษาปีที่ 2', group: 'secondary', groupLabel: 'ระดับมัธยมศึกษาตอนต้น' },
  { grade: 'ม.3', shortLabel: 'ม.3', label: 'มัธยมศึกษาปีที่ 3', group: 'secondary', groupLabel: 'ระดับมัธยมศึกษาตอนต้น' },
];

export const DEFAULT_DUTY_REPORT_GRADES: string[] = ['อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];

interface ModuleDataOthersProps {
  user: UserSession;
  students: Student[];
  attendance?: AttendanceRecord[];
  personnel: Personnel[];
  schoolInfo: SchoolInfo;
  onSaveStudent: (student: Student) => void;
  onSaveBulkStudents?: (students: Student[]) => void;
  onDeleteStudent: (id: string) => void;
  onSavePersonnel: (person: Personnel) => void;
  onDeletePersonnel: (id: string) => void;
  onSaveSchoolInfo: (info: SchoolInfo) => void;
  onOpenLightbox: (imageUrl: string, title: string, subtitle?: string) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

export const ModuleDataOthers: React.FC<ModuleDataOthersProps> = ({
  user,
  students,
  attendance = [],
  personnel,
  schoolInfo,
  onSaveStudent,
  onSaveBulkStudents,
  onDeleteStudent,
  onSavePersonnel,
  onDeletePersonnel,
  onSaveSchoolInfo,
  onOpenLightbox,
  onShowToast
}) => {
  const [studentAttendanceSyncTick, setStudentAttendanceSyncTick] = useState(0);

  // Synchronize live student information and attendance records fromหน้าเช็กเวลา/เงินฝาก
  const effectiveStudents = useMemo(() => {
    const local = StorageService.getStudents();
    return (local && local.length > 0) ? local : students;
  }, [students, studentAttendanceSyncTick]);

  const effectiveAttendance = useMemo(() => {
    const local = StorageService.getAttendance();
    return (local && local.length > 0) ? local : (attendance || []);
  }, [attendance, studentAttendanceSyncTick]);

  const [activeSubTab, setActiveSubTab] = useState<'students' | 'personnel' | 'school' | 'leave' | 'duty'>('students');

  const defaultLeaveRequests: LeaveRequest[] = [
    {
      id: 'leave-1',
      teacherName: 'นางสาวสมใจ รักเรียน',
      leaveType: 'ลากิจ',
      startDate: '2026-06-15',
      endDate: '2026-06-16',
      reason: 'ไปติดต่อราชการด่วนที่อำเภอ',
      status: 'อนุมัติ',
      fiscalYear: 2569,
      createdAt: '2026-06-15T08:30:00.000Z'
    },
    {
      id: 'leave-2',
      teacherName: 'นางสาวสมใจ รักเรียน',
      leaveType: 'ลาป่วย',
      startDate: '2026-08-10',
      endDate: '2026-08-11',
      reason: 'มีอาการไข้หวัด พักผ่อนตามแพทย์สั่ง',
      status: 'อนุมัติ',
      fiscalYear: 2569,
      createdAt: '2026-08-10T08:30:00.000Z'
    },
    {
      id: 'leave-3',
      teacherName: 'นายวิชัย สุวรรณมาลา',
      leaveType: 'ลากิจ',
      startDate: '2026-07-20',
      endDate: '2026-07-20',
      reason: 'กิจธุระสำคัญเกี่ยวกับครอบครัว',
      status: 'อนุมัติ',
      fiscalYear: 2569,
      createdAt: '2026-07-20T08:30:00.000Z'
    },
    {
      id: 'leave-prev-1',
      teacherName: 'นางสาวสมใจ รักเรียน',
      leaveType: 'ลากิจ',
      startDate: '2025-05-12',
      endDate: '2025-05-13',
      reason: 'ติดต่อธุระส่วนตัวต่างจังหวัด',
      status: 'อนุมัติ',
      fiscalYear: 2568,
      createdAt: '2025-05-12T08:30:00.000Z'
    }
  ];

  const defaultDutyAssignments: DutyAssignment[] = [
    {
      id: 'duty-1',
      dayOfWeek: 'วันจันทร์',
      teacherNames: 'นายวิชัย สุวรรณมาลา, นางสาวสมใจ รักเรียน',
      dutyType: 'ครูเวรประจำวัน',
      location: 'หน้าประตูโรงเรียน / อาคาร 1',
      note: 'ดูแลการมาโรงเรียนและการเคารพธงชาติ'
    },
    {
      id: 'duty-2',
      dayOfWeek: 'วันอังคาร',
      teacherNames: 'นายสมชาย ใจดี, นางอารี ศรีสุข',
      dutyType: 'ครูเวรประจำวัน',
      location: 'โรงอาหาร / สนามเด็กเล่น',
      note: 'ดูแลความเรียบร้อยช่วงพักกลางวัน'
    }
  ];

  const defaultDutyLogs: DailyDutyLog[] = [
    {
      id: 'dlog-1',
      date: new Date().toISOString().split('T')[0],
      dutyTeacherName: user.fullName || 'นางสาวสมใจ รักเรียน',
      dutyType: 'ครูเวรประจำวัน',
      location: 'หน้าประตูโรงเรียน / อาคารเรียน 1',
      weatherCondition: 'แจ่มใส เหตุการณ์ทั่วไปปกติ',
      overallStatus: 'นักเรียนมาโรงเรียนตรงเวลา การเข้าแถวและกิจกรรมเลิกเรียนเรียบร้อยดี',
      timeSlots: DEFAULT_DUTY_SLOTS,
      incidentsNote: 'ไม่มีเหตุการณ์ผิดปกติ หรืออุบัติเหตุเกิดขึ้น',
      createdAt: new Date().toISOString()
    }
  ];

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() =>
    StorageService.getLeaveRequests(defaultLeaveRequests)
  );

  const [dutyAssignments, setDutyAssignments] = useState<DutyAssignment[]>(() =>
    StorageService.getDutyAssignments(defaultDutyAssignments)
  );

  const [dutyLogs, setDutyLogs] = useState<DailyDutyLog[]>(() =>
    StorageService.getDailyDutyLogs(defaultDutyLogs)
  );

  useEffect(() => {
    // Ensure initial duty logs and duty assignments are persisted in storage cache so background syncs merge additively
    if (localStorage.getItem('ams_daily_duty_logs_v1') === null) {
      StorageService.setDailyDutyLogs(defaultDutyLogs);
    }
    if (localStorage.getItem('ams_duty_assignments_v1') === null) {
      StorageService.setDutyAssignments(defaultDutyAssignments);
    }

    const unsubscribe = StorageService.subscribe((changedKeys) => {
      if (changedKeys.some(k => k.startsWith('ams_leave_requests_v1') || k === 'ams_deleted_leave_ids')) {
        setLeaveRequests(StorageService.getLeaveRequests(defaultLeaveRequests));
      }
      if (changedKeys.some(k => k.startsWith('ams_duty_assignments_v1'))) {
        setDutyAssignments(StorageService.getDutyAssignments(defaultDutyAssignments));
      }
      if (changedKeys.some(k => k.startsWith('ams_daily_duty_logs_v1') || k === 'ams_deleted_duty_log_ids')) {
        setDutyLogs(StorageService.getDailyDutyLogs(defaultDutyLogs));
      }
      if (changedKeys.some(k => k.startsWith('ams_students') || k.startsWith('ams_attendance'))) {
        setStudentAttendanceSyncTick(t => t + 1);
      }
    });
    return () => unsubscribe();
  }, []);

  const [dutyLogSubView, setDutyLogSubView] = useState<'fill' | 'history'>('fill');

  // Helper to retrieve the latest duty log history for pre-filling "รายละเอียดการบรรยายการปฏิบัติหน้าที่"
  const getLatestDutyLogHistory = useCallback(() => {
    let latestSlots: DutyTimeSlot[] = DEFAULT_DUTY_SLOTS.map(s => ({ ...s, id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` }));
    let latestWeather = 'แจ่มใส เหตุการณ์ทั่วไปปกติ';
    let latestOverall = 'การปฏิบัติหน้าที่เรียบร้อยดี นักเรียนปฏิบัติตามระเบียบวินัย';

    const currentDutyLogs = StorageService.getDailyDutyLogs(dutyLogs);
    if (currentDutyLogs && currentDutyLogs.length > 0) {
      const sorted = [...currentDutyLogs].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
      const latest = sorted[0];
      if (latest && Array.isArray(latest.timeSlots) && latest.timeSlots.length > 0) {
        latestSlots = latest.timeSlots.map((s: DutyTimeSlot, idx: number) => ({ ...s, id: `slot-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}` }));
        if (latest.weatherCondition) latestWeather = latest.weatherCondition;
        if (latest.overallStatus) latestOverall = latest.overallStatus;
        return { latestSlots, latestWeather, latestOverall, sourceDate: latest.date, sourceTeacher: latest.dutyTeacherName };
      }
    }

    try {
      const savedTemplate = localStorage.getItem('ams_saved_duty_template_v1');
      const savedSummary = localStorage.getItem('ams_latest_duty_summary_v1');
      if (savedTemplate) {
        const parsed = JSON.parse(savedTemplate);
        if (Array.isArray(parsed) && parsed.length > 0) {
          latestSlots = parsed.map((s: DutyTimeSlot, idx: number) => ({ ...s, id: `slot-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}` }));
        }
      }
      if (savedSummary) {
        latestWeather = savedSummary;
        latestOverall = savedSummary;
      }
    } catch (e) {}

    return { latestSlots, latestWeather, latestOverall, sourceDate: undefined, sourceTeacher: undefined };
  }, [dutyLogs]);

  // Duty Log Fill Form State
  const [dutyLogForm, setDutyLogForm] = useState<{
    id?: string;
    date: string;
    dutyTeacherName: string;
    dutyType: string;
    location: string;
    weatherCondition: string;
    overallStatus: string;
    timeSlots: DutyTimeSlot[];
    incidentsNote: string;
  }>(() => {
    const history = getLatestDutyLogHistory();
    return {
      date: new Date().toISOString().split('T')[0],
      dutyTeacherName: user.fullName || '',
      dutyType: 'ครูเวรประจำวัน',
      location: 'หน้าประตูโรงเรียน / อาคารเรียน 1',
      weatherCondition: history.latestWeather,
      overallStatus: history.latestOverall,
      timeSlots: history.latestSlots,
      incidentsNote: ''
    };
  });

  const resetDutyFormToLatestHistory = useCallback((targetDate?: string) => {
    const history = getLatestDutyLogHistory();
    setDutyLogForm({
      id: undefined,
      date: targetDate || new Date().toISOString().split('T')[0],
      dutyTeacherName: user.fullName || '',
      dutyType: 'ครูเวรประจำวัน',
      location: 'หน้าประตูโรงเรียน / อาคารเรียน 1',
      weatherCondition: history.latestWeather,
      overallStatus: history.latestOverall,
      timeSlots: history.latestSlots,
      incidentsNote: ''
    });
  }, [getLatestDutyLogHistory, user.fullName]);

  // User duty location history (top 3-4 entries entered by current teacher/member)
  const userLocationHistory = React.useMemo(() => {
    const currentName = (dutyLogForm.dutyTeacherName || user.fullName || '').trim();
    const pastLocations = dutyLogs
      .filter(l => (l.dutyTeacherName || '').trim() === currentName && Boolean(l.location && l.location.trim()))
      .map(l => l.location.trim());
    return Array.from(new Set(pastLocations)).slice(0, 4);
  }, [dutyLogs, dutyLogForm.dutyTeacherName, user.fullName]);

  const [previewDutyLog, setPreviewDutyLog] = useState<DailyDutyLog | null>(null);
  const [previewAllDutyLogs, setPreviewAllDutyLogs] = useState(false);
  const [isDownloadingDutyPdf, setIsDownloadingDutyPdf] = useState(false);
  const [confirmDeleteDutyLog, setConfirmDeleteDutyLog] = useState<DailyDutyLog | null>(null);
  const [isDutyCalendarModalOpen, setIsDutyCalendarModalOpen] = useState(false);
  const [editingSlotPopup, setEditingSlotPopup] = useState<{ index: number; time: string; description: string } | null>(null);

  // Admin-configurable Grade Levels to display in Duty Report student attendance table (อ.1 ถึง ม.3)
  const [isDutyGradesConfigOpen, setIsDutyGradesConfigOpen] = useState(false);
  const [selectedDutyGrades, setSelectedDutyGrades] = useState<string[]>(() => {
    if (Array.isArray(schoolInfo.dutyReportGrades) && schoolInfo.dutyReportGrades.length > 0) {
      return schoolInfo.dutyReportGrades;
    }
    try {
      const raw = localStorage.getItem('ams_duty_report_grades_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_DUTY_REPORT_GRADES;
  });

  useEffect(() => {
    if (Array.isArray(schoolInfo.dutyReportGrades) && schoolInfo.dutyReportGrades.length > 0) {
      setSelectedDutyGrades(schoolInfo.dutyReportGrades);
    }
  }, [schoolInfo.dutyReportGrades]);

  const effectiveDutyReportGrades = useMemo(() => {
    if (Array.isArray(schoolInfo.dutyReportGrades) && schoolInfo.dutyReportGrades.length > 0) {
      return schoolInfo.dutyReportGrades;
    }
    if (selectedDutyGrades && selectedDutyGrades.length > 0) {
      return selectedDutyGrades;
    }
    return DEFAULT_DUTY_REPORT_GRADES;
  }, [schoolInfo.dutyReportGrades, selectedDutyGrades]);

  const handleSaveDutyGrades = (newGrades: string[]) => {
    setSelectedDutyGrades(newGrades);
    try {
      localStorage.setItem('ams_duty_report_grades_v1', JSON.stringify(newGrades));
    } catch {}
    const updatedInfo = {
      ...schoolInfo,
      dutyReportGrades: newGrades
    };
    onSaveSchoolInfo(updatedInfo);
    StorageService.setSchoolInfo(updatedInfo);
    onShowToast(
      'success',
      'บันทึกระดับชั้นสำเร็จ 🎉',
      `ตั้งค่าแสดง ${newGrades.length} ระดับชั้นในตารางรายงานครูเวรหน้าตัวอย่างของทุกคนเรียบร้อยแล้ว`
    );
  };

  const handleDownloadDutyPdf = async (targetLog: DailyDutyLog) => {
    if (!targetLog || isDownloadingDutyPdf) return;
    const sheetEl = document.getElementById('duty-official-a4-print');
    if (!sheetEl) return;

    setIsDownloadingDutyPdf(true);
    try {
      const teacherClean = (targetLog.dutyTeacherName || 'ครูเวร').replace(/\s+/g, '_');
      const fileName = `รายงานครูเวร_${teacherClean}_${targetLog.date || 'ประจำวัน'}.pdf`;
      const ok = await exportSheetsToPdf({
        container: sheetEl,
        filename: fileName,
        orientation: 'portrait',
      });
      if (ok) {
        onShowToast('success', 'ดาวน์โหลดสำเร็จ', `ดาวน์โหลดไฟล์ ${fileName} เรียบร้อยแล้ว`);
      } else {
        onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error('Failed to download duty PDF:', err);
      onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloadingDutyPdf(false);
    }
  };

  const handleDownloadAllDutyPdf = async () => {
    if (isDownloadingDutyPdf) return;
    const container = document.getElementById('duty-all-official-a4-print');
    if (!container) return;

    setIsDownloadingDutyPdf(true);
    try {
      const fileName = `รายงานครูเวรทั้งหมด_${new Date().toISOString().split('T')[0]}.pdf`;
      const ok = await exportSheetsToPdf({
        container,
        filename: fileName,
        orientation: 'portrait',
      });
      if (ok) {
        onShowToast('success', 'ดาวน์โหลดสำเร็จ', `ดาวน์โหลดไฟล์ ${fileName} เรียบร้อยแล้ว`);
      } else {
        onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error('Failed to download all duty PDFs:', err);
      onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloadingDutyPdf(false);
    }
  };

  // Time Slot Handlers
  const handleTimeSlotChange = (index: number, field: 'time' | 'description', value: string) => {
    setDutyLogForm(prev => {
      const updatedSlots = [...prev.timeSlots];
      updatedSlots[index] = {
        ...updatedSlots[index],
        [field]: value
      };
      try {
        localStorage.setItem('ams_saved_duty_template_v1', JSON.stringify(updatedSlots));
      } catch (e) {}
      return { ...prev, timeSlots: updatedSlots };
    });
  };

  const handleInsertRow = (insertIndex: number) => {
    const newSlot: DutyTimeSlot = {
      id: `slot-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: '12:00 น.',
      description: ''
    };
    setDutyLogForm(prev => {
      const nextSlots = [...prev.timeSlots];
      nextSlots.splice(insertIndex, 0, newSlot);
      try {
        localStorage.setItem('ams_saved_duty_template_v1', JSON.stringify(nextSlots));
      } catch (e) {}
      return { ...prev, timeSlots: nextSlots };
    });
  };

  const handleRemoveTimeSlot = (index: number) => {
    if (dutyLogForm.timeSlots.length <= 1) {
      onShowToast('warning', 'ต้องมีอย่างน้อย 1 ช่วงเวลา', 'ต้องคงเหลือช่วงเวลาสำหรับกรอกอย่างน้อย 1 รายการ');
      return;
    }
    setDutyLogForm(prev => {
      const nextSlots = prev.timeSlots.filter((_, idx) => idx !== index);
      try {
        localStorage.setItem('ams_saved_duty_template_v1', JSON.stringify(nextSlots));
      } catch (e) {}
      return { ...prev, timeSlots: nextSlots };
    });
  };

  const handleSaveDutyLog = () => {
    if (!dutyLogForm.dutyTeacherName.trim()) {
      onShowToast('warning', 'กรุณาระบุชื่อครูเวร', 'กรุณากรอกชื่อครูเวรผู้ปฏิบัติหน้าที่');
      return;
    }
    if (dutyActiveSchoolDays.length > 0 && !dutyActiveSchoolDayDatesSet.has(dutyLogForm.date)) {
      onShowToast('warning', 'วันอื่นกดไม่ได้', 'วันที่เลือกไม่อยู่ในปฏิทิน 100 วันที่ Admin กำหนด');
      return;
    }
    const currentLogs = StorageService.getDailyDutyLogs(dutyLogs.length > 0 ? dutyLogs : defaultDutyLogs);
    const existingMatch = dutyLogForm.id
      ? currentLogs.find(l => l.id === dutyLogForm.id)
      : currentLogs.find(l => l.date === dutyLogForm.date && l.dutyTeacherName.trim() === dutyLogForm.dutyTeacherName.trim());
    const logId = dutyLogForm.id || existingMatch?.id || `dlog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const summaryText = (dutyLogForm.weatherCondition || dutyLogForm.overallStatus || 'การปฏิบัติหน้าที่เรียบร้อยดี').trim();
    const newLogItem: DailyDutyLog = {
      id: logId,
      date: dutyLogForm.date,
      dutyTeacherName: dutyLogForm.dutyTeacherName.trim(),
      dutyType: dutyLogForm.dutyType,
      location: dutyLogForm.location,
      weatherCondition: summaryText,
      overallStatus: summaryText,
      timeSlots: dutyLogForm.timeSlots,
      incidentsNote: dutyLogForm.incidentsNote,
      academicYear: activeDutyYr,
      semester: activeDutySem,
      createdAt: new Date().toISOString()
    };

    const existingIdx = currentLogs.findIndex(l => l.id === logId);
    const nextLogs = existingIdx >= 0
      ? currentLogs.map((l, idx) => (idx === existingIdx ? newLogItem : l))
      : [newLogItem, ...currentLogs];

    StorageService.setDailyDutyLogs(nextLogs);
    const savedLogs = StorageService.saveDailyDutyLog(newLogItem);
    setDutyLogs(savedLogs);

    // Save latest descriptions and summary to localStorage so future entries pre-fill with latest history
    try {
      localStorage.setItem('ams_saved_duty_template_v1', JSON.stringify(dutyLogForm.timeSlots));
      localStorage.setItem('ams_latest_duty_summary_v1', summaryText);
    } catch (e) {}

    setDutyLogForm(prev => ({ ...prev, id: undefined }));

    onShowToast('success', 'บันทึกรายงานเวรสำเร็จ 🎉', `บันทึกสมุดรายงานการปฏิบัติหน้าที่ครูเวร ประจำวันที่ ${dutyLogForm.date} เรียบร้อยแล้ว`);
  };

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [previewLeave, setPreviewLeave] = useState<LeaveRequest | null>(null);
  const [confirmDeleteLeave, setConfirmDeleteLeave] = useState<LeaveRequest | null>(null);
  const [isDownloadingLeavePdf, setIsDownloadingLeavePdf] = useState(false);
  const [leavePreviewDataUrl, setLeavePreviewDataUrl] = useState<string>('');

  const computeLeaveDocumentData = (targetLeave: LeaveRequest) => {
    const createdDate = parseThaiDateParts(targetLeave.createdAt || targetLeave.startDate);
    const startDateParts = parseThaiDateParts(targetLeave.startDate);
    const endDateParts = parseThaiDateParts(targetLeave.endDate);
    const leaveDays = calculateLeaveDaysCount(targetLeave.startDate, targetLeave.endDate);

    const liveSession = StorageService.getSession();
    const allMembers = StorageService.getMembers();
    const allPersonnelList = StorageService.getPersonnel();

    const matchedTeacher =
      allPersonnelList.find(
        (p) =>
          `${p.prefix}${p.firstName} ${p.lastName}` === targetLeave.teacherName ||
          `${p.firstName} ${p.lastName}` === targetLeave.teacherName ||
          cleanTeacherName(`${p.prefix}${p.firstName} ${p.lastName}`) === cleanTeacherName(targetLeave.teacherName)
      ) ||
      personnel.find(
        (p) =>
          `${p.prefix}${p.firstName} ${p.lastName}` === targetLeave.teacherName ||
          `${p.firstName} ${p.lastName}` === targetLeave.teacherName ||
          cleanTeacherName(`${p.prefix}${p.firstName} ${p.lastName}`) === cleanTeacherName(targetLeave.teacherName)
      );

    const matchedMember = allMembers.find(
      (m) =>
        cleanTeacherName(m.fullName) === cleanTeacherName(targetLeave.teacherName) ||
        (isMyLeave(targetLeave) &&
          (m.id === user.id || m.username.toLowerCase() === user.username.toLowerCase()))
    );

    const teacherPosition = matchedTeacher?.position || matchedMember?.position || 'ครู';

    // Pull contact phone from Settings first (Member profile / UserSession / Personnel / SchoolInfo)
    const teacherPhone =
      (isMyLeave(targetLeave) && (user.phone || liveSession?.phone)
        ? user.phone || liveSession?.phone
        : '') ||
      matchedMember?.phone ||
      matchedTeacher?.phone ||
      user.phone ||
      liveSession?.phone ||
      schoolInfo.phone ||
      '-';

    const isSick = targetLeave.leaveType.includes('ป่วย');
    const isPersonal = targetLeave.leaveType.includes('กิจ');
    const isMaternity = targetLeave.leaveType.includes('คลอด');
    const isOther = !isSick && !isPersonal && !isMaternity;

    const currentLeaveFiscalYear =
      targetLeave.fiscalYear || getThaiFiscalYear(targetLeave.startDate || targetLeave.createdAt);
    const currentLeaveRound = getReqLeaveRound(targetLeave);
    const targetTeacherName = cleanTeacherName(targetLeave.teacherName);

    const teacherLeavesInRound = leaveRequests
      .filter((r) => {
        if (r.status === 'ไม่อนุมัติ') return false;
        if (cleanTeacherName(r.teacherName) !== targetTeacherName) return false;
        const rFiscalYear = r.fiscalYear || getThaiFiscalYear(r.startDate || r.createdAt);
        const rRound = getReqLeaveRound(r);
        return rFiscalYear === currentLeaveFiscalYear && rRound === currentLeaveRound;
      })
      .sort((a, b) => {
        const dateA = a.startDate || a.createdAt || '';
        const dateB = b.startDate || b.createdAt || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });

    const currentLeaveIndex = teacherLeavesInRound.findIndex((r) => r.id === targetLeave.id);
    const priorLeavesThisYear =
      currentLeaveIndex !== -1
        ? teacherLeavesInRound.slice(0, currentLeaveIndex)
        : teacherLeavesInRound.filter(
            (r) => (r.startDate || r.createdAt || '') < (targetLeave.startDate || targetLeave.createdAt || '')
          );

    let priorSick = 0;
    let priorPersonal = 0;
    let priorMaternity = 0;

    priorLeavesThisYear.forEach((r) => {
      const days = calculateLeaveDaysCount(r.startDate, r.endDate);
      if (r.leaveType.includes('ป่วย')) priorSick += days;
      else if (r.leaveType.includes('กิจ')) priorPersonal += days;
      else if (r.leaveType.includes('คลอด')) priorMaternity += days;
    });

    const currSick = isSick ? leaveDays : 0;
    const currPersonal = isPersonal ? leaveDays : 0;
    const currMaternity = isMaternity ? leaveDays : 0;

    const lastLeave =
      priorLeavesThisYear.length > 0 ? priorLeavesThisYear[priorLeavesThisYear.length - 1] : null;

    // Tick the checkbox at "ข้าพเจ้าได้ลา" matching the requested leave type
    const lastLeaveSick = isSick;
    const lastLeavePersonal = isPersonal;
    const lastLeaveMaternity = isMaternity;

    let lastLeaveStartStr = '-';
    let lastLeaveEndStr = '-';
    let lastLeaveDaysStr = '-';
    if (lastLeave) {
      const lStart = parseThaiDateParts(lastLeave.startDate);
      const lEnd = parseThaiDateParts(lastLeave.endDate);
      lastLeaveStartStr = `${lStart.day} ${lStart.month} พ.ศ. ${lStart.year}`;
      lastLeaveEndStr = `${lEnd.day} ${lEnd.month} พ.ศ. ${lEnd.year}`;
      lastLeaveDaysStr = calculateLeaveDaysCount(lastLeave.startDate, lastLeave.endDate).toString();
    }

    let rawApplicantName = targetLeave.teacherName || '';
    if (
      matchedTeacher &&
      matchedTeacher.prefix &&
      !/^(นาย|นางสาว|นาง|ดร\.|ว่าที่)/u.test(rawApplicantName.trim())
    ) {
      rawApplicantName = `${matchedTeacher.prefix.trim()}${matchedTeacher.firstName.trim()} ${matchedTeacher.lastName.trim()}`;
    } else if (
      matchedMember &&
      matchedMember.prefix &&
      !/^(นาย|นางสาว|นาง|ดร\.|ว่าที่)/u.test(rawApplicantName.trim())
    ) {
      rawApplicantName = `${matchedMember.prefix.trim()}${rawApplicantName.replace(/^ครู\s*/u, '').trim()}`;
    } else if (
      isMyLeave(targetLeave) &&
      (user.prefix || liveSession?.prefix) &&
      !/^(นาย|นางสาว|นาง|ดร\.|ว่าที่)/u.test(rawApplicantName.trim())
    ) {
      const pfx = (user.prefix || liveSession?.prefix || '').trim();
      rawApplicantName = `${pfx}${rawApplicantName.replace(/^ครู\s*/u, '').trim()}`;
    }
    const applicantFullName = formatThaiPersonName(rawApplicantName);

    const deputyPerson =
      (targetLeave.supervisorName
        ? personnel.find(
            (p) =>
              cleanTeacherName(`${p.prefix}${p.firstName} ${p.lastName}`) ===
              cleanTeacherName(targetLeave.supervisorName)
          )
        : undefined) ||
      personnel.find(
        (p) => p.personnelType === 'รองผู้อำนวยการ' || (p.position || '').includes('รองผู้อำนวยการ')
      ) ||
      personnel.find((p) => p.department === 'บริหารงานบุคคล') ||
      personnel[1] ||
      personnel[0];

    const deputyName = formatThaiPersonName(
      targetLeave.supervisorName ||
        (deputyPerson
          ? `${deputyPerson.prefix}${deputyPerson.firstName} ${deputyPerson.lastName}`
          : 'รองผู้อำนวยการ')
    );
    const deputyPosition =
      (targetLeave.supervisorPosition || '').trim() ||
      deputyPerson?.position ||
      'รองผู้อำนวยการ';

    const officerName = formatThaiPersonName(targetLeave.personnelOfficer || 'เจ้าหน้าที่งานบุคลากร');

    const rawSchoolName = (schoolInfo.schoolName || 'บ้านนาออก').trim();
    const formattedSchoolName = rawSchoolName.startsWith('โรงเรียน')
      ? rawSchoolName
      : `โรงเรียน${rawSchoolName}`;

    const directorPerson =
      (targetLeave.directorName
        ? personnel.find(
            (p) =>
              cleanTeacherName(`${p.prefix}${p.firstName} ${p.lastName}`) ===
              cleanTeacherName(targetLeave.directorName)
          )
        : undefined) ||
      personnel.find(
        (p) => (p.position || '').trim().includes('ผู้อำนวยการ') || p.personnelType === 'ผู้อำนวยการ'
      );

    const directorFullName = formatThaiPersonName(
      targetLeave.directorName ||
        (directorPerson
          ? `${directorPerson.prefix || ''}${directorPerson.firstName} ${directorPerson.lastName}`.trim()
          : schoolInfo.directorName || 'ผู้อำนวยการโรงเรียน')
    );

    let directorPositionTitle = directorPerson?.position?.trim() || '';
    if (!directorPositionTitle) {
      directorPositionTitle = `ผู้อำนวยการ${formattedSchoolName}`;
    } else if (
      directorPositionTitle === 'ผู้อำนวยการ' ||
      directorPositionTitle === 'ผู้อำนวยการโรงเรียน'
    ) {
      directorPositionTitle = `ผู้อำนวยการ${formattedSchoolName}`;
    }

    const startDateThai = `${startDateParts.day} ${startDateParts.month} พ.ศ. ${startDateParts.year}`;
    const endDateThai = `${endDateParts.day} ${endDateParts.month} พ.ศ. ${endDateParts.year}`;
    const createdDateThai = `${createdDate.day} ${createdDate.month} พ.ศ. ${createdDate.year}`;
    const isApproved = targetLeave.status !== 'ไม่อนุมัติ';

    return {
      applicantFullName,
      createdDate,
      startDateParts,
      endDateParts,
      leaveDays,
      teacherPosition,
      teacherPhone,
      isSick,
      isPersonal,
      isMaternity,
      isOther,
      priorSick,
      priorPersonal,
      priorMaternity,
      currSick,
      currPersonal,
      currMaternity,
      lastLeaveSick,
      lastLeavePersonal,
      lastLeaveMaternity,
      lastLeaveStartStr,
      lastLeaveEndStr,
      lastLeaveDaysStr,
      deputyName,
      deputyPosition,
      officerName,
      formattedSchoolName,
      directorFullName,
      directorPositionTitle,
      startDateThai,
      endDateThai,
      createdDateThai,
      isApproved,
    };
  };

  /**
   * Renders the Official A4 Leave Request Form directly onto a 406.4-DPI HTML5 Canvas (3360 x 4752 px)
   * so that the downloaded PDF matches the preview 100% with crystal-clear text, dotted lines, and zero shifting.
   */
  const renderLeaveOfficialA4Canvas = async (targetLeave: LeaveRequest): Promise<HTMLCanvasElement> => {
    if (document.fonts) {
      await document.fonts.ready;
    }

    const d = computeLeaveDocumentData(targetLeave);

    const PX_PER_MM = 16; // 406.4 DPI (3360 x 4752 px)
    const mm = (v: number) => v * PX_PER_MM;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(mm(210));
    canvas.height = Math.round(mm(297));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Pure white A4 sheet
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const FONT_THAI = '"Sarabun", sans-serif';
    const bodyFontMm = 4.05;
    const smallFontMm = 3.65;

    const setFont = (sizeMm: number, weight: number | string = 400) => {
      ctx.font = `${weight} ${mm(sizeMm)}px ${FONT_THAI}`;
    };

    const drawText = (
      text: string,
      x: number,
      y: number,
      opts?: {
        sizeMm?: number;
        minSizeMm?: number;
        weight?: number | string;
        align?: CanvasTextAlign;
        maxWidth?: number;
      }
    ): number => {
      const targetSize = opts?.sizeMm ?? bodyFontMm;
      const minSize = opts?.minSizeMm ?? 2.6;
      const weight = opts?.weight ?? 400;
      let curSize = targetSize;

      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.textAlign = opts?.align || 'left';
      ctx.textBaseline = 'alphabetic';
      setFont(curSize, weight);

      if (opts?.maxWidth && opts.maxWidth > 0) {
        while (ctx.measureText(text).width > opts.maxWidth && curSize > minSize) {
          curSize = Math.max(minSize, curSize - 0.1);
          setFont(curSize, weight);
        }
      }

      ctx.fillText(text, x, y);
      const w = ctx.measureText(text).width;
      ctx.restore();
      return w;
    };

    const drawDottedLine = (x1: number, x2: number, lineY: number) => {
      if (x2 <= x1) return;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([mm(0.45), mm(0.55)]);
      ctx.moveTo(x1, lineY);
      ctx.lineTo(x2, lineY);
      ctx.lineWidth = mm(0.32);
      ctx.strokeStyle = '#000000';
      ctx.stroke();
      ctx.restore();
    };

    const drawDottedField = (
      x1: number,
      x2: number,
      baselineY: number,
      valueText: string,
      align: 'center' | 'left' = 'center',
      sizeMm: number = bodyFontMm
    ) => {
      drawDottedLine(x1, x2, baselineY + mm(1.1));
      const cleanVal = (valueText || '').trim();
      if (!cleanVal) return;
      const availW = Math.max(mm(4), x2 - x1 - mm(2));
      if (align === 'center') {
        drawText(cleanVal, (x1 + x2) / 2, baselineY, {
          sizeMm,
          align: 'center',
          maxWidth: availW,
        });
      } else {
        drawText(cleanVal, x1 + mm(1.5), baselineY, {
          sizeMm,
          align: 'left',
          maxWidth: availW,
        });
      }
    };

    const drawCheckOption = (
      x: number,
      baselineY: number,
      checked: boolean,
      label: string,
      sizeMm: number = bodyFontMm
    ): number => {
      const openW = drawText('(', x, baselineY, { sizeMm });
      const boxW = mm(5.2);
      if (checked) {
        drawText('✓', x + openW + boxW / 2, baselineY, {
          sizeMm: sizeMm + 0.3,
          weight: 700,
          align: 'center',
        });
      }
      const closeW = drawText(')', x + openW + boxW, baselineY, { sizeMm });
      const labelW = label
        ? drawText(label, x + openW + boxW + closeW + mm(1.5), baselineY, { sizeMm })
        : 0;
      return openW + boxW + closeW + (label ? mm(1.5) + labelW : 0);
    };

    const leftMargin = mm(15);
    const rightMargin = mm(195);

    // 1. Title
    drawText('แบบใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว', mm(105), mm(25), {
      sizeMm: 5.4,
      weight: 700,
      align: 'center',
    });

    // 2. Date & Location (Right Indented)
    const writeAtY = mm(36.5);
    const writeLblW = drawText('เขียนที่', mm(110), writeAtY);
    drawDottedField(mm(110) + writeLblW + mm(1.5), rightMargin, writeAtY, d.formattedSchoolName, 'center');

    const dateRowY = mm(43.5);
    let curX = mm(92);
    curX += drawText('วันที่', curX, dateRowY) + mm(1.2);
    drawDottedField(curX, curX + mm(13), dateRowY, d.createdDate.day, 'center');
    curX += mm(14.8);
    curX += drawText('เดือน', curX, dateRowY) + mm(1.2);
    drawDottedField(curX, curX + mm(34), dateRowY, d.createdDate.month, 'center');
    curX += mm(35.8);
    curX += drawText('พ.ศ.', curX, dateRowY) + mm(1.2);
    drawDottedField(curX, rightMargin, dateRowY, d.createdDate.year, 'center');

    // 3. Subject & Recipient
    const subjY = mm(53.5);
    drawText('เรื่อง', leftMargin, subjY, { weight: 700 });
    const subjectStr = d.isPersonal
      ? 'ขอลากิจส่วนตัว'
      : d.isSick
      ? 'ขอลาป่วย'
      : d.isMaternity
      ? 'ขอลาคลอดบุตร'
      : `ขอ${targetLeave.leaveType}`;
    drawDottedField(mm(29), rightMargin, subjY, subjectStr, 'left');

    const toY = mm(61);
    drawText('เรียน', leftMargin, toY, { weight: 700 });
    drawDottedField(mm(29), rightMargin, toY, d.directorPositionTitle, 'left');

    // 4. Applicant Info
    const appY = mm(69.5);
    let ax = mm(27); // 12mm paragraph indent
    ax += drawText('ข้าพเจ้า', ax, appY) + mm(1.5);
    drawDottedField(ax, mm(117), appY, d.applicantFullName, 'center');
    ax = mm(119.5);
    ax += drawText('ตำแหน่ง', ax, appY) + mm(1.5);
    drawDottedField(ax, rightMargin, appY, d.teacherPosition, 'center');

    const affY = mm(77);
    const affLblW = drawText('สังกัด', leftMargin, affY);
    drawDottedField(
      leftMargin + affLblW + mm(1.8),
      rightMargin,
      affY,
      schoolInfo.affiliation || d.formattedSchoolName || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษา',
      'left'
    );

    // 5. Leave Checkboxes & Reasons
    const chkX = mm(26);
    const chk1Y = mm(85.5);
    drawText('ขอลา', leftMargin, chk1Y);
    const c1W = drawCheckOption(chkX, chk1Y, d.isSick, 'ป่วย เนื่องจาก');
    drawDottedField(chkX + c1W + mm(2), rightMargin, chk1Y, d.isSick ? targetLeave.reason : '', 'left');

    const chk2Y = mm(93);
    const c2W = drawCheckOption(chkX, chk2Y, d.isPersonal, 'กิจส่วนตัว เนื่องจาก');
    drawDottedField(chkX + c2W + mm(2), rightMargin, chk2Y, d.isPersonal ? targetLeave.reason : '', 'left');

    const chk3Y = mm(100.5);
    const c3W = drawCheckOption(
      chkX,
      chk3Y,
      d.isMaternity,
      d.isMaternity && targetLeave.reason ? 'คลอดบุตร เนื่องจาก' : 'คลอดบุตร'
    );
    drawDottedField(chkX + c3W + mm(2), rightMargin, chk3Y, d.isMaternity ? targetLeave.reason : '', 'left');

    let nextY = mm(108.5);
    if (d.isOther) {
      const cOtherW = drawCheckOption(chkX, nextY, true, `${targetLeave.leaveType} เนื่องจาก`);
      drawDottedField(chkX + cOtherW + mm(2), rightMargin, nextY, targetLeave.reason || '', 'left');
      nextY += mm(7.5);
    }

    // 6. Leave Dates & Duration
    const datesY = nextY;
    let dx = leftMargin;
    dx += drawText('ตั้งแต่วันที่', dx, datesY) + mm(1.5);
    drawDottedField(dx, dx + mm(53), datesY, d.startDateThai, 'center');
    dx += mm(55);
    dx += drawText('ถึงวันที่', dx, datesY) + mm(1.5);
    drawDottedField(dx, dx + mm(53), datesY, d.endDateThai, 'center');
    dx += mm(55);
    dx += drawText('มีกำหนด', dx, datesY) + mm(1.5);
    const endWordW = drawText('วัน', rightMargin, datesY, { align: 'right' });
    drawDottedField(dx, rightMargin - endWordW - mm(1.8), datesY, String(d.leaveDays), 'center');

    // 7. Previous Leave History (Ticked matching requested leave)
    const hist1Y = datesY + mm(8);
    let hx = leftMargin;
    hx += drawText('ข้าพเจ้าได้ลา', hx, hist1Y) + mm(3);
    hx += drawCheckOption(hx, hist1Y, d.lastLeaveSick, 'ป่วย') + mm(4);
    hx += drawCheckOption(hx, hist1Y, d.lastLeavePersonal, 'กิจส่วนตัว') + mm(4);
    hx += drawCheckOption(hx, hist1Y, d.lastLeaveMaternity, 'คลอดบุตร') + mm(3);
    drawText('ครั้งสุดท้ายตั้งแต่วันที่', hx, hist1Y);

    const hist2Y = hist1Y + mm(7.5);
    let h2x = leftMargin;
    drawDottedField(h2x, h2x + mm(60), hist2Y, d.lastLeaveStartStr, 'center');
    h2x += mm(62);
    h2x += drawText('ถึงวันที่', h2x, hist2Y) + mm(1.5);
    drawDottedField(h2x, h2x + mm(60), hist2Y, d.lastLeaveEndStr, 'center');
    h2x += mm(62);
    h2x += drawText('มีกำหนด', h2x, hist2Y) + mm(1.5);
    const endDayLblW = drawText('วัน', rightMargin, hist2Y, { align: 'right' });
    drawDottedField(h2x, rightMargin - endDayLblW - mm(1.8), hist2Y, d.lastLeaveDaysStr, 'center');

    // 8. Contact Phone ("ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่โทรศัพท์ ...")
    const phoneY = hist2Y + mm(8);
    const phonePrefixW = drawText('ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่โทรศัพท์', leftMargin, phoneY);
    drawDottedField(leftMargin + phonePrefixW + mm(2), rightMargin, phoneY, d.teacherPhone, 'center');

    // 9. Applicant Signature Block (Right side, centered on sigCenterX with crisp dotted line!)
    const sigCenterX = mm(153);
    const respY = phoneY + mm(9);
    drawText('ขอแสดงความนับถือ', sigCenterX, respY, { align: 'center' });

    const appSigLineY = respY + mm(8.5);
    const appSigHalfW = mm(22.5);
    drawText('(ลงชื่อ)', sigCenterX - appSigHalfW - mm(1.5), appSigLineY, { align: 'right' });
    drawDottedLine(sigCenterX - appSigHalfW, sigCenterX + appSigHalfW, appSigLineY + mm(1));

    const appNameY = appSigLineY + mm(7.2);
    drawText(`(${d.applicantFullName.replace(/^ครู\s*/, '')})`, sigCenterX, appNameY, {
      align: 'center',
      maxWidth: mm(74),
    });

    // 10. Bottom 2-Column Section (Left: Leave Statistics Table & Auditor | Right: Supervisor & Director)
    const bottomStartY = appNameY + mm(8);
    const leftColX = leftMargin;
    const leftColW = mm(86);
    const leftColCenter = leftColX + leftColW / 2;

    const rightColX = mm(109);
    const rightColW = mm(86);
    const rightColCenter = rightColX + rightColW / 2;

    // --- LEFT COLUMN: Statistics Table ---
    drawText('สถิติการลาในปีงบประมาณนี้', leftColX, bottomStartY, {
      sizeMm: 3.95,
      weight: 700,
    });

    const tableTop = bottomStartY + mm(3);
    const colWidths = [mm(21), mm(21.5), mm(21.5), mm(22)];
    const headerH = mm(12);
    const rowH = mm(7.2);
    const totalTableH = headerH + rowH * 3;

    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = mm(0.3);
    ctx.strokeRect(leftColX, tableTop, leftColW, totalTableH);

    // Vertical column lines
    let colAccX = leftColX;
    for (let c = 0; c < 3; c++) {
      colAccX += colWidths[c];
      ctx.beginPath();
      ctx.moveTo(colAccX, tableTop);
      ctx.lineTo(colAccX, tableTop + totalTableH);
      ctx.stroke();
    }

    // Horizontal row lines
    ctx.beginPath();
    ctx.moveTo(leftColX, tableTop + headerH);
    ctx.lineTo(leftColX + leftColW, tableTop + headerH);
    ctx.stroke();

    for (let r = 1; r < 3; r++) {
      const ry = tableTop + headerH + rowH * r;
      ctx.beginPath();
      ctx.moveTo(leftColX, ry);
      ctx.lineTo(leftColX + leftColW, ry);
      ctx.stroke();
    }
    ctx.restore();

    // Table Headers
    const c0Center = leftColX + colWidths[0] / 2;
    const c1Center = leftColX + colWidths[0] + colWidths[1] / 2;
    const c2Center = leftColX + colWidths[0] + colWidths[1] + colWidths[2] / 2;
    const c3Center = leftColX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] / 2;

    drawText('ประเภทลา', c0Center, tableTop + mm(7.2), { sizeMm: 3.45, align: 'center' });
    drawText('ลามาแล้ว', c1Center, tableTop + mm(5.2), { sizeMm: 3.4, align: 'center' });
    drawText('(วันทำการ)', c1Center, tableTop + mm(9.5), { sizeMm: 3.2, align: 'center' });
    drawText('ลาครั้งนี้', c2Center, tableTop + mm(5.2), { sizeMm: 3.4, align: 'center' });
    drawText('(วันทำการ)', c2Center, tableTop + mm(9.5), { sizeMm: 3.2, align: 'center' });
    drawText('รวมเป็น', c3Center, tableTop + mm(5.2), { sizeMm: 3.4, align: 'center' });
    drawText('(วันทำการ)', c3Center, tableTop + mm(9.5), { sizeMm: 3.2, align: 'center' });

    const tableRows = [
      ['ป่วย', String(d.priorSick), String(d.currSick), String(d.priorSick + d.currSick)],
      ['กิจส่วนตัว', String(d.priorPersonal), String(d.currPersonal), String(d.priorPersonal + d.currPersonal)],
      ['คลอดบุตร', String(d.priorMaternity), String(d.currMaternity), String(d.priorMaternity + d.currMaternity)],
    ];
    tableRows.forEach((rVals, rIdx) => {
      const textY = tableTop + headerH + rowH * rIdx + mm(4.9);
      drawText(rVals[0], c0Center, textY, { sizeMm: 3.5, align: 'center' });
      drawText(rVals[1], c1Center, textY, { sizeMm: 3.5, align: 'center' });
      drawText(rVals[2], c2Center, textY, { sizeMm: 3.5, align: 'center' });
      drawText(rVals[3], c3Center, textY, { sizeMm: 3.5, align: 'center' });
    });

    // Auditor Signature below table (All lines & position centered on audCenterX directly under officerName)
    const audCenterX = leftColX + mm(45.5);
    const audSigY = tableTop + totalTableH + mm(9);
    const audSigHalfW = mm(20.5);
    drawText('(ลงชื่อ)', audCenterX - audSigHalfW - mm(1.5), audSigY, {
      sizeMm: smallFontMm,
      align: 'right',
    });
    drawDottedLine(audCenterX - audSigHalfW, audCenterX + audSigHalfW, audSigY + mm(1));
    drawText('ผู้ตรวจสอบ', audCenterX + audSigHalfW + mm(1.5), audSigY, {
      sizeMm: smallFontMm,
      align: 'left',
    });

    const audNameY = audSigY + mm(6.8);
    drawText(`(${d.officerName})`, audCenterX, audNameY, {
      sizeMm: smallFontMm,
      align: 'center',
      maxWidth: leftColW - mm(8),
    });

    const audPosY = audNameY + mm(6.8);
    const audFieldHalfW = mm(23.5);
    drawText('ตำแหน่ง', audCenterX - audFieldHalfW - mm(1.5), audPosY, {
      sizeMm: smallFontMm,
      align: 'right',
    });
    drawDottedField(
      audCenterX - audFieldHalfW,
      audCenterX + audFieldHalfW,
      audPosY,
      'เจ้าหน้าที่งานบุคลากร',
      'center',
      smallFontMm
    );

    const audDateY = audPosY + mm(6.8);
    drawText('วันที่', audCenterX - audFieldHalfW - mm(1.5), audDateY, {
      sizeMm: smallFontMm,
      align: 'right',
    });
    drawDottedField(
      audCenterX - audFieldHalfW,
      audCenterX + audFieldHalfW,
      audDateY,
      d.createdDateThai,
      'center',
      smallFontMm
    );

    // --- RIGHT COLUMN: Supervisor Comment & Director Order ---
    // Shared center axis for Right Column so position titles sit 100% centered under parenthesized names
    const rightSigCenterX = rightColX + mm(48);

    drawText('ความเห็นผู้บังคับบัญชา', rightColX, bottomStartY, {
      sizeMm: 3.95,
      weight: 700,
    });

    const supCommentY = bottomStartY + mm(7);
    drawDottedField(rightColX + mm(2), rightColX + mm(42), supCommentY, 'เห็นควรอนุญาต', 'left', smallFontMm);

    const supSigY = supCommentY + mm(7.5);
    const supSigHalfW = mm(24);
    drawText('(ลงชื่อ)', rightSigCenterX - supSigHalfW - mm(1.5), supSigY, {
      sizeMm: smallFontMm,
      align: 'right',
    });
    drawDottedLine(rightSigCenterX - supSigHalfW, rightSigCenterX + supSigHalfW, supSigY + mm(1));

    const supNameY = supSigY + mm(6.8);
    drawText(`(${d.deputyName})`, rightSigCenterX, supNameY, {
      sizeMm: smallFontMm,
      align: 'center',
      maxWidth: rightColW - mm(8),
    });

    const supPosY = supNameY + mm(6.8);
    const supPosHalfW = mm(25);
    drawText('ตำแหน่ง', rightSigCenterX - supPosHalfW - mm(1.5), supPosY, {
      sizeMm: smallFontMm,
      align: 'right',
    });
    drawDottedField(
      rightSigCenterX - supPosHalfW,
      rightSigCenterX + supPosHalfW,
      supPosY,
      d.deputyPosition,
      'center',
      smallFontMm
    );

    const supDateY = supPosY + mm(6.8);
    drawText('วันที่', rightSigCenterX - supSigHalfW - mm(1.5), supDateY, {
      sizeMm: smallFontMm,
      align: 'right',
    });
    drawDottedField(
      rightSigCenterX - supSigHalfW,
      rightSigCenterX + supSigHalfW,
      supDateY,
      d.createdDateThai,
      'center',
      smallFontMm
    );

    // Separator line before Director Order
    const sepY = supDateY + mm(4.5);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(rightColX, sepY);
    ctx.lineTo(rightColX + rightColW, sepY);
    ctx.lineWidth = mm(0.25);
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();
    ctx.restore();

    const cmdTitleY = sepY + mm(6);
    drawText('คำสั่ง', rightColX, cmdTitleY, {
      sizeMm: 3.95,
      weight: 700,
    });

    const cmdChkY = cmdTitleY + mm(7);
    const allowW = drawCheckOption(rightColX + mm(2), cmdChkY, d.isApproved, 'อนุญาต', smallFontMm);
    drawCheckOption(rightColX + mm(2) + allowW + mm(10), cmdChkY, !d.isApproved, 'ไม่อนุญาต', smallFontMm);

    const dirSigY = cmdChkY + mm(7.5);
    const dirSigHalfW = mm(24);
    drawText('(ลงชื่อ)', rightSigCenterX - dirSigHalfW - mm(1.5), dirSigY, {
      sizeMm: smallFontMm,
      align: 'right',
    });
    drawDottedLine(rightSigCenterX - dirSigHalfW, rightSigCenterX + dirSigHalfW, dirSigY + mm(1));

    const dirNameY = dirSigY + mm(6.8);
    drawText(`(${d.directorFullName.replace(/^ครู\s*/, '')})`, rightSigCenterX, dirNameY, {
      sizeMm: smallFontMm,
      align: 'center',
      maxWidth: rightColW - mm(8),
    });

    const dirPosY = dirNameY + mm(6.8);
    const dirPosHalfW = mm(26);
    drawText('ตำแหน่ง', rightSigCenterX - dirPosHalfW - mm(1.5), dirPosY, {
      sizeMm: smallFontMm,
      align: 'right',
    });
    drawDottedField(
      rightSigCenterX - dirPosHalfW,
      rightSigCenterX + dirPosHalfW,
      dirPosY,
      d.directorPositionTitle,
      'center',
      smallFontMm
    );

    const dirDateY = dirPosY + mm(6.8);
    drawText('วันที่', rightSigCenterX - dirSigHalfW - mm(1.5), dirDateY, {
      sizeMm: smallFontMm,
      align: 'right',
    });
    drawDottedField(
      rightSigCenterX - dirSigHalfW,
      rightSigCenterX + dirSigHalfW,
      dirDateY,
      d.createdDateThai,
      'center',
      smallFontMm
    );

    return canvas;
  };

  useEffect(() => {
    let cancelled = false;
    if (!previewLeave) {
      setLeavePreviewDataUrl('');
      return;
    }
    renderLeaveOfficialA4Canvas(previewLeave)
      .then((canvas) => {
        if (!cancelled) {
          setLeavePreviewDataUrl(canvas.toDataURL('image/png'));
        }
      })
      .catch((err) => {
        console.error('Failed to render leave preview canvas:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [previewLeave, schoolInfo, personnel, leaveRequests, user]);

  const handleDownloadLeavePdf = async () => {
    if (!previewLeave || isDownloadingLeavePdf) return;
    setIsDownloadingLeavePdf(true);
    try {
      const canvas = await renderLeaveOfficialA4Canvas(previewLeave);
      const imgData = canvas.toDataURL('image/jpeg', 0.99);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      const teacherNameClean = (previewLeave.teacherName || 'บุคลากร').replace(/\s+/g, '_');
      const fileName = `แบบใบลา_${teacherNameClean}_${previewLeave.startDate || 'วันลา'}.pdf`;
      pdf.save(fileName);

      if (onShowToast) {
        onShowToast('success', 'ดาวน์โหลดสำเร็จ', `ดาวน์โหลดแบบใบลา ${fileName} เรียบร้อยแล้ว`);
      }
    } catch (err) {
      console.error('Download leave pdf failed:', err);
    } finally {
      setIsDownloadingLeavePdf(false);
    }
  };
  const [leaveForm, setLeaveForm] = useState<{
    teacherName: string;
    leaveType: string;
    customLeaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    directorName: string;
    personnelOfficer: string;
    supervisorName: string;
    supervisorPosition: string;
    customSupervisorPosition: string;
  }>({
    teacherName: formatThaiPersonName(user.fullName || ''),
    leaveType: 'ลากิจ',
    customLeaveType: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    directorName: '',
    personnelOfficer: '',
    supervisorName: '',
    supervisorPosition: 'ชำนาญการพิเศษ',
    customSupervisorPosition: ''
  });

  const isAdmin = user.role === 'admin' || user.role === 'developer';
  const currentFiscalYear = useMemo(() => getThaiFiscalYear(), []);
  const activeLeaveRound: '1' | '2' = schoolInfo.leaveRound || '1';
  const activeLeaveFiscalYear: string = schoolInfo.leaveRoundFiscalYear || schoolInfo.academicYear || String(currentFiscalYear);

  const [selectedLeaveRound, setSelectedLeaveRound] = useState<'1' | '2'>(activeLeaveRound);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(() => activeLeaveFiscalYear);
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('all');

  // Sync when Admin updates schoolInfo.leaveRound or leaveRoundFiscalYear
  useEffect(() => {
    if (schoolInfo.leaveRound) {
      setSelectedLeaveRound(schoolInfo.leaveRound);
    }
    if (schoolInfo.leaveRoundFiscalYear) {
      setSelectedFiscalYear(schoolInfo.leaveRoundFiscalYear);
    }
  }, [schoolInfo.leaveRound, schoolInfo.leaveRoundFiscalYear]);

  // Helper to resolve which round ('1' or '2') a leave request belongs to
  const getReqLeaveRound = useCallback((req: LeaveRequest): '1' | '2' => {
    if (req.leaveRound === '1' || req.leaveRound === '2') {
      return req.leaveRound;
    }
    return getLeaveRoundInfo(req.startDate || req.createdAt).round;
  }, []);

  // Helper to check if a leave request belongs to the current user
  const isMyLeave = useCallback((req: LeaveRequest) => {
    if (req.userId && user.id && req.userId === user.id) return true;
    if (req.username && user.username && req.username.toLowerCase() === user.username.toLowerCase()) return true;
    const rName = cleanTeacherName(req.teacherName);
    const uName = cleanTeacherName(user.fullName);
    if (rName && uName && (rName === uName || rName.includes(uName) || uName.includes(rName))) return true;
    if (user.username && rName && cleanTeacherName(user.username) === rName) return true;
    return false;
  }, [user]);

  // Base list depending on role: Admin sees ALL; Member sees ONLY their own
  const baseLeaveRequests = useMemo(() => {
    if (isAdmin) {
      return leaveRequests;
    }
    return leaveRequests.filter(isMyLeave);
  }, [isAdmin, leaveRequests, isMyLeave]);

  // Unique fiscal years found in data + surrounding years
  const availableFiscalYears = useMemo(() => {
    const set = new Set<number>();
    set.add(currentFiscalYear);
    set.add(currentFiscalYear - 1);
    set.add(currentFiscalYear + 1);
    leaveRequests.forEach(r => {
      const fy = r.fiscalYear || getThaiFiscalYear(r.startDate || r.createdAt);
      set.add(fy);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [currentFiscalYear, leaveRequests]);

  // Effective round: Members strictly see the round configured by Admin; Admin sees selectedLeaveRound
  const effectiveLeaveRound: '1' | '2' = isAdmin ? selectedLeaveRound : activeLeaveRound;

  // Filtered list by active round (ครั้งที่ 1 / ครั้งที่ 2), teacher filter (admin only), and status
  const visibleLeaveRequests = useMemo(() => {
    return baseLeaveRequests.filter(req => {
      const reqRound = getReqLeaveRound(req);
      if (reqRound !== effectiveLeaveRound) return false;

      if (selectedFiscalYear !== 'all') {
        const fy = req.fiscalYear || getThaiFiscalYear(req.startDate || req.createdAt);
        if (fy !== Number(selectedFiscalYear)) return false;
      }
      if (isAdmin && selectedTeacherFilter !== 'all') {
        if (cleanTeacherName(req.teacherName) !== cleanTeacherName(selectedTeacherFilter)) return false;
      }
      if (leaveStatusFilter !== 'all') {
        if (req.status !== leaveStatusFilter) return false;
      }
      return true;
    });
  }, [baseLeaveRequests, effectiveLeaveRound, selectedFiscalYear, selectedTeacherFilter, leaveStatusFilter, isAdmin, getReqLeaveRound]);

  // Cumulative leave stats for each request strictly within its own Round (ครั้งที่ 1 or ครั้งที่ 2) & Fiscal Year
  // When a new round starts (ครั้งที่ 2), prior leaves from ครั้งที่ 1 are NOT included -> starts fresh from 1
  const getLeaveStatsForRequest = useCallback((req: LeaveRequest) => {
    const fy = req.fiscalYear || getThaiFiscalYear(req.startDate || req.createdAt);
    const reqRound = getReqLeaveRound(req);
    const teacherKey = cleanTeacherName(req.teacherName);
    
    // All non-rejected leaves of this teacher in this SAME fiscal year AND SAME round (ครั้งที่ 1 or ครั้งที่ 2)
    const teacherLeavesInRound = leaveRequests.filter(r => {
      if (r.status === 'ไม่อนุมัติ') return false;
      if (cleanTeacherName(r.teacherName) !== teacherKey) return false;
      const rFy = r.fiscalYear || getThaiFiscalYear(r.startDate || r.createdAt);
      const rRound = getReqLeaveRound(r);
      return rFy === fy && rRound === reqRound;
    }).sort((a, b) => {
      const dateA = a.startDate || a.createdAt || '';
      const dateB = b.startDate || b.createdAt || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    const reqIndex = teacherLeavesInRound.findIndex(r => r.id === req.id);
    const priorLeaves = reqIndex !== -1
      ? teacherLeavesInRound.slice(0, reqIndex)
      : teacherLeavesInRound.filter(r => (r.startDate || r.createdAt || '') < (req.startDate || req.createdAt || ''));

    let priorDays = 0;
    let priorSick = 0;
    let priorPersonal = 0;
    let priorMaternity = 0;
    let priorOther = 0;

    priorLeaves.forEach(r => {
      const days = calculateLeaveDaysCount(r.startDate, r.endDate);
      priorDays += days;
      if (r.leaveType.includes('ป่วย')) priorSick += days;
      else if (r.leaveType.includes('กิจ')) priorPersonal += days;
      else if (r.leaveType.includes('คลอด')) priorMaternity += days;
      else priorOther += days;
    });

    const currentDays = calculateLeaveDaysCount(req.startDate, req.endDate);
    const roundNumber = (reqIndex !== -1 ? reqIndex : priorLeaves.length) + 1;
    const totalAccumulated = priorDays + currentDays;

    return {
      fiscalYear: fy,
      evalRound: reqRound,
      evalRoundLabel: reqRound === '1' ? 'ครั้งที่ 1 (1 ต.ค. – 31 มี.ค.)' : 'ครั้งที่ 2 (1 เม.ย. – 30 ก.ย.)',
      roundNumber,
      priorDays,
      priorSick,
      priorPersonal,
      priorMaternity,
      priorOther,
      currentDays,
      totalAccumulated
    };
  }, [leaveRequests, getReqLeaveRound]);

  // Round KPI Summary
  const fiscalYearSummary = useMemo(() => {
    const targetYear = selectedFiscalYear === 'all' ? currentFiscalYear : Number(selectedFiscalYear);
    
    const roundLeaves = baseLeaveRequests.filter(r => {
      const fy = r.fiscalYear || getThaiFiscalYear(r.startDate || r.createdAt);
      if (fy !== targetYear) return false;
      if (getReqLeaveRound(r) !== effectiveLeaveRound) return false;
      if (isAdmin && selectedTeacherFilter !== 'all') {
        if (cleanTeacherName(r.teacherName) !== cleanTeacherName(selectedTeacherFilter)) return false;
      }
      return true;
    });

    let totalDays = 0;
    let sickDays = 0;
    let personalDays = 0;
    let maternityDays = 0;
    let otherDays = 0;
    let approvedCount = 0;
    let pendingCount = 0;

    roundLeaves.forEach(r => {
      if (r.status === 'ไม่อนุมัติ') return;
      const days = calculateLeaveDaysCount(r.startDate, r.endDate);
      totalDays += days;
      if (r.leaveType.includes('ป่วย')) sickDays += days;
      else if (r.leaveType.includes('กิจ')) personalDays += days;
      else if (r.leaveType.includes('คลอด')) maternityDays += days;
      else otherDays += days;

      if (r.status === 'อนุมัติ') approvedCount++;
      if (r.status === 'รออนุมัติ') pendingCount++;
    });

    return {
      fiscalYear: targetYear,
      evalRound: effectiveLeaveRound,
      totalRequests: roundLeaves.length,
      totalDays,
      sickDays,
      personalDays,
      maternityDays,
      otherDays,
      approvedCount,
      pendingCount
    };
  }, [baseLeaveRequests, selectedFiscalYear, currentFiscalYear, effectiveLeaveRound, isAdmin, selectedTeacherFilter, getReqLeaveRound]);

  const THAI_MONTHS_NAMES = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const parseThaiDateParts = (dateStr?: string) => {
    if (!dateStr) {
      const now = new Date();
      return {
        day: now.getDate().toString(),
        month: THAI_MONTHS_NAMES[now.getMonth()],
        year: (now.getFullYear() + 543).toString()
      };
    }
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return {
        day: isNaN(d) ? '1' : d.toString(),
        month: THAI_MONTHS_NAMES[m] || 'มกราคม',
        year: isNaN(y) ? '2569' : (y > 2400 ? y : y + 543).toString()
      };
    }
    return { day: '1', month: 'มกราคม', year: '2569' };
  };


  const [isDutyModalOpen, setIsDutyModalOpen] = useState(false);
  const [dutyForm, setDutyForm] = useState<DutyAssignment>({
    id: '',
    dayOfWeek: 'วันจันทร์',
    teacherNames: '',
    dutyType: 'ครูเวรประจำวัน',
    location: '',
    note: ''
  });
  const [editingDutyId, setEditingDutyId] = useState<string | null>(null);

  // Helper for formatting Thai date string
  const formatThaiDate = (dateStr?: string) => {
    const p = parseThaiDateParts(dateStr);
    return `${p.day} ${p.month} ${p.year}`;
  };

  const getThaiDayName = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    return isNaN(d.getTime()) ? 'วันจันทร์' : thaiDays[d.getDay()];
  };

  // Available Academic Years from Settings
  const [availableDutyAcademicYears, setAvailableDutyAcademicYears] = useState<string[]>(() => {
    const stored = StorageService.getAcademicYears();
    const base = stored && stored.length > 0 ? stored : ['2570', '2569', '2568', '2567'];
    const current = schoolInfo?.academicYear || '2569';
    return Array.from(new Set([current, ...base])).sort((a, b) => Number(b) - Number(a));
  });

  useEffect(() => {
    return StorageService.subscribe(() => {
      const stored = StorageService.getAcademicYears();
      const base = stored && stored.length > 0 ? stored : ['2570', '2569', '2568', '2567'];
      const current = schoolInfo?.academicYear || '2569';
      setAvailableDutyAcademicYears(Array.from(new Set([current, ...base])).sort((a, b) => Number(b) - Number(a)));
    });
  }, [schoolInfo?.academicYear]);

  // Admin local view-only state for switching Academic Year & Semester in Duty Teacher tab (does not modify schoolInfo or affect members)
  const [selectedDutyAcademicYear, setSelectedDutyAcademicYear] = useState<string>(
    schoolInfo?.academicYear || '2569'
  );
  const [selectedDutySemester, setSelectedDutySemester] = useState<string>(
    schoolInfo?.semester || '1'
  );

  useEffect(() => {
    if (schoolInfo?.academicYear) setSelectedDutyAcademicYear(schoolInfo.academicYear);
    if (schoolInfo?.semester) setSelectedDutySemester(schoolInfo.semester);
  }, [schoolInfo?.academicYear, schoolInfo?.semester]);

  // For Admin: use local dropdown state; For Member: strictly use schoolInfo set by Admin in Settings
  const activeDutyYr = isAdmin
    ? selectedDutyAcademicYear
    : (schoolInfo?.academicYear || '2569');
  const activeDutySem = isAdmin
    ? selectedDutySemester
    : (schoolInfo?.semester || '1');

  const activeDutyTermKey = useMemo(() => {
    return `${activeDutySem}_${activeDutyYr}`;
  }, [activeDutySem, activeDutyYr]);

  // 100-day Academic Calendar configuration defined by Admin (same source as Module3)
  const attendanceConfigsByTerm = useMemo(
    () => StorageService.getAttendanceConfigsByTerm(),
    [studentAttendanceSyncTick, activeDutyTermKey]
  );

  // Active 100-day config based on activeDutySem & activeDutyYr
  const activeDutyConfig = useMemo(() => {
    const cfg = attendanceConfigsByTerm[activeDutyTermKey];
    if (cfg && cfg.schoolDays && cfg.schoolDays.length > 0) {
      return cfg;
    }
    // Default fallback Mon-Fri between term dates
    const startStr = activeDutySem === '1' ? `${Number(activeDutyYr) - 543}-05-18` : `${Number(activeDutyYr) - 543}-11-02`;
    const endStr = activeDutySem === '1' ? `${Number(activeDutyYr) - 543}-10-07` : `${Number(activeDutyYr) - 542}-03-31`;
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const days: { date: string; dayOfWeek: string; isHoliday: boolean }[] = [];
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    let curr = new Date(start);
    while (curr <= end) {
      const dNum = curr.getDay();
      const isWeekend = dNum === 0 || dNum === 6;
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      days.push({
        date: `${yyyy}-${mm}-${dd}`,
        dayOfWeek: thaiDays[dNum],
        isHoliday: isWeekend
      });
      curr.setDate(curr.getDate() + 1);
    }
    return {
      academicYear: activeDutyYr,
      semester: activeDutySem as '1' | '2',
      startDate: startStr,
      endDate: endStr,
      targetDays: 100,
      schoolDays: days
    };
  }, [activeDutyTermKey, attendanceConfigsByTerm, activeDutySem, activeDutyYr]);

  const dutyActiveSchoolDays = useMemo(() => {
    return (activeDutyConfig?.schoolDays || []).filter(d => !d.isHoliday);
  }, [activeDutyConfig]);

  const dutyActiveSchoolDayDatesSet = useMemo(() => {
    return new Set(dutyActiveSchoolDays.map(d => d.date));
  }, [dutyActiveSchoolDays]);

  // Filter duty logs by activeDutyYr & activeDutySem
  const filteredDutyLogs = useMemo(() => {
    return dutyLogs.filter(log => {
      if (log.academicYear && log.semester) {
        return String(log.academicYear) === String(activeDutyYr) && String(log.semester) === String(activeDutySem);
      }
      if (dutyActiveSchoolDayDatesSet.has(log.date)) {
        return true;
      }
      for (const [termKey, cfg] of Object.entries(attendanceConfigsByTerm)) {
        if (cfg?.schoolDays?.some(d => !d.isHoliday && d.date === log.date)) {
          const [tSem, tYr] = termKey.split('_');
          return String(tSem) === String(activeDutySem) && String(tYr) === String(activeDutyYr);
        }
      }
      const parts = (log.date || '').split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          const beYr = y > 2400 ? y : y + 543;
          let inferredSem = '1';
          let inferredYear = String(beYr);
          if (m >= 5 && m <= 10) {
            inferredSem = '1';
            inferredYear = String(beYr);
          } else if (m >= 11) {
            inferredSem = '2';
            inferredYear = String(beYr);
          } else {
            inferredSem = '2';
            inferredYear = String(beYr - 1);
          }
          return inferredYear === String(activeDutyYr) && inferredSem === String(activeDutySem);
        }
      }
      return true;
    });
  }, [dutyLogs, dutyActiveSchoolDayDatesSet, attendanceConfigsByTerm, activeDutyYr, activeDutySem]);

  // Ensure dutyLogForm.date is always restricted to a valid 100-day date
  useEffect(() => {
    if (dutyActiveSchoolDays.length > 0 && !dutyActiveSchoolDayDatesSet.has(dutyLogForm.date)) {
      const today = new Date().toISOString().split('T')[0];
      const validDate = dutyActiveSchoolDayDatesSet.has(today) ? today : dutyActiveSchoolDays[0].date;
      setDutyLogForm(prev => ({ ...prev, date: validDate }));
    }
  }, [dutyActiveSchoolDays, dutyActiveSchoolDayDatesSet, dutyLogForm.date]);

  // Calendar View Month & Year for duty 100-day calendar
  const [dutyCalMonth, setDutyCalMonth] = useState<number>(() => {
    if (dutyActiveSchoolDays.length > 0) {
      const d = new Date(dutyActiveSchoolDays[0].date);
      return isNaN(d.getTime()) ? 4 : d.getMonth();
    }
    return new Date().getMonth();
  });

  const [dutyCalYear, setDutyCalYear] = useState<number>(() => {
    if (dutyActiveSchoolDays.length > 0) {
      const d = new Date(dutyActiveSchoolDays[0].date);
      return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    }
    return new Date().getFullYear();
  });

  useEffect(() => {
    if (dutyActiveSchoolDays.length > 0) {
      const d = new Date(dutyActiveSchoolDays[0].date);
      if (!isNaN(d.getTime())) {
        setDutyCalMonth(d.getMonth());
        setDutyCalYear(d.getFullYear());
      }
    }
  }, [activeDutyTermKey, dutyActiveSchoolDays]);

  const [selectedDutyCalendarDate, setSelectedDutyCalendarDate] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dutyActiveSchoolDayDatesSet.has(today)) return today;
    return dutyActiveSchoolDays[0]?.date || today;
  });

  // Calendar available months from active 100 school days (exact same format as Module3)
  const dutyCalendarAvailableMonths = useMemo(() => {
    const map = new Map<string, { year: number; month: number; name: string }>();
    dutyActiveSchoolDays.forEach(d => {
      const parts = d.date.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const key = `${y}-${m}`;
        if (!map.has(key)) {
          const thaiMonthShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][m];
          const thaiYearShort = String((y + 543) % 100).padStart(2, '0');
          map.set(key, { year: y, month: m, name: `${thaiMonthShort} ${thaiYearShort}` });
        }
      }
    });
    return Array.from(map.values());
  }, [dutyActiveSchoolDays]);

  // Calendar cells generation for dutyCalYear & dutyCalMonth
  const dutyCalendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(dutyCalYear, dutyCalMonth, 1).getDay();
    const daysInMonth = new Date(dutyCalYear, dutyCalMonth + 1, 0).getDate();
    const cells: { dateStr: string; dayNum: number; isSchoolDay: boolean; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ dateStr: '', dayNum: 0, isSchoolDay: false, isCurrentMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const yyyy = dutyCalYear;
      const mm = String(dutyCalMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const isSchoolDay = dutyActiveSchoolDayDatesSet.has(dateStr);
      cells.push({ dateStr, dayNum: day, isSchoolDay, isCurrentMonth: true });
    }

    return cells;
  }, [dutyCalYear, dutyCalMonth, dutyActiveSchoolDayDatesSet]);

  // Student filtering
  const [gradeCategory, setGradeCategory] = useState<'primary' | 'secondary'>('primary');
  const [selectedGrade, setSelectedGrade] = useState<string>('ประถม');
  const [searchQuery, setSearchQuery] = useState('');

  // Student ID Card Batch Modal state
  const [studentCardModalState, setStudentCardModalState] = useState<{
    isOpen: boolean;
    side: 'front' | 'back';
    grade: string;
  }>({
    isOpen: false,
    side: 'front',
    grade: 'all'
  });

  // Grade options (Removing ม.4, ม.5, ม.6 - max level is ม.3)
  const primaryGrades: GradeLevel[] = ['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];
  const secondaryGrades: GradeLevel[] = ['ม.1', 'ม.2', 'ม.3'];
  const gradeOptions: GradeLevel[] = [...primaryGrades, ...secondaryGrades];

  // Batch grade level promotion state (แก้ไข / ปรับระดับชั้นเรียน)
  const [isBatchGradeEditMode, setIsBatchGradeEditMode] = useState(false);
  const [selectedStudentIdsForPromotion, setSelectedStudentIdsForPromotion] = useState<string[]>([]);
  const [targetPromotionGrade, setTargetPromotionGrade] = useState<string>('ป.1');
  const [isGradePromotionModalOpen, setIsGradePromotionModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  const getNextGradeLevel = (current: string): string => {
    switch (current) {
      case 'อ.1': return 'อ.2';
      case 'อ.2': return 'อ.3';
      case 'อ.3': return 'ป.1';
      case 'ป.1': return 'ป.2';
      case 'ป.2': return 'ป.3';
      case 'ป.3': return 'ป.4';
      case 'ป.4': return 'ป.5';
      case 'ป.5': return 'ป.6';
      case 'ป.6': return 'ม.1';
      case 'ม.1': return 'ม.2';
      case 'ม.2': return 'ม.3';
      case 'ม.3': return 'จบการศึกษา';
      default: return 'ป.1';
    }
  };

  const PROMOTION_GRADE_TARGETS = [
    'อ.1', 'อ.2', 'อ.3',
    'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
    'ม.1', 'ม.2', 'ม.3',
    'จบการศึกษา'
  ] as const;

  // Retirement date calculation
  const calculateRetirementDate = (birthDate: string): string => {
    if (!birthDate) return '-';
    const parts = birthDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year)) return '-';
    let retireYear = year + 60;
    if (month > 10 || (month === 10 && day >= 2)) {
      retireYear = year + 61;
    }
    return `${retireYear}-09-30`;
  };

  // Personnel modal & state
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [personnelType, setPersonnelType] = useState<string>('ครู');
  const [personnelDepartment, setPersonnelDepartment] = useState<string>('วิชาการ');
  const [personnelCustomDepartment, setPersonnelCustomDepartment] = useState<string>('');
  const [personnelAvatarUrl, setPersonnelAvatarUrl] = useState<string>('');
  const personnelFileInputRef = useRef<HTMLInputElement>(null);
  const [personnelSignatureUrl, setPersonnelSignatureUrl] = useState<string>('');
  const personnelSignatureInputRef = useRef<HTMLInputElement>(null);

  const handlePersonnelSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_W = 500;
        const MAX_H = 200;
        let w = img.width;
        let h = img.height;
        if (w > MAX_W) { h *= MAX_W / w; w = MAX_W; }
        if (h > MAX_H) { w *= MAX_H / h; h = MAX_H; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = file.type === 'image/png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.9);
          setPersonnelSignatureUrl(dataUrl);
          onShowToast('success', 'อัปโหลดสำเร็จ', 'อัปโหลดลายเซ็นบุคลากรเรียบร้อยแล้ว');
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePersonnelImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        let w = img.width;
        let h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPersonnelAvatarUrl(dataUrl);
          onShowToast('success', 'อัปโหลดสำเร็จ', 'อัปโหลดรูปถ่ายบุคลากรเรียบร้อยแล้ว');
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddPersonnel = () => {
    setEditingPersonnel(null);
    setPersonnelType('ครู');
    setPersonnelDepartment('วิชาการ');
    setPersonnelCustomDepartment('');
    setPersonnelAvatarUrl('');
    setPersonnelSignatureUrl('');
    setIsPersonnelModalOpen(true);
  };

  const handleOpenEditPersonnel = (person: Personnel) => {
    setEditingPersonnel(person);
    setPersonnelType(person.personnelType || 'ครู');
    const stdDepts = ['วิชาการ', 'บริหารทั่วไป', 'งบประมาณ', 'บริหารงานบุคคล'];
    if (person.department && stdDepts.includes(person.department)) {
      setPersonnelDepartment(person.department);
      setPersonnelCustomDepartment('');
    } else if (person.department) {
      setPersonnelDepartment('อื่นๆ');
      setPersonnelCustomDepartment(person.department);
    } else {
      setPersonnelDepartment('วิชาการ');
      setPersonnelCustomDepartment('');
    }
    setPersonnelAvatarUrl(person.avatarUrl || '');
    setPersonnelSignatureUrl(person.signatureUrl || '');
    setIsPersonnelModalOpen(true);
  };

  // School Info editing state
  const [editingSchoolInfo, setEditingSchoolInfo] = useState<SchoolInfo>(schoolInfo);
  const [newCustomFieldKey, setNewCustomFieldKey] = useState('');
  const [newCustomFieldValue, setNewCustomFieldValue] = useState('');

  const normalizeRoom = (r?: string) => (r || '').replace(/^ห้อง\s*/i, '').trim() || '1';
  const [selectedStudentRoom, setSelectedStudentRoom] = useState<string>('ALL');

  const availableRoomsForSelectedGrade = useMemo(() => {
    const roomSet = new Set<string>();
    students.forEach(s => {
      const matchG = selectedGrade === 'ประถม'
        ? primaryGrades.includes(s.gradeLevel as GradeLevel)
        : selectedGrade === 'มัธยม'
        ? secondaryGrades.includes(s.gradeLevel as GradeLevel)
        : s.gradeLevel === selectedGrade;
      if (matchG) {
        roomSet.add(normalizeRoom(s.room));
      }
    });
    return Array.from(roomSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, selectedGrade, primaryGrades, secondaryGrades]);

  useEffect(() => {
    if (selectedStudentRoom !== 'ALL' && !availableRoomsForSelectedGrade.includes(selectedStudentRoom)) {
      setSelectedStudentRoom('ALL');
    }
  }, [availableRoomsForSelectedGrade, selectedStudentRoom]);

  // Sorted and filtered students
  const filteredStudents = students.filter(student => {
    let matchGrade = true;
    if (selectedGrade === 'ประถม') {
      matchGrade = primaryGrades.includes(student.gradeLevel as GradeLevel);
    } else if (selectedGrade === 'มัธยม') {
      matchGrade = secondaryGrades.includes(student.gradeLevel as GradeLevel);
    } else {
      matchGrade = student.gradeLevel === selectedGrade;
    }
    const matchRoom = selectedStudentRoom === 'ALL' || normalizeRoom(student.room) === normalizeRoom(selectedStudentRoom);
    const matchQuery = 
      (student.firstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.lastName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.studentCode ? student.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
      (student.nickname ? student.nickname.toLowerCase().includes(searchQuery.toLowerCase()) : false);
    return matchGrade && matchRoom && matchQuery;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (a.rollNumber !== undefined && b.rollNumber !== undefined) {
      return a.rollNumber - b.rollNumber;
    }
    if (a.rollNumber !== undefined) return -1;
    if (b.rollNumber !== undefined) return 1;
    return (a.studentCode || '').localeCompare(b.studentCode || '');
  });

  // Grade Promotion Handlers (เลื่อนชั้นเรียน/ปรับระดับชั้น)
  const handleOpenPromotionMode = (grade: string) => {
    const next = getNextGradeLevel(grade);
    setTargetPromotionGrade(next);
    const studentsInGrade = sortedStudents.filter(s => s.gradeLevel === grade || grade === 'all');
    setSelectedStudentIdsForPromotion(studentsInGrade.map(s => s.id));
    setIsBatchGradeEditMode(true);
  };

  const handleOpenPromotionModal = (grade: string) => {
    const next = getNextGradeLevel(grade);
    setTargetPromotionGrade(next);
    const studentsInGrade = sortedStudents.filter(s => s.gradeLevel === grade || grade === 'all');
    setSelectedStudentIdsForPromotion(studentsInGrade.map(s => s.id));
    setModalSearchQuery('');
    setIsGradePromotionModalOpen(true);
  };

  const handleToggleStudentForPromotion = (studentId: string) => {
    setSelectedStudentIdsForPromotion(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllForPromotion = () => {
    if (selectedStudentIdsForPromotion.length === sortedStudents.length) {
      setSelectedStudentIdsForPromotion([]);
    } else {
      setSelectedStudentIdsForPromotion(sortedStudents.map(s => s.id));
    }
  };

  const handleCancelPromotionMode = () => {
    setIsBatchGradeEditMode(false);
    setSelectedStudentIdsForPromotion([]);
  };

  const handleConfirmPromotion = () => {
    if (selectedStudentIdsForPromotion.length === 0) {
      onShowToast('warning', 'ยังไม่ได้เลือกนักเรียน', 'กรุณาเลือกรายชื่อนักเรียนที่ต้องการปรับระดับชั้นอย่างน้อย 1 คน');
      return;
    }
    if (user.role !== 'admin') {
      onShowToast('warning', 'ไม่มีสิทธิ์', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถปรับระดับชั้นนักเรียนได้');
      return;
    }

    const currentGradeLabel = selectedGrade !== 'all' && selectedGrade !== 'ประถม' && selectedGrade !== 'มัธยม' ? selectedGrade : 'เดิม';
    const studentsToUpdate: Student[] = [];

    students.forEach(student => {
      if (selectedStudentIdsForPromotion.includes(student.id)) {
        if (targetPromotionGrade === 'จบการศึกษา') {
          studentsToUpdate.push({
            ...student,
            status: 'จบการศึกษา'
          });
        } else {
          studentsToUpdate.push({
            ...student,
            gradeLevel: targetPromotionGrade as GradeLevel,
            status: 'กำลังศึกษา'
          });
        }
      }
    });

    if (onSaveBulkStudents) {
      onSaveBulkStudents(studentsToUpdate);
    } else {
      StorageService.saveBulkStudents(studentsToUpdate);
      studentsToUpdate.forEach(s => onSaveStudent(s));
    }

    // Switch view to the new grade if it's a valid grade
    if (targetPromotionGrade !== 'จบการศึกษา') {
      if (['ม.1', 'ม.2', 'ม.3'].includes(targetPromotionGrade)) {
        setGradeCategory('secondary');
      } else {
        setGradeCategory('primary');
      }
      setSelectedGrade(targetPromotionGrade);
    }

    setIsBatchGradeEditMode(false);
    setIsGradePromotionModalOpen(false);
    setSelectedStudentIdsForPromotion([]);

    onShowToast(
      'success',
      'ปรับระดับชั้นสำเร็จ 🎉',
      `ปรับระดับชั้นนักเรียน ${studentsToUpdate.length} คน จากชั้น ${currentGradeLabel} ไปเป็นชั้น ${targetPromotionGrade} เรียบร้อยแล้ว`
    );
  };

  // Student Modal state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [viewingPersonnel, setViewingPersonnel] = useState<Personnel | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'student' | 'personnel';
    id: string;
    name: string;
  } | null>(null);

  // Complete Student Form State
  const defaultStudentForm: Student = {
    id: '',
    rollNumber: undefined,
    studentCode: '',
    prefix: 'เด็กชาย',
    firstName: '',
    lastName: '',
    nickname: '',
    gender: 'ชาย',
    birthDate: '2019-01-01',
    age: 7,
    religion: 'พุทธ',
    gradeLevel: 'ป.1',
    room: '1',
    chronicDisease: 'ไม่มี',
    address: '',
    fatherPrefix: 'นาย',
    fatherName: '',
    fatherDeceased: false,
    fatherMissing: false,
    fatherAge: undefined,
    fatherOccupation: '',
    fatherIncome: undefined,
    fatherEducation: 'มัธยมศึกษาตอนปลาย / ปวช.',
    fatherPhone: '',
    motherPrefix: 'นาง',
    motherName: '',
    motherDeceased: false,
    motherMissing: false,
    motherAge: undefined,
    motherOccupation: '',
    motherIncome: undefined,
    motherEducation: 'มัธยมศึกษาตอนปลาย / ปวช.',
    motherPhone: '',
    parentsMaritalStatus: 'อยู่ด้วยกัน',
    parentsMaritalStatusOther: '',
    guardianPrefix: 'นาย',
    guardianRelation: 'บิดา',
    guardianRelationOther: '',
    guardianName: '',
    guardianAge: undefined,
    guardianOccupation: '',
    guardianIncome: undefined,
    guardianEducation: 'มัธยมศึกษาตอนปลาย / ปวช.',
    guardianPhone: '',
    guardianAddress: '',
    birthOrder: 1,
    isOnlyChild: false,
    totalSiblings: 1,
    brothersCount: 0,
    sistersCount: 0,
    hasOlderHalfSiblings: false,
    olderHalfSiblingsCount: 0,
    hasYoungerHalfSiblings: false,
    youngerHalfSiblingsCount: 0,
    hasHalfSiblings: false,
    halfSiblingsCount: 0,
    studyingSiblingsCount: 1,
    housingStatus: 'บ้านตัวเอง',
    rentAmount: undefined,
    housingStatusOther: '',
    houseType: 'บ้านชั้นเดียว',
    houseTypeOther: '',
    householdBurden: ['ครัวเรือนไม่มีภาระพึ่งพิง'],
    livingWith: 'บิดามารดา',
    livingWithOther: '',
    travelMethod: 'เดิน',
    travelMethodOther: '',
    distanceToSchool: '',
    travelTimeToSchool: '',
    parentOccupation: '',
    dailyAllowance: 40,
    photoUrl: '',
    status: 'กำลังศึกษา'
  };

  const [studentFormData, setStudentFormData] = useState<Student>(defaultStudentForm);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Open Add Student Modal
  const handleOpenAddStudent = () => {
    if (user.role !== 'admin') {
      onShowToast('warning', 'ไม่มีสิทธิ์', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเพิ่มนักเรียนใหม่ได้');
      return;
    }
    const maxRoll = students.reduce((max, s) => Math.max(max, s.rollNumber || 0), 0);
    setEditingStudent(null);
    setStudentFormData({
      ...defaultStudentForm,
      id: 'std-' + Date.now(),
      rollNumber: maxRoll + 1,
      studentCode: '',
      gradeLevel: (selectedGrade !== 'all' && selectedGrade !== 'ประถม' && selectedGrade !== 'มัธยม' ? selectedGrade : 'ป.1') as GradeLevel
    });
    setIsStudentModalOpen(true);
  };

  // Open Edit Student Modal
  const handleOpenEditStudent = (student: Student) => {
    if (user.role !== 'admin') {
      onShowToast('warning', 'ไม่มีสิทธิ์', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขข้อมูลนักเรียนได้');
      return;
    }
    setEditingStudent(student);
    setStudentFormData({
      ...defaultStudentForm,
      ...student,
      householdBurden: student.householdBurden || ['ครัวเรือนไม่มีภาระพึ่งพิง']
    });
    setIsStudentModalOpen(true);
  };

  // Copy Father Info to Guardian
  const handleCopyFatherToGuardian = () => {
    setStudentFormData(prev => ({
      ...prev,
      guardianPrefix: prev.fatherPrefix || 'นาย',
      guardianRelation: 'บิดา',
      guardianName: prev.fatherName || '',
      guardianAge: prev.fatherAge,
      guardianOccupation: prev.fatherOccupation || '',
      guardianIncome: prev.fatherIncome,
      guardianEducation: prev.fatherEducation || '',
      guardianPhone: prev.fatherPhone || '',
      guardianAddress: prev.guardianAddress || prev.address || ''
    }));
    onShowToast('info', 'คัดลอกข้อมูลบิดา', 'คัดลอกข้อมูลบิดาไปยังข้อมูลผู้ปกครองเรียบร้อยแล้ว');
  };

  // Copy Mother Info to Guardian
  const handleCopyMotherToGuardian = () => {
    setStudentFormData(prev => ({
      ...prev,
      guardianPrefix: prev.motherPrefix || 'นาง',
      guardianRelation: 'มารดา',
      guardianName: prev.motherName || '',
      guardianAge: prev.motherAge,
      guardianOccupation: prev.motherOccupation || '',
      guardianIncome: prev.motherIncome,
      guardianEducation: prev.motherEducation || '',
      guardianPhone: prev.motherPhone || '',
      guardianAddress: prev.guardianAddress || prev.address || ''
    }));
    onShowToast('info', 'คัดลอกข้อมูลมารดา', 'คัดลอกข้อมูลมารดาไปยังข้อมูลผู้ปกครองเรียบร้อยแล้ว');
  };

  // Reset Guardian form
  const handleResetGuardian = () => {
    setStudentFormData(prev => ({
      ...prev,
      guardianPrefix: 'นาย',
      guardianRelation: 'ญาติ',
      guardianRelationOther: '',
      guardianName: '',
      guardianAge: undefined,
      guardianOccupation: '',
      guardianIncome: undefined,
      guardianEducation: '',
      guardianPhone: '',
      guardianAddress: ''
    }));
    onShowToast('info', 'ล้างข้อมูลผู้ปกครอง', 'ล้างข้อมูลผู้ปกครองเพื่อกรอกใหม่แล้ว');
  };

  // Copy Student Address to Guardian Address
  const handleCopyStudentAddressToGuardian = () => {
    setStudentFormData(prev => ({
      ...prev,
      guardianAddress: prev.address || ''
    }));
    onShowToast('info', 'คัดลอกที่อยู่', 'คัดลอกที่อยู่ปัจจุบันของนักเรียนเรียบร้อยแล้ว');
  };

  // Image Upload Handler (Compressed Base64 Data URL)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('warning', 'ไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 480;
        const MAX_HEIGHT = 480;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setStudentFormData(prev => ({ ...prev, photoUrl: dataUrl }));
          onShowToast('success', 'อัปโหลดรูปสำเร็จ', 'บันทึกรูปภาพนักเรียนเรียบร้อยแล้ว');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Toggle Household Burden Checkbox
  const handleToggleBurden = (burdenName: string) => {
    setStudentFormData(prev => {
      const current = prev.householdBurden || [];
      if (burdenName === 'ครัวเรือนไม่มีภาระพึ่งพิง') {
        return {
          ...prev,
          householdBurden: current.includes(burdenName) ? [] : ['ครัวเรือนไม่มีภาระพึ่งพิง']
        };
      }
      let updated = current.filter(b => b !== 'ครัวเรือนไม่มีภาระพึ่งพิง');
      if (updated.includes(burdenName)) {
        updated = updated.filter(b => b !== burdenName);
      } else {
        updated.push(burdenName);
      }
      if (updated.length === 0) {
        updated = ['ครัวเรือนไม่มีภาระพึ่งพิง'];
      }
      return {
        ...prev,
        householdBurden: updated
      };
    });
  };

  // Save Student Submit
  const handleSaveStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role !== 'admin') {
      onShowToast('warning', 'ไม่มีสิทธิ์', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถบันทึกข้อมูลนักเรียนได้');
      return;
    }
    if (!studentFormData.prefix?.trim() || !studentFormData.firstName?.trim() || !studentFormData.lastName?.trim() || !studentFormData.gradeLevel) {
      onShowToast('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณากรอกคำนำหน้า ชื่อจริง นามสกุล และระดับชั้นของนักเรียน');
      return;
    }

    const rawPrefix = (studentFormData.prefix || '').trim();
    const syncedGender: 'ชาย' | 'หญิง' =
      rawPrefix.startsWith('เด็กหญิง') ||
      rawPrefix.startsWith('ด.ญ.') ||
      rawPrefix.startsWith('ด.ญ') ||
      rawPrefix.startsWith('นางสาว') ||
      rawPrefix.startsWith('น.ส.') ||
      rawPrefix.startsWith('นาง') ||
      rawPrefix.includes('หญิง')
        ? 'หญิง'
        : 'ชาย';

    onSaveStudent({
      ...studentFormData,
      gender: syncedGender
    });
    setIsStudentModalOpen(false);
    onShowToast(
      'success',
      'บันทึกสำเร็จ',
      `${editingStudent ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลนักเรียน ${studentFormData.prefix}${studentFormData.firstName} ${studentFormData.lastName} เรียบร้อยแล้ว`
    );
  };

  // Save Personnel Submit
  const handleSavePersonnelSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (user.role !== 'admin') {
      onShowToast('warning', 'ไม่มีสิทธิ์', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถจัดการบุคลากรได้');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const birthDate = formData.get('birthDate') as string;
    const retirementDate = calculateRetirementDate(birthDate);

    const finalDepartment = personnelDepartment === 'อื่นๆ' ? (personnelCustomDepartment.trim() || 'อื่นๆ') : personnelDepartment;
    const person: Personnel = {
      id: editingPersonnel ? editingPersonnel.id : 'pers-' + Date.now(),
      prefix: formData.get('prefix') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      personnelType,
      department: finalDepartment,
      customDepartment: personnelDepartment === 'อื่นๆ' ? personnelCustomDepartment : '',
      position: formData.get('position') as string,
      advisorGrade: formData.get('advisorGrade') as string,
      birthDate,
      employmentDate: formData.get('employmentDate') as string,
      retirementDate,
      degree: formData.get('degree') as string,
      major: formData.get('major') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      avatarUrl: personnelAvatarUrl,
      signatureUrl: personnelSignatureUrl
    };

    onSavePersonnel(person);
    setIsPersonnelModalOpen(false);
    onShowToast('success', 'บันทึกสำเร็จ', `บันทึกข้อมูลของ ${person.prefix}${person.firstName} เรียบร้อยแล้ว`);
  };

  // Add Dynamic Custom Field to School Info
  const handleAddCustomField = () => {
    if (!newCustomFieldKey.trim()) return;
    const current = editingSchoolInfo.customFields || [];
    setEditingSchoolInfo({
      ...editingSchoolInfo,
      customFields: [...current, { label: newCustomFieldKey.trim(), value: newCustomFieldValue.trim() }]
    });
    setNewCustomFieldKey('');
    setNewCustomFieldValue('');
  };

  const handleRemoveCustomField = (index: number) => {
    const current = editingSchoolInfo.customFields || [];
    setEditingSchoolInfo({
      ...editingSchoolInfo,
      customFields: current.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation for ข้อมูล/อื่นๆ */}
      <div className="bg-blue-50/90 p-3.5 rounded-2xl border border-blue-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 w-full sm:w-auto">
          {/* Mobile Row 1: Student & Personnel */}
          <div className="grid grid-cols-2 gap-1.5 sm:contents">
            <button
              onClick={() => setActiveSubTab('students')}
              className={`w-full sm:w-auto h-9 sm:h-10 px-2 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                activeSubTab === 'students'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-blue-200/80'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">1. ข้อมูลนักเรียน ({students.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('personnel')}
              className={`w-full sm:w-auto h-9 sm:h-10 px-2 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                activeSubTab === 'personnel'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-blue-200/80'
              }`}
            >
              <Smile className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">2. ข้อมูลบุคลากร ({personnel.length})</span>
            </button>
          </div>

          {/* Mobile Row 2: School Info, Leave, Duty - Equal 3 columns */}
          <div className="grid grid-cols-3 gap-1.5 sm:contents">
            <button
              onClick={() => setActiveSubTab('school')}
              className={`w-full sm:w-auto h-9 sm:h-10 px-1 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer ${
                activeSubTab === 'school'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-blue-200/80'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden truncate">3. ข้อมูล รร.</span>
              <span className="hidden sm:inline truncate">3. ข้อมูลโรงเรียน</span>
            </button>

            <button
              onClick={() => setActiveSubTab('leave')}
              className={`w-full sm:w-auto h-9 sm:h-10 px-1 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer ${
                activeSubTab === 'leave'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-blue-200/80'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">4. ระบบลา</span>
            </button>

            <button
              onClick={() => setActiveSubTab('duty')}
              className={`w-full sm:w-auto h-9 sm:h-10 px-1 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer ${
                activeSubTab === 'duty'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-blue-200/80'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">5. ครูเวร</span>
            </button>
          </div>
        </div>


      </div>

      {/* SUBTAB 1: STUDENTS */}
      {activeSubTab === 'students' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {/* Search input - Hidden on mobile, visible on desktop */}
              <div className="hidden sm:block relative min-w-[200px] sm:min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ, นามสกุล หรือรหัสนักเรียน..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Mobile Grade Dropdown Select */}
              <div className="sm:hidden w-full">
                <select
                  value={selectedGrade === 'ประถม' || selectedGrade === 'มัธยม' ? 'ป.1' : selectedGrade}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (primaryGrades.includes(val as GradeLevel)) {
                      setGradeCategory('primary');
                    } else if (secondaryGrades.includes(val as GradeLevel)) {
                      setGradeCategory('secondary');
                    }
                    setSelectedGrade(val);
                    if (isBatchGradeEditMode) {
                      handleOpenPromotionMode(val);
                    }
                  }}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/90 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                >
                  {gradeOptions.map(g => (
                    <option key={g} value={g}>
                      ชั้น {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Desktop Grade Filter Category & Pill buttons */}
              <div className="hidden sm:flex items-center gap-1.5 flex-wrap py-1">
                {/* Primary / Secondary Category Toggles */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl mr-1">
                  <button
                    onClick={() => {
                      setGradeCategory('primary');
                      setSelectedGrade('ประถม');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gradeCategory === 'primary'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ประถม
                  </button>
                  <button
                    onClick={() => {
                      setGradeCategory('secondary');
                      setSelectedGrade('มัธยม');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gradeCategory === 'secondary'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    มัธยม
                  </button>
                </div>

                {/* Sub-grade buttons */}
                {(gradeCategory === 'primary' ? primaryGrades : secondaryGrades).map(g => (
                  <button
                    key={g}
                    onClick={() => {
                      setSelectedGrade(g);
                      setSelectedStudentRoom('ALL');
                      if (isBatchGradeEditMode) {
                        handleOpenPromotionMode(g);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                      selectedGrade === g
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}

              </div>

              {/* Room Filter Buttons when grade has multiple rooms */}
              {availableRoomsForSelectedGrade.length > 1 && (
                <div className="flex items-center gap-1 bg-blue-50/80 px-2 py-1 rounded-xl border border-blue-200">
                  <span className="text-[11px] font-bold text-blue-900 px-1">ห้อง:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentRoom('ALL')}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedStudentRoom === 'ALL'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    ทุกห้อง
                  </button>
                  {availableRoomsForSelectedGrade.map(rm => (
                    <button
                      key={rm}
                      type="button"
                      onClick={() => setSelectedStudentRoom(rm)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedStudentRoom === rm
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      ห้อง {rm}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Batch Grade Promotion Button in Action Bar */}
              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => handleOpenPromotionModal(selectedGrade !== 'all' && selectedGrade !== 'ประถม' && selectedGrade !== 'มัธยม' ? selectedGrade : 'ป.1')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                  title="เปิดหน้าต่างปรับระดับชั้นเรียน/เลื่อนชั้นเรียน"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>แก้ระดับชั้น</span>
                </button>
              )}

              {/* Single Student Card Download Button */}
              <button
                type="button"
                onClick={() => setStudentCardModalState({
                  isOpen: true,
                  side: 'front',
                  grade: selectedGrade !== 'all' && selectedGrade !== 'ประถม' && selectedGrade !== 'มัธยม' ? selectedGrade : 'all'
                })}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                title="ดาวน์โหลด/พิมพ์บัตรนักเรียน (ขนาด 85.6 × 54 มม. แนวนอน บนกระดาษ A4 มีทั้งหน้าบัตรและหลังบัตร)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>บัตรนักเรียน</span>
              </button>

              {user.role === 'admin' && (
                <button
                  onClick={handleOpenAddStudent}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs shrink-0 active:scale-95 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>เพิ่ม</span>
                </button>
              )}
            </div>
          </div>

          {/* Batch Grade Level Promotion Toolbar Banner */}
          {isBatchGradeEditMode && user.role === 'admin' && (
            <div className="bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm space-y-3 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-800">
                        แก้ไขและปรับระดับชั้นเรียน (ชั้น {selectedGrade})
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-bold">
                        เลือกแล้ว {selectedStudentIdsForPromotion.length} / {sortedStudents.length} คน
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      ติ๊กเลือกนักเรียนในตารางด้านล่างที่ต้องการเลื่อนชั้น แล้วเลือกชั้นปลายทาง (เช่น จาก {selectedGrade} ไปยัง {targetPromotionGrade})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSelectAllForPromotion}
                    className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-300 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    {selectedStudentIdsForPromotion.length === sortedStudents.length ? (
                      <>
                        <Square className="w-3.5 h-3.5 text-slate-500" />
                        <span>ยกเลิกการเลือกทั้งหมด</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>เลือกทั้งหมด ({sortedStudents.length} คน)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGradePromotionModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-900 border border-amber-300 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                    title="เปิดหน้าต่างเต็มจอเพื่อดูรายละเอียดครบถ้วน"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>เปิดแบบหน้าต่างเต็ม</span>
                  </button>
                </div>
              </div>

              {/* Adjust Grade Action Form */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-amber-200/90 bg-white/80 p-3 rounded-xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>จากชั้น</span>
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded-md font-mono text-slate-800">
                      {selectedGrade}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 mx-0.5" />
                    <span>ปรับเป็นระดับชั้นใหม่:</span>
                  </span>

                  <select
                    value={targetPromotionGrade}
                    onChange={(e) => setTargetPromotionGrade(e.target.value)}
                    className="text-xs font-bold px-3 py-1.5 bg-white border-2 border-amber-400 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                  >
                    {PROMOTION_GRADE_TARGETS.map(g => (
                      <option key={g} value={g}>
                        {g === 'จบการศึกษา' ? '🎓 จบการศึกษา' : `ชั้น ${g}`}
                      </option>
                    ))}
                  </select>

                  <span className="text-[11px] text-slate-500 hidden md:inline">
                    (ข้อมูลนักเรียนที่เลือกทั้งหมดจะเปลี่ยนระดับชั้นเป็น {targetPromotionGrade} ทันที)
                  </span>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleCancelPromotionMode}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={selectedStudentIdsForPromotion.length === 0}
                    onClick={handleConfirmPromotion}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                      selectedStudentIdsForPromotion.length === 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ยืนยันปรับระดับชั้น ({selectedStudentIdsForPromotion.length} คน)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header row with count & hint */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold text-slate-700">
              รายชื่อนักเรียน ({sortedStudents.length} คน) • แสดงเป็นรายการขนาดเล็กเรียงตามเลขที่
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              คลิกที่รูปเพื่อดูภาพขนาดใหญ่ • คลิกไอคอนตาเพื่อดูประวัติฉบับเต็ม
            </span>
          </div>

          {/* Student Compact List View */}
          {sortedStudents.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">ไม่พบข้อมูลนักเรียน</p>
              <p className="text-xs text-slate-500 mt-0.5">ลองเปลี่ยนคำค้นหาหรือระดับชั้น</p>
            </div>
          ) : (
            <>
              {/* Desktop & Tablet Table List */}
              <div className="hidden sm:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 border-b border-slate-200/90 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                        {isBatchGradeEditMode && user.role === 'admin' && (
                          <th className="py-2.5 px-3 text-center w-10 bg-amber-100/90">
                            <input
                              type="checkbox"
                              checked={sortedStudents.length > 0 && selectedStudentIdsForPromotion.length === sortedStudents.length}
                              onChange={handleSelectAllForPromotion}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                              title="เลือกทั้งหมด / ยกเลิกการเลือก"
                            />
                          </th>
                        )}
                        <th className="py-2.5 px-3 text-center w-14">ลำดับ</th>
                        <th className="py-2.5 px-3 text-center w-12">รูป</th>
                        <th className="py-2.5 px-3">รหัส / ชื่อ - สกุล (ชื่อเล่น)</th>
                        <th className="py-2.5 px-3 text-center">ชั้น/ห้อง</th>
                        <th className="py-2.5 px-3 text-center">อายุ</th>
                        <th className="py-2.5 px-3 text-right">เงินมา ร.ร.</th>
                        <th className="py-2.5 px-3">ผู้ปกครอง / เบอร์โทร</th>
                        <th className="py-2.5 px-3 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedStudents.map((student, idx) => {
                        const roll = idx + 1;
                        const isSelectedForPromo = selectedStudentIdsForPromotion.includes(student.id);
                        return (
                          <tr
                            key={student.id}
                            onClick={() => {
                              if (isBatchGradeEditMode) {
                                handleToggleStudentForPromotion(student.id);
                              }
                            }}
                            className={`transition-colors ${
                              isBatchGradeEditMode && isSelectedForPromo
                                ? 'bg-amber-50/70 hover:bg-amber-100/60'
                                : 'hover:bg-blue-50/40'
                            }`}
                          >
                            {isBatchGradeEditMode && user.role === 'admin' && (
                              <td className="py-2 px-3 text-center bg-amber-50/80" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelectedForPromo}
                                  onChange={() => handleToggleStudentForPromotion(student.id)}
                                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="py-2 px-3 text-center font-bold">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 shadow-2xs">
                                {roll}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div
                                onClick={() => {
                                  if (student.photoUrl) {
                                    onOpenLightbox(
                                      student.photoUrl,
                                      `${student.prefix}${student.firstName} ${student.lastName}${student.nickname ? ` (${student.nickname})` : ''}`,
                                      `เลขที่ ${roll}${student.studentCode ? ` • รหัส ${student.studentCode}` : ''} • ชั้น ${student.gradeLevel}/${student.room}`
                                    );
                                  }
                                }}
                                className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden mx-auto cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all flex items-center justify-center shrink-0"
                                title="คลิกเพื่อดูรูปภาพขนาดใหญ่"
                              >
                                {student.photoUrl ? (
                                  <img
                                    src={student.photoUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-slate-400">{student.firstName[0]}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {student.studentCode && (
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-semibold">
                                    #{student.studentCode}
                                  </span>
                                )}
                                <span className="font-bold text-slate-800 text-xs">
                                  {student.prefix}{student.firstName} {student.lastName}
                                </span>
                                {student.nickname && (
                                  <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    {student.nickname}
                                  </span>
                                )}
                              </div>
                              {student.chronicDisease && student.chronicDisease !== 'ไม่มี' && (
                                <p className="text-[10px] text-rose-600 font-medium mt-0.5 flex items-center gap-1">
                                  <HeartPulse className="w-3 h-3 text-rose-500" />
                                  <span>โรคประจำตัว: {student.chronicDisease}</span>
                                </p>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100">
                                {student.gradeLevel}/{student.room}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600">
                              <span className="tabular-nums font-semibold">{student.age ?? '-'} ปี</span>
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-emerald-600 tabular-nums">
                              {student.dailyAllowance} บ./วัน
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              <div className="font-medium text-slate-700">
                                {student.guardianName || student.fatherName || student.motherName || '-'}
                                {student.guardianRelation && (
                                  <span className="text-slate-400 ml-1">({student.guardianRelation})</span>
                                )}
                              </div>
                              {(student.guardianPhone || student.fatherPhone || student.motherPhone) && (
                                <div className="text-[10px] text-blue-600 flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{student.guardianPhone || student.fatherPhone || student.motherPhone}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setViewingStudent(student)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="ดูประวัติฉบับเต็ม"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingStudent(student);
                                    setTimeout(() => {
                                      window.print();
                                    }, 200);
                                    onShowToast('success', 'ดาวน์โหลด PDF', `เตรียมพิมพ์/บันทึกประวัติ ${student.prefix}${student.firstName} ${student.lastName} เป็นไฟล์ PDF`);
                                  }}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="ดาวน์โหลดประวัตินักเรียนเป็น PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                {user.role === 'admin' && (
                                  <>
                                    <button
                                      onClick={() => handleOpenEditStudent(student)}
                                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                      title="แก้ไขข้อมูลนักเรียน"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmTarget({
                                        type: 'student',
                                        id: student.id,
                                        name: `${student.prefix}${student.firstName} ${student.lastName}`
                                      })}
                                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="ลบ"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile View: Compact Cards */}
              <div className="sm:hidden grid grid-cols-1 gap-2.5">
                {sortedStudents.map((student, idx) => {
                  const roll = idx + 1;
                  const isSelectedForPromo = selectedStudentIdsForPromotion.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => {
                        if (isBatchGradeEditMode) {
                          handleToggleStudentForPromotion(student.id);
                        }
                      }}
                      className={`p-3 rounded-2xl border shadow-2xs space-y-2 transition-colors ${
                        isBatchGradeEditMode && isSelectedForPromo
                          ? 'bg-amber-50/80 border-amber-300'
                          : 'bg-white border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isBatchGradeEditMode && user.role === 'admin' && (
                            <input
                              type="checkbox"
                              checked={isSelectedForPromo}
                              onChange={() => handleToggleStudentForPromotion(student.id)}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                            />
                          )}
                          <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                            {roll}
                          </span>
                          <div
                            onClick={() => {
                              if (student.photoUrl) {
                                onOpenLightbox(
                                  student.photoUrl,
                                  `${student.prefix}${student.firstName} ${student.lastName}`,
                                  `เลขที่ ${roll} • ชั้น ${student.gradeLevel}/${student.room}`
                                );
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden cursor-pointer shrink-0"
                          >
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xs">
                                {student.firstName[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-800">
                              {student.prefix}{student.firstName} {student.lastName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              ชั้น {student.gradeLevel}/{student.room} • {student.nickname ? `(${student.nickname})` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingStudent(student)}
                            className="p-1.5 text-blue-600 bg-blue-50 rounded-lg cursor-pointer"
                            title="ดูประวัติ"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {user.role === 'admin' && (
                            <>
                              <button
                                onClick={() => handleOpenEditStudent(student)}
                                className="p-1.5 text-slate-600 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200"
                                title="แก้ไข"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmTarget({
                                  type: 'student',
                                  id: student.id,
                                  name: `${student.prefix}${student.firstName} ${student.lastName}`
                                })}
                                className="p-1.5 text-rose-600 bg-rose-50 rounded-lg cursor-pointer hover:bg-rose-100"
                                title="ลบข้อมูลนักเรียน"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTAB 2: PERSONNEL */}
      {activeSubTab === 'personnel' && (
        <div className="space-y-4">
          {user.role === 'admin' && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingPersonnel(null);
                  setIsPersonnelModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>เพิ่มบุคลากร</span>
              </button>
            </div>
          )}

          {/* Desktop Personnel Grid */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {personnel.map((person, idx) => (
              <div
                key={person.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {person.personnelType ? (
                        <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200">
                          {person.personnelType}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200">
                          ครู
                        </span>
                      )}
                      {person.department && (
                        <span className="inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-200">
                          ฝ่าย: {person.department}
                        </span>
                      )}
                    </div>
                    <span className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center border border-slate-200 font-mono">
                      {idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => {
                        if (person.avatarUrl) {
                          onOpenLightbox(person.avatarUrl, `${person.prefix}${person.firstName} ${person.lastName}`, person.position);
                        }
                      }}
                      className="w-14 h-16 rounded-xl bg-blue-50 border border-blue-100 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Smile className="w-7 h-7 text-blue-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 truncate">
                        {person.prefix}{person.firstName} {person.lastName}
                      </h4>
                      <p className="text-xs text-blue-600 font-medium truncate mt-0.5">{person.position}</p>
                      {person.advisorGrade && (
                        <p className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-1 inline-block">
                          ที่ปรึกษา: ชั้น {person.advisorGrade}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        {person.degree} ({person.major})
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">วันบรรจุ:</span>
                      <span className="font-medium">{person.employmentDate || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">เกษียณอายุ:</span>
                      <span className="font-semibold text-rose-600">
                        {person.retirementDate || calculateRetirementDate(person.birthDate)}
                      </span>
                    </div>
                    {person.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">เบอร์โทร:</span>
                        <span className="font-medium text-slate-700">{person.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setViewingPersonnel(person)}
                    className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer flex items-center gap-1 text-xs font-semibold px-2.5 transition-colors"
                    title="ดูข้อมูลบุคลากรฉบับเต็ม"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ดูข้อมูล</span>
                  </button>

                  {user.role === 'admin' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingPersonnel(person);
                          setIsPersonnelModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="แก้ไขข้อมูลบุคลากร"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmTarget({
                          type: 'personnel',
                          id: person.id,
                          name: `${person.prefix}${person.firstName} ${person.lastName}`
                        })}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="ลบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Personnel List: Shows ONLY Photo, Name, and Position */}
          <div className="sm:hidden grid grid-cols-1 gap-2.5">
            {personnel.map((person) => (
              <div
                key={person.id}
                className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3"
              >
                <div
                  onClick={() => {
                    if (person.avatarUrl) {
                      onOpenLightbox(person.avatarUrl, `${person.prefix}${person.firstName} ${person.lastName}`, person.position);
                    }
                  }}
                  className="w-12 h-14 rounded-xl bg-blue-50 border border-blue-100 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer"
                >
                  {person.avatarUrl ? (
                    <img src={person.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Smile className="w-6 h-6 text-blue-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-slate-800 truncate">
                    {person.prefix}{person.firstName} {person.lastName}
                  </h4>
                  <p className="text-[11px] text-blue-600 font-medium truncate mt-0.5">
                    {person.position}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: SCHOOL INFO */}
      {activeSubTab === 'school' && (
        <div className="bg-blue-50/80 p-6 rounded-2xl border border-blue-200 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800">ข้อมูลสถานศึกษา</h3>
              <p className="text-xs text-slate-500">จัดการข้อมูลพื้นฐาน ปรัชญา และอัตลักษณ์ของโรงเรียน</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (user.role !== 'admin') {
                onShowToast('warning', 'ไม่มีสิทธิ์', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขข้อมูลโรงเรียนได้');
                return;
              }
              onSaveSchoolInfo(editingSchoolInfo);
              onShowToast('success', 'บันทึกสำเร็จ', 'อัปเดตข้อมูลสถานศึกษาเรียบร้อยแล้ว');
            }}
          >
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
              {user.role === 'admin' ? (
                <>
                  <label className="block text-xs font-bold text-slate-700">
                    1. ตราสัญลักษณ์ / โลโก้โรงเรียน (อัปโหลดรูปภาพจากอุปกรณ์)
                  </label>
                  <div className="flex items-center gap-4 pt-1">
                    <div
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e: any) => {
                          const file = e.target?.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const MAX = 400;
                              let w = img.width;
                              let h = img.height;
                              if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                              else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                              canvas.width = w;
                              canvas.height = h;
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.drawImage(img, 0, 0, w, h);
                                const dataUrl = canvas.toDataURL('image/png');
                                setEditingSchoolInfo(prev => ({ ...prev, logoUrl: dataUrl }));
                                onShowToast('success', 'อัปโหลดสำเร็จ', 'อัปโหลดตราสัญลักษณ์โรงเรียนเรียบร้อยแล้ว');
                              }
                            };
                            img.src = ev.target?.result as string;
                          };
                          reader.readAsDataURL(file);
                        };
                        input.click();
                      }}
                      className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 flex items-center justify-center cursor-pointer overflow-hidden shrink-0 shadow-2xs group relative"
                      title="คลิกเพื่อเลือกไฟล์ตราสัญลักษณ์โรงเรียน"
                    >
                      {editingSchoolInfo.logoUrl ? (
                        <>
                          <img src={editingSchoolInfo.logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                            เปลี่ยนรูป
                          </div>
                        </>
                      ) : (
                        <Upload className="w-5 h-5 text-blue-500" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e: any) => {
                              const file = e.target?.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const MAX = 400;
                                  let w = img.width;
                                  let h = img.height;
                                  if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                                  else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                                  canvas.width = w;
                                  canvas.height = h;
                                  const ctx = canvas.getContext('2d');
                                  if (ctx) {
                                    ctx.drawImage(img, 0, 0, w, h);
                                    const dataUrl = canvas.toDataURL('image/png');
                                    setEditingSchoolInfo(prev => ({ ...prev, logoUrl: dataUrl }));
                                    onShowToast('success', 'อัปโหลดสำเร็จ', 'อัปโหลดตราสัญลักษณ์โรงเรียนเรียบร้อยแล้ว');
                                  }
                                };
                                img.src = ev.target?.result as string;
                              };
                              reader.readAsDataURL(file);
                            };
                            input.click();
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                        >
                          เลือกไฟล์ตราสัญลักษณ์
                        </button>
                        {editingSchoolInfo.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setEditingSchoolInfo(prev => ({ ...prev, logoUrl: '' }))}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                          >
                            ลบรูป
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        รองรับไฟล์ JPG, PNG, WebP (ระบบจะปรับขนาดภาพให้อัตโนมัติ)
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                /* Member View: Shows ONLY the logo itself, no text label, non-interactive */
                <div className="flex items-center justify-center p-2">
                  {editingSchoolInfo.logoUrl ? (
                    <img
                      src={editingSchoolInfo.logoUrl}
                      alt="ตราสัญลักษณ์โรงเรียน"
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-semibold">
                      ไม่มีโลโก้
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อสถานศึกษา / ชื่อโรงเรียน (School Name) *
                </label>
                <input
                  type="text"
                  disabled={user.role !== 'admin'}
                  value={editingSchoolInfo.schoolName}
                  onChange={(e) => setEditingSchoolInfo({ ...editingSchoolInfo, schoolName: e.target.value })}
                  placeholder="เช่น บ้านนาออก"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 font-semibold"
                />

              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้อำนวยการ / ผู้บริหารสถานศึกษา
                </label>
                <input
                  type="text"
                  disabled={user.role !== 'admin'}
                  value={editingSchoolInfo.directorName}
                  onChange={(e) => setEditingSchoolInfo({ ...editingSchoolInfo, directorName: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สังกัด / สำนักงานเขตพื้นที่การศึกษา
                </label>
                <input
                  type="text"
                  disabled={user.role !== 'admin'}
                  value={editingSchoolInfo.affiliation}
                  onChange={(e) => setEditingSchoolInfo({ ...editingSchoolInfo, affiliation: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วิสัยทัศน์ / ปรัชญา (Vision)
                </label>
                <input
                  type="text"
                  disabled={user.role !== 'admin'}
                  value={editingSchoolInfo.vision}
                  onChange={(e) => setEditingSchoolInfo({ ...editingSchoolInfo, vision: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ประวัติความเป็นมาโดยย่อ (History)
              </label>
              <textarea
                rows={3}
                disabled={user.role !== 'admin'}
                value={editingSchoolInfo.history}
                onChange={(e) => setEditingSchoolInfo({ ...editingSchoolInfo, history: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ที่ตั้งสถานศึกษา
              </label>
              <input
                type="text"
                disabled={user.role !== 'admin'}
                value={editingSchoolInfo.address}
                onChange={(e) => setEditingSchoolInfo({ ...editingSchoolInfo, address: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์สถานศึกษา / ช่องทางติดต่อ
                </label>
                <input
                  type="text"
                  disabled={user.role !== 'admin'}
                  value={editingSchoolInfo.phone || ''}
                  onChange={(e) => setEditingSchoolInfo({ ...editingSchoolInfo, phone: e.target.value })}
                  placeholder="เช่น 075-123456 หรือ 081-2345678"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  เบอร์นี้จะแสดงบนหลังบัตรนักเรียนและเอกสารทางการของโรงเรียน
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อีเมลสถานศึกษา / เว็บไซต์ติดต่อ
                </label>
                <input
                  type="text"
                  disabled={user.role !== 'admin'}
                  value={editingSchoolInfo.email || ''}
                  onChange={(e) => setEditingSchoolInfo({ ...editingSchoolInfo, email: e.target.value })}
                  placeholder="เช่น school@example.ac.th"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Dynamic Custom Fields */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">
                  3. ฟิลด์ข้อมูลเพิ่มเติมแบบไดนามิก (Custom Fields)
                </h4>
              </div>

              <div className="space-y-2">
                {(editingSchoolInfo.customFields || []).map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-40 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-2 rounded-xl shrink-0 truncate">
                      3.{idx + 1} {field.label}
                    </span>
                    <input
                      type="text"
                      disabled={user.role !== 'admin'}
                      value={field.value}
                      onChange={(e) => {
                        const updated = [...(editingSchoolInfo.customFields || [])];
                        updated[idx].value = e.target.value;
                        setEditingSchoolInfo({ ...editingSchoolInfo, customFields: updated });
                      }}
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                    {user.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="ลบฟิลด์นี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {user.role === 'admin' && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="ชื่อหัวข้อ เช่น สีประจำโรงเรียน, ปรัชญา"
                    value={newCustomFieldKey}
                    onChange={(e) => setNewCustomFieldKey(e.target.value)}
                    className="w-44 text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="ข้อมูล/คำอธิบาย"
                    value={newCustomFieldValue}
                    onChange={(e) => setNewCustomFieldValue(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                  >
                    + เพิ่มฟิลด์
                  </button>
                </div>
              )}
            </div>

            {user.role === 'admin' && (
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการเปลี่ยนแปลงข้อมูลโรงเรียน</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* MODAL: View Full Student Profile */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    ข้อมูลประวัตินักเรียนและครอบครัวฉบับสมบูรณ์
                  </h3>
                  <p className="text-xs text-slate-500">
                    {viewingStudent.studentCode ? `รหัสประจำตัว: ${viewingStudent.studentCode} • ` : ''}ชั้น {viewingStudent.gradeLevel}/{viewingStudent.room || '1'}
                    {viewingStudent.rollNumber ? ` • เลขที่ ${viewingStudent.rollNumber}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Card 1: Student Personal Info & Address */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div
                  onClick={() => {
                    if (viewingStudent.photoUrl) {
                      onOpenLightbox(
                        viewingStudent.photoUrl,
                        `${viewingStudent.prefix}${viewingStudent.firstName} ${viewingStudent.lastName}`,
                        `ชั้น ${viewingStudent.gradeLevel}/${viewingStudent.room || '1'}`
                      );
                    }
                  }}
                  className="w-24 h-28 rounded-xl bg-slate-200 overflow-hidden border border-slate-300 shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all flex items-center justify-center shadow-2xs"
                >
                  {viewingStudent.photoUrl ? (
                    <img src={viewingStudent.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-400">{viewingStudent.firstName[0]}</span>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-center sm:text-left w-full">
                  <h4 className="text-base font-bold text-slate-800">
                    {viewingStudent.prefix}{viewingStudent.firstName} {viewingStudent.lastName}
                    {viewingStudent.nickname && <span className="text-blue-600 font-semibold ml-2">({viewingStudent.nickname})</span>}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-xs text-slate-600 pt-1">
                    <div>วันเกิด: <strong className="text-slate-800">{viewingStudent.birthDate ? formatIsoToThaiDisplay(viewingStudent.birthDate, 'full') : '-'}</strong></div>
                    <div>อายุ: <strong className="text-slate-800">{viewingStudent.age ? `${viewingStudent.age} ปี` : '-'}</strong></div>
                    <div>ศาสนา: <strong className="text-slate-800">{viewingStudent.religion || 'พุทธ'}</strong></div>
                    <div>เลขที่: <strong className="text-slate-800">{viewingStudent.rollNumber ?? '-'}</strong></div>
                    <div>โรคประจำตัว: <strong className="text-rose-600">{viewingStudent.chronicDisease || 'ไม่มี'}</strong></div>
                    <div>เงินมา ร.ร.: <strong className="text-emerald-700">{viewingStudent.dailyAllowance ?? 0} บาท/วัน</strong></div>
                  </div>
                  <div className="text-xs text-slate-600 pt-1.5 border-t border-slate-200/80">
                    <span className="text-slate-500 font-medium">ที่อยู่ปัจจุบัน: </span>
                    <strong className="text-slate-800">{viewingStudent.address || 'ไม่ได้ระบุ'}</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Father & Mother Info */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>ข้อมูลบิดา - มารดา</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Father */}
                  <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900">ข้อมูลบิดา:</span>
                      <div className="flex gap-1">
                        {viewingStudent.fatherDeceased && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700 font-bold">เสียชีวิต</span>
                        )}
                        {viewingStudent.fatherMissing && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">สาบสูญ</span>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-800 font-medium">
                      {(viewingStudent.fatherPrefix || 'นาย') + ' ' + (viewingStudent.fatherName || '-')}
                    </p>
                    <p className="text-slate-600 text-[11px]">อายุ: {viewingStudent.fatherAge ? `${viewingStudent.fatherAge} ปี` : '-'}</p>
                    <p className="text-slate-600 text-[11px]">อาชีพ: {viewingStudent.fatherOccupation || '-'}</p>
                    <p className="text-slate-600 text-[11px]">รายได้: {viewingStudent.fatherIncome ? `${viewingStudent.fatherIncome.toLocaleString()} บาท/เดือน` : '-'}</p>
                    <p className="text-slate-600 text-[11px]">การศึกษาสูงสุด: {viewingStudent.fatherEducation || '-'}</p>
                    <p className="text-blue-700 font-medium text-[11px]">เบอร์โทร: {viewingStudent.fatherPhone || '-'}</p>
                  </div>

                  {/* Mother */}
                  <div className="p-3 bg-pink-50/40 rounded-xl border border-pink-100/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-pink-900">ข้อมูลมารดา:</span>
                      <div className="flex gap-1">
                        {viewingStudent.motherDeceased && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700 font-bold">เสียชีวิต</span>
                        )}
                        {viewingStudent.motherMissing && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">สาบสูญ</span>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-800 font-medium">
                      {(viewingStudent.motherPrefix || 'นาง') + ' ' + (viewingStudent.motherName || '-')}
                    </p>
                    <p className="text-slate-600 text-[11px]">อายุ: {viewingStudent.motherAge ? `${viewingStudent.motherAge} ปี` : '-'}</p>
                    <p className="text-slate-600 text-[11px]">อาชีพ: {viewingStudent.motherOccupation || '-'}</p>
                    <p className="text-slate-600 text-[11px]">รายได้: {viewingStudent.motherIncome ? `${viewingStudent.motherIncome.toLocaleString()} บาท/เดือน` : '-'}</p>
                    <p className="text-slate-600 text-[11px]">การศึกษาสูงสุด: {viewingStudent.motherEducation || '-'}</p>
                    <p className="text-pink-700 font-medium text-[11px]">เบอร์โทร: {viewingStudent.motherPhone || '-'}</p>
                  </div>
                </div>

                {/* Parents Marital Status */}
                <div className="p-2.5 bg-slate-50 rounded-xl text-xs flex items-center justify-between flex-wrap gap-2">
                  <span className="text-slate-600 font-medium">สถานภาพของบิดา-มารดา:</span>
                  <span className="font-bold text-slate-800">
                    {viewingStudent.parentsMaritalStatus || 'อยู่ด้วยกัน'}
                    {viewingStudent.parentsMaritalStatus === 'อื่นๆ' && viewingStudent.parentsMaritalStatusOther ? ` (${viewingStudent.parentsMaritalStatusOther})` : ''}
                  </span>
                </div>
              </div>

              {/* Card 3: Guardian Info */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <Home className="w-3.5 h-3.5 text-indigo-500" />
                  <span>ข้อมูลผู้ปกครอง</span>
                </h5>
                <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/70 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-bold text-indigo-900">
                      ผู้ปกครอง: {(viewingStudent.guardianPrefix || '') + ' ' + (viewingStudent.guardianName || '-')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-semibold">
                      ความสัมพันธ์: {viewingStudent.guardianRelation || 'บิดา'}
                      {viewingStudent.guardianRelation === 'อื่นๆ' && viewingStudent.guardianRelationOther ? ` (${viewingStudent.guardianRelationOther})` : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-600 text-[11px]">
                    <div>อายุ: <strong className="text-slate-800">{viewingStudent.guardianAge ? `${viewingStudent.guardianAge} ปี` : '-'}</strong></div>
                    <div>อาชีพ: <strong className="text-slate-800">{viewingStudent.guardianOccupation || '-'}</strong></div>
                    <div>รายได้: <strong className="text-slate-800">{viewingStudent.guardianIncome ? `${viewingStudent.guardianIncome.toLocaleString()} บ./ด.` : '-'}</strong></div>
                    <div>การศึกษา: <strong className="text-slate-800">{viewingStudent.guardianEducation || '-'}</strong></div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-indigo-100/60 text-[11px]">
                    <div>เบอร์โทรศัพท์: <strong className="text-indigo-700">{viewingStudent.guardianPhone || '-'}</strong></div>
                    <div>ที่อยู่ปัจจุบันผู้ปกครอง: <strong className="text-slate-800">{viewingStudent.guardianAddress || viewingStudent.address || '-'}</strong></div>
                  </div>
                </div>
              </div>

              {/* Card 4: Siblings Info */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  <span>ข้อมูลพี่น้องร่วมสายโลหิต</span>
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-center">
                    <span className="text-slate-500 text-[11px] block">ลำดับบุตร</span>
                    <strong className="text-slate-800 text-sm">
                      {viewingStudent.isOnlyChild ? 'บุตรคนเดียว' : `บุตรคนที่ ${viewingStudent.birthOrder || 1}`}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl text-center">
                    <span className="text-slate-500 text-[11px] block">พี่น้องทั้งหมด</span>
                    <strong className="text-slate-800 text-sm">{viewingStudent.totalSiblings || 1} คน</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl text-center">
                    <span className="text-slate-500 text-[11px] block">พี่ชาย/น้องชาย</span>
                    <strong className="text-slate-800 text-sm">{viewingStudent.brothersCount ?? 0} คน</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl text-center">
                    <span className="text-slate-500 text-[11px] block">พี่สาว/น้องสาว</span>
                    <strong className="text-slate-800 text-sm">{viewingStudent.sistersCount ?? 0} คน</strong>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2 bg-slate-50 rounded-xl text-slate-600 text-[11px]">
                    พี่ต่างบิดา-มารดา: <strong className="text-slate-800">{viewingStudent.hasOlderHalfSiblings ? `${viewingStudent.olderHalfSiblingsCount || 0} คน` : 'ไม่มี'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl text-slate-600 text-[11px]">
                    น้องต่างบิดา-มารดา: <strong className="text-slate-800">{viewingStudent.hasYoungerHalfSiblings ? `${viewingStudent.youngerHalfSiblingsCount || 0} คน` : 'ไม่มี'}</strong>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-800 text-[11px] font-medium border border-emerald-100">
                    พี่น้องกำลังศึกษาอยู่: <strong>{viewingStudent.studyingSiblingsCount ?? 1} คน</strong>
                  </div>
                </div>
              </div>

              {/* Card 5: Housing & Travel */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>สถานะที่อยู่อาศัยและการเดินทางมาโรงเรียน</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">สถานะที่อยู่อาศัย:</span>
                      <strong className="text-slate-800">
                        {viewingStudent.housingStatus || 'บ้านตัวเอง'}
                        {viewingStudent.housingStatus === 'เช่า' && viewingStudent.rentAmount ? ` (${viewingStudent.rentAmount.toLocaleString()} บ./ด.)` : ''}
                        {viewingStudent.housingStatus === 'อื่นๆ' && viewingStudent.housingStatusOther ? ` (${viewingStudent.housingStatusOther})` : ''}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">พักอาศัยอยู่กับ:</span>
                      <strong className="text-slate-800">
                        {viewingStudent.livingWith || 'บิดามารดา'}
                        {viewingStudent.livingWith === 'อื่นๆ' && viewingStudent.livingWithOther ? ` (${viewingStudent.livingWithOther})` : ''}
                      </strong>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">การเดินทาง:</span>
                      <strong className="text-slate-800">
                        {viewingStudent.travelMethod || 'เดิน'}
                        {viewingStudent.travelMethod === 'อื่นๆ' && viewingStudent.travelMethodOther ? ` (${viewingStudent.travelMethodOther})` : ''}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ระยะทาง/เวลา:</span>
                      <strong className="text-slate-800">
                        {viewingStudent.distanceToSchool || '-'} • {viewingStudent.travelTimeToSchool || '-'}
                      </strong>
                    </div>
                  </div>
                </div>

                {viewingStudent.householdBurden && viewingStudent.householdBurden.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 text-[11px] block mb-1 font-medium">ภาระพึ่งพิงของครัวเรือน:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingStudent.householdBurden.map(b => (
                        <span key={b} className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              {user.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget({
                    type: 'student',
                    id: viewingStudent.id,
                    name: `${viewingStudent.prefix}${viewingStudent.firstName} ${viewingStudent.lastName}`
                  })}
                  className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบข้อมูลนักเรียนนี้</span>
                </button>
              ) : <div />}
              <button
                onClick={() => setViewingStudent(null)}
                className="px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Batch Grade Promotion / Adjust Student Grade Level */}
      {isGradePromotionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span>แก้ไขและปรับระดับชั้นเรียน (เลื่อนชั้นเรียน)</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold font-mono">
                      ชั้น {selectedGrade}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    เลือกรายชื่อนักเรียนที่ต้องการปรับระดับชั้นขึ้นปีถัดไป ข้อมูลนักเรียนจะกลายเป็นระดับชั้นใหม่ทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGradePromotionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {/* Target Grade Selection Card */}
            <div className="p-3.5 bg-linear-to-r from-amber-50/80 to-orange-50/80 rounded-xl border border-amber-200 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500">ระดับชั้นเดิม</span>
                    <span className="inline-block px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs">
                      {selectedGrade !== 'all' && selectedGrade !== 'ประถม' && selectedGrade !== 'มัธยม' ? selectedGrade : 'ทุกระดับชั้น'}
                    </span>
                  </div>

                  <ArrowRightLeft className="w-4 h-4 text-amber-600 mt-3" />

                  <div>
                    <span className="block text-[11px] font-semibold text-slate-700">ปรับเป็นระดับชั้นใหม่ *</span>
                    <select
                      value={targetPromotionGrade}
                      onChange={(e) => setTargetPromotionGrade(e.target.value)}
                      className="text-xs font-bold px-3 py-1 bg-white border-2 border-amber-400 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                    >
                      {PROMOTION_GRADE_TARGETS.map(g => (
                        <option key={g} value={g}>
                          {g === 'จบการศึกษา' ? '🎓 จบการศึกษา' : `ชั้น ${g}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-3 py-1 rounded-full inline-block">
                    เลือกแล้ว {selectedStudentIdsForPromotion.length} / {sortedStudents.length} คน
                  </span>
                </div>
              </div>
            </div>

            {/* Search & Bulk Select Controls */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ หรือรหัสนักเรียน..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const filteredInModal = sortedStudents.filter(s =>
                      (s.firstName || '').toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                      (s.lastName || '').toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                      (s.studentCode || '').toLowerCase().includes(modalSearchQuery.toLowerCase())
                    );
                    setSelectedStudentIdsForPromotion(filteredInModal.map(s => s.id));
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIdsForPromotion([])}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  ล้างการเลือก
                </button>
              </div>
            </div>

            {/* Students List in Modal */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[46vh]">
              {sortedStudents
                .filter(s =>
                  (s.firstName || '').toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                  (s.lastName || '').toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                  (s.studentCode || '').toLowerCase().includes(modalSearchQuery.toLowerCase())
                )
                .map((student, idx) => {
                  const isChecked = selectedStudentIdsForPromotion.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => handleToggleStudentForPromotion(student.id)}
                      className={`p-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                        isChecked ? 'bg-amber-50/70 hover:bg-amber-100/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer pointer-events-none"
                        />
                        <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                          {idx + 1}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-slate-400">{student.firstName[0]}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {student.studentCode && (
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-semibold">
                                #{student.studentCode}
                              </span>
                            )}
                            <span className="font-bold text-xs text-slate-800">
                              {student.prefix}{student.firstName} {student.lastName}
                            </span>
                            {student.nickname && (
                              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                                {student.nickname}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            ระดับชั้นปัจจุบัน: {student.gradeLevel}/{student.room || '1'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isChecked ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ปรับเป็น {targetPromotionGrade}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            ไม่ปรับ
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <span className="text-xs text-slate-500">
                เลือกแล้ว <strong className="text-slate-800">{selectedStudentIdsForPromotion.length}</strong> คน
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGradePromotionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={selectedStudentIdsForPromotion.length === 0}
                  onClick={handleConfirmPromotion}
                  className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                    selectedStudentIdsForPromotion.length === 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ยืนยันปรับระดับชั้น ({selectedStudentIdsForPromotion.length} คน)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Full Personnel Profile */}
      {viewingPersonnel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Smile className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    ข้อมูลประวัติบุคลากรฉบับสมบูรณ์
                  </h3>
                  <p className="text-xs text-slate-500">
                    {viewingPersonnel.position} • ฝ่าย {viewingPersonnel.department || 'ทั่วไป'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingPersonnel(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div
                  onClick={() => {
                    if (viewingPersonnel.avatarUrl) {
                      onOpenLightbox(viewingPersonnel.avatarUrl, `${viewingPersonnel.prefix}${viewingPersonnel.firstName} ${viewingPersonnel.lastName}`, viewingPersonnel.position);
                    }
                  }}
                  className="w-24 h-28 rounded-xl bg-slate-200 overflow-hidden border border-slate-300 shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all flex items-center justify-center shadow-2xs"
                >
                  {viewingPersonnel.avatarUrl ? (
                    <img src={viewingPersonnel.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Smile className="w-10 h-10 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-center sm:text-left w-full">
                  <h4 className="text-base font-bold text-slate-800">
                    {viewingPersonnel.prefix}{viewingPersonnel.firstName} {viewingPersonnel.lastName}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600 pt-1">
                    <div>ประเภทบุคลากร: <strong className="text-slate-800">{viewingPersonnel.personnelType || 'ครู'}</strong></div>
                    <div>ฝ่าย / กลุ่มงาน: <strong className="text-slate-800">{viewingPersonnel.department || '-'}</strong></div>
                    <div>ตำแหน่ง: <strong className="text-blue-600">{viewingPersonnel.position || '-'}</strong></div>
                    <div>ครูที่ปรึกษา: <strong className="text-emerald-700">{viewingPersonnel.advisorGrade ? `ชั้น ${viewingPersonnel.advisorGrade}` : 'ไม่มี'}</strong></div>
                    <div>วันเดือนปีเกิด: <strong className="text-slate-800">{viewingPersonnel.birthDate ? formatIsoToThaiDisplay(viewingPersonnel.birthDate, 'full') : '-'}</strong></div>
                    <div>วันเริ่มบรรจุ: <strong className="text-slate-800">{viewingPersonnel.employmentDate ? formatIsoToThaiDisplay(viewingPersonnel.employmentDate, 'full') : '-'}</strong></div>
                    <div>เกษียณอายุ: <strong className="text-rose-600">{viewingPersonnel.retirementDate || calculateRetirementDate(viewingPersonnel.birthDate)}</strong></div>
                    <div>วุฒิการศึกษา: <strong className="text-slate-800">{viewingPersonnel.degree || '-'}</strong></div>
                    <div>วิชาเอก: <strong className="text-slate-800">{viewingPersonnel.major || '-'}</strong></div>
                    <div>เบอร์โทรศัพท์: <strong className="text-blue-700">{viewingPersonnel.phone || '-'}</strong></div>
                    <div>อีเมล: <strong className="text-slate-800">{viewingPersonnel.email || '-'}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingPersonnel(null)}
                className="px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmation for Deletion */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {deleteConfirmTarget.type === 'student' ? 'ยืนยันการลบข้อมูลนักเรียน' : 'ยืนยันการลบข้อมูลบุคลากร'}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูล <strong className="text-slate-900 font-bold">{deleteConfirmTarget.name}</strong> ออกจากระบบอย่างถาวร?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmTarget.type === 'student') {
                    onDeleteStudent(deleteConfirmTarget.id);
                    if (viewingStudent?.id === deleteConfirmTarget.id) {
                      setViewingStudent(null);
                    }
                    onShowToast('success', 'ลบข้อมูลสำเร็จ', `ลบข้อมูลนักเรียน ${deleteConfirmTarget.name} เรียบร้อยแล้ว`);
                  } else {
                    onDeletePersonnel(deleteConfirmTarget.id);
                    if (editingPersonnel?.id === deleteConfirmTarget.id) {
                      setEditingPersonnel(null);
                    }
                    onShowToast('success', 'ลบข้อมูลสำเร็จ', `ลบข้อมูลบุคลากร ${deleteConfirmTarget.name} เรียบร้อยแล้ว`);
                  }
                  setDeleteConfirmTarget(null);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                ยืนยันลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add/Edit Complete Student */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white z-20">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingStudent ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียนใหม่'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    กรอกข้อมูลนักเรียนและประวัติครอบครัวฉบับสมบูรณ์ (แบ่ง 6 หมวดหมู่อย่างเป็นระเบียบ)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudentSubmit} className="space-y-5">
              {/* Photo Upload Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-center gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-24 rounded-xl bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 overflow-hidden flex items-center justify-center cursor-pointer transition-all shrink-0 group relative shadow-2xs"
                  title="คลิกเพื่อเลือกไฟล์รูปภาพ"
                >
                  {studentFormData.photoUrl ? (
                    <>
                      <img
                        src={studentFormData.photoUrl}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                        เปลี่ยนรูป
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Upload className="w-6 h-6 text-blue-500 mb-1" />
                      <span className="text-[10px] font-semibold text-slate-600">อัปโหลดรูป</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{studentFormData.photoUrl ? 'เปลี่ยนไฟล์รูปภาพ' : 'เลือกไฟล์รูปภาพจากอุปกรณ์'}</span>
                    </button>
                    {studentFormData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setStudentFormData(prev => ({ ...prev, photoUrl: '' }))}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                      >
                        ลบรูป
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    รองรับไฟล์ JPG, PNG, WebP (ระบบจะบีบอัดและปรับขนาดรูปภาพให้อัตโนมัติ ไม่ต้องกรอกลิงก์ URL)
                  </p>
                </div>
              </div>

              {/* SECTION 1: Personal & Current Address */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">1</span>
                  <h4 className="text-xs font-bold text-slate-800">ข้อมูลส่วนตัวและที่อยู่ปัจจุบันของนักเรียน</h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">คำนำหน้า *</label>
                    <select
                      value={studentFormData.prefix}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, prefix: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="เด็กชาย">เด็กชาย</option>
                      <option value="เด็กหญิง">เด็กหญิง</option>
                      <option value="นาย">นาย</option>
                      <option value="นางสาว">นางสาว</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อจริง *</label>
                    <input
                      type="text"
                      required
                      value={studentFormData.firstName}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="เช่น กิตติพงษ์"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">นามสกุล *</label>
                    <input
                      type="text"
                      required
                      value={studentFormData.lastName}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="เช่น เจริญสุข"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">ชื่อเล่นนักเรียน</label>
                    <input
                      type="text"
                      value={studentFormData.nickname || ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, nickname: e.target.value }))}
                      placeholder="เช่น น้องกิต, ก้อง"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/30 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เลขที่</label>
                    <input
                      type="number"
                      min="1"
                      value={studentFormData.rollNumber ?? ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, rollNumber: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสประจำตัวนักเรียน</label>
                    <input
                      type="text"
                      value={studentFormData.studentCode}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, studentCode: e.target.value }))}
                      placeholder="เช่น 10537"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ระดับชั้น *</label>
                    <select
                      value={studentFormData.gradeLevel}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, gradeLevel: e.target.value as GradeLevel }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      {gradeOptions.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ห้อง</label>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        {['1', '2', '3'].map(rm => (
                          <button
                            key={rm}
                            type="button"
                            onClick={() => setStudentFormData(prev => ({ ...prev, room: rm }))}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              normalizeRoom(studentFormData.room) === rm
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            ห้อง {rm}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={studentFormData.room}
                        onChange={(e) => setStudentFormData(prev => ({ ...prev, room: e.target.value }))}
                        placeholder="ระบุเลขห้อง เช่น 1, 2, 3"
                        className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">วันเกิด (พ.ศ.)</label>
                    <ThaiDatePicker
                      value={studentFormData.birthDate || ''}
                      onChange={(val) => {
                        let newAge = studentFormData.age;
                        if (val) {
                          const birthYear = parseInt(val.split('-')[0], 10);
                          const thisYear = new Date().getFullYear();
                          if (!isNaN(birthYear)) {
                            newAge = Math.max(1, thisYear - birthYear);
                          }
                        }
                        setStudentFormData(prev => ({ ...prev, birthDate: val, age: newAge }));
                      }}
                      placeholder="เลือกวันเกิด (พ.ศ.)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">อายุ (ปี)</label>
                    <input
                      type="number"
                      min="1"
                      max="25"
                      value={studentFormData.age ?? ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, age: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  {/* Field 1: Religion */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">1) ศาสนา</label>
                    <select
                      value={studentFormData.religion || 'พุทธ'}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, religion: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                    >
                      {RELIGION_OPTIONS.map(rel => (
                        <option key={rel} value={rel}>{rel}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เงินค่าขนมมา ร.ร. (บาท/วัน)</label>
                    <input
                      type="number"
                      min="0"
                      value={studentFormData.dailyAllowance ?? 0}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, dailyAllowance: Number(e.target.value) }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-bold text-emerald-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">โรคประจำตัว</label>
                    <input
                      type="text"
                      value={studentFormData.chronicDisease}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, chronicDisease: e.target.value }))}
                      placeholder="เช่น ไม่มี หรือ ภูมิแพ้, โรคหอบหืด"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  {/* Field 2: Current Address */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>2) ที่อยู่ปัจจุบันของนักเรียน</span>
                      <span className="text-[10px] text-slate-400 font-normal">บ้านเลขที่, หมู่, ถนน/ซอย, ตำบล, อำเภอ, จังหวัด</span>
                    </label>
                    <textarea
                      rows={2}
                      value={studentFormData.address || ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="ระบุที่อยู่ปัจจุบันของนักเรียน เช่น 123/45 หมู่ 2 ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Father & Mother Information */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">2</span>
                  <h4 className="text-xs font-bold text-slate-800">
                    ข้อมูลบิดา - มารดา (คำนำหน้า, ชื่อ-สกุล, อาชีพ, รายได้, อายุ, โทรศัพท์, เสียชีวิต/สาบสูญ, การศึกษาสูงสุด)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* FATHER CARD */}
                  <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100/90 space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-100/70 pb-2">
                      <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        ข้อมูลบิดา
                      </span>
                      {/* Field 7: Checkbox Deceased / Missing */}
                      <div className="flex items-center gap-3 text-xs">
                        <label className="flex items-center gap-1 cursor-pointer text-rose-700 font-medium">
                          <input
                            type="checkbox"
                            checked={Boolean(studentFormData.fatherDeceased)}
                            onChange={(e) => setStudentFormData(prev => ({ ...prev, fatherDeceased: e.target.checked }))}
                            className="rounded text-rose-600 focus:ring-rose-500"
                          />
                          <span>เสียชีวิต</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-amber-700 font-medium">
                          <input
                            type="checkbox"
                            checked={Boolean(studentFormData.fatherMissing)}
                            onChange={(e) => setStudentFormData(prev => ({ ...prev, fatherMissing: e.target.checked }))}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span>สาบสูญ</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        {/* Field 3: Prefix Father */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">คำนำหน้า</label>
                        <select
                          value={studentFormData.fatherPrefix || 'นาย'}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, fatherPrefix: e.target.value }))}
                          className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                        >
                          <option value="นาย">นาย</option>
                          <option value="ว่าที่ร้อยตรี">ว่าที่ ร.ต.</option>
                          <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        {/* Field 3: Name Father */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">ชื่อ - สกุล บิดา</label>
                        <input
                          type="text"
                          value={studentFormData.fatherName || ''}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, fatherName: e.target.value }))}
                          placeholder="ชื่อและนามสกุลบิดา"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        {/* Field 6: Age Father */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">อายุ (ปี)</label>
                        <input
                          type="number"
                          min="15"
                          max="100"
                          value={studentFormData.fatherAge ?? ''}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, fatherAge: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="เช่น 42"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                      <div>
                        {/* Field 4: Occupation Father */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">อาชีพ</label>
                        <input
                          type="text"
                          value={studentFormData.fatherOccupation || ''}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, fatherOccupation: e.target.value }))}
                          placeholder="เช่น เกษตรกร, ค้าขาย"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                      <div>
                        {/* Field 5: Income Father */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">รายได้ (บ./ด.)</label>
                        <input
                          type="number"
                          min="0"
                          value={studentFormData.fatherIncome ?? ''}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, fatherIncome: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="เช่น 15000"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        {/* Field 8: Education Father */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">การศึกษาสูงสุดบิดา</label>
                        <select
                          value={studentFormData.fatherEducation || 'มัธยมศึกษาตอนปลาย / ปวช.'}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, fatherEducation: e.target.value }))}
                          className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                        >
                          {EDUCATION_LEVEL_OPTIONS.map(edu => (
                            <option key={edu} value={edu}>{edu}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        {/* Field 7: Phone Father */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์บิดา</label>
                        <input
                          type="tel"
                          value={studentFormData.fatherPhone || ''}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, fatherPhone: e.target.value }))}
                          placeholder="เช่น 081-234-5678"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* MOTHER CARD */}
                  <div className="p-3.5 bg-pink-50/40 rounded-xl border border-pink-100/90 space-y-3">
                    <div className="flex items-center justify-between border-b border-pink-100/70 pb-2">
                      <span className="font-bold text-xs text-pink-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-pink-600" />
                        ข้อมูลมารดา
                      </span>
                      {/* Field 7: Checkbox Deceased / Missing */}
                      <div className="flex items-center gap-3 text-xs">
                        <label className="flex items-center gap-1 cursor-pointer text-rose-700 font-medium">
                          <input
                            type="checkbox"
                            checked={Boolean(studentFormData.motherDeceased)}
                            onChange={(e) => setStudentFormData(prev => ({ ...prev, motherDeceased: e.target.checked }))}
                            className="rounded text-rose-600 focus:ring-rose-500"
                          />
                          <span>เสียชีวิต</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-amber-700 font-medium">
                          <input
                            type="checkbox"
                            checked={Boolean(studentFormData.motherMissing)}
                            onChange={(e) => setStudentFormData(prev => ({ ...prev, motherMissing: e.target.checked }))}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span>สาบสูญ</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        {/* Field 3: Prefix Mother */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">คำนำหน้า</label>
                        <select
                          value={studentFormData.motherPrefix || 'นาง'}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, motherPrefix: e.target.value }))}
                          className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                        >
                          <option value="นาง">นาง</option>
                          <option value="นางสาว">นางสาว</option>
                          <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        {/* Field 3: Name Mother */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">ชื่อ - สกุล มารดา</label>
                        <input
                          type="text"
                          value={studentFormData.motherName || ''}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, motherName: e.target.value }))}
                          placeholder="ชื่อและนามสกุลมารดา"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        {/* Field 6: Age Mother */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">อายุ (ปี)</label>
                        <input
                          type="number"
                          min="15"
                          max="100"
                          value={studentFormData.motherAge ?? ''}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, motherAge: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="เช่น 39"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                      <div>
                        {/* Field 4: Occupation Mother */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">อาชีพ</label>
                        <input
                          type="text"
                          value={studentFormData.motherOccupation || ''}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, motherOccupation: e.target.value }))}
                          placeholder="เช่น รับจ้าง, ค้าขาย"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                      <div>
                        {/* Field 5: Income Mother */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">รายได้ (บ./ด.)</label>
                        <input
                          type="number"
                          min="0"
                          value={studentFormData.motherIncome ?? ''}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, motherIncome: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="เช่น 12000"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        {/* Field 8: Education Mother */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">การศึกษาสูงสุดมารดา</label>
                        <select
                          value={studentFormData.motherEducation || 'มัธยมศึกษาตอนปลาย / ปวช.'}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, motherEducation: e.target.value }))}
                          className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                        >
                          {EDUCATION_LEVEL_OPTIONS.map(edu => (
                            <option key={edu} value={edu}>{edu}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        {/* Field 7: Phone Mother */}
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์มารดา</label>
                        <input
                          type="tel"
                          value={studentFormData.motherPhone || ''}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, motherPhone: e.target.value }))}
                          placeholder="เช่น 089-876-5432"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Parents Marital Status */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">3</span>
                  <h4 className="text-xs font-bold text-slate-800">
                    3) สถานภาพของบิดา-มารดา
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกสถานภาพของพ่อแม่</label>
                    <select
                      value={studentFormData.parentsMaritalStatus || 'อยู่ด้วยกัน'}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, parentsMaritalStatus: e.target.value as any }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                    >
                      {PARENTS_MARITAL_STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {studentFormData.parentsMaritalStatus === 'อื่นๆ' && (
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">ระบุสถานภาพอื่นๆ</label>
                      <input
                        type="text"
                        value={studentFormData.parentsMaritalStatusOther || ''}
                        onChange={(e) => setStudentFormData(prev => ({ ...prev, parentsMaritalStatusOther: e.target.value }))}
                        placeholder="โปรดระบุสถานภาพบิดามารดา"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/20"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: Guardian Information */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">4</span>
                    <h4 className="text-xs font-bold text-slate-800">
                      4) ข้อมูลผู้ปกครอง (สามารถดึงข้อมูลจากพ่อหรือแม่ หรือกรอกใหม่ได้)
                    </h4>
                  </div>
                  {/* Quick Copy Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyFatherToGuardian}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 cursor-pointer shadow-2xs transition-colors"
                    >
                      คัดลอกจากบิดา
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyMotherToGuardian}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg border border-pink-200 cursor-pointer shadow-2xs transition-colors"
                    >
                      คัดลอกจากมารดา
                    </button>
                    <button
                      type="button"
                      onClick={handleResetGuardian}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors"
                    >
                      กรอกใหม่ / ล้าง
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ความสัมพันธ์กับนักเรียน</label>
                    <select
                      value={studentFormData.guardianRelation || 'บิดา'}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, guardianRelation: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="บิดา">บิดา</option>
                      <option value="มารดา">มารดา</option>
                      <option value="ปู่ / ย่า">ปู่ / ย่า</option>
                      <option value="ตา / ยาย">ตา / ยาย</option>
                      <option value="ลุง / ป้า / น้า / อา">ลุง / ป้า / น้า / อา</option>
                      <option value="ญาติ">ญาติ</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">คำนำหน้า</label>
                    <select
                      value={studentFormData.guardianPrefix || 'นาย'}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, guardianPrefix: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ - สกุล ผู้ปกครอง</label>
                    <input
                      type="text"
                      value={studentFormData.guardianName || ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, guardianName: e.target.value }))}
                      placeholder="ระบุชื่อและนามสกุลผู้ปกครอง"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">อายุ (ปี)</label>
                    <input
                      type="number"
                      min="15"
                      max="100"
                      value={studentFormData.guardianAge ?? ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, guardianAge: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="เช่น 45"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">อาชีพผู้ปกครอง</label>
                    <input
                      type="text"
                      value={studentFormData.guardianOccupation || ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, guardianOccupation: e.target.value }))}
                      placeholder="เช่น ค้าขาย, ข้าราชการ"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">รายได้ (บาท/เดือน)</label>
                    <input
                      type="number"
                      min="0"
                      value={studentFormData.guardianIncome ?? ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, guardianIncome: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="เช่น 18000"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">การศึกษาสูงสุด</label>
                    <select
                      value={studentFormData.guardianEducation || 'มัธยมศึกษาตอนปลาย / ปวช.'}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, guardianEducation: e.target.value }))}
                      className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      {EDUCATION_LEVEL_OPTIONS.map(edu => (
                        <option key={edu} value={edu}>{edu}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ผู้ปกครอง</label>
                    <input
                      type="tel"
                      value={studentFormData.guardianPhone || ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, guardianPhone: e.target.value }))}
                      placeholder="เช่น 081-999-8888"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-medium text-blue-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">ที่อยู่ปัจจุบันของผู้ปกครอง</label>
                      <button
                        type="button"
                        onClick={handleCopyStudentAddressToGuardian}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                      >
                        ดึงจากที่อยู่นักเรียน
                      </button>
                    </div>
                    <input
                      type="text"
                      value={studentFormData.guardianAddress || ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, guardianAddress: e.target.value }))}
                      placeholder="ระบุที่อยู่ปัจจุบันของผู้ปกครอง หรือคลิกดึงจากที่อยู่นักเรียน"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: Siblings Information */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">5</span>
                  <h4 className="text-xs font-bold text-slate-800">
                    5) ข้อมูลพี่น้องร่วมสายโลหิต (บุตรคนที่/คนเดียว, จำนวนพี่น้อง, พี่ชาย/น้องชาย, พี่สาว/น้องสาว, ต่างบิดา-มารดา, กำลังศึกษา)
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เป็นบุตรคนที่</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      disabled={studentFormData.isOnlyChild}
                      value={studentFormData.isOnlyChild ? 1 : (studentFormData.birthOrder ?? 1)}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, birthOrder: Number(e.target.value) }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-bold disabled:bg-slate-100"
                    />
                  </div>

                  <div className="pb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-blue-900 bg-blue-50/70 p-2 rounded-xl border border-blue-200">
                      <input
                        type="checkbox"
                        checked={Boolean(studentFormData.isOnlyChild)}
                        onChange={(e) => {
                          const isOnly = e.target.checked;
                          setStudentFormData(prev => ({
                            ...prev,
                            isOnlyChild: isOnly,
                            birthOrder: 1,
                            totalSiblings: 1,
                            brothersCount: 0,
                            sistersCount: 0,
                            studyingSiblingsCount: 1
                          }));
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>เป็นบุตรคนเดียว</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">พี่น้องทั้งหมด (คน)</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      disabled={studentFormData.isOnlyChild}
                      value={studentFormData.isOnlyChild ? 1 : (studentFormData.totalSiblings ?? 1)}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, totalSiblings: Number(e.target.value) }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-emerald-800 mb-1">พี่น้องที่กำลังศึกษาอยู่ (คน)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={studentFormData.studyingSiblingsCount ?? 1}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, studyingSiblingsCount: Number(e.target.value) }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/30 font-bold text-emerald-800"
                    />
                  </div>
                </div>

                {!studentFormData.isOnlyChild && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">พี่ชาย / น้องชาย (คน)</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={studentFormData.brothersCount ?? 0}
                        onChange={(e) => setStudentFormData(prev => ({ ...prev, brothersCount: Number(e.target.value) }))}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">พี่สาว / น้องสาว (คน)</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={studentFormData.sistersCount ?? 0}
                        onChange={(e) => setStudentFormData(prev => ({ ...prev, sistersCount: Number(e.target.value) }))}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>

                    {/* Half siblings older */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={Boolean(studentFormData.hasOlderHalfSiblings)}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, hasOlderHalfSiblings: e.target.checked }))}
                          className="rounded text-blue-600"
                        />
                        <span>มีพี่ต่างบิดา-มารดา</span>
                      </label>
                      {studentFormData.hasOlderHalfSiblings && (
                        <div className="flex items-center gap-1 pt-1">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={studentFormData.olderHalfSiblingsCount ?? 1}
                            onChange={(e) => setStudentFormData(prev => ({ ...prev, olderHalfSiblingsCount: Number(e.target.value) }))}
                            className="w-16 text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white"
                          />
                          <span className="text-[11px] text-slate-500">คน</span>
                        </div>
                      )}
                    </div>

                    {/* Half siblings younger */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={Boolean(studentFormData.hasYoungerHalfSiblings)}
                          onChange={(e) => setStudentFormData(prev => ({ ...prev, hasYoungerHalfSiblings: e.target.checked }))}
                          className="rounded text-blue-600"
                        />
                        <span>มีน้องต่างบิดา-มารดา</span>
                      </label>
                      {studentFormData.hasYoungerHalfSiblings && (
                        <div className="flex items-center gap-1 pt-1">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={studentFormData.youngerHalfSiblingsCount ?? 1}
                            onChange={(e) => setStudentFormData(prev => ({ ...prev, youngerHalfSiblingsCount: Number(e.target.value) }))}
                            className="w-16 text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white"
                          />
                          <span className="text-[11px] text-slate-500">คน</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 6: Housing & Travel to School */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">6</span>
                  <h4 className="text-xs font-bold text-slate-800">
                    6) สถานะที่อยู่อาศัยและการเดินทางมาโรงเรียน (สถานะที่อยู่, พักอาศัยกับ, การเดินทาง, ระยะทาง, เวลาเดินทาง)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Housing Status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      สถานะที่อยู่อาศัย
                    </label>
                    <select
                      value={studentFormData.housingStatus || 'บ้านตัวเอง'}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, housingStatus: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      {HOUSING_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* If renting: rentAmount */}
                  {studentFormData.housingStatus === 'เช่า' && (
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">ค่าเช่าที่อยู่อาศัย (บาท/เดือน)</label>
                      <input
                        type="number"
                        min="0"
                        value={studentFormData.rentAmount ?? ''}
                        onChange={(e) => setStudentFormData(prev => ({ ...prev, rentAmount: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="เช่น 2500"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/20 font-mono"
                      />
                    </div>
                  )}

                  {/* If other housing */}
                  {studentFormData.housingStatus === 'อื่นๆ' && (
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">ระบุสถานะที่อยู่อาศัยอื่นๆ</label>
                      <input
                        type="text"
                        value={studentFormData.housingStatusOther || ''}
                        onChange={(e) => setStudentFormData(prev => ({ ...prev, housingStatusOther: e.target.value }))}
                        placeholder="เช่น วัด, บ้านพักสวัสดิการ"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/20"
                      />
                    </div>
                  )}

                  {/* Living with */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      นักเรียนพักอาศัยอยู่กับ
                    </label>
                    <select
                      value={studentFormData.livingWith || 'บิดามารดา'}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, livingWith: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      {LIVING_WITH_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {studentFormData.livingWith === 'อื่นๆ' && (
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 mb-1">ระบุผู้ที่พักอาศัยอยู่ด้วย</label>
                      <input
                        type="text"
                        value={studentFormData.livingWithOther || ''}
                        onChange={(e) => setStudentFormData(prev => ({ ...prev, livingWithOther: e.target.value }))}
                        placeholder="เช่น เพื่อนบ้าน, ผู้อุปการะ"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/20"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Travel method */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      การเดินทางมาโรงเรียน
                    </label>
                    <select
                      value={studentFormData.travelMethod || 'เดิน'}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, travelMethod: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      {TRAVEL_METHOD_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Distance */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ระยะทางจากบ้านถึงโรงเรียน
                    </label>
                    <input
                      type="text"
                      value={studentFormData.distanceToSchool || ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, distanceToSchool: e.target.value }))}
                      placeholder="เช่น 1.5 กิโลเมตร หรือ 800 เมตร"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>

                  {/* Travel Time */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ระยะเวลาในการเดินทาง
                    </label>
                    <input
                      type="text"
                      value={studentFormData.travelTimeToSchool || ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, travelTimeToSchool: e.target.value }))}
                      placeholder="เช่น 15 นาที หรือ 30 นาที"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                {studentFormData.travelMethod === 'อื่นๆ' && (
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">ระบุวิธีการเดินทางอื่นๆ</label>
                    <input
                      type="text"
                      value={studentFormData.travelMethodOther || ''}
                      onChange={(e) => setStudentFormData(prev => ({ ...prev, travelMethodOther: e.target.value }))}
                      placeholder="เช่น เรือหางยาว, รถรับส่งส่วนบุคคล"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/20"
                    />
                  </div>
                )}

                {/* Household Burden Checkboxes */}
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2 mt-2">
                  <label className="block text-xs font-bold text-slate-800">
                    ครัวเรือนมีภาระพึ่งพิง (เกณฑ์คัดกรองนักเรียนยากจน):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      'มีคนพิการ/เจ็บป่วยเรื้อรัง',
                      'มีผู้สูงอายุ (มากกว่า 60 ปี)',
                      'มีคนอายุ 15-60 ปีที่ว่างงาน (ไม่ใช่นักเรียน/นักศึกษา)',
                      'เป็นบิดา/มารดาเลี้ยงเดี่ยว',
                      'ครัวเรือนไม่มีภาระพึ่งพิง'
                    ].map(burden => {
                      const isChecked = studentFormData.householdBurden?.includes(burden);
                      return (
                        <label
                          key={burden}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            isChecked 
                              ? 'bg-blue-50/90 border-blue-300 text-blue-900 font-semibold' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleBurden(burden)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>{burden}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER BUTTONS */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 sticky bottom-0 bg-white py-2 z-20">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกข้อมูลนักเรียน</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Admin Add/Edit Personnel */}
      {isPersonnelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                {editingPersonnel ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรใหม่'}
              </h3>
              <button
                onClick={() => setIsPersonnelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePersonnelSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ประเภทบุคลากร *</label>
                <select
                  value={personnelType}
                  onChange={(e) => setPersonnelType(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="ผู้อำนวยการ">ผู้อำนวยการ</option>
                  <option value="รองผู้อำนวยการ">รองผู้อำนวยการ</option>
                  <option value="ครู">ครู</option>
                  <option value="บุคลากรอื่น">บุคลากรอื่น</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ฝ่าย / กลุ่มงาน *</label>
                <select
                  value={personnelDepartment}
                  onChange={(e) => setPersonnelDepartment(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white mb-2"
                >
                  <option value="วิชาการ">วิชาการ</option>
                  <option value="บริหารทั่วไป">บริหารทั่วไป</option>
                  <option value="งบประมาณ">งบประมาณ</option>
                  <option value="บริหารงานบุคคล">บริหารงานบุคคล</option>
                  <option value="อื่นๆ">อื่นๆ (ระบุ)</option>
                </select>
                {personnelDepartment === 'อื่นๆ' && (
                  <input
                    type="text"
                    required
                    value={personnelCustomDepartment}
                    onChange={(e) => setPersonnelCustomDepartment(e.target.value)}
                    placeholder="กรุณาระบุชื่อฝ่าย / กลุ่มงาน..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">คำนำหน้า *</label>
                  <input
                    type="text"
                    name="prefix"
                    required
                    defaultValue={editingPersonnel?.prefix || 'นาย'}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ *</label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    defaultValue={editingPersonnel?.firstName || ''}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">นามสกุล *</label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    defaultValue={editingPersonnel?.lastName || ''}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ตำแหน่ง *</label>
                  <input
                    type="text"
                    name="position"
                    required
                    defaultValue={editingPersonnel?.position || 'ครูชำนาญการ'}
                    placeholder="เช่น ครูชำนาญการ, ครูผู้ช่วย"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ครูที่ปรึกษาประจำชั้น</label>
                  <select
                    name="advisorGrade"
                    defaultValue={editingPersonnel?.advisorGrade || ''}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 cursor-pointer font-semibold text-blue-700 bg-blue-50/50"
                  >
                    <option value="">(ไม่มี / ไม่ได้เป็นที่ปรึกษา)</option>
                    <option value="อ.1">อนุบาล 1 (อ.1)</option>
                    <option value="อ.2">อนุบาล 2 (อ.2)</option>
                    <option value="อ.3">อนุบาล 3 (อ.3)</option>
                    <option value="ป.1">ประถมศึกษาปีที่ 1 (ป.1)</option>
                    <option value="ป.2">ประถมศึกษาปีที่ 2 (ป.2)</option>
                    <option value="ป.3">ประถมศึกษาปีที่ 3 (ป.3)</option>
                    <option value="ป.4">ประถมศึกษาปีที่ 4 (ป.4)</option>
                    <option value="ป.5">ประถมศึกษาปีที่ 5 (ป.5)</option>
                    <option value="ป.6">ประถมศึกษาปีที่ 6 (ป.6)</option>
                    <option value="ม.1">มัธยมศึกษาปีที่ 1 (ม.1)</option>
                    <option value="ม.2">มัธยมศึกษาปีที่ 2 (ม.2)</option>
                    <option value="ม.3">มัธยมศึกษาปีที่ 3 (ม.3)</option>
                    <option value="ม.4">มัธยมศึกษาปีที่ 4 (ม.4)</option>
                    <option value="ม.5">มัธยมศึกษาปีที่ 5 (ม.5)</option>
                    <option value="ม.6">มัธยมศึกษาปีที่ 6 (ม.6)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">วันเดือนปีเกิด (พ.ศ.) *</label>
                  <ThaiDatePicker
                    name="birthDate"
                    required
                    defaultValue={editingPersonnel?.birthDate || '1985-05-15'}
                    placeholder="เลือกวันเดือนปีเกิด (พ.ศ.)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">วันเริ่มบรรจุรับราชการ (พ.ศ.)</label>
                  <ThaiDatePicker
                    name="employmentDate"
                    align="right"
                    defaultValue={editingPersonnel?.employmentDate || '2010-10-01'}
                    placeholder="เลือกวันเริ่มบรรจุ (พ.ศ.)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">วุฒิการศึกษาสูงสุด</label>
                  <input
                    type="text"
                    name="degree"
                    defaultValue={editingPersonnel?.degree || 'ครุศาสตรบัณฑิต (ค.บ.)'}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">วิชาเอก (Major)</label>
                  <input
                    type="text"
                    name="major"
                    defaultValue={editingPersonnel?.major || 'ภาษาไทย'}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={editingPersonnel?.phone || ''}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingPersonnel?.email || ''}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รูปถ่ายบุคลากร (อัปโหลดไฟล์จากอุปกรณ์)</label>
                <input
                  type="file"
                  ref={personnelFileInputRef}
                  accept="image/*"
                  onChange={handlePersonnelImageChange}
                  className="hidden"
                />
                <div className="flex items-center gap-3 pt-1">
                  <div
                    onClick={() => personnelFileInputRef.current?.click()}
                    className="w-16 h-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 hover:border-blue-500 overflow-hidden flex items-center justify-center cursor-pointer transition-all shrink-0 group relative shadow-2xs"
                  >
                    {personnelAvatarUrl ? (
                      <>
                        <img src={personnelAvatarUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-semibold">
                          เปลี่ยน
                        </div>
                      </>
                    ) : (
                      <Upload className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <button
                      type="button"
                      onClick={() => personnelFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{personnelAvatarUrl ? 'เปลี่ยนไฟล์รูปภาพ' : 'เลือกไฟล์รูปภาพ'}</span>
                    </button>
                    {personnelAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => setPersonnelAvatarUrl('')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-medium rounded-xl transition-colors cursor-pointer block"
                      >
                        ลบรูป
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ลายเซ็นดิจิทัล / ลายเซ็นผู้บริหาร (สำหรับประทับบัตรนักเรียนและเอกสาร)</span>
                </label>
                <input
                  type="file"
                  ref={personnelSignatureInputRef}
                  accept="image/*"
                  onChange={handlePersonnelSignatureChange}
                  className="hidden"
                />
                <div className="flex items-center gap-3 pt-1">
                  <div
                    onClick={() => personnelSignatureInputRef.current?.click()}
                    className="w-36 h-16 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-500 overflow-hidden flex items-center justify-center cursor-pointer transition-all shrink-0 group relative shadow-2xs p-1"
                  >
                    {personnelSignatureUrl ? (
                      <>
                        <img src={personnelSignatureUrl} alt="ลายเซ็น" className="max-w-full max-h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-semibold">
                          เปลี่ยน
                        </div>
                      </>
                    ) : (
                      <div className="text-center px-1">
                        <Upload className="w-4 h-4 text-slate-400 mx-auto mb-0.5" />
                        <span className="text-[8.5px] text-slate-400 font-semibold block">อัปโหลดลายเซ็น</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <button
                      type="button"
                      onClick={() => personnelSignatureInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>{personnelSignatureUrl ? 'เปลี่ยนไฟล์ภาพลายเซ็น' : 'เลือกไฟล์ภาพลายเซ็น'}</span>
                    </button>
                    {personnelSignatureUrl && (
                      <button
                        type="button"
                        onClick={() => setPersonnelSignatureUrl('')}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium rounded-xl transition-colors cursor-pointer block"
                      >
                        ลบลายเซ็น
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPersonnelModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer active:scale-95"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBTAB 4: LEAVE SYSTEM */}
      {activeSubTab === 'leave' && (
        <div className="space-y-4">
          {/* Top Bar with Role Indicator & Action */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">ระบบการลาของบุคลากร</span>
                  <span className="sm:hidden">ระบบลา</span>
                </h3>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <span>👑 สิทธิ์ผู้ดูแลระบบ: เห็นรายการของทุกคน</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <span>👤 สิทธิ์สมาชิก: เห็นเฉพาะของตนเอง ({formatThaiPersonName(user.fullName || 'ผู้ใช้งาน')})</span>
                  </span>
                )}
              </div>
              {isAdmin && (
                <p className="text-[11px] text-slate-500">
                  ผู้ดูแลระบบสามารถตรวจสอบ อนุมัติ และดูสถิติการลาของบุคลากรทุกคนในสถานศึกษาได้
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingLeaveId(null);
                const directorPerson = personnel.find(p => (p.position || '').includes('ผู้อำนวยการ') || (p.personnelType || '').includes('ผู้อำนวยการ'));
                const defaultDirector = directorPerson
                  ? formatThaiPersonName(`${directorPerson.prefix}${directorPerson.firstName} ${directorPerson.lastName}`)
                  : (personnel[0] ? formatThaiPersonName(`${personnel[0].prefix}${personnel[0].firstName} ${personnel[0].lastName}`) : 'ผู้อำนวยการโรงเรียน');
                const hrOfficer = personnel.find(p => 
                  p.department === 'บริหารงานบุคคล' || 
                  p.customDepartment === 'บริหารงานบุคคล' || 
                  p.personnelType === 'รองผู้อำนวยการ' ||
                  p.personnelType === 'ผู้อำนวยการ'
                ) || personnel[0];
                const defaultOfficer = hrOfficer ? formatThaiPersonName(`${hrOfficer.prefix}${hrOfficer.firstName} ${hrOfficer.lastName}`) : '';
                const deputyPerson =
                  personnel.find(p => p.personnelType === 'รองผู้อำนวยการ' || (p.position || '').includes('รองผู้อำนวยการ')) ||
                  personnel.find(p => p.department === 'บริหารงานบุคคล') ||
                  personnel[1] ||
                  personnel[0];
                const defaultSupervisorName = deputyPerson
                  ? formatThaiPersonName(`${deputyPerson.prefix}${deputyPerson.firstName} ${deputyPerson.lastName}`)
                  : '';
                const rawSupPos = (deputyPerson?.position || 'ชำนาญการพิเศษ').trim();
                const isStdSupPos = (SUPERVISOR_POSITION_OPTIONS as readonly string[]).includes(rawSupPos) && rawSupPos !== 'อื่นๆ';

                let defaultApplicantName = formatThaiPersonName(user.fullName || '');
                if (user.prefix && !/^(นาย|นางสาว|นาง|ดร\.|ว่าที่)/u.test(defaultApplicantName)) {
                  defaultApplicantName = formatThaiPersonName(`${user.prefix.trim()}${defaultApplicantName.replace(/^ครู\s*/u, '')}`);
                }

                setLeaveForm({
                  teacherName: defaultApplicantName,
                  leaveType: 'ลากิจ',
                  customLeaveType: '',
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0],
                  reason: '',
                  directorName: defaultDirector,
                  personnelOfficer: defaultOfficer,
                  supervisorName: defaultSupervisorName,
                  supervisorPosition: isStdSupPos ? rawSupPos : 'อื่นๆ',
                  customSupervisorPosition: isStdSupPos ? '' : rawSupPos
                });
                setIsLeaveModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ ยื่นคำขอลา</span>
              <span className="sm:hidden">ยื่นคำขอ</span>
            </button>
          </div>

          {/* Filter Bar (Round 1 / Round 2 & Teacher & Status) - Hidden on Mobile */}
          <div className="hidden sm:flex bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Leave Evaluation Round Filter (Replaced Fiscal Year with ครั้งที่ 1 / ครั้งที่ 2) */}
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-[11px] font-bold text-slate-600 shrink-0">รอบการลา:</label>
                {isAdmin ? (
                  <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeaveRound('1');
                        onSaveSchoolInfo({
                          ...schoolInfo,
                          leaveRound: '1',
                          leaveRoundFiscalYear: selectedFiscalYear === 'all' ? String(currentFiscalYear) : selectedFiscalYear
                        });
                        onShowToast('success', 'กำหนดรอบการลาสำเร็จ', 'ตั้งค่าระบบการลาเป็น ครั้งที่ 1 (1 ตุลาคม – 31 มีนาคม) เรียบร้อยแล้ว');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        effectiveLeaveRound === '1'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      ครั้งที่ 1 (1 ตุลาคม – 31 มีนาคม)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeaveRound('2');
                        onSaveSchoolInfo({
                          ...schoolInfo,
                          leaveRound: '2',
                          leaveRoundFiscalYear: selectedFiscalYear === 'all' ? String(currentFiscalYear) : selectedFiscalYear
                        });
                        onShowToast('success', 'กำหนดรอบการลาสำเร็จ', 'ตั้งค่าระบบการลาเป็น ครั้งที่ 2 (1 เมษายน – 30 กันยายน) เรียบร้อยแล้ว');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        effectiveLeaveRound === '2'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      ครั้งที่ 2 (1 เมษายน – 30 กันยายน)
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {effectiveLeaveRound === '1'
                        ? 'ครั้งที่ 1 (1 ตุลาคม – 31 มีนาคม)'
                        : 'ครั้งที่ 2 (1 เมษายน – 30 กันยายน)'}
                    </span>
                  </div>
                )}
              </div>

              {/* Admin Teacher Filter */}
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-600 shrink-0">บุคลากร:</label>
                  <select
                    value={selectedTeacherFilter}
                    onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">ทุกคน (บุคลากรทั้งหมด)</option>
                    {personnel.map(p => {
                      const pName = `${p.prefix}${p.firstName} ${p.lastName}`;
                      return (
                        <option key={p.id} value={pName}>
                          {pName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500">
              พบ <strong className="text-blue-600 font-bold">{visibleLeaveRequests.length}</strong> รายการ
            </div>
          </div>

          {/* Leave Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                 <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-2 sm:px-4">ผู้ขอลา</th>
                    <th className="py-3 px-2 sm:px-3 text-center whitespace-nowrap">ประเภทการลา</th>
                    <th className="py-3 px-3 text-center hidden sm:table-cell">ลากี่วัน</th>
                    <th className="py-3 px-3 text-center hidden sm:table-cell">รอบการลา & สถิติสะสม</th>
                    <th className="py-3 px-4 hidden sm:table-cell">เหตุผลการลา</th>
                    <th className="py-3 px-2 sm:px-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleLeaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Calendar className="w-8 h-8 text-slate-300" />
                          <p className="font-medium">
                            ไม่พบรายการยื่นคำขอลาใน {effectiveLeaveRound === '1' ? 'ครั้งที่ 1 (1 ตุลาคม – 31 มีนาคม)' : 'ครั้งที่ 2 (1 เมษายน – 30 กันยายน)'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {isAdmin
                              ? 'ยังไม่มีข้อมูลการลาในรอบที่เลือก (สถิติการลาจะเริ่มนับใหม่ในแต่ละรอบ)'
                              : 'คุณยังไม่มีประวัติการยื่นลาในรอบนี้ สามารถกด "+ ยื่นคำขอลา" เพื่อเริ่มนับสถิติใหม่ได้เลย'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleLeaveRequests.map((req) => {
                      const stats = getLeaveStatsForRequest(req);
                      const isOwner = isMyLeave(req);
                      const daysCount = calculateLeaveDaysCount(req.startDate, req.endDate);

                      return (
                        <tr key={req.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-2 sm:px-4">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span>{formatThaiPersonName(req.teacherName)}</span>
                              {isOwner && (
                                <span className="hidden sm:inline-block text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-md font-medium border border-blue-200">
                                  ของฉัน
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 sm:px-3 text-center whitespace-nowrap">
                            <span className="px-2 sm:px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-md font-semibold text-[11px] border border-purple-200 whitespace-nowrap inline-block">
                              {req.leaveType}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-slate-600 hidden sm:table-cell">
                            <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 inline-block">
                              {daysCount} วัน
                            </span>
                            <div className="text-[10.5px] text-slate-500 font-normal mt-0.5">
                              ({formatIsoToThaiDisplay(req.startDate, 'short')} - {formatIsoToThaiDisplay(req.endDate, 'short')})
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center hidden sm:table-cell">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold text-[10px] border border-indigo-200">
                                {stats.evalRoundLabel}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-700">
                                ครั้งที่ {stats.roundNumber} • สะสม {stats.totalAccumulated} วัน
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {stats.priorDays === 0 ? '(เริ่มนับใหม่ในรอบนี้)' : `(ก่อนหน้านี้ ${stats.priorDays} วัน)`}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 hidden sm:table-cell max-w-xs truncate" title={req.reason}>
                            {req.reason}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewLeave(req)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                title="ดูตัวอย่างแบบใบลาและดาวน์โหลด (A4)"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              {(isAdmin || isOwner) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLeaveId(req.id);
                                    const stdTypes = ['ลากิจ', 'ลาป่วย', 'ลาคลอด', 'อุปสมบท'];
                                    const isCustom = !stdTypes.includes(req.leaveType);
                                    const deputyPerson =
                                      personnel.find(p => p.personnelType === 'รองผู้อำนวยการ' || (p.position || '').includes('รองผู้อำนวยการ')) ||
                                      personnel.find(p => p.department === 'บริหารงานบุคคล') ||
                                      personnel[1] ||
                                      personnel[0];
                                    const existingSupName = req.supervisorName || (deputyPerson ? `${deputyPerson.prefix}${deputyPerson.firstName} ${deputyPerson.lastName}` : '');
                                    const existingSupPos = (req.supervisorPosition || deputyPerson?.position || 'ชำนาญการพิเศษ').trim();
                                    const isStdSupPos = (SUPERVISOR_POSITION_OPTIONS as readonly string[]).includes(existingSupPos) && existingSupPos !== 'อื่นๆ';

                                    setLeaveForm({
                                      teacherName: formatThaiPersonName(req.teacherName),
                                      leaveType: isCustom ? 'อื่นๆ' : req.leaveType,
                                      customLeaveType: isCustom ? req.leaveType : '',
                                      startDate: req.startDate,
                                      endDate: req.endDate,
                                      reason: req.reason,
                                      directorName: formatThaiPersonName(req.directorName || schoolInfo.directorName || 'ผู้อำนวยการโรงเรียน'),
                                      personnelOfficer: formatThaiPersonName(req.personnelOfficer || ''),
                                      supervisorName: formatThaiPersonName(existingSupName),
                                      supervisorPosition: isStdSupPos ? existingSupPos : 'อื่นๆ',
                                      customSupervisorPosition: isStdSupPos ? '' : existingSupPos
                                    });
                                    setIsLeaveModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                  title="แก้ไขคำขอลา"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {/* Admin only: Delete leave record */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteLeave(req)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                  title="ลบรายการคำขอลา (เฉพาะ Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: DUTY TEACHER REPORT & ROSTER */}
      {activeSubTab === 'duty' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Top Bar with View Mode Switcher */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setDutyLogSubView('fill')}
                className={`w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  dutyLogSubView === 'fill'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70 border border-slate-200/80'
                }`}
              >
                <Edit className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">กรอกสมุดรายงาน</span>
              </button>
              <button
                type="button"
                onClick={() => setDutyLogSubView('history')}
                className={`w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  dutyLogSubView === 'history'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70 border border-slate-200/80'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">ประวัติรายงาน ({filteredDutyLogs.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0 self-end sm:self-auto">
              {isAdmin ? (
                <>
                  <select
                    value={selectedDutyAcademicYear}
                    onChange={(e) => setSelectedDutyAcademicYear(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
                  >
                    {availableDutyAcademicYears.map(yr => (
                      <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                    ))}
                  </select>

                  <select
                    value={selectedDutySemester}
                    onChange={(e) => setSelectedDutySemester(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsDutyGradesConfigOpen(prev => !prev)}
                    className={`w-full sm:w-auto h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs border ${
                      isDutyGradesConfigOpen
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                    title="ตั้งค่าระดับชั้นที่แสดงในตารางสถิตินักเรียน (เฉพาะ Admin)"
                  >
                    <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ตั้งค่าระดับชั้นในตาราง ({effectiveDutyReportGrades.length} ชั้น)</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${isDutyGradesConfigOpen ? 'bg-amber-700 text-white' : 'bg-amber-200/80 text-amber-900'}`}>
                      เฉพาะ Admin
                    </span>
                  </button>
                </>
              ) : (
                <div className="hidden sm:block px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold whitespace-nowrap">
                  ภาคเรียนที่ {activeDutySem} • ปีการศึกษา {activeDutyYr}
                </div>
              )}
            </div>
          </div>

          {/* ADMIN GRADE LEVEL CONFIGURATION PANEL (เฉพาะ Admin: ติ๊กเลือก อ.1 - ม.3) */}
          {isAdmin && isDutyGradesConfigOpen && (
            <div className="bg-gradient-to-r from-amber-50/95 via-orange-50/60 to-amber-50/95 border-2 border-amber-300/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-amber-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-amber-950">
                        ตั้งค่าระดับชั้นที่แสดงในตารางรายงานครูเวร (เฉพาะ Admin)
                      </h4>
                      <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">
                        ซิงค์ไปยังสมาชิกทุกคน
                      </span>
                    </div>
                    <p className="text-xs text-amber-800/90 mt-0.5">
                      ติ๊กเลือกระดับชั้น (อ.1 ถึง ม.3) ที่โรงเรียนเปิดสอน เพื่อกำหนดชั้นที่จะแสดงในตารางสถิติการมาเรียนของหน้าตัวอย่างดาวน์โหลดสำหรับสมาชิกทุกคน
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDutyGradesConfigOpen(false)}
                    className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer"
                    title="ปิดแผงตั้งค่า"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-amber-900 shrink-0">เลือกด่วน:</span>
                <button
                  type="button"
                  onClick={() => {
                    const allGrades = DUTY_REPORT_GRADE_OPTIONS.map(o => o.grade);
                    handleSaveDutyGrades(allGrades);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  เลือกทั้งหมด (อ.1 - ม.3)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const kindergartenAndPrimary = DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'kindergarten' || o.group === 'primary').map(o => o.grade);
                    handleSaveDutyGrades(kindergartenAndPrimary);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  อ.1 - ป.6 (อนุบาล-ประถม)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const primaryOnly = DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'primary').map(o => o.grade);
                    handleSaveDutyGrades(primaryOnly);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  ป.1 - ป.6 (เฉพาะประถม)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const expansion = DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'primary' || o.group === 'secondary').map(o => o.grade);
                    handleSaveDutyGrades(expansion);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  ป.1 - ม.3 (ขยายโอกาส)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveDutyGrades(DEFAULT_DUTY_REPORT_GRADES);
                  }}
                  className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  รีเซ็ตเป็นเริ่มต้น
                </button>
              </div>

              {/* Checkbox Groups: Kindergarten, Primary, Secondary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. อนุบาล (อ.1 - อ.3) */}
                <div className="bg-white/95 rounded-2xl p-3.5 border border-amber-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-100">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <span>🌸 ระดับปฐมวัย (อนุบาล)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const kGrades = DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'kindergarten').map(o => o.grade);
                        const allSelected = kGrades.every(g => selectedDutyGrades.includes(g));
                        const next = allSelected
                          ? selectedDutyGrades.filter(g => !kGrades.includes(g as any))
                          : Array.from(new Set([...selectedDutyGrades, ...kGrades]));
                        handleSaveDutyGrades(next.length > 0 ? next : ['ป.1']);
                      }}
                      className="text-[11px] text-amber-700 hover:text-amber-900 font-bold cursor-pointer"
                    >
                      {DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'kindergarten').every(o => selectedDutyGrades.includes(o.grade)) ? 'ยกเลิกทั้งกลุ่ม' : 'เลือกทั้งกลุ่ม'}
                    </button>
                  </div>
                  <div className="space-y-1.5 pt-0.5">
                    {DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'kindergarten').map(opt => {
                      const isChecked = selectedDutyGrades.includes(opt.grade);
                      return (
                        <label
                          key={opt.grade}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-amber-50/90 border-amber-400 text-amber-950 shadow-2xs ring-1 ring-amber-400/40'
                              : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-100/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const next = checked
                                  ? [...selectedDutyGrades, opt.grade]
                                  : selectedDutyGrades.filter(g => g !== opt.grade);
                                if (next.length === 0) {
                                  onShowToast('warning', 'ต้องมีอย่างน้อย 1 ระดับชั้น', 'ต้องเลือกระดับชั้นเพื่อแสดงในตารางอย่างน้อย 1 ชั้น');
                                  return;
                                }
                                handleSaveDutyGrades(next);
                              }}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                            />
                            <span>{opt.label}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${isChecked ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'}`}>
                            {opt.shortLabel}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 2. ประถมศึกษา (ป.1 - ป.6) */}
                <div className="bg-white/95 rounded-2xl p-3.5 border border-amber-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-100">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <span>🏫 ระดับประถมศึกษา</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const pGrades = DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'primary').map(o => o.grade);
                        const allSelected = pGrades.every(g => selectedDutyGrades.includes(g));
                        const next = allSelected
                          ? selectedDutyGrades.filter(g => !pGrades.includes(g as any))
                          : Array.from(new Set([...selectedDutyGrades, ...pGrades]));
                        handleSaveDutyGrades(next.length > 0 ? next : ['ป.1']);
                      }}
                      className="text-[11px] text-amber-700 hover:text-amber-900 font-bold cursor-pointer"
                    >
                      {DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'primary').every(o => selectedDutyGrades.includes(o.grade)) ? 'ยกเลิกทั้งกลุ่ม' : 'เลือกทั้งกลุ่ม'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    {DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'primary').map(opt => {
                      const isChecked = selectedDutyGrades.includes(opt.grade);
                      return (
                        <label
                          key={opt.grade}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-amber-50/90 border-amber-400 text-amber-950 shadow-2xs ring-1 ring-amber-400/40'
                              : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-100/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const next = checked
                                  ? [...selectedDutyGrades, opt.grade]
                                  : selectedDutyGrades.filter(g => g !== opt.grade);
                                if (next.length === 0) {
                                  onShowToast('warning', 'ต้องมีอย่างน้อย 1 ระดับชั้น', 'ต้องเลือกระดับชั้นเพื่อแสดงในตารางอย่างน้อย 1 ชั้น');
                                  return;
                                }
                                handleSaveDutyGrades(next);
                              }}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer shrink-0"
                            />
                            <span className="truncate">{opt.shortLabel}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${isChecked ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'}`}>
                            {opt.grade}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 3. มัธยมศึกษาตอนต้น (ม.1 - ม.3) */}
                <div className="bg-white/95 rounded-2xl p-3.5 border border-amber-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-100">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <span>🎓 ระดับมัธยมศึกษาตอนต้น</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const sGrades = DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'secondary').map(o => o.grade);
                        const allSelected = sGrades.every(g => selectedDutyGrades.includes(g));
                        const next = allSelected
                          ? selectedDutyGrades.filter(g => !sGrades.includes(g as any))
                          : Array.from(new Set([...selectedDutyGrades, ...sGrades]));
                        handleSaveDutyGrades(next.length > 0 ? next : ['ป.1']);
                      }}
                      className="text-[11px] text-amber-700 hover:text-amber-900 font-bold cursor-pointer"
                    >
                      {DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'secondary').every(o => selectedDutyGrades.includes(o.grade)) ? 'ยกเลิกทั้งกลุ่ม' : 'เลือกทั้งกลุ่ม'}
                    </button>
                  </div>
                  <div className="space-y-1.5 pt-0.5">
                    {DUTY_REPORT_GRADE_OPTIONS.filter(o => o.group === 'secondary').map(opt => {
                      const isChecked = selectedDutyGrades.includes(opt.grade);
                      return (
                        <label
                          key={opt.grade}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-amber-50/90 border-amber-400 text-amber-950 shadow-2xs ring-1 ring-amber-400/40'
                              : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-100/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const next = checked
                                  ? [...selectedDutyGrades, opt.grade]
                                  : selectedDutyGrades.filter(g => g !== opt.grade);
                                if (next.length === 0) {
                                  onShowToast('warning', 'ต้องมีอย่างน้อย 1 ระดับชั้น', 'ต้องเลือกระดับชั้นเพื่อแสดงในตารางอย่างน้อย 1 ชั้น');
                                  return;
                                }
                                handleSaveDutyGrades(next);
                              }}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                            />
                            <span>{opt.label}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${isChecked ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'}`}>
                            {opt.shortLabel}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status footer inside config */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-amber-200 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold">ชั้นเรียนที่เลือกแสดง ({selectedDutyGrades.length} ชั้น):</span>
                  <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-amber-300 text-amber-950 font-bold shadow-2xs">
                    {selectedDutyGrades.sort((a, b) => {
                      const idxA = DUTY_REPORT_GRADE_OPTIONS.findIndex(o => o.grade === a);
                      const idxB = DUTY_REPORT_GRADE_OPTIONS.findIndex(o => o.grade === b);
                      return idxA - idxB;
                    }).join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>บันทึกและซิงค์ไปยังสมาชิกทุกคนโดยอัตโนมัติ</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveDutyGrades(selectedDutyGrades);
                      setIsDutyGradesConfigOpen(false);
                    }}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            </div>
          )}
          {dutyLogSubView === 'fill' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
              {/* Form Title & Overview Banner - Hidden on Mobile */}
              <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 border border-emerald-200/80 shadow-2xs">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <span>สมุดรายงานการปฏิบัติหน้าที่ครูเวรประจำวัน</span>
                    </h3>
                  </div>
                </div>
              </div>

              {/* General Information Grid - Compact Date Button & Duty Teacher */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/90">
                {/* Date Selection: Desktop 100-day Calendar button & Mobile Clean Current Date */}
                <div className="flex-1 min-w-0">
                  {/* Desktop Date Picker View */}
                  <div className="hidden sm:block">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700 truncate">
                        วันที่ปฏิบัติหน้าที่ (ปฏิทิน 100 วัน) *
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDutyCalendarModalOpen(true)}
                      className="w-full bg-white hover:bg-sky-50/80 border border-slate-200 hover:border-sky-300 p-2 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs group text-left"
                      title="กดเพื่อเปิดปฏิทิน 100 วันสำหรับเลือกวันที่"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {getThaiDayName(dutyLogForm.date)}ที่ {formatThaiDate(dutyLogForm.date)}
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>วันเปิดเรียน 100 วันตาม Admin กำหนด</span>
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 shadow-2xs transition-all">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>เลือกปฏิทิน 100 วัน</span>
                      </span>
                    </button>
                  </div>

                  {/* Mobile Clean Current Date Display */}
                  <div className="sm:hidden">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      วันที่ปฏิบัติหน้าที่
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsDutyCalendarModalOpen(true)}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-2xs cursor-pointer text-left hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {getThaiDayName(dutyLogForm.date)}ที่ {formatThaiDate(dutyLogForm.date)}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 shrink-0">
                        เปลี่ยนวัน
                      </span>
                    </button>
                  </div>
                </div>

                {/* Duty Teacher Input */}
                <div className="flex-1 min-w-0">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate">
                    ครูเวรผู้ปฏิบัติหน้าที่ *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      required
                      value={dutyLogForm.dutyTeacherName}
                      onChange={(e) => setDutyLogForm({ ...dutyLogForm, dutyTeacherName: e.target.value })}
                      placeholder="ระบุชื่อ-นามสกุล ครูเวร..."
                      className="w-full text-xs font-bold text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                    />
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) setDutyLogForm({ ...dutyLogForm, dutyTeacherName: e.target.value });
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none cursor-pointer shrink-0"
                      title="เลือกจากรายชื่อบุคลากร"
                    >
                      <option value="">เลือกบุคลากร...</option>
                      {personnel.map(p => (
                        <option key={p.id} value={`${p.prefix}${p.firstName} ${p.lastName}`}>
                          {p.prefix}{p.firstName} {p.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(() => {
                    const thaiDayName = getThaiDayName(dutyLogForm.date);
                    const assigned = dutyAssignments.find(a => a.dayOfWeek === thaiDayName);
                    if (assigned && assigned.teacherNames) {
                      return (
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <span>ครูเวรตามคำสั่ง ({thaiDayName}): <strong className="text-blue-700">{assigned.teacherNames}</strong></span>
                          {!dutyLogForm.dutyTeacherName && (
                            <button
                              type="button"
                              onClick={() => setDutyLogForm(prev => ({ ...prev, dutyTeacherName: assigned.teacherNames }))}
                              className="text-blue-600 hover:underline font-bold"
                            >
                              (ใช้ชื่อนี้)
                            </button>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Time Slots Section */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>ตารางบันทึกกิจกรรมและการปฏิบัติหน้าที่ตามช่วงเวลา</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const history = getLatestDutyLogHistory();
                      setDutyLogForm(prev => ({
                        ...prev,
                        timeSlots: history.latestSlots,
                        weatherCondition: history.latestWeather || prev.weatherCondition,
                        overallStatus: history.latestOverall || prev.overallStatus
                      }));
                      onShowToast('info', 'ดึงประวัติข้อความสำเร็จ', history.sourceDate ? `โหลดข้อความจากรายงานประจำวันที่ ${history.sourceDate} เรียบร้อยแล้ว` : 'โหลดประวัติข้อความล่าสุดที่เคยบันทึกเรียบร้อยแล้ว');
                    }}
                    className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                    title="คลิกเพื่อดึงข้อความรายละเอียดการบรรยายการปฏิบัติหน้าที่ล่าสุดที่เคยบันทึกไว้"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>✨ แสดงประวัติข้อความล่าสุดที่เคยกรอก</span>
                  </button>
                </div>

                {/* Table for Time & Description with Insert (+) Dividers */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs text-left">
                      <thead>
                        <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                          <th className="py-2.5 px-2 text-center w-10 sm:w-12 border-r border-slate-200">ลำดับ</th>
                          <th className="py-2.5 px-2 text-center w-24 sm:w-32 border-r border-slate-200">ช่วงเวลา</th>
                          <th className="py-2.5 px-3 border-r border-slate-200">
                            <span className="hidden sm:inline">รายละเอียดการบรรยายการปฏิบัติหน้าที่</span>
                            <span className="sm:hidden">รายละเอียด</span>
                          </th>
                          <th className="py-2.5 px-1 text-center w-12 sm:w-14">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {/* Top insertion line */}
                        <tr key="insert-top" className="group/insert">
                          <td colSpan={4} className="p-0 border-none bg-slate-50/20">
                            <div className="flex items-center justify-center relative py-0.5">
                              <div className="absolute inset-x-0 h-px bg-slate-200 group-hover/insert:bg-blue-400 transition-colors"></div>
                              <button
                                type="button"
                                onClick={() => handleInsertRow(0)}
                                className="relative z-10 w-5 h-5 rounded-full bg-white hover:bg-blue-600 text-slate-500 hover:text-white border border-slate-300 hover:border-blue-600 font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90"
                                title="แทรกแถวบนสุด (+)"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>

                        {dutyLogForm.timeSlots.map((slot, idx) => (
                          <React.Fragment key={slot.id || `slot-${idx}`}>
                            <tr className="hover:bg-blue-50/20 transition-colors">
                              <td className="py-2.5 px-2 text-center border-r border-slate-200 font-bold text-slate-600 align-top pt-3">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2.5 px-1.5 border-r border-slate-200 align-top pt-2.5">
                                <input
                                  type="text"
                                  value={slot.time}
                                  onChange={(e) => handleTimeSlotChange(idx, 'time', e.target.value)}
                                  placeholder="07:00 น."
                                  className="w-full text-[11px] font-bold text-blue-900 bg-blue-50/50 border border-blue-300 focus:border-blue-500 rounded-lg px-1 py-1 text-center font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                />
                              </td>
                              <td 
                                className="py-2.5 px-3 border-r border-slate-200 align-top pt-2 cursor-pointer group"
                                onClick={() => {
                                  setEditingSlotPopup({ index: idx, time: slot.time, description: slot.description });
                                }}
                                title="คลิกเพื่อเปิดหน้าต่างพิมพ์รายละเอียดขนาดใหญ่"
                              >
                                <div className="w-full text-xs p-2.5 bg-white group-hover:bg-blue-50/30 rounded-lg border border-slate-200 group-hover:border-blue-300 font-medium text-slate-800 leading-relaxed shadow-2xs min-h-[46px] flex items-center justify-between gap-2">
                                  <span className="line-clamp-3 sm:line-clamp-none flex-1">
                                    {slot.description ? slot.description : <span className="text-slate-400 italic">คลิกเพื่อพิมพ์รายละเอียด...</span>}
                                  </span>
                                  <span className="text-[10px] text-blue-600 font-bold shrink-0 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 sm:hidden">
                                    แก้ไข
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-1 text-center align-top pt-3">
                                <div className="flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTimeSlot(idx)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                    title="ลบช่วงเวลานี้"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Middle & Bottom row insertion divider line */}
                            <tr key={`insert-after-${idx}`} className="group/insert">
                              <td colSpan={4} className="p-0 border-none bg-slate-50/20">
                                <div className="flex items-center justify-center relative py-0.5">
                                  <div className="absolute inset-x-0 h-px bg-slate-200 group-hover/insert:bg-blue-400 transition-colors"></div>
                                  <button
                                    type="button"
                                    onClick={() => handleInsertRow(idx + 1)}
                                    className="relative z-10 w-5 h-5 rounded-full bg-white hover:bg-blue-600 text-slate-500 hover:text-white border border-slate-300 hover:border-blue-600 font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90"
                                    title={`แทรกแถวถัดจากลำดับที่ ${idx + 1} (+)`}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>สรุปภาพรวมและความเรียบร้อยประจำวัน</span>
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    เหตุการณ์ทั่วไป
                  </label>
                  <input
                    type="text"
                    value={dutyLogForm.weatherCondition}
                    onChange={(e) => setDutyLogForm({ ...dutyLogForm, weatherCondition: e.target.value })}
                    placeholder="กรอกสรุปเหตุการณ์ทั่วไป การปฏิบัติหน้าที่เรียบร้อยดี..."
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                  />
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  * เมื่อกดบันทึกแล้ว ข้อมูลจะถูกจัดเก็บในประวัติรายงานประจำวัน และสามารถพิมพ์รายงาน A4 ได้ตลอดเวลา
                </p>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={handleSaveDutyLog}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>บันทึกรายงานเวร</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: DUTY LOG HISTORY */}
          {dutyLogSubView === 'history' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-0">
              <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <h3 className="hidden sm:flex text-sm font-bold text-slate-800 items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>ประวัติรายงานการปฏิบัติหน้าที่ครูเวรประจำวัน ({filteredDutyLogs.length} รายการ)</span>
                </h3>
                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (filteredDutyLogs.length === 0) {
                        onShowToast('warning', 'ไม่มีข้อมูลรายงาน', 'ยังไม่มีประวัติรายงานการปฏิบัติหน้าที่ครูเวรสำหรับดาวน์โหลดทั้งหมด');
                        return;
                      }
                      setPreviewAllDutyLogs(true);
                      onShowToast('info', 'แสดงตัวอย่างรายงาน', 'เปิดหน้าตัวอย่างรายงานครูเวรทั้งหมดก่อนดาวน์โหลด/พิมพ์');
                    }}
                    className="px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ดาวน์โหลดทั้งหมด</span>
                    <span className="sm:hidden">ทั้งหมด</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetDutyFormToLatestHistory();
                      setDutyLogSubView('fill');
                    }}
                    className="px-2.5 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">+ กรอกรายงานเวรใหม่</span>
                    <span className="sm:hidden">+ เพิ่ม</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                      <th className="py-3 px-2 sm:px-4 w-28 sm:w-32">วันที่</th>
                      <th className="py-3 px-2 sm:px-4">ครูเวรผู้ปฏิบัติหน้าที่</th>
                      <th className="py-3 px-3 w-28 text-center hidden sm:table-cell">จำนวนช่วงเวลา</th>
                      <th className="py-3 px-4 hidden sm:table-cell">สรุปความเรียบร้อย</th>
                      <th className="py-3 px-2 sm:px-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDutyLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          ยังไม่มีประวัติการบันทึกสมุดรายงานครูเวร
                        </td>
                      </tr>
                    ) : (
                      filteredDutyLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-2 sm:px-4 font-bold text-blue-900 whitespace-nowrap">
                            <span className="hidden sm:inline">{log.date}</span>
                            <span className="sm:hidden">{formatIsoToThaiDisplay(log.date, 'short')}</span>
                          </td>
                          <td className="py-3 px-2 sm:px-4 font-bold text-slate-800">
                            {log.dutyTeacherName}
                          </td>
                          <td className="py-3 px-3 text-center font-bold hidden sm:table-cell">
                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 rounded-lg text-[11px] border border-blue-200">
                              {log.timeSlots.length} ช่วงเวลา
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 truncate max-w-xs hidden sm:table-cell">
                            {log.overallStatus}
                          </td>
                          <td className="py-3 px-2 sm:px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewDutyLog(log)}
                                className="p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                title="ดาวน์โหลดรายงาน A4"
                              >
                                <Download className="w-3.5 h-3.5 shrink-0" />
                                <span className="hidden sm:inline">ดาวน์โหลด</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDutyLogForm({
                                    id: log.id,
                                    date: log.date,
                                    dutyTeacherName: log.dutyTeacherName,
                                    dutyType: log.dutyType,
                                    location: log.location,
                                    weatherCondition: log.weatherCondition || 'ปกติ',
                                    overallStatus: log.overallStatus || '',
                                    timeSlots: log.timeSlots,
                                    incidentsNote: log.incidentsNote || ''
                                  });
                                  setDutyLogSubView('fill');
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="แก้ไข"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {/* Member does NOT have delete permission; Admin only */}
                              {user.role !== 'member' && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteDutyLog(log)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                  title="ลบรายงานครูเวร (เฉพาะ Admin)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


        </div>
      )}

      {/* MODAL: 100-DAY DUTY CALENDAR PICKER */}
      {isDutyCalendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-3.5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0 border border-sky-200/80 shadow-2xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    เลือกวันที่ปฏิบัติหน้าที่ (ปฏิทิน 100 วัน)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    เลือกวันเปิดเรียน 100 วันที่ Admin กำหนด (ภาคเรียนที่ {activeDutySem}/{activeDutyYr})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDutyCalendarModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Monthly Calendar View */}
            <div className="space-y-2.5">
              {/* Month Navigation & Title */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (dutyCalMonth === 0) {
                      setDutyCalMonth(11);
                      setDutyCalYear(y => y - 1);
                    } else {
                      setDutyCalMonth(m => m - 1);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-center font-bold text-sm text-slate-800">
                  {THAI_MONTHS_NAMES[dutyCalMonth]} {dutyCalYear + 543}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (dutyCalMonth === 11) {
                      setDutyCalMonth(0);
                      setDutyCalYear(y => y + 1);
                    } else {
                      setDutyCalMonth(m => m + 1);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Month Switcher Pills */}
              {dutyCalendarAvailableMonths.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100 scrollbar-none">
                  {dutyCalendarAvailableMonths.map(item => (
                    <button
                      key={`${item.year}-${item.month}`}
                      type="button"
                      onClick={() => {
                        setDutyCalMonth(item.month);
                        setDutyCalYear(item.year);
                      }}
                      className={`text-[10px] px-2.5 py-0.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                        dutyCalMonth === item.month && dutyCalYear === item.year
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center py-1 text-[11px] font-bold text-slate-400 border-b border-slate-100">
                <span className="text-rose-500">อา</span>
                <span>จ</span>
                <span>อ</span>
                <span>พ</span>
                <span>พฤ</span>
                <span>ศ</span>
                <span className="text-rose-500">ส</span>
              </div>

              {/* Month Grid Cells: ONLY 100 days clickable */}
              <div className="grid grid-cols-7 gap-1">
                {dutyCalendarCells.map((cell, idx) => {
                  if (!cell.isCurrentMonth) {
                    return <div key={`empty-${idx}`} className="h-9 w-full" />;
                  }

                  const isSelected = cell.dateStr === dutyLogForm.date;
                  const isRecorded = dutyLogs.some(l => l.date === cell.dateStr);

                  if (cell.isSchoolDay) {
                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        onClick={() => {
                          const dayName = getThaiDayName(cell.dateStr);
                          const assigned = dutyAssignments.find(a => a.dayOfWeek === dayName);
                          setDutyLogForm(prev => ({
                            ...prev,
                            date: cell.dateStr,
                            dutyTeacherName: prev.dutyTeacherName || assigned?.teacherNames || ''
                          }));
                          setIsDutyCalendarModalOpen(false);
                          onShowToast('success', 'เลือกวันที่สำเร็จ', `เลือกวันที่ ${formatThaiDate(cell.dateStr)} เรียบร้อยแล้ว`);
                        }}
                        className={`h-9 w-full rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-sm scale-105 z-10'
                            : isRecorded
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200'
                        }`}
                        title={`วันเปิดเรียน 100 วัน: ${formatThaiDate(cell.dateStr)} ${isRecorded ? '(บันทึกรายงานแล้ว)' : ''}`}
                      >
                        <span className="leading-tight">{cell.dayNum}</span>
                        {isRecorded && (
                          <span className={`w-1.5 h-1.5 rounded-full mt-0.5 shrink-0 ${isSelected ? 'bg-white' : 'bg-emerald-600'}`} />
                        )}
                      </button>
                    );
                  } else {
                    // วันหยุด / นอกปฏิทิน 100 วัน: วันอื่นกดไม่ได้
                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        disabled
                        className="h-9 w-full rounded-xl text-xs font-mono font-normal flex flex-col items-center justify-center bg-slate-100/60 text-slate-300 border border-slate-200/40 cursor-not-allowed opacity-40 select-none"
                        title="วันหยุด / นอกปฏิทิน 100 วัน (กดไม่ได้)"
                      >
                        <span className="leading-tight">{cell.dayNum}</span>
                      </button>
                    );
                  }
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-md bg-blue-600" />
                    <span>วันที่เลือก</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-md bg-sky-100 border border-sky-300" />
                    <span>วันเปิดเรียน (กดได้)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-md bg-emerald-100 border border-emerald-300" />
                    <span>บันทึกแล้ว</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-md bg-slate-100 border border-slate-200" />
                    <span>วันอื่น (กดไม่ได้)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LEAVE REQUEST */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>{editingLeaveId ? 'แก้ไขข้อมูลคำขอลา' : 'ยื่นคำขอลา'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsLeaveModalOpen(false);
                  setEditingLeaveId(null);
                }}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!leaveForm.reason.trim()) {
                  onShowToast('warning', 'กรุณากรอกเหตุผล', 'กรุณาระบุเหตุผลการลา');
                  return;
                }
                const finalLeaveType = leaveForm.leaveType === 'อื่นๆ' ? (leaveForm.customLeaveType.trim() || 'อื่นๆ') : leaveForm.leaveType;
                const finalSupervisorPosition = leaveForm.supervisorPosition.trim();
                const cleanApplicantName = formatThaiPersonName(leaveForm.teacherName);
                const cleanDirectorName = formatThaiPersonName(leaveForm.directorName);
                const cleanOfficerName = formatThaiPersonName(leaveForm.personnelOfficer);
                const cleanSupervisorName = formatThaiPersonName(leaveForm.supervisorName);

                const computedFiscalYear = selectedFiscalYear === 'all'
                  ? getThaiFiscalYear(leaveForm.startDate)
                  : Number(selectedFiscalYear);
                if (editingLeaveId) {
                  const targetRecord = leaveRequests.find(r => r.id === editingLeaveId);
                  const updatedReq: LeaveRequest = {
                    ...(targetRecord || {}),
                    id: editingLeaveId,
                    teacherName: cleanApplicantName,
                    leaveType: finalLeaveType,
                    startDate: leaveForm.startDate,
                    endDate: leaveForm.endDate,
                    reason: leaveForm.reason,
                    directorName: cleanDirectorName,
                    personnelOfficer: cleanOfficerName,
                    supervisorName: cleanSupervisorName,
                    supervisorPosition: finalSupervisorPosition,
                    fiscalYear: computedFiscalYear,
                    leaveRound: targetRecord?.leaveRound || effectiveLeaveRound,
                    status: targetRecord?.status || (isAdmin ? 'อนุมัติ' : 'รออนุมัติ'),
                    createdAt: targetRecord?.createdAt || new Date().toISOString()
                  };
                  const updated = StorageService.saveLeaveRequest(updatedReq);
                  setLeaveRequests(updated);
                  onShowToast('success', 'แก้ไขสำเร็จ', 'อัปเดตข้อมูลคำขอลาเรียบร้อยแล้ว');
                } else {
                  const newReq: LeaveRequest = {
                    id: 'leave-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
                    userId: user.id,
                    username: user.username,
                    teacherName: cleanApplicantName,
                    leaveType: finalLeaveType,
                    startDate: leaveForm.startDate,
                    endDate: leaveForm.endDate,
                    reason: leaveForm.reason,
                    directorName: cleanDirectorName,
                    personnelOfficer: cleanOfficerName,
                    supervisorName: cleanSupervisorName,
                    supervisorPosition: finalSupervisorPosition,
                    status: isAdmin ? 'อนุมัติ' : 'รออนุมัติ',
                    fiscalYear: computedFiscalYear,
                    leaveRound: effectiveLeaveRound,
                    createdAt: new Date().toISOString()
                  };
                  const updated = StorageService.saveLeaveRequest(newReq);
                  setLeaveRequests(updated);
                  onShowToast('success', 'ยื่นใบลาสำเร็จ', 'บันทึกคำขอลาเข้าสู่ระบบเรียบร้อยแล้ว');
                }
                setIsLeaveModalOpen(false);
                setEditingLeaveId(null);
              }}
              className="space-y-4 max-h-[80vh] overflow-y-auto pr-1"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAdmin ? 'ชื่อคุณครู / ผู้ขอลา' : 'ชื่อผู้ขอลา'}
                </label>
                {isAdmin ? (
                  <div className="space-y-1.5">
                    <select
                      value={personnel.some(p => formatThaiPersonName(`${p.prefix}${p.firstName} ${p.lastName}`) === formatThaiPersonName(leaveForm.teacherName)) ? formatThaiPersonName(leaveForm.teacherName) : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          setLeaveForm({ ...leaveForm, teacherName: formatThaiPersonName(e.target.value) });
                        }
                      }}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer bg-white"
                    >
                      <option value="">-- เลือกจากรายชื่อบุคลากร (หรือพิมพ์ด้านล่าง) --</option>
                      {personnel.map(p => {
                        const pName = formatThaiPersonName(`${p.prefix}${p.firstName} ${p.lastName}`);
                        return (
                          <option key={p.id} value={pName}>
                            {pName} ({p.position})
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="text"
                      required
                      value={leaveForm.teacherName}
                      onChange={(e) => setLeaveForm({ ...leaveForm, teacherName: e.target.value })}
                      onBlur={(e) => setLeaveForm({ ...leaveForm, teacherName: formatThaiPersonName(e.target.value) })}
                      placeholder="หรือพิมพ์ชื่อ-นามสกุล (เช่น นายอีรฟัน ...)"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>
                ) : (
                  <div className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 flex items-center justify-between">
                    <span>{formatThaiPersonName(user.fullName || leaveForm.teacherName)}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                      สมาชิกผู้ยื่นลา (ตนเอง)
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทการลา</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer mb-2"
                >
                  <option value="ลากิจ">ลากิจ</option>
                  <option value="ลาป่วย">ลาป่วย</option>
                  <option value="ลาคลอด">ลาคลอด</option>
                  <option value="อุปสมบท">อุปสมบท</option>
                  <option value="อื่นๆ">อื่นๆ (ระบุ)</option>
                </select>
                {leaveForm.leaveType === 'อื่นๆ' && (
                  <input
                    type="text"
                    required
                    value={leaveForm.customLeaveType}
                    onChange={(e) => setLeaveForm({ ...leaveForm, customLeaveType: e.target.value })}
                    placeholder="กรุณาระบุประเภทการลาอื่นๆ..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                )}
              </div>

              <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เสนอ/เรียน (ผู้บริหารคนที่1)</label>
                  <select
                    value={personnel.some(p => formatThaiPersonName(`${p.prefix}${p.firstName} ${p.lastName}`) === formatThaiPersonName(leaveForm.directorName)) ? formatThaiPersonName(leaveForm.directorName) : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setLeaveForm({ ...leaveForm, directorName: formatThaiPersonName(e.target.value) });
                      }
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer bg-white"
                  >
                    <option value="">-- เลือกจากข้อมูลบุคลากร --</option>
                    {personnel.map(p => {
                      const pName = formatThaiPersonName(`${p.prefix}${p.firstName} ${p.lastName}`);
                      return (
                        <option key={p.id} value={pName}>
                          {pName} ({p.position})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เสนอ/เรียน (ผู้บริหารคนที่2)</label>
                  <select
                    value={
                      personnel.some(
                        p => formatThaiPersonName(`${p.prefix}${p.firstName} ${p.lastName}`) === formatThaiPersonName(leaveForm.supervisorName)
                      )
                        ? formatThaiPersonName(leaveForm.supervisorName)
                        : ''
                    }
                    onChange={(e) => {
                      const selectedName = formatThaiPersonName(e.target.value);
                      if (!selectedName) {
                        setLeaveForm(prev => ({
                          ...prev,
                          supervisorName: '',
                          supervisorPosition: ''
                        }));
                        return;
                      }
                      const matchedP = personnel.find(
                        p => formatThaiPersonName(`${p.prefix}${p.firstName} ${p.lastName}`) === selectedName
                      );
                      const pPos = (matchedP?.position || '').trim();
                      setLeaveForm(prev => ({
                        ...prev,
                        supervisorName: selectedName,
                        supervisorPosition: pPos
                      }));
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer bg-white"
                  >
                    <option value="">-- เลือกบุคลากรจากข้อมูลบุคลากร --</option>
                    {personnel.map(p => {
                      const pName = formatThaiPersonName(`${p.prefix}${p.firstName} ${p.lastName}`);
                      return (
                        <option key={p.id} value={pName}>
                          {pName} ({p.position})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เจ้าหน้าที่งานบุคลากร</label>
                  <select
                    value={leaveForm.personnelOfficer}
                    onChange={(e) => setLeaveForm({ ...leaveForm, personnelOfficer: formatThaiPersonName(e.target.value) })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer bg-white"
                  >
                    <option value="">-- เลือกเจ้าหน้าที่งานบุคลากร --</option>
                    {(() => {
                      const eligibleOfficers = personnel.filter(p => 
                        p.department === 'บริหารงานบุคคล' || 
                        p.customDepartment === 'บริหารงานบุคคล' ||
                        p.personnelType === 'ผู้อำนวยการ' || 
                        p.personnelType === 'รองผู้อำนวยการ' ||
                        (p.position || '').includes('ผู้อำนวยการ') ||
                        (p.position || '').includes('รองผู้อำนวยการ') ||
                        (p.position || '').includes('บริหารงานบุคคล')
                      );
                      const displayList = eligibleOfficers.length > 0 ? eligibleOfficers : personnel;
                      return displayList.map(p => {
                        const pName = formatThaiPersonName(`${p.prefix}${p.firstName} ${p.lastName}`);
                        return (
                          <option key={p.id} value={pName}>
                            {pName} ({p.position}{p.department ? ` • ฝ่าย${p.department}` : ''})
                          </option>
                        );
                      });
                    })()}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ตั้งแต่วันที่ (พ.ศ.)</label>
                  <ThaiDatePicker
                    required
                    value={leaveForm.startDate}
                    onChange={(val) => setLeaveForm({ ...leaveForm, startDate: val })}
                    placeholder="ตั้งแต่วันที่ (พ.ศ.)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ถึงวันที่ (พ.ศ.)</label>
                  <ThaiDatePicker
                    required
                    align="right"
                    value={leaveForm.endDate}
                    onChange={(val) => setLeaveForm({ ...leaveForm, endDate: val })}
                    placeholder="ถึงวันที่ (พ.ศ.)"
                  />
                </div>
              </div>

              {/* Live Leave Round & Cumulative Leave Statistics Box */}
              {(() => {
                const modalFiscalYear = selectedFiscalYear === 'all'
                  ? getThaiFiscalYear(leaveForm.startDate)
                  : Number(selectedFiscalYear);
                const modalDays = calculateLeaveDaysCount(leaveForm.startDate, leaveForm.endDate);
                const targetTeacherClean = cleanTeacherName(leaveForm.teacherName);

                const priorLeaves = leaveRequests.filter(r => {
                  if (r.id === editingLeaveId) return false;
                  if (r.status === 'ไม่อนุมัติ') return false;
                  if (cleanTeacherName(r.teacherName) !== targetTeacherClean) return false;
                  const rFy = r.fiscalYear || getThaiFiscalYear(r.startDate || r.createdAt);
                  const rRound = getReqLeaveRound(r);
                  return rFy === modalFiscalYear && rRound === effectiveLeaveRound;
                });

                const priorDays = priorLeaves.reduce((sum, r) => sum + calculateLeaveDaysCount(r.startDate, r.endDate), 0);
                const priorSick = priorLeaves.filter(r => r.leaveType.includes('ป่วย')).reduce((sum, r) => sum + calculateLeaveDaysCount(r.startDate, r.endDate), 0);
                const priorPersonal = priorLeaves.filter(r => r.leaveType.includes('กิจ')).reduce((sum, r) => sum + calculateLeaveDaysCount(r.startDate, r.endDate), 0);
                const roundNumber = priorLeaves.length + 1;

                return (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 rounded-2xl p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 text-blue-900">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {effectiveLeaveRound === '1'
                            ? 'ครั้งที่ 1 (1 ตุลาคม – 31 มีนาคม)'
                            : 'ครั้งที่ 2 (1 เมษายน – 30 กันยายน)'}
                        </span>
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                        {priorLeaves.length === 0 ? '✨ ครั้งแรกในรอบนี้ (เริ่มนับ 1 ใหม่)' : `ครั้งที่ ${roundNumber} ในรอบนี้`}
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px] flex items-center justify-between">
                      <span>สถิติสะสมในรอบนี้ก่อนหน้า:</span>
                      <strong className="text-slate-800">{priorDays} วัน (ป่วย {priorSick} วัน, กิจ {priorPersonal} วัน)</strong>
                    </div>
                    <div className="text-blue-900 font-bold text-[11px] flex items-center justify-between pt-1 border-t border-blue-100">
                      <span>ยื่นลาครั้งนี้ ({modalDays} วัน):</span>
                      <span className="text-blue-800 font-black text-xs">สะสมรวมในรอบนี้จะเป็น {priorDays + modalDays} วัน</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เหตุผลการลา</label>
                <textarea
                  rows={3}
                  required
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="ระบุเหตุผลความจำเป็นในการลา..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsLeaveModalOpen(false);
                    setEditingLeaveId(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer active:scale-95"
                >
                  {editingLeaveId ? 'บันทึกการแก้ไข' : 'บันทึกยื่นคำขอ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: A4 OFFICIAL LEAVE FORM PREVIEW */}
      {previewLeave && (() => {
        const {
          createdDate,
          leaveDays,
          applicantFullName,
          teacherPosition,
          teacherPhone,
          isSick,
          isPersonal,
          isMaternity,
          isOther,
          priorSick,
          priorPersonal,
          priorMaternity,
          currSick,
          currPersonal,
          currMaternity,
          lastLeaveSick,
          lastLeavePersonal,
          lastLeaveMaternity,
          lastLeaveStartStr,
          lastLeaveEndStr,
          lastLeaveDaysStr,
          deputyName,
          deputyPosition,
          officerName,
          formattedSchoolName,
          directorFullName,
          directorPositionTitle,
          startDateThai,
          endDateThai,
          createdDateThai,
          isApproved,
        } = computeLeaveDocumentData(previewLeave);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
            <style dangerouslySetInnerHTML={{ __html: `
              @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');

              @page {
                size: A4 portrait;
                margin: 0;
              }

              #leave-official-a4-print, #leave-official-a4-print * {
                font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', sans-serif !important;
                box-sizing: border-box !important;
              }

              @media print {
                html, body {
                  width: 210mm !important;
                  height: 297mm !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }

                body * {
                  visibility: hidden !important;
                }

                #leave-official-a4-print, #leave-official-a4-print * {
                  visibility: visible !important;
                }

                #leave-official-a4-print {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 210mm !important;
                  min-width: 210mm !important;
                  max-width: 210mm !important;
                  height: 297mm !important;
                  min-height: 297mm !important;
                  max-height: 297mm !important;
                  margin: 0 !important;
                  padding: 25mm 15mm 7mm 15mm !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: white !important;
                  z-index: 999999 !important;
                  box-sizing: border-box !important;
                  display: flex !important;
                  flex-direction: column !important;
                  page-break-inside: avoid !important;
                  page-break-after: avoid !important;
                  break-inside: avoid !important;
                  break-after: avoid !important;
                  overflow: hidden !important;
                }

                #leave-official-a4-print h1 {
                  font-size: 19.5pt !important;
                  font-weight: 700 !important;
                }

                .no-print {
                  display: none !important;
                }
              }
            `}} />
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full my-auto flex flex-col max-h-[96vh] overflow-hidden">
              {/* Top Action Bar */}
              <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">ตัวอย่างแบบใบลา (หน้ากระดาษ A4 แนวตั้ง ขนาด 210 × 297 มม.)</h3>
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">ขนาดจริง 1:1</span>
                    </div>
                    <p className="text-xs text-slate-500">จำลองหน้ากระดาษ A4 แนวตั้งมาตรฐานราชการจริง เมื่อพิมพ์หรือบันทึก PDF จะได้ขนาด 1 หน้าพอดี</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteLeave(previewLeave)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
                      title="ลบรายการคำขอลานี้ (เฉพาะ Admin)"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>ลบรายการนี้</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isDownloadingLeavePdf}
                    onClick={handleDownloadLeavePdf}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-60"
                    title="ดาวน์โหลดเป็นไฟล์ PDF ทันที"
                  >
                    {isDownloadingLeavePdf ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{isDownloadingLeavePdf ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLeave(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable A4 Document View */}
              <div className="p-4 sm:p-8 overflow-auto bg-slate-300/80 flex justify-center flex-1">
                <div
                  id="leave-official-a4-print"
                  className="bg-white shadow-2xl border border-slate-300 text-black flex flex-col shrink-0 mx-auto box-border"
                  style={{
                    fontFamily: "'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', sans-serif",
                    width: '210mm',
                    minHeight: '297mm',
                    height: '297mm',
                    padding: leavePreviewDataUrl ? '0' : '25mm 15mm 7mm 15mm',
                    fontSize: '15.5pt',
                    lineHeight: '1.4',
                    boxSizing: 'border-box'
                  }}
                >
                  {leavePreviewDataUrl ? (
                    <img
                      src={leavePreviewDataUrl}
                      alt="ตัวอย่างแบบใบลา A4"
                      className="w-full h-full block select-none object-contain"
                    />
                  ) : (
                    <>
                      {/* Top Portion: Official Leave Letter Body */}
                      <div>
                        {/* Form Title */}
                        <h1 className="text-center font-bold text-[19.5pt] text-black tracking-normal" style={{ marginBottom: '0.5cm' }}>
                          แบบใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว
                        </h1>

                        {/* Date & Location (Right indented) */}
                        <div className="flex flex-col items-end pr-2 font-normal text-[15.5pt]" style={{ marginBottom: '1cm' }}>
                          <div className="flex items-baseline gap-1 w-[320px]">
                            <span className="shrink-0">เขียนที่</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black flex-1 text-center font-normal px-2 pb-0 leading-none">
                              {formattedSchoolName}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1 w-[390px] mt-1 font-normal">
                            <span className="shrink-0">วันที่</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black min-w-[38px] text-center font-normal px-1 pb-0 leading-none ml-1">
                              {createdDate.day || '\u00A0'}
                            </span>
                            <span className="shrink-0 ml-1.5">เดือน</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black min-w-[100px] text-center font-normal px-2 pb-0 leading-none ml-1">
                              {createdDate.month || '\u00A0'}
                            </span>
                            <span className="shrink-0 ml-1.5">พ.ศ.</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black min-w-[60px] text-center font-normal px-1 pb-0 leading-none ml-1">
                              {createdDate.year || '\u00A0'}
                            </span>
                          </div>
                        </div>

                        {/* Subject & Recipient */}
                        <div className="space-y-1.5 mb-3 font-normal text-[15.5pt]">
                          <div className="flex items-baseline">
                            <span className="font-bold w-14 shrink-0">เรื่อง</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 flex-1 font-normal ml-1 pb-0 leading-none">
                              {isPersonal ? 'ขอลากิจส่วนตัว' : isSick ? 'ขอลาป่วย' : isMaternity ? 'ขอลาคลอดบุตร' : `ขอ${previewLeave.leaveType}`}
                            </span>
                          </div>
                          <div className="flex items-baseline">
                            <span className="font-bold w-14 shrink-0">เรียน</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 flex-1 font-normal ml-1 pb-0 leading-none">
                              {directorPositionTitle}
                            </span>
                          </div>
                        </div>

                        {/* Applicant Information */}
                        <div className="space-y-1.5 mb-3 font-normal text-[15.5pt]">
                          <div className="flex items-baseline">
                            <span className="inline-block w-12 shrink-0"></span>
                            <span className="shrink-0">ข้าพเจ้า</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 flex-1 text-center font-normal ml-2 pb-0 leading-none">
                              {applicantFullName}
                            </span>
                            <span className="shrink-0 ml-3">ตำแหน่ง</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[190px] text-center font-normal ml-2 pb-0 leading-none">
                              {teacherPosition}
                            </span>
                          </div>
                          <div className="flex items-baseline">
                            <span className="shrink-0">สังกัด</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 flex-1 font-normal ml-2 pb-0 leading-none">
                              {schoolInfo.affiliation || formattedSchoolName || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษา'}
                            </span>
                          </div>
                        </div>

                        {/* Checkboxes with reasons */}
                        <div className="space-y-1.5 mb-3 font-normal text-[15.5pt]">
                          <div className="flex items-baseline">
                            <span className="shrink-0">ขอลา</span>
                            <span className="font-mono text-[16pt] ml-2 shrink-0 font-normal">({isSick ? ' ✓ ' : '   '})</span>
                            <span className="ml-1.5 shrink-0">ป่วย เนื่องจาก</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 flex-1 font-normal ml-2 pb-0 leading-none min-h-[1.2em]">
                              {isSick ? previewLeave.reason : '\u00A0'}
                            </span>
                          </div>
                          <div className="flex items-baseline pl-8">
                            <span className="font-mono text-[16pt] shrink-0 font-normal">({isPersonal ? ' ✓ ' : '   '})</span>
                            <span className="ml-1.5 shrink-0">กิจส่วนตัว เนื่องจาก</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 flex-1 font-normal ml-2 pb-0 leading-none min-h-[1.2em]">
                              {isPersonal ? previewLeave.reason : '\u00A0'}
                            </span>
                          </div>
                          <div className="flex items-baseline pl-8">
                            <span className="font-mono text-[16pt] shrink-0 font-normal">({isMaternity ? ' ✓ ' : '   '})</span>
                            <span className="ml-1.5 shrink-0">คลอดบุตร</span>
                            {isMaternity && previewLeave.reason ? (
                              <>
                                <span className="ml-2 shrink-0">เนื่องจาก</span>
                                <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 flex-1 font-normal ml-2 pb-0 leading-none min-h-[1.2em]">
                                  {previewLeave.reason}
                                </span>
                              </>
                            ) : (
                              <span className="inline-block border-b-[1.5px] border-dotted border-black flex-1 font-normal ml-2 pb-0 leading-none min-h-[1.2em]">&nbsp;</span>
                            )}
                          </div>
                          {isOther && (
                            <div className="flex items-baseline pl-8">
                              <span className="font-mono text-[16pt] shrink-0 font-normal">( ✓ )</span>
                              <span className="ml-1.5 shrink-0">{previewLeave.leaveType} เนื่องจาก</span>
                              <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 flex-1 font-normal ml-2 pb-0 leading-none min-h-[1.2em]">
                                {previewLeave.reason}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Leave Dates & Duration */}
                        <div className="mb-3 flex items-baseline font-normal text-[15.5pt]">
                          <span className="shrink-0">ตั้งแต่วันที่</span>
                          <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[155px] text-center font-normal ml-1 pb-0 leading-none">
                            {startDateThai}
                          </span>
                          <span className="shrink-0 ml-2">ถึงวันที่</span>
                          <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[155px] text-center font-normal ml-1 pb-0 leading-none">
                            {endDateThai}
                          </span>
                          <span className="shrink-0 ml-2">มีกำหนด</span>
                          <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[65px] text-center font-normal ml-1 pb-0 leading-none">
                            {leaveDays}
                          </span>
                          <span className="shrink-0 ml-2">วัน</span>
                        </div>

                        {/* Previous Leave History */}
                        <div className="space-y-1.5 mb-3 font-normal text-[15.5pt]">
                          <div className="flex items-baseline gap-2 font-normal flex-wrap">
                            <span>ข้าพเจ้าได้ลา</span>
                            <span className="font-mono text-[16pt] font-normal">({lastLeaveSick ? ' ✓ ' : '   '}) ป่วย</span>
                            <span className="font-mono text-[16pt] font-normal">({lastLeavePersonal ? ' ✓ ' : '   '}) กิจส่วนตัว</span>
                            <span className="font-mono text-[16pt] font-normal">({lastLeaveMaternity ? ' ✓ ' : '   '}) คลอดบุตร</span>
                            <span>ครั้งสุดท้ายตั้งแต่วันที่</span>
                          </div>
                          <div className="flex items-baseline font-normal">
                            <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[160px] text-center font-normal pb-0 leading-none">
                              {lastLeaveStartStr}
                            </span>
                            <span className="shrink-0 ml-2">ถึงวันที่</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[160px] text-center font-normal ml-1 pb-0 leading-none">
                              {lastLeaveEndStr}
                            </span>
                            <span className="shrink-0 ml-2">มีกำหนด</span>
                            <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[65px] text-center font-normal ml-1 pb-0 leading-none">
                              {lastLeaveDaysStr}
                            </span>
                            <span className="shrink-0 ml-2">วัน</span>
                          </div>
                        </div>

                        {/* Contact Phone */}
                        <div className="mb-3 flex items-baseline font-normal text-[15.5pt]">
                          <span className="shrink-0">ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่โทรศัพท์</span>
                          <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 flex-1 text-center font-normal ml-2 pb-0 leading-none">
                            {teacherPhone}
                          </span>
                        </div>

                        {/* Signature of Applicant */}
                        <div className="flex justify-end pr-6 mb-3 font-normal text-[15.5pt]">
                          <div className="w-72 text-center space-y-1 font-normal">
                            <p>ขอแสดงความนับถือ</p>
                            <div className="relative flex items-baseline justify-center pt-1.5">
                              <span className="inline-block border-b-[1.5px] border-dotted border-black w-44 pb-0 leading-none relative">
                                <span className="absolute right-full mr-1.5 bottom-0 whitespace-nowrap">(ลงชื่อ)</span>
                                {'\u00A0'}
                              </span>
                            </div>
                            <p className="pt-0.5">({formatDutySignatureName(applicantFullName)})</p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Section (2 Columns: Fiscal Year Stats & Approvals) */}
                      <div className="grid grid-cols-2 gap-5 mt-2.5 pt-1 font-normal text-[14pt]">
                        {/* Left Column: Fiscal Year Stats & Auditor */}
                        <div className="space-y-1 font-normal">
                          <div>
                            <h4 className="font-bold text-[14.5pt] mb-1 font-normal">สถิติการลาในปีงบประมาณนี้</h4>
                            <table className="w-full text-center border-collapse border border-black text-[13pt] font-normal">
                              <thead>
                                <tr className="border-b border-black">
                                  <th className="border-r border-black py-1 px-0.5 font-normal w-[24%]">ประเภทลา</th>
                                  <th className="border-r border-black py-1 px-0.5 font-normal w-[25%] leading-tight">ลามาแล้ว<br/>(วันทำการ)</th>
                                  <th className="border-r border-black py-1 px-0.5 font-normal w-[25%] leading-tight">ลาครั้งนี้<br/>(วันทำการ)</th>
                                  <th className="py-1 px-0.5 font-normal w-[26%] leading-tight">รวมเป็น<br/>(วันทำการ)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-black font-normal">
                                  <td className="border-r border-black py-0.5 px-0.5 text-center font-normal">ป่วย</td>
                                  <td className="border-r border-black py-0.5 px-0.5 font-mono font-normal">{priorSick}</td>
                                  <td className="border-r border-black py-0.5 px-0.5 font-mono font-normal">{currSick}</td>
                                  <td className="py-0.5 px-0.5 font-mono font-normal">{priorSick + currSick}</td>
                                </tr>
                                <tr className="border-b border-black font-normal">
                                  <td className="border-r border-black py-0.5 px-0.5 text-center font-normal">กิจส่วนตัว</td>
                                  <td className="border-r border-black py-0.5 px-0.5 font-mono font-normal">{priorPersonal}</td>
                                  <td className="border-r border-black py-0.5 px-0.5 font-mono font-normal">{currPersonal}</td>
                                  <td className="py-0.5 px-0.5 font-mono font-normal">{priorPersonal + currPersonal}</td>
                                </tr>
                                <tr className="font-normal">
                                  <td className="border-r border-black py-0.5 px-0.5 text-center font-normal">คลอดบุตร</td>
                                  <td className="border-r border-black py-0.5 px-0.5 font-mono font-normal">{priorMaternity}</td>
                                  <td className="border-r border-black py-0.5 px-0.5 font-mono font-normal">{currMaternity}</td>
                                  <td className="py-0.5 px-0.5 font-mono font-normal">{priorMaternity + currMaternity}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Auditor Signature - Position centered directly under (officerName) */}
                          <div className="space-y-0.5 text-center font-normal pt-1.5 pl-3">
                            <div className="flex items-baseline justify-center">
                              <span className="inline-block border-b-[1.5px] border-dotted border-black w-36 pb-0 leading-none relative">
                                <span className="absolute right-full mr-1.5 bottom-0 whitespace-nowrap">(ลงชื่อ)</span>
                                {'\u00A0'}
                                <span className="absolute left-full ml-1.5 bottom-0 whitespace-nowrap">ผู้ตรวจสอบ</span>
                              </span>
                            </div>
                            <p className="pt-0.5 text-center">( {formatDutySignatureName(officerName)} )</p>
                            <div className="flex items-baseline justify-center font-normal">
                              <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[165px] text-center pb-0 leading-none relative">
                                <span className="absolute right-full mr-1.5 bottom-0 whitespace-nowrap">ตำแหน่ง</span>
                                เจ้าหน้าที่งานบุคลากร
                              </span>
                            </div>
                            <div className="flex items-baseline justify-center font-normal">
                              <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[165px] text-center pb-0 leading-none relative">
                                <span className="absolute right-full mr-1.5 bottom-0 whitespace-nowrap">วันที่</span>
                                {createdDateThai}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Supervisor Comment & Director Order */}
                        <div className="space-y-1 pl-2 font-normal">
                          {/* Supervisor Comment - Position centered directly under (deputyName) */}
                          <div className="space-y-0.5 text-center font-normal">
                            <h4 className="font-bold text-[14.5pt] text-left mb-0.5">ความเห็นผู้บังคับบัญชา</h4>
                            <div className="text-left pl-2 font-normal flex items-baseline">
                              <span className="inline-block border-b-[1.5px] border-dotted border-black pr-6 pb-0 leading-none">เห็นควรอนุญาต</span>
                            </div>
                            <div className="pl-6 space-y-0.5">
                              <div className="flex items-baseline justify-center pt-1">
                                <span className="inline-block border-b-[1.5px] border-dotted border-black w-44 pb-0 leading-none relative">
                                  <span className="absolute right-full mr-1.5 bottom-0 whitespace-nowrap">(ลงชื่อ)</span>
                                  {'\u00A0'}
                                </span>
                              </div>
                              <p className="font-normal pt-0.5 text-center">( {formatDutySignatureName(deputyName)} )</p>
                              <div className="flex items-baseline justify-center font-normal">
                                <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[175px] text-center font-normal pb-0 leading-none relative">
                                  <span className="absolute right-full mr-1.5 bottom-0 whitespace-nowrap">ตำแหน่ง</span>
                                  {deputyPosition}
                                </span>
                              </div>
                              <div className="flex items-baseline justify-center font-normal">
                                <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[175px] text-center font-normal pb-0 leading-none relative">
                                  <span className="absolute right-full mr-1.5 bottom-0 whitespace-nowrap">วันที่</span>
                                  {createdDateThai}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Director Order - Position centered directly under (directorFullName) */}
                          <div className="space-y-0.5 text-center font-normal pt-1 border-t border-slate-300">
                            <h4 className="font-bold text-[14.5pt] text-left mb-0.5">คำสั่ง</h4>
                            <div className="flex items-center justify-start gap-6 pl-2 mb-0.5 font-normal">
                              <span className="font-mono font-normal">({isApproved ? ' ✓ ' : '   '}) อนุญาต</span>
                              <span className="font-mono font-normal">({!isApproved ? ' ✓ ' : '   '}) ไม่อนุญาต</span>
                            </div>
                            <div className="pl-6 space-y-0.5">
                              <div className="flex items-baseline justify-center pt-1">
                                <span className="inline-block border-b-[1.5px] border-dotted border-black w-44 pb-0 leading-none relative">
                                  <span className="absolute right-full mr-1.5 bottom-0 whitespace-nowrap">(ลงชื่อ)</span>
                                  {'\u00A0'}
                                </span>
                              </div>
                              <p className="font-normal pt-0.5 text-center">( {formatDutySignatureName(directorFullName)} )</p>
                              <div className="flex items-baseline justify-center font-normal">
                                <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[185px] text-center font-normal pb-0 leading-none relative">
                                  <span className="absolute right-full mr-1.5 bottom-0 whitespace-nowrap">ตำแหน่ง</span>
                                  {directorPositionTitle}
                                </span>
                              </div>
                              <div className="flex items-baseline justify-center font-normal">
                                <span className="inline-block border-b-[1.5px] border-dotted border-black px-2 min-w-[175px] text-center font-normal pb-0 leading-none relative">
                                  <span className="absolute right-full mr-1.5 bottom-0 whitespace-nowrap">วันที่</span>
                                  {createdDateThai}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: OFFICIAL DUTY REPORT A4 PREVIEW (SINGLE & ALL) */}
      {(() => {
        // Normalize date string to YYYY-MM-DD
        const normalizeDateToIso = (dStr?: string): string => {
          if (!dStr) return '';
          const dateClean = dStr.split('T')[0].trim();
          const parts = dateClean.split('-');
          if (parts.length === 3) {
            let y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            if (isNaN(y) || isNaN(m) || isNaN(d)) return dateClean;
            if (y > 2400) y -= 543;
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          }
          return dateClean;
        };

        // Helper to calculate student statistics by grade, pulling live from หน้าเช็กเวลา/เงินฝาก (StorageService.getStudents & StorageService.getAttendance)
        interface DutyStudentAttendanceItem {
          id: string;
          rollNumber?: number;
          fullName: string;
          gradeLevel: GradeLevel;
          gender: 'ชาย' | 'หญิง';
          status: 'present' | 'absent' | 'leave' | 'sick';
          statusLabel: string;
          note?: string;
          isRecorded: boolean;
        }

        const calculateDutyStudentStats = (logDateStr: string) => {
          const targetIso = normalizeDateToIso(logDateStr);

          // Pull live students and attendance from StorageService merged with props so data from หน้าเช็กเวลาเงินฝาก is always up-to-date
          const rawStorageStudents = StorageService.getStudents();
          const liveStudentsList: Student[] =
            rawStorageStudents && rawStorageStudents.length > 0 ? rawStorageStudents : effectiveStudents;

          const rawStorageAttendance = StorageService.getAttendance();
          const liveAttendanceMap = new Map<string, AttendanceRecord>();
          (effectiveAttendance || []).forEach(a => {
            if (a && a.date && a.studentId) {
              liveAttendanceMap.set(`${normalizeDateToIso(a.date)}_${a.studentId}`, a);
            }
          });
          (rawStorageAttendance || []).forEach(a => {
            if (a && a.date && a.studentId) {
              liveAttendanceMap.set(`${normalizeDateToIso(a.date)}_${a.studentId}`, a);
            }
          });
          const liveAttendanceList = Array.from(liveAttendanceMap.values());

          // Attendance records recorded in หน้าเช็กเวลาเงินฝาก for this specific day
          const dayAttendance = liveAttendanceList.filter(a => {
            const aIso = normalizeDateToIso(a.date);
            return aIso === targetIso || a.date === logDateStr;
          });

          // ตรวจสอบเพศจากคำนำหน้าโดยตรงเป็นหลัก (เด็กหญิง = หญิง, เด็กชาย = ชาย)
          const resolveStudentGender = (s: {
            gender?: string;
            prefix?: string;
            firstName?: string;
            fullName?: string;
          }): 'ชาย' | 'หญิง' => {
            const p = (s.prefix || '').trim();
            const combined = `${s.prefix || ''}${s.firstName || ''} ${s.fullName || ''}`.trim();

            if (
              p.startsWith('เด็กหญิง') ||
              p.startsWith('ด.ญ.') ||
              p.startsWith('ด.ญ') ||
              p.startsWith('นางสาว') ||
              p.startsWith('น.ส.') ||
              p.startsWith('นาง') ||
              p === 'ญ' ||
              p === 'หญิง' ||
              combined.startsWith('เด็กหญิง') ||
              combined.startsWith('ด.ญ.') ||
              combined.startsWith('ด.ญ') ||
              combined.startsWith('นางสาว') ||
              combined.startsWith('น.ส.') ||
              combined.includes('เด็กหญิง') ||
              combined.includes('ด.ญ.')
            ) {
              return 'หญิง';
            }

            if (
              p.startsWith('เด็กชาย') ||
              p.startsWith('ด.ช.') ||
              p.startsWith('ด.ช') ||
              p.startsWith('นาย') ||
              p === 'ช' ||
              p === 'ชาย' ||
              combined.startsWith('เด็กชาย') ||
              combined.startsWith('ด.ช.') ||
              combined.startsWith('ด.ช') ||
              combined.startsWith('นาย') ||
              combined.includes('เด็กชาย') ||
              combined.includes('ด.ช.')
            ) {
              return 'ชาย';
            }

            if (s.gender === 'หญิง') return 'หญิง';
            return 'ชาย';
          };

          const isFemale = (s: { gender?: string; prefix?: string; firstName?: string; fullName?: string }) =>
            resolveStudentGender(s) === 'หญิง';

          const normalizeNameKey = (str?: string) => (str || '').replace(/\s+/g, '').trim();

          const statusToThaiLabel = (st?: string) => {
            if (st === 'absent') return 'ขาดเรียน';
            if (st === 'sick') return 'ลาป่วย';
            if (st === 'leave') return 'ลากิจ';
            return 'มาเรียน';
          };

          const computeForGrade = (targetGrade: GradeLevel) => {
            const gradeStudents = [...liveStudentsList.filter(s => s.gradeLevel === targetGrade)].sort((a, b) => {
              if (a.rollNumber !== undefined && b.rollNumber !== undefined) return a.rollNumber - b.rollNumber;
              if (a.rollNumber !== undefined) return -1;
              if (b.rollNumber !== undefined) return 1;
              return (a.studentCode || '').localeCompare(b.studentCode || '');
            });

            let maleTotal = 0;
            let femaleTotal = 0;
            let malePresent = 0;
            let femalePresent = 0;
            let maleAbsent = 0;
            let femaleAbsent = 0;
            let checkedCount = 0;

            const presentStudents: DutyStudentAttendanceItem[] = [];
            const absentStudents: DutyStudentAttendanceItem[] = [];
            const matchedAttendanceIds = new Set<string>();

            gradeStudents.forEach(s => {
              const female = isFemale(s);
              const genderLabel: 'ชาย' | 'หญิง' = female ? 'หญิง' : 'ชาย';
              if (female) femaleTotal++;
              else maleTotal++;

              const sFullName = `${s.prefix || ''}${s.firstName || ''} ${s.lastName || ''}`.trim();
              const sNormName = normalizeNameKey(sFullName);

              const att = dayAttendance.find(
                a =>
                  a.studentId === s.id ||
                  (a.studentName && normalizeNameKey(a.studentName) === sNormName)
              );

              if (att) {
                matchedAttendanceIds.add(att.id || `${att.date}_${att.studentId}`);
                checkedCount++;
                if (att.status === 'absent' || att.status === 'leave' || att.status === 'sick') {
                  if (female) femaleAbsent++;
                  else maleAbsent++;
                  absentStudents.push({
                    id: s.id,
                    rollNumber: s.rollNumber,
                    fullName: sFullName,
                    gradeLevel: targetGrade,
                    gender: genderLabel,
                    status: att.status,
                    statusLabel: statusToThaiLabel(att.status),
                    note: att.note || '',
                    isRecorded: true
                  });
                } else {
                  if (female) femalePresent++;
                  else malePresent++;
                  presentStudents.push({
                    id: s.id,
                    rollNumber: s.rollNumber,
                    fullName: sFullName,
                    gradeLevel: targetGrade,
                    gender: genderLabel,
                    status: 'present',
                    statusLabel: 'มาเรียน',
                    note: att.note || '',
                    isRecorded: true
                  });
                }
              } else {
                // Default to present if not marked absent/sick/leave
                if (female) femalePresent++;
                else malePresent++;
                presentStudents.push({
                  id: s.id,
                  rollNumber: s.rollNumber,
                  fullName: sFullName,
                  gradeLevel: targetGrade,
                  gender: genderLabel,
                  status: 'present',
                  statusLabel: 'มาเรียน',
                  note: '',
                  isRecorded: false
                });
              }
            });

            // Also include any attendance records saved for targetGrade whose studentId wasn't in gradeStudents
            dayAttendance
              .filter(a => a.gradeLevel === targetGrade && !matchedAttendanceIds.has(a.id || `${a.date}_${a.studentId}`))
              .forEach(att => {
                const female = isFemale({ fullName: att.studentName });
                const genderLabel: 'ชาย' | 'หญิง' = female ? 'หญิง' : 'ชาย';
                if (female) femaleTotal++;
                else maleTotal++;
                checkedCount++;

                if (att.status === 'absent' || att.status === 'leave' || att.status === 'sick') {
                  if (female) femaleAbsent++;
                  else maleAbsent++;
                  absentStudents.push({
                    id: att.studentId,
                    fullName: (att.studentName || 'นักเรียน').trim(),
                    gradeLevel: targetGrade,
                    gender: genderLabel,
                    status: att.status,
                    statusLabel: statusToThaiLabel(att.status),
                    note: att.note || '',
                    isRecorded: true
                  });
                } else {
                  if (female) femalePresent++;
                  else malePresent++;
                  presentStudents.push({
                    id: att.studentId,
                    fullName: (att.studentName || 'นักเรียน').trim(),
                    gradeLevel: targetGrade,
                    gender: genderLabel,
                    status: 'present',
                    statusLabel: 'มาเรียน',
                    note: att.note || '',
                    isRecorded: true
                  });
                }
              });

            return {
              gradeLevel: targetGrade,
              maleTotal,
              femaleTotal,
              total: maleTotal + femaleTotal,
              malePresent,
              femalePresent,
              presentTotal: malePresent + femalePresent,
              maleAbsent,
              femaleAbsent,
              absentTotal: maleAbsent + femaleAbsent,
              checkedCount,
              presentStudents,
              absentStudents
            };
          };

          const activeGradeOptions = DUTY_REPORT_GRADE_OPTIONS.filter(opt =>
            effectiveDutyReportGrades.includes(opt.grade)
          );

          // Fallback if none matched
          const effectiveOptions = activeGradeOptions.length > 0
            ? activeGradeOptions
            : DUTY_REPORT_GRADE_OPTIONS.filter(opt => DEFAULT_DUTY_REPORT_GRADES.includes(opt.grade));

          type GradeStatResult = ReturnType<typeof computeForGrade>;
          const statsByGrade = new Map<GradeLevel, GradeStatResult>();
          effectiveOptions.forEach(opt => {
            statsByGrade.set(opt.grade, computeForGrade(opt.grade));
          });

          const sumStatsList = (list: GradeStatResult[]) => {
            return list.reduce(
              (acc, cur) => ({
                maleTotal: acc.maleTotal + cur.maleTotal,
                femaleTotal: acc.femaleTotal + cur.femaleTotal,
                total: acc.total + cur.total,
                malePresent: acc.malePresent + cur.malePresent,
                femalePresent: acc.femalePresent + cur.femalePresent,
                presentTotal: acc.presentTotal + cur.presentTotal,
                maleAbsent: acc.maleAbsent + cur.maleAbsent,
                femaleAbsent: acc.femaleAbsent + cur.femaleAbsent,
                absentTotal: acc.absentTotal + cur.absentTotal
              }),
              {
                maleTotal: 0,
                femaleTotal: 0,
                total: 0,
                malePresent: 0,
                femalePresent: 0,
                presentTotal: 0,
                maleAbsent: 0,
                femaleAbsent: 0,
                absentTotal: 0
              }
            );
          };

          const kindergartenOptions = effectiveOptions.filter(o => o.group === 'kindergarten');
          const kindergartenStatsList = kindergartenOptions.map(o => statsByGrade.get(o.grade)!);
          const statsKindergarten = sumStatsList(kindergartenStatsList);

          const primaryOptions = effectiveOptions.filter(o => o.group === 'primary');
          const primaryStatsList = primaryOptions.map(o => statsByGrade.get(o.grade)!);
          const statsPrimary = sumStatsList(primaryStatsList);

          const secondaryOptions = effectiveOptions.filter(o => o.group === 'secondary');
          const secondaryStatsList = secondaryOptions.map(o => statsByGrade.get(o.grade)!);
          const statsSecondary = sumStatsList(secondaryStatsList);

          const allSelectedStatsList = effectiveOptions.map(o => statsByGrade.get(o.grade)!);
          const statsAll = sumStatsList(allSelectedStatsList);

          const gradeBreakdown = effectiveOptions.map(opt => ({
            label: opt.label,
            shortLabel: opt.shortLabel,
            st: statsByGrade.get(opt.grade)!
          }));

          const allAbsentStudents: DutyStudentAttendanceItem[] = gradeBreakdown.flatMap(g => g.st.absentStudents);
          const allPresentStudents: DutyStudentAttendanceItem[] = gradeBreakdown.flatMap(g => g.st.presentStudents);

          const absentByReason = {
            absent: allAbsentStudents.filter(s => s.status === 'absent').length,
            sick: allAbsentStudents.filter(s => s.status === 'sick').length,
            leave: allAbsentStudents.filter(s => s.status === 'leave').length
          };

          return {
            statsByGrade,
            effectiveOptions,
            kindergartenOptions,
            primaryOptions,
            secondaryOptions,
            statsKindergarten,
            statsPrimary,
            statsSecondary,
            statsAll,
            gradeBreakdown,
            allAbsentStudents,
            allPresentStudents,
            absentByReason,
            totalRecordedInDay: dayAttendance.length
          };
        };

        const renderDutyOfficialSheet = (log: DailyDutyLog, index?: number) => {
          const dateParts = parseThaiDateParts(log.date);
          const stats = calculateDutyStudentStats(log.date);

          // ฟอนต์ตัวเลขสะอาดตา ไม่ใช้ขีดทับในเลข 0 (No slashed zero) และจัดหลักตัวเลขให้ตรงกันอย่างสวยงาม (ขาว-ดำ ตัวอักษรสีดำชัดเจน ห้ามตัวหนาเด็ดขาด)
          const cleanNumberStyle: React.CSSProperties = {
            fontFamily: "'Sarabun', 'TH Sarabun New', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"zero" 0',
            color: '#000000',
            fontWeight: 400
          };

          const whiteRowStyle: React.CSSProperties = {
            backgroundColor: '#ffffff',
            color: '#000000',
            fontWeight: 400
          };

          const bwCellStyle: React.CSSProperties = {
            backgroundColor: '#ffffff',
            color: '#000000',
            fontWeight: 400,
            border: '1px solid #000000'
          };

          const rawSchoolName = (schoolInfo.schoolName || 'บ้านไสโป๊ะ').trim();
          const formattedSchoolName = rawSchoolName.startsWith('โรงเรียน')
            ? rawSchoolName
            : `โรงเรียน${rawSchoolName}`;

          // ดึงข้อมูลผู้อำนวยการจากหน้าข้อมูลบุคลากร (Personnel) ตรงช่อง "ตำแหน่ง"
          const directorPerson = personnel.find(p =>
            (p.position || '').trim().includes('ผู้อำนวยการ') ||
            p.personnelType === 'ผู้อำนวยการ'
          );

          const directorFullName = directorPerson
            ? `${directorPerson.prefix || ''}${directorPerson.firstName} ${directorPerson.lastName}`.trim()
            : (schoolInfo.directorName || 'ผู้อำนวยการโรงเรียน');

          // ดึงข้อความตำแหน่งโดยตรงจากช่อง "ตำแหน่ง" ของบุคลากร (เช่น "ผู้อำนวยการโรงเรียนบ้านไสโป๊ะ")
          let directorPositionTitle = directorPerson?.position?.trim() || '';
          if (!directorPositionTitle) {
            directorPositionTitle = `ผู้อำนวยการ${formattedSchoolName}`;
          } else if (
            directorPositionTitle === 'ผู้อำนวยการ' ||
            directorPositionTitle === 'ผู้อำนวยการโรงเรียน'
          ) {
            directorPositionTitle = `ผู้อำนวยการ${formattedSchoolName}`;
          }

          return (
            <div className="space-y-3 flex flex-col justify-between flex-1 text-black font-normal bg-white" style={cleanNumberStyle}>
              <div className="space-y-3 text-black font-normal">
                {/* Header */}
                <div className="text-center space-y-1 text-black font-normal">
                  {/* Line 1: School Logo centered top (same size as ปพ.6) */}
                  <div className="text-center mx-auto mb-1">
                    {schoolInfo.logoUrl ? (
                      <img
                        src={schoolInfo.logoUrl}
                        alt="School Logo"
                        className="w-24 h-24 object-contain mx-auto"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-white border border-black flex items-center justify-center text-3xl mx-auto text-black font-normal" style={bwCellStyle}>
                        🏫
                      </div>
                    )}
                  </div>

                  {/* Line 2: Header Title */}
                  <h1 className="font-normal text-lg text-black tracking-wide" style={{ fontWeight: 400, color: '#000000' }}>
                    รายงานการปฏิบัติหน้าที่ครูเวรประจำวัน
                  </h1>

                  {/* Line 3: School Name & Affiliation */}
                  <h2 className="font-normal text-sm text-black" style={{ fontWeight: 400, color: '#000000' }}>
                    {formattedSchoolName} {schoolInfo.affiliation || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษา'}
                  </h2>

                  {/* Line 4: Date, Month, Year */}
                  <div className="flex items-center justify-center gap-2 text-sm text-black font-normal pt-0.5" style={{ fontWeight: 400, color: '#000000' }}>
                    <span className="font-normal text-black">ประจำวันที่ {dateParts.day} เดือน {dateParts.month} พ.ศ. {dateParts.year}</span>
                  </div>
                </div>

                {/* Student Statistics Table (3 Topics: 1. นักเรียนทั้งหมด, 2. นักเรียนที่มา, 3. นักเรียนที่ขาด) */}
                <div>
                  <table className="w-full text-center border-collapse border border-black text-[12px] text-black font-normal bg-white" style={{ ...cleanNumberStyle, borderCollapse: 'collapse', border: '1px solid #000000', backgroundColor: '#ffffff' }}>
                    <thead>
                      <tr className="bg-white border-b border-black text-black font-normal" style={whiteRowStyle}>
                        <th rowSpan={2} className="border border-black p-1 font-normal text-black align-middle bg-white" style={bwCellStyle}>ระดับชั้น</th>
                        <th colSpan={3} className="border border-black p-1 font-normal text-black bg-white" style={bwCellStyle}>1. นักเรียนทั้งหมด</th>
                        <th colSpan={3} className="border border-black p-1 font-normal text-black bg-white" style={bwCellStyle}>2. นักเรียนที่มา</th>
                        <th colSpan={3} className="border border-black p-1 font-normal text-black bg-white" style={bwCellStyle}>3. นักเรียนที่ขาด</th>
                      </tr>
                      <tr className="bg-white border-b border-black text-[11px] text-black font-normal" style={whiteRowStyle}>
                        <th className="border border-black p-0.5 font-normal text-black bg-white" style={bwCellStyle}>ชาย</th>
                        <th className="border border-black p-0.5 font-normal text-black bg-white" style={bwCellStyle}>หญิง</th>
                        <th className="border border-black p-0.5 font-normal text-black bg-white" style={bwCellStyle}>รวม</th>
                        <th className="border border-black p-0.5 font-normal text-black bg-white" style={bwCellStyle}>ชาย</th>
                        <th className="border border-black p-0.5 font-normal text-black bg-white" style={bwCellStyle}>หญิง</th>
                        <th className="border border-black p-0.5 font-normal text-black bg-white" style={bwCellStyle}>รวม</th>
                        <th className="border border-black p-0.5 font-normal text-black bg-white" style={bwCellStyle}>ชาย</th>
                        <th className="border border-black p-0.5 font-normal text-black bg-white" style={bwCellStyle}>หญิง</th>
                        <th className="border border-black p-0.5 font-normal text-black bg-white" style={bwCellStyle}>รวม</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums text-black font-normal bg-white">
                      {/* 1. ระดับอนุบาล (อ.1 - อ.3) */}
                      {stats.kindergartenOptions.map(opt => {
                        const st = stats.statsByGrade.get(opt.grade);
                        if (!st) return null;
                        return (
                          <tr key={opt.grade} className="border-b border-black bg-white text-black font-normal" style={whiteRowStyle}>
                            <td className="border border-black p-1 text-left font-normal text-black pl-2 bg-white" style={bwCellStyle}>{opt.label}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.maleTotal : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.femaleTotal : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.malePresent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.femalePresent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.presentTotal}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.maleAbsent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.femaleAbsent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.absentTotal}</td>
                          </tr>
                        );
                      })}
                      {/* แถวสรุปรวมอนุบาล (ถ้ามีระดับชั้นอนุบาลที่เลือก) */}
                      {stats.kindergartenOptions.length > 0 && (
                        <tr className="border-b border-black bg-white text-black font-normal" style={whiteRowStyle}>
                          <td className="border border-black p-1 text-left pl-2 font-normal text-black bg-white" style={bwCellStyle}>รวมอนุบาล</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsKindergarten.maleTotal}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsKindergarten.femaleTotal}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsKindergarten.total}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsKindergarten.malePresent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsKindergarten.femalePresent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsKindergarten.presentTotal}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsKindergarten.maleAbsent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsKindergarten.femaleAbsent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsKindergarten.absentTotal}</td>
                        </tr>
                      )}

                      {/* 2. ระดับประถมศึกษา (ป.1 - ป.6) */}
                      {stats.primaryOptions.map(opt => {
                        const st = stats.statsByGrade.get(opt.grade);
                        if (!st) return null;
                        return (
                          <tr key={opt.grade} className="border-b border-black bg-white text-black font-normal" style={whiteRowStyle}>
                            <td className="border border-black p-1 text-left font-normal text-black pl-2 bg-white" style={bwCellStyle}>{opt.label}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.maleTotal : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.femaleTotal : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.malePresent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.femalePresent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.presentTotal}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.maleAbsent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.femaleAbsent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.absentTotal}</td>
                          </tr>
                        );
                      })}
                      {/* แถวสรุปรวมประถม (ถ้ามีระดับชั้นประถมที่เลือก) */}
                      {stats.primaryOptions.length > 0 && (
                        <tr className="border-b border-black bg-white text-black font-normal" style={whiteRowStyle}>
                          <td className="border border-black p-1 text-left pl-2 font-normal text-black bg-white" style={bwCellStyle}>รวมประถม</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsPrimary.maleTotal}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsPrimary.femaleTotal}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsPrimary.total}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsPrimary.malePresent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsPrimary.femalePresent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsPrimary.presentTotal}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsPrimary.maleAbsent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsPrimary.femaleAbsent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsPrimary.absentTotal}</td>
                        </tr>
                      )}

                      {/* 3. ระดับมัธยมศึกษาตอนต้น (ม.1 - ม.3) */}
                      {stats.secondaryOptions.map(opt => {
                        const st = stats.statsByGrade.get(opt.grade);
                        if (!st) return null;
                        return (
                          <tr key={opt.grade} className="border-b border-black bg-white text-black font-normal" style={whiteRowStyle}>
                            <td className="border border-black p-1 text-left font-normal text-black pl-2 bg-white" style={bwCellStyle}>{opt.label}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.maleTotal : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.femaleTotal : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.malePresent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.femalePresent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.presentTotal}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.maleAbsent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.total > 0 ? st.femaleAbsent : 0}</td>
                            <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{st.absentTotal}</td>
                          </tr>
                        );
                      })}
                      {/* แถวสรุปรวมมัธยม (ถ้ามีระดับชั้นมัธยมที่เลือก) */}
                      {stats.secondaryOptions.length > 0 && (
                        <tr className="border-b border-black bg-white text-black font-normal" style={whiteRowStyle}>
                          <td className="border border-black p-1 text-left pl-2 font-normal text-black bg-white" style={bwCellStyle}>รวมมัธยม</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsSecondary.maleTotal}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsSecondary.femaleTotal}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsSecondary.total}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsSecondary.malePresent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsSecondary.femalePresent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsSecondary.presentTotal}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsSecondary.maleAbsent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsSecondary.femaleAbsent}</td>
                          <td className="border border-black p-1 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsSecondary.absentTotal}</td>
                        </tr>
                      )}

                      {/* รวมทั้งหมด (Grand Total) */}
                      <tr className="border-b border-black bg-white text-black font-normal" style={whiteRowStyle}>
                        <td className="border border-black p-1.5 text-left pl-2 font-normal text-black bg-white" style={bwCellStyle}>รวมทั้งหมด</td>
                        <td className="border border-black p-1.5 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsAll.maleTotal}</td>
                        <td className="border border-black p-1.5 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsAll.femaleTotal}</td>
                        <td className="border border-black p-1.5 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsAll.total}</td>
                        <td className="border border-black p-1.5 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsAll.malePresent}</td>
                        <td className="border border-black p-1.5 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsAll.femalePresent}</td>
                        <td className="border border-black p-1.5 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsAll.presentTotal}</td>
                        <td className="border border-black p-1.5 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsAll.maleAbsent}</td>
                        <td className="border border-black p-1.5 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsAll.femaleAbsent}</td>
                        <td className="border border-black p-1.5 tabular-nums font-normal text-black bg-white" style={bwCellStyle}>{stats.statsAll.absentTotal}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Time Slots Table */}
                <div className="mt-2.5">
                  <h3 className="font-normal text-xs mb-1 text-black" style={{ fontWeight: 400, color: '#000000' }}>
                    บันทึกการปฏิบัติหน้าที่ตามช่วงเวลา
                  </h3>
                  <table className="w-full text-left border-collapse border border-black text-[13px] text-black font-normal bg-white" style={{ ...cleanNumberStyle, borderCollapse: 'collapse', border: '1px solid #000000', backgroundColor: '#ffffff' }}>
                    <thead>
                      <tr className="bg-white border-b border-black text-black font-normal" style={whiteRowStyle}>
                        <th className="border border-black p-1.5 text-center w-12 font-normal text-black bg-white" style={bwCellStyle}>ลำดับ</th>
                        <th className="border border-black p-1.5 text-center w-28 font-normal text-black bg-white" style={bwCellStyle}>ช่วงเวลา</th>
                        <th className="border border-black p-1.5 font-normal text-black bg-white" style={bwCellStyle}>รายละเอียดการปฏิบัติหน้าที่</th>
                      </tr>
                    </thead>
                    <tbody className="text-black font-normal bg-white">
                      {log.timeSlots.map((slot, idx) => (
                        <tr key={slot.id || idx} className="border-b border-black bg-white text-black font-normal" style={whiteRowStyle}>
                          <td className="border border-black p-1.5 text-center tabular-nums align-middle font-normal text-black bg-white" style={bwCellStyle}>{idx + 1}</td>
                          <td className="border border-black p-1.5 text-center font-normal tabular-nums whitespace-nowrap align-middle text-black bg-white" style={bwCellStyle}>{slot.time}</td>
                          <td className="border border-black p-1.5 leading-relaxed align-middle font-normal text-black bg-white" style={bwCellStyle}>{slot.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Observations */}
                <div className="border border-black p-2 text-[12px] bg-white text-black font-normal" style={bwCellStyle}>
                  <div className="font-normal text-black">
                    <span className="font-normal text-black">สรุปภาพรวมการปฏิบัติหน้าที่:</span> {log.overallStatus || 'การปฏิบัติหน้าที่เรียบร้อยดี'}
                  </div>
                  {log.incidentsNote && (
                    <div className="mt-1 font-normal text-black">
                      <span className="font-normal text-black">หมายเหตุ / เหตุการณ์พิเศษ:</span> {log.incidentsNote}
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures Section */}
              <div className="grid grid-cols-2 gap-8 mt-auto pt-4 pb-0 text-center text-[12px] text-black font-normal" style={{ fontWeight: 400, color: '#000000', marginBottom: 0 }}>
                <div className="space-y-1 text-black font-normal" style={{ lineHeight: 1.35 }}>
                  <p className="font-normal text-black m-0">ลงชื่อ ...........................................................</p>
                  <p className="font-normal text-black m-0">( {formatDutySignatureName(log.dutyTeacherName)} )</p>
                  <p className="font-normal text-black m-0">ครูเวรผู้รายงาน</p>
                </div>

                <div className="space-y-1 text-black font-normal" style={{ lineHeight: 1.35 }}>
                  <p className="font-normal text-black m-0">ลงชื่อ ...........................................................</p>
                  <p className="font-normal text-black m-0">( {formatDutySignatureName(directorFullName)} )</p>
                  <p className="font-normal text-black m-0">{directorPositionTitle}</p>
                </div>
              </div>
            </div>
          );
        };

        return (
          <>
            {/* 1. SINGLE DUTY REPORT MODAL */}
            {previewDutyLog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
                <style dangerouslySetInnerHTML={{ __html: `
                  #duty-official-a4-print, #duty-official-a4-print * {
                    font-weight: 400 !important;
                    color: #000000 !important;
                  }
                  #duty-official-a4-print th, #duty-official-a4-print td {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    border: 1px solid #000000 !important;
                  }
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #duty-official-a4-print, #duty-official-a4-print * {
                      visibility: visible !important;
                      font-weight: 400 !important;
                      color: #000000 !important;
                    }
                    #duty-official-a4-print {
                      position: fixed !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100vw !important;
                      height: auto !important;
                      margin: 0 !important;
                      padding: 10mm 12mm 20mm 12mm !important;
                      border: none !important;
                      box-shadow: none !important;
                      background: white !important;
                      z-index: 999999 !important;
                      font-family: 'Sarabun', 'TH Sarabun New', serif !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                  }
                `}} />

                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full my-auto flex flex-col max-h-[96vh] overflow-hidden">
                  {/* Top Action Bar */}
                  <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">ตัวอย่างแบบรายงานการปฏิบัติหน้าที่ครูเวร (ขนาด A4)</h3>
                        <p className="text-xs text-slate-500">
                          ประจำวันที่ {formatThaiDate(previewDutyLog.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isDownloadingDutyPdf}
                        onClick={() => handleDownloadDutyPdf(previewDutyLog)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-60"
                        title="ดาวน์โหลดเป็นไฟล์ PDF ทันที"
                      >
                        {isDownloadingDutyPdf ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>{isDownloadingDutyPdf ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDutyLog(null)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable A4 Document View */}
                  <div className="p-4 sm:p-8 overflow-auto bg-slate-200/60 flex justify-center flex-1">
                    <div
                      id="duty-official-a4-print"
                      className="duty-a4-sheet bg-white shadow-xl border border-slate-300 text-black font-normal leading-tight text-[12px] flex flex-col justify-between shrink-0 mx-auto box-border"
                      style={{
                        fontFamily: "'Sarabun', 'TH Sarabun New', serif",
                        width: '210mm',
                        minWidth: '210mm',
                        minHeight: '297mm',
                        padding: '10mm 12mm 20mm 12mm',
                        boxSizing: 'border-box',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        fontWeight: 400
                      }}
                    >
                      {renderDutyOfficialSheet(previewDutyLog)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ALL DUTY REPORTS MODAL (ดาวน์โหลดทั้งหมด) */}
            {previewAllDutyLogs && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
                <style dangerouslySetInnerHTML={{ __html: `
                  #duty-all-official-a4-print, #duty-all-official-a4-print * {
                    font-weight: 400 !important;
                    color: #000000 !important;
                  }
                  #duty-all-official-a4-print th, #duty-all-official-a4-print td {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    border: 1px solid #000000 !important;
                  }
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #duty-all-official-a4-print, #duty-all-official-a4-print * {
                      visibility: visible !important;
                      font-weight: 400 !important;
                      color: #000000 !important;
                    }
                    #duty-all-official-a4-print {
                      position: static !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      border: none !important;
                      box-shadow: none !important;
                      background: white !important;
                      z-index: 999999 !important;
                      font-family: 'Sarabun', 'TH Sarabun New', serif !important;
                    }
                    .duty-a4-all-sheet {
                      width: 210mm !important;
                      min-height: 297mm !important;
                      height: auto !important;
                      margin: 0 auto !important;
                      padding: 10mm 12mm 20mm 12mm !important;
                      page-break-after: always !important;
                      break-after: page !important;
                      box-shadow: none !important;
                      border: none !important;
                      box-sizing: border-box !important;
                      display: flex !important;
                      flex-direction: column !important;
                      justify-content: space-between !important;
                    }
                    .duty-a4-all-sheet:last-child {
                      page-break-after: auto !important;
                      break-after: auto !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                  }
                `}} />

                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full my-auto flex flex-col max-h-[96vh] overflow-hidden">
                  {/* Top Action Bar */}
                  <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">ตัวอย่างรายงานการปฏิบัติหน้าที่ครูเวรทั้งหมด ({filteredDutyLogs.length} รายการ)</h3>
                        <p className="text-xs text-slate-500">ตรวจสอบตัวอย่างก่อนดาวน์โหลดเป็นไฟล์ PDF (รูปแบบ A4 สมบูรณ์ตรงกับหน้าตัวอย่าง 100%)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isDownloadingDutyPdf}
                        onClick={handleDownloadAllDutyPdf}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-60"
                        title="ดาวน์โหลดเป็นไฟล์ PDF ทันที"
                      >
                        {isDownloadingDutyPdf ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>{isDownloadingDutyPdf ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewAllDutyLogs(false)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable A4 Document View */}
                  <div className="p-4 sm:p-8 overflow-auto bg-slate-200/60 flex justify-center flex-1">
                    <div
                      id="duty-all-official-a4-print"
                      className="w-full space-y-8 print:space-y-0"
                    >
                      {filteredDutyLogs.map((log, index) => (
                        <div
                          key={log.id || index}
                          className="duty-a4-sheet duty-a4-all-sheet bg-white shadow-xl border border-slate-300 text-black font-normal leading-tight text-[12px] flex flex-col justify-between mx-auto print:border-none print:shadow-none shrink-0 box-border"
                          style={{
                            fontFamily: "'Sarabun', 'TH Sarabun New', serif",
                            width: '210mm',
                            minWidth: '210mm',
                            minHeight: '297mm',
                            padding: '10mm 12mm 20mm 12mm',
                            boxSizing: 'border-box',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            fontWeight: 400
                          }}
                        >
                          {renderDutyOfficialSheet(log, index)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* MODAL: CONFIRM DELETE DUTY LOG (ถามยืนยันทุกครั้งเสมอ - Admin เท่านั้น) */}
      {confirmDeleteDutyLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">
                ยืนยันการลบรายงานครูเวร
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                คุณต้องการลบรายงานการปฏิบัติหน้าที่ครูเวรประจำวันที่{' '}
                <span className="font-bold text-slate-900">{formatThaiDate(confirmDeleteDutyLog.date)}</span> ของ{' '}
                <span className="font-bold text-slate-900">{confirmDeleteDutyLog.dutyTeacherName}</span> ใช่หรือไม่?
              </p>
              <p className="text-[11px] text-rose-600 font-medium">
                เมื่อลบแล้วจะไม่สามารถกู้คืนข้อมูลได้
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteDutyLog(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = confirmDeleteDutyLog.id;
                  const targetDate = confirmDeleteDutyLog.date;
                  const remaining = dutyLogs.filter(l => l.id !== targetId);
                  StorageService.setDailyDutyLogs(remaining);
                  const updated = StorageService.deleteDailyDutyLog(targetId);
                  setDutyLogs(updated);
                  if (previewDutyLog && previewDutyLog.id === targetId) {
                    setPreviewDutyLog(null);
                  }
                  setConfirmDeleteDutyLog(null);
                  onShowToast('info', 'ลบสำเร็จ', `ลบรายงานครูเวรประจำวันที่ ${targetDate} เรียบร้อยแล้ว`);
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

      {/* MODAL: Confirmation for Leave Deletion (Admin Only, asks confirmation every time) */}
      {confirmDeleteLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                ยืนยันการลบรายการคำขอลา
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                คุณต้องการลบรายการ{confirmDeleteLeave.leaveType} ของ{' '}
                <span className="font-bold text-slate-900">{confirmDeleteLeave.teacherName}</span>{' '}
                (ตั้งแต่วันที่ {formatIsoToThaiDisplay(confirmDeleteLeave.startDate, 'short')} ถึง {formatIsoToThaiDisplay(confirmDeleteLeave.endDate, 'short')}) ใช่หรือไม่?
              </p>
              <p className="text-[11px] text-rose-600 font-medium">
                เมื่อลบแล้วจะไม่สามารถกู้คืนข้อมูลได้
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteLeave(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = confirmDeleteLeave.id;
                  const targetTeacher = confirmDeleteLeave.teacherName;
                  const next = StorageService.deleteLeaveRequest(targetId);
                  setLeaveRequests(next);
                  if (previewLeave && previewLeave.id === targetId) {
                    setPreviewLeave(null);
                  }
                  setConfirmDeleteLeave(null);
                  onShowToast('info', 'ลบสำเร็จ', `ลบรายการคำขอลาของ ${targetTeacher} เรียบร้อยแล้ว`);
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
      {isDutyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <span>{editingDutyId ? 'แก้ไขข้อมูลครูเวร' : 'กำหนดครูเวรประจำวัน'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDutyModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!dutyForm.teacherNames.trim()) {
                  onShowToast('warning', 'กรุณากรอกรายชื่อ', 'กรุณาระบุรายชื่อคุณครูผู้ปฏิบัติหน้าที่เวร');
                  return;
                }
                if (editingDutyId) {
                  const updated = dutyAssignments.map(d => d.id === editingDutyId ? dutyForm : d);
                  StorageService.setDutyAssignments(updated);
                  StorageService.saveDutyAssignment(dutyForm);
                  setDutyAssignments(updated);
                  onShowToast('success', 'แก้ไขสำเร็จ', 'อัปเดตข้อมูลตารางครูเวรเรียบร้อยแล้ว');
                } else {
                  const newDuty: DutyAssignment = {
                    ...dutyForm,
                    id: 'duty-' + Date.now()
                  };
                  const updated = [...dutyAssignments, newDuty];
                  StorageService.setDutyAssignments(updated);
                  StorageService.saveDutyAssignment(newDuty);
                  setDutyAssignments(updated);
                  onShowToast('success', 'บันทึกสำเร็จ', 'เพิ่มตารางครูเวรเข้าสู่ระบบเรียบร้อยแล้ว');
                }
                setIsDutyModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">วันประจำสัปดาห์</label>
                <select
                  value={dutyForm.dayOfWeek}
                  onChange={(e) => setDutyForm({ ...dutyForm, dayOfWeek: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
                >
                  <option value="วันจันทร์">วันจันทร์</option>
                  <option value="วันอังคาร">วันอังคาร</option>
                  <option value="วันพุธ">วันพุธ</option>
                  <option value="วันพฤหัสบดี">วันพฤหัสบดี</option>
                  <option value="วันศุกร์">วันศุกร์</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทเวร</label>
                <select
                  value={dutyForm.dutyType}
                  onChange={(e) => setDutyForm({ ...dutyForm, dutyType: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
                >
                  <option value="ครูเวรประจำวัน">ครูเวรประจำวัน</option>
                  <option value="เวรยามรักษาความปลอดภัย">เวรยามรักษาความปลอดภัย</option>
                  <option value="เวรโภชนาการ">เวรโภชนาการ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รายชื่อคุณครูผู้ปฏิบัติหน้าที่</label>
                <input
                  type="text"
                  required
                  value={dutyForm.teacherNames}
                  onChange={(e) => setDutyForm({ ...dutyForm, teacherNames: e.target.value })}
                  placeholder="เช่น นายวิชัย สุวรรณมาลา, นางสาวสมใจ รักเรียน"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">จุดปฏิบัติหน้าที่</label>
                <input
                  type="text"
                  required
                  value={dutyForm.location}
                  onChange={(e) => setDutyForm({ ...dutyForm, location: e.target.value })}
                  placeholder="เช่น หน้าประตูโรงเรียน / อาคาร 1 / โรงอาหาร"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ / คำสั่งเพิ่มเติม</label>
                <input
                  type="text"
                  value={dutyForm.note || ''}
                  onChange={(e) => setDutyForm({ ...dutyForm, note: e.target.value })}
                  placeholder="เช่น ปฏิบัติหน้าที่เวลา 07:30 - 16:30 น."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDutyModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer active:scale-95"
                >
                  บันทึกตารางเวร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* POPUP MODAL: EDIT TIME SLOT DESCRIPTION */}
      {editingSlotPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>แก้ไขรายละเอียดช่วงเวลา: {editingSlotPopup.time || 'ช่วงเวลา'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSlotPopup(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ช่วงเวลา</label>
                <input
                  type="text"
                  value={editingSlotPopup.time}
                  onChange={(e) => setEditingSlotPopup({ ...editingSlotPopup, time: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-blue-50/50 text-blue-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">รายละเอียดการปฏิบัติหน้าที่</label>
                  <button
                    type="button"
                    onClick={() => {
                      const history = getLatestDutyLogHistory();
                      const matchedSlot = history.latestSlots.find(s => s.time.trim() === editingSlotPopup.time.trim()) || history.latestSlots[editingSlotPopup.index];
                      if (matchedSlot && matchedSlot.description) {
                        setEditingSlotPopup(prev => prev ? { ...prev, description: matchedSlot.description } : null);
                        onShowToast('info', 'ดึงประวัติข้อความสำเร็จ', 'ดึงรายละเอียดการปฏิบัติหน้าที่ล่าสุดเรียบร้อยแล้ว');
                      } else {
                        onShowToast('warning', 'ไม่พบข้อความก่อนหน้า', 'ยังไม่มีประวัติข้อความที่เคยกรอกสำหรับช่วงเวลานี้');
                      }
                    }}
                    className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    title="ดึงข้อความที่เคยกรอกในรายงานเวรล่าสุด"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>ดึงข้อความล่าสุดที่เคยกรอก</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={editingSlotPopup.description}
                  onChange={(e) => setEditingSlotPopup({ ...editingSlotPopup, description: e.target.value })}
                  placeholder="พิมพ์รายละเอียดการปฏิบัติหน้าที่ สังเกตการณ์ หรือเหตุการณ์ในช่วงเวลานี้..."
                  className="w-full text-xs p-3 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-800 leading-relaxed shadow-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSlotPopup(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  handleTimeSlotChange(editingSlotPopup.index, 'time', editingSlotPopup.time);
                  handleTimeSlotChange(editingSlotPopup.index, 'description', editingSlotPopup.description);
                  setEditingSlotPopup(null);
                  onShowToast('success', 'บันทึกรายละเอียดแล้ว', 'อัปเดตรายละเอียดช่วงเวลาเรียบร้อยแล้ว');
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: BATCH STUDENT ID CARDS DOWNLOAD (A4 PORTRAIT) */}
      <StudentCardBatchModal
        isOpen={studentCardModalState.isOpen}
        onClose={() => setStudentCardModalState(prev => ({ ...prev, isOpen: false }))}
        students={students}
        schoolInfo={schoolInfo}
        personnel={personnel}
        initialSide={studentCardModalState.side}
        initialGrade={studentCardModalState.grade}
        onShowToast={onShowToast}
      />
    </div>
  );
};