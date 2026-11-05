import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Student, 
  Personnel, 
  SchoolInfo, 
  Subject, 
  GradeRecord, 
  AttendanceRecord, 
  SavingsRecord, 
  GradeLevel,
  UserSession,
  SchoolDayItem,
  DailyTracking
} from '../types';
import { 
  ArrowLeft,
  ChevronRight,
  Search,
  Printer,
  Eye,
  X,
  ClipboardCheck,
  UserCheck,
  Users,
  Download,
  CalendarCheck,
  Building2,
  FileText,
  CheckCircle2,
  Award,
  BookOpen,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { ThreeReportsModal } from './ThreeReportsModal';
import { get100SchoolDaysForTerm } from './Module1ClassroomAdmin';
import { PhorPhor6Modal, calculateThaiGrade } from './PhorPhor6Modal';
import { exportSheetsToPdf } from '../utils/pdfExport';

interface Module7Props {
  user: UserSession;
  students: Student[];
  personnel: Personnel[];
  schoolInfo: SchoolInfo;
  subjects: Subject[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  savings: SavingsRecord[];
  dailyTracking?: DailyTracking[];
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  onOpenLightbox?: (imageUrl: string, title: string, subtitle?: string) => void;
}

const PRIMARY_GRADES: GradeLevel[] = [
  'อ.1', 'อ.2', 'อ.3',
  'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'
];

const SECONDARY_GRADES: GradeLevel[] = [
  'ม.1', 'ม.2', 'ม.3'
];

const THAI_MONTH_NAMES: Record<number, string> = {
  1: 'มกราคม',
  2: 'กุมภาพันธ์',
  3: 'มีนาคม',
  4: 'เมษายน',
  5: 'พฤษภาคม',
  6: 'มิถุนายน',
  7: 'กรกฎาคม',
  8: 'สิงหาคม',
  9: 'กันยายน',
  10: 'ตุลาคม',
  11: 'พฤศจิกายน',
  12: 'ธันวาคม'
};

const THAI_DAY_SHORT: Record<number, string> = {
  0: 'อา.',
  1: 'จ.',
  2: 'อ.',
  3: 'พ.',
  4: 'พฤ.',
  5: 'ศ.',
  6: 'ส.'
};

const THAI_DAY_FULL: Record<number, string> = {
  0: 'อาทิตย์',
  1: 'จันทร์',
  2: 'อังคาร',
  3: 'พุธ',
  4: 'พฤหัสบดี',
  5: 'ศุกร์',
  6: 'เสาร์'
};

const getGradeFullName = (g: GradeLevel): string => {
  switch (g) {
    case 'อ.1': return 'ชั้นอนุบาลปีที่ 1 (อ.1)';
    case 'อ.2': return 'ชั้นอนุบาลปีที่ 2 (อ.2)';
    case 'อ.3': return 'ชั้นอนุบาลปีที่ 3 (อ.3)';
    case 'ป.1': return 'ชั้นประถมศึกษาปีที่ 1 (ป.1)';
    case 'ป.2': return 'ชั้นประถมศึกษาปีที่ 2 (ป.2)';
    case 'ป.3': return 'ชั้นประถมศึกษาปีที่ 3 (ป.3)';
    case 'ป.4': return 'ชั้นประถมศึกษาปีที่ 4 (ป.4)';
    case 'ป.5': return 'ชั้นประถมศึกษาปีที่ 5 (ป.5)';
    case 'ป.6': return 'ชั้นประถมศึกษาปีที่ 6 (ป.6)';
    case 'ม.1': return 'ชั้นมัธยมศึกษาปีที่ 1 (ม.1)';
    case 'ม.2': return 'ชั้นมัธยมศึกษาปีที่ 2 (ม.2)';
    case 'ม.3': return 'ชั้นมัธยมศึกษาปีที่ 3 (ม.3)';
    default: return `ชั้น ${g}`;
  }
};

const getGradeCleanName = (g: GradeLevel | null): string => {
  if (!g) return '';
  switch (g) {
    case 'อ.1': return 'ชั้นอนุบาลปีที่ 1';
    case 'อ.2': return 'ชั้นอนุบาลปีที่ 2';
    case 'อ.3': return 'ชั้นอนุบาลปีที่ 3';
    case 'ป.1': return 'ชั้นประถมศึกษาปีที่ 1';
    case 'ป.2': return 'ชั้นประถมศึกษาปีที่ 2';
    case 'ป.3': return 'ชั้นประถมศึกษาปีที่ 3';
    case 'ป.4': return 'ชั้นประถมศึกษาปีที่ 4';
    case 'ป.5': return 'ชั้นประถมศึกษาปีที่ 5';
    case 'ป.6': return 'ชั้นประถมศึกษาปีที่ 6';
    case 'ม.1': return 'ชั้นมัธยมศึกษาปีที่ 1';
    case 'ม.2': return 'ชั้นมัธยมศึกษาปีที่ 2';
    case 'ม.3': return 'ชั้นมัธยมศึกษาปีที่ 3';
    default: return `ชั้น ${g}`;
  }
};

// Helper: Convert academic year string (e.g. 2569) to AD year number (e.g. 2026)
const getAdYear = (yearStr: string): number => {
  const num = parseInt((yearStr || '').trim(), 10);
  if (isNaN(num)) return 2026;
  return num > 2400 ? num - 543 : num;
};

export interface FullMonthDayItem {
  date: string;          // "YYYY-MM-DD"
  dayNum: number;        // 1..31
  dayOfWeekNum: number;  // 0..6 (0=Sun, 6=Sat)
  dayOfWeekName: string; // "อาทิตย์", "จันทร์", ...
  shortDayName: string;  // "อา.", "จ.", ...
  isSaturday: boolean;
  isSunday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;    // true if weekend OR custom holiday
  holidayLabel: 'วันเสาร์' | 'วันอาทิตย์' | 'วันหยุด' | null;
  note?: string;
}

export interface FullMonthGroup {
  monthKey: string;      // "YYYY-MM"
  monthNum: number;      // 1..12
  yearCE: number;
  yearBE: number;
  monthName: string;
  days: FullMonthDayItem[];
  schoolDaysCount: number; // Count of non-holiday school days
}

export const Module7Reports: React.FC<Module7Props> = ({
  user,
  students,
  personnel,
  schoolInfo,
  subjects = [],
  grades = [],
  attendance,
  savings = [],
  dailyTracking: propsDailyTracking = [],
  onShowToast,
  onOpenLightbox
}) => {
  const [availableAcademicYears, setAvailableAcademicYears] = useState<string[]>(() => {
    const stored = StorageService.getAcademicYears();
    const base = stored && stored.length > 0 ? stored : ['2570', '2569', '2568', '2567'];
    const current = schoolInfo?.academicYear || '2569';
    return Array.from(new Set([current, ...base])).sort((a, b) => Number(b) - Number(a));
  });

  React.useEffect(() => {
    return StorageService.subscribe(() => {
      const stored = StorageService.getAcademicYears();
      const base = stored && stored.length > 0 ? stored : ['2570', '2569', '2568', '2567'];
      const current = schoolInfo?.academicYear || '2569';
      setAvailableAcademicYears(Array.from(new Set([current, ...base])).sort((a, b) => Number(b) - Number(a)));
    });
  }, [schoolInfo?.academicYear]);

  // Admin local view-only state for switching Academic Year & Semester (does not modify schoolInfo or affect members)
  const [adminSelectedYear, setAdminSelectedYear] = useState<string>(schoolInfo?.academicYear || '2569');
  const [adminSelectedSemester, setAdminSelectedSemester] = useState<string>(schoolInfo?.semester || '1');

  React.useEffect(() => {
    if (schoolInfo?.academicYear) setAdminSelectedYear(schoolInfo.academicYear);
    if (schoolInfo?.semester) setAdminSelectedSemester(schoolInfo.semester);
  }, [schoolInfo?.academicYear, schoolInfo?.semester]);

  // For Admin: use local dropdown state; For Member: strictly use schoolInfo set by Admin in Settings
  const selectedYear = user.role === 'admin'
    ? adminSelectedYear
    : (schoolInfo?.academicYear || '2569');
  const selectedSemester = user.role === 'admin'
    ? adminSelectedSemester
    : (schoolInfo?.semester || '1');
  const [activeLevel, setActiveLevel] = useState<'primary' | 'secondary'>('primary');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [selectedPhorPhor6Student, setSelectedPhorPhor6Student] = useState<Student | null>(null);
  const [assessmentViewMode, setAssessmentViewMode] = useState<'score' | 'grade' | 'activity'>('score');

  // Attendance Pop-up Modal state
  const [attendancePopupGrade, setAttendancePopupGrade] = useState<GradeLevel | null>(null);
  const [popupSelectedMonthKey, setPopupSelectedMonthKey] = useState<string | 'all'>('all');

  // Assessment (วัดผล) Pop-up Modal state
  const [assessmentPopupGrade, setAssessmentPopupGrade] = useState<GradeLevel | null>(null);
  const [assessmentSelectedChunkIndex, setAssessmentSelectedChunkIndex] = useState<number | 'all'>('all');

  // (3)รายงาน Pop-up Modal state (การอ่านคิดวิเคราะห์เขียน, คุณลักษณะอันพึงประสงค์, สมรรถนะสำคัญ)
  const [threeReportsPopupGrade, setThreeReportsPopupGrade] = useState<GradeLevel | null>(null);

  // Milk & Toothbrushing Report Pop-up Modal state (ดื่มนม / แปรงฟัน - ดึงจากหน้าธุรการ)
  const [milkTeethModal, setMilkTeethModal] = useState<{ grade: GradeLevel; type: 'milk' | 'teeth' } | null>(null);
  const [milkTeethSelectedMonthKey, setMilkTeethSelectedMonthKey] = useState<string | 'all'>('all');

  // Mobile ปพ.5 dropdown state
  const [openPp5Grade, setOpenPp5Grade] = useState<GradeLevel | null>(null);

  // Synchronize live grades, subjects, dailyTracking, attendance, students, and personnel from storage or props
  const effectiveStudents = useMemo(() => {
    const localStudents = StorageService.getStudents();
    return (localStudents && localStudents.length > 0) ? localStudents : students;
  }, [students, selectedPhorPhor6Student]);

  const effectivePersonnel = useMemo(() => {
    const localPersonnel = StorageService.getPersonnel();
    return (localPersonnel && localPersonnel.length > 0) ? localPersonnel : personnel;
  }, [personnel]);

  const effectiveGrades = useMemo(() => {
    const localGrades = StorageService.getGrades();
    return (localGrades && localGrades.length > 0) ? localGrades : grades;
  }, [grades, assessmentPopupGrade, threeReportsPopupGrade]);

  const effectiveSubjects = useMemo(() => {
    const localSubjects = StorageService.getSubjects();
    return (localSubjects && localSubjects.length > 0) ? localSubjects : subjects;
  }, [subjects, assessmentPopupGrade, threeReportsPopupGrade]);

  const effectiveDailyTracking = useMemo(() => {
    const local = StorageService.getDailyTracking();
    if (local && local.length > 0) return local;
    return propsDailyTracking || [];
  }, [propsDailyTracking, milkTeethModal]);

  const effectiveAttendance = useMemo(() => {
    const local = StorageService.getAttendance();
    return (local && local.length > 0) ? local : attendance;
  }, [attendance, attendancePopupGrade]);

  const normalizeRoom = (r?: string) => (r || '1').toString().trim().replace(/^ห้อง\s*/, '') || '1';

  // Selected room for reports & print modals (defaults to member's assignedRoom if applicable, else '1')
  const [selectedRoom, setSelectedRoom] = useState<string>(() => {
    if (user.role === 'member' && user.assignedRoom) {
      return normalizeRoom(user.assignedRoom);
    }
    return '1';
  });

  const [selectedRoomByGrade, setSelectedRoomByGrade] = useState<Record<string, string>>(() => {
    if (user.role === 'member' && user.assignedGrade && user.assignedRoom) {
      return { [user.assignedGrade]: normalizeRoom(user.assignedRoom) };
    }
    return {};
  });

  // ดึงรายการห้องจากรายชื่อนักเรียนในหน้าข้อมูลนักเรียน (หากมีนักเรียนห้อง 2 จะแสดงห้อง 2 หากไม่มีจะแสดงเฉพาะห้อง 1)
  const getRoomsForGrade = (grade: GradeLevel | null): string[] => {
    if (!grade) return ['1'];
    const rooms = new Set<string>(['1']);
    (effectiveStudents || [])
      .filter(s => s.gradeLevel === grade)
      .forEach(s => rooms.add(normalizeRoom(s.room)));
    return Array.from(rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const getSelectedRoomForGrade = (grade: GradeLevel | null): string => {
    if (!grade) return normalizeRoom(selectedRoom);
    const rooms = getRoomsForGrade(grade);
    const saved = selectedRoomByGrade[grade];
    if (saved && rooms.includes(normalizeRoom(saved))) {
      return normalizeRoom(saved);
    }
    if (rooms.includes(normalizeRoom(selectedRoom))) {
      return normalizeRoom(selectedRoom);
    }
    return rooms[0] || '1';
  };

  const handleSelectRoomForGrade = (grade: GradeLevel | null, rm: string) => {
    const norm = normalizeRoom(rm);
    setSelectedRoom(norm);
    if (grade) {
      setSelectedRoomByGrade(prev => ({ ...prev, [grade]: norm }));
    }
  };

  // Orientation state for แปรงฟัน, ดื่มนม, เช็กชื่อ (Default is always 'portrait' แนวตั้ง)
  const [reportOrientation, setReportOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Selected personnel for popup signatures (shared across attendance, assessment, 3-reports, and milk/teeth modals)
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('');
  const [selectedAcademicHeadId, setSelectedAcademicHeadId] = useState<string>(() => {
    return localStorage.getItem('school_selected_academic_head_id') || '';
  });

  // Sync selectedAcademicHeadId with localStorage
  React.useEffect(() => {
    if (selectedAcademicHeadId) {
      localStorage.setItem('school_selected_academic_head_id', selectedAcademicHeadId);
    } else {
      localStorage.removeItem('school_selected_academic_head_id');
    }
  }, [selectedAcademicHeadId]);

  // Strict Academic Personnel List (ฝ่ายวิชาการ only)
  const academicPersonnelList = useMemo(() => {
    const list = personnel.filter(p => {
      const dept = (p.department || '').toLowerCase();
      const pos = (p.position || '').toLowerCase();
      const type = (p.personnelType || '').toLowerCase();
      return (
        dept.includes('วิชาการ') ||
        pos.includes('วิชาการ') ||
        type.includes('วิชาการ') ||
        pos.includes('รองผู้อำนวยการฝ่ายวิชาการ') ||
        pos.includes('หัวหน้าฝ่ายวิชาการ')
      );
    });
    return list.length > 0 ? list : personnel;
  }, [personnel]);

  // Signature Personnel Resolution
  const activePopupGrade = attendancePopupGrade || assessmentPopupGrade || threeReportsPopupGrade || milkTeethModal?.grade || null;

  const currentGradeAdvisors = useMemo(() => {
    if (!activePopupGrade) return [];
    const list = personnel.filter(p => 
      p.advisorGrade === activePopupGrade || 
      (p.position && (p.position.includes(`ประจำชั้น ${activePopupGrade}`) || p.position.includes(`(${activePopupGrade})`)))
    );
    return list.length > 0 ? list : personnel;
  }, [personnel, activePopupGrade]);

  // Auto-detect homeroom teacher when popup grade or selectedRoom changes
  React.useEffect(() => {
    const targetGrade = attendancePopupGrade || assessmentPopupGrade || threeReportsPopupGrade || milkTeethModal?.grade;
    if (targetGrade) {
      const targetRm = normalizeRoom(selectedRoom);
      const rooms = getRoomsForGrade(targetGrade);
      if (!rooms.includes(targetRm)) {
        setSelectedRoom(rooms[0] || '1');
      }

      // 1. Homeroom Teacher: Match advisorGrade + advisorRoom first, then advisorGrade
      const advisor =
        personnel.find(p => p.advisorGrade === targetGrade && normalizeRoom(p.advisorRoom) === targetRm) ||
        personnel.find(p => 
          p.advisorGrade === targetGrade || 
          (p.position && (p.position.includes(`ประจำชั้น ${targetGrade}`) || p.position.includes(`(${targetGrade})`)))
        ) ||
        currentGradeAdvisors[0] ||
        personnel[0];
      
      if (advisor) {
        setSelectedAdvisorId(advisor.id);
      }

      // 2. Academic Head -> Default to first academic person if not set
      if (!selectedAcademicHeadId && academicPersonnelList.length > 0) {
        setSelectedAcademicHeadId(academicPersonnelList[0].id);
      }
    }
  }, [attendancePopupGrade, assessmentPopupGrade, threeReportsPopupGrade, milkTeethModal, selectedRoom, personnel, academicPersonnelList, selectedAcademicHeadId, currentGradeAdvisors]);

  // 100 School Days for Milk & Teeth (matching Module 1)
  const milkTeethSchoolDaysList = useMemo(() => {
    return get100SchoolDaysForTerm(selectedYear, selectedSemester);
  }, [selectedYear, selectedSemester]);

  const milkTeethMonthGroups = useMemo(() => {
    const thaiFullMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const shortThaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const groups: { [key: string]: { monthKey: string; monthTitle: string; shortMonthLabel: string; days: { date: string; dayNumber: number; label: string }[] } } = {};
    
    milkTeethSchoolDaysList.forEach(dayItem => {
      const [yyyy, mm] = dayItem.date.split('-');
      const mIdx = parseInt(mm, 10) - 1;
      const monthTitle = `เดือน${thaiFullMonths[mIdx] || ''}`;
      const shortMonthLabel = shortThaiMonths[mIdx] || '';
      const monthKey = `${yyyy}-${mm}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = { monthKey, monthTitle, shortMonthLabel, days: [] };
      }
      groups[monthKey].days.push(dayItem);
    });
    
    return Object.values(groups);
  }, [milkTeethSchoolDaysList]);

  const selectedAdvisor = useMemo(() => {
    if (selectedAdvisorId) {
      const found = personnel.find(p => p.id === selectedAdvisorId);
      if (found) return found;
    }
    return currentGradeAdvisors[0] || null;
  }, [personnel, selectedAdvisorId, currentGradeAdvisors]);

  const selectedAcademicHead = useMemo(() => {
    if (selectedAcademicHeadId) {
      return personnel.find(p => p.id === selectedAcademicHeadId) || null;
    }
    return academicPersonnelList[0] || null;
  }, [personnel, selectedAcademicHeadId, academicPersonnelList]);

  const directorPersonnel = useMemo(() => {
    return (
      personnel.find(p => p.personnelType === 'ผู้อำนวยการ') ||
      personnel.find(p => 
        p.position && 
        (p.position.includes('ผู้อำนวยการ') || p.position.includes('ผอ.')) && 
        !p.position.includes('รอง')
      ) ||
      personnel.find(p => 
        (p.position && (p.position.includes('ผู้อำนวยการ') || p.position.includes('ผอ.'))) ||
        (p.personnelType && p.personnelType.includes('ผู้อำนวยการ'))
      ) ||
      null
    );
  }, [personnel]);

  const directorDisplayName = useMemo(() => {
    if (directorPersonnel) {
      return `${directorPersonnel.prefix || ''}${directorPersonnel.firstName || ''} ${directorPersonnel.lastName || ''}`.trim();
    }
    return schoolInfo.directorName || '................................................';
  }, [directorPersonnel, schoolInfo.directorName]);

  const directorPosition = useMemo(() => {
    if (directorPersonnel && directorPersonnel.position && directorPersonnel.position.trim()) {
      return directorPersonnel.position.trim();
    }
    return 'ผู้อำนวยการโรงเรียนบ้านนาออก';
  }, [directorPersonnel]);

  // Editable Signatures State (Allows directly editing the name in parentheses and position below it on preview)
  const [signAdvisorName, setSignAdvisorName] = useState<string>('');
  const [signAdvisorPosition, setSignAdvisorPosition] = useState<string>('ครูประจำชั้น');
  const [signAcademicHeadName, setSignAcademicHeadName] = useState<string>('');
  const [signAcademicHeadPosition, setSignAcademicHeadPosition] = useState<string>('หัวหน้าฝ่ายวิชาการ');
  const [signDirectorName, setSignDirectorName] = useState<string>('');
  const [signDirectorPosition, setSignDirectorPosition] = useState<string>('');

  useEffect(() => {
    setSignAdvisorName(
      selectedAdvisor
        ? `${selectedAdvisor.prefix || ''}${selectedAdvisor.firstName || ''} ${selectedAdvisor.lastName || ''}`.trim()
        : '................................................'
    );
  }, [selectedAdvisor]);

  useEffect(() => {
    setSignAcademicHeadName(
      selectedAcademicHead
        ? `${selectedAcademicHead.prefix || ''}${selectedAcademicHead.firstName || ''} ${selectedAcademicHead.lastName || ''}`.trim()
        : '................................................'
    );
  }, [selectedAcademicHead]);

  useEffect(() => {
    setSignDirectorName(directorDisplayName || '................................................');
  }, [directorDisplayName]);

  useEffect(() => {
    setSignDirectorPosition(directorPosition || 'ผู้อำนวยการโรงเรียนบ้านนาออก');
  }, [directorPosition]);

  const renderEditableSignatures = (marginTop: string = '2.1cm', compact: boolean = false) => (
    <div
      className={`grid grid-cols-3 gap-2 text-center ${compact ? 'text-[11px]' : 'text-[11.5px]'} text-black`}
      style={{ marginTop }}
    >
      {/* Advisor */}
      <div className="space-y-1 text-center">
        <p className="text-black text-center">ลงชื่อ ..................................................</p>
        <div className="space-y-1 text-center">
          <div className="flex items-center justify-center font-normal text-black text-[11px] leading-tight">
            <span className="select-none font-normal">(</span>
            <input
              type="text"
              value={signAdvisorName}
              onChange={(e) => setSignAdvisorName(e.target.value)}
              onFocus={(e) => {
                if (/^\.+$/.test(e.target.value.trim())) {
                  e.target.select();
                }
              }}
              placeholder="................................................"
              className="bg-transparent text-center border-b border-transparent hover:border-slate-400 focus:border-indigo-600 focus:bg-indigo-50/40 focus:outline-none px-1 py-0 text-black text-[11px] leading-tight min-w-[140px] max-w-[200px] transition-colors cursor-text print:border-none print:bg-transparent"
              title="คลิกเพื่อแก้ไขชื่อ"
            />
            <span className="select-none font-normal">)</span>
          </div>
          <div className="w-full text-center">
            <input
              type="text"
              value={signAdvisorPosition}
              onChange={(e) => setSignAdvisorPosition(e.target.value)}
              placeholder="ตำแหน่ง"
              className={`bg-transparent text-center border-b border-transparent hover:border-slate-400 focus:border-indigo-600 focus:bg-indigo-50/40 focus:outline-none px-1 py-0 leading-tight ${compact ? 'text-[10px]' : 'text-[10.5px]'} text-black w-full mx-auto block transition-colors cursor-text print:border-none print:bg-transparent`}
              title="คลิกเพื่อแก้ไขตำแหน่ง"
            />
          </div>
        </div>
      </div>

      {/* Academic Head */}
      <div className="space-y-1 text-center">
        <p className="text-black text-center">ลงชื่อ ..................................................</p>
        <div className="space-y-1 text-center">
          <div className="flex items-center justify-center font-normal text-black text-[11px] leading-tight">
            <span className="select-none font-normal">(</span>
            <input
              type="text"
              value={signAcademicHeadName}
              onChange={(e) => setSignAcademicHeadName(e.target.value)}
              onFocus={(e) => {
                if (/^\.+$/.test(e.target.value.trim())) {
                  e.target.select();
                }
              }}
              placeholder="................................................"
              className="bg-transparent text-center border-b border-transparent hover:border-slate-400 focus:border-indigo-600 focus:bg-indigo-50/40 focus:outline-none px-1 py-0 text-black text-[11px] leading-tight min-w-[140px] max-w-[200px] transition-colors cursor-text print:border-none print:bg-transparent"
              title="คลิกเพื่อแก้ไขชื่อ"
            />
            <span className="select-none font-normal">)</span>
          </div>
          <div className="w-full text-center">
            <input
              type="text"
              value={signAcademicHeadPosition}
              onChange={(e) => setSignAcademicHeadPosition(e.target.value)}
              placeholder="ตำแหน่ง"
              className={`bg-transparent text-center border-b border-transparent hover:border-slate-400 focus:border-indigo-600 focus:bg-indigo-50/40 focus:outline-none px-1 py-0 leading-tight ${compact ? 'text-[10px]' : 'text-[10.5px]'} text-black w-full mx-auto block transition-colors cursor-text print:border-none print:bg-transparent`}
              title="คลิกเพื่อแก้ไขตำแหน่ง"
            />
          </div>
        </div>
      </div>

      {/* Director */}
      <div className="space-y-1 text-center">
        <p className="text-black text-center">ลงชื่อ ..................................................</p>
        <div className="space-y-1 text-center">
          <div className="flex items-center justify-center font-normal text-black text-[11px] leading-tight">
            <span className="select-none font-normal">(</span>
            <input
              type="text"
              value={signDirectorName}
              onChange={(e) => setSignDirectorName(e.target.value)}
              onFocus={(e) => {
                if (/^\.+$/.test(e.target.value.trim())) {
                  e.target.select();
                }
              }}
              placeholder="................................................"
              className="bg-transparent text-center border-b border-transparent hover:border-slate-400 focus:border-indigo-600 focus:bg-indigo-50/40 focus:outline-none px-1 py-0 text-black text-[11px] leading-tight min-w-[140px] max-w-[200px] transition-colors cursor-text print:border-none print:bg-transparent"
              title="คลิกเพื่อแก้ไขชื่อ"
            />
            <span className="select-none font-normal">)</span>
          </div>
          <div className="w-full text-center">
            <input
              type="text"
              value={signDirectorPosition}
              onChange={(e) => setSignDirectorPosition(e.target.value)}
              placeholder="ตำแหน่ง"
              className={`bg-transparent text-center border-b border-transparent hover:border-slate-400 focus:border-indigo-600 focus:bg-indigo-50/40 focus:outline-none px-1 py-0 leading-tight ${compact ? 'text-[10px]' : 'text-[10.5px]'} text-black w-full mx-auto block transition-colors cursor-text print:border-none print:bg-transparent`}
              title="คลิกเพื่อแก้ไขตำแหน่ง"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Helper to extract unique subject teacher names for a 5-subject chunk
  const getSubjectTeacherName = (chunk: Subject[], personnelList: Personnel[], defaultAdvisor: Personnel | null): string => {
    const teacherNamesSet = new Set<string>();

    chunk.forEach(subj => {
      if (subj.teacherId) {
        const p = personnelList.find(item => item.id === subj.teacherId);
        if (p) {
          teacherNamesSet.add(`${p.prefix || ''}${p.firstName || ''} ${p.lastName || ''}`.trim());
        }
      }
      if (subj.teacherName && subj.teacherName.trim()) {
        const trimmed = subj.teacherName.trim();
        const matched = personnelList.find(p => `${p.firstName} ${p.lastName}` === trimmed || `${p.prefix}${p.firstName} ${p.lastName}` === trimmed);
        if (matched) {
          teacherNamesSet.add(`${matched.prefix || ''}${matched.firstName || ''} ${matched.lastName || ''}`.trim());
        } else {
          teacherNamesSet.add(trimmed);
        }
      }
    });

    const names = Array.from(teacherNamesSet).filter(Boolean);
    if (names.length > 0) {
      return names.join(', ');
    }

    if (defaultAdvisor) {
      return `${defaultAdvisor.prefix || ''}${defaultAdvisor.firstName || ''} ${defaultAdvisor.lastName || ''}`.trim();
    }

    return '................................................';
  };

  const currentGradeList = activeLevel === 'primary' ? PRIMARY_GRADES : SECONDARY_GRADES;

  // Count of students per grade level from "ข้อมูล/อื่นๆ" -> "ข้อมูลนักเรียน"
  const studentCountByGrade = useMemo(() => {
    const counts: Record<string, number> = {};
    (effectiveStudents || []).forEach(s => {
      if (s.gradeLevel) {
        counts[s.gradeLevel] = (counts[s.gradeLevel] || 0) + 1;
      }
    });
    return counts;
  }, [effectiveStudents]);

  const sortStudentsByRoll = (list: Student[]): Student[] => {
    return [...list].sort((a, b) => {
      const rollA = Number(a.rollNumber);
      const rollB = Number(b.rollNumber);
      const hasRollA = !isNaN(rollA) && rollA > 0;
      const hasRollB = !isNaN(rollB) && rollB > 0;
      if (hasRollA && hasRollB && rollA !== rollB) {
        return rollA - rollB;
      }
      if (hasRollA && !hasRollB) return -1;
      if (!hasRollA && hasRollB) return 1;
      return (a.studentCode || '').localeCompare(b.studentCode || '', undefined, { numeric: true });
    });
  };

  // Filter students for selected grade & room in main roster view (sorted by rollNumber 1 -> last)
  const gradeStudents = useMemo(() => {
    const targetRm = normalizeRoom(selectedRoom);
    return selectedGrade 
      ? sortStudentsByRoll(
          effectiveStudents.filter(
            s => s.gradeLevel === selectedGrade && normalizeRoom(s.room) === targetRm
          )
        )
      : [];
  }, [effectiveStudents, selectedGrade, selectedRoom]);

  // Advisor teacher assigned to selected grade & room
  const classAdvisor = useMemo(() => {
    if (!selectedGrade) return null;
    const targetRm = normalizeRoom(selectedRoom);
    return (
      effectivePersonnel.find(p => p.advisorGrade === selectedGrade && normalizeRoom(p.advisorRoom) === targetRm) ||
      effectivePersonnel.find(p => p.advisorGrade === selectedGrade) ||
      null
    );
  }, [effectivePersonnel, selectedGrade, selectedRoom]);

  // Filter students for popup grade & room (เช็กชื่อ - sorted by rollNumber 1 -> last)
  const popupGradeStudents = useMemo(() => {
    const targetRm = normalizeRoom(selectedRoom);
    return attendancePopupGrade
      ? sortStudentsByRoll(
          effectiveStudents.filter(
            s => s.gradeLevel === attendancePopupGrade && normalizeRoom(s.room) === targetRm
          )
        )
      : [];
  }, [effectiveStudents, attendancePopupGrade, selectedRoom]);

  // Advisor teacher for popup grade & room
  const popupClassAdvisor = useMemo(() => {
    if (!attendancePopupGrade) return null;
    const targetRm = normalizeRoom(selectedRoom);
    return (
      effectivePersonnel.find(p => p.advisorGrade === attendancePopupGrade && normalizeRoom(p.advisorRoom) === targetRm) ||
      effectivePersonnel.find(p => p.advisorGrade === attendancePopupGrade) ||
      null
    );
  }, [effectivePersonnel, attendancePopupGrade, selectedRoom]);

  // Filter students for assessment popup grade & room (sorted by rollNumber 1 -> last)
  const assessmentGradeStudents = useMemo(() => {
    const targetRm = normalizeRoom(selectedRoom);
    return assessmentPopupGrade
      ? sortStudentsByRoll(
          effectiveStudents.filter(
            s => s.gradeLevel === assessmentPopupGrade && normalizeRoom(s.room) === targetRm
          )
        )
      : [];
  }, [effectiveStudents, assessmentPopupGrade, selectedRoom]);

  // Filter subjects for assessment popup grade: Pull academic subjects (!isActivity) registered by teaching members of that grade
  const assessmentGradeSubjects = useMemo(() => {
    if (!assessmentPopupGrade) return [];
    // 1. Try matching grade, semester, and academic year (exclude activities)
    let list = effectiveSubjects.filter(s => 
      !s.isActivity &&
      s.gradeLevel === assessmentPopupGrade && 
      (s.semester === selectedSemester || !s.semester) &&
      (s.academicYear === selectedYear || !s.academicYear)
    );
    // 2. If empty, try matching grade and semester
    if (list.length === 0) {
      list = effectiveSubjects.filter(s => 
        !s.isActivity &&
        s.gradeLevel === assessmentPopupGrade && 
        (s.semester === selectedSemester || !s.semester)
      );
    }
    // 3. If still empty, match grade only
    if (list.length === 0) {
      list = effectiveSubjects.filter(s => !s.isActivity && s.gradeLevel === assessmentPopupGrade);
    }

    // Prefer subjects matching the selectedRoom if any exist for that room
    const roomMatched = list.filter(s => normalizeRoom(s.room) === normalizeRoom(selectedRoom));
    if (roomMatched.length > 0) {
      list = roomMatched;
    }

    // Filter subjects where member registered to teach
    const registered = list.filter(s => 
      Boolean(s.teacherId && s.teacherId.trim() !== '') || 
      Boolean(s.teacherName && s.teacherName.trim() !== '')
    );
    const resultList = registered.length > 0 ? registered : list;

    const isKinder = ['อ.1', 'อ.2', 'อ.3'].includes(assessmentPopupGrade) || assessmentPopupGrade.startsWith('อ.');

    return [...resultList].sort((a, b) => {
      const hasSortA = typeof a.sortOrder === 'number' && !isNaN(a.sortOrder);
      const hasSortB = typeof b.sortOrder === 'number' && !isNaN(b.sortOrder);
      if (hasSortA && hasSortB && a.sortOrder !== b.sortOrder) {
        return (a.sortOrder as number) - (b.sortOrder as number);
      }
      if (hasSortA !== hasSortB) {
        return hasSortA ? -1 : 1;
      }
      if (isKinder) {
        const aHasComp = a.hasKindergartenCompetency !== false;
        const bHasComp = b.hasKindergartenCompetency !== false;
        if (aHasComp !== bHasComp) {
          return aHasComp ? 1 : -1;
        }
        const codeA = (a.code || '').trim();
        const codeB = (b.code || '').trim();
        if (codeA && codeB && codeA !== codeB) {
          return codeA.localeCompare(codeB, 'th');
        }
        // Preserve original curriculum/creation order when subject code is not used
        return resultList.indexOf(a) - resultList.indexOf(b);
      }
      const getPrimaryDefaultOrder = (sub: Subject): number => {
        const name = (sub.name || '').trim();
        const code = (sub.code || '').trim();
        if (name === 'ภาษาไทย' || code.startsWith('ท1')) return 1;
        if (name === 'คณิตศาสตร์' || code.startsWith('ค1')) return 2;
        if (name === 'สังคมศึกษา' || code.startsWith('ส1')) return 3;
        if (name === 'สุขศึกษาและพลศึกษา' || code.startsWith('พ1')) return 4;
        if (name === 'ศิลปะ' || code.startsWith('ศ1')) return 5;
        if (name === 'การงานอาชีพ' || code.startsWith('ง1')) return 6;
        if (name === 'ภาษาต่างประเทศ' || code.startsWith('อ1')) return 7;
        if (name === 'วิทยาศาสตร์และเทคโนโลยี' || code.startsWith('ว1')) return 8;
        if (name === 'ประวัติศาสตร์' || code.startsWith('ป1')) return 9;
        return 99;
      };
      const ordA = getPrimaryDefaultOrder(a);
      const ordB = getPrimaryDefaultOrder(b);
      if (ordA !== ordB) return ordA - ordB;
      const codeA = a.code || '';
      const codeB = b.code || '';
      const cmp = codeA.localeCompare(codeB, 'th');
      if (cmp !== 0) return cmp;
      return (a.name || '').localeCompare(b.name || '', 'th');
    });
  }, [effectiveSubjects, assessmentPopupGrade, selectedSemester, selectedYear, selectedRoom]);

  // Filter activities (isActivity === true) for assessment popup grade
  const assessmentGradeActivities = useMemo(() => {
    if (!assessmentPopupGrade) return [];
    // 1. Try matching grade, semester, and academic year
    let list = effectiveSubjects.filter(s => 
      Boolean(s.isActivity) &&
      s.gradeLevel === assessmentPopupGrade && 
      (s.semester === selectedSemester || !s.semester) &&
      (s.academicYear === selectedYear || !s.academicYear)
    );
    // 2. If empty, try matching grade and semester
    if (list.length === 0) {
      list = effectiveSubjects.filter(s => 
        Boolean(s.isActivity) &&
        s.gradeLevel === assessmentPopupGrade && 
        (s.semester === selectedSemester || !s.semester)
      );
    }
    // 3. If still empty, match grade only
    if (list.length === 0) {
      list = effectiveSubjects.filter(s => Boolean(s.isActivity) && s.gradeLevel === assessmentPopupGrade);
    }

    const roomMatchedActs = list.filter(s => normalizeRoom(s.room) === normalizeRoom(selectedRoom));
    if (roomMatchedActs.length > 0) {
      list = roomMatchedActs;
    }

    // Also include any activity records recorded in effectiveGrades for students of this grade in this semester/year
    const studentIdsInGrade = new Set(assessmentGradeStudents.map(st => st.id));
    const extraActivities: Subject[] = [];
    effectiveGrades.forEach(g => {
      if (!studentIdsInGrade.has(g.studentId)) return;
      if (String(g.semester || '').trim() !== String(selectedSemester || '').trim()) return;
      if (g.academicYear && String(g.academicYear).trim() !== String(selectedYear).trim()) return;
      const hasActResult = Boolean(g.activityResult && g.activityResult.trim() !== '');
      const isActId = String(g.subjectId || '').startsWith('act-');
      if (!hasActResult && !isActId) return;

      const existsInList = list.some(s => 
        s.id === g.subjectId || 
        ((s.code || '').trim().toUpperCase() !== '' && (s.code || '').trim().toUpperCase() === (g.subjectCode || '').trim().toUpperCase()) ||
        ((s.name || '').trim() !== '' && (s.name || '').trim() === (g.subjectName || '').trim())
      ) || extraActivities.some(s => 
        s.id === g.subjectId || 
        ((s.code || '').trim().toUpperCase() !== '' && (s.code || '').trim().toUpperCase() === (g.subjectCode || '').trim().toUpperCase()) ||
        ((s.name || '').trim() !== '' && (s.name || '').trim() === (g.subjectName || '').trim())
      );

      if (!existsInList && (g.subjectName || g.subjectCode)) {
        extraActivities.push({
          id: g.subjectId || `act-extra-${extraActivities.length}`,
          code: g.subjectCode || '',
          name: g.subjectName || g.subjectCode || 'กิจกรรมพัฒนาผู้เรียน',
          gradeLevel: assessmentPopupGrade,
          semester: (selectedSemester === '2' ? '2' : '1'),
          academicYear: selectedYear,
          hoursPerWeek: 1,
          totalScore: 0,
          courseworkScore: 0,
          examScore: 0,
          isActivity: true,
        });
      }
    });

    const combined = [...list, ...extraActivities];

    // Deduplicate by code + name, preferring entries with teacher assigned
    const dedupMap = new Map<string, Subject>();
    combined.forEach(act => {
      const key = `${(act.code || '').trim().toUpperCase()}__${(act.name || '').trim()}`;
      const existing = dedupMap.get(key);
      if (!existing) {
        dedupMap.set(key, act);
      } else {
        const existingHasTeacher = Boolean(existing.teacherId || existing.teacherName);
        const currentHasTeacher = Boolean(act.teacherId || act.teacherName);
        if (!existingHasTeacher && currentHasTeacher) {
          dedupMap.set(key, act);
        }
      }
    });

    return Array.from(dedupMap.values()).sort((a, b) => {
      const hasSortA = typeof a.sortOrder === 'number' && !isNaN(a.sortOrder);
      const hasSortB = typeof b.sortOrder === 'number' && !isNaN(b.sortOrder);
      if (hasSortA && hasSortB && a.sortOrder !== b.sortOrder) {
        return (a.sortOrder as number) - (b.sortOrder as number);
      }
      if (hasSortA !== hasSortB) {
        return hasSortA ? -1 : 1;
      }
      const codeA = a.code || '';
      const codeB = b.code || '';
      const cmp = codeA.localeCompare(codeB, 'th');
      if (cmp !== 0) return cmp;
      return (a.name || '').localeCompare(b.name || '', 'th');
    });
  }, [effectiveSubjects, effectiveGrades, assessmentGradeStudents, assessmentPopupGrade, selectedSemester, selectedYear, selectedRoom]);

  const isAssessmentKindergarten = assessmentPopupGrade
    ? ['อ.1', 'อ.2', 'อ.3'].includes(assessmentPopupGrade) || assessmentPopupGrade.startsWith('อ.')
    : false;

  const doesKindergartenSubjectHaveCompetency = (subject: Subject): boolean => {
    if (subject.hasKindergartenCompetency === false) return false;
    if (subject.hasKindergartenCompetency === true) return true;
    const comps = subject.kindergartenCompetencies || [];
    if (comps.length > 1) return true;
    if (comps.length === 1 && Boolean(comps[0]?.title?.trim())) return true;
    const items = subject.assignmentItems || [];
    if (new Set(items.map(it => it.unitNumber || 1)).size > 1) return true;
    const subtopics = subject.subtopics || [];
    if (subtopics.length > 1 || subtopics.some(st => (st || '').includes('สมรรถนะ'))) return true;
    if ((subject.name || '').includes('สุขภาวะ')) return true;
    if (subtopics.length === 1 && !subtopics[0].includes('สมรรถนะ') && !comps[0]?.title?.trim()) return false;
    return true;
  };

  const getKindergartenSubjectElements = (subject: Subject): {
    id: string;
    name: string;
    unitNumber: number;
    competencyLabel: string;
  }[] => {
    const hasComp = doesKindergartenSubjectHaveCompetency(subject);
    const comps = subject.kindergartenCompetencies || [];
    const subtopics = subject.subtopics || [];
    const items = subject.assignmentItems || [];

    const getCompLabel = (unitNum: number): string => {
      if (!hasComp) return '';
      const compObj = comps[unitNum - 1];
      if (compObj && compObj.title && compObj.title.trim()) {
        const cleanT = compObj.title.trim().replace(/^สมรรถนะ(\s*ที่)?\s*\d+\s*:?\s*/i, '').trim();
        return cleanT ? `${unitNum}: ${cleanT}` : `${unitNum}`;
      }
      const subStr = subtopics[unitNum - 1];
      if (subStr && subStr.trim()) {
        const cleanT = subStr.trim().replace(/^สมรรถนะ(\s*ที่)?\s*\d+\s*:?\s*/i, '').trim();
        return cleanT ? `${unitNum}: ${cleanT}` : `${unitNum}`;
      }
      return `${unitNum}`;
    };

    if (items.length > 0) {
      return items.map((it, idx) => {
        const uNum = it.unitNumber || 1;
        return {
          id: it.id,
          name: it.name || `องค์ประกอบ/ประเด็น ${idx + 1}`,
          unitNumber: uNum,
          competencyLabel: getCompLabel(uNum)
        };
      });
    }

    if (comps.length > 0) {
      const result: { id: string; name: string; unitNumber: number; competencyLabel: string }[] = [];
      comps.forEach((c, cIdx) => {
        const uNum = cIdx + 1;
        const els = c.elements && c.elements.length > 0 ? c.elements : ['องค์ประกอบ/ประเด็น 1'];
        els.forEach((elName, eIdx) => {
          result.push({
            id: `asg-k-${uNum}-${eIdx + 1}`,
            name: elName || `องค์ประกอบ/ประเด็น ${eIdx + 1}`,
            unitNumber: uNum,
            competencyLabel: getCompLabel(uNum)
          });
        });
      });
      if (result.length > 0) return result;
    }

    return [
      {
        id: 'asg-k-1-1',
        name: 'องค์ประกอบ/ประเด็น 1',
        unitNumber: 1,
        competencyLabel: hasComp ? 'สมรรถนะ 1' : ''
      }
    ];
  };

  const getKindergartenRubricLabel = (subject: Subject, level: number | null): string => {
    if (level === null || isNaN(level) || level <= 0) return '-';
    const rubrics =
      subject.rubricLevels && subject.rubricLevels.length > 0
        ? subject.rubricLevels
        : [
            { level: 1, label: 'ควรเสริม' },
            { level: 2, label: 'ได้บางครั้ง' },
            { level: 3, label: 'ปฏิบัติได้' }
          ];
    const found = rubrics.find(r => r.level === level);
    if (found) return found.label;
    if (level >= 3) return 'ปฏิบัติได้';
    if (level === 2) return 'ได้บางครั้ง';
    return 'ควรเสริม';
  };

  const getStudentKindergartenEval = (studentId: string, subject: Subject, targetSem: string = selectedSemester) => {
    const codeUpper = (subject.code || '').trim().toUpperCase();
    const nameClean = (subject.name || '').trim();

    let rec = effectiveGrades.find(g =>
      g.studentId === studentId &&
      g.subjectId === subject.id &&
      isGradeRecordForSemAndYear(g, targetSem, selectedYear) &&
      hasRecordedScoreValue(g)
    );
    if (!rec) {
      rec = effectiveGrades.find(g =>
        g.studentId === studentId &&
        ((codeUpper !== '' && (g.subjectCode || '').trim().toUpperCase() === codeUpper) ||
          (nameClean !== '' && (g.subjectName || '').trim() === nameClean)) &&
        isGradeRecordForSemAndYear(g, targetSem, selectedYear) &&
        hasRecordedScoreValue(g)
      );
    }

    const elements = getKindergartenSubjectElements(subject);
    const asgScores = rec?.assignmentScores || {};
    const maxRubric = subject.rubricMaxLevel || (subject.rubricLevels?.length) || 3;

    const elementResults = elements.map((el, idx) => {
      let val = asgScores[el.id];
      if (val === undefined) {
        // Fallback match by index if IDs were regenerated
        const asgKeys = Object.keys(asgScores);
        if (asgKeys.length === elements.length && typeof asgScores[asgKeys[idx]] === 'number') {
          val = asgScores[asgKeys[idx]];
        }
      }
      const numVal = typeof val === 'number' && !isNaN(val) && val > 0 ? val : null;
      return {
        ...el,
        score: numVal,
        displayScore: numVal !== null ? String(numVal) : '-',
        label: getKindergartenRubricLabel(subject, numVal)
      };
    });

    const validScores = elementResults
      .map(e => e.score)
      .filter((v): v is number => v !== null && v > 0);

    let overallLevel: number | null = null;
    if (validScores.length > 0) {
      const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
      overallLevel = Math.min(maxRubric, Math.max(1, Math.round(avg)));
    } else if (rec && typeof rec.totalScore === 'number' && rec.totalScore > 0 && rec.totalScore <= maxRubric) {
      overallLevel = Math.round(rec.totalScore);
    } else if (rec && typeof rec.courseworkScore === 'number' && rec.courseworkScore > 0 && rec.courseworkScore <= maxRubric) {
      overallLevel = Math.round(rec.courseworkScore);
    }

    const overallLabel = getKindergartenRubricLabel(subject, overallLevel);

    return {
      elements: elementResults,
      overallLevel,
      overallDisplay: overallLevel !== null ? String(overallLevel) : '-',
      overallLabel
    };
  };

  const getKindergartenSubjectCompetencyGroups = (subject: Subject): {
    unitNumber: number;
    competencyTitle: string;
    elements: {
      id: string;
      name: string;
      unitNumber: number;
      elementIndexInComp: number;
      elementNumberOverall: number;
    }[];
  }[] => {
    const hasComp = doesKindergartenSubjectHaveCompetency(subject);
    const comps = subject.kindergartenCompetencies || [];
    const subtopics = subject.subtopics || [];
    const items = subject.assignmentItems || [];

    // Distinct units
    let unitNumbers: number[] = [];
    if (!hasComp) {
      unitNumbers = [1];
    } else if (items.length > 0) {
      unitNumbers = Array.from(new Set(items.map(it => it.unitNumber || 1))).sort((a, b) => a - b);
    } else if (comps.length > 0) {
      unitNumbers = comps.map((_, idx) => idx + 1);
    } else if (subtopics.length > 0) {
      unitNumbers = subtopics.map((_, idx) => idx + 1);
    } else {
      unitNumbers = [1];
    }

    let overallCounter = 0;
    return unitNumbers.map(uNum => {
      const compObj = comps[uNum - 1];
      const rawTitle = compObj?.title?.trim() || subtopics[uNum - 1]?.trim() || '';
      const cleanTitle = rawTitle.replace(/^สมรรถนะ(\s*ที่)?\s*\d+\s*:?\s*/i, '').trim();
      const compLabel = hasComp
        ? (cleanTitle ? `${uNum}: ${cleanTitle}` : `${uNum}`)
        : '';

      let compItems = !hasComp ? items : items.filter(it => (it.unitNumber || 1) === uNum);
      if (compItems.length === 0 && compObj && compObj.elements && compObj.elements.length > 0) {
        compItems = compObj.elements.map((elName, eIdx) => ({
          id: `asg-k-${uNum}-${eIdx + 1}`,
          name: elName || `ประเด็น ${eIdx + 1}`,
          unitNumber: uNum,
          maxScore: 3
        }));
      }
      if (compItems.length === 0) {
        compItems = [{
          id: `asg-k-${uNum}-1`,
          name: `ประเด็น 1`,
          unitNumber: uNum,
          maxScore: 3
        }];
      }

      const elements = compItems.map((it, eIdx) => {
        overallCounter++;
        return {
          id: it.id,
          name: it.name,
          unitNumber: uNum,
          elementIndexInComp: eIdx + 1,
          elementNumberOverall: overallCounter
        };
      });

      return {
        unitNumber: uNum,
        competencyTitle: compLabel,
        elements
      };
    });
  };

  // Chunk subjects into sets of 5 (or for Kindergarten: combine element-only aspects together, and place each competency aspect on its own single page)
  const assessmentSubjectChunks = useMemo(() => {
    if (assessmentGradeSubjects.length === 0) return [];
    if (!isAssessmentKindergarten) {
      const perPage = reportOrientation === 'landscape' ? 7 : 5;
      const chunks: Subject[][] = [];
      for (let i = 0; i < assessmentGradeSubjects.length; i += perPage) {
        chunks.push(assessmentGradeSubjects.slice(i, i + perPage));
      }
      return chunks;
    }

    // Kindergarten subject grouping following Admin's exact sortOrder:
    // When in landscape (297mm), more columns fit per sheet
    const maxCols = reportOrientation === 'landscape' ? 16 : 10;
    const maxAspects = reportOrientation === 'landscape' ? 3 : 2;
    const chunks: Subject[][] = [];
    let currentElementsOnlyChunk: Subject[] = [];
    let currentElementsOnlyCols = 0;

    assessmentGradeSubjects.forEach(subj => {
      const compGroups = getKindergartenSubjectCompetencyGroups(subj);
      const totalEls = compGroups.reduce((acc, g) => acc + g.elements.length, 0);
      const subjCols = totalEls + 2; // elements + ระดับ + ผล

      if (doesKindergartenSubjectHaveCompetency(subj)) {
        if (currentElementsOnlyChunk.length > 0) {
          chunks.push(currentElementsOnlyChunk);
          currentElementsOnlyChunk = [];
          currentElementsOnlyCols = 0;
        }
        chunks.push([subj]);
      } else {
        if (
          currentElementsOnlyChunk.length > 0 &&
          (currentElementsOnlyChunk.length >= maxAspects || currentElementsOnlyCols + subjCols > maxCols)
        ) {
          chunks.push(currentElementsOnlyChunk);
          currentElementsOnlyChunk = [subj];
          currentElementsOnlyCols = subjCols;
        } else {
          currentElementsOnlyChunk.push(subj);
          currentElementsOnlyCols += subjCols;
        }
      }
    });

    if (currentElementsOnlyChunk.length > 0) {
      chunks.push(currentElementsOnlyChunk);
    }

    return chunks;
  }, [assessmentGradeSubjects, isAssessmentKindergarten, reportOrientation]);

  // Active chunks to display in popup
  const activeAssessmentChunks = useMemo(() => {
    if (assessmentSelectedChunkIndex === 'all') {
      return assessmentSubjectChunks;
    }
    const idx = Number(assessmentSelectedChunkIndex);
    if (!isNaN(idx) && assessmentSubjectChunks[idx]) {
      return [assessmentSubjectChunks[idx]];
    }
    return assessmentSubjectChunks;
  }, [assessmentSubjectChunks, assessmentSelectedChunkIndex]);

  const isGradeRecordForSemAndYear = (g: GradeRecord, targetSem: string, targetYear: string): boolean => {
    if (!g) return false;
    if (['grd-001', 'grd-002', 'grd-003'].includes(g.id)) return false;
    const recSem = String(g.semester || '').trim();
    const tSem = String(targetSem || '').trim();
    if (recSem !== tSem) return false;
    const subId = String(g.subjectId || '');
    if (subId.includes('-sem1') && tSem !== '1') return false;
    if (subId.includes('-sem2') && tSem !== '2') return false;
    if (g.academicYear && String(g.academicYear).trim() !== String(targetYear).trim()) return false;
    return true;
  };

  const hasRecordedScoreValue = (g?: GradeRecord): boolean => {
    if (!g) return false;
    const cw = Number(g.courseworkScore) || 0;
    const ex = Number(g.examScore) || 0;
    const tot = Number(g.totalScore) || 0;
    const hasAsg = g.assignmentScores
      ? Object.values(g.assignmentScores).some(v => typeof v === 'number' && !isNaN(v) && v > 0)
      : false;
    const hasAct = Boolean(g.activityResult && g.activityResult.trim() !== '');
    return cw > 0 || ex > 0 || tot > 0 || hasAsg || hasAct;
  };

  // Helper to get scores for student & subject (strictly from the selected semester)
  const getStudentScores = (studentId: string, subject: Subject) => {
    const codeUpper = (subject.code || '').trim().toUpperCase();
    const nameClean = (subject.name || '').trim();

    let rec = effectiveGrades.find(g =>
      g.studentId === studentId &&
      g.subjectId === subject.id &&
      isGradeRecordForSemAndYear(g, selectedSemester, selectedYear) &&
      hasRecordedScoreValue(g)
    );
    if (!rec) {
      rec = effectiveGrades.find(g =>
        g.studentId === studentId &&
        ((codeUpper !== '' && (g.subjectCode || '').trim().toUpperCase() === codeUpper) ||
          (nameClean !== '' && (g.subjectName || '').trim() === nameClean)) &&
        isGradeRecordForSemAndYear(g, selectedSemester, selectedYear) &&
        hasRecordedScoreValue(g)
      );
    }
    return {
      coursework: rec?.courseworkScore !== undefined && rec.courseworkScore !== null ? rec.courseworkScore : '-',
      exam: rec?.examScore !== undefined && rec.examScore !== null ? rec.examScore : '-',
      total: rec?.totalScore !== undefined && rec.totalScore !== null ? rec.totalScore : '-',
      numCoursework: typeof rec?.courseworkScore === 'number' ? rec.courseworkScore : null,
      numExam: typeof rec?.examScore === 'number' ? rec.examScore : null,
      numTotal: typeof rec?.totalScore === 'number' ? rec.totalScore : null
    };
  };

  // Helper to get activity pass/fail result for student & activity (strictly from the selected semester)
  const getStudentActivityResult = (studentId: string, activity: Subject): 'ผ่าน' | 'ไม่ผ่าน' | '-' => {
    const codeUpper = (activity.code || '').trim().toUpperCase();
    const nameClean = (activity.name || '').trim();

    let rec = effectiveGrades.find(g =>
      g.studentId === studentId &&
      g.subjectId === activity.id &&
      isGradeRecordForSemAndYear(g, selectedSemester, selectedYear) &&
      Boolean(g.activityResult && g.activityResult.trim() !== '')
    );
    if (!rec) {
      rec = effectiveGrades.find(g =>
        g.studentId === studentId &&
        ((codeUpper !== '' && (g.subjectCode || '').trim().toUpperCase() === codeUpper) ||
          (nameClean !== '' && (g.subjectName || '').trim() === nameClean)) &&
        isGradeRecordForSemAndYear(g, selectedSemester, selectedYear) &&
        Boolean(g.activityResult && g.activityResult.trim() !== '')
      );
    }
    if (rec?.activityResult === 'ผ่าน' || rec?.activityResult === 'ไม่ผ่าน') {
      return rec.activityResult;
    }
    return '-';
  };

  // Rule: Can show "เกรด" button
  // For Primary (ประถม อ.1-ป.6): ONLY in Semester 2 (เฉพาะ"เทอม2" เทอม1จะไม่ได้แสดงสำหรับประถมเพราะต้องรวมภาคเรียนที่1)
  // For Secondary (มัธยม ม.1-ม.6): In BOTH Semester 1 and 2 (ในส่วนมัธยมให้มีปุ่มเกรดทั้งเทอม1 และเทอม2)
  const isAssessmentPrimary = assessmentPopupGrade ? PRIMARY_GRADES.includes(assessmentPopupGrade) : false;
  const isAssessmentP1ToP6 = assessmentPopupGrade
    ? ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'].includes(assessmentPopupGrade)
    : false;
  const canShowGradeButton = assessmentPopupGrade 
    ? (isAssessmentKindergarten ? true : isAssessmentPrimary ? selectedSemester === '2' : true)
    : false;

  // Subjects for Grade view: For ป.1-ป.6, combine subjects across Semester 1 and Semester 2 of selectedYear
  const assessmentGradeModeSubjects = useMemo(() => {
    if (!assessmentPopupGrade) return [];
    if (!isAssessmentP1ToP6) return assessmentGradeSubjects;

    let yearList = effectiveSubjects.filter(s =>
      !s.isActivity &&
      s.gradeLevel === assessmentPopupGrade &&
      (s.academicYear === selectedYear || !s.academicYear)
    );
    if (yearList.length === 0) {
      yearList = effectiveSubjects.filter(s => !s.isActivity && s.gradeLevel === assessmentPopupGrade);
    }

    const roomMatchedYear = yearList.filter(s => normalizeRoom(s.room) === normalizeRoom(selectedRoom));
    if (roomMatchedYear.length > 0) {
      yearList = roomMatchedYear;
    }

    const registered = yearList.filter(s =>
      Boolean(s.teacherId && s.teacherId.trim() !== '') ||
      Boolean(s.teacherName && s.teacherName.trim() !== '')
    );
    const pool = registered.length > 0 ? registered : yearList;

    const dedupMap = new Map<string, Subject>();
    pool.forEach(s => {
      const codeKey = (s.code || '').trim().toUpperCase();
      const nameKey = (s.name || '').trim();
      const key = codeKey || nameKey || s.id;
      const existing = dedupMap.get(key);
      if (!existing) {
        dedupMap.set(key, s);
      } else {
        const existingHasTeacher = Boolean(existing.teacherId || existing.teacherName);
        const currentHasTeacher = Boolean(s.teacherId || s.teacherName);
        const mergedSortOrder =
          s.semester === selectedSemester && typeof s.sortOrder === 'number'
            ? s.sortOrder
            : typeof existing.sortOrder === 'number'
            ? existing.sortOrder
            : s.sortOrder;
        if ((!existingHasTeacher && currentHasTeacher) || (s.semester === '2' && currentHasTeacher)) {
          dedupMap.set(key, { ...s, sortOrder: mergedSortOrder });
        } else if (mergedSortOrder !== undefined && existing.sortOrder !== mergedSortOrder) {
          dedupMap.set(key, { ...existing, sortOrder: mergedSortOrder });
        }
      }
    });

    return Array.from(dedupMap.values()).sort((a, b) => {
      const hasSortA = typeof a.sortOrder === 'number' && !isNaN(a.sortOrder);
      const hasSortB = typeof b.sortOrder === 'number' && !isNaN(b.sortOrder);
      if (hasSortA && hasSortB && a.sortOrder !== b.sortOrder) {
        return (a.sortOrder as number) - (b.sortOrder as number);
      }
      if (hasSortA !== hasSortB) {
        return hasSortA ? -1 : 1;
      }
      const getPrimaryDefaultOrder = (sub: Subject): number => {
        const name = (sub.name || '').trim();
        const code = (sub.code || '').trim();
        if (name === 'ภาษาไทย' || code.startsWith('ท1')) return 1;
        if (name === 'คณิตศาสตร์' || code.startsWith('ค1')) return 2;
        if (name === 'สังคมศึกษา' || code.startsWith('ส1')) return 3;
        if (name === 'สุขศึกษาและพลศึกษา' || code.startsWith('พ1')) return 4;
        if (name === 'ศิลปะ' || code.startsWith('ศ1')) return 5;
        if (name === 'การงานอาชีพ' || code.startsWith('ง1')) return 6;
        if (name === 'ภาษาต่างประเทศ' || code.startsWith('อ1')) return 7;
        if (name === 'วิทยาศาสตร์และเทคโนโลยี' || code.startsWith('ว1')) return 8;
        if (name === 'ประวัติศาสตร์' || code.startsWith('ป1')) return 9;
        return 99;
      };
      const ordA = getPrimaryDefaultOrder(a);
      const ordB = getPrimaryDefaultOrder(b);
      if (ordA !== ordB) return ordA - ordB;
      const codeA = a.code || '';
      const codeB = b.code || '';
      const cmp = codeA.localeCompare(codeB, 'th');
      if (cmp !== 0) return cmp;
      return (a.name || '').localeCompare(b.name || '', 'th');
    });
  }, [effectiveSubjects, assessmentPopupGrade, isAssessmentP1ToP6, selectedYear, selectedSemester, assessmentGradeSubjects, selectedRoom]);

  const extractRecordNumericScore = (rec?: GradeRecord): number | null => {
    if (!rec) return null;
    const cw = typeof rec.courseworkScore === 'number' && !isNaN(rec.courseworkScore) ? rec.courseworkScore : null;
    const ex = typeof rec.examScore === 'number' && !isNaN(rec.examScore) ? rec.examScore : null;
    const tot = typeof rec.totalScore === 'number' && !isNaN(rec.totalScore) ? rec.totalScore : null;
    if (tot !== null && tot > 0) return tot;
    if (cw !== null || ex !== null) {
      const sum = (cw || 0) + (ex || 0);
      if (sum > 0) return sum;
    }
    if (tot !== null) return tot;
    return null;
  };

  // Helper to get student's score for grade computation
  // For ป.1-ป.6 (and Primary): sums Semester 1 + Semester 2 scores from Module 2 (งานวัดผล)
  const getStudentGradeScore = (studentId: string, subject: Subject): number | null => {
    const codeUpper = (subject.code || '').trim().toUpperCase();
    const nameClean = (subject.name || '').trim();

    if (isAssessmentP1ToP6 || (isAssessmentPrimary && selectedSemester === '2')) {
      const matchingSubjs = effectiveSubjects.filter(s =>
        !s.isActivity &&
        s.gradeLevel === assessmentPopupGrade &&
        (s.id === subject.id ||
          (codeUpper !== '' && (s.code || '').trim().toUpperCase() === codeUpper) ||
          (nameClean !== '' && (s.name || '').trim() === nameClean))
      );
      const sem1SubjIds = new Set(
        matchingSubjs.filter(s => !s.semester || s.semester === '1').map(s => s.id)
      );
      const sem2SubjIds = new Set(
        matchingSubjs.filter(s => !s.semester || s.semester === '2').map(s => s.id)
      );

      let recSem1 = effectiveGrades.find(g =>
        g.studentId === studentId &&
        (g.subjectId === subject.id || sem1SubjIds.has(g.subjectId)) &&
        isGradeRecordForSemAndYear(g, '1', selectedYear) &&
        hasRecordedScoreValue(g)
      );
      if (!recSem1) {
        recSem1 = effectiveGrades.find(g =>
          g.studentId === studentId &&
          ((codeUpper !== '' && (g.subjectCode || '').trim().toUpperCase() === codeUpper) ||
            (nameClean !== '' && (g.subjectName || '').trim() === nameClean)) &&
          isGradeRecordForSemAndYear(g, '1', selectedYear) &&
          hasRecordedScoreValue(g)
        );
      }

      let recSem2 = effectiveGrades.find(g =>
        g.studentId === studentId &&
        (g.subjectId === subject.id || sem2SubjIds.has(g.subjectId)) &&
        isGradeRecordForSemAndYear(g, '2', selectedYear) &&
        hasRecordedScoreValue(g)
      );
      if (!recSem2) {
        recSem2 = effectiveGrades.find(g =>
          g.studentId === studentId &&
          ((codeUpper !== '' && (g.subjectCode || '').trim().toUpperCase() === codeUpper) ||
            (nameClean !== '' && (g.subjectName || '').trim() === nameClean)) &&
          isGradeRecordForSemAndYear(g, '2', selectedYear) &&
          hasRecordedScoreValue(g)
        );
      }

      const s1 = extractRecordNumericScore(recSem1);
      const s2 = extractRecordNumericScore(recSem2);
      if (s1 !== null || s2 !== null) {
        return Math.round(((s1 ?? 0) + (s2 ?? 0)) * 100) / 100;
      }
      return null;
    }
    const current = getStudentScores(studentId, subject);
    return current.numTotal;
  };

  // Search filter for students
  const filteredStudents = useMemo(() => {
    return gradeStudents.filter(s => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const fullName = `${s.prefix || ''}${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      const code = (s.studentCode || '').toLowerCase();
      const nickname = (s.nickname || '').toLowerCase();
      return fullName.includes(term) || code.includes(term) || nickname.includes(term);
    });
  }, [gradeStudents, searchTerm]);

  // Generate ALL CALENDAR DAYS of every month in the semester
  const monthGroups: FullMonthGroup[] = useMemo(() => {
    const yearCE = getAdYear(selectedYear);
    const termKey = `${selectedSemester}_${selectedYear}`;

    const configsByTerm = StorageService.getAttendanceConfigsByTerm();
    const termCfg = configsByTerm[termKey];
    const holidayMap = new Map<string, { isHoliday: boolean; note?: string }>();

    if (termCfg?.schoolDays && termCfg.schoolDays.length > 0) {
      termCfg.schoolDays.forEach(d => {
        holidayMap.set(d.date, { isHoliday: d.isHoliday, note: d.note });
      });
    } else {
      const singleCfg = StorageService.getAttendanceConfig();
      if (singleCfg?.academicYear === selectedYear && singleCfg?.semester === selectedSemester && singleCfg.schoolDays) {
        singleCfg.schoolDays.forEach(d => {
          holidayMap.set(d.date, { isHoliday: d.isHoliday, note: d.note });
        });
      }
    }

    let monthsTarget: { yearCE: number; monthNum: number }[] = [];
    if (selectedSemester === '1') {
      monthsTarget = [
        { yearCE, monthNum: 5 },
        { yearCE, monthNum: 6 },
        { yearCE, monthNum: 7 },
        { yearCE, monthNum: 8 },
        { yearCE, monthNum: 9 },
        { yearCE, monthNum: 10 },
      ];
    } else {
      monthsTarget = [
        { yearCE, monthNum: 11 },
        { yearCE, monthNum: 12 },
        { yearCE: yearCE + 1, monthNum: 1 },
        { yearCE: yearCE + 1, monthNum: 2 },
        { yearCE: yearCE + 1, monthNum: 3 },
      ];
    }

    return monthsTarget.map(mTarget => {
      const mNum = mTarget.monthNum;
      const yCE = mTarget.yearCE;
      const yBE = yCE + 543;
      const monthName = THAI_MONTH_NAMES[mNum] || `เดือนที่ ${mNum}`;
      const monthKey = `${yCE}-${String(mNum).padStart(2, '0')}`;

      const daysInMonth = new Date(yCE, mNum, 0).getDate();
      const days: FullMonthDayItem[] = [];
      let schoolDaysCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const mm = String(mNum).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const dateStr = `${yCE}-${mm}-${dd}`;
        const dt = new Date(yCE, mNum - 1, d);
        const dayOfWeekNum = dt.getDay();
        const dayOfWeekName = THAI_DAY_FULL[dayOfWeekNum] || '';
        const shortDayName = THAI_DAY_SHORT[dayOfWeekNum] || '';

        const isSaturday = dayOfWeekNum === 6;
        const isSunday = dayOfWeekNum === 0;
        const isWeekend = isSaturday || isSunday;

        const cfg = holidayMap.get(dateStr);
        const isCustomHoliday = cfg ? cfg.isHoliday : false;
        const isHoliday = isWeekend || isCustomHoliday;

        let holidayLabel: 'วันเสาร์' | 'วันอาทิตย์' | 'วันหยุด' | null = null;
        if (isSaturday) {
          holidayLabel = 'วันเสาร์';
        } else if (isSunday) {
          holidayLabel = 'วันอาทิตย์';
        } else if (isHoliday) {
          holidayLabel = 'วันหยุด';
        } else {
          schoolDaysCount++;
        }

        days.push({
          date: dateStr,
          dayNum: d,
          dayOfWeekNum,
          dayOfWeekName,
          shortDayName,
          isSaturday,
          isSunday,
          isWeekend,
          isHoliday,
          holidayLabel,
          note: cfg?.note
        });
      }

      return {
        monthKey,
        monthNum: mNum,
        yearCE: yCE,
        yearBE: yBE,
        monthName,
        days,
        schoolDaysCount
      };
    });
  }, [selectedYear, selectedSemester]);

  // Total active school days in this term
  const activeSchoolDaysTotal = useMemo(() => {
    return monthGroups.reduce((acc, g) => acc + g.schoolDaysCount, 0);
  }, [monthGroups]);

  // Map attendance by studentId and date string (from Module 3 recorded attendance by homeroom teacher)
  const attendanceMap = useMemo(() => {
    const map = new Map<string, 'present' | 'absent' | 'leave' | 'sick'>();
    effectiveAttendance.forEach(rec => {
      if (rec.studentId && rec.date) {
        if (rec.academicYear && rec.academicYear !== selectedYear) return;
        if (rec.semester && rec.semester !== selectedSemester) return;
        map.set(`${rec.studentId}_${rec.date}`, rec.status);
      }
    });
    return map;
  }, [effectiveAttendance, selectedYear, selectedSemester]);

  const attendanceContainerRef = useRef<HTMLDivElement>(null);
  const assessmentContainerRef = useRef<HTMLDivElement>(null);
  const milkTeethContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadAttendancePDF = async () => {
    if (isDownloadingPdf || !attendancePopupGrade) return;
    if (popupGradeStudents.length === 0) {
      onShowToast('warning', 'ไม่มีข้อมูลนักเรียน', 'ยังไม่มีข้อมูลนักเรียนสำหรับดาวน์โหลด PDF');
      return;
    }
    setIsDownloadingPdf(true);
    try {
      const filename = `ตารางเช็กเวลาเรียน_${attendancePopupGrade}_เทอม${selectedSemester}_${selectedYear}.pdf`;
      const ok = await exportSheetsToPdf({
        container: attendanceContainerRef.current,
        filename,
        orientation: reportOrientation,
      });
      if (ok) {
        onShowToast('success', 'ดาวน์โหลด PDF สำเร็จ', `บันทึกไฟล์ ${filename} เรียบร้อยแล้ว`);
      } else {
        onShowToast('error', 'ไม่พบหน้าเอกสาร', 'ไม่สามารถสร้างไฟล์ PDF ได้');
      }
    } catch (err) {
      console.error('Attendance PDF export error:', err);
      onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ PDF ได้');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadAssessmentPDF = async () => {
    if (isDownloadingPdf || !assessmentPopupGrade) return;
    const isActivityMode = assessmentViewMode === 'activity';
    if (assessmentGradeStudents.length === 0 || (isActivityMode ? assessmentGradeActivities.length === 0 : assessmentGradeSubjects.length === 0)) {
      onShowToast('warning', 'ไม่มีข้อมูล', isActivityMode ? 'ยังไม่มีข้อมูลนักเรียนหรือกิจกรรมสำหรับดาวน์โหลด PDF' : 'ยังไม่มีข้อมูลนักเรียนหรือรายวิชาสำหรับดาวน์โหลด PDF');
      return;
    }
    setIsDownloadingPdf(true);
    try {
      const modeLabel = isActivityMode
        ? 'ผลประเมินกิจกรรม'
        : (assessmentViewMode === 'grade' && canShowGradeButton ? 'เกรด' : 'คะแนนวัดผล');
      const filename = `รายงาน_${modeLabel}_${assessmentPopupGrade}_เทอม${selectedSemester}_${selectedYear}.pdf`;
      const ok = await exportSheetsToPdf({
        container: assessmentContainerRef.current,
        filename,
        orientation: reportOrientation,
      });
      if (ok) {
        onShowToast('success', 'ดาวน์โหลด PDF สำเร็จ', `บันทึกไฟล์ ${filename} เรียบร้อยแล้ว`);
      } else {
        onShowToast('error', 'ไม่พบหน้าเอกสาร', 'ไม่สามารถสร้างไฟล์ PDF ได้');
      }
    } catch (err) {
      console.error('Assessment PDF export error:', err);
      onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ PDF ได้');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadMilkTeethPDF = async () => {
    if (isDownloadingPdf || !milkTeethModal) return;
    setIsDownloadingPdf(true);
    try {
      const typeLabel = milkTeethModal.type === 'milk' ? 'การดื่มนมโรงเรียน' : 'การแปรงฟันหลังอาหาร';
      const selectedGroup = milkTeethMonthGroups.find(g => g.monthKey === milkTeethSelectedMonthKey);
      const monthPart = milkTeethSelectedMonthKey === 'all' ? 'ครบทุกเดือน' : (selectedGroup?.monthTitle || '');
      const filename = `รายงาน_${typeLabel}_${milkTeethModal.grade}_${monthPart}_เทอม${selectedSemester}_${selectedYear}.pdf`;
      const ok = await exportSheetsToPdf({
        container: milkTeethContainerRef.current,
        filename,
        orientation: reportOrientation,
      });
      if (ok) {
        onShowToast('success', 'ดาวน์โหลด PDF สำเร็จ', `บันทึกไฟล์ ${filename} เรียบร้อยแล้ว`);
      } else {
        onShowToast('error', 'ไม่พบหน้าเอกสาร', 'ไม่สามารถสร้างไฟล์ PDF ได้');
      }
    } catch (err) {
      console.error('Milk/Teeth PDF export error:', err);
      onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ PDF ได้');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Download CSV for Pop-up Grade
  const handleDownloadPopupCSV = () => {
    if (!attendancePopupGrade || popupGradeStudents.length === 0) {
      onShowToast('warning', 'ไม่มีข้อมูล', 'ไม่มีรายชื่อนักเรียนสำหรับดาวน์โหลด');
      return;
    }

    try {
      let csvContent = '\uFEFF';
      csvContent += `แบบบันทึกเวลาเรียนและสถิติการมาเรียน,โรงเรียน${schoolInfo.schoolName || ''}\n`;
      csvContent += `ระดับชั้น ${getGradeFullName(attendancePopupGrade)},ภาคเรียนที่ ${selectedSemester},ปีการศึกษา ${selectedYear}\n`;
      csvContent += `ครูประจำชั้น: ${popupClassAdvisor ? `${popupClassAdvisor.prefix}${popupClassAdvisor.firstName} ${popupClassAdvisor.lastName}` : '-'}\n\n`;

      const targetGroups = popupSelectedMonthKey === 'all' 
        ? monthGroups 
        : monthGroups.filter(g => g.monthKey === popupSelectedMonthKey);

      targetGroups.forEach(group => {
        csvContent += `========================================================================\n`;
        csvContent += `ประจำเดือน ${group.monthName} พ.ศ. ${group.yearBE} (จำนวนวันเรียน: ${group.schoolDaysCount} วัน)\n`;
        csvContent += `========================================================================\n`;

        const dateHeaders = group.days.map(d => {
          return `"${d.dayNum} (${d.shortDayName})"`;
        }).join(',');

        csvContent += `เลขที่,รหัสประจำตัว,ชื่อ - นามสกุล,${dateHeaders},มา (วัน),ขาด (วัน),ลา (วัน),ป่วย (วัน),% มาเรียน\n`;

        popupGradeStudents.forEach((s, idx) => {
          let pCount = 0;
          let aCount = 0;
          let lCount = 0;
          let sCount = 0;

          const dateCols = group.days.map(d => {
            if (d.isHoliday) {
              return `"${d.holidayLabel || 'วันหยุด'}"`;
            }
            const status = attendanceMap.get(`${s.id}_${d.date}`);
            if (status === 'present') { pCount++; return '✓'; }
            if (status === 'absent') { aCount++; return 'ข'; }
            if (status === 'leave') { lCount++; return 'ล'; }
            if (status === 'sick') { sCount++; return 'ป'; }
            return '-';
          }).join(',');

          const totalDays = group.schoolDaysCount;
          const pct = totalDays > 0 ? ((pCount / totalDays) * 100).toFixed(1) + '%' : '0%';

          csvContent += `${s.rollNumber || idx + 1},"${s.studentCode || ''}","${s.prefix || ''}${s.firstName || ''} ${s.lastName || ''}",${dateCols},${pCount},${aCount},${lCount},${sCount},${pct}\n`;
        });

        csvContent += '\n\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ใบเช็กเวลาเรียน_A4_${attendancePopupGrade}_เทอม${selectedSemester}_ปี${selectedYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onShowToast('success', 'ดาวน์โหลดสำเร็จ', 'ส่งออกข้อมูลเวลาเรียนเรียบร้อยแล้ว');
    } catch (e) {
      console.error(e);
      onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  // Active month groups for pop-up preview
  const popupActiveMonthGroups = useMemo(() => {
    if (popupSelectedMonthKey === 'all') return monthGroups;
    return monthGroups.filter(g => g.monthKey === popupSelectedMonthKey);
  }, [monthGroups, popupSelectedMonthKey]);

  return (
    <div className="space-y-4">
      {/* CSS Styles for True A4 Portrait Print Preview */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 5mm 5mm 5mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, header, nav, sidebar, footer {
            display: none !important;
          }
          .a4-modal-overlay {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .a4-modal-content {
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .a4-portrait-paper {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: 1px solid #94a3b8 !important;
            border-radius: 0 !important;
            padding-top: 5mm !important;
            padding-bottom: 5mm !important;
            margin: 0 auto 0 auto !important;
            width: 100% !important;
            max-width: 210mm !important;
          }
          .a4-portrait-paper:last-of-type {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .a4-page-limit-line {
            display: none !important;
          }
        }
        .vertical-text-header {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
          text-align: center;
          margin: 0 auto;
          line-height: 1;
        }
      `}</style>

      {/* 
        Single Row Top Control Bar:
        ปีการศึกษา, ภาคเรียน, และ ประถม/มัธยม (ชิดกัน) อยู่บนบรรทัดเดียวกัน
      */}
      <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        
        {/* Left Side: Back button if grade selected, or icon title */}
        <div className="flex items-center gap-2">
          {selectedGrade ? (
            <button
              type="button"
              onClick={() => {
                setSelectedGrade(null);
                setSearchTerm('');
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-purple-600" />
              <span>ย้อนกลับ</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Users className="w-4 h-4 text-purple-600" />
              <span>ระดับชั้นเรียน</span>
            </div>
          )}

          {selectedGrade && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold">
                {selectedGrade}
              </span>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                ({getGradeFullName(selectedGrade)})
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Academic Year, Semester, and Adjacent Primary/Secondary Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {user.role === 'admin' ? (
            <div className="hidden sm:flex items-center gap-2">
              <select
                value={adminSelectedYear}
                onChange={(e) => setAdminSelectedYear(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
              >
                {availableAcademicYears.map(yr => (
                  <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                ))}
              </select>

              <select
                value={adminSelectedSemester}
                onChange={(e) => setAdminSelectedSemester(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
              >
                <option value="1">ภาคเรียนที่ 1</option>
                <option value="2">ภาคเรียนที่ 2</option>
              </select>
            </div>
          ) : (
            <div className="hidden sm:block px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold whitespace-nowrap">
              ภาคเรียนที่ {selectedSemester} • ปีการศึกษา {selectedYear}
            </div>
          )}

          {/* ประถม & มัธยม ชิดกันเลย */}
          <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveLevel('primary');
                if (selectedGrade && SECONDARY_GRADES.includes(selectedGrade)) {
                  setSelectedGrade(null);
                  setSearchTerm('');
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeLevel === 'primary'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ประถม
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveLevel('secondary');
                if (selectedGrade && PRIMARY_GRADES.includes(selectedGrade)) {
                  setSelectedGrade(null);
                  setSearchTerm('');
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeLevel === 'secondary'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              มัธยม
            </button>
          </div>
        </div>

      </div>

      {/* 
        VIEW 1: Grade Selection List
        แสดงแบบรายการยาวชิดสุดเลยตามความเหมาะสม
        มีปุ่ม "เช็กชื่อ" บนแต่ละชั้นเพื่อเปิด Pop-up Modal A4 แนวตั้ง
      */}
      {!selectedGrade ? (
        <div className="space-y-2">

          {currentGradeList.map((g) => {
            const roomsForG = getRoomsForGrade(g);
            const activeRoomForG = getSelectedRoomForGrade(g);
            const roomStudentCount = (effectiveStudents || []).filter(
              s => s.gradeLevel === g && normalizeRoom(s.room) === activeRoomForG
            ).length;
            const totalGradeStudents = studentCountByGrade[g] || 0;
            const hasStudents = roomStudentCount > 0 || totalGradeStudents > 0;

            return (
              <div
                key={g}
                className={`w-full rounded-xl border transition-all overflow-hidden group ${
                  hasStudents
                    ? 'bg-white hover:bg-purple-50/40 border-slate-200 hover:border-purple-300 shadow-xs'
                    : 'bg-slate-100/60 border-slate-200/70 opacity-55 hover:opacity-85 transition-opacity'
                }`}
              >
                <div className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-3">
                  {/* Clickable Grade Item to go directly to student roster */}
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectRoomForGrade(g, activeRoomForG);
                      setSelectedGrade(g);
                      setSearchTerm('');
                    }}
                    className="flex items-center gap-3.5 cursor-pointer flex-1 text-left min-w-0"
                  >
                    <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm transition-colors shrink-0 ${
                      hasStudents
                        ? 'bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {g}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold transition-colors ${
                          hasStudents
                            ? 'text-slate-800 group-hover:text-purple-700'
                            : 'text-slate-500 font-semibold'
                        }`}>
                          <span className="sm:hidden">{g}</span>
                          <span className="hidden sm:inline">{getGradeFullName(g)}</span>
                        </span>
                        {roomStudentCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 shrink-0">
                            {roomStudentCount} คน
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-500 text-[10px] font-medium border border-slate-300/60 shrink-0">
                            ไม่มีนักเรียน
                          </span>
                        )}
                      </div>
                      {roomStudentCount > 0 && (
                        <div className="text-[11px] text-slate-400 truncate">
                          คลิกเพื่อดูตารางรายชื่อนักเรียน
                        </div>
                      )}
                    </div>
                  </button>

                  {/* DESKTOP Action Buttons (hidden on mobile, visible on sm and up) */}
                  <div className={`hidden sm:flex items-center gap-2 shrink-0 ${!hasStudents ? 'opacity-75' : ''}`}>
                    {/* ปุ่มเลือกห้อง */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center"
                    >
                      <select
                        value={activeRoomForG}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRoomForGrade(g, e.target.value);
                        }}
                        className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-2xs transition-all"
                        title="กดเพื่อเลือกห้องเรียน (เชื่อมโยงกับรายชื่อนักเรียน)"
                      >
                        {roomsForG.map(rm => {
                          const rmCount = (effectiveStudents || []).filter(
                            st => st.gradeLevel === g && normalizeRoom(st.room) === rm
                          ).length;
                          return (
                            <option key={rm} value={rm}>
                              ห้อง {rm}{roomsForG.length > 1 ? ` (${rmCount} คน)` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Dedicated "(3)รายงาน" Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setThreeReportsPopupGrade(g);
                      }}
                      className={`px-3 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ${
                        hasStudents ? 'bg-teal-600 hover:bg-teal-700' : 'bg-slate-400 hover:bg-teal-600'
                      }`}
                      title="เปิด Pop-up รายงานประเมิน 3 เล่ม (การอ่านคิดวิเคราะห์เขียน, คุณลักษณะอันพึงประสงค์, สมรรถนะสำคัญ)"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>(3)รายงาน</span>
                    </button>

                    {/* Dedicated "วัดผล" Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setAssessmentPopupGrade(g);
                        setAssessmentSelectedChunkIndex(0);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-white font-bold text-[13px] flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ${
                        hasStudents ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-400 hover:bg-indigo-600'
                      }`}
                      title="เปิด Pop-up ตารางคะแนนวัดผลกระดาษ A4 แนวตั้ง (5 วิชาต่อแผ่น)"
                    >
                      <Award className="w-4 h-4" />
                      <span>วัดผล</span>
                    </button>

                    {/* Dedicated "เช็กชื่อ" Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setAttendancePopupGrade(g);
                        setPopupSelectedMonthKey('all');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-white font-bold text-[13px] flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ${
                        hasStudents ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 hover:bg-emerald-600'
                      }`}
                      title="เปิด Pop-up ตารางเช็กชื่อกระดาษ A4 แนวตั้ง (แสดงครบทุกวันรวมเสาร์-อาทิตย์สีแดง)"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>เช็กชื่อ</span>
                    </button>

                    {/* Dedicated "ดื่มนม" Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setMilkTeethModal({ grade: g, type: 'milk' });
                        setMilkTeethSelectedMonthKey('all');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-white font-bold text-[13px] flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ${
                        hasStudents ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-400 hover:bg-amber-600'
                      }`}
                      title="เปิด Pop-up รายงานสรุปการดื่มนมโรงเรียน ขนาด A4 แนวตั้ง (ดึงจากหน้าธุรการ)"
                    >
                      <span>🥛</span>
                      <span>ดื่มนม</span>
                    </button>

                    {/* Dedicated "แปรงฟัน" Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setMilkTeethModal({ grade: g, type: 'teeth' });
                        setMilkTeethSelectedMonthKey('all');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-white font-bold text-[13px] flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ${
                        hasStudents ? 'bg-sky-600 hover:bg-sky-700' : 'bg-slate-400 hover:bg-sky-600'
                      }`}
                      title="เปิด Pop-up รายงานสรุปการแปรงฟันหลังอาหาร ขนาด A4 แนวตั้ง (ดึงจากหน้าธุรการ)"
                    >
                      <span>🪥</span>
                      <span>แปรงฟัน</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setSelectedGrade(g);
                        setSearchTerm('');
                      }}
                      className="p-2 hover:bg-slate-100 text-slate-400 hover:text-purple-600 rounded-lg transition-colors cursor-pointer"
                      title="ดูรายชื่อนักเรียน"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* MOBILE Action Controls (visible only on mobile) */}
                  <div className="flex sm:hidden items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Room Dropdown stays at original position */}
                    <select
                      value={activeRoomForG}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectRoomForGrade(g, e.target.value);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs cursor-pointer focus:outline-none shadow-2xs"
                      title="กดเพื่อเลือกห้องเรียน"
                    >
                      {roomsForG.map(rm => (
                        <option key={rm} value={rm}>
                          ห้อง {rm}
                        </option>
                      ))}
                    </select>

                    {/* Toggle "ปพ.5" Menu Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenPp5Grade(prev => prev === g ? null : g);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer ${
                        openPp5Grade === g
                          ? 'bg-purple-700 text-white ring-2 ring-purple-300'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>ปพ.5</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openPp5Grade === g ? 'rotate-180' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setSelectedGrade(g);
                        setSearchTerm('');
                      }}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-purple-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Mobile Dropdown for "ปพ.5" */}
                {openPp5Grade === g && (
                  <div className="sm:hidden bg-purple-50/80 border-t border-purple-100 p-2.5 flex flex-wrap items-center justify-around gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setThreeReportsPopupGrade(g);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>(3)รายงาน</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setAssessmentPopupGrade(g);
                        setAssessmentSelectedChunkIndex(0);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>วัดผล</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setAttendancePopupGrade(g);
                        setPopupSelectedMonthKey('all');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>เช็กชื่อ</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setMilkTeethModal({ grade: g, type: 'milk' });
                        setMilkTeethSelectedMonthKey('all');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                    >
                      <span>🥛</span>
                      <span>ดื่มนม</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRoomForGrade(g, activeRoomForG);
                        setMilkTeethModal({ grade: g, type: 'teeth' });
                        setMilkTeethSelectedMonthKey('all');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                    >
                      <span>🪥</span>
                      <span>แปรงฟัน</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* 
          VIEW 2: Individual Class View (ตารางชื่อนักเรียนโดยตรง ไม่แสดงตารางเช็กชื่อข้างในอีกต่อไป!)
        */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header with Grade Title, Room Selection Dropdown & Clean Action Buttons */}
            <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print bg-slate-50/50">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-sm font-bold text-slate-800">
                  {selectedGrade ? getGradeFullName(selectedGrade).replace(/^ชั้น\s*/, '') : ''}
                  {selectedGrade ? ` ห้อง ${normalizeRoom(selectedRoom)}` : ''}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  รวม {gradeStudents.length} คน
                </span>

                {/* ปุ่มเลือกห้องแบบเลื่อนลงมาให้เลือก (Dropdown) */}
                {selectedGrade && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700">เลือกห้อง:</span>
                    <select
                      value={normalizeRoom(selectedRoom)}
                      onChange={(e) => handleSelectRoomForGrade(selectedGrade, e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 text-purple-900 border border-purple-300 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-2xs transition-colors"
                    >
                      {getRoomsForGrade(selectedGrade).map(rm => {
                        const rmCnt = (effectiveStudents || []).filter(
                          st => st.gradeLevel === selectedGrade && normalizeRoom(st.room) === rm
                        ).length;
                        return (
                          <option key={rm} value={rm}>
                            ห้อง {rm}{getRoomsForGrade(selectedGrade).length > 1 ? ` (${rmCnt} คน)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* (3)รายงาน Pop-up Button */}
                <button
                  type="button"
                  onClick={() => {
                    setThreeReportsPopupGrade(selectedGrade);
                  }}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[13px] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title="เปิดรายงานประเมิน 3 เล่ม (การอ่านคิดวิเคราะห์เขียน, คุณลักษณะอันพึงประสงค์, สมรรถนะสำคัญ)"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>(3)รายงาน</span>
                </button>

                {/* Assessment (วัดผล) Pop-up Button */}
                <button
                  type="button"
                  onClick={() => {
                    setAssessmentPopupGrade(selectedGrade);
                    setAssessmentSelectedChunkIndex(0);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13px] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title="เปิดตารางคะแนนวัดผล"
                >
                  <Award className="w-4 h-4" />
                  <span>วัดผล</span>
                </button>

                {/* Check Name Pop-up Button */}
                <button
                  type="button"
                  onClick={() => {
                    setAttendancePopupGrade(selectedGrade);
                    setPopupSelectedMonthKey('all');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title="เปิดตารางเช็กชื่อเวลาเรียน"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>เช็กชื่อ</span>
                </button>

                {/* ดื่มนม Pop-up Button */}
                <button
                  type="button"
                  onClick={() => {
                    setMilkTeethModal({ grade: selectedGrade, type: 'milk' });
                    setMilkTeethSelectedMonthKey('all');
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[13px] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title="เปิดรายงานสรุปการดื่มนมโรงเรียน"
                >
                  <span>🥛</span>
                  <span>ดื่มนม</span>
                </button>

                {/* แปรงฟัน Pop-up Button */}
                <button
                  type="button"
                  onClick={() => {
                    setMilkTeethModal({ grade: selectedGrade, type: 'teeth' });
                    setMilkTeethSelectedMonthKey('all');
                  }}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[13px] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title="เปิดรายงานสรุปการแปรงฟันหลังอาหาร"
                >
                  <span>🪥</span>
                  <span>แปรงฟัน</span>
                </button>
              </div>
            </div>

            {/* Student Roster Table */}
            {gradeStudents.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  ยังไม่มีข้อมูลนักเรียนใน{selectedGrade ? getGradeFullName(selectedGrade) : ''}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 text-center w-14">เลขที่</th>
                      <th className="py-3 px-3 text-center w-16">รูปถ่าย</th>
                      <th className="py-3 px-3 text-center w-28">รหัสประจำตัว</th>
                      <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                      <th className="py-3 px-3 text-center w-28 no-print">ปพ.6</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredStudents.map((s, idx) => {
                      const roll = s.rollNumber || idx + 1;

                      return (
                        <tr 
                          key={s.id} 
                          className="hover:bg-purple-50/40 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500 tabular-nums font-bold">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200">
                              {roll}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div
                              onClick={() => {
                                if (s.photoUrl && onOpenLightbox) {
                                  onOpenLightbox(
                                    s.photoUrl,
                                    `${s.prefix}${s.firstName} ${s.lastName}`,
                                    `เลขที่ ${roll} • ${s.studentCode ? `รหัส ${s.studentCode} • ` : ''}${getGradeCleanName(s.gradeLevel)}`
                                  );
                                }
                              }}
                              className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden mx-auto flex items-center justify-center shrink-0 cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all shadow-2xs"
                              title={s.photoUrl ? "คลิกเพื่อดูรูปภาพขนาดใหญ่" : "รูปถ่ายนักเรียน"}
                            >
                              {s.photoUrl ? (
                                <img
                                  src={s.photoUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="text-xs font-bold text-slate-400">
                                  {s.firstName?.[0] || 'น'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600 tabular-nums">
                            {s.studentCode ? (
                              <span className="text-[11px] font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-semibold border border-slate-200">
                                #{s.studentCode}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-slate-800">
                                {s.prefix}{s.firstName} {s.lastName}
                              </span>
                              {s.nickname && (
                                <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  {s.nickname}
                                </span>
                              )}
                            </div>
                            {s.chronicDisease && s.chronicDisease !== 'ไม่มี' && (
                              <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                                โรคประจำตัว: {s.chronicDisease}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center no-print">
                            <button
                              type="button"
                              onClick={() => setSelectedPhorPhor6Student(s)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 mx-auto active:scale-95 cursor-pointer"
                              title="เปิดสมุดรายงานประจำตัวนักเรียน (ปพ.6)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>ปพ.6</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        POP-UP MODAL: True A4 Portrait Attendance Sheet Preview & PDF Download
        ========================================================================
        เมื่อกดคำว่า "เช็กชื่อ" จะแสดง pop-up หน้ากระดาษ A4 แนวตั้งที่เป็นหน้าจริง
        แสดงวันทั้งหมดในเดือนนั้นๆ (เสาร์, อาทิตย์, และ วันหยุด แสดงคำว่า วันเสาร์ / วันอาทิตย์ / วันหยุด เพียง 1 คำตรงกลางคอลัมน์ ใช้ rowspan)
      */}
      {attendancePopupGrade && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto a4-modal-overlay">
          {/* Dynamic Print CSS for Portrait / Landscape */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 ${reportOrientation} !important;
                margin: 4mm 5mm !important;
              }
              body {
                background: white !important;
                color: black !important;
              }
            }
          ` }} />

          <div className={`bg-slate-100 rounded-2xl w-full ${reportOrientation === 'landscape' ? 'max-w-[1240px]' : 'max-w-[980px]'} max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 animate-in fade-in zoom-in-95 duration-150 my-auto a4-modal-content`}>
            
            {/* Modal Header Controls (No-Print) */}
            <div className="px-4 py-3 bg-white border-b border-slate-200 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                  <ClipboardCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>ตารางเช็กเวลาเรียน {getGradeCleanName(attendancePopupGrade)}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                      พรีวิว A4 {reportOrientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ภาคเรียนที่ {selectedSemester}/{selectedYear} | นักเรียน {popupGradeStudents.length} คน | รวมวันเรียน {activeSchoolDaysTotal} วัน
                  </p>
                </div>
              </div>

              {/* Action Buttons, Orientation & Month Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Orientation Selector: แนวตั้ง (Default) vs แนวนอน */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setReportOrientation('portrait')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      reportOrientation === 'portrait'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="ขนาดกระดาษ A4 แนวตั้ง (210 × 297 มม.)"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>แนวตั้ง</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportOrientation('landscape')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      reportOrientation === 'landscape'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="ขนาดกระดาษ A4 แนวนอน (297 × 210 มม.)"
                  >
                    <FileText className="w-3.5 h-3.5 rotate-90" />
                    <span>แนวนอน</span>
                  </button>
                </div>

                {/* Select Month */}
                <select
                  value={popupSelectedMonthKey}
                  onChange={(e) => setPopupSelectedMonthKey(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 font-semibold bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">แสดงทุกเดือน ({monthGroups.length} เดือน)</option>
                  {monthGroups.map(m => (
                    <option key={m.monthKey} value={m.monthKey}>
                      เดือน {m.monthName} ({m.days.length} วัน)
                    </option>
                  ))}
                </select>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setAttendancePopupGrade(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
                  title="ปิด"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dedicated Personnel & Room Selectors Bar (No-Print) */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Room Selector Dropdown (เมื่อกดปุ่มห้องจะเลื่อนลงมาให้เลือก) */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 whitespace-nowrap">เลือกห้อง:</span>
                  <select
                    value={normalizeRoom(selectedRoom)}
                    onChange={(e) => handleSelectRoomForGrade(attendancePopupGrade, e.target.value)}
                    className="text-xs px-3 py-1 rounded-xl border border-emerald-300 font-bold bg-white text-emerald-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                  >
                    {getRoomsForGrade(attendancePopupGrade).map(rm => (
                      <option key={rm} value={rm}>
                        ห้อง {rm}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 whitespace-nowrap">ครูผู้ประจำชั้น:</span>
                  <select
                    value={selectedAdvisorId}
                    onChange={(e) => setSelectedAdvisorId(e.target.value)}
                    className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-[210px] truncate"
                  >
                    {currentGradeAdvisors.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.prefix}{p.firstName} {p.lastName} {p.advisorGrade ? `(ประจำชั้น ${p.advisorGrade}${p.advisorRoom ? ` ห้อง ${p.advisorRoom}` : ''})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 whitespace-nowrap">ฝ่ายวิชาการ:</span>
                  <select
                    value={selectedAcademicHeadId}
                    onChange={(e) => setSelectedAcademicHeadId(e.target.value)}
                    className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-[210px] truncate"
                  >
                    {academicPersonnelList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.prefix}{p.firstName} {p.lastName} {p.position ? `(${p.position})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>



            {/* Modal Body: Interactive A4 Paper Preview Scroll Container */}
            <div ref={attendanceContainerRef} className="p-4 sm:p-6 overflow-y-auto space-y-8 bg-slate-200/70 flex-1">
              


              {popupGradeStudents.length === 0 ? (
                <div 
                  className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 space-y-2 mx-auto"
                  style={{ maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm' }}
                >
                  <Users className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">
                    ยังไม่มีข้อมูลนักเรียนในชั้น {attendancePopupGrade}
                  </p>
                  <p className="text-xs text-slate-400">
                    กรุณาเพิ่มข้อมูลนักเรียนในระบบก่อนพิมพ์แบบบันทึกเวลาเรียน
                  </p>
                </div>
              ) : popupActiveMonthGroups.length === 0 ? (
                <div 
                  className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 space-y-2 mx-auto"
                  style={{ maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm' }}
                >
                  <CalendarCheck className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">
                    ไม่พบข้อมูลเดือนในภาคเรียนนี้
                  </p>
                  <p className="text-xs text-slate-400">
                    กรุณาตรวจสอบการเลือกภาคเรียนและปีการศึกษา
                  </p>
                </div>
              ) : (
                popupActiveMonthGroups.map((group, groupIdx) => {
                  return (
                    <div 
                      key={group.monthKey}
                      className={`bg-white border border-slate-300 shadow-xl rounded-sm py-4 sm:py-5 mx-auto text-slate-900 relative transition-all ${
                        reportOrientation === 'landscape' 
                          ? 'a4-landscape-paper min-h-[210mm]' 
                          : 'a4-portrait-paper min-h-[297mm]'
                      }`}
                      style={{ 
                        width: reportOrientation === 'landscape' ? '297mm' : '210mm',
                        maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm',
                        paddingLeft: ['อ.1', 'อ.2', 'อ.3'].includes(attendancePopupGrade) ? '13mm' : '20mm',
                        paddingRight: '10mm'
                      }}
                    >
                      {/* A4 Sheet Header */}
                      <div className="mb-3 text-center">
                        <div className="flex justify-center mb-2">
                          {schoolInfo.logoUrl ? (
                            <img 
                              src={schoolInfo.logoUrl} 
                              alt="School Logo" 
                              className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto" 
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl mx-auto">
                              🏫
                            </div>
                          )}
                        </div>
                        {/* Line 1: สถิติการมาเรียน */}
                        <h1 className="text-base font-bold text-black tracking-tight">
                          สถิติการมาเรียน
                        </h1>

                        {/* Line 2: ชื่อโรงเรียน และสังกัดสำนักงาน */}
                        <div className="text-xs font-semibold text-black mt-0.5">
                          โรงเรียน{schoolInfo.schoolName ? schoolInfo.schoolName.replace(/^โรงเรียน\s*/, '') : '...................................................'} {schoolInfo.affiliation ? `สังกัด${schoolInfo.affiliation}` : ''}
                        </div>

                        {/* Line 3: เดือน, ปีการศึกษา, ภาคเรียน, ชั้น */}
                        <div className="text-xs font-bold text-black mt-0.5">
                          เดือน{group.monthName}&nbsp;&nbsp;&nbsp;&nbsp;ปีการศึกษา {selectedYear}&nbsp;&nbsp;&nbsp;&nbsp;ภาคเรียนที่ {selectedSemester}&nbsp;&nbsp;&nbsp;&nbsp;{getGradeCleanName(attendancePopupGrade)}{getRoomsForGrade(attendancePopupGrade).length > 1 || normalizeRoom(selectedRoom) !== '1' ? ` ห้อง ${normalizeRoom(selectedRoom)}` : ''}
                        </div>
                      </div>

                      {/* Compact A4 Portrait Matrix Table showing ALL calendar days */}
                      <div className="border border-slate-800 bg-white">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="text-black font-bold leading-normal">
                              <th className="py-1 px-0.5 bg-white border-r border-b border-slate-800 text-center w-5 shrink-0 font-mono text-[10px] align-middle text-black">
                                ที่
                              </th>
                              <th className="py-1 px-1 bg-white border-r border-b border-slate-800 text-center w-24 shrink-0 text-[11px] align-middle text-black">
                                ชื่อ - นามสกุล
                              </th>

                              {/* ALL Calendar Days of this Month (1 to 28..31) */}
                              {group.days.map((dayItem) => {
                                const isRedDay = dayItem.isHoliday;
                                return (
                                  <th 
                                    key={dayItem.date} 
                                    className={`py-0.5 px-0 border-r border-b border-slate-800 text-center font-mono w-[17px] text-[10px] align-middle ${
                                      isRedDay ? 'bg-rose-100 text-rose-900' : 'bg-white text-black'
                                    }`}
                                    title={`${dayItem.dayOfWeekName} ที่ ${dayItem.dayNum} ${group.monthName}${dayItem.holidayLabel ? ` (${dayItem.holidayLabel})` : ''}`}
                                  >
                                    <div className={`font-bold leading-none ${isRedDay ? 'text-rose-900' : 'text-black'}`}>
                                      {dayItem.dayNum}
                                    </div>
                                    <div className={`text-[8.5px] font-sans leading-none mt-0.5 ${isRedDay ? 'text-rose-800 font-bold' : 'text-slate-700 font-normal'}`}>
                                      {dayItem.shortDayName}
                                    </div>
                                  </th>
                                );
                              })}

                              {/* Monthly Summary Columns */}
                              <th className="py-1 px-0.5 border-r border-b border-slate-800 text-center w-5 bg-emerald-100 text-black font-bold font-mono text-[10px] align-middle">
                                มา
                              </th>
                              <th className="py-1 px-0.5 border-r border-b border-slate-800 text-center w-5 bg-rose-100 text-black font-bold font-mono text-[10px] align-middle">
                                ขาด
                              </th>
                              <th className="py-1 px-0.5 border-r border-b border-slate-800 text-center w-5 bg-amber-100 text-black font-bold font-mono text-[10px] align-middle">
                                ลา
                              </th>
                              <th className="py-1 px-0.5 border-r border-b border-slate-800 text-center w-5 bg-blue-100 text-black font-bold font-mono text-[10px] align-middle">
                                ป่วย
                              </th>
                              <th className="py-1 px-1 border-b border-slate-800 text-center w-8 bg-white text-black font-mono text-[10px] align-middle" title="รวมวันทำการ">
                                รวม
                              </th>
                            </tr>
                          </thead>
                          <tbody className="text-black bg-white">
                            {popupGradeStudents.map((s, sIdx) => {
                              let presentCount = 0;
                              let absentCount = 0;
                              let leaveCount = 0;
                              let sickCount = 0;

                              const isFirstRow = sIdx === 0;
                              const rowSpanCount = popupGradeStudents.length;

                              return (
                                <tr key={s.id} className="hover:bg-slate-50 leading-normal">
                                  <td className="py-1 px-0.5 border-r border-b border-slate-800 text-center font-mono tabular-nums text-black text-[10px] align-middle">
                                    {s.rollNumber || sIdx + 1}
                                  </td>
                                  <td className="py-1 px-1 border-r border-b border-slate-800 font-medium text-black whitespace-nowrap text-[11px] align-middle">
                                    {s.prefix}{s.firstName} {s.lastName}
                                  </td>

                                  {/* Daily status cells for all days of the month */}
                                  {group.days.map((dayItem) => {
                                    if (dayItem.isHoliday) {
                                      // If it's a holiday column, only render the <td> with rowspan on the FIRST student row!
                                      // On subsequent rows, omit this <td> so HTML table layout remains pristine.
                                      if (isFirstRow) {
                                        return (
                                          <td 
                                            key={dayItem.date} 
                                            rowSpan={rowSpanCount}
                                            className="bg-rose-100 border-r border-b border-slate-800 text-center p-0 align-middle"
                                            title={`${dayItem.dayNum} ${group.monthName}: ${dayItem.holidayLabel}`}
                                          >
                                            <div className="flex items-center justify-center h-full min-h-[40px] w-[16px] mx-auto overflow-visible">
                                              <span
                                                data-vertical-label={dayItem.holidayLabel}
                                                className="inline-block shrink-0 -rotate-90 text-[9.5px] font-bold text-rose-800 tracking-wider whitespace-nowrap select-none"
                                              >
                                                {dayItem.holidayLabel}
                                              </span>
                                            </div>
                                          </td>
                                        );
                                      } else {
                                        return null;
                                      }
                                    }

                                    // Normal school day -> Attendance symbol
                                    const status = attendanceMap.get(`${s.id}_${dayItem.date}`);
                                    let symbol = '-';
                                    let cellClass = 'text-slate-300';

                                    if (status === 'present') {
                                      symbol = '✓';
                                      cellClass = 'text-emerald-700 font-bold';
                                      presentCount++;
                                    } else if (status === 'absent') {
                                      symbol = 'ข';
                                      cellClass = 'text-rose-700 font-bold';
                                      absentCount++;
                                    } else if (status === 'leave') {
                                      symbol = 'ล';
                                      cellClass = 'text-amber-700 font-bold';
                                      leaveCount++;
                                    } else if (status === 'sick') {
                                      symbol = 'ป';
                                      cellClass = 'text-blue-700 font-bold';
                                      sickCount++;
                                    }

                                    return (
                                      <td 
                                        key={dayItem.date} 
                                        className={`py-0.5 px-0 border-r border-b border-slate-800 text-center font-mono text-[10.5px] tabular-nums align-middle ${cellClass}`}
                                      >
                                        {symbol}
                                      </td>
                                    );
                                  })}

                                  {/* Student totals for month */}
                                  <td className="py-1 px-0.5 border-r border-b border-slate-800 text-center font-bold font-mono text-black bg-emerald-100 text-[10px] align-middle">
                                    {presentCount}
                                  </td>
                                  <td className="py-1 px-0.5 border-r border-b border-slate-800 text-center font-bold font-mono text-black bg-rose-100 text-[10px] align-middle">
                                    {absentCount}
                                  </td>
                                  <td className="py-1 px-0.5 border-r border-b border-slate-800 text-center font-bold font-mono text-black bg-amber-100 text-[10px] align-middle">
                                    {leaveCount}
                                  </td>
                                  <td className="py-1 px-0.5 border-r border-b border-slate-800 text-center font-bold font-mono text-black bg-blue-100 text-[10px] align-middle">
                                    {sickCount}
                                  </td>
                                  <td className="py-1 px-0.5 border-b border-slate-800 text-center font-bold font-mono text-black bg-white text-[10px] align-middle">
                                    {group.schoolDaysCount}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>

                          {/* Footer totals row */}
                          <tfoot>
                            <tr className="font-bold border-t border-slate-800 text-black">
                              <td colSpan={2} className="py-1 px-1 bg-white border-r border-slate-800 text-center text-[10px] align-middle text-black font-bold">
                                รวมมาเรียน (คน):
                              </td>
                              {group.days.map((dayItem) => {
                                if (dayItem.isHoliday) {
                                  return (
                                    <td key={dayItem.date} className="py-0.5 px-0 border-r border-slate-800 bg-rose-100 text-center text-black font-bold text-[8.5px] align-middle">
                                      -
                                    </td>
                                  );
                                }
                                let dayPresent = 0;
                                popupGradeStudents.forEach(s => {
                                  if (attendanceMap.get(`${s.id}_${dayItem.date}`) === 'present') {
                                    dayPresent++;
                                  }
                                });
                                return (
                                  <td key={dayItem.date} className="py-0.5 px-0 bg-white border-r border-slate-800 text-center font-mono text-[10px] text-black font-bold align-middle">
                                    {dayPresent}
                                  </td>
                                );
                              })}
                              {/* Monthly Summary Columns Totals in Footer */}
                              <td className="py-1 px-0.5 border-r border-slate-800 text-center font-bold font-mono text-black bg-emerald-100 text-[10px] align-middle" title="รวมวันมาเรียนทั้งหมด">
                                {popupGradeStudents.reduce((acc, s) => {
                                  let count = 0;
                                  group.days.forEach(d => { if (!d.isHoliday && attendanceMap.get(`${s.id}_${d.date}`) === 'present') count++; });
                                  return acc + count;
                                }, 0)}
                              </td>
                              <td className="py-1 px-0.5 border-r border-slate-800 text-center font-bold font-mono text-black bg-rose-100 text-[10px] align-middle" title="รวมวันขาดทั้งหมด">
                                {popupGradeStudents.reduce((acc, s) => {
                                  let count = 0;
                                  group.days.forEach(d => { if (!d.isHoliday && attendanceMap.get(`${s.id}_${d.date}`) === 'absent') count++; });
                                  return acc + count;
                                }, 0)}
                              </td>
                              <td className="py-1 px-0.5 border-r border-slate-800 text-center font-bold font-mono text-black bg-amber-100 text-[10px] align-middle" title="รวมวันลาทั้งหมด">
                                {popupGradeStudents.reduce((acc, s) => {
                                  let count = 0;
                                  group.days.forEach(d => { if (!d.isHoliday && attendanceMap.get(`${s.id}_${d.date}`) === 'leave') count++; });
                                  return acc + count;
                                }, 0)}
                              </td>
                              <td className="py-1 px-0.5 border-r border-slate-800 text-center font-bold font-mono text-black bg-blue-100 text-[10px] align-middle" title="รวมวันป่วยทั้งหมด">
                                {popupGradeStudents.reduce((acc, s) => {
                                  let count = 0;
                                  group.days.forEach(d => { if (!d.isHoliday && attendanceMap.get(`${s.id}_${d.date}`) === 'sick') count++; });
                                  return acc + count;
                                }, 0)}
                              </td>
                              <td className="py-1 px-0.5 text-center font-bold font-mono text-black bg-white text-[10px] align-middle" title={`จำนวนนักเรียนทั้งหมด ${popupGradeStudents.length} คน`}>
                                {popupGradeStudents.length}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Signatures */}
                      {renderEditableSignatures('2.1cm')}

                      {/* Visual A4 Page Boundary Line Indicator (On screen only) */}
                      <div className="a4-page-limit-line mt-6 pt-2 border-t-2 border-dashed border-purple-400 text-center text-[10px] font-bold text-purple-700 no-print flex items-center justify-center gap-2 bg-purple-50/60 py-1 rounded">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>--- สิ้นสุดความยาวกระดาษ A4 หน้าที่ {groupIdx + 1} (297 mm) ---</span>
                      </div>
                    </div>
                  );
                })
              )}

            </div>

            {/* Modal Footer (No-Print) */}
            <div className="px-4 py-3 bg-white border-t border-slate-200 rounded-b-2xl flex items-center justify-between gap-3 shrink-0 no-print">
              <span className="text-xs text-slate-500">
                พร้อมสำหรับการดาวน์โหลดเอกสาร PDF (ขนาด A4 {reportOrientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAttendancePopupGrade(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="button"
                  disabled={isDownloadingPdf}
                  onClick={handleDownloadAttendancePDF}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="ดาวน์โหลด PDF"
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังสร้าง PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 
        ========================================================================
        POP-UP MODAL: True A4 Portrait Assessment (วัดผล) Sheet Preview & PDF Download
        ========================================================================
        เมื่อกดคำว่า "วัดผล" จะแสดง pop-up หน้ากระดาษ A4 แนวตั้งที่เป็นจริง
        แสดง 5 วิชา ต่อ 1 หน้ากระดาษ A4 แนวตั้ง (แบ่งเป็นชุดๆ หากมีมากกว่า 5 วิชา)
        ในตารางประกอบด้วย:
          - คะแนนระหว่างภาค (courseworkScore)
          - คะแนนสอบ (examScore)
          - คะแนนรวม (totalScore)
        โดยดึงข้อมูลคะแนนเชื่อมโยงโดยตรงจากหน้างานวัดผล (Module 2)
      */}
      {assessmentPopupGrade && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto a4-modal-overlay">
          {/* Dynamic Print CSS for Portrait / Landscape */}
          <style dangerouslySetInnerHTML={{ __html: `
            .a4-portrait-paper, .a4-landscape-paper,
            .a4-portrait-paper *, .a4-landscape-paper * {
              color: black !important;
            }
            @media print {
              @page {
                size: A4 ${reportOrientation} !important;
                margin: 4mm 5mm !important;
              }
              body {
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .a4-portrait-paper, .a4-landscape-paper {
                box-shadow: none !important;
                border: 1px solid #1e293b !important;
                border-radius: 0 !important;
                margin: 0 auto !important;
                width: ${reportOrientation === 'landscape' ? '297mm' : '210mm'} !important;
                max-width: ${reportOrientation === 'landscape' ? '297mm' : '210mm'} !important;
                min-width: ${reportOrientation === 'landscape' ? '297mm' : '210mm'} !important;
                min-height: ${reportOrientation === 'landscape' ? '210mm' : '297mm'} !important;
                page-break-after: always !important;
                break-after: page !important;
              }
              .a4-page-limit-line {
                display: none !important;
              }
            }
          ` }} />

          <div className={`bg-slate-100 rounded-2xl w-full ${reportOrientation === 'landscape' ? 'max-w-[1340px] w-[96vw]' : 'max-w-[980px]'} max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 animate-in fade-in zoom-in-95 duration-150 my-auto a4-modal-content`}>
            
            {/* Modal Header Controls (No-Print) */}
            <div className="px-4 py-3 bg-white border-b border-slate-200 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs shrink-0">
                  <Award className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>
                      ตาราง{assessmentViewMode === 'activity'
                        ? 'ผลการประเมินกิจกรรมพัฒนาผู้เรียน (ผ่าน/ไม่ผ่าน)'
                        : assessmentViewMode === 'grade' && canShowGradeButton
                        ? 'ระดับผลการเรียน (เกรด)'
                        : 'คะแนนวัดผล'} {getGradeCleanName(assessmentPopupGrade)}
                    </span>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                      {assessmentViewMode === 'activity'
                        ? 'พรีวิวผลการประเมินกิจกรรม (ผ่าน/ไม่ผ่าน)'
                        : assessmentViewMode === 'grade' && canShowGradeButton 
                        ? 'พรีวิวระดับผลการเรียน (เกรดทุกรายวิชา)' 
                        : isAssessmentKindergarten
                        ? `พรีวิว A4 ${reportOrientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'} (${assessmentSubjectChunks.length} แผ่น)`
                        : `พรีวิว A4 ${reportOrientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'} (${reportOrientation === 'landscape' ? '7' : '5'} วิชา/แผ่น)`}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ภาคเรียนที่ {selectedSemester}/{selectedYear} | นักเรียน {assessmentGradeStudents.length} คน | {assessmentViewMode === 'activity' ? `กิจกรรมทั้งหมด ${assessmentGradeActivities.length} กิจกรรม` : `รายวิชาทั้งหมด ${assessmentGradeSubjects.length} วิชา`}
                  </p>
                </div>
              </div>

              {/* Top Right Header Controls: Orientation Selector + Close Button */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Orientation Selector: แนวตั้ง (Default) vs แนวนอน */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setReportOrientation('portrait')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      reportOrientation === 'portrait'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="ขนาดกระดาษ A4 แนวตั้ง (210 × 297 มม.)"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>แนวตั้ง</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportOrientation('landscape')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      reportOrientation === 'landscape'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="ขนาดกระดาษ A4 แนวนอน (297 × 210 มม.)"
                  >
                    <FileText className="w-3.5 h-3.5 rotate-90" />
                    <span>แนวนอน</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setAssessmentPopupGrade(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
                  title="ปิด"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dedicated Personnel Selectors & View Mode Bar (No-Print) */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
              <div className="flex items-center gap-3 flex-wrap">
                {/* 3 Buttons: คะแนน vs เกรด vs กิจกรรม */}
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setAssessmentViewMode('score')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      assessmentViewMode === 'score'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>คะแนน</span>
                  </button>

                  {canShowGradeButton && (
                    <button
                      type="button"
                      onClick={() => setAssessmentViewMode('grade')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        assessmentViewMode === 'grade'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{isAssessmentKindergarten ? 'สรุปทุกด้าน' : 'เกรด'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setAssessmentViewMode('activity')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      assessmentViewMode === 'activity'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>กิจกรรม</span>
                  </button>
                </div>

                {/* Room Selector Dropdown (เมื่อกดปุ่มห้องจะเลื่อนลงมาให้เลือก) */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 whitespace-nowrap">เลือกห้อง:</span>
                  <select
                    value={normalizeRoom(selectedRoom)}
                    onChange={(e) => handleSelectRoomForGrade(assessmentPopupGrade, e.target.value)}
                    className="text-xs px-3 py-1 rounded-xl border border-indigo-300 font-bold bg-white text-indigo-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                  >
                    {getRoomsForGrade(assessmentPopupGrade).map(rm => (
                      <option key={rm} value={rm}>
                        ห้อง {rm}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 whitespace-nowrap">ครูผู้ประจำชั้น:</span>
                  <select
                    value={selectedAdvisorId}
                    onChange={(e) => setSelectedAdvisorId(e.target.value)}
                    className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[210px] truncate"
                  >
                    {currentGradeAdvisors.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.prefix}{p.firstName} {p.lastName} {p.advisorGrade ? `(ประจำชั้น ${p.advisorGrade}${p.advisorRoom ? ` ห้อง ${p.advisorRoom}` : ''})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 whitespace-nowrap">ฝ่ายวิชาการ:</span>
                  <select
                    value={selectedAcademicHeadId}
                    onChange={(e) => setSelectedAcademicHeadId(e.target.value)}
                    className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[210px] truncate"
                  >
                    {academicPersonnelList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.prefix}{p.firstName} {p.lastName} {p.position ? `(${p.position})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>



            {/* Modal Body: Interactive A4 Paper Preview Scroll Container */}
            <div ref={assessmentContainerRef} className="p-4 sm:p-6 overflow-auto space-y-8 bg-slate-200/70 flex-1">
              


              {assessmentGradeStudents.length === 0 ? (
                <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 space-y-2 max-w-[210mm] mx-auto">
                  <Users className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">
                    ยังไม่มีข้อมูลนักเรียนในชั้น {getGradeCleanName(assessmentPopupGrade)}
                  </p>
                  <p className="text-xs text-slate-400">
                    กรุณาเพิ่มข้อมูลนักเรียนในระบบก่อนพิมพ์แบบรายงานผลการเรียน
                  </p>
                </div>
              ) : assessmentViewMode === 'activity' ? (
                assessmentGradeActivities.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 space-y-2 max-w-[210mm] mx-auto">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">
                      ยังไม่มีข้อมูลกิจกรรมพัฒนาผู้เรียนในชั้น {getGradeCleanName(assessmentPopupGrade)} ในภาคเรียนที่ {selectedSemester}/{selectedYear}
                    </p>
                    <p className="text-xs text-slate-400">
                      กรุณาเพิ่มโครงสร้างกิจกรรมและบันทึกผลการประเมิน (ผ่าน/ไม่ผ่าน) ในเมนูงานวัดผล (Module 2)
                    </p>
                  </div>
                ) : (
                  /* ACTIVITY VIEW: PASS/FAIL EVALUATION TABLE FOR ALL ACTIVITIES IN THIS GRADE & SEMESTER */
                  <div 
                    className={`${
                      reportOrientation === 'landscape'
                        ? 'a4-landscape-paper min-h-[210mm]'
                        : 'a4-portrait-paper min-h-[297mm]'
                    } bg-white border border-slate-300 shadow-xl rounded-sm py-4 sm:py-5 mx-auto text-slate-900 relative transition-all`}
                    style={{
                      width: reportOrientation === 'landscape' ? '297mm' : '210mm',
                      maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm',
                      minWidth: reportOrientation === 'landscape' ? '297mm' : '210mm',
                      paddingLeft: isAssessmentKindergarten ? (reportOrientation === 'landscape' ? '15mm' : '13mm') : (reportOrientation === 'landscape' ? '15mm' : '20mm'),
                      paddingRight: '10mm',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* A4 Sheet Header */}
                    <div className="mb-3 text-center">
                      <div className="flex justify-center mb-2">
                        {schoolInfo.logoUrl ? (
                          <img 
                            src={schoolInfo.logoUrl} 
                            alt="School Logo" 
                            className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto" 
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl mx-auto">
                            🏫
                          </div>
                        )}
                      </div>
                      <h1 className="text-base sm:text-lg font-bold text-black tracking-tight">
                        แบบรายงานผลการประเมินกิจกรรมพัฒนาผู้เรียน
                      </h1>
                      <div className="text-xs sm:text-sm font-semibold text-black mt-0.5">
                        โรงเรียน{schoolInfo.schoolName ? schoolInfo.schoolName.replace(/^โรงเรียน\s*/, '') : '...................................................'} {schoolInfo.affiliation ? `สังกัด${schoolInfo.affiliation}` : ''}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-black mt-0.5">
                        ปีการศึกษา {selectedYear}&nbsp;&nbsp;&nbsp;&nbsp;ภาคเรียนที่ {selectedSemester}&nbsp;&nbsp;&nbsp;&nbsp;{getGradeCleanName(assessmentPopupGrade)}{getRoomsForGrade(assessmentPopupGrade).length > 1 || normalizeRoom(selectedRoom) !== '1' ? ` ห้อง ${normalizeRoom(selectedRoom)}` : ''}
                      </div>
                    </div>

                    {/* Activities Pass/Fail Table (แสดงเป็นสีขาว-ดำเพื่อความเป็นทางการ) */}
                    <div className="border border-slate-800 bg-white">
                      <table className="w-full text-left text-[13px] border-collapse bg-white">
                        <thead>
                          <tr className="bg-white text-black font-bold border-b border-slate-800 text-center leading-normal">
                            <th className="py-2 px-1 border-r border-slate-800 w-8 shrink-0 font-mono text-[12px] align-middle text-black">
                              ที่
                            </th>
                            <th className="py-2 px-1 border-r border-slate-800 w-20 shrink-0 font-mono text-[12px] align-middle text-black">
                              รหัสประจำตัว
                            </th>
                            <th className="py-2 px-2 border-r border-slate-800 w-44 shrink-0 text-center text-[13px] align-middle text-black">
                              ชื่อ - นามสกุล
                            </th>
                            {assessmentGradeActivities.map((act) => (
                              <th 
                                key={act.id}
                                className="py-1.5 px-1.5 border-r border-slate-800 text-center bg-white text-black font-bold align-middle"
                              >
                                <div className="font-bold text-[12.5px] leading-snug mx-auto text-black">
                                  {act.code ? `${act.code} ` : ''}{act.name}
                                </div>
                              </th>
                            ))}
                            <th className="py-1.5 px-1.5 text-center bg-white text-black font-bold align-middle w-24 shrink-0">
                              <div className="font-bold text-[12.5px] leading-snug mx-auto text-black">
                                สรุปผลกิจกรรม
                              </div>
                            </th>
                          </tr>
                        </thead>

                        <tbody className="bg-white text-black">
                          {assessmentGradeStudents.map((s, sIdx) => {
                            let evaluatedCount = 0;
                            let failCount = 0;

                            const actCols = assessmentGradeActivities.map((act) => {
                              const res = getStudentActivityResult(s.id, act);
                              if (res === 'ผ่าน' || res === 'ไม่ผ่าน') {
                                evaluatedCount++;
                                if (res === 'ไม่ผ่าน') failCount++;
                              }
                              return (
                                <td 
                                  key={act.id}
                                  className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-[12.5px] align-middle bg-white text-black"
                                >
                                  <span className="font-bold text-black leading-normal">
                                    {res}
                                  </span>
                                </td>
                              );
                            });

                            const summaryResult = evaluatedCount === 0
                              ? '-'
                              : failCount > 0
                              ? 'ไม่ผ่าน'
                              : evaluatedCount === assessmentGradeActivities.length
                              ? 'ผ่าน'
                              : 'ผ่าน';

                            return (
                              <tr key={s.id} className="bg-white leading-normal">
                                <td className="py-1.5 px-0.5 border-r border-b border-slate-800 text-center font-mono tabular-nums text-black text-[12px] align-middle">
                                  {s.rollNumber || sIdx + 1}
                                </td>
                                <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-mono tabular-nums text-black text-[12px] align-middle">
                                  {s.studentCode || '-'}
                                </td>
                                <td className="py-1.5 px-2 border-r border-b border-slate-800 font-medium text-black whitespace-nowrap text-[13px] align-middle">
                                  {s.prefix}{s.firstName} {s.lastName}
                                </td>
                                {actCols}
                                <td className="py-1.5 px-1 border-b border-slate-800 text-center font-bold text-[12.5px] align-middle bg-white text-black">
                                  {summaryResult}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Footer: Summary of Pass / Fail counts per activity */}
                        <tfoot>
                          <tr className="bg-white font-bold border-t border-slate-800 text-black text-[10px]">
                            <td colSpan={3} className="py-1.5 px-2 border-r border-slate-800 text-center align-middle font-bold text-black">
                              สรุปจำนวน (ผ่าน / ไม่ผ่าน):
                            </td>
                            {assessmentGradeActivities.map((act) => {
                              let passCnt = 0;
                              let failCnt = 0;
                              assessmentGradeStudents.forEach(s => {
                                const r = getStudentActivityResult(s.id, act);
                                if (r === 'ผ่าน') passCnt++;
                                else if (r === 'ไม่ผ่าน') failCnt++;
                              });
                              return (
                                <td key={act.id} className="py-1 px-1 border-r border-slate-800 text-center align-middle font-mono text-[9.5px] text-black font-bold bg-white">
                                  ผ่าน {passCnt} / ไม่ผ่าน {failCnt}
                                </td>
                              );
                            })}
                            {(() => {
                              let totalAllPass = 0;
                              let totalAnyFail = 0;
                              assessmentGradeStudents.forEach(s => {
                                let ev = 0;
                                let fl = 0;
                                assessmentGradeActivities.forEach(act => {
                                  const r = getStudentActivityResult(s.id, act);
                                  if (r === 'ผ่าน' || r === 'ไม่ผ่าน') {
                                    ev++;
                                    if (r === 'ไม่ผ่าน') fl++;
                                  }
                                });
                                if (ev > 0) {
                                  if (fl > 0) totalAnyFail++;
                                  else totalAllPass++;
                                }
                              });
                              return (
                                <td className="py-1 px-1 border-slate-800 text-center align-middle font-mono text-[9.5px] text-black font-bold bg-white">
                                  ผ่าน {totalAllPass} / ไม่ผ่าน {totalAnyFail}
                                </td>
                              );
                            })()}
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Signatures */}
                    {renderEditableSignatures('2.1cm')}

                    {/* Visual A4 Page Boundary Line Indicator (On screen only) */}
                    <div className="a4-page-limit-line mt-6 pt-2 border-t-2 border-dashed border-indigo-400 text-center text-[10px] font-bold text-indigo-700 no-print flex items-center justify-center gap-2 bg-indigo-50/60 py-1 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>--- สิ้นสุดความยาวกระดาษ A4 รายงานผลการประเมินกิจกรรมพัฒนาผู้เรียน ---</span>
                    </div>
                  </div>
                )
              ) : (assessmentViewMode === 'grade' ? assessmentGradeModeSubjects.length === 0 : assessmentGradeSubjects.length === 0) ? (
                <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 space-y-2 max-w-[210mm] mx-auto">
                  <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">
                    ยังไม่มีข้อมูลรายวิชาในชั้น {getGradeCleanName(assessmentPopupGrade)} ในภาคเรียนนี้
                  </p>
                  <p className="text-xs text-slate-400">
                    กรุณาเพิ่มโครงสร้างรายวิชาและบันทึกคะแนนในเมนูงานวัดผล (Module 2)
                  </p>
                </div>
              ) : assessmentViewMode === 'grade' && canShowGradeButton ? (
                isAssessmentKindergarten ? (
                  (() => {
                    const maxAspectsPerPage = reportOrientation === 'landscape' ? 6 : 4;
                    const kGradeChunks: Subject[][] = [];
                    for (let i = 0; i < assessmentGradeModeSubjects.length; i += maxAspectsPerPage) {
                      kGradeChunks.push(assessmentGradeModeSubjects.slice(i, i + maxAspectsPerPage));
                    }
                    if (kGradeChunks.length === 0) kGradeChunks.push([]);

                    return kGradeChunks.map((kSubjChunk, kPageIdx) => (
                      <div
                        key={`k-grade-summary-page-${kPageIdx}`}
                        className={`${
                          reportOrientation === 'landscape'
                            ? 'a4-landscape-paper min-h-[210mm]'
                            : 'a4-portrait-paper min-h-[297mm]'
                        } bg-white border border-slate-300 shadow-xl rounded-sm py-3 sm:py-4 mx-auto text-slate-900 relative transition-all`}
                        style={{
                          width: reportOrientation === 'landscape' ? '297mm' : '210mm',
                          maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm',
                          minWidth: reportOrientation === 'landscape' ? '297mm' : '210mm',
                          paddingTop: '1cm',
                          paddingLeft: '13mm',
                          paddingRight: '8mm',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* A4 Sheet Header */}
                        <div className="mb-2.5 text-center">
                          <div className="flex justify-center mb-1.5">
                            {schoolInfo.logoUrl ? (
                              <img
                                src={schoolInfo.logoUrl}
                                alt="School Logo"
                                className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto"
                              />
                            ) : (
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-4xl mx-auto">
                                🏫
                              </div>
                            )}
                          </div>
                          <h1 className="text-sm sm:text-base font-bold text-black tracking-tight">
                            แบบรายงานสรุปผลการประเมินพัฒนาการตามด้านความสามารถ
                          </h1>
                          <div className="text-xs font-semibold text-black mt-0.5">
                            โรงเรียน{schoolInfo.schoolName ? schoolInfo.schoolName.replace(/^โรงเรียน\s*/, '') : '...................................................'} {schoolInfo.affiliation ? `สังกัด${schoolInfo.affiliation}` : ''}
                          </div>
                          <div className="text-xs font-bold text-black mt-0.5">
                            ปีการศึกษา {selectedYear}&nbsp;&nbsp;&nbsp;&nbsp;ภาคเรียนที่ {selectedSemester}&nbsp;&nbsp;&nbsp;&nbsp;{getGradeCleanName(assessmentPopupGrade)}{getRoomsForGrade(assessmentPopupGrade).length > 1 || normalizeRoom(selectedRoom) !== '1' ? ` ห้อง ${normalizeRoom(selectedRoom)}` : ''}
                          </div>
                        </div>

                        <div className="border border-black bg-white w-full max-w-full overflow-hidden">
                          <table className="w-full max-w-full table-fixed text-left text-[10px] border-collapse bg-white text-black">
                            <colgroup>
                              <col style={{ width: '6mm' }} />
                              <col style={{ width: '11mm' }} />
                              <col style={{ width: '32mm' }} />
                              {kSubjChunk.map((subj) => (
                                <React.Fragment key={`col-sum-${subj.id}`}>
                                  <col style={{ width: '6.5mm' }} />
                                  <col />
                                </React.Fragment>
                              ))}
                            </colgroup>
                            <thead>
                              <tr className="bg-white text-black font-bold border-b border-black text-center leading-tight">
                                <th rowSpan={2} className="py-1 px-0.5 border-r border-b border-black font-mono text-[9.5px] align-middle bg-white text-black">
                                  ที่
                                </th>
                                <th rowSpan={2} className="py-1 px-0.5 border-r border-b border-black font-mono text-[9.5px] align-middle bg-white text-black">
                                  รหัส
                                </th>
                                <th rowSpan={2} className="py-1 px-1 border-r border-b border-black text-center text-[10px] align-middle bg-white text-black">
                                  ชื่อ - นามสกุล
                                </th>
                                {kSubjChunk.map((subj, subjIdx) => {
                                  const isLastSubj = subjIdx === kSubjChunk.length - 1;
                                  return (
                                    <th
                                      key={subj.id}
                                      colSpan={2}
                                      className={`py-1 px-0.5 ${isLastSubj ? '' : 'border-r'} border-b border-black text-center bg-white text-black font-bold align-middle`}
                                    >
                                      <div className="font-bold text-[9px] leading-tight whitespace-normal break-words mx-auto text-black">
                                        {subj.code ? `${subj.code} ` : ''}{subj.name}
                                      </div>
                                    </th>
                                  );
                                })}
                              </tr>
                              <tr className="bg-white text-black font-bold text-[8.5px] leading-tight text-center">
                                {kSubjChunk.map((subj, subjIdx) => {
                                  const isLastSubj = subjIdx === kSubjChunk.length - 1;
                                  return (
                                    <React.Fragment key={subj.id}>
                                      <th className="py-1 px-0.5 border-r border-b border-black text-center bg-white text-black font-semibold align-middle">
                                        <div className="vertical-text-header" data-vertical-label="ระดับ" data-vertical-color="#000000">
                                          ระดับ
                                        </div>
                                      </th>
                                      <th className={`py-1 px-0.5 ${isLastSubj ? '' : 'border-r'} border-b border-black text-center bg-white text-black font-bold align-middle`}>
                                        ผล
                                      </th>
                                    </React.Fragment>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody className="bg-white text-black">
                              {assessmentGradeStudents.map((s, sIdx) => (
                                <tr key={s.id} className="bg-white leading-snug">
                                  <td className="py-0.5 px-0.5 border-r border-b border-black text-center font-mono tabular-nums bg-white text-black text-[9.5px] align-middle">
                                    {s.rollNumber || sIdx + 1}
                                  </td>
                                  <td className="py-0.5 px-0.5 border-r border-b border-black text-center font-mono tabular-nums bg-white text-black text-[9.5px] align-middle">
                                    {s.studentCode || '-'}
                                  </td>
                                  <td className="py-0.5 px-1 border-r border-b border-black font-medium bg-white text-black truncate text-[9.5px] align-middle">
                                    {s.prefix}{s.firstName} {s.lastName}
                                  </td>
                                  {kSubjChunk.map((subj, subjIdx) => {
                                    const isLastSubj = subjIdx === kSubjChunk.length - 1;
                                    const kEval = getStudentKindergartenEval(s.id, subj);
                                    return (
                                      <React.Fragment key={subj.id}>
                                        <td className="py-0.5 px-0.5 border-r border-b border-black text-center font-mono font-bold text-[9.5px] bg-white text-black align-middle">
                                          {kEval.overallDisplay}
                                        </td>
                                        <td className={`py-0.5 px-0.5 ${isLastSubj ? '' : 'border-r'} border-b border-black text-center font-bold text-[8.5px] bg-white text-black align-middle whitespace-nowrap`}>
                                          {kEval.overallLabel}
                                        </td>
                                      </React.Fragment>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Signatures */}
                        {renderEditableSignatures('2.1cm')}

                        {/* Visual A4 Page Boundary Line Indicator (On screen only) */}
                        <div className="a4-page-limit-line mt-6 pt-2 border-t-2 border-dashed border-indigo-400 text-center text-[10px] font-bold text-indigo-700 no-print flex items-center justify-center gap-2 bg-indigo-50/60 py-1 rounded">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>--- สิ้นสุดความยาวกระดาษ A4 รายงานสรุปผลการประเมินพัฒนาการ {kGradeChunks.length > 1 ? `แผ่นที่ ${kPageIdx + 1}/${kGradeChunks.length}` : ''} ---</span>
                        </div>
                      </div>
                    ));
                  })()
                ) : (
                /* GRADE VIEW: ALL SUBJECTS IN A SINGLE TABLE WITH CALCULATED 1, 1.5, 2, 2.5, 3, 3.5, 4 */
                <div 
                  className={`${
                    reportOrientation === 'landscape'
                      ? 'a4-landscape-paper min-h-[210mm]'
                      : 'a4-portrait-paper min-h-[297mm]'
                  } bg-white border border-slate-300 shadow-xl rounded-sm py-3 sm:py-4 mx-auto text-slate-900 relative transition-all`}
                  style={{
                    width: reportOrientation === 'landscape' ? '297mm' : '210mm',
                    maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm',
                    minWidth: reportOrientation === 'landscape' ? '297mm' : '210mm',
                    paddingLeft: '20mm',
                    paddingRight: '10mm',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* A4 Sheet Header */}
                  <div className="mb-2.5 text-center">
                    <div className="flex justify-center mb-1.5">
                      {schoolInfo.logoUrl ? (
                        <img 
                          src={schoolInfo.logoUrl} 
                          alt="School Logo" 
                          className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto" 
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl mx-auto">
                          🏫
                        </div>
                      )}
                    </div>
                    <h1 className="text-sm sm:text-base font-bold text-black tracking-tight">
                      แบบรายงานระดับผลการเรียน (เกรด)
                    </h1>
                    <div className="text-xs font-semibold text-black mt-0.5">
                      โรงเรียน{schoolInfo.schoolName ? schoolInfo.schoolName.replace(/^โรงเรียน\s*/, '') : '...................................................'} {schoolInfo.affiliation ? `สังกัด${schoolInfo.affiliation}` : ''}
                    </div>
                    <div className="text-xs font-bold text-black mt-0.5">
                      {isAssessmentP1ToP6 ? (
                        <>ปีการศึกษา {selectedYear}&nbsp;&nbsp;&nbsp;&nbsp;{getGradeCleanName(assessmentPopupGrade)}{getRoomsForGrade(assessmentPopupGrade).length > 1 || normalizeRoom(selectedRoom) !== '1' ? ` ห้อง ${normalizeRoom(selectedRoom)}` : ''}</>
                      ) : (
                        <>ปีการศึกษา {selectedYear}&nbsp;&nbsp;&nbsp;&nbsp;ภาคเรียนที่ {selectedSemester}&nbsp;&nbsp;&nbsp;&nbsp;{getGradeCleanName(assessmentPopupGrade)}{getRoomsForGrade(assessmentPopupGrade).length > 1 || normalizeRoom(selectedRoom) !== '1' ? ` ห้อง ${normalizeRoom(selectedRoom)}` : ''}</>
                      )}
                    </div>
                  </div>

                  {/* All Subjects Table (แสดงเป็นสีขาว-ดำเพื่อความเป็นทางการ) */}
                  <div className="border border-slate-800 bg-white w-full max-w-full overflow-hidden">
                    <table className="w-full text-left text-[11px] border-collapse bg-white">
                      <thead>
                        <tr className="bg-white text-black font-bold border-b border-slate-800 text-center leading-normal">
                          <th className="py-2 px-1 border-r border-slate-800 w-8 shrink-0 font-mono text-[10px] align-middle text-black">
                            ที่
                          </th>
                          <th className="py-2 px-1 border-r border-slate-800 w-20 shrink-0 font-mono text-[10px] align-middle text-black">
                            รหัสประจำตัว
                          </th>
                          <th className="py-2 px-2 border-r border-slate-800 w-36 shrink-0 text-center text-[11px] align-middle text-black">
                            ชื่อ - นามสกุล
                          </th>
                          {assessmentGradeModeSubjects.map((subj, subjIdx) => {
                            const isLastSubj = subjIdx === assessmentGradeModeSubjects.length - 1;
                            return (
                              <th 
                                key={subj.id}
                                className={`py-1.5 px-1 ${isLastSubj ? '' : 'border-r'} border-slate-800 text-center bg-white text-black font-bold align-middle`}
                              >
                                <div className="font-bold text-[10px] leading-snug mx-auto text-black">
                                  {subj.code || subj.name}
                                </div>
                                <div className="text-[8.5px] font-mono text-black font-normal leading-snug">
                                  {subj.name !== subj.code ? subj.name.slice(0, 8) : ''}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>

                      <tbody className="bg-white text-black">
                        {assessmentGradeStudents.map((s, sIdx) => {
                          let totalPoints = 0;
                          let totalCredits = 0;

                          const subjGradeCols = assessmentGradeModeSubjects.map((subj, subjIdx) => {
                            const isLastSubj = subjIdx === assessmentGradeModeSubjects.length - 1;
                            const rawScore = getStudentGradeScore(s.id, subj);
                            const gradeStr = calculateThaiGrade(rawScore);
                            const weight = subj.hoursPerWeek ? subj.hoursPerWeek / 2 : 1;

                            let pt: number | null = null;
                            if (gradeStr === '4') pt = 4.0;
                            else if (gradeStr === '3.5') pt = 3.5;
                            else if (gradeStr === '3') pt = 3.0;
                            else if (gradeStr === '2.5') pt = 2.5;
                            else if (gradeStr === '2') pt = 2.0;
                            else if (gradeStr === '1.5') pt = 1.5;
                            else if (gradeStr === '1') pt = 1.0;
                            else if (gradeStr === '0') pt = 0.0;

                            if (pt !== null) {
                              totalPoints += pt * weight;
                              totalCredits += weight;
                            }

                            return (
                              <td 
                                key={subj.id}
                                className={`py-1.5 px-1 ${isLastSubj ? '' : 'border-r'} border-b border-slate-800 text-center font-bold text-[10.5px] align-middle bg-white text-black`}
                              >
                                <span className="font-mono font-bold text-black leading-normal">
                                  {gradeStr}
                                </span>
                              </td>
                            );
                          });

                          const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '-';

                          return (
                            <tr key={s.id} className="bg-white leading-normal">
                              <td className="py-1.5 px-0.5 border-r border-b border-slate-800 text-center font-mono tabular-nums text-black text-[10px] align-middle">
                                {s.rollNumber || sIdx + 1}
                              </td>
                              <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-mono tabular-nums text-black text-[10px] align-middle">
                                {s.studentCode || '-'}
                              </td>
                              <td className="py-1.5 px-2 border-r border-b border-slate-800 font-medium text-black whitespace-nowrap text-[11px] align-middle">
                                {s.prefix}{s.firstName} {s.lastName}
                              </td>
                              {subjGradeCols}
                            </tr>
                          );
                        })}
                      </tbody>

                      {/* Footer */}
                      <tfoot>
                        <tr className="bg-white font-bold border-t border-slate-800 text-black text-[10px]">
                          <td colSpan={3} className="py-1.5 px-2 border-r border-slate-800 text-center align-middle font-bold text-black">
                            เกรดเฉลี่ยรายวิชา
                          </td>
                          {assessmentGradeModeSubjects.map((subj, subjIdx) => {
                            const isLastSubj = subjIdx === assessmentGradeModeSubjects.length - 1;
                            let totalPts = 0;
                            let countPts = 0;
                            assessmentGradeStudents.forEach(s => {
                              const rawScore = getStudentGradeScore(s.id, subj);
                              const gStr = calculateThaiGrade(rawScore);
                              let pt: number | null = null;
                              if (gStr === '4') pt = 4.0;
                              else if (gStr === '3.5') pt = 3.5;
                              else if (gStr === '3') pt = 3.0;
                              else if (gStr === '2.5') pt = 2.5;
                              else if (gStr === '2') pt = 2.0;
                              else if (gStr === '1.5') pt = 1.5;
                              else if (gStr === '1') pt = 1.0;
                              else if (gStr === '0') pt = 0.0;
                              if (pt !== null) { totalPts += pt; countPts++; }
                            });
                            const avgPt = countPts > 0 ? (totalPts / countPts).toFixed(2) : '-';
                            return (
                              <td key={subj.id} className={`py-1 px-0.5 ${isLastSubj ? '' : 'border-r'} border-slate-800 text-center align-middle font-mono text-[10px] text-black font-bold bg-white`}>
                                {avgPt}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Signatures */}
                  {renderEditableSignatures('2.1cm')}

                  {/* Visual A4 Page Boundary Line Indicator (On screen only) */}
                  <div className="a4-page-limit-line mt-6 pt-2 border-t-2 border-dashed border-indigo-400 text-center text-[10px] font-bold text-indigo-700 no-print flex items-center justify-center gap-2 bg-indigo-50/60 py-1 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>--- สิ้นสุดความยาวกระดาษ A4 รายงานระดับผลการเรียน (เกรด) ---</span>
                  </div>
                </div>
                )
              ) : (
                assessmentSubjectChunks.map((chunk, chunkIdx) => {
                  const isMultiKinder = isAssessmentKindergarten && chunk.length > 1;
                  return (
                    <div 
                      key={chunkIdx}
                      className={`${
                        reportOrientation === 'landscape'
                          ? 'a4-landscape-paper min-h-[210mm]'
                          : 'a4-portrait-paper min-h-[297mm]'
                      } bg-white border border-slate-300 shadow-xl rounded-sm py-3 sm:py-3.5 mx-auto text-slate-900 relative transition-all`}
                      style={{
                        width: reportOrientation === 'landscape' ? '297mm' : '210mm',
                        maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm',
                        minWidth: reportOrientation === 'landscape' ? '297mm' : '210mm',
                        paddingTop: isAssessmentKindergarten ? '1cm' : undefined,
                        paddingLeft: isAssessmentKindergarten ? (reportOrientation === 'landscape' ? '15mm' : '13mm') : (reportOrientation === 'landscape' ? '15mm' : '20mm'),
                        paddingRight: isAssessmentKindergarten ? (reportOrientation === 'landscape' ? '10mm' : '8mm') : '10mm',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* A4 Sheet Header */}
                      <div className="mb-2.5 text-center">
                        <div className="flex justify-center mb-1.5">
                          {schoolInfo.logoUrl ? (
                            <img 
                              src={schoolInfo.logoUrl} 
                              alt="School Logo" 
                              className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto" 
                            />
                          ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-4xl mx-auto">
                              🏫
                            </div>
                          )}
                        </div>
                        {/* Line 1: แบบรายงานผลการเรียนและการประเมินผลการเรียน */}
                        <h1 className="text-base sm:text-lg font-bold text-black tracking-tight">
                          {isAssessmentKindergarten
                            ? 'แบบรายงานผลการประเมินพัฒนาการตามด้านความสามารถ'
                            : 'แบบรายงานผลการเรียนและคะแนนการวัดผล'}
                        </h1>

                        {/* Line 2: ชื่อโรงเรียน และสังกัดสำนักงาน */}
                        <div className="text-xs sm:text-sm font-semibold text-black mt-0.5">
                          โรงเรียน{schoolInfo.schoolName ? schoolInfo.schoolName.replace(/^โรงเรียน\s*/, '') : '...................................................'} {schoolInfo.affiliation ? `สังกัด${schoolInfo.affiliation}` : ''}
                        </div>

                        {/* Line 3: เดือน, ปีการศึกษา, ภาคเรียน, ชั้น */}
                        <div className="text-xs sm:text-sm font-bold text-black mt-0.5">
                          ปีการศึกษา {selectedYear}&nbsp;&nbsp;&nbsp;&nbsp;ภาคเรียนที่ {selectedSemester}&nbsp;&nbsp;&nbsp;&nbsp;{getGradeCleanName(assessmentPopupGrade)}{getRoomsForGrade(assessmentPopupGrade).length > 1 || normalizeRoom(selectedRoom) !== '1' ? ` ห้อง ${normalizeRoom(selectedRoom)}` : ''}
                        </div>
                      </div>

                      {/* Compact A4 Matrix Table */}
                      <div className={`border ${isAssessmentKindergarten ? 'border-black' : 'border-slate-800'} bg-white w-full max-w-full overflow-hidden`}>
                        {isAssessmentKindergarten ? (
                          <table className="w-full max-w-full table-fixed text-left text-[12px] border-collapse bg-white text-black">
                            <colgroup>
                              <col style={{ width: reportOrientation === 'landscape' ? '8mm' : '7mm' }} />
                              <col style={{ width: reportOrientation === 'landscape' ? '14mm' : '12mm' }} />
                              <col style={{ width: reportOrientation === 'landscape' ? (chunk.length >= 3 ? '34mm' : '38mm') : (chunk.length >= 3 ? '28mm' : chunk.length === 2 ? '32mm' : '36mm') }} />
                              {chunk.map((subj) => {
                                const compGroups = getKindergartenSubjectCompetencyGroups(subj);
                                const totalEls = compGroups.reduce((acc, g) => acc + g.elements.length, 0);
                                return (
                                  <React.Fragment key={`col-grp-${subj.id}`}>
                                    {Array.from({ length: totalEls }).map((_, elIdx) => (
                                      <col key={`col-el-${subj.id}-${elIdx}`} />
                                    ))}
                                    <col style={{ width: reportOrientation === 'landscape' ? (chunk.length >= 3 ? '7.5mm' : '8.5mm') : (chunk.length >= 3 ? '6mm' : chunk.length === 2 ? '7mm' : '8mm') }} />
                                    <col style={{ width: reportOrientation === 'landscape' ? (chunk.length >= 3 ? '13mm' : '15mm') : (chunk.length >= 3 ? '11.5mm' : chunk.length === 2 ? '13mm' : '14.5mm') }} />
                                  </React.Fragment>
                                );
                              })}
                            </colgroup>
                            <thead>
                              {/* Row 1: Aspect Header (ด้านความสามารถ) */}
                              <tr className="text-black font-bold leading-tight bg-white">
                                <th rowSpan={3} className="py-1 px-0.5 bg-white border-r border-b border-black text-center font-mono text-[11.5px] align-middle text-black">
                                  ที่
                                </th>
                                <th rowSpan={3} className="py-1 px-0.5 bg-white border-r border-b border-black text-center font-mono text-[11.5px] align-middle text-black">
                                  รหัส
                                </th>
                                <th rowSpan={3} className="py-1 px-1 bg-white border-r border-b border-black text-center text-[12px] align-middle text-black">
                                  ชื่อ - นามสกุล
                                </th>

                                {chunk.map((subj, cIdx) => {
                                  const isLastSubj = cIdx === chunk.length - 1;
                                  const compGroups = getKindergartenSubjectCompetencyGroups(subj);
                                  const totalEls = compGroups.reduce((acc, g) => acc + g.elements.length, 0);
                                  const colCount = totalEls + 2; // elements + ระดับ + ผลประเมิน
                                  return (
                                    <th
                                      key={subj.id}
                                      colSpan={colCount}
                                      className={`py-1 px-0.5 ${isLastSubj ? '' : 'border-r'} border-b border-black text-center bg-white text-black font-bold align-middle`}
                                    >
                                      <div className={`font-bold ${isMultiKinder ? 'text-[11px]' : 'text-[12px]'} leading-tight whitespace-normal break-words mx-auto text-black`}>
                                        {isMultiKinder ? '' : 'ด้านความสามารถ: '}{subj.code ? `${subj.code} ` : ''}{subj.name}
                                      </div>
                                    </th>
                                  );
                                })}
                              </tr>

                              {/* Row 2: Competency Columns (column1 สมรรถนะ 1 ยาวเลยตามที่มีองค์ประกอบ, column2 สมรรถนะ 2...) */}
                              <tr className="text-black font-bold text-[10.5px] leading-tight bg-white">
                                {chunk.map((subj, cIdx) => {
                                  const isLastSubj = cIdx === chunk.length - 1;
                                  const compGroups = getKindergartenSubjectCompetencyGroups(subj);
                                  const hasComp = doesKindergartenSubjectHaveCompetency(subj);

                                  return (
                                    <React.Fragment key={`comp-row-${subj.id}`}>
                                      {compGroups.map((cg, gIdx) => {
                                        return (
                                          <th
                                            key={`cg-${subj.id}-${gIdx}`}
                                            colSpan={cg.elements.length}
                                            className="py-0.5 px-0.5 border-r border-b border-black text-center bg-white text-black font-bold align-middle"
                                            title={cg.competencyTitle}
                                          >
                                            <div className="leading-tight text-black whitespace-normal break-words mx-auto text-[10.5px]">
                                              {hasComp ? (cg.competencyTitle || `${cg.unitNumber}`) : 'องค์ประกอบ'}
                                            </div>
                                          </th>
                                        );
                                      })}

                                      <th rowSpan={2} className="py-1 px-0.5 border-r border-b border-black text-center bg-white text-black font-bold align-middle text-[10.5px]">
                                        <div className="vertical-text-header" data-vertical-label="ระดับ" data-vertical-color="#000000">
                                          ระดับ
                                        </div>
                                      </th>
                                      <th rowSpan={2} className={`py-1 px-0.5 ${isLastSubj ? '' : 'border-r'} border-b border-black text-center bg-white text-black font-bold align-middle text-[10.5px]`}>
                                        ผล
                                      </th>
                                    </React.Fragment>
                                  );
                                })}
                              </tr>

                              {/* Row 3: Numbered Elements ONLY (องค์ประกอบไม่ต้องมีตัวหนังสือ แค่บอกตัวเลขตามข้อพอ) */}
                              <tr className="text-black font-bold text-[10.5px] leading-tight bg-white">
                                {chunk.map((subj) => {
                                  const compGroups = getKindergartenSubjectCompetencyGroups(subj);
                                  return (
                                    <React.Fragment key={`el-num-row-${subj.id}`}>
                                      {compGroups.map((cg) =>
                                        cg.elements.map((el) => (
                                          <th
                                            key={el.id}
                                            className="py-0.5 px-0 border-r border-b border-black text-center font-mono text-[10.5px] bg-white text-black font-bold align-middle"
                                            title={`ข้อที่ ${el.elementNumberOverall}: ${el.name}`}
                                          >
                                            {el.elementNumberOverall}
                                          </th>
                                        ))
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tr>
                            </thead>

                            <tbody className="bg-white text-black">
                              {assessmentGradeStudents.map((s, sIdx) => (
                                <tr key={s.id} className="bg-white leading-snug">
                                  <td className="py-0.5 px-0.5 border-r border-b border-black text-center font-mono tabular-nums bg-white text-black text-[11.5px] align-middle">
                                    {s.rollNumber || sIdx + 1}
                                  </td>
                                  <td className="py-0.5 px-0.5 border-r border-b border-black text-center font-mono tabular-nums bg-white text-black text-[11.5px] align-middle">
                                    {s.studentCode || '-'}
                                  </td>
                                  <td className="py-0.5 px-1 border-r border-b border-black font-medium bg-white text-black truncate text-[11.5px] align-middle">
                                    {s.prefix}{s.firstName} {s.lastName}
                                  </td>

                                  {chunk.map((subj, cIdx) => {
                                    const isLastSubj = cIdx === chunk.length - 1;
                                    const kEval = getStudentKindergartenEval(s.id, subj);
                                    return (
                                      <React.Fragment key={subj.id}>
                                        {kEval.elements.map((elRes, eIdx) => (
                                          <td
                                            key={elRes.id || eIdx}
                                            className="py-0.5 px-0 border-r border-b border-black text-center font-mono text-[11.5px] tabular-nums bg-white text-black align-middle"
                                          >
                                            {elRes.displayScore}
                                          </td>
                                        ))}
                                        <td className="py-0.5 px-0 border-r border-b border-black text-center font-mono text-[11.5px] tabular-nums font-bold bg-white text-black align-middle">
                                          {kEval.overallDisplay}
                                        </td>
                                        <td className={`py-0.5 px-0.5 ${isLastSubj ? '' : 'border-r'} border-b border-black text-center text-[10px] font-bold bg-white text-black align-middle whitespace-nowrap overflow-hidden`}>
                                          {kEval.overallLabel}
                                        </td>
                                      </React.Fragment>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                        <table className="w-full text-left text-[13px] border-collapse bg-white">
                          <thead>
                            {/* Row 1: Fixed Headers and 5 Subject Group Headers */}
                            <tr className="text-black font-bold leading-normal bg-white">
                              <th rowSpan={2} className="py-1.5 px-1 bg-white border-r border-b border-slate-800 text-center w-7 shrink-0 font-mono text-[12px] align-middle text-black">
                                ที่
                              </th>
                              <th rowSpan={2} className="py-1.5 px-1 bg-white border-r border-b border-slate-800 text-center w-18 shrink-0 font-mono text-[12px] align-middle text-black">
                                รหัสประจำตัว
                              </th>
                              <th rowSpan={2} className="py-1.5 px-2 bg-white border-r border-b border-slate-800 text-center w-40 shrink-0 text-[13px] align-middle text-black">
                                ชื่อ - นามสกุล
                              </th>

                              {/* Up to 5-7 Subjects */}
                              {chunk.map((subj, cIdx) => {
                                const isLastSubj = cIdx === chunk.length - 1;
                                return (
                                  <th 
                                    key={subj.id} 
                                    colSpan={3} 
                                    className={`py-1.5 px-1 ${isLastSubj ? '' : 'border-r'} border-b border-slate-800 text-center bg-white text-black font-bold align-middle`}
                                  >
                                    <div className="font-bold text-[12.5px] leading-snug mx-auto text-black">
                                      {subj.code ? `${subj.code} ` : ''}{subj.name}
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>

                            {/* Row 2: Sub-columns for each subject (ระหว่างภาค, สอบ, รวม) */}
                            <tr className="text-black font-bold text-[11px] leading-normal bg-white">
                              {chunk.map((subj, cIdx) => {
                                const isLastSubj = cIdx === chunk.length - 1;
                                return (
                                  <React.Fragment key={subj.id}>
                                    <th className="py-1 px-0.5 border-r border-b border-slate-800 text-center w-11 bg-white text-black font-semibold align-middle">
                                      ระหว่างภาค
                                    </th>
                                    <th className="py-1 px-0.5 border-r border-b border-slate-800 text-center w-9 bg-white text-black font-semibold align-middle">
                                      สอบ
                                    </th>
                                    <th className={`py-1 px-0.5 ${isLastSubj ? '' : 'border-r'} border-b border-slate-800 text-center w-9 bg-white text-black font-bold align-middle`}>
                                      รวม
                                    </th>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          </thead>

                          <tbody className="bg-white text-black">
                            {assessmentGradeStudents.map((s, sIdx) => {
                              return (
                                <tr key={s.id} className="bg-white leading-normal">
                                  <td className="py-1.5 px-0.5 border-r border-b border-slate-800 text-center font-mono tabular-nums text-black text-[12px] align-middle">
                                    {s.rollNumber || sIdx + 1}
                                  </td>
                                  <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-mono tabular-nums text-black text-[12px] align-middle">
                                    {s.studentCode || '-'}
                                  </td>
                                  <td className="py-1.5 px-2 border-r border-b border-slate-800 font-medium text-black whitespace-nowrap text-[13px] align-middle">
                                    {s.prefix}{s.firstName} {s.lastName}
                                  </td>

                                  {/* Subject Score Columns */}
                                  {chunk.map((subj, cIdx) => {
                                    const isLastSubj = cIdx === chunk.length - 1;
                                    const scores = getStudentScores(s.id, subj);
                                    return (
                                      <React.Fragment key={subj.id}>
                                        <td className="py-1.5 px-0.5 border-r border-b border-slate-800 text-center font-mono text-[12px] tabular-nums text-black align-middle">
                                          {scores.coursework}
                                        </td>
                                        <td className="py-1.5 px-0.5 border-r border-b border-slate-800 text-center font-mono text-[12px] tabular-nums text-black align-middle">
                                          {scores.exam}
                                        </td>
                                        <td className={`py-1.5 px-0.5 ${isLastSubj ? '' : 'border-r'} border-b border-slate-800 text-center font-mono text-[12px] tabular-nums font-bold bg-white text-black align-middle`}>
                                          {scores.total}
                                        </td>
                                      </React.Fragment>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        )}
                      </div>

                      {/* Signatures */}
                      {renderEditableSignatures(isAssessmentKindergarten ? '1.2cm' : '2.1cm', isAssessmentKindergarten)}

                      {/* Visual A4 Page Boundary Line Indicator (On screen only) */}
                      <div className="a4-page-limit-line mt-4 pt-1.5 border-t-2 border-dashed border-indigo-400 text-center text-[10px] font-bold text-indigo-700 no-print flex items-center justify-center gap-2 bg-indigo-50/60 py-1 rounded">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>--- สิ้นสุดความยาวกระดาษ A4 หน้าที่ {chunkIdx + 1} ({reportOrientation === 'landscape' ? '210 mm แนวนอน' : '297 mm แนวตั้ง'}) ---</span>
                      </div>
                    </div>
                  );
                })
              )}

            </div>

            {/* Modal Footer (No-Print) */}
            <div className="px-4 py-3 bg-white border-t border-slate-200 rounded-b-2xl flex items-center justify-between gap-3 shrink-0 no-print">
              <span className="text-xs text-slate-500">
                พร้อมสำหรับการดาวน์โหลดเอกสาร PDF (ขนาด A4 {reportOrientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'}{isAssessmentKindergarten ? '' : reportOrientation === 'landscape' ? ' 7 วิชาต่อแผ่น' : ' 5 วิชาต่อแผ่น'})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssessmentPopupGrade(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="button"
                  disabled={isDownloadingPdf}
                  onClick={handleDownloadAssessmentPDF}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="ดาวน์โหลด PDF"
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังสร้าง PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 
        ========================================================================
        POP-UP MODAL: (3)รายงาน - 3 Assessment Booklets (A4 Portrait & PDF Download)
        1) การอ่าน คิดวิเคราะห์ และเขียน (4 แผ่น/ส่วน: การอ่าน, คิดวิเคราะห์, เขียน, สรุปปริมาณ-คุณภาพ)
        2) คุณลักษณะอันพึงประสงค์ (สรุป 8 ข้อหลักทั้งห้อง หรือ รายบุคคลครบทุกข้อย่อย)
        3) สมรรถนะสำคัญ 5 ด้าน
        ========================================================================
      */}
      {threeReportsPopupGrade && (
        <ThreeReportsModal
          isOpen={!!threeReportsPopupGrade}
          onClose={() => setThreeReportsPopupGrade(null)}
          grade={threeReportsPopupGrade}
          selectedRoom={selectedRoom}
          onSelectRoom={(rm) => handleSelectRoomForGrade(threeReportsPopupGrade, rm)}
          availableRooms={getRoomsForGrade(threeReportsPopupGrade)}
          selectedYear={selectedYear}
          selectedSemester={selectedSemester}
          students={effectiveStudents}
          personnel={effectivePersonnel}
          schoolInfo={schoolInfo}
          grades={effectiveGrades}
          subjects={effectiveSubjects}
          selectedAdvisorId={selectedAdvisorId}
          setSelectedAdvisorId={setSelectedAdvisorId}
          selectedAcademicHeadId={selectedAcademicHeadId}
          setSelectedAcademicHeadId={setSelectedAcademicHeadId}
          directorDisplayName={directorDisplayName}
          directorPosition={directorPosition}
          onShowToast={onShowToast}
        />
      )}

      {/* 
        ========================================================================
        POP-UP MODAL: Milk & Teeth Reports (True A4 Portrait & PDF Download)
        (ดึงจากหน้าธุรการตรงดาวน์โหลด ให้เหมือนหน้าธุรการตรงดาวน์โหลดเลย)
        1) แบบบันทึกสรุปการดื่มนมโรงเรียน
        2) แบบบันทึกสรุปการแปรงฟันหลังอาหาร
        ========================================================================
      */}
      {milkTeethModal && (() => {
        const targetGrade = milkTeethModal.grade;
        const reportType = milkTeethModal.type;

        const popupActiveMilkTeethMonthGroups = milkTeethSelectedMonthKey === 'all'
          ? milkTeethMonthGroups
          : milkTeethMonthGroups.filter(g => g.monthKey === milkTeethSelectedMonthKey);

        const targetRm = normalizeRoom(selectedRoom);
        const targetStudents = sortStudentsByRoll(
          effectiveStudents.filter(
            s => s.gradeLevel === targetGrade && normalizeRoom(s.room) === targetRm
          )
        );

        const advisor =
          selectedAdvisor ||
          personnel.find(p => p.advisorGrade === targetGrade && normalizeRoom(p.advisorRoom) === targetRm) ||
          personnel.find(p => p.advisorGrade === targetGrade);
        const advisorDisplayName = advisor ? `${advisor.prefix || ''}${advisor.firstName || ''} ${advisor.lastName || ''}`.trim() : '...........................................................';

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto a4-modal-overlay">
            {/* Dynamic Print CSS for Portrait / Landscape */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page {
                  size: A4 ${reportOrientation} !important;
                  margin: 4mm 5mm !important;
                }
                body {
                  background: white !important;
                  color: black !important;
                }
              }
            ` }} />

            <div className={`bg-slate-100 rounded-2xl w-full ${reportOrientation === 'landscape' ? 'max-w-[1240px]' : 'max-w-[980px]'} max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 animate-in fade-in zoom-in-95 duration-150 my-auto a4-modal-content`}>
              
              {/* Modal Control Header (Hidden on print) */}
              <div className="px-4 py-3 bg-white border-b border-slate-200 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    reportType === 'milk' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                  }`}>
                    {reportType === 'milk' ? '🥛' : '🪥'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>ตัวอย่างรายงาน A4 ({reportType === 'milk' ? 'การดื่มนมโรงเรียน' : 'การแปรงฟันหลังอาหาร'})</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                        reportType === 'milk' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-sky-100 text-sky-800 border-sky-200'
                      }`}>
                        {getGradeCleanName(targetGrade)} • A4 {reportOrientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      แสดงข้อมูล 1 เดือนต่อ 1 หน้ากระดาษ A4 {reportOrientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'} (ตามวันเรียน 100 วันที่กำหนด) | นักเรียน {targetStudents.length} คน
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Select Month */}
                  <select
                    value={milkTeethSelectedMonthKey}
                    onChange={(e) => setMilkTeethSelectedMonthKey(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 font-semibold bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="all">แสดงทุกเดือน ({milkTeethMonthGroups.length} เดือน)</option>
                    {milkTeethMonthGroups.map(m => (
                      <option key={m.monthKey} value={m.monthKey}>
                        {m.monthTitle} ({m.days.length} วัน)
                      </option>
                    ))}
                  </select>

                  {/* Orientation Selector: แนวตั้ง (Default) vs แนวนอน */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setReportOrientation('portrait')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        reportOrientation === 'portrait'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="ขนาดกระดาษ A4 แนวตั้ง (210 × 297 มม.)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>แนวตั้ง</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportOrientation('landscape')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        reportOrientation === 'landscape'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="ขนาดกระดาษ A4 แนวนอน (297 × 210 มม.)"
                    >
                      <FileText className="w-3.5 h-3.5 rotate-90" />
                      <span>แนวนอน</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMilkTeethModal(null)}
                    className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
                    title="ปิด"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dedicated Personnel & Room Selectors Bar (No-Print) */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Room Selector Dropdown (เมื่อกดปุ่มห้องจะเลื่อนลงมาให้เลือก) */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-700 whitespace-nowrap">เลือกห้อง:</span>
                    <select
                      value={normalizeRoom(selectedRoom)}
                      onChange={(e) => handleSelectRoomForGrade(targetGrade, e.target.value)}
                      className={`text-xs px-3 py-1 rounded-xl border font-bold bg-white cursor-pointer focus:outline-none focus:ring-2 shadow-2xs ${
                        reportType === 'milk'
                          ? 'border-amber-300 text-amber-900 focus:ring-amber-500/20'
                          : 'border-sky-300 text-sky-900 focus:ring-sky-500/20'
                      }`}
                    >
                      {getRoomsForGrade(targetGrade).map(rm => (
                        <option key={rm} value={rm}>
                          ห้อง {rm}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-700 whitespace-nowrap">ครูผู้ประจำชั้น:</span>
                    <select
                      value={selectedAdvisorId}
                      onChange={(e) => setSelectedAdvisorId(e.target.value)}
                      className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20 max-w-[210px] truncate"
                    >
                      {currentGradeAdvisors.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.prefix}{p.firstName} {p.lastName} {p.advisorGrade ? `(ประจำชั้น ${p.advisorGrade}${p.advisorRoom ? ` ห้อง ${p.advisorRoom}` : ''})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-700 whitespace-nowrap">ฝ่ายวิชาการ:</span>
                    <select
                      value={selectedAcademicHeadId}
                      onChange={(e) => setSelectedAcademicHeadId(e.target.value)}
                      className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20 max-w-[210px] truncate"
                    >
                      {academicPersonnelList.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.prefix}{p.firstName} {p.lastName} {p.position ? `(${p.position})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div ref={milkTeethContainerRef} className="p-4 sm:p-6 overflow-y-auto space-y-8 bg-slate-200/70 flex-1">
                {popupActiveMilkTeethMonthGroups.map((group, groupIdx) => {
                  const monthDays = group.days;

                  return (
                    <div 
                      key={group.monthKey}
                      id={`milk-teeth-pdf-sheet-${group.monthKey}`} 
                      className={`bg-white border border-slate-300 shadow-xl rounded-sm py-5 sm:py-6 mx-auto text-black relative transition-all ${
                        reportOrientation === 'landscape'
                          ? 'a4-landscape-paper min-h-[210mm]'
                          : 'a4-portrait-paper min-h-[297mm]'
                      }`}
                      style={{ 
                        width: reportOrientation === 'landscape' ? '297mm' : '210mm',
                        maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm',
                        paddingLeft: ['อ.1', 'อ.2', 'อ.3'].includes(targetGrade) ? '13mm' : '20mm',
                        paddingRight: '10mm'
                      }}
                    >
                      {/* Header */}
                      <div className="mb-3 text-center">
                        <div className="flex justify-center mb-2">
                          {schoolInfo?.logoUrl ? (
                            <img 
                              src={schoolInfo.logoUrl} 
                              alt="School Logo" 
                              className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto" 
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl mx-auto">
                              🏫
                            </div>
                          )}
                        </div>
                        {/* Line 2: Report Title */}
                        <h1 className="text-base font-bold text-black tracking-tight">
                          {reportType === 'milk' ? 'แบบบันทึกสรุปการดื่มนมโรงเรียน' : 'แบบบันทึกสรุปการแปรงฟันหลังอาหาร'}
                        </h1>

                        {/* Line 3: School Name & Affiliation */}
                        <div className="text-xs font-semibold text-black mt-0.5">
                          โรงเรียน{schoolInfo?.schoolName ? schoolInfo.schoolName.replace(/^โรงเรียน\s*/, '') : '...................................................'} {schoolInfo?.affiliation ? `สังกัด${schoolInfo.affiliation}` : ''}
                        </div>

                        {/* Line 4: Month, Semester, Year, Grade */}
                        <div className="text-xs font-bold text-black mt-0.5">
                          {group.monthTitle}&nbsp;&nbsp;&nbsp;&nbsp;ภาคเรียนที่ {selectedSemester}&nbsp;&nbsp;&nbsp;&nbsp;ปีการศึกษา {selectedYear}&nbsp;&nbsp;&nbsp;&nbsp;{getGradeCleanName(targetGrade)}{getRoomsForGrade(targetGrade).length > 1 || normalizeRoom(selectedRoom) !== '1' ? ` ห้อง ${normalizeRoom(selectedRoom)}` : ''}
                        </div>
                      </div>

                      {/* Matrix Table */}
                      <div className="border border-slate-800 bg-white mt-3">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-white text-black font-bold border-b border-slate-800">
                              <th className="py-1 px-0.5 text-center border-r border-b border-slate-800 w-6 shrink-0 bg-white text-black font-mono text-[10px] align-middle">เลขที่</th>
                              <th className="py-1 px-1.5 text-center border-r border-b border-slate-800 w-28 bg-white text-black text-[11px] align-middle">ชื่อ - นามสกุล</th>
                              {monthDays.map((dayItem) => {
                                const dateNum = dayItem.date.split('-')[2] || '';
                                return (
                                  <th key={dayItem.date} className="py-1 px-0 text-center border-r border-b border-slate-800 font-mono text-[10px] bg-white text-black align-middle" title={dayItem.label}>
                                    {dateNum}
                                  </th>
                                );
                              })}
                              <th className="py-1 px-0.5 text-center w-8 shrink-0 font-bold border-b border-slate-800 bg-white text-black font-mono text-[10px] align-middle">สรุป</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white text-black">
                            {targetStudents.length === 0 ? (
                              <tr>
                                <td colSpan={monthDays.length + 3} className="py-8 text-center text-black font-medium">
                                  ไม่พบรายชื่อนักเรียนในชั้น {targetGrade}
                                </td>
                              </tr>
                            ) : (
                              targetStudents.map((st, idx) => {
                                let checkedCount = 0;
                                const isLastRow = idx === targetStudents.length - 1;

                                return (
                                  <tr key={st.id} className="bg-white text-black hover:bg-slate-50 leading-normal">
                                    <td className={`py-1 px-0.5 text-center border-r ${isLastRow ? '' : 'border-b'} border-slate-800 font-mono font-semibold text-black text-[10px] align-middle`}>
                                      {st.rollNumber ?? (idx + 1)}
                                    </td>
                                    <td className={`py-1 px-2 text-left border-r ${isLastRow ? '' : 'border-b'} border-slate-800 font-medium whitespace-nowrap text-black text-[11px] align-middle`}>
                                      {st.prefix}{st.firstName} {st.lastName}
                                    </td>
                                    {monthDays.map((dayItem) => {
                                      const rec = effectiveDailyTracking.find(d => d.date === dayItem.date && d.studentId === st.id);
                                      const milkStatus = rec?.milkStatus;
                                      const toothStatus = rec?.toothBrushStatus;

                                      let symbol = '-';
                                      let symbolClass = 'text-slate-400 font-semibold text-xs';

                                      if (reportType === 'milk') {
                                        if (milkStatus === 'แพ้นม') {
                                          symbol = 'พ';
                                          symbolClass = 'text-amber-600 font-black text-xs';
                                          checkedCount++;
                                        } else if (milkStatus === 'ดื่มครบ') {
                                          symbol = '✓';
                                          symbolClass = 'text-emerald-700 font-extrabold text-xs';
                                          checkedCount++;
                                        } else if (milkStatus === 'ไม่ได้ดื่ม') {
                                          symbol = '✕';
                                          symbolClass = 'text-rose-600 font-bold text-xs';
                                        } else {
                                          symbol = '-';
                                          symbolClass = 'text-slate-400 font-semibold text-xs';
                                        }
                                      } else {
                                        if (toothStatus === 'แปรงฟันแล้ว') {
                                          symbol = '✓';
                                          symbolClass = 'text-emerald-700 font-extrabold text-xs';
                                          checkedCount++;
                                        } else if (toothStatus === 'ยังไม่ได้แปรง') {
                                          symbol = '✕';
                                          symbolClass = 'text-rose-600 font-bold text-xs';
                                        } else {
                                          symbol = '-';
                                          symbolClass = 'text-slate-400 font-semibold text-xs';
                                        }
                                      }

                                      return (
                                        <td key={dayItem.date} className={`py-1 px-0 text-center border-r ${isLastRow ? '' : 'border-b'} border-slate-800 font-bold align-middle`}>
                                          <span className={symbolClass}>{symbol}</span>
                                        </td>
                                      );
                                    })}
                                    <td className={`py-1 px-0.5 text-center font-bold text-black font-mono ${isLastRow ? '' : 'border-b'} border-slate-800 text-[10.5px] align-middle`}>
                                      {checkedCount}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Official Signatures Section (Matching Attendance standard) */}
                      {renderEditableSignatures('2.1cm')}

                      {/* Visual Page Break line indicator for screen */}
                      <div className="a4-page-limit-line mt-6 pt-2 border-t-2 border-dashed border-sky-400 text-center text-[10px] font-bold text-sky-700 no-print flex items-center justify-center gap-2 bg-sky-50/60 py-1 rounded">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                        <span>--- สิ้นสุดความยาวกระดาษ A4 หน้าที่ {groupIdx + 1} ({group.monthTitle}) ({reportOrientation === 'landscape' ? '210 mm แนวนอน' : '297 mm แนวตั้ง'}) ---</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer (No-Print) */}
              <div className="px-4 py-3 bg-white border-t border-slate-200 rounded-b-2xl flex items-center justify-between gap-3 shrink-0 no-print">
                <span className="text-xs text-slate-500">
                  พร้อมสำหรับการดาวน์โหลดเอกสาร PDF (ขนาด A4 {reportOrientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'} 1 เดือนต่อ 1 แผ่น)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMilkTeethModal(null)}
                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                  <button
                    type="button"
                    disabled={isDownloadingPdf}
                    onClick={handleDownloadMilkTeethPDF}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    title="ดาวน์โหลด PDF"
                  >
                    {isDownloadingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังสร้าง PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลด</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal: View Full Student Details (เมื่อกดไอคอนตา) */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  {viewingStudent.gradeLevel}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {viewingStudent.prefix}{viewingStudent.firstName} {viewingStudent.lastName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    รหัสประจำตัว: {viewingStudent.studentCode || '-'} | เลขที่: {viewingStudent.rollNumber || '-'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: All Details */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Photo & Basic Bio */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 border-b border-slate-100">
                {viewingStudent.photoUrl ? (
                  <img
                    src={viewingStudent.photoUrl}
                    alt="รูปนักเรียน"
                    className="w-24 h-28 object-cover rounded-xl border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-24 h-28 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <Users className="w-8 h-8" />
                    <span className="text-[10px] mt-1">ไม่มีรูปถ่าย</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 flex-1 w-full">
                  <div>
                    <span className="text-slate-400 block">ชื่อเล่น:</span>
                    <span className="font-semibold text-slate-700">{viewingStudent.nickname || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">เพศ:</span>
                    <span className="font-semibold text-slate-700">{viewingStudent.gender || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">วันเกิด:</span>
                    <span className="font-semibold text-slate-700">{viewingStudent.birthDate || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">อายุ:</span>
                    <span className="font-semibold text-slate-700">
                      {viewingStudent.age !== undefined && viewingStudent.age !== null ? `${viewingStudent.age} ปี` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">โรคประจำตัว:</span>
                    <span className="font-semibold text-slate-700">{viewingStudent.chronicDisease || 'ไม่มี'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">เงินมา รร/วัน:</span>
                    <span className="font-semibold text-emerald-600">
                      {viewingStudent.dailyAllowance !== undefined && viewingStudent.dailyAllowance !== null ? `${viewingStudent.dailyAllowance} บาท` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Family & Guardian Information */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 text-xs flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>ข้อมูลครอบครัวและผู้ปกครอง</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">ชื่อบิดา:</span>
                    <span className="font-semibold text-slate-700">{viewingStudent.fatherName || '-'}</span>
                    {viewingStudent.fatherOccupation && (
                      <span className="text-slate-500 text-[11px] block">อาชีพ: {viewingStudent.fatherOccupation}</span>
                    )}
                    {viewingStudent.fatherPhone && (
                      <span className="text-slate-500 text-[11px] block">โทร: {viewingStudent.fatherPhone}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block">ชื่อมารดา:</span>
                    <span className="font-semibold text-slate-700">{viewingStudent.motherName || '-'}</span>
                    {viewingStudent.motherOccupation && (
                      <span className="text-slate-500 text-[11px] block">อาชีพ: {viewingStudent.motherOccupation}</span>
                    )}
                    {viewingStudent.motherPhone && (
                      <span className="text-slate-500 text-[11px] block">โทร: {viewingStudent.motherPhone}</span>
                    )}
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block">ผู้ปกครองหลัก (ความสัมพันธ์: {viewingStudent.guardianRelation || 'บิดา/มารดา'}):</span>
                    <span className="font-semibold text-slate-800">
                      {viewingStudent.guardianName || viewingStudent.fatherName || viewingStudent.motherName || '-'}
                    </span>
                    {viewingStudent.guardianPhone && (
                      <span className="text-slate-600 text-[11px] block font-mono">
                        เบอร์ติดต่อ: {viewingStudent.guardianPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Address & Living condition */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 text-xs flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>ที่อยู่และการเดินทาง</span>
                </h4>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div>
                    <span className="text-slate-400 block">ที่อยู่ตามทะเบียน/ปัจจุบัน:</span>
                    <span className="font-medium text-slate-700">{viewingStudent.address || viewingStudent.guardianAddress || '-'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 block">การเดินทางมา รร:</span>
                      <span className="font-medium text-slate-700">{viewingStudent.travelMethod || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">สถานะที่อยู่อาศัย:</span>
                      <span className="font-medium text-slate-700">{viewingStudent.housingStatus || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        POP-UP MODAL: PhorPhor 6 (ปพ.6) Report Booklet
        ========================================================================
      */}
      {selectedPhorPhor6Student && (
        <PhorPhor6Modal
          student={effectiveStudents.find(s => s.id === selectedPhorPhor6Student.id) || selectedPhorPhor6Student}
          grade={selectedGrade || selectedPhorPhor6Student.gradeLevel}
          academicYear={selectedYear}
          semester={selectedSemester}
          schoolInfo={StorageService.getSchoolInfo() || schoolInfo}
          personnel={effectivePersonnel}
          subjects={effectiveSubjects}
          grades={effectiveGrades}
          attendance={effectiveAttendance}
          dailyTracking={effectiveDailyTracking}
          savings={savings}
          onClose={() => setSelectedPhorPhor6Student(null)}
          onShowToast={onShowToast}
          onOpenLightbox={onOpenLightbox}
        />
      )}

    </div>
  );
};
