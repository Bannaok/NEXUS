import React, { useState, useMemo } from 'react';
import { 
  Subject, 
  GradeRecord, 
  Student, 
  UserSession, 
  GradeLevel,
  AssignmentItem,
  MemberAccount,
  AttendanceRecord,
  AttendanceDayConfig,
  SchoolDayItem,
  RubricLevel,
  LearningUnitDetail,
  KindergartenCompetency
} from '../types';
import { StorageService } from '../services/storage';
import { 
  Award, 
  BookOpen, 
  ChevronDown,
  Plus, 
  Save, 
  Trash2, 
  Edit, 
  Pencil,
  UserCheck, 
  CheckCircle, 
  Sliders, 
  Layers, 
  FileText,
  Calculator,
  Sparkles,
  Check,
  X,
  UserMinus,
  Unlock,
  Calendar,
  AlertCircle,
  Eye,
  Users,
  ShieldAlert,
  Copy,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  CalendarCheck,
  CheckSquare,
  Square,
  Star,
  GripVertical
} from 'lucide-react';
import { Assessment3Booklets } from './Assessment3Booklets';

interface Module2Props {
  user: UserSession;
  subjects: Subject[];
  grades: GradeRecord[];
  students: Student[];
  members?: MemberAccount[];
  academicYear: string;
  semester: string;
  attendance?: AttendanceRecord[];
  attendanceConfig?: AttendanceDayConfig;
  onSemesterChange?: (sem: '1' | '2') => void;
  onAcademicYearChange?: (year: string) => void;
  onSaveSubject: (subject: Subject) => void;
  onSaveBulkSubjects?: (subs: Subject[]) => void;
  onUpdateSubjectsList?: (subs: Subject[]) => void;
  onDeleteSubject: (id: string) => void;
  onSaveBulkGrades: (grades: GradeRecord[]) => void;
  onSaveBulkAttendance?: (records: AttendanceRecord[]) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

export const Module2Grading: React.FC<Module2Props> = ({
  user,
  subjects,
  grades,
  students,
  members = [],
  academicYear,
  semester,
  attendance,
  attendanceConfig,
  onSemesterChange,
  onAcademicYearChange,
  onSaveSubject,
  onSaveBulkSubjects,
  onUpdateSubjectsList,
  onDeleteSubject,
  onSaveBulkGrades,
  onSaveBulkAttendance,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'grading' | 'subjects' | 'assessments'>('grading');
  
  // สมาชิกจะไม่เห็นแท็บโครงสร้างรายวิชา หากเปิดอยู่ให้รีไดเรกต์ไปกรอกคะแนน
  React.useEffect(() => {
    if (user.role === 'member' && activeTab === 'subjects') {
      setActiveTab('grading');
    }
  }, [user.role, activeTab]);

  // สำหรับ Admin: เลือกปีการศึกษาและภาคเรียนเพื่อดูข้อมูล (ไม่กระทบสมาชิก)
  // สำหรับ สมาชิก: แสดงเฉพาะภาคเรียนและปีการศึกษาที่ Admin กำหนดในหน้าตั้งค่าเท่านั้น
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(() => academicYear || '2569');
  const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>(() => (semester === '2' ? '2' : '1'));

  React.useEffect(() => {
    if (academicYear) {
      setSelectedAcademicYear(academicYear);
    }
    if (semester) {
      setSelectedSemester(semester === '2' ? '2' : '1');
    }
  }, [academicYear, semester]);

  const currentAcademicYear = user.role === 'admin'
    ? (selectedAcademicYear || academicYear || '2569')
    : (academicYear || '2569');
  const currentSemester: '1' | '2' = user.role === 'admin'
    ? (selectedSemester || (semester === '2' ? '2' : '1'))
    : (semester === '2' ? '2' : '1');

  const [academicYears, setAcademicYears] = useState<string[]>(() => {
    const list = StorageService.getAcademicYears();
    if (!list.includes('2569')) list.push('2569');
    if (!list.includes('2568')) list.push('2568');
    if (academicYear && !list.includes(academicYear)) list.push(academicYear);
    return Array.from(new Set(list)).sort((a, b) => b.localeCompare(a));
  });

  // Locked semesters map (Admin can lock semester to prevent members from entering scores in wrong semester)
  const [lockedSemesters, setLockedSemesters] = useState<Record<string, boolean>>(() => 
    StorageService.getLockedSemesters()
  );

  React.useEffect(() => {
    return StorageService.subscribe(() => {
      const list = StorageService.getAcademicYears();
      if (!list.includes('2569')) list.push('2569');
      if (!list.includes('2568')) list.push('2568');
      if (academicYear && !list.includes(academicYear)) list.push(academicYear);
      setAcademicYears(Array.from(new Set(list)).sort((a, b) => b.localeCompare(a)));
      setLockedSemesters(StorageService.getLockedSemesters());
    });
  }, [academicYear]);

  const isCurrentSemLocked = Boolean(lockedSemesters[`${currentAcademicYear}_${currentSemester}`]);
  const isSem1Locked = Boolean(lockedSemesters[`${currentAcademicYear}_1`]);
  const isSem2Locked = Boolean(lockedSemesters[`${currentAcademicYear}_2`]);

  // Toggle Lock/Unlock for current semester
  const handleToggleLockCurrentSemester = () => {
    if (user.role !== 'admin') {
      onShowToast('warning', 'ไม่มีสิทธิ์', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถล็อกหรือปลดล็อกภาคเรียนได้');
      return;
    }
    const result = StorageService.toggleSemesterLocked(currentAcademicYear, currentSemester);
    setLockedSemesters(result.allLocked);
    if (result.locked) {
      onShowToast(
        'info', 
        `ล็อกภาคเรียนที่ ${currentSemester} เรียบร้อย 🔒`, 
        `ล็อกการกรอกคะแนนภาคเรียนที่ ${currentSemester} ปี ${currentAcademicYear} แล้ว สมาชิกจะไม่สามารถกรอกหรือแก้ไขคะแนนในภาคเรียนนี้ได้ เพื่อป้องกันการกรอกผิดภาคเรียน`
      );
    } else {
      onShowToast(
        'success', 
        `ปลดล็อกภาคเรียนที่ ${currentSemester} แล้ว 🔓`, 
        `เปิดให้สมาชิกสามารถเข้ามากรอกและบันทึกคะแนนในภาคเรียนที่ ${currentSemester} ปี ${currentAcademicYear} ได้ตามปกติ`
      );
    }
  };

  // Fallback to StorageService.getMembers() if members prop is empty
  const allMembers = (members && members.length > 0) ? members : StorageService.getMembers();

  // Helper เพื่อตรวจสอบว่ารายวิชาสังกัดปีการศึกษาใด
  const isSubjectInYear = (s: Subject, yr: string = currentAcademicYear) => {
    if (!s.academicYear) {
      return yr === '2568' || yr === (academicYears[0] || '2568');
    }
    return s.academicYear === yr;
  };

  // Grade rank prioritizing Primary 1 (ป.1) at the top, then ascending to ป.6, ม.1-ม.6, then kindergarten
  const getGradeRank = (grade: string = ''): number => {
    const g = grade.trim();
    if (g === 'ป.1' || g.startsWith('ป.1') || g.includes('ประถมศึกษาปีที่ 1')) return 1;
    if (g === 'ป.2' || g.startsWith('ป.2') || g.includes('ประถมศึกษาปีที่ 2')) return 2;
    if (g === 'ป.3' || g.startsWith('ป.3') || g.includes('ประถมศึกษาปีที่ 3')) return 3;
    if (g === 'ป.4' || g.startsWith('ป.4') || g.includes('ประถมศึกษาปีที่ 4')) return 4;
    if (g === 'ป.5' || g.startsWith('ป.5') || g.includes('ประถมศึกษาปีที่ 5')) return 5;
    if (g === 'ป.6' || g.startsWith('ป.6') || g.includes('ประถมศึกษาปีที่ 6')) return 6;
    if (g === 'ม.1' || g.startsWith('ม.1') || g.includes('มัธยมศึกษาปีที่ 1')) return 7;
    if (g === 'ม.2' || g.startsWith('ม.2') || g.includes('มัธยมศึกษาปีที่ 2')) return 8;
    if (g === 'ม.3' || g.startsWith('ม.3') || g.includes('มัธยมศึกษาปีที่ 3')) return 9;
    if (g === 'ม.4' || g.startsWith('ม.4') || g.includes('มัธยมศึกษาปีที่ 4')) return 10;
    if (g === 'ม.5' || g.startsWith('ม.5') || g.includes('มัธยมศึกษาปีที่ 5')) return 11;
    if (g === 'ม.6' || g.startsWith('ม.6') || g.includes('มัธยมศึกษาปีที่ 6')) return 12;
    if (g === 'อ.1' || g.startsWith('อ.1') || g.includes('อนุบาล 1')) return 20;
    if (g === 'อ.2' || g.startsWith('อ.2') || g.includes('อนุบาล 2')) return 21;
    if (g === 'อ.3' || g.startsWith('อ.3') || g.includes('อนุบาล 3')) return 22;
    return 99;
  };

  const getPrimarySubjectOrder = (sub: Subject): number => {
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
    if (sub.isActivity) return 50;
    return 99;
  };

  const normalizeRoom = (r?: string): string => (r || '').replace(/^ห้อง\s*/i, '').trim() || '1';

  // คืนค่ารายการห้องที่มีรายชื่อนักเรียนจริงในหน้าข้อมูลนักเรียนของระดับชั้นนั้นๆ (ถ้าไม่มีนักเรียนเลยจะคืนค่า [])
  const getStudentRoomsForGrade = (grade: string): string[] => {
    const roomSet = new Set<string>();
    students
      .filter(s => s.gradeLevel === grade)
      .forEach(s => roomSet.add(normalizeRoom(s.room)));
    return Array.from(roomSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  // คืนค่ารายการห้องของระดับชั้นนั้นๆ (มี ห้อง 1 เป็นพื้นฐาน และหากมีรายชื่อนักเรียนห้อง 2, 3 ในหน้าข้อมูลนักเรียนก็จะแสดงตามจริง)
  const getRoomsForGrade = (grade: string): string[] => {
    const roomSet = new Set<string>(['1']);
    students
      .filter(s => s.gradeLevel === grade)
      .forEach(s => roomSet.add(normalizeRoom(s.room)));
    return Array.from(roomSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const sortSubjectsByGrade = (subs: Subject[]): Subject[] => {
    return [...subs].sort((a, b) => {
      const orderA = getGradeRank(a.gradeLevel);
      const orderB = getGradeRank(b.gradeLevel);
      if (orderA !== orderB) return orderA - orderB;
      const roomCmp = normalizeRoom(a.room).localeCompare(normalizeRoom(b.room), undefined, { numeric: true });
      if (roomCmp !== 0) return roomCmp;
      const hasSortA = typeof a.sortOrder === 'number' && !isNaN(a.sortOrder);
      const hasSortB = typeof b.sortOrder === 'number' && !isNaN(b.sortOrder);
      if (hasSortA && hasSortB && a.sortOrder !== b.sortOrder) {
        return (a.sortOrder as number) - (b.sortOrder as number);
      }
      if (hasSortA !== hasSortB) {
        return hasSortA ? -1 : 1;
      }
      const subjOrderA = getPrimarySubjectOrder(a);
      const subjOrderB = getPrimarySubjectOrder(b);
      if (subjOrderA !== subjOrderB) return subjOrderA - subjOrderB;
      const codeA = a.code || '';
      const codeB = b.code || '';
      const codeCmp = codeA.localeCompare(codeB, 'th');
      if (codeCmp !== 0) return codeCmp;
      const nameCmp = (a.name || '').localeCompare(b.name || '', 'th');
      if (nameCmp !== 0) return nameCmp;
      return (a.semester || '1').localeCompare(b.semester || '1');
    });
  };


  // รายวิชาของปีการศึกษาปัจจุบัน
  const yearSubjects = subjects.filter(s => isSubjectInYear(s, currentAcademicYear));

  // รายวิชาสำหรับภาคเรียนที่เลือกในปีการศึกษาปัจจุบัน
  const currentSemSubjects = yearSubjects.filter(s => !s.semester || s.semester === currentSemester);

  // Subjects that HAVE been registered by a member/teacher in this semester & year
  const registeredSubjects = currentSemSubjects.filter(s => 
    Boolean(s.teacherId && s.teacherId.trim() !== '') || 
    Boolean(s.teacherName && s.teacherName.trim() !== '')
  );

  // Subjects that are NOT yet registered by any member
  const unregisteredSubjects = currentSemSubjects.filter(s => 
    (!s.teacherId || s.teacherId.trim() === '') && 
    (!s.teacherName || s.teacherName.trim() === '')
  );

  // Sorted arrays (ป.1 ขึ้นก่อน และเรียงตามลำดับชั้น)
  const sortedRegisteredSubjects = sortSubjectsByGrade(registeredSubjects);
  const sortedUnregisteredSubjects = sortSubjectsByGrade(unregisteredSubjects);

  // Set of teacher IDs and names who have registered at least one subject in current semester & year
  const registeredTeacherIds = new Set(registeredSubjects.map(s => s.teacherId).filter(Boolean));
  const registeredTeacherNames = new Set(registeredSubjects.map(s => s.teacherName).filter(Boolean));

  // Members who have NOT registered for any subject in this semester & year
  const unregisteredMembers = allMembers.filter(m => 
    m.role === 'member' && 
    !registeredTeacherIds.has(m.id) && 
    !registeredTeacherNames.has(m.fullName)
  );

  // Subjects registered by CURRENT user (if member)
  const myRegisteredSubjects = registeredSubjects.filter(s => 
    s.teacherId === user.id || s.teacherName === user.fullName
  );
  const sortedMyRegisteredSubjects = sortSubjectsByGrade(myRegisteredSubjects);

  // Registered homeroom grades (only classes that have a registered homeroom teacher member)
  const registeredHomeroomGrades = useMemo<GradeLevel[]>(() => {
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
  }, [allMembers]);

  const [adminGradeFilter, setAdminGradeFilter] = useState<string>(() => {
    if (user.role === 'admin' && registeredHomeroomGrades.length > 0) {
      return registeredHomeroomGrades[0];
    }
    return 'ป.1';
  });
  const [adminRoomFilter, setAdminRoomFilter] = useState<string>('1');

  const adminAvailableRooms = useMemo(() => {
    const roomSet = new Set<string>(getRoomsForGrade(adminGradeFilter));
    currentSemSubjects
      .filter(s => (s.gradeLevel || '').trim() === adminGradeFilter)
      .forEach(s => roomSet.add(normalizeRoom(s.room)));
    return Array.from(roomSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [adminGradeFilter, students, currentSemSubjects]);

  React.useEffect(() => {
    if (!adminAvailableRooms.includes(adminRoomFilter)) {
      setAdminRoomFilter(adminAvailableRooms[0] || '1');
    }
  }, [adminAvailableRooms, adminRoomFilter]);

  React.useEffect(() => {
    if (user.role === 'admin' && registeredHomeroomGrades.length > 0) {
      if (!registeredHomeroomGrades.includes(adminGradeFilter as GradeLevel)) {
        setAdminGradeFilter(registeredHomeroomGrades[0]);
      }
    }
  }, [user.role, registeredHomeroomGrades]);

  // Admin filtered subjects matching selected homeroom grade & room
  const adminGradeSubjects = useMemo(() => {
    return sortSubjectsByGrade(
      currentSemSubjects.filter(s =>
        (s.gradeLevel || '').trim() === adminGradeFilter &&
        normalizeRoom(s.room) === normalizeRoom(adminRoomFilter)
      )
    );
  }, [currentSemSubjects, adminGradeFilter, adminRoomFilter]);

  // Grade input selection: if user is a member, prioritize subject they registered in current semester & year
  const findDefaultSubjectId = (targetSem: '1' | '2' = currentSemester, targetYear: string = currentAcademicYear): string => {
    const semSubs = subjects.filter(s => isSubjectInYear(s, targetYear) && (!s.semester || s.semester === targetSem));
    const semRegistered = sortSubjectsByGrade(semSubs.filter(s => Boolean(s.teacherId || s.teacherName)));

    if (user.role === 'member') {
      const mySub = semRegistered.find(s => s.teacherId === user.id || s.teacherName === user.fullName);
      if (mySub) return mySub.id;
      return ''; // Member has no registered subjects in this semester yet
    } else {
      // Admin: show first subject of admin selected grade
      const match = semSubs.filter(s => (s.gradeLevel || '').trim() === adminGradeFilter);
      if (match.length > 0) return match[0].id;
      if (semRegistered.length > 0) return semRegistered[0].id;
      return '';
    }
  };

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => findDefaultSubjectId());

  // Keep selectedSubjectId synced for Admin when adminGradeFilter or currentSemester changes
  React.useEffect(() => {
    if (user.role === 'admin') {
      if (adminGradeSubjects.length > 0) {
        if (!selectedSubjectId || !adminGradeSubjects.some(s => s.id === selectedSubjectId)) {
          setSelectedSubjectId(adminGradeSubjects[0].id);
        }
      } else {
        setSelectedSubjectId('');
      }
    }
  }, [user.role, adminGradeFilter, adminGradeSubjects, selectedSubjectId]);
  


  // Active popover score picker state: { studentId, assignmentId }
  const [activeScorePicker, setActiveScorePicker] = useState<{
    studentId: string;
    assignmentId: string;
  } | null>(null);

  // Constants & helpers for Kindergarten (อ.1, อ.2, อ.3) - หลักสูตรการศึกษาปฐมวัย พ.ศ. 2568
  const DEFAULT_KINDERGARTEN_RUBRIC_LEVELS: RubricLevel[] = [
    { level: 1, label: 'ควรเสริม' },
    { level: 2, label: 'ได้บางครั้ง' },
    { level: 3, label: 'ปฏิบัติได้' }
  ];

  const EARLY_CHILDHOOD_2568_COMPETENCIES: {
    title: string;
    subjectSuggestion: string;
    elements: string[];
  }[] = [
    {
      title: 'สมรรถนะการเคลื่อนไหวและสุขภาวะทางกาย',
      subjectSuggestion: 'พัฒนาการด้านร่างกาย',
      elements: [
        'ใช้กล้ามเนื้อมัดใหญ่เคลื่อนไหวและทรงตัวได้อย่างคล่องแคล่ว',
        'ใช้กล้ามเนื้อมัดเล็กและประสานสัมพันธ์มือ-ตาได้เหมาะสม',
        'ดูแลสุขอนามัย สุขนิสัย และรักษาความปลอดภัยของตนเอง'
      ]
    },
    {
      title: 'สมรรถนะการเข้าใจและจัดการอารมณ์ตนเอง',
      subjectSuggestion: 'พัฒนาการด้านอารมณ์ จิตใจ',
      elements: [
        'รับรู้ เข้าใจ และแสดงออกทางอารมณ์ได้อย่างเหมาะสมตามวัย',
        'มีความมั่นใจ ร่าเริงแจ่มใส และภาคภูมิใจในตนเอง',
        'ชื่นชมศิลปะ ดนตรี การเคลื่อนไหว และธรรมชาติรอบตัว'
      ]
    },
    {
      title: 'สมรรถนะการอยู่ร่วมกับผู้อื่นและทักษะทางสังคม',
      subjectSuggestion: 'พัฒนาการด้านสังคม',
      elements: [
        'ช่วยเหลือตนเองในกิจวัตรประจำวันและมีวินัยในตนเอง',
        'เล่นและทำกิจกรรมร่วมกับผู้อื่นอย่างสร้างสรรค์',
        'เคารพกติกา แบ่งปัน และมีน้ำใจช่วยเหลือผู้อื่น'
      ]
    },
    {
      title: 'สมรรถนะการสื่อสารและการใช้ภาษา',
      subjectSuggestion: 'พัฒนาการด้านสติปัญญา',
      elements: [
        'การฟังอย่างตั้งใจและเข้าใจความหมายจากการสื่อสาร',
        'การพูดสื่อสารความคิด ความรู้สึก และความต้องการตามวัย',
        'การอ่านภาพ สัญลักษณ์ และการเขียนสื่อความหมายเบื้องต้น'
      ]
    },
    {
      title: 'สมรรถนะการคิดและการแก้ปัญหาเบื้องต้น',
      subjectSuggestion: 'พัฒนาการด้านสติปัญญา',
      elements: [
        'การสังเกต จำแนก เปรียบเทียบ และจัดหมวดหมู่สิ่งต่างๆ',
        'การคิดเชิงเหตุผลและการแก้ปัญหาในชีวิตประจำวัน',
        'การสำรวจ คิดสร้างสรรค์ และจินตนาการ'
      ]
    }
  ];

  const isKindergartenGrade = (grade?: string): boolean => {
    return grade === 'อ.1' || grade === 'อ.2' || grade === 'อ.3';
  };

  // Helper to extract hierarchical KindergartenCompetency[] from any Subject (new or legacy)
  const extractKindergartenCompetencies = (sub?: Subject | null): KindergartenCompetency[] => {
    if (!sub) {
      return [{ id: `comp-${Date.now()}-1`, title: '', elements: [''] }];
    }
    if (sub.kindergartenCompetencies && sub.kindergartenCompetencies.length > 0) {
      return sub.kindergartenCompetencies.map((c, idx) => ({
        id: c.id || `comp-${idx + 1}`,
        title: c.title || '',
        elements: c.elements && c.elements.length > 0 ? [...c.elements] : ['']
      }));
    }
    const subs = sub.subtopics && sub.subtopics.length > 0 ? sub.subtopics : [];
    const asgs = sub.assignmentItems || [];
    if (subs.length > 0) {
      return subs.map((stName, idx) => {
        const unitNum = idx + 1;
        const unitAsgs = asgs.filter(a => a.unitNumber === unitNum);
        const trimmedSt = (stName || '').trim();
        const isGenericCompTitle = /^สมรรถนะ(\s*ที่)?\s*\d+$/i.test(trimmedSt);
        const cleanedTitle = isGenericCompTitle
          ? ''
          : trimmedSt.replace(/^สมรรถนะ(\s*ที่)?\s*\d+\s*:\s*/i, '').trim();

        if (unitAsgs.length > 1) {
          return {
            id: `comp-${unitNum}`,
            title: cleanedTitle,
            elements: unitAsgs.map(a => a.name)
          };
        } else if (unitAsgs.length === 1) {
          const elName = unitAsgs[0].name;
          const titleVal = isGenericCompTitle ? '' : (elName !== trimmedSt ? cleanedTitle : '');
          return {
            id: `comp-${unitNum}`,
            title: titleVal,
            elements: [elName || cleanedTitle || `องค์ประกอบ/ประเด็น 1`]
          };
        } else {
          return {
            id: `comp-${unitNum}`,
            title: '',
            elements: [cleanedTitle || trimmedSt || `องค์ประกอบ/ประเด็น 1`]
          };
        }
      });
    }
    if (asgs.length > 0) {
      return [
        {
          id: 'comp-1',
          title: '',
          elements: asgs.map(a => a.name)
        }
      ];
    }
    return [{ id: 'comp-1', title: '', elements: [''] }];
  };

  // Helper to sync KindergartenCompetency[] when subtopics or columns are edited on the grading screen
  const syncCompetenciesFromUnitsAndItems = (
    subtopicsList: string[],
    itemsList: AssignmentItem[],
    existingComps?: KindergartenCompetency[]
  ): KindergartenCompetency[] => {
    return subtopicsList.map((stName, idx) => {
      const unitNum = idx + 1;
      const unitItems = itemsList.filter(a => a.unitNumber === unitNum);
      const trimmedSt = (stName || '').trim();
      const isGenericCompTitle = /^สมรรถนะ(\s*ที่)?\s*\d+$/i.test(trimmedSt);
      const cleanedTitle = isGenericCompTitle
        ? ''
        : trimmedSt.replace(/^สมรรถนะ(\s*ที่)?\s*\d+\s*:\s*/i, '').trim();
      const prevComp = existingComps?.[idx];
      return {
        id: prevComp?.id || `comp-${unitNum}`,
        title: cleanedTitle,
        elements: unitItems.length > 0 ? unitItems.map(a => a.name) : [cleanedTitle || `องค์ประกอบ/ประเด็น 1`]
      };
    });
  };

  // Admin add subject / activity modal
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [modalGradeLevel, setModalGradeLevel] = useState<GradeLevel>('ป.1');
  const [modalRoom, setModalRoom] = useState<string>('1');
  const [modalItemType, setModalItemType] = useState<'subject' | 'activity'>('subject');
  const [activityNamePresetInput, setActivityNamePresetInput] = useState<string>('');
  const [subjectNameInput, setSubjectNameInput] = useState<string>('');

  // Admin Drag-and-Drop Reordering States for Subjects List
  const [draggedSubjectId, setDraggedSubjectId] = useState<string | null>(null);
  const [dragOverSubjectId, setDragOverSubjectId] = useState<string | null>(null);
  const touchDragTimerRef = React.useRef<number | null>(null);

  const handleReorderSubjects = (fromId: string, toId: string, currentList: Subject[]) => {
    if (user.role !== 'admin') return;
    if (!fromId || !toId || fromId === toId) return;
    const fromIndex = currentList.findIndex(s => s.id === fromId);
    const toIndex = currentList.findIndex(s => s.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const nextList = [...currentList];
    const [moved] = nextList.splice(fromIndex, 1);
    nextList.splice(toIndex, 0, moved);

    // Assign explicit 1-based sortOrder to all items in this reordered view
    const updatedFiltered = nextList.map((s, idx) => ({
      ...s,
      sortOrder: idx + 1
    }));

    // Propagate sortOrder to matching subjects in the other semester of the same academicYear, gradeLevel & room
    const orderBySubKey = new Map<string, number>();
    updatedFiltered.forEach(s => {
      const key = `${s.gradeLevel}__${normalizeRoom(s.room)}__${Boolean(s.isActivity)}__${(s.code || '').trim().toUpperCase()}__${(s.name || '').trim()}`;
      orderBySubKey.set(key, s.sortOrder!);
    });

    const updatedIds = new Set(updatedFiltered.map(s => s.id));
    const extraSynced: Subject[] = [];
    yearSubjects.forEach(s => {
      if (updatedIds.has(s.id)) return;
      const key = `${s.gradeLevel}__${normalizeRoom(s.room)}__${Boolean(s.isActivity)}__${(s.code || '').trim().toUpperCase()}__${(s.name || '').trim()}`;
      const matchedOrder = orderBySubKey.get(key);
      if (matchedOrder !== undefined && s.sortOrder !== matchedOrder) {
        extraSynced.push({ ...s, sortOrder: matchedOrder });
      }
    });

    const allToSave = [...updatedFiltered, ...extraSynced];
    if (onSaveBulkSubjects) {
      onSaveBulkSubjects(allToSave);
    } else {
      const saved = StorageService.saveBulkSubjects(allToSave);
      if (onUpdateSubjectsList) onUpdateSubjectsList(saved);
    }
  };

  const MODAL_ALLOWED_GRADES: GradeLevel[] = [
    'อ.1', 'อ.2', 'อ.3',
    'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
    'ม.1', 'ม.2', 'ม.3'
  ];

  // Kindergarten configuration states in modal (หลักสูตรการศึกษาปฐมวัย พ.ศ. 2568: ด้านความสามารถ + เปิด/ปิดสมรรถนะ + องค์ประกอบ/ประเด็น)
  const [hasKindergartenCompetency, setHasKindergartenCompetency] = useState<boolean>(true);
  const [kindergartenDirectElements, setKindergartenDirectElements] = useState<string[]>(['']);
  const [kindergartenSubtopics, setKindergartenSubtopics] = useState<string[]>(['']);
  const [kindergartenCompetencies, setKindergartenCompetencies] = useState<KindergartenCompetency[]>([
    { id: 'comp-1', title: '', elements: [''] }
  ]);
  const [kindergartenRubricLevels, setKindergartenRubricLevels] = useState<RubricLevel[]>(DEFAULT_KINDERGARTEN_RUBRIC_LEVELS);
  const [kindergartenRubricCount, setKindergartenRubricCount] = useState<number>(3);

  // Kindergarten states for Member/Teacher Grading View
  const [selectedKindergartenSubtopic, setSelectedKindergartenSubtopic] = useState<string | null>(null);
  const [isAddKindergartenSubtopicModalOpen, setIsAddKindergartenSubtopicModalOpen] = useState(false);
  const [newKindergartenSubtopicInput, setNewKindergartenSubtopicInput] = useState('');
  const [newKindergartenElementsInput, setNewKindergartenElementsInput] = useState<string[]>(['']);
  const [newKindergartenStandardInput, setNewKindergartenStandardInput] = useState('');
  const [newKindergartenIndicatorInput, setNewKindergartenIndicatorInput] = useState('');
  const [subtopicToRename, setSubtopicToRename] = useState<string | null>(null);
  const [renameSubtopicInput, setRenameSubtopicInput] = useState('');
  const [renameStandardInput, setRenameStandardInput] = useState('');
  const [renameIndicatorInput, setRenameIndicatorInput] = useState('');
  const [isKindergartenSummaryModalOpen, setIsKindergartenSummaryModalOpen] = useState(false);
  const [kindergartenViewMode, setKindergartenViewMode] = useState<'grading' | 'inlineSummary'>('grading');
  const [kindergartenSummaryTab, setKindergartenSummaryTab] = useState<'byPage' | 'matrix' | 'stats'>('byPage');
  const [isAddKindergartenColumnModalOpen, setIsAddKindergartenColumnModalOpen] = useState(false);
  const [newKindergartenColumnInput, setNewKindergartenColumnInput] = useState('');
  const [kindergartenColumnToEdit, setKindergartenColumnToEdit] = useState<AssignmentItem | null>(null);
  const [editKindergartenColumnInput, setEditKindergartenColumnInput] = useState('');
  const [subtopicToDelete, setSubtopicToDelete] = useState<string | null>(null);
  const [kindergartenColumnToDelete, setKindergartenColumnToDelete] = useState<{ id: string; name: string } | null>(null);
  const [starMenuOpenSubtopic, setStarMenuOpenSubtopic] = useState<string | null>(null);

  const [gradingViewMode, setGradingViewMode] = useState<'score' | 'grade'>('score');

  // สถานะปลดล็อกช่องตารางคะแนนระหว่างภาค (หากไม่กดปุ่มตารางช่องระหว่างภาค จะพิมพ์-กรอกคะแนนในช่องไม่ได้)
  const [isCourseworkInputUnlocked, setIsCourseworkInputUnlocked] = useState<boolean>(false);

  // Function to change rubric level count (2 - 5 levels, default 3)
  const handleRubricCountChange = (count: number) => {
    const clamped = Math.min(5, Math.max(2, count));
    setKindergartenRubricCount(clamped);
    setKindergartenRubricLevels(prev => {
      const defaults = [
        { level: 1, label: 'ควรเสริม' },
        { level: 2, label: 'ได้บางครั้ง' },
        { level: 3, label: 'ปฏิบัติได้' },
        { level: 4, label: 'ดีเยี่ยม' },
        { level: 5, label: 'ยอดเยี่ยม' }
      ];
      const next: RubricLevel[] = [];
      for (let i = 1; i <= clamped; i++) {
        const found = prev.find(p => p.level === i);
        const def = defaults.find(d => d.level === i);
        next.push({
          level: i,
          label: found?.label || def?.label || `ระดับ ${i}`
        });
      }
      return next;
    });
  };

  // Unit count and Unit details for Subject Modal ("หน่วยที่" + ชื่อหน่วย + คะแนนเก็บ สำหรับ ป.1 - ม.6)
  const [subjectUnitCountInput, setSubjectUnitCountInput] = useState<number | ''>('');
  const [subjectUnitDetails, setSubjectUnitDetails] = useState<{
    unitNumber: number;
    name: string;
    score: number | '';
  }[]>([]);

  const handleOpenSubjectModal = (sub?: Subject | null, defaultType: 'subject' | 'activity' = 'subject') => {
    if (sub) {
      setEditingSubject(sub);
      const validGrade = MODAL_ALLOWED_GRADES.includes(sub.gradeLevel) ? sub.gradeLevel : 'ป.1';
      setModalGradeLevel(validGrade);
      setModalRoom(normalizeRoom(sub.room));
      setModalItemType(sub.isActivity ? 'activity' : 'subject');
      setActivityNamePresetInput(sub.name || '');
      setSubjectNameInput(sub.name || '');

      if (sub.isActivity) {
        setSubjectUnitCountInput('');
        setSubjectUnitDetails([]);
        setHasKindergartenCompetency(true);
        setKindergartenDirectElements(['']);
        setKindergartenSubtopics(['']);
        setKindergartenCompetencies([{ id: 'comp-1', title: '', elements: [''] }]);
        setKindergartenRubricLevels(DEFAULT_KINDERGARTEN_RUBRIC_LEVELS);
        setKindergartenRubricCount(3);
      } else if (isKindergartenGrade(sub.gradeLevel)) {
        // อ.1, อ.2, อ.3: โหลดโครงสร้างสมรรถนะ (ON/OFF) + องค์ประกอบ/ประเด็น (หลักสูตรปฐมวัย 2568) และระดับคะแนนคุณภาพ
        const extractedComps = extractKindergartenCompetencies(sub);
        const isCompOn = sub.hasKindergartenCompetency !== undefined ? sub.hasKindergartenCompetency : true;
        setHasKindergartenCompetency(isCompOn);
        setKindergartenCompetencies(extractedComps);
        const flatElements = extractedComps.flatMap(c => c.elements).filter(Boolean);
        setKindergartenDirectElements(flatElements.length > 0 ? flatElements : ['']);

        const existingSubs = sub.subtopics && sub.subtopics.length > 0 
          ? [...sub.subtopics] 
          : (sub.assignmentItems && sub.assignmentItems.length > 0 ? sub.assignmentItems.map(a => a.name) : ['']);
        setKindergartenSubtopics(existingSubs.length > 0 ? existingSubs : ['']);
        
        const existingRubrics = sub.rubricLevels && sub.rubricLevels.length > 0
          ? [...sub.rubricLevels]
          : DEFAULT_KINDERGARTEN_RUBRIC_LEVELS;
        setKindergartenRubricLevels(existingRubrics);
        setKindergartenRubricCount(sub.rubricMaxLevel || existingRubrics.length || 3);
        setSubjectUnitCountInput('');
        setSubjectUnitDetails([]);
      } else {
        // ป.1 - ม.3: โหลดหน่วยการเรียนรู้
        const existingDetails = sub.learningUnitDetails || [];
        const existingUnits = sub.learningUnits && sub.learningUnits.length > 0
          ? sub.learningUnits
          : (existingDetails.length > 0 ? existingDetails.map(d => d.unitNumber) : []);
        const count = existingUnits.length;
        setSubjectUnitCountInput(count > 0 ? count : '');

        const details = existingUnits.map(uNum => {
          const foundDetail = existingDetails.find(d => d.unitNumber === uNum);
          const unitAsg = (sub.assignmentItems || []).find(a => a.unitNumber === uNum);
          const scoreVal: number | '' = typeof foundDetail?.score === 'number'
            ? foundDetail.score
            : (typeof unitAsg?.maxScore === 'number' ? unitAsg.maxScore : '');
          return {
            unitNumber: uNum,
            name: foundDetail?.name || '',
            score: scoreVal
          };
        });
        setSubjectUnitDetails(details);
        setHasKindergartenCompetency(true);
        setKindergartenDirectElements(['']);
        setKindergartenSubtopics(['']);
        setKindergartenCompetencies([{ id: 'comp-1', title: '', elements: [''] }]);
        setKindergartenRubricLevels(DEFAULT_KINDERGARTEN_RUBRIC_LEVELS);
        setKindergartenRubricCount(3);
      }
    } else {
      setEditingSubject(null);
      setModalItemType(defaultType);
      setActivityNamePresetInput('');
      setSubjectNameInput('');
      const defaultGradeFromFilter: GradeLevel =
        selectedGradeFilter === 'อนุบาล'
          ? 'อ.1'
          : selectedGradeFilter === 'มัธยม'
          ? 'ม.1'
          : MODAL_ALLOWED_GRADES.includes(selectedGradeFilter as GradeLevel)
          ? (selectedGradeFilter as GradeLevel)
          : 'ป.1';
      setModalGradeLevel(defaultGradeFromFilter);
      const validRooms = getRoomsForGrade(defaultGradeFromFilter);
      setModalRoom(validRooms.includes(normalizeRoom(selectedSubjectRoomFilter)) ? normalizeRoom(selectedSubjectRoomFilter) : (validRooms[0] || '1'));
      setHasKindergartenCompetency(true);
      setKindergartenDirectElements(['']);
      setKindergartenSubtopics(['']);
      setKindergartenCompetencies([{ id: `comp-${Date.now()}-1`, title: '', elements: [''] }]);
      setKindergartenRubricLevels(DEFAULT_KINDERGARTEN_RUBRIC_LEVELS);
      setKindergartenRubricCount(3);
      setSubjectUnitCountInput('');
      setSubjectUnitDetails([]);
    }
    setIsSubjectModalOpen(true);
  };

  const handleUnitCountChange = (valStr: string) => {
    if (valStr === '') {
      setSubjectUnitCountInput('');
      setSubjectUnitDetails([]);
      return;
    }
    const count = parseInt(valStr, 10);
    if (isNaN(count)) return;

    if (count <= 0) {
      setSubjectUnitCountInput(0);
      setSubjectUnitDetails([]);
      return;
    }

    const safeCount = Math.min(30, count);
    setSubjectUnitCountInput(safeCount);

    setSubjectUnitDetails(prev => {
      const next = [...prev];
      while (next.length < safeCount) {
        const uNum = next.length + 1;
        next.push({
          unitNumber: uNum,
          name: '',
          score: ''
        });
      }
      return next.slice(0, safeCount);
    });
  };

  // Assignment Column Management Modal & State
  const [isAddAssignmentModalOpen, setIsAddAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [assignmentNameInput, setAssignmentNameInput] = useState('');

  // Modals for Academic Year Management
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [copyPreviousSubjects, setCopyPreviousSubjects] = useState(true);
  const [sourceYearToCopy, setSourceYearToCopy] = useState(currentAcademicYear);
  const [deletingYear, setDeletingYear] = useState<string | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // Modals for Confirmation (ถอนชื่อผู้สอน / ลบรายวิชา)
  const [subjectToWithdraw, setSubjectToWithdraw] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Modal for copying subjects in โครงสร้างรายวิชา
  const [isCopySubjectsModalOpen, setIsCopySubjectsModalOpen] = useState(false);
  const [copyModalSourceYear, setCopyModalSourceYear] = useState(
    academicYears.find(y => y !== currentAcademicYear) || academicYears[0] || '2568'
  );
  const [copyModalSourceSemester, setCopyModalSourceSemester] = useState<'1' | '2' | 'all'>('1');
  const [copyModalSourceGrade, setCopyModalSourceGrade] = useState<string>('all');
  const [copyModalTargetRoom, setCopyModalTargetRoom] = useState<string>('1');
  const [selectedCopySubjectIds, setSelectedCopySubjectIds] = useState<string[]>([]);

  // Modal for copying assignment template from previous year in scoring tab
  const [isCopyAssignmentModalOpen, setIsCopyAssignmentModalOpen] = useState(false);
  const [selectedTemplateSubject, setSelectedTemplateSubject] = useState<Subject | null>(null);
  const [copyTemplateSourceYear, setCopyTemplateSourceYear] = useState<string>('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ป.1');
  const [selectedSubjectRoomFilter, setSelectedSubjectRoomFilter] = useState<string>('1');
  const [unregisteredGradeFilter, setUnregisteredGradeFilter] = useState<GradeLevel>('ป.1');
  const [unregisteredRoomFilter, setUnregisteredRoomFilter] = useState<string>('1');
  const [openUnregisteredGradeDropdown, setOpenUnregisteredGradeDropdown] = useState<GradeLevel | null>(null);

  // ห้องของชั้นที่เลือกในส่วนลงทะเบียนวิชาสอน (อิงตามรายชื่อนักเรียนในหน้าข้อมูลนักเรียน โดยมีห้อง 1 เป็นพื้นฐาน)
  const unregisteredGradeStudentRooms = useMemo(() => {
    return getRoomsForGrade(unregisteredGradeFilter);
  }, [unregisteredGradeFilter, students]);

  React.useEffect(() => {
    if (!unregisteredGradeStudentRooms.includes(unregisteredRoomFilter)) {
      setUnregisteredRoomFilter(unregisteredGradeStudentRooms[0] || '1');
    }
  }, [unregisteredGradeFilter, unregisteredGradeStudentRooms, unregisteredRoomFilter]);

  // หากในหน้าข้อมูลนักเรียนมีการเพิ่มรายชื่อนักเรียนห้อง 2, 3... ให้สร้างโครงสร้างรายวิชาของห้องนั้นๆ (คัดลอกจากห้อง 1 ของชั้นเดียวกัน) อัตโนมัติเพื่อให้สมาชิกลงทะเบียนสอนแยกห้องได้ทันที
  React.useEffect(() => {
    if (!students || students.length === 0 || currentSemSubjects.length === 0) return;
    let provisionedMap: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem('ams_provisioned_grade_rooms');
      if (raw) provisionedMap = JSON.parse(raw);
    } catch {
      provisionedMap = {};
    }

    const toCreate: Subject[] = [];
    let updatedMap = false;

    MODAL_ALLOWED_GRADES.forEach(grade => {
      const rooms = getRoomsForGrade(grade);
      rooms.forEach(rm => {
        if (rm === '1') return;
        const provKey = `${currentAcademicYear}_${currentSemester}_${grade}_${rm}`;
        const existingInRoom = currentSemSubjects.filter(
          s => s.gradeLevel === grade && normalizeRoom(s.room) === rm
        );
        if (existingInRoom.length === 0 && !provisionedMap[provKey]) {
          const room1Templates = currentSemSubjects.filter(
            s => s.gradeLevel === grade && normalizeRoom(s.room) === '1'
          );
          if (room1Templates.length > 0) {
            const baseTs = Date.now();
            room1Templates.forEach((tpl, idx) => {
              toCreate.push({
                ...tpl,
                id: `${tpl.isActivity ? 'act' : 'sub'}-${baseTs}-${grade}-r${rm}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                room: rm,
                academicYear: currentAcademicYear,
                semester: currentSemester,
                teacherId: '',
                teacherName: '',
                assignmentItems: tpl.assignmentItems
                  ? tpl.assignmentItems.map((it, aIdx) => ({
                      ...it,
                      id: `asg-${baseTs}-r${rm}-${idx}-${aIdx}`
                    }))
                  : []
              });
            });
            provisionedMap[provKey] = true;
            updatedMap = true;
          }
        }
      });
    });

    if (updatedMap) {
      try {
        localStorage.setItem('ams_provisioned_grade_rooms', JSON.stringify(provisionedMap));
      } catch {
        // ignore storage errors
      }
    }

    if (toCreate.length > 0) {
      if (onSaveBulkSubjects) {
        onSaveBulkSubjects(toCreate);
      } else {
        toCreate.forEach(ns => onSaveSubject(ns));
      }
    }
  }, [students, currentSemSubjects, currentAcademicYear, currentSemester]);

  // ห้องสำหรับตัวกรองหน้ารายวิชา (อิงตามรายชื่อนักเรียนของชั้นนั้นๆ หากไม่มีรายชื่อนักเรียนจะแสดง "ห้อง 1" อย่างเดียว)
  const subjectFilterRooms = useMemo(() => {
    const effectiveGrade =
      selectedGradeFilter === 'อนุบาล'
        ? 'อ.1'
        : selectedGradeFilter === 'มัธยม'
        ? 'ม.1'
        : selectedGradeFilter;
    return getRoomsForGrade(effectiveGrade);
  }, [selectedGradeFilter, students]);

  React.useEffect(() => {
    if (!subjectFilterRooms.includes(selectedSubjectRoomFilter)) {
      setSelectedSubjectRoomFilter(subjectFilterRooms[0] || '1');
    }
  }, [subjectFilterRooms, selectedSubjectRoomFilter]);

  const modalAvailableRooms = useMemo(() => {
    return getRoomsForGrade(modalGradeLevel);
  }, [modalGradeLevel, students]);

  React.useEffect(() => {
    if (!editingSubject && !modalAvailableRooms.includes(modalRoom)) {
      setModalRoom(modalAvailableRooms[0] || '1');
    }
  }, [modalAvailableRooms, modalRoom, editingSubject]);

  // Learning Units state (หน่วยการเรียนรู้ 1, 2, 3...)
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [assignmentUnitInput, setAssignmentUnitInput] = useState<number>(1);
  const [unitToDelete, setUnitToDelete] = useState<number | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitModalMode, setUnitModalMode] = useState<'add' | 'edit'>('add');
  const [unitModalTargetNum, setUnitModalTargetNum] = useState<number | null>(null);
  const [unitNameInput, setUnitNameInput] = useState('');
  const [unitScoreInput, setUnitScoreInput] = useState<number | ''>('');

  // Mobile / Student rapid grading modal state (กดชื่อนักเรียนเพื่อลงคะแนนแต่ละงาน แต่ละหน่วย และปลายภาค)
  const [mobileGradingStudentId, setMobileGradingStudentId] = useState<string | null>(null);
  const [mobileGradingUnitTab, setMobileGradingUnitTab] = useState<number | 'test'>(1);

  // Mobile pop-up inline assignment actions (เพิ่ม/แก้ไข/ลบ ชิ้นงานในแต่ละหน่วย)
  const [isInlineAddingAsg, setIsInlineAddingAsg] = useState(false);
  const [newAsgNameInput, setNewAsgNameInput] = useState('');
  const [editingMobileAsgId, setEditingMobileAsgId] = useState<string | null>(null);
  const [editingMobileAsgName, setEditingMobileAsgName] = useState('');
  const [deletingAssignmentConfirm, setDeletingAssignmentConfirm] = useState<AssignmentItem | null>(null);

  // Pop-up กำหนดตารางชั่วโมงสอน & สรุปเวลาเรียน (เชื่อมโยงหน้าเวลาเรียน 100 วัน และดึงข้อมูลครูประจำชั้น)
  const [isTeachingScheduleModalOpen, setIsTeachingScheduleModalOpen] = useState(false);
  const [teachingScheduleDays, setTeachingScheduleDays] = useState<Record<number, number>>({});
  const [scheduleActiveView, setScheduleActiveView] = useState<'summary' | 'students' | 'dates'>('summary');
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');

  // Keep selectedSubjectId valid
  React.useEffect(() => {
    if (user.role === 'member') {
      const myRegistered = subjects.filter(s => 
        isSubjectInYear(s, currentAcademicYear) &&
        (!s.semester || s.semester === currentSemester) &&
        (s.teacherId === user.id || s.teacherName === user.fullName)
      );
      if (selectedSubjectId && !myRegistered.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId(myRegistered[0]?.id || '');
      } else if (!selectedSubjectId && myRegistered.length > 0) {
        setSelectedSubjectId(myRegistered[0].id);
      }
    } else {
      // Admin: focus on registered subjects
      const registered = subjects.filter(s => 
        isSubjectInYear(s, currentAcademicYear) &&
        (!s.semester || s.semester === currentSemester) &&
        Boolean(s.teacherId || s.teacherName)
      );
      if (selectedSubjectId && !registered.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId(registered[0]?.id || '');
      } else if (!selectedSubjectId && registered.length > 0) {
        setSelectedSubjectId(registered[0].id);
      }
    }
  }, [subjects, user.id, user.role, currentSemester, currentAcademicYear]);

  // Reset selectedUnit and lock coursework when subject changes
  React.useEffect(() => {
    setSelectedUnit(null);
    setIsCourseworkInputUnlocked(false);
  }, [selectedSubjectId, currentSemester]);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const assignmentItems: AssignmentItem[] = selectedSubject?.assignmentItems || [];
  const isPrimaryGradeLevel = selectedSubject?.gradeLevel ? (selectedSubject.gradeLevel.startsWith('ป.') || ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'].includes(selectedSubject.gradeLevel)) : false;
  const isSecondaryGradeLevel = selectedSubject?.gradeLevel ? (selectedSubject.gradeLevel.startsWith('ม.') || ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].includes(selectedSubject.gradeLevel)) : false;
  const showGradeButton = isSecondaryGradeLevel || (isPrimaryGradeLevel && currentSemester === '2');

  // Units for current subject (respects learningUnits if defined, defaults to [1] if undefined: เริ่มต้นแสดงแค่ 1 หน่วยทุกวิชา)
  const currentSubjectUnits: number[] = selectedSubject?.learningUnits !== undefined && selectedSubject.learningUnits.length > 0
    ? selectedSubject.learningUnits
    : [1];

  const isSelectedSubjectActivity = Boolean(selectedSubject?.isActivity);
  const isSelectedSubjectKindergarten = !isSelectedSubjectActivity && isKindergartenGrade(selectedSubject?.gradeLevel);

  const activeRubricLevels: RubricLevel[] = useMemo(() => {
    if (selectedSubject?.rubricLevels && selectedSubject.rubricLevels.length > 0) {
      return selectedSubject.rubricLevels;
    }
    return DEFAULT_KINDERGARTEN_RUBRIC_LEVELS;
  }, [selectedSubject]);

  const activeRubricMaxLevel = selectedSubject?.rubricMaxLevel || activeRubricLevels.length || 3;

  const isSelectedKindergartenCompetencyOff = Boolean(
    isSelectedSubjectKindergarten && selectedSubject?.hasKindergartenCompetency === false
  );

  const currentKindergartenSubtopics: string[] = useMemo(() => {
    if (!selectedSubject) return [];
    if (selectedSubject.hasKindergartenCompetency === false) {
      return [selectedSubject.name || 'ด้านความสามารถ'];
    }
    if (selectedSubject.subtopics !== undefined && selectedSubject.subtopics !== null && selectedSubject.subtopics.length > 0) {
      return selectedSubject.subtopics;
    }
    if (selectedSubject.kindergartenCompetencies && selectedSubject.kindergartenCompetencies.length > 0) {
      return selectedSubject.kindergartenCompetencies.map((comp, idx) => {
        const t = (comp.title || '').trim();
        return t ? `สมรรถนะที่ ${idx + 1}: ${t}` : `สมรรถนะที่ ${idx + 1}`;
      });
    }
    return ['สมรรถนะที่ 1: การเคลื่อนไหวและสุขภาวะทางกาย'];
  }, [selectedSubject]);

  const activeKindergartenSubtopic = useMemo(() => {
    if (currentKindergartenSubtopics.length === 0) return null;
    if (selectedKindergartenSubtopic && currentKindergartenSubtopics.includes(selectedKindergartenSubtopic)) {
      return selectedKindergartenSubtopic;
    }
    return currentKindergartenSubtopics[0];
  }, [currentKindergartenSubtopics, selectedKindergartenSubtopic]);

  const activeKindergartenSubtopicIndex = useMemo(() => {
    if (!activeKindergartenSubtopic) return 0;
    const idx = currentKindergartenSubtopics.indexOf(activeKindergartenSubtopic);
    return idx >= 0 ? idx : 0;
  }, [currentKindergartenSubtopics, activeKindergartenSubtopic]);

  const getKindergartenAssignmentForSubtopic = (stName: string, idx: number): AssignmentItem => {
    const targetUnit = idx + 1;
    const found = selectedSubject?.assignmentItems?.find(a => a.unitNumber === targetUnit || a.name === stName);
    if (found) return found;
    return {
      id: `asg-k-${targetUnit}-1`,
      name: stName,
      unitNumber: targetUnit,
      maxScore: activeRubricMaxLevel
    };
  };

  const displayedKindergartenAssignments: AssignmentItem[] = useMemo(() => {
    if (!isSelectedSubjectKindergarten || !selectedSubject) return [];
    const activeSub = activeKindergartenSubtopic;
    if (!activeSub) return [];

    const targetUnit = activeKindergartenSubtopicIndex + 1;
    const currentItems = selectedSubject.assignmentItems || [];
    
    // Items that have unitNumber matching this competency/subtopic index
    const matches = currentItems.filter(a => a.unitNumber === targetUnit);
    if (matches.length > 0) {
      return matches;
    }

    // Check kindergartenCompetencies elements if present
    const compObj = selectedSubject.kindergartenCompetencies?.[activeKindergartenSubtopicIndex];
    if (compObj && compObj.elements && compObj.elements.length > 0) {
      return compObj.elements.map((elName, eIdx) => ({
        id: `asg-k-${targetUnit}-${eIdx + 1}`,
        name: elName || `องค์ประกอบ/ประเด็น ${eIdx + 1}`,
        unitNumber: targetUnit,
        maxScore: activeRubricMaxLevel
      }));
    }

    // Fallback: check matching name if legacy unitNumber not set
    const nameMatches = currentItems.filter(a => a.name === activeSub);
    if (nameMatches.length > 0) {
      return nameMatches;
    }

    // If subject explicitly marked custom assignments or subtopics/assignmentItems explicitly defined
    if (selectedSubject.hasCustomAssignments || selectedSubject.subtopics !== undefined || selectedSubject.assignmentItems !== undefined) {
      return [];
    }

    // Default fallback column for this subtopic page
    return [{
      id: `asg-k-${targetUnit}-1`,
      name: `${activeSub}`,
      unitNumber: targetUnit,
      maxScore: activeRubricMaxLevel
    }];
  }, [isSelectedSubjectKindergarten, selectedSubject, activeKindergartenSubtopic, activeKindergartenSubtopicIndex, activeRubricMaxLevel]);

  // Helper to calculate student's summary rubric rating specifically for the current subtopic page
  const getStudentSubtopicSummary = (studentId: string, items: AssignmentItem[]) => {
    const row = scoreRows[studentId];
    if (!row?.assignmentScores || items.length === 0) {
      return { score: null, label: 'ยังไม่ประเมิน', average: null, count: 0 };
    }

    const scoredValues = items
      .map(it => row.assignmentScores[it.id])
      .filter((v): v is number => typeof v === 'number' && v > 0);

    if (scoredValues.length === 0) {
      return { score: null, label: 'ยังไม่ประเมิน', average: null, count: 0 };
    }

    const avg = scoredValues.reduce((sum, v) => sum + v, 0) / scoredValues.length;
    const roundedLevel = Math.min(activeRubricMaxLevel, Math.max(1, Math.round(avg)));
    const rubric = activeRubricLevels.find(r => r.level === roundedLevel);

    return {
      score: roundedLevel,
      label: rubric?.label || `ระดับ ${roundedLevel}`,
      average: avg.toFixed(1),
      count: scoredValues.length
    };
  };

  // Helper to calculate student's overall rubric rating across all subtopics
  const getStudentOverallRubric = (studentId: string) => {
    const row = scoreRows[studentId];
    if (!row?.assignmentScores) return { score: null, label: '-', average: null, count: 0 };

    const items = selectedSubject?.assignmentItems || [];
    const scoredValues = items
      .map(it => row.assignmentScores[it.id])
      .filter((v): v is number => typeof v === 'number' && v > 0);

    if (scoredValues.length === 0) {
      return { score: null, label: 'ยังไม่ประเมิน', average: null, count: 0 };
    }

    const avg = scoredValues.reduce((sum, v) => sum + v, 0) / scoredValues.length;
    const roundedLevel = Math.min(activeRubricMaxLevel, Math.max(1, Math.round(avg)));
    const rubric = activeRubricLevels.find(r => r.level === roundedLevel);

    return {
      score: roundedLevel,
      label: rubric?.label || `ระดับ ${roundedLevel}`,
      average: avg.toFixed(1),
      count: scoredValues.length
    };
  };

  const handleSetRubricScore = (studentId: string, asgId: string, score: number) => {
    const cur = scoreRows[studentId] || {
      coursework: 0,
      exam: 0,
      readingWriting: 3,
      characteristics: 3,
      competency: 3,
      assignmentScores: {}
    };
    const nextScores = { ...cur.assignmentScores, [asgId]: score };
    const next = {
      ...scoreRows,
      [studentId]: {
        ...cur,
        assignmentScores: nextScores
      }
    };
    setScoreRows(next);
    autoSaveGrades(next);
  };

  // Batch fill score for all students in a kindergarten assignment column
  const handleBatchSetRubricScore = (asgId: string, score: number) => {
    if (gradeStudents.length === 0) return;
    const next = { ...scoreRows };
    gradeStudents.forEach(st => {
      const cur = next[st.id] || {
        coursework: 0,
        exam: 0,
        readingWriting: 3,
        characteristics: 3,
        competency: 3,
        assignmentScores: {}
      };
      next[st.id] = {
        ...cur,
        assignmentScores: {
          ...(cur.assignmentScores || {}),
          [asgId]: score
        }
      };
    });
    setScoreRows(next);
    autoSaveGrades(next);
    onShowToast('success', 'บันทึกคะแนนยกกลุ่มแล้ว 🎉', `บันทึกระดับคะแนน ${score} แก่นักเรียนทุกคนเรียบร้อยแล้ว`);
  };

  // Batch fill score for all assignment columns in a specific subtopic page for all students
  const handleBatchSetRubricScoreForPage = (subtopicName: string, score: number) => {
    if (gradeStudents.length === 0 || !selectedSubject) return;

    const subtopicIndex = currentKindergartenSubtopics.indexOf(subtopicName);
    const pageUnitNum = subtopicIndex >= 0 ? subtopicIndex + 1 : 1;

    let pageAssignments = (selectedSubject.assignmentItems || []).filter(
      it => it.unitNumber === pageUnitNum || it.name === subtopicName
    );
    if (pageAssignments.length === 0) {
      pageAssignments = [{
        id: `asg-k-${pageUnitNum}-1`,
        name: subtopicName,
        unitNumber: pageUnitNum,
        maxScore: activeRubricMaxLevel
      }];
    }

    const assignmentIds = pageAssignments.map(a => a.id);

    const next = { ...scoreRows };
    gradeStudents.forEach(st => {
      const cur = next[st.id] || {
        coursework: 0,
        exam: 0,
        readingWriting: 3,
        characteristics: 3,
        competency: 3,
        assignmentScores: {}
      };
      const updatedScores = { ...(cur.assignmentScores || {}) };
      assignmentIds.forEach(asgId => {
        updatedScores[asgId] = score;
      });
      next[st.id] = {
        ...cur,
        assignmentScores: updatedScores
      };
    });

    setScoreRows(next);
    autoSaveGrades(next);
    setStarMenuOpenSubtopic(null);
    onShowToast('success', 'บันทึกคะแนนดาวเรียบร้อย 🎉', `ให้คะแนนระดับ ${score} แก่ทุกองค์ประกอบ/ประเด็นใน "${subtopicName}" สำหรับนักเรียนทุกคนแล้ว`);
  };

  // Add new competency / page on top bar (for kindergarten อ.1 - อ.3 ตามหลักสูตรปฐมวัย 2568)
  const handleAddKindergartenSubtopicSubmit = (newTitle: string, standard?: string, indicator?: string, elementsOverride?: string[]) => {
    if (!selectedSubject) return;
    const baseSubs = selectedSubject.subtopics !== undefined && selectedSubject.subtopics !== null
      ? [...selectedSubject.subtopics]
      : [...currentKindergartenSubtopics];
    const targetUnit = baseSubs.length + 1;
    const rawTrimmed = (newTitle || '').trim();
    const cleanedCompTitle = rawTrimmed.replace(/^สมรรถนะ(\s*ที่)?\s*\d+\s*:?\s*/i, '').trim();
    const subtopicLabel = cleanedCompTitle
      ? `สมรรถนะที่ ${targetUnit}: ${cleanedCompTitle}`
      : `สมรรถนะที่ ${targetUnit}`;

    const updatedSubtopics = [...baseSubs, subtopicLabel];

    const rawElements = (elementsOverride && elementsOverride.length > 0 ? elementsOverride : newKindergartenElementsInput)
      .map(el => el.trim())
      .filter(Boolean);
    const finalElements = rawElements.length > 0 ? rawElements : ['องค์ประกอบ/ประเด็น 1'];

    const baseTs = Date.now();
    const newCols: AssignmentItem[] = finalElements.map((elName, eIdx) => ({
      id: `asg-k-${baseTs}-${targetUnit}-${eIdx + 1}`,
      name: elName,
      unitNumber: targetUnit,
      maxScore: activeRubricMaxLevel
    }));
    const updatedAssignments = [...(selectedSubject.assignmentItems || []), ...newCols];

    // Maintain learningUnitDetails with standard & indicator
    const existingDetails = selectedSubject.learningUnitDetails ? [...selectedSubject.learningUnitDetails] : [];
    const newDetail: LearningUnitDetail = {
      unitNumber: targetUnit,
      name: subtopicLabel,
      standard: standard?.trim() || cleanedCompTitle || `สมรรถนะที่ ${targetUnit}`,
      indicator: indicator?.trim() || finalElements.map((el, i) => `องค์ประกอบ/ประเด็น ${i + 1}: ${el}`).join(' • ')
    };
    const updatedDetails = [...existingDetails.filter(d => d.unitNumber !== targetUnit), newDetail];
    const updatedComps = syncCompetenciesFromUnitsAndItems(
      updatedSubtopics,
      updatedAssignments,
      selectedSubject.kindergartenCompetencies
    );

    const updatedSubject: Subject = {
      ...selectedSubject,
      subtopics: updatedSubtopics,
      kindergartenCompetencies: updatedComps,
      assignmentItems: updatedAssignments,
      learningUnits: updatedSubtopics.map((_, i) => i + 1),
      learningUnitDetails: updatedDetails
    };

    onSaveSubject(updatedSubject);
    setSelectedKindergartenSubtopic(subtopicLabel);
    setIsAddKindergartenSubtopicModalOpen(false);
    setNewKindergartenSubtopicInput('');
    setNewKindergartenElementsInput(['']);
    setNewKindergartenStandardInput('');
    setNewKindergartenIndicatorInput('');
    onShowToast('success', 'เพิ่มสมรรถนะสำเร็จ 🎉', `เพิ่ม "${subtopicLabel}" พร้อม ${finalElements.length} องค์ประกอบ/ประเด็น เรียบร้อยแล้ว`);
  };

  // Open Edit Unit/Competency modal for kindergarten
  const handleOpenEditKindergartenUnitModal = (stName: string) => {
    if (!selectedSubject) return;
    const baseSubs = selectedSubject.subtopics !== undefined && selectedSubject.subtopics !== null
      ? [...selectedSubject.subtopics]
      : [...currentKindergartenSubtopics];
    const unitIndex = baseSubs.indexOf(stName);
    const targetUnit = unitIndex >= 0 ? unitIndex + 1 : -1;
    const detail = selectedSubject.learningUnitDetails?.find(
      d => (targetUnit > 0 && d.unitNumber === targetUnit) || d.name === stName
    );
    const compObj = unitIndex >= 0 ? selectedSubject.kindergartenCompetencies?.[unitIndex] : undefined;
    const cleanedCompTitle = compObj?.title !== undefined
      ? compObj.title
      : stName.replace(/^สมรรถนะ(\s*ที่)?\s*\d+\s*:?\s*/i, '').trim();

    setSubtopicToRename(stName);
    setRenameSubtopicInput(cleanedCompTitle);
    setRenameStandardInput(detail?.standard || '');
    setRenameIndicatorInput(detail?.indicator || '');
  };

  // Delete unit / page on top bar (triggers confirmation modal)
  const handleDeleteKindergartenSubtopic = (stName: string) => {
    setSubtopicToDelete(stName);
  };

  // Confirm delete unit / page (modal confirmed, safe for sandboxed iframes)
  const confirmDeleteKindergartenSubtopic = (stName: string) => {
    if (!selectedSubject) return;

    const baseSubs = selectedSubject.subtopics !== undefined && selectedSubject.subtopics !== null
      ? [...selectedSubject.subtopics]
      : [...currentKindergartenSubtopics];

    const stIndex = baseSubs.indexOf(stName);
    const targetUnit = stIndex >= 0 ? stIndex + 1 : -1;
    const remainingRawSubs = baseSubs.filter(s => s !== stName);
    // Re-number generic "สมรรถนะที่ X" labels cleanly
    const updatedSubtopics = remainingRawSubs.map((s, idx) => {
      const uNum = idx + 1;
      const isGeneric = /^สมรรถนะ(\s*ที่)?\s*\d+$/i.test(s.trim());
      if (isGeneric) return `สมรรถนะที่ ${uNum}`;
      const stripped = s.replace(/^สมรรถนะ(\s*ที่)?\s*\d+\s*:\s*/i, '').trim();
      if (/^สมรรถนะ(\s*ที่)?\s*\d+\s*:/i.test(s.trim())) {
        return `สมรรถนะที่ ${uNum}: ${stripped}`;
      }
      return s;
    });

    let currentItems = selectedSubject.assignmentItems;
    if (!currentItems || currentItems.length === 0) {
      currentItems = baseSubs.map((s, idx) => ({
        id: `asg-k-${idx + 1}-1`,
        name: s,
        unitNumber: idx + 1,
        maxScore: activeRubricMaxLevel
      }));
    }

    const deletedItemIds = new Set(
      currentItems
        .filter(it => it.name === stName || (targetUnit > 0 && it.unitNumber === targetUnit))
        .map(it => it.id)
    );
    const remainingItems = currentItems.filter(it => !deletedItemIds.has(it.id));

    // Shift unitNumber for remaining items whose unitNumber was greater than targetUnit
    const updatedAssignments = remainingItems.map(it => {
      if (it.unitNumber && targetUnit > 0 && it.unitNumber > targetUnit) {
        return { ...it, unitNumber: it.unitNumber - 1 };
      }
      return it;
    });

    // Update learningUnitDetails
    const updatedDetails = (selectedSubject.learningUnitDetails || [])
      .filter(d => !(d.unitNumber === targetUnit || d.name === stName))
      .map(d => {
        if (targetUnit > 0 && d.unitNumber > targetUnit) {
          return { ...d, unitNumber: d.unitNumber - 1 };
        }
        return d;
      });

    const updatedComps = syncCompetenciesFromUnitsAndItems(
      updatedSubtopics,
      updatedAssignments,
      (selectedSubject.kindergartenCompetencies || []).filter((_, i) => i !== stIndex)
    );

    const updatedSubject: Subject = {
      ...selectedSubject,
      subtopics: updatedSubtopics,
      kindergartenCompetencies: updatedComps,
      assignmentItems: updatedAssignments,
      learningUnits: updatedSubtopics.map((_, i) => i + 1),
      learningUnitDetails: updatedDetails,
      hasCustomAssignments: true
    };

    onSaveSubject(updatedSubject);

    // Clean scores from scoreRows
    const next = { ...scoreRows };
    gradeStudents.forEach(st => {
      if (next[st.id]?.assignmentScores) {
        const newScores = { ...(next[st.id].assignmentScores || {}) };
        deletedItemIds.forEach(id => delete newScores[id]);
        next[st.id] = { ...next[st.id], assignmentScores: newScores };
      }
    });
    setScoreRows(next);
    autoSaveGrades(next);

    const nextActive = updatedSubtopics[0] || null;
    setSelectedKindergartenSubtopic(nextActive);
    setSubtopicToDelete(null);
    onShowToast('info', 'ลบสมรรถนะแล้ว', `ลบ "${stName}" เรียบร้อยแล้ว`);
  };

  // Edit competency name, standard, and indicator for kindergarten (ชื่อสมรรถนะไม่บังคับพิมพ์)
  const handleEditKindergartenSubtopicSubmit = (oldName: string, newName: string, standard?: string, indicator?: string) => {
    if (!selectedSubject) return;
    const baseSubs = selectedSubject.subtopics !== undefined && selectedSubject.subtopics !== null
      ? [...selectedSubject.subtopics]
      : [...currentKindergartenSubtopics];

    const unitIndex = baseSubs.indexOf(oldName);
    const targetUnit = unitIndex >= 0 ? unitIndex + 1 : baseSubs.length;
    const cleanedTitle = (newName || '').replace(/^สมรรถนะ(\s*ที่)?\s*\d+\s*:?\s*/i, '').trim();
    const formattedSubtopic = cleanedTitle
      ? `สมรรถนะที่ ${targetUnit}: ${cleanedTitle}`
      : `สมรรถนะที่ ${targetUnit}`;

    const updatedSubtopics = baseSubs.map((s, idx) => (idx === unitIndex || s === oldName ? formattedSubtopic : s));
    const updatedAssignments = [...(selectedSubject.assignmentItems || [])];

    // Update learningUnitDetails
    const existingDetails = selectedSubject.learningUnitDetails ? [...selectedSubject.learningUnitDetails] : [];
    const existingDetailIndex = existingDetails.findIndex(d => d.unitNumber === targetUnit || d.name === oldName);
    const updatedDetail: LearningUnitDetail = {
      unitNumber: targetUnit,
      name: formattedSubtopic,
      standard: standard?.trim() || cleanedTitle || '',
      indicator: indicator?.trim() || ''
    };

    let updatedDetails: LearningUnitDetail[];
    if (existingDetailIndex >= 0) {
      updatedDetails = existingDetails.map((d, i) => i === existingDetailIndex ? updatedDetail : d);
    } else {
      updatedDetails = [...existingDetails, updatedDetail];
    }

    const updatedComps = syncCompetenciesFromUnitsAndItems(
      updatedSubtopics,
      updatedAssignments,
      selectedSubject.kindergartenCompetencies
    );

    const updatedSubject: Subject = {
      ...selectedSubject,
      subtopics: updatedSubtopics,
      kindergartenCompetencies: updatedComps,
      assignmentItems: updatedAssignments,
      learningUnits: updatedSubtopics.map((_, i) => i + 1),
      learningUnitDetails: updatedDetails
    };

    onSaveSubject(updatedSubject);
    if (selectedKindergartenSubtopic === oldName) {
      setSelectedKindergartenSubtopic(formattedSubtopic);
    }
    setSubtopicToRename(null);
    setRenameSubtopicInput('');
    setRenameStandardInput('');
    setRenameIndicatorInput('');
    onShowToast('success', 'บันทึกข้อมูลสมรรถนะสำเร็จ 🎉', `อัปเดต "${formattedSubtopic}" เรียบร้อยแล้ว`);
  };

  // Rename subtopic / page (backward-compatible wrapper)
  const handleRenameKindergartenSubtopic = (oldName: string, newName: string) => {
    handleEditKindergartenSubtopicSubmit(oldName, newName, renameStandardInput, renameIndicatorInput);
  };

  // Add a new องค์ประกอบ/ประเด็น column directly in the current competency's table
  const handleAddKindergartenColumnSubmit = (columnName: string) => {
    if (!selectedSubject || !activeKindergartenSubtopic) return;
    const trimmed = columnName.trim();
    if (!trimmed) return;

    const targetUnit = activeKindergartenSubtopicIndex + 1;
    const currentItems = selectedSubject.assignmentItems || [];
    const existingForPage = currentItems.filter(it => it.unitNumber === targetUnit || it.name === activeKindergartenSubtopic);

    const newCol: AssignmentItem = {
      id: `asg-k-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      unitNumber: targetUnit,
      maxScore: activeRubricMaxLevel
    };

    let updatedItems: AssignmentItem[];
    if (existingForPage.length === 0) {
      const defaultCol: AssignmentItem = {
        id: `asg-k-${targetUnit}-1`,
        name: `องค์ประกอบ/ประเด็น 1`,
        unitNumber: targetUnit,
        maxScore: activeRubricMaxLevel
      };
      updatedItems = [...currentItems, defaultCol, newCol];
    } else {
      updatedItems = [...currentItems, newCol];
    }

    const updatedComps = syncCompetenciesFromUnitsAndItems(
      currentKindergartenSubtopics,
      updatedItems,
      selectedSubject.kindergartenCompetencies
    );

    const updatedSubject: Subject = {
      ...selectedSubject,
      subtopics: currentKindergartenSubtopics,
      kindergartenCompetencies: updatedComps,
      assignmentItems: updatedItems
    };

    onSaveSubject(updatedSubject);
    setIsAddKindergartenColumnModalOpen(false);
    setNewKindergartenColumnInput('');
    onShowToast('success', 'เพิ่มองค์ประกอบ/ประเด็นสำเร็จ 🎉', `เพิ่ม "${trimmed}" ภายใต้ "${activeKindergartenSubtopic}" แล้ว`);
  };

  // Rename an องค์ประกอบ/ประเด็น column in current competency's table
  const handleRenameKindergartenColumn = (colId: string, newName: string) => {
    if (!selectedSubject) return;
    const trimmed = newName.trim();
    if (!trimmed) return;

    const currentItems = selectedSubject.assignmentItems || [];
    const targetUnit = activeKindergartenSubtopicIndex + 1;
    const exists = currentItems.some(it => it.id === colId);
    let updatedItems: AssignmentItem[];
    if (exists) {
      updatedItems = currentItems.map(it => it.id === colId ? { ...it, name: trimmed } : it);
    } else {
      const newCol: AssignmentItem = {
        id: colId,
        name: trimmed,
        unitNumber: targetUnit,
        maxScore: activeRubricMaxLevel
      };
      updatedItems = [...currentItems, newCol];
    }

    const updatedComps = syncCompetenciesFromUnitsAndItems(
      currentKindergartenSubtopics,
      updatedItems,
      selectedSubject.kindergartenCompetencies
    );

    const updatedSubject: Subject = {
      ...selectedSubject,
      subtopics: currentKindergartenSubtopics,
      kindergartenCompetencies: updatedComps,
      assignmentItems: updatedItems
    };

    onSaveSubject(updatedSubject);
    setKindergartenColumnToEdit(null);
    setEditKindergartenColumnInput('');
    onShowToast('success', 'เปลี่ยนชื่อสำเร็จ 🎉', `แก้ไขชื่อองค์ประกอบ/ประเด็นเป็น "${trimmed}" เรียบร้อยแล้ว`);
  };

  // Delete an องค์ประกอบ/ประเด็น column from current competency's table
  const handleDeleteKindergartenColumn = (colId: string, colName: string) => {
    if (!selectedSubject) return;

    let currentItems = selectedSubject.assignmentItems;
    const targetUnit = activeKindergartenSubtopicIndex + 1;
    if (!currentItems || currentItems.length === 0) {
      currentItems = currentKindergartenSubtopics.map((s, idx) => ({
        id: `asg-k-${idx + 1}-1`,
        name: s,
        unitNumber: idx + 1,
        maxScore: activeRubricMaxLevel
      }));
    }

    const updatedItems = currentItems.filter(it => it.id !== colId && !(it.unitNumber === targetUnit && it.name === colName));
    const updatedComps = syncCompetenciesFromUnitsAndItems(
      currentKindergartenSubtopics,
      updatedItems,
      selectedSubject.kindergartenCompetencies
    );

    const updatedSubject: Subject = {
      ...selectedSubject,
      subtopics: selectedSubject.subtopics ?? currentKindergartenSubtopics,
      kindergartenCompetencies: updatedComps,
      assignmentItems: updatedItems,
      hasCustomAssignments: true
    };

    onSaveSubject(updatedSubject);

    // Remove scores for this column
    const next = { ...scoreRows };
    gradeStudents.forEach(st => {
      if (next[st.id]?.assignmentScores) {
        const newScores = { ...(next[st.id].assignmentScores || {}) };
        delete newScores[colId];
        delete newScores[`asg-k-${targetUnit}-1`];
        next[st.id] = { ...next[st.id], assignmentScores: newScores };
      }
    });
    setScoreRows(next);
    autoSaveGrades(next);

    onShowToast('info', 'ลบองค์ประกอบ/ประเด็นแล้ว', `ลบ "${colName}" เรียบร้อยแล้ว`);
  };

  // Sync initial schedule from selectedSubject
  React.useEffect(() => {
    if (selectedSubject) {
      if (selectedSubject.teachingSchedule && Object.keys(selectedSubject.teachingSchedule).length > 0) {
        setTeachingScheduleDays({ ...selectedSubject.teachingSchedule });
      } else {
        setTeachingScheduleDays({});
      }
    }
  }, [selectedSubject?.id, isTeachingScheduleModalOpen]);

  const DAYS_OF_WEEK = [
    { day: 1, name: 'วันจันทร์', shortName: 'จ.', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-500 text-white' },
    { day: 2, name: 'วันอังคาร', shortName: 'อ.', color: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', badge: 'bg-pink-500 text-white' },
    { day: 3, name: 'วันพุธ', shortName: 'พ.', color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-500 text-white' },
    { day: 4, name: 'วันพฤหัสบดี', shortName: 'พฤ.', color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-500 text-white' },
    { day: 5, name: 'วันศุกร์', shortName: 'ศ.', color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-500 text-white' },
  ];

  // ครูประจำชั้นของระดับชั้นและห้องนี้
  const homeroomTeacher = useMemo(() => {
    if (!selectedSubject) return null;
    const targetRoom = normalizeRoom(selectedSubject.room);
    return (
      members.find(m => m.gradeLevel === selectedSubject.gradeLevel && normalizeRoom(m.room) === targetRoom) ||
      members.find(m => m.gradeLevel === selectedSubject.gradeLevel) ||
      null
    );
  }, [members, selectedSubject]);

  // นักเรียนในระดับชั้นและห้องของวิชาที่เลือก
  const subjectGradeStudents = useMemo(() => {
    if (!selectedSubject) return [];
    const targetRoom = normalizeRoom(selectedSubject.room);
    return students
      .filter(s => s.gradeLevel === selectedSubject.gradeLevel && normalizeRoom(s.room) === targetRoom)
      .sort((a, b) => (a.rollNumber || 999) - (b.rollNumber || 999));
  }, [students, selectedSubject]);

  // วันที่มีสอน (วันจันทร์ - ศุกร์ ที่ติ๊กเลือก)
  const activeTeachingDays = useMemo(() => {
    return [1, 2, 3, 4, 5].filter(d => (teachingScheduleDays[d] || 0) > 0);
  }, [teachingScheduleDays]);

  const totalWeeklyTeachingHours = useMemo(() => {
    return activeTeachingDays.reduce((acc, d) => acc + (teachingScheduleDays[d] || 0), 0);
  }, [activeTeachingDays, teachingScheduleDays]);

  // คำนวณข้อมูลเวลาเรียนที่เชื่อมโยงจากหน้า 100 วันของครูประจำชั้น
  const teachingAttendanceStats = useMemo(() => {
    if (!selectedSubject || activeTeachingDays.length === 0) {
      return {
        hasData: false,
        totalCheckedSessions: 0,
        totalPresentRecords: 0,
        totalAbsentRecords: 0,
        totalLeaveRecords: 0,
        totalSickRecords: 0,
        totalPersonalLeaveRecords: 0,
        overallAttendanceRate: 100,
        studentStats: [],
        teachingDates: []
      };
    }

    const allRecords = attendance && attendance.length > 0 ? attendance : StorageService.getAttendance();

    // กรองเฉพาะบันทึกเวลาเรียนของระดับชั้นนี้ ในภาคเรียน/ปีการศึกษานี้ และตรงกับวันที่มีสอน (1=จันทร์...5=ศุกร์)
    const subjectRecords = allRecords.filter(r => {
      if (r.gradeLevel !== selectedSubject.gradeLevel) return false;
      if (r.semester && r.semester !== currentSemester) return false;
      if (r.academicYear && r.academicYear !== currentAcademicYear) return false;
      const d = new Date(r.date + 'T00:00:00');
      return activeTeachingDays.includes(d.getDay());
    });

    const uniqueDates = Array.from(new Set(subjectRecords.map(r => r.date))).sort();

    let totalPresentRecords = 0;
    let totalAbsentRecords = 0;
    let totalSickRecords = 0;
    let totalPersonalLeaveRecords = 0;

    subjectRecords.forEach(r => {
      if (r.status === 'present') totalPresentRecords++;
      else if (r.status === 'absent') totalAbsentRecords++;
      else if (r.status === 'sick') totalSickRecords++;
      else if (r.status === 'leave') totalPersonalLeaveRecords++;
    });

    const totalLeaveRecords = totalSickRecords + totalPersonalLeaveRecords;
    const totalRecords = totalPresentRecords + totalAbsentRecords + totalLeaveRecords;
    const overallAttendanceRate = totalRecords > 0 
      ? Number(((totalPresentRecords / totalRecords) * 100).toFixed(1)) 
      : 100;

    // คำนวณรายบุคคล
    const studentStats = subjectGradeStudents.map(student => {
      const sRecs = subjectRecords.filter(r => r.studentId === student.id);
      let sPresentCount = 0;
      let sAbsentCount = 0;
      let sSickCount = 0;
      let sPersonalCount = 0;

      let sPresentHours = 0;
      let sAbsentHours = 0;
      let sSickHours = 0;
      let sPersonalHours = 0;

      sRecs.forEach(r => {
        const dayOfWeek = new Date(r.date + 'T00:00:00').getDay();
        const hrs = teachingScheduleDays[dayOfWeek] || 1;
        if (r.status === 'present') {
          sPresentCount++;
          sPresentHours += hrs;
        } else if (r.status === 'absent') {
          sAbsentCount++;
          sAbsentHours += hrs;
        } else if (r.status === 'sick') {
          sSickCount++;
          sSickHours += hrs;
        } else if (r.status === 'leave') {
          sPersonalCount++;
          sPersonalHours += hrs;
        }
      });

      const sTotalCheckedDays = sPresentCount + sAbsentCount + sSickCount + sPersonalCount;
      const sTotalHours = sPresentHours + sAbsentHours + sSickHours + sPersonalHours;
      const sRate = sTotalHours > 0 
        ? Math.round((sPresentHours / sTotalHours) * 100) 
        : 100;
      const isEligible = sRate >= 80;

      return {
        student,
        presentCount: sPresentCount,
        absentCount: sAbsentCount,
        sickCount: sSickCount,
        personalCount: sPersonalCount,
        totalCheckedDays: sTotalCheckedDays,
        presentHours: sPresentHours,
        absentHours: sAbsentHours,
        sickHours: sSickHours,
        personalHours: sPersonalHours,
        totalHours: sTotalHours,
        attendanceRate: sRate,
        isEligible
      };
    });

    // สรุปแยกตามวันที่สอน
    const teachingDates = uniqueDates.map(dateStr => {
      const dObj = new Date(dateStr + 'T00:00:00');
      const dayNum = dObj.getDay();
      const hrs = teachingScheduleDays[dayNum] || 1;
      const dayRecs = subjectRecords.filter(r => r.date === dateStr);
      const present = dayRecs.filter(r => r.status === 'present').length;
      const absent = dayRecs.filter(r => r.status === 'absent').length;
      const sick = dayRecs.filter(r => r.status === 'sick').length;
      const leave = dayRecs.filter(r => r.status === 'leave').length;
      return {
        date: dateStr,
        dayNum,
        hours: hrs,
        present,
        absent,
        sick,
        leave,
        total: dayRecs.length
      };
    });

    return {
      hasData: subjectRecords.length > 0,
      totalCheckedSessions: uniqueDates.length,
      totalPresentRecords,
      totalAbsentRecords,
      totalLeaveRecords,
      totalSickRecords,
      totalPersonalLeaveRecords,
      overallAttendanceRate,
      studentStats,
      teachingDates
    };
  }, [selectedSubject, activeTeachingDays, teachingScheduleDays, attendance, currentSemester, currentAcademicYear, subjectGradeStudents]);

  // บันทึกตารางชั่วโมงสอน
  const handleSaveTeachingSchedule = () => {
    if (!selectedSubject) return;
    const totalWeeklyHours = Object.values(teachingScheduleDays).reduce((acc, h) => acc + (Number(h) > 0 ? Number(h) : 0), 0);
    const updatedSubject: Subject = {
      ...selectedSubject,
      teachingSchedule: teachingScheduleDays,
      hoursPerWeek: totalWeeklyHours > 0 ? totalWeeklyHours : selectedSubject.hoursPerWeek
    };
    onSaveSubject(updatedSubject);
    onShowToast('success', 'บันทึกสำเร็จ 🎉', `บันทึกตารางชั่วโมงสอนวิชา ${selectedSubject.name} (${totalWeeklyHours} ชม./สัปดาห์) เรียบร้อยแล้ว`);
  };

  // จำลองข้อมูลการเช็กชื่อของครูประจำชั้นในวันที่มีสอน (สำหรับทดสอบ)
  const handleSimulateAttendanceForSubject = () => {
    if (!selectedSubject || activeTeachingDays.length === 0) {
      onShowToast('warning', 'เลือกวันสอนก่อน', 'กรุณาเลือกวันที่มีสอนอย่างน้อย 1 วันก่อนจำลองข้อมูล');
      return;
    }
    const termConfigs = StorageService.getAttendanceConfigsByTerm();
    const termConfig = termConfigs[`${currentSemester}_${currentAcademicYear}`] || termConfigs['1_2569'] || attendanceConfig;
    const schoolDays = termConfig?.schoolDays || [];
    
    let datesToSeed: string[] = [];
    const activeDates = schoolDays
      .filter(sd => !sd.isHoliday && activeTeachingDays.includes(new Date(sd.date + 'T00:00:00').getDay()))
      .map(sd => sd.date);
    
    if (activeDates.length > 0) {
      datesToSeed = activeDates.slice(0, 10);
    } else {
      const base = new Date(currentAcademicYear === '2568' ? '2025-05-19' : '2026-05-18');
      for (let i = 0; i < 40 && datesToSeed.length < 8; i++) {
        const curr = new Date(base);
        curr.setDate(base.getDate() + i);
        if (activeTeachingDays.includes(curr.getDay())) {
          datesToSeed.push(curr.toISOString().split('T')[0]);
        }
      }
    }

    const currentRecords = attendance && attendance.length > 0 ? attendance : StorageService.getAttendance();
    const newRecs: AttendanceRecord[] = [];
    const targetRoom = normalizeRoom(selectedSubject.room);
    const gradeStds = students.filter(s => s.gradeLevel === selectedSubject.gradeLevel && normalizeRoom(s.room) === targetRoom);
    
    datesToSeed.forEach(dt => {
      gradeStds.forEach((st, idx) => {
        let status: 'present' | 'absent' | 'leave' | 'sick' = 'present';
        const seedRand = (idx * 17 + dt.charCodeAt(dt.length - 1)) % 100;
        if (seedRand < 6) status = 'absent';
        else if (seedRand < 11) status = 'sick';
        else if (seedRand < 15) status = 'leave';

        newRecs.push({
          id: `att-sim-${st.id}-${dt}`,
          date: dt,
          studentId: st.id,
          studentName: `${st.prefix}${st.firstName} ${st.lastName}`,
          gradeLevel: selectedSubject.gradeLevel,
          status,
          semester: currentSemester,
          academicYear: currentAcademicYear
        });
      });
    });

    const combined = [...currentRecords.filter(r => !r.id.startsWith('att-sim-')), ...newRecs];
    if (onSaveBulkAttendance) {
      onSaveBulkAttendance(combined);
    } else {
      StorageService.saveBulkAttendance(combined);
    }
    onShowToast('success', 'จำลองข้อมูลสำเร็จ 🎉', `ดึงและจำลองข้อมูลการเช็กชื่อของครูประจำชั้น ${selectedSubject.gradeLevel} จำนวน ${datesToSeed.length} วันเรียนเรียบร้อยแล้ว`);
  };

  // Displayed assignments (filtered by selectedUnit if a unit circle is active)
  const displayedAssignments = selectedUnit === null
    ? assignmentItems
    : assignmentItems.filter(asg => (asg.unitNumber === selectedUnit) || (!asg.unitNumber && selectedUnit === 1));

  // Member enrollment and permissions check:
  // Is this subject registered by a member/teacher?
  const isSubjectRegisteredByMember = Boolean(
    selectedSubject && (
      Boolean(selectedSubject.teacherId && selectedSubject.teacherId.trim() !== '') ||
      Boolean(selectedSubject.teacherName && selectedSubject.teacherName.trim() !== '')
    )
  );

  // Is this subject enrolled by the CURRENT member?
  const isEnrolledByMember = Boolean(
    selectedSubject && (
      (selectedSubject.teacherId && selectedSubject.teacherId.trim() === user.id.trim()) ||
      (selectedSubject.teacherName && selectedSubject.teacherName.trim() === user.fullName.trim()) ||
      (user.role === 'member' && myRegisteredSubjects.some(s => s.id === selectedSubject.id))
    )
  );

  // Member is read-only if admin has locked this semester (เพื่อป้องกันการกรอกผิดภาคเรียน)
  const isMemberLockedReadOnly = user.role === 'member' && isCurrentSemLocked;

  // Admin is strictly read-only ("ไม่สามารถกรอกได้ แสดงหน้าอย่างเดียว ให้รู้ว่าสมาชิกชั้นไหนกรอกอะไรแล้วบ้าง")
  const isAdminReadOnly = user.role === 'admin';

  // Only the enrolled member can enter/edit scores! Admin is view-only.
  // If semester is locked, member cannot enter/edit scores.
  const canGradeSubject = user.role === 'member' && isEnrolledByMember && !isCurrentSemLocked;
  // Can manage learning units (เฉพาะสมาชิกครูผู้สอน)
  const canManageUnits = user.role === 'member' && !isMemberLockedReadOnly;
  // Can manage kindergarten pages and evaluation columns (เฉพาะสมาชิกครูผู้สอน)
  const canManageKindergartenTopics = user.role === 'member' && !isMemberLockedReadOnly;

  // Sort students by roll number (เรียงตามเลขที่ เฉพาะระดับชั้นและห้องของรายวิชาที่เลือก)
  const gradeStudents = [...students.filter(s =>
    s.gradeLevel === selectedSubject?.gradeLevel &&
    normalizeRoom(s.room) === normalizeRoom(selectedSubject?.room)
  )].sort((a, b) => {
    if (a.rollNumber !== undefined && b.rollNumber !== undefined) {
      return a.rollNumber - b.rollNumber;
    }
    if (a.rollNumber !== undefined) return -1;
    if (b.rollNumber !== undefined) return 1;
    return (a.studentCode || '').localeCompare(b.studentCode || '');
  });

  // Thai GPA calculation standard (50=1, 55=1.5, 60=2, 65=2.5, 70=3, 75=3.5, 80=4)
  const calculateThaiGrade = (total: number, _maxScore?: number): number => {
    const numericScore = Number(total) || 0;
    if (numericScore >= 80) return 4.0;
    if (numericScore >= 75) return 3.5;
    if (numericScore >= 70) return 3.0;
    if (numericScore >= 65) return 2.5;
    if (numericScore >= 60) return 2.0;
    if (numericScore >= 55) return 1.5;
    if (numericScore >= 50) return 1.0;
    return 0.0;
  };

  // Helper to calculate coursework score scaled from assignment average (0-5 scale) per unit
  const calculateCourseworkScore = (
    asgScores: Record<string, number>,
    subjectOrItems?: Subject | AssignmentItem[] | undefined,
    maxCwInput?: number
  ): { 
    average: number; 
    coursework: number;
    unitBreakdown: Record<number, { earned: number; max: number; avgRating: number; count: number }>;
    isExceeded: boolean;
  } => {
    let subjectObj: Subject | undefined;
    let items: AssignmentItem[] = [];
    let maxCw = maxCwInput || 70;

    if (Array.isArray(subjectOrItems)) {
      items = subjectOrItems;
      subjectObj = selectedSubject;
      maxCw = maxCwInput || selectedSubject?.courseworkScore || 70;
    } else if (subjectOrItems && typeof subjectOrItems === 'object') {
      subjectObj = subjectOrItems;
      items = subjectObj.assignmentItems || [];
      maxCw = subjectObj.courseworkScore || 70;
    } else {
      subjectObj = selectedSubject;
      items = selectedSubject?.assignmentItems || [];
      maxCw = selectedSubject?.courseworkScore || 70;
    }

    if (items.length === 0) {
      return { average: 0, coursework: 0, unitBreakdown: {}, isExceeded: false };
    }

    const units = subjectObj?.learningUnits !== undefined && subjectObj.learningUnits.length > 0
      ? subjectObj.learningUnits
      : [1];
    const unitDetails = subjectObj?.learningUnitDetails || [];

    const unitBreakdown: Record<number, { earned: number; max: number; avgRating: number; count: number }> = {};
    let totalCw = 0;

    units.forEach(uNum => {
      const detail = unitDetails.find(d => d.unitNumber === uNum);
      const unitMax = typeof detail?.score === 'number' && detail.score > 0
        ? detail.score
        : Math.round(maxCw / (units.length || 1));

      const itemsInUnit = items.filter(it => (it.unitNumber || 1) === uNum);
      const scoredInUnit = itemsInUnit.filter(it => typeof asgScores[it.id] === 'number' && !isNaN(asgScores[it.id]));

      if (scoredInUnit.length > 0) {
        const sumVal = scoredInUnit.reduce((acc, it) => acc + Number(asgScores[it.id]), 0);
        const avg = sumVal / scoredInUnit.length;
        const earned = Math.round((avg / 5) * unitMax);
        unitBreakdown[uNum] = {
          earned,
          max: unitMax,
          avgRating: Math.round(avg * 10) / 10,
          count: scoredInUnit.length
        };
        totalCw += earned;
      } else {
        unitBreakdown[uNum] = {
          earned: 0,
          max: unitMax,
          avgRating: 0,
          count: 0
        };
      }
    });

    const allScored = items.filter(it => typeof asgScores[it.id] === 'number' && !isNaN(asgScores[it.id]));
    const sumAll = allScored.reduce((acc, it) => acc + Number(asgScores[it.id]), 0);
    const overallAvg = allScored.length > 0 ? Math.round((sumAll / allScored.length) * 100) / 100 : 0;
    const isExceeded = totalCw > maxCw;

    return {
      average: overallAvg,
      coursework: totalCw,
      unitBreakdown,
      isExceeded
    };
  };

  // Local state for score entry matrix
  const [scoreRows, setScoreRows] = useState<Record<string, {
    coursework: number;
    exam: number;
    readingWriting: number;
    characteristics: number;
    competency: number;
    assignmentScores: Record<string, number>;
    activityResult?: 'ผ่าน' | 'ไม่ผ่าน' | '';
  }>>({});

  // Initialize row data when subject or currentSemester changes
  React.useEffect(() => {
    if (!selectedSubject) return;
    const initialRows: Record<string, any> = {};
    const items = selectedSubject.assignmentItems || [];

    gradeStudents.forEach(s => {
      const existing = grades.find(g => 
        g.studentId === s.id && 
        g.subjectId === selectedSubject.id && 
        g.semester === currentSemester &&
        (!g.academicYear || g.academicYear === currentAcademicYear)
      );

      const asgScores = existing?.assignmentScores ? { ...existing.assignmentScores } : {};
      
      // Calculate coursework from assignments if any exist
      let cw = existing ? existing.courseworkScore : 0;
      if (items.length > 0) {
        const { coursework } = calculateCourseworkScore(asgScores, selectedSubject);
        if (existing?.assignmentScores && Object.keys(existing.assignmentScores).length > 0) {
          cw = coursework;
        } else if (!existing) {
          cw = coursework;
        }
      }

      initialRows[s.id] = {
        coursework: cw,
        exam: existing ? existing.examScore : 0,
        readingWriting: existing ? existing.readingWritingScore : 3,
        characteristics: existing ? existing.desiredCharacteristicsScore : 3,
        competency: existing ? existing.competencyScore : 3,
        assignmentScores: asgScores,
        activityResult: existing?.activityResult || ''
      };
    });

    setScoreRows(initialRows);
  }, [selectedSubjectId, currentSemester, currentAcademicYear, grades]);

  // When students list changes (e.g. Admin adds or updates student later), auto-add into scoreRows
  React.useEffect(() => {
    if (!selectedSubject) return;
    const items = selectedSubject.assignmentItems || [];

    setScoreRows((prev: Record<string, any>) => {
      let hasChange = false;
      const next = { ...prev };
      gradeStudents.forEach(s => {
        if (!next[s.id]) {
          hasChange = true;
          const existing = grades.find(g => 
            g.studentId === s.id && 
            g.subjectId === selectedSubject.id && 
            g.semester === currentSemester &&
            (!g.academicYear || g.academicYear === currentAcademicYear)
          );
          const asgScores = existing?.assignmentScores ? { ...existing.assignmentScores } : {};
          let cw = existing ? existing.courseworkScore : 0;
          if (items.length > 0) {
            const { coursework } = calculateCourseworkScore(asgScores, selectedSubject);
            cw = coursework;
          }
          next[s.id] = {
            coursework: cw,
            exam: existing ? existing.examScore : 0,
            readingWriting: existing ? existing.readingWritingScore : 3,
            characteristics: existing ? existing.desiredCharacteristicsScore : 3,
            competency: existing ? existing.competencyScore : 3,
            assignmentScores: asgScores,
            activityResult: existing?.activityResult || ''
          };
        }
      });
      return hasChange ? next : prev;
    });
  }, [students, selectedSubjectId, currentSemester, currentAcademicYear]);

  // Auto-save grades helper without noisy toast popups (จำกัดคะแนนระหว่างภาคไม่ให้เกินคะแนนเต็มระหว่างภาค)
  const autoSaveGrades = (updatedRows: Record<string, any>) => {
    if (!selectedSubject || !canGradeSubject) return;
    const maxCw = selectedSubject.courseworkScore || 70;
    const isKinderSubj = !selectedSubject.isActivity && isKindergartenGrade(selectedSubject.gradeLevel);
    const kItems = selectedSubject.assignmentItems || [];
    const kMaxRubric = selectedSubject.rubricMaxLevel || (selectedSubject.rubricLevels?.length) || 3;

    const recordsToSave: GradeRecord[] = gradeStudents.map(s => {
      const row = updatedRows[s.id] || { 
        coursework: 0, 
        exam: 0, 
        readingWriting: 3, 
        characteristics: 3, 
        competency: 3,
        assignmentScores: {},
        activityResult: ''
      };

      let safeCw = selectedSubject.isActivity ? 0 : Math.min(maxCw, Number(row.coursework) || 0);
      let safeExam = selectedSubject.isActivity ? 0 : Math.min(selectedSubject.examScore || 30, Number(row.exam) || 0);
      let total = selectedSubject.isActivity ? 0 : Math.min(selectedSubject.totalScore || 100, safeCw + safeExam);
      let gpa = selectedSubject.isActivity ? 0 : calculateThaiGrade(total);

      if (isKinderSubj) {
        const asgMap = row.assignmentScores || {};
        const vals = (kItems.length > 0 ? kItems.map(it => asgMap[it.id]) : Object.values(asgMap))
          .filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0);
        if (vals.length > 0) {
          const avg = vals.reduce((acc, v) => acc + v, 0) / vals.length;
          const level = Math.min(kMaxRubric, Math.max(1, Math.round(avg)));
          safeCw = level;
          safeExam = 0;
          total = level;
          gpa = level;
        } else {
          safeCw = 0;
          safeExam = 0;
          total = 0;
          gpa = 0;
        }
      }

      const recordSem: '1' | '2' = (selectedSubject.semester === '1' || selectedSubject.semester === '2')
        ? selectedSubject.semester
        : currentSemester;
      const recordYear = selectedSubject.academicYear || currentAcademicYear;

      return {
        id: `grd-${s.id}-${selectedSubject.id}-${recordSem}`,
        studentId: s.id,
        studentName: `${s.prefix}${s.firstName} ${s.lastName}`,
        gradeLevel: selectedSubject.gradeLevel,
        subjectId: selectedSubject.id,
        subjectCode: selectedSubject.code,
        subjectName: selectedSubject.name,
        semester: recordSem,
        academicYear: recordYear,
        assignmentScores: row.assignmentScores || {},
        courseworkScore: safeCw,
        examScore: safeExam,
        totalScore: total,
        gradeGpa: gpa,
        readingWritingScore: Number(row.readingWriting) || 3,
        desiredCharacteristicsScore: Number(row.characteristics) || 3,
        competencyScore: Number(row.competency) || 3,
        activityResult: row.activityResult || ''
      };
    });
    onSaveBulkGrades(recordsToSave);
  };

  // Handle Activity Pass/Fail change (ผ่าน / ไม่ผ่าน)
  const handleActivityResultChange = (studentId: string, result: 'ผ่าน' | 'ไม่ผ่าน' | '') => {
    if (isMemberLockedReadOnly) {
      onShowToast('warning', 'ภาคเรียนนี้ถูกล็อก 🔒', `ภาคเรียนที่ ${currentSemester} ถูกล็อกการกรอกผลการประเมินโดยผู้ดูแลระบบ`);
      return;
    }
    if (!canGradeSubject) {
      onShowToast('warning', 'ต้องลงทะเบียนก่อน', 'สมาชิกต้องลงทะเบียนกิจกรรมนี้ก่อนจึงจะสามารถประเมินผลได้');
      return;
    }
    const currentRow = scoreRows[studentId] || {
      coursework: 0,
      exam: 0,
      readingWriting: 3,
      characteristics: 3,
      competency: 3,
      assignmentScores: {},
      activityResult: ''
    };
    const next = {
      ...scoreRows,
      [studentId]: {
        ...currentRow,
        activityResult: result
      }
    };
    setScoreRows(next);
    autoSaveGrades(next);
  };

  const handleBatchActivityResult = (result: 'ผ่าน' | 'ไม่ผ่าน') => {
    if (isMemberLockedReadOnly || !canGradeSubject) return;
    const next = { ...scoreRows };
    gradeStudents.forEach(s => {
      const currentRow = next[s.id] || {
        coursework: 0,
        exam: 0,
        readingWriting: 3,
        characteristics: 3,
        competency: 3,
        assignmentScores: {},
        activityResult: ''
      };
      next[s.id] = {
        ...currentRow,
        activityResult: result
      };
    });
    setScoreRows(next);
    autoSaveGrades(next);
    onShowToast('success', 'บันทึกผลกิจกรรมสำเร็จ 🎉', `ประเมินผล "${result}" ให้กับนักเรียนทุกคนเรียบร้อยแล้ว`);
  };

  // Handle direct row score change (e.g. coursework / exam score, ห้ามเกินจำนวนเต็ม)
  const handleScoreChange = (studentId: string, field: string, value: number) => {
    if (isMemberLockedReadOnly) {
      onShowToast('warning', 'ภาคเรียนนี้ถูกล็อก 🔒', `ภาคเรียนที่ ${currentSemester} ถูกล็อกการกรอกคะแนนโดยผู้ดูแลระบบ`);
      return;
    }
    const maxCw = selectedSubject?.courseworkScore || 70;
    const maxEx = selectedSubject?.examScore || 30;
    let safeValue = isNaN(value) ? 0 : Math.max(0, value);

    if (field === 'coursework') {
      if (safeValue > maxCw) {
        safeValue = maxCw;
        onShowToast('warning', 'ห้ามเกินจำนวนเต็ม ⚠️', `คะแนนระหว่างภาคห้ามเกินจำนวนเต็ม ${maxCw} คะแนน`);
      }
    } else if (field === 'exam') {
      if (safeValue > maxEx) {
        safeValue = maxEx;
        onShowToast('warning', 'ห้ามเกินจำนวนเต็ม ⚠️', `คะแนนปลายภาคห้ามเกินจำนวนเต็ม ${maxEx} คะแนน`);
      }
    }

    const currentRow = scoreRows[studentId] || {
      coursework: 0,
      exam: 0,
      readingWriting: 3,
      characteristics: 3,
      competency: 3,
      assignmentScores: {}
    };
    const next = {
      ...scoreRows,
      [studentId]: {
        ...currentRow,
        [field]: safeValue
      }
    };
    setScoreRows(next);
    autoSaveGrades(next);
  };

  // Handle selecting an assignment score: 0, 1, 2, 3, 4, 5
  const handleSelectAssignmentScore = (studentId: string, assignmentId: string, val: number) => {
    if (isMemberLockedReadOnly) {
      onShowToast('warning', 'ภาคเรียนนี้ถูกล็อก 🔒', `ภาคเรียนที่ ${currentSemester} ถูกล็อกการกรอกคะแนนโดยผู้ดูแลระบบ`);
      return;
    }
    const currentRow = scoreRows[studentId] || {
      coursework: 0,
      exam: 0,
      readingWriting: 3,
      characteristics: 3,
      competency: 3,
      assignmentScores: {}
    };

    const updatedScores = {
      ...(currentRow.assignmentScores || {}),
      [assignmentId]: val
    };

    const items = selectedSubject?.assignmentItems || [];
    const maxCw = selectedSubject?.courseworkScore || 70;
    const { coursework } = calculateCourseworkScore(updatedScores, items, maxCw);

    const next = {
      ...scoreRows,
      [studentId]: {
        ...currentRow,
        assignmentScores: updatedScores,
        coursework: coursework
      }
    };
    setScoreRows(next);
    autoSaveGrades(next);
  };

  // Quick batch fill an assignment score for all students
  const handleBatchFillAssignment = (assignmentId: string, val: number) => {
    const next = { ...scoreRows };
    const items = selectedSubject?.assignmentItems || [];
    const maxCw = selectedSubject?.courseworkScore || 70;

    gradeStudents.forEach(s => {
      const currentRow = next[s.id] || {
        coursework: 0,
        exam: 0,
        readingWriting: 3,
        characteristics: 3,
        competency: 3,
        assignmentScores: {}
      };
      const updatedScores = {
        ...(currentRow.assignmentScores || {}),
        [assignmentId]: val
      };
      const { coursework } = calculateCourseworkScore(updatedScores, items, maxCw);
      next[s.id] = {
        ...currentRow,
        assignmentScores: updatedScores,
        coursework: coursework
      };
    });
    setScoreRows(next);
    autoSaveGrades(next);
    onShowToast('info', 'เติมคะแนนสำเร็จ', `บันทึกคะแนน ${val} คะแนน ให้กับนักเรียนทุกคนเรียบร้อย`);
  };

  // Current student in mobile / popup grading modal
  const currentGradingStudent = mobileGradingStudentId
    ? gradeStudents.find(s => s.id === mobileGradingStudentId) || null
    : null;
  const currentGradingIndex = currentGradingStudent
    ? gradeStudents.findIndex(s => s.id === currentGradingStudent.id)
    : -1;

  const handlePrevGradingStudent = () => {
    if (currentGradingIndex > 0) {
      setMobileGradingStudentId(gradeStudents[currentGradingIndex - 1].id);
    }
  };

  const handleNextGradingStudent = () => {
    if (currentGradingIndex >= 0 && currentGradingIndex < gradeStudents.length - 1) {
      setMobileGradingStudentId(gradeStudents[currentGradingIndex + 1].id);
    }
  };

  // เปิด Modal เพิ่มหน่วยการเรียนรู้ใหม่
  const handleOpenAddUnitModal = () => {
    if (!selectedSubject) return;
    const units = selectedSubject.learningUnits && selectedSubject.learningUnits.length > 0
      ? [...selectedSubject.learningUnits]
      : [1];
    const nextUnit = units.length > 0 ? Math.max(...units) + 1 : 1;
    setUnitModalMode('add');
    setUnitModalTargetNum(nextUnit);
    setUnitNameInput(`หน่วยที่ ${nextUnit}`);
    setUnitScoreInput('');
    setIsUnitModalOpen(true);
  };

  // เปิด Modal แก้ไขหน่วยการเรียนรู้
  const handleOpenEditUnitModal = (uNum: number) => {
    if (!selectedSubject) return;
    const existingDetail = selectedSubject.learningUnitDetails?.find(d => d.unitNumber === uNum);
    setUnitModalMode('edit');
    setUnitModalTargetNum(uNum);
    setUnitNameInput(existingDetail?.name || `หน่วยที่ ${uNum}`);
    setUnitScoreInput(typeof existingDetail?.score === 'number' ? existingDetail.score : '');
    setIsUnitModalOpen(true);
  };

  // บันทึกการเพิ่ม/แก้ไขหน่วยการเรียนรู้
  // บันทึกการเพิ่ม/แก้ไขหน่วยการเรียนรู้
  const handleSaveUnitModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || unitModalTargetNum === null) return;

    const maxCw = selectedSubject.courseworkScore || 70;
    const otherUnitsScoreSum = (selectedSubject.learningUnitDetails || [])
      .filter(d => d.unitNumber !== unitModalTargetNum)
      .reduce((sum, d) => sum + (Number(d.score) || 0), 0);
    const remainingAllowed = Math.max(0, maxCw - otherUnitsScoreSum);
    const parsedScore = typeof unitScoreInput === 'number' ? unitScoreInput : (unitScoreInput === '' ? undefined : Number(unitScoreInput));

    if (parsedScore !== undefined && parsedScore > remainingAllowed) {
      onShowToast(
        'error', 
        'คะแนนเกินกำหนด ⚠️', 
        `คะแนนเต็มของหน่วยนี้ไม่สามารถเกิน ${remainingAllowed} คะแนน (คะแนนระหว่างภาคเต็ม ${maxCw} คะแนน, หน่วยอื่นใช้ไปแล้ว ${otherUnitsScoreSum} คะแนน)`
      );
      return;
    }

    const nameTrimmed = unitNameInput.trim() || `หน่วยที่ ${unitModalTargetNum}`;

    const units = selectedSubject.learningUnits && selectedSubject.learningUnits.length > 0
      ? [...selectedSubject.learningUnits]
      : [1];

    let updatedUnits = [...units];
    if (!updatedUnits.includes(unitModalTargetNum)) {
      updatedUnits.push(unitModalTargetNum);
      updatedUnits.sort((a, b) => a - b);
    }

    const existingDetails = selectedSubject.learningUnitDetails ? [...selectedSubject.learningUnitDetails] : [];
    const detailIndex = existingDetails.findIndex(d => d.unitNumber === unitModalTargetNum);

    const newDetailObj: LearningUnitDetail = {
      unitNumber: unitModalTargetNum,
      name: nameTrimmed,
      score: parsedScore !== undefined && !isNaN(parsedScore) ? parsedScore : undefined
    };

    if (detailIndex >= 0) {
      existingDetails[detailIndex] = newDetailObj;
    } else {
      existingDetails.push(newDetailObj);
    }

    const updatedSubject: Subject = {
      ...selectedSubject,
      learningUnits: updatedUnits,
      learningUnitDetails: existingDetails
    };

    onSaveSubject(updatedSubject);
    setIsUnitModalOpen(false);

    if (unitModalMode === 'add') {
      setSelectedUnit(unitModalTargetNum);
      setMobileGradingUnitTab(unitModalTargetNum);
      onShowToast('success', 'เพิ่มหน่วยการเรียนรู้สำเร็จ 🎉', `เพิ่ม "${nameTrimmed}" เรียบร้อยแล้ว`);
    } else {
      onShowToast('success', 'แก้ไขหน่วยการเรียนรู้สำเร็จ 🎉', `ปรับปรุงข้อมูล "${nameTrimmed}" เรียบร้อยแล้ว`);
    }
  };

  // Delete a learning unit (ลบจริงและบันทึกข้อมูลเรียบร้อย)
  const handleDeleteLearningUnit = (unitNum: number) => {
    if (!selectedSubject) return;
    const existingDetail = selectedSubject.learningUnitDetails?.find(d => d.unitNumber === unitNum);
    const unitName = existingDetail?.name ? `"${existingDetail.name}"` : `หน่วยที่ ${unitNum}`;

    const units = selectedSubject.learningUnits !== undefined && selectedSubject.learningUnits.length > 0
      ? [...selectedSubject.learningUnits]
      : [1];

    const updatedUnits = units.filter(u => u !== unitNum);
    const updatedDetails = (selectedSubject.learningUnitDetails || []).filter(d => d.unitNumber !== unitNum);
    const currentAssignments = selectedSubject.assignmentItems || [];
    const updatedAssignments = currentAssignments.filter(a => a.unitNumber !== unitNum);

    const updatedSub: Subject = {
      ...selectedSubject,
      learningUnits: updatedUnits,
      learningUnitDetails: updatedDetails,
      assignmentItems: updatedAssignments
    };

    if (selectedUnit === unitNum) {
      setSelectedUnit(null);
    }
    onSaveSubject(updatedSub);

    // Recalculate coursework if any assignment was removed
    const next = { ...scoreRows };
    const deletedIds = new Set(currentAssignments.filter(a => a.unitNumber === unitNum).map(a => a.id));
    Object.keys(next).forEach(stId => {
      const row = next[stId];
      if (row) {
        const newScores = { ...(row.assignmentScores || {}) };
        deletedIds.forEach(id => {
          delete newScores[id];
        });
        const { coursework } = calculateCourseworkScore(newScores, updatedSub);
        next[stId] = {
          ...row,
          assignmentScores: newScores,
          coursework
        };
      }
    });
    setScoreRows(next);
    autoSaveGrades(next);

    onShowToast('info', 'ลบหน่วยการเรียนรู้แล้ว', `ลบ ${unitName} เรียบร้อยแล้ว`);
  };

  // Add new assignment column
  const handleAddAssignment = (name: string) => {
    if (!selectedSubject) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const currentItems = selectedSubject.assignmentItems || [];
    const targetUnit = assignmentUnitInput || (selectedUnit || 1);
    const newAsg: AssignmentItem = {
      id: 'asg-' + Date.now(),
      name: trimmed,
      maxScore: 5,
      unitNumber: targetUnit
    };

    const updatedItems = [...currentItems, newAsg];
    const updatedSubject: Subject = {
      ...selectedSubject,
      assignmentItems: updatedItems
    };

    onSaveSubject(updatedSubject);

    // Recalculate coursework for all students with new assignment
    const next = { ...scoreRows };
    const maxCw = selectedSubject.courseworkScore || 70;

    gradeStudents.forEach(s => {
      const row = next[s.id] || {
        coursework: 0,
        exam: 0,
        readingWriting: 3,
        characteristics: 3,
        competency: 3,
        assignmentScores: {}
      };
      const updatedScores = { ...(row.assignmentScores || {}) };
      // New assignment score remains undefined (displays as "-")
      const { coursework } = calculateCourseworkScore(updatedScores, updatedItems, maxCw);
      next[s.id] = {
        ...row,
        assignmentScores: updatedScores,
        coursework: coursework
      };
    });
    setScoreRows(next);
    autoSaveGrades(next);

    setIsAddAssignmentModalOpen(false);
    setAssignmentNameInput('');
    onShowToast('success', 'เพิ่มช่องงานสำเร็จ 🎉', `เพิ่มช่อง "${trimmed}" (หน่วย ${targetUnit}) แล้ว`);
  };

  // Edit / Rename assignment column
  const handleEditAssignment = (assignmentId: string, newName: string, newUnit?: number) => {
    if (!selectedSubject) return;
    const trimmed = newName.trim();
    if (!trimmed) return;

    const currentItems = selectedSubject.assignmentItems || [];
    const updatedItems = currentItems.map(it => it.id === assignmentId 
      ? { ...it, name: trimmed, unitNumber: newUnit !== undefined ? newUnit : it.unitNumber } 
      : it
    );

    const updatedSubject: Subject = {
      ...selectedSubject,
      assignmentItems: updatedItems
    };

    onSaveSubject(updatedSubject);
    setEditingAssignment(null);
    setAssignmentNameInput('');
    onShowToast('success', 'เปลี่ยนชื่องานสำเร็จ', `แก้ไขชื่อเป็น "${trimmed}" เรียบร้อย`);
  };

  // Delete assignment column
  const handleDeleteAssignment = (assignmentId: string, asgName: string) => {
    if (!selectedSubject) return;

    const currentItems = selectedSubject.assignmentItems || [];
    const updatedItems = currentItems.filter(it => it.id !== assignmentId);

    const updatedSubject: Subject = {
      ...selectedSubject,
      assignmentItems: updatedItems
    };

    onSaveSubject(updatedSubject);

    // Recalculate coursework without this assignment and auto-save
    const next = { ...scoreRows };
    const maxCw = selectedSubject.courseworkScore || 70;

    gradeStudents.forEach(s => {
      const row = next[s.id];
      if (row) {
        const updatedScores = { ...(row.assignmentScores || {}) };
        delete updatedScores[assignmentId];
        const { coursework } = calculateCourseworkScore(updatedScores, updatedItems, maxCw);
        next[s.id] = {
          ...row,
          assignmentScores: updatedScores,
          coursework: coursework
        };
      }
    });
    setScoreRows(next);
    autoSaveGrades(next);

    onShowToast('info', 'ลบช่องงานแล้ว', `ลบช่อง "${asgName}" เรียบร้อยแล้ว`);
  };

  // Preload default assignment columns if empty
  const handleLoadSampleAssignments = () => {
    if (!selectedSubject) return;
    const samples: AssignmentItem[] = [
      { id: 'asg-01', name: 'งานที่ 1: แบบฝึกหัด', maxScore: 5, unitNumber: 1 },
      { id: 'asg-02', name: 'งานที่ 2: ใบงาน', maxScore: 5, unitNumber: 2 },
      { id: 'asg-03', name: 'งานที่ 3: ชิ้นงาน/นำเสนอ', maxScore: 5, unitNumber: 3 }
    ];

    const updatedSubject: Subject = {
      ...selectedSubject,
      assignmentItems: samples
    };

    onSaveSubject(updatedSubject);

    // Give default scores 5 to everyone
    const next = { ...scoreRows };
    const maxCw = selectedSubject.courseworkScore || 70;

    gradeStudents.forEach(s => {
      const row = next[s.id] || {
        coursework: 0,
        exam: 0,
        readingWriting: 3,
        characteristics: 3,
        competency: 3,
        assignmentScores: {}
      };
      const updatedScores = {
        'asg-01': 5,
        'asg-02': 4,
        'asg-03': 5
      };
      const { coursework } = calculateCourseworkScore(updatedScores, samples, maxCw);
      next[s.id] = {
        ...row,
        assignmentScores: updatedScores,
        coursework: coursework
      };
    });
    setScoreRows(next);
    autoSaveGrades(next);

    onShowToast('success', 'โหลดช่องงานสำเร็จ', 'เพิ่มช่องงานตัวอย่าง 3 รายการพร้อมปุ่มเลือกคะแนน 0-5 เรียบร้อย');
  };

  // Save all entered scores
  const handleSaveAllScores = () => {
    if (!selectedSubject) return;

    if (!canGradeSubject) {
      if (isMemberLockedReadOnly) {
        onShowToast('warning', 'ภาคเรียนนี้ถูกล็อก 🔒', `ภาคเรียนที่ ${currentSemester} ถูกล็อกการกรอกคะแนนโดยผู้ดูแลระบบ เพื่อป้องกันการกรอกผิดภาคเรียน`);
      } else if (isAdminReadOnly) {
        onShowToast('info', 'โหมดดูคะแนนเท่านั้น', 'ผู้ดูแลระบบไม่สามารถปรับแก้คะแนนของสมาชิกที่ลงทะเบียนได้');
      } else {
        onShowToast('warning', 'ต้องลงทะเบียนก่อน', 'สมาชิกต้องลงทะเบียนรายวิชานี้ก่อนจึงจะสามารถบันทึกคะแนนได้');
      }
      return;
    }

    const isKinderSubj = !selectedSubject.isActivity && isKindergartenGrade(selectedSubject.gradeLevel);
    const kItems = selectedSubject.assignmentItems || [];
    const kMaxRubric = selectedSubject.rubricMaxLevel || (selectedSubject.rubricLevels?.length) || 3;

    const recordsToSave: GradeRecord[] = gradeStudents.map(s => {
      const row = scoreRows[s.id] || { 
        coursework: 0, 
        exam: 0, 
        readingWriting: 3, 
        characteristics: 3, 
        competency: 3,
        assignmentScores: {},
        activityResult: ''
      };
      let safeCw = selectedSubject.isActivity ? 0 : (Number(row.coursework) || 0);
      let safeExam = selectedSubject.isActivity ? 0 : (Number(row.exam) || 0);
      let total = selectedSubject.isActivity ? 0 : Math.min(selectedSubject.totalScore, safeCw + safeExam);
      let gpa = selectedSubject.isActivity ? 0 : calculateThaiGrade(total);

      if (isKinderSubj) {
        const asgMap = row.assignmentScores || {};
        const vals = (kItems.length > 0 ? kItems.map(it => asgMap[it.id]) : Object.values(asgMap))
          .filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0);
        if (vals.length > 0) {
          const avg = vals.reduce((acc, v) => acc + v, 0) / vals.length;
          const level = Math.min(kMaxRubric, Math.max(1, Math.round(avg)));
          safeCw = level;
          safeExam = 0;
          total = level;
          gpa = level;
        } else {
          safeCw = 0;
          safeExam = 0;
          total = 0;
          gpa = 0;
        }
      }

      const recordSem: '1' | '2' = (selectedSubject.semester === '1' || selectedSubject.semester === '2')
        ? selectedSubject.semester
        : currentSemester;
      const recordYear = selectedSubject.academicYear || currentAcademicYear;

      return {
        id: `grd-${s.id}-${selectedSubject.id}-${recordSem}`,
        studentId: s.id,
        studentName: `${s.prefix}${s.firstName} ${s.lastName}`,
        gradeLevel: selectedSubject.gradeLevel,
        subjectId: selectedSubject.id,
        subjectCode: selectedSubject.code,
        subjectName: selectedSubject.name,
        semester: recordSem,
        academicYear: recordYear,
        assignmentScores: row.assignmentScores || {},
        courseworkScore: safeCw,
        examScore: safeExam,
        totalScore: total,
        gradeGpa: gpa,
        readingWritingScore: Number(row.readingWriting) || 3,
        desiredCharacteristicsScore: Number(row.characteristics) || 3,
        competencyScore: Number(row.competency) || 3,
        activityResult: row.activityResult || ''
      };
    });

    onSaveBulkGrades(recordsToSave);
    onShowToast('success', 'บันทึกคะแนนสำเร็จ', `บันทึกคะแนนภาคเรียนที่ ${currentSemester} ${selectedSubject.isActivity ? 'กิจกรรม' : 'รายวิชา'} ${selectedSubject.name} จำนวน ${recordsToSave.length} คน เรียบร้อย`);
  };

  // Teacher enroll in subject (Member registers per semester independently)
  // แยกจริงว่ารายวิชาไหนใครลงทะเบียนสอนคือภาคเรียนที่ 1 รายวิชาไหนใครลงทะเบียนสอนคือภาคเรียนที่ 2
  // เวลาถอนชื่อผู้สอน ไม่กระทบกับภาคเรียนอื่น เช่น ถอนชื่อภาคเรียนที่ 2 โดยให้อีกคนลงทะเบียนแทน ภาคเรียนที่ 1 ก็ยังเป็นชื่อเดิมไม่เปลี่ยน
  const handleTeacherEnrollSubject = (subject: Subject) => {
    if (isMemberLockedReadOnly) {
      onShowToast('warning', 'ภาคเรียนนี้ถูกล็อก 🔒', `ไม่สามารถลงทะเบียนได้เนื่องจากภาคเรียนที่ ${currentSemester} ถูกล็อกการกรอกคะแนนโดยผู้ดูแลระบบ`);
      return;
    }
    const defaultUnits = (subject.learningUnits && subject.learningUnits.length > 0) 
      ? subject.learningUnits 
      : [1];
    const defaultUnitDetails = (subject.learningUnitDetails && subject.learningUnitDetails.length > 0)
      ? subject.learningUnitDetails
      : [{ unitNumber: 1, name: 'หน่วยที่ 1', score: subject.courseworkScore || 70 }];

    const updatedSubject: Subject = {
      ...subject,
      teacherId: user.id,
      teacherName: user.fullName,
      learningUnits: defaultUnits,
      learningUnitDetails: defaultUnitDetails
    };

    onSaveSubject(updatedSubject);

    setSelectedSubjectId(updatedSubject.id);
    setActiveTab('grading');
    onShowToast(
      'success', 
      'ลงทะเบียนผู้สอนสำเร็จ 🎉', 
      `ลงทะเบียนเป็นผู้สอนวิชา ${subject.name} (ชั้น ${subject.gradeLevel} ห้อง ${normalizeRoom(subject.room)} ภาคเรียนที่ ${subject.semester || currentSemester}) เรียบร้อยแล้ว เริ่มบันทึกคะแนนได้ทันที`
    );
  };

  // Admin withdraw teacher enrollment (เฉพาะภาคเรียนที่เลือก ไม่กระทบภาคเรียนอื่นเด็ดขาด)
  const handleAdminWithdrawSubjectTeacher = (subject: Subject) => {
    if (user.role !== 'admin') {
      onShowToast('warning', 'ไม่มีสิทธิ์', 'เฉพาะ Admin เท่านั้นที่สามารถถอนชื่อผู้สอนได้');
      return;
    }
    const currentTeacher = subject.teacherName || 'ผู้สอน';
    const updated: Subject = {
      ...subject,
      teacherId: '',
      teacherName: ''
    };
    onSaveSubject(updated);

    // Switch to first remaining registered subject (sorted by grade) or empty
    const remainingRegistered = sortSubjectsByGrade(subjects.filter(s => 
      s.id !== subject.id &&
      isSubjectInYear(s, currentAcademicYear) &&
      (!s.semester || s.semester === currentSemester) &&
      Boolean(s.teacherId || s.teacherName)
    ));
    setSelectedSubjectId(remainingRegistered[0]?.id || '');
    onShowToast(
      'success', 
      'ถอนชื่อผู้สอนสำเร็จ', 
      `ถอนชื่อ ${currentTeacher} ออกจากวิชา ${subject.name} (เฉพาะภาคเรียนที่ ${subject.semester}) เรียบร้อยแล้ว (ภาคเรียนอื่นยังคงเดิมและคะแนนไม่สูญหาย)`
    );
  };


  // Copy Assignment Template from Previous Year (Member & Admin: บังคับคัดลอกเฉพาะภาคเรียนเดียวกันเท่านั้น)
  const handleOpenCopyAssignmentTemplateModal = () => {
    if (!selectedSubject) return;

    const targetSemester = selectedSubject.semester || currentSemester;
    
    // Filter matches that strictly match the CURRENT SEMESTER (ภาคเรียนเดียวกันเท่านั้น!)
    const matchesForSameSemester = subjects.filter(s => 
      s.id !== selectedSubject.id &&
      s.assignmentItems && s.assignmentItems.length > 0 &&
      (s.semester || '1') === targetSemester &&
      (
        s.code.trim().toLowerCase() === selectedSubject.code.trim().toLowerCase() ||
        (s.name.trim().toLowerCase() === selectedSubject.name.trim().toLowerCase() && s.gradeLevel === selectedSubject.gradeLevel)
      )
    );

    if (matchesForSameSemester.length === 0) {
      onShowToast(
        'info', 
        'ไม่พบตารางงานในภาคเรียนนี้', 
        `ไม่พบตารางหัวข้องานเดิมของวิชา ${selectedSubject.name} (${selectedSubject.code}) ในภาคเรียนที่ ${targetSemester} จากปีการศึกษาอื่น คุณสามารถกดปุ่ม "+ เพิ่มงาน" เพื่อสร้างหัวข้องานใหม่ได้ทันที`
      );
      return;
    }

    // Default source year to first match's academic year
    const defaultYear = matchesForSameSemester[0].academicYear || currentAcademicYear;
    setCopyTemplateSourceYear(defaultYear);
    setSelectedTemplateSubject(matchesForSameSemester[0]);
    setIsCopyAssignmentModalOpen(true);
  };

  const handleConfirmCopyAssignmentTemplate = () => {
    if (!selectedSubject || !selectedTemplateSubject || !selectedTemplateSubject.assignmentItems) return;

    const clonedItems: AssignmentItem[] = selectedTemplateSubject.assignmentItems.map((it, idx) => ({
      id: `asg-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: it.name,
      maxScore: it.maxScore || 5
    }));

    const updatedSub: Subject = {
      ...selectedSubject,
      assignmentItems: clonedItems
    };

    onSaveSubject(updatedSub);

    // Reset scores for this subject (คะแนนห้ามตามมาเด็ดขาด)
    setScoreRows(prev => {
      const next = { ...prev };
      gradeStudents.forEach(st => {
        const row = next[st.id] || {
          coursework: 0,
          exam: 0,
          readingWriting: 3,
          characteristics: 3,
          competency: 3,
          assignmentScores: {}
        };
        next[st.id] = {
          ...row,
          assignmentScores: {},
          coursework: 0
        };
      });
      autoSaveGrades(next);
      return next;
    });

    setIsCopyAssignmentModalOpen(false);
    onShowToast(
      'success', 
      'คัดลอกตารางงานสำเร็จ 🎉', 
      `นำตารางและหัวข้องานจำนวน ${clonedItems.length} ช่องจากปี ${selectedTemplateSubject.academicYear || 'ก่อนหน้า'} มาใช้เรียบร้อยแล้ว (คะแนนเริ่มต้นใหม่ทั้งหมด)`
    );
  };

  // Admin: เพิ่มปีการศึกษาถัดไป (สามารถคัดลอกรายวิชาปีการศึกษาก่อนหน้านี้ได้ โดยเพิ่มรายวิชาเท่านั้น คะแนนห้ามคัดลอกตามเด็ดขาด)
  const handleAddAcademicYear = () => {
    const trimmed = newYearInput.trim();
    if (!trimmed) {
      onShowToast('warning', 'กรุณาระบุปีการศึกษา', 'โปรดระบุปีการศึกษา เช่น 2569');
      return;
    }
    if (academicYears.includes(trimmed)) {
      onShowToast('warning', 'มีปีการศึกษานี้แล้ว', `ปีการศึกษา ${trimmed} มีอยู่ในระบบแล้ว`);
      return;
    }

    const updatedYears = [...academicYears, trimmed].sort((a, b) => Number(a) - Number(b));
    setAcademicYears(updatedYears);
    StorageService.saveAcademicYears(updatedYears);

    if (copyPreviousSubjects && sourceYearToCopy) {
      const sourceSubs = subjects.filter(s => isSubjectInYear(s, sourceYearToCopy));
      if (sourceSubs.length > 0) {
        const newSubjectsToCreate: Subject[] = sourceSubs.map((s, idx) => ({
          ...s,
          id: `sub-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          academicYear: trimmed,
          teacherId: '',
          teacherName: '',
          assignmentItems: s.assignmentItems ? s.assignmentItems.map(it => ({ ...it })) : [],
          kindergartenCompetencies: s.kindergartenCompetencies
            ? s.kindergartenCompetencies.map(c => ({ ...c, elements: [...c.elements] }))
            : undefined
        }));

        if (onSaveBulkSubjects) {
          onSaveBulkSubjects(newSubjectsToCreate);
        } else {
          newSubjectsToCreate.forEach(ns => onSaveSubject(ns));
        }
        onShowToast(
          'success', 
          `เพิ่มปีการศึกษา ${trimmed} สำเร็จ`, 
          `คัดลอกรายวิชาจากปี ${sourceYearToCopy} จำนวน ${newSubjectsToCreate.length} วิชาเรียบร้อย (คะแนนว่างเปล่า พร้อมให้สมาชิกลงทะเบียน)`
        );
      } else {
        onShowToast('success', `เพิ่มปีการศึกษา ${trimmed} สำเร็จ`, `สร้างปีการศึกษา ${trimmed} เรียบร้อยแล้ว`);
      }
    } else {
      onShowToast('success', `เพิ่มปีการศึกษา ${trimmed} สำเร็จ`, `สร้างปีการศึกษา ${trimmed} เรียบร้อยแล้ว`);
    }

    setSelectedAcademicYear(trimmed);
    setIsAddYearModalOpen(false);
    setNewYearInput('');
  };

  // Admin: ลบปีการศึกษา และยืนยันด้วยรหัส Admin
  const handleDeleteAcademicYearConfirm = () => {
    if (!deletingYear) return;
    if (user.role !== 'admin') {
      onShowToast('error', 'ไม่มีสิทธิ์', 'เฉพาะ Admin เท่านั้นที่สามารถลบปีการศึกษาได้');
      return;
    }

    const currentAdmin = allMembers.find(m => m.role === 'admin');
    const inputPass = adminPasswordInput.trim();
    const validPasswords = ['123456', 'admin', 'admin123', '1234'];
    if (currentAdmin && currentAdmin.password) {
      validPasswords.push(currentAdmin.password);
    }

    if (!validPasswords.includes(inputPass)) {
      onShowToast('error', 'รหัสผ่าน Admin ไม่ถูกต้อง', 'กรุณาระบุรหัสผ่าน Admin ให้ถูกต้องเพื่อยืนยันการลบ');
      return;
    }

    const res = StorageService.deleteAcademicYear(deletingYear);
    setAcademicYears(res.years);
    if (onUpdateSubjectsList) {
      onUpdateSubjectsList(res.subjects);
    }

    const nextActiveYear = res.years[res.years.length - 1] || '2568';
    if (currentAcademicYear === deletingYear) {
      setSelectedAcademicYear(nextActiveYear);
    }

    onShowToast('success', 'ลบปีการศึกษาสำเร็จ', `ลบปีการศึกษา ${deletingYear} และรายวิชาที่เกี่ยวข้องเรียบร้อยแล้ว`);
    setDeletingYear(null);
    setAdminPasswordInput('');
  };

  // รายวิชาที่แสดงใน Pop-up คัดลอกวิชา ตามปีการศึกษา ภาคเรียน และระดับชั้น (อ.1 - ม.3) ที่เลือก
  const copyableSourceSubjects = useMemo(() => {
    const filtered = subjects.filter(s => {
      if (!isSubjectInYear(s, copyModalSourceYear)) return false;
      const sSem = s.semester || '1';
      if (copyModalSourceSemester !== 'all' && sSem !== copyModalSourceSemester) return false;
      if (copyModalSourceGrade !== 'all' && s.gradeLevel !== copyModalSourceGrade) return false;
      return MODAL_ALLOWED_GRADES.includes(s.gradeLevel as GradeLevel);
    });
    return sortSubjectsByGrade(filtered);
  }, [subjects, copyModalSourceYear, copyModalSourceSemester, copyModalSourceGrade]);

  React.useEffect(() => {
    if (isCopySubjectsModalOpen) {
      setSelectedCopySubjectIds(copyableSourceSubjects.map(s => s.id));
    }
  }, [isCopySubjectsModalOpen, copyModalSourceYear, copyModalSourceSemester, copyModalSourceGrade]);

  // Admin: คัดลอกรายวิชาที่เลือก หรือคัดลอกทั้งหมด มายังปีการศึกษา ภาคเรียน และห้องเรียนปัจจุบัน
  const handleCopySubjectsFromSourceYear = (mode: 'selected' | 'all' = 'selected') => {
    const targetList =
      mode === 'all'
        ? copyableSourceSubjects
        : copyableSourceSubjects.filter(s => selectedCopySubjectIds.includes(s.id));

    if (targetList.length === 0) {
      onShowToast('warning', 'ยังไม่ได้เลือกรายวิชา', 'กรุณาเลือกรายวิชาที่ต้องการคัดลอกอย่างน้อย 1 วิชา');
      return;
    }

    const targetRoom = normalizeRoom(copyModalTargetRoom || selectedSubjectRoomFilter || '1');
    const existingSubjectsInCurrentYear = subjects.filter(s => isSubjectInYear(s, currentAcademicYear));
    const existingComboMap = new Map<string, Subject>();
    existingSubjectsInCurrentYear.forEach(s => {
      const key = `${(s.code || '').trim().toUpperCase()}_${(s.name || '').trim()}_${s.gradeLevel}_${normalizeRoom(s.room)}_${s.semester || '1'}`;
      existingComboMap.set(key, s);
    });

    const baseTs = Date.now();
    const subjectsToSave: Subject[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    targetList.forEach((s, idx) => {
      const targetSemester: '1' | '2' =
        copyModalSourceSemester === 'all' ? ((s.semester === '2' ? '2' : '1')) : currentSemester;
      const comboKey = `${(s.code || '').trim().toUpperCase()}_${(s.name || '').trim()}_${s.gradeLevel}_${targetRoom}_${targetSemester}`;
      const existingMatch = existingComboMap.get(comboKey);

      if (existingMatch) {
        // หากเป็นวิชาใบเดียวกันเองในเทอม ห้อง และปีเดียวกัน ไม่ต้องสร้างซ้ำแต่บันทึกอัปเดตโครงสร้าง
        const updatedSub: Subject = {
          ...existingMatch,
          code: s.code,
          name: s.name,
          gradeLevel: s.gradeLevel,
          room: targetRoom,
          hoursPerWeek: s.hoursPerWeek,
          totalScore: s.totalScore,
          courseworkScore: s.courseworkScore,
          examScore: s.examScore,
          isActivity: s.isActivity,
          subtopics: s.subtopics ? [...s.subtopics] : existingMatch.subtopics,
          kindergartenCompetencies: s.kindergartenCompetencies
            ? s.kindergartenCompetencies.map(c => ({ ...c, elements: [...c.elements] }))
            : existingMatch.kindergartenCompetencies,
          hasKindergartenCompetency: s.hasKindergartenCompetency ?? existingMatch.hasKindergartenCompetency,
          rubricLevels: s.rubricLevels ? [...s.rubricLevels] : existingMatch.rubricLevels,
          rubricMaxLevel: s.rubricMaxLevel ?? existingMatch.rubricMaxLevel,
          learningUnits: s.learningUnits ? [...s.learningUnits] : existingMatch.learningUnits,
          learningUnitDetails: s.learningUnitDetails ? s.learningUnitDetails.map(d => ({ ...d })) : existingMatch.learningUnitDetails
        };
        subjectsToSave.push(updatedSub);
        updatedCount++;
      } else {
        const cloned: Subject = {
          ...s,
          id: `${s.isActivity ? 'act' : 'sub'}-${baseTs}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          room: targetRoom,
          academicYear: currentAcademicYear,
          semester: targetSemester,
          teacherId: '',
          teacherName: '',
          hasKindergartenCompetency: s.hasKindergartenCompetency,
          kindergartenCompetencies: s.kindergartenCompetencies
            ? s.kindergartenCompetencies.map(c => ({ ...c, elements: [...c.elements] }))
            : undefined,
          assignmentItems: s.assignmentItems
            ? s.assignmentItems.map((it, aIdx) => ({
                ...it,
                id: `asg-${baseTs}-${idx}-${aIdx}`
              }))
            : []
        };
        existingComboMap.set(comboKey, cloned);
        subjectsToSave.push(cloned);
        createdCount++;
      }
    });

    if (onSaveBulkSubjects) {
      onSaveBulkSubjects(subjectsToSave);
    } else {
      subjectsToSave.forEach(ns => onSaveSubject(ns));
    }

    setSelectedSubjectRoomFilter(targetRoom);
    onShowToast(
      'success',
      'คัดลอกรายวิชาสำเร็จ 🎉',
      `คัดลอกรายวิชามายังปีการศึกษา ${currentAcademicYear} ภาคเรียนที่ ${currentSemester} (ห้อง ${targetRoom}) จำนวน ${subjectsToSave.length} วิชาเรียบร้อยแล้ว${createdCount > 0 && updatedCount > 0 ? ` (เพิ่มใหม่ ${createdCount} วิชา, อัปเดต ${updatedCount} วิชา)` : ''}`
    );
    setIsCopySubjectsModalOpen(false);
  };

  // Handle Save Subject or Activity (Admin เพิ่มรายวิชา/กิจกรรมได้)
  const handleSaveSubjectSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (user.role !== 'admin') {
      onShowToast('warning', 'ไม่มีสิทธิ์', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่กำหนดโครงสร้างวิชา');
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const isActivityMode = modalItemType === 'activity';
    const gradeLevel = (formData.get('gradeLevel') as GradeLevel) || modalGradeLevel;
    const isPrimary = gradeLevel.startsWith('ป.');
    const fullScore = isActivityMode ? 0 : Number(formData.get('totalScore') || (isPrimary ? 50 : 100));
    const coursework = isActivityMode ? 0 : Number(formData.get('courseworkScore') || (isPrimary ? 35 : 70));
    const exam = isActivityMode ? 0 : Number(formData.get('examScore') || (isPrimary ? 15 : 30));
    const semChoice = formData.get('semester') as string;
    const isKindergarten = !isActivityMode && isKindergartenGrade(gradeLevel);
    const codeVal = String(formData.get('code') || '').trim();
    const nameVal = String(formData.get('name') || subjectNameInput || '').trim();
    const roomVal = normalizeRoom(String(formData.get('room') || modalRoom || '1'));

    let cleanedSubtopics: string[] = [];
    let cleanedCompetencies: KindergartenCompetency[] = [];
    let rubricLevelsToSave: RubricLevel[] = [];
    let rubricMax = 3;

    if (isKindergarten) {
      if (!hasKindergartenCompetency) {
        // โหมด OFF (ไม่มีสมรรถนะ มีเฉพาะ องค์ประกอบ/ประเด็น ของด้านความสามารถ)
        const cleanElements = (kindergartenDirectElements || [])
          .map(el => (el || '').trim())
          .filter(Boolean);
        const finalElements = cleanElements.length > 0 ? cleanElements : ['องค์ประกอบ/ประเด็น 1'];
        cleanedCompetencies = [
          {
            id: editingSubject?.kindergartenCompetencies?.[0]?.id || `comp-${Date.now()}-1`,
            title: '',
            elements: finalElements
          }
        ];
        cleanedSubtopics = [nameVal || 'ด้านความสามารถ'];
      } else {
        // โหมด ON (มีสมรรถนะ 1, 2... และมี องค์ประกอบ/ประเด็น อยู่ใต้สมรรถนะ)
        const rawCompetencies =
          kindergartenCompetencies.length > 0
            ? kindergartenCompetencies
            : [{ id: `comp-${Date.now()}-1`, title: '', elements: [''] }];

        cleanedCompetencies = rawCompetencies.map((comp, cIdx) => {
          const cleanTitle = (comp.title || '').trim();
          const cleanElements = (comp.elements || [])
            .map(el => (el || '').trim())
            .filter(Boolean);
          return {
            id: comp.id || `comp-${Date.now()}-${cIdx + 1}`,
            title: cleanTitle,
            elements: cleanElements.length > 0 ? cleanElements : ['องค์ประกอบ/ประเด็น 1']
          };
        });

        if (cleanedCompetencies.length === 0) {
          cleanedCompetencies = [
            {
              id: `comp-${Date.now()}-1`,
              title: '',
              elements: ['องค์ประกอบ/ประเด็น 1']
            }
          ];
        }

        cleanedSubtopics = cleanedCompetencies.map((c, idx) =>
          c.title ? `สมรรถนะที่ ${idx + 1}: ${c.title}` : `สมรรถนะที่ ${idx + 1}`
        );
      }

      rubricMax = kindergartenRubricCount;
      rubricLevelsToSave = kindergartenRubricLevels.slice(0, rubricMax);
    }

    const unitNums = isActivityMode
      ? []
      : isKindergarten
      ? cleanedCompetencies.map((_, i) => i + 1)
      : (subjectUnitDetails.length > 0
          ? subjectUnitDetails.map(u => u.unitNumber)
          : (editingSubject?.learningUnits && editingSubject.learningUnits.length > 0 ? editingSubject.learningUnits : [1]));

    const unitDetails = isActivityMode
      ? []
      : isKindergarten
      ? cleanedCompetencies.map((c, idx) => ({
          unitNumber: idx + 1,
          name: cleanedSubtopics[idx],
          score: rubricMax,
          standard: !hasKindergartenCompetency ? (nameVal || 'ด้านความสามารถ') : (c.title || `สมรรถนะที่ ${idx + 1}`),
          indicator: c.elements.map((el, eIdx) => `องค์ประกอบ/ประเด็น ${eIdx + 1}: ${el}`).join(', ')
        }))
      : subjectUnitDetails.map(u => ({
          unitNumber: u.unitNumber,
          name: u.name.trim(),
          score: typeof u.score === 'number' ? u.score : (Number(u.score) || 0)
        }));

    // Generate or update initial assignments based on unit details or kindergarten competencies & elements
    let initialAssignments: AssignmentItem[] = isActivityMode
      ? []
      : (editingSubject?.assignmentItems ? [...editingSubject.assignmentItems] : []);

    if (!isActivityMode) {
      if (isKindergarten) {
        const nextKindergartenItems: AssignmentItem[] = [];
        const baseTs = Date.now();
        cleanedCompetencies.forEach((comp, cIdx) => {
          const unitNum = cIdx + 1;
          const existingForUnit = (editingSubject?.assignmentItems || []).filter(
            a => a.unitNumber === unitNum
          );
          comp.elements.forEach((elName, eIdx) => {
            const existingItem = existingForUnit[eIdx];
            nextKindergartenItems.push({
              id: existingItem ? existingItem.id : `asg-k-${baseTs}-${unitNum}-${eIdx + 1}`,
              name: elName || `องค์ประกอบ/ประเด็น ${eIdx + 1}`,
              unitNumber: unitNum,
              maxScore: rubricMax
            });
          });
        });
        initialAssignments = nextKindergartenItems;
      } else if (!editingSubject && unitDetails.length > 0) {
        initialAssignments = unitDetails.map((ud) => ({
          id: `asg-${Date.now()}-${ud.unitNumber}`,
          name: ud.name ? ud.name : `หน่วยที่ ${ud.unitNumber}`,
          maxScore: ud.score > 0 ? ud.score : 5,
          unitNumber: ud.unitNumber
        }));
      } else if (editingSubject && unitDetails.length > 0) {
        const existing = [...(editingSubject.assignmentItems || [])];
        unitDetails.forEach(ud => {
          const found = existing.find(a => a.unitNumber === ud.unitNumber);
          if (found) {
            if (ud.name) found.name = ud.name;
            if (ud.score > 0) found.maxScore = ud.score;
          } else {
            existing.push({
              id: `asg-${Date.now()}-${ud.unitNumber}`,
              name: ud.name ? ud.name : `หน่วยที่ ${ud.unitNumber}`,
              maxScore: ud.score > 0 ? ud.score : 5,
              unitNumber: ud.unitNumber
            });
          }
        });
        initialAssignments = existing;
      }
    }

    // Ensure grade & room filter shows the newly created/edited subject's grade level and room
    const matchesFilter =
      (selectedGradeFilter === 'มัธยม' && gradeLevel.startsWith('ม.')) ||
      (selectedGradeFilter === 'อนุบาล' && gradeLevel.startsWith('อ.')) ||
      selectedGradeFilter === gradeLevel;
    if (!matchesFilter) {
      setSelectedGradeFilter(gradeLevel);
    }
    setSelectedSubjectRoomFilter(roomVal);

    const defaultHours = isActivityMode ? 1 : 2;

    // Calculate default sortOrder at the end of the grade/room list when adding a new subject
    const existingInGradeRoom = yearSubjects.filter(
      s => s.gradeLevel === gradeLevel && normalizeRoom(s.room) === roomVal
    );
    const maxExistingOrder = existingInGradeRoom.reduce(
      (max, s, idx) => Math.max(max, typeof s.sortOrder === 'number' ? s.sortOrder : idx + 1),
      0
    );
    const nextSortOrder = editingSubject?.sortOrder ?? (maxExistingOrder + 1);

    if (semChoice === 'both' && !editingSubject) {
      const baseTs = Date.now();
      const sub1: Subject = {
        id: `${isActivityMode ? 'act' : 'sub'}-${baseTs}-sem1`,
        code: codeVal,
        name: nameVal,
        gradeLevel: gradeLevel,
        room: roomVal,
        hoursPerWeek: Number(formData.get('hoursPerWeek') || defaultHours),
        semester: '1',
        academicYear: currentAcademicYear,
        totalScore: isActivityMode ? 0 : (isKindergarten ? 100 : fullScore),
        courseworkScore: isActivityMode ? 0 : (isKindergarten ? 70 : coursework),
        examScore: isActivityMode ? 0 : (isKindergarten ? 30 : exam),
        teacherId: '',
        teacherName: '',
        assignmentItems: initialAssignments,
        learningUnits: unitNums,
        learningUnitDetails: unitDetails,
        subtopics: isKindergarten ? cleanedSubtopics : undefined,
        kindergartenCompetencies: isKindergarten ? cleanedCompetencies : undefined,
        hasKindergartenCompetency: isKindergarten ? hasKindergartenCompetency : undefined,
        rubricLevels: isKindergarten ? rubricLevelsToSave : undefined,
        rubricMaxLevel: isKindergarten ? rubricMax : undefined,
        isActivity: isActivityMode,
        sortOrder: nextSortOrder
      };
      const sub2: Subject = {
        id: `${isActivityMode ? 'act' : 'sub'}-${baseTs}-sem2`,
        code: codeVal,
        name: nameVal,
        gradeLevel: gradeLevel,
        room: roomVal,
        hoursPerWeek: Number(formData.get('hoursPerWeek') || defaultHours),
        semester: '2',
        academicYear: currentAcademicYear,
        totalScore: isActivityMode ? 0 : (isKindergarten ? 100 : fullScore),
        courseworkScore: isActivityMode ? 0 : (isKindergarten ? 70 : coursework),
        examScore: isActivityMode ? 0 : (isKindergarten ? 30 : exam),
        teacherId: '',
        teacherName: '',
        assignmentItems: initialAssignments.map(a => ({ ...a, id: `${a.id}-sem2` })),
        learningUnits: unitNums,
        learningUnitDetails: unitDetails,
        subtopics: isKindergarten ? cleanedSubtopics : undefined,
        kindergartenCompetencies: isKindergarten
          ? cleanedCompetencies.map(c => ({ ...c, id: `${c.id}-sem2`, elements: [...c.elements] }))
          : undefined,
        hasKindergartenCompetency: isKindergarten ? hasKindergartenCompetency : undefined,
        rubricLevels: isKindergarten ? rubricLevelsToSave : undefined,
        rubricMaxLevel: isKindergarten ? rubricMax : undefined,
        isActivity: isActivityMode,
        sortOrder: nextSortOrder
      };
      if (onSaveBulkSubjects) {
        onSaveBulkSubjects([sub1, sub2]);
      } else {
        onSaveSubject(sub1);
        onSaveSubject(sub2);
      }
      setSelectedSubjectId(currentSemester === '2' ? sub2.id : sub1.id);
      setIsSubjectModalOpen(false);
      setEditingSubject(null);
      setSubjectUnitCountInput('');
      setSubjectUnitDetails([]);
      setHasKindergartenCompetency(true);
      setKindergartenDirectElements(['']);
      setKindergartenSubtopics(['']);
      setKindergartenCompetencies([{ id: `comp-${Date.now()}-1`, title: '', elements: [''] }]);
      setKindergartenRubricLevels(DEFAULT_KINDERGARTEN_RUBRIC_LEVELS);
      setKindergartenRubricCount(3);
      onShowToast(
        'success',
        isActivityMode ? 'บันทึกกิจกรรมสำเร็จ' : 'บันทึกวิชาสำเร็จ',
        `บันทึก${isActivityMode ? 'กิจกรรม' : (isKindergarten ? 'ด้านความสามารถ' : 'โครงสร้างรายวิชา')} ${sub1.code ? sub1.code + ' ' : ''}${sub1.name} (ชั้น ${gradeLevel} ห้อง ${roomVal} ทั้งเทอม 1 และเทอม 2) เรียบร้อยแล้ว`
      );
      return;
    }

    const sem = (semChoice as '1' | '2') || currentSemester;
    const newSub: Subject = {
      id: editingSubject ? editingSubject.id : `${isActivityMode ? 'act' : 'sub'}-` + Date.now(),
      code: codeVal,
      name: nameVal,
      gradeLevel: gradeLevel,
      room: roomVal,
      hoursPerWeek: Number(formData.get('hoursPerWeek') || defaultHours),
      semester: sem,
      academicYear: editingSubject?.academicYear || currentAcademicYear,
      totalScore: isActivityMode ? 0 : (isKindergarten ? 100 : fullScore),
      courseworkScore: isActivityMode ? 0 : (isKindergarten ? 70 : coursework),
      examScore: isActivityMode ? 0 : (isKindergarten ? 30 : exam),
      teacherId: editingSubject?.teacherId || '',
      teacherName: editingSubject?.teacherName || '',
      assignmentItems: initialAssignments,
      learningUnits: unitNums,
      learningUnitDetails: unitDetails,
      subtopics: isKindergarten ? cleanedSubtopics : undefined,
      kindergartenCompetencies: isKindergarten ? cleanedCompetencies : undefined,
      hasKindergartenCompetency: isKindergarten ? hasKindergartenCompetency : undefined,
      rubricLevels: isKindergarten ? rubricLevelsToSave : undefined,
      rubricMaxLevel: isKindergarten ? rubricMax : undefined,
      isActivity: isActivityMode,
      sortOrder: nextSortOrder
    };

    onSaveSubject(newSub);
    setSelectedSubjectId(newSub.id);
    if (sem !== currentSemester) {
      if (onSemesterChange) onSemesterChange(sem as '1' | '2');
    }
    setIsSubjectModalOpen(false);
    setEditingSubject(null);
    setSubjectUnitCountInput('');
    setSubjectUnitDetails([]);
    setHasKindergartenCompetency(true);
    setKindergartenDirectElements(['']);
    setKindergartenSubtopics(['']);
    setKindergartenCompetencies([{ id: `comp-${Date.now()}-1`, title: '', elements: [''] }]);
    setKindergartenRubricLevels(DEFAULT_KINDERGARTEN_RUBRIC_LEVELS);
    setKindergartenRubricCount(3);
    onShowToast(
      'success',
      isActivityMode ? 'บันทึกกิจกรรมสำเร็จ' : 'บันทึกวิชาสำเร็จ',
      `บันทึก${isActivityMode ? 'กิจกรรม' : (isKindergarten ? 'ด้านความสามารถ' : 'โครงสร้างรายวิชา')} ${newSub.code ? newSub.code + ' ' : ''}${newSub.name} (ชั้น ${gradeLevel} ห้อง ${roomVal} ภาคเรียนที่ ${sem}) เรียบร้อยแล้ว`
    );
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Top Header: Tabs on left, Year & Semester adjacent, ลบAll, Lock icon aligned cleanly */}
      <div className="bg-amber-50/80 p-2.5 sm:p-3 rounded-2xl border border-amber-200/90 shadow-xs">
        {/* Mobile: 2x2 Grid for คะแนน, ประเมิน 3 เล่ม, ปีการศึกษา, ภาค */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          {/* 1. คะแนน */}
          <button
            type="button"
            onClick={() => setActiveTab('grading')}
            className={`w-full h-10 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              activeTab === 'grading'
                ? 'bg-amber-600 text-white'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-amber-200/80'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span className="truncate">คะแนน</span>
          </button>

          {/* 2. ประเมิน 3 เล่ม */}
          <button
            type="button"
            onClick={() => setActiveTab('assessments')}
            className={`w-full h-10 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              activeTab === 'assessments'
                ? 'bg-amber-600 text-white'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-amber-200/80'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">ประเมิน 3 เล่ม</span>
          </button>

          {/* ปีการศึกษา & ภาคเรียน (เฉพาะ Admin) */}
          {user.role === 'admin' && (
            <>
              <select
                value={selectedAcademicYear}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'add_new') {
                    setSourceYearToCopy(currentAcademicYear);
                    setIsAddYearModalOpen(true);
                  } else {
                    setSelectedAcademicYear(val);
                  }
                }}
                className="w-full h-10 px-3 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
              >
                {academicYears.map(yr => (
                  <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                ))}
                <option value="add_new">+ เพิ่มปีการศึกษา...</option>
              </select>

              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value as '1' | '2')}
                className="w-full h-10 px-3 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
              >
                <option value="1">ภาคเรียนที่ 1</option>
                <option value="2">ภาคเรียนที่ 2</option>
              </select>
            </>
          )}
        </div>

        {/* Mobile Extra Controls Row (รายวิชา / ลบAll / ล็อก - แสดงเมื่อเป็น Admin หรือ ล็อกภาคเรียน) */}
        {(user.role === 'admin' || isCurrentSemLocked) && (
          <div className="flex sm:hidden items-center justify-between pt-2 mt-2 border-t border-amber-200/60 gap-2">
            {user.role === 'admin' ? (
              <button
                type="button"
                onClick={() => setActiveTab('subjects')}
                className={`flex-1 h-9 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  activeTab === 'subjects'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-700 bg-white border border-amber-200/80'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>รายวิชา</span>
              </button>
            ) : (
              <div className="hidden sm:block text-[11px] font-bold text-slate-600">
                สถานะ: {user.fullName || 'สมาชิก'}
              </div>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              {user.role === 'admin' && academicYears.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setDeletingYear(currentAcademicYear);
                    setAdminPasswordInput('');
                  }}
                  className="h-9 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1 text-xs font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>ลบAll</span>
                </button>
              )}

              {user.role === 'admin' ? (
                <button
                  type="button"
                  onClick={handleToggleLockCurrentSemester}
                  className={`h-9 px-3 rounded-xl border transition-all cursor-pointer shadow-xs flex items-center gap-1 text-xs font-bold ${
                    isCurrentSemLocked
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-white text-slate-700 border-slate-200/90'
                  }`}
                >
                  {isCurrentSemLocked ? null : <Unlock className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{isCurrentSemLocked ? 'ล็อก' : 'ปกติ'}</span>
                </button>
              ) : (
                isCurrentSemLocked && (
                  <div className="h-9 px-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 shadow-xs flex items-center gap-1 text-xs font-bold">
                    <span>ล็อก</span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Desktop Header Layout (hidden on mobile, visible on sm+) */}
        <div className="hidden sm:flex sm:items-center justify-between gap-3">
          {/* Tabs Row: คะแนน / ประเมิน 3 เล่ม / รายวิชา */}
          <div className={`grid ${user.role === 'admin' ? 'grid-cols-3' : 'grid-cols-2'} sm:flex sm:items-center gap-1.5`}>
            {/* Tab 1: คะแนน */}
            <button
              type="button"
              onClick={() => setActiveTab('grading')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'grading'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200/80'
              }`}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">คะแนน</span>
            </button>

            {/* Tab 2: ประเมิน 3 เล่ม */}
            <button
              type="button"
              onClick={() => setActiveTab('assessments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'assessments'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200/80'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap truncate">ประเมิน 3 เล่ม</span>
            </button>

            {/* Tab 3: รายวิชา (เฉพาะ Admin เท่านั้น) */}
            {user.role === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('subjects')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'subjects'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200/80'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">รายวิชา</span>
              </button>
            )}
          </div>

          {/* Right side controls: ปีการศึกษา & ภาค อยู่ติดกัน -> ลบAll -> ล็อก */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {user.role === 'admin' ? (
              <>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'add_new') {
                      setSourceYearToCopy(currentAcademicYear);
                      setIsAddYearModalOpen(true);
                    } else {
                      setSelectedAcademicYear(val);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
                >
                  {academicYears.map(yr => (
                    <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                  ))}
                  <option value="add_new">+ เพิ่มปีการศึกษา...</option>
                </select>

                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value as '1' | '2')}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold outline-none cursor-pointer shadow-2xs transition-colors"
                >
                  <option value="1">ภาคเรียนที่ 1</option>
                  <option value="2">ภาคเรียนที่ 2</option>
                </select>
              </>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold whitespace-nowrap">
                ภาคเรียนที่ {currentSemester} • ปีการศึกษา {currentAcademicYear}
              </div>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              {/* ปุ่มลบปีการศึกษา (เปลี่ยนชื่อเป็น ลบAll) */}
              {user.role === 'admin' && academicYears.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setDeletingYear(currentAcademicYear);
                    setAdminPasswordInput('');
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1 text-xs font-bold active:scale-95"
                  title={`ลบปีการศึกษา ${currentAcademicYear}`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>ลบAll</span>
                </button>
              )}

              {/* ปุ่มล็อกภาคเรียน */}
              {user.role === 'admin' ? (
                <button
                  type="button"
                  onClick={handleToggleLockCurrentSemester}
                  className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 flex items-center gap-1 ${
                    isCurrentSemLocked
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 ring-2 ring-rose-200/60'
                      : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/90'
                  }`}
                  title={isCurrentSemLocked ? `ปลดล็อกภาคเรียนที่ ${currentSemester}` : `ล็อกภาคเรียนที่ ${currentSemester}`}
                >
                  {isCurrentSemLocked ? (
                    <span className="text-[11px] font-bold text-rose-700 px-1">ล็อก</span>
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </button>
              ) : (
                isCurrentSemLocked && (
                  <div className="p-1.5 sm:p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs shrink-0 text-xs font-bold" title="ภาคเรียนนี้ถูกล็อก (ปิดรับการกรอกคะแนน)">
                    <span>ล็อก</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: GRADING MATRIX */}
      {activeTab === 'grading' && (
        <div className="space-y-4">
          {/* Banner แจ้งเตือนเมื่อภาคเรียนถูกล็อกการกรอกคะแนน */}
          {isCurrentSemLocked && (
            <div className="bg-amber-50/90 border border-amber-200/90 text-amber-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-amber-950 flex items-center gap-2">
                    <span>ภาคเรียนที่ {currentSemester} ปีการศึกษา {currentAcademicYear} ถูกล็อกการกรอกคะแนน</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-bold text-[10px]">LOCKED</span>
                  </div>
                  <div className="text-amber-800 text-[11px] mt-0.5">
                    {user.role === 'admin'
                      ? 'ผู้ดูแลระบบได้ล็อกภาคเรียนนี้ไว้เพื่อป้องกันไม่ให้สมาชิกกรอกหรือแก้ไขคะแนนผิดภาคเรียน (Admin สามารถกดปลดล็อกได้ตลอดเวลา)'
                      : 'ผู้ดูแลระบบ (Admin) ได้ล็อกภาคเรียนนี้ไว้เพื่อป้องกันการกรอกคะแนนผิดภาคเรียน (เปิดให้ดูคะแนนได้เท่านั้น ไม่สามารถแก้ไขหรือบันทึกได้)'}
                  </div>
                </div>
              </div>
              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={handleToggleLockCurrentSemester}
                  className="shrink-0 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <Unlock className="w-3.5 h-3.5 text-rose-600" />
                  <span>ปลดล็อกภาค {currentSemester}</span>
                </button>
              )}
            </div>
          )}
          {/* Subject Selector Bar */}
          <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1 sm:gap-1.5 shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">รายวิชา (ภาค {currentSemester}):</span>
                <span className="sm:hidden">วิชา:</span>
              </label>

              {user.role === 'admin' && registeredHomeroomGrades.length > 0 && (
                <>
                  <select
                    value={adminGradeFilter}
                    onChange={(e) => setAdminGradeFilter(e.target.value)}
                    className="text-xs px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl border border-indigo-200 bg-indigo-50/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900 cursor-pointer shadow-2xs shrink-0"
                  >
                    {registeredHomeroomGrades.map((g) => (
                      <option key={g} value={g}>
                        ชั้น {g}
                      </option>
                    ))}
                  </select>
                  {adminAvailableRooms.length > 1 && (
                    <select
                      value={adminRoomFilter}
                      onChange={(e) => setAdminRoomFilter(e.target.value)}
                      className="text-xs px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl border border-amber-200 bg-amber-50/80 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-amber-900 cursor-pointer shadow-2xs shrink-0"
                    >
                      {adminAvailableRooms.map((rm) => (
                        <option key={rm} value={rm}>
                          ห้อง {rm}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}

              {/* Subject Dropdown: ปรับให้เต็มความกว้างพอดีหน้าจอบน Mobile ไม่ยาวล้น */}
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="text-xs px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800 bg-white flex-1 min-w-0 truncate cursor-pointer shadow-2xs"
              >
                {user.role === 'admin' ? (
                  <>
                    {adminGradeSubjects.length > 0 ? (
                      adminGradeSubjects.map(sub => (
                        <option key={sub.id} value={sub.id}>
                          [ห้อง {normalizeRoom(sub.room)}] {sub.isActivity ? `[กิจกรรม] ${sub.name}` : sub.name} — {sub.teacherName || 'ผู้สอน'}
                        </option>
                      ))
                    ) : (
                      <option value="">-- ไม่พบรายวิชาในชั้น {adminGradeFilter} ห้อง {adminRoomFilter} --</option>
                    )}
                  </>
                ) : (
                  <>
                    {sortedMyRegisteredSubjects.length > 0 ? (
                      <optgroup label={`รายวิชา/กิจกรรมที่คุณลงทะเบียนสอน (ภาค ${currentSemester})`}>
                        {sortedMyRegisteredSubjects.map(sub => (
                          <option key={sub.id} value={sub.id}>
                            ชั้น {sub.gradeLevel} (ห้อง {normalizeRoom(sub.room)}) : {sub.isActivity ? `[กิจกรรม] ${sub.name}` : sub.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : (
                      <option value="">-- คุณยังไม่มีรายวิชาที่ลงทะเบียน (เลือกลงทะเบียนด้านล่าง) --</option>
                    )}
                  </>
                )}
              </select>
            </div>

            {/* ปุ่ม ชั่วโมงสอน ตรงบรรทัดเดียวกับรายวิชาที่เลือกแต่ให้อยู่ฝั่งขวาสุด */}
            <button
              type="button"
              onClick={() => {
                if (!selectedSubject) {
                  onShowToast('warning', 'กรุณาเลือกรายวิชา', 'กรุณาเลือกรายวิชาที่ต้องการก่อนเปิดกำหนดตารางชั่วโมงสอน');
                  return;
                }
                setIsTeachingScheduleModalOpen(true);
              }}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
              title="กำหนดตารางชั่วโมงสอน และดึงข้อมูลการมาเรียนจากครูประจำชั้น"
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>ชั่วโมงสอน</span>
            </button>
          </div>

          {/* If No Subject Selected */}
          {!selectedSubject ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl text-amber-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {user.role === 'admin' 
                  ? `ยังไม่มีสมาชิกลงทะเบียนรายวิชาในภาคเรียนที่ ${currentSemester}`
                  : `คุณยังไม่ได้ลงทะเบียนรายวิชาสอนในภาคเรียนที่ ${currentSemester}`}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {user.role === 'admin'
                  ? `สมาชิกจะลงทะเบียนรายวิชาที่รับผิดชอบสอน เมื่อลงทะเบียนแล้วจะปรากฏรายชื่อให้ตรวจสอบ`
                  : `กรุณาเลือกลงทะเบียนรายวิชาสอนจากรายการด้านล่าง เพื่อเริ่มบันทึกคะแนน`}
              </p>
            </div>
          ) : (
            /* Matrix Table */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="py-2 px-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
                <div className="sm:space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                      {isSelectedSubjectActivity && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold">
                          กิจกรรม
                        </span>
                      )}
                      <span>ชั้น {selectedSubject?.gradeLevel} {selectedSubject?.name} ({selectedSubject?.code})</span>
                      {/* ไอคอนคัดลอกตาราง ให้อยู่ด้านหลัง ชื่อวิชา จะได้ประหยัดหน้า */}
                      {!isAdminReadOnly && !isSelectedSubjectActivity && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!canGradeSubject) {
                              onShowToast('warning', 'ต้องลงทะเบียนก่อน', 'สมาชิกต้องลงทะเบียนรายวิชานี้ก่อนจึงจะสามารถคัดลอกตารางงานได้');
                              return;
                            }
                            handleOpenCopyAssignmentTemplateModal();
                          }}
                          disabled={!canGradeSubject}
                          className={`p-1.5 text-xs font-semibold rounded-lg border transition-all inline-flex items-center justify-center ${
                            canGradeSubject 
                              ? 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border-slate-200 shadow-2xs active:scale-95 cursor-pointer' 
                              : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          }`}
                          title="คัดลอกตารางจากปีก่อน"
                        >
                          <Copy className="w-3.5 h-3.5 text-amber-600" />
                        </button>
                      )}

                      {/* ปุ่มสรุป และ ปุ่มให้คะแนน อยู่บรรทัดเดียวกัน (สำหรับ อ.1, อ.2, อ.3) */}
                      {isSelectedSubjectKindergarten && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setKindergartenViewMode(kindergartenViewMode === 'inlineSummary' ? 'grading' : 'inlineSummary')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all inline-flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer ${
                              kindergartenViewMode === 'inlineSummary'
                                ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                                : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border-slate-200'
                            }`}
                            title="สรุปผลการประเมินทั้งหมด (1 ตาราง)"
                          >
                            <FileText className={`w-3.5 h-3.5 ${kindergartenViewMode === 'inlineSummary' ? 'text-white' : 'text-amber-600'}`} />
                            <span>สรุป</span>
                          </button>

                          {activeKindergartenSubtopic && canGradeSubject && !isAdminReadOnly && !isMemberLockedReadOnly && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setStarMenuOpenSubtopic(starMenuOpenSubtopic === activeKindergartenSubtopic ? null : activeKindergartenSubtopic)}
                                className="px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-200/90 hover:bg-amber-300 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs border border-amber-300"
                                title="ให้คะแนนระดับเดียวกันทุกคน"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                                <span>ให้คะแนน</span>
                              </button>

                              {starMenuOpenSubtopic === activeKindergartenSubtopic && (
                                <>
                                  <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setStarMenuOpenSubtopic(null)}
                                  />
                                  <div className="absolute right-0 top-full mt-1.5 z-40 bg-white border border-amber-200 rounded-xl shadow-lg p-1.5 min-w-[150px] animate-in fade-in zoom-in-95 text-slate-800">
                                    <div className="text-[10px] font-bold text-amber-900 px-2 py-1 border-b border-amber-100 mb-1 flex items-center gap-1">
                                      <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                                      <span>ให้คะแนนเท่ากันทั้งหน้า</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      {Array.from({ length: activeRubricMaxLevel }, (_, i) => activeRubricMaxLevel - i).map((lvl) => {
                                        const rubricObj = activeRubricLevels.find(r => r.level === lvl);
                                        return (
                                          <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => {
                                              handleBatchSetRubricScoreForPage(activeKindergartenSubtopic, lvl);
                                              setStarMenuOpenSubtopic(null);
                                            }}
                                            className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-50 text-slate-700 hover:text-amber-900 flex items-center justify-between transition-colors cursor-pointer"
                                          >
                                            <div className="flex items-center gap-1.5">
                                              <span className={`w-4 h-4 rounded text-[10px] font-bold text-white flex items-center justify-center ${
                                                lvl === 3 ? 'bg-emerald-600' :
                                                lvl === 2 ? 'bg-sky-600' :
                                                lvl === 1 ? 'bg-amber-500' : 'bg-indigo-600'
                                              }`}>
                                                {lvl}
                                              </span>
                                              <span>{rubricObj?.label || `ระดับ ${lvl}`}</span>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </h3>
                  </div>

                  {/* สำหรับ กิจกรรม: แสดงเกณฑ์การประเมิน ผ่าน - ไม่ผ่าน และปุ่มลัดให้ผ่านทุกคน */}
                  {isSelectedSubjectActivity ? (
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>เกณฑ์การประเมินกิจกรรม: เลือก <strong>ผ่าน</strong> หรือ <strong>ไม่ผ่าน</strong></span>
                      </span>
                      {canGradeSubject && !isAdminReadOnly && !isMemberLockedReadOnly && gradeStudents.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleBatchActivityResult('ผ่าน')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ให้ &quot;ผ่าน&quot; ทุกคน</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : isSelectedSubjectKindergarten ? (
                    <div className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl p-2.5 space-y-2.5">
                      {/* แสดงแถบปุ่มสมรรถนะเฉพาะเมื่อเปิดใช้งานสมรรถนะ (ON) */}
                      {!isSelectedKindergartenCompetencyOff && (
                        <div className="flex items-center gap-2 flex-wrap pt-0.5 w-full">
                          <span className="text-[11px] font-bold text-slate-600 mr-0.5 shrink-0 flex items-center gap-1">
                            <span>สมรรถนะ :</span>
                          </span>

                          {/* รายการสมรรถนะเป็นข้อๆ กรอบวงกลมตัวเลข 1, 2, 3... */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {currentKindergartenSubtopics.map((stName, idx) => {
                              const isSelected = activeKindergartenSubtopic === stName;
                              const uNum = idx + 1;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedKindergartenSubtopic(stName);
                                    if (kindergartenViewMode === 'inlineSummary') {
                                      setKindergartenViewMode('grading');
                                    }
                                  }}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-2xs cursor-pointer select-none ${
                                    isSelected
                                      ? 'bg-amber-600 text-white ring-2 ring-amber-300 scale-105'
                                      : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300/80 hover:border-amber-400'
                                  }`}
                                  title={`สมรรถนะที่ ${uNum}: ${stName}`}
                                >
                                  {uNum}
                                </button>
                              );
                            })}

                            {/* ปุ่ม '+' สำหรับเพิ่มสมรรถนะใหม่ */}
                            {canManageKindergartenTopics && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewKindergartenSubtopicInput('');
                                  setNewKindergartenStandardInput('');
                                  setNewKindergartenIndicatorInput('');
                                  setNewKindergartenElementsInput(['']);
                                  setIsAddKindergartenSubtopicModalOpen(true);
                                }}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-dashed border-amber-300 hover:border-amber-400 transition-all shadow-2xs active:scale-95 cursor-pointer"
                                title="เพิ่มสมรรถนะ (+)"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            )}
                          </div>

                          {/* เมื่อกดข้อสมรรถนะ ด้านหลังก็จะแสดงชื่อสมรรถนะนั้นๆ และมีปุ่มแก้ไข - ลบ */}
                          {activeKindergartenSubtopic && (() => {
                            const activeIdx = activeKindergartenSubtopicIndex;
                            const compObj = activeIdx >= 0 ? selectedSubject?.kindergartenCompetencies?.[activeIdx] : undefined;
                            const elemCount = compObj?.elements?.length || (selectedSubject?.assignmentItems || []).filter(it => it.unitNumber === activeIdx + 1).length || 0;
                            const cleanedTitle = compObj?.title?.trim() || activeKindergartenSubtopic.replace(/^สมรรถนะ(\s*ที่)?\s*\d+\s*:?\s*/i, '').trim();

                            return (
                              <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-50/90 text-amber-900 rounded-xl border border-amber-200/80 text-xs font-semibold animate-in fade-in max-w-full">
                                <span className="font-bold text-amber-950 truncate max-w-[280px] sm:max-w-md" title={activeKindergartenSubtopic}>
                                  สมรรถนะที่ {activeIdx + 1}{cleanedTitle ? `: ${cleanedTitle}` : ''}
                                  {elemCount > 0 && (
                                    <span className="text-[10px] ml-1.5 font-normal text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                                      {elemCount} ประเด็น
                                    </span>
                                  )}
                                </span>

                                {canManageKindergartenTopics && (
                                  <div className="flex items-center gap-1 ml-1 border-l border-amber-200 pl-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditKindergartenUnitModal(activeKindergartenSubtopic)}
                                      className="p-1 hover:bg-amber-200/80 text-amber-800 rounded-lg transition-all cursor-pointer"
                                      title={`แก้ไขชื่อสมรรถนะ และองค์ประกอบ/ประเด็น`}
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteKindergartenSubtopic(activeKindergartenSubtopic)}
                                      className="p-1 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                                      title={`ลบสมรรถนะ "${activeKindergartenSubtopic}"`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* สำหรับ ป.1 - ม.6: หน่วยการเรียนรู้ 1, 2, 3 วงกลมเลข + ชื่อหน่วย + คะแนนเต็ม + ปุ่มแก้ไขและลบ */
                    <div className="hidden sm:flex items-center gap-2 flex-wrap pt-0.5 w-full">
                      <span className="text-[11px] font-bold text-slate-500 mr-0.5 shrink-0">หน่วยการเรียนรู้:</span>
                      
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {currentSubjectUnits.map((uNum) => {
                          const isSelected = selectedUnit === uNum;
                          return (
                            <div key={uNum} className="relative group inline-flex items-center">
                              <button
                                type="button"
                                onClick={() => setSelectedUnit(selectedUnit === uNum ? null : uNum)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-2xs cursor-pointer select-none ${
                                  isSelected
                                    ? 'bg-amber-600 text-white ring-2 ring-amber-300 scale-105'
                                    : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300/80 hover:border-amber-400'
                                }`}
                                title={`หน่วยการเรียนรู้ที่ ${uNum}${isSelected ? ' (กดอีกครั้งเพื่อดูทุกหน่วย)' : ' (คลิกเพื่อเลือกดูเฉพาะหน่วยนี้)'}`}
                              >
                                {uNum}
                              </button>
                            </div>
                          );
                        })}

                        {/* ปุ่ม + เพิ่มหน่วยการเรียนรู้ */}
                        {canManageUnits && (
                          <button
                            type="button"
                            onClick={handleOpenAddUnitModal}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-dashed border-amber-300 hover:border-amber-400 transition-all shadow-2xs active:scale-95 cursor-pointer"
                            title="เพิ่มหน่วยการเรียนรู้ (+)"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        )}
                      </div>

                      {/* เมื่อกดเลือกหน่วยการเรียนรู้ ให้แสดงชื่อหน่วย คะแนนเต็ม พร้อมปุ่มแก้ไขและลบในบรรทัดเดียวกัน */}
                      {selectedUnit !== null && (() => {
                        const activeDetail = selectedSubject?.learningUnitDetails?.find(d => d.unitNumber === selectedUnit);
                        const uName = activeDetail?.name || '';
                        const uScore = activeDetail?.score;

                        return (
                          <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-50/90 text-amber-900 rounded-xl border border-amber-200/80 text-xs font-semibold animate-in fade-in">
                            <span className="font-bold text-amber-950">
                              หน่วยที่ {selectedUnit}{uName ? `: ${uName}` : ''}{typeof uScore === 'number' && uScore > 0 ? ` (${uScore} คะแนน)` : ''}
                            </span>

                            {canManageUnits && (
                              <div className="flex items-center gap-1 ml-1 border-l border-amber-200 pl-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUnitModal(selectedUnit)}
                                  className="p-1 hover:bg-amber-200/80 text-amber-800 rounded-lg transition-all cursor-pointer"
                                  title={`แก้ไขชื่อและคะแนนเต็มของหน่วยที่ ${selectedUnit}`}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setUnitToDelete(selectedUnit)}
                                  className="p-1 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                                  title={`ลบหน่วยการเรียนรู้ที่ ${selectedUnit}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="empty:hidden flex flex-wrap items-center gap-2">
                  {!isAdminReadOnly && !isSelectedSubjectActivity && assignmentItems.length === 0 && (
                    <button
                      onClick={() => {
                        if (!canGradeSubject) {
                          onShowToast('warning', 'ต้องลงทะเบียนก่อน', 'สมาชิกต้องลงทะเบียนรายวิชานี้ก่อนจึงจะสามารถเพิ่มช่องงานได้');
                          return;
                        }
                        handleLoadSampleAssignments();
                      }}
                      disabled={!canGradeSubject}
                      className={`hidden sm:flex px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors items-center gap-1 ${
                        canGradeSubject 
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 cursor-pointer' 
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>โหลดตัวอย่าง 3 ช่องงาน</span>
                    </button>
                  )}

                  {isMemberLockedReadOnly && (
                    <div className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                      <span>ภาคเรียนถูกล็อก</span>
                    </div>
                  )}

                  {isAdminReadOnly && (
                    <div className="px-3 py-1 bg-sky-50 text-sky-850 border border-sky-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                      <Eye className="w-4 h-4 text-sky-600" />
                      <span>ดูได้อย่างเดียว</span>
                    </div>
                  )}
                </div>
              </div>

            {gradingViewMode === 'grade' && showGradeButton ? (
              <div className="p-4 sm:p-6 space-y-4 bg-white border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>ตารางสรุปผลการเรียน (เกรด) ระดับชั้น {selectedSubject?.gradeLevel} ภาคเรียนที่ {currentSemester} ปีการศึกษา {currentAcademicYear}</span>
                  </h3>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-12 border-r border-slate-200">เลขที่</th>
                        <th className="py-2.5 px-3 text-center w-28 border-r border-slate-200">รหัสประจำตัว</th>
                        <th className="py-2.5 px-4 border-r border-slate-200 min-w-[160px]">ชื่อ - นามสกุล</th>
                        {subjects.filter(s => s.gradeLevel === selectedSubject?.gradeLevel && (!s.semester || s.semester === currentSemester) && isSubjectInYear(s, currentAcademicYear)).map(subj => (
                          <th key={subj.id} className="py-2.5 px-2 text-center border-r border-slate-200 bg-amber-50/70 text-amber-950 font-bold min-w-[100px]" title={subj.name}>
                            <div className="truncate max-w-[130px] mx-auto">{subj.code} {subj.name}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gradeStudents.map((student, idx) => {
                        const semSubs = subjects.filter(s => s.gradeLevel === selectedSubject?.gradeLevel && (!s.semester || s.semester === currentSemester) && isSubjectInYear(s, currentAcademicYear));
                        return (
                          <tr key={student.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center font-mono text-slate-500 border-r border-slate-100 font-bold">
                              {student.rollNumber ?? (idx + 1)}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600 border-r border-slate-100">
                              {student.studentCode || '-'}
                            </td>
                            <td className="py-2 px-4 font-semibold text-slate-900 border-r border-slate-100">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                  {student.photoUrl ? (
                                    <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </div>
                                <span>{student.prefix}{student.firstName} {student.lastName}</span>
                              </div>
                            </td>
                            {semSubs.map(subj => {
                              const gRec = grades.find(g => g.studentId === student.id && g.subjectId === subj.id && g.semester === currentSemester);
                              if (subj.isActivity) {
                                const actVal = gRec?.activityResult || '-';
                                return (
                                  <td key={subj.id} className="py-2 px-2 text-center font-bold border-r border-slate-100 text-xs bg-emerald-50/20">
                                    <span className={actVal === 'ผ่าน' ? 'text-emerald-700' : actVal === 'ไม่ผ่าน' ? 'text-rose-600' : 'text-slate-400'}>
                                      {actVal}
                                    </span>
                                  </td>
                                );
                              }
                              const scoreVal = gRec?.totalScore !== undefined ? gRec.totalScore : 0;
                              const gradeVal = gRec?.totalScore !== undefined ? calculateThaiGrade(scoreVal, subj.totalScore || 100) : '-';

                              return (
                                <td key={subj.id} className="py-2 px-2 text-center font-mono font-bold text-amber-950 bg-amber-50/20 border-r border-slate-100 text-sm">
                                  {gradeVal}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : isSelectedSubjectKindergarten && kindergartenViewMode === 'inlineSummary' ? (
              <div className="p-2 sm:p-3 space-y-3 bg-white border-t border-slate-200">
                {/* Header & Control Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 print:hidden">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                      📊
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span>ตารางสรุปผลการประเมินพัฒนาการ ({selectedSubject.gradeLevel})</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                          วิชา {selectedSubject.name} ({selectedSubject.code})
                        </span>
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Print Title Header (เฉพาะเวลาสั่งพิมพ์) */}
                <div className="hidden print:block text-center pb-3 border-b-2 border-slate-800 space-y-1">
                  <h2 className="text-lg font-black text-slate-900">
                    แบบรายงานสรุปผลการประเมินพัฒนาการระดับปฐมวัย ({selectedSubject.gradeLevel})
                  </h2>
                  <p className="text-xs text-slate-700">
                    วิชา {selectedSubject.name} ({selectedSubject.code}) • ภาคเรียนที่ {currentSemester} ปีการศึกษา {currentAcademicYear}
                  </p>
                </div>

                {/* 1 Single Consolidated Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-2xs bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 sticky top-0 z-10">
                      {/* Upper Header Row: Grouped by Subtopic/Page */}
                      <tr className="border-b border-slate-200">
                        <th rowSpan={2} className="py-2 px-1 text-center w-10 min-w-[38px] bg-slate-100 border-r border-b border-slate-300 font-bold text-slate-800 text-[11px] shrink-0">
                          เลขที่
                        </th>
                        <th rowSpan={2} className="py-2 px-2 text-center min-w-[120px] bg-slate-100 border-r border-b border-slate-300 font-bold text-slate-800 text-[11px] shrink-0">
                          ชื่อ - นามสกุล
                        </th>

                        {currentKindergartenSubtopics.map((stName, pIdx) => {
                          const pageUnitNum = pIdx + 1;
                          const pageAssignments = (selectedSubject.assignmentItems || []).filter(
                            it => it.unitNumber === pageUnitNum || it.name === stName
                          );
                          const cols = pageAssignments.length > 0
                            ? pageAssignments
                            : [{ id: `asg-k-${pageUnitNum}-1`, name: stName, unitNumber: pageUnitNum, maxScore: activeRubricMaxLevel }];
                          const colSpan = cols.length + 1; // score columns + 1 qualitative summary column

                          return (
                            <th
                              key={`grp-${pIdx}`}
                              colSpan={colSpan}
                              className={`py-1.5 px-1 text-center border-r border-b border-slate-300 ${
                                pIdx % 2 === 0 ? 'bg-amber-100/90 text-amber-950' : 'bg-orange-100/90 text-orange-950'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span className="w-4 h-4 rounded bg-white/90 text-amber-900 font-mono text-[10px] font-black inline-flex items-center justify-center shadow-2xs">
                                  {pageUnitNum}
                                </span>
                                <span className="font-bold text-[11px] truncate max-w-[180px]" title={stName}>
                                  {isSelectedKindergartenCompetencyOff
                                    ? `ด้านความสามารถ: ${selectedSubject.name}`
                                    : (stName.startsWith('สมรรถนะที่') ? stName : `สมรรถนะที่ ${pageUnitNum}: ${stName}`)}
                                </span>
                              </div>
                            </th>
                          );
                        })}

                        {/* Final 2 Columns Group Header */}
                        <th colSpan={2} className="py-1.5 px-2 text-center bg-emerald-100 text-emerald-950 border-b border-slate-300 font-bold text-[11px]">
                          {isSelectedKindergartenCompetencyOff ? 'สรุปภาพรวมด้านความสามารถ' : 'สรุปภาพรวมทุกสมรรถนะ'}
                        </th>
                      </tr>

                      {/* Lower Header Row: Columns per Competency (องค์ประกอบ/ประเด็น) + Summary + Final Overall */}
                      <tr>
                        {currentKindergartenSubtopics.map((stName, pIdx) => {
                          const pageUnitNum = pIdx + 1;
                          const pageDetail = selectedSubject.learningUnitDetails?.find(
                            d => (pageUnitNum > 0 && d.unitNumber === pageUnitNum) || d.name === stName
                          );
                          const pageAssignments = (selectedSubject.assignmentItems || []).filter(
                            it => it.unitNumber === pageUnitNum || it.name === stName
                          );
                          const cols = pageAssignments.length > 0
                            ? pageAssignments
                            : [{ id: `asg-k-${pageUnitNum}-1`, name: `องค์ประกอบ/ประเด็น 1`, unitNumber: pageUnitNum, maxScore: activeRubricMaxLevel }];

                          return (
                            <React.Fragment key={`subhead-${pIdx}`}>
                              {cols.map((asg, cIdx) => (
                                <th
                                  key={asg.id}
                                  className="py-1 px-1 text-center border-r border-b border-slate-200 min-w-[60px] max-w-[90px] bg-white font-semibold text-slate-700 text-[10px]"
                                  title={`องค์ประกอบ/ประเด็น ${cIdx + 1}: ${asg.name}`}
                                >
                                  <div className="text-[9px] text-amber-700 font-bold">
                                    องค์ประกอบ/ประเด็น {cIdx + 1}
                                  </div>
                                  <div className="truncate max-w-[85px] font-bold text-slate-800">
                                    {asg.name}
                                  </div>
                                </th>
                              ))}

                              {/* สรุปคุณภาพของสมรรถนะ / ด้านความสามารถ */}
                              <th
                                className="py-1 px-1 text-center border-r border-b border-slate-300 min-w-[75px] max-w-[95px] bg-amber-50/80 text-amber-950 font-bold"
                                title={pageDetail?.standard || stName}
                              >
                                <div className="text-[10px] font-black text-amber-900 leading-tight">
                                  {isSelectedKindergartenCompetencyOff ? 'สรุปผล' : 'สรุปสมรรถนะ'}
                                </div>
                                <div className="text-[9px] font-semibold text-amber-800 truncate max-w-[90px]">
                                  {isSelectedKindergartenCompetencyOff ? '(ด้านความสามารถ)' : `(สมรรถนะที่ ${pageUnitNum})`}
                                </div>
                              </th>
                            </React.Fragment>
                          );
                        })}

                        {/* Column ที่ 2 สุดท้าย: สรุปปริมาณ */}
                        <th className="py-1 px-1 text-center min-w-[65px] max-w-[80px] bg-amber-200/90 text-amber-950 font-black border-r border-b border-amber-300 text-[10px] leading-tight">
                          สรุปปริมาณ
                        </th>

                        {/* Column สุดท้าย: สรุปคุณภาพ */}
                        <th className="py-1 px-1 text-center min-w-[70px] max-w-[85px] bg-emerald-200 text-emerald-950 font-black border-b border-emerald-300 text-[10px] leading-tight">
                          สรุปคุณภาพ
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {gradeStudents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={
                              2 +
                              currentKindergartenSubtopics.reduce((sum, st, idx) => {
                                const pageAssignments = (selectedSubject.assignmentItems || []).filter(
                                  it => it.unitNumber === idx + 1 || it.name === st
                                );
                                return sum + (pageAssignments.length > 0 ? pageAssignments.length : 1) + 1;
                              }, 0) +
                              2
                            }
                            className="py-8 text-center text-slate-400 text-xs"
                          >
                            ไม่มีข้อมูลนักเรียนในระดับชั้นนี้
                          </td>
                        </tr>
                      ) : (
                        gradeStudents.map((st, sIdx) => {
                          const row = scoreRows[st.id];
                          const overall = getStudentOverallRubric(st.id);

                          return (
                            <tr key={st.id} className="hover:bg-amber-50/30 transition-colors">
                              {/* Column 1: เลขที่ */}
                              <td className="py-1 px-1 text-center font-mono font-bold text-slate-700 text-[11px] border-r border-slate-200">
                                {st.rollNumber ?? (sIdx + 1)}
                              </td>

                              {/* Column 2: ชื่อ - นามสกุล */}
                              <td className="py-1 px-1.5 font-semibold text-slate-800 border-r border-slate-200 text-[11px] whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    {st.photoUrl ? (
                                      <img src={st.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="w-3 h-3 text-slate-400" />
                                    )}
                                  </div>
                                  <span>{st.prefix}{st.firstName} {st.lastName}</span>
                                  {st.nickname && (
                                    <span className="text-[9px] text-slate-400 font-normal">({st.nickname})</span>
                                  )}
                                </div>
                              </td>

                              {/* Columns for each subtopic page */}
                              {currentKindergartenSubtopics.map((stName, pIdx) => {
                                const pageUnitNum = pIdx + 1;
                                const pageAssignments = (selectedSubject.assignmentItems || []).filter(
                                  it => it.unitNumber === pageUnitNum || it.name === stName
                                );
                                const cols = pageAssignments.length > 0
                                  ? pageAssignments
                                  : [{ id: `asg-k-${pageUnitNum}-1`, name: stName, unitNumber: pageUnitNum, maxScore: activeRubricMaxLevel }];
                                const pSummary = getStudentSubtopicSummary(st.id, cols);

                                return (
                                  <React.Fragment key={`cell-page-${pIdx}`}>
                                    {cols.map(asg => {
                                      const score = row?.assignmentScores?.[asg.id];
                                      return (
                                        <td key={asg.id} className="py-1 px-1 text-center font-mono font-bold border-r border-slate-100">
                                          {typeof score === 'number' && score > 0 ? (
                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] text-white font-black shadow-2xs ${
                                              score === 3 ? 'bg-emerald-600' :
                                              score === 2 ? 'bg-sky-600' :
                                              score === 1 ? 'bg-amber-500' : 'bg-indigo-600'
                                            }`}>
                                              {score}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300 font-normal text-[10px]">-</span>
                                          )}
                                        </td>
                                      );
                                    })}

                                    {/* สรุปคุณภาพของหน้านี้ */}
                                    <td className="py-1 px-1 text-center border-r border-slate-300 bg-amber-50/30">
                                      {pSummary.score !== null ? (
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs ${
                                          pSummary.score === 3 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                          pSummary.score === 2 ? 'bg-sky-100 text-sky-800 border border-sky-300' :
                                          pSummary.score === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                          'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                        }`}>
                                          {pSummary.label}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 text-[10px] font-normal">-</span>
                                      )}
                                    </td>
                                  </React.Fragment>
                                );
                              })}

                              {/* Column ที่ 2 สุดท้าย: สรุปปริมาณของหน้าทั้งหมด */}
                              <td className="py-1 px-1 text-center font-mono font-black border-r border-amber-300 bg-amber-50/60 text-amber-950">
                                {overall.score !== null ? (
                                  <div className="flex flex-col items-center justify-center leading-none">
                                    <span className="text-xs font-black text-amber-950">{overall.score}</span>
                                    {overall.average && (
                                      <span className="text-[9px] text-amber-800 font-medium font-sans">
                                        ({overall.average})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-normal text-[10px]">-</span>
                                )}
                              </td>

                              {/* Column สุดท้าย: สรุปคุณภาพของหน้าทั้งหมดที่ได้สร้างไว้ */}
                              <td className="py-1 px-1 text-center bg-emerald-50/50">
                                {overall.score !== null ? (
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs ${
                                    overall.score === 3 ? 'bg-emerald-600 text-white' :
                                    overall.score === 2 ? 'bg-sky-600 text-white' :
                                    overall.score === 1 ? 'bg-amber-600 text-white' :
                                    'bg-indigo-600 text-white'
                                  }`}>
                                    {overall.label}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px] font-normal">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {/* Table Footer: สรุปจำนวนนักเรียนที่ประเมินแล้ว */}
                    {gradeStudents.length > 0 && (
                      <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-[10px]">
                        <tr>
                          <td colSpan={2} className="py-1.5 px-2 text-slate-700 text-right font-bold border-r border-slate-200">
                            รวมทั้งหมด {gradeStudents.length} คน
                          </td>
                          {currentKindergartenSubtopics.map((stName, pIdx) => {
                            const pageUnitNum = pIdx + 1;
                            const pageAssignments = (selectedSubject.assignmentItems || []).filter(
                              it => it.unitNumber === pageUnitNum || it.name === stName
                            );
                            const cols = pageAssignments.length > 0
                              ? pageAssignments
                              : [{ id: `asg-k-${pageUnitNum}-1`, name: stName, unitNumber: pageUnitNum, maxScore: activeRubricMaxLevel }];
                            const assessedCount = gradeStudents.filter(
                              st => getStudentSubtopicSummary(st.id, cols).score !== null
                            ).length;

                            return (
                              <React.Fragment key={`foot-${pIdx}`}>
                                {cols.map(asg => {
                                  const countScored = gradeStudents.filter(
                                    st => typeof scoreRows[st.id]?.assignmentScores?.[asg.id] === 'number' && (scoreRows[st.id]?.assignmentScores?.[asg.id] || 0) > 0
                                  ).length;
                                  return (
                                    <td key={`ft-asg-${asg.id}`} className="py-1 px-0.5 text-center font-mono text-[10px] text-slate-600 border-r border-slate-100">
                                      {countScored}/{gradeStudents.length}
                                    </td>
                                  );
                                })}
                                <td className="py-1 px-1 text-center font-mono font-bold text-[10px] text-amber-900 bg-amber-50/50 border-r border-slate-300">
                                  {assessedCount}/{gradeStudents.length}
                                </td>
                              </React.Fragment>
                            );
                          })}

                          {/* สรุปปริมาณ & คุณภาพ รวม */}
                          <td className="py-1 px-1 text-center font-mono font-bold text-[10px] text-amber-950 bg-amber-100/60 border-r border-amber-300">
                            {gradeStudents.filter(st => getStudentOverallRubric(st.id).score !== null).length}/{gradeStudents.length}
                          </td>
                          <td className="py-1 px-1 text-center font-mono font-bold text-[10px] text-emerald-950 bg-emerald-100/60">
                            {gradeStudents.filter(st => getStudentOverallRubric(st.id).score !== null).length}/{gradeStudents.length}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Rubric Criteria Legend */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">เกณฑ์ระดับคุณภาพ:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {activeRubricLevels.map(rb => (
                        <span key={rb.level} className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          <span className={`w-4 h-4 rounded text-[10px] font-bold text-white flex items-center justify-center ${
                            rb.level === 3 ? 'bg-emerald-600' :
                            rb.level === 2 ? 'bg-sky-600' :
                            rb.level === 1 ? 'bg-amber-500' : 'bg-indigo-600'
                          }`}>
                            {rb.level}
                          </span>
                          <span className="font-semibold text-slate-700">{rb.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    * สรุปปริมาณและคุณภาพคำนวณจากค่าเฉลี่ยของคะแนนในแต่ละหน้า
                  </div>
                </div>
              </div>
            ) : (
              <>
            {/* มุมมอง Mobile (เฉพาะหน้าจอมือถือ): สลับระหว่าง กิจกรรม (ผ่าน/ไม่ผ่าน), อ.1-อ.3 (หัวข้อย่อยและภาพรวม) กับ ป.1-ม.6 (ระหว่างภาค/ปลายภาค/รวม) */}
            <div className="sm:hidden">
              <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-2xs w-full">
                {isSelectedSubjectActivity ? (
                  <table className="w-full text-left text-xs table-fixed">
                    <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-2.5 font-bold text-slate-800">ชื่อ-สกุลนักเรียน</th>
                        <th className="py-2.5 px-2 text-center bg-emerald-50/60 w-[145px] shrink-0">
                          <div className="text-[11px] font-bold text-emerald-950 whitespace-nowrap">ผลการประเมิน</div>
                          <span className="text-[9px] font-normal text-emerald-700">(ผ่าน / ไม่ผ่าน)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gradeStudents.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="py-8 text-center text-slate-400 text-xs">
                            ยังไม่มีนักเรียนในระดับชั้น {selectedSubject?.gradeLevel}
                          </td>
                        </tr>
                      ) : (
                        gradeStudents.map((student, idx) => {
                          const row = scoreRows[student.id];
                          const actRes = row?.activityResult || '';
                          return (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-2 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 font-mono font-bold text-[10px] inline-flex items-center justify-center shrink-0">
                                    {student.rollNumber ?? (idx + 1)}
                                  </span>
                                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    {student.photoUrl ? (
                                      <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-slate-800 text-xs truncate leading-tight">
                                      {student.prefix}{student.firstName} {student.lastName}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-center bg-emerald-50/20">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={!canGradeSubject || isAdminReadOnly || isMemberLockedReadOnly}
                                    onClick={() => handleActivityResultChange(student.id, actRes === 'ผ่าน' ? '' : 'ผ่าน')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                      actRes === 'ผ่าน'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                                    } ${(!canGradeSubject || isAdminReadOnly || isMemberLockedReadOnly) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                                  >
                                    ผ่าน
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canGradeSubject || isAdminReadOnly || isMemberLockedReadOnly}
                                    onClick={() => handleActivityResultChange(student.id, actRes === 'ไม่ผ่าน' ? '' : 'ไม่ผ่าน')}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                      actRes === 'ไม่ผ่าน'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                                    } ${(!canGradeSubject || isAdminReadOnly || isMemberLockedReadOnly) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                                  >
                                    ไม่ผ่าน
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                ) : isSelectedSubjectKindergarten ? (
                  <table className="w-full text-left text-xs table-fixed">
                    <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-2 font-bold text-slate-800">ชื่อ-สกุลนักเรียน</th>
                        <th className="py-2.5 px-1 text-center bg-amber-50/50 w-[70px] shrink-0">
                          <div className="text-[11px] font-bold text-amber-950 whitespace-nowrap">สรุปปริมาณ</div>
                          <span className="text-[9px] font-normal text-amber-700">(ตัวเลข)</span>
                        </th>
                        <th className="py-2.5 px-1 text-center bg-amber-100/70 w-[95px] shrink-0">
                          <div className="text-[11px] font-bold text-amber-950 whitespace-nowrap">สรุปคุณภาพ</div>
                          <span className="text-[9px] font-normal text-amber-700">(คุณภาพ)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gradeStudents.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                            ยังไม่มีนักเรียนในระดับชั้น {selectedSubject?.gradeLevel}
                          </td>
                        </tr>
                      ) : (
                        gradeStudents.map((student, idx) => {
                          const pageSummary = getStudentSubtopicSummary(student.id, displayedKindergartenAssignments);

                          return (
                            <tr
                              key={student.id}
                              onClick={() => setMobileGradingStudentId(student.id)}
                              className="hover:bg-amber-50/40 active:bg-amber-100/50 transition-colors cursor-pointer group"
                            >
                              <td className="py-2.5 px-2 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-5 h-5 rounded-md bg-slate-100 group-hover:bg-amber-100 text-slate-600 group-hover:text-amber-900 font-mono font-bold text-[10px] inline-flex items-center justify-center shrink-0">
                                    {student.rollNumber ?? (idx + 1)}
                                  </span>
                                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    {student.photoUrl ? (
                                      <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-slate-800 text-xs truncate leading-tight flex items-center gap-1">
                                      <span className="truncate">{student.prefix}{student.firstName} {student.lastName}</span>
                                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-amber-600 shrink-0" />
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-1 text-center font-mono font-bold text-xs">
                                {pageSummary.score !== null ? (
                                  <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded-lg border ${
                                    pageSummary.score === 3 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                    pageSummary.score === 2 ? 'bg-sky-100 text-sky-800 border-sky-300' :
                                    pageSummary.score === 1 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                    'bg-indigo-100 text-indigo-800 border-indigo-300'
                                  }`}>
                                    {pageSummary.score}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-1 text-center">
                                {pageSummary.score !== null ? (
                                  <span className={`inline-block font-bold text-[11px] px-2 py-0.5 rounded-lg border ${
                                    pageSummary.score === 3 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                    pageSummary.score === 2 ? 'bg-sky-100 text-sky-800 border-sky-300' :
                                    pageSummary.score === 1 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                    'bg-indigo-100 text-indigo-800 border-indigo-300'
                                  }`}>
                                    {pageSummary.label}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs table-fixed">
                    <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-2 font-bold text-slate-800">ชื่อ-สกุลนักเรียน</th>
                        {/* ตารางสรุปคะแนนเต็มของหน่วยที่เลือกก่อนคะแนนระหว่างภาค (แสดงเฉพาะหน่วยที่เลือก) */}
                        {selectedUnit !== null && (() => {
                          const detail = selectedSubject?.learningUnitDetails?.find(d => d.unitNumber === selectedUnit);
                          const uMaxScore = typeof detail?.score === 'number' && detail.score > 0 
                            ? detail.score 
                            : Math.round((selectedSubject?.courseworkScore || 70) / (currentSubjectUnits.length || 1));

                          return (
                            <th key={`muhead-${selectedUnit}`} className="py-2.5 px-1 text-center bg-amber-100/80 w-[55px] shrink-0">
                              <div className="text-[10px] font-bold text-amber-950 whitespace-nowrap truncate">หน่วย {selectedUnit}</div>
                              <span className="text-[9px] font-normal text-amber-800">({uMaxScore})</span>
                            </th>
                          );
                        })()}
                        <th className="py-2.5 px-1 text-center bg-emerald-50/50 w-[55px] shrink-0">
                          <div className="text-[11px] font-bold text-emerald-950 whitespace-nowrap">รวม</div>
                          <span className="text-[9px] font-normal text-emerald-700">({selectedSubject?.totalScore || 100})</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gradeStudents.length === 0 ? (
                        <tr>
                          <td colSpan={2 + (selectedUnit !== null ? 1 : 0)} className="py-8 text-center text-slate-400 text-xs">
                            ยังไม่มีนักเรียนในระดับชั้น {selectedSubject?.gradeLevel}
                          </td>
                        </tr>
                      ) : (
                        gradeStudents.map((student, idx) => {
                          const row = scoreRows[student.id] || { coursework: 0, exam: 0, assignmentScores: {} };
                          const { unitBreakdown } = calculateCourseworkScore(row.assignmentScores || {}, selectedSubject);
                          const total = Math.min(
                            selectedSubject?.totalScore || 100,
                            (Number(row.coursework) || 0) + (Number(row.exam) || 0)
                          );

                          return (
                            <tr
                              key={student.id}
                              onClick={() => setMobileGradingStudentId(student.id)}
                              className="hover:bg-amber-50/40 active:bg-amber-100/50 transition-colors cursor-pointer group"
                            >
                              <td className="py-2.5 px-2 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-5 h-5 rounded-md bg-slate-100 group-hover:bg-amber-100 text-slate-600 group-hover:text-amber-900 font-mono font-bold text-[10px] inline-flex items-center justify-center shrink-0">
                                    {student.rollNumber ?? (idx + 1)}
                                  </span>
                                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                    {student.photoUrl ? (
                                      <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-slate-800 text-xs truncate leading-tight flex items-center gap-1">
                                      <span className="truncate">{student.prefix}{student.firstName} {student.lastName}</span>
                                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-amber-600 shrink-0" />
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* สรุปคะแนนของหน่วยที่เลือก */}
                              {selectedUnit !== null && (() => {
                                const uEarned = unitBreakdown[selectedUnit]?.earned ?? 0;
                                return (
                                  <td key={`mubody-${student.id}-${selectedUnit}`} className="py-2.5 px-1 text-center bg-amber-50/40 font-mono font-bold text-amber-900 text-xs tabular-nums">
                                    {uEarned}
                                  </td>
                                );
                              })()}

                              <td className="py-2.5 px-1 text-center">
                                <span className={`inline-block font-mono font-bold text-xs tabular-nums px-1 py-0.5 rounded-md ${
                                  total >= 80 ? 'bg-emerald-100 text-emerald-800' :
                                  total >= 50 ? 'bg-amber-100 text-amber-800' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {total}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* มุมมอง Desktop (หน้าจอคอมพิวเตอร์ / แท็บเล็ต): แสดงตารางแบบเต็มทุกช่องงาน */}
            <div className="hidden sm:block overflow-x-auto pb-3">
              {isSelectedSubjectActivity ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-14 text-center border-r border-slate-200/80">เลขที่</th>
                      <th className="py-3 px-3 w-28 text-center border-r border-slate-200/80">รหัสประจำตัว</th>
                      <th className="py-3 px-4 min-w-[200px] border-r border-slate-200/80">ชื่อ - นามสกุล</th>
                      <th className="py-3 px-4 text-center bg-emerald-50/60 border-r border-slate-200/80 w-64">
                        <div className="text-xs font-bold text-emerald-950">ผลการประเมินกิจกรรม</div>
                        <div className="text-[10px] font-normal text-emerald-700">(เลือก ผ่าน / ไม่ผ่าน)</div>
                      </th>
                      <th className="py-3 px-3 text-center bg-slate-100 w-36">
                        <div className="text-xs font-bold text-slate-800">สรุปผล</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gradeStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                          ยังไม่มีนักเรียนในระดับชั้น {selectedSubject?.gradeLevel}
                        </td>
                      </tr>
                    ) : (
                      gradeStudents.map((student, idx) => {
                        const row = scoreRows[student.id];
                        const actRes = row?.activityResult || '';
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/90 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-bold border-r border-slate-100">
                              {student.rollNumber ?? (idx + 1)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600 border-r border-slate-100">
                              {student.studentCode || '-'}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-100">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                  {student.photoUrl ? (
                                    <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </div>
                                <span>{student.prefix}{student.firstName} {student.lastName}</span>
                              </div>
                            </td>
                            <td className="py-2 px-4 text-center bg-emerald-50/20 border-r border-slate-100">
                              <div className="inline-flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  disabled={!canGradeSubject || isAdminReadOnly || isMemberLockedReadOnly}
                                  onClick={() => handleActivityResultChange(student.id, actRes === 'ผ่าน' ? '' : 'ผ่าน')}
                                  className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                    actRes === 'ผ่าน'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-200'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300'
                                  } ${(!canGradeSubject || isAdminReadOnly || isMemberLockedReadOnly) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>ผ่าน</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={!canGradeSubject || isAdminReadOnly || isMemberLockedReadOnly}
                                  onClick={() => handleActivityResultChange(student.id, actRes === 'ไม่ผ่าน' ? '' : 'ไม่ผ่าน')}
                                  className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                    actRes === 'ไม่ผ่าน'
                                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-200'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300'
                                  } ${(!canGradeSubject || isAdminReadOnly || isMemberLockedReadOnly) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>ไม่ผ่าน</span>
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {actRes === 'ผ่าน' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                                  ผ่าน
                                </span>
                              ) : actRes === 'ไม่ผ่าน' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs">
                                  ไม่ผ่าน
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs font-medium">ยังไม่ประเมิน</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : isSelectedSubjectKindergarten ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-1.5 w-9 min-w-[36px] text-center border-r border-slate-200/80">เลขที่</th>
                      <th className="py-2.5 px-1.5 w-14 min-w-[50px] text-center border-r border-slate-200/80">รหัส</th>
                      <th className="py-2.5 px-2 min-w-[110px] max-w-[140px] border-r border-slate-200/80">ชื่อ - นามสกุล</th>

                      {/* Dynamic Kindergarten Columns (องค์ประกอบ/ประเด็น) for CURRENT Competency */}
                      {displayedKindergartenAssignments.map((asg, aIdx) => (
                        <th 
                          key={asg.id} 
                          className="py-1.5 px-1 text-center bg-amber-50/50 border-l border-r border-slate-200/80 min-w-[76px] max-w-[105px] align-top group/head pb-1"
                        >
                          <div className="flex flex-col items-center justify-between min-h-[58px] h-full gap-0.5">
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-200/80 shrink-0">
                              ประเด็น {aIdx + 1}
                            </span>
                            
                            <span 
                              className="text-[11px] font-bold text-slate-800 leading-tight text-center break-words line-clamp-2 px-0.5 my-auto" 
                              title={asg.name}
                            >
                              {asg.name}
                            </span>

                            {canManageKindergartenTopics && (
                              <div className="flex items-center justify-center gap-1 w-full pt-0.5 mt-auto border-t border-amber-200/60 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setKindergartenColumnToEdit(asg);
                                    setEditKindergartenColumnInput(asg.name);
                                  }}
                                  className="p-0.5 text-slate-500 hover:text-amber-800 hover:bg-amber-100/80 rounded transition-colors cursor-pointer"
                                  title="แก้ไขชื่อองค์ประกอบ/ประเด็น"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setKindergartenColumnToDelete({ id: asg.id, name: asg.name })}
                                  className="p-0.5 text-slate-500 hover:text-rose-600 hover:bg-rose-100/80 rounded transition-colors cursor-pointer"
                                  title={`ลบองค์ประกอบ/ประเด็น "${asg.name}"`}
                                >
                                  <X className="w-3 h-3 stroke-[2]" />
                                </button>
                              </div>
                            )}
                          </div>
                        </th>
                      ))}

                      {/* ปุ่ม '+' ในตาราง สำหรับเพิ่มองค์ประกอบ/ประเด็นภายใต้สมรรถนะนี้ */}
                      {canManageKindergartenTopics && (
                        <th className="py-2 px-1 text-center bg-amber-50/40 border-l border-r border-dashed border-amber-300 w-9 min-w-[36px] align-middle">
                          <button
                            type="button"
                            onClick={() => {
                              setNewKindergartenColumnInput(`องค์ประกอบ/ประเด็น ${displayedKindergartenAssignments.length + 1}`);
                              setIsAddKindergartenColumnModalOpen(true);
                            }}
                            className="w-6 h-6 mx-auto rounded-lg flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white shadow-2xs hover:scale-105 active:scale-95 cursor-pointer transition-all"
                            title={`เพิ่มองค์ประกอบ/ประเด็นใน "${activeKindergartenSubtopic}" (+)`}
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </th>
                      )}

                      {/* สรุปคะแนนเชิงปริมาณ */}
                      <th className="py-2 px-1.5 text-center bg-amber-100/90 border-l border-amber-300 w-16 min-w-[58px] max-w-[68px] align-middle">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[11px] font-bold text-amber-950 leading-tight">
                            สรุปปริมาณ
                          </span>
                        </div>
                      </th>

                      {/* สรุประดับคะแนนเชิงคุณภาพ */}
                      <th className="py-2 px-1.5 text-center bg-amber-200/80 border-l border-amber-300 w-20 min-w-[70px] max-w-[85px] align-middle">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[11px] font-bold text-amber-950 leading-tight">
                            สรุปคุณภาพ
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {gradeStudents.length === 0 ? (
                      <tr>
                        <td colSpan={3 + displayedKindergartenAssignments.length + (canManageKindergartenTopics ? 1 : 0) + 2} className="py-8 text-center text-slate-400">
                          ไม่มีข้อมูลนักเรียนในชั้นนี้
                        </td>
                      </tr>
                    ) : (
                      gradeStudents.map((student, idx) => {
                        const row = scoreRows[student.id];
                        const pageSummary = getStudentSubtopicSummary(student.id, displayedKindergartenAssignments);

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-1.5 px-1 text-center border-r border-slate-100">
                              <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[11px] inline-flex items-center justify-center tabular-nums">
                                {student.rollNumber ?? (idx + 1)}
                              </span>
                            </td>
                            <td className="py-1.5 px-1 text-center font-mono text-slate-400 text-[11px] border-r border-slate-100">
                              {student.studentCode || '-'}
                            </td>
                            <td className="py-1.5 px-1.5 font-medium text-slate-800 border-r border-slate-100 max-w-[140px]">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                  {student.photoUrl ? (
                                    <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-3 h-3 text-slate-400" />
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMobileGradingStudentId(student.id);
                                  }}
                                  className="text-left font-medium text-slate-800 hover:text-amber-700 hover:underline flex items-center gap-1 group cursor-pointer truncate text-[11px]"
                                  title={`${student.prefix}${student.firstName} ${student.lastName}`}
                                >
                                  <span className="truncate">{student.prefix}{student.firstName} {student.lastName}</span>
                                  <span className="opacity-0 group-hover:opacity-100 text-[9px] text-amber-600 transition-opacity shrink-0">✏️</span>
                                </button>
                              </div>
                            </td>

                            {/* Subtopic score cell: compact appropriate size, click opens popover with 1, 2, 3 */}
                            {displayedKindergartenAssignments.map((asg) => {
                              const scoreVal = row?.assignmentScores?.[asg.id];
                              const currentLevelObj = activeRubricLevels.find(l => l.level === scoreVal);
                              const isPickerOpen = 
                                activeScorePicker?.studentId === student.id && 
                                activeScorePicker?.assignmentId === asg.id;

                              return (
                                <td 
                                  key={asg.id} 
                                  className="relative py-1 px-0.5 text-center border-l border-r border-slate-100 align-middle bg-amber-50/10"
                                >
                                  {isPickerOpen && canGradeSubject && !isMemberLockedReadOnly && !isAdminReadOnly ? (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-30 bg-transparent"
                                        onClick={() => setActiveScorePicker(null)}
                                      />
                                      <div className="relative z-40 flex items-center justify-center gap-1 py-0.5 animate-in fade-in zoom-in-95">
                                        {activeRubricLevels.map((rubric) => {
                                          const isSelected = scoreVal === rubric.level;
                                          return (
                                            <button
                                              key={rubric.level}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetRubricScore(student.id, asg.id, rubric.level);
                                                setActiveScorePicker(null);
                                              }}
                                              title={`ระดับ ${rubric.level}: ${rubric.label}`}
                                              className={`w-6 h-6 rounded text-[11px] font-bold font-mono transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 ${
                                                isSelected
                                                  ? 'bg-amber-600 text-white ring-2 ring-amber-300 scale-105 shadow-xs font-black'
                                                  : 'bg-amber-100 hover:bg-amber-500 hover:text-white text-amber-950 border border-amber-300 font-bold'
                                              }`}
                                            >
                                              {rubric.level}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={!canGradeSubject || isMemberLockedReadOnly || isAdminReadOnly}
                                      onClick={() => {
                                        if (!canGradeSubject || isMemberLockedReadOnly || isAdminReadOnly) {
                                          return;
                                        }
                                        setActiveScorePicker(prev => 
                                          prev?.studentId === student.id && prev?.assignmentId === asg.id
                                            ? null
                                            : { studentId: student.id, assignmentId: asg.id }
                                        );
                                      }}
                                      className={`w-7 h-7 mx-auto rounded-lg text-[11px] font-mono font-bold transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
                                        !canGradeSubject || isMemberLockedReadOnly || isAdminReadOnly
                                          ? 'cursor-default opacity-85'
                                          : 'hover:scale-105 active:scale-95'
                                      } ${
                                        scoreVal === 3
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : scoreVal === 2
                                          ? 'bg-sky-600 text-white shadow-xs'
                                          : scoreVal === 1
                                          ? 'bg-amber-500 text-white shadow-xs'
                                          : scoreVal && scoreVal > 3
                                          ? 'bg-indigo-600 text-white shadow-xs'
                                          : 'bg-white hover:bg-amber-50 text-slate-400 hover:text-amber-800 border border-dashed border-slate-300'
                                      }`}
                                      title={
                                        scoreVal
                                          ? `ระดับคะแนน ${scoreVal}: ${currentLevelObj?.label || ''}`
                                          : 'คลิกเพื่อเลือกระดับคะแนน 1, 2, 3'
                                      }
                                    >
                                      {scoreVal ? (
                                        <span className="font-mono text-xs font-bold">{scoreVal}</span>
                                      ) : (
                                        <span className="text-[11px] text-slate-400 font-normal">-</span>
                                      )}
                                    </button>
                                  )}
                                </td>
                              );
                            })}

                            {/* Empty TD for + column header */}
                            {canManageKindergartenTopics && (
                              <td className="py-1 px-0.5 text-center border-l border-r border-dashed border-amber-200/60 bg-amber-50/10 align-middle"></td>
                            )}

                            {/* 1. สรุปคะแนนเชิงปริมาณ (ตัวเลข 1, 2, 3...) */}
                            <td className="py-1 px-1 text-center border-l border-slate-200 bg-amber-50/20 align-middle">
                              {pageSummary.score !== null ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className={`inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 font-mono font-black text-[11px] rounded shadow-2xs border ${
                                    pageSummary.score === 3 ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                                    pageSummary.score === 2 ? 'bg-sky-100 text-sky-900 border-sky-300' :
                                    pageSummary.score === 1 ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                    'bg-indigo-100 text-indigo-900 border-indigo-300'
                                  }`}>
                                    {pageSummary.score}
                                  </span>
                                  {pageSummary.average && displayedKindergartenAssignments.length > 1 && (
                                    <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                                      เฉลี่ย {pageSummary.average}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] font-medium">-</span>
                              )}
                            </td>

                            {/* 2. สรุประดับคะแนนเชิงคุณภาพ (คำอธิบายคุณภาพตามที่ Admin กำหนดใน +วิชา) */}
                            <td className="py-1 px-1.5 text-center border-l border-slate-200 bg-amber-50/40 align-middle">
                              {pageSummary.score !== null ? (
                                <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded shadow-2xs border ${
                                  pageSummary.score === 3 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                  pageSummary.score === 2 ? 'bg-sky-100 text-sky-800 border-sky-300' :
                                  pageSummary.score === 1 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                  'bg-indigo-100 text-indigo-800 border-indigo-300'
                                }`}>
                                  {pageSummary.label}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-medium">ยังไม่ประเมิน</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-2 w-10 text-center">เลขที่</th>
                    <th className="py-3 px-2 w-16 text-center">รหัส</th>
                    <th className="py-3 px-3 min-w-[130px]">ชื่อ - นามสกุล</th>

                    {/* Dynamic Assignment Columns (Narrow, 2-3 lines title, no "เติมทุกคน", no "เต็ม 5 คะแนน") */}
                    {displayedAssignments.map((asg) => (
                      <th 
                        key={asg.id} 
                        className="py-2 px-1 text-center bg-amber-50/50 border-l border-r border-slate-200/80 w-16 min-w-[62px] max-w-[76px] align-top"
                      >
                        <div className="flex flex-col items-center justify-between min-h-[58px]">
                          <div 
                            className="line-clamp-2 text-[11px] font-bold text-slate-800 leading-tight text-center break-words px-0.5" 
                            title={asg.name}
                          >
                            {asg.name}
                          </div>

                          {asg.unitNumber && selectedUnit === null && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.2 rounded-full border border-amber-200 mt-0.5">
                              หน่วย {asg.unitNumber}
                            </span>
                          )}

                          {canGradeSubject && (
                            <div className="flex items-center justify-center gap-1 mt-1 pt-1 border-t border-amber-200/50 w-full">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAssignment(asg);
                                  setAssignmentNameInput(asg.name);
                                  setAssignmentUnitInput(asg.unitNumber || 1);
                                }}
                                className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-100/70 rounded-md transition-colors cursor-pointer"
                                title="เปลี่ยนชื่อช่องงาน"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAssignment(asg.id, asg.name);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-md transition-colors cursor-pointer"
                                title="ลบช่องงานนี้"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </th>
                    ))}

                    {/* ปุ่มไอคอน '+' ตรงตารางข้างช่องงาน สำหรับเพิ่มช่องงาน */}
                    {!isAdminReadOnly && (
                      <th className="py-2 px-1 text-center bg-amber-50/30 border-l border-r border-dashed border-amber-300 w-10 min-w-[42px] align-middle">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canGradeSubject) {
                              onShowToast('warning', 'ต้องลงทะเบียนก่อน', 'สมาชิกต้องลงทะเบียนรายวิชานี้ก่อนจึงจะสามารถเพิ่มช่องงานได้');
                              return;
                            }
                            const targetUnit = selectedUnit || 1;
                            const countInUnit = assignmentItems.filter(a => (a.unitNumber || 1) === targetUnit).length;
                            setAssignmentNameInput(`งานที่ ${countInUnit + 1}`);
                            setAssignmentUnitInput(targetUnit);
                            setIsAddAssignmentModalOpen(true);
                          }}
                          disabled={!canGradeSubject || isMemberLockedReadOnly}
                          className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all ${
                            canGradeSubject && !isMemberLockedReadOnly
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 shadow-2xs hover:scale-105 active:scale-95 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                          }`}
                          title="เพิ่มช่องงาน (+)"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </th>
                    )}

                    {/* ตารางสรุปคะแนนเต็มของหน่วยที่เลือกไว้ข้างหน้าตารางคะแนนระหว่างภาค (แสดงเฉพาะหน่วยที่เลือก) */}
                    {selectedUnit !== null && (() => {
                      const detail = selectedSubject?.learningUnitDetails?.find(d => d.unitNumber === selectedUnit);
                      const uName = detail?.name ? detail.name : `หน่วยที่ ${selectedUnit}`;
                      const uMaxScore = typeof detail?.score === 'number' && detail.score > 0 
                        ? detail.score 
                        : Math.round((selectedSubject?.courseworkScore || 70) / (currentSubjectUnits.length || 1));

                      return (
                        <th 
                          key={`uhead-${selectedUnit}`} 
                          className="py-2 px-1 text-center bg-amber-100/80 border-l border-r border-amber-300/80 w-16 min-w-[58px] max-w-[76px] align-top"
                          title={`สรุปคะแนน ${uName} (เต็ม ${uMaxScore} คะแนน)`}
                        >
                          <div className="flex flex-col items-center justify-between min-h-[58px]">
                            <div className="line-clamp-2 text-[10px] font-bold text-amber-950 leading-tight text-center break-words px-0.5">
                              {uName}
                            </div>
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-200/90 px-1.5 py-0.2 rounded-full mt-0.5 border border-amber-300">
                              เต็ม {uMaxScore}
                            </span>
                          </div>
                        </th>
                      );
                    })()}

                    <th className={`py-2 px-1 text-center w-20 min-w-[72px] max-w-[84px] transition-colors ${
                      isCourseworkInputUnlocked 
                        ? 'bg-amber-100/90 text-amber-950 border-x-2 border-amber-400 shadow-xs' 
                        : 'bg-indigo-50/40 text-indigo-950'
                    }`}>
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="text-[11px] font-bold">ระหว่างภาค</span>
                        <span className="text-[9px] font-normal text-indigo-700">
                          ({selectedSubject?.courseworkScore || 70})
                        </span>
                        {canGradeSubject && !isAdminReadOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextState = !isCourseworkInputUnlocked;
                              setIsCourseworkInputUnlocked(nextState);
                              if (nextState) {
                                onShowToast(
                                  'info',
                                  'เปิดโหมดกรอกคะแนนระหว่างภาค ✏️',
                                  `สามารถพิมพ์คะแนนลงในช่องระหว่างภาคได้แล้ว (ห้ามเกินเต็ม ${selectedSubject?.courseworkScore || 70} คะแนน)`
                                );
                              } else {
                                onShowToast(
                                  'info',
                                  'ล็อกคะแนนระหว่างภาค 🔒',
                                  'ปิดโหมดพิมพ์คะแนนระหว่างภาคแล้ว'
                                );
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-all shadow-xs cursor-pointer ${
                              isCourseworkInputUnlocked
                                ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-300'
                                : 'bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50 hover:text-indigo-900'
                            }`}
                            title={isCourseworkInputUnlocked ? "คลิกเพื่อล็อกช่องระหว่างภาค" : "คลิกเพื่อปลดล็อกให้พิมพ์กรอกคะแนนระหว่างภาค"}
                          >
                            {isCourseworkInputUnlocked ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>กรอกได้</span>
                              </>
                            ) : (
                              <>
                                <span>กดกรอก</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </th>

                    <th className="py-2 px-1 text-center w-14 min-w-[52px] max-w-[62px]">
                      ปลายภาค
                      <span className="block text-[9px] font-normal text-slate-500">
                        ({selectedSubject?.examScore || 30})
                      </span>
                    </th>

                    <th className="py-2 px-1 text-center w-12 min-w-[46px] max-w-[56px]">
                      รวม
                      <span className="block text-[9px] font-normal text-slate-500">
                        ({selectedSubject?.totalScore || 100})
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {gradeStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6 + displayedAssignments.length + (!isAdminReadOnly ? 1 : 0) + (selectedUnit !== null ? 1 : 0)} className="py-12 text-center text-slate-400">
                        ยังไม่มีนักเรียนในระดับชั้น {selectedSubject?.gradeLevel} (สามารถเพิ่มข้อมูลนักเรียนได้ที่เมนู "ข้อมูลพื้นฐานและธุรการชั้นเรียน")
                      </td>
                    </tr>
                  ) : (
                    gradeStudents.map((student, idx) => {
                      const row = scoreRows[student.id] || { 
                        coursework: 0, 
                        exam: 0, 
                        readingWriting: 3, 
                        characteristics: 3, 
                        competency: 3,
                        assignmentScores: {}
                      };

                      const total = Math.min(
                        selectedSubject?.totalScore || 100,
                        (Number(row.coursework) || 0) + (Number(row.exam) || 0)
                      );

                      return (
                        <tr key={student.id} className="hover:bg-amber-50/20 transition-colors">
                          <td className="py-2.5 px-2 text-center">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs inline-flex items-center justify-center tabular-nums">
                              {student.rollNumber ?? (idx + 1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-medium text-slate-600 tabular-nums text-xs">
                            {student.studentCode || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                {student.photoUrl ? (
                                  <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setMobileGradingStudentId(student.id)}
                                className="text-left hover:text-amber-700 hover:underline flex items-center gap-1.5 cursor-pointer font-semibold group/stname"
                                title="คลิกที่ชื่อเพื่อเปิดหน้าต่างลงคะแนนรายบุคคล"
                              >
                                <span>{student.prefix}{student.firstName} {student.lastName}</span>
                                <ChevronRight className="w-3 h-3 text-slate-300 group-hover/stname:text-amber-600 opacity-60 group-hover/stname:opacity-100 transition-all group-hover/stname:translate-x-0.5" />
                              </button>
                            </div>
                          </td>

                          {/* Dynamic Assignment Columns: Click to open score picker (0, 1, 2, 3, 4, 5) */}
                          {displayedAssignments.map((asg) => {
                            const isScoreSet = row.assignmentScores?.[asg.id] !== undefined;
                            const currentVal = isScoreSet ? row.assignmentScores?.[asg.id] : undefined;
                            const isPickerOpen = 
                              activeScorePicker?.studentId === student.id && 
                              activeScorePicker?.assignmentId === asg.id;

                            return (
                              <td 
                                key={asg.id} 
                                className="relative py-2 px-1 text-center bg-amber-50/20 border-l border-r border-slate-200/60 w-16 min-w-[62px] max-w-[76px]"
                              >
                                <button
                                  type="button"
                                  disabled={!canGradeSubject}
                                  onClick={() => {
                                    if (!canGradeSubject) {
                                      if (isMemberLockedReadOnly) {
                                        onShowToast('warning', 'ภาคเรียนนี้ถูกล็อก 🔒', `ภาคเรียนที่ ${currentSemester} ถูกล็อกการกรอกคะแนนโดยผู้ดูแลระบบ เพื่อป้องกันการกรอกผิดภาคเรียน`);
                                      } else if (isAdminReadOnly) {
                                        onShowToast('info', 'โหมดดูคะแนนเท่านั้น', 'ผู้ดูแลระบบไม่สามารถปรับแก้คะแนนของสมาชิกที่ลงทะเบียนได้');
                                      } else {
                                        onShowToast('warning', 'ต้องลงทะเบียนก่อน', 'สมาชิกต้องลงทะเบียนรายวิชานี้ก่อนจึงจะสามารถลงคะแนนได้');
                                      }
                                      return;
                                    }
                                    setActiveScorePicker(prev => 
                                      prev?.studentId === student.id && prev?.assignmentId === asg.id
                                        ? null
                                        : { studentId: student.id, assignmentId: asg.id }
                                    );
                                  }}
                                  className={`w-9 h-9 rounded-xl font-mono font-bold text-xs mx-auto flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                                    !canGradeSubject ? 'opacity-85 cursor-not-allowed bg-slate-100 text-slate-700 border border-slate-200' :
                                    currentVal === 5 ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700' :
                                    currentVal === 4 ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600' :
                                    currentVal === 3 ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700' :
                                    currentVal === 2 ? 'bg-amber-500 text-white shadow-xs hover:bg-amber-600' :
                                    currentVal === 1 ? 'bg-orange-500 text-white shadow-xs hover:bg-orange-600' :
                                    currentVal === 0 ? 'bg-rose-500 text-white shadow-xs hover:bg-rose-600' :
                                    'bg-slate-100 hover:bg-slate-200 text-slate-400 font-normal border border-dashed border-slate-300'
                                  }`}
                                  title={
                                    isAdminReadOnly
                                      ? 'ผู้ดูแลระบบ: โหมดดูคะแนนเท่านั้น (ครูผู้สอนเป็นผู้ลงคะแนน)'
                                      : !canGradeSubject
                                      ? 'สมาชิกต้องลงทะเบียนรายวิชาก่อนจึงจะสามารถลงคะแนนได้'
                                      : `คลิกเพื่อเลือกคะแนน (ปัจจุบัน: ${isScoreSet ? currentVal : '-'} คะแนน)`
                                  }
                                >
                                  {isScoreSet ? currentVal : '-'}
                                </button>

                                {/* Quick Score Picker Popover (ปรับให้แสดงด้านบนช่องสำหรับนักเรียนลำดับล่างๆ เพื่อให้กดคะแนนได้สะดวก) */}
                                {isPickerOpen && canGradeSubject && (() => {
                                  const isNearBottom = idx >= Math.max(2, Math.floor(gradeStudents.length / 2));
                                  return (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-40 bg-transparent"
                                        onClick={() => setActiveScorePicker(null)}
                                      />
                                      <div className={`absolute z-50 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 w-32 animate-in fade-in zoom-in-95 select-none ${
                                        isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                      }`}>
                                        <div className="text-[10px] font-bold text-slate-500 mb-1.5 text-center flex items-center justify-between">
                                          <span>เลือกคะแนน</span>
                                          <button 
                                            type="button" 
                                            onClick={() => setActiveScorePicker(null)}
                                            className="text-slate-400 hover:text-slate-600 text-xs px-1"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                          {[5, 4, 3, 2, 1, 0].map(val => (
                                            <button
                                              key={val}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectAssignmentScore(student.id, asg.id, val);
                                                setActiveScorePicker(null);
                                              }}
                                              className={`h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                                                currentVal === val 
                                                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300 scale-105' 
                                                  : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 active:scale-95'
                                              }`}
                                            >
                                              {val}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </td>
                            );
                          })}

                          {/* ช่องว่างในแถวนักเรียนข้างช่องงาน ตรงกับคอลัมน์ '+' */}
                          {!isAdminReadOnly && (
                            <td className="py-2 px-1 text-center bg-amber-50/10 border-l border-r border-dashed border-amber-200/50 w-10 min-w-[42px]">
                              <span className="text-slate-300 text-xs select-none">·</span>
                            </td>
                          )}

                          {/* สรุปคะแนนของหน่วยการเรียนรู้ที่เลือก */}
                          {selectedUnit !== null && (() => {
                            const { unitBreakdown } = calculateCourseworkScore(row.assignmentScores || {}, selectedSubject);
                            const unitData = unitBreakdown[selectedUnit];
                            const uEarned = unitData?.earned ?? 0;
                            const uMax = unitData?.max ?? 0;
                            const isUnitExceeded = uEarned > uMax;

                            return (
                              <td 
                                key={`ubody-${student.id}-${selectedUnit}`} 
                                className={`py-2 px-1 text-center border-l border-r border-amber-200/70 w-16 min-w-[58px] max-w-[76px] font-mono font-bold text-xs ${
                                  isUnitExceeded ? 'bg-rose-100 text-rose-700 font-extrabold ring-2 ring-rose-400' : 'bg-amber-50/40 text-amber-950'
                                }`}
                                title={`หน่วยที่ ${selectedUnit}: ได้ ${uEarned} / ${uMax} คะแนน`}
                              >
                                <span className="tabular-nums">{uEarned}</span>
                              </td>
                            );
                          })()}

                          {/* Coursework Score (กรอกพิมพ์ได้เมื่อกดปุ่มปลดล็อกที่หัวตาราง ห้ามเกินจำนวนเต็ม หากไม่กดปุ่มจะพิมพ์ไม่ได้) */}
                          <td className={`py-2 px-1 text-center w-20 min-w-[72px] max-w-[84px] ${
                            row.coursework > (selectedSubject?.courseworkScore || 70) 
                              ? 'bg-rose-100 text-rose-700 font-extrabold border border-rose-400 ring-2 ring-rose-300' 
                              : isCourseworkInputUnlocked
                                ? 'bg-amber-50/70 text-slate-800 border-x border-amber-200'
                                : 'bg-indigo-50/20 text-indigo-900'
                          }`}>
                            {isCourseworkInputUnlocked && canGradeSubject && !isAdminReadOnly ? (
                              <input
                                type="number"
                                min={0}
                                max={selectedSubject?.courseworkScore || 70}
                                value={row.coursework === 0 || row.coursework == null ? '' : row.coursework}
                                placeholder="-"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  handleScoreChange(student.id, 'coursework', val);
                                }}
                                className="w-14 text-center text-xs py-1 px-1 rounded-lg border-2 border-amber-400 bg-white font-mono font-bold text-slate-900 tabular-nums focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs placeholder:text-slate-400"
                                title={`พิมพ์คะแนนระหว่างภาค (ห้ามเกินเต็ม ${selectedSubject?.courseworkScore || 70} คะแนน)`}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center">
                                <span className={`font-mono font-bold text-xs tabular-nums ${row.coursework > (selectedSubject?.courseworkScore || 70) ? 'text-rose-700 font-black' : 'text-indigo-900'}`}>
                                  {row.coursework ? row.coursework : '-'}
                                </span>
                                {row.coursework > (selectedSubject?.courseworkScore || 70) && (
                                  <span className="text-[8px] font-bold text-rose-600 leading-tight">เกินเต็ม!</span>
                                )}
                                {!isCourseworkInputUnlocked && canGradeSubject && !isAdminReadOnly && (
                                  <span className="text-[8px] text-slate-400 flex items-center gap-0.5 mt-0.5" title="กดปุ่ม 'กดกรอก' ที่หัวตารางเพื่อพิมพ์คะแนน">
                                    ล็อก
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Exam Score */}
                          <td className="py-2 px-1 text-center w-14 min-w-[52px] max-w-[62px]">
                            <input
                              type="number"
                              disabled={!canGradeSubject}
                              min={0}
                              max={selectedSubject?.examScore || 30}
                              value={row.exam === 0 || row.exam == null ? '' : row.exam}
                              placeholder="-"
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                handleScoreChange(student.id, 'exam', val);
                              }}
                              title={isAdminReadOnly ? 'ผู้ดูแลระบบ: โหมดดูคะแนนเท่านั้น' : undefined}
                              className={`w-12 text-center text-xs py-1 px-1 rounded-lg border border-slate-200 font-mono font-semibold tabular-nums focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400 ${!canGradeSubject ? 'bg-slate-100 text-slate-700 cursor-not-allowed font-bold' : ''}`}
                            />
                          </td>

                          {/* Total Score */}
                          <td className="py-2 px-1 text-center font-mono font-bold text-slate-800 tabular-nums text-xs w-12 min-w-[46px] max-w-[56px]">
                            {total}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )}

        {/* ส่วนรายวิชา/สมาชิกที่ยังไม่ลงทะเบียน: Admin เห็นทั้งสมาชิกและวิชา ส่วนสมาชิกเห็นเฉพาะรายวิชาที่ยังไม่มีผู้สอน */}
        <div className="mt-6 space-y-4">
          <div className={`grid gap-4 ${user.role === 'admin' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Box 1: สมาชิกที่ยังไม่ลงทะเบียนวิชาสอน (มีเฉพาะ Admin ตามคำสั่ง) */}
            {user.role === 'admin' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold text-slate-800">
                      สมาชิกที่ยังไม่ลงทะเบียนวิชาสอน
                    </h4>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    unregisteredMembers.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {unregisteredMembers.length > 0 ? `${unregisteredMembers.length} คน` : 'ครบทุกคนแล้ว'}
                  </span>
                </div>

                <div className="p-3 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-80">
                  {unregisteredMembers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-emerald-600 font-medium flex flex-col items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                      <span>สมาชิกทุกคนได้ลงทะเบียนวิชาสอนในภาคเรียนที่ {currentSemester} ครบเรียบร้อยแล้ว</span>
                    </div>
                  ) : (
                    unregisteredMembers.map(mem => (
                      <div key={mem.id} className="py-2.5 px-3 flex items-center justify-between gap-2 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800">
                            {mem.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>ประจำชั้น: <strong>{mem.gradeLevel || 'ไม่ระบุ'}</strong></span>
                            <span>•</span>
                            <span>ตำแหน่ง: {mem.position || 'ครูผู้สอน'}</span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            <span>ยังไม่ลงทะเบียน</span>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Box 2: รายวิชาที่ยังไม่มีสมาชิกลงทะเบียนสอน (แสดงปุ่มชั้น อ.1 ถึง ม.3 ค่าเริ่มต้น ป.1 ไม่มีปุ่มทุกชั้น) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-slate-800">
                    รายวิชาที่ยังไม่มีสมาชิกลงทะเบียนสอน (ภาค {currentSemester})
                  </h4>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  sortedUnregisteredSubjects.filter(s => s.gradeLevel === unregisteredGradeFilter && normalizeRoom(s.room) === normalizeRoom(unregisteredRoomFilter)).length > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  ชั้น {unregisteredGradeFilter} (ห้อง {unregisteredRoomFilter}): {sortedUnregisteredSubjects.filter(s => s.gradeLevel === unregisteredGradeFilter && normalizeRoom(s.room) === normalizeRoom(unregisteredRoomFilter)).length} วิชา
                </span>
              </div>

              {/* แถบปุ่มเลือกชั้นเรียน อ.1 ถึง ม.3 (หากชั้นไหนมีรายชื่อนักเรียนหลายห้อง เช่น ป.5 ห้อง 2 เมื่อกดปุ่ม ป.5 จะเลื่อนลงมาให้เลือกห้องได้ทันที) */}
              <div className="px-3 py-2.5 bg-slate-50/60 border-b border-slate-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {MODAL_ALLOWED_GRADES.map(grade => {
                    const gradeRooms = getRoomsForGrade(grade);
                    const hasMultipleRooms = gradeRooms.length > 1;
                    const isActive = unregisteredGradeFilter === grade;
                    const activeRoomForDisplay = isActive ? normalizeRoom(unregisteredRoomFilter) : '1';
                    const gradeCount = hasMultipleRooms && isActive
                      ? sortedUnregisteredSubjects.filter(s => s.gradeLevel === grade && normalizeRoom(s.room) === activeRoomForDisplay).length
                      : sortedUnregisteredSubjects.filter(s => s.gradeLevel === grade).length;
                    const isDropdownOpen = openUnregisteredGradeDropdown === grade;

                    return (
                      <div key={grade} className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (hasMultipleRooms) {
                              setUnregisteredGradeFilter(grade);
                              setOpenUnregisteredGradeDropdown(prev => (prev === grade ? null : grade));
                            } else {
                              setUnregisteredGradeFilter(grade);
                              setUnregisteredRoomFilter('1');
                              setOpenUnregisteredGradeDropdown(null);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                            isActive
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : gradeCount > 0
                              ? 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                              : 'bg-slate-100/70 text-slate-400 border-slate-200/60 hover:bg-slate-100'
                          }`}
                        >
                          <span>
                            {grade}
                            {hasMultipleRooms && isActive ? ` (ห้อง ${activeRoomForDisplay})` : ''}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              isActive
                                ? 'bg-white/25 text-white'
                                : gradeCount > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200/70 text-slate-400'
                            }`}
                          >
                            {gradeCount}
                          </span>
                          {hasMultipleRooms && (
                            <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                          )}
                        </button>

                        {hasMultipleRooms && isDropdownOpen && (
                          <div className="absolute left-0 top-full mt-1 z-30 min-w-[150px] bg-white rounded-xl border border-amber-200 shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            {gradeRooms.map(rm => {
                              const rmSubCount = sortedUnregisteredSubjects.filter(
                                s => s.gradeLevel === grade && normalizeRoom(s.room) === rm
                              ).length;
                              const isSelectedRoom = isActive && normalizeRoom(unregisteredRoomFilter) === rm;
                              return (
                                <button
                                  key={rm}
                                  type="button"
                                  onClick={() => {
                                    setUnregisteredGradeFilter(grade);
                                    setUnregisteredRoomFilter(rm);
                                    setOpenUnregisteredGradeDropdown(null);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left text-xs font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                    isSelectedRoom
                                      ? 'bg-amber-50 text-amber-900'
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>{grade} ห้อง {rm}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                    isSelectedRoom
                                      ? 'bg-amber-600 text-white'
                                      : rmSubCount > 0
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {rmSubCount} วิชา
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-80">
                {currentSemSubjects.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium flex flex-col items-center gap-2">
                    <BookOpen className="w-6 h-6 text-slate-300" />
                    <span>ยังไม่มีรายวิชาที่เปิดในภาคเรียนที่ {currentSemester} (ปีการศึกษา {currentAcademicYear})</span>
                  </div>
                ) : sortedUnregisteredSubjects.filter(s => s.gradeLevel === unregisteredGradeFilter && normalizeRoom(s.room) === normalizeRoom(unregisteredRoomFilter)).length === 0 ? (
                  <div className="py-8 text-center text-xs text-emerald-600 font-medium flex flex-col items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                    <span>รายวิชาชั้น {unregisteredGradeFilter} (ห้อง {unregisteredRoomFilter}) ในภาคเรียนที่ {currentSemester} มีผู้สอนลงทะเบียนครบแล้ว หรือยังไม่มีรายวิชาในห้องนี้</span>
                  </div>
                ) : (
                  sortedUnregisteredSubjects
                    .filter(s => s.gradeLevel === unregisteredGradeFilter && normalizeRoom(s.room) === normalizeRoom(unregisteredRoomFilter))
                    .map(sub => (
                      <div key={sub.id} className="py-3 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50 rounded-xl transition-colors">
                        <div className="min-w-0 space-y-1">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-200 text-xs">
                              ชั้น {sub.gradeLevel} • ห้อง {normalizeRoom(sub.room)}
                            </span>
                            {sub.isActivity && (
                              <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                                กิจกรรม
                              </span>
                            )}
                            <span>
                              {!sub.isActivity && isKindergartenGrade(sub.gradeLevel) ? `ด้านความสามารถ: ${sub.name}` : sub.name}
                            </span>
                            {sub.code && (
                              <span className="font-mono text-slate-500 text-xs">
                                ({sub.code})
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">
                              • {sub.hoursPerWeek} ชม./สัปดาห์
                            </span>
                          </div>

                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {user.role === 'member' ? (
                            <button
                              type="button"
                              onClick={() => handleTeacherEnrollSubject(sub)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                              title="คลิกเพื่อลงทะเบียนเป็นผู้สอนวิชานี้เพื่อเริ่มบันทึกคะแนน"
                            >
                              <UserCheck className="w-4 h-4" />
                              <span>ลงทะเบียนสอนวิชานี้</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-medium flex items-center gap-1">
                              <span>รอครูลงทะเบียน</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* TAB 2: ADDITIONAL ASSESSMENTS (ระบบประเมิน 3 เล่ม) */}
      {activeTab === 'assessments' && (
        <Assessment3Booklets
          user={user}
          students={students}
          subjects={subjects}
          grades={grades}
          currentGradeLevel={
            (allMembers.find(m => m.id === user.id || (m.username && user.username && m.username.toLowerCase() === user.username.toLowerCase()))?.gradeLevel as GradeLevel) ||
            (user.assignedGrade as GradeLevel) ||
            selectedSubject?.gradeLevel ||
            'ป.1'
          }
          currentSemester={currentSemester}
          currentAcademicYear={currentAcademicYear}
          isLocked={isMemberLockedReadOnly}
          onSaveGrades={onSaveBulkGrades}
          onShowToast={onShowToast}
        />
      )}

      {/* TAB 3: SUBJECT DEFINITIONS (ADMIN ONLY) */}
      {activeTab === 'subjects' && user.role === 'admin' && (
        <div className="space-y-3">
          {/* Top Bar: ปุ่มเพิ่มปี คัดลอกรายวิชา ลบ เพิ่มวิชา อยู่ข้างบนช่องกับภาคเรียน หน้าจะได้สะอาด */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* ปุ่ม วิชา */}
              <button
                type="button"
                onClick={() => handleOpenSubjectModal(null)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Admin เพิ่มรายวิชาใหม่"
              >
                <Plus className="w-4 h-4" />
                <span>วิชา</span>
              </button>

              {/* ปุ่ม คัดลอกวิชา */}
              <button
                type="button"
                onClick={() => {
                  const defaultSourceYear = academicYears.find(y => y !== currentAcademicYear) || currentAcademicYear || '2568';
                  const defaultGrade = MODAL_ALLOWED_GRADES.includes(selectedGradeFilter as GradeLevel)
                    ? selectedGradeFilter
                    : 'all';
                  setCopyModalSourceYear(defaultSourceYear);
                  setCopyModalSourceSemester(currentSemester);
                  setCopyModalSourceGrade(defaultGrade);
                  setCopyModalTargetRoom(selectedSubjectRoomFilter || '1');
                  setIsCopySubjectsModalOpen(true);
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="เลือกปีการศึกษา ภาคเรียน และชั้นเพื่อคัดลอกรายวิชา"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600" />
                <span>คัดลอกวิชา</span>
              </button>
            </div>


          </div>



          {/* Quick Filter Pills by Grade Level & Room Dropdown with Subject Count */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-500 mr-1 shrink-0">กรองระดับชั้น:</span>

              {/* ป.1 - ป.6 */}
              {(['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'] as const).map(grade => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGradeFilter(grade)}
                  className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
                    selectedGradeFilter === grade
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {grade}
                </button>
              ))}

              {/* มัธยมศึกษา */}
              {(() => {
                const isSecondary = selectedGradeFilter === 'มัธยม' || ['ม.1', 'ม.2', 'ม.3'].includes(selectedGradeFilter);
                return (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!['ม.1', 'ม.2', 'ม.3'].includes(selectedGradeFilter)) {
                          setSelectedGradeFilter('ม.1');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
                        isSecondary
                          ? 'bg-indigo-700 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      มัธยมศึกษา
                    </button>
                    {isSecondary && (
                      <div className="flex items-center gap-1 bg-indigo-50/90 border border-indigo-200/80 p-0.5 rounded-lg shrink-0 animate-in fade-in zoom-in-95 duration-150">
                        {(['ม.1', 'ม.2', 'ม.3'] as const).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setSelectedGradeFilter(g)}
                            className={`px-2 py-0.5 rounded-md font-bold text-xs shrink-0 transition-all cursor-pointer ${
                              selectedGradeFilter === g
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white text-indigo-700 hover:bg-indigo-100/70 border border-indigo-200/60'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* อนุบาล */}
              {(() => {
                const isKindergarten = selectedGradeFilter === 'อนุบาล' || ['อ.1', 'อ.2', 'อ.3'].includes(selectedGradeFilter);
                return (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!['อ.1', 'อ.2', 'อ.3'].includes(selectedGradeFilter)) {
                          setSelectedGradeFilter('อ.1');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
                        isKindergarten
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      อนุบาล
                    </button>
                    {isKindergarten && (
                      <div className="flex items-center gap-1 bg-amber-50/90 border border-amber-200/80 p-0.5 rounded-lg shrink-0 animate-in fade-in zoom-in-95 duration-150">
                        {(['อ.1', 'อ.2', 'อ.3'] as const).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setSelectedGradeFilter(g)}
                            className={`px-2 py-0.5 rounded-md font-bold text-xs shrink-0 transition-all cursor-pointer ${
                              selectedGradeFilter === g
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'bg-white text-amber-800 hover:bg-amber-100/70 border border-amber-200/60'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ปุ่มห้อง: เลื่อนลงมาให้เลือกห้องในการเพิ่ม/จัดการวิชาห้องนั้นๆ แยกกัน (หากไม่มีรายชื่อนักเรียนจะแสดง "ห้อง 1" อย่างเดียว) */}
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg shrink-0 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-900">ห้อง:</span>
                <select
                  value={selectedSubjectRoomFilter}
                  onChange={(e) => setSelectedSubjectRoomFilter(e.target.value)}
                  className="text-xs font-bold text-amber-950 bg-transparent focus:outline-none cursor-pointer"
                  title="เลือกห้องเรียน (หากไม่มีรายชื่อนักเรียนในชั้นนี้จะแสดง ห้อง 1 อย่างเดียว)"
                >
                  {subjectFilterRooms.map(rm => (
                    <option key={rm} value={rm}>
                      ห้อง {rm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="shrink-0">
              <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  ชั้น {selectedGradeFilter} ห้อง {selectedSubjectRoomFilter} (ภาค {currentSemester}):{' '}
                  {
                    currentSemSubjects.filter(sub => {
                      const matchGrade =
                        selectedGradeFilter === 'all'
                          ? true
                          : selectedGradeFilter === 'มัธยม'
                          ? sub.gradeLevel.startsWith('ม.')
                          : selectedGradeFilter === 'อนุบาล'
                          ? sub.gradeLevel.startsWith('อ.')
                          : sub.gradeLevel === selectedGradeFilter;
                      return matchGrade && normalizeRoom(sub.room) === normalizeRoom(selectedSubjectRoomFilter);
                    }).length
                  }{' '}
                  วิชา
                </span>
              </span>
            </div>
          </div>

          {/* รายการขนาดเล็กเรียงชั้นลงมาเลย */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden divide-y divide-slate-100">
            {(() => {
              const semSubjects = yearSubjects.filter(sub => (!sub.semester || sub.semester === currentSemester));
              const filtered = sortSubjectsByGrade(
                semSubjects.filter(sub => {
                  const matchGrade =
                    selectedGradeFilter === 'all'
                      ? true
                      : selectedGradeFilter === 'มัธยม'
                      ? sub.gradeLevel.startsWith('ม.')
                      : selectedGradeFilter === 'อนุบาล'
                      ? sub.gradeLevel.startsWith('อ.')
                      : sub.gradeLevel === selectedGradeFilter;
                  if (!matchGrade) return false;
                  return normalizeRoom(sub.room) === normalizeRoom(selectedSubjectRoomFilter);
                })
              );

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                    <div>ไม่พบรายวิชาในภาคเรียนที่ {currentSemester} ปีการศึกษา {currentAcademicYear} (ระดับชั้น {selectedGradeFilter} ห้อง {selectedSubjectRoomFilter})</div>
                    <div className="text-[11px] text-slate-400">
                      คุณสามารถกดปุ่ม "+ วิชา" หรือ "คัดลอกวิชา" ด้านบนเพื่อเพิ่มวิชาสำหรับห้อง {selectedSubjectRoomFilter}
                    </div>
                  </div>
                );
              }


              return filtered.map((sub, subIdx) => {
                const isDragging = draggedSubjectId === sub.id;
                const isDragOver = dragOverSubjectId === sub.id && draggedSubjectId !== sub.id;
                return (
                <div
                  key={sub.id}
                  data-subject-row-id={sub.id}
                  draggable={user.role === 'admin'}
                  onDragStart={(e) => {
                    if (user.role !== 'admin') return;
                    setDraggedSubjectId(sub.id);
                    e.dataTransfer.effectAllowed = 'move';
                    try {
                      e.dataTransfer.setData('text/plain', sub.id);
                    } catch {
                      // ignore
                    }
                  }}
                  onDragOver={(e) => {
                    if (user.role !== 'admin' || !draggedSubjectId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverSubjectId !== sub.id) {
                      setDragOverSubjectId(sub.id);
                    }
                  }}
                  onDragEnter={(e) => {
                    if (user.role !== 'admin' || !draggedSubjectId) return;
                    e.preventDefault();
                    if (dragOverSubjectId !== sub.id) {
                      setDragOverSubjectId(sub.id);
                    }
                  }}
                  onDrop={(e) => {
                    if (user.role !== 'admin') return;
                    e.preventDefault();
                    const sourceId = draggedSubjectId || e.dataTransfer.getData('text/plain');
                    if (sourceId && sourceId !== sub.id) {
                      handleReorderSubjects(sourceId, sub.id, filtered);
                    }
                    setDraggedSubjectId(null);
                    setDragOverSubjectId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedSubjectId(null);
                    setDragOverSubjectId(null);
                  }}
                  onTouchStart={() => {
                    if (user.role !== 'admin') return;
                    if (touchDragTimerRef.current) window.clearTimeout(touchDragTimerRef.current);
                    touchDragTimerRef.current = window.setTimeout(() => {
                      setDraggedSubjectId(sub.id);
                    }, 220);
                  }}
                  onTouchMove={(e) => {
                    if (user.role !== 'admin') return;
                    if (!draggedSubjectId) {
                      if (touchDragTimerRef.current) {
                        window.clearTimeout(touchDragTimerRef.current);
                        touchDragTimerRef.current = null;
                      }
                      return;
                    }
                    const touch = e.touches[0];
                    if (!touch) return;
                    const el = document.elementFromPoint(touch.clientX, touch.clientY);
                    const rowEl = el?.closest('[data-subject-row-id]') as HTMLElement | null;
                    const targetId = rowEl?.getAttribute('data-subject-row-id');
                    if (targetId && targetId !== dragOverSubjectId) {
                      setDragOverSubjectId(targetId);
                    }
                  }}
                  onTouchEnd={() => {
                    if (touchDragTimerRef.current) {
                      window.clearTimeout(touchDragTimerRef.current);
                      touchDragTimerRef.current = null;
                    }
                    if (user.role !== 'admin') return;
                    if (draggedSubjectId && dragOverSubjectId && draggedSubjectId !== dragOverSubjectId) {
                      handleReorderSubjects(draggedSubjectId, dragOverSubjectId, filtered);
                    }
                    setDraggedSubjectId(null);
                    setDragOverSubjectId(null);
                  }}
                  className={`py-2.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all select-none ${
                    user.role === 'admin' ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${
                    isDragging
                      ? 'bg-amber-50/90 opacity-60 ring-2 ring-amber-400 z-10'
                      : isDragOver
                      ? 'bg-indigo-50/90 border-t-2 border-indigo-500'
                      : 'hover:bg-slate-50/80'
                  }`}
                  title={user.role === 'admin' ? 'กดค้างแล้วลากขึ้น-ลงเพื่อจัดลำดับรายวิชา' : undefined}
                >
                  {/* Left: Drag Handle + Order number + Class badge, Code, Name, Hours/week, Semester, Ratio */}
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {user.role === 'admin' && (
                        <span
                          className="inline-flex items-center gap-0.5 text-slate-400 hover:text-amber-700 px-1 py-0.5 rounded-md bg-slate-100/80 border border-slate-200/80 text-[11px] font-mono font-bold shrink-0 cursor-grab active:cursor-grabbing"
                          title="กดค้างแล้วลากขึ้น-ลงเพื่อจัดลำดับ"
                        >
                          <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                          <span>{subIdx + 1}</span>
                        </span>
                      )}
                      <span className="font-bold text-amber-900 bg-amber-100/90 border border-amber-200/80 px-2 py-0.5 rounded-lg text-xs shrink-0">
                        ชั้น {sub.gradeLevel} • ห้อง {normalizeRoom(sub.room)}
                      </span>
                      {sub.isActivity && (
                        <span className="font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md text-xs shrink-0">
                          กิจกรรม
                        </span>
                      )}
                      {sub.code && (
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-xs shrink-0">
                          {sub.code}
                        </span>
                      )}
                      <span className="font-bold text-slate-800 text-xs truncate max-w-xs md:max-w-md">
                        {!sub.isActivity && isKindergartenGrade(sub.gradeLevel) ? `ด้านความสามารถ: ${sub.name}` : sub.name}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-amber-50/80 text-amber-800 border border-amber-200/70 shrink-0">
                        {sub.hoursPerWeek} ชั่วโมง/สัปดาห์
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                        sub.semester === '1'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200/80'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                      }`}>
                        ภาค {sub.semester}
                      </span>
                      {sub.isActivity ? (
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md font-semibold shrink-0">
                          เกณฑ์ประเมิน: ผ่าน / ไม่ผ่าน
                        </span>
                      ) : isKindergartenGrade(sub.gradeLevel) ? (
                        <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md font-semibold shrink-0">
                          หลักสูตรปฐมวัย พ.ศ. 2568 • {sub.hasKindergartenCompetency === false ? 'เฉพาะองค์ประกอบ/ประเด็น' : 'มีสมรรถนะ'} (เกณฑ์ {sub.rubricMaxLevel || 3} ระดับ)
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-600 font-mono shrink-0">
                          คะแนนเต็ม {sub.totalScore} (ระหว่างภาค {sub.courseworkScore} : สอบ {sub.examScore})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Teacher status & Action buttons with delete icon at far right */}
                  <div className="flex items-center gap-2 shrink-0 justify-between md:justify-end">
                    {sub.teacherName ? (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ครูผู้สอน: {sub.teacherName}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5 font-medium">
                        <span>ยังไม่มีผู้สอน (รอสมาชิกลงทะเบียน)</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 ml-auto">
                      {/* Withdraw Teacher Button: ถามเพื่อยืนยันก่อน */}
                      {sub.teacherName && (
                        <button
                          type="button"
                          onClick={() => setSubjectToWithdraw(sub)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                          title="ถอนชื่อผู้สอน (เพื่อเปิดให้สมาชิกลงทะเบียนใหม่)"
                        >
                          <UserMinus className="w-3.5 h-3.5 text-rose-600" />
                          <span>ถอนชื่อผู้สอน</span>
                        </button>
                      )}

                      {/* Edit Subject */}
                      <button
                        type="button"
                        onClick={() => handleOpenSubjectModal(sub)}
                        className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="แก้ไขรายวิชา"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Subject: ถามเพื่อยืนยันก่อน - ไอคอนลบอยู่ขวาสุด */}
                      <button
                        type="button"
                        onClick={() => setSubjectToDelete(sub)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200 ml-0.5"
                        title="ลบรายวิชา (ถามเพื่อยืนยันก่อน)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* MODAL: Admin Add/Edit Subject or Activity */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-amber-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  modalItemType === 'activity' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingSubject
                      ? (modalItemType === 'activity' ? 'แก้ไขกิจกรรม' : 'แก้ไขโครงสร้างรายวิชา')
                      : (modalItemType === 'activity' ? 'กิจกรรมใหม่' : 'เพิ่มรายวิชาใหม่')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalItemType === 'activity'
                      ? 'กำหนดรหัสกิจกรรม ระดับชั้น ชม./สัปดาห์ และภาคเรียน (ประเมินผล ผ่าน - ไม่ผ่าน)'
                      : 'กำหนดข้อมูลวิชา สัดส่วนคะแนน และจำนวนหน่วยการเรียนรู้'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* แถบสลับหน้า: เพิ่มรายวิชาใหม่ / กิจกรรมใหม่ */}
            {!editingSubject && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setModalItemType('subject')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    modalItemType === 'subject'
                      ? 'bg-white text-amber-900 shadow-xs border border-amber-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>เพิ่มรายวิชาใหม่</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalItemType('activity')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    modalItemType === 'activity'
                      ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>กิจกรรมใหม่</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveSubjectSubmit} className="space-y-3.5">
              {modalItemType === 'activity' ? (
                <div key={`activity-form-${editingSubject?.id || 'new'}`} className="space-y-3.5">
                  <div className="grid grid-cols-3 gap-3">
                    <div key="activity-code-field">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสกิจกรรม *</label>
                      <input
                        type="text"
                        name="code"
                        required
                        placeholder="เช่น ก11901"
                        defaultValue={editingSubject?.code || ''}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                    <div key="activity-grade-field">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกชั้น *</label>
                      <select
                        name="gradeLevel"
                        value={modalGradeLevel || 'ป.1'}
                        onChange={(e) => {
                          const newG = e.target.value as GradeLevel;
                          setModalGradeLevel(newG);
                          const rooms = getRoomsForGrade(newG);
                          if (!rooms.includes(modalRoom)) {
                            setModalRoom(rooms[0] || '1');
                          }
                        }}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white cursor-pointer"
                      >
                        {MODAL_ALLOWED_GRADES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div key="activity-room-field">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกห้อง *</label>
                      <select
                        name="room"
                        value={modalRoom}
                        onChange={(e) => setModalRoom(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white cursor-pointer"
                      >
                        {modalAvailableRooms.map(rm => (
                          <option key={rm} value={rm}>ห้อง {rm}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div key="activity-name-field">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อกิจกรรม *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={activityNamePresetInput ?? ''}
                      onChange={(e) => setActivityNamePresetInput(e.target.value)}
                      placeholder="เช่น แนะแนว, ลูกเสือ-เนตรนารี, ชุมนุม, กิจกรรมเพื่อสังคมและสาธารณประโยชน์"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="text-[10px] text-slate-400">เลือกด่วน:</span>
                      {['กิจกรรมแนะแนว', 'ลูกเสือ-เนตรนารี', 'กิจกรรมชุมนุม', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์'].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setActivityNamePresetInput(preset)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/80 transition-colors cursor-pointer font-medium"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ชม./สัปดาห์ *</label>
                      <input
                        type="number"
                        name="hoursPerWeek"
                        min={1}
                        required
                        defaultValue={editingSubject?.hoursPerWeek || 1}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ภาคเรียน *</label>
                      <select
                        name="semester"
                        defaultValue={editingSubject?.semester || currentSemester}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white cursor-pointer"
                      >
                        <option value="1">ภาคเรียนที่ 1</option>
                        <option value="2">ภาคเรียนที่ 2</option>
                        {!editingSubject && <option value="both">ทั้ง 2 ภาคเรียน (เทอม 1 และ เทอม 2)</option>}
                      </select>
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80 flex items-center gap-2 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      สมาชิกที่ลงทะเบียนกิจกรรมนี้จะประเมินผลนักเรียนโดยเลือก <strong>ผ่าน</strong> หรือ <strong>ไม่ผ่าน</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div key={`subject-form-${editingSubject?.id || 'new'}`} className="space-y-3.5">
                  <div className={`grid ${isKindergartenGrade(modalGradeLevel) ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                    {!isKindergartenGrade(modalGradeLevel) && (
                      <div key="subject-code-field">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสวิชา *</label>
                        <input
                          type="text"
                          name="code"
                          required
                          placeholder="เช่น ท11101"
                          defaultValue={editingSubject?.code || ''}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                        />
                      </div>
                    )}
                    <div key="subject-grade-field">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ระดับชั้น *</label>
                      <select
                        name="gradeLevel"
                        value={modalGradeLevel || 'ป.1'}
                        onChange={(e) => {
                          const newGrade = e.target.value as GradeLevel;
                          setModalGradeLevel(newGrade);
                          const rooms = getRoomsForGrade(newGrade);
                          if (!rooms.includes(modalRoom)) {
                            setModalRoom(rooms[0] || '1');
                          }
                          if (isKindergartenGrade(newGrade)) {
                            if (kindergartenCompetencies.length === 0) {
                              setKindergartenCompetencies([{ id: `comp-${Date.now()}-1`, title: '', elements: [''] }]);
                            }
                          }
                        }}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white cursor-pointer"
                      >
                        {MODAL_ALLOWED_GRADES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div key="subject-room-field">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">เลือกห้อง *</label>
                      <select
                        name="room"
                        value={modalRoom}
                        onChange={(e) => setModalRoom(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white cursor-pointer"
                      >
                        {modalAvailableRooms.map(rm => (
                          <option key={rm} value={rm}>ห้อง {rm}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div key="subject-name-field">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isKindergartenGrade(modalGradeLevel) ? 'ด้านความสามารถ *' : 'ชื่อรายวิชา *'}
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={subjectNameInput}
                      onChange={(e) => setSubjectNameInput(e.target.value)}
                      placeholder={
                        isKindergartenGrade(modalGradeLevel)
                          ? 'ระบุชื่อด้านความสามารถ (เช่น การเคลื่อนไหวและสุขภาวะทางกาย, พัฒนาการด้านอารมณ์...)'
                          : 'เช่น ภาษาไทยพื้นฐาน 1'
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  {/* สำหรับ อ.1, อ.2, อ.3 เท่านั้น: ปุ่ม ON/OFF ช่องสมรรถนะ + องค์ประกอบ/ประเด็น (หลักสูตรปฐมวัย พ.ศ. 2568) */}
                  {isKindergartenGrade(modalGradeLevel) && (
                    <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/90 space-y-3">
                      {/* แถบหัวข้อพร้อมปุ่มสวิตช์ ON / OFF สมรรถนะ */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-amber-200/80">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-amber-950">
                            ช่องสมรรถนะ ({modalGradeLevel})
                          </span>
                        </div>

                        {/* ปุ่มสวิตช์ ON / OFF สมรรถนะ */}
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-amber-300 shadow-2xs shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (!hasKindergartenCompetency) {
                                setHasKindergartenCompetency(true);
                                const hasAnyCompEls = kindergartenCompetencies.some(c =>
                                  c.elements.some(e => e.trim())
                                );
                                if (!hasAnyCompEls && kindergartenDirectElements.some(e => e.trim())) {
                                  setKindergartenCompetencies([
                                    {
                                      id: `comp-${Date.now()}-1`,
                                      title: '',
                                      elements: [...kindergartenDirectElements]
                                    }
                                  ]);
                                }
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              hasKindergartenCompetency
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <span>ON</span>
                            <span className="text-[10px] font-semibold opacity-90">(มีสมรรถนะ)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (hasKindergartenCompetency) {
                                setHasKindergartenCompetency(false);
                                const hasDirect = kindergartenDirectElements.some(e => e.trim());
                                if (!hasDirect) {
                                  const fromComps = kindergartenCompetencies
                                    .flatMap(c => c.elements)
                                    .filter(e => e.trim());
                                  if (fromComps.length > 0) {
                                    setKindergartenDirectElements(fromComps);
                                  }
                                }
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              !hasKindergartenCompetency
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <span>OFF</span>
                            <span className="text-[10px] font-semibold opacity-90">(เฉพาะองค์ประกอบ/ประเด็น)</span>
                          </button>
                        </div>
                      </div>

                      {!hasKindergartenCompetency ? (
                        /* โหมด OFF: แสดงเฉพาะ องค์ประกอบ/ประเด็น ของด้านความสามารถ */
                        <div className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <span className="text-xs font-bold text-amber-950">
                                องค์ประกอบ/ประเด็น ของด้านความสามารถ{subjectNameInput.trim() ? ` "${subjectNameInput.trim()}"` : ''}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setKindergartenDirectElements([...kindergartenDirectElements, ''])
                              }
                              className="px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>เพิ่มองค์ประกอบ/ประเด็น</span>
                            </button>
                          </div>

                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 pt-1">
                            {(kindergartenDirectElements.length > 0 ? kindergartenDirectElements : ['']).map((elVal, eIdx) => (
                              <div key={eIdx} className="flex items-center gap-2">
                                <span className="px-2.5 py-1.5 rounded-lg bg-amber-100/90 text-amber-900 font-bold text-[11px] shrink-0 border border-amber-200/80 whitespace-nowrap">
                                  องค์ประกอบ/ประเด็น {eIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={elVal ?? ''}
                                  onChange={(e) => {
                                    const next = [...(kindergartenDirectElements.length > 0 ? kindergartenDirectElements : [''])];
                                    next[eIdx] = e.target.value;
                                    setKindergartenDirectElements(next);
                                  }}
                                  placeholder={`ระบุองค์ประกอบ/ประเด็น ${eIdx + 1} ของด้านความสามารถนี้...`}
                                  className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                                />
                                {kindergartenDirectElements.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = kindergartenDirectElements.filter((_, idx) => idx !== eIdx);
                                      setKindergartenDirectElements(next.length > 0 ? next : ['']);
                                    }}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                                    title={`ลบองค์ประกอบ/ประเด็น ${eIdx + 1}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* โหมด ON: แสดงช่อง สมรรถนะ 1, 2... (ไม่บังคับพิมพ์) และ องค์ประกอบ/ประเด็น ย่อยใต้สมรรถนะ */
                        <>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-amber-900">
                              รายการสมรรถนะ และองค์ประกอบ/ประเด็น ย่อย ({kindergartenCompetencies.length} สมรรถนะ)
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setKindergartenCompetencies([
                                    ...kindergartenCompetencies,
                                    {
                                      id: `comp-${Date.now()}-${kindergartenCompetencies.length + 1}`,
                                      title: '',
                                      elements: ['']
                                    }
                                  ])
                                }
                                className="px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>เพิ่มสมรรถนะ</span>
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3 pt-1 max-h-80 overflow-y-auto pr-1">
                            {kindergartenCompetencies.map((comp, cIdx) => (
                              <div
                                key={comp.id || cIdx}
                                className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs space-y-2.5"
                              >
                                {/* ช่องสมรรถนะ (ไม่บังคับพิมพ์) */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded-md bg-amber-600 text-white font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                                        {cIdx + 1}
                                      </span>
                                      <span>สมรรถนะ {cIdx + 1}</span>
                                      <span className="text-[10px] font-normal text-slate-400">(ไม่บังคับพิมพ์)</span>
                                    </label>
                                    {kindergartenCompetencies.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setKindergartenCompetencies(
                                            kindergartenCompetencies.filter((_, i) => i !== cIdx)
                                          );
                                        }}
                                        className="px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                        title={`ลบสมรรถนะ ${cIdx + 1}`}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>ลบสมรรถนะ</span>
                                      </button>
                                    )}
                                  </div>

                                  <input
                                    type="text"
                                    value={comp.title ?? ''}
                                    onChange={(e) => {
                                      const next = [...kindergartenCompetencies];
                                      next[cIdx] = { ...next[cIdx], title: e.target.value };
                                      setKindergartenCompetencies(next);
                                    }}
                                    placeholder={`ระบุสมรรถนะ ${cIdx + 1} (ไม่บังคับพิมพ์)...`}
                                    className="w-full text-xs px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/30 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>

                                {/* องค์ประกอบ/ประเด็น ย่อยภายใต้สมรรถนะนี้ */}
                                <div className="pl-3 sm:pl-4 border-l-2 border-amber-300 space-y-2 pt-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-amber-900">
                                      องค์ประกอบย่อยของสมรรถนะ {cIdx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = [...kindergartenCompetencies];
                                        next[cIdx] = {
                                          ...next[cIdx],
                                          elements: [...(next[cIdx].elements || ['']), '']
                                        };
                                        setKindergartenCompetencies(next);
                                      }}
                                      className="px-2 py-1 text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                      <Plus className="w-3 h-3 stroke-[2.5]" />
                                      <span>เพิ่มองค์ประกอบ/ประเด็น</span>
                                    </button>
                                  </div>

                                  <div className="space-y-1.5">
                                    {(comp.elements && comp.elements.length > 0 ? comp.elements : ['']).map((elVal, eIdx) => (
                                      <div key={eIdx} className="flex items-center gap-2">
                                        <span className="px-2 py-1.5 rounded-lg bg-amber-100/80 text-amber-900 font-bold text-[11px] shrink-0 border border-amber-200/80 whitespace-nowrap">
                                          องค์ประกอบ/ประเด็น {eIdx + 1}
                                        </span>
                                        <input
                                          type="text"
                                          value={elVal ?? ''}
                                          onChange={(e) => {
                                            const next = [...kindergartenCompetencies];
                                            const nextEls = [...(next[cIdx].elements || [''])];
                                            nextEls[eIdx] = e.target.value;
                                            next[cIdx] = { ...next[cIdx], elements: nextEls };
                                            setKindergartenCompetencies(next);
                                          }}
                                          placeholder={`ระบุองค์ประกอบ/ประเด็น ${eIdx + 1} (เช่น สุขภาพอนามัย, การใช้กล้ามเนื้อมัดใหญ่...)`}
                                          className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                                        />
                                        {(comp.elements?.length || 1) > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const next = [...kindergartenCompetencies];
                                              const nextEls = (next[cIdx].elements || ['']).filter((_, idx) => idx !== eIdx);
                                              next[cIdx] = { ...next[cIdx], elements: nextEls.length > 0 ? nextEls : [''] };
                                              setKindergartenCompetencies(next);
                                            }}
                                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                                            title={`ลบองค์ประกอบ/ประเด็น ${eIdx + 1}`}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* สำหรับ อ.1, อ.2, อ.3: กำหนดระดับคะแนนคุณภาพว่าควรมีกี่ระดับ และในแต่ละระดับควรใช้คำไหน (เริ่มต้น 3 ระดับ: 1=ควรเสริม, 2=ได้บางครั้ง, 3=ปฏิบัติได้) */}
                  {isKindergartenGrade(modalGradeLevel) && (
                    <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/80 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-0.5">
                            ระดับคะแนนคุณภาพ (สำหรับตารางใส่คะแนน)
                          </label>
                        </div>

                        {/* ปุ่มเลือกระดับคะแนนว่าควรมีกี่ระดับ */}
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                          {[2, 3, 4, 5].map((cnt) => (
                            <button
                              key={cnt}
                              type="button"
                              onClick={() => handleRubricCountChange(cnt)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                kindergartenRubricCount === cnt
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {cnt} ระดับ{cnt === 3 ? ' (แนะนำ)' : ''}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ในแต่ละระดับควรใช้คำไหน ในการบอกคะแนนคุณภาพ */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        {kindergartenRubricLevels.slice(0, kindergartenRubricCount).map((lvl, lIdx) => (
                          <div key={lvl.level} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-white text-[11px] font-bold ${
                                  lvl.level === 3 ? 'bg-emerald-600' :
                                  lvl.level === 2 ? 'bg-amber-500' :
                                  lvl.level === 1 ? 'bg-rose-500' :
                                  lvl.level === 4 ? 'bg-sky-600' : 'bg-indigo-600'
                                }`}>
                                  {lvl.level}
                                </span>
                                <span>ระดับคะแนน {lvl.level}</span>
                              </span>
                            </div>
                            <input
                              type="text"
                              value={lvl.label ?? ''}
                              onChange={(e) => {
                                const next = [...kindergartenRubricLevels];
                                next[lIdx] = { ...next[lIdx], label: e.target.value };
                                setKindergartenRubricLevels(next);
                              }}
                              placeholder={`คำอธิบายระดับ ${lvl.level}`}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ชม./สัปดาห์</label>
                      <input
                        type="number"
                        name="hoursPerWeek"
                        defaultValue={editingSubject?.hoursPerWeek || 2}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ภาคเรียน</label>
                      <select
                        name="semester"
                        defaultValue={editingSubject?.semester || currentSemester}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white cursor-pointer"
                      >
                        <option value="1">ภาคเรียนที่ 1</option>
                        <option value="2">ภาคเรียนที่ 2</option>
                        {!editingSubject && <option value="both">ทั้ง 2 ภาคเรียน (เทอม 1 และ เทอม 2)</option>}
                      </select>
                    </div>
                  </div>

                  {/* สำหรับ ป.1 - ม.3 เท่านั้น: แสดงสัดส่วนคะแนนเต็ม ระหว่างภาค ปลายภาค */}
                  {!isKindergartenGrade(modalGradeLevel) && (
                    <div className="grid grid-cols-3 gap-3" key={`score-fields-${editingSubject?.id || (modalGradeLevel.startsWith('ป.') ? 'primary' : 'secondary')}`}>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">คะแนนเต็ม</label>
                        <input
                          type="number"
                          name="totalScore"
                          defaultValue={editingSubject?.totalScore ?? (modalGradeLevel.startsWith('ป.') ? 50 : 100)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">ระหว่างภาค</label>
                        <input
                          type="number"
                          name="courseworkScore"
                          defaultValue={editingSubject?.courseworkScore ?? (modalGradeLevel.startsWith('ป.') ? 35 : 70)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold text-amber-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">ปลายภาค (สอบ)</label>
                        <input
                          type="number"
                          name="examScore"
                          defaultValue={editingSubject?.examScore ?? (modalGradeLevel.startsWith('ป.') ? 15 : 30)}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold text-amber-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* สำหรับ ป.1 - ม.3 เท่านั้น: ส่วนกำหนดหน่วยที่ / หน่วยการเรียนรู้ */}
                  {!isKindergartenGrade(modalGradeLevel) && (
                    <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/90 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                            <span>หน่วยที่ / จำนวนหน่วยการเรียนรู้</span>
                          </label>
                          <p className="text-[11px] text-amber-800/80 mt-0.5">
                            พิมพ์ตัวเลข (เช่น 1, 2, 3...) ระบบจะแสดงช่องให้กรอกชื่อหน่วยและคะแนนเก็บตามจำนวน
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-bold text-amber-900">หน่วยที่:</span>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            placeholder="เช่น 2"
                            value={subjectUnitCountInput ?? ''}
                            onChange={(e) => handleUnitCountChange(e.target.value)}
                            className="w-20 text-xs px-2.5 py-1.5 text-center font-bold font-mono rounded-xl border border-amber-300 bg-white text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* รายการแสดงช่องกรอกชื่อหน่วย (ไม่บังคับ) และ คะแนนเก็บแต่ละหน่วย */}
                      {subjectUnitDetails.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-amber-200/70 max-h-56 overflow-y-auto pr-1">
                          {subjectUnitDetails.map((unitItem, uIdx) => (
                            <div
                              key={unitItem.unitNumber}
                              className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs flex items-center gap-2"
                            >
                              <span className="w-16 text-center text-[11px] font-bold text-amber-900 bg-amber-100/90 px-2 py-1.5 rounded-lg shrink-0 border border-amber-200/80">
                                หน่วยที่ {unitItem.unitNumber}
                              </span>

                              {/* ชื่อหน่วยการเรียนรู้ (ไม่บังคับ) */}
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  placeholder={`ชื่อหน่วยที่ ${unitItem.unitNumber} (ไม่บังคับชื่อหน่วย)`}
                                  value={unitItem.name ?? ''}
                                  onChange={(e) => {
                                    const next = [...subjectUnitDetails];
                                    next[uIdx] = { ...next[uIdx], name: e.target.value };
                                    setSubjectUnitDetails(next);
                                  }}
                                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                                />
                              </div>

                              {/* คะแนนเก็บกี่คะแนน */}
                              <div className="w-28 shrink-0 flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="คะแนนเก็บ"
                                  value={unitItem.score ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                    const next = [...subjectUnitDetails];
                                    next[uIdx] = { ...next[uIdx], score: val };
                                    setSubjectUnitDetails(next);
                                  }}
                                  className="w-full text-xs px-2 py-1.5 text-center font-bold font-mono rounded-lg border border-amber-200 bg-amber-50/40 text-amber-950 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                                <span className="text-[11px] text-slate-600 font-semibold shrink-0">คะแนน</span>
                              </div>
                            </div>
                          ))}

                          {/* แสดงสรุปคะแนนเก็บรวมของทุกหน่วย */}
                          {(() => {
                            const totalUnitsScore = subjectUnitDetails.reduce((sum, u) => sum + (Number(u.score) || 0), 0);
                            return (
                              <div className="flex items-center justify-between text-xs px-1 text-amber-950 font-semibold pt-1">
                                <span>
                                  รวมคะแนนเก็บทุกหน่วย: <strong className="font-bold text-amber-900 font-mono text-sm">{totalUnitsScore}</strong> คะแนน
                                </span>
                                {totalUnitsScore > 0 && (
                                  <span className="text-[11px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                                    คะแนนระหว่างภาค
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer ${
                    modalItemType === 'activity'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {editingSubject
                    ? 'บันทึกการแก้ไข'
                    : (modalItemType === 'activity' ? 'บันทึกกิจกรรม' : 'บันทึกวิชา')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: เพิ่มสมรรถนะและองค์ประกอบ/ประเด็น สำหรับอนุบาล (อ.1 - อ.3) */}
      {isAddKindergartenSubtopicModalOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    เพิ่มสมรรถนะใหม่ (หลักสูตรปฐมวัย 2568)
                  </h3>
                  <p className="text-xs text-slate-500">
                    วิชา {selectedSubject.name} ({selectedSubject.gradeLevel})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddKindergartenSubtopicModalOpen(false);
                  setNewKindergartenSubtopicInput('');
                  setNewKindergartenStandardInput('');
                  setNewKindergartenIndicatorInput('');
                  setNewKindergartenElementsInput(['']);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddKindergartenSubtopicSubmit(
                  newKindergartenSubtopicInput,
                  newKindergartenStandardInput,
                  newKindergartenIndicatorInput,
                  newKindergartenElementsInput
                );
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  สมรรถนะ {currentKindergartenSubtopics.length + 1}{' '}
                  <span className="text-[11px] font-normal text-slate-400">(ไม่บังคับพิมพ์)</span>
                </label>
                <input
                  type="text"
                  value={newKindergartenSubtopicInput}
                  onChange={(e) => setNewKindergartenSubtopicInput(e.target.value)}
                  placeholder="ระบุชื่อสมรรถนะ (ไม่บังคับพิมพ์)..."
                  autoFocus
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950">
                    องค์ประกอบย่อยใต้สมรรถนะ
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewKindergartenElementsInput([...newKindergartenElementsInput, ''])}
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>เพิ่มองค์ประกอบ/ประเด็น</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newKindergartenElementsInput.map((el, eIdx) => (
                    <div key={eIdx} className="flex items-center gap-2">
                      <span className="px-2 py-1.5 rounded-lg bg-white text-amber-900 font-bold text-[11px] shrink-0 border border-amber-200 whitespace-nowrap">
                        องค์ประกอบ/ประเด็น {eIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={el}
                        onChange={(e) => {
                          const next = [...newKindergartenElementsInput];
                          next[eIdx] = e.target.value;
                          setNewKindergartenElementsInput(next);
                        }}
                        placeholder={`ระบุองค์ประกอบ/ประเด็น ${eIdx + 1}...`}
                        className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {newKindergartenElementsInput.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNewKindergartenElementsInput(
                              newKindergartenElementsInput.filter((_, i) => i !== eIdx)
                            )
                          }
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddKindergartenSubtopicModalOpen(false);
                    setNewKindergartenSubtopicInput('');
                    setNewKindergartenStandardInput('');
                    setNewKindergartenIndicatorInput('');
                    setNewKindergartenElementsInput(['']);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มสมรรถนะ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: แก้ไขข้อมูลสมรรถนะสำหรับอนุบาล */}
      {subtopicToRename && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Edit className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    แก้ไขข้อมูลสมรรถนะ
                  </h3>
                  <p className="text-xs text-slate-500">
                    วิชา {selectedSubject.name} ({selectedSubject.gradeLevel})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubtopicToRename(null);
                  setRenameSubtopicInput('');
                  setRenameStandardInput('');
                  setRenameIndicatorInput('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEditKindergartenSubtopicSubmit(
                  subtopicToRename,
                  renameSubtopicInput,
                  renameStandardInput,
                  renameIndicatorInput
                );
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อสมรรถนะ <span className="text-[11px] font-normal text-slate-400">(ไม่บังคับพิมพ์)</span>
                </label>
                <input
                  type="text"
                  value={renameSubtopicInput}
                  onChange={(e) => setRenameSubtopicInput(e.target.value)}
                  placeholder="ระบุชื่อสมรรถนะ (ไม่บังคับพิมพ์)..."
                  autoFocus
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  คำอธิบายสมรรถนะ / มาตรฐานคุณลักษณะที่พึงประสงค์
                </label>
                <textarea
                  rows={2}
                  value={renameStandardInput}
                  onChange={(e) => setRenameStandardInput(e.target.value)}
                  placeholder="ระบุคำอธิบายสมรรถนะตามหลักสูตรปฐมวัย พ.ศ. 2568..."
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  หมายเหตุ / ตัวชี้วัดเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={renameIndicatorInput}
                  onChange={(e) => setRenameIndicatorInput(e.target.value)}
                  placeholder="ระบุรายละเอียดเพิ่มเติม..."
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const target = subtopicToRename;
                    setSubtopicToRename(null);
                    setRenameSubtopicInput('');
                    setRenameStandardInput('');
                    setRenameIndicatorInput('');
                    if (target) {
                      setSubtopicToDelete(target);
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบสมรรถนะนี้</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubtopicToRename(null);
                      setRenameSubtopicInput('');
                      setRenameStandardInput('');
                      setRenameIndicatorInput('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>บันทึกการแก้ไข</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ยืนยันการลบสมรรถนะสำหรับอนุบาล (อ.1 - อ.3) */}
      {subtopicToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800 truncate">
                  ยืนยันการลบสมรรถนะ
                </h3>
                <p className="text-xs text-rose-600 font-semibold truncate">
                  {subtopicToDelete}
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200/80 text-xs text-rose-900 space-y-1.5">
              <p className="font-semibold">
                คุณแน่ใจหรือไม่ว่าต้องการลบ "{subtopicToDelete}"?
              </p>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                ⚠️ องค์ประกอบ/ประเด็น และคะแนนพัฒนาการภายใต้สมรรถนะนี้จะถูกลบออกจากระบบ
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubtopicToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (subtopicToDelete) {
                    confirmDeleteKindergartenSubtopic(subtopicToDelete);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* (สรุปผลการประเมินปฐมวัย อ.1 - อ.3 แสดงเป็นตารางเรียงลำดับโดยตรงบนหน้าเว็บ ไม่ใช้ Pop-up ตามข้อกำหนด) */}

      {/* MODAL: เพิ่มองค์ประกอบ/ประเด็น ภายใต้สมรรถนะปัจจุบันสำหรับอนุบาล */}
      {isAddKindergartenColumnModalOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    เพิ่มองค์ประกอบ/ประเด็น {displayedKindergartenAssignments.length + 1}
                  </h3>
                  <p className="text-xs text-amber-900 font-semibold">
                    ภายใต้: {activeKindergartenSubtopic}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddKindergartenColumnModalOpen(false);
                  setNewKindergartenColumnInput('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddKindergartenColumnSubmit(newKindergartenColumnInput);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  องค์ประกอบ/ประเด็น {displayedKindergartenAssignments.length + 1} *
                </label>
                <input
                  type="text"
                  value={newKindergartenColumnInput}
                  onChange={(e) => setNewKindergartenColumnInput(e.target.value)}
                  placeholder={`เช่น กล้ามเนื้อมัดใหญ่, การเคลื่อนไหว หรือ องค์ประกอบ/ประเด็น ${displayedKindergartenAssignments.length + 1}...`}
                  autoFocus
                  required
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddKindergartenColumnModalOpen(false);
                    setNewKindergartenColumnInput('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!newKindergartenColumnInput.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>เพิ่มองค์ประกอบ/ประเด็น</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: แก้ไขชื่อองค์ประกอบ/ประเด็นในอนุบาล */}
      {kindergartenColumnToEdit && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Edit className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    แก้ไขชื่อองค์ประกอบ/ประเด็น
                  </h3>
                  <p className="text-xs text-slate-500">
                    ภายใต้: {activeKindergartenSubtopic}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKindergartenColumnToEdit(null);
                  setEditKindergartenColumnInput('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRenameKindergartenColumn(kindergartenColumnToEdit.id, editKindergartenColumnInput);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อองค์ประกอบ/ประเด็น *
                </label>
                <input
                  type="text"
                  value={editKindergartenColumnInput}
                  onChange={(e) => setEditKindergartenColumnInput(e.target.value)}
                  placeholder="ระบุชื่อองค์ประกอบ/ประเด็น..."
                  autoFocus
                  required
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setKindergartenColumnToEdit(null);
                    setEditKindergartenColumnInput('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!editKindergartenColumnInput.trim() || editKindergartenColumnInput.trim() === kindergartenColumnToEdit.name}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการเปลี่ยนชื่อ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Assignment Column */}
      {isAddAssignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    เพิ่มช่องคะแนนงาน / ชิ้นงานใหม่
                  </h3>
                  <p className="text-xs text-slate-500">
                    วิชา {selectedSubject?.code} {selectedSubject?.name} (ชั้น {selectedSubject?.gradeLevel})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddAssignmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อช่องคะแนนงาน / ภาระงาน *
                </label>
                <input
                  type="text"
                  value={assignmentNameInput}
                  onChange={(e) => setAssignmentNameInput(e.target.value)}
                  placeholder="เช่น งานที่ 1: แบบฝึกหัด, ใบงานที่ 2"
                  autoFocus
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  ตัวเลือกชื่อที่ใช้บ่อย (คลิกเพื่อเลือก):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    `งานที่ ${assignmentItems.length + 1}`,
                    'แบบฝึกหัด',
                    'ใบงาน',
                    'ชิ้นงาน/โมเดล',
                    'รายงาน/โครงงาน',
                    'การนำเสนอ',
                    'ทดสอบย่อย'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAssignmentNameInput(preset)}
                      className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg transition-colors border border-slate-200/80"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  หน่วยการเรียนรู้:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {currentSubjectUnits.map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setAssignmentUnitInput(u)}
                      className={`w-7 h-7 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        assignmentUnitInput === u
                          ? 'bg-amber-600 text-white ring-2 ring-amber-300 scale-105'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                      title={`หน่วยที่ ${u}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>



              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAssignmentModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={!assignmentNameInput.trim()}
                  onClick={() => handleAddAssignment(assignmentNameInput)}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มช่องคะแนนงาน</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Assignment Column Name */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                แก้ไขชื่อช่องคะแนนงาน
              </h3>
              <button
                onClick={() => setEditingAssignment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อช่องงาน *
                </label>
                <input
                  type="text"
                  value={assignmentNameInput}
                  onChange={(e) => setAssignmentNameInput(e.target.value)}
                  placeholder="ระบุชื่อช่องงาน"
                  autoFocus
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หน่วยการเรียนรู้:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentSubjectUnits.map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setAssignmentUnitInput(u)}
                      className={`w-7 h-7 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        assignmentUnitInput === u
                          ? 'bg-amber-600 text-white ring-2 ring-amber-300 scale-105'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                      title={`หน่วยที่ ${u}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteAssignment(editingAssignment.id, editingAssignment.name);
                    setEditingAssignment(null);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบช่องงานนี้</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAssignment(null)}
                    className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={!assignmentNameInput.trim()}
                    onClick={() => handleEditAssignment(editingAssignment.id, assignmentNameInput, assignmentUnitInput)}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
                  >
                    บันทึกชื่อใหม่
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ยืนยันการถอนชื่อผู้สอน (ถามเพื่อยืนยันก่อน) */}
      {subjectToWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  ยืนยันการถอนชื่อผู้สอน
                </h3>
                <p className="text-xs text-slate-500">
                  ถอนชื่อครูผู้สอนออกจากรายวิชา
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs text-amber-900 space-y-2">
              <p>
                คุณต้องการถอนชื่อ <strong>{subjectToWithdraw.teacherName}</strong> ออกจากรายวิชา <strong>{subjectToWithdraw.name} ({subjectToWithdraw.code})</strong> ชั้น {subjectToWithdraw.gradeLevel} <strong>ภาคเรียนที่ {subjectToWithdraw.semester}</strong> ใช่หรือไม่?
              </p>
              <p className="text-[11px] text-amber-900 font-bold leading-relaxed">
                • การถอนชื่อนี้จะมีผลเฉพาะ <strong>ภาคเรียนที่ {subjectToWithdraw.semester}</strong> เท่านั้น <strong>จะไม่กระทบหรือลบชื่อผู้สอนในอีกภาคเรียน</strong> และคะแนนทั้งหมดจะไม่ถูกลบ
              </p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                • เมื่อถอนชื่อแล้ว วิชานี้ในภาคเรียนที่ {subjectToWithdraw.semester} จะกลับสู่สถานะ "รอสมาชิกลงทะเบียน" เพื่อเปิดโอกาสให้สมาชิกท่านใหม่สามารถลงทะเบียนสอนได้
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubjectToWithdraw(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAdminWithdrawSubjectTeacher(subjectToWithdraw);
                  setSubjectToWithdraw(null);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UserMinus className="w-4 h-4" />
                <span>ยืนยันถอนชื่อผู้สอน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ยืนยันการลบรายวิชา (ถามเพื่อยืนยันก่อน) */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  ยืนยันการลบรายวิชา
                </h3>
                <p className="text-xs text-slate-500">
                  ลบรายวิชานี้ออกจากระบบอย่างถาวร
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/80 rounded-xl border border-rose-200/80 text-xs text-rose-900 space-y-2">
              <p>
                คุณต้องการลบรายวิชา <strong>{subjectToDelete.name} {subjectToDelete.code ? `(${subjectToDelete.code})` : ''}</strong> ชั้น {subjectToDelete.gradeLevel} ภาคเรียนที่ {subjectToDelete.semester} ใช่หรือไม่?
              </p>
              <div className="text-[11px] text-rose-700 leading-relaxed space-y-1">
                <p>• การลบนี้จะนำรายวิชาออกจากระบบปีการศึกษา {currentAcademicYear} ทันที</p>
                <p>• หากมีสมาชิกได้ลงทะเบียนสอนวิชานี้ไว้ รายวิชานี้ในหน้าสมาชิกจะถูกลบออกด้วยทันที</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  const deletingId = subjectToDelete.id;
                  const deletingName = subjectToDelete.name;
                  if (selectedSubjectId === deletingId) {
                    setSelectedSubjectId('');
                  }
                  onDeleteSubject(deletingId);
                  setSubjectToDelete(null);
                  onShowToast('info', 'ลบรายวิชาแล้ว', `ลบรายวิชา ${deletingName} ออกจากระบบและหน้าสมาชิกที่ลงทะเบียนเรียบร้อยแล้ว`);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบรายวิชา</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: เพิ่มปีการศึกษาถัดไป (สามารถคัดลอกรายวิชาปีการศึกษาก่อนหน้านี้ได้ โดยคะแนนห้ามตามเด็ดขาด) */}
      {isAddYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    เพิ่มปีการศึกษาใหม่
                  </h3>
                  <p className="text-xs text-slate-500">
                    เพิ่มปีการศึกษาถัดไปเพื่อจัดการรายวิชา
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddYearModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ปีการศึกษาใหม่ (พ.ศ.) *
                </label>
                <input
                  type="text"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="เช่น 2569"
                  autoFocus
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={copyPreviousSubjects}
                    onChange={(e) => setCopyPreviousSubjects(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    คัดลอกรายวิชาจากปีการศึกษาก่อนหน้านี้
                  </span>
                </label>

                {copyPreviousSubjects && (
                  <div className="pl-6 space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        เลือกปีการศึกษาต้นทางที่จะคัดลอก:
                      </label>
                      <select
                        value={sourceYearToCopy}
                        onChange={(e) => setSourceYearToCopy(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium cursor-pointer"
                      >
                        {academicYears.map(yr => (
                          <option key={yr} value={yr}>
                            ปีการศึกษา {yr} ({subjects.filter(s => isSubjectInYear(s, yr)).length} วิชา)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed space-y-1">
                      <div className="font-bold flex items-center gap-1 text-amber-800">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>เงื่อนไขความปลอดภัยตามระบบ:</span>
                      </div>
                      <p>• เพิ่มเฉพาะ <strong>รายวิชา</strong> เท่านั้น เพื่อให้สมาชิกลงทะเบียนเรียนในปีการศึกษาถัดไป</p>
                      <p>• <strong>คะแนนห้ามคัดลอกตามเด็ดขาด</strong> (ตารางคะแนนจะว่างเปล่า เริ่มต้นใหม่ทั้งหมด)</p>
                      <p>• <strong>ห้ามลบปีการศึกษาก่อนหน้านี้</strong> ข้อมูลเดิมจะถูกเก็บรักษาไว้ครบถ้วน</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddYearModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={!newYearInput.trim()}
                  onClick={handleAddAcademicYear}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มปีการศึกษา {newYearInput}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ลบปีการศึกษา (ยืนยันด้วยรหัส Admin) */}
      {deletingYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  ยืนยันการลบปีการศึกษา {deletingYear}
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  ต้องยืนยันด้วยรหัส Admin
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>คำเตือนความปลอดภัย:</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                การลบปีการศึกษา <strong>{deletingYear}</strong> จะลบรายวิชาทั้งหมดที่ผูกกับปีนี้ออกจากระบบ เพื่อความปลอดภัย กรุณากรอกรหัสผ่าน Admin เพื่อยืนยัน
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                รหัสผ่าน Admin *
              </label>
              <input
                type="password"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="กรอกรหัสผ่าน Admin (เช่น 123456)"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && adminPasswordInput.trim()) {
                    handleDeleteAcademicYearConfirm();
                  }
                }}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeletingYear(null);
                  setAdminPasswordInput('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!adminPasswordInput.trim()}
                onClick={handleDeleteAcademicYearConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบปีการศึกษา</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: คัดลอกรายวิชา (เลือกปีการศึกษา ภาคเรียน ชั้น อ.1 ถึง ม.3 เลือกบางวิชาหรือคัดลอกทั้งหมด) */}
      {isCopySubjectsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Copy className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    คัดลอกรายวิชา / กิจกรรม
                  </h3>
                  <p className="text-xs text-slate-500">
                    นำเข้ารายวิชามายัง <strong className="text-slate-700">ปีการศึกษา {currentAcademicYear} ภาคเรียนที่ {currentSemester}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCopySubjectsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ตัวเลือกกรองต้นทาง: ปีการศึกษา, ภาคเรียน */}
            <div className="space-y-3 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. เลือกปีการศึกษา */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ปีการศึกษาต้นทาง
                  </label>
                  <select
                    value={copyModalSourceYear}
                    onChange={(e) => setCopyModalSourceYear(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {academicYears.map(yr => (
                      <option key={yr} value={yr}>
                        ปีการศึกษา {yr} {yr === currentAcademicYear ? '(ปีปัจจุบัน)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. เลือกภาคเรียน */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ภาคเรียนต้นทาง
                  </label>
                  <select
                    value={copyModalSourceSemester}
                    onChange={(e) => setCopyModalSourceSemester(e.target.value as '1' | '2' | 'all')}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                    <option value="all">ทั้ง 2 ภาคเรียน (เทอม 1 และ 2)</option>
                  </select>
                </div>

                {/* 3. เลือกห้องเรียนปลายทาง */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ห้องเรียนปลายทางที่จะเพิ่มวิชา
                  </label>
                  <select
                    value={copyModalTargetRoom}
                    onChange={(e) => setCopyModalTargetRoom(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/70 font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {getRoomsForGrade(copyModalSourceGrade !== 'all' ? copyModalSourceGrade : selectedGradeFilter).map(rm => (
                      <option key={rm} value={rm}>
                        ห้อง {rm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ปุ่มลัดเลือกชั้น อ.1 ถึง ม.3 */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setCopyModalSourceGrade('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                    copyModalSourceGrade === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทุกชั้น
                </button>
                {MODAL_ALLOWED_GRADES.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setCopyModalSourceGrade(g)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                      copyModalSourceGrade === g
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* แถบสรุปรายการและปุ่มเลือกทั้งหมด / ยกเลิกเลือกทั้งหมด */}
            <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200/80 shrink-0">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  พบทั้งหมด <strong className="text-blue-700">{copyableSourceSubjects.length}</strong> วิชา
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-amber-800">
                  เลือกแล้ว <strong>{selectedCopySubjectIds.length}</strong> วิชา
                </span>
              </div>

              {copyableSourceSubjects.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCopySubjectIds(copyableSourceSubjects.map(s => s.id))}
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  >
                    เลือกทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCopySubjectIds([])}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    ล้างที่เลือก
                  </button>
                </div>
              )}
            </div>

            {/* รายการวิชาที่สามารถติ๊กเลือกคัดลอกได้ */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
              {copyableSourceSubjects.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-slate-400 space-y-1.5">
                  <BookOpen className="w-7 h-7 mx-auto text-slate-300" />
                  <div className="font-semibold text-slate-500">
                    ไม่พบรายวิชาในปีการศึกษา {copyModalSourceYear} {copyModalSourceSemester !== 'all' ? `ภาคเรียนที่ ${copyModalSourceSemester}` : ''} {copyModalSourceGrade !== 'all' ? `ชั้น ${copyModalSourceGrade}` : ''}
                  </div>
                  <div className="text-[11px]">
                    ลองเปลี่ยนปีการศึกษา ภาคเรียน หรือระดับชั้นด้านบนเพื่อดูรายวิชาอื่น
                  </div>
                </div>
              ) : (
                copyableSourceSubjects.map(sub => {
                  const isChecked = selectedCopySubjectIds.includes(sub.id);
                  const targetSem = copyModalSourceSemester === 'all' ? (sub.semester || currentSemester) : currentSemester;
                  const alreadyExists = subjects.some(
                    ex =>
                      isSubjectInYear(ex, currentAcademicYear) &&
                      (ex.semester || '1') === targetSem &&
                      ex.gradeLevel === sub.gradeLevel &&
                      normalizeRoom(ex.room) === normalizeRoom(copyModalTargetRoom) &&
                      (ex.code || '').trim().toUpperCase() === (sub.code || '').trim().toUpperCase() &&
                      (ex.name || '').trim() === (sub.name || '').trim()
                  );

                  return (
                    <label
                      key={sub.id}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedCopySubjectIds(prev =>
                              prev.includes(sub.id) ? prev.filter(id => id !== sub.id) : [...prev, sub.id]
                            );
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="font-bold text-amber-900 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                            ชั้น {sub.gradeLevel}
                          </span>
                          {sub.isActivity && (
                            <span className="font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md text-[10px] shrink-0">
                              กิจกรรม
                            </span>
                          )}
                          {sub.code && (
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md text-[11px] shrink-0">
                              {sub.code}
                            </span>
                          )}
                          <span className="font-bold text-slate-800 text-xs truncate">
                            {sub.name}
                          </span>
                          <span className="text-[11px] text-slate-500 shrink-0">
                            • {sub.hoursPerWeek} ชม./สัปดาห์
                          </span>
                          {copyModalSourceSemester === 'all' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                              ภาค {sub.semester || '1'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {sub.isActivity ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            ผ่าน / ไม่ผ่าน
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                            เต็ม {sub.totalScore} ({sub.courseworkScore}:{sub.examScore})
                          </span>
                        )}
                        {alreadyExists && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            มีแล้ว
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* ปุ่มยืนยันด้านล่าง: ยกเลิก / คัดลอก */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 shrink-0">
              <div className="text-[11px] text-slate-500">
                * คัดลอกเฉพาะโครงสร้างวิชา (ไม่คัดลอกคะแนน และรีเซ็ตครูผู้สอน)
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsCopySubjectsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  disabled={selectedCopySubjectIds.length === 0}
                  onClick={() => handleCopySubjectsFromSourceYear('selected')}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  <span>คัดลอก</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: คัดลอกตารางเมื่อปีการศึกษาก่อน (สะอาด กระชับ ไม่มีข้อความเกะกะ) */}
      {isCopyAssignmentModalOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    คัดลอกตารางงานจากปีก่อน
                  </h3>
                  <p className="text-xs text-slate-500">
                    วิชา {selectedSubject.name} ({selectedSubject.code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCopyAssignmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* เลือกปีการศึกษาต้นทาง */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกปีการศึกษาต้นทาง:
                </label>
                <select
                  value={copyTemplateSourceYear}
                  onChange={(e) => {
                    const newYr = e.target.value;
                    setTimeout(() => {
                      setCopyTemplateSourceYear(newYr);
                      if (selectedSubject) {
                        const targetSemester = selectedSubject.semester || currentSemester;
                        const match = subjects.find(s => 
                          s.id !== selectedSubject.id &&
                          isSubjectInYear(s, newYr) &&
                          (s.semester || '1') === targetSemester &&
                          s.assignmentItems && s.assignmentItems.length > 0 &&
                          (
                            s.code.trim().toLowerCase() === selectedSubject.code.trim().toLowerCase() ||
                            (s.name.trim().toLowerCase() === selectedSubject.name.trim().toLowerCase() && s.gradeLevel === selectedSubject.gradeLevel)
                          )
                        );
                        setSelectedTemplateSubject(match || null);
                      }
                    }, 0);
                  }}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {academicYears.filter(yr => yr !== currentAcademicYear).map(yr => (
                    <option key={yr} value={yr}>
                      ปีการศึกษา {yr}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplateSubject && selectedTemplateSubject.assignmentItems && selectedTemplateSubject.assignmentItems.length > 0 ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-y-auto space-y-1.5">
                  {selectedTemplateSubject.assignmentItems.map((asg, idx) => (
                    <div key={asg.id || idx} className="text-xs flex items-center justify-between py-1.5 px-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                      <span className="font-semibold text-slate-800 truncate">
                        {idx + 1}. {asg.name} <span className="text-[11px] font-normal text-slate-500">(หน่วยที่ {asg.unitNumber || 1})</span>
                      </span>
                      <span className="text-[11px] font-mono font-bold text-amber-700 shrink-0 ml-2">
                        เต็ม {asg.maxScore || 5}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  ไม่พบตารางงานในภาคเรียนที่ {selectedSubject.semester || currentSemester} ของปีการศึกษา {copyTemplateSourceYear}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCopyAssignmentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={!selectedTemplateSubject || !selectedTemplateSubject.assignmentItems || selectedTemplateSubject.assignmentItems.length === 0}
                  onClick={handleConfirmCopyAssignmentTemplate}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ยืนยันนำตารางงานมาใช้</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: กำหนดตารางชั่วโมงสอน & สรุปเวลาเรียนเชื่อมโยงหน้า 100 วัน */}
      {isTeachingScheduleModalOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl shrink-0">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>ตารางชั่วโมงสอน & ข้อมูลเวลาเรียน</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                      ภาค {currentSemester}/{currentAcademicYear}
                    </span>
                  </h3>
                  <p className="text-[11px] text-amber-100">
                    วิชา {selectedSubject.name} ({selectedSubject.code}) • ชั้น {selectedSubject.gradeLevel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeachingScheduleModalOpen(false)}
                className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-4 overflow-y-auto space-y-4 divide-y divide-slate-100">
              {/* ส่วนที่ 1: กำหนดตารางสอน */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>กำหนดตารางสอน</span>
                  </h4>
                  <span className="text-xs font-bold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg">
                    รวม: {activeTeachingDays.length} วัน ({totalWeeklyTeachingHours} ชม./สัปดาห์)
                  </span>
                </div>

                {/* 5 วันจันทร์ - ศุกร์ รายการให้ติ๊กและระบุชั่วโมง */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 pt-0.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isChecked = (teachingScheduleDays[d.day] || 0) > 0;
                    const hoursVal = teachingScheduleDays[d.day] || 1;
                    return (
                      <div
                        key={d.day}
                        className={`p-2 rounded-xl border transition-all flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-1.5 ${
                          isChecked
                            ? `${d.bg} ${d.border} shadow-2xs ring-1 ring-amber-400/30`
                            : 'bg-slate-50/70 border-slate-200 text-slate-400 opacity-75'
                        }`}
                      >
                        {/* Checkbox + Day Label */}
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTeachingScheduleDays(prev => ({ ...prev, [d.day]: 1 }));
                              } else {
                                setTeachingScheduleDays(prev => {
                                  const next = { ...prev };
                                  delete next[d.day];
                                  return next;
                                });
                              }
                            }}
                            className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                          />
                          <span className={`text-xs font-bold ${isChecked ? d.text : 'text-slate-600'}`}>
                            {d.name}
                          </span>
                        </label>

                        {/* Input ชั่วโมงด้านหลังของวัน (ค่าเริ่มต้นเป็น 1 ชั่วโมงเสมอ) */}
                        <div className="flex items-center gap-1">
                          {isChecked ? (
                            <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={hoursVal}
                                onChange={(e) => {
                                  const val = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                                  setTeachingScheduleDays(prev => ({ ...prev, [d.day]: val }));
                                }}
                                className="w-8 text-center font-mono font-bold text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 py-0.5"
                              />
                              <span className="text-[10px] font-semibold text-slate-600">ชม.</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">ไม่มีสอน</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ส่วนที่ 2: ข้อมูลเวลาเรียน */}
              <div className="pt-2 space-y-3">
                {/* Warning if no days selected */}
                {activeTeachingDays.length === 0 ? (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-center space-y-1">
                    <AlertCircle className="w-4 h-4 text-amber-600 mx-auto" />
                    <p className="text-xs font-bold text-amber-900">ยังไม่ได้เลือกวันในตารางสอน</p>
                  </div>
                ) : (
                  <>

                    {/* View Switcher Tabs: สรุปรายชื่อนักเรียน vs แยกตามวันที่สอน */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setScheduleActiveView('students')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
                            scheduleActiveView === 'students' || scheduleActiveView === 'summary'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          รายชื่อนักเรียน ({subjectGradeStudents.length} คน)
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleActiveView('dates')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
                            scheduleActiveView === 'dates'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          แยกตามวันที่สอน ({teachingAttendanceStats.teachingDates.length} วัน)
                        </button>
                      </div>

                      {(scheduleActiveView === 'students' || scheduleActiveView === 'summary') && (
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อ/เลขที่..."
                          value={scheduleSearchQuery}
                          onChange={(e) => setScheduleSearchQuery(e.target.value)}
                          className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 bg-white max-w-[150px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      )}
                    </div>

                    {/* View Content 1: รายชื่อนักเรียนรายบุคคล */}
                    {(scheduleActiveView === 'students' || scheduleActiveView === 'summary') && (
                      <div className="space-y-2">
                        {subjectGradeStudents.length === 0 ? (
                          <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                            ไม่พบนักเรียนในระดับชั้น {selectedSubject.gradeLevel}
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-100/90 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                                <tr>
                                  <th className="py-2 px-2.5 w-12 text-center">เลขที่</th>
                                  <th className="py-2 px-2.5">ชื่อ - นามสกุล</th>
                                  <th className="py-2 px-2 text-center text-emerald-800">มา (ชม.)</th>
                                  <th className="py-2 px-2 text-center text-rose-800">ขาด (ชม.)</th>
                                  <th className="py-2 px-2 text-center text-amber-800">ลา (ชม.)</th>
                                  <th className="py-2 px-2 text-center text-orange-800">ป่วย (ชม.)</th>
                                  <th className="py-2 px-2 text-center">% เวลา</th>
                                  <th className="py-2 px-2.5 text-center">สิทธิ์สอบ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {teachingAttendanceStats.studentStats
                                  .filter(st => {
                                    if (!scheduleSearchQuery) return true;
                                    const q = scheduleSearchQuery.toLowerCase();
                                    return (
                                      st.student.firstName.toLowerCase().includes(q) ||
                                      st.student.lastName.toLowerCase().includes(q) ||
                                      String(st.student.rollNumber || '').includes(q)
                                    );
                                  })
                                  .map((st) => (
                                    <tr key={st.student.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-600">
                                        {st.student.rollNumber || '-'}
                                      </td>
                                      <td className="py-2 px-2.5">
                                        <div className="font-semibold text-slate-800">
                                          {st.student.prefix}{st.student.firstName} {st.student.lastName}
                                        </div>
                                        {st.student.nickname && (
                                          <div className="text-[10px] text-slate-400">({st.student.nickname})</div>
                                        )}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                                        {st.presentHours}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono font-bold text-rose-700 bg-rose-50/40">
                                        {st.absentHours}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono font-bold text-amber-700 bg-amber-50/40">
                                        {st.personalHours}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono font-bold text-orange-700 bg-orange-50/40">
                                        {st.sickHours}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono font-bold">
                                        <span className={st.attendanceRate >= 80 ? 'text-emerald-700' : 'text-rose-700'}>
                                          {st.attendanceRate}%
                                        </span>
                                      </td>
                                      <td className="py-2 px-2.5 text-center">
                                        {st.isEligible ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                                            มีสิทธิ์สอบ
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 whitespace-nowrap">
                                            มส. (ขาดเรียน)
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* View Content 2: แยกตามวันที่สอน */}
                    {scheduleActiveView === 'dates' && (
                      <div className="space-y-2">
                        {teachingAttendanceStats.teachingDates.length === 0 ? (
                          <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                            ยังไม่มีข้อมูลการเช็กชื่อในวันสอนดังกล่าว
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto space-y-1.5">
                            {teachingAttendanceStats.teachingDates.map((item) => {
                              const dayInfo = DAYS_OF_WEEK.find(x => x.day === item.dayNum);
                              return (
                                <div
                                  key={item.date}
                                  className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${dayInfo?.badge || 'bg-amber-500 text-white'}`}>
                                      {dayInfo?.name || 'วันสอน'}
                                    </span>
                                    <span className="font-semibold text-slate-800">
                                      {item.date}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      ({item.hours} ชม.)
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 font-mono text-[11px] flex-wrap justify-end">
                                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">มา {item.present}</span>
                                    <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200/60">ขาด {item.absent}</span>
                                    <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60">ลา {item.leave}</span>
                                    <span className="text-orange-700 font-bold bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-200/60">ป่วย {item.sick}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                * ข้อมูลเวลาเรียนเชื่อมโยงกับหน้าเวลาเรียน 100 วันของครูประจำชั้นอัตโนมัติ
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsTeachingScheduleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveTeachingSchedule();
                    setIsTeachingScheduleModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึก</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ยืนยันการลบหน่วยการเรียนรู้ (จะถามยืนยันหรือว่ายกเลิก) */}
      {unitToDelete !== null && (() => {
        const detail = selectedSubject?.learningUnitDetails?.find(d => d.unitNumber === unitToDelete);
        const uLabel = detail?.name ? `หน่วยที่ ${unitToDelete}: ${detail.name}` : `หน่วยที่ ${unitToDelete}`;
        const asgsInUnit = (selectedSubject?.assignmentItems || []).filter(a => a.unitNumber === unitToDelete);

        return (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 truncate">
                    ยืนยันการลบหน่วยการเรียนรู้
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {uLabel}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200/80 text-xs text-rose-900 space-y-1.5">
                <p className="font-semibold">
                  คุณแน่ใจหรือไม่ว่าต้องการลบ {uLabel}?
                </p>
                {asgsInUnit.length > 0 ? (
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    ⚠️ มีช่องงานที่ผูกกับหน่วยนี้ {asgsInUnit.length} ช่อง (ข้อมูลงานและคะแนนในหน่วยนี้ทั้งหมดจะถูกลบ และคำนวณคะแนนเก็บใหม่อัตโนมัติ)
                  </p>
                ) : (
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    หน่วยการเรียนรู้นี้จะถูกนำออกจากวิชา {selectedSubject?.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUnitToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const u = unitToDelete;
                    setUnitToDelete(null);
                    handleDeleteLearningUnit(u);
                    if (mobileGradingUnitTab === u) {
                      setMobileGradingUnitTab(1);
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ยืนยันการลบ</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: ยืนยันการลบชิ้นงาน (ถามเพื่อยืนยันก่อนลบเสมอ) */}
      {deletingAssignmentConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800 truncate">
                  ยืนยันการลบชิ้นงาน
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {deletingAssignmentConfirm.name} (หน่วยที่ {deletingAssignmentConfirm.unitNumber || 1})
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200/80 text-xs text-rose-900 space-y-1">
              <p className="font-semibold">
                คุณแน่ใจหรือไม่ว่าต้องการลบช่อง{deletingAssignmentConfirm.name}?
              </p>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                ⚠️ คะแนนของนักเรียนทุกคนในชิ้นงานนี้จะถูกลบ และคำนวณคะแนนเก็บใหม่อัตโนมัติ
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingAssignmentConfirm(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = deletingAssignmentConfirm;
                  setDeletingAssignmentConfirm(null);
                  if (target) {
                    handleDeleteAssignment(target.id, target.name);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยีนลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ลงคะแนนรายบุคคลแบบรวดเร็ว (สำหรับมุม Mobile หรือคลิกที่ชื่อนักเรียน) */}
      {mobileGradingStudentId && currentGradingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            {/* Header: สลับนักเรียน + ปุ่มปิด */}
            <div className="p-3.5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white shrink-0">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <button
                  type="button"
                  disabled={currentGradingIndex <= 0}
                  onClick={handlePrevGradingStudent}
                  className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  title="นักเรียนคนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden xs:inline text-[11px]">ก่อนหน้า</span>
                </button>

                {/* Dropdown เลือกนักเรียนคนอื่นต่อได้ทันที เพื่อความเร็ว และสะดวก */}
                <div className="flex-1 min-w-0 max-w-[220px]">
                  <select
                    value={mobileGradingStudentId}
                    onChange={(e) => setMobileGradingStudentId(e.target.value)}
                    className="w-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl px-2.5 py-1.5 border border-white/30 focus:outline-none focus:ring-2 focus:ring-amber-300 text-center truncate cursor-pointer [&>option]:text-slate-800"
                  >
                    {gradeStudents.map((st, idx) => (
                      <option key={st.id} value={st.id}>
                        #{st.rollNumber ?? (idx + 1)} {st.prefix}{st.firstName} {st.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={currentGradingIndex >= gradeStudents.length - 1}
                  onClick={handleNextGradingStudent}
                  className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  title="นักเรียนคนถัดไป"
                >
                  <span className="hidden xs:inline text-[11px]">ถัดไป</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setMobileGradingStudentId(null)}
                  className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ข้อมูลนักเรียน */}
              <div className="flex items-center gap-2.5 pt-0.5">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/60 flex items-center justify-center shadow-xs">
                    {currentGradingStudent.photoUrl ? (
                      <img
                        src={currentGradingStudent.photoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white text-amber-900 font-mono font-bold text-sm flex items-center justify-center">
                        #{currentGradingStudent.rollNumber ?? (currentGradingIndex + 1)}
                      </div>
                    )}
                  </div>
                  {currentGradingStudent.photoUrl && (
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-white text-amber-900 font-mono font-bold text-[9px] rounded-md shadow-xs border border-amber-200 leading-none">
                      #{currentGradingStudent.rollNumber ?? (currentGradingIndex + 1)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm sm:text-base leading-tight truncate text-white">
                    {currentGradingStudent.prefix}{currentGradingStudent.firstName} {currentGradingStudent.lastName}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-amber-100/90 truncate mt-0.5">
                    <span>รหัส: {currentGradingStudent.studentCode || '-'}</span>
                    <span>•</span>
                    <span>ชั้น: {currentGradingStudent.gradeLevel}</span>
                    <span>•</span>
                    <span className="truncate">{selectedSubject?.name}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* แถบสรุปคะแนนสด (กิจกรรม / ระหว่างภาค-ปลายภาค-รวม / พัฒนาการอนุบาล) */}
            {isSelectedSubjectActivity ? (() => {
              const row = scoreRows[currentGradingStudent.id];
              const actRes = row?.activityResult || '';
              return (
                <div className="bg-emerald-50/80 border-b border-emerald-200/90 px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className={`font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs ${
                      actRes === 'ผ่าน' ? 'bg-emerald-600 text-white' :
                      actRes === 'ไม่ผ่าน' ? 'bg-rose-600 text-white' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {actRes || 'ยังไม่ประเมิน'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950">ผลการประเมินกิจกรรม</div>
                      <div className="text-[10px] text-emerald-700">เกณฑ์การประเมิน: ผ่าน / ไม่ผ่าน</div>
                    </div>
                  </div>
                </div>
              );
            })() : isSelectedSubjectKindergarten ? (() => {
              const overall = getStudentOverallRubric(currentGradingStudent.id);
              return (
                <div className="bg-emerald-50/80 border-b border-emerald-200/90 px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-emerald-600 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-xl shadow-xs">
                      {overall.score !== null ? `${overall.score} / ${activeRubricMaxLevel}` : `- / ${activeRubricMaxLevel}`}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <span>ภาพรวมพัฒนาการ:</span>
                        <span className="text-emerald-700 font-extrabold">{overall.score !== null ? overall.label : 'ยังไม่ประเมิน'}</span>
                      </div>
                      <div className="text-[10px] text-emerald-700">
                        {overall.average ? `คะแนนเฉลี่ย ${overall.average} (${overall.count} หัวข้อที่ประเมิน)` : `กำหนดเกณฑ์เต็ม ${activeRubricMaxLevel} ระดับ`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-emerald-800 font-semibold bg-white/80 px-2 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>เกณฑ์ {activeRubricMaxLevel} ระดับ</span>
                  </div>
                </div>
              );
            })() : (() => {
              const row = scoreRows[currentGradingStudent.id] || { 
                coursework: 0, 
                exam: 0, 
                assignmentScores: {} 
              };
              const total = Math.min(
                selectedSubject?.totalScore || 100,
                (Number(row.coursework) || 0) + (Number(row.exam) || 0)
              );
              const hasUnitScore1to5 = Object.values(row.assignmentScores || {}).some(
                score => typeof score === 'number' && score >= 1
              );

              return (
                <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    <div className="bg-white rounded-xl px-1.5 py-1.5 border border-indigo-200/80 text-center shadow-2xs flex flex-col items-center justify-center">
                      <div className="text-[10px] text-indigo-700 font-bold leading-tight">ระหว่างภาค</div>
                      {!hasUnitScore1to5 && canGradeSubject && !isMemberLockedReadOnly && !isAdminReadOnly ? (
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          <input
                            type="number"
                            min={0}
                            max={selectedSubject?.courseworkScore || 70}
                            value={row.coursework === 0 || row.coursework == null ? '' : row.coursework}
                            placeholder="-"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const maxCw = selectedSubject?.courseworkScore || 70;
                              const val = e.target.value === '' ? 0 : Math.min(maxCw, Math.max(0, Number(e.target.value)));
                              handleScoreChange(currentGradingStudent.id, 'coursework', val);
                            }}
                            className="w-12 h-6 text-center font-mono font-bold text-xs bg-indigo-50/60 rounded border border-indigo-300 text-indigo-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 tabular-nums"
                            title={`พิมพ์คะแนนระหว่างภาค (ห้ามเกิน ${selectedSubject?.courseworkScore || 70} คะแนน)`}
                          />
                          <span className="text-[10px] text-indigo-500 font-normal">/{selectedSubject?.courseworkScore || 70}</span>
                        </div>
                      ) : (
                        <div className="font-mono font-bold text-indigo-950 text-xs sm:text-sm">
                          {row.coursework ? row.coursework : '-'}
                          <span className="text-[10px] text-indigo-500 font-normal">/{selectedSubject?.courseworkScore || 70}</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-white rounded-xl px-1.5 py-1.5 border border-amber-200/80 text-center shadow-2xs flex flex-col items-center justify-center">
                      <div className="text-[10px] text-amber-800 font-bold leading-tight">ปลายภาค</div>
                      {canGradeSubject && !isMemberLockedReadOnly && !isAdminReadOnly ? (
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          <input
                            type="number"
                            min={0}
                            max={selectedSubject?.examScore || 30}
                            value={row.exam === 0 || row.exam == null ? '' : row.exam}
                            placeholder="-"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const maxEx = selectedSubject?.examScore || 30;
                              const val = e.target.value === '' ? 0 : Math.min(maxEx, Math.max(0, Number(e.target.value)));
                              handleScoreChange(currentGradingStudent.id, 'exam', val);
                            }}
                            className="w-12 h-6 text-center font-mono font-bold text-xs bg-amber-50/60 rounded border border-amber-300 text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400 tabular-nums"
                            title={`พิมพ์คะแนนปลายภาค (ห้ามเกิน ${selectedSubject?.examScore || 30} คะแนน)`}
                          />
                          <span className="text-[10px] text-amber-600 font-normal">/{selectedSubject?.examScore || 30}</span>
                        </div>
                      ) : (
                        <div className="font-mono font-bold text-amber-950 text-xs sm:text-sm">
                          {row.exam ? row.exam : '-'}
                          <span className="text-[10px] text-amber-600 font-normal">/{selectedSubject?.examScore || 30}</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-emerald-50 rounded-xl px-2 py-1.5 border border-emerald-200 text-center shadow-2xs">
                      <div className="text-[10px] text-emerald-800 font-bold">คะแนนรวม</div>
                      <div className="font-mono font-bold text-emerald-900 text-xs sm:text-sm">
                        {total}
                        <span className="text-[10px] text-emerald-600 font-normal">/{selectedSubject?.totalScore || 100}</span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden xs:flex flex-col items-center justify-center pl-1 text-[10px] text-emerald-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>บันทึกอัตโนมัติ</span>
                  </div>
                </div>
              );
            })()}

            {/* เนื้อหาการลงคะแนน */}
            <div className="p-3.5 sm:p-4 overflow-y-auto space-y-4 flex-1">
              {(!canGradeSubject || isMemberLockedReadOnly || isAdminReadOnly) && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isMemberLockedReadOnly ? 'ภาคเรียนนี้ถูกล็อกการลงคะแนนโดยผู้ดูแลระบบ' :
                     isAdminReadOnly ? 'โหมดดูคะแนนเท่านั้น (ครูผู้สอนเป็นผู้ลงคะแนน)' :
                     'สมาชิกต้องลงทะเบียนรายวิชานี้ก่อนจึงจะสามารถลงคะแนนได้'}
                  </span>
                </div>
              )}

              {isSelectedSubjectActivity ? (
                <div className="space-y-3 py-4">
                  <div className="text-xs font-bold text-slate-700 text-center">
                    เลือกผลการประเมินกิจกรรมสำหรับนักเรียนคนนี้
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(['ผ่าน', 'ไม่ผ่าน'] as const).map(resOpt => {
                      const curRes = scoreRows[currentGradingStudent.id]?.activityResult || '';
                      const isSelected = curRes === resOpt;
                      return (
                        <button
                          key={resOpt}
                          type="button"
                          disabled={!canGradeSubject || isAdminReadOnly || isMemberLockedReadOnly}
                          onClick={() => handleActivityResultChange(currentGradingStudent.id, isSelected ? '' : resOpt)}
                          className={`p-4 rounded-2xl border text-center font-bold text-sm transition-all flex flex-col items-center justify-center gap-1.5 ${
                            isSelected
                              ? resOpt === 'ผ่าน'
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300'
                                : 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-300'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          } ${(!canGradeSubject || isAdminReadOnly || isMemberLockedReadOnly) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                        >
                          {resOpt === 'ผ่าน' ? <CheckCircle2 className="w-6 h-6" /> : <X className="w-6 h-6" />}
                          <span>{resOpt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : isSelectedSubjectKindergarten ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      {isSelectedKindergartenCompetencyOff
                        ? `องค์ประกอบ/ประเด็น ของด้านความสามารถ (${displayedKindergartenAssignments.length} ประเด็น)`
                        : `สมรรถนะและองค์ประกอบ/ประเด็น (${currentKindergartenSubtopics.length} สมรรถนะ)`}
                    </span>
                    {canGradeSubject && !isAdminReadOnly && !isMemberLockedReadOnly && (
                      isSelectedKindergartenCompetencyOff ? (
                        <button
                          type="button"
                          onClick={() => {
                            setNewKindergartenColumnInput(`องค์ประกอบ/ประเด็น ${displayedKindergartenAssignments.length + 1}`);
                            setIsAddKindergartenColumnModalOpen(true);
                          }}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>เพิ่มองค์ประกอบ/ประเด็น</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setNewKindergartenSubtopicInput('');
                            setNewKindergartenStandardInput('');
                            setNewKindergartenIndicatorInput('');
                            setNewKindergartenElementsInput(['']);
                            setIsAddKindergartenSubtopicModalOpen(true);
                          }}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>เพิ่มสมรรถนะ</span>
                        </button>
                      )
                    )}
                  </div>

                  {currentKindergartenSubtopics.map((st, sIdx) => {
                    const unitNum = sIdx + 1;
                    const unitAssignments = (selectedSubject?.assignmentItems || []).filter(
                      it => it.unitNumber === unitNum || it.name === st
                    );
                    const cols =
                      unitAssignments.length > 0
                        ? unitAssignments
                        : [getKindergartenAssignmentForSubtopic(st, sIdx)];
                    const compSummary = getStudentSubtopicSummary(currentGradingStudent.id, cols);

                    return (
                      <div key={`m-comp-${sIdx}`} className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/90 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-amber-200/70">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {unitNum}
                            </span>
                            <span className="font-bold text-xs text-amber-950 leading-snug truncate">
                              {isSelectedKindergartenCompetencyOff
                                ? `ด้านความสามารถ: ${selectedSubject?.name}`
                                : (st.startsWith('สมรรถนะที่') ? st : `สมรรถนะที่ ${unitNum}: ${st}`)}
                            </span>
                          </div>
                          {compSummary.score !== null && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-amber-900 border border-amber-200 shrink-0">
                              สรุป: {compSummary.label} ({compSummary.score})
                            </span>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {cols.map((asg, eIdx) => {
                            const row = scoreRows[currentGradingStudent.id];
                            const currentScore = row?.assignmentScores?.[asg.id];
                            const currentLevelObj = activeRubricLevels.find(l => l.level === currentScore);

                            return (
                              <div key={asg.id} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px] shrink-0">
                                      องค์ประกอบ/ประเด็น {eIdx + 1}
                                    </span>
                                    <span className="font-bold text-xs text-slate-800 leading-snug">
                                      {asg.name}
                                    </span>
                                  </div>
                                  {currentLevelObj ? (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                      currentScore === 3 ? 'bg-emerald-100 text-emerald-800' :
                                      currentScore === 2 ? 'bg-sky-100 text-sky-800' :
                                      currentScore === 1 ? 'bg-amber-100 text-amber-800' :
                                      'bg-indigo-100 text-indigo-800'
                                    }`}>
                                      ระดับ {currentScore}: {currentLevelObj.label}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                      ยังไม่ประเมิน
                                    </span>
                                  )}
                                </div>

                                {/* Large, touch-friendly Rubric buttons: 1, 2, 3... */}
                                {canGradeSubject && !isAdminReadOnly && !isMemberLockedReadOnly ? (
                                  <div className={`grid gap-1.5 pt-0.5 ${activeRubricLevels.length <= 3 ? 'grid-cols-3' : activeRubricLevels.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
                                    {activeRubricLevels.map((rubric) => {
                                      const isSelected = currentScore === rubric.level;
                                      return (
                                        <button
                                          key={rubric.level}
                                          type="button"
                                          onClick={() => handleSetRubricScore(currentGradingStudent.id, asg.id, rubric.level)}
                                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                                            isSelected
                                              ? rubric.level === 3
                                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                                                : rubric.level === 2
                                                ? 'bg-sky-600 text-white border-sky-700 shadow-xs ring-2 ring-sky-300'
                                                : rubric.level === 1
                                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                                                : 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-300'
                                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                          }`}
                                        >
                                          <span className="font-mono font-bold text-sm">
                                            ระดับ {rubric.level}
                                          </span>
                                          <span className={`text-[10px] leading-tight font-medium ${isSelected ? 'text-white/95' : 'text-slate-500'}`}>
                                            {rubric.label}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  {/* ตัวกรองหน่วยการเรียนรู้ & ปุ่ม Test */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[11px] font-bold text-slate-500 shrink-0">หน่วย:</span>
                {currentSubjectUnits.map(u => {
                  const isSelected = mobileGradingUnitTab === u;
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setMobileGradingUnitTab(u)}
                      className={`w-7 h-7 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-2xs ring-2 ring-amber-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {u}
                    </button>
                  );
                })}

                {/* ปุ่ม + สำหรับเพิ่มหน่วย 2, 3, 4 ... */}
                {canManageUnits && (
                  <button
                    type="button"
                    onClick={handleOpenAddUnitModal}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-dashed border-amber-300 hover:border-amber-400 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                    title="เพิ่มหน่วยการเรียนรู้ (+)"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                )}

                {/* ปุ่ม Test สำหรับลงคะแนนปลายภาค */}
                <button
                  type="button"
                  onClick={() => setMobileGradingUnitTab('test')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1 ${
                    mobileGradingUnitTab === 'test'
                      ? 'bg-amber-600 text-white shadow-2xs ring-2 ring-amber-300'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Test</span>
                </button>
              </div>

              {/* แสดงชื่อหน่วยด้านล่างของเลขหน่วย พร้อมไอคอนลบและแก้ไขริมขวาสุดติดกัน (เมื่อกดหน่วย 1 หรือ 2 หรือหน่วยใดๆ) */}
              {typeof mobileGradingUnitTab === 'number' && (() => {
                const activeDetail = selectedSubject?.learningUnitDetails?.find(d => d.unitNumber === mobileGradingUnitTab);
                const uName = activeDetail?.name || `หน่วยที่ ${mobileGradingUnitTab}`;
                const uScore = activeDetail?.score;

                return (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50/90 text-amber-950 rounded-xl border border-amber-200/90 shadow-2xs animate-in fade-in">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-amber-950 truncate">
                          {uName}
                        </span>
                        {typeof uScore === 'number' && uScore > 0 && (
                          <span className="text-[11px] font-semibold text-amber-700 shrink-0">
                            ({uScore} คะแนน)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ไอคอนลบและแก้ไข ริมขวาสุดติดกัน */}
                    {canManageUnits && (
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditUnitModal(mobileGradingUnitTab)}
                          className="p-1.5 bg-white hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 transition-all cursor-pointer shadow-2xs"
                          title={`แก้ไขหน่วยที่ ${mobileGradingUnitTab} (แก้คะแนน / แก้ชื่อ)`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnitToDelete(mobileGradingUnitTab)}
                          className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded-lg border border-rose-200 transition-all cursor-pointer shadow-2xs"
                          title={`ลบหน่วยการเรียนรู้ที่ ${mobileGradingUnitTab}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* กรณีเลือก tab Test: แสดงหน้าลงคะแนนสอบปลายภาคเด่นชัด */}
              {mobileGradingUnitTab === 'test' ? (
                <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-700" />
                      <h4 className="text-xs font-bold text-amber-950">
                        📌 ลงคะแนนสอบปลายภาค (Test)
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-amber-800">
                      เต็ม {selectedSubject?.examScore || 30} คะแนน
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                    {/* ปุ่มปรับคะแนน -5, -1 */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={!canGradeSubject || isMemberLockedReadOnly || isAdminReadOnly}
                        onClick={() => {
                          const cur = Number(scoreRows[currentGradingStudent.id]?.exam) || 0;
                          handleScoreChange(currentGradingStudent.id, 'exam', Math.max(0, cur - 5));
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-700 cursor-pointer active:scale-95"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        disabled={!canGradeSubject || isMemberLockedReadOnly || isAdminReadOnly}
                        onClick={() => {
                          const cur = Number(scoreRows[currentGradingStudent.id]?.exam) || 0;
                          handleScoreChange(currentGradingStudent.id, 'exam', Math.max(0, cur - 1));
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-700 cursor-pointer active:scale-95"
                      >
                        -1
                      </button>
                    </div>

                    {/* ช่องกรอกตัวเลขโดยตรง */}
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={selectedSubject?.examScore || 30}
                        disabled={!canGradeSubject || isMemberLockedReadOnly || isAdminReadOnly}
                        value={scoreRows[currentGradingStudent.id]?.exam === 0 || scoreRows[currentGradingStudent.id]?.exam == null ? '' : scoreRows[currentGradingStudent.id]?.exam}
                        placeholder="-"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          handleScoreChange(currentGradingStudent.id, 'exam', val);
                        }}
                        className="w-16 h-9 text-center font-mono font-bold text-base rounded-xl border border-amber-300 bg-amber-50/30 text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
                      />
                      <span className="text-xs font-bold text-slate-500">
                        /{selectedSubject?.examScore || 30}
                      </span>
                    </div>

                    {/* ปุ่มปรับคะแนน +1, +5 */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={!canGradeSubject || isMemberLockedReadOnly || isAdminReadOnly}
                        onClick={() => {
                          const cur = Number(scoreRows[currentGradingStudent.id]?.exam) || 0;
                          const maxEx = selectedSubject?.examScore || 30;
                          handleScoreChange(currentGradingStudent.id, 'exam', Math.min(maxEx, cur + 1));
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-700 cursor-pointer active:scale-95"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        disabled={!canGradeSubject || isMemberLockedReadOnly || isAdminReadOnly}
                        onClick={() => {
                          const cur = Number(scoreRows[currentGradingStudent.id]?.exam) || 0;
                          const maxEx = selectedSubject?.examScore || 30;
                          handleScoreChange(currentGradingStudent.id, 'exam', Math.min(maxEx, cur + 5));
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-700 cursor-pointer active:scale-95"
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  {/* ตัวเลือกด่วนคะแนนปลายภาค */}
                  <div className="grid grid-cols-6 gap-1 pt-0.5">
                    {Array.from(new Set([0, 10, 15, 20, 25, selectedSubject?.examScore || 30].filter(v => v <= (selectedSubject?.examScore || 30)))).map((presetVal, idx) => (
                      <button
                        key={`preset-test-${presetVal}-${idx}`}
                        type="button"
                        disabled={!canGradeSubject || isMemberLockedReadOnly || isAdminReadOnly}
                        onClick={() => handleScoreChange(currentGradingStudent.id, 'exam', presetVal)}
                        className={`py-1.5 px-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-center ${
                          (scoreRows[currentGradingStudent.id]?.exam ?? 0) === presetVal
                            ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                            : 'bg-white hover:bg-amber-100/70 border border-amber-200 text-amber-900'
                        }`}
                      >
                        {presetVal === (selectedSubject?.examScore || 30) ? 'เต็ม' : presetVal}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* กรณีเลือกหน่วยตัวเลข (เช่น 1, 2, 3...): แสดงเฉพาะช่องงานในหน่วยนั้น */
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 min-w-0">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">คะแนนเก็บหน่วยที่ {mobileGradingUnitTab} (0 - 5 คะแนน)</span>
                    </h4>

                    {/* ปุ่ม + เพื่อเพิ่มช่องการลงคะแนนในชิ้นงาน */}
                    {!isAdminReadOnly && (
                      <button
                        type="button"
                        disabled={!canGradeSubject}
                        onClick={() => {
                          if (!canGradeSubject) {
                            onShowToast('warning', 'ต้องลงทะเบียนก่อน', 'สมาชิกต้องลงทะเบียนรายวิชานี้ก่อนจึงจะสามารถเพิ่มช่องงานได้');
                            return;
                          }
                          const targetUnit = typeof mobileGradingUnitTab === 'number' ? mobileGradingUnitTab : 1;
                          const countInUnit = assignmentItems.filter(a => (a.unitNumber || 1) === targetUnit).length;
                          setAssignmentUnitInput(targetUnit);
                          setNewAsgNameInput(`งานที่ ${countInUnit + 1}`);
                          setIsInlineAddingAsg(true);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                          canGradeSubject 
                            ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-2xs active:scale-95'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                        title={`เพิ่มช่องงานใหม่ในหน่วยที่ ${mobileGradingUnitTab}`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>เพิ่มงาน</span>
                      </button>
                    )}
                  </div>

                  {/* ช่องกรอกเพิ่มงานแบบด่วน inline */}
                  {isInlineAddingAsg && (
                    <div className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-200 flex items-center gap-1.5 my-1.5 animate-in fade-in">
                      <input
                        type="text"
                        value={newAsgNameInput}
                        onChange={(e) => setNewAsgNameInput(e.target.value)}
                        placeholder={`ระบุชื่อชิ้นงานใหม่ (หน่วยที่ ${mobileGradingUnitTab})...`}
                        className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newAsgNameInput.trim()) {
                            handleAddAssignment(newAsgNameInput.trim());
                            setNewAsgNameInput('');
                            setIsInlineAddingAsg(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newAsgNameInput.trim()) {
                            handleAddAssignment(newAsgNameInput.trim());
                            setNewAsgNameInput('');
                            setIsInlineAddingAsg(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                      >
                        เพิ่ม
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsInlineAddingAsg(false);
                          setNewAsgNameInput('');
                        }}
                        className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  )}

                  {(() => {
                    const itemsInThisUnit = assignmentItems.filter(a => a.unitNumber === mobileGradingUnitTab);

                    if (itemsInThisUnit.length === 0) {
                      return (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-1.5">
                          <p className="text-xs font-semibold text-slate-600">ยังไม่มีช่องงานในหน่วยการเรียนรู้ที่ {mobileGradingUnitTab}</p>
                          <p className="text-[11px] text-slate-400">กดปุ่ม "+ เพิ่มงาน" ด้านบนเพื่อเพิ่มชิ้นงานในหน่วยนี้</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {itemsInThisUnit.map((asg, asgIdx) => {
                          const currentScore = scoreRows[currentGradingStudent.id]?.assignmentScores?.[asg.id] ?? 0;
                          const isScored = scoreRows[currentGradingStudent.id]?.assignmentScores?.[asg.id] !== undefined;

                          return (
                            <div 
                              key={asg.id} 
                              className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                {editingMobileAsgId === asg.id ? (
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={editingMobileAsgName}
                                      onChange={(e) => setEditingMobileAsgName(e.target.value)}
                                      className="flex-1 text-xs px-2 py-1 rounded-lg border border-amber-400 bg-amber-50/30 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && editingMobileAsgName.trim()) {
                                          handleEditAssignment(asg.id, editingMobileAsgName.trim(), asg.unitNumber);
                                          setEditingMobileAsgId(null);
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (editingMobileAsgName.trim()) {
                                          handleEditAssignment(asg.id, editingMobileAsgName.trim(), asg.unitNumber);
                                          setEditingMobileAsgId(null);
                                        }
                                      }}
                                      className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shrink-0 cursor-pointer"
                                      title="บันทึกชื่อใหม่"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingMobileAsgId(null)}
                                      className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-xs shrink-0 cursor-pointer"
                                      title="ยกเลิก"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <span className="text-xs font-bold text-slate-800 truncate" title={asg.name}>
                                      {asgIdx + 1}. {asg.name}
                                    </span>

                                    {/* ไอคอนแก้ไข(เปลี่ยนชื่อ) และไอคอนลบ */}
                                    {!isAdminReadOnly && canGradeSubject && (
                                      <div className="flex items-center gap-1 shrink-0 ml-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingMobileAsgId(asg.id);
                                            setEditingMobileAsgName(asg.name);
                                          }}
                                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                                          title="เปลี่ยนชื่องาน"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setDeletingAssignmentConfirm(asg)}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                          title="ลบชิ้นงานนี้"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] text-slate-500">
                                    คะแนน:
                                  </span>
                                  <span className={`w-5 h-5 rounded-md font-mono font-bold text-xs flex items-center justify-center ${
                                    currentScore === 5 ? 'bg-emerald-600 text-white' :
                                    currentScore === 4 ? 'bg-emerald-500 text-white' :
                                    currentScore === 3 ? 'bg-blue-600 text-white' :
                                    currentScore === 2 ? 'bg-amber-500 text-white' :
                                    currentScore === 1 ? 'bg-orange-500 text-white' :
                                    isScored ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400 font-normal'
                                  }`}>
                                    {isScored ? currentScore : '-'}
                                  </span>
                                </div>
                              </div>

                              {/* ปุ่มกดเลือกคะแนน 0, 1, 2, 3, 4, 5 กดได้อัตโนมัติ */}
                              <div className="grid grid-cols-6 gap-1 pt-0.5">
                                {[0, 1, 2, 3, 4, 5].map(val => {
                                  const isCurrent = isScored && currentScore === val;
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      disabled={!canGradeSubject || isMemberLockedReadOnly || isAdminReadOnly}
                                      onClick={() => handleSelectAssignmentScore(currentGradingStudent.id, asg.id, val)}
                                      className={`h-8 rounded-lg font-mono font-bold text-xs transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 ${
                                        isCurrent
                                          ? val === 5 ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300 scale-105' :
                                            val === 4 ? 'bg-emerald-500 text-white shadow-xs ring-2 ring-emerald-300 scale-105' :
                                            val === 3 ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300 scale-105' :
                                            val === 2 ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300 scale-105' :
                                            val === 1 ? 'bg-orange-500 text-white shadow-xs ring-2 ring-orange-300 scale-105' :
                                            'bg-rose-600 text-white shadow-xs ring-2 ring-rose-300 scale-105'
                                          : 'bg-slate-100 hover:bg-amber-100/80 text-slate-700 hover:text-amber-900 border border-slate-200'
                                      }`}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
                </>
              )}
            </div>

            {/* Footer: สลับไปนักเรียนคนอื่นต่อได้เลย */}
            <div className="p-3 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                disabled={currentGradingIndex <= 0}
                onClick={handlePrevGradingStudent}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>คนก่อนหน้า</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileGradingStudentId(null)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
              >
                เสร็จสิ้น
              </button>

              <button
                type="button"
                disabled={currentGradingIndex >= gradeStudents.length - 1}
                onClick={handleNextGradingStudent}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>คนถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal เพิ่ม / แก้ไข หน่วยการเรียนรู้ (สำหรับ ป.1 - ม.6) */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 scale-in-95 transition-transform duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {unitModalMode === 'add' ? `เพิ่มหน่วยการเรียนรู้ที่ ${unitModalTargetNum}` : `แก้ไขหน่วยการเรียนรู้ที่ ${unitModalTargetNum}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const maxCw = selectedSubject?.courseworkScore || 70;
              const otherUnitsScoreSum = (selectedSubject?.learningUnitDetails || [])
                .filter(d => d.unitNumber !== unitModalTargetNum)
                .reduce((sum, d) => sum + (Number(d.score) || 0), 0);
              const remainingAllowed = Math.max(0, maxCw - otherUnitsScoreSum);
              const enteredScore = typeof unitScoreInput === 'number' ? unitScoreInput : 0;
              const totalScoreWithCurrent = otherUnitsScoreSum + enteredScore;
              const isScoreExceeded = totalScoreWithCurrent > maxCw;

              return (
                <form onSubmit={handleSaveUnitModalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ชื่อหน่วยการเรียนรู้ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={unitNameInput}
                      onChange={(e) => setUnitNameInput(e.target.value)}
                      placeholder={`เช่น หน่วยที่ ${unitModalTargetNum}: การเรียนรู้ภาษาไทย`}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        คะแนนเต็มของหน่วย
                      </label>
                      <span className="text-[11px] font-bold text-slate-500">
                        (คะแนนระหว่างภาคเต็ม {maxCw} คะแนน)
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={maxCw}
                        value={unitScoreInput}
                        onChange={(e) => setUnitScoreInput(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={`เช่น ${remainingAllowed > 0 ? Math.min(20, remainingAllowed) : 0}`}
                        className={`w-full px-3 py-2 text-sm rounded-xl font-bold transition-all ${
                          isScoreExceeded
                            ? 'border-2 border-rose-500 bg-rose-50/70 text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-400'
                            : 'bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800'
                        }`}
                      />
                      {isScoreExceeded && (
                        <div className="absolute right-3 top-2.5 text-rose-600 font-bold text-xs flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>เกินกำหนด</span>
                        </div>
                      )}
                    </div>

                    {/* การแสดงเตือนสีแดงและคำแนะนำคะแนน */}
                    {isScoreExceeded ? (
                      <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1.5 animate-in fade-in">
                        <div className="font-bold flex items-center gap-1.5 text-rose-700">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>คะแนนรวมทุกหน่วยเกินคะแนนเต็มระหว่างภาค ({maxCw} คะแนน)!</span>
                        </div>
                        <p className="text-[11px] text-rose-800 leading-relaxed">
                          หน่วยอื่นรวมกันได้ {otherUnitsScoreSum} คะแนนแล้ว เมื่อใส่หน่วยนี้ {enteredScore} คะแนน รวมเป็น {totalScoreWithCurrent} คะแนน (เกินไป {totalScoreWithCurrent - maxCw} คะแนน) ระบบจึงไม่อนุญาตให้บันทึก
                        </p>
                        <div className="pt-1 flex items-center justify-between gap-2 border-t border-rose-200/80">
                          <span className="text-[11px] font-bold text-rose-900">
                            💡 คำแนะนำ: ควรใส่ไม่เกิน {remainingAllowed} คะแนน ถึงจะบันทึกได้
                          </span>
                          {remainingAllowed > 0 && (
                            <button
                              type="button"
                              onClick={() => setUnitScoreInput(remainingAllowed)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all active:scale-95 shadow-2xs"
                            >
                              กดใส่ {remainingAllowed} คะแนน
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                        <span>หน่วยอื่นใช้ไปแล้ว {otherUnitsScoreSum} คะแนน</span>
                        <span className="font-semibold text-amber-700">
                          (สามารถใส่ได้สูงสุด {remainingAllowed} คะแนน)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsUnitModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isScoreExceeded}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                        isScoreExceeded
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                          : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer active:scale-95'
                      }`}
                      title={isScoreExceeded ? 'คะแนนรวมเกินคะแนนเต็มระหว่างภาค ไม่สามารถบันทึกได้' : undefined}
                    >
                      <span>{unitModalMode === 'add' ? 'เพิ่มหน่วยการเรียนรู้' : 'บันทึกการแก้ไข'}</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบองค์ประกอบ/ประเด็น */}
      {kindergartenColumnToDelete && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 scale-in-95 transition-transform duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">
              ยืนยันการลบองค์ประกอบ/ประเด็น
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              คุณแน่ใจหรือว่าต้องการลบองค์ประกอบ/ประเด็น <strong className="text-rose-700 font-bold">&quot;{kindergartenColumnToDelete.name}&quot;</strong> ? <br/>
              ข้อมูลคะแนนในช่องนี้จะถูกลบออก
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setKindergartenColumnToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex-1"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteKindergartenColumn(kindergartenColumnToDelete.id, kindergartenColumnToDelete.name);
                  setKindergartenColumnToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 flex-1"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบสมรรถนะ */}
      {subtopicToDelete && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 scale-in-95 transition-transform duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">
              ยืนยันการลบสมรรถนะ
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              คุณแน่ใจหรือว่าต้องการลบ <strong className="text-rose-700 font-bold">&quot;{subtopicToDelete}&quot;</strong> ? <br/>
              องค์ประกอบ/ประเด็นและคะแนนทั้งหมดภายใต้สมรรถนะนี้จะถูกลบออก
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSubtopicToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex-1"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteKindergartenSubtopic(subtopicToDelete)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 flex-1"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
