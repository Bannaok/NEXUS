import React, { useState, useEffect, useMemo } from 'react';
import { 
  Student, 
  DailyTracking, 
  GradeLevel, 
  UserSession,
  Personnel,
  SchoolInfo,
  MemberAccount
} from '../types';
import { StorageService } from '../services/storage';
import { Module1CommentsEvaluation } from './Module1CommentsEvaluation';
import { ThaiDatePicker } from './ThaiDatePicker';
import { 
  Activity, 
  Save, 
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Sparkles,
  Scale,
  CheckCircle2,
  X,
  Eye,
  Pencil,
  Download,
  Check,
  Printer,
  FileText,
  ChevronDown,
  MoreVertical,
  User
} from 'lucide-react';

interface Module1Props {
  user: UserSession;
  students: Student[];
  dailyTracking: DailyTracking[];
  onSaveDailyTracking: (record: DailyTracking) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  personnel?: Personnel[];
  schoolInfo?: SchoolInfo;
  members?: MemberAccount[];
  onSaveStudent?: (student: Student) => void;
  onDeleteStudent?: (id: string) => void;
  onSavePersonnel?: (person: Personnel) => void;
  onDeletePersonnel?: (id: string) => void;
  onSaveSchoolInfo?: (info: SchoolInfo) => void;
  onOpenLightbox?: (imageUrl: string, title: string, subtitle?: string) => void;
}

export interface WeightSession {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  academicYear?: string;
  semester?: string;
}

export type ThaiNutritionalStatus = 'ผอม' | 'สมส่วน' | 'ท้วม' | 'เริ่มอ้วน' | 'อ้วน';

const SESSIONS_STORAGE_KEY = 'ams_weight_height_sessions_v2';

const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const thaiYear = y > 2400 ? y : y + 543;
  return `${d} ${thaiMonths[m - 1] || ''} ${thaiYear}`;
};

// Helper: Determine student gender accurately
export const getStudentGender = (student: Student): 'ชาย' | 'หญิง' => {
  if (student.gender === 'หญิง') return 'หญิง';
  if (student.gender === 'ชาย') return 'ชาย';
  const prefix = (student.prefix || '').trim().toLowerCase();
  if (
    prefix.includes('หญิง') || 
    prefix.includes('ด.ญ') || 
    prefix.includes('นางสาว') || 
    prefix.includes('น.ส') ||
    prefix.includes('นาง')
  ) {
    return 'หญิง';
  }
  return 'ชาย';
};

// Helper: Check if a DailyTracking record has Milk & Toothbrushing explicitly recorded in the Milk-Teeth page
export const isMilkTeethRecorded = (rec?: DailyTracking): boolean => {
  if (!rec) return false;
  if (rec.milkTeethRecorded === true) return true;
  if (!rec.milkStatus && !rec.toothBrushStatus) return false;
  // Records with no weight/height were created directly from the Milk & Toothbrushing tab
  if ((rec.weight || 0) === 0 && (rec.height || 0) === 0) return true;
  // Or if the status was changed from the default values
  if (rec.milkStatus && rec.milkStatus !== 'ดื่มครบ') return true;
  if (rec.toothBrushStatus && rec.toothBrushStatus !== 'แปรงฟันแล้ว') return true;
  return false;
};

// Helper: Determine student age for growth benchmarks
export const getStudentApproxAge = (student: Student): number => {
  if (student.age && student.age > 0) return student.age;
  if (student.birthDate) {
    const birthYear = parseInt(student.birthDate.split('-')[0], 10);
    const currentYear = new Date().getFullYear();
    if (!isNaN(birthYear) && birthYear > 1900) {
      return Math.max(3, currentYear - birthYear);
    }
  }
  const gl = student.gradeLevel || 'ป.1';
  if (gl === 'อ.1') return 3;
  if (gl === 'อ.2') return 4;
  if (gl === 'อ.3') return 5;
  if (gl === 'ป.1') return 6;
  if (gl === 'ป.2') return 7;
  if (gl === 'ป.3') return 8;
  if (gl === 'ป.4') return 9;
  if (gl === 'ป.5') return 10;
  if (gl === 'ป.6') return 11;
  if (gl === 'ม.1') return 12;
  if (gl === 'ม.2') return 13;
  if (gl === 'ม.3') return 14;
  return 10;
};

// Thai Department of Health (กรมอนามัย กระทรวงสาธารณสุข) Child Nutritional Assessment Criteria
export const calculateThaiNutritionalStatus = (
  weight: number,
  height: number,
  student: Student
): { bmi: number; status: ThaiNutritionalStatus } => {
  if (!weight || !height || weight <= 0 || height <= 0) {
    return { bmi: 0, status: 'สมส่วน' };
  }

  const heightM = height / 100;
  const bmi = Number((weight / (heightM * heightM)).toFixed(1));
  const gender = getStudentGender(student);
  const age = getStudentApproxAge(student);

  let status: ThaiNutritionalStatus = 'สมส่วน';

  if (gender === 'ชาย') {
    if (age <= 6) {
      if (bmi < 13.8) status = 'ผอม';
      else if (bmi <= 16.8) status = 'สมส่วน';
      else if (bmi <= 18.2) status = 'ท้วม';
      else if (bmi <= 20.0) status = 'เริ่มอ้วน';
      else status = 'อ้วน';
    } else if (age <= 9) {
      if (bmi < 13.5) status = 'ผอม';
      else if (bmi <= 17.5) status = 'สมส่วน';
      else if (bmi <= 19.5) status = 'ท้วม';
      else if (bmi <= 22.0) status = 'เริ่มอ้วน';
      else status = 'อ้วน';
    } else if (age <= 12) {
      if (bmi < 14.2) status = 'ผอม';
      else if (bmi <= 19.2) status = 'สมส่วน';
      else if (bmi <= 21.8) status = 'ท้วม';
      else if (bmi <= 24.5) status = 'เริ่มอ้วน';
      else status = 'อ้วน';
    } else if (age <= 15) {
      if (bmi < 15.2) status = 'ผอม';
      else if (bmi <= 21.2) status = 'สมส่วน';
      else if (bmi <= 24.0) status = 'ท้วม';
      else if (bmi <= 26.8) status = 'เริ่มอ้วน';
      else status = 'อ้วน';
    } else {
      if (bmi < 16.5) status = 'ผอม';
      else if (bmi <= 22.8) status = 'สมส่วน';
      else if (bmi <= 25.5) status = 'ท้วม';
      else if (bmi <= 28.5) status = 'เริ่มอ้วน';
      else status = 'อ้วน';
    }
  } else {
    if (age <= 6) {
      if (bmi < 13.4) status = 'ผอม';
      else if (bmi <= 16.5) status = 'สมส่วน';
      else if (bmi <= 18.0) status = 'ท้วม';
      else if (bmi <= 19.8) status = 'เริ่มอ้วน';
      else status = 'อ้วน';
    } else if (age <= 9) {
      if (bmi < 13.2) status = 'ผอม';
      else if (bmi <= 17.2) status = 'สมส่วน';
      else if (bmi <= 19.2) status = 'ท้วม';
      else if (bmi <= 21.5) status = 'เริ่มอ้วน';
      else status = 'อ้วน';
    } else if (age <= 12) {
      if (bmi < 13.8) status = 'ผอม';
      else if (bmi <= 19.0) status = 'สมส่วน';
      else if (bmi <= 21.5) status = 'ท้วม';
      else if (bmi <= 24.0) status = 'เริ่มอ้วน';
      else status = 'อ้วน';
    } else if (age <= 15) {
      if (bmi < 14.8) status = 'ผอม';
      else if (bmi <= 21.0) status = 'สมส่วน';
      else if (bmi <= 23.5) status = 'ท้วม';
      else if (bmi <= 26.0) status = 'เริ่มอ้วน';
      else status = 'อ้วน';
    } else {
      if (bmi < 16.0) status = 'ผอม';
      else if (bmi <= 22.2) status = 'สมส่วน';
      else if (bmi <= 24.8) status = 'ท้วม';
      else if (bmi <= 27.5) status = 'เริ่มอ้วน';
      else status = 'อ้วน';
    }
  }

  return { bmi, status };
};

// Export session data to CSV
export const exportSessionToCsv = (session: WeightSession, studentsList: Student[], trackingData: DailyTracking[]) => {
  const headers = ['เลขที่', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'เพศ', 'ชั้น', 'น้ำหนัก(kg)', 'ส่วนสูง(cm)', 'BMI', 'ภาวะโภชนาการ (กรมอนามัย)', 'วันที่บันทึก'];
  
  const rows = studentsList.map((st, idx) => {
    const rec = trackingData.find(d => d.date === session.date && d.studentId === st.id);
    const w = rec?.weight || 0;
    const h = rec?.height || 0;
    const { bmi, status } = calculateThaiNutritionalStatus(w, h, st);
    const gender = getStudentGender(st);
    
    return [
      st.rollNumber ?? (idx + 1),
      st.prefix,
      st.firstName,
      st.lastName,
      gender,
      st.gradeLevel,
      w > 0 ? w : '',
      h > 0 ? h : '',
      bmi > 0 ? bmi : '',
      w > 0 && h > 0 ? status : 'ยังไม่บันทึก',
      formatThaiDate(session.date)
    ];
  });

  const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `รายงานน้ำหนักส่วนสูง_${session.date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export Milk Status to CSV (Requirement 5)
export const exportMilkToCsv = (dateStr: string, gradeLabel: string, studentsList: Student[], trackingData: DailyTracking[]) => {
  const headers = ['เลขที่', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ชั้น', 'สถานะการดื่มนมโรงเรียน', 'วันที่บันทึก'];
  
  const rows = studentsList.map((st, idx) => {
    const rec = trackingData.find(d => d.date === dateStr && d.studentId === st.id);
    const status = rec?.milkStatus || 'ดื่มครบ';
    
    return [
      st.rollNumber ?? (idx + 1),
      st.prefix,
      st.firstName,
      st.lastName,
      st.gradeLevel,
      status,
      formatThaiDate(dateStr)
    ];
  });

  const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `รายงานการดื่มนมโรงเรียน_${gradeLabel}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export Toothbrushing Status to CSV (Requirement 5)
export const exportTeethToCsv = (dateStr: string, gradeLabel: string, studentsList: Student[], trackingData: DailyTracking[]) => {
  const headers = ['เลขที่', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ชั้น', 'สถานะการแปรงฟันหลังอาหาร', 'วันที่บันทึก'];
  
  const rows = studentsList.map((st, idx) => {
    const rec = trackingData.find(d => d.date === dateStr && d.studentId === st.id);
    const status = rec?.toothBrushStatus || 'แปรงฟันแล้ว';
    
    return [
      st.rollNumber ?? (idx + 1),
      st.prefix,
      st.firstName,
      st.lastName,
      st.gradeLevel,
      status,
      formatThaiDate(dateStr)
    ];
  });

  const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `รายงานการแปรงฟันหลังอาหาร_${gradeLabel}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper: Get 100 School Days for Term (Requirement 4)
export const get100SchoolDaysForTerm = (
  academicYear: string = '2569',
  semester: string = '1'
): { date: string; dayNumber: number; label: string }[] => {
  try {
    const allConfigs = StorageService.getAttendanceConfigsByTerm();
    const termKey = `${semester}_${academicYear}`;
    const fallbackCfg = StorageService.getAttendanceConfig();
    const cfg =
      allConfigs[termKey] ||
      (fallbackCfg &&
      (!fallbackCfg.semester || String(fallbackCfg.semester) === String(semester)) &&
      (!fallbackCfg.academicYear || String(fallbackCfg.academicYear) === String(academicYear))
        ? fallbackCfg
        : undefined);

    if (cfg && Array.isArray(cfg.schoolDays) && cfg.schoolDays.length > 0) {
      const activeDays = cfg.schoolDays.filter(d => !d.isHoliday);
      if (activeDays.length > 0) {
        return activeDays.map((d, idx) => {
          const parts = d.date.split('-');
          const m = parseInt(parts[1] || '5', 10);
          const day = parseInt(parts[2] || '1', 10);
          const shortThaiMonths = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
          ];
          return {
            date: d.date,
            dayNumber: idx + 1,
            label: `${day} ${shortThaiMonths[m - 1] || ''}`
          };
        });
      }
    }

    // Default fallback if no admin config set: Generate Mon-Fri school days between startDate and endDate (103 days)
    const numYr = parseInt((academicYear || '').trim(), 10);
    const adYr = !isNaN(numYr) ? (numYr > 2400 ? numYr - 543 : numYr) : 2026;
    const defaultStartStr = String(semester) === '2' ? `${adYr}-11-02` : `${adYr}-05-18`;
    const defaultEndStr = String(semester) === '2' ? `${adYr + 1}-03-24` : `${adYr}-10-07`;
    const startStr = cfg?.startDate && cfg.startDate !== '' ? cfg.startDate : defaultStartStr;
    const endStr = cfg?.endDate && cfg.endDate !== '' ? cfg.endDate : defaultEndStr;
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const days: { date: string; dayNumber: number; label: string }[] = [];
    const shortThaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const curr = new Date(start);
    let dayNum = 1;
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      while (curr <= end) {
        const dayOfWeekNum = curr.getDay();
        if (dayOfWeekNum !== 0 && dayOfWeekNum !== 6) { // Skip Sat-Sun
          const yyyy = curr.getFullYear();
          const mm = String(curr.getMonth() + 1).padStart(2, '0');
          const dd = String(curr.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          days.push({
            date: dateStr,
            dayNumber: dayNum,
            label: `${curr.getDate()} ${shortThaiMonths[curr.getMonth()]}`
          });
          dayNum++;
        }
        curr.setDate(curr.getDate() + 1);
      }
    }
    return days;
  } catch (e) {
    console.error('Failed to get school days for term', e);
    return [];
  }
};

export const Module1ClassroomAdmin: React.FC<Module1Props> = ({
  user,
  students,
  dailyTracking,
  onSaveDailyTracking,
  onShowToast,
  schoolInfo,
  personnel,
  members,
  onOpenLightbox
}) => {
  // Registered homeroom grades (only classes that have a registered homeroom teacher member)
  const registeredHomeroomGrades = useMemo<GradeLevel[]>(() => {
    const allMembers = members && members.length > 0 ? members : StorageService.getMembers();
    const gradeOrder: GradeLevel[] = [
      'อ.1', 'อ.2', 'อ.3',
      'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
      'ม.1', 'ม.2', 'ม.3'
    ];
    const homeroomSet = new Set<string>();
    allMembers.forEach(m => {
      if (m.role === 'member' && m.gradeLevel) {
        homeroomSet.add(m.gradeLevel.trim());
      }
    });
    return gradeOrder.filter(g => homeroomSet.has(g));
  }, [members]);

  // Sub tab state for separating weight vs milk & teeth vs comments
  const [adminSubTab, setAdminSubTab] = useState<'weight' | 'milkTeeth' | 'comments'>('weight');

  // List of Sessions for Weight & Height
  const [sessions, setSessions] = useState<WeightSession[]>(() => {
    try {
      const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load weight sessions', e);
    }
    
    const datesWithWeight = Array.from(new Set(
      dailyTracking.filter(d => (d.weight > 0 || d.height > 0)).map(d => d.date)
    ));

    if (datesWithWeight.length > 0) {
      return datesWithWeight.map((dt, idx) => ({
        id: `sess-${idx + 1}-${dt}`,
        date: dt,
        createdAt: new Date().toISOString()
      }));
    }

    const todayStr = new Date().toISOString().split('T')[0];
    return [
      {
        id: `sess-1-${todayStr}`,
        date: todayStr,
        createdAt: new Date().toISOString()
      }
    ];
  });

  const saveSessions = (nextSessions: WeightSession[]) => {
    setSessions(nextSessions);
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(nextSessions));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    return StorageService.subscribe(() => {
      try {
        const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessions(parsed);
          }
        }
      } catch {
        // ignore
      }
    });
  }, []);

  const [activeSessionMode, setActiveSessionMode] = useState<{ id: string; mode: 'edit' | 'view' } | null>(null);

  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [sessionToEditDate, setSessionToEditDate] = useState<WeightSession | null>(null);
  const [editSessionDateVal, setEditSessionDateVal] = useState<string>('');

  const [sessionToDelete, setSessionToDelete] = useState<WeightSession | null>(null);

  // State for Weight & Height PDF Preview Modal
  const [pdfPreviewSession, setPdfPreviewSession] = useState<WeightSession | null>(null);
  const [pdfPreviewGradeFilter, setPdfPreviewGradeFilter] = useState<string>('ALL');
  const [openManageMenuSessionId, setOpenManageMenuSessionId] = useState<string | null>(null);

  // Grade filter for table inside active session
  const [gradeFilter, setGradeFilter] = useState<string>(() => {
    if (user.role === 'member' && user.assignedGrade) return user.assignedGrade;
    if (user.role === 'admin' && registeredHomeroomGrades.length > 0) return registeredHomeroomGrades[0];
    return 'ป.1';
  });
  const [weightCalendarMonthIdx, setWeightCalendarMonthIdx] = useState<number>(0);

  // Date for Milk & Teeth
  const [milkTeethDate, setMilkTeethDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [milkTeethGradeFilter, setMilkTeethGradeFilter] = useState<string>(() => {
    if (user.role === 'member' && user.assignedGrade) return user.assignedGrade;
    if (user.role === 'admin' && registeredHomeroomGrades.length > 0) return registeredHomeroomGrades[0];
    return 'ป.1';
  });
  const [isMilkCalendarModalOpen, setIsMilkCalendarModalOpen] = useState<boolean>(false);
  const [isMilkCalendarOpen, setIsMilkCalendarOpen] = useState<boolean>(false);
  const [milkCalMonthIdx, setMilkCalMonthIdx] = useState<number>(0);
  const milkCalendarRef = React.useRef<HTMLDivElement>(null);

  const [isWeightCalendarOpen, setIsWeightCalendarOpen] = useState<boolean>(false);
  const [weightCalMonthIdx, setWeightCalMonthIdx] = useState<number>(0);
  const weightCalendarRef = React.useRef<HTMLDivElement>(null);

  const [calendarModalMonthIndex, setCalendarModalMonthIndex] = useState<number>(0);
  const [previewReportType, setPreviewReportType] = useState<'milk' | 'teeth' | null>(null);
  const [previewMilkTeethMonthIndex, setPreviewMilkTeethMonthIndex] = useState<number>(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (milkCalendarRef.current && !milkCalendarRef.current.contains(e.target as Node)) {
        setIsMilkCalendarOpen(false);
      }
      if (weightCalendarRef.current && !weightCalendarRef.current.contains(e.target as Node)) {
        setIsWeightCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenMilkTeethReport = (type: 'milk' | 'teeth') => {
    const targetGroupIdx = daysGroupedByMonth.findIndex(group => 
      group.days.some(d => d.date === milkTeethDate)
    );
    setPreviewMilkTeethMonthIndex(targetGroupIdx !== -1 ? targetGroupIdx : 0);
    setPreviewReportType(type);
  };

  useEffect(() => {
    if (user.role === 'member' && user.assignedGrade) {
      setGradeFilter(user.assignedGrade);
      setMilkTeethGradeFilter(user.assignedGrade);
    } else if (user.role === 'admin' && registeredHomeroomGrades.length > 0) {
      if (!registeredHomeroomGrades.includes(gradeFilter as GradeLevel)) {
        setGradeFilter(registeredHomeroomGrades[0]);
      }
      if (!registeredHomeroomGrades.includes(milkTeethGradeFilter as GradeLevel)) {
        setMilkTeethGradeFilter(registeredHomeroomGrades[0]);
      }
    }
  }, [user.role, user.assignedGrade, registeredHomeroomGrades]);

  const handleAdminSelectGrade = (nextGrade: string) => {
    setGradeFilter(nextGrade);
    setMilkTeethGradeFilter(nextGrade);
  };

  // Open Create Session Modal with 100-School-Day Calendar
  const handleOpenCreateSessionModal = () => {
    if (schoolDaysList.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const matchToday = schoolDaysList.find(d => d.date === todayStr);
      const initDate = matchToday ? matchToday.date : schoolDaysList[0].date;
      setNewSessionDate(initDate);
      const mIdx = daysGroupedByMonth.findIndex(g => g.days.some(d => d.date === initDate));
      setWeightCalMonthIdx(mIdx !== -1 ? mIdx : 0);
      setWeightCalendarMonthIdx(mIdx !== -1 ? mIdx : 0);
    }
    setIsAddSessionModalOpen(true);
    setIsWeightCalendarOpen(prev => !prev);
  };

  // Handle create new session
  const handleCreateSession = () => {
    if (!newSessionDate) return;
    const existing = sessions.find(s => s.date === newSessionDate);
    if (existing) {
      setActiveSessionMode({ id: existing.id, mode: 'edit' });
      setIsAddSessionModalOpen(false);
      onShowToast('info', 'เปิดรายการเดิม', `มีรายการวันที่ ${formatThaiDate(newSessionDate)} อยู่แล้ว`);
      return;
    }

    const newSess: WeightSession = {
      id: `sess-${Date.now()}`,
      date: newSessionDate,
      createdAt: new Date().toISOString(),
      academicYear: effectiveAcademicYear,
      semester: effectiveSemester
    };
    const updated = [newSess, ...sessions];
    saveSessions(updated);
    setActiveSessionMode({ id: newSess.id, mode: 'edit' });
    setIsAddSessionModalOpen(false);
    onShowToast('success', 'สร้างรายการใหม่สำเร็จ 🎉', `สร้างรายการบันทึกน้ำหนัก/ส่วนสูง วันที่ ${formatThaiDate(newSessionDate)} เรียบร้อยแล้ว`);
  };

  // Handle save edit session date
  const handleSaveEditSessionDate = () => {
    if (!sessionToEditDate || !editSessionDateVal) return;
    const updated = sessions.map(s => s.id === sessionToEditDate.id ? { ...s, date: editSessionDateVal } : s);
    saveSessions(updated);
    setSessionToEditDate(null);
    onShowToast('success', 'แก้ไขวันที่สำเร็จ', `เปลี่ยนวันที่รายการเป็น ${formatThaiDate(editSessionDateVal)} เรียบร้อยแล้ว`);
  };

  // Handle delete weight/height records for a specific grade
  const handleDeleteGradeRecords = (sessDate: string, targetGrade: string) => {
    const targetStudents = students.filter(s => (s.gradeLevel || '').trim() === targetGrade);
    
    targetStudents.forEach(st => {
      const existingRec = dailyTracking.find(d => d.date === sessDate && d.studentId === st.id);
      const updatedRec: DailyTracking = {
        id: existingRec ? existingRec.id : `dt-${st.id}-${sessDate}`,
        date: sessDate,
        studentId: st.id,
        studentName: `${st.prefix}${st.firstName} ${st.lastName}`,
        gradeLevel: st.gradeLevel,
        weight: 0,
        height: 0,
        bmi: 0,
        bmiStatus: undefined,
        milkStatus: existingRec?.milkTeethRecorded ? existingRec.milkStatus : undefined,
        toothBrushStatus: existingRec?.milkTeethRecorded ? existingRec.toothBrushStatus : undefined,
        milkTeethRecorded: existingRec?.milkTeethRecorded
      };
      onSaveDailyTracking(updatedRec);
    });

    setSessionToDelete(null);
    onShowToast('success', 'ลบข้อมูลสำเร็จ 🗑️', `ลบข้อมูลน้ำหนัก/ส่วนสูงเฉพาะชั้น ${targetGrade} วันที่ ${formatThaiDate(sessDate)} เรียบร้อยแล้ว`);
  };

  // Handle delete entire session
  const handleDeleteSessionConfirm = (sessId: string) => {
    const sessObj = sessions.find(s => s.id === sessId);
    const updated = sessions.filter(s => s.id !== sessId);
    saveSessions(updated);

    if (sessObj) {
      students.forEach(st => {
        const existingRec = dailyTracking.find(d => d.date === sessObj.date && d.studentId === st.id);
        if (existingRec && (existingRec.weight > 0 || existingRec.height > 0)) {
          const cleared: DailyTracking = {
            ...existingRec,
            weight: 0,
            height: 0,
            bmi: 0,
            bmiStatus: undefined
          };
          onSaveDailyTracking(cleared);
        }
      });
    }

    if (activeSessionMode?.id === sessId) {
      setActiveSessionMode(null);
    }
    setSessionToDelete(null);
    onShowToast('info', 'ลบรายการเรียบร้อย 🗑️', 'ลบรายการบันทึกน้ำหนัก/ส่วนสูงออกจากระบบแล้ว');
  };

  // Select or create session from 100-School-Day Calendar for Weight & Height
  const handleSelectCalendarDay = (dateStr: string) => {
    const existing = sessions.find(s => s.date === dateStr);
    if (existing) {
      setActiveSessionMode({ id: existing.id, mode: 'edit' });
    } else {
      const newSess: WeightSession = {
        id: `sess-${Date.now()}`,
        date: dateStr,
        createdAt: new Date().toISOString(),
        academicYear: effectiveAcademicYear,
        semester: effectiveSemester
      };
      saveSessions([newSess, ...sessions]);
      setActiveSessionMode({ id: newSess.id, mode: 'edit' });
      onShowToast('success', 'สร้างรายการบันทึกใหม่ 🎉', `เริ่มบันทึกน้ำหนัก/ส่วนสูง วันที่ ${formatThaiDate(dateStr)}`);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionMode?.id);
  const isViewOnly = user.role === 'admin' || activeSessionMode?.mode === 'view';

  // Unique list of grades actually present in students (only grades with at least 1 student)
  const availableGradeLevels = useMemo(() => {
    const gradesWithStudents = Array.from(
      new Set(
        students
          .map(s => (s.gradeLevel || '').trim())
          .filter(g => Boolean(g) && students.some(s => (s.gradeLevel || '').trim() === g))
      )
    );

    const gradeOrder = ['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
    
    return gradesWithStudents.sort((a, b) => {
      const idxA = gradeOrder.indexOf(a);
      const idxB = gradeOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [students]);

  // Filtered students for active session table
  const displayedStudents = (gradeFilter === 'ALL' 
    ? students 
    : students.filter(s => s.gradeLevel === gradeFilter)
  ).sort((a, b) => {
    if (a.gradeLevel !== b.gradeLevel) {
      return a.gradeLevel.localeCompare(b.gradeLevel);
    }
    if (a.rollNumber !== undefined && b.rollNumber !== undefined) {
      return a.rollNumber - b.rollNumber;
    }
    if (a.rollNumber !== undefined) return -1;
    if (a.rollNumber === undefined) return 1;
    return (a.studentCode || '').localeCompare(b.studentCode || '');
  });

  const [availableAcademicYears, setAvailableAcademicYears] = useState<string[]>(() => {
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
      setAvailableAcademicYears(Array.from(new Set([current, ...base])).sort((a, b) => Number(b) - Number(a)));
    });
  }, [schoolInfo?.academicYear]);

  // Admin local view-only state for switching Academic Year & Semester (does not modify schoolInfo or affect members)
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(
    schoolInfo?.academicYear || '2569'
  );
  const [selectedSemester, setSelectedSemester] = useState<string>(
    schoolInfo?.semester || '1'
  );

  useEffect(() => {
    if (schoolInfo?.academicYear) setSelectedAcademicYear(schoolInfo.academicYear);
    if (schoolInfo?.semester) setSelectedSemester(schoolInfo.semester);
  }, [schoolInfo?.academicYear, schoolInfo?.semester]);

  // For Admin: use local dropdown state; For Member: strictly use schoolInfo set by Admin in Settings
  const effectiveAcademicYear = user.role === 'admin'
    ? selectedAcademicYear
    : (schoolInfo?.academicYear || '2569');
  const effectiveSemester = user.role === 'admin'
    ? selectedSemester
    : (schoolInfo?.semester || '1');

  // 100 School Days for Milk & Teeth Calendar Widget (Requirement 4)
  const schoolDaysList = useMemo(() => {
    return get100SchoolDaysForTerm(
      effectiveAcademicYear,
      effectiveSemester
    );
  }, [effectiveAcademicYear, effectiveSemester]);

  // Filter Weight & Height sessions by effectiveAcademicYear & effectiveSemester
  const filteredSessions = useMemo(() => {
    const schoolDayDatesSet = new Set(schoolDaysList.map(d => d.date));
    const allTermConfigs = StorageService.getAttendanceConfigsByTerm();

    return sessions.filter(sess => {
      if (sess.academicYear && sess.semester) {
        return String(sess.academicYear) === String(effectiveAcademicYear) && String(sess.semester) === String(effectiveSemester);
      }
      if (schoolDayDatesSet.has(sess.date)) {
        return true;
      }
      // Check if date explicitly belongs to another configured term's 100 days
      for (const [termKey, cfg] of Object.entries(allTermConfigs)) {
        if (cfg?.schoolDays?.some(d => !d.isHoliday && d.date === sess.date)) {
          const [tSem, tYr] = termKey.split('_');
          return String(tSem) === String(effectiveSemester) && String(tYr) === String(effectiveAcademicYear);
        }
      }
      // Infer academicYear and semester from session date (YYYY-MM-DD)
      const parts = (sess.date || '').split('-');
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
          return inferredYear === String(effectiveAcademicYear) && inferredSem === String(effectiveSemester);
        }
      }
      return true;
    });
  }, [sessions, schoolDaysList, effectiveAcademicYear, effectiveSemester]);

  // Keep milkTeethDate aligned with active term's schoolDaysList when year/semester changes
  useEffect(() => {
    if (schoolDaysList.length > 0) {
      const exists = schoolDaysList.some(d => d.date === milkTeethDate);
      if (!exists) {
        const todayStr = new Date().toISOString().split('T')[0];
        const matchToday = schoolDaysList.find(d => d.date === todayStr);
        setMilkTeethDate(matchToday ? matchToday.date : schoolDaysList[0].date);
      }
      setMilkCalMonthIdx(0);
      setWeightCalMonthIdx(0);
      setWeightCalendarMonthIdx(0);
      setPreviewMilkTeethMonthIndex(0);
    }
  }, [effectiveAcademicYear, effectiveSemester, schoolDaysList]);

  // Group 100 school days by month for calendar display
  const daysGroupedByMonth = useMemo(() => {
    const thaiFullMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const shortThaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const groups: { [key: string]: { monthKey: string; monthTitle: string; shortMonthLabel: string; days: typeof schoolDaysList } } = {};
    
    schoolDaysList.forEach(dayItem => {
      const [yyyy, mm] = dayItem.date.split('-');
      const mIdx = parseInt(mm, 10) - 1;
      const yearBE = parseInt(yyyy, 10) + 543;
      const monthTitle = `เดือน${thaiFullMonths[mIdx] || ''}`;
      const shortMonthLabel = shortThaiMonths[mIdx] || '';
      const monthKey = `${yyyy}-${mm}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = { monthKey, monthTitle, shortMonthLabel, days: [] };
      }
      groups[monthKey].days.push(dayItem);
    });
    
    return Object.values(groups);
  }, [schoolDaysList]);

  const completedDaysCount = useMemo(() => {
    const targetStudents = milkTeethGradeFilter === 'ALL'
      ? students
      : students.filter(s => s.gradeLevel === milkTeethGradeFilter);

    if (targetStudents.length === 0) return 0;

    return schoolDaysList.filter(day => {
      const recordedCount = targetStudents.filter(st => {
        const rec = dailyTracking.find(d => d.date === day.date && d.studentId === st.id);
        return isMilkTeethRecorded(rec);
      }).length;
      return recordedCount === targetStudents.length;
    }).length;
  }, [schoolDaysList, milkTeethGradeFilter, students, dailyTracking]);

  const handleSaveAllActiveSession = () => {
    if (!activeSession) return;
    onShowToast('success', 'บันทึกทั้งหมดสำเร็จ 🎉', `บันทึกข้อมูลน้ำหนักและส่วนสูงของนักเรียนทุกคนในรายการนี้เรียบร้อยแล้ว`);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs w-full">
        {/* Equal width sub-tab grid for Mobile (3 columns, 100% width, no horizontal scroll) */}
        <div className="grid grid-cols-3 gap-1 sm:gap-2 bg-slate-100/90 p-1 sm:p-1.5 rounded-xl border border-slate-200/80 w-full sm:w-auto sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => setAdminSubTab('weight')}
            className={`w-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 px-1 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
              adminSubTab === 'weight'
                ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <span className="text-xs sm:text-sm shrink-0">⚖️</span>
            <span className="truncate leading-tight">น้ำหนัก/ส่วนสูง</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSubTab('milkTeeth')}
            className={`w-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 px-1 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
              adminSubTab === 'milkTeeth'
                ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <span className="text-xs sm:text-sm shrink-0">🥛🪥</span>
            <span className="truncate leading-tight">ดื่มนม-แปรงฟัน</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSubTab('comments')}
            className={`w-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 px-1 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
              adminSubTab === 'comments'
                ? 'bg-purple-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <span className="text-xs sm:text-sm shrink-0">💬</span>
            <span className="truncate leading-tight">ความคิดเห็น (8 ด้าน)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0 self-end sm:self-auto">
          {user.role === 'admin' ? (
            <>
              <select
                value={selectedAcademicYear}
                onChange={(e) => {
                  setSelectedAcademicYear(e.target.value);
                  setActiveSessionMode(null);
                }}
                className="px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
              >
                {availableAcademicYears.map(yr => (
                  <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                ))}
              </select>

              <select
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setActiveSessionMode(null);
                }}
                className="px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
              >
                <option value="1">ภาคเรียนที่ 1</option>
                <option value="2">ภาคเรียนที่ 2</option>
              </select>

              {registeredHomeroomGrades.length > 0 && (
                <select
                  value={gradeFilter}
                  onChange={(e) => handleAdminSelectGrade(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
                >
                  {registeredHomeroomGrades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
            </>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold whitespace-nowrap">
              ภาคเรียนที่ {effectiveSemester} • ปีการศึกษา {effectiveAcademicYear}
            </div>
          )}

          {/* Action Button "+" for creating new weight recording session with Floating Popover Calendar (Member only) */}
          {adminSubTab === 'weight' && !activeSessionMode && user.role !== 'admin' && (
            <div className="relative" ref={weightCalendarRef}>
              <button
                type="button"
                onClick={handleOpenCreateSessionModal}
                className="p-2 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                title="สร้างรายการที่จะกรอกน้ำหนัก/ส่วนสูงใหม่"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>

            {/* Floating Popover Calendar matching Attendance & Savings EXACTLY */}
            {isWeightCalendarOpen && (() => {
              const currentMonthGroup = daysGroupedByMonth[weightCalMonthIdx] || daysGroupedByMonth[0];
              const [yyyy, mm] = currentMonthGroup ? currentMonthGroup.monthKey.split('-') : ['2026', '05'];
              const yearNum = parseInt(yyyy, 10);
              const monthIdx = parseInt(mm, 10) - 1;
              const daysInMonth = new Date(yearNum, monthIdx + 1, 0).getDate();
              const firstDayOfWeek = new Date(yearNum, monthIdx, 1).getDay();
              const schoolDaysMap = new Map(schoolDaysList.map(d => [d.date, d]));
              const weightTargetStudents = gradeFilter === 'ALL'
                ? students
                : students.filter(s => (s.gradeLevel || '').trim() === gradeFilter);

              return (
                <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 sm:p-3 w-64 sm:w-72 animate-in fade-in slide-in-from-top-2">
                  {/* Header showing active semester and academic year */}
                  <div className="pb-1.5 mb-2 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-sky-900 bg-sky-50/80 px-2.5 py-1 rounded-xl">
                    <span>ปฏิทินเวลาเรียน 100 วัน</span>
                    <span className="bg-white px-2 py-0.5 rounded-lg border border-sky-200 text-sky-800 font-mono shadow-2xs">
                      ภาคเรียนที่ {effectiveSemester}/{effectiveAcademicYear}
                    </span>
                  </div>

                  {/* Month / Year header with Prev/Next buttons */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      disabled={weightCalMonthIdx <= 0}
                      onClick={() => setWeightCalMonthIdx(prev => Math.max(0, prev - 1))}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-30"
                      title="เดือนก่อนหน้า"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="font-bold text-xs text-slate-800">
                      {currentMonthGroup ? currentMonthGroup.monthTitle : ''}
                    </div>

                    <button
                      type="button"
                      disabled={weightCalMonthIdx >= daysGroupedByMonth.length - 1}
                      onClick={() => setWeightCalMonthIdx(prev => Math.min(daysGroupedByMonth.length - 1, prev + 1))}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-30"
                      title="เดือนถัดไป"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Month Switcher */}
                  {daysGroupedByMonth.length > 0 && (
                    <div className="flex items-center justify-between gap-1 py-1.5 border-b border-slate-100 overflow-x-auto scrollbar-none">
                      {daysGroupedByMonth.map((group, idx) => (
                        <button
                          key={group.monthKey}
                          type="button"
                          onClick={() => setWeightCalMonthIdx(idx)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer shrink-0 ${
                            weightCalMonthIdx === idx
                              ? 'bg-sky-600 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {group.shortMonthLabel}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-1 text-center py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-100">
                    <span className="text-rose-500">อา</span>
                    <span>จ</span>
                    <span>อ</span>
                    <span>พ</span>
                    <span>พฤ</span>
                    <span>ศ</span>
                    <span className="text-rose-500">ส</span>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 py-2">
                    {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                      <div key={`pad-${idx}`} className="h-8 w-full" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const dateStr = `${yyyy}-${mm}-${String(dayNum).padStart(2, '0')}`;
                      const schoolDayItem = schoolDaysMap.get(dateStr);
                      const is100SchoolDay = Boolean(schoolDayItem);
                      const existingSession = sessions.find(s => s.date === dateStr);
                      const isExisting = Boolean(existingSession);

                      const recordedCount = weightTargetStudents.filter(st => {
                        const rec = dailyTracking.find(d => d.date === dateStr && d.studentId === st.id);
                        return rec !== undefined && (rec.weight > 0 || rec.height > 0);
                      }).length;
                      const isFullyRecorded = weightTargetStudents.length > 0 && recordedCount === weightTargetStudents.length;

                      if (is100SchoolDay) {
                        if (isFullyRecorded || isExisting) {
                          return (
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => {
                                handleSelectCalendarDay(dateStr);
                                setIsWeightCalendarOpen(false);
                              }}
                              className="h-8 w-full rounded-lg text-[11px] font-mono font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer shadow-2xs bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600"
                              title={`มีรายการบันทึกแล้ว: ${formatThaiDate(dateStr)}`}
                            >
                              <span className="leading-tight">{dayNum}</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => {
                              handleSelectCalendarDay(dateStr);
                              setIsWeightCalendarOpen(false);
                            }}
                            className="h-8 w-full rounded-lg text-[11px] font-mono font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer shadow-2xs bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300"
                            title={`วันเรียนที่ ${schoolDayItem?.dayNumber}: คลิกเพื่อสร้าง/เปิดรายการ ${formatThaiDate(dateStr)}`}
                          >
                            <span className="leading-tight">{dayNum}</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          disabled
                          className="h-8 w-full rounded-lg text-[11px] font-mono font-normal flex flex-col items-center justify-center bg-slate-100/70 text-slate-300 border border-slate-200/50 cursor-not-allowed opacity-50 select-none"
                        >
                          <span className="leading-tight">{dayNum}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    {schoolDaysList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          const target = schoolDaysList.some(d => d.date === today) ? today : schoolDaysList[0].date;
                          handleSelectCalendarDay(target);
                          setIsWeightCalendarOpen(false);
                        }}
                        className="text-sky-600 hover:text-sky-800 font-bold hover:underline cursor-pointer"
                      >
                        สร้าง/เปิดวันเรียนวันนี้
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsWeightCalendarOpen(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer ml-auto text-xs"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

          {/* Top-Right Download Buttons for Milk & Teeth */}
          {adminSubTab === 'milkTeeth' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenMilkTeethReport('milk')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                title="ดาวน์โหลดรายงานการดื่มนมโรงเรียน"
              >
                <Download className="w-4 h-4" />
                <span>รายงานดื่มนม</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenMilkTeethReport('teeth')}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                title="ดาวน์โหลดรายงานการแปรงฟันหลังอาหาร"
              >
                <Download className="w-4 h-4" />
                <span>รายงานแปรงฟัน</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: WEIGHT & HEIGHT TRACKING */}
      {adminSubTab === 'weight' && (
        <>
          {/* VIEW 1: LIST OF SESSIONS (VERTICAL LIST) */}
          {!activeSessionMode ? (
              /* LIST VIEW */
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                {user.role !== 'admin' && (
                  <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-800">
                        รายการบันทึกน้ำหนักและส่วนสูง (ภาคเรียนที่ {effectiveSemester} ปีการศึกษา {effectiveAcademicYear})
                      </span>
                    </div>
                    <div className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs">
                      ชั้น {user.assignedGrade || 'ป.1'} (ครูประจำชั้น)
                    </div>
                  </div>
                )}
                {filteredSessions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <Scale className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">ยังไม่มีรายการบันทึกน้ำหนัก / ส่วนสูง</p>
                      {user.role !== 'admin' && (
                        <p className="text-xs text-slate-400 mt-1">กดปุ่ม "+" เพื่อสร้างรายการลงคะแนนใหม่</p>
                      )}
                    </div>
                    {user.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleOpenCreateSessionModal()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5 hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>สร้างรายการแรก</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSessions.map((sess, idx) => {
                      const targetStudentsForSess = gradeFilter === 'ALL'
                        ? students
                        : students.filter(s => (s.gradeLevel || '').trim() === gradeFilter);

                      const sessRecords = dailyTracking.filter(
                        d => d.date === sess.date && 
                             (d.weight > 0 || d.height > 0) &&
                             targetStudentsForSess.some(st => st.id === d.studentId)
                      );
                      const recCount = sessRecords.length;

                      return (
                        <div
                          key={sess.id}
                          className="p-2.5 sm:p-4 hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-2 border-b border-slate-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xs sm:text-sm flex items-center justify-center border border-blue-200 shrink-0">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs sm:text-base font-extrabold text-slate-900 truncate">
                                  วันที่ {formatThaiDate(sess.date)}
                                </h4>
                                {gradeFilter !== 'ALL' && (
                                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold text-[10px] border border-blue-200 shrink-0">
                                    ชั้น {gradeFilter}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                                บันทึกแล้ว <strong className="text-slate-800 font-mono">{recCount}</strong> / {targetStudentsForSess.length} คน
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {user.role === 'admin' ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveSessionMode({ id: sess.id, mode: 'view' })}
                                  className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-200 transition-all cursor-pointer shadow-2xs"
                                  title="ดูข้อมูล"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPdfPreviewSession(sess);
                                    setPdfPreviewGradeFilter(gradeFilter);
                                  }}
                                  className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                                  title="ดาวน์โหลดรายงาน PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                {/* Mobile Single Action Icon Button */}
                                <div className="sm:hidden">
                                  <button
                                    type="button"
                                    onClick={() => setOpenManageMenuSessionId(sess.id)}
                                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-all cursor-pointer shadow-2xs active:scale-95"
                                    title="เมนูกิจกรรม"
                                  >
                                    <MoreVertical className="w-4 h-4 text-slate-700" />
                                  </button>
                                </div>

                                {/* Desktop normal 4 buttons */}
                                <div className="hidden sm:flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setActiveSessionMode({ id: sess.id, mode: 'view' })}
                                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-200 transition-all cursor-pointer shadow-2xs"
                                    title="ดูข้อมูล"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setActiveSessionMode({ id: sess.id, mode: 'edit' })}
                                    className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-slate-200 transition-all cursor-pointer shadow-2xs"
                                    title="กรอก / แก้ไขคะแนนน้ำหนัก-ส่วนสูง และเปลี่ยนวันที่"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPdfPreviewSession(sess);
                                      setPdfPreviewGradeFilter(gradeFilter);
                                    }}
                                    className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                                    title={`แสดงตัวอย่างและดาวน์โหลดรายงาน (PDF) ${gradeFilter === 'ALL' ? 'ทุกระดับชั้น' : `ชั้น ${gradeFilter}`}`}
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSessionToDelete(sess)}
                                    className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-all cursor-pointer shadow-2xs"
                                    title={gradeFilter === 'ALL' ? 'ลบรายการนี้' : `ลบข้อมูลชั้น ${gradeFilter} หรือลบรายการนี้`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mobile Action Pop-up Modal */}
                {openManageMenuSessionId && (() => {
                  const targetSess = sessions.find(s => s.id === openManageMenuSessionId);
                  if (!targetSess) return null;

                  return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xs w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                              เมนูจัดการรายการ
                            </span>
                            <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                              วันที่ {formatThaiDate(targetSess.date)}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setOpenManageMenuSessionId(null)}
                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSessionMode({ id: targetSess.id, mode: 'edit' });
                              setOpenManageMenuSessionId(null);
                            }}
                            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                            <span>กรอก / แก้ไขคะแนน</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveSessionMode({ id: targetSess.id, mode: 'view' });
                              setOpenManageMenuSessionId(null);
                            }}
                            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-slate-200"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                            <span>ดูข้อมูล</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPdfPreviewSession(targetSess);
                              setPdfPreviewGradeFilter(gradeFilter);
                              setOpenManageMenuSessionId(null);
                            }}
                            className="w-full py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-200 transition-all active:scale-95 cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-emerald-600" />
                            <span>ดาวน์โหลดรายงาน PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSessionToDelete(targetSess);
                              setOpenManageMenuSessionId(null);
                            }}
                            className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200 transition-all active:scale-95 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                            <span>ลบรายการนี้</span>
                          </button>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setOpenManageMenuSessionId(null)}
                            className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 text-center cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
          ) : (
            /* VIEW 2: STUDENT TABLE FOR SELECTED SESSION (EDIT or VIEW ONLY) */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-0 animate-in fade-in duration-150">
              {/* Header Bar */}
              <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSessionMode(null)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    title="กลับไปหน้ารายการ"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>กลับหน้ารายการ</span>
                  </button>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                      รายการที่ {Math.max(1, filteredSessions.findIndex(s => s.id === activeSessionMode?.id) + 1)}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      วันที่ {formatThaiDate(activeSession?.date || '')}
                    </h3>
                    
                    {/* Pencil Edit Date Icon right after Date */}
                    {!isViewOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          if (activeSession) {
                            setSessionToEditDate(activeSession);
                            setEditSessionDateVal(activeSession.date);
                          }
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        title="แก้ไขวันที่ของรายการ"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                    {user.role !== 'admin' && (
                      <>
                        <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap mr-1">ชั้น:</span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold shadow-2xs">
                          {user.assignedGrade || 'ป.1'} (ครูประจำชั้น)
                        </span>
                      </>
                    )}

                    {/* Download PDF button */}
                    {activeSession && (
                      <button
                        type="button"
                        onClick={() => {
                          setPdfPreviewSession(activeSession);
                          setPdfPreviewGradeFilter(gradeFilter);
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0 ml-1"
                        title="แสดงตัวอย่างและดาวน์โหลด PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลด PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* CLEAN STUDENT TABLE (RESPONSIVE MOBILE VIEW: GRADE COLUMN HIDDEN ON MOBILE) */}
              <div className="overflow-x-hidden sm:overflow-x-auto bg-white border border-slate-800 rounded-2xl">
                <table className="w-full table-fixed sm:table-auto text-left text-xs border-collapse bg-white">
                  <thead className="bg-white text-black font-bold border-b border-slate-800 text-[11px] sm:text-xs">
                    <tr>
                      <th className="py-2.5 px-1 sm:px-3 text-center w-9 sm:w-14 text-black">เลขที่</th>
                      <th className="py-2.5 px-2 text-center w-16 hidden sm:table-cell text-black">ชั้น</th>
                      <th className="py-2.5 px-1.5 sm:px-4 text-black">ชื่อ - นามสกุล</th>
                      <th className="py-2.5 px-1 sm:px-3 text-center w-16 sm:w-36 text-black">น้ำหนัก<span className="hidden sm:inline"> (kg)</span></th>
                      <th className="py-2.5 px-1 sm:px-3 text-center w-16 sm:w-36 text-black">ส่วนสูง<span className="hidden sm:inline"> (cm)</span></th>
                      <th className="py-2.5 px-1 sm:px-3 text-center w-16 sm:w-52 text-black">BMI / ภาวะโภชนาการ<span className="hidden sm:inline"> (กรมอนามัย)</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-white">
                    {displayedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 bg-white">
                          <p className="font-semibold text-black">ไม่มีรายชื่อนักเรียนในเงื่อนไขนี้</p>
                        </td>
                      </tr>
                    ) : (
                      displayedStudents.map((student, idx) => {
                        const existingRecord = dailyTracking.find(
                          d => d.date === activeSession?.date && d.studentId === student.id
                        );

                        return (
                          <WeightTrackingRow
                            key={student.id}
                            index={student.rollNumber ?? (idx + 1)}
                            student={student}
                            date={activeSession?.date || ''}
                            record={existingRecord}
                            isViewOnly={isViewOnly}
                            onSave={onSaveDailyTracking}
                            onShowToast={onShowToast}
                            onOpenLightbox={onOpenLightbox}
                          />
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* BOTTOM RIGHT CORNER "บันทึกทั้งหมด" BUTTON */}
              {!isViewOnly && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAllActiveSession}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>บันทึกทั้งหมด</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* SUB-TAB 2: MILK & TOOTHBRUSHING TRACKING */}
      {adminSubTab === 'milkTeeth' && (() => {
        const targetStudents = milkTeethGradeFilter === 'ALL'
          ? students
          : students.filter(s => s.gradeLevel === milkTeethGradeFilter);

        const currentMilkDateIdx = schoolDaysList.findIndex(d => d.date === milkTeethDate);

        const handlePrevMilkDate = () => {
          if (currentMilkDateIdx > 0) {
            setMilkTeethDate(schoolDaysList[currentMilkDateIdx - 1].date);
          } else if (currentMilkDateIdx === -1 && schoolDaysList.length > 0) {
            setMilkTeethDate(schoolDaysList[0].date);
          }
        };

        const handleNextMilkDate = () => {
          if (currentMilkDateIdx !== -1 && currentMilkDateIdx < schoolDaysList.length - 1) {
            setMilkTeethDate(schoolDaysList[currentMilkDateIdx + 1].date);
          } else if (currentMilkDateIdx === -1 && schoolDaysList.length > 0) {
            setMilkTeethDate(schoolDaysList[0].date);
          }
        };

        const handleSaveAllMilkTeeth = () => {
          targetStudents.forEach(st => {
            const existing = dailyTracking.find(d => d.date === milkTeethDate && d.studentId === st.id);
            const updated: DailyTracking = {
              id: existing ? existing.id : `dt-${st.id}-${milkTeethDate}`,
              date: milkTeethDate,
              studentId: st.id,
              studentName: `${st.prefix}${st.firstName} ${st.lastName}`,
              gradeLevel: st.gradeLevel,
              weight: existing?.weight || 0,
              height: existing?.height || 0,
              bmi: existing?.bmi || 0,
              bmiStatus: existing?.bmiStatus || 'สมส่วน',
              milkStatus: existing?.milkStatus || 'ดื่มครบ',
              toothBrushStatus: existing?.toothBrushStatus || 'แปรงฟันแล้ว',
              milkTeethRecorded: true
            };
            onSaveDailyTracking(updated);
          });
          onShowToast('success', 'บันทึกทั้งหมดสำเร็จ 🎉', `บันทึกข้อมูลการดื่มนมและแปรงฟันของนักเรียนทุกคนในวันที่ ${formatThaiDate(milkTeethDate)} เรียบร้อยแล้ว`);
        };

        return (
          <div className="space-y-4">
            {/* 100 School Days Calendar Widget & Combined Filter Bar */}
            <div className="bg-sky-50/90 p-3.5 rounded-2xl border border-sky-200 shadow-xs flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Interactive Date Trigger Button with Floating Popover Calendar */}
                <div className="relative" ref={milkCalendarRef}>
                  <button
                    type="button"
                    onClick={() => {
                      const targetGroupIdx = daysGroupedByMonth.findIndex(group => 
                        group.days.some(d => d.date === milkTeethDate)
                      );
                      if (targetGroupIdx !== -1) {
                        setMilkCalMonthIdx(targetGroupIdx);
                      }
                      setIsMilkCalendarOpen(!isMilkCalendarOpen);
                    }}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all shadow-2xs text-xs ${
                      schoolDaysList.some(d => d.date === milkTeethDate)
                        ? 'bg-sky-600 hover:bg-sky-700 text-white border-sky-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                    title="คลิกเพื่อเปิดปฏิทินเวลาเรียน 100 วัน"
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-white" />
                    <span>{formatThaiDate(milkTeethDate)}</span>
                    <ChevronDown className={`w-3 h-3 text-white/80 transition-transform ${isMilkCalendarOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Floating Popover Calendar (Exact Attendance & Savings Style) */}
                  {isMilkCalendarOpen && (() => {
                    const currentMonthGroup = daysGroupedByMonth[milkCalMonthIdx] || daysGroupedByMonth[0];
                    const [yyyy, mm] = currentMonthGroup ? currentMonthGroup.monthKey.split('-') : ['2026', '05'];
                    const yearNum = parseInt(yyyy, 10);
                    const monthIdx = parseInt(mm, 10) - 1;
                    const daysInMonth = new Date(yearNum, monthIdx + 1, 0).getDate();
                    const firstDayOfWeek = new Date(yearNum, monthIdx, 1).getDay();
                    const schoolDaysMap = new Map(schoolDaysList.map(d => [d.date, d]));
                    const milkTargetStudents = milkTeethGradeFilter === 'ALL'
                      ? students
                      : students.filter(s => s.gradeLevel === milkTeethGradeFilter);

                    return (
                      <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 sm:p-3 w-64 sm:w-72 animate-in fade-in slide-in-from-top-2">
                        {/* Header showing active semester and academic year */}
                        <div className="pb-1.5 mb-2 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-sky-900 bg-sky-50/80 px-2.5 py-1 rounded-xl">
                          <span>ปฏิทินเวลาเรียน 100 วัน</span>
                          <span className="bg-white px-2 py-0.5 rounded-lg border border-sky-200 text-sky-800 font-mono shadow-2xs">
                            ภาคเรียนที่ {effectiveSemester}/{effectiveAcademicYear}
                          </span>
                        </div>

                        {/* Month / Year header with Prev/Next buttons */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <button
                            type="button"
                            disabled={milkCalMonthIdx <= 0}
                            onClick={() => setMilkCalMonthIdx(prev => Math.max(0, prev - 1))}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-30"
                            title="เดือนก่อนหน้า"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <div className="font-bold text-xs text-slate-800">
                            {currentMonthGroup ? currentMonthGroup.monthTitle : ''}
                          </div>

                          <button
                            type="button"
                            disabled={milkCalMonthIdx >= daysGroupedByMonth.length - 1}
                            onClick={() => setMilkCalMonthIdx(prev => Math.min(daysGroupedByMonth.length - 1, prev + 1))}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-30"
                            title="เดือนถัดไป"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Quick Month Switcher */}
                        {daysGroupedByMonth.length > 0 && (
                          <div className="flex items-center justify-between gap-1 py-1.5 border-b border-slate-100 overflow-x-auto scrollbar-none">
                            {daysGroupedByMonth.map((group, idx) => (
                              <button
                                key={group.monthKey}
                                type="button"
                                onClick={() => setMilkCalMonthIdx(idx)}
                                className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer shrink-0 ${
                                  milkCalMonthIdx === idx
                                    ? 'bg-sky-600 text-white shadow-2xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                }`}
                              >
                                {group.shortMonthLabel}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Days of Week Header */}
                        <div className="grid grid-cols-7 gap-1 text-center py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-100">
                          <span className="text-rose-500">อา</span>
                          <span>จ</span>
                          <span>อ</span>
                          <span>พ</span>
                          <span>พฤ</span>
                          <span>ศ</span>
                          <span className="text-rose-500">ส</span>
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 py-2">
                          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                            <div key={`pad-${idx}`} className="h-8 w-full" />
                          ))}

                          {Array.from({ length: daysInMonth }).map((_, idx) => {
                            const dayNum = idx + 1;
                            const dateStr = `${yyyy}-${mm}-${String(dayNum).padStart(2, '0')}`;
                            const schoolDayItem = schoolDaysMap.get(dateStr);
                            const is100SchoolDay = Boolean(schoolDayItem);
                            const isSelected = milkTeethDate === dateStr;

                            const recordedCount = milkTargetStudents.filter(st => {
                              const rec = dailyTracking.find(d => d.date === dateStr && d.studentId === st.id);
                              return isMilkTeethRecorded(rec);
                            }).length;
                            const isFullyCompleted = milkTargetStudents.length > 0 && recordedCount === milkTargetStudents.length;

                            if (is100SchoolDay) {
                              if (isFullyCompleted) {
                                return (
                                  <button
                                    key={dateStr}
                                    type="button"
                                    onClick={() => {
                                      setMilkTeethDate(dateStr);
                                      setIsMilkCalendarOpen(false);
                                    }}
                                    className={`h-8 w-full rounded-lg text-[11px] font-mono font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer shadow-2xs ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-md scale-105'
                                        : 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600'
                                    }`}
                                    title={`บันทึกครบแล้ว: ${formatThaiDate(dateStr)}`}
                                  >
                                    <span className="leading-tight">{dayNum}</span>
                                  </button>
                                );
                              }

                              return (
                                <button
                                  key={dateStr}
                                  type="button"
                                  onClick={() => {
                                    setMilkTeethDate(dateStr);
                                    setIsMilkCalendarOpen(false);
                                  }}
                                  className={`h-8 w-full rounded-lg text-[11px] font-mono font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer shadow-2xs ${
                                    isSelected
                                      ? 'bg-sky-600 text-white ring-2 ring-sky-300 shadow-xs'
                                      : 'bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300'
                                  }`}
                                  title={`วันเรียน: ${formatThaiDate(dateStr)}`}
                                >
                                  <span className="leading-tight">{dayNum}</span>
                                </button>
                              );
                            }

                            return (
                              <button
                                key={dateStr}
                                type="button"
                                disabled
                                className="h-8 w-full rounded-lg text-[11px] font-mono font-normal flex flex-col items-center justify-center bg-slate-100/70 text-slate-300 border border-slate-200/50 cursor-not-allowed opacity-50 select-none"
                              >
                                <span className="leading-tight">{dayNum}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Footer */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          {schoolDaysList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date().toISOString().split('T')[0];
                                const target = schoolDaysList.some(d => d.date === today) ? today : schoolDaysList[0].date;
                                setMilkTeethDate(target);
                                setIsMilkCalendarOpen(false);
                              }}
                              className="text-sky-600 hover:text-sky-800 font-bold hover:underline cursor-pointer"
                            >
                              ไปวันเรียน
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsMilkCalendarOpen(false)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer ml-auto text-xs"
                          >
                            ปิด
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Student Table Box */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              {user.role !== 'admin' && (
                <div className="px-4 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        บันทึกดื่มนมและแปรงฟัน (ชั้น {milkTeethGradeFilter === 'ALL' ? 'ทุกระดับชั้น' : milkTeethGradeFilter})
                      </span>
                      <span className="text-xs text-slate-500 ml-2 font-medium">
                        (ปีการศึกษา {effectiveAcademicYear} ภาคเรียนที่ {effectiveSemester})
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 shadow-2xs">
                    วันที่เลือก: {formatThaiDate(milkTeethDate)} {currentMilkDateIdx !== -1 && `(ว.${schoolDaysList[currentMilkDateIdx]?.dayNumber})`}
                  </div>
                </div>
              )}

              <div className="overflow-x-hidden sm:overflow-x-auto">
                <table className="w-full table-fixed sm:table-auto text-left text-xs border-collapse">
                  <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-1 sm:px-3 text-center w-11 sm:w-14">เลขที่</th>
                      <th className="py-3 px-2 sm:px-4 w-[42%] sm:min-w-[200px]">ชื่อ - นามสกุล</th>
                      <th className="py-3 px-1 sm:px-4 text-center w-[29%] sm:w-48">การดื่มนมโรงเรียน</th>
                      <th className="py-3 px-1 sm:px-4 text-center w-[29%] sm:w-48">การแปรงฟันหลังอาหาร</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {targetStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400">
                          <p className="font-semibold text-slate-600">ไม่มีนักเรียนในเงื่อนไขนี้</p>
                        </td>
                      </tr>
                    ) : (
                      targetStudents.map((student, idx) => {
                        const existingRecord = dailyTracking.find(
                          d => d.date === milkTeethDate && d.studentId === student.id
                        );

                        return (
                          <MilkTeethTrackingRowClean
                            key={student.id}
                            index={student.rollNumber ?? (idx + 1)}
                            student={student}
                            date={milkTeethDate}
                            record={existingRecord}
                            isViewOnly={user.role === 'admin'}
                            onSave={onSaveDailyTracking}
                            onOpenLightbox={onOpenLightbox}
                          />
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* BOTTOM BAR: DATE STEPPER (LEFT) & "บันทึกทั้งหมด" BUTTON (RIGHT) */}
              <div className="p-3.5 sm:p-4 bg-sky-50/90 border-t border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Date Stepper in Bottom Row */}
                <div className="flex items-center bg-white rounded-xl border border-sky-300 shadow-2xs overflow-hidden w-full sm:w-auto justify-between sm:justify-start">
                  <button
                    type="button"
                    onClick={handlePrevMilkDate}
                    disabled={currentMilkDateIdx <= 0}
                    className="px-3 py-2 text-sky-800 hover:bg-sky-100 active:bg-sky-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-r border-sky-200 flex items-center gap-1 text-xs font-bold"
                    title="วันเรียนก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4 text-sky-700" />
                    <span>วันก่อนหน้า</span>
                  </button>
                  <div className="px-3.5 py-2 text-xs font-black text-sky-950 flex items-center gap-2 bg-sky-50/80">
                    <span>📅 {formatThaiDate(milkTeethDate)}</span>
                    {currentMilkDateIdx !== -1 && (
                      <span className="text-[10px] px-2 py-0.5 bg-sky-200 text-sky-900 rounded font-bold whitespace-nowrap">
                        ว.{schoolDaysList[currentMilkDateIdx]?.dayNumber}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleNextMilkDate}
                    disabled={currentMilkDateIdx === -1 || currentMilkDateIdx >= schoolDaysList.length - 1}
                    className="px-3 py-2 text-sky-800 hover:bg-sky-100 active:bg-sky-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-l border-sky-200 flex items-center gap-1 text-xs font-bold"
                    title="วันเรียนถัดไป"
                  >
                    <span>วันถัดไป</span>
                    <ChevronRight className="w-4 h-4 text-sky-700" />
                  </button>
                </div>

                {/* Save All Button (Hidden for Admin read-only) */}
                {user.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={handleSaveAllMilkTeeth}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>บันทึกทั้งหมด (วันที่ {formatThaiDate(milkTeethDate)})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* SUB-TAB 3: COMMENTS & BEHAVIOR EVALUATION (8 criteria + teacher comment) */}
      {adminSubTab === 'comments' && (
        <Module1CommentsEvaluation
          user={user}
          students={students}
          schoolInfo={schoolInfo}
          personnel={personnel}
          registeredHomeroomGrades={registeredHomeroomGrades}
          selectedGrade={gradeFilter}
          selectedAcademicYear={effectiveAcademicYear}
          selectedSemester={effectiveSemester}
          onSelectGrade={handleAdminSelectGrade}
          onShowToast={onShowToast}
          onOpenLightbox={onOpenLightbox}
        />
      )}

      {/* MODAL: CREATE NEW WEIGHT SESSION WITH 100-SCHOOL-DAY POPUP CALENDAR */}
      {isAddSessionModalOpen && (() => {
        const currentMonthGroup = daysGroupedByMonth[weightCalendarMonthIdx] || daysGroupedByMonth[0];
        const [yyyy, mm] = currentMonthGroup ? currentMonthGroup.monthKey.split('-') : ['2026', '05'];
        const yearNum = parseInt(yyyy, 10);
        const monthIdx = parseInt(mm, 10) - 1;
        const daysInMonth = new Date(yearNum, monthIdx + 1, 0).getDate();
        const firstDayOfWeek = new Date(yearNum, monthIdx, 1).getDay();

        const schoolDaysMap = new Map(schoolDaysList.map(d => [d.date, d]));
        const weightTargetStudents = gradeFilter === 'ALL'
          ? students
          : students.filter(s => (s.gradeLevel || '').trim() === gradeFilter);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-3 sm:p-4 w-72 sm:w-80 space-y-2 animate-in zoom-in-95 duration-150">
              {/* Header showing active semester and academic year */}
              <div className="pb-1.5 mb-1 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-sky-900 bg-sky-50/80 px-2.5 py-1.5 rounded-xl">
                <span>ปฏิทินเวลาเรียน 100 วัน</span>
                <span className="bg-white px-2 py-0.5 rounded-lg border border-sky-200 text-sky-800 font-mono shadow-2xs">
                  ภาคเรียนที่ {effectiveSemester}/{effectiveAcademicYear}
                </span>
              </div>

              {/* Month / Year header with Prev/Next buttons */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <button
                  type="button"
                  disabled={weightCalendarMonthIdx <= 0}
                  onClick={() => setWeightCalendarMonthIdx(prev => Math.max(0, prev - 1))}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-30"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="font-bold text-xs text-slate-800">
                  {currentMonthGroup ? currentMonthGroup.monthTitle : ''}
                </div>

                <button
                  type="button"
                  disabled={weightCalendarMonthIdx >= daysGroupedByMonth.length - 1}
                  onClick={() => setWeightCalendarMonthIdx(prev => Math.min(daysGroupedByMonth.length - 1, prev + 1))}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-30"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Month Switcher */}
              {daysGroupedByMonth.length > 0 && (
                <div className="flex items-center justify-between gap-1 py-1 border-b border-slate-100 overflow-x-auto scrollbar-none">
                  {daysGroupedByMonth.map((group, idx) => (
                    <button
                      key={group.monthKey}
                      type="button"
                      onClick={() => setWeightCalendarMonthIdx(idx)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer shrink-0 ${
                        weightCalendarMonthIdx === idx
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {group.shortMonthLabel}
                    </button>
                  ))}
                </div>
              )}

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center py-1 text-[10px] font-bold text-slate-400 border-b border-slate-100">
                <span className="text-rose-500">อา</span>
                <span>จ</span>
                <span>อ</span>
                <span>พ</span>
                <span>พฤ</span>
                <span>ศ</span>
                <span className="text-rose-500">ส</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 py-1.5">
                {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                  <div key={`pad-${idx}`} className="h-8 w-full" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${yyyy}-${mm}-${String(dayNum).padStart(2, '0')}`;
                  const schoolDayItem = schoolDaysMap.get(dateStr);
                  const is100SchoolDay = Boolean(schoolDayItem);
                  const existingSession = sessions.find(s => s.date === dateStr);
                  const isExisting = Boolean(existingSession);

                  const recordedCount = weightTargetStudents.filter(st => {
                    const rec = dailyTracking.find(d => d.date === dateStr && d.studentId === st.id);
                    return rec !== undefined && (rec.weight > 0 || rec.height > 0);
                  }).length;
                  const isFullyRecorded = weightTargetStudents.length > 0 && recordedCount === weightTargetStudents.length;

                  if (is100SchoolDay) {
                    if (isFullyRecorded || isExisting) {
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => {
                            handleSelectCalendarDay(dateStr);
                            setIsAddSessionModalOpen(false);
                          }}
                          className="h-8 w-full rounded-lg text-[11px] font-mono font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer shadow-2xs bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600"
                          title={`มีรายการบันทึกแล้ว: ${formatThaiDate(dateStr)}`}
                        >
                          <span className="leading-tight">{dayNum}</span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          handleSelectCalendarDay(dateStr);
                          setIsAddSessionModalOpen(false);
                        }}
                        className="h-8 w-full rounded-lg text-[11px] font-mono font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer shadow-2xs bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300"
                        title={`วันเรียนที่ ${schoolDayItem?.dayNumber}: คลิกเพื่อสร้าง/เปิดรายการ ${formatThaiDate(dateStr)}`}
                      >
                        <span className="leading-tight">{dayNum}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled
                      className="h-8 w-full rounded-lg text-[11px] font-mono font-normal flex flex-col items-center justify-center bg-slate-100/70 text-slate-300 border border-slate-200/50 cursor-not-allowed opacity-50 select-none"
                    >
                      <span className="leading-tight">{dayNum}</span>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                {schoolDaysList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      const target = schoolDaysList.some(d => d.date === today) ? today : schoolDaysList[0].date;
                      handleSelectCalendarDay(target);
                      setIsAddSessionModalOpen(false);
                    }}
                    className="text-sky-600 hover:text-sky-800 font-bold hover:underline cursor-pointer"
                  >
                    สร้าง/เปิดวันเรียนวันนี้
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddSessionModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer ml-auto text-xs font-semibold"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: EDIT SESSION DATE */}
      {sessionToEditDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <Pencil className="w-5 h-5" />
                <h3>แก้ไขวันที่ของรายการ</h3>
              </div>
              <button
                type="button"
                onClick={() => setSessionToEditDate(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลือกวันที่ใหม่ *
                </label>
                {user.role === 'member' && schoolDaysList.length > 0 ? (
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <select
                      value={editSessionDateVal}
                      onChange={(e) => setEditSessionDateVal(e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {schoolDaysList.map((d) => (
                        <option key={d.date} value={d.date}>
                          วันเรียนที่ {d.dayNumber}: {formatThaiDate(d.date)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <ThaiDatePicker
                    value={editSessionDateVal}
                    onChange={(dateStr) => setEditSessionDateVal(dateStr)}
                    className="w-full"
                  />
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  * จะแสดงเป็น: {formatThaiDate(editSessionDateVal)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSessionToEditDate(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!editSessionDateVal}
                onClick={handleSaveEditSessionDate}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกการแก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE SESSION CONFIRMATION */}
      {sessionToDelete && (() => {
        const sessDate = sessionToDelete.date;
        const currentTargetGrade = gradeFilter !== 'ALL' ? gradeFilter : null;
        const targetStudentsCount = currentTargetGrade 
          ? students.filter(s => (s.gradeLevel || '').trim() === currentTargetGrade).length 
          : students.length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                  <Trash2 className="w-5 h-5" />
                  <h3>ยืนยันการลบข้อมูลน้ำหนัก/ส่วนสูง</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-rose-50/70 border border-rose-100 p-3 rounded-2xl space-y-1">
                <p className="text-xs font-bold text-rose-950">
                  รายการวันที่: <span className="font-black text-rose-700">{formatThaiDate(sessDate)}</span>
                </p>
                <p className="text-[11px] text-rose-800">
                  {currentTargetGrade 
                    ? `ระดับชั้นที่เลือก: ชั้น ${currentTargetGrade} (${targetStudentsCount} คน)` 
                    : `ระดับชั้นที่เลือก: ทุกระดับชั้น (${students.length} คน)`}
                </p>
              </div>

              {currentTargetGrade ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    คุณกำลังเลือกชั้น <strong>{currentTargetGrade}</strong> กรุณาเลือกว่าต้องการลบข้อมูลเฉพาะชั้นนี้ หรือต้องการลบรายการออกทั้งรายการ:
                  </p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteGradeRecords(sessDate, currentTargetGrade)}
                      className="w-full text-left p-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-amber-950 group-hover:text-amber-900 flex items-center justify-between">
                        <span>1. ลบข้อมูลเฉพาะชั้น {currentTargetGrade}</span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-black">เฉพาะชั้น</span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-1">
                        ล้างค่าน้ำหนักและส่วนสูงของนักเรียนชั้น {currentTargetGrade} ในวันที่นี้ (ข้อมูลระดับชั้นอื่นยังคงอยู่)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSessionConfirm(sessionToDelete.id)}
                      className="w-full text-left p-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-rose-950 group-hover:text-rose-900 flex items-center justify-between">
                        <span>2. ลบทั้งรายการ (ทุกระดับชั้น)</span>
                        <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded font-black">ทั้งรายการ</span>
                      </div>
                      <p className="text-[11px] text-rose-800 mt-1">
                        ลบรายการวันที่ {formatThaiDate(sessDate)} ออกจากระบบทั้งหมด
                      </p>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    คุณต้องการลบรายการบันทึกวันที่ <strong>{formatThaiDate(sessDate)}</strong> ออกจากระบบทั้งหมด (ทุกระดับชั้น) ใช่หรือไม่?
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSessionToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                {!currentTargetGrade && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSessionConfirm(sessionToDelete.id)}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer active:scale-95"
                  >
                    ยืนยันลบรายการ (ทุกระดับชั้น)
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* A4 REPORT PREVIEW MODAL FOR MILK & TEETH (1 Month per A4 Portrait Page) */}
      {previewReportType && (() => {
        const activeMonthGroup = daysGroupedByMonth[previewMilkTeethMonthIndex] || daysGroupedByMonth[0];
        const monthDays = activeMonthGroup ? activeMonthGroup.days : [];

        const effectiveMilkTeethGrade = user.role === 'member' && user.assignedGrade
          ? user.assignedGrade
          : milkTeethGradeFilter;

        const previewMilkTeethStudents = (effectiveMilkTeethGrade === 'ALL'
          ? students
          : students.filter(s => s.gradeLevel === effectiveMilkTeethGrade)
        ).sort((a, b) => {
          if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel.localeCompare(b.gradeLevel);
          if (a.rollNumber !== undefined && b.rollNumber !== undefined) return a.rollNumber - b.rollNumber;
          return (a.studentCode || '').localeCompare(b.studentCode || '');
        });

        const directorPerson = personnel?.find(p => 
          (p.personnelType && p.personnelType.includes('ผู้อำนวยการ')) ||
          (p.position && (p.position.includes('ผู้อำนวยการ') || p.position.includes('ผอ.')))
        );
        const directorName = directorPerson 
          ? `${directorPerson.prefix}${directorPerson.firstName} ${directorPerson.lastName}`
          : (schoolInfo?.directorName || '...........................................................');
        const directorPosition = directorPerson?.position || 'ผู้อำนวยการโรงเรียน';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[95vh] overflow-y-auto border border-slate-200">
              
              {/* Modal Control Header (Hidden on print) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 print:hidden shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    📄
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      ตัวอย่างรายงาน A4 ({previewReportType === 'milk' ? 'การดื่มนมโรงเรียน' : 'การแปรงฟันหลังอาหาร'})
                    </h3>
                    <p className="text-xs text-slate-500">
                      แสดงข้อมูล 1 เดือนต่อ 1 หน้ากระดาษ A4 แนวตั้ง (ตามวันเรียน 100 วันที่กำหนด)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Action Download/Print Button */}
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                      onShowToast('success', 'เปิดหน้าต่างพิมพ์ PDF 🖨️', `บันทึก/พิมพ์รายงาน ${previewReportType === 'milk' ? 'การดื่มนม' : 'การแปรงฟัน'} ประจำ${activeMonthGroup?.monthTitle || ''}`);
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>ดาวน์โหลด / พิมพ์ PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewReportType(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Month Selector Pills inside Modal (Hidden on print) */}
              {daysGroupedByMonth.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 bg-slate-100 p-2 rounded-xl border border-slate-200 print:hidden">
                  <span className="text-xs font-bold text-slate-600 px-2 shrink-0">เลือกเดือน:</span>
                  {daysGroupedByMonth.map((group, idx) => (
                    <button
                      key={group.monthKey}
                      type="button"
                      onClick={() => setPreviewMilkTeethMonthIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        idx === previewMilkTeethMonthIndex
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                      }`}
                    >
                      {group.monthTitle} ({group.days.length} วัน)
                    </button>
                  ))}
                </div>
              )}

              {/* A4 Portrait Printable Paper Sheet */}
              <div id="milk-teeth-pdf-sheet" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-inner space-y-5 max-w-[210mm] mx-auto text-black print:border-none print:shadow-none print:p-0">
                {/* Header */}
                <div className="text-center space-y-1 pb-3 border-b-2 border-slate-800">
                  <h2 className="text-base sm:text-lg font-black text-black">
                    {schoolInfo?.schoolName || 'โรงเรียนวัดผลประเมินพัฒนาการ'}
                  </h2>
                  <h3 className="text-sm font-bold text-black">
                    {previewReportType === 'milk' ? 'แบบบันทึกสรุปการดื่มนมโรงเรียน' : 'แบบบันทึกสรุปการแปรงฟันหลังอาหาร'}
                  </h3>
                  <p className="text-xs font-semibold text-black">
                    {activeMonthGroup?.monthTitle || ''} • ภาคเรียนที่ {effectiveSemester} ปีการศึกษา {effectiveAcademicYear}
                    {effectiveMilkTeethGrade !== 'ALL' ? ` • ระดับชั้น ${effectiveMilkTeethGrade}` : ' • ระดับชั้นทั้งหมด'}
                  </p>
                </div>

                {/* Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse border border-slate-800 text-black">
                    <thead>
                      <tr className="bg-white text-black font-bold border-b border-slate-800">
                        <th className="py-2 px-1.5 text-center border-r border-slate-800 w-9 text-black bg-white">เลขที่</th>
                        <th className="py-2 px-2 text-center border-r border-slate-800 min-w-[130px] text-black bg-white">ชื่อ - นามสกุล</th>
                        {monthDays.map((dayItem) => {
                          const dateNum = dayItem.date.split('-')[2] || '';
                          return (
                            <th key={dayItem.date} className="py-2 px-1 text-center border-r border-slate-800 font-mono text-[10px] min-w-[22px] text-black bg-white" title={dayItem.label}>
                              {dateNum}
                            </th>
                          );
                        })}
                        <th className="py-2 px-1.5 text-center w-12 font-bold text-black bg-white">สรุป</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-white text-black">
                      {previewMilkTeethStudents.length === 0 ? (
                        <tr>
                          <td colSpan={monthDays.length + 3} className="py-8 text-center text-black font-medium">
                            ไม่พบรายชื่อนักเรียน
                          </td>
                        </tr>
                      ) : (
                        previewMilkTeethStudents.map((st, idx) => {
                          let checkedCount = 0;

                          return (
                            <tr key={st.id} className="bg-white text-black">
                              <td className="py-1.5 px-1 text-center border-r border-slate-800 font-mono font-semibold text-black">
                                {st.rollNumber ?? (idx + 1)}
                              </td>
                              <td className="py-1.5 px-2 text-left border-r border-slate-800 font-semibold whitespace-nowrap text-black">
                                {st.prefix}{st.firstName} {st.lastName}
                              </td>
                              {monthDays.map((dayItem) => {
                                const rec = dailyTracking.find(d => d.date === dayItem.date && d.studentId === st.id);
                                let isChecked = false;
                                if (previewReportType === 'milk') {
                                  isChecked = rec?.milkStatus === 'ดื่มครบ';
                                } else {
                                  isChecked = rec?.toothBrushStatus === 'แปรงฟันแล้ว';
                                }

                                if (isChecked) checkedCount++;

                                return (
                                  <td key={dayItem.date} className="py-1.5 px-1 text-center border-r border-slate-800 font-bold">
                                    {isChecked ? (
                                      <span className="text-emerald-700 font-extrabold text-xs">✓</span>
                                    ) : (
                                      <span className="text-slate-400 font-semibold text-xs">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-1.5 px-1 text-center font-bold text-black font-mono">
                                {checkedCount}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Official Signatures Section */}
                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-black print:pt-6">
                  <div className="space-y-8">
                    <div>
                      ลงชื่อ ...........................................................
                      <div className="mt-1 font-normal text-black">( ........................................................... )</div>
                      <div className="text-black mt-0.5">ครูผู้บันทึก</div>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div>
                      ลงชื่อ ...........................................................
                      <div className="mt-1 font-normal text-black">( {directorName} )</div>
                      <div className="text-black mt-0.5">{directorPosition}</div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* WEIGHT & HEIGHT PDF PREVIEW MODAL */}
      {pdfPreviewSession && (() => {
        const effectivePreviewGrade = user.role === 'member' && user.assignedGrade
          ? user.assignedGrade
          : pdfPreviewGradeFilter;

        const previewStudents = (effectivePreviewGrade === 'ALL'
          ? students
          : students.filter(s => s.gradeLevel === effectivePreviewGrade)
        ).sort((a, b) => {
          if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel.localeCompare(b.gradeLevel);
          if (a.rollNumber !== undefined && b.rollNumber !== undefined) return a.rollNumber - b.rollNumber;
          return (a.studentCode || '').localeCompare(b.studentCode || '');
        });

        const directorPerson = personnel?.find(p => 
          (p.personnelType && p.personnelType.includes('ผู้อำนวยการ')) ||
          (p.position && (p.position.includes('ผู้อำนวยการ') || p.position.includes('ผอ.')))
        );
        const directorName = directorPerson 
          ? `${directorPerson.prefix}${directorPerson.firstName} ${directorPerson.lastName}`
          : (schoolInfo?.directorName || '...........................................................');
        const directorPosition = directorPerson?.position || 'ผู้อำนวยการโรงเรียน';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:shadow-none print:border-none print:max-w-none print:max-h-none print:rounded-none">
              
              {/* Modal Top Control Bar (Hidden on print) */}
              <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                    📄
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <span>ตัวอย่างเอกสารรายงานน้ำหนักและส่วนสูง (PDF)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      รายการวันที่ {formatThaiDate(pdfPreviewSession.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Grade Filter Selection inside Modal */}
                  {user.role === 'admin' ? (
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                      <span className="text-[11px] font-bold text-slate-400 px-1.5">ชั้น:</span>
                      <select
                        value={pdfPreviewGradeFilter}
                        onChange={(e) => setPdfPreviewGradeFilter(e.target.value)}
                        className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg border border-slate-700 outline-none cursor-pointer"
                      >
                        <option value="ALL">ทั้งหมด ({students.length} คน)</option>
                        {availableGradeLevels.map(g => (
                          <option key={g} value={g}>
                            ชั้น {g} ({students.filter(s => (s.gradeLevel || '').trim() === g).length} คน)
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-700">
                      ระดับชั้น: {user.assignedGrade || 'ป.1'}
                    </div>
                  )}

                  {/* Action Download / Print PDF button */}
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                      onShowToast('info', 'กำลังดาวน์โหลด / พิมพ์ PDF 🖨️', 'เปิดหน้าต่างสำหรับบันทึกเป็น PDF เรียบร้อยแล้ว');
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>ดาวน์โหลด PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfPreviewSession(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="ปิด"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Document Preview Area */}
              <div className="p-6 sm:p-10 overflow-y-auto space-y-6 bg-slate-100/60 print:bg-white print:p-0 print:overflow-visible flex-1">
                {/* Paper Sheet Preview Card */}
                <div id="weight-pdf-sheet" className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-md max-w-3xl mx-auto space-y-6 text-slate-900 print:shadow-none print:border-none print:p-0">
                  
                  {/* Header / Letterhead */}
                  <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
                    <div className="text-xl font-black tracking-tight text-slate-900">
                      {schoolInfo?.schoolName || 'โรงเรียนวัดผลประเมินพัฒนาการ'}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-800">
                      รายงานสรุปการเจริญเติบโต น้ำหนัก ส่วนสูง และภาวะโภชนาการนักเรียน
                    </h2>
                    <p className="text-xs text-slate-600 font-semibold">
                      วันที่ {formatThaiDate(pdfPreviewSession.date)} • ภาคเรียนที่ {effectiveSemester} ปีการศึกษา {effectiveAcademicYear}
                    </p>
                  </div>

                  {/* Main Student Data Table (แสดงเป็นสีขาวและฟอนต์ดำเพื่อความเป็นทางการ) */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse border border-slate-800 bg-white">
                      <thead>
                        <tr className="bg-white text-black font-bold border-b border-slate-800 text-center">
                          <th className="py-2 px-2 text-center border-r border-slate-800 w-12 text-black">ลำดับ</th>
                          <th className="py-2 px-2 text-center border-r border-slate-800 w-16 text-black">ชั้น</th>
                          <th className="py-2 px-3 border-r border-slate-800 text-black">ชื่อ - นามสกุล</th>
                          <th className="py-2 px-2 text-center border-r border-slate-800 w-14 text-black">เพศ</th>
                          <th className="py-2 px-2 text-center border-r border-slate-800 w-20 text-black">น้ำหนัก (กก.)</th>
                          <th className="py-2 px-2 text-center border-r border-slate-800 w-20 text-black">ส่วนสูง (ซม.)</th>
                          <th className="py-2 px-2 text-center border-r border-slate-800 w-16 text-black">BMI</th>
                          <th className="py-2 px-2 text-center w-28 text-black">ภาวะโภชนาการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-white">
                        {previewStudents.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-6 text-center text-slate-500 bg-white">
                              ไม่มีข้อมูลนักเรียน
                            </td>
                          </tr>
                        ) : (
                          previewStudents.map((st, idx) => {
                            const rec = dailyTracking.find(d => d.date === pdfPreviewSession.date && d.studentId === st.id);
                            const w = rec?.weight || 0;
                            const h = rec?.height || 0;
                            const { bmi, status } = calculateThaiNutritionalStatus(w, h, st);
                            const gender = getStudentGender(st);

                            return (
                              <tr key={st.id} className="bg-white">
                                <td className="py-1.5 px-2 text-center font-mono border-r border-slate-800 text-black">
                                  {st.rollNumber ?? (idx + 1)}
                                </td>
                                <td className="py-1.5 px-2 text-center font-semibold border-r border-slate-800 text-black">
                                  {st.gradeLevel}
                                </td>
                                <td className="py-1.5 px-3 font-semibold border-r border-slate-800 text-black">
                                  {st.prefix}{st.firstName} {st.lastName}
                                </td>
                                <td className="py-1.5 px-2 text-center border-r border-slate-800 text-black">
                                  {gender}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono border-r border-slate-800 text-black">
                                  {w > 0 ? w : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono border-r border-slate-800 text-black">
                                  {h > 0 ? h : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono border-r border-slate-800 text-black">
                                  {bmi > 0 ? bmi : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-center font-bold text-black">
                                  {w > 0 && h > 0 ? (
                                    <span className="font-bold text-black text-xs">
                                      {status}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">ยังไม่บันทึก</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Official Signatures Section */}
                  <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-800 print:pt-6">
                    <div className="space-y-8">
                      <div>
                        ลงชื่อ ...........................................................
                        <div className="mt-1 font-normal">( ........................................................... )</div>
                        <div className="text-slate-500 mt-0.5">ครูผู้บันทึก</div>
                      </div>
                    </div>
                    <div className="space-y-8">
                      <div>
                        ลงชื่อ ...........................................................
                        <div className="mt-1 font-normal">( {directorName} )</div>
                        <div className="text-slate-500 mt-0.5">{directorPosition}</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Bottom Toolbar */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
                <button
                  type="button"
                  onClick={() => exportSessionToCsv(pdfPreviewSession, previewStudents, dailyTracking)}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="ส่งออกไฟล์ CSV"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด CSV สำรอง</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPdfPreviewSession(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                      onShowToast('info', 'กำลังดาวน์โหลด / พิมพ์ PDF 🖨️', 'เปิดหน้าต่างบันทึกเป็น PDF เรียบร้อยแล้ว');
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>ดาวน์โหลด PDF</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};

// Component for Weight & Height Tracking Row
interface TrackingRowProps {
  index: number;
  student: Student;
  date: string;
  record?: DailyTracking;
  isViewOnly?: boolean;
  onSave: (record: DailyTracking) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  onOpenLightbox?: (imageUrl: string, title: string, subtitle?: string) => void;
}

const WeightTrackingRow: React.FC<TrackingRowProps> = ({
  index,
  student,
  date,
  record,
  isViewOnly = false,
  onSave,
  onShowToast,
  onOpenLightbox
}) => {
  const [weight, setWeight] = useState<number>(record?.weight || 0);
  const [height, setHeight] = useState<number>(record?.height || 0);

  const { bmi: bmiVal, status: bmiStatus } = calculateThaiNutritionalStatus(weight, height, student);
  const gender = getStudentGender(student);

  const triggerSave = (w: number, h: number) => {
    if (isViewOnly) return;
    const { bmi: computedBmi, status: computedStatus } = calculateThaiNutritionalStatus(w, h, student);
    const updated: DailyTracking = {
      id: record ? record.id : `dt-${student.id}-${date}`,
      date,
      studentId: student.id,
      studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
      gradeLevel: student.gradeLevel,
      weight: w,
      height: h,
      bmi: computedBmi,
      bmiStatus: computedStatus,
      milkStatus: record?.milkTeethRecorded ? record.milkStatus : undefined,
      toothBrushStatus: record?.milkTeethRecorded ? record.toothBrushStatus : undefined,
      milkTeethRecorded: record?.milkTeethRecorded
    };
    onSave(updated);
  };

  const handleWeightChange = (valStr: string) => {
    if (isViewOnly) return;
    const num = Number(valStr);
    setWeight(num);
    triggerSave(num, height);
  };

  const handleHeightChange = (valStr: string) => {
    if (isViewOnly) return;
    const num = Number(valStr);
    setHeight(num);
    triggerSave(weight, num);
  };

  return (
    <tr className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-800">
      <td className="py-2 px-1 sm:px-3 text-center font-bold">
        <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white text-black font-bold text-[11px] sm:text-xs border border-slate-800 shadow-2xs">
          {index}
        </span>
      </td>
      <td className="py-2 px-2 text-center hidden sm:table-cell">
        <span className="px-2 py-0.5 bg-white rounded text-[11px] font-bold text-black border border-slate-800">
          {student.gradeLevel}
        </span>
      </td>
      <td className="py-2 px-1.5 sm:px-4">
        <div className="flex items-center gap-2">
          <div
            onClick={() => {
              if (student.photoUrl && onOpenLightbox) {
                onOpenLightbox(student.photoUrl, `${student.prefix}${student.firstName} ${student.lastName}`, `ชั้น ${student.gradeLevel} • เลขที่ ${index}`);
              }
            }}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shrink-0 border border-slate-300 bg-slate-100 flex items-center justify-center shadow-2xs ${student.photoUrl && onOpenLightbox ? 'cursor-pointer hover:opacity-85' : ''}`}
            title={student.photoUrl ? 'คลิกเพื่อดูรูปภาพขนาดใหญ่' : 'รูปโปรไฟล์นักเรียน'}
          >
            {student.photoUrl ? (
              <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            )}
          </div>
          <span className="font-bold text-black text-[11px] sm:text-xs leading-snug break-words">
            {student.prefix}{student.firstName} {student.lastName}
          </span>
        </div>
      </td>
      <td className="py-2 px-1 sm:px-3 text-center">
        {isViewOnly ? (
          <span className="font-mono font-bold text-[11px] sm:text-xs text-black">
            {weight > 0 ? `${weight}` : '-'}
          </span>
        ) : (
          <input
            type="number"
            step="0.1"
            value={weight || ''}
            onChange={(e) => handleWeightChange(e.target.value)}
            placeholder="กก."
            className="w-14 sm:w-20 text-center text-[11px] sm:text-xs px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-800 tabular-nums focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-2xs font-bold text-black bg-white"
          />
        )}
      </td>
      <td className="py-2 px-1 sm:px-3 text-center">
        {isViewOnly ? (
          <span className="font-mono font-bold text-[11px] sm:text-xs text-black">
            {height > 0 ? `${height}` : '-'}
          </span>
        ) : (
          <input
            type="number"
            step="0.5"
            value={height || ''}
            onChange={(e) => handleHeightChange(e.target.value)}
            placeholder="ซม."
            className="w-14 sm:w-20 text-center text-[11px] sm:text-xs px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-800 tabular-nums focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-2xs font-bold text-black bg-white"
          />
        )}
      </td>
      <td className="py-2 px-1 sm:px-3 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5">
          <span className="font-mono font-bold tabular-nums text-black text-[11px] sm:text-sm">
            {bmiVal > 0 ? bmiVal : '-'}
          </span>
          {bmiVal > 0 && (
            <span className="px-1 py-0.2 sm:px-2 sm:py-0.5 rounded text-[9px] sm:text-[10px] font-bold text-black bg-white border border-slate-800" title={`ประเมินตามเกณฑ์กรมอนามัย (${gender})`}>
              {bmiStatus}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
};

// Component for Milk & Toothbrushing Tracking Row (Clean Table without grade column and individual save button)
interface CleanTrackingRowProps {
  index: number;
  student: Student;
  date: string;
  record?: DailyTracking;
  isViewOnly?: boolean;
  onSave: (record: DailyTracking) => void;
  onOpenLightbox?: (imageUrl: string, title: string, subtitle?: string) => void;
}

const MilkTeethTrackingRowClean: React.FC<CleanTrackingRowProps> = ({
  index,
  student,
  date,
  record,
  isViewOnly = false,
  onSave,
  onOpenLightbox
}) => {
  const [milk, setMilk] = useState<'ดื่มครบ' | 'ไม่ได้ดื่ม' | 'แพ้นม'>(record?.milkStatus || 'ดื่มครบ');
  const [teeth, setTeeth] = useState<'แปรงฟันแล้ว' | 'ยังไม่ได้แปรง'>(record?.toothBrushStatus || 'แปรงฟันแล้ว');

  // Update local state when record updates externally
  useEffect(() => {
    if (record) {
      if (record.milkStatus) setMilk(record.milkStatus);
      if (record.toothBrushStatus) setTeeth(record.toothBrushStatus);
    }
  }, [record?.milkStatus, record?.toothBrushStatus]);

  const triggerSave = (mVal: 'ดื่มครบ' | 'ไม่ได้ดื่ม' | 'แพ้นม', tVal: 'แปรงฟันแล้ว' | 'ยังไม่ได้แปรง') => {
    if (isViewOnly) return;
    const updated: DailyTracking = {
      id: record ? record.id : `dt-${student.id}-${date}`,
      date,
      studentId: student.id,
      studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
      gradeLevel: student.gradeLevel,
      weight: record?.weight || 0,
      height: record?.height || 0,
      bmi: record?.bmi || 0,
      bmiStatus: record?.bmiStatus || 'สมส่วน',
      milkStatus: mVal,
      toothBrushStatus: tVal,
      milkTeethRecorded: true
    };
    onSave(updated);
  };

  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
      <td className="py-2.5 px-1 sm:px-3 text-center font-bold">
        <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] sm:text-xs border border-blue-200 shadow-2xs">
          {index}
        </span>
      </td>
      <td className="py-2.5 px-2 sm:px-4">
        <div className="flex items-center gap-2">
          <div
            onClick={() => {
              if (student.photoUrl && onOpenLightbox) {
                onOpenLightbox(student.photoUrl, `${student.prefix}${student.firstName} ${student.lastName}`, `ชั้น ${student.gradeLevel} • เลขที่ ${index}`);
              }
            }}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center shadow-2xs ${student.photoUrl && onOpenLightbox ? 'cursor-pointer hover:opacity-85' : ''}`}
            title={student.photoUrl ? 'คลิกเพื่อดูรูปภาพขนาดใหญ่' : 'รูปโปรไฟล์นักเรียน'}
          >
            {student.photoUrl ? (
              <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            )}
          </div>
          <span className="font-bold text-slate-800 text-[11px] sm:text-xs whitespace-normal break-words leading-snug">
            {student.prefix}{student.firstName} {student.lastName}
          </span>
        </div>
      </td>
      <td className="py-2.5 px-1 sm:px-4 text-center">
        {isViewOnly ? (
          record?.milkStatus ? (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-xs border ${
              record.milkStatus === 'ดื่มครบ'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : record.milkStatus === 'แพ้นม'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {record.milkStatus === 'ดื่มครบ' ? '🥛 ดื่มครบ' : record.milkStatus === 'แพ้นม' ? '⚠️ แพ้นม' : '❌ ไม่ได้ดื่ม'}
            </span>
          ) : (
            <span className="text-slate-400 font-bold text-xs">-</span>
          )
        ) : (
          <select
            value={milk}
            onChange={(e: any) => {
              const val = e.target.value;
              setMilk(val);
              triggerSave(val, teeth);
            }}
            className="text-[10px] sm:text-xs px-1 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs font-semibold text-slate-700 w-full max-w-[105px] sm:max-w-none truncate"
          >
            <option value="ดื่มครบ">🥛 ดื่มครบ</option>
            <option value="ไม่ได้ดื่ม">❌ ไม่ได้ดื่ม</option>
            <option value="แพ้นม">⚠️ แพ้นม</option>
          </select>
        )}
      </td>
      <td className="py-2.5 px-1 sm:px-4 text-center">
        {isViewOnly ? (
          record?.toothBrushStatus ? (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-xs border ${
              record.toothBrushStatus === 'แปรงฟันแล้ว'
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {record.toothBrushStatus === 'แปรงฟันแล้ว' ? '🪥 แปรงฟันแล้ว' : '❌ ยังไม่ได้แปรง'}
            </span>
          ) : (
            <span className="text-slate-400 font-bold text-xs">-</span>
          )
        ) : (
          <select
            value={teeth}
            onChange={(e: any) => {
              const val = e.target.value;
              setTeeth(val);
              triggerSave(milk, val);
            }}
            className="text-[10px] sm:text-xs px-1 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs font-semibold text-slate-700 w-full max-w-[105px] sm:max-w-none truncate"
          >
            <option value="แปรงฟันแล้ว">🪥 แปรงฟันแล้ว</option>
            <option value="ยังไม่ได้แปรง">❌ ยังไม่ได้แปรง</option>
          </select>
        )}
      </td>
    </tr>
  );
};
