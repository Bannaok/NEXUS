import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Student, 
  Personnel, 
  SchoolInfo, 
  Subject, 
  GradeRecord, 
  AttendanceRecord, 
  SavingsRecord, 
  GradeLevel, 
  DailyTracking,
  BehaviorScores,
  EVALUATION_CRITERIA_ITEMS,
  StudentBehaviorEvaluation
} from '../types';
import { StorageService } from '../services/storage';
import { 
  X, 
  Download, 
  Printer, 
  FileText, 
  User, 
  UserCheck,
  Award, 
  CalendarCheck, 
  Heart, 
  MessageSquare, 
  CheckCircle2, 
  Layers,
  BookOpen,
  Calendar,
  Save,
  Phone,
  Home,
  Check,
  Loader2
} from 'lucide-react';
import { calculateThaiNutritionalStatus, get100SchoolDaysForTerm, isMilkTeethRecorded } from './Module1ClassroomAdmin';
import { exportSheetsToPdf } from '../utils/pdfExport';

export interface PhorPhor6ModalProps {
  student: Student;
  grade: GradeLevel;
  academicYear: string;
  semester: string;
  schoolInfo: SchoolInfo;
  personnel: Personnel[];
  subjects: Subject[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  dailyTracking?: DailyTracking[];
  savings?: SavingsRecord[];
  onClose: () => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  onOpenLightbox?: (imageUrl: string, title: string, subtitle?: string) => void;
}

export type PhorPhor6Tab = 
  | 'cover' 
  | 'info' 
  | 'academic' 
  | 'attendance' 
  | 'health' 
  | 'comments' 
  | 'all';

export const calculateThaiGrade = (score: number | null | undefined, _maxScore: number = 100): string => {
  if (score === null || score === undefined || isNaN(Number(score))) return '-';
  const numScore = Number(score);
  if (numScore >= 80) return '4';
  if (numScore >= 75) return '3.5';
  if (numScore >= 70) return '3';
  if (numScore >= 65) return '2.5';
  if (numScore >= 60) return '2';
  if (numScore >= 55) return '1.5';
  if (numScore >= 50) return '1';
  return '0';
};

export const isActivitySubject = (sub?: Subject | null): boolean => {
  if (!sub) return false;
  if (sub.isActivity) return true;
  if (sub.id && (sub.id.startsWith('act-') || sub.id.includes('-act-'))) return true;
  const code = (sub.code || '').trim().toUpperCase();
  const name = (sub.name || '').trim();
  if (code.startsWith('ก') || code.includes('กิจกรรม')) return true;
  if (
    name.includes('กิจกรรม') ||
    name.includes('ลูกเสือ') ||
    name.includes('เนตรนารี') ||
    name.includes('ยุวกาชาด') ||
    name.includes('ผู้บำเพ็ญประโยชน์') ||
    name.includes('แนะแนว') ||
    name.includes('เพื่อสังคม') ||
    name.includes('สาธารณประโยชน์') ||
    name.includes('ชุมนุม')
  ) {
    return true;
  }
  return false;
};

export const isActivityRecord = (rec?: GradeRecord | null): boolean => {
  if (!rec) return false;
  return rec.activityResult === 'ผ่าน' || rec.activityResult === 'ไม่ผ่าน';
};

const getPrimarySubjectOrder = (sub: Subject): number => {
  if (isActivitySubject(sub)) return 500;
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

export const getGradePoints = (gradeStr: string): number | null => {
  switch (gradeStr) {
    case '4': return 4.0;
    case '3.5': return 3.5;
    case '3': return 3.0;
    case '2.5': return 2.5;
    case '2': return 2.0;
    case '1.5': return 1.5;
    case '1': return 1.0;
    case '0': return 0.0;
    default: return null;
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

export const PhorPhor6Modal: React.FC<PhorPhor6ModalProps> = ({
  student: propStudent,
  grade,
  academicYear,
  semester,
  schoolInfo: propSchoolInfo,
  personnel,
  subjects,
  grades,
  attendance,
  dailyTracking: propsDailyTracking = [],
  onClose,
  onShowToast,
  onOpenLightbox
}) => {
  const [activeTab, setActiveTab] = useState<PhorPhor6Tab>('cover');
  const [isCombinedAcademic, setIsCombinedAcademic] = useState<boolean>(false);
  const [isCombinedAttendance, setIsCombinedAttendance] = useState<boolean>(false);
  const [isCombinedHealth, setIsCombinedHealth] = useState<boolean>(false);

  // หน้าข้อมูลโรงเรียน: Always pull directly from "ข้อมูลโรงเรียน" (StorageService.getSchoolInfo())
  const schoolInfo = useMemo(() => {
    try {
      const fresh = StorageService.getSchoolInfo();
      if (fresh && fresh.schoolName) {
        return { ...propSchoolInfo, ...fresh };
      }
    } catch {}
    return propSchoolInfo;
  }, [propSchoolInfo]);

  // Clean formatted school name: ensure exactly one "โรงเรียน" prefix, never duplicate "โรงเรียนโรงเรียน..."
  const cleanSchoolName = useMemo(() => {
    const raw = (schoolInfo?.schoolName || '').trim();
    if (!raw) return 'วัดผลประเมินพัฒนาการ';
    return raw.replace(/^โรงเรียน\s*/, '');
  }, [schoolInfo?.schoolName]);

  const fullSchoolName = useMemo(() => {
    return `โรงเรียน${cleanSchoolName}`;
  }, [cleanSchoolName]);

  // 1. หน้าข้อมูลนักเรียน: Always pull directly from "ข้อมูล/อื่นๆ" (StorageService.getStudents())
  const student = useMemo(() => {
    try {
      const allStudents = StorageService.getStudents();
      const fresh = allStudents.find(s => s.id === propStudent.id);
      if (fresh) return fresh;
    } catch {}
    return propStudent;
  }, [propStudent]);

  // 2. หน้าวัดผล: Always pull directly from "รายงานวัดผล" (StorageService.getGrades() & StorageService.getSubjects())
  const effectiveGrades = useMemo(() => {
    try {
      const local = StorageService.getGrades();
      if (local && local.length > 0) return local;
    } catch {}
    return grades || [];
  }, [grades]);

  const effectiveSubjects = useMemo(() => {
    try {
      const local = StorageService.getSubjects();
      if (local && local.length > 0) return local;
    } catch {}
    return subjects || [];
  }, [subjects]);

  // 3. หน้าเวลาเรียน: Always pull directly from "เวลาเรียน" (StorageService.getAttendance())
  const effectiveAttendance = useMemo(() => {
    try {
      const local = StorageService.getAttendance();
      if (local && local.length > 0) return local;
    } catch {}
    return attendance || [];
  }, [attendance]);

  // 4. หน้าสุขภาพ: Always pull directly from "ธุรการ" (StorageService.getDailyTracking())
  const dailyTracking = useMemo(() => {
    try {
      const local = StorageService.getDailyTracking();
      if (local && local.length > 0) return local;
    } catch {}
    return propsDailyTracking || [];
  }, [propsDailyTracking]);

  // 5. หน้าความคิดเห็น: Teacher 8-Aspect Behavior Evaluation scores (Synced with ธุรการ behavior evaluations)
  const [teacherScores, setTeacherScores] = useState<BehaviorScores>(() => {
    try {
      const evals = StorageService.getBehaviorEvaluations();
      const evalKey = `${student.id}_${academicYear}_${semester}`;
      const legacyKey = `${student.id}_default`;
      const matched = evals[evalKey] 
        || evals[legacyKey]
        || Object.values(evals).find(e => e.studentId === student.id && (
          (e.academicYear === academicYear && e.semester === semester) || !e.academicYear
        ));
      if (matched && matched.scores) {
        return matched.scores;
      }
    } catch (e) {
      console.error(e);
    }
    return {
      learning: 3,
      attention: 3,
      responsibility: 3,
      freeTimeUsage: 3,
      relationships: 3,
      emotionalControl: 3,
      habitsPersonality: 3,
      health: 3
    };
  });

  // Parent 8-Aspect Behavior Evaluation scores
  const [parentScores, setParentScores] = useState<BehaviorScores>(() => {
    const commentStorageKey = `ams_pp6_comments_${student.id}_${academicYear}_${semester}`;
    try {
      const saved = localStorage.getItem(`${commentStorageKey}_parent_scores`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      learning: 0,
      attention: 0,
      responsibility: 0,
      freeTimeUsage: 0,
      relationships: 0,
      emotionalControl: 0,
      habitsPersonality: 0,
      health: 0
    };
  });

  // Teacher & Parent comments state (persisted to localStorage per student and term + synced with ธุรการ)
  const commentStorageKey = `ams_pp6_comments_${student.id}_${academicYear}_${semester}`;
  const [teacherComment, setTeacherComment] = useState<string>(() => {
    try {
      // 1. Check ธุรการ behavior evaluations FIRST
      const evals = StorageService.getBehaviorEvaluations();
      const evalKey = `${student.id}_${academicYear}_${semester}`;
      const legacyKey = `${student.id}_default`;
      const matched = evals[evalKey] 
        || evals[legacyKey]
        || Object.values(evals).find(e => e.studentId === student.id && (
          (e.academicYear === academicYear && e.semester === semester) || !e.academicYear
        ));
      if (matched && matched.teacherComment !== undefined && matched.teacherComment !== '') {
        return matched.teacherComment;
      }
      const saved = localStorage.getItem(commentStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.teacherComment) return parsed.teacherComment;
      }
    } catch {
      // fallback
    }
    return 'นักเรียนมีความตั้งใจในการเรียน มีความรับผิดชอบต่องานที่ได้รับมอบหมาย มีมนุษยสัมพันธ์ที่ดีกับเพื่อนร่วมชั้น ปฏิบัติตามกฎระเบียบของโรงเรียนอย่างสม่ำเสมอ';
  });

  const [parentComment, setParentComment] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(commentStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.parentComment) return parsed.parentComment;
      }
    } catch {
      // fallback
    }
    return '';
  });

  const [isSavedComment, setIsSavedComment] = useState(false);

  // Sync behavior evaluation from ธุรการ whenever student, academicYear, or semester changes
  useEffect(() => {
    try {
      const evals = StorageService.getBehaviorEvaluations();
      const evalKey = `${student.id}_${academicYear}_${semester}`;
      const legacyKey = `${student.id}_default`;
      const matched = evals[evalKey] 
        || evals[legacyKey]
        || Object.values(evals).find(e => e.studentId === student.id && (
          (e.academicYear === academicYear && e.semester === semester) || !e.academicYear
        ));
      if (matched) {
        if (matched.scores) {
          setTeacherScores(matched.scores);
        }
        if (matched.teacherComment !== undefined && matched.teacherComment !== '') {
          setTeacherComment(matched.teacherComment);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [student.id, academicYear, semester]);

  const handleSaveComments = () => {
    try {
      // 1. Sync & Save Teacher Evaluation to ธุรการ (StorageService)
      const evalData: StudentBehaviorEvaluation = {
        id: `eval-${student.id}-${academicYear}-${semester}`,
        studentId: student.id,
        academicYear,
        semester,
        scores: teacherScores,
        teacherComment: teacherComment.trim(),
        updatedAt: new Date().toISOString()
      };
      StorageService.saveBehaviorEvaluation(evalData);

      // 2. Save PP.6 comments and parent scores to localStorage
      localStorage.setItem(commentStorageKey, JSON.stringify({
        teacherComment,
        parentComment,
        savedAt: new Date().toISOString()
      }));

      localStorage.setItem(`${commentStorageKey}_parent_scores`, JSON.stringify(parentScores));

      setIsSavedComment(true);
      setTimeout(() => setIsSavedComment(false), 2500);
      onShowToast('success', 'บันทึกความคิดเห็นและการประเมิน', 'บันทึกผลการประเมิน 8 ด้าน และความคิดเห็นของครู/ผู้ปกครองเรียบร้อยแล้ว');
    } catch {
      onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  // Standardized PP.6 Header rendered centered on top of every page
  const renderPP6Header = (sectionTitle?: string, customTitle?: string, omitSemester?: boolean) => {
    const affiliationText = schoolInfo.affiliation
      ? (schoolInfo.affiliation.startsWith('สังกัด') ? schoolInfo.affiliation : `สังกัด${schoolInfo.affiliation}`)
      : 'สังกัดสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน';

    return (
      <div className="pb-3 mb-4 text-center space-y-1 text-black" style={{ color: '#000000' }}>
        {/* Line 1: School Logo centered at top (Enlarged) */}
        <div className="flex justify-center mb-2">
          {schoolInfo.logoUrl ? (
            <img 
              src={schoolInfo.logoUrl} 
              alt="School Logo" 
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain" 
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl">
              🏫
            </div>
          )}
        </div>

        {/* Line 2: Title */}
        <h2 className="text-sm sm:text-base font-bold text-black tracking-wide" style={{ color: '#000000' }}>
          {customTitle || 'แบบบันทึกผลการพัฒนาคุณภาพผู้เรียนรายบุคคล'}
        </h2>

        {/* Line 3: โรงเรียน สังกัด */}
        <p className="text-xs font-bold text-black" style={{ color: '#000000' }}>
          {fullSchoolName} {affiliationText}
        </p>

        {/* Line 4: ปีการศึกษา ภาค และชั้น */}
        <p className="text-xs text-black font-semibold" style={{ color: '#000000' }}>
          {omitSemester
            ? `ปีการศึกษา ${academicYear} ${getGradeCleanName(grade)}`
            : `ปีการศึกษา ${academicYear} ภาคเรียนที่ ${semester} ${getGradeCleanName(grade)}`}
        </p>

        {/* Optional Section Title */}
        {sectionTitle && (
          <p className="text-xs font-bold text-black pt-1 mt-1" style={{ color: '#000000' }}>
            {sectionTitle}
          </p>
        )}
      </div>
    );
  };

  const targetGrade = (student.gradeLevel || grade || '').trim();
  const isPrimaryGrade = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'].includes(targetGrade) || targetGrade.startsWith('ป.');

  // 1. Auto-detect default advisor for this specific grade from personnel list (from "ข้อมูล/อื่นๆ" > บุคลากร)
  const autoDetectedAdvisor = useMemo(() => {
    if (!personnel || personnel.length === 0) return null;

    const normalize = (str?: string) => (str || '').replace(/\s+/g, '').toLowerCase();
    const cleanTarget = normalize(targetGrade);
    
    // Extract grade number if any, e.g. "1" from "ป.1"
    const numMatch = cleanTarget.match(/\d+/);
    const gradeNum = numMatch ? numMatch[0] : '';
    const isKindergarten = cleanTarget.includes('อ.');
    const isPrimary = cleanTarget.includes('ป.');
    const isSecondary = cleanTarget.includes('ม.');

    // Step A: Direct match on advisorGrade
    let found = personnel.find(p => {
      if (!p.advisorGrade) return false;
      const cleanAdv = normalize(p.advisorGrade);
      return cleanAdv === cleanTarget || cleanAdv === normalize(grade) || cleanAdv.includes(cleanTarget) || cleanTarget.includes(cleanAdv);
    });
    if (found) return found;

    // Step B: Semantic grade number match (e.g. "ป.1" vs "ประถมศึกษาปีที่ 1")
    if (gradeNum) {
      found = personnel.find(p => {
        if (!p.advisorGrade) return false;
        const cleanAdv = normalize(p.advisorGrade);
        if (isPrimary && (cleanAdv.includes('ป.' + gradeNum) || cleanAdv.includes('ประถม' + gradeNum) || cleanAdv.includes('ประถมศึกษาปีที่' + gradeNum))) return true;
        if (isKindergarten && (cleanAdv.includes('อ.' + gradeNum) || cleanAdv.includes('อนุบาล' + gradeNum))) return true;
        if (isSecondary && (cleanAdv.includes('ม.' + gradeNum) || cleanAdv.includes('มัธยม' + gradeNum))) return true;
        return false;
      });
      if (found) return found;
    }

    // Step C: Match from position or department (e.g. position = "ครูประจำชั้น ป.1")
    found = personnel.find(p => {
      const pos = normalize(p.position);
      const dept = normalize(p.customDepartment || p.department);
      const combined = `${pos} ${dept}`;
      if (combined.includes('ประจำชั้น') || combined.includes('ที่ปรึกษา')) {
        if (combined.includes(cleanTarget)) return true;
        if (gradeNum) {
          if (isPrimary && (combined.includes('ป.' + gradeNum) || combined.includes('ประถม' + gradeNum))) return true;
          if (isKindergarten && (combined.includes('อ.' + gradeNum) || combined.includes('อนุบาล' + gradeNum))) return true;
          if (isSecondary && (combined.includes('ม.' + gradeNum) || combined.includes('มัธยม' + gradeNum))) return true;
        }
      }
      return false;
    });
    if (found) return found;

    return null;
  }, [personnel, targetGrade, grade]);

  // Selected advisor ID (persisted in localStorage per grade level)
  const advisorStorageKey = `ams_pp6_advisor_${(targetGrade || grade || 'default').replace(/\s+/g, '')}`;
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(advisorStorageKey);
      if (saved) return saved;
    } catch {}
    return autoDetectedAdvisor?.id || '';
  });

  const [customAdvisorName, setCustomAdvisorName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`${advisorStorageKey}_custom`);
      if (saved) return saved;
    } catch {}
    return '';
  });

  // Effective Advisor Name used across all signatures and reports
  const effectiveAdvisorName = useMemo(() => {
    if (selectedAdvisorId === 'custom') {
      return customAdvisorName.trim();
    }
    if (selectedAdvisorId) {
      const matched = personnel.find(item => item.id === selectedAdvisorId);
      if (matched) {
        return `${matched.prefix || ''}${matched.firstName || ''} ${matched.lastName || ''}`.trim();
      }
    }
    if (autoDetectedAdvisor) {
      return `${autoDetectedAdvisor.prefix || ''}${autoDetectedAdvisor.firstName || ''} ${autoDetectedAdvisor.lastName || ''}`.trim();
    }
    return '';
  }, [selectedAdvisorId, customAdvisorName, personnel, autoDetectedAdvisor]);

  const advisorName = effectiveAdvisorName;

  const handleAdvisorChange = (newId: string) => {
    setSelectedAdvisorId(newId);
    try {
      localStorage.setItem(advisorStorageKey, newId);
    } catch {}
  };

  const handleCustomAdvisorChange = (val: string) => {
    setCustomAdvisorName(val);
    try {
      localStorage.setItem(`${advisorStorageKey}_custom`, val);
    } catch {}
  };

  // School Director
  const director = useMemo(() => {
    return personnel.find(p => 
      (p.personnelType && p.personnelType.includes('ผู้อำนวยการ')) ||
      (p.position && (p.position.includes('ผู้อำนวยการ') || p.position.includes('ผอ.')))
    ) || null;
  }, [personnel]);

  const directorName = director
    ? `${director.prefix || ''}${director.firstName || ''} ${director.lastName || ''}`.trim()
    : (schoolInfo.directorName || '');

  const directorPosition = useMemo(() => {
    if (director && director.position && director.position.trim()) {
      return director.position.trim();
    }
    const rawSchool = schoolInfo.schoolName || 'บ้านไสโป๊ะ';
    const cleanSchool = rawSchool.startsWith('โรงเรียน') ? rawSchool.replace(/^โรงเรียน\s*/, '') : rawSchool;
    return `ผู้อำนวยการโรงเรียน${cleanSchool}`;
  }, [director, schoolInfo.schoolName]);

  // Strict helpers to ensure grade records only show in the exact semester they were recorded
  const isGradeRecordForSemester = (g: GradeRecord, targetSem: string, targetYear: string): boolean => {
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

  const hasRecordedGradeScore = (g?: GradeRecord): boolean => {
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

  // Subjects and grades for this student: strictly only subjects for this student's grade
  const studentSubjects = useMemo(() => {
    const studentGrade = (student.gradeLevel || grade || '').trim();
    if (!studentGrade) return [];

    // Prefer subjects matching the current academicYear first
    const yearMatched = effectiveSubjects.filter(s => {
      const sGrade = (s.gradeLevel || '').trim();
      const matchesYear = !s.academicYear || String(s.academicYear) === String(academicYear);
      return sGrade === studentGrade && matchesYear;
    });
    const basePool = yearMatched.length > 0
      ? yearMatched
      : effectiveSubjects.filter(s => (s.gradeLevel || '').trim() === studentGrade);

    // Strictly match the student's grade level and current semester
    const exactSemMatched = basePool.filter(s => String(s.semester) === String(semester));
    const fallbackSemMatched = basePool.filter(s => !s.semester);
    let matched = [...exactSemMatched, ...fallbackSemMatched];

    // Fallback: If no subjects matched this semester, match this student's grade level only
    if (matched.length === 0) {
      matched = basePool;
    }

    // Also include any extra activities recorded in effectiveGrades for this student in this term
    const extraActivities: Subject[] = [];
    effectiveGrades.forEach(g => {
      if (
        g.studentId === student.id &&
        isGradeRecordForSemester(g, semester, academicYear) &&
        Boolean(g.activityResult && g.activityResult.trim() !== '')
      ) {
        const subId = g.subjectId || '';
        const subCode = g.subjectCode || '';
        const subName = g.subjectName || '';
        const existsInMatched = matched.some(
          s => s.id === subId || (subCode && s.code === subCode) || s.name === subName
        );
        if (!existsInMatched && !extraActivities.some(a => a.id === subId || a.name === subName)) {
          extraActivities.push({
            id: subId || `act-extra-${subName}`,
            code: subCode,
            name: subName,
            gradeLevel: studentGrade as GradeLevel,
            hoursPerWeek: 1,
            semester: semester as '1' | '2',
            totalScore: 0,
            courseworkScore: 0,
            examScore: 0,
            isActivity: true,
          });
        }
      }
    });
    if (extraActivities.length > 0) {
      matched = [...matched, ...extraActivities];
    }

    // Deduplicate by subject code or name to ensure each subject is shown only once (prefer exact semester match)
    const seen = new Set<string>();
    const unique: Subject[] = [];
    matched.forEach(s => {
      const key = s.code ? s.code.trim().toUpperCase() : s.name.trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    });

    return unique.sort((a, b) => {
      const ordA = getPrimarySubjectOrder(a);
      const ordB = getPrimarySubjectOrder(b);
      if (ordA !== ordB) return ordA - ordB;
      return (a.code || '').localeCompare(b.code || '', 'th');
    });
  }, [effectiveSubjects, effectiveGrades, student.id, student.gradeLevel, grade, semester, academicYear]);

  // Subject evaluation rows: pulls directly from "รายงานวัดผล" (StorageService.getGrades())
  // Strictly displays scores ONLY in the semester where they were entered
  const academicResults = useMemo(() => {
    let totalCredits = 0;
    let totalPoints = 0;

    const rows = studentSubjects.map(subj => {
      const codeUpper = (subj.code || '').trim().toUpperCase();
      const nameClean = (subj.name || '').trim();

      // 1. Exact subjectId match in the target semester & academicYear
      let rec = effectiveGrades.find(g =>
        g.studentId === student.id &&
        g.subjectId === subj.id &&
        isGradeRecordForSemester(g, semester, academicYear) &&
        hasRecordedGradeScore(g)
      );

      // 2. Same subject code or subject name strictly within the SAME semester & academicYear
      if (!rec) {
        rec = effectiveGrades.find(g =>
          g.studentId === student.id &&
          ((codeUpper !== '' && (g.subjectCode || '').trim().toUpperCase() === codeUpper) ||
            (nameClean !== '' && (g.subjectName || '').trim() === nameClean)) &&
          isGradeRecordForSemester(g, semester, academicYear) &&
          hasRecordedGradeScore(g)
        );
      }

      // 3. Fallback for activity subjects to find recorded pass/fail result
      if (!rec && isActivitySubject(subj)) {
        rec = effectiveGrades.find(g =>
          g.studentId === student.id &&
          isGradeRecordForSemester(g, semester, academicYear) &&
          Boolean(g.activityResult && g.activityResult.trim() !== '') &&
          ((codeUpper !== '' && (g.subjectCode || '').trim().toUpperCase() === codeUpper) ||
            (nameClean !== '' && (g.subjectName || '').trim() === nameClean))
        );
      }

      const isAct = isActivitySubject(subj) || isActivityRecord(rec);

      let cwDisplay = '-';
      let exDisplay = '-';
      let totalDisplay = '-';
      let gradeStr = '-';
      const weight = subj.hoursPerWeek ? subj.hoursPerWeek / 2 : 1; // standard weight credit

      if (isAct) {
        // Requirement 1: สำหรับวิชากิจกรรม ให้ column ระหว่างภาคเป็น "-", column ปลายภาคเป็น "-", column รวม จะแสดง "ผ่าน หรือ ไม่ผ่าน"
        cwDisplay = '-';
        exDisplay = '-';
        totalDisplay = (rec?.activityResult === 'ผ่าน' || rec?.activityResult === 'ไม่ผ่าน')
          ? rec.activityResult
          : '-';
        gradeStr = '-';
        // Non-credit: do not add to GPA credits or points
      } else {
        const cw = rec?.courseworkScore !== undefined && rec.courseworkScore !== null ? rec.courseworkScore : null;
        const ex = rec?.examScore !== undefined && rec.examScore !== null ? rec.examScore : null;
        let total = rec?.totalScore !== undefined && rec.totalScore !== null ? rec.totalScore : null;
        if (total === null && (cw !== null || ex !== null)) {
          total = (Number(cw) || 0) + (Number(ex) || 0);
        }
        gradeStr = calculateThaiGrade(total, subj.totalScore || 100);
        const points = getGradePoints(gradeStr);

        cwDisplay = cw !== null ? String(cw) : '-';
        exDisplay = ex !== null ? String(ex) : '-';
        totalDisplay = total !== null ? String(total) : '-';

        if (points !== null) {
          totalCredits += weight;
          totalPoints += points * weight;
        }
      }

      // Member who registered to teach this subject
      let subjectTeacher = subj.teacherName;
      if (!subjectTeacher && subj.teacherId) {
        const p = personnel.find(item => item.id === subj.teacherId);
        if (p) {
          subjectTeacher = `${p.prefix || ''}${p.firstName || ''} ${p.lastName || ''}`.trim();
        }
      }

      return {
        subject: subj,
        isActivity: isAct,
        coursework: cwDisplay,
        exam: exDisplay,
        total: totalDisplay,
        grade: gradeStr,
        weight,
        teacherDisplayName: subjectTeacher || advisorName || '-'
      };
    });

    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '-';

    return { rows, gpa, totalCredits };
  }, [studentSubjects, effectiveGrades, student.id, semester, academicYear, personnel, advisorName]);

  // Combined 2-Semester Subject Evaluation (ภาคเรียนที่ 1 + ภาคเรียนที่ 2)
  const combinedAcademicResults = useMemo(() => {
    const studentGrade = (student.gradeLevel || grade || '').trim();
    const yearMatchedSubjects = effectiveSubjects.filter(
      s => (s.gradeLevel || '').trim() === studentGrade && (!s.academicYear || String(s.academicYear) === String(academicYear))
    );
    const allGradeSubjects = yearMatchedSubjects.length > 0
      ? yearMatchedSubjects
      : effectiveSubjects.filter(s => (s.gradeLevel || '').trim() === studentGrade);

    // Deduplicate subjects across both semesters by code or name
    const subjectGroups = new Map<string, { primary: Subject; sem1Subj?: Subject; sem2Subj?: Subject }>();
    allGradeSubjects.forEach(s => {
      const key = s.code ? s.code.trim().toUpperCase() : s.name.trim();
      const existing = subjectGroups.get(key);
      if (!existing) {
        subjectGroups.set(key, {
          primary: s,
          sem1Subj: String(s.semester) === '1' ? s : undefined,
          sem2Subj: String(s.semester) === '2' ? s : undefined,
        });
      } else {
        if (String(s.semester) === '1') {
          if (!existing.sem1Subj || s.teacherName || s.teacherId) {
            existing.sem1Subj = s;
          }
        }
        if (String(s.semester) === '2') {
          if (!existing.sem2Subj || s.teacherName || s.teacherId) {
            existing.sem2Subj = s;
          }
        }
      }
    });

    // Also include extra activities from effectiveGrades across both semesters if not already present
    effectiveGrades.forEach(g => {
      if (
        g.studentId === student.id &&
        (!g.academicYear || String(g.academicYear) === String(academicYear)) &&
        Boolean(g.activityResult && g.activityResult.trim() !== '')
      ) {
        const subKey = g.subjectCode ? g.subjectCode.trim().toUpperCase() : (g.subjectName || '').trim();
        if (subKey && !subjectGroups.has(subKey)) {
          const actSubj: Subject = {
            id: g.subjectId || `act-extra-${g.subjectName}`,
            code: g.subjectCode || '',
            name: g.subjectName || '',
            gradeLevel: studentGrade as GradeLevel,
            hoursPerWeek: 1,
            semester: (g.semester as '1' | '2') || '1',
            totalScore: 0,
            courseworkScore: 0,
            examScore: 0,
            isActivity: true,
          };
          subjectGroups.set(subKey, {
            primary: actSubj,
            sem1Subj: String(g.semester) === '1' ? actSubj : undefined,
            sem2Subj: String(g.semester) === '2' ? actSubj : undefined,
          });
        }
      }
    });

    // Fallback to studentSubjects if empty
    if (subjectGroups.size === 0) {
      studentSubjects.forEach(s => {
        const key = s.code ? s.code.trim().toUpperCase() : s.name.trim();
        subjectGroups.set(key, { primary: s, sem1Subj: s, sem2Subj: s });
      });
    }

    let totalCredits1 = 0;
    let totalPoints1 = 0;
    let totalCredits2 = 0;
    let totalPoints2 = 0;
    let totalCreditsCombined = 0;
    let totalPointsCombined = 0;

    const findStudentGradeForTerm = (
      grp: { primary: Subject; sem1Subj?: Subject; sem2Subj?: Subject },
      targetSem: '1' | '2'
    ): GradeRecord | undefined => {
      const targetSubj = targetSem === '1' ? grp.sem1Subj : grp.sem2Subj;
      const codeUpper = (grp.primary.code || '').trim().toUpperCase();
      const nameClean = (grp.primary.name || '').trim();

      // 1. Exact subjectId match for this term's subject in targetSem & academicYear
      if (targetSubj) {
        const exactFound = effectiveGrades.find(
          g =>
            g.studentId === student.id &&
            g.subjectId === targetSubj.id &&
            isGradeRecordForSemester(g, targetSem, academicYear) &&
            hasRecordedGradeScore(g)
        );
        if (exactFound) return exactFound;
      }

      // 2. Match by subject code or name strictly in targetSem & academicYear
      const nameOrCodeFound = effectiveGrades.find(
        g =>
          g.studentId === student.id &&
          ((codeUpper !== '' && (g.subjectCode || '').trim().toUpperCase() === codeUpper) ||
            (nameClean !== '' && (g.subjectName || '').trim() === nameClean)) &&
          isGradeRecordForSemester(g, targetSem, academicYear) &&
          hasRecordedGradeScore(g)
      );
      if (nameOrCodeFound) return nameOrCodeFound;

      // 3. Activity fallback match in targetSem & academicYear
      if (isActivitySubject(grp.primary)) {
        return effectiveGrades.find(
          g =>
            g.studentId === student.id &&
            isGradeRecordForSemester(g, targetSem, academicYear) &&
            Boolean(g.activityResult && g.activityResult.trim() !== '') &&
            ((codeUpper !== '' && (g.subjectCode || '').trim().toUpperCase() === codeUpper) ||
              (nameClean !== '' && (g.subjectName || '').trim() === nameClean))
        );
      }
      return undefined;
    };

    const getNumericTotal = (rec?: GradeRecord): number | null => {
      if (!rec) return null;
      const cw = rec.courseworkScore !== undefined && rec.courseworkScore !== null ? Number(rec.courseworkScore) : null;
      const ex = rec.examScore !== undefined && rec.examScore !== null ? Number(rec.examScore) : null;
      if (rec.totalScore !== undefined && rec.totalScore !== null && !isNaN(Number(rec.totalScore))) {
        return Number(rec.totalScore);
      }
      if (cw !== null || ex !== null) {
        return (cw || 0) + (ex || 0);
      }
      return null;
    };

    const resolveSubjectTeacher = (targetSubj?: Subject): string => {
      if (!targetSubj) return '';
      if (targetSubj.teacherName && targetSubj.teacherName.trim()) {
        return targetSubj.teacherName.trim();
      }
      if (targetSubj.teacherId) {
        const p = personnel.find(item => item.id === targetSubj.teacherId);
        if (p) {
          return `${p.prefix || ''}${p.firstName || ''} ${p.lastName || ''}`.trim();
        }
      }
      return '';
    };

    const sortedGroups = Array.from(subjectGroups.values()).sort((a, b) => {
      const ordA = getPrimarySubjectOrder(a.primary);
      const ordB = getPrimarySubjectOrder(b.primary);
      if (ordA !== ordB) return ordA - ordB;
      return (a.primary.code || '').localeCompare(b.primary.code || '', 'th');
    });

    const rows = sortedGroups.map(grp => {
      const subj = grp.primary;
      const rec1 = findStudentGradeForTerm(grp, '1');
      const rec2 = findStudentGradeForTerm(grp, '2');

      const isAct = isActivitySubject(subj) || isActivityRecord(rec1) || isActivityRecord(rec2);

      const max1 = (grp.sem1Subj || subj).totalScore || 50;
      const max2 = (grp.sem2Subj || subj).totalScore || 50;

      const total1Num = getNumericTotal(rec1);
      const total2Num = getNumericTotal(rec2);

      let total1Display = '-';
      let grade1Display = '-';
      let total2Display = '-';
      let grade2Display = '-';
      let avgTotalDisplay = '-';
      let combinedGradeDisplay = '-';
      const weight = subj.hoursPerWeek ? subj.hoursPerWeek / 2 : 1;

      if (isAct) {
        // Requirement 2: รวมภาคเรียน ตรง column คะแนน และ column รวมคะแนน ให้แสดง "ผ่าน หรือ ไม่ผ่าน"
        // เน้นภาคเรียนที่ 1 ก็ดึงของภาคเรียนที่ 1 / ภาคเรียนที่ 2 ก็ดึงของภาคเรียนที่ 2
        const act1 = (rec1?.activityResult === 'ผ่าน' || rec1?.activityResult === 'ไม่ผ่าน') ? rec1.activityResult : '-';
        const act2 = (rec2?.activityResult === 'ผ่าน' || rec2?.activityResult === 'ไม่ผ่าน') ? rec2.activityResult : '-';

        total1Display = act1;
        grade1Display = '-';

        total2Display = act2;
        grade2Display = '-';

        // Combined activity evaluation:
        if (act1 === 'ผ่าน' && act2 === 'ผ่าน') {
          avgTotalDisplay = 'ผ่าน';
        } else if (act1 === 'ไม่ผ่าน' || act2 === 'ไม่ผ่าน') {
          avgTotalDisplay = 'ไม่ผ่าน';
        } else if (act1 === 'ผ่าน' || act2 === 'ผ่าน') {
          avgTotalDisplay = 'ผ่าน';
        } else {
          avgTotalDisplay = '-';
        }
        combinedGradeDisplay = '-';

        // Non-credit: do not add to GPA
      } else {
        const grade1 = calculateThaiGrade(total1Num, max1);
        const grade2 = calculateThaiGrade(total2Num, max2);

        let avgTotal: number | null = null;
        let combinedMax = 100;
        if (isPrimaryGrade) {
          if (total1Num !== null && total2Num !== null) {
            avgTotal = Math.round((total1Num + total2Num) * 100) / 100;
            combinedMax = 100;
          } else if (total1Num !== null) {
            avgTotal = total1Num;
            combinedMax = 100;
          } else if (total2Num !== null) {
            avgTotal = total2Num;
            combinedMax = 100;
          }
        } else {
          if (total1Num !== null && total2Num !== null) {
            if (max1 + max2 === 100) {
              avgTotal = Math.round((total1Num + total2Num) * 100) / 100;
              combinedMax = 100;
            } else {
              avgTotal = Math.round(((total1Num + total2Num) / 2) * 100) / 100;
              combinedMax = (max1 + max2) / 2;
            }
          } else if (total1Num !== null) {
            avgTotal = total1Num;
            combinedMax = max1;
          } else if (total2Num !== null) {
            avgTotal = total2Num;
            combinedMax = max2;
          }
        }

        const combinedGrade = calculateThaiGrade(avgTotal, combinedMax);

        total1Display = total1Num !== null ? String(total1Num) : '-';
        grade1Display = grade1;

        total2Display = total2Num !== null ? String(total2Num) : '-';
        grade2Display = grade2;

        avgTotalDisplay = avgTotal !== null ? (Number.isInteger(avgTotal) ? String(avgTotal) : avgTotal.toFixed(1)) : '-';
        combinedGradeDisplay = combinedGrade;

        const pts1 = getGradePoints(grade1);
        if (pts1 !== null) {
          totalCredits1 += weight;
          totalPoints1 += pts1 * weight;
        }

        const pts2 = getGradePoints(grade2);
        if (pts2 !== null) {
          totalCredits2 += weight;
          totalPoints2 += pts2 * weight;
        }

        const ptsCombined = getGradePoints(combinedGrade);
        if (ptsCombined !== null) {
          totalCreditsCombined += weight;
          totalPointsCombined += ptsCombined * weight;
        }
      }

      const teacher1 = resolveSubjectTeacher(grp.sem1Subj) || (!grp.sem1Subj ? resolveSubjectTeacher(subj) : '');
      const teacher2 = resolveSubjectTeacher(grp.sem2Subj) || (!grp.sem2Subj ? resolveSubjectTeacher(subj) : '');
      const subjectTeacher = resolveSubjectTeacher(subj) || teacher1 || teacher2;

      return {
        subject: subj,
        isActivity: isAct,
        total1: total1Display,
        grade1: grade1Display,
        total2: total2Display,
        grade2: grade2Display,
        avgTotal: avgTotalDisplay,
        combinedGrade: combinedGradeDisplay,
        teacherDisplayName: subjectTeacher || advisorName || '-',
        teacher1DisplayName: teacher1 || advisorName || '-',
        teacher2DisplayName: teacher2 || advisorName || '-',
      };
    });

    const gpa1 = totalCredits1 > 0 ? (totalPoints1 / totalCredits1).toFixed(2) : '-';
    const gpa2 = totalCredits2 > 0 ? (totalPoints2 / totalCredits2).toFixed(2) : '-';
    const gpaCombined = totalCreditsCombined > 0 ? (totalPointsCombined / totalCreditsCombined).toFixed(2) : '-';

    return {
      rows,
      gpa1,
      gpa2,
      gpaCombined,
    };
  }, [effectiveSubjects, studentSubjects, effectiveGrades, student.id, student.gradeLevel, grade, semester, academicYear, personnel, advisorName, isPrimaryGrade]);

  // Helper to compute monthly attendance for a specific semester ('1' or '2')
  const computeTermAttendance = useMemo(() => {
    return (targetSem: string) => {
      const school100Days = get100SchoolDaysForTerm(academicYear, targetSem);
      const studentAttendance = effectiveAttendance.filter(a => a.studentId === student.id);
      const attendanceMap = new Map<string, string>();
      studentAttendance.forEach(a => {
        if (a.date && a.status) {
          attendanceMap.set(a.date, a.status);
        }
      });

      const thaiMonthNames: Record<number, string> = {
        1: 'มกราคม', 2: 'กุมภาพันธ์', 3: 'มีนาคม', 4: 'เมษายน',
        5: 'พฤษภาคม', 6: 'มิถุนายน', 7: 'กรกฎาคม', 8: 'สิงหาคม',
        9: 'กันยายน', 10: 'ตุลาคม', 11: 'พฤศจิกายน', 12: 'ธันวาคม'
      };

      const monthGroupsMap = new Map<string, { monthNum: number; days: { date: string }[] }>();
      school100Days.forEach(d => {
        const parts = d.date.split('-');
        const yyyyMm = `${parts[0]}-${parts[1]}`;
        const mNum = parseInt(parts[1] || '1', 10);
        if (!monthGroupsMap.has(yyyyMm)) {
          monthGroupsMap.set(yyyyMm, { monthNum: mNum, days: [] });
        }
        monthGroupsMap.get(yyyyMm)!.days.push(d);
      });

      const monthKeys = Array.from(monthGroupsMap.keys());
      let monthList: { monthTitle: string; schoolDays: number; days: { date: string }[] }[] = [];

      if (monthKeys.length > 0) {
        monthList = monthKeys.map((mKey, idx) => {
          const group = monthGroupsMap.get(mKey)!;
          const mName = thaiMonthNames[group.monthNum] || '';
          return {
            monthTitle: `เดือนที่ ${idx + 1} (${mName})`,
            schoolDays: group.days.length,
            days: group.days
          };
        });
      } else {
        const fallbackNames = targetSem === '2'
          ? ['พฤศจิกายน', 'ธันวาคม', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม']
          : ['พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน'];
        monthList = fallbackNames.map((mName, idx) => ({
          monthTitle: `เดือนที่ ${idx + 1} (${mName})`,
          schoolDays: 20,
          days: []
        }));
      }

      let termTotalPresent = 0;
      let termTotalAbsent = 0;
      let termTotalLeave = 0;
      let termTotalSick = 0;
      let termTotalRecorded = 0;

      const rows = monthList.map((mGroup) => {
        let pCount = 0;
        let aCount = 0;
        let lCount = 0;
        let sCount = 0;
        let recordedInMonth = 0;

        mGroup.days.forEach(d => {
          const status = attendanceMap.get(d.date);
          if (status === 'present') { pCount++; recordedInMonth++; }
          else if (status === 'absent') { aCount++; recordedInMonth++; }
          else if (status === 'leave') { lCount++; recordedInMonth++; }
          else if (status === 'sick') { sCount++; recordedInMonth++; }
        });

        termTotalPresent += pCount;
        termTotalAbsent += aCount;
        termTotalLeave += lCount;
        termTotalSick += sCount;
        termTotalRecorded += recordedInMonth;

        const hasRecord = recordedInMonth > 0;
        const pct = hasRecord ? ((pCount / recordedInMonth) * 100).toFixed(0) + '%' : '-';

        return {
          month: mGroup.monthTitle,
          schoolDays: mGroup.schoolDays,
          present: hasRecord ? pCount : '-',
          absent: hasRecord ? (aCount > 0 ? aCount : '-') : '-',
          leave: hasRecord ? (lCount > 0 ? lCount : '-') : '-',
          sick: hasRecord ? (sCount > 0 ? sCount : '-') : '-',
          percent: pct,
          rawPresent: pCount,
          rawAbsent: aCount,
          rawLeave: lCount,
          rawSick: sCount,
          recordedDays: recordedInMonth,
          hasRecord
        };
      });

      const sumSchoolDays = rows.reduce((acc, r) => acc + r.schoolDays, 0);
      const hasTermRecord = termTotalRecorded > 0;
      const sumPercentNum = hasTermRecord ? (termTotalPresent / termTotalRecorded) * 100 : 0;
      const sumPercent = hasTermRecord ? sumPercentNum.toFixed(1) + '%' : '-';

      return {
        rows,
        hasRecords: hasTermRecord,
        totals: {
          schoolDays: sumSchoolDays,
          present: hasTermRecord ? termTotalPresent : '-',
          absent: hasTermRecord ? (termTotalAbsent > 0 ? termTotalAbsent : '-') : '-',
          leave: hasTermRecord ? (termTotalLeave > 0 ? termTotalLeave : '-') : '-',
          sick: hasTermRecord ? (termTotalSick > 0 ? termTotalSick : '-') : '-',
          percent: sumPercent,
          percentNum: sumPercentNum,
          evaluation: hasTermRecord ? (sumPercentNum >= 80 ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์') : '-',
          rawPresent: termTotalPresent,
          rawAbsent: termTotalAbsent,
          rawLeave: termTotalLeave,
          rawSick: termTotalSick,
          rawRecorded: termTotalRecorded
        }
      };
    };
  }, [effectiveAttendance, student.id, academicYear]);

  // Attendance statistics for single selected semester
  const attendanceMonthlyRecords = useMemo(() => {
    return computeTermAttendance(semester);
  }, [computeTermAttendance, semester]);

  // Combined 2-Semester Attendance statistics (ภาคเรียนที่ 1 + ภาคเรียนที่ 2)
  const combinedAttendanceRecords = useMemo(() => {
    const term1 = computeTermAttendance('1');
    const term2 = computeTermAttendance('2');

    const schoolDays = term1.totals.schoolDays + term2.totals.schoolDays;
    const grandTotalRecorded = term1.totals.rawRecorded + term2.totals.rawRecorded;
    const hasGrandRecord = grandTotalRecorded > 0;

    const present = term1.totals.rawPresent + term2.totals.rawPresent;
    const absent = term1.totals.rawAbsent + term2.totals.rawAbsent;
    const leave = term1.totals.rawLeave + term2.totals.rawLeave;
    const sick = term1.totals.rawSick + term2.totals.rawSick;
    const percentNum = hasGrandRecord ? (present / grandTotalRecorded) * 100 : 0;
    const percent = hasGrandRecord ? percentNum.toFixed(1) + '%' : '-';

    return {
      term1,
      term2,
      hasRecords: hasGrandRecord,
      grandTotals: {
        schoolDays,
        present: hasGrandRecord ? present : '-',
        absent: hasGrandRecord ? (absent > 0 ? absent : '-') : '-',
        leave: hasGrandRecord ? (leave > 0 ? leave : '-') : '-',
        sick: hasGrandRecord ? (sick > 0 ? sick : '-') : '-',
        percent,
        percentNum,
        evaluation: hasGrandRecord ? (percentNum >= 80 ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์') : '-'
      }
    };
  }, [computeTermAttendance]);

  // Health data (Weight, Height, Toothbrushing, Milk) per semester and overall
  const computeTermHealth = useMemo(() => {
    const term1Days = new Set(get100SchoolDaysForTerm(academicYear, '1').map(d => d.date));
    const term2Days = new Set(get100SchoolDaysForTerm(academicYear, '2').map(d => d.date));

    const getDateTerm = (dateStr: string): '1' | '2' => {
      if (term1Days.has(dateStr)) return '1';
      if (term2Days.has(dateStr)) return '2';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const m = parseInt(dateStr.split('-')[1], 10);
        if (m >= 5 && m <= 10) return '1';
        return '2';
      }
      return semester === '2' ? '2' : '1';
    };

    const formatDateOnly = (dStr: string) => {
      if (!dStr) return '-';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
        const [y, m, d] = dStr.split('-');
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const thaiYear = parseInt(y, 10) > 2400 ? parseInt(y, 10) : parseInt(y, 10) + 543;
        const monthIndex = parseInt(m, 10) - 1;
        return `${parseInt(d, 10)} ${months[monthIndex] || m} ${thaiYear}`;
      }
      return dStr;
    };

    return (targetSem: '1' | '2') => {
      const termSchoolDays = get100SchoolDaysForTerm(academicYear, targetSem);
      const totalSchoolDays = termSchoolDays.length > 0 ? termSchoolDays.length : 103;

      const studentTermRecords = dailyTracking.filter(
        d => d.studentId === student.id && getDateTerm(d.date) === targetSem
      );

      // 1) Weight & Height rows for this semester
      const weightRecords = studentTermRecords
        .filter(d => (d.weight || 0) > 0 || (d.height || 0) > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

      const weightHeightRows = weightRecords.length > 0
        ? weightRecords.map((d, index) => {
            const w = d.weight > 0 ? d.weight : 0;
            const h = d.height > 0 ? d.height : 0;
            const nutri = calculateThaiNutritionalStatus(w, h, student);
            return {
              no: String(index + 1),
              date: formatDateOnly(d.date),
              weight: w > 0 ? Number(w).toFixed(1) : '-',
              height: h > 0 ? String(h) : '-',
              bmi: w > 0 && h > 0 && nutri.bmi > 0 ? String(nutri.bmi) : '-',
              bmiStatus: w > 0 && h > 0 && nutri.bmi > 0 ? nutri.status : '-'
            };
          })
        : [
            {
              no: '-',
              date: '-',
              weight: '-',
              height: '-',
              bmi: '-',
              bmiStatus: '-'
            }
          ];

      // 2) & 3) Milk & Toothbrushing explicitly recorded in the ดื่มนม-แปรงฟัน page
      const milkTeethRecords = studentTermRecords.filter(d => isMilkTeethRecorded(d));

      let milkFull = 0;
      let milkNone = 0;
      let milkAllergic = 0;
      let teethClean = 0;
      let teethNone = 0;

      milkTeethRecords.forEach(d => {
        if (d.milkStatus === 'ดื่มครบ') milkFull++;
        else if (d.milkStatus === 'ไม่ได้ดื่ม') milkNone++;
        else if (d.milkStatus === 'แพ้นม') milkAllergic++;

        if (d.toothBrushStatus === 'แปรงฟันแล้ว') teethClean++;
        else if (d.toothBrushStatus === 'ยังไม่ได้แปรง') teethNone++;
      });

      const milkRecordedCount = milkFull + milkNone + milkAllergic;
      const hasMilkRecorded = milkRecordedCount > 0;
      const milkTotal = totalSchoolDays;
      const milkRate = hasMilkRecorded && milkTotal > 0 ? ((milkFull / milkTotal) * 100).toFixed(1) : '-';

      const teethRecordedCount = teethClean + teethNone;
      const hasTeethRecorded = teethRecordedCount > 0;
      const teethTotal = totalSchoolDays;
      const teethRate = hasTeethRecorded && teethTotal > 0 ? ((teethClean / teethTotal) * 100).toFixed(1) : '-';

      return {
        weightHeightRows,
        hasWeightRecorded: weightRecords.length > 0,
        hasMilkRecorded,
        hasTeethRecorded,
        hasMilkTeethRecorded: hasMilkRecorded || hasTeethRecorded,
        milkFull: hasMilkRecorded ? String(milkFull) : '-',
        milkTotal: String(milkTotal),
        milkRate: hasMilkRecorded ? `${milkRate}%` : '-',
        teethClean: hasTeethRecorded ? String(teethClean) : '-',
        teethTotal: String(teethTotal),
        teethRate: hasTeethRecorded ? `${teethRate}%` : '-',
        rawMilkFull: milkFull,
        rawMilkTotal: milkTotal,
        rawTeethClean: teethClean,
        rawTeethTotal: teethTotal
      };
    };
  }, [dailyTracking, student, academicYear, semester]);

  const currentTermHealth = useMemo(() => {
    return computeTermHealth(semester === '2' ? '2' : '1');
  }, [computeTermHealth, semester]);

  const combinedHealth = useMemo(() => {
    const term1 = computeTermHealth('1');
    const term2 = computeTermHealth('2');
    const hasMilkTeethRecorded = term1.hasMilkTeethRecorded || term2.hasMilkTeethRecorded;
    const hasMilkRecorded = term1.hasMilkRecorded || term2.hasMilkRecorded;
    const hasTeethRecorded = term1.hasTeethRecorded || term2.hasTeethRecorded;
    return {
      term1,
      term2,
      hasMilkTeethRecorded,
      hasMilkRecorded,
      hasTeethRecorded
    };
  }, [computeTermHealth]);

  const healthStats = useMemo(() => {
    const studentTracking = dailyTracking.filter(d => d.studentId === student.id);
    const sorted = [...studentTracking].sort((a, b) => b.date.localeCompare(a.date));
    const latestWithWeight = sorted.find(d => d.weight > 0 && d.height > 0);
    const currentWeight = latestWithWeight ? latestWithWeight.weight : 0;
    const currentHeight = latestWithWeight ? latestWithWeight.height : 0;
    const nutri = calculateThaiNutritionalStatus(currentWeight, currentHeight, student);

    return {
      weight: currentWeight || 0,
      height: currentHeight || 0,
      bmi: nutri.bmi > 0 ? nutri.bmi : 0,
      bmiStatus: nutri.bmi > 0 ? nutri.status : '-'
    };
  }, [dailyTracking, student]);

  const parseThaiBirthDate = (bDateStr?: string) => {
    if (!bDateStr) return { day: '', month: '', year: '' };
    if (bDateStr.includes('-')) {
      const parts = bDateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0]);
        const mIndex = parseInt(parts[1]) - 1;
        const d = parseInt(parts[2]);
        const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        return {
          day: d.toString(),
          month: thaiMonths[mIndex] || parts[1],
          year: (y > 2500 ? y : y + 543).toString()
        };
      }
    }
    const parts = bDateStr.trim().split(/\s+/);
    if (parts.length >= 3) {
      return { day: parts[0], month: parts[1], year: parts[2] };
    }
    return { day: bDateStr, month: '', year: '' };
  };

  const gradeRowsList = useMemo(() => {
    if (grade.startsWith('อ.')) {
      return [
        { levelCode: 'อ.1', levelName: 'ชั้นอนุบาลปีที่ 1' },
        { levelCode: 'อ.2', levelName: 'ชั้นอนุบาลปีที่ 2' },
        { levelCode: 'อ.3', levelName: 'ชั้นอนุบาลปีที่ 3' }
      ];
    } else if (grade.startsWith('ม.4') || grade.startsWith('ม.5') || grade.startsWith('ม.6')) {
      return [
        { levelCode: 'ม.4', levelName: 'ชั้นมัธยมศึกษาปีที่ 4' },
        { levelCode: 'ม.5', levelName: 'ชั้นมัธยมศึกษาปีที่ 5' },
        { levelCode: 'ม.6', levelName: 'ชั้นมัธยมศึกษาปีที่ 6' }
      ];
    } else if (grade.startsWith('ม.')) {
      return [
        { levelCode: 'ม.1', levelName: 'ชั้นมัธยมศึกษาปีที่ 1' },
        { levelCode: 'ม.2', levelName: 'ชั้นมัธยมศึกษาปีที่ 2' },
        { levelCode: 'ม.3', levelName: 'ชั้นมัธยมศึกษาปีที่ 3' }
      ];
    } else {
      // Default: Elementary ป.1 - ป.6
      return [
        { levelCode: 'ป.1', levelName: 'ชั้นประถมศึกษาปีที่ 1' },
        { levelCode: 'ป.2', levelName: 'ชั้นประถมศึกษาปีที่ 2' },
        { levelCode: 'ป.3', levelName: 'ชั้นประถมศึกษาปีที่ 3' },
        { levelCode: 'ป.4', levelName: 'ชั้นประถมศึกษาปีที่ 4' },
        { levelCode: 'ป.5', levelName: 'ชั้นประถมศึกษาปีที่ 5' },
        { levelCode: 'ป.6', levelName: 'ชั้นประถมศึกษาปีที่ 6' }
      ];
    }
  }, [grade]);

  const startAcademicYear = useMemo(() => {
    const currentYr = parseInt(academicYear) || 2568;
    const levelOrder = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];
    const idx = levelOrder.indexOf(grade);
    if (idx >= 0) {
      return (currentYr - idx).toString();
    }
    return academicYear;
  }, [academicYear, grade]);

  const renderDigitBoxes = (digitsStr?: string, defaultLength = 13) => {
    const cleanDigits = (digitsStr || '').replace(/\D/g, '');
    const boxes = [];
    for (let i = 0; i < defaultLength; i++) {
      const digit = cleanDigits[i] || '';
      boxes.push(
        <span key={i} className="inline-flex items-center justify-center w-4 h-5 border border-slate-800 text-[11px] font-mono font-bold bg-white text-slate-900">
          {digit}
        </span>
      );
      if (defaultLength === 13 && (i === 0 || i === 4 || i === 9 || i === 11)) {
        boxes.push(<span key={`dash-${i}`} className="px-0.5 text-xs text-slate-800 font-bold">-</span>);
      }
    }
    return <div className="inline-flex items-center gap-0.5 mx-1">{boxes}</div>;
  };

  const pp6ContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handlePrint = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const filename = `ปพ6_${student.prefix}${student.firstName}_${student.lastName}_${grade}_เทอม${semester}_${academicYear}.pdf`;
      const ok = await exportSheetsToPdf({
        container: pp6ContainerRef.current,
        filename,
        orientation: 'portrait',
      });
      if (ok) {
        onShowToast('success', 'ดาวน์โหลด ปพ.6 สำเร็จ', `บันทึกไฟล์ ${filename} เรียบร้อยแล้ว`);
      } else {
        onShowToast('error', 'ไม่พบหน้าเอกสาร', 'ไม่สามารถสร้างไฟล์ PDF ได้');
      }
    } catch (err) {
      console.error('PP6 PDF export error:', err);
      onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ PDF ได้');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-100 rounded-3xl w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 animate-in fade-in zoom-in-95 duration-150 my-auto print:border-none print:shadow-none print:max-h-none print:rounded-none print:w-full">
        
        {/* Modal Top Header (Hidden on Print) */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 rounded-t-3xl flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  แบบรายงานประจำตัวนักเรียน (ปพ.6)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200">
                  {getGradeCleanName(grade)}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ปีการศึกษา {academicYear} ภาคเรียนที่ {semester}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                เลขที่ {student.rollNumber || '-'} • รหัส {student.studentCode || '-'} • {student.prefix}{student.firstName} {student.lastName} {student.nickname ? `(${student.nickname})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Class Advisor Selector Bar (Auto-detects from "ข้อมูล/อื่นๆ" > บุคลากร with manual selector to prevent missing data) */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-purple-50 via-indigo-50/70 to-purple-50 border-b border-purple-200/90 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 shrink-0">
              <UserCheck className="w-4 h-4 text-purple-700" />
              <span>ครูประจำชั้น ({targetGrade}):</span>
            </div>

            <div className="relative">
              <select
                value={selectedAdvisorId}
                onChange={(e) => handleAdvisorChange(e.target.value)}
                className="text-xs bg-white border border-purple-300 font-semibold text-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs cursor-pointer min-w-[240px]"
              >
                <option value="">
                  {autoDetectedAdvisor 
                    ? `✨ ดึงอัตโนมัติ (${targetGrade}): ${autoDetectedAdvisor.prefix}${autoDetectedAdvisor.firstName} ${autoDetectedAdvisor.lastName}`
                    : '-- เลือกชื่อบุคลากร (จากหน้าข้อมูล/อื่นๆ) --'}
                </option>
                {personnel.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.prefix}{p.firstName} {p.lastName} {p.advisorGrade ? `[ครูประจำชั้น ${p.advisorGrade}]` : p.position ? `[${p.position}]` : ''}
                  </option>
                ))}
                <option value="custom">✍️ พิมพ์ระบุชื่อเอง...</option>
              </select>
            </div>

            {selectedAdvisorId === 'custom' && (
              <input
                type="text"
                value={customAdvisorName}
                onChange={(e) => handleCustomAdvisorChange(e.target.value)}
                placeholder="ระบุคำนำหน้า ชื่อ นามสกุล..."
                className="text-xs bg-white border border-purple-300 rounded-xl px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[200px]"
              />
            )}

            {effectiveAdvisorName ? (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ลายเซ็นใน ปพ.6: ({effectiveAdvisorName})</span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-200">
                ⚠️ ยังไม่พบลายเซ็นครูประจำชั้น (สามารถเลือกชื่อบุคลากรจากตัวเลือกด้านซ้าย)
              </span>
            )}
          </div>


        </div>

        {/* 6 Tabs Navigation Bar (Hidden on Print) */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('cover')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'cover'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <span>📜</span>
            <span>ปก</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>ข้อมูลนักเรียน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'academic'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>วัดผล</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>เวลาเรียน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'health'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>สุขภาพ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'comments'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>ความคิดเห็น</span>
          </button>

          {/* ปุ่ม "รวมภาคเรียน" สำหรับหน้าวัดผล, หน้าเวลาเรียน และหน้าสุขภาพ */}
          {(activeTab === 'academic' || activeTab === 'attendance' || activeTab === 'health' || activeTab === 'all') && (
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'academic') {
                  setIsCombinedAcademic(prev => !prev);
                } else if (activeTab === 'attendance') {
                  setIsCombinedAttendance(prev => !prev);
                } else if (activeTab === 'health') {
                  setIsCombinedHealth(prev => !prev);
                } else {
                  const next = !(isCombinedAcademic && isCombinedAttendance && isCombinedHealth);
                  setIsCombinedAcademic(next);
                  setIsCombinedAttendance(next);
                  setIsCombinedHealth(next);
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                (activeTab === 'academic' && isCombinedAcademic) ||
                (activeTab === 'attendance' && isCombinedAttendance) ||
                (activeTab === 'health' && isCombinedHealth) ||
                (activeTab === 'all' && isCombinedAcademic && isCombinedAttendance && isCombinedHealth)
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
              }`}
              title="สลับแสดงข้อมูลรวมทั้ง 2 ภาคเรียน (เทอม 1 + เทอม 2)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>รวมภาคเรียน</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ml-auto ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
            title="แสดงรายงาน ปพ.6 ครบทุกหน้าสำหรับสั่งพิมพ์เล่มสมบูรณ์"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ดูทั้งหมด (พิมพ์เล่ม)</span>
          </button>
        </div>

        {/* Modal Scrollable Body: A4 Paper Container */}
        <div ref={pp6ContainerRef} className="p-4 sm:p-6 overflow-y-auto space-y-8 bg-slate-200/70 flex-1 print:p-0 print:bg-white print:overflow-visible">
          
          {/* TAB 1: ปก (COVER PAGE - Formatted as per reference PDF) */}
          {(activeTab === 'cover' || activeTab === 'all') && (
            <div
              className="a4-pp6-page bg-white border border-slate-300 rounded-lg py-6 sm:py-8 max-w-[210mm] min-h-[297mm] mx-auto text-slate-900 shadow-xl print:border-none print:shadow-none print:m-0 font-['Sarabun','TH_Sarabun_New',sans-serif] text-[13px] leading-relaxed flex flex-col justify-between"
              style={{ width: '210mm', maxWidth: '210mm', paddingLeft: '20mm', paddingRight: '15mm' }}
            >
              <div>
                {/* Top Section: Logo in Center, Photo on Right, Title Block centered under Logo */}
                <div className="relative mb-5">
                  {/* Student Photo Frame (Fixed to Top-Right of Page Content) */}
                  <div className="absolute right-0 top-0 w-[3.2cm] h-[4.2cm] border-2 border-slate-800 p-0.5 bg-white shrink-0 overflow-hidden text-center flex flex-col items-center justify-center shadow-2xs z-10">
                    {student.photoUrl ? (
                      <img 
                        src={student.photoUrl} 
                        alt={student.firstName} 
                        className="w-full h-full object-cover"
                        onClick={() => onOpenLightbox && student.photoUrl && onOpenLightbox(student.photoUrl, `${student.prefix}${student.firstName} ${student.lastName}`)}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-300">
                        <User className="w-8 h-8 text-slate-300" />
                        <span className="text-[10px] mt-1 text-slate-500">รูปถ่าย 2 นิ้ว</span>
                      </div>
                    )}
                  </div>

                  {/* Centered Logo and Title Block */}
                  <div className="flex flex-col items-center justify-center text-center">
                    {/* School Emblem / Logo */}
                    <div className="text-center">
                      {schoolInfo.logoUrl ? (
                        <img src={schoolInfo.logoUrl} alt="School Logo" className="w-28 h-28 sm:w-32 sm:h-32 object-contain mx-auto" />
                      ) : (
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-4xl mx-auto">
                          🏫
                        </div>
                      )}
                    </div>

                    {/* Title Block: Spaced 0.3cm below Logo and centered horizontally with Logo */}
                    <div className="text-center space-y-1" style={{ marginTop: '0.3cm' }}>
                      <h1 className="text-xl font-bold text-slate-900 tracking-wide font-['Sarabun','TH_Sarabun_New',sans-serif]">
                        สมุดรายงาน
                      </h1>
                      <h2 className="text-lg font-bold text-slate-900 font-['Sarabun','TH_Sarabun_New',sans-serif]">
                        ผลการพัฒนาคุณภาพผู้เรียนรายบุคคล
                      </h2>
                      <p className="text-sm font-bold text-slate-800 font-['Sarabun','TH_Sarabun_New',sans-serif]">
                        {grade.startsWith('อ.') ? 'ระดับปฐมวัย (อ.1 - อ.3)' : 
                         grade.startsWith('ม.4') || grade.startsWith('ม.5') || grade.startsWith('ม.6') ? 'ระดับมัธยมศึกษาตอนปลาย (ม.4 - ม.6)' :
                         grade.startsWith('ม.') ? 'ระดับมัธยมศึกษาตอนต้น (ม.1 - ม.3)' : 'ระดับประถมศึกษาปีที่ 1-6'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* School & Student Info Lines */}
                <div className="space-y-1.5 text-[13px] mb-6">
                  <div className="flex flex-wrap items-baseline gap-1">
                    <span className="font-bold text-slate-900">โรงเรียน :</span>
                    <span className="font-semibold text-slate-900 px-2 border-b border-dotted border-slate-600 inline-block min-w-[220px]">{cleanSchoolName}</span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-4">
                    <div>
                      <span className="font-bold text-slate-900">ตำบล :</span>
                      <span className="px-2 border-b border-dotted border-slate-600 inline-block min-w-[100px]">{schoolInfo.subdistrict || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">อำเภอ :</span>
                      <span className="px-2 border-b border-dotted border-slate-600 inline-block min-w-[100px]">{schoolInfo.district || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">จังหวัด :</span>
                      <span className="px-2 border-b border-dotted border-slate-600 inline-block min-w-[100px]">{schoolInfo.province || '-'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-1">
                    <span className="font-bold text-slate-900">สังกัด :</span>
                    <span className="px-2 border-b border-dotted border-slate-600 flex-1 inline-block">
                      {schoolInfo.affiliation ? (schoolInfo.affiliation.startsWith('สังกัด') ? schoolInfo.affiliation.replace(/^สังกัด\s*/, '') : schoolInfo.affiliation) : 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษา กระทรวงศึกษาธิการ'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="font-bold text-slate-900">ชื่อ :</span>
                      <span className="px-2 border-b border-dotted border-slate-600 font-semibold text-slate-900 inline-block w-[80%]">{student.prefix}{student.firstName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">ชื่อสกุล :</span>
                      <span className="px-2 border-b border-dotted border-slate-600 font-semibold text-slate-900 inline-block w-[80%]">{student.lastName}</span>
                    </div>
                  </div>

                  {(() => {
                    const parsedBdate = parseThaiBirthDate(student.birthDate);
                    return (
                      <div className="flex flex-wrap items-baseline gap-3 pt-0.5">
                        <div>
                          <span className="font-bold text-slate-900">เกิดวันที่</span>
                          <span className="px-2 border-b border-dotted border-slate-600 inline-block text-center min-w-[40px]">{parsedBdate.day}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">เดือน</span>
                          <span className="px-2 border-b border-dotted border-slate-600 inline-block text-center min-w-[110px]">{parsedBdate.month}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">พุทธศักราช</span>
                          <span className="px-2 border-b border-dotted border-slate-600 inline-block text-center min-w-[60px]">{parsedBdate.year}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex flex-wrap items-baseline justify-between gap-2 pt-0.5">
                    <div>
                      <span className="font-bold text-slate-900">เลขประจำตัวนักเรียน :</span>
                      <span className="px-2 border-b border-dotted border-slate-600 font-mono font-bold text-slate-900 inline-block min-w-[100px] text-center">{student.studentCode || student.rollNumber || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">เลขประจำตัวประชาชน :</span>
                      <span className="px-2 border-b border-dotted border-slate-600 font-mono font-bold text-slate-900 inline-block min-w-[160px] text-center">{student.idCard || '-'}</span>
                    </div>
                  </div>

                  <div className="pt-0.5">
                    <span className="font-bold text-slate-900">ปีการศึกษาที่เริ่มเรียน :</span>
                    <span className="px-2 border-b border-dotted border-slate-600 font-bold text-slate-900 inline-block min-w-[100px] text-center">{startAcademicYear}</span>
                  </div>
                </div>

                {/* Grade Levels Progress Table */}
                <div className="border border-slate-800 rounded-xs overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody>
                      {gradeRowsList.map((gRow, idx) => {
                        const isCurrent = gRow.levelCode === grade;
                        const rowBorderB = idx < gradeRowsList.length - 1 ? 'border-b border-slate-800' : '';
                        return (
                          <tr key={gRow.levelCode} className="bg-white">
                            <td className={`p-2 space-y-1 align-top ${rowBorderB}`}>
                              <div className="flex flex-wrap items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-slate-900">ปีการศึกษา</span>
                                  <span className="px-3 border-b border-slate-800 inline-block text-center font-bold min-w-[80px]">
                                    {isCurrent ? academicYear : ''}
                                  </span>
                                </div>

                                <div>
                                  <span className="font-bold text-slate-900">{gRow.levelName}</span>
                                </div>

                                <div>
                                  <span className="font-bold text-slate-900">ห้อง</span>
                                  <span className="px-2 border-b border-slate-800 inline-block text-center font-bold min-w-[40px]">
                                    {isCurrent ? (student.room || '1') : ''}
                                  </span>
                                </div>

                                <div>
                                  <span className="font-bold text-slate-900">เลขที่</span>
                                  <span className="px-2 border-b border-slate-800 inline-block text-center font-bold min-w-[40px]">
                                    {isCurrent ? (student.rollNumber || '-') : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-0.5 pt-1 text-[11px]">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-bold text-slate-900 shrink-0">ครูประจำชั้น</span>
                                  <span className="border-b border-slate-800 flex-1 px-2 font-medium text-slate-900 min-h-[16px]">
                                    {isCurrent ? advisorName : ''}
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <span className="font-bold text-slate-900 shrink-0">ครูประจำชั้น</span>
                                  <span className="border-b border-slate-800 flex-1 px-2 font-medium text-slate-900 min-h-[16px]"></span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <span className="font-bold text-slate-900 shrink-0">ครูประจำชั้น</span>
                                  <span className="border-b border-slate-800 flex-1 px-2 font-medium text-slate-900 min-h-[16px]"></span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: ข้อมูลนักเรียน (STUDENT PROFILE - Formatted as per reference PDF) */}
          {(activeTab === 'info' || activeTab === 'all') && (
            <div className="space-y-8 print:space-y-0 font-['Sarabun','TH_Sarabun_New',sans-serif]">
              {/* Page 1 of Student Profile */}
              <div
                className="a4-pp6-page bg-white border border-slate-300 rounded-lg py-6 sm:py-8 max-w-[210mm] min-h-[297mm] mx-auto text-slate-900 shadow-xl print:border-none print:shadow-none print:m-0 print:break-before-page text-[13px] leading-relaxed flex flex-col justify-between"
                style={{ width: '210mm', maxWidth: '210mm', paddingLeft: '20mm', paddingRight: '15mm' }}
              >
                <div>
                  {/* Title: ข้อมูลส่วนตัวผู้เรียน */}
                  <div className="text-center mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-wide font-['Sarabun','TH_Sarabun_New',sans-serif]">
                      ข้อมูลส่วนตัวผู้เรียน
                    </h2>
                  </div>

                  {/* Header Row: Basic details on Left + Photo Frame on Right */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dotted border-slate-400 pb-1">
                        <div>
                          <span className="font-bold text-slate-900">ชื่อ–สกุล:</span>
                          <span className="ml-2 font-semibold text-slate-900">{student.prefix}{student.firstName} {student.lastName}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">เลขประจำตัว:</span>
                          <span className="ml-2 font-mono font-bold text-slate-900">{student.studentCode || student.rollNumber || '-'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-b border-dotted border-slate-400 pb-1">
                        <span className="font-bold text-slate-900 shrink-0">เลขประจำตัวประชาชน:</span>
                        {renderDigitBoxes(student.idCard || '')}
                      </div>

                      <div className="flex flex-wrap items-baseline gap-6 border-b border-dotted border-slate-400 pb-1">
                        <div>
                          <span className="font-bold text-slate-900">ชื่อเล่น:</span>
                          <span className="ml-2 text-slate-900">{student.nickname || '-'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">เพศ:</span>
                          <span className="ml-2 text-slate-900">{student.gender || (student.prefix.includes('หญิง') ? 'หญิง' : 'ชาย')}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-baseline gap-6 border-b border-dotted border-slate-400 pb-1">
                        <div>
                          <span className="font-bold text-slate-900">วัน เดือน ปีเกิด:</span>
                          <span className="ml-2 text-slate-900">{student.birthDate || '-'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">อายุ:</span>
                          <span className="ml-2 text-slate-900">{student.age ? `${student.age} ปี` : '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Student Photo Box */}
                    <div className="shrink-0 text-center">
                      <div className="w-[3.2cm] h-[4.2cm] border-2 border-slate-800 p-0.5 bg-white shadow-xs flex items-center justify-center overflow-hidden">
                        {student.photoUrl ? (
                          <img 
                            src={student.photoUrl} 
                            alt={student.firstName} 
                            className="w-full h-full object-cover"
                            onClick={() => onOpenLightbox && student.photoUrl && onOpenLightbox(student.photoUrl, `${student.prefix}${student.firstName} ${student.lastName}`)}
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-300">
                            <User className="w-8 h-8 text-slate-300" />
                            <span className="text-[10px] mt-1 text-slate-500">รูปถ่าย 2 นิ้ว</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <hr className="border-t-2 border-slate-900 my-3" />

                  {/* Section: สถานะและชั้นเรียน */}
                  <div className="space-y-1.5 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">สถานะและชั้นเรียน</h3>
                    <div className="grid grid-cols-2 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">สถานะนักเรียน:</span>
                        <span className="ml-2 text-slate-900">{student.status || 'ปกติ'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">ความด้อยโอกาส:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">วันที่เข้าเรียน:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">วันที่ออกจากโรงเรียน:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-t border-slate-800 my-3" />

                  {/* Section: สุขภาพ */}
                  <div className="space-y-1.5 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">สุขภาพ</h3>
                    <div className="grid grid-cols-3 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">กลุ่มเลือด:</span>
                        <span className="ml-2 text-slate-900">{(student as any).bloodGroup || '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">น้ำหนัก:</span>
                        <span className="ml-2 text-slate-900">{healthStats.weight ? `${healthStats.weight}` : '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">ส่วนสูง:</span>
                        <span className="ml-2 text-slate-900">{healthStats.height ? `${healthStats.height}` : '-'}</span>
                      </div>
                    </div>
                    <div className="border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900">วันที่ชั่งน้ำหนัก–ส่วนสูง:</span>
                      <span className="ml-2 text-slate-900">-</span>
                    </div>
                    <div className="border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900">โรคประจำตัว:</span>
                      <span className="ml-2 text-slate-900">{student.chronicDisease || '-'}</span>
                    </div>
                    <div className="border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900">โรคภูมิแพ้ / แพ้อะไร:</span>
                      <span className="ml-2 text-slate-900">{(student as any).allergies || (student as any).allergy || '-'}</span>
                    </div>
                  </div>

                  <hr className="border-t border-slate-800 my-3" />

                  {/* Section: ศาสนาและสัญชาติ */}
                  <div className="space-y-1.5 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">ศาสนาและสัญชาติ</h3>
                    <div className="grid grid-cols-2 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">ศาสนา:</span>
                        <span className="ml-2 text-slate-900">{student.religion || 'พุทธ'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">เชื้อชาติ:</span>
                        <span className="ml-2 text-slate-900">ไทย</span>
                      </div>
                    </div>
                    <div className="border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900">สัญชาติ:</span>
                      <span className="ml-2 text-slate-900">ไทย</span>
                    </div>
                  </div>

                  <hr className="border-t border-slate-800 my-3" />

                  {/* Section: ที่อยู่และติดต่อ */}
                  <div className="space-y-1.5 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">ที่อยู่และติดต่อ</h3>
                    <div className="grid grid-cols-3 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">เลขประจำบ้าน:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">บ้านเลขที่:</span>
                        <span className="ml-2 text-slate-900">{student.address || student.guardianAddress || '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">หมู่ที่:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">ถนน:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">ซอย:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">ตำบล:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">อำเภอ:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">จังหวัด:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">รหัสไปรษณีย์:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">เบอร์โทรศัพท์:</span>
                        <span className="ml-2 font-mono text-slate-900">{student.guardianPhone || student.fatherPhone || student.motherPhone || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page 2 of Student Profile (Matching Reference PDF Page 2) */}
              <div
                className="a4-pp6-page bg-white border border-slate-300 rounded-lg pt-6 sm:pt-8 max-w-[210mm] min-h-[297mm] mx-auto text-slate-900 shadow-xl print:border-none print:shadow-none print:m-0 print:break-before-page text-[13px] leading-relaxed flex flex-col justify-between"
                style={{ width: '210mm', maxWidth: '210mm', paddingLeft: '20mm', paddingRight: '15mm', paddingBottom: '2.3cm' }}
              >
                <div>
                  {/* Section: โรงเรียนเดิม */}
                  <div className="space-y-1.5 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">โรงเรียนเดิม</h3>
                    <div className="border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900">โรงเรียนเดิม:</span>
                      <span className="ml-2 text-slate-900">-</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">สังกัดโรงเรียนเดิม:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">จังหวัด:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                    </div>
                    <div className="border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900">ที่อยู่โรงเรียนเดิม:</span>
                      <span className="ml-2 text-slate-900">-</span>
                    </div>
                  </div>

                  <hr className="border-t border-slate-800 my-3" />

                  {/* Section: บิดา */}
                  <div className="space-y-1.5 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">บิดา</h3>
                    <div className="grid grid-cols-2 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">ชื่อบิดา:</span>
                        <span className="ml-2 text-slate-900">{student.fatherPrefix || ''}{student.fatherName || '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">อาชีพ:</span>
                        <span className="ml-2 text-slate-900">{student.fatherOccupation || '-'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">รายได้:</span>
                        <span className="ml-2 text-slate-900">{student.fatherIncome ? `${student.fatherIncome} บาท` : '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">โทรศัพท์:</span>
                        <span className="ml-2 font-mono text-slate-900">{student.fatherPhone || '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">อีเมล:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900 shrink-0">เลขประจำตัวประชาชนบิดา:</span>
                      {renderDigitBoxes((student as any).fatherIdCard || '')}
                    </div>
                  </div>

                  <hr className="border-t border-slate-800 my-3" />

                  {/* Section: มารดา */}
                  <div className="space-y-1.5 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">มารดา</h3>
                    <div className="grid grid-cols-2 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">ชื่อมารดา:</span>
                        <span className="ml-2 text-slate-900">{student.motherPrefix || ''}{student.motherName || '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">อาชีพ:</span>
                        <span className="ml-2 text-slate-900">{student.motherOccupation || '-'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">รายได้:</span>
                        <span className="ml-2 text-slate-900">{student.motherIncome ? `${student.motherIncome} บาท` : '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">โทรศัพท์:</span>
                        <span className="ml-2 font-mono text-slate-900">{student.motherPhone || '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">อีเมล:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900 shrink-0">เลขประจำตัวประชาชนมารดา:</span>
                      {renderDigitBoxes((student as any).motherIdCard || '')}
                    </div>
                  </div>

                  <hr className="border-t border-slate-800 my-3" />

                  {/* Section: ผู้ปกครอง */}
                  <div className="space-y-1.5 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">ผู้ปกครอง</h3>
                    <div className="grid grid-cols-2 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">ชื่อผู้ปกครอง:</span>
                        <span className="ml-2 text-slate-900">{student.guardianPrefix || ''}{student.guardianName || student.fatherName || student.motherName || '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">ความสัมพันธ์:</span>
                        <span className="ml-2 text-slate-900">{student.guardianRelation || '-'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">อาชีพ:</span>
                        <span className="ml-2 text-slate-900">{student.guardianOccupation || student.fatherOccupation || student.motherOccupation || '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">โทรศัพท์:</span>
                        <span className="ml-2 font-mono text-slate-900">{student.guardianPhone || student.fatherPhone || student.motherPhone || '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">อีเมล:</span>
                        <span className="ml-2 text-slate-900">-</span>
                      </div>
                    </div>
                    <div className="border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900">ที่อยู่ผู้ปกครอง:</span>
                      <span className="ml-2 text-slate-900">{student.guardianAddress || student.address || '-'}</span>
                    </div>
                  </div>

                  <hr className="border-t border-slate-800 my-3" />

                  {/* Section: ติดต่อฉุกเฉิน */}
                  <div className="space-y-1.5 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">ติดต่อฉุกเฉิน</h3>
                    <div className="grid grid-cols-2 gap-4 border-b border-dotted border-slate-400 pb-1">
                      <div>
                        <span className="font-bold text-slate-900">ให้ติดต่อ:</span>
                        <span className="ml-2 text-slate-900">{student.guardianName || student.fatherName || student.motherName || '-'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">ความสัมพันธ์:</span>
                        <span className="ml-2 text-slate-900">{student.guardianRelation || 'ผู้ปกครอง'}</span>
                      </div>
                    </div>
                    <div className="border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900">เบอร์โทรศัพท์:</span>
                      <span className="ml-2 font-mono text-slate-900">{student.guardianPhone || student.fatherPhone || student.motherPhone || '-'}</span>
                    </div>
                  </div>

                  <hr className="border-t border-slate-800 my-3" />

                  {/* Section: หมายเหตุ */}
                  <div className="space-y-1.5 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">หมายเหตุ</h3>
                    <div className="border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900">หมายเหตุ:</span>
                      <span className="ml-2 text-slate-900">-</span>
                    </div>
                    <div className="border-b border-dotted border-slate-400 pb-1">
                      <span className="font-bold text-slate-900">ครูผู้บันทึก:</span>
                      <span className="ml-2 text-slate-900">{advisorName}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Signature - exactly 2.3cm from bottom edge */}
                <div className="pt-4 text-center text-xs text-black mt-auto mb-0">
                  <div className="w-64 mx-auto space-y-1 text-black">
                    <p className="text-black">ลงชื่อ ..............................................................</p>
                    <p className="font-normal text-black">({advisorName || '......................................................'})</p>
                    <p className="text-black font-semibold text-[11px] leading-none m-0 p-0">ครูประจำชั้น</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: วัดผล (ACADEMIC EVALUATION & GRADES) */}
          {(activeTab === 'academic' || activeTab === 'all') && (
            <div className="space-y-3">
              {/* Mode Selector Bar above A4 sheet (Hidden on Print & PDF) */}
              <div className="max-w-[210mm] mx-auto bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 print:hidden no-print" data-pdf-ignore="true">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>รูปแบบการแสดงผลหน้าวัดผล:</span>
                </div>
                <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCombinedAcademic(false)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !isCombinedAcademic
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-700 hover:bg-white/70'
                    }`}
                  >
                    ภาคเรียนที่ {semester}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCombinedAcademic(true)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCombinedAcademic
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-700 hover:bg-white/70'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>รวมภาคเรียน</span>
                  </button>
                </div>
              </div>

              <div
                className="a4-pp6-page bg-white border border-slate-300 rounded-lg py-6 sm:py-8 max-w-[210mm] min-h-[297mm] mx-auto text-black shadow-xl print:border-none print:shadow-none print:m-0 print:break-before-page flex flex-col justify-between"
                style={{ width: '210mm', maxWidth: '210mm', paddingLeft: '20mm', paddingRight: '15mm', color: '#000000' }}
              >
                
                <div className="space-y-6">
                  {renderPP6Header(undefined, undefined, isCombinedAcademic)}

                  {/* Student Info Bar: รหัสประจำตัว, ชื่อ-นามสกุล, เลขที่ (สีขาวทางการ) */}
                  <div className="flex flex-wrap items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-800 gap-4 mb-5 text-black">
                    <div>
                      <span className="font-bold text-black">รหัสประจำตัว: </span>
                      <span className="font-semibold text-black font-mono">{student.studentCode || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-black">ชื่อ-นามสกุล: </span>
                      <span className="font-semibold text-black">{student.prefix}{student.firstName} {student.lastName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-black">เลขที่: </span>
                      <span className="font-semibold text-black">{student.rollNumber || '-'}</span>
                    </div>
                  </div>

                  {/* Subject Score Table */}
                  {!isCombinedAcademic ? (
                    <div className="border border-slate-800 rounded-lg overflow-hidden mb-5 bg-white">
                      <table className="w-full text-left text-[11px] border-collapse bg-white">
                        <thead>
                          <tr className="bg-white text-black font-bold text-center">
                            <th className="py-2 px-2 border-r border-b border-slate-800 w-10 text-black">ที่</th>
                            <th className="py-2 px-2 border-r border-b border-slate-800 w-24 text-black">รหัสวิชา</th>
                            <th className="py-2 px-3 border-r border-b border-slate-800 text-center text-black">รายวิชา</th>
                            <th className="py-2 px-2 border-r border-b border-slate-800 w-16 text-black">ระหว่างภาค</th>
                            <th className="py-2 px-2 border-r border-b border-slate-800 w-16 text-black">ปลายภาค</th>
                            <th className="py-2 px-2 border-r border-b border-slate-800 w-16 bg-white text-black font-bold">รวม</th>
                            {!isPrimaryGrade && (
                              <th className="py-2 px-2 border-r border-b border-slate-800 w-16 bg-white text-black font-black">เกรด</th>
                            )}
                            <th className="py-2 px-3 border-b border-slate-800 text-black">ครูผู้สอนในรายวิชา</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {academicResults.rows.length === 0 ? (
                            <tr>
                              <td colSpan={isPrimaryGrade ? 7 : 8} className={`py-8 text-center text-black bg-white ${!isPrimaryGrade ? 'border-b border-slate-800' : ''}`}>
                                ยังไม่มีข้อมูลรายวิชาในระบบ
                              </td>
                            </tr>
                          ) : (
                            academicResults.rows.map((item, idx) => {
                              const hasBottomBorder = !isPrimaryGrade || idx < academicResults.rows.length - 1;
                              const rowBorderB = hasBottomBorder ? 'border-b border-slate-800' : '';
                              return (
                                <tr key={item.subject.id} className="bg-white">
                                  <td className={`py-1.5 px-2 text-center font-mono text-black border-r border-slate-800 ${rowBorderB}`}>
                                    {idx + 1}
                                  </td>
                                  <td className={`py-1.5 px-2 text-center font-mono font-semibold text-black border-r border-slate-800 ${rowBorderB}`}>
                                    {item.subject.code || '-'}
                                  </td>
                                  <td className={`py-1.5 px-3 font-medium text-black border-r border-slate-800 ${rowBorderB}`}>
                                    {item.subject.name}
                                  </td>
                                  <td className={`py-1.5 px-2 text-center font-mono text-black border-r border-slate-800 ${rowBorderB}`}>
                                    {item.coursework}
                                  </td>
                                  <td className={`py-1.5 px-2 text-center font-mono text-black border-r border-slate-800 ${rowBorderB}`}>
                                    {item.exam}
                                  </td>
                                  <td className={`py-1.5 px-2 text-center ${item.isActivity ? 'font-sans' : 'font-mono'} font-bold text-black bg-white border-r border-slate-800 ${rowBorderB}`}>
                                    {item.total}
                                  </td>
                                  {!isPrimaryGrade && (
                                    <td className={`py-1.5 px-2 text-center font-bold text-xs border-r border-slate-800 bg-white text-black ${rowBorderB}`}>
                                      {item.grade}
                                    </td>
                                  )}
                                  <td className={`py-1.5 px-3 text-black font-medium ${rowBorderB}`}>
                                    {item.teacherDisplayName || item.subject.teacherName || advisorName || '-'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                          {!isPrimaryGrade && (
                            <tr className="bg-white font-bold text-black text-xs">
                              <td colSpan={6} className="py-2 px-3 text-center border-r border-slate-800 text-black">
                                ผลการเรียนเฉลี่ยรวม (GPA)
                              </td>
                              <td colSpan={2} className="py-2 px-2 text-center text-sm font-black text-black bg-white">
                                {academicResults.gpa}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Combined 2-Semester Subject Score Table (รวม 2 ภาคเรียน) */
                    <div className="border border-slate-800 rounded-lg overflow-hidden mb-5 bg-white">
                      {isPrimaryGrade ? (
                        <table className="w-full text-left text-[11px] border-collapse bg-white">
                          <thead>
                            <tr className="bg-white text-black font-bold text-center">
                              <th rowSpan={2} className="py-2 px-1 border-r border-b border-slate-800 w-7 text-black">ที่</th>
                              <th rowSpan={2} className="py-2 px-1.5 border-r border-b border-slate-800 w-16 text-black">รหัสวิชา</th>
                              <th rowSpan={2} className="py-2 px-2 border-r border-b border-slate-800 text-center text-black">รายวิชา</th>
                              <th colSpan={2} className="py-1.5 px-1.5 border-r border-b border-slate-800 text-center text-black">ภาคเรียนที่ 1</th>
                              <th colSpan={2} className="py-1.5 px-1.5 border-r border-b border-slate-800 text-center text-black">ภาคเรียนที่ 2</th>
                              <th rowSpan={2} className="py-2 px-1.5 border-r border-b border-slate-800 w-16 text-black">รวมคะแนน</th>
                              <th rowSpan={2} className="py-2 px-1 border-b border-slate-800 w-10 text-black">เกรด</th>
                            </tr>
                            <tr className="bg-white text-black font-bold text-center text-[10px]">
                              <th className="py-1 px-1 border-r border-b border-slate-800 w-14 text-black">คะแนน</th>
                              <th className="py-1 px-1.5 border-r border-b border-slate-800 text-black">ครูผู้สอน</th>
                              <th className="py-1 px-1 border-r border-b border-slate-800 w-14 text-black">คะแนน</th>
                              <th className="py-1 px-1.5 border-r border-b border-slate-800 text-black">ครูผู้สอน</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {combinedAcademicResults.rows.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-black bg-white border-b border-slate-800">
                                  ยังไม่มีข้อมูลรายวิชาในระบบ
                                </td>
                              </tr>
                            ) : (
                              combinedAcademicResults.rows.map((item, idx) => (
                                <tr key={item.subject.id || idx} className="bg-white">
                                  <td className="py-1.5 px-1 text-center font-mono text-black border-r border-b border-slate-800">
                                    {idx + 1}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-center font-mono font-semibold text-black border-r border-b border-slate-800">
                                    {item.subject.code || '-'}
                                  </td>
                                  <td className="py-1.5 px-2 font-medium text-black border-r border-b border-slate-800">
                                    {item.subject.name}
                                  </td>
                                  <td className={`py-1.5 px-1 text-center ${item.isActivity ? 'font-sans font-bold' : 'font-mono'} text-black border-r border-b border-slate-800`}>
                                    {item.total1}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-black font-medium text-[10px] border-r border-b border-slate-800">
                                    {item.teacher1DisplayName}
                                  </td>
                                  <td className={`py-1.5 px-1 text-center ${item.isActivity ? 'font-sans font-bold' : 'font-mono'} text-black border-r border-b border-slate-800`}>
                                    {item.total2}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-black font-medium text-[10px] border-r border-b border-slate-800">
                                    {item.teacher2DisplayName}
                                  </td>
                                  {item.isActivity ? (
                                    <td colSpan={2} className="py-1.5 px-1 text-center font-sans font-bold text-black border-b border-slate-800 bg-white">
                                      {item.avgTotal}
                                    </td>
                                  ) : (
                                    <>
                                      <td className="py-1.5 px-1 text-center font-mono font-bold text-black border-r border-b border-slate-800 bg-white">
                                        {item.avgTotal}
                                      </td>
                                      <td className="py-1.5 px-1 text-center font-black text-xs text-black border-b border-slate-800 bg-white">
                                        {item.combinedGrade}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))
                            )}
                            <tr className="bg-white font-bold text-black text-xs">
                              <td colSpan={7} className="py-2 px-3 text-center border-r border-slate-800 text-black font-bold">
                                เกรดเฉลี่ย
                              </td>
                              <td colSpan={2} className="py-2 px-2 text-center text-sm font-black text-black bg-white">
                                {combinedAcademicResults.gpaCombined}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <table className="w-full text-left text-[11px] border-collapse bg-white">
                          <thead>
                            <tr className="bg-white text-black font-bold text-center">
                              <th rowSpan={2} className="py-2 px-1.5 border-r border-b border-slate-800 w-8 text-black">ที่</th>
                              <th rowSpan={2} className="py-2 px-2 border-r border-b border-slate-800 w-20 text-black">รหัสวิชา</th>
                              <th rowSpan={2} className="py-2 px-2.5 border-r border-b border-slate-800 text-center text-black">รายวิชา</th>
                              <th colSpan={2} className="py-1.5 px-2 border-r border-b border-slate-800 text-center text-black">ภาคเรียนที่ 1</th>
                              <th colSpan={2} className="py-1.5 px-2 border-r border-b border-slate-800 text-center text-black">ภาคเรียนที่ 2</th>
                              <th colSpan={2} className="py-1.5 px-2 border-r border-b border-slate-800 text-center text-black">รวม 2 ภาคเรียน</th>
                              <th rowSpan={2} className="py-2 px-2.5 border-b border-slate-800 text-center text-black">ครูผู้สอนในรายวิชา</th>
                            </tr>
                            <tr className="bg-white text-black font-bold text-center text-[10px]">
                              <th className="py-1 px-1.5 border-r border-b border-slate-800 w-12 text-black">คะแนน</th>
                              <th className="py-1 px-1.5 border-r border-b border-slate-800 w-11 text-black">เกรด</th>
                              <th className="py-1 px-1.5 border-r border-b border-slate-800 w-12 text-black">คะแนน</th>
                              <th className="py-1 px-1.5 border-r border-b border-slate-800 w-11 text-black">เกรด</th>
                              <th className="py-1 px-1.5 border-r border-b border-slate-800 w-14 text-black">คะแนนเฉลี่ย</th>
                              <th className="py-1 px-1.5 border-r border-b border-slate-800 w-11 text-black">เกรด</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {combinedAcademicResults.rows.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="py-8 text-center text-black bg-white border-b border-slate-800">
                                  ยังไม่มีข้อมูลรายวิชาในระบบ
                                </td>
                              </tr>
                            ) : (
                              combinedAcademicResults.rows.map((item, idx) => (
                                <tr key={item.subject.id || idx} className="bg-white">
                                  <td className="py-1.5 px-1.5 text-center font-mono text-black border-r border-b border-slate-800">
                                    {idx + 1}
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-mono font-semibold text-black border-r border-b border-slate-800">
                                    {item.subject.code || '-'}
                                  </td>
                                  <td className="py-1.5 px-2.5 font-medium text-black border-r border-b border-slate-800">
                                    {item.subject.name}
                                  </td>
                                  <td className={`py-1.5 px-1.5 text-center ${item.isActivity ? 'font-sans font-bold' : 'font-mono'} text-black border-r border-b border-slate-800`}>
                                    {item.total1}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-center font-bold text-black border-r border-b border-slate-800">
                                    {item.grade1}
                                  </td>
                                  <td className={`py-1.5 px-1.5 text-center ${item.isActivity ? 'font-sans font-bold' : 'font-mono'} text-black border-r border-b border-slate-800`}>
                                    {item.total2}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-center font-bold text-black border-r border-b border-slate-800">
                                    {item.grade2}
                                  </td>
                                  {item.isActivity ? (
                                    <td colSpan={2} className="py-1.5 px-1.5 text-center font-sans font-bold text-black border-r border-b border-slate-800 bg-white">
                                      {item.avgTotal}
                                    </td>
                                  ) : (
                                    <>
                                      <td className="py-1.5 px-1.5 text-center font-mono font-bold text-black border-r border-b border-slate-800 bg-white">
                                        {item.avgTotal}
                                      </td>
                                      <td className="py-1.5 px-1.5 text-center font-black text-xs text-black border-r border-b border-slate-800 bg-white">
                                        {item.combinedGrade}
                                      </td>
                                    </>
                                  )}
                                  <td className="py-1.5 px-2.5 text-black font-medium border-b border-slate-800">
                                    {item.teacherDisplayName}
                                  </td>
                                </tr>
                              ))
                            )}
                            <tr className="bg-white font-bold text-black text-xs">
                              <td colSpan={3} className="py-2 px-3 text-center border-r border-slate-800 text-black">
                                ผลการเรียนเฉลี่ยรวม (GPA)
                              </td>
                              <td colSpan={2} className="py-2 px-2 text-center font-black text-black border-r border-slate-800 bg-white">
                                {combinedAcademicResults.gpa1}
                              </td>
                              <td colSpan={2} className="py-2 px-2 text-center font-black text-black border-r border-slate-800 bg-white">
                                {combinedAcademicResults.gpa2}
                              </td>
                              <td colSpan={2} className="py-2 px-2 text-center text-sm font-black text-black border-r border-slate-800 bg-white">
                                {combinedAcademicResults.gpaCombined}
                              </td>
                              <td className="py-2 px-2 bg-white"></td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                </div>

                {/* Bottom Signatures: Teacher & Director */}
                <div className="pt-6 mt-8 mb-[2in] grid grid-cols-2 gap-8 text-xs text-center print:mb-[2in] text-black" style={{ color: '#000000' }}>
                  <div className="space-y-1 text-black" style={{ color: '#000000' }}>
                    <p className="text-black font-medium" style={{ color: '#000000' }}>ลงชื่อ ..............................................................</p>
                    <p className="font-normal text-black" style={{ color: '#000000' }}>({advisorName || '......................................................'})</p>
                    <p className="text-black font-semibold text-[11px]" style={{ color: '#000000' }}>ครูประจำชั้น</p>
                    <p className="text-black font-medium text-[10px]" style={{ color: '#000000' }}>วันที่ ...... เดือน ........................ พ.ศ. ...........</p>
                  </div>
                  <div className="space-y-1 text-black" style={{ color: '#000000' }}>
                    <p className="text-black font-medium" style={{ color: '#000000' }}>ลงชื่อ ..............................................................</p>
                    <p className="font-normal text-black" style={{ color: '#000000' }}>({directorName || '......................................................'})</p>
                    <p className="text-black font-semibold text-[11px]" style={{ color: '#000000' }}>{directorPosition}</p>
                    <p className="text-black font-medium text-[10px]" style={{ color: '#000000' }}>วันที่ ...... เดือน ........................ พ.ศ. ...........</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: เวลาเรียน (ATTENDANCE RECORD) */}
          {(activeTab === 'attendance' || activeTab === 'all') && (
            <div className="space-y-3">
              {/* Mode Selector Bar above A4 sheet (Hidden on Print & PDF) */}
              <div className="max-w-[210mm] mx-auto bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 print:hidden no-print" data-pdf-ignore="true">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <CalendarCheck className="w-4 h-4 text-purple-600" />
                  <span>รูปแบบการแสดงผลหน้าเวลาเรียน:</span>
                </div>
                <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCombinedAttendance(false)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !isCombinedAttendance
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-700 hover:bg-white/70'
                    }`}
                  >
                    ภาคเรียนที่ {semester}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCombinedAttendance(true)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCombinedAttendance
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-700 hover:bg-white/70'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>รวมภาคเรียน</span>
                  </button>
                </div>
              </div>

              <div
                className="a4-pp6-page bg-white border border-slate-300 rounded-lg py-6 sm:py-8 max-w-[210mm] min-h-[297mm] mx-auto text-black shadow-xl print:border-none print:shadow-none print:m-0 print:break-before-page flex flex-col justify-between"
                style={{ width: '210mm', maxWidth: '210mm', paddingLeft: '20mm', paddingRight: '15mm', color: '#000000' }}
              >
                
                <div className={isCombinedAttendance ? 'space-y-3' : 'space-y-6'}>
                  {renderPP6Header(undefined, 'เวลาเรียนนักเรียน', isCombinedAttendance)}

                  {/* Student Info Bar: รหัสประจำตัว, ชื่อ-นามสกุล, เลขที่ (สีขาวทางการ) */}
                  <div className={`flex flex-wrap items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-800 gap-4 ${isCombinedAttendance ? 'mb-3' : 'mb-5'} text-black`}>
                    <div>
                      <span className="font-bold text-black">รหัสประจำตัว: </span>
                      <span className="font-semibold text-black font-mono">{student.studentCode || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-black">ชื่อ-นามสกุล: </span>
                      <span className="font-semibold text-black">{student.prefix}{student.firstName} {student.lastName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-black">เลขที่: </span>
                      <span className="font-semibold text-black">{student.rollNumber || '-'}</span>
                    </div>
                  </div>

                  {!isCombinedAttendance ? (
                    /* Single Semester Monthly breakdown table */
                    <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left text-xs border-collapse bg-white">
                        <thead>
                          <tr className="bg-white text-black font-bold text-center">
                            <th className="py-2.5 px-3 text-center border-r border-b border-slate-800 text-black">เดือน</th>
                            <th className="py-2.5 px-2 w-20 border-r border-b border-slate-800 text-black">วันเรียน</th>
                            <th className="py-2.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">มา</th>
                            <th className="py-2.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">ขาด</th>
                            <th className="py-2.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">ลา</th>
                            <th className="py-2.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">ป่วย</th>
                            <th className="py-2.5 px-2 w-28 border-b border-slate-800 bg-white text-black">% มาเรียน</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white text-center">
                          {attendanceMonthlyRecords.rows.map((r, i) => (
                            <tr key={i} className="bg-white">
                              <td className="py-2 px-3 text-left font-medium border-r border-b border-slate-800 text-black">{r.month}</td>
                              <td className="py-2 px-2 font-mono border-r border-b border-slate-800 text-black">{r.schoolDays}</td>
                              <td className="py-2 px-2 font-mono font-bold text-black border-r border-b border-slate-800">{r.present}</td>
                              <td className="py-2 px-2 font-mono text-black border-r border-b border-slate-800">{r.absent}</td>
                              <td className="py-2 px-2 font-mono text-black border-r border-b border-slate-800">{r.leave}</td>
                              <td className="py-2 px-2 font-mono text-black border-r border-b border-slate-800">{r.sick}</td>
                              <td className="py-2 px-2 font-mono font-bold text-black border-b border-slate-800">{r.percent}</td>
                            </tr>
                          ))}
                          <tr className="bg-white font-bold text-center text-black">
                            <td className="py-2 px-3 text-center border-r border-slate-800 text-black">รวมตลอดภาคเรียน</td>
                            <td className="py-2 px-2 font-mono border-r border-slate-800 text-black">{attendanceMonthlyRecords.totals.schoolDays}</td>
                            <td className="py-2 px-2 font-mono text-black border-r border-slate-800">{attendanceMonthlyRecords.totals.present}</td>
                            <td className="py-2 px-2 font-mono text-black border-r border-slate-800">{attendanceMonthlyRecords.totals.absent}</td>
                            <td className="py-2 px-2 font-mono text-black border-r border-slate-800">{attendanceMonthlyRecords.totals.leave}</td>
                            <td className="py-2 px-2 font-mono text-black border-r border-slate-800">{attendanceMonthlyRecords.totals.sick}</td>
                            <td className="py-2 px-2 font-mono font-black text-black">{attendanceMonthlyRecords.totals.percent}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Combined 2-Semester Attendance Tables + Summary Table */
                    <div className="space-y-3">
                      {/* ภาคเรียนที่ 1 Table */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-black">
                          ภาคเรียนที่ 1
                        </div>
                        <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                          <table className="w-full text-left text-[11px] border-collapse bg-white">
                            <thead>
                              <tr className="bg-white text-black font-bold text-center">
                                <th className="py-1.5 px-3 text-center border-r border-b border-slate-800 text-black">เดือน</th>
                                <th className="py-1.5 px-2 w-20 border-r border-b border-slate-800 text-black">วันเรียน</th>
                                <th className="py-1.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">มา</th>
                                <th className="py-1.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">ขาด</th>
                                <th className="py-1.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">ลา</th>
                                <th className="py-1.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">ป่วย</th>
                                <th className="py-1.5 px-2 w-28 border-b border-slate-800 bg-white text-black text-center">% มาเรียน</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white text-center">
                              {combinedAttendanceRecords.term1.rows.map((r, i) => (
                                <tr key={`t1-${i}`} className="bg-white">
                                  <td className="py-1 px-3 text-left font-medium border-r border-b border-slate-800 text-black">{r.month}</td>
                                  <td className="py-1 px-2 font-mono border-r border-b border-slate-800 text-black">{r.schoolDays}</td>
                                  <td className="py-1 px-2 font-mono font-bold text-black border-r border-b border-slate-800">{r.present}</td>
                                  <td className="py-1 px-2 font-mono text-black border-r border-b border-slate-800">{r.absent}</td>
                                  <td className="py-1 px-2 font-mono text-black border-r border-b border-slate-800">{r.leave}</td>
                                  <td className="py-1 px-2 font-mono text-black border-r border-b border-slate-800">{r.sick}</td>
                                  <td className="py-1 px-2 font-mono font-bold text-black border-b border-slate-800">{r.percent}</td>
                                </tr>
                              ))}
                              <tr className="bg-white font-bold text-center text-black">
                                <td className="py-1.5 px-3 text-center border-r border-slate-800 text-black">รวมภาคเรียนที่ 1</td>
                                <td className="py-1.5 px-2 font-mono border-r border-slate-800 text-black">{combinedAttendanceRecords.term1.totals.schoolDays}</td>
                                <td className="py-1.5 px-2 font-mono text-black border-r border-slate-800">{combinedAttendanceRecords.term1.totals.present}</td>
                                <td className="py-1.5 px-2 font-mono text-black border-r border-slate-800">{combinedAttendanceRecords.term1.totals.absent}</td>
                                <td className="py-1.5 px-2 font-mono text-black border-r border-slate-800">{combinedAttendanceRecords.term1.totals.leave}</td>
                                <td className="py-1.5 px-2 font-mono text-black border-r border-slate-800">{combinedAttendanceRecords.term1.totals.sick}</td>
                                <td className="py-1.5 px-2 font-mono font-bold text-black">{combinedAttendanceRecords.term1.totals.percent}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ภาคเรียนที่ 2 Table */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-black">
                          ภาคเรียนที่ 2
                        </div>
                        <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                          <table className="w-full text-left text-[11px] border-collapse bg-white">
                            <thead>
                              <tr className="bg-white text-black font-bold text-center">
                                <th className="py-1.5 px-3 text-center border-r border-b border-slate-800 text-black">เดือน</th>
                                <th className="py-1.5 px-2 w-20 border-r border-b border-slate-800 text-black">วันเรียน</th>
                                <th className="py-1.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">มา</th>
                                <th className="py-1.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">ขาด</th>
                                <th className="py-1.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">ลา</th>
                                <th className="py-1.5 px-2 w-20 border-r border-b border-slate-800 text-black bg-white">ป่วย</th>
                                <th className="py-1.5 px-2 w-28 border-b border-slate-800 bg-white text-black text-center">% มาเรียน</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white text-center">
                              {combinedAttendanceRecords.term2.rows.map((r, i) => (
                                <tr key={`t2-${i}`} className="bg-white">
                                  <td className="py-1 px-3 text-left font-medium border-r border-b border-slate-800 text-black">{r.month}</td>
                                  <td className="py-1 px-2 font-mono border-r border-b border-slate-800 text-black">{r.schoolDays}</td>
                                  <td className="py-1 px-2 font-mono font-bold text-black border-r border-b border-slate-800">{r.present}</td>
                                  <td className="py-1 px-2 font-mono text-black border-r border-b border-slate-800">{r.absent}</td>
                                  <td className="py-1 px-2 font-mono text-black border-r border-b border-slate-800">{r.leave}</td>
                                  <td className="py-1 px-2 font-mono text-black border-r border-b border-slate-800">{r.sick}</td>
                                  <td className="py-1 px-2 font-mono font-bold text-black border-b border-slate-800">{r.percent}</td>
                                </tr>
                              ))}
                              <tr className="bg-white font-bold text-center text-black">
                                <td className="py-1.5 px-3 text-center border-r border-slate-800 text-black">รวมภาคเรียนที่ 2</td>
                                <td className="py-1.5 px-2 font-mono border-r border-slate-800 text-black">{combinedAttendanceRecords.term2.totals.schoolDays}</td>
                                <td className="py-1.5 px-2 font-mono text-black border-r border-slate-800">{combinedAttendanceRecords.term2.totals.present}</td>
                                <td className="py-1.5 px-2 font-mono text-black border-r border-slate-800">{combinedAttendanceRecords.term2.totals.absent}</td>
                                <td className="py-1.5 px-2 font-mono text-black border-r border-slate-800">{combinedAttendanceRecords.term2.totals.leave}</td>
                                <td className="py-1.5 px-2 font-mono text-black border-r border-slate-800">{combinedAttendanceRecords.term2.totals.sick}</td>
                                <td className="py-1.5 px-2 font-mono font-bold text-black">{combinedAttendanceRecords.term2.totals.percent}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ตารางสรุปเวลาเรียนรวม 2 ภาคเรียน */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-black">
                          สรุปสถิติเวลาเรียนรวม 2 ภาคเรียน (ปีการศึกษา {academicYear})
                        </div>
                        <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                          <table className="w-full text-center text-[11px] border-collapse bg-white text-black">
                            <thead>
                              <tr className="bg-white text-black font-bold">
                                <th className="py-1.5 px-3 border-r border-b border-slate-800 text-center text-black">ภาคเรียน</th>
                                <th className="py-1.5 px-2 border-r border-b border-slate-800 text-black">วันเรียน (วัน)</th>
                                <th className="py-1.5 px-2 border-r border-b border-slate-800 text-black">มาเรียน (วัน)</th>
                                <th className="py-1.5 px-2 border-r border-b border-slate-800 text-black">ขาด (วัน)</th>
                                <th className="py-1.5 px-2 border-r border-b border-slate-800 text-black">ลา (วัน)</th>
                                <th className="py-1.5 px-2 border-r border-b border-slate-800 text-black">ป่วย (วัน)</th>
                                <th className="py-1.5 px-2 border-r border-b border-slate-800 text-black">% มาเรียน</th>
                                <th className="py-1.5 px-2 border-b border-slate-800 text-black">ผลการประเมิน</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              <tr>
                                <td className="py-1 px-3 font-medium border-r border-b border-slate-800 text-center text-black">ภาคเรียนที่ 1</td>
                                <td className="py-1 px-2 font-mono border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term1.totals.schoolDays}</td>
                                <td className="py-1 px-2 font-mono font-bold border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term1.totals.present}</td>
                                <td className="py-1 px-2 font-mono border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term1.totals.absent}</td>
                                <td className="py-1 px-2 font-mono border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term1.totals.leave}</td>
                                <td className="py-1 px-2 font-mono border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term1.totals.sick}</td>
                                <td className="py-1 px-2 font-mono font-bold border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term1.totals.percent}</td>
                                <td className="py-1 px-2 font-bold border-b border-slate-800 text-black">{combinedAttendanceRecords.term1.totals.evaluation}</td>
                              </tr>
                              <tr>
                                <td className="py-1 px-3 font-medium border-r border-b border-slate-800 text-center text-black">ภาคเรียนที่ 2</td>
                                <td className="py-1 px-2 font-mono border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term2.totals.schoolDays}</td>
                                <td className="py-1 px-2 font-mono font-bold border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term2.totals.present}</td>
                                <td className="py-1 px-2 font-mono border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term2.totals.absent}</td>
                                <td className="py-1 px-2 font-mono border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term2.totals.leave}</td>
                                <td className="py-1 px-2 font-mono border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term2.totals.sick}</td>
                                <td className="py-1 px-2 font-mono font-bold border-r border-b border-slate-800 text-black">{combinedAttendanceRecords.term2.totals.percent}</td>
                                <td className="py-1 px-2 font-bold border-b border-slate-800 text-black">{combinedAttendanceRecords.term2.totals.evaluation}</td>
                              </tr>
                              <tr className="bg-white font-bold text-black">
                                <td className="py-1.5 px-3 border-r border-slate-800 text-center text-black">รวม 2 ภาคเรียน</td>
                                <td className="py-1.5 px-2 font-mono border-r border-slate-800 text-black">{combinedAttendanceRecords.grandTotals.schoolDays}</td>
                                <td className="py-1.5 px-2 font-mono border-r border-slate-800 text-black">{combinedAttendanceRecords.grandTotals.present}</td>
                                <td className="py-1.5 px-2 font-mono border-r border-slate-800 text-black">{combinedAttendanceRecords.grandTotals.absent}</td>
                                <td className="py-1.5 px-2 font-mono border-r border-slate-800 text-black">{combinedAttendanceRecords.grandTotals.leave}</td>
                                <td className="py-1.5 px-2 font-mono border-r border-slate-800 text-black">{combinedAttendanceRecords.grandTotals.sick}</td>
                                <td className="py-1.5 px-2 font-mono font-black border-r border-slate-800 text-black">{combinedAttendanceRecords.grandTotals.percent}</td>
                                <td className="py-1.5 px-2 font-bold text-black">{combinedAttendanceRecords.grandTotals.evaluation}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Bottom Signature: Class Advisor */}
                <div className={`${isCombinedAttendance ? 'pt-4 mb-2 print:mb-2' : 'pt-6 mb-[2.5in] print:mb-[2.5in]'} text-xs text-center max-w-sm mx-auto space-y-1 text-black`} style={{ color: '#000000' }}>
                  <p className="text-black font-medium" style={{ color: '#000000' }}>ลงชื่อ ..............................................................</p>
                  <p className="font-normal text-black" style={{ color: '#000000' }}>({advisorName || '......................................................'})</p>
                  <p className="font-semibold text-[11px] text-black" style={{ color: '#000000' }}>ครูประจำชั้น</p>
                  <p className="text-[10px] font-medium text-black" style={{ color: '#000000' }}>วันที่ ...... เดือน ........................ พ.ศ. ...........</p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: สุขภาพ (น้ำหนัก, แปรงฟัน, ดื่มนม) */}
          {(activeTab === 'health' || activeTab === 'all') && (
            <div className="space-y-3">
              {/* Mode Selector Bar above A4 sheet (Hidden on Print & PDF) */}
              <div className="max-w-[210mm] mx-auto bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 print:hidden no-print" data-pdf-ignore="true">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>รูปแบบการแสดงผลหน้าสุขภาพ:</span>
                </div>
                <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCombinedHealth(false)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !isCombinedHealth
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-700 hover:bg-white/70'
                    }`}
                  >
                    ภาคเรียนที่ {semester}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCombinedHealth(true)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCombinedHealth
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-700 hover:bg-white/70'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>รวมภาคเรียน</span>
                  </button>
                </div>
              </div>

              <div
                className={`a4-pp6-page bg-white border border-slate-300 rounded-lg ${isCombinedHealth ? 'pt-6 sm:pt-8' : 'py-6 sm:py-8'} max-w-[210mm] min-h-[297mm] mx-auto text-black shadow-xl print:border-none print:shadow-none print:m-0 print:break-before-page flex flex-col justify-between`}
                style={{ width: '210mm', maxWidth: '210mm', paddingLeft: '20mm', paddingRight: '15mm', ...(isCombinedHealth ? { paddingBottom: '2.3cm' } : {}), color: '#000000' }}
              >
                <div className={isCombinedHealth ? 'space-y-4' : 'space-y-6'}>
                  {renderPP6Header(undefined, 'บันทึกข้อมูลสุขภาพ', isCombinedHealth)}

                  {/* Student Info Bar: รหัสประจำตัว, ชื่อ-นามสกุล, เลขที่ (สีขาวทางการ) */}
                  <div className={`flex flex-wrap items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-800 gap-4 ${isCombinedHealth ? 'mb-3' : 'mb-5'} text-black`}>
                    <div>
                      <span className="font-bold text-black">รหัสประจำตัว: </span>
                      <span className="font-semibold text-black font-mono">{student.studentCode || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-black">ชื่อ-นามสกุล: </span>
                      <span className="font-semibold text-black">{student.prefix}{student.firstName} {student.lastName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-black">เลขที่: </span>
                      <span className="font-semibold text-black">{student.rollNumber || '-'}</span>
                    </div>
                  </div>

                  {!isCombinedHealth ? (
                    /* Single Semester Health View */
                    <div className="space-y-6 text-xs text-black">
                      {/* 1) น้ำหนัก - ส่วนสูง */}
                      <div className="space-y-2">
                        <div className="font-bold text-black text-xs">
                          <span>1) น้ำหนัก - ส่วนสูง (ภาคเรียนที่ {semester})</span>
                        </div>
                        <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                          <table className="w-full text-left text-xs border-collapse bg-white">
                            <thead>
                              <tr className="bg-white text-black font-bold text-center">
                                <th className="py-2 px-2 border-r border-b border-slate-800 w-14 text-black">ครั้งที่</th>
                                <th className="py-2 px-3 border-r border-b border-slate-800 text-center text-black">วันที่</th>
                                <th className="py-2 px-2 border-r border-b border-slate-800 w-28 text-black">น้ำหนัก (กก.)</th>
                                <th className="py-2 px-2 border-r border-b border-slate-800 w-28 text-black">ส่วนสูง (ซม.)</th>
                                <th className="py-2 px-2 border-r border-b border-slate-800 w-20 text-black">BMI</th>
                                <th className="py-2 px-3 border-b border-slate-800 w-32 text-black">ผลการประเมิน</th>
                              </tr>
                            </thead>
                            <tbody className="text-center bg-white">
                              {currentTermHealth.weightHeightRows.map((item, idx) => {
                                const rowBorderB = idx < currentTermHealth.weightHeightRows.length - 1 ? 'border-b border-slate-800' : '';
                                return (
                                  <tr key={`${item.no}-${idx}`} className="bg-white">
                                    <td className={`py-2 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.no}</td>
                                    <td className={`py-2 px-3 text-center font-medium text-black border-r border-slate-800 ${rowBorderB}`}>{item.date}</td>
                                    <td className={`py-2 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.weight}</td>
                                    <td className={`py-2 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.height}</td>
                                    <td className={`py-2 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.bmi}</td>
                                    <td className={`py-2 px-3 font-bold text-black ${rowBorderB}`}>
                                      {item.bmiStatus}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 2) บันทึกดื่มนมโรงเรียน & 3) บันทึกแปรงฟันหลังอาหารกลางวัน (แสดงเฉพาะเมื่อครูได้บันทึกในหน้าดื่มนม-แปรงฟัน) */}
                      {currentTermHealth.hasMilkTeethRecorded && (
                        <>
                          <div className="space-y-2">
                            <div className="font-bold text-black text-xs">
                              <span>2) บันทึกดื่มนมโรงเรียน (ภาคเรียนที่ {semester})</span>
                            </div>
                            <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                              <table className="w-full text-left text-xs border-collapse bg-white">
                                <thead>
                                  <tr className="bg-white text-black font-bold text-center">
                                    <th className="py-2 px-3 border-r border-b border-slate-800 w-12 text-black">ที่</th>
                                    <th className="py-2 px-3 border-r border-b border-slate-800 text-center text-black">รายการบันทึก</th>
                                    <th className="py-2 px-3 border-r border-b border-slate-800 w-28 text-black">วันทั้งหมด</th>
                                    <th className="py-2 px-3 border-r border-b border-slate-800 w-28 text-black">วันที่ดื่ม</th>
                                    <th className="py-2 px-3 border-b border-slate-800 w-32 text-black">ร้อยละ (%)</th>
                                  </tr>
                                </thead>
                                <tbody className="text-center bg-white">
                                  <tr className="bg-white">
                                    <td className="py-2 px-3 font-mono border-r border-slate-800 text-black">1</td>
                                    <td className="py-2 px-3 text-center font-medium text-black border-r border-slate-800">ดื่มนม</td>
                                    <td className="py-2 px-3 font-mono font-bold text-black border-r border-slate-800">{currentTermHealth.milkTotal}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-black border-r border-slate-800">{currentTermHealth.milkFull}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-black">{currentTermHealth.milkRate}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="font-bold text-black text-xs">
                              <span>3) บันทึกแปรงฟันหลังอาหารกลางวัน (ภาคเรียนที่ {semester})</span>
                            </div>
                            <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                              <table className="w-full text-left text-xs border-collapse bg-white">
                                <thead>
                                  <tr className="bg-white text-black font-bold text-center">
                                    <th className="py-2 px-3 border-r border-b border-slate-800 w-12 text-black">ที่</th>
                                    <th className="py-2 px-3 border-r border-b border-slate-800 text-center text-black">รายการบันทึก</th>
                                    <th className="py-2 px-3 border-r border-b border-slate-800 w-28 text-black">วันทั้งหมด</th>
                                    <th className="py-2 px-3 border-r border-b border-slate-800 w-28 text-black">วันที่แปรง</th>
                                    <th className="py-2 px-3 border-b border-slate-800 w-32 text-black">ร้อยละ (%)</th>
                                  </tr>
                                </thead>
                                <tbody className="text-center bg-white">
                                  <tr className="bg-white">
                                    <td className="py-2 px-3 font-mono border-r border-slate-800 text-black">1</td>
                                    <td className="py-2 px-3 text-center font-medium text-black border-r border-slate-800">แปรงฟัน</td>
                                    <td className="py-2 px-3 font-mono font-bold text-black border-r border-slate-800">{currentTermHealth.teethTotal}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-black border-r border-slate-800">{currentTermHealth.teethClean}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-black">{currentTermHealth.teethRate}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    /* Combined 2-Semester Health View (รวมภาคเรียนที่ 1 และ ภาคเรียนที่ 2) */
                    <div className="space-y-4 text-xs text-black">
                      {/* 1) น้ำหนัก - ส่วนสูง (ภาคเรียนที่ 1 และ ภาคเรียนที่ 2) */}
                      <div className="space-y-2">
                        <div className="font-bold text-black text-xs">
                          <span>1) น้ำหนัก - ส่วนสูง</span>
                        </div>

                        {/* ภาคเรียนที่ 1 */}
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-black">
                            ภาคเรียนที่ 1
                          </div>
                          <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                            <table className="w-full text-left text-[11px] border-collapse bg-white">
                              <thead>
                                <tr className="bg-white text-black font-bold text-center">
                                  <th className="py-1.5 px-2 border-r border-b border-slate-800 w-14 text-black">ครั้งที่</th>
                                  <th className="py-1.5 px-3 border-r border-b border-slate-800 text-center text-black">วันที่</th>
                                  <th className="py-1.5 px-2 border-r border-b border-slate-800 w-28 text-black">น้ำหนัก (กก.)</th>
                                  <th className="py-1.5 px-2 border-r border-b border-slate-800 w-28 text-black">ส่วนสูง (ซม.)</th>
                                  <th className="py-1.5 px-2 border-r border-b border-slate-800 w-20 text-black">BMI</th>
                                  <th className="py-1.5 px-3 border-b border-slate-800 w-32 text-black">ผลการประเมิน</th>
                                </tr>
                              </thead>
                              <tbody className="text-center bg-white">
                                {combinedHealth.term1.weightHeightRows.map((item, idx) => {
                                  const rowBorderB = idx < combinedHealth.term1.weightHeightRows.length - 1 ? 'border-b border-slate-800' : '';
                                  return (
                                    <tr key={`wh1-${idx}`} className="bg-white">
                                      <td className={`py-1.5 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.no}</td>
                                      <td className={`py-1.5 px-3 text-center font-medium text-black border-r border-slate-800 ${rowBorderB}`}>{item.date}</td>
                                      <td className={`py-1.5 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.weight}</td>
                                      <td className={`py-1.5 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.height}</td>
                                      <td className={`py-1.5 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.bmi}</td>
                                      <td className={`py-1.5 px-3 font-bold text-black ${rowBorderB}`}>{item.bmiStatus}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* ภาคเรียนที่ 2 */}
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-black">
                            ภาคเรียนที่ 2
                          </div>
                          <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                            <table className="w-full text-left text-[11px] border-collapse bg-white">
                              <thead>
                                <tr className="bg-white text-black font-bold text-center">
                                  <th className="py-1.5 px-2 border-r border-b border-slate-800 w-14 text-black">ครั้งที่</th>
                                  <th className="py-1.5 px-3 border-r border-b border-slate-800 text-center text-black">วันที่</th>
                                  <th className="py-1.5 px-2 border-r border-b border-slate-800 w-28 text-black">น้ำหนัก (กก.)</th>
                                  <th className="py-1.5 px-2 border-r border-b border-slate-800 w-28 text-black">ส่วนสูง (ซม.)</th>
                                  <th className="py-1.5 px-2 border-r border-b border-slate-800 w-20 text-black">BMI</th>
                                  <th className="py-1.5 px-3 border-b border-slate-800 w-32 text-black">ผลการประเมิน</th>
                                </tr>
                              </thead>
                              <tbody className="text-center bg-white">
                                {combinedHealth.term2.weightHeightRows.map((item, idx) => {
                                  const rowBorderB = idx < combinedHealth.term2.weightHeightRows.length - 1 ? 'border-b border-slate-800' : '';
                                  return (
                                    <tr key={`wh2-${idx}`} className="bg-white">
                                      <td className={`py-1.5 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.no}</td>
                                      <td className={`py-1.5 px-3 text-center font-medium text-black border-r border-slate-800 ${rowBorderB}`}>{item.date}</td>
                                      <td className={`py-1.5 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.weight}</td>
                                      <td className={`py-1.5 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.height}</td>
                                      <td className={`py-1.5 px-2 font-mono font-bold text-black border-r border-slate-800 ${rowBorderB}`}>{item.bmi}</td>
                                      <td className={`py-1.5 px-3 font-bold text-black ${rowBorderB}`}>{item.bmiStatus}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* 2) บันทึกดื่มนมโรงเรียน & 3) บันทึกแปรงฟันหลังอาหารกลางวัน (แสดงเฉพาะเมื่อครูได้บันทึกในหน้าดื่มนม-แปรงฟัน) */}
                      {combinedHealth.hasMilkTeethRecorded && (
                        <>
                          {/* 2) บันทึกดื่มนมโรงเรียน (ภาคเรียนที่ 1 และ ภาคเรียนที่ 2) */}
                          <div className="space-y-2">
                            <div className="font-bold text-black text-xs">
                              <span>2) บันทึกดื่มนมโรงเรียน</span>
                            </div>

                            {/* ภาคเรียนที่ 1 */}
                            <div className="space-y-1">
                              <div className="text-[11px] font-bold text-black">
                                ภาคเรียนที่ 1
                              </div>
                              <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                                <table className="w-full text-left text-[11px] border-collapse bg-white">
                                  <thead>
                                    <tr className="bg-white text-black font-bold text-center">
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-12 text-black">ที่</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 text-center text-black">รายการบันทึก</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-28 text-black">วันทั้งหมด</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-28 text-black">วันที่ดื่ม</th>
                                      <th className="py-1.5 px-3 border-b border-slate-800 w-32 text-black">ร้อยละ (%)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="text-center bg-white">
                                    <tr className="bg-white">
                                      <td className="py-1.5 px-3 font-mono border-r border-slate-800 text-black">1</td>
                                      <td className="py-1.5 px-3 text-center font-medium text-black border-r border-slate-800">ดื่มนม</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black border-r border-slate-800">{combinedHealth.term1.milkTotal}</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black border-r border-slate-800">{combinedHealth.term1.milkFull}</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black">{combinedHealth.term1.milkRate}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* ภาคเรียนที่ 2 */}
                            <div className="space-y-1">
                              <div className="text-[11px] font-bold text-black">
                                ภาคเรียนที่ 2
                              </div>
                              <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                                <table className="w-full text-left text-[11px] border-collapse bg-white">
                                  <thead>
                                    <tr className="bg-white text-black font-bold text-center">
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-12 text-black">ที่</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 text-center text-black">รายการบันทึก</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-28 text-black">วันทั้งหมด</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-28 text-black">วันที่ดื่ม</th>
                                      <th className="py-1.5 px-3 border-b border-slate-800 w-32 text-black">ร้อยละ (%)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="text-center bg-white">
                                    <tr className="bg-white">
                                      <td className="py-1.5 px-3 font-mono border-r border-slate-800 text-black">1</td>
                                      <td className="py-1.5 px-3 text-center font-medium text-black border-r border-slate-800">ดื่มนม</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black border-r border-slate-800">{combinedHealth.term2.milkTotal}</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black border-r border-slate-800">{combinedHealth.term2.milkFull}</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black">{combinedHealth.term2.milkRate}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>

                          {/* 3) บันทึกแปรงฟันหลังอาหารกลางวัน (ภาคเรียนที่ 1 และ ภาคเรียนที่ 2) */}
                          <div className="space-y-2">
                            <div className="font-bold text-black text-xs">
                              <span>3) บันทึกแปรงฟันหลังอาหารกลางวัน</span>
                            </div>

                            {/* ภาคเรียนที่ 1 */}
                            <div className="space-y-1">
                              <div className="text-[11px] font-bold text-black">
                                ภาคเรียนที่ 1
                              </div>
                              <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                                <table className="w-full text-left text-[11px] border-collapse bg-white">
                                  <thead>
                                    <tr className="bg-white text-black font-bold text-center">
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-12 text-black">ที่</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 text-center text-black">รายการบันทึก</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-28 text-black">วันทั้งหมด</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-28 text-black">วันที่แปรง</th>
                                      <th className="py-1.5 px-3 border-b border-slate-800 w-32 text-black">ร้อยละ (%)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="text-center bg-white">
                                    <tr className="bg-white">
                                      <td className="py-1.5 px-3 font-mono border-r border-slate-800 text-black">1</td>
                                      <td className="py-1.5 px-3 text-center font-medium text-black border-r border-slate-800">แปรงฟัน</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black border-r border-slate-800">{combinedHealth.term1.teethTotal}</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black border-r border-slate-800">{combinedHealth.term1.teethClean}</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black">{combinedHealth.term1.teethRate}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* ภาคเรียนที่ 2 */}
                            <div className="space-y-1">
                              <div className="text-[11px] font-bold text-black">
                                ภาคเรียนที่ 2
                              </div>
                              <div className="border border-slate-800 rounded-lg overflow-hidden bg-white">
                                <table className="w-full text-left text-[11px] border-collapse bg-white">
                                  <thead>
                                    <tr className="bg-white text-black font-bold text-center">
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-12 text-black">ที่</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 text-center text-black">รายการบันทึก</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-28 text-black">วันทั้งหมด</th>
                                      <th className="py-1.5 px-3 border-r border-b border-slate-800 w-28 text-black">วันที่แปรง</th>
                                      <th className="py-1.5 px-3 border-b border-slate-800 w-32 text-black">ร้อยละ (%)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="text-center bg-white">
                                    <tr className="bg-white">
                                      <td className="py-1.5 px-3 font-mono border-r border-slate-800 text-black">1</td>
                                      <td className="py-1.5 px-3 text-center font-medium text-black border-r border-slate-800">แปรงฟัน</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black border-r border-slate-800">{combinedHealth.term2.teethTotal}</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black border-r border-slate-800">{combinedHealth.term2.teethClean}</td>
                                      <td className="py-1.5 px-3 font-mono font-bold text-black">{combinedHealth.term2.teethRate}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                </div>

                {/* Bottom Signature: Class Advisor */}
                <div className={`${isCombinedHealth ? 'pt-4 mb-0 print:mb-0' : 'pt-6 mb-[3in] print:mb-[3in]'} text-xs text-center max-w-sm mx-auto space-y-1 text-black`} style={{ color: '#000000' }}>
                  <p className="text-black font-medium">ลงชื่อ ..............................................................</p>
                  <p className="font-normal text-black">({advisorName || '......................................................'})</p>
                  <p className="text-black font-semibold text-[11px]">ครูประจำชั้น</p>
                  <p className={`text-black font-medium text-[10px] ${isCombinedHealth ? 'leading-none' : ''}`}>วันที่ ...... เดือน ........................ พ.ศ. ...........</p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 6: ความคิดเห็นและการประเมินพฤติกรรม 8 ด้าน (ครูและผู้ปกครอง) */}
          {(activeTab === 'comments' || activeTab === 'all') && (
            <div
              className="a4-pp6-page bg-white border border-slate-300 rounded-lg pt-6 sm:pt-8 max-w-[210mm] min-h-[297mm] mx-auto text-slate-900 shadow-xl print:border-none print:shadow-none print:m-0 print:break-before-page flex flex-col justify-between"
              style={{ width: '210mm', maxWidth: '210mm', paddingLeft: '20mm', paddingRight: '15mm', paddingBottom: '2.3cm' }}
            >
              
              <div className="space-y-4">
                {renderPP6Header()}

                {/* Student Info Bar: รหัสประจำตัว, ชื่อ-นามสกุล, เลขที่ (สีขาวทางการ) */}
                <div className="flex flex-wrap items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-800 gap-4 mb-5 text-black">
                  <div>
                    <span className="font-bold text-black">รหัสประจำตัว: </span>
                    <span className="font-semibold text-black font-mono">{student.studentCode || '-'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-black">ชื่อ-นามสกุล: </span>
                    <span className="font-semibold text-black">{student.prefix}{student.firstName} {student.lastName}</span>
                  </div>
                  <div>
                    <span className="font-bold text-black">เลขที่: </span>
                    <span className="font-semibold text-black">{student.rollNumber || '-'}</span>
                  </div>
                </div>

                {/* 3-Column Evaluation Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-800 text-xs bg-white">
                    <thead>
                      <tr className="bg-white text-black font-bold text-center border-b border-slate-800">
                        <th className="border border-slate-800 p-2 text-center min-w-[200px] bg-white text-black">
                          ประเมินพฤติกรรม
                        </th>
                        <th className="border border-slate-800 p-2 w-[35%] text-center bg-white text-black">
                          การลงคะแนนของครูประจำชั้น 8 ด้าน
                        </th>
                        <th className="border border-slate-800 p-2 w-[35%] text-center bg-white text-black">
                          การลงคะแนนของผู้ปกครอง 8 ด้าน
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {EVALUATION_CRITERIA_ITEMS.map((item) => {
                        const tScore = teacherScores[item.id as keyof BehaviorScores] || 3;
                        const pScore = parentScores[item.id as keyof BehaviorScores] || 0;

                        return (
                          <tr key={item.id} className="border-b border-slate-800 bg-white">
                            {/* column1: ประเมินพฤติกรรม */}
                            <td className="border border-slate-800 p-2.5 align-middle bg-white">
                              <div className="text-xs sm:text-sm font-bold text-black leading-snug">
                                {item.number}. {item.title}
                              </div>
                            </td>

                            {/* column2: การลงคะแนนของครู 8 ด้าน (Circles 3, 2, 1 with checkmark) */}
                            <td className="border border-slate-800 p-2 text-center align-middle bg-white">
                              <div className="flex items-center justify-center gap-5 py-1">
                                {[3, 2, 1].map((lvl) => {
                                  const isSelected = tScore === lvl;
                                  return (
                                    <button
                                      key={lvl}
                                      type="button"
                                      onClick={() => setTeacherScores(prev => ({ ...prev, [item.id]: lvl }))}
                                      className="flex items-center gap-1 cursor-pointer group"
                                      title={`ระดับ ${lvl}`}
                                    >
                                      <div className={`w-6 h-6 rounded-full border border-slate-800 flex items-center justify-center text-[11px] font-bold transition-all ${
                                        isSelected 
                                          ? 'bg-black text-white border-black shadow-2xs' 
                                          : 'bg-white text-black group-hover:border-black'
                                      }`}>
                                        {isSelected ? '✓' : lvl}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </td>

                            {/* column3: การลงคะแนนของผู้ปกครอง 8 ด้าน (Circles 3, 2, 1 for paper ticking) */}
                            <td className="border border-slate-800 p-2 text-center align-middle bg-white">
                              <div className="flex items-center justify-center gap-5 py-1">
                                {[3, 2, 1].map((lvl) => {
                                  const isSelected = pScore === lvl;
                                  return (
                                    <button
                                      key={lvl}
                                      type="button"
                                      onClick={() => setParentScores(prev => ({ ...prev, [item.id]: pScore === lvl ? 0 : lvl }))}
                                      className="flex items-center gap-1 cursor-pointer group"
                                      title={`ระดับ ${lvl}`}
                                    >
                                      <div className={`w-6 h-6 rounded-full border border-slate-800 flex items-center justify-center text-[11px] font-bold transition-all ${
                                        isSelected 
                                          ? 'bg-black text-white border-black shadow-2xs' 
                                          : 'bg-white text-black group-hover:border-black'
                                      }`}>
                                        {isSelected ? '✓' : lvl}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Row 9 / Last Row: ความคิดเห็น */}
                      <tr className="border-b border-slate-800 bg-white">
                        {/* column1: ประเมินพฤติกรรม / ความคิดเห็น */}
                        <td className="border border-slate-800 p-2.5 align-top pt-3 bg-white">
                          <div className="text-xs sm:text-sm font-bold text-black">9. ความคิดเห็น</div>
                        </td>

                        {/* column2: ความคิดเห็นของครู (ไม่มีกรอบกล่องซ้อนในตาราง) */}
                        <td className="border border-slate-800 p-2 align-top bg-white">
                          <textarea
                            value={teacherComment}
                            onChange={(e) => setTeacherComment(e.target.value)}
                            rows={4}
                            className="w-full bg-transparent p-1 text-xs text-black font-medium focus:outline-none border-none shadow-none leading-relaxed print:hidden resize-none"
                            placeholder="พิมพ์ความคิดเห็นของครูประจำชั้น..."
                          />
                          <div className="hidden print:block text-xs leading-relaxed text-black font-medium min-h-[60px] whitespace-pre-line">
                            {teacherComment || ''}
                          </div>
                        </td>

                        {/* column3: ความคิดเห็นของผู้ปกครอง (ห้ามมีข้อความใดๆ แสดงทั้งสิ้นเมื่อว่าง) */}
                        <td className="border border-slate-800 p-2 align-top bg-white">
                          <textarea
                            value={parentComment}
                            onChange={(e) => setParentComment(e.target.value)}
                            rows={4}
                            className="w-full bg-transparent p-1 text-xs text-black font-medium focus:outline-none border-none shadow-none leading-relaxed print:hidden resize-none"
                            placeholder=""
                          />
                          <div className="hidden print:block text-xs leading-relaxed text-black font-medium min-h-[60px]">
                            {parentComment ? (
                              <div className="whitespace-pre-line">{parentComment}</div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Legend / Explanation for 3, 2, 1 (พื้นสีขาว ไม่มีกรอบกล่อง) */}
                <div className="text-[11px] text-black font-bold bg-white text-center py-1">
                  เกณฑ์การประเมิน: 3 = ดี, 2 = พอใช้, 1 = ปรับปรุง
                </div>


              </div>

              {/* Bottom Signatures: 2 Columns (Left: Teacher, Right: Parent) - 2.3cm from bottom edge */}
              <div className="pt-4 grid grid-cols-2 gap-8 text-xs text-center mt-2 mb-0 text-black">
                {/* ฝั่งซ้าย: ครูประจำชั้น */}
                <div className="space-y-1 text-black">
                  <p className="text-black">ลงชื่อ ..............................................................</p>
                  <p className="font-normal text-black">({advisorName || '......................................................'})</p>
                  <p className="text-black font-semibold text-[11px]">ครูประจำชั้น</p>
                  <p className="text-black text-[10px] leading-none">วันที่ ...... เดือน ........................ พ.ศ. ...........</p>
                </div>

                {/* ฝั่งขวา: ผู้ปกครอง */}
                <div className="space-y-1 text-black">
                  <p className="text-black">ลงชื่อ ..............................................................</p>
                  <p className="font-normal text-black">
                    ({student.guardianName || student.fatherName || student.motherName || '......................................................'})
                  </p>
                  <p className="text-black font-semibold text-[11px]">ผู้ปกครองนักเรียน</p>
                  <p className="text-black text-[10px] leading-none">วันที่ ...... เดือน ........................ พ.ศ. ...........</p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Bottom Footer (Hidden on print) */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 rounded-b-3xl flex items-center justify-between gap-3 shrink-0 print:hidden">
          <span className="text-xs text-slate-500">
            เอกสารรายงานประจำตัวผู้เรียนรายบุคคล (ปพ.6) ขนาดกระดาษมาตรฐาน A4
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
