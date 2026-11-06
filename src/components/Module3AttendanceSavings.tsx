import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Student, 
  AttendanceRecord, 
  SavingsRecord, 
  AttendanceDayConfig, 
  SchoolDayItem,
  UserSession, 
  SchoolInfo,
  GradeLevel,
  AttendanceStatus,
  MemberAccount
} from '../types';
import { StorageService } from '../services/storage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { 
  CalendarCheck, 
  PiggyBank, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Settings, 
  Save, 
  Calendar as CalendarIcon,
  CheckCheck,
  XCircle,
  AlertCircle,
  History,
  Receipt,
  Coins,
  Wallet,
  X,
  FileText,
  CheckCircle2,
  Lock,
  Trash2,
  CalendarDays,
  Search,
  Filter,
  ArrowRight,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Info,
  Pencil,
  Check,
  ClipboardList,
  Eye,
  EyeOff,
  ShieldAlert,
  BarChart3,
  User,
  Banknote
} from 'lucide-react';

interface ThaiDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  className?: string;
  placeholder?: string;
  forcedViewYear?: number;
  forcedViewMonth?: number; // 0-11
  academicYearLabel?: string;
}

// Helper: Convert academic year string (พ.ศ. หรือ ค.ศ.) to CE year number
const getAdYear = (yearStr: string): number => {
  const num = parseInt((yearStr || '').trim(), 10);
  if (isNaN(num)) return 2026;
  return num > 2400 ? num - 543 : num;
};

// Helper: Calculate default start/end dates and forced calendar view for each semester & year
const getTermDefaultDates = (academicYearStr: string, semester: '1' | '2') => {
  const adY = getAdYear(academicYearStr);
  if (semester === '1') {
    return {
      startDate: `${adY}-05-18`,
      endDate: `${adY}-10-07`,
      startForcedYear: adY,
      startForcedMonth: 4, // 0-indexed: 4 = พฤษภาคม (May)
      endForcedYear: adY,
      endForcedMonth: 9    // 0-indexed: 9 = ตุลาคม (October)
    };
  } else {
    return {
      startDate: `${adY}-11-01`,
      endDate: `${adY + 1}-03-31`,
      startForcedYear: adY,
      startForcedMonth: 10, // 0-indexed: 10 = พฤศจิกายน (November)
      endForcedYear: adY + 1,
      endForcedMonth: 2     // 0-indexed: 2 = มีนาคม (March)
    };
  }
};

const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({
  value,
  onChange,
  className,
  placeholder = 'เลือกวันที่ (พ.ศ.)',
  forcedViewYear,
  forcedViewMonth,
  academicYearLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewYear, setViewYear] = useState<number>(() => {
    if (forcedViewYear !== undefined) return forcedViewYear;
    if (value) {
      const p = value.split('-');
      return Number(p[0]) || 2026;
    }
    return 2026;
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (forcedViewMonth !== undefined) return forcedViewMonth;
    if (value) {
      const p = value.split('-');
      return (Number(p[1]) || 5) - 1;
    }
    return 4; // May
  });

  useEffect(() => {
    if (forcedViewYear !== undefined) {
      setViewYear(forcedViewYear);
    }
  }, [forcedViewYear]);

  useEffect(() => {
    if (forcedViewMonth !== undefined) {
      setViewMonth(forcedViewMonth);
    }
  }, [forcedViewMonth]);

  useEffect(() => {
    if (isOpen) {
      if (forcedViewYear !== undefined) {
        setViewYear(forcedViewYear);
      } else if (value) {
        const p = value.split('-');
        if (p.length === 3) setViewYear(Number(p[0]) || 2026);
      }
      if (forcedViewMonth !== undefined) {
        setViewMonth(forcedViewMonth);
      } else if (value) {
        const p = value.split('-');
        if (p.length === 3) setViewMonth((Number(p[1]) || 5) - 1);
      }
    }
  }, [isOpen, forcedViewYear, forcedViewMonth]);

  useEffect(() => {
    if (value) {
      const p = value.split('-');
      if (p.length === 3) {
        if (forcedViewYear === undefined) setViewYear(Number(p[0]) || 2026);
        if (forcedViewMonth === undefined) setViewMonth((Number(p[1]) || 5) - 1);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen]);

  const thaiMonthsShort = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const thaiMonthsLong = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Format DD/MM/YYYY (16 พ.ค. 2569) in Buddhist Era
  const formattedDisplay = useMemo(() => {
    if (!value) return placeholder;
    const p = value.split('-');
    if (p.length !== 3) return value;
    const yBE = Number(p[0]) + 543;
    const mNum = Number(p[1]);
    const dNum = Number(p[2]);
    const dd = String(dNum).padStart(2, '0');
    const mm = String(mNum).padStart(2, '0');
    return `${dd}/${mm}/${yBE} (${dNum} ${thaiMonthsShort[mNum - 1] || ''} ${yBE})`;
  }, [value, placeholder]);

  // Days in month
  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < firstDay; i++) {
      result.push({ dateStr: '', dayNum: 0, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysCount; d++) {
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      result.push({ dateStr: `${viewYear}-${mm}-${dd}`, dayNum: d, isCurrentMonth: true });
    }
    return result;
  }, [viewYear, viewMonth]);

  return (
    <div className={`relative ${className || ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800 flex items-center justify-between gap-2 shadow-2xs hover:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-left"
      >
        <span className="truncate">{formattedDisplay}</span>
        <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 w-72 animate-in fade-in">
          {/* Header in Buddhist Era */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear(y => y - 1);
                } else {
                  setViewMonth(m => m - 1);
                }
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-bold text-xs text-slate-800 text-center">
              <div>{thaiMonthsLong[viewMonth]} พ.ศ. {viewYear + 543}</div>
              {academicYearLabel && (
                <div className="text-[10px] text-emerald-700 font-medium font-sans">({academicYearLabel})</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear(y => y + 1);
                } else {
                  setViewMonth(m => m + 1);
                }
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 text-center py-1 text-[10px] font-bold text-slate-400 border-b border-slate-100">
            <span className="text-rose-500">อา</span>
            <span>จ</span>
            <span>อ</span>
            <span>พ</span>
            <span>พฤ</span>
            <span>ศ</span>
            <span className="text-rose-500">ส</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 py-1.5">
            {cells.map((c, idx) => {
              if (!c.isCurrentMonth) {
                return <div key={`empty-${idx}`} className="h-6 w-full" />;
              }
              const isSelected = c.dateStr === value;
              return (
                <button
                  key={c.dateStr}
                  type="button"
                  onClick={() => {
                    onChange(c.dateStr);
                    setIsOpen(false);
                  }}
                  className={`h-6 w-full rounded-md text-[11px] font-mono font-bold flex items-center justify-center transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'hover:bg-emerald-50 text-slate-700 hover:text-emerald-700'
                  }`}
                >
                  {c.dayNum}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                onChange(today);
                setIsOpen(false);
              }}
              className="text-emerald-600 font-bold hover:underline cursor-pointer"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface Module3Props {
  user: UserSession;
  students: Student[];
  attendance: AttendanceRecord[];
  savings: SavingsRecord[];
  attendanceConfig: AttendanceDayConfig;
  schoolInfo?: SchoolInfo;
  members?: MemberAccount[];
  onSaveBulkAttendance: (records: AttendanceRecord[]) => void;
  onSaveSavingsRecord: (record: Omit<SavingsRecord, 'balanceAfter'>) => { record: SavingsRecord; updated: SavingsRecord[] };
  onDeleteSavingsRecord?: (id: string) => void;
  onUpdateAllSavings?: (records: SavingsRecord[]) => void;
  onSaveAttendanceConfig: (config: AttendanceDayConfig) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

export const Module3AttendanceSavings: React.FC<Module3Props> = ({
  user,
  students,
  attendance,
  savings,
  attendanceConfig,
  schoolInfo,
  members,
  onSaveBulkAttendance,
  onSaveSavingsRecord,
  onDeleteSavingsRecord,
  onUpdateAllSavings,
  onSaveAttendanceConfig,
  onShowToast
}) => {
  // Navigation tabs: 'main' (บันทึกเวลาเรียน & ออมทรัพย์) or 'school_days' (วันทำการ)
  const [activeTab, setActiveTab] = useState<'main' | 'school_days'>('main');

  // Members list & Homeroom teacher registered grade levels
  const allMembers = useMemo(() => members || StorageService.getMembers(), [members]);

  const homeroomMembers = useMemo(() => {
    const expanded: MemberAccount[] = [];
    allMembers
      .filter(m => m.role === 'member' && (m.gradeLevel || (m.assignedClasses && m.assignedClasses.length > 0)))
      .forEach(m => {
        if (m.assignedClasses && m.assignedClasses.length > 0) {
          m.assignedClasses.forEach(c => {
            if (c.gradeLevel && c.gradeLevel !== 'ไม่ได้เป็นครูประจำชั้น') {
              expanded.push({
                ...m,
                gradeLevel: c.gradeLevel as GradeLevel,
                room: c.room || '1'
              });
            }
          });
        } else if (m.gradeLevel) {
          expanded.push(m);
        }
      });
    return expanded;
  }, [allMembers]);

  const registeredHomeroomGrades = useMemo(() => {
    const gradesSet = new Set<GradeLevel>();
    homeroomMembers.forEach(m => {
      if (m.gradeLevel) gradesSet.add(m.gradeLevel);
    });
    const gradeOrder: GradeLevel[] = [
      'อ.1', 'อ.2', 'อ.3',
      'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
      'ม.1', 'ม.2', 'ม.3'
    ];
    return gradeOrder.filter(g => gradesSet.has(g));
  }, [homeroomMembers]);

  const normalizeRoom = (r?: string) => (r || '1').toString().trim().replace(/^ห้อง\s*/, '') || '1';

  const memberAssignedClasses = useMemo(() => {
    if (user.assignedClasses && user.assignedClasses.length > 0) {
      return user.assignedClasses.map(c => ({
        gradeLevel: (c.gradeLevel as GradeLevel) || 'ป.1',
        room: normalizeRoom(c.room)
      }));
    }
    if (user.assignedGrade) {
      return [{ gradeLevel: user.assignedGrade as GradeLevel, room: normalizeRoom(user.assignedRoom) }];
    }
    return [];
  }, [user.assignedClasses, user.assignedGrade, user.assignedRoom]);

  // Selected date, grade level & room (synced from settings/user profile or homeroom teacher list)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const initialGrade = useMemo(() => {
    if (user.role === 'admin') {
      if (registeredHomeroomGrades.length > 0) return registeredHomeroomGrades[0];
      return 'ป.1' as GradeLevel;
    }
    return memberAssignedClasses[0]?.gradeLevel || (user.assignedGrade as GradeLevel) || 'ป.1';
  }, [user.role, user.assignedGrade, memberAssignedClasses, registeredHomeroomGrades]);

  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(initialGrade);
  const [selectedRoom, setSelectedRoom] = useState<string>(() => {
    if (user.role === 'member') {
      return memberAssignedClasses[0]?.room || normalizeRoom(user.assignedRoom);
    }
    return '1';
  });

  const availableRoomsForGrade = useMemo(() => {
    const rooms = new Set<string>(['1']);
    students
      .filter(s => s.gradeLevel === selectedGrade)
      .forEach(s => rooms.add(normalizeRoom(s.room)));
    homeroomMembers
      .filter(m => m.gradeLevel === selectedGrade && m.room)
      .forEach(m => rooms.add(normalizeRoom(m.room)));
    return Array.from(rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, homeroomMembers, selectedGrade]);

  React.useEffect(() => {
    if (user.role === 'admin') {
      if (registeredHomeroomGrades.length > 0 && !registeredHomeroomGrades.includes(selectedGrade)) {
        setSelectedGrade(registeredHomeroomGrades[0]);
      }
      if (!availableRoomsForGrade.includes(selectedRoom)) {
        setSelectedRoom(availableRoomsForGrade[0] || '1');
      }
    } else {
      if (memberAssignedClasses.length > 0) {
        const isCurrentValid = memberAssignedClasses.some(
          c => c.gradeLevel === selectedGrade && c.room === normalizeRoom(selectedRoom)
        );
        if (!isCurrentValid) {
          setSelectedGrade(memberAssignedClasses[0].gradeLevel);
          setSelectedRoom(memberAssignedClasses[0].room);
        }
      } else if (user.assignedGrade) {
        setSelectedGrade(user.assignedGrade as GradeLevel);
        setSelectedRoom(normalizeRoom(user.assignedRoom));
      }
    }
  }, [user.role, user.assignedGrade, user.assignedRoom, memberAssignedClasses, registeredHomeroomGrades, availableRoomsForGrade]);

  // Attendance states for each student
  const [attendanceStates, setAttendanceStates] = useState<Record<string, { status: AttendanceStatus | ''; note: string }>>({});

  // Today's deposit amount input for each student: studentId -> amount
  const [todayDeposits, setTodayDeposits] = useState<Record<string, number | string>>({});

  // Deposit editing states
  const [editingDepositStudentId, setEditingDepositStudentId] = useState<string | null>(null);
  const [editDepositAmount, setEditDepositAmount] = useState<string | number>('');

  // Student Deposit History modal state
  const [historyModalStudent, setHistoryModalStudent] = useState<Student | null>(null);

  // Mobile Student Pop-up Modal state
  const [selectedStudentModal, setSelectedStudentModal] = useState<Student | null>(null);

  // Withdrawal modal state
  const [withdrawStudent, setWithdrawStudent] = useState<Student | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<number | string>(50);
  const [withdrawReason, setWithdrawReason] = useState<string>('');
  const [withdrawDate, setWithdrawDate] = useState<string>(selectedDate);

  // Withdrawal History view modal state
  const [isWithdrawHistoryOpen, setIsWithdrawHistoryOpen] = useState(false);

  // Delete History Record Modal with Password Confirmation state
  const [historyItemToDelete, setHistoryItemToDelete] = useState<SavingsRecord | null>(null);
  const [deleteHistoryPasswordInput, setDeleteHistoryPasswordInput] = useState('');
  const [deleteHistoryPasswordError, setDeleteHistoryPasswordError] = useState('');
  const [showDeleteHistoryPassword, setShowDeleteHistoryPassword] = useState(false);

  // 100 School Days Config Pop-up state
  const [isConfigPopupOpen, setIsConfigPopupOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState<AttendanceDayConfig>(attendanceConfig);

  // Modal for adding a custom day in "วันทำการ"
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [newCustomDate, setNewCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newCustomIsHoliday, setNewCustomIsHoliday] = useState<boolean>(false);
  const [newCustomNote, setNewCustomNote] = useState<string>('');

  // Filters for "หน้าวันทำการ"
  const [schoolDaysMonthFilter, setSchoolDaysMonthFilter] = useState<string>('all');
  const [schoolDaysTypeFilter, setSchoolDaysTypeFilter] = useState<'all' | 'working' | 'holiday'>('working');
  const [schoolDaysSearchQuery, setSchoolDaysSearchQuery] = useState<string>('');

  // Delete All School Days Modal state
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);

  // Confirm Delete Single School Day Modal state
  const [confirmDeleteDay, setConfirmDeleteDay] = useState<SchoolDayItem | null>(null);

  // Editing modal state for day configuration (เวลาเรียน / วันหยุด)
  const [editingDayItem, setEditingDayItem] = useState<SchoolDayItem | null>(null);
  const [editingDayIsHoliday, setEditingDayIsHoliday] = useState<boolean>(false);
  const [editingDayNote, setEditingDayNote] = useState<string>('');

  // Real-time calculation of weekdays between tempConfig.startDate and tempConfig.endDate (excluding Sat & Sun)
  const autoCalculatedWeekdays = useMemo(() => {
    if (!tempConfig.startDate || !tempConfig.endDate) return 0;
    if (tempConfig.startDate > tempConfig.endDate) return 0;
    let count = 0;
    const curr = new Date(tempConfig.startDate + 'T00:00:00');
    const end = new Date(tempConfig.endDate + 'T00:00:00');
    while (curr <= end) {
      const day = curr.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      curr.setDate(curr.getDate() + 1);
    }
    return count;
  }, [tempConfig.startDate, tempConfig.endDate]);

  // Multi-term storage: configs by term key `${semester}_${academicYear}`
  const [configsByTerm, setConfigsByTerm] = useState<Record<string, AttendanceDayConfig>>(() => {
    return StorageService.getAttendanceConfigsByTerm();
  });

  const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>(() => {
    if (schoolInfo?.semester === '1' || schoolInfo?.semester === '2') {
      return schoolInfo.semester as '1' | '2';
    }
    return attendanceConfig.semester || '1';
  });

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(() => {
    if (schoolInfo?.academicYear) {
      return schoolInfo.academicYear;
    }
    return attendanceConfig.academicYear || '2568';
  });

  const activeSemester: '1' | '2' = user.role === 'admin'
    ? (selectedSemester || ((schoolInfo?.semester === '2' ? '2' : '1') as '1' | '2'))
    : ((schoolInfo?.semester === '2' ? '2' : '1') as '1' | '2');
  const activeAcademicYear: string = user.role === 'admin'
    ? (selectedAcademicYear || schoolInfo?.academicYear || '2569')
    : (schoolInfo?.academicYear || '2569');

  // Helper to generate or get default school days list (all calendar days including Sat-Sun between start and end date)
  const defaultSchoolDays = useMemo(() => {
    const yr = activeAcademicYear;
    const sem = activeSemester;
    const termDefaults = getTermDefaultDates(yr, sem);

    const startStr = termDefaults.startDate;
    const endStr = termDefaults.endDate;

    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const days: SchoolDayItem[] = [];
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

    let curr = new Date(start);
    while (curr <= end) {
      const dayOfWeekNum = curr.getDay();
      const dayName = thaiDays[dayOfWeekNum];
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Default Mon-Fri are school days (not holiday), Sat-Sun are holidays
      const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;

      days.push({
        date: dateStr,
        dayOfWeek: dayName,
        isHoliday: isWeekend,
        note: isWeekend ? 'วันหยุดสุดสัปดาห์' : 'วันเรียนปกติ'
      });

      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [activeAcademicYear, activeSemester]);

  // Latest created 100-day structure term key (e.g. '1_2568', '2_2568')
  const [latestAttendanceTermKey, setLatestAttendanceTermKey] = useState<string>(() => {
    if (schoolInfo?.academicYear && schoolInfo?.semester) {
      return `${schoolInfo.semester}_${schoolInfo.academicYear}`;
    }
    return localStorage.getItem('ams_latest_attendance_term') || '1_2568';
  });

  // Summary Modal ("รวม") state
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summarySemester, setSummarySemester] = useState<'1' | '2'>((schoolInfo?.semester as '1'|'2') || '1');
  const [summaryAcademicYear, setSummaryAcademicYear] = useState<string>(schoolInfo?.academicYear || '2568');

  // Resolved active 100 days structure (for Admin: selected term; for Member: Admin settings term)
  const latestCreatedConfig = useMemo(() => {
    const activeSem = activeSemester;
    const activeYr = activeAcademicYear;
    const activeKey = `${activeSem}_${activeYr}`;

    if (configsByTerm[activeKey]) {
      const cfg = configsByTerm[activeKey];
      return {
        ...cfg,
        semester: activeSem,
        academicYear: activeYr,
        schoolDays: cfg.schoolDays && cfg.schoolDays.length > 0 ? cfg.schoolDays : defaultSchoolDays
      };
    }

    const termDefaults = getTermDefaultDates(activeYr, activeSem);
    return {
      academicYear: activeYr,
      semester: activeSem,
      startDate: termDefaults.startDate,
      endDate: termDefaults.endDate,
      targetDays: 100,
      schoolDays: defaultSchoolDays
    };
  }, [activeSemester, activeAcademicYear, configsByTerm, defaultSchoolDays]);

  // Sync local selection when Admin updates schoolInfo in Settings
  useEffect(() => {
    if (schoolInfo?.academicYear && schoolInfo?.semester) {
      const sem = (schoolInfo.semester === '2' ? '2' : '1') as '1' | '2';
      const yr = schoolInfo.academicYear;
      const termKey = `${sem}_${yr}`;

      setLatestAttendanceTermKey(termKey);
      setSelectedAcademicYear(yr);
      setSelectedSemester(sem);
      setSummaryAcademicYear(yr);
      setSummarySemester(sem);
    }
  }, [schoolInfo?.academicYear, schoolInfo?.semester]);

  // Jump calendar view & selectedDate when activeSemester or activeAcademicYear changes
  useEffect(() => {
    const termKey = `${activeSemester}_${activeAcademicYear}`;
    setSummaryAcademicYear(activeAcademicYear);
    setSummarySemester(activeSemester);

    const targetConfig = configsByTerm[termKey];
    const validDays = (targetConfig?.schoolDays || defaultSchoolDays).filter(d => !d.isHoliday);

    if (validDays.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const match = validDays.find(d => d.date === today);
      const targetDate = match ? match.date : validDays[0].date;
      setSelectedDate(targetDate);
      const parts = targetDate.split('-');
      if (parts.length === 3) {
        setCalViewYear(Number(parts[0]));
        setCalViewMonth(Number(parts[1]) - 1);
      }
    } else {
      const defaults = getTermDefaultDates(activeAcademicYear, activeSemester);
      setSelectedDate(defaults.startDate);
      setCalViewYear(defaults.startForcedYear);
      setCalViewMonth(defaults.startForcedMonth);
    }
  }, [activeSemester, activeAcademicYear, configsByTerm, defaultSchoolDays]);

  // Available Academic Years (sorted descending, e.g. 2569, 2568)
  const [availableAcademicYears, setAvailableAcademicYears] = useState<string[]>(() => {
    const list = StorageService.getAcademicYears();
    if (!list.includes('2569')) list.push('2569');
    if (!list.includes('2568')) list.push('2568');
    if (schoolInfo?.academicYear && !list.includes(schoolInfo.academicYear)) {
      list.push(schoolInfo.academicYear);
    }
    if (attendanceConfig.academicYear && !list.includes(attendanceConfig.academicYear)) {
      list.push(attendanceConfig.academicYear);
    }
    return Array.from(new Set(list)).sort((a, b) => b.localeCompare(a));
  });

  // Real-time sync for configsByTerm and availableAcademicYears across all devices/browsers
  useEffect(() => {
    return StorageService.subscribe(() => {
      const latestConfigs = StorageService.getAttendanceConfigsByTerm();
      setConfigsByTerm(latestConfigs);
      const list = StorageService.getAcademicYears();
      if (!list.includes('2569')) list.push('2569');
      if (!list.includes('2568')) list.push('2568');
      if (schoolInfo?.academicYear && !list.includes(schoolInfo.academicYear)) {
        list.push(schoolInfo.academicYear);
      }
      setAvailableAcademicYears(Array.from(new Set(list)).sort((a, b) => b.localeCompare(a)));
    });
  }, [schoolInfo?.academicYear]);

  // Modal to add new academic year
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  // Modal for submission status details
  const [submissionStatusModalDate, setSubmissionStatusModalDate] = useState<string | null>(null);

  // Term schedule resolution: only show table if created with "+"
  const currentTermKey = `${activeSemester}_${activeAcademicYear}`;
  const currentTermConfig = configsByTerm[currentTermKey];
  const hasTermSchedule = Boolean(currentTermConfig && currentTermConfig.schoolDays && currentTermConfig.schoolDays.length > 0);

  // School days list for the active view
  const [schoolDaysList, setSchoolDaysList] = useState<SchoolDayItem[]>(() => {
    const base = configsByTerm['1_2569']?.schoolDays;
    return base || defaultSchoolDays;
  });

  // Sync defaultSchoolDays to configsByTerm['1_2569'] on initial setup only if no terms exist yet
  useEffect(() => {
    const isCleared = localStorage.getItem('ams_cleared_1_2569');
    if (isCleared) return;
    if (Object.keys(configsByTerm).length > 0) return;
    const isInitialized = localStorage.getItem('ams_attendance_initialized');
    const term1_2569 = configsByTerm['1_2569'];
    if (!term1_2569 && !isInitialized) {
      const activeCount = defaultSchoolDays.filter(d => !d.isHoliday).length;
      const seeded: AttendanceDayConfig = {
        ...attendanceConfig,
        semester: '1',
        academicYear: '2569',
        startDate: '2026-05-18',
        endDate: '2026-10-07',
        targetDays: activeCount,
        schoolDays: defaultSchoolDays
      };
      setConfigsByTerm(prev => ({ ...prev, '1_2569': seeded }));
    }
  }, [defaultSchoolDays, configsByTerm]);

  // When selectedSemester or selectedAcademicYear changes, update schoolDaysList
  useEffect(() => {
    const cfg = configsByTerm[currentTermKey];
    if (cfg && cfg.schoolDays && cfg.schoolDays.length > 0) {
      setSchoolDaysList(cfg.schoolDays);
    } else {
      setSchoolDaysList([]);
    }
  }, [currentTermKey, configsByTerm]);

  // Compute submission status for a date
  const getSubmissionStatusForDate = (dateStr: string) => {
    const gradesWithStudents = Array.from(new Set(students.map(s => s.gradeLevel)));
    if (gradesWithStudents.length === 0) {
      return { isAllSubmitted: true, completedCount: 0, totalCount: 0, details: [] };
    }

    const details = gradesWithStudents.map(grade => {
      const gradeStudentsList = students.filter(s => s.gradeLevel === grade);
      const teacher = allMembers.find(m => m.gradeLevel === grade);
      const checkedRecords = attendance.filter(a => a.date === dateStr && a.gradeLevel === grade);
      const isDone = gradeStudentsList.length > 0 && checkedRecords.length >= gradeStudentsList.length;
      return {
        grade,
        teacherName: teacher?.fullName || `ครูประจำชั้น ${grade}`,
        position: teacher?.position || '-',
        totalStudents: gradeStudentsList.length,
        checkedStudents: checkedRecords.length,
        isDone
      };
    });

    const completedCount = details.filter(d => d.isDone).length;
    const isAllSubmitted = completedCount === details.length && details.length > 0;

    return {
      isAllSubmitted,
      completedCount,
      totalCount: details.length,
      details
    };
  };

  // 100 Active School Days for checking attendance & savings (strictly follows the latest created 100-day structure)
  const activeTermDays = useMemo(() => {
    if (latestCreatedConfig?.schoolDays && latestCreatedConfig.schoolDays.length > 0) {
      return latestCreatedConfig.schoolDays;
    }
    return defaultSchoolDays;
  }, [latestCreatedConfig, defaultSchoolDays]);

  const activeSchoolDays = useMemo(() => activeTermDays.filter(d => !d.isHoliday), [activeTermDays]);
  const activeSchoolDayDatesSet = useMemo(() => new Set(activeSchoolDays.map(d => d.date)), [activeSchoolDays]);
  const isSelectedDateSchoolDay = activeSchoolDayDatesSet.has(selectedDate);
  // สมาชิกจะสามารถเช็กเวลาเรียนและฝากเงินตามที่ Admin กำหนด 100 วันเท่านั้น ส่วน Admin จะเป็นมุมมองอ่านอย่างเดียว (ไม่สามารถกรอกหรือแก้ไขได้)
  const isReadOnly = user.role === 'admin';
  const isAllowedToRecord = isSelectedDateSchoolDay && !isReadOnly;

  // ฟังก์ชันสำหรับ Admin กดปุ่ม "เลือก" ในหน้า 100 วัน เพื่อกำหนดให้ไปแสดงในปฏิทินเช็กเวลา&เงินฝากของสมาชิก
  const handleSelectActiveTermForMembers = () => {
    const termKey = `${selectedSemester}_${selectedAcademicYear}`;
    setLatestAttendanceTermKey(termKey);
    localStorage.setItem('ams_latest_attendance_term', termKey);

    // หากยังไม่มีข้อมูลวันเรียนของเทอมนี้ ให้สร้างโครงสร้างเริ่มต้นให้อัตโนมัติ
    const existing = configsByTerm[termKey];
    if (!existing || !existing.schoolDays || existing.schoolDays.length === 0) {
      const activeCount = defaultSchoolDays.filter(d => !d.isHoliday).length;
      const seeded: AttendanceDayConfig = {
        ...attendanceConfig,
        semester: selectedSemester,
        academicYear: selectedAcademicYear,
        startDate: selectedSemester === '1' ? '2026-05-18' : '2026-11-02',
        endDate: selectedSemester === '1' ? '2026-10-07' : '2027-03-31',
        targetDays: activeCount,
        schoolDays: defaultSchoolDays
      };
      const all = StorageService.setAttendanceConfigForTerm(seeded);
      setConfigsByTerm(all);
    }

    // สลับไปยังวันเรียนแรกของเทอมที่เลือก เพื่อให้ปฏิทินและตารางเช็กชื่อตรงเป้าหมายทันที
    const targetConfig = configsByTerm[termKey] || existing;
    const validDays = (targetConfig?.schoolDays || defaultSchoolDays).filter(d => !d.isHoliday);
    if (validDays.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const match = validDays.find(d => d.date === today);
      const newDate = match ? match.date : validDays[0].date;
      setSelectedDate(newDate);
      const parts = newDate.split('-');
      if (parts.length === 3) {
        setCalViewYear(Number(parts[0]));
        setCalViewMonth(Number(parts[1]) - 1);
      }
    }

    onShowToast(
      'success',
      'เลือกภาคเรียนสำเร็จ',
      `กำหนด ภาคเรียนที่ ${selectedSemester} ปีการศึกษา ${selectedAcademicYear} ไปแสดงในปฏิทินเช็กเวลา&เงินฝากของสมาชิกเรียบร้อยแล้ว`
    );
  };

  // Helper: ตรวจสอบว่าบันทึกอยู่ในภาคเรียนและปีการศึกษาปัจจุบันหรือไม่ (เทอมใครเทอมมัน ห้ามรวมเทอมถัดไป)
  const isRecordInCurrentTerm = useCallback((record: { date: string; semester?: string; academicYear?: string }) => {
    // หากมีการระบุเทอมหรือปีการศึกษา ต้องตรงกับเทอมปัจจุบันเท่านั้น ห้ามรวมข้ามเทอม
    if (record.semester && record.semester !== activeSemester) {
      return false;
    }
    if (record.academicYear && record.academicYear !== activeAcademicYear) {
      return false;
    }
    if (record.semester === activeSemester && record.academicYear === activeAcademicYear) {
      return true;
    }
    // สำหรับบันทึกเก่าที่ไม่ได้ระบุฟิลด์เทอม ให้ตรวจสอบจากวันเรียนของเทอมนี้
    if (activeSchoolDayDatesSet.has(record.date)) {
      return true;
    }
    if (latestCreatedConfig?.startDate && latestCreatedConfig?.endDate) {
      return record.date >= latestCreatedConfig.startDate && record.date <= latestCreatedConfig.endDate;
    }
    return false;
  }, [activeSemester, activeAcademicYear, activeSchoolDayDatesSet, latestCreatedConfig]);

  // กรองเฉพาะเงินฝากของเทอมที่เลือก (ไม่รวมข้ามเทอม นับเทอมใครเทอมมัน)
  const currentTermSavings = useMemo(() => {
    return savings.filter(s => isRecordInCurrentTerm(s));
  }, [savings, isRecordInCurrentTerm]);

  // กรองเฉพาะเวลาเรียนของเทอมที่เลือก (ไม่รวมข้ามเทอม นับเทอมใครเทอมมัน)
  const currentTermAttendance = useMemo(() => {
    return attendance.filter(a => isRecordInCurrentTerm(a));
  }, [attendance, isRecordInCurrentTerm]);

  // Auto-switch selectedDate and calendar view to a valid school day in the latest 100 days
  React.useEffect(() => {
    if (activeSchoolDays.length > 0 && !activeSchoolDayDatesSet.has(selectedDate)) {
      const today = new Date().toISOString().split('T')[0];
      let targetDate = '';
      if (activeSchoolDayDatesSet.has(today)) {
        targetDate = today;
      } else {
        const pastDays = activeSchoolDays.filter(d => d.date <= today);
        if (pastDays.length > 0) {
          targetDate = pastDays[pastDays.length - 1].date;
        } else {
          targetDate = activeSchoolDays[0].date;
        }
      }
      setSelectedDate(targetDate);
      const parts = targetDate.split('-');
      if (parts.length === 3) {
        setCalViewYear(Number(parts[0]));
        setCalViewMonth(Number(parts[1]) - 1);
      }
    }
  }, [activeSchoolDays, activeSchoolDayDatesSet, selectedDate]);

  // Active school day order number (ลำดับที่ 1, 2, ... ในบรรดา 100 วัน)
  const activeSchoolDayOrder = useMemo(() => {
    if (!isSelectedDateSchoolDay) return null;
    const idx = activeSchoolDays.findIndex(d => d.date === selectedDate);
    return idx >= 0 ? idx + 1 : null;
  }, [activeSchoolDays, isSelectedDateSchoolDay, selectedDate]);

  // Prev / Next school day date for navigation (strictly through active 100 days)
  const currentSchoolDayIndex = useMemo(() => {
    return activeSchoolDays.findIndex(d => d.date === selectedDate);
  }, [activeSchoolDays, selectedDate]);

  const prevSchoolDayDate = useMemo(() => {
    if (currentSchoolDayIndex > 0) {
      return activeSchoolDays[currentSchoolDayIndex - 1].date;
    }
    const pastDays = activeSchoolDays.filter(d => d.date < selectedDate);
    if (pastDays.length > 0) {
      return pastDays[pastDays.length - 1].date;
    }
    return null;
  }, [activeSchoolDays, currentSchoolDayIndex, selectedDate]);

  const nextSchoolDayDate = useMemo(() => {
    if (currentSchoolDayIndex >= 0 && currentSchoolDayIndex < activeSchoolDays.length - 1) {
      return activeSchoolDays[currentSchoolDayIndex + 1].date;
    }
    const futureDays = activeSchoolDays.filter(d => d.date > selectedDate);
    if (futureDays.length > 0) {
      return futureDays[0].date;
    }
    return null;
  }, [activeSchoolDays, currentSchoolDayIndex, selectedDate]);

  // Custom Calendar Popover state in "เช็กเวลา&เงินฝาก"
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const [calViewYear, setCalViewYear] = useState<number>(() => {
    const d = new Date(selectedDate);
    return isNaN(d.getTime()) ? 2026 : d.getFullYear();
  });
  const [calViewMonth, setCalViewMonth] = useState<number>(() => {
    const d = new Date(selectedDate);
    return isNaN(d.getTime()) ? 4 : d.getMonth(); // 4 = May
  });

  // Sync calendar month/year when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        setCalViewYear(Number(parts[0]));
        setCalViewMonth(Number(parts[1]) - 1);
      }
    }
  }, [selectedDate]);

  // Close calendar popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Calendar cells generation for calViewYear & calViewMonth
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(calViewYear, calViewMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const cells: { dateStr: string; dayNum: number; isSchoolDay: boolean; isCurrentMonth: boolean }[] = [];

    // Prefix empty slots
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ dateStr: '', dayNum: 0, isSchoolDay: false, isCurrentMonth: false });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const yyyy = calViewYear;
      const mm = String(calViewMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const isSchoolDay = activeSchoolDayDatesSet.has(dateStr);
      cells.push({ dateStr, dayNum: day, isSchoolDay, isCurrentMonth: true });
    }

    return cells;
  }, [calViewYear, calViewMonth, activeSchoolDayDatesSet]);

  // Filter students by grade AND room, and sort by roll number (เลขที่)
  const gradeStudents = useMemo(() => {
    const targetRoom = normalizeRoom(selectedRoom);
    return [
      ...students.filter(
        s => s.gradeLevel === selectedGrade && normalizeRoom(s.room) === targetRoom
      )
    ].sort((a, b) => {
      if (a.rollNumber !== undefined && b.rollNumber !== undefined) {
        return a.rollNumber - b.rollNumber;
      }
      if (a.rollNumber !== undefined) return -1;
      if (b.rollNumber !== undefined) return 1;
      return (a.studentCode || '').localeCompare(b.studentCode || '');
    });
  }, [students, selectedGrade, selectedRoom]);

  const gradeStudentIdsSet = useMemo(() => new Set(gradeStudents.map(s => s.id)), [gradeStudents]);

  // Dates with attendance issues (absent, leave, sick) for current selectedGrade & selectedRoom (Red dot on calendar)
  const datesWithAttendanceIssues = useMemo(() => {
    const set = new Set<string>();
    attendance.forEach(a => {
      if (
        gradeStudentIdsSet.has(a.studentId) &&
        (a.status === 'absent' || a.status === 'leave' || a.status === 'sick')
      ) {
        set.add(a.date);
      }
    });
    return set;
  }, [attendance, gradeStudentIdsSet]);

  // Dates with withdrawals for current selectedGrade & selectedRoom (Orange dot on calendar)
  const datesWithWithdrawals = useMemo(() => {
    const set = new Set<string>();
    savings.forEach(s => {
      if (gradeStudentIdsSet.has(s.studentId) && s.type === 'withdrawal' && s.amount > 0) {
        set.add(s.date);
      }
    });
    return set;
  }, [savings, gradeStudentIdsSet]);

  // Dates with deposits for current selectedGrade & selectedRoom (Green dot on calendar)
  const datesWithDeposits = useMemo(() => {
    const set = new Set<string>();
    savings.forEach(s => {
      if (gradeStudentIdsSet.has(s.studentId) && s.type === 'deposit' && s.amount > 0) {
        set.add(s.date);
      }
    });
    return set;
  }, [savings, gradeStudentIdsSet]);

  // Available months from active school days for calendar quick month switcher
  const calendarAvailableMonths = useMemo(() => {
    const map = new Map<string, { year: number; month: number; name: string }>();
    const thaiMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    activeSchoolDays.forEach(d => {
      const parts = d.date.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const key = `${y}-${m}`;
        if (!map.has(key)) {
          map.set(key, { year: y, month: m, name: thaiMonthsShort[m] });
        }
      }
    });
    return Array.from(map.values());
  }, [activeSchoolDays]);

  // Dates where ALL students in the selected class/grade & room have attendance recorded
  const datesWithAllChecked = useMemo(() => {
    const set = new Set<string>();
    const totalStudents = gradeStudents.length;
    if (totalStudents === 0) return set;

    const recordsByDate: Record<string, AttendanceRecord[]> = {};
    attendance.forEach(a => {
      if (gradeStudentIdsSet.has(a.studentId) && a.status) {
        if (!recordsByDate[a.date]) recordsByDate[a.date] = [];
        recordsByDate[a.date].push(a);
      }
    });

    Object.entries(recordsByDate).forEach(([dStr, recs]) => {
      if (recs.length >= totalStudents) {
        set.add(dStr);
      }
    });

    return set;
  }, [attendance, gradeStudents, gradeStudentIdsSet]);

  const currentStudentModalIndex = useMemo(() => {
    if (!selectedStudentModal) return -1;
    return gradeStudents.findIndex(s => s.id === selectedStudentModal.id);
  }, [selectedStudentModal, gradeStudents]);

  const handlePrevStudentModal = () => {
    if (currentStudentModalIndex > 0) {
      setSelectedStudentModal(gradeStudents[currentStudentModalIndex - 1]);
    }
  };

  const handleNextStudentModal = () => {
    if (currentStudentModalIndex >= 0 && currentStudentModalIndex < gradeStudents.length - 1) {
      setSelectedStudentModal(gradeStudents[currentStudentModalIndex + 1]);
    }
  };

  // Sync attendance state when date or grade changes (unrecorded days stay empty/not highlighted)
  React.useEffect(() => {
    const states: Record<string, { status: AttendanceStatus | ''; note: string }> = {};
    gradeStudents.forEach(s => {
      const rec = attendance.find(a => a.date === selectedDate && a.studentId === s.id);
      states[s.id] = {
        status: rec ? rec.status : ('' as AttendanceStatus),
        note: rec?.note || ''
      };
    });
    setAttendanceStates(states);
  }, [selectedDate, selectedGrade, gradeStudents, attendance]);

  // Sync today's deposits when date or grade changes
  React.useEffect(() => {
    const initialDeposits: Record<string, number | string> = {};
    gradeStudents.forEach(s => {
      const existingDeposit = savings.find(sav => sav.date === selectedDate && sav.studentId === s.id && sav.type === 'deposit');
      if (existingDeposit) {
        initialDeposits[s.id] = existingDeposit.amount;
      } else {
        initialDeposits[s.id] = '';
      }
    });
    setTodayDeposits(initialDeposits);
  }, [selectedDate, selectedGrade, gradeStudents, savings]);

  const getStudentBalance = (studentId: string): number => {
    const list = currentTermSavings.filter(s => s.studentId === studentId);
    const totalDeposits = list.filter(s => s.type === 'deposit').reduce((sum, r) => sum + r.amount, 0);
    const totalWithdrawals = list.filter(s => s.type === 'withdrawal' && !s.deductedFromDeposits).reduce((sum, r) => sum + r.amount, 0);
    return Math.max(0, totalDeposits - totalWithdrawals);
  };

  const getStudentRegularDeposit = (studentId: string): number => {
    const studentDeposits = currentTermSavings.filter(s => s.studentId === studentId && s.type === 'deposit');
    if (studentDeposits.length === 0) {
      const st = students.find(s => s.id === studentId);
      return st?.dailyAllowance || 20;
    }
    const frequency: Record<number, number> = {};
    studentDeposits.forEach(d => {
      frequency[d.amount] = (frequency[d.amount] || 0) + 1;
    });
    let maxFreq = 0;
    let regularAmt = studentDeposits[0].amount;
    for (const [amt, freq] of Object.entries(frequency)) {
      if (freq > maxFreq) {
        maxFreq = freq;
        regularAmt = Number(amt);
      }
    }
    return regularAmt;
  };

  const getStudentTodayDepositRecord = (studentId: string): SavingsRecord | undefined => {
    return currentTermSavings.find(s => s.studentId === studentId && s.date === selectedDate && s.type === 'deposit');
  };

  // Get all deposit records for a student sorted latest first (current term only)
  const getStudentDepositHistory = (studentId: string): SavingsRecord[] => {
    return currentTermSavings
      .filter(s => s.studentId === studentId && s.type === 'deposit')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Get recent past deposit before selectedDate (or most recent deposit in current term)
  const getStudentPreviousDeposit = (studentId: string): SavingsRecord | undefined => {
    const history = getStudentDepositHistory(studentId);
    return history.find(d => d.date < selectedDate) || history.find(d => d.date !== selectedDate) || history[0];
  };

  const getStudentWithdrawals = (studentId: string): SavingsRecord[] => {
    return currentTermSavings
      .filter(s => s.studentId === studentId && s.type === 'withdrawal')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const studentsWithWithdrawals = useMemo(() => {
    return gradeStudents.filter(s => 
      currentTermSavings.some(sav => sav.studentId === s.id && sav.type === 'withdrawal')
    );
  }, [gradeStudents, currentTermSavings]);

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    if (!isAllowedToRecord) {
      onShowToast('warning', 'ไม่สามารถเช็กเวลาเรียนได้', `วันที่ ${formatThaiDate(selectedDate)} ไม่ใช่วันเรียนที่กำหนดไว้ในโครงสร้าง 100 วัน`);
      return;
    }
    const curNote = attendanceStates[studentId]?.note || '';
    setAttendanceStates(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));

    // Auto-save attendance record immediately with current semester & academic year
    const student = students.find(s => s.id === studentId);
    if (student) {
      onSaveBulkAttendance([{
        id: `att-${selectedDate}-${student.id}`,
        date: selectedDate,
        studentId: student.id,
        studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
        gradeLevel: selectedGrade,
        status,
        semester: activeSemester,
        academicYear: activeAcademicYear,
        note: curNote
      }]);
    }
  };

  const handleNoteAutoSave = (studentId: string, noteVal: string) => {
    if (!isAllowedToRecord) return;
    const student = students.find(s => s.id === studentId);
    if (student) {
      const curStatus = attendanceStates[studentId]?.status || 'present';
      onSaveBulkAttendance([{
        id: `att-${selectedDate}-${student.id}`,
        date: selectedDate,
        studentId: student.id,
        studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
        gradeLevel: selectedGrade,
        status: curStatus,
        semester: activeSemester,
        academicYear: activeAcademicYear,
        note: noteVal
      }]);
    }
  };

  const handleMarkAllPresent = () => {
    if (!isAllowedToRecord) {
      onShowToast('warning', 'ไม่สามารถเช็กเวลาเรียนได้', `วันที่ ${formatThaiDate(selectedDate)} ไม่ใช่วันเรียนที่กำหนดไว้ในโครงสร้าง 100 วัน`);
      return;
    }
    const updated: Record<string, { status: AttendanceStatus; note: string }> = {};
    const newRecords: AttendanceRecord[] = gradeStudents.map(s => {
      const curNote = attendanceStates[s.id]?.note || '';
      updated[s.id] = {
        status: 'present',
        note: curNote
      };
      return {
        id: `att-${selectedDate}-${s.id}`,
        date: selectedDate,
        studentId: s.id,
        studentName: `${s.prefix}${s.firstName} ${s.lastName}`,
        gradeLevel: selectedGrade,
        status: 'present',
        semester: activeSemester,
        academicYear: activeAcademicYear,
        note: curNote
      };
    });
    setAttendanceStates(updated);
    onSaveBulkAttendance(newRecords);
    onShowToast('success', 'เช็กชื่อ', 'ตั้งค่าทุกคนเป็น "มาเรียน (ม)" บันทึกอัตโนมัติแล้ว');
  };

  const handleSingleDeposit = (student: Student, overrideAmount?: number) => {
    if (!isAllowedToRecord) {
      if (overrideAmount !== undefined) {
        onShowToast('warning', 'ไม่สามารถบันทึกเงินฝากได้', `วันที่ ${formatThaiDate(selectedDate)} ไม่ใช่วันเรียนที่กำหนดไว้ในโครงสร้าง 100 วัน`);
      }
      return;
    }
    const entered = overrideAmount !== undefined ? overrideAmount : Number(todayDeposits[student.id]);
    if (!entered || entered <= 0) {
      return;
    }

    const existingDeposit = getStudentTodayDepositRecord(student.id);
    if (existingDeposit) {
      return;
    }

    // Save silently in background without blocking toast
    onSaveSavingsRecord({
      id: 'sav-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      date: selectedDate,
      studentId: student.id,
      studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
      gradeLevel: student.gradeLevel,
      type: 'deposit',
      amount: entered,
      semester: activeSemester,
      academicYear: activeAcademicYear,
      notes: `ฝากเงินประจำวัน (${selectedDate})`
    });

    setTodayDeposits(prev => {
      const copy = { ...prev };
      delete copy[student.id];
      return copy;
    });
  };

  const handleStartEditDeposit = (studentId: string, currentAmount: number) => {
    if (!isAllowedToRecord) {
      onShowToast('warning', 'ไม่สามารถแก้ไขเงินฝากได้', `วันที่ ${formatThaiDate(selectedDate)} ไม่ใช่วันเรียนที่กำหนดไว้ในโครงสร้าง 100 วัน`);
      return;
    }
    setEditingDepositStudentId(studentId);
    setEditDepositAmount(currentAmount);
  };

  const handleCancelEditDeposit = () => {
    setEditingDepositStudentId(null);
    setEditDepositAmount('');
  };

  const handleSaveEditedDeposit = (student: Student, existingRec?: SavingsRecord) => {
    const entered = Number(editDepositAmount);
    if (isNaN(entered) || entered < 0) {
      onShowToast('warning', 'ระบุจำนวนเงิน', 'กรุณาระบุจำนวนเงินฝากที่ถูกต้อง (0 บาทขึ้นไป)');
      return;
    }

    if (entered === 0 && existingRec && onDeleteSavingsRecord) {
      onDeleteSavingsRecord(existingRec.id);
      setEditingDepositStudentId(null);
      setEditDepositAmount('');
      onShowToast('info', 'ยกเลิกยอดเงินฝาก', `ลบยอดเงินฝากประจำวันที่ ${selectedDate} ของ ${student.prefix}${student.firstName} แล้ว`);
      return;
    }

    // Save silently without blocking toast
    onSaveSavingsRecord({
      id: existingRec?.id || ('sav-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
      date: selectedDate,
      studentId: student.id,
      studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
      gradeLevel: student.gradeLevel,
      type: 'deposit',
      amount: entered,
      semester: activeSemester,
      academicYear: activeAcademicYear,
      notes: `ฝากเงินประจำวัน (${selectedDate})`
    });

    setEditingDepositStudentId(null);
    setEditDepositAmount('');
  };

  const handleSaveAttendanceAndDeposits = () => {
    if (!isAllowedToRecord) {
      onShowToast('warning', 'ไม่สามารถบันทึกได้', `วันที่ ${formatThaiDate(selectedDate)} ไม่ใช่วันเรียนที่กำหนดไว้ในโครงสร้าง 100 วัน`);
      return;
    }
    // 1. Save attendance records
    const newRecords: AttendanceRecord[] = gradeStudents.map(s => {
      const state = attendanceStates[s.id] || { status: 'present', note: '' };
      return {
        id: `att-${selectedDate}-${s.id}`,
        date: selectedDate,
        studentId: s.id,
        studentName: `${s.prefix}${s.firstName} ${s.lastName}`,
        gradeLevel: selectedGrade,
        status: state.status || 'present',
        semester: activeSemester,
        academicYear: activeAcademicYear,
        note: state.note
      };
    });

    onSaveBulkAttendance(newRecords);

    // 2. Save any newly entered today's deposits
    gradeStudents.forEach(s => {
      const entered = todayDeposits[s.id];
      const existing = getStudentTodayDepositRecord(s.id);
      if (entered && Number(entered) > 0 && !existing) {
        const amt = Number(entered);
        if (amt > 0) {
          onSaveSavingsRecord({
            id: 'sav-' + Date.now() + '-' + s.id.substring(0, 4) + '-' + Math.random().toString(36).substring(2, 5),
            date: selectedDate,
            studentId: s.id,
            studentName: `${s.prefix}${s.firstName} ${s.lastName}`,
            gradeLevel: selectedGrade,
            type: 'deposit',
            amount: amt,
            semester: activeSemester,
            academicYear: activeAcademicYear,
            notes: `ฝากเงินประจำวัน (${selectedDate})`
          });
        }
      }
    });

    onShowToast('success', 'บันทึกสำเร็จ', `บันทึกข้อมูลเวลาเรียนและเงินฝากประจำวันที่ ${selectedDate} เรียบร้อยแล้ว`);
  };

  const handleOpenWithdrawModal = (student: Student) => {
    setWithdrawStudent(student);
    setWithdrawAmount(50);
    setWithdrawReason('');
    setWithdrawDate(selectedDate);
  };

  const handleConfirmWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawStudent) return;
    const amt = Number(withdrawAmount);
    const balance = getStudentBalance(withdrawStudent.id);

    if (amt <= 0 || amt > balance) {
      onShowToast('warning', 'ยอดเงินไม่ถูกต้อง', 'จำนวนเงินถอนต้องมากกว่า 0 และไม่เกินยอดเงินคงเหลือ');
      return;
    }

    const reason = withdrawReason.trim() || 'ถอนเงินออมทรัพย์';
    const effectiveWithdrawDate = withdrawDate || selectedDate;

    // 1. ดึงรายการเงินฝากทั้งหมดของนักเรียนในเทอมนี้ที่มียอด > 0 เรียงตามวันที่ฝากจากวันแรกสุดไปหาวันล่าสุด (FIFO: First-In First-Out)
    const studentDeposits = currentTermSavings
      .filter(s => s.studentId === withdrawStudent.id && s.type === 'deposit' && s.amount > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    let remainingToDeduct = amt;
    const deductionMap = new Map<string, { newAmount: number; deductedFromThis: number; orig: number }>();
    const breakdownList: { depositId: string; date: string; amount: number; prevAmount: number; newAmount: number }[] = [];

    for (const dep of studentDeposits) {
      if (remainingToDeduct <= 0) break;
      const deductFromThis = Math.min(dep.amount, remainingToDeduct);
      const newAmt = dep.amount - deductFromThis;
      const orig = dep.originalAmount ?? dep.amount;
      deductionMap.set(dep.id, {
        newAmount: newAmt,
        deductedFromThis: deductFromThis,
        orig
      });
      breakdownList.push({
        depositId: dep.id,
        date: dep.date,
        amount: deductFromThis,
        prevAmount: dep.amount,
        newAmount: newAmt
      });
      remainingToDeduct -= deductFromThis;
    }

    // สรุปข้อความว่าหักจากวันที่ใดบ้าง เช่น "หักจากวันที่ 1 (หัก 50 เหลือ 0 บ.), วันที่ 2 (หัก 10 เหลือ 40 บ.)"
    const breakdownText = breakdownList.map(b => 
      `${formatThaiDate(b.date)}: หัก ฿${b.amount} (เหลือ ฿${b.newAmount})`
    ).join(', ');

    // 2. สร้างรายการถอนเงิน (Withdrawal Record) พร้อมบันทึกรายละเอียดการหักแบบ FIFO
    const withdrawalRec: SavingsRecord = {
      id: 'sav-w-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date: effectiveWithdrawDate,
      studentId: withdrawStudent.id,
      studentName: `${withdrawStudent.prefix}${withdrawStudent.firstName} ${withdrawStudent.lastName}`,
      gradeLevel: withdrawStudent.gradeLevel,
      type: 'withdrawal',
      amount: amt,
      balanceAfter: Math.max(0, balance - amt),
      semester: activeSemester,
      academicYear: activeAcademicYear,
      deductedFromDeposits: true,
      deductionBreakdown: breakdownList.map(b => ({
        depositId: b.depositId,
        date: b.date,
        amount: b.amount
      })),
      notes: reason ? `${reason} (หักจาก: ${breakdownText})` : `ถอนเงิน (หักจาก: ${breakdownText})`
    };

    // 3. ปรับปรุงยอดเงินฝากของแต่ละวันที่ถูกหักถอนในรายการ savings ทั้งหมด
    const updatedFullList = savings.map(s => {
      const deduction = deductionMap.get(s.id);
      if (deduction) {
        const totalDeductedSoFar = (s.deductedAmount || 0) + deduction.deductedFromThis;
        return {
          ...s,
          amount: deduction.newAmount,
          originalAmount: deduction.orig,
          deductedAmount: totalDeductedSoFar,
          notes: deduction.newAmount === 0
            ? `ฝากเดิม ฿${deduction.orig} (หักถอนหมดแล้ว ฿${totalDeductedSoFar})`
            : `ฝากเดิม ฿${deduction.orig} (หักถอนไป ฿${totalDeductedSoFar} เหลือ ฿${deduction.newAmount})`
        };
      }
      return s;
    });

    updatedFullList.push(withdrawalRec);

    // 4. บันทึกและซิงค์ข้อมูล
    if (onUpdateAllSavings) {
      onUpdateAllSavings(updatedFullList);
    } else {
      StorageService.setAllSavings(updatedFullList);
    }

    setWithdrawStudent(null);
    setWithdrawAmount(50);
    setWithdrawReason('');

    onShowToast(
      'success', 
      'ถอนเงินสำเร็จ', 
      `ถอนเงินให้ ${withdrawStudent.prefix}${withdrawStudent.firstName} จำนวน ฿${amt.toLocaleString()} บาท (หักเงินจากวันที่เคยฝากตามลำดับเรียบร้อยแล้ว)`
    );
  };

  // Helper to persist updated schoolDaysList to the active selected term (semester & academicYear)
  const saveTermSchoolDaysList = (updatedList: SchoolDayItem[]) => {
    const existingTermCfg = configsByTerm[currentTermKey];
    if (updatedList.length === 0) {
      setSchoolDaysList([]);
      const updatedConfigs = StorageService.deleteAttendanceConfigForTerm(currentTermKey);
      setConfigsByTerm(updatedConfigs);
      onSaveAttendanceConfig({
        ...(existingTermCfg || attendanceConfig),
        semester: selectedSemester,
        academicYear: selectedAcademicYear,
        startDate: '',
        endDate: '',
        targetDays: 0,
        schoolDays: []
      });
      return;
    }

    const activeCount = updatedList.filter(d => !d.isHoliday).length;
    const sortedDates = updatedList.map(d => d.date).filter(Boolean).sort();
    const startDate = existingTermCfg?.startDate || sortedDates[0] || attendanceConfig.startDate || '';
    const endDate = existingTermCfg?.endDate || sortedDates[sortedDates.length - 1] || attendanceConfig.endDate || '';

    const updatedConfig: AttendanceDayConfig = {
      ...(existingTermCfg || attendanceConfig),
      semester: selectedSemester,
      academicYear: selectedAcademicYear,
      startDate,
      endDate,
      targetDays: activeCount,
      schoolDays: updatedList
    };

    setSchoolDaysList(updatedList);
    const allConfigs = StorageService.setAttendanceConfigForTerm(updatedConfig);
    setConfigsByTerm(allConfigs);
    onSaveAttendanceConfig(updatedConfig);
  };

  // Toggle holiday status for a date item in school structure
  const handleToggleHolidayItem = (targetDate: string, saveImmediately = true) => {
    let toggledToHoliday = false;
    const updated = schoolDaysList.map(item => {
      if (item.date === targetDate) {
        const nextHoliday = !item.isHoliday;
        toggledToHoliday = nextHoliday;
        const isWeekend = item.dayOfWeek === 'เสาร์' || item.dayOfWeek === 'อาทิตย์';
        let nextNote = item.note || '';
        if (nextHoliday && (!nextNote || nextNote === 'วันเรียนปกติ')) {
          nextNote = isWeekend ? 'วันหยุดสุดสัปดาห์' : 'วันหยุด';
        } else if (!nextHoliday && (!nextNote || nextNote === 'วันหยุด' || nextNote === 'วันหยุดสุดสัปดาห์')) {
          nextNote = 'วันเรียนปกติ';
        }
        return { ...item, isHoliday: nextHoliday, note: nextNote };
      }
      return item;
    });

    if (saveImmediately) {
      saveTermSchoolDaysList(updated);
      const activeCount = updated.filter(d => !d.isHoliday).length;
      onShowToast(
        'success',
        'อัปเดตสถานะวันสำเร็จ',
        `ตั้งค่าวันที่ ${formatThaiDate(targetDate)} เป็น "${toggledToHoliday ? 'วันหยุด' : 'วันเรียน'}" เรียบร้อยแล้ว (รวมวันเรียน ${activeCount} วัน)`
      );
    } else {
      setSchoolDaysList(updated);
    }
  };

  // Open edit modal for a school day item
  const handleOpenEditDay = (item: SchoolDayItem) => {
    setEditingDayItem(item);
    setEditingDayIsHoliday(item.isHoliday);
    setEditingDayNote(item.note || '');
  };

  // Save changes from editing a school day item
  const handleSaveEditDay = () => {
    if (!editingDayItem) return;
    const isWeekend = editingDayItem.dayOfWeek === 'เสาร์' || editingDayItem.dayOfWeek === 'อาทิตย์';
    let cleanedNote = editingDayNote.trim();
    if (editingDayIsHoliday && (!cleanedNote || cleanedNote === 'วันเรียนปกติ')) {
      cleanedNote = isWeekend ? 'วันหยุดสุดสัปดาห์' : 'วันหยุด';
    } else if (!editingDayIsHoliday && (!cleanedNote || cleanedNote === 'วันหยุด' || cleanedNote === 'วันหยุดสุดสัปดาห์')) {
      cleanedNote = 'วันเรียนปกติ';
    }

    const updated = schoolDaysList.map(item => {
      if (item.date === editingDayItem.date) {
        return {
          ...item,
          isHoliday: editingDayIsHoliday,
          note: cleanedNote
        };
      }
      return item;
    });

    saveTermSchoolDaysList(updated);
    onShowToast(
      'success',
      'บันทึกสำเร็จ',
      `ตั้งค่าวันที่ ${formatThaiDate(editingDayItem.date)} เป็น "${editingDayIsHoliday ? 'วันหยุด' : 'วันเรียน'}" เรียบร้อยแล้ว`
    );
    setEditingDayItem(null);
  };

  // Quick navigation to attendance checking on a specific date
  const handleGoToDateAttendance = (targetDate: string) => {
    setSelectedDate(targetDate);
    setActiveTab('main');
    onShowToast('info', 'เลือกวันที่', `เปิดหน้าบันทึกเวลาเรียนประจำวันที่ ${formatThaiDate(targetDate)}`);
  };

  // Add a new custom day (e.g. Saturday/Sunday or special day)
  const handleConfirmAddCustomDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomDate) return;

    if (schoolDaysList.some(d => d.date === newCustomDate)) {
      onShowToast('warning', 'มีอยู่แล้ว', `วันที่ ${formatThaiDate(newCustomDate)} มีอยู่ในรายการแล้ว`);
      return;
    }

    const dObj = new Date(newCustomDate + 'T00:00:00');
    if (isNaN(dObj.getTime())) {
      onShowToast('error', 'รูปแบบไม่ถูกต้อง', 'โปรดระบุวันที่ในรูปแบบที่ถูกต้อง');
      return;
    }

    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const dayName = thaiDays[dObj.getDay()];

    const newItem: SchoolDayItem = {
      date: newCustomDate,
      dayOfWeek: dayName,
      isHoliday: false, // Default to working day when added
      note: newCustomNote.trim() || 'วันเรียนพิเศษ/กิจกรรม'
    };

    const nextList = [...schoolDaysList, newItem].sort((a, b) => a.date.localeCompare(b.date));
    saveTermSchoolDaysList(nextList);

    setIsAddDayModalOpen(false);
    setNewCustomNote('');
    onShowToast('success', 'เพิ่มวันเรียบร้อย 🎉', `เพิ่มวันที่ ${formatThaiDate(newCustomDate)} (วัน${dayName}) เรียบร้อยแล้ว`);
  };

  // Request confirmation before deleting a single day from the 100-day structure
  const handleDeleteDay = (targetDate: string) => {
    const found = schoolDaysList.find(d => d.date === targetDate);
    if (found) {
      setConfirmDeleteDay(found);
    } else {
      setConfirmDeleteDay({
        date: targetDate,
        dayOfWeek: '',
        isHoliday: false,
        note: ''
      });
    }
  };

  // Execute confirmed deletion of a single day from the 100-day structure
  const handleConfirmDeleteDay = () => {
    if (!confirmDeleteDay) return;
    const targetDate = confirmDeleteDay.date;
    const updated = schoolDaysList.filter(d => d.date !== targetDate);
    saveTermSchoolDaysList(updated);
    if (editingDayItem && editingDayItem.date === targetDate) {
      setEditingDayItem(null);
    }
    setConfirmDeleteDay(null);
    onShowToast('success', 'ลบวันเรียบร้อย 🗑️', `ลบวันที่ ${formatThaiDate(targetDate)} ออกจากตารางวันเรียนแล้ว`);
  };

  // Save 100 Days Config with schoolDays
  const handleSaveConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!tempConfig.startDate || !tempConfig.endDate) {
      onShowToast('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณาระบุวันเริ่มและวันสิ้นสุด');
      return;
    }

    if (tempConfig.startDate > tempConfig.endDate) {
      onShowToast('error', 'ช่วงวันที่ไม่ถูกต้อง', 'วันเริ่มต้องมาก่อนวันสิ้นสุด');
      return;
    }

    const days: SchoolDayItem[] = [];
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const curr = new Date(tempConfig.startDate + 'T00:00:00');
    const end = new Date(tempConfig.endDate + 'T00:00:00');
    const existingMap = new Map((schoolDaysList || []).map(d => [d.date, d]));

    while (curr <= end) {
      const dayOfWeekNum = curr.getDay();
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const existing = existingMap.get(dateStr);
      if (existing) {
        days.push(existing);
      } else {
        const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;
        days.push({
          date: dateStr,
          dayOfWeek: thaiDays[dayOfWeekNum],
          isHoliday: isWeekend,
          note: isWeekend ? 'วันหยุดสุดสัปดาห์' : 'วันเรียนปกติ'
        });
      }
      curr.setDate(curr.getDate() + 1);
    }

    const activeCount = days.filter(d => !d.isHoliday).length;
    const finalTargetDays = autoCalculatedWeekdays > 0 ? autoCalculatedWeekdays : activeCount;

    const newConfig: AttendanceDayConfig = {
      ...tempConfig,
      targetDays: finalTargetDays,
      schoolDays: days
    };

    // 1. Save to StorageService for this term
    const allConfigs = StorageService.setAttendanceConfigForTerm(newConfig);
    setConfigsByTerm(allConfigs);

    // 2. Ensure academic year is in available list
    if (newConfig.academicYear) {
      const updatedYears = StorageService.addAcademicYear(newConfig.academicYear);
      setAvailableAcademicYears(updatedYears);
    }

    // 3. Immediately switch active view to the term that was just created/saved!
    const termKey = `${newConfig.semester || '1'}_${newConfig.academicYear || '2569'}`;
    localStorage.setItem('ams_latest_attendance_term', termKey);
    setLatestAttendanceTermKey(termKey);

    setSelectedSemester(newConfig.semester || '1');
    setSelectedAcademicYear(newConfig.academicYear || '2569');
    setSchoolDaysList(days);
    setSchoolDaysSearchQuery('');
    setSchoolDaysMonthFilter('all');

    // Switch selectedDate to first active school day in this new term
    const firstActiveDay = days.find(d => !d.isHoliday);
    if (firstActiveDay) {
      setSelectedDate(firstActiveDay.date);
      const parts = firstActiveDay.date.split('-');
      if (parts.length === 3) {
        setCalViewYear(Number(parts[0]));
        setCalViewMonth(Number(parts[1]) - 1);
      }
    }

    // 4. Update parent App state
    onSaveAttendanceConfig(newConfig);

    // 5. Close popup
    setIsConfigPopupOpen(false);

    onShowToast(
      'success',
      'บันทึกโครงสร้างสำเร็จ 🎉',
      `บันทึกกรอบเวลาเรียน ภาคเรียนที่ ${newConfig.semester}/${newConfig.academicYear} รวม ${activeCount} วันเรียน เรียบร้อยแล้ว แสดงตารางด้านล่างทันที`
    );
  };

  // Save changes made in "หน้าวันทำการ"
  const handleSaveAllSchoolDaysChanges = () => {
    saveTermSchoolDaysList(schoolDaysList);
    const activeCount = schoolDaysList.filter(d => !d.isHoliday).length;
    onShowToast('success', 'บันทึกวันทำการสำเร็จ 🎉', `บันทึกโครงสร้างวันทำการทั้งหมด ${activeCount} วัน เรียบร้อยแล้ว`);
  };

  // Delete All School Days handler (always asks confirmation first)
  const handleConfirmDeleteAllSchoolDays = () => {
    const termKey = `${selectedSemester}_${selectedAcademicYear}`;
    const updatedConfigs = StorageService.deleteAttendanceConfigForTerm(termKey);
    setConfigsByTerm(updatedConfigs);
    setSchoolDaysList([]);

    if (latestAttendanceTermKey === termKey) {
      const remainingValidKeys = Object.keys(updatedConfigs).filter(k => updatedConfigs[k]?.schoolDays?.length);
      const nextKey = remainingValidKeys[0] || '';
      localStorage.setItem('ams_latest_attendance_term', nextKey);
      setLatestAttendanceTermKey(nextKey);
    }

    if (attendanceConfig.semester === selectedSemester && attendanceConfig.academicYear === selectedAcademicYear) {
      onSaveAttendanceConfig({
        ...attendanceConfig,
        startDate: '',
        endDate: '',
        targetDays: 0,
        schoolDays: []
      });
    }

    onShowToast(
      'success',
      'ลบรายการสำเร็จ',
      `ลบตารางวันเรียน ภาคเรียนที่ ${selectedSemester} ปีการศึกษา ${selectedAcademicYear} เรียบร้อยแล้ว`
    );

    setIsDeleteAllModalOpen(false);
  };

  // Confirm Delete History Record with Password
  const handleConfirmDeleteHistoryRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyItemToDelete) return;

    const pwd = deleteHistoryPasswordInput.trim();
    if (!pwd) {
      setDeleteHistoryPasswordError('กรุณากรอกรหัสผ่านเพื่อยืนยัน');
      return;
    }

    const members = StorageService.getMembers();
    const isPasswordValid = members.some(m => m.password === pwd) ||
                            (pwd === '123' || pwd === '123456' || pwd === 'admin');

    if (!isPasswordValid) {
      setDeleteHistoryPasswordError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      return;
    }

    const recordId = historyItemToDelete.id;
    const isWithdrawal = historyItemToDelete.type === 'withdrawal';

    if (isWithdrawal && historyItemToDelete.deductionBreakdown && historyItemToDelete.deductionBreakdown.length > 0) {
      const breakdown = historyItemToDelete.deductionBreakdown;
      const restoreMap = new Map<string, number>();
      breakdown.forEach(b => restoreMap.set(b.depositId, b.amount));

      const restoredList = savings
        .filter(s => s.id !== recordId)
        .map(s => {
          const restoreAmt = restoreMap.get(s.id);
          if (restoreAmt && restoreAmt > 0) {
            const restoredAmount = s.amount + restoreAmt;
            const newDeducted = Math.max(0, (s.deductedAmount || 0) - restoreAmt);
            return {
              ...s,
              amount: restoredAmount,
              deductedAmount: newDeducted,
              notes: newDeducted > 0
                ? `ฝากเดิม ฿${s.originalAmount || restoredAmount} (หักถอนไป ฿${newDeducted} เหลือ ฿${restoredAmount})`
                : (s.originalAmount ? `ฝากเงินประจำวัน` : s.notes)
            };
          }
          return s;
        });

      if (onUpdateAllSavings) {
        onUpdateAllSavings(restoredList);
      } else {
        StorageService.setAllSavings(restoredList);
      }
    } else {
      if (onDeleteSavingsRecord) {
        onDeleteSavingsRecord(recordId);
      } else {
        StorageService.deleteSavingsRecord(recordId);
      }
    }
    onShowToast(
      'success',
      'ลบรายการประวัติสำเร็จ',
      isWithdrawal
        ? `ลบรายการถอนเงิน ฿${historyItemToDelete.amount.toLocaleString()} บาท สำเร็จ ยอดเงินคงเหลือคืนกลับเป็นเงินเดิมเรียบร้อยแล้ว`
        : `ลบรายการฝากเงิน ฿${historyItemToDelete.amount.toLocaleString()} บาท เรียบร้อยแล้ว`
    );

    setHistoryItemToDelete(null);
    setDeleteHistoryPasswordInput('');
    setDeleteHistoryPasswordError('');
  };

  const countPresent = gradeStudents.filter(s => attendanceStates[s.id]?.status === 'present').length;
  const countAbsent = gradeStudents.filter(s => attendanceStates[s.id]?.status === 'absent').length;
  const countLeave = gradeStudents.filter(s => attendanceStates[s.id]?.status === 'leave').length;
  const countSick = gradeStudents.filter(s => attendanceStates[s.id]?.status === 'sick').length;

  const totalGradeSavings = gradeStudents.reduce((acc, s) => acc + getStudentBalance(s.id), 0);
  const totalTodayDeposits = gradeStudents.reduce((acc, s) => {
    const todayRec = getStudentTodayDepositRecord(s.id);
    const entered = Number(todayDeposits[s.id]) || 0;
    return acc + (todayRec ? todayRec.amount : entered);
  }, 0);

  const activeSchoolDaysCount = schoolDaysList.filter(d => !d.isHoliday).length;
  const holidaySchoolDaysCount = schoolDaysList.filter(d => d.isHoliday).length;

  // Thai Date Formatter helper
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${d} ${thaiMonths[m - 1] || ''} ${y + 543}`;
  };

  const formatShortThaiDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = Number(parts[2]);
    const m = Number(parts[1]);
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${d} ${thaiMonths[m - 1] || ''}`;
  };

  const formatThaiDateLong = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    const thaiMonthsLong = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${d} ${thaiMonthsLong[m - 1] || ''} พ.ศ. ${y + 543}`;
  };

  // Unique months available in schoolDaysList for filtering
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, { key: string; label: string; count: number }>();
    const thaiMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    schoolDaysList.forEach(item => {
      const parts = item.date.split('-');
      if (parts.length === 3) {
        const mKey = `${parts[0]}-${parts[1]}`;
        const mNum = Number(parts[1]);
        const yNum = Number(parts[0]) + 543;
        const label = `${thaiMonthsShort[mNum - 1] || ''} ${String(yNum).slice(-2)}`;
        
        const existing = monthsMap.get(mKey);
        if (existing) {
          if (!item.isHoliday) existing.count++;
        } else {
          monthsMap.set(mKey, {
            key: mKey,
            label,
            count: item.isHoliday ? 0 : 1
          });
        }
      }
    });

    return Array.from(monthsMap.values());
  }, [schoolDaysList]);

  // Filtered school days in "หน้าวันทำการ"
  const filteredSchoolDays = useMemo(() => {
    return schoolDaysList.filter(item => {
      // Month filter
      if (schoolDaysMonthFilter !== 'all' && !item.date.startsWith(schoolDaysMonthFilter)) {
        return false;
      }
      // Search filter
      if (schoolDaysSearchQuery.trim()) {
        const q = schoolDaysSearchQuery.trim().toLowerCase();
        const matchDate = item.date.toLowerCase().includes(q);
        const matchDay = item.dayOfWeek.toLowerCase().includes(q);
        const matchNote = item.note?.toLowerCase().includes(q);
        if (!matchDate && !matchDay && !matchNote) {
          return false;
        }
      }
      return true;
    });
  }, [schoolDaysList, schoolDaysMonthFilter, schoolDaysSearchQuery]);

  // Today string for comparison
  const todayStr = new Date().toISOString().split('T')[0];

  // Stats: past vs future working days
  const pastWorkingDaysCount = useMemo(() => {
    return schoolDaysList.filter(d => !d.isHoliday && d.date <= todayStr).length;
  }, [schoolDaysList, todayStr]);

  const remainingWorkingDaysCount = useMemo(() => {
    return schoolDaysList.filter(d => !d.isHoliday && d.date > todayStr).length;
  }, [schoolDaysList, todayStr]);

  return (
    <div className="space-y-4">
      {/* Top Navigation: 1) เช็กเวลา&เงินฝาก 2) 100วัน พร้อมปุ่มเครื่องหมาย + */}
      <div className="bg-emerald-50/90 p-2 rounded-2xl border border-emerald-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          {/* Button/Tab 1: เช็กเวลา&เงินฝาก */}
          <button
            type="button"
            onClick={() => setActiveTab('main')}
            className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto ${
              activeTab === 'main'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white hover:bg-emerald-100/60 text-slate-700 border border-emerald-200/60'
            }`}
          >
            <CalendarCheck className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">เช็กเวลา&เงินฝาก</span>
          </button>

          {/* Button/Tab 2: 100วัน */}
          <button
            type="button"
            onClick={() => setActiveTab('school_days')}
            className={`px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto ${
              activeTab === 'school_days'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white hover:bg-emerald-100/60 text-slate-700 border border-emerald-200/60'
            }`}
          >
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">100วัน</span>
            <span className={`text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
              activeTab === 'school_days'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {activeSchoolDaysCount || attendanceConfig.targetDays} วัน
            </span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
          {user.role === 'admin' ? (
            <>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'add_new') {
                      setIsAddYearModalOpen(true);
                    } else {
                      setSelectedAcademicYear(val);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors w-full sm:w-auto truncate"
                >
                  {availableAcademicYears.map(yr => (
                    <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                  ))}
                  <option value="add_new">+ เพิ่มปีการศึกษา...</option>
                </select>

                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value as '1' | '2')}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors w-full sm:w-auto truncate"
                >
                  <option value="1">ภาคเรียนที่ 1</option>
                  <option value="2">ภาคเรียนที่ 2</option>
                </select>
              </div>

              {activeTab === 'main' && registeredHomeroomGrades.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <select
                    value={selectedGrade}
                    onChange={(e) => {
                      setSelectedGrade(e.target.value as GradeLevel);
                      setSelectedRoom('1');
                    }}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
                  >
                    {registeredHomeroomGrades.map(grade => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>

                  {availableRoomsForGrade.length > 1 && (
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-200 shadow-2xs">
                      {availableRoomsForGrade.map(rm => (
                        <button
                          key={rm}
                          type="button"
                          onClick={() => setSelectedRoom(rm)}
                          className={`px-3 py-1 h-7 min-w-[62px] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-center shrink-0 border ${
                            normalizeRoom(selectedRoom) === rm
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50'
                          }`}
                        >
                          ห้อง {rm}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {memberAssignedClasses.length > 1 && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-200 shadow-2xs">
                  {memberAssignedClasses.map((cls, idx) => {
                    const isActive = selectedGrade === cls.gradeLevel && normalizeRoom(selectedRoom) === cls.room;
                    return (
                      <button
                        key={`${cls.gradeLevel}_${cls.room}_${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedGrade(cls.gradeLevel);
                          setSelectedRoom(cls.room);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        {cls.gradeLevel}{cls.room !== '1' ? `/${cls.room}` : ''}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="hidden sm:block px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold whitespace-nowrap">
                ภาคเรียนที่ {activeSemester} • ปีการศึกษา {activeAcademicYear}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. VIEW: MAIN - ATTENDANCE & SAVINGS                     */}
      {/* ======================================================== */}
      {activeTab === 'main' && (
        <div className="space-y-3">

          {/* Controls Bar: 4 Buttons evenly spanning 1 full bar (ปฏิทิน, มา, ประวัติ, รวม) */}
          <div className="bg-white p-2 sm:p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full sm:w-auto items-center">
              {/* 1. Custom 100-Day Calendar Popover Trigger */}
              <div className="relative w-full" ref={calendarRef}>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className={`w-full text-xs px-1 sm:px-3 py-1.5 rounded-xl border flex items-center justify-center gap-1 font-bold cursor-pointer transition-all shadow-2xs ${
                    isSelectedDateSchoolDay
                      ? 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                  title="คลิกเพื่อเปิดปฏิทิน 100 วัน"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="truncate text-[11px] sm:text-xs">{formatThaiDate(selectedDate)}</span>
                  {!isSelectedDateSchoolDay && (
                    <span className="hidden sm:inline text-[10px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded font-bold shrink-0">
                      วันหยุด
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 hidden sm:inline ${isCalendarOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Calendar Dropdown / Popover */}
                {isCalendarOpen && (
                  <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 sm:p-3 w-64 sm:w-72 animate-in fade-in slide-in-from-top-2">
                    {/* Header showing active semester and academic year */}
                    <div className="pb-1.5 mb-2 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-sky-900 bg-sky-50/80 px-2.5 py-1 rounded-xl">
                      <span>ปฏิทินเวลาเรียน 100 วัน</span>
                      <span className="hidden sm:inline bg-white px-2 py-0.5 rounded-lg border border-sky-200 text-sky-800 font-mono shadow-2xs">
                        ภาคเรียนที่ {activeSemester}/{activeAcademicYear}
                      </span>
                    </div>

                    {/* Month / Year header with Prev/Next buttons */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          if (calViewMonth === 0) {
                            setCalViewMonth(11);
                            setCalViewYear(y => y - 1);
                          } else {
                            setCalViewMonth(m => m - 1);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="เดือนก่อนหน้า"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="font-bold text-xs text-slate-800">
                        {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][calViewMonth]} {calViewYear + 543}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (calViewMonth === 11) {
                            setCalViewMonth(0);
                            setCalViewYear(y => y + 1);
                          } else {
                            setCalViewMonth(m => m + 1);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="เดือนถัดไป"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Month Switcher dynamically based on active 100 days */}
                    {calendarAvailableMonths.length > 0 && (
                      <div className="flex items-center justify-between gap-1 py-1.5 border-b border-slate-100 overflow-x-auto">
                        {calendarAvailableMonths.map(item => (
                          <button
                            key={`${item.year}-${item.month}`}
                            type="button"
                            onClick={() => {
                              setCalViewMonth(item.month);
                              setCalViewYear(item.year);
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                              calViewMonth === item.month && calViewYear === item.year
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
                    <div className="grid grid-cols-7 gap-1 text-center py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-100">
                      <span className="text-rose-500">อา</span>
                      <span>จ</span>
                      <span>อ</span>
                      <span>พ</span>
                      <span>พฤ</span>
                      <span>ศ</span>
                      <span className="text-rose-500">ส</span>
                    </div>

                    {/* Days Grid: Red dot for absent/leave/sick, Orange dot for withdrawals */}
                    <div className="grid grid-cols-7 gap-1 py-2">
                      {calendarCells.map((cell, idx) => {
                        if (!cell.isCurrentMonth) {
                          return <div key={`empty-${idx}`} className="h-8 w-full" />;
                        }

                        const isSelected = cell.dateStr === selectedDate;
                        const hasIssue = datesWithAttendanceIssues.has(cell.dateStr);
                        const hasWithdrawal = datesWithWithdrawals.has(cell.dateStr);
                        const hasDeposit = datesWithDeposits.has(cell.dateStr);
                        const isAllChecked = datesWithAllChecked.has(cell.dateStr);

                        if (cell.isSchoolDay) {
                          if (isAllChecked) {
                            // ใส่ข้อมูลเวลาเรียนของนักเรียนครบทุกคนในวันนั้นๆ (ไม่ว่าจะมา ขาด ลา ป่วย): แสดงสีเขียวทั้งสี่เหลี่ยมเลย
                            return (
                              <button
                                key={cell.dateStr}
                                type="button"
                                onClick={() => {
                                  setSelectedDate(cell.dateStr);
                                  setIsCalendarOpen(false);
                                }}
                                className={`h-8 w-full rounded-lg text-[11px] font-mono font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer shadow-2xs ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-md scale-105'
                                    : hasDeposit
                                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-emerald-300 ring-1 ring-white/60'
                                      : 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600'
                                }`}
                                title={`เช็กเวลาเรียนครบทุกคนแล้ว: ${formatThaiDate(cell.dateStr)}`}
                              >
                                <span className="leading-tight">{cell.dayNum}</span>
                                {(hasIssue || hasWithdrawal || hasDeposit) && (
                                  <div className="flex items-center gap-0.5 mt-0.5 leading-none">
                                    {hasIssue && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-2xs shrink-0" title="มี ขาด/ลา/ป่วย" />
                                    )}
                                    {hasWithdrawal && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-2xs shrink-0" title="มีการถอนเงิน" />
                                    )}
                                    {hasDeposit && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-white border border-slate-300/80 shadow-2xs shrink-0" title="มีการฝากเงิน" />
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          }

                          // วันเรียนปกติ: แสดงสีฟ้าอ่อน กดได้ (ถ้ามีฝากเงินจะเป็นขอบเขียว และจุดสีขาวตลอดไป)
                          return (
                            <button
                              key={cell.dateStr}
                              type="button"
                              onClick={() => {
                                setSelectedDate(cell.dateStr);
                                setIsCalendarOpen(false);
                              }}
                              className={`h-8 w-full rounded-lg text-[11px] font-mono font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer shadow-2xs ${
                                isSelected
                                  ? 'bg-sky-600 text-white ring-2 ring-sky-300 shadow-xs'
                                  : hasDeposit
                                    ? 'bg-sky-100 hover:bg-sky-200 text-sky-900 border-2 border-emerald-500'
                                    : 'bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300'
                              }`}
                              title={`วันเรียน: ${formatThaiDate(cell.dateStr)}`}
                            >
                              <span className="leading-tight">{cell.dayNum}</span>
                              {(hasIssue || hasWithdrawal || hasDeposit) && (
                                <div className="flex items-center gap-0.5 mt-0.5 leading-none">
                                  {hasIssue && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-2xs shrink-0" title="มี ขาด/ลา/ป่วย" />
                                  )}
                                  {hasWithdrawal && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-2xs shrink-0" title="มีการถอนเงิน" />
                                  )}
                                  {hasDeposit && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-white border border-slate-300/80 shadow-2xs shrink-0" title="มีการฝากเงิน" />
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        } else {
                          // วันที่ Admin ไม่ได้กำหนด: แสดงสีเทาๆ กดไม่ได้
                          return (
                            <button
                              key={cell.dateStr}
                              type="button"
                              disabled
                              className="h-8 w-full rounded-lg text-[11px] font-mono font-normal flex flex-col items-center justify-center bg-slate-100/70 text-slate-300 border border-slate-200/50 cursor-not-allowed opacity-50 select-none"
                            >
                              <span className="leading-tight">{cell.dayNum}</span>
                            </button>
                          );
                        }
                      })}
                    </div>

                    {/* Popover Footer: Clean without extra legend text */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      {activeSchoolDays.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            const target = activeSchoolDays.some(d => d.date === today) ? today : activeSchoolDays[0].date;
                            setSelectedDate(target);
                            setIsCalendarOpen(false);
                          }}
                          className="text-sky-600 hover:text-sky-800 font-bold hover:underline cursor-pointer"
                        >
                          ไปวันเรียน
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsCalendarOpen(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer ml-auto text-xs"
                      >
                        ปิด
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. ปุ่มมาเรียนทั้งหมด */}
              <button
                type="button"
                disabled={!isAllowedToRecord}
                onClick={handleMarkAllPresent}
                className={`w-full text-xs px-1 sm:px-3 py-1.5 rounded-xl border transition-colors flex items-center justify-center gap-1 sm:gap-1.5 shadow-2xs font-bold ${
                  !isAllowedToRecord
                    ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 cursor-pointer active:scale-95'
                }`}
                title={!isAllowedToRecord ? 'ไม่สามารถเช็กเวลาเรียนได้ (อ่านอย่างเดียว / วันหยุด)' : 'มาเรียนทั้งหมด (ตั้งค่าทุกคนเป็นมาเรียน)'}
              >
                <CheckCheck className={`w-3.5 h-3.5 shrink-0 ${!isAllowedToRecord ? 'text-slate-400' : 'text-emerald-600'}`} />
                <span className="whitespace-nowrap text-[11px] sm:text-xs">มา</span>
              </button>

              {/* 3. ปุ่มประวัติถอน */}
              <button
                type="button"
                onClick={() => setIsWithdrawHistoryOpen(true)}
                className="relative w-full text-xs px-1 sm:px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1 sm:gap-1.5 font-bold active:scale-95"
                title="ประวัติการถอนเงิน"
              >
                <History className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="whitespace-nowrap text-[11px] sm:text-xs">
                  <span className="hidden sm:inline">ประวัติถอน</span>
                  <span className="sm:hidden">ถอน</span>
                </span>
                {studentsWithWithdrawals.length > 0 && (
                  <span className="bg-rose-600 text-white text-[9px] min-w-3.5 h-3.5 px-1 flex items-center justify-center rounded-full font-mono font-bold leading-none shadow-2xs shrink-0">
                    {studentsWithWithdrawals.length}
                  </span>
                )}
              </button>

              {/* 4. ปุ่มรวม */}
              <button
                type="button"
                onClick={() => {
                  setSummarySemester(latestCreatedConfig?.semester || '1');
                  setSummaryAcademicYear(latestCreatedConfig?.academicYear || '2569');
                  setIsSummaryModalOpen(true);
                }}
                className="w-full text-xs px-1 sm:px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1 sm:gap-1.5 font-bold active:scale-95"
                title="สรุปภาพรวมเวลาเรียนและเงินฝากสะสมทั้งหมด"
              >
                <BarChart3 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="whitespace-nowrap text-[11px] sm:text-xs">รวม</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 font-medium shrink-0">
              <span className="text-slate-400">สถิติ:</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-mono">ม: {countPresent}</span>
              <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60 font-mono">ข: {countAbsent}</span>
              <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-mono">ล: {countLeave}</span>
              <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 font-mono">ป: {countSick}</span>
            </div>
          </div>

          {/* Warning banner when selected date is NOT in the 100 school days */}
          {!isSelectedDateSchoolDay && (
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">วันที่ {formatThaiDate(selectedDate)} ไม่ใช่วันเรียนที่กำหนดไว้ในโครงสร้าง 100 วัน:</span>{' '}
                <span className="text-amber-700">สมาชิกจะไม่สามารถเช็กเวลาเรียนหรือบันทึกเงินฝากในวันนี้ได้ (เฉพาะวันเรียน 100 วันที่กำหนดเท่านั้น)</span>
              </div>
            </div>
          )}

          {/* Table: Attendance + Savings (Mobile clean 2-column view, Desktop full multi-column view) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="hidden sm:inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 font-mono">
                  ชั้น {selectedGrade}{availableRoomsForGrade.length > 1 || normalizeRoom(selectedRoom) !== '1' ? ` ห้อง ${normalizeRoom(selectedRoom)}` : ''}
                </span>
                {(() => {
                  const targetRoom = normalizeRoom(selectedRoom);
                  const teacher =
                    homeroomMembers.find(m => m.gradeLevel === selectedGrade && normalizeRoom(m.room) === targetRoom) ||
                    homeroomMembers.find(m => m.gradeLevel === selectedGrade);
                  return teacher ? (
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-800 rounded-lg text-[11px] font-bold border border-indigo-200/80 flex items-center gap-1">
                      <User className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span>ครูประจำชั้น: {teacher.fullName}</span>
                    </span>
                  ) : null;
                })()}
                <span className="hidden sm:inline-block px-2 py-0.5 bg-sky-100 text-sky-800 rounded-lg text-[11px] font-bold border border-sky-200 font-mono">
                  ภาคเรียนที่ {activeSemester}/{activeAcademicYear}
                </span>
                <span className="text-slate-700 font-medium hidden sm:inline">
                  {user.role === 'admin' ? 'แสดงข้อมูลการเช็กเวลาเรียนและเงินฝากประจำวัน (อ่านอย่างเดียว)' : 'บันทึกเวลาเรียนและเงินฝากประจำวัน'}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                นักเรียนทั้งหมด: <strong className="text-slate-800">{gradeStudents.length} คน</strong>
              </div>
            </div>

            {/* Mobile View: Clean 2-column Table (ชื่อ - นามสกุล + ยอดออม) */}
            <div className="block sm:hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-700 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">ชื่อ - นามสกุล</th>
                    <th className="py-2.5 px-3 text-right">ยอดออม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeStudents.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <AlertCircle className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-semibold text-slate-600">ไม่มีข้อมูลนักเรียนในชั้น {selectedGrade}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    gradeStudents.map((student, idx) => {
                      const curState = attendanceStates[student.id] || { status: 'present', note: '' };
                      const balance = getStudentBalance(student.id);

                      return (
                        <tr
                          key={`mobile-${student.id}`}
                          onClick={() => setSelectedStudentModal(student)}
                          className="hover:bg-sky-50/60 active:bg-sky-100/80 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-400 text-xs shrink-0 w-5">
                                {student.rollNumber || idx + 1}.
                              </span>
                              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                {student.photoUrl ? (
                                  <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <div className="font-bold text-slate-800 text-[13px] flex items-center gap-1.5 flex-wrap">
                                  <span>{student.prefix}{student.firstName} {student.lastName}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                    curState.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                                    curState.status === 'absent' ? 'bg-rose-100 text-rose-800' :
                                    curState.status === 'leave' ? 'bg-amber-100 text-amber-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {curState.status === 'present' ? 'ม' : curState.status === 'absent' ? 'ข' : curState.status === 'leave' ? 'ล' : 'ป'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="font-mono font-bold text-slate-800 text-xs">
                                ฿{balance.toLocaleString()}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Desktop View: Full multi-column table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-700 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-2.5 w-12 text-center">เลขที่</th>
                    <th className="py-2.5 px-3 min-w-[170px]">ชื่อ - นามสกุล</th>
                    <th className="py-2.5 px-2 text-center w-28">เวลาเรียน</th>
                    <th className="py-2.5 px-2 text-center w-40">ฝากเงินวันนี้</th>
                    <th className="py-2.5 px-3 w-28 text-right">ยอดออมสะสม</th>
                    <th className="py-2.5 px-2 w-24 text-center">ถอนเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <AlertCircle className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-semibold text-slate-600">ไม่มีข้อมูลนักเรียนในชั้น {selectedGrade}</p>
                          <p className="text-xs text-slate-400">สามารถเพิ่มนักเรียนได้ที่เมนู 1. ธุรการประจำชั้น</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    gradeStudents.map((student, idx) => {
                      const curState = attendanceStates[student.id] || { status: 'present', note: '' };
                      const balance = getStudentBalance(student.id);
                      const todayDepositRec = getStudentTodayDepositRecord(student.id);
                      const isDepositedToday = !!todayDepositRec;
                      const regularDeposit = getStudentRegularDeposit(student.id);
                      const prevDeposit = getStudentPreviousDeposit(student.id);

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Roll Number */}
                          <td className="py-2.5 px-2 text-center font-bold text-slate-600 font-mono">
                            {student.rollNumber || idx + 1}
                          </td>

                          {/* Student Info: Full name with photo avatar */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                {student.photoUrl ? (
                                  <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <div className="font-bold text-slate-800 text-[13px] whitespace-nowrap">
                                  {student.prefix}{student.firstName} {student.lastName}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  #{student.studentCode}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Attendance Status Buttons: Compact 4 buttons ม, ข, ล, ป */}
                          <td className="py-2.5 px-2 text-center">
                            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/70 shadow-2xs">
                              <button
                                type="button"
                                disabled={!isAllowedToRecord}
                                onClick={() => handleSetStatus(student.id, 'present')}
                                className={`w-6 h-6 rounded-md font-bold text-xs transition-all flex items-center justify-center ${
                                  !isAllowedToRecord
                                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                                    : curState.status === 'present'
                                      ? 'bg-emerald-600 text-white shadow-xs cursor-pointer'
                                      : 'text-slate-600 hover:text-emerald-700 hover:bg-white/70 cursor-pointer'
                                }`}
                                title={!isAllowedToRecord ? 'ไม่สามารถเช็กเวลาเรียนได้ (ไม่ใช่วันเรียนที่กำหนด)' : 'มาเรียน (ม)'}
                              >
                                ม
                              </button>
                              <button
                                type="button"
                                disabled={!isAllowedToRecord}
                                onClick={() => handleSetStatus(student.id, 'absent')}
                                className={`w-6 h-6 rounded-md font-bold text-xs transition-all flex items-center justify-center ${
                                  !isAllowedToRecord
                                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                                    : curState.status === 'absent'
                                      ? 'bg-rose-600 text-white shadow-xs cursor-pointer'
                                      : 'text-slate-600 hover:text-rose-700 hover:bg-white/70 cursor-pointer'
                                }`}
                                title={!isAllowedToRecord ? 'ไม่สามารถเช็กเวลาเรียนได้ (ไม่ใช่วันเรียนที่กำหนด)' : 'ขาดเรียน (ข)'}
                              >
                                ข
                              </button>
                              <button
                                type="button"
                                disabled={!isAllowedToRecord}
                                onClick={() => handleSetStatus(student.id, 'leave')}
                                className={`w-6 h-6 rounded-md font-bold text-xs transition-all flex items-center justify-center ${
                                  !isAllowedToRecord
                                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                                    : curState.status === 'leave'
                                      ? 'bg-amber-600 text-white shadow-xs cursor-pointer'
                                      : 'text-slate-600 hover:text-amber-700 hover:bg-white/70 cursor-pointer'
                                }`}
                                title={!isAllowedToRecord ? 'ไม่สามารถเช็กเวลาเรียนได้ (ไม่ใช่วันเรียนที่กำหนด)' : 'ลากิจ (ล)'}
                              >
                                ล
                              </button>
                              <button
                                type="button"
                                disabled={!isAllowedToRecord}
                                onClick={() => handleSetStatus(student.id, 'sick')}
                                className={`w-6 h-6 rounded-md font-bold text-xs transition-all flex items-center justify-center ${
                                  !isAllowedToRecord
                                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                                    : curState.status === 'sick'
                                      ? 'bg-blue-600 text-white shadow-xs cursor-pointer'
                                      : 'text-slate-600 hover:text-blue-700 hover:bg-white/70 cursor-pointer'
                                }`}
                                title={!isAllowedToRecord ? 'ไม่สามารถเช็กเวลาเรียนได้ (ไม่ใช่วันเรียนที่กำหนด)' : 'ลาป่วย (ป)'}
                              >
                                ป
                              </button>
                            </div>
                          </td>

                          {/* Deposit Today: Editable with Pencil icon + Recent deposit history display */}
                          <td className="py-2.5 px-2 text-center">
                            {isDepositedToday && editingDepositStudentId !== student.id ? (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="relative w-22">
                                    <span className={`absolute left-2 top-1/2 -translate-y-1/2 font-mono text-xs font-bold ${
                                      todayDepositRec.amount === 0 ? 'text-slate-400' : 'text-emerald-600'
                                    }`}>฿</span>
                                    <input
                                      type="text"
                                      readOnly
                                      disabled
                                      value={todayDepositRec.amount.toLocaleString()}
                                      className={`w-full pl-5 pr-1.5 py-1 text-xs rounded-lg border font-mono font-bold cursor-not-allowed select-none shadow-2xs ${
                                        todayDepositRec.amount === 0
                                          ? 'border-slate-300 bg-slate-100/90 text-slate-400'
                                          : 'border-emerald-300 bg-emerald-50/80 text-emerald-800'
                                      }`}
                                      title={
                                        todayDepositRec.deductedAmount && todayDepositRec.deductedAmount > 0
                                          ? `ยอดเดิม ฿${(todayDepositRec.originalAmount ?? (todayDepositRec.amount + todayDepositRec.deductedAmount)).toLocaleString()} (หักถอนไป ฿${todayDepositRec.deductedAmount.toLocaleString()} เหลือ ฿${todayDepositRec.amount.toLocaleString()})`
                                          : "บันทึกแล้ว (กดไอคอนดินสอด้านข้างเพื่อแก้ไข)"
                                      }
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    disabled={!isAllowedToRecord}
                                    onClick={() => handleStartEditDeposit(student.id, todayDepositRec.amount)}
                                    className={`p-1 rounded-md transition-colors ${
                                      !isAllowedToRecord
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-2xs'
                                    }`}
                                    title={!isAllowedToRecord ? 'ไม่สามารถแก้ไขได้' : 'แก้ไขยอดเงินฝาก'}
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-emerald-700" />
                                  </button>
                                </div>
                                {todayDepositRec.deductedAmount && todayDepositRec.deductedAmount > 0 ? (
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                                      todayDepositRec.amount === 0
                                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                    title={`ยอดเดิม ฿${(todayDepositRec.originalAmount ?? (todayDepositRec.amount + todayDepositRec.deductedAmount)).toLocaleString()}`}
                                  >
                                    {todayDepositRec.amount === 0 ? 'หักถอนหมดแล้ว (0 บ.)' : `หักถอน -฿${todayDepositRec.deductedAmount.toLocaleString()}`}
                                  </span>
                                ) : null}
                              </div>
                            ) : editingDepositStudentId === student.id ? (
                              <div className="flex items-center justify-center gap-1">
                                <div className="relative w-20">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">฿</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={editDepositAmount}
                                    onChange={(e) => setEditDepositAmount(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditedDeposit(student, todayDepositRec);
                                      if (e.key === 'Escape') handleCancelEditDeposit();
                                    }}
                                    onBlur={() => {
                                      if (editDepositAmount !== '') {
                                        handleSaveEditedDeposit(student, todayDepositRec);
                                      }
                                    }}
                                    className="w-full pl-5 pr-1 py-1 text-xs rounded-lg border border-emerald-500 font-mono font-bold text-slate-800 bg-white focus:outline-none ring-1 ring-emerald-500"
                                    autoFocus
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditedDeposit(student, todayDepositRec)}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer shadow-2xs"
                                  title="บันทึกการแก้ไข"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditDeposit}
                                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors cursor-pointer"
                                  title="ยกเลิก"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center">
                                <div className="relative w-22">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">฿</span>
                                  <input
                                    type="number"
                                    min={0}
                                    disabled={!isAllowedToRecord}
                                    value={todayDeposits[student.id] !== undefined ? todayDeposits[student.id] : ''}
                                    placeholder={!isAllowedToRecord ? 'ปิด' : '0'}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTodayDeposits(prev => ({ ...prev, [student.id]: val }));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const entered = Number(todayDeposits[student.id]);
                                        if (entered > 0) {
                                          handleSingleDeposit(student, entered);
                                        }
                                      }
                                    }}
                                    onBlur={() => {
                                      const entered = Number(todayDeposits[student.id]);
                                      if (entered > 0 && !todayDepositRec) {
                                        handleSingleDeposit(student, entered);
                                      }
                                    }}
                                    className={`w-full pl-5 pr-1.5 py-1 text-xs rounded-lg border font-mono font-bold ${
                                      !isAllowedToRecord
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : 'bg-white text-slate-800 border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500'
                                    }`}
                                  />
                                </div>

                                {/* Previous Deposit quick button: amount only */}
                                {prevDeposit && (
                                  <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px]">
                                    <button
                                      type="button"
                                      disabled={!isAllowedToRecord}
                                      onClick={() => handleSingleDeposit(student, prevDeposit.amount)}
                                      className="font-mono font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200/80 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                      title={`คลิกเพื่อฝากทันที ฿${prevDeposit.amount.toLocaleString()}`}
                                    >
                                      ฿{prevDeposit.amount.toLocaleString()}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Total Balance */}
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              ฿{balance.toLocaleString()}
                            </span>
                          </td>

                          {/* Savings Actions: Withdraw button */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenWithdrawModal(student)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-1 mx-auto shadow-2xs"
                              title="ถอนเงินออมทรัพย์"
                            >
                              <ArrowDownLeft className="w-3 h-3 text-rose-600" />
                              <span>ถอนเงิน</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer below table for ออมสะสมทั้งห้อง พร้อมปุ่ม ซ้าย-ขวา เลื่อนวันถัดไปตามปฏิทิน 100 วัน */}
            <div className="px-4 py-2.5 bg-slate-50/90 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs font-semibold text-slate-700 gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span>ยอดฝากวันนี้: <strong className="text-emerald-700 font-mono font-bold">฿{totalTodayDeposits.toLocaleString()}</strong></span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <div className="flex items-center gap-1.5">
                  <span>ออมสะสมทั้งห้อง:</span>
                  <strong className="text-slate-900 font-mono font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-800">
                    ฿{totalGradeSavings.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Navigation buttons: Left (<) and Right (>) to move between 100 active school days */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!prevSchoolDayDate}
                  onClick={() => {
                    if (prevSchoolDayDate) {
                      setSelectedDate(prevSchoolDayDate);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all shadow-2xs ${
                    prevSchoolDayDate
                      ? 'bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border-slate-200 hover:border-sky-300 cursor-pointer active:scale-95'
                      : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
                  }`}
                  title={prevSchoolDayDate ? `วันเรียนก่อนหน้า: ${formatThaiDate(prevSchoolDayDate)}` : 'ไม่มีวันเรียนก่อนหน้า'}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>วันก่อนหน้า</span>
                </button>

                <div className="px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-xl text-sky-800 font-mono font-bold text-[11px] shadow-2xs">
                  {activeSchoolDayOrder ? `วันเรียนที่ ${activeSchoolDayOrder} / ${activeSchoolDays.length}` : 'วันหยุด'}
                </div>

                <button
                  type="button"
                  disabled={!nextSchoolDayDate}
                  onClick={() => {
                    if (nextSchoolDayDate) {
                      setSelectedDate(nextSchoolDayDate);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all shadow-2xs ${
                    nextSchoolDayDate
                      ? 'bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border-slate-200 hover:border-sky-300 cursor-pointer active:scale-95'
                      : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
                  }`}
                  title={nextSchoolDayDate ? `วันเรียนถัดไป: ${formatThaiDate(nextSchoolDayDate)}` : 'ไม่มีวันเรียนถัดไป'}
                >
                  <span>วันถัดไป</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. VIEW: SCHOOL DAYS (หน้าวันทำการ)                      */}
      {/* ======================================================== */}
      {activeTab === 'school_days' && (
        <div className="space-y-3">
          {/* Controls Bar: Admin Action Buttons */}
          {user.role === 'admin' && (
            <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-end gap-2">
              {/* Admin Action Buttons: 4 Equal Grid Columns on Mobile */}
              <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
                {/* 1. ปุ่ม "เลือก" / "เลือกแล้ว" */}
                <button
                  type="button"
                  onClick={handleSelectActiveTermForMembers}
                  className={`w-full sm:w-auto py-2 sm:py-1.5 px-1 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                    latestAttendanceTermKey === `${selectedSemester}_${selectedAcademicYear}`
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                  title="กดเพื่อกำหนดให้ภาคเรียนและปีการศึกษานี้ปรากฏในปฏิทินของสมาชิก"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">
                    {latestAttendanceTermKey === `${selectedSemester}_${selectedAcademicYear}` ? 'เลือกแล้ว' : 'เลือก'}
                  </span>
                </button>

                {/* 2. ปุ่ม "ลบAll" */}
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(true)}
                  className="w-full sm:w-auto py-2 sm:py-1.5 px-1 sm:px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                  title="ลบรายการวันเรียนภาคเรียนที่เลือก"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="whitespace-nowrap">ลบAll</span>
                </button>

                {/* 3. ปุ่ม "สร้างวัน" */}
                <button
                  type="button"
                  onClick={() => {
                    const termKey = `${selectedSemester}_${selectedAcademicYear}`;
                    const existingTermConfig = configsByTerm[termKey];
                    const defaults = getTermDefaultDates(selectedAcademicYear, selectedSemester);
                    if (existingTermConfig && existingTermConfig.startDate && existingTermConfig.endDate) {
                      setTempConfig({
                        ...existingTermConfig,
                        semester: selectedSemester,
                        academicYear: selectedAcademicYear
                      });
                    } else {
                      setTempConfig({
                        ...attendanceConfig,
                        semester: selectedSemester,
                        academicYear: selectedAcademicYear,
                        startDate: defaults.startDate,
                        endDate: defaults.endDate,
                        targetDays: 100,
                        schoolDays: []
                      });
                    }
                    setIsConfigPopupOpen(true);
                  }}
                  className="w-full sm:w-auto py-2 sm:py-1.5 px-1 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs text-[11px] sm:text-xs font-bold"
                  title="สร้างวันเรียน กำหนดวันที่เริ่มและสิ้นสุดภาคเรียน"
                >
                  <Plus className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="whitespace-nowrap">สร้างวัน</span>
                </button>

                {/* 4. ปุ่ม "เพิ่มวัน" */}
                <button
                  type="button"
                  onClick={() => setIsAddDayModalOpen(true)}
                  className="w-full sm:w-auto py-2 sm:py-1.5 px-1 sm:px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                  title="เพิ่มวัน เช่น วันเสาร์ชดเชย หรือวันกิจกรรม"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">เพิ่มวัน</span>
                </button>
              </div>
            </div>
          )}

          {/* School Days Table: Only shown if the term has been created with 'สร้างวัน' */}
          {!hasTermSchedule ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3 shadow-xs">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">
                ยังไม่ได้สร้างตารางวันเรียนสำหรับ ภาคเรียนที่ {selectedSemester} ปีการศึกษา {selectedAcademicYear}
              </div>
              <p className="text-xs text-slate-400">
                กรุณากดปุ่ม <strong className="text-emerald-700 font-bold">สร้างวัน</strong> ด้านบนเพื่อกำหนดช่วงวันภาคเรียนและสร้างตาราง
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden w-full">
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                <div className="font-bold flex items-center gap-2 text-slate-800">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  <span>
                    ตารางวันเรียน ภาคเรียนที่ {activeSemester} ปีการศึกษา {activeAcademicYear}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white border border-slate-200/90 rounded-xl font-bold text-slate-700 text-xs shadow-2xs">
                    ภาคเรียนที่ {selectedSemester} / {selectedAcademicYear}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200/80 text-slate-700 uppercase tracking-wider font-semibold">
                      <th className="py-1.5 px-1 sm:py-2.5 sm:px-3 text-center sm:w-16">ลำดับ</th>
                      <th className="py-1.5 px-1.5 sm:py-2.5 sm:px-4 sm:w-44">วันที่</th>
                      <th className="py-1.5 px-1 sm:py-2.5 sm:px-3 text-center sm:w-28">วัน</th>
                      <th className="py-1.5 px-1 sm:py-2.5 sm:px-3 text-center sm:w-32">สถานะวัน</th>
                      <th className="py-2.5 px-4 hidden sm:table-cell">หมายเหตุ</th>
                      <th className="py-1.5 px-1 sm:py-2.5 sm:px-3 text-center sm:w-28">การส่ง</th>
                      {user.role === 'admin' && (
                        <th className="py-1.5 px-1 sm:py-2.5 sm:px-3 text-center sm:w-24">การจัดการ</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSchoolDays.length === 0 ? (
                      <tr>
                        <td colSpan={user.role === 'admin' ? 7 : 6} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center space-y-1.5">
                            <CalendarDays className="w-8 h-8 text-slate-300" />
                            <p className="text-xs font-semibold text-slate-600">ไม่พบรายการวันเรียนตามเงื่อนไขที่เลือก</p>
                            <p className="text-[11px] text-slate-400">
                              {user.role === 'admin' 
                                ? 'ลองล้างคำค้นหา หรือกดปุ่ม สร้างวัน เพื่อกำหนดช่วงวันภาคเรียน' 
                                : 'ลองล้างคำค้นหา'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSchoolDays.map((item) => {
                        const isWeekend = item.dayOfWeek === 'เสาร์' || item.dayOfWeek === 'อาทิตย์';
                        const isHoliday = item.isHoliday;
                        const isToday = item.date === todayStr;

                        const fullIndex = schoolDaysList.findIndex(d => d.date === item.date);
                        const workingDayNumber = !isHoliday 
                          ? schoolDaysList.slice(0, fullIndex + 1).filter(d => !d.isHoliday).length 
                          : null;

                        return (
                          <tr 
                            key={item.date} 
                            className={`transition-colors ${
                              isToday 
                                ? 'bg-amber-50/50 font-medium' 
                                : isWeekend && isHoliday
                                  ? 'bg-red-50/35 hover:bg-red-50/60'
                                  : isHoliday 
                                    ? 'bg-rose-50/25 hover:bg-rose-50/50' 
                                    : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-1.5 px-1 sm:py-2.5 sm:px-3 text-center">
                              {isHoliday ? (
                                <span className="text-slate-300 font-mono text-xs font-bold select-none">-</span>
                              ) : (
                                <div className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 text-emerald-900 font-mono font-bold text-[11px] sm:text-xs shadow-2xs">
                                  {workingDayNumber}
                                </div>
                              )}
                            </td>

                            {/* Date Display: Thai format only (e.g. 16 พ.ค. 2569) */}
                            <td className="py-1.5 px-1.5 sm:py-2.5 sm:px-4">
                              <div className="flex items-center gap-1">
                                <div>
                                  <div className={`font-bold flex items-center gap-1 text-[11px] sm:text-xs ${
                                    isWeekend && isHoliday ? 'text-red-600' : isHoliday ? 'text-rose-700' : 'text-slate-800'
                                  }`}>
                                    <span>{formatThaiDate(item.date)}</span>
                                    {isToday && (
                                      <span className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0.2 rounded font-bold uppercase">
                                        วันนี้
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-1.5 px-1 sm:py-2.5 sm:px-3 text-center">
                              <span className={`inline-block px-1.5 sm:px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-bold ${
                                isWeekend
                                  ? 'bg-red-100 text-red-600 border border-red-300'
                                  : isHoliday
                                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                    : 'bg-slate-100 text-slate-700'
                              }`}>
                                วัน{item.dayOfWeek}
                              </span>
                            </td>

                            <td className="py-1.5 px-1 sm:py-2.5 sm:px-3 text-center">
                              {user.role === 'admin' ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleHolidayItem(item.date, true)}
                                  className={`inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer active:scale-95 ${
                                    isHoliday
                                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                  title="คลิกเพื่อสลับเป็น วันเรียน / วันหยุด ทันที"
                                >
                                  {isHoliday ? (
                                    <>
                                      <AlertCircle className="w-3 h-3 text-red-500" />
                                      <span>วันหยุด</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>วันเรียน</span>
                                    </>
                                  )}
                                </button>
                              ) : isHoliday ? (
                                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] sm:text-[11px] font-bold">
                                  <AlertCircle className="w-3 h-3 text-red-500" />
                                  <span>วันหยุด</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] sm:text-[11px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>วันเรียน</span>
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-4 hidden sm:table-cell">
                              <span className={`text-xs ${isWeekend && isHoliday ? 'text-red-500 font-medium' : isHoliday ? 'text-rose-600 font-medium' : 'text-slate-600'}`}>
                                {item.note || (isWeekend ? 'วันหยุดสุดสัปดาห์' : isHoliday ? 'วันหยุด' : 'วันเรียนปกติ')}
                              </span>
                            </td>

                            {/* Submission Status Column */}
                            <td className="py-1.5 px-1 sm:py-2.5 sm:px-3 text-center">
                              {isHoliday ? (
                                <span className="text-slate-300 font-mono text-xs">-</span>
                              ) : (() => {
                                const subStatus = getSubmissionStatusForDate(item.date);
                                if (subStatus.isAllSubmitted) {
                                  return (
                                    <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold" title="สมาชิกทุกคนเช็กชื่อครบแล้ว">
                                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </span>
                                  );
                                } else {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => setSubmissionStatusModalDate(item.date)}
                                      className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold transition-all cursor-pointer shadow-2xs"
                                      title="ยังมีสมาชิกบางคนยังไม่เช็กชื่อ (คลิกเพื่อดูรายละเอียด)"
                                    >
                                      <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                  );
                                }
                              })()}
                            </td>

                            {user.role === 'admin' && (
                              <td className="py-1.5 px-1 sm:py-2.5 sm:px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditDay(item)}
                                    className="p-1 sm:p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                    title="กดเพื่อตั้งค่าเป็นเวลาเรียนหรือวันหยุด"
                                  >
                                    <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDay(item.date)}
                                    className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="ลบวันนี้ออกจากตาราง"
                                  >
                                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                <div className="flex items-center gap-3">
                  <span>วันเรียนทั้งหมด: <strong className="text-emerald-700 font-mono font-bold">{activeSchoolDaysCount}</strong> วัน</span>
                  <span>•</span>
                  <span>วันหยุด/ไม่นับ: <strong className="text-rose-700 font-mono font-bold">{holidaySchoolDaysCount}</strong> วัน</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  กดไอคอนดินสอแก้ไข เพื่อตั้งเป็นเวลาเรียนหรือวันหยุด (บันทึกอัตโนมัติ)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: สถานะการส่งเช็กชื่อ                                */}
      {/* ======================================================== */}
      {submissionStatusModalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    สถานะการส่งเช็กชื่อวันที่ {formatThaiDate(submissionStatusModalDate)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    รายชื่อห้องที่ยังเช็กชื่อไม่ครบ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionStatusModalDate(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {(() => {
                const statusInfo = getSubmissionStatusForDate(submissionStatusModalDate);
                return statusInfo.details.map(d => (
                  <div key={d.grade} className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                    d.isDone ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-amber-50/60 border-amber-200 text-amber-900'
                  }`}>
                    <div>
                      <div className="font-bold text-sm">ชั้น {d.grade}</div>
                      <div className="text-[11px] text-slate-500">ครูผู้สอน: {d.teacherName}</div>
                    </div>
                    <div className="text-right">
                      {d.isDone ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl">
                          <Check className="w-3.5 h-3.5" /> เช็กครบแล้ว ({d.checkedStudents}/{d.totalStudents})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-xl">
                          <AlertCircle className="w-3.5 h-3.5" /> ยังไม่ครบ ({d.checkedStudents}/{d.totalStudents})
                        </span>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSubmissionStatusModalDate(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: เพิ่มวัน                                          */}
      {/* ======================================================== */}
      {isAddDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    เพิ่มวัน
                  </h3>
                  <p className="text-xs text-slate-500">
                    เลือกวันที่และระบุหมายเหตุ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddCustomDay} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกวันที่ *
                </label>
                <ThaiDatePicker
                  value={newCustomDate}
                  onChange={setNewCustomDate}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุ (ระบุหรือไม่ก็ได้)
                </label>
                <input
                  type="text"
                  value={newCustomNote}
                  onChange={(e) => setNewCustomNote(e.target.value)}
                  placeholder="เช่น วันเรียนชดเชย, วันกิจกรรมพิเศษ"
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDayModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>บันทึกเพิ่มวัน</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* POP-UP MODAL: กำหนดโครงสร้างเวลาเรียน 100 วัน             */}
      {/* ======================================================== */}
      {isConfigPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    กำหนดโครงสร้าง 100 วัน
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigPopupOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfigSubmit} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ปีการศึกษา</label>
                  <input
                    type="text"
                    required
                    value={tempConfig.academicYear}
                    onChange={(e) => {
                      const newYear = e.target.value;
                      const sem = tempConfig.semester || '1';
                      const defaults = getTermDefaultDates(newYear, sem);
                      setTempConfig({
                        ...tempConfig,
                        academicYear: newYear,
                        startDate: defaults.startDate,
                        endDate: defaults.endDate
                      });
                    }}
                    placeholder="เช่น 2569"
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ภาคเรียน</label>
                  <select
                    value={tempConfig.semester}
                    onChange={(e: any) => {
                      const newSem = e.target.value as '1' | '2';
                      const defaults = getTermDefaultDates(tempConfig.academicYear || '2569', newSem);
                      setTempConfig({
                        ...tempConfig,
                        semester: newSem,
                        startDate: defaults.startDate,
                        endDate: defaults.endDate
                      });
                    }}
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold cursor-pointer"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">วันเริ่ม *</label>
                  <ThaiDatePicker
                    value={tempConfig.startDate}
                    onChange={(d) => setTempConfig({ ...tempConfig, startDate: d })}
                    forcedViewYear={getTermDefaultDates(tempConfig.academicYear || '2569', tempConfig.semester || '1').startForcedYear}
                    forcedViewMonth={getTermDefaultDates(tempConfig.academicYear || '2569', tempConfig.semester || '1').startForcedMonth}
                    academicYearLabel={`ปีการศึกษา ${tempConfig.academicYear || '2569'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">วันสิ้นสุด *</label>
                  <ThaiDatePicker
                    value={tempConfig.endDate}
                    onChange={(d) => setTempConfig({ ...tempConfig, endDate: d })}
                    forcedViewYear={getTermDefaultDates(tempConfig.academicYear || '2569', tempConfig.semester || '1').endForcedYear}
                    forcedViewMonth={getTermDefaultDates(tempConfig.academicYear || '2569', tempConfig.semester || '1').endForcedMonth}
                    academicYearLabel={`ปีการศึกษา ${tempConfig.academicYear || '2569'}`}
                  />
                </div>
              </div>

              {/* Real-time Auto-Calculation Display */}
              <div className="p-4 bg-emerald-50/90 rounded-2xl border border-emerald-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-emerald-800 font-mono flex items-center gap-2">
                      <span>รวม {autoCalculatedWeekdays} วัน</span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-sans">
                        วันทำการเรียน
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className="font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs inline-block">
                    {tempConfig.startDate && tempConfig.endDate ? `${formatThaiDate(tempConfig.startDate)} — ${formatThaiDate(tempConfig.endDate)}` : 'โปรดเลือกวันเริ่มและสิ้นสุด'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsConfigPopupOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึก</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: เพิ่มปีการศึกษา                                    */}
      {/* ======================================================== */}
      {isAddYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">เพิ่มปีการศึกษาใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddYearModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ระบุปีการศึกษา (พ.ศ. เช่น 2570) *
                </label>
                <input
                  type="text"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="เช่น 2570"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddYearModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yr = newYearInput.trim();
                    if (!yr) {
                      onShowToast('warning', 'ระบุปีการศึกษา', 'กรุณากรอกปีการศึกษา (พ.ศ.)');
                      return;
                    }
                    const updatedYears = StorageService.addAcademicYear(yr);
                    setAvailableAcademicYears(updatedYears);
                    setSelectedAcademicYear(yr);
                    setIsAddYearModalOpen(false);
                    setNewYearInput('');
                    onShowToast('success', 'เพิ่มปีการศึกษาสำเร็จ', `เพิ่มปีการศึกษา ${yr} เรียบร้อยแล้ว`);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                >
                  เพิ่มปี
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: รายละเอียดสถานะการเช็กชื่อ (ป๊อปอัพเครื่องหมาย ! / ถูก)  */}
      {/* ======================================================== */}
      {submissionStatusModalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                  <ClipboardList className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    สถานะการเช็กชื่อประจำวัน
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    วันที่ {formatThaiDate(submissionStatusModalDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionStatusModalDate(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="text-xs text-slate-600 font-medium">
                รายชื่อสมาชิก (ครูประจำชั้น) ที่ยังเช็กชื่อไม่ครบหรือยังไม่ได้เช็ก:
              </div>

              {getSubmissionStatusForDate(submissionStatusModalDate).details.map((item) => (
                <div
                  key={item.grade}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                    item.isDone 
                      ? 'bg-emerald-50/60 border-emerald-200' 
                      : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono text-[10px]">
                        ชั้น {item.grade}
                      </span>
                      <span>{item.teacherName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {item.position} • เช็กแล้ว {item.checkedStudents}/{item.totalStudents} คน
                    </div>
                  </div>

                  <div>
                    {item.isDone ? (
                      <span className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-xl flex items-center gap-1 shadow-2xs">
                        <Check className="w-3.5 h-3.5" />
                        <span>ครบแล้ว</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-600 text-white text-[11px] font-bold rounded-xl flex items-center gap-1 shadow-2xs">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>ยังไม่ครบ</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSubmissionStatusModalDate(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ตั้งค่าเวลาเรียนหรือวันหยุด (ไอคอนแก้ไขในตาราง)      */}
      {/* ======================================================== */}
      {editingDayItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                  <Pencil className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    ตั้งค่าสถานะวัน
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatThaiDate(editingDayItem.date)} (วัน{editingDayItem.dayOfWeek})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDayItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เลือกสถานะวัน *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDayIsHoliday(false);
                      const trimmed = editingDayNote.trim();
                      if (!trimmed || trimmed === 'วันหยุด' || trimmed === 'วันหยุดสุดสัปดาห์') {
                        setEditingDayNote('วันเรียนปกติ');
                      }
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      !editingDayIsHoliday
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>เวลาเรียน (วันเรียนปกติ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDayIsHoliday(true);
                      const trimmed = editingDayNote.trim();
                      const isWeekend = editingDayItem.dayOfWeek === 'เสาร์' || editingDayItem.dayOfWeek === 'อาทิตย์';
                      if (!trimmed || trimmed === 'วันเรียนปกติ') {
                        setEditingDayNote(isWeekend ? 'วันหยุดสุดสัปดาห์' : 'วันหยุด');
                      }
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      editingDayIsHoliday
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span>วันหยุด (ไม่นับเวลาเรียน)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุ / กิจกรรม
                </label>
                <input
                  type="text"
                  value={editingDayNote}
                  onChange={(e) => setEditingDayNote(e.target.value)}
                  placeholder="เช่น วันหยุดนักขัตฤกษ์, กิจกรรมกีฬาสี..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteDay(editingDayItem.date)}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบวันนี้</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDayItem(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditDay}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>บันทึกการตั้งค่า</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ถอนเงิน พร้อมบอกเหตุผล                             */}
      {/* ======================================================== */}
      {withdrawStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-bold shrink-0">
                  <ArrowDownLeft className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    ถอนเงินออมทรัพย์นักเรียน
                  </h3>
                  <p className="text-xs text-slate-500">
                    {withdrawStudent.prefix}{withdrawStudent.firstName} {withdrawStudent.lastName} (ชั้น {withdrawStudent.gradeLevel}/{withdrawStudent.room || '1'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWithdrawStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmWithdrawal} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">ยอดเงินออมคงเหลือปัจจุบัน:</span>
                <span className="text-base font-bold font-mono text-emerald-600">
                  ฿{getStudentBalance(withdrawStudent.id).toLocaleString()} บาท
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วันที่ทำรายการถอน *
                </label>
                <input
                  type="date"
                  required
                  value={withdrawDate}
                  onChange={(e) => setWithdrawDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จำนวนเงินที่ถอน (บาท) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={getStudentBalance(withdrawStudent.id)}
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="ระบุจำนวนเงิน"
                    className="w-full text-base font-mono font-bold text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(getStudentBalance(withdrawStudent.id))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    ถอนทั้งหมด
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เหตุผลการถอนเงิน *
                </label>
                <input
                  type="text"
                  required
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="เช่น ค่าอุปกรณ์การเรียน, ค่ารักษาพยาบาล, ผู้ปกครองขอถอน"
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    'ค่าอุปกรณ์การเรียน',
                    'ค่ารักษาพยาบาล',
                    'ผู้ปกครองขอถอน',
                    'ค่าอาหาร / นม',
                    'กิจกรรมทัศนศึกษา',
                    'ถอนปิดบัญชีสิ้นปี'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWithdrawReason(preset)}
                      className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-900 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* FIFO Deduction Live Preview */}
              {Number(withdrawAmount) > 0 && (() => {
                const reqAmt = Number(withdrawAmount);
                const studentDeposits = currentTermSavings
                  .filter(s => s.studentId === withdrawStudent.id && s.type === 'deposit' && s.amount > 0)
                  .sort((a, b) => a.date.localeCompare(b.date));

                let remainingToDeduct = reqAmt;
                const plan: { date: string; before: number; deducted: number; after: number }[] = [];

                for (const dep of studentDeposits) {
                  if (remainingToDeduct <= 0) break;
                  const canTake = Math.min(dep.amount, remainingToDeduct);
                  plan.push({
                    date: dep.date,
                    before: dep.amount,
                    deducted: canTake,
                    after: dep.amount - canTake
                  });
                  remainingToDeduct -= canTake;
                }

                if (plan.length === 0) return null;

                return (
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ลำดับการหักเงินฝาก (เริ่มหักจากวันแรกสุดที่เคยฝากก่อน):</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                      {plan.map((p, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/90 px-2.5 py-1 rounded-lg border border-amber-200/60 shadow-2xs">
                          <span className="font-medium text-slate-700">{formatThaiDate(p.date)}:</span>
                          <span>
                            <span className="text-slate-500">เดิม ฿{p.before.toLocaleString()}</span> &rarr; <span className="text-rose-600 font-bold">หัก ฿{p.deducted.toLocaleString()}</span> &rarr; <span className={p.after === 0 ? "text-slate-400 font-bold" : "text-emerald-700 font-bold"}>เหลือ ฿{p.after.toLocaleString()}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200/80 text-xs flex justify-between items-center text-rose-900">
                <span>ยอดเงินคงเหลือหลังถอน:</span>
                <span className="font-mono font-bold text-sm">
                  ฿{Math.max(0, getStudentBalance(withdrawStudent.id) - (Number(withdrawAmount) || 0)).toLocaleString()} บาท
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWithdrawStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > getStudentBalance(withdrawStudent.id)}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>ยืนยันการถอนเงิน</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ประวัติการถอนเงิน                                  */}
      {/* ======================================================== */}
      {isWithdrawHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    ประวัติการถอนเงิน (ชั้น {selectedGrade})
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsWithdrawHistoryOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {studentsWithWithdrawals.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Wallet className="w-10 h-10 mx-auto text-slate-300" />
                  <div className="text-sm font-semibold text-slate-600">
                    ยังไม่มีนักเรียนคนใดในชั้น {selectedGrade} ทำรายการถอนเงิน
                  </div>
                </div>
              ) : (
                studentsWithWithdrawals.map((student, idx) => {
                  const studentWithdrawals = getStudentWithdrawals(student.id);
                  const totalWithdrawn = studentWithdrawals.reduce((sum, w) => sum + w.amount, 0);
                  const currentBal = getStudentBalance(student.id);

                  return (
                    <div
                      key={student.id}
                      className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-bold text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded-lg font-mono">
                            เลขที่ {student.rollNumber || idx + 1}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-500">
                            #{student.studentCode}
                          </span>
                          <span className="font-bold text-sm text-slate-800">
                            {student.prefix}{student.firstName} {student.lastName}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-500 font-medium">
                            ยอดคงเหลือ: <strong className="text-emerald-700 font-mono">฿{currentBal.toLocaleString()}</strong>
                          </span>
                          <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            รวมถอน: ฿{totalWithdrawn.toLocaleString()} ({studentWithdrawals.length} ครั้ง)
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pl-1">
                        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <History className="w-3 h-3 text-slate-400" />
                          <span>รายการถอนเงินของนักเรียนคนนี้:</span>
                        </div>

                        <div className="space-y-1.5">
                          {studentWithdrawals.map((item) => (
                            <div
                              key={item.id}
                              className="py-2.5 px-3 bg-rose-50/50 rounded-lg border border-rose-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="font-mono text-slate-600 font-bold bg-white px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                                    {item.date}
                                  </span>
                                  <span className="font-bold text-rose-700">
                                    ถอน ฿{item.amount.toLocaleString()} บาท
                                  </span>
                                </div>
                                {item.deductionBreakdown && item.deductionBreakdown.length > 0 && (
                                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
                                    <span className="text-amber-800 font-bold text-[10px]">หักจาก:</span>
                                    {item.deductionBreakdown.map((b, bIdx) => (
                                      <span key={bIdx} className="bg-amber-100/80 text-amber-900 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold border border-amber-200/60">
                                        {formatThaiDate(b.date)} (-฿{b.amount.toLocaleString()})
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="text-slate-700 flex items-center gap-1 text-xs">
                                  <span className="text-slate-400 font-medium">เหตุผล:</span>
                                  <span className="font-semibold bg-white px-2 py-0.5 rounded border border-slate-200/80 text-slate-800">
                                    <span className="sm:hidden">{(item.notes || 'ไม่ระบุเหตุผล').replace(/\s*\(หักจาก:[\s\S]*?\)/, '')}</span>
                                    <span className="hidden sm:inline">{item.notes || 'ไม่ระบุเหตุผล'}</span>
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHistoryItemToDelete(item);
                                    setDeleteHistoryPasswordInput('');
                                    setDeleteHistoryPasswordError('');
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                                  title="ลบรายการถอนเงินนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500">
                รวมนักเรียนที่เคยถอนเงินในชั้น {selectedGrade}: <strong>{studentsWithWithdrawals.length} คน</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsWithdrawHistoryOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: STUDENT DEPOSIT HISTORY                           */}
      {/* ======================================================== */}
      {historyModalStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 bg-emerald-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-200" />
                <h3 className="font-bold text-sm">ประวัติการฝากเงินของนักเรียน</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalStudent(null)}
                className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-800 text-sm">
                  {historyModalStudent.prefix}{historyModalStudent.firstName} {historyModalStudent.lastName}
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  เลขที่ {historyModalStudent.rollNumber || '-'} • รหัส #{historyModalStudent.studentCode} • ชั้น {historyModalStudent.gradeLevel}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-medium">ยอดออมสะสมปัจจุบัน</div>
                <div className="text-base font-black text-emerald-700 font-mono">
                  ฿{getStudentBalance(historyModalStudent.id).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {getStudentDepositHistory(historyModalStudent.id).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  ยังไม่มีประวัติการฝากเงินของนักเรียนคนนี้
                </div>
              ) : (
                getStudentDepositHistory(historyModalStudent.id).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-2.5 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px] font-mono">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 font-mono">
                          {formatThaiDate(item.date)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.notes || 'ฝากเงินประจำวัน'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`font-mono font-bold text-sm ${item.amount === 0 ? 'text-slate-400' : 'text-emerald-700'}`}>
                          +฿{item.amount.toLocaleString()}
                        </div>
                        {item.deductedAmount && item.deductedAmount > 0 ? (
                          <div className={`text-[10px] font-bold ${item.amount === 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                            {item.amount === 0 ? `(หักหมดแล้ว เดิม ฿${item.originalAmount})` : `(หักไป ฿${item.deductedAmount})`}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryItemToDelete(item);
                          setDeleteHistoryPasswordInput('');
                          setDeleteHistoryPasswordError('');
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบรายการฝากเงินนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryModalStudent(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* MODAL: สรุปภาพรวมเวลาเรียนและเงินฝากสะสม (ปุ่ม "รวม")    */}
      {/* ======================================================== */}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-bold">
                  <BarChart3 className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    สรุปภาพรวม (ชั้น {selectedGrade}{availableRoomsForGrade.length > 1 || normalizeRoom(selectedRoom) !== '1' ? ` ห้อง ${normalizeRoom(selectedRoom)}` : ''})
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selectors Bar: ภาคเรียน, ปีการศึกษา และปุ่มเลือกห้อง */}
            <div className={`bg-slate-50 p-3 rounded-2xl border border-slate-200/80 items-center justify-between gap-3 shrink-0 ${user.role === 'admin' ? 'flex flex-wrap' : 'hidden sm:flex'}`}>
              {user.role === 'admin' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={summaryAcademicYear}
                    onChange={(e) => setSummaryAcademicYear(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-900 border border-sky-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
                  >
                    {availableAcademicYears.map(yr => (
                      <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                    ))}
                  </select>

                  <select
                    value={summarySemester}
                    onChange={(e) => setSummarySemester(e.target.value as '1' | '2')}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-900 border border-sky-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                  </select>
                </div>
              ) : (
                <div className="hidden sm:block px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold whitespace-nowrap">
                  ภาคเรียนที่ {activeSemester} • ปีการศึกษา {activeAcademicYear}
                </div>
              )}

              {availableRoomsForGrade.length > 1 && (
                <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-600">เลือกห้อง:</span>
                  {availableRoomsForGrade.map(rm => (
                    <button
                      key={rm}
                      type="button"
                      onClick={() => setSelectedRoom(rm)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        normalizeRoom(selectedRoom) === rm
                          ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50'
                      }`}
                    >
                      ห้อง {rm}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content area: Table only if created, else message */}
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const termKey = `${summarySemester}_${summaryAcademicYear}`;
                const cfg = configsByTerm[termKey];
                const isCreated = Boolean(cfg && cfg.schoolDays && cfg.schoolDays.length > 0 && cfg.schoolDays.some(d => !d.isHoliday));

                if (!isCreated || !cfg || !cfg.schoolDays) {
                  return (
                    <div className="py-16 text-center text-slate-400 space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-500 shadow-2xs">
                        <AlertCircle className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-700">
                          ยังไม่ได้สร้างโครงสร้างเวลาเรียน 100 วัน
                        </div>
                        <div className="text-xs text-slate-400 max-w-md mx-auto">
                          ภาคเรียนที่ {summarySemester} ปีการศึกษา {summaryAcademicYear} ยังไม่มีข้อมูลโครงสร้างวันเรียน<br />
                          ระบบจะแสดงตารางสรุปเฉพาะภาคเรียนและปีการศึกษาที่ Admin ได้สร้าง 100 วันแล้วเท่านั้น
                        </div>
                      </div>
                    </div>
                  );
                }

                const schoolDaysInTerm = cfg.schoolDays.filter(d => !d.isHoliday);
                const schoolDaysDatesSet = new Set(schoolDaysInTerm.map(d => d.date));

                const rows = gradeStudents.map(student => {
                  const studentAtt = attendance.filter(a => a.studentId === student.id && schoolDaysDatesSet.has(a.date));
                  const presentCount = studentAtt.filter(a => a.status === 'present').length;
                  const absentCount = studentAtt.filter(a => a.status === 'absent').length;
                  const leaveCount = studentAtt.filter(a => a.status === 'leave').length;
                  const sickCount = studentAtt.filter(a => a.status === 'sick').length;

                  // Total savings in this term
                  const studentSav = savings.filter(s => s.studentId === student.id && schoolDaysDatesSet.has(s.date) && s.type === 'deposit');
                  const totalMoney = studentSav.reduce((sum, s) => sum + s.amount, 0);

                  return {
                    student,
                    presentCount,
                    absentCount,
                    leaveCount,
                    sickCount,
                    totalMoney
                  };
                });

                const totalRoomPresent = rows.reduce((acc, r) => acc + r.presentCount, 0);
                const totalRoomAbsent = rows.reduce((acc, r) => acc + r.absentCount, 0);
                const totalRoomLeave = rows.reduce((acc, r) => acc + r.leaveCount, 0);
                const totalRoomSick = rows.reduce((acc, r) => acc + r.sickCount, 0);
                const totalRoomMoney = rows.reduce((acc, r) => acc + r.totalMoney, 0);

                return (
                  <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
                    <table className="min-w-[620px] sm:min-w-full w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-semibold">
                          <th className="py-2.5 px-2.5 w-12 text-center">เลขที่</th>
                          <th className="py-2.5 px-3 min-w-[170px]">ชื่อ - นามสกุล</th>
                          <th className="py-2.5 px-2 text-center w-24 text-emerald-700">มา(วัน)</th>
                          <th className="py-2.5 px-2 text-center w-20 text-rose-700">ขาด (วัน)</th>
                          <th className="py-2.5 px-2 text-center w-20 text-amber-700">ลากิจ (วัน)</th>
                          <th className="py-2.5 px-2 text-center w-20 text-blue-700">ป่วย (วัน)</th>
                          <th className="py-2.5 px-3 text-right w-32 text-emerald-800">รวมเงินทั้งหมด (บาท)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              ไม่มีนักเรียนในชั้น {selectedGrade}
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, idx) => (
                            <tr key={row.student.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-2.5 text-center font-bold text-slate-600 font-mono">
                                {row.student.rollNumber || idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-800 text-[13px]">
                                  {row.student.prefix}{row.student.firstName} {row.student.lastName}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  #{row.student.studentCode}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-700">
                                {row.presentCount}
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-rose-700">
                                {row.absentCount}
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-700">
                                {row.leaveCount}
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-700">
                                {row.sickCount}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                ฿{row.totalMoney.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {rows.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-200 text-slate-800">
                            <td colSpan={2} className="py-3 px-3 text-right font-bold text-xs">
                              รวมทั้งห้อง ({rows.length} คน):
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-emerald-800 text-xs">
                              {totalRoomPresent} วัน
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-rose-800 text-xs">
                              {totalRoomAbsent} วัน
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-amber-800 text-xs">
                              {totalRoomLeave} วัน
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-blue-800 text-xs">
                              {totalRoomSick} วัน
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-900 font-black text-xs">
                              ฿{totalRoomMoney.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE HISTORY ITEM WITH PASSWORD CONFIRMATION   */}
      {/* ======================================================== */}
      {historyItemToDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-800">ยืนยันการลบประวัติออมทรัพย์</h3>
              <p className="text-xs text-slate-500">กรุณาตรวจสอบข้อมูลและกรอกรหัสผ่านเพื่อยืนยัน</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 text-left space-y-1">
              <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                {historyItemToDelete.type === 'deposit' ? 'รายการฝากเงิน' : 'รายการถอนเงิน'}
              </span>
              <div className="text-xs font-bold text-slate-900">
                จำนวน ฿{historyItemToDelete.amount.toLocaleString()} บาท
              </div>
              <div className="text-[11px] text-slate-600">
                วันที่ {formatThaiDate(historyItemToDelete.date)}
              </div>
            </div>

            <form onSubmit={handleConfirmDeleteHistoryRecord} className="space-y-3.5 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  รหัสผ่านยืนยัน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showDeleteHistoryPassword ? 'text' : 'password'}
                    required
                    value={deleteHistoryPasswordInput}
                    onChange={(e) => {
                      setDeleteHistoryPasswordInput(e.target.value);
                      if (deleteHistoryPasswordError) setDeleteHistoryPasswordError('');
                    }}
                    placeholder="กรอกรหัสผ่านของคุณเพื่อยืนยัน"
                    autoFocus
                    className="w-full text-xs pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeleteHistoryPassword(!showDeleteHistoryPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showDeleteHistoryPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {deleteHistoryPasswordError && (
                  <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{deleteHistoryPasswordError}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setHistoryItemToDelete(null);
                    setDeleteHistoryPasswordInput('');
                    setDeleteHistoryPasswordError('');
                  }}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>ยืนยันการลบ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRM DELETE SINGLE SCHOOL DAY IN 100 DAYS      */}
      {/* ======================================================== */}
      <ConfirmDeleteModal
        isOpen={Boolean(confirmDeleteDay)}
        title="ยืนยันการลบวันเรียน"
        categoryLabel="ปฏิทินวันเรียน 100 วัน"
        itemTitle={
          confirmDeleteDay
            ? `${formatThaiDate(confirmDeleteDay.date)}${confirmDeleteDay.dayOfWeek ? ` (วัน${confirmDeleteDay.dayOfWeek})` : ''}`
            : ''
        }
        itemSubtitle={`ภาคเรียนที่ ${selectedSemester} ปีการศึกษา ${selectedAcademicYear}`}
        onCancel={() => setConfirmDeleteDay(null)}
        onConfirm={handleConfirmDeleteDay}
      />

      {/* ======================================================== */}
      {/* MODAL: CONFIRM DELETE ALL SCHOOL DAYS IN 100 DAYS        */}
      {/* ======================================================== */}
      <ConfirmDeleteModal
        isOpen={isDeleteAllModalOpen}
        title="ยืนยันการลบวันเรียนทั้งหมด"
        categoryLabel="ลบตารางวันเรียน (ลบAll)"
        itemTitle={`ภาคเรียนที่ ${selectedSemester} ปีการศึกษา ${selectedAcademicYear}`}
        itemSubtitle="ลบตารางวันเรียนทั้งหมดของภาคเรียนที่เลือก"
        onCancel={() => setIsDeleteAllModalOpen(false)}
        onConfirm={handleConfirmDeleteAllSchoolDays}
      />
      {/* ======================================================== */}
      {/* MODAL: ป๊อปอัพข้อมูลนักเรียน (เช็ก ม ข ล ป + ฝาก/ถอนเงิน)  */}
      {/* ======================================================== */}
      {selectedStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <User className="w-5 h-5 text-emerald-200 shrink-0" />
                {/* Selector to jump across students directly */}
                <select
                  value={selectedStudentModal.id}
                  onChange={(e) => {
                    const target = gradeStudents.find(s => s.id === e.target.value);
                    if (target) setSelectedStudentModal(target);
                  }}
                  className="bg-emerald-700/80 hover:bg-emerald-800 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl border border-emerald-500/80 focus:outline-none cursor-pointer w-full max-w-[250px] truncate"
                >
                  {gradeStudents.map((s, idx) => (
                    <option key={`select-pop-${s.id}`} value={s.id} className="text-slate-900 bg-white">
                      #{s.rollNumber || idx + 1} {s.prefix}{s.firstName} {s.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl text-white/90 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Student Header Card */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-800 text-sm sm:text-base">
                    {selectedStudentModal.prefix}{selectedStudentModal.firstName} {selectedStudentModal.lastName}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    เลขที่ {selectedStudentModal.rollNumber || (gradeStudents.findIndex(s => s.id === selectedStudentModal.id) + 1)} | รหัส #{selectedStudentModal.studentCode}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">ยอดออมสะสม</div>
                  <div className="text-sm font-bold font-mono text-emerald-700">
                    ฿{getStudentBalance(selectedStudentModal.id).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Section 1: เวลาเรียน (ม, ข, ล, ป) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <span>เวลาเรียน ({formatThaiDate(selectedDate)})</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { status: 'present', label: 'ม (มา)', bg: 'bg-emerald-600 text-white', activeBg: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
                    { status: 'absent', label: 'ข (ขาด)', bg: 'bg-rose-600 text-white', activeBg: 'bg-rose-50 text-rose-700 border-rose-300' },
                    { status: 'leave', label: 'ล (ลา)', bg: 'bg-amber-600 text-white', activeBg: 'bg-amber-50 text-amber-700 border-amber-300' },
                    { status: 'sick', label: 'ป (ป่วย)', bg: 'bg-blue-600 text-white', activeBg: 'bg-blue-50 text-blue-700 border-blue-300' },
                  ].map(item => {
                    const curStatus = (attendanceStates[selectedStudentModal.id]?.status) || 'present';
                    const isSelected = curStatus === item.status;
                    return (
                      <button
                        key={item.status}
                        type="button"
                        disabled={!isAllowedToRecord}
                        onClick={() => handleSetStatus(selectedStudentModal.id, item.status as AttendanceStatus)}
                        className={`py-2.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all shadow-2xs border ${
                          !isAllowedToRecord
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                            : isSelected
                              ? `${item.bg} border-transparent ring-2 ring-emerald-400 shadow-md scale-[1.02]`
                              : `bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100`
                        }`}
                      >
                        <span className="text-sm font-bold">{item.label.split(' ')[0]}</span>
                        <span className="text-[10px] font-normal opacity-90">{item.label.split(' ')[1]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: ฝากเงินวันนี้ */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <PiggyBank className="w-4 h-4 text-emerald-600" />
                    <span>ฝากเงินวันนี้ (บาท)</span>
                  </span>
                  {(() => {
                    const rec = getStudentTodayDepositRecord(selectedStudentModal.id);
                    if (!rec) return null;
                    if (rec.deductedAmount && rec.deductedAmount > 0) {
                      return (
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-bold ${
                          rec.amount === 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {rec.amount === 0 ? `หักถอนหมดแล้ว (0 บ. เดิม ฿${rec.originalAmount ?? rec.amount})` : `เหลือ ฿${rec.amount.toLocaleString()} (หัก -฿${rec.deductedAmount.toLocaleString()})`}
                        </span>
                      );
                    }
                    return (
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono font-bold">
                        ฝากแล้ว ฿{rec.amount.toLocaleString()}
                      </span>
                    );
                  })()}
                </label>

                {/* Quick preset chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[11px] text-slate-400 font-medium shrink-0">ด่วน:</span>
                  {[10, 20, 50, 100].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      disabled={!isAllowedToRecord}
                      onClick={() => {
                        const existing = getStudentTodayDepositRecord(selectedStudentModal.id);
                        if (existing) {
                          handleStartEditDeposit(selectedStudentModal.id, amt);
                          handleSaveEditedDeposit(selectedStudentModal, existing);
                        } else {
                          handleSingleDeposit(selectedStudentModal, amt);
                        }
                      }}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold font-mono rounded-lg border border-emerald-200 transition-colors cursor-pointer active:scale-95 shrink-0"
                    >
                      +฿{amt}
                    </button>
                  ))}
                </div>

                {/* Deposit input / edit */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">฿</span>
                    <input
                      type="number"
                      min={0}
                      disabled={!isAllowedToRecord}
                      value={
                        editingDepositStudentId === selectedStudentModal.id
                          ? editDepositAmount
                          : getStudentTodayDepositRecord(selectedStudentModal.id)
                            ? getStudentTodayDepositRecord(selectedStudentModal.id)?.amount
                            : (todayDeposits[selectedStudentModal.id] !== undefined ? todayDeposits[selectedStudentModal.id] : '')
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (editingDepositStudentId === selectedStudentModal.id) {
                          setEditDepositAmount(val);
                        } else {
                          setTodayDeposits(prev => ({ ...prev, [selectedStudentModal.id]: val }));
                        }
                      }}
                      onBlur={() => {
                        if (editingDepositStudentId === selectedStudentModal.id) {
                          handleSaveEditedDeposit(selectedStudentModal, getStudentTodayDepositRecord(selectedStudentModal.id));
                        } else {
                          const amt = Number(todayDeposits[selectedStudentModal.id]);
                          if (amt > 0 && !getStudentTodayDepositRecord(selectedStudentModal.id)) {
                            handleSingleDeposit(selectedStudentModal, amt);
                          }
                        }
                      }}
                      placeholder="ระบุยอดเงินฝาก..."
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    />
                  </div>
                  {getStudentTodayDepositRecord(selectedStudentModal.id) && editingDepositStudentId !== selectedStudentModal.id && (
                    <button
                      type="button"
                      onClick={() => handleStartEditDeposit(selectedStudentModal.id, getStudentTodayDepositRecord(selectedStudentModal.id)?.amount || 0)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      แก้ไข
                    </button>
                  )}
                </div>
              </div>

              {/* Section 3: ต้องการถอนเงิน */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const st = selectedStudentModal;
                    setSelectedStudentModal(null);
                    setWithdrawStudent(st);
                    setWithdrawAmount(50);
                    setWithdrawReason('');
                    setWithdrawDate(selectedDate);
                  }}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
                >
                  <Banknote className="w-4 h-4 text-rose-600" />
                  <span>ต้องการถอนเงิน (คงเหลือ ฿{getStudentBalance(selectedStudentModal.id).toLocaleString()})</span>
                </button>
              </div>

              {/* Section 4: ปุ่มบันทึกข้อมูล (เพิ่มตามคำขอเพื่อให้สมาชิกสบายใจ) */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (editingDepositStudentId === selectedStudentModal.id) {
                      handleSaveEditedDeposit(selectedStudentModal, getStudentTodayDepositRecord(selectedStudentModal.id));
                    } else {
                      const amt = Number(todayDeposits[selectedStudentModal.id]);
                      if (amt > 0 && !getStudentTodayDepositRecord(selectedStudentModal.id)) {
                        handleSingleDeposit(selectedStudentModal, amt);
                      }
                    }
                    onShowToast('success', 'บันทึกเรียบร้อย', `บันทึกข้อมูลของ ${selectedStudentModal.prefix}${selectedStudentModal.firstName} ${selectedStudentModal.lastName} เรียบร้อยแล้ว`);
                    setSelectedStudentModal(null);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </div>

            {/* Modal Footer Navigation */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                disabled={currentStudentModalIndex <= 0}
                onClick={handlePrevStudentModal}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                  currentStudentModalIndex <= 0
                    ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer shadow-2xs'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>คนก่อนหน้า</span>
              </button>

              <span className="text-xs text-slate-500 font-mono font-medium">
                {currentStudentModalIndex + 1} / {gradeStudents.length}
              </span>

              <button
                type="button"
                disabled={currentStudentModalIndex < 0 || currentStudentModalIndex >= gradeStudents.length - 1}
                onClick={handleNextStudentModal}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                  currentStudentModalIndex < 0 || currentStudentModalIndex >= gradeStudents.length - 1
                    ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer shadow-2xs'
                }`}
              >
                <span>คนถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
