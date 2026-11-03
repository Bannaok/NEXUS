import React, { useState, useMemo, useEffect } from 'react';
import { 
  Student, 
  GradeLevel, 
  UserSession, 
  GradeRecord,
  Subject 
} from '../types';
import { StorageService } from '../services/storage';
import { 
  BookOpen, 
  CheckCircle2, 
  Sparkles, 
  Save, 
  Lock, 
  ChevronRight, 
  FileText, 
  Award, 
  Users, 
  RotateCcw,
  Check,
  Table,
  BarChart2,
  Plus,
  Trash2,
  Edit,
  X,
  Settings,
  ChevronDown,
  ChevronLeft,
  Maximize2,
  Minimize2,
  User
} from 'lucide-react';

// ==========================================
// CONFIGURATION INTERFACES FOR DYNAMIC TABLES
// ==========================================
export interface AssessmentIndicator {
  id: string;
  name: string; // e.g. "1.1 จับใจความสำคัญ"
  maxScore: number; // e.g. 10
}

export interface AssessmentTableConfig {
  id: string;
  title: string; // e.g. "ตารางที่ 1: การอ่าน"
  indicators: AssessmentIndicator[];
}

export interface ReadingWritingStructureConfig {
  mainTitle: string; // e.g. "1. การอ่าน คิดวิเคราะห์ และเขียน"
  tables: AssessmentTableConfig[];
}

// DEFAULT INITIAL CONFIGURATION FOR "การอ่าน คิดวิเคราะห์ และเขียน"
const DEFAULT_RW_CONFIG: ReadingWritingStructureConfig = {
  mainTitle: '1. การอ่าน คิดวิเคราะห์ และเขียน',
  tables: [
    {
      id: 'table-reading',
      title: 'การอ่าน',
      indicators: [
        { id: 'r1', name: '1.1 จับใจความสำคัญ', maxScore: 10 },
        { id: 'r2', name: '1.2 ตีความ/แปลความ', maxScore: 10 },
        { id: 'r3', name: '1.3 ประเมินค่าสิ่งที่อ่าน', maxScore: 10 }
      ]
    },
    {
      id: 'table-thinking',
      title: 'คิดวิเคราะห์',
      indicators: [
        { id: 't1', name: '2.1 จำแนกข้อเท็จจริง', maxScore: 10 },
        { id: 't2', name: '2.2 เหตุและผล', maxScore: 15 },
        { id: 't3', name: '2.3 สรุปความคิดรวบยอด', maxScore: 15 }
      ]
    },
    {
      id: 'table-writing',
      title: 'การเขียน',
      indicators: [
        { id: 'w1', name: '3.1 เขียนถ่ายทอดความคิด', maxScore: 15 },
        { id: 'w2', name: '3.2 เรียบเรียงภาษาถูกต้อง', maxScore: 15 },
        { id: 'w3', name: '3.3 ความคิดสร้างสรรค์', maxScore: 10 }
      ]
    }
  ]
};

const RW_CONFIG_KEY = 'ams_reading_writing_config_v2';
const ASSESSMENT_DATA_KEY = 'ams_assessment_3_booklets_v2';

export interface Characteristics8Criteria {
  item1?: number; // รักชาติ ศาสน์ กษัตริย์ (0-3)
  item2?: number; // ซื่อสัตย์สุจริต (0-3)
  item3?: number; // มีวินัย (0-3)
  item4?: number; // ใฝ่เรียนรู้ (0-3)
  item5?: number; // อยู่อย่างพอเพียง (0-3)
  item6?: number; // มุ่งมั่นในการทำงาน (0-3)
  item7?: number; // รักความเป็นไทย (0-3)
  item8?: number; // มีจิตสาธารณะ (0-3)
  overallLevel?: number; // สรุปผล (0-3)
  subScores?: Record<string, number>; // รายละเอียดย่อย 1.1 - 8.4 (0-3)
  evaluated?: boolean;
}

export interface CharacteristicIndicator {
  id: string; // e.g. '1.1'
  text: string;
}

export interface CharacteristicGroup {
  id: 'item1' | 'item2' | 'item3' | 'item4' | 'item5' | 'item6' | 'item7' | 'item8';
  itemKey: 'item1' | 'item2' | 'item3' | 'item4' | 'item5' | 'item6' | 'item7' | 'item8';
  number: number;
  title: string;
  indicators: CharacteristicIndicator[];
}

export const CHARACTERISTICS_GROUPS: CharacteristicGroup[] = [
  {
    id: 'item1',
    itemKey: 'item1',
    number: 1,
    title: '1) รักชาติ ศาสน์ กษัตริย์',
    indicators: [
      { id: '1.1', text: '1.1 ยืนตรงเมื่อได้ยินเพลงชาติ ร้องเพลงชาติได้ และบอกความหมายของเพลงชาติ' },
      { id: '1.2', text: '1.2 ปฏิบัติตนตามสิทธิและหน้าที่ของนักเรียน ให้ความร่วมมือ ร่วมใจ ในการทำงานกับสมาชิกในห้องเรียน' },
      { id: '1.3', text: '1.3 เข้าร่วมกิจกรรมที่สร้างความสามัคคี ปรองดอง และเป็นประโยชน์ต่อโรงเรียนและชุมชน' },
      { id: '1.4', text: '1.4 เข้าร่วมกิจกรรมทางศาสนาที่ตนนับถือ ปฏิบัติตนตามหลักของศาสนาและเป็นตัวอย่างที่ดีของศาสนิกชน' },
      { id: '1.5', text: '1.5 เข้าร่วมกิจกรรมและมีส่วนร่วมในการจัดกิจกรรมที่เกี่ยวกับสถาบันพระมหากษัตริย์ตามที่โรงเรียนและชุมชนจัดขึ้น' }
    ]
  },
  {
    id: 'item2',
    itemKey: 'item2',
    number: 2,
    title: '2) ซื่อสัตย์ สุจริต',
    indicators: [
      { id: '2.1', text: '2.1 ให้ข้อมูลที่ถูกต้อง และเป็นจริง ไม่โกหก' },
      { id: '2.2', text: '2.2 ปฏิบัติในสิ่งที่ถูกต้อง ละอาย และเกรงกลัวที่จะทำความผิด ทำตามสัญญาที่ตนให้ไว้กับพ่อแม่หรือผู้ปกครอง และครู' },
      { id: '2.3', text: '2.3 ปฏิบัติตนต่อผู้อื่นด้วยความซื่อตรง และเป็นแบบอย่างที่ดีแก่เพื่อนด้านความซื่อสัตย์' }
    ]
  },
  {
    id: 'item3',
    itemKey: 'item3',
    number: 3,
    title: '3) มีวินัย',
    indicators: [
      { id: '3.1', text: '3.1 ปฏิบัติตามข้อตกลง กฎเกณฑ์ ระเบียบ ข้อบังคับของครอบครัวและโรงเรียน' },
      { id: '3.2', text: '3.2 มีความตรงต่อเวลาในการปฏิบัติกิจกรรมต่างๆ ในชีวิตประจำวัน และมีความรับผิดชอบ' },
      { id: '3.3', text: '3.3 ปฏิบัติตนในกิจวัตรประจำวัน โดยไม่ละเมิดสิทธิผู้อื่น' }
    ]
  },
  {
    id: 'item4',
    itemKey: 'item4',
    number: 4,
    title: '4) ใฝ่เรียนรู้',
    indicators: [
      { id: '4.1', text: '4.1 ตั้งใจเรียน เพียรพยายามในการเรียน สนใจเข้าร่วมกิจกรรมการเรียนรู้ต่างๆ' },
      { id: '4.2', text: '4.2 ศึกษาค้นคว้า หาความรู้จากหนังสือ เอกสาร สิ่งพิมพ์ สื่อเทคโนโลยีต่างๆ แหล่งการเรียนรู้ทั้งภายในและภายนอกโรงเรียน และเลือกใช้สื่อได้อย่างเหมาะสม' },
      { id: '4.3', text: '4.3 บันทึกความรู้ วิเคราะห์ ตรวจสอบบางสิ่งที่เรียนรู้ สรุปเป็นองค์ความรู้' },
      { id: '4.4', text: '4.4 แลกเปลี่ยนความรู้ ด้วยวิธีการต่างๆ และนำไปใช้ในชีวิตประจำวัน' }
    ]
  },
  {
    id: 'item5',
    itemKey: 'item5',
    number: 5,
    title: '5) อยู่อย่างพอเพียง',
    indicators: [
      { id: '5.1', text: '5.1 ใช้ทรัพย์สินและสิ่งของของโรงเรียนอย่างประหยัด' },
      { id: '5.2', text: '5.2 ใช้อุปกรณ์การเรียนอย่างประหยัดและรู้คุณค่า' },
      { id: '5.3', text: '5.3 ใช้จ่ายอย่างประหยัดและมีการเก็บออมเงิน' }
    ]
  },
  {
    id: 'item6',
    itemKey: 'item6',
    number: 6,
    title: '6) มุ่งมั่นในการทำงาน',
    indicators: [
      { id: '6.1', text: '6.1 มีความตั้งใจและพยายามในการทำงานที่ได้รับมอบหมาย' },
      { id: '6.2', text: '6.2 มีความอดทนและไม่ท้อแท้ต่ออุปสรรคเพื่อให้งานสำเร็จ' }
    ]
  },
  {
    id: 'item7',
    itemKey: 'item7',
    number: 7,
    title: '7) รักความเป็นไทย',
    indicators: [
      { id: '7.1', text: '7.1 มีจิตสำนึกในการอนุรักษ์วัฒนธรรมและภูมิปัญญาไทย' },
      { id: '7.2', text: '7.2 เห็นคุณค่าและปฏิบัติตนตามวัฒนธรรมไทย' }
    ]
  },
  {
    id: 'item8',
    itemKey: 'item8',
    number: 8,
    title: '8) มีจิตสาธารณะ',
    indicators: [
      { id: '8.1', text: '8.1 รู้จักช่วยพ่อแม่ ผู้ปกครอง และครูทำงาน' },
      { id: '8.2', text: '8.2 อาสาทำงาน ช่วยคิด ช่วยทำ และแบ่งปันสิ่งของให้ผู้อื่น' },
      { id: '8.3', text: '8.3 รู้จักการดูแล รักษาทรัพย์สมบัติและสิ่งแวดล้อมของห้องเรียน โรงเรียนชุมชน' },
      { id: '8.4', text: '8.4 เข้าร่วมกิจกรรมเพื่อสังคมและสาธารณประโยชน์ของโรงเรียน' }
    ]
  }
];

export interface Competency5Criteria {
  comp1?: number; // ความสามารถในการสื่อสาร (0-3)
  comp2?: number; // ความสามารถในการคิด (0-3)
  comp3?: number; // ความสามารถในการแก้ปัญหา (0-3)
  comp4?: number; // ความสามารถในการใช้ทักษะชีวิต (0-3)
  comp5?: number; // ความสามารถในการใช้เทคโนโลยี (0-3)
  overallLevel?: number; // สรุปผล (0-3)
  evaluated?: boolean;
}

export interface AssessmentThresholds {
  reading: { excellent: number; good: number; passing: number; maxScore: number };
  thinking: { excellent: number; good: number; passing: number; maxScore: number };
  writing: { excellent: number; good: number; passing: number; maxScore: number };
}

export interface StudentAssessmentRecord {
  studentId: string;
  studentName: string;
  rollNumber?: number;
  gradeLevel: GradeLevel;
  semester: '1' | '2';
  academicYear: string;
  indicatorScores: Record<string, number>; // indicator.id -> score
  characteristics: Characteristics8Criteria;
  competency: Competency5Criteria;
}

interface Assessment3BookletsProps {
  user: UserSession;
  students: Student[];
  subjects: Subject[];
  grades: GradeRecord[];
  currentGradeLevel?: GradeLevel;
  currentSemester: '1' | '2';
  currentAcademicYear: string;
  isLocked: boolean;
  onSaveGrades?: (grades: GradeRecord[]) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

const cleanTitle = (title: string = ''): string => {
  if (!title) return '';
  return title.replace(/^ตารางที่\s*\d+\s*:\s*/i, '').trim();
};

export const Assessment3Booklets: React.FC<Assessment3BookletsProps> = ({
  user,
  students,
  subjects,
  grades,
  currentGradeLevel = 'ป.1',
  currentSemester,
  currentAcademicYear,
  isLocked,
  onSaveGrades,
  onShowToast
}) => {
  const isAdmin = user.role === 'admin';

  // 3 หน้าย่อยหลัก:
  // 1. การอ่าน คิดวิเคราะห์ และเขียน
  // 2. คุณลักษณะอันพึงประสงค์ (8 ประการ)
  // 3. สมรรถนะสำคัญ (5 ด้าน)
  const [activeBooklet, setActiveBooklet] = useState<'readingWriting' | 'characteristics' | 'competencies'>('readingWriting');

  // ==========================================
  // CONFIG STATE: Dynamic Structure Config
  // ==========================================
  const [rwConfig, setRwConfig] = useState<ReadingWritingStructureConfig>(() => {
    try {
      const saved = localStorage.getItem(RW_CONFIG_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse rwConfig', e);
    }
    return DEFAULT_RW_CONFIG;
  });

  // Save config to localStorage whenever Admin modifies it
  const saveRwConfig = (newConfig: ReadingWritingStructureConfig) => {
    setRwConfig(newConfig);
    try {
      localStorage.setItem(RW_CONFIG_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.error('Failed to save rwConfig', e);
    }
  };

  // Active sub-table index/id in Reading/Writing section
  const [selectedTableId, setSelectedTableId] = useState<string>(() => {
    return rwConfig.tables[0]?.id || 'table-reading';
  });

  // Sub-tab view state in Summary Overview: 'quantity' (สรุปปริมาณ) vs 'quality' (สรุปคุณภาพ)
  const [summaryViewType, setSummaryViewType] = useState<'quantity' | 'quality'>('quantity');

  // State for Combined Summary Dropdown Menu
  const [isSummaryDropdownOpen, setIsSummaryDropdownOpen] = useState(false);

  // Ensure selectedTableId is valid
  useEffect(() => {
    if (selectedTableId !== 'summary' && !rwConfig.tables.some(t => t.id === selectedTableId)) {
      setSelectedTableId(rwConfig.tables[0]?.id || 'summary');
    }
  }, [rwConfig, selectedTableId]);

  // ==========================================
  // MODALS STATE (ADMIN EXCLUSIVE)
  // ==========================================
  // 1. Edit Main Title Modal
  const [isEditingMainTitleModalOpen, setIsEditingMainTitleModalOpen] = useState(false);
  const [mainTitleInput, setMainTitleInput] = useState('');

  // 2. Add/Edit Table Modal
  const [tableModalState, setTableModalState] = useState<{
    isOpen: boolean;
    tableId?: string; // If undefined -> Add, if defined -> Edit title
    titleInput: string;
  }>({ isOpen: false, titleInput: '' });

  // 3. Add/Edit Column Indicator Modal
  const [columnModalState, setColumnModalState] = useState<{
    isOpen: boolean;
    tableId: string;
    indicatorId?: string; // If undefined -> Add, if defined -> Edit
    nameInput: string;
    maxScoreInput: number;
  }>({ isOpen: false, tableId: '', nameInput: '', maxScoreInput: 10 });

  // 4. Delete Confirmation Modals
  const [tableToDelete, setTableToDelete] = useState<AssessmentTableConfig | null>(null);
  const [columnToDelete, setColumnToDelete] = useState<{ tableId: string; indicator: AssessmentIndicator } | null>(null);

  // 5. Characteristics Evaluation Detail Modal
  const [evaluatingStudent, setEvaluatingStudent] = useState<Student | null>(null);
  const [modalSubScores, setModalSubScores] = useState<Record<string, number>>({});
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number>(0);
  const [isModalFullScreen, setIsModalFullScreen] = useState(false);

  // 6. Mobile Rapid Grading Modal for Reading/Writing
  const [mobileGradingStudent, setMobileGradingStudent] = useState<Student | null>(null);

  // 7. Mobile Rapid Grading Modal for Competencies
  const [evaluatingCompetencyStudent, setEvaluatingCompetencyStudent] = useState<Student | null>(null);

  // ==========================================
  // GRADE LEVEL & STUDENTS SELECTOR
  // ==========================================
  const normalizeRoom = (r?: string) => (r || '').replace(/^ห้อง\s*/i, '').trim() || '1';

  const memberHomeroomGrade = useMemo<GradeLevel | undefined>(() => {
    if (user.role !== 'member') return undefined;
    const members = StorageService.getMembers();
    const matched = members.find(
      m => m.id === user.id || m.username?.toLowerCase() === user.username?.toLowerCase()
    );
    return (matched?.gradeLevel || (user.assignedGrade as GradeLevel)) as GradeLevel | undefined;
  }, [user]);

  const memberHomeroomRoom = useMemo<string | undefined>(() => {
    if (user.role !== 'member') return undefined;
    const members = StorageService.getMembers();
    const matched = members.find(
      m => m.id === user.id || m.username?.toLowerCase() === user.username?.toLowerCase()
    );
    return normalizeRoom(matched?.room || user.assignedRoom);
  }, [user]);

  const availableGrades: GradeLevel[] = useMemo(() => {
    const list: GradeLevel[] = ['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'];
    const presentGrades = Array.from(new Set(students.map(s => s.gradeLevel)));
    return list.filter(g => presentGrades.includes(g) || g === currentGradeLevel || g === memberHomeroomGrade);
  }, [students, currentGradeLevel, memberHomeroomGrade]);

  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(() => {
    return memberHomeroomGrade || currentGradeLevel;
  });

  const [selectedRoom, setSelectedRoom] = useState<string>(() => {
    return memberHomeroomRoom || '1';
  });

  const availableRoomsForGrade = useMemo<string[]>(() => {
    const roomSet = new Set<string>(['1']);
    students
      .filter(s => s.gradeLevel === selectedGrade)
      .forEach(s => roomSet.add(normalizeRoom(s.room)));
    if (memberHomeroomRoom) roomSet.add(normalizeRoom(memberHomeroomRoom));
    return Array.from(roomSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, selectedGrade, memberHomeroomRoom]);

  useEffect(() => {
    if (memberHomeroomGrade && availableGrades.includes(memberHomeroomGrade)) {
      setSelectedGrade(memberHomeroomGrade);
      if (memberHomeroomRoom) setSelectedRoom(memberHomeroomRoom);
    } else if (currentGradeLevel && availableGrades.includes(currentGradeLevel)) {
      setSelectedGrade(currentGradeLevel);
    }
  }, [currentGradeLevel, memberHomeroomGrade, memberHomeroomRoom]);

  useEffect(() => {
    if (!availableRoomsForGrade.includes(selectedRoom)) {
      setSelectedRoom(availableRoomsForGrade[0] || '1');
    }
  }, [availableRoomsForGrade, selectedRoom]);

  // ตรวจสอบครูประจำชั้นของระดับชั้นและห้องที่เลือก
  const homeroomTeachersOfSelected = useMemo(() => {
    const members = StorageService.getMembers();
    return members.filter(
      m =>
        m.gradeLevel === selectedGrade &&
        normalizeRoom(m.room) === normalizeRoom(selectedRoom)
    );
  }, [selectedGrade, selectedRoom]);

  const isHomeroomTeacherOfSelected = useMemo(() => {
    if (isAdmin) return false;
    return (
      Boolean(memberHomeroomGrade) &&
      memberHomeroomGrade === selectedGrade &&
      normalizeRoom(memberHomeroomRoom) === normalizeRoom(selectedRoom)
    );
  }, [isAdmin, memberHomeroomGrade, memberHomeroomRoom, selectedGrade, selectedRoom]);

  // เฉพาะครูประจำชั้น ป. และ ห้อง นั้นๆ เท่านั้นที่เป็นผู้กรอกได้
  const isReadOnlyForUser = isLocked || isAdmin || !isHomeroomTeacherOfSelected;

  // นักเรียนในระดับชั้นและห้องที่เลือก เรียงตามเลขที่ 1 -> สุดท้าย
  const classStudents = useMemo(() => {
    return [...students.filter(s => s.gradeLevel === selectedGrade && normalizeRoom(s.room) === normalizeRoom(selectedRoom))].sort((a, b) => {
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
  }, [students, selectedGrade, selectedRoom]);

  // Mobile navigation handlers for Reading/Writing
  const currentMobileGradingIndex = mobileGradingStudent
    ? classStudents.findIndex(s => s.id === mobileGradingStudent.id)
    : -1;

  const handlePrevMobileGradingStudent = () => {
    if (currentMobileGradingIndex > 0) {
      setMobileGradingStudent(classStudents[currentMobileGradingIndex - 1]);
    }
  };

  const handleNextMobileGradingStudent = () => {
    if (currentMobileGradingIndex >= 0 && currentMobileGradingIndex < classStudents.length - 1) {
      setMobileGradingStudent(classStudents[currentMobileGradingIndex + 1]);
    }
  };

  // Mobile navigation handlers for Competencies
  const currentCompGradingIndex = evaluatingCompetencyStudent
    ? classStudents.findIndex(s => s.id === evaluatingCompetencyStudent.id)
    : -1;

  const handlePrevCompGradingStudent = () => {
    if (currentCompGradingIndex > 0) {
      setEvaluatingCompetencyStudent(classStudents[currentCompGradingIndex - 1]);
    }
  };

  const handleNextCompGradingStudent = () => {
    if (currentCompGradingIndex >= 0 && currentCompGradingIndex < classStudents.length - 1) {
      setEvaluatingCompetencyStudent(classStudents[currentCompGradingIndex + 1]);
    }
  };

  // ==========================================
  // STUDENT ASSESSMENT DATA persistance
  // ==========================================
  const [assessmentData, setAssessmentData] = useState<Record<string, StudentAssessmentRecord>>(() => {
    try {
      const saved = localStorage.getItem(ASSESSMENT_DATA_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load assessment data', e);
    }
    return {};
  });

  const getRecordKey = (studentId: string) => `${studentId}_${selectedGrade}_${currentSemester}_${currentAcademicYear}`;

  // Helper calculating max score for a table
  const getTableMaxScore = (table: AssessmentTableConfig): number => {
    return table.indicators.reduce((sum, ind) => sum + (ind.maxScore || 0), 0);
  };

  // Helper calculating total max score across all tables
  const getGrandMaxScore = (): number => {
    return rwConfig.tables.reduce((sum, t) => sum + getTableMaxScore(t), 0);
  };

  // Helper checking if a student has any score entered in a specific table
  const hasStudentTableScore = (rec: StudentAssessmentRecord | undefined, table: AssessmentTableConfig): boolean => {
    if (!rec || !rec.indicatorScores) return false;
    return table.indicators.some(ind => {
      const val = rec.indicatorScores[ind.id];
      return val !== undefined && val !== null && (val as any) !== '';
    });
  };

  // Helper checking if a student has any RW score entered across all tables
  const hasStudentAnyRWScore = (rec: StudentAssessmentRecord | undefined): boolean => {
    if (!rec || !rec.indicatorScores) return false;
    return rwConfig.tables.some(t => hasStudentTableScore(rec, t));
  };

  // Helper checking if a student has been evaluated in Characteristics (Booklet 2)
  const hasStudentCharacteristicsScore = (rec: StudentAssessmentRecord | undefined): boolean => {
    const ch = rec?.characteristics;
    if (!ch) return false;
    if (ch.evaluated === true) return true;
    if (ch.subScores && Object.keys(ch.subScores).length > 0) return true;
    return [ch.item1, ch.item2, ch.item3, ch.item4, ch.item5, ch.item6, ch.item7, ch.item8].some(
      v => typeof v === 'number' && v > 0
    );
  };

  // Helper checking if a student has been evaluated in Competencies (Booklet 3)
  const hasStudentCompetencyScore = (rec: StudentAssessmentRecord | undefined): boolean => {
    const comp = rec?.competency;
    if (!comp) return false;
    if (comp.evaluated === true) return true;
    return [comp.comp1, comp.comp2, comp.comp3, comp.comp4, comp.comp5].some(
      v => typeof v === 'number' && v > 0
    );
  };

  // Helper calculating student's total score for a single table
  const getStudentTableScore = (rec: StudentAssessmentRecord, table: AssessmentTableConfig): number => {
    if (!rec || !rec.indicatorScores) return 0;
    return table.indicators.reduce((sum, ind) => sum + (Number(rec.indicatorScores[ind.id]) || 0), 0);
  };

  // Helper calculating student's grand total score
  const getStudentGrandTotalScore = (rec: StudentAssessmentRecord): number => {
    if (!rec || !rec.indicatorScores) return 0;
    return rwConfig.tables.reduce((sum, t) => sum + getStudentTableScore(rec, t), 0);
  };

  // ==========================================
  // GRADING THRESHOLDS CONFIGURATION (ADMIN EDITABLE)
  // ==========================================

  const DEFAULT_THRESHOLDS: AssessmentThresholds = {
    reading: { excellent: 24, good: 21, passing: 18, maxScore: 30 },
    thinking: { excellent: 24, good: 21, passing: 18, maxScore: 40 },
    writing: { excellent: 32, good: 28, passing: 24, maxScore: 40 }
  };

  const THRESHOLDS_STORAGE_KEY = 'ams_assessment_thresholds_v3';

  const [thresholds, setThresholds] = useState<AssessmentThresholds>(() => {
    try {
      const saved = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          reading: { ...DEFAULT_THRESHOLDS.reading, ...parsed.reading },
          thinking: { ...DEFAULT_THRESHOLDS.thinking, ...parsed.thinking },
          writing: { ...DEFAULT_THRESHOLDS.writing, ...parsed.writing }
        };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_THRESHOLDS;
  });

  useEffect(() => {
    return StorageService.subscribe(() => {
      try {
        const savedRw = localStorage.getItem(RW_CONFIG_KEY);
        if (savedRw) setRwConfig(JSON.parse(savedRw));
      } catch {
        // ignore
      }
      try {
        const savedData = localStorage.getItem(ASSESSMENT_DATA_KEY);
        if (savedData) setAssessmentData(JSON.parse(savedData));
      } catch {
        // ignore
      }
      try {
        const savedTh = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
        if (savedTh) {
          const parsed = JSON.parse(savedTh);
          setThresholds({
            reading: { ...DEFAULT_THRESHOLDS.reading, ...parsed.reading },
            thinking: { ...DEFAULT_THRESHOLDS.thinking, ...parsed.thinking },
            writing: { ...DEFAULT_THRESHOLDS.writing, ...parsed.writing }
          });
        }
      } catch {
        // ignore
      }
    });
  }, []);

  const getTableTargetMaxScore = (tbl: AssessmentTableConfig, th: AssessmentThresholds = thresholds): number => {
    const title = (tbl.title || '').toLowerCase();
    if (tbl.id.includes('reading') || title.includes('อ่าน')) {
      return Number(th.reading.maxScore) || 30;
    }
    if (tbl.id.includes('thinking') || title.includes('คิด')) {
      return Number(th.thinking.maxScore) || 40;
    }
    if (tbl.id.includes('writing') || title.includes('เขียน')) {
      return Number(th.writing.maxScore) || 40;
    }
    return getTableMaxScore(tbl);
  };

  const rebalanceTableIndicators = (table: AssessmentTableConfig, targetMaxScore: number): AssessmentTableConfig => {
    if (!table.indicators || table.indicators.length === 0) return table;
    const count = table.indicators.length;
    const rawVal = targetMaxScore / count;
    const baseValue = Math.floor(rawVal * 10) / 10;
    const remainder = Math.round((targetMaxScore - (baseValue * count)) * 10) / 10;

    const newIndicators = table.indicators.map((ind, idx) => {
      const score = idx === 0 ? Math.round((baseValue + remainder) * 10) / 10 : baseValue;
      return {
        ...ind,
        maxScore: score
      };
    });

    return {
      ...table,
      indicators: newIndicators
    };
  };

  const saveThresholds = (newTh: AssessmentThresholds) => {
    setThresholds(newTh);
    try {
      localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(newTh));
    } catch (e) {
      console.error(e);
    }

    // Rebalance all table indicator columns to match the updated target max scores
    const updatedTables = rwConfig.tables.map(tbl => {
      const targetMax = getTableTargetMaxScore(tbl, newTh);
      return rebalanceTableIndicators(tbl, targetMax);
    });
    saveRwConfig({ ...rwConfig, tables: updatedTables });
  };

  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [thresholdInput, setThresholdInput] = useState<AssessmentThresholds>(thresholds);

  // Helper calculating level for individual table or grand total
  const getTableLevel = (score: number, type: 'reading' | 'thinking' | 'writing'): number => {
    const th = thresholds[type] || thresholds.reading;
    if (score >= th.excellent) return 3; // ดีเยี่ยม
    if (score >= th.good) return 2;      // ดี
    if (score >= th.passing) return 1;   // ผ่านเกณฑ์
    return 0;                            // ไม่ผ่านเกณฑ์
  };

  // Helper formatting criteria range string for table
  const getTableCriteriaText = (tbl: AssessmentTableConfig): string => {
    const title = tbl.title || '';
    if (tbl.id.includes('reading') || title.includes('อ่าน')) {
      const th = thresholds.reading;
      const m = th.maxScore || 30;
      return `ดีเยี่ยม (${th.excellent}-${m} คะแนน), ดี (${th.good}-${th.excellent - 1} คะแนน), ผ่านเกณฑ์ (${th.passing}-${th.good - 1} คะแนน), ไม่ผ่านเกณฑ์ (0-${th.passing - 1} คะแนน)`;
    }
    if (tbl.id.includes('thinking') || title.includes('คิด')) {
      const th = thresholds.thinking;
      const m = th.maxScore || 40;
      return `ดีเยี่ยม (${th.excellent}-${m} คะแนน), ดี (${th.good}-${th.excellent - 1} คะแนน), ผ่านเกณฑ์ (${th.passing}-${th.good - 1} คะแนน), ไม่ผ่านเกณฑ์ (0-${th.passing - 1} คะแนน)`;
    }
    if (tbl.id.includes('writing') || title.includes('เขียน')) {
      const th = thresholds.writing;
      const m = th.maxScore || 40;
      return `ดีเยี่ยม (${th.excellent}-${m} คะแนน), ดี (${th.good}-${th.excellent - 1} คะแนน), ผ่านเกณฑ์ (${th.passing}-${th.good - 1} คะแนน), ไม่ผ่านเกณฑ์ (0-${th.passing - 1} คะแนน)`;
    }
    return '';
  };

  const getTableType = (tbl: AssessmentTableConfig): 'reading' | 'thinking' | 'writing' => {
    const title = (tbl.title || '').toLowerCase();
    if (tbl.id.includes('reading') || title.includes('อ่าน')) return 'reading';
    if (tbl.id.includes('writing') || title.includes('เขียน')) return 'writing';
    return 'thinking';
  };

  const getTableLevelTextBadge = (score: number, tbl: AssessmentTableConfig) => {
    const type = getTableType(tbl);
    const level = getTableLevel(score, type);
    return getQualityTextBadge(level);
  };

  const getQualityTextBadge = (level: number) => {
    switch (level) {
      case 3:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">ดีเยี่ยม</span>;
      case 2:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">ดี</span>;
      case 1:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">ผ่านเกณฑ์</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">ไม่ผ่านเกณฑ์</span>;
    }
  };

  const getQuantityTableColumnTitle = (tbl: AssessmentTableConfig): string => {
    const title = (tbl.title || '').toLowerCase();
    if (tbl.id.includes('reading') || title.includes('อ่าน')) {
      return `อ่าน (${getTableMaxScore(tbl)})`;
    }
    if (tbl.id.includes('thinking') || title.includes('คิด') || title.includes('วิเคราะห์')) {
      return `คิดวิเคราะห์ (${getTableMaxScore(tbl)})`;
    }
    if (tbl.id.includes('writing') || title.includes('เขียน')) {
      return `เขียน (${getTableMaxScore(tbl)})`;
    }
    return `${cleanTitle(tbl.title)} (${getTableMaxScore(tbl)})`;
  };

  const getQualityTableColumnTitle = (tbl: AssessmentTableConfig): string => {
    const title = (tbl.title || '').toLowerCase();
    if (tbl.id.includes('reading') || title.includes('อ่าน')) {
      return 'การอ่าน';
    }
    if (tbl.id.includes('thinking') || title.includes('คิด') || title.includes('วิเคราะห์')) {
      return 'คิดวิเคราะห์';
    }
    if (tbl.id.includes('writing') || title.includes('เขียน')) {
      return 'การเขียน';
    }
    return cleanTitle(tbl.title);
  };

  // Helper calculating overall level (average of tables or grand score)
  const calculateStudentLevel = (rec: StudentAssessmentRecord): number => {
    if (!rec || !rec.indicatorScores) return 0;
    
    // Calculate score for reading, thinking, writing tables
    let rScore = 0;
    let tScore = 0;
    let wScore = 0;

    rwConfig.tables.forEach((tbl) => {
      const s = getStudentTableScore(rec, tbl);
      const titleLower = tbl.title.toLowerCase();
      if (titleLower.includes('อ่าน')) {
        rScore += s;
      } else if (titleLower.includes('คิด') || titleLower.includes('วิเคราะห์')) {
        tScore += s;
      } else if (titleLower.includes('เขียน')) {
        wScore += s;
      } else {
        // default fallback treat as thinking or reading
        tScore += s;
      }
    });

    const l1 = getTableLevel(rScore, 'reading');
    const l2 = getTableLevel(tScore, 'thinking');
    const l3 = getTableLevel(wScore, 'writing');

    // Average or minimum level
    const avg = Math.round((l1 + l2 + l3) / 3);
    return Math.min(3, Math.max(0, avg));
  };

  // Create default record for student (Unsaved year/semester starts clean without prefilled scores)
  const createDefaultRecord = (student: Student): StudentAssessmentRecord => {
    return {
      studentId: student.id,
      studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
      rollNumber: student.rollNumber,
      gradeLevel: selectedGrade,
      semester: currentSemester,
      academicYear: currentAcademicYear,
      indicatorScores: {},
      characteristics: {},
      competency: {}
    };
  };

  // Get student assessment record strictly from saved 3-booklets data (never prefill from mock/subject grades)
  const getStudentAssessment = (student: Student, sourceData?: Record<string, StudentAssessmentRecord>): StudentAssessmentRecord => {
    const key = getRecordKey(student.id);
    const dataSource = sourceData || assessmentData;
    const existing = dataSource[key];
    if (existing) {
      if (!existing.indicatorScores) {
        existing.indicatorScores = {};
      }
      if (!existing.characteristics) {
        existing.characteristics = {};
      }
      if (!existing.competency) {
        existing.competency = {};
      }
      return existing;
    }

    return createDefaultRecord(student);
  };

  // Helper to sync assessment data to GradeRecords and localStorage
  const syncAssessmentDataToGrades = (dataToSync: Record<string, StudentAssessmentRecord> = assessmentData) => {
    if (isReadOnlyForUser) return;
    try {
      localStorage.setItem(ASSESSMENT_DATA_KEY, JSON.stringify(dataToSync));
    } catch (e) {
      console.error('Storage error', e);
    }

    const roomFilteredSubjects = subjects.filter(
      s =>
        s.gradeLevel === selectedGrade &&
        normalizeRoom(s.room) === normalizeRoom(selectedRoom) &&
        (!s.semester || s.semester === currentSemester)
    );
    const classSubjectIds = (
      roomFilteredSubjects.length > 0
        ? roomFilteredSubjects
        : subjects.filter(s => s.gradeLevel === selectedGrade && (!s.semester || s.semester === currentSemester))
    ).map(s => s.id);

    if (classSubjectIds.length > 0 && onSaveGrades) {
      const updatedGrades = [...grades];
      let changesCount = 0;

      classStudents.forEach(st => {
        const assessment = getStudentAssessment(st, dataToSync);
        const hasRW = hasStudentAnyRWScore(assessment);
        const hasChar = hasStudentCharacteristicsScore(assessment);
        const hasComp = hasStudentCompetencyScore(assessment);
        if (!hasRW && !hasChar && !hasComp) return;

        const rwLevel = hasRW ? calculateStudentLevel(assessment) : undefined;
        const charLevel = hasChar ? (assessment.characteristics?.overallLevel ?? 0) : undefined;
        const compLevel = hasComp ? (assessment.competency?.overallLevel ?? 0) : undefined;

        classSubjectIds.forEach(subId => {
          const sub = subjects.find(s => s.id === subId);
          if (!sub) return;
          const idx = updatedGrades.findIndex(g => 
            g.studentId === st.id && 
            g.subjectId === subId && 
            g.semester === currentSemester
          );

          if (idx >= 0) {
            updatedGrades[idx] = {
              ...updatedGrades[idx],
              ...(rwLevel !== undefined ? { readingWritingScore: rwLevel } : {}),
              ...(charLevel !== undefined ? { desiredCharacteristicsScore: charLevel } : {}),
              ...(compLevel !== undefined ? { competencyScore: compLevel } : {})
            };
            changesCount++;
          }
        });
      });

      if (changesCount > 0) {
        onSaveGrades(updatedGrades);
      }
    }
  };

  // Update single indicator score for student
  const updateIndicatorScore = (student: Student, indicatorId: string, rawVal: string | number, maxScore: number) => {
    if (isReadOnlyForUser) return;
    const key = getRecordKey(student.id);
    const current = getStudentAssessment(student);

    const updatedScores = { ...current.indicatorScores };
    if (rawVal === '' || rawVal === undefined || rawVal === null || rawVal === '-') {
      delete updatedScores[indicatorId];
    } else {
      const num = Number(rawVal);
      const clampedScore = isNaN(num) ? 0 : Math.min(maxScore, Math.max(0, num));
      updatedScores[indicatorId] = clampedScore;
    }

    const updatedRecord: StudentAssessmentRecord = {
      ...current,
      indicatorScores: updatedScores
    };

    const nextData = { ...assessmentData, [key]: updatedRecord };
    setAssessmentData(nextData);
    try {
      localStorage.setItem(ASSESSMENT_DATA_KEY, JSON.stringify(nextData));
    } catch (e) {
      console.error(e);
    }
    syncAssessmentDataToGrades(nextData);
  };

  // Update characteristic item
  const updateCharacteristic = (student: Student, itemKey: keyof Characteristics8Criteria, value: number) => {
    if (isReadOnlyForUser) return;
    const key = getRecordKey(student.id);
    const current = getStudentAssessment(student);
    const updatedChar: Characteristics8Criteria = {
      ...current.characteristics,
      [itemKey]: value,
      evaluated: true
    };

    if (itemKey !== 'overallLevel') {
      const items = [
        updatedChar.item1, updatedChar.item2, updatedChar.item3, updatedChar.item4,
        updatedChar.item5, updatedChar.item6, updatedChar.item7, updatedChar.item8
      ].filter((v): v is number => typeof v === 'number');
      if (items.length > 0) {
        const avg = items.reduce((a, b) => a + b, 0) / items.length;
        updatedChar.overallLevel = Math.round(avg);
      }
    }

    const updatedRecord: StudentAssessmentRecord = {
      ...current,
      characteristics: updatedChar
    };

    const nextData = { ...assessmentData, [key]: updatedRecord };
    setAssessmentData(nextData);
    try {
      localStorage.setItem(ASSESSMENT_DATA_KEY, JSON.stringify(nextData));
    } catch (e) {
      console.error(e);
    }
  };

  // Update competency item
  const updateCompetency = (student: Student, compKey: keyof Competency5Criteria, rawValue: string | number) => {
    if (isReadOnlyForUser) return;
    const key = getRecordKey(student.id);
    const current = getStudentAssessment(student);
    const updatedComp: Competency5Criteria = { ...current.competency };

    if (rawValue === '' || rawValue === undefined || rawValue === null) {
      delete (updatedComp as any)[compKey];
    } else {
      (updatedComp as any)[compKey] = Number(rawValue);
    }

    const comps = [
      updatedComp.comp1, updatedComp.comp2, updatedComp.comp3, updatedComp.comp4, updatedComp.comp5
    ].filter((v): v is number => typeof v === 'number');

    if (comps.length > 0) {
      const avg = comps.reduce((a, b) => a + b, 0) / comps.length;
      updatedComp.overallLevel = Math.round(avg);
      updatedComp.evaluated = true;
    } else {
      delete updatedComp.overallLevel;
      updatedComp.evaluated = false;
    }

    const updatedRecord: StudentAssessmentRecord = {
      ...current,
      competency: updatedComp
    };

    const nextData = { ...assessmentData, [key]: updatedRecord };
    setAssessmentData(nextData);
    try {
      localStorage.setItem(ASSESSMENT_DATA_KEY, JSON.stringify(nextData));
    } catch (e) {
      console.error(e);
    }
    syncAssessmentDataToGrades(nextData);
  };

  // Update all 5 competency items at once for a student (e.g. from mobile popup quick fill)
  const updateAllCompetenciesForStudent = (student: Student, level: number) => {
    if (isReadOnlyForUser) return;
    const key = getRecordKey(student.id);
    const current = getStudentAssessment(student);
    const updatedComp: Competency5Criteria = {
      ...current.competency,
      comp1: level,
      comp2: level,
      comp3: level,
      comp4: level,
      comp5: level,
      overallLevel: level,
      evaluated: true
    };

    const updatedRecord: StudentAssessmentRecord = {
      ...current,
      competency: updatedComp
    };

    const nextData = { ...assessmentData, [key]: updatedRecord };
    setAssessmentData(nextData);
    try {
      localStorage.setItem(ASSESSMENT_DATA_KEY, JSON.stringify(nextData));
    } catch (e) {
      console.error(e);
    }
    syncAssessmentDataToGrades(nextData);
  };

  // Open characteristics modal
  const handleOpenCharacteristicsModal = (st: Student) => {
    setEvaluatingStudent(st);
    setActiveCategoryIndex(0);
    const curr = getStudentAssessment(st);
    const ch = curr.characteristics || {};
    const hasExisting = hasStudentCharacteristicsScore(curr);
    const initialSubScores: Record<string, number> = {};
    if (hasExisting) {
      if (ch.subScores && Object.keys(ch.subScores).length > 0) {
        Object.entries(ch.subScores).forEach(([k, v]) => {
          if (typeof v === 'number') initialSubScores[k] = v;
        });
      } else {
        CHARACTERISTICS_GROUPS.forEach(g => {
          if (ch[g.itemKey] !== undefined) {
            g.indicators.forEach(ind => {
              initialSubScores[ind.id] = ch[g.itemKey]!;
            });
          }
        });
      }
    }
    setModalSubScores(initialSubScores);
  };

  const handleSetModalSubScore = (indId: string, val: number) => {
    setModalSubScores(prev => ({
      ...prev,
      [indId]: val
    }));
  };

  const handleFillAllModalSubScores = (val: number) => {
    const updated: Record<string, number> = {};
    CHARACTERISTICS_GROUPS.forEach(g => {
      g.indicators.forEach(ind => {
        updated[ind.id] = val;
      });
    });
    setModalSubScores(updated);
  };

  const handleFillGroupModalSubScores = (groupKey: string, val: number) => {
    const grp = CHARACTERISTICS_GROUPS.find(g => g.id === groupKey);
    if (!grp) return;
    setModalSubScores(prev => {
      const next = { ...prev };
      grp.indicators.forEach(ind => {
        next[ind.id] = val;
      });
      return next;
    });
  };

  // Helper to calculate a group's score from modalSubScores (returns undefined if unrated)
  const getGroupCalculatedScore = (grp: CharacteristicGroup, scores: Record<string, number>): number | undefined => {
    const scoredInds = grp.indicators.filter(ind => typeof scores[ind.id] === 'number');
    if (scoredInds.length === 0) return undefined;
    const avg = scoredInds.reduce((sum, ind) => sum + scores[ind.id], 0) / scoredInds.length;
    return Math.round(avg);
  };

  // Helper to calculate grand overall score from all 8 group scores (returns undefined if unrated)
  const getModalGrandOverallScore = (scores: Record<string, number>): number | undefined => {
    const groupScores = CHARACTERISTICS_GROUPS
      .map(g => getGroupCalculatedScore(g, scores))
      .filter((s): s is number => s !== undefined);
    if (groupScores.length === 0) return undefined;
    const avg = groupScores.reduce((sum, s) => sum + s, 0) / groupScores.length;
    return Math.round(avg);
  };

  const handleSaveCharacteristicsEvaluationSilently = (studentToSave: Student = evaluatingStudent!) => {
    if (!studentToSave || isReadOnlyForUser) return;
    const scoredKeys = Object.keys(modalSubScores).filter(k => typeof modalSubScores[k] === 'number');
    if (scoredKeys.length === 0) return; // If unrated, don't overwrite

    const key = getRecordKey(studentToSave.id);
    const curr = getStudentAssessment(studentToSave);

    const item1 = getGroupCalculatedScore(CHARACTERISTICS_GROUPS[0], modalSubScores);
    const item2 = getGroupCalculatedScore(CHARACTERISTICS_GROUPS[1], modalSubScores);
    const item3 = getGroupCalculatedScore(CHARACTERISTICS_GROUPS[2], modalSubScores);
    const item4 = getGroupCalculatedScore(CHARACTERISTICS_GROUPS[3], modalSubScores);
    const item5 = getGroupCalculatedScore(CHARACTERISTICS_GROUPS[4], modalSubScores);
    const item6 = getGroupCalculatedScore(CHARACTERISTICS_GROUPS[5], modalSubScores);
    const item7 = getGroupCalculatedScore(CHARACTERISTICS_GROUPS[6], modalSubScores);
    const item8 = getGroupCalculatedScore(CHARACTERISTICS_GROUPS[7], modalSubScores);

    const groupScores = [item1, item2, item3, item4, item5, item6, item7, item8].filter((v): v is number => v !== undefined);
    const overallLevel = groupScores.length > 0
      ? Math.round(groupScores.reduce((a, b) => a + b, 0) / groupScores.length)
      : undefined;

    const updatedChar: Characteristics8Criteria = {
      item1: item1 ?? undefined,
      item2: item2 ?? undefined,
      item3: item3 ?? undefined,
      item4: item4 ?? undefined,
      item5: item5 ?? undefined,
      item6: item6 ?? undefined,
      item7: item7 ?? undefined,
      item8: item8 ?? undefined,
      overallLevel,
      subScores: { ...modalSubScores },
      evaluated: true
    };

    const nextData = {
      ...assessmentData,
      [key]: {
        ...curr,
        characteristics: updatedChar
      }
    };

    setAssessmentData(nextData);
    try {
      localStorage.setItem(ASSESSMENT_DATA_KEY, JSON.stringify(nextData));
    } catch (e) {
      console.error(e);
    }
    syncAssessmentDataToGrades(nextData);
  };

  const handleSaveCharacteristicsEvaluation = (andNextStudent: boolean = false) => {
    if (!evaluatingStudent) return;
    if (isReadOnlyForUser) {
      onShowToast(
        'warning',
        isAdmin ? 'ไม่มีสิทธิ์บันทึก' : !isHomeroomTeacherOfSelected ? 'เฉพาะครูประจำชั้นเท่านั้น' : 'ภาคเรียนถูกล็อก',
        isAdmin
          ? 'ผู้ดูแลระบบ (Admin) ไม่สามารถกรอกหรือแก้ไขคะแนนนักเรียนได้'
          : !isHomeroomTeacherOfSelected
          ? `เฉพาะครูประจำชั้น ${selectedGrade} ห้อง ${normalizeRoom(selectedRoom)} เท่านั้นที่สามารถกรอกประเมิน 3 เล่มของห้องนี้ได้`
          : 'ภาคเรียนนี้ถูกล็อกการบันทึก กรุณาติดต่อผู้ดูแลระบบ'
      );
      return;
    }

    handleSaveCharacteristicsEvaluationSilently(evaluatingStudent);

    onShowToast('success', 'บันทึกเรียบร้อย', `บันทึกผลการประเมินคุณลักษณะ 8 ประการของ ${evaluatingStudent.prefix}${evaluatingStudent.firstName} ${evaluatingStudent.lastName} เรียบร้อยแล้ว`);

    if (andNextStudent) {
      const curIdx = classStudents.findIndex(s => s.id === evaluatingStudent.id);
      if (curIdx >= 0 && curIdx < classStudents.length - 1) {
        handleOpenCharacteristicsModal(classStudents[curIdx + 1]);
        return;
      }
    }

    setEvaluatingStudent(null);
  };

  // Quick fill characteristics
  const quickFillCharacteristics = (level: number) => {
    if (isReadOnlyForUser) return;
    const nextData = { ...assessmentData };
    const allSubScores: Record<string, number> = {};
    CHARACTERISTICS_GROUPS.forEach(g => {
      g.indicators.forEach(ind => {
        allSubScores[ind.id] = level;
      });
    });

    classStudents.forEach(st => {
      const key = getRecordKey(st.id);
      const curr = getStudentAssessment(st);
      nextData[key] = {
        ...curr,
        characteristics: {
          item1: level, item2: level, item3: level, item4: level,
          item5: level, item6: level, item7: level, item8: level,
          overallLevel: level,
          subScores: { ...allSubScores },
          evaluated: true
        }
      };
    });
    setAssessmentData(nextData);
    try {
      localStorage.setItem(ASSESSMENT_DATA_KEY, JSON.stringify(nextData));
    } catch (e) {
      console.error(e);
    }
    const label = level === 3 ? 'ดีเยี่ยม' : level === 2 ? 'ดี' : level === 1 ? 'ผ่าน' : 'ไม่ผ่าน';
    onShowToast('success', 'บันทึกเรียบร้อย', `กำหนดคุณลักษณะ 8 ประการเป็นระดับ "${label}" ทุกคนในชั้น ${selectedGrade} ห้อง ${normalizeRoom(selectedRoom)}`);
  };

  // Quick fill competencies
  const quickFillCompetencies = (level: number) => {
    if (isReadOnlyForUser) return;
    const nextData = { ...assessmentData };
    classStudents.forEach(st => {
      const key = getRecordKey(st.id);
      const curr = getStudentAssessment(st);
      nextData[key] = {
        ...curr,
        competency: {
          comp1: level, comp2: level, comp3: level, comp4: level, comp5: level,
          overallLevel: level,
          evaluated: true
        }
      };
    });
    setAssessmentData(nextData);
    try {
      localStorage.setItem(ASSESSMENT_DATA_KEY, JSON.stringify(nextData));
    } catch (e) {
      console.error(e);
    }
    const label = level === 3 ? 'ดีเยี่ยม' : level === 2 ? 'ดี' : level === 1 ? 'ผ่าน' : 'ไม่ผ่าน';
    onShowToast('success', 'บันทึกเรียบร้อย', `กำหนดสมรรถนะสำคัญ 5 ด้านเป็นระดับ "${label}" ทุกคนในชั้น ${selectedGrade} ห้อง ${normalizeRoom(selectedRoom)}`);
  };

  // Save all and sync to GradeRecords
  const handleSaveAll = () => {
    if (isReadOnlyForUser) {
      onShowToast(
        'warning',
        isAdmin ? 'ผู้ดูแลระบบไม่มีสิทธิ์บันทึก' : !isHomeroomTeacherOfSelected ? 'เฉพาะครูประจำชั้นเท่านั้น' : 'ภาคเรียนถูกล็อก',
        isAdmin
          ? 'ผู้ดูแลระบบ (Admin) สามารถกำหนดโครงสร้างตารางและเกณฑ์คะแนนได้เท่านั้น ไม่สามารถกรอก/บันทึกคะแนนนักเรียนได้'
          : !isHomeroomTeacherOfSelected
          ? `เฉพาะครูประจำชั้น ${selectedGrade} ห้อง ${normalizeRoom(selectedRoom)} เท่านั้นที่เป็นผู้กรอกและบันทึกประเมิน 3 เล่มของห้องนี้`
          : 'ภาคเรียนนี้ถูกล็อกการบันทึก กรุณาติดต่อผู้ดูแลระบบ'
      );
      return;
    }

    syncAssessmentDataToGrades(assessmentData);
    onShowToast('success', 'บันทึกผลการประเมิน 3 เล่มแล้ว 🎉', `บันทึกข้อมูลการประเมินชั้น ${selectedGrade} ภาคเรียนที่ ${currentSemester} เรียบร้อยแล้ว`);
  };

  // Badge level rendering
  const getLevelBadge = (level: number) => {
    switch (level) {
      case 3:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">ดีเยี่ยม</span>;
      case 2:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">ดี</span>;
      case 1:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">ผ่าน</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">ไม่ผ่าน</span>;
    }
  };

  // ==========================================
  // ADMIN CONFIG HANDLERS
  // ==========================================
  // 1. Save Main Title
  const handleSaveMainTitle = () => {
    if (!isAdmin || !mainTitleInput.trim()) return;
    saveRwConfig({ ...rwConfig, mainTitle: mainTitleInput.trim() });
    setIsEditingMainTitleModalOpen(false);
    onShowToast('success', 'เปลี่ยนชื่อหัวข้อสำเร็จ', `อัปเดตชื่อหัวข้อหลักเป็น "${mainTitleInput.trim()}" เรียบร้อยแล้ว (มีผลต่อผู้ใช้งานทุกคน)`);
  };

  // 2. Save Table Title (Add / Edit)
  const handleSaveTableTitle = () => {
    if (!isAdmin || !tableModalState.titleInput.trim()) return;
    const { tableId, titleInput } = tableModalState;

    if (tableId) {
      // Edit Table
      const updatedTables = rwConfig.tables.map(t => 
        t.id === tableId ? { ...t, title: titleInput.trim() } : t
      );
      saveRwConfig({ ...rwConfig, tables: updatedTables });
      onShowToast('success', 'แก้ไขชื่อตารางสำเร็จ', `เปลี่ยนชื่อตารางเป็น "${titleInput.trim()}" แล้ว`);
    } else {
      // Add New Table
      const newTableId = `table-${Date.now()}`;
      const newTable: AssessmentTableConfig = {
        id: newTableId,
        title: titleInput.trim(),
        indicators: [
          { id: `ind-${Date.now()}-1`, name: 'ข้อ 1.1', maxScore: 10 }
        ]
      };
      const updatedTables = [...rwConfig.tables, newTable];
      saveRwConfig({ ...rwConfig, tables: updatedTables });
      setSelectedTableId(newTableId);
      onShowToast('success', 'เพิ่มตารางใหม่สำเร็จ 🎉', `สร้างตาราง "${titleInput.trim()}" เรียบร้อยแล้ว`);
    }

    setTableModalState({ isOpen: false, titleInput: '' });
  };

  // 3. Confirm Delete Table
  const handleDeleteTableConfirm = (tableId: string) => {
    if (!isAdmin) return;
    if (rwConfig.tables.length <= 1) {
      onShowToast('warning', 'ไม่สามารถลบได้', 'ต้องมีตารางการลงคะแนนอย่างน้อย 1 ตาราง');
      setTableToDelete(null);
      return;
    }

    const updatedTables = rwConfig.tables.filter(t => t.id !== tableId);
    saveRwConfig({ ...rwConfig, tables: updatedTables });
    if (selectedTableId === tableId) {
      setSelectedTableId(updatedTables[0]?.id || 'summary');
    }
    setTableToDelete(null);
    onShowToast('info', 'ลบตารางเรียบร้อย', 'ลบตารางการประเมินออกจากระบบเรียบร้อยแล้ว');
  };

  // 4. Save Column Indicator (Add / Edit)
  const handleSaveColumn = () => {
    if (!isAdmin || !columnModalState.nameInput.trim()) return;
    const { tableId, indicatorId, nameInput, maxScoreInput } = columnModalState;
    const validMaxScore = Math.max(1, Number(maxScoreInput) || 10);

    const updatedTables = rwConfig.tables.map(t => {
      if (t.id !== tableId) return t;

      if (indicatorId) {
        // Edit Column
        const updatedInds = t.indicators.map(ind => 
          ind.id === indicatorId 
            ? { ...ind, name: nameInput.trim(), maxScore: validMaxScore } 
            : ind
        );
        return { ...t, indicators: updatedInds };
      } else {
        // Add Column -> Rebalance so adding column DOES NOT increase total table max score!
        const newInd: AssessmentIndicator = {
          id: `ind-${Date.now()}`,
          name: nameInput.trim(),
          maxScore: validMaxScore
        };
        const tempTable = { ...t, indicators: [...t.indicators, newInd] };
        const targetMax = getTableTargetMaxScore(tempTable, thresholds);
        return rebalanceTableIndicators(tempTable, targetMax);
      }
    });

    saveRwConfig({ ...rwConfig, tables: updatedTables });
    setColumnModalState({ isOpen: false, tableId: '', nameInput: '', maxScoreInput: 10 });
    onShowToast('success', 'เพิ่มช่องลงคะแนนสำเร็จ 🎉', `เฉลี่ยคะแนนของทุกช่องรวมเท่ากับคะแนนเต็มเรียบร้อยแล้ว`);
  };

  // 5. Confirm Delete Column
  const handleDeleteColumnConfirm = (tableId: string, indicatorId: string) => {
    if (!isAdmin) return;
    const table = rwConfig.tables.find(t => t.id === tableId);
    if (table && table.indicators.length <= 1) {
      onShowToast('warning', 'ไม่สามารถลบได้', 'แต่ละตารางต้องมีช่องคะแนนอย่างน้อย 1 ช่อง');
      setColumnToDelete(null);
      return;
    }

    const updatedTables = rwConfig.tables.map(t => {
      if (t.id !== tableId) return t;
      const remainingInds = t.indicators.filter(ind => ind.id !== indicatorId);
      const tempTable = { ...t, indicators: remainingInds };
      const targetMax = getTableTargetMaxScore(tempTable, thresholds);
      return rebalanceTableIndicators(tempTable, targetMax);
    });

    saveRwConfig({ ...rwConfig, tables: updatedTables });
    setColumnToDelete(null);
    onShowToast('info', 'ลบช่องคะแนนแล้ว', 'เฉลี่ยคะแนนของช่องที่เหลือตามคะแนนเต็มเรียบร้อยแล้ว');
  };

  // Active table config for readingWriting
  const activeTableConfig = rwConfig.tables.find(t => t.id === selectedTableId);

  return (
    <div className="space-y-4">
      {/* 3 Main Navigation Buttons (ปุ่มกดทั้ง 3 หน้าตามที่ผู้ใช้กำหนด) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Admin Bar: Top bar for Admin only (Members see their own class from main app bar) */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-xl">
                  <FileText className="w-4 h-4 text-amber-700" />
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  ระบบประเมิน 3 เล่ม
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900">
                  ชั้น {selectedGrade} ห้อง {normalizeRoom(selectedRoom)}
                  {homeroomTeachersOfSelected.length > 0 && (
                    <span className="font-semibold text-amber-700">
                      • ครูประจำชั้น: {homeroomTeachersOfSelected.map(t => t.fullName).join(', ')}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
              {/* เลือกระดับชั้น */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700">ชั้น:</span>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                >
                  {availableGrades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {availableRoomsForGrade.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 px-1">ห้อง:</span>
                  {availableRoomsForGrade.map(rm => (
                    <button
                      key={rm}
                      type="button"
                      onClick={() => setSelectedRoom(rm)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        normalizeRoom(selectedRoom) === rm
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      ห้อง {rm}
                    </button>
                  ))}
                </div>
              )}

              {/* ปุ่มบันทึก */}
              <button
                type="button"
                disabled={isReadOnlyForUser}
                onClick={handleSaveAll}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 active:scale-95 bg-amber-600 hover:bg-amber-700 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกผลประเมิน</span>
              </button>
            </div>
          </div>
        )}

        {!isAdmin && !isHomeroomTeacherOfSelected && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <span>
                เฉพาะครูประจำชั้น <strong>{selectedGrade} ห้อง {normalizeRoom(selectedRoom)}</strong> เท่านั้นที่เป็นผู้กรอกผลประเมิน 3 เล่มของห้องนี้ (คุณกำลังเปิดดูในโหมดอ่านอย่างเดียว)
              </span>
            </div>
            {memberHomeroomGrade && (
              <button
                type="button"
                onClick={() => {
                  setSelectedGrade(memberHomeroomGrade);
                  setSelectedRoom(normalizeRoom(memberHomeroomRoom));
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0"
              >
                สลับไปชั้นประจำชั้นของฉัน ({memberHomeroomGrade} ห้อง {normalizeRoom(memberHomeroomRoom)})
              </button>
            )}
          </div>
        )}

        {/* 3 Main Buttons (หน้านำทาง 3 หน้า) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-3">
          {/* ปุ่มที่ 1: การอ่าน คิดวิเคราะห์ และเขียน */}
          <button
            type="button"
            onClick={() => setActiveBooklet('readingWriting')}
            className={`p-3 rounded-xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
              activeBooklet === 'readingWriting'
                ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
              activeBooklet === 'readingWriting' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            }`}>
              1
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-bold ${activeBooklet === 'readingWriting' ? 'text-amber-950' : 'text-slate-800'}`}>
                {rwConfig.mainTitle}
              </div>
            </div>
          </button>

          {/* ปุ่มที่ 2: คุณลักษณะอันพึงประสงค์ (8 ประการ) */}
          <button
            type="button"
            onClick={() => setActiveBooklet('characteristics')}
            className={`p-3 rounded-xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
              activeBooklet === 'characteristics'
                ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
              activeBooklet === 'characteristics' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            }`}>
              2
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-bold ${activeBooklet === 'characteristics' ? 'text-amber-950' : 'text-slate-800'}`}>
                2. คุณลักษณะอันพึงประสงค์ (8 ประการ)
              </div>
            </div>
          </button>

          {/* ปุ่มที่ 3: สมรรถนะสำคัญ (5 ด้าน) */}
          <button
            type="button"
            onClick={() => setActiveBooklet('competencies')}
            className={`p-3 rounded-xl border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
              activeBooklet === 'competencies'
                ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
              activeBooklet === 'competencies' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
            }`}>
              3
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-bold ${activeBooklet === 'competencies' ? 'text-amber-950' : 'text-slate-800'}`}>
                3. สมรรถนะสำคัญ (5 ด้าน)
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* หน้าที่ 1: การอ่าน คิดวิเคราะห์ และเขียน (แบบไดนามิก ADMIN ปรับได้) */}
      {/* ========================================================= */}
      {activeBooklet === 'readingWriting' && (
        <div className="space-y-3">
          {/* Sub-tabs bar: Render tables dynamically + สรุปภาพรวม */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* MOBILE VIEW SUB-TABS (sm:hidden) */}
            <div className="flex flex-col gap-2 w-full sm:hidden">
              {/* แถวที่ 1: การอ่าน, คิดวิเคราะห์, การเขียน ปรับให้เท่าๆกันเต็มบรรทัด */}
              <div className="grid grid-cols-3 gap-1.5 w-full">
                {rwConfig.tables.map((tbl) => {
                  const isSelected = selectedTableId === tbl.id;
                  const label = cleanTitle(tbl.title);

                  return (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTableId(tbl.id);
                        setIsSummaryDropdownOpen(false);
                      }}
                      className={`w-full py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-center truncate ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* แถวที่ 2: สรุปปริมาณ และ สรุปคุณภาพ แสดงเลย 2 ปุ่ม ให้เท่าๆกันเต็มบรรทัดพอดี */}
              <div className="grid grid-cols-2 gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTableId('summary');
                    setSummaryViewType('quantity');
                  }}
                  className={`w-full py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                    selectedTableId === 'summary' && summaryViewType === 'quantity'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">สรุปปริมาณ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTableId('summary');
                    setSummaryViewType('quality');
                  }}
                  className={`w-full py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                    selectedTableId === 'summary' && summaryViewType === 'quality'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">สรุปคุณภาพ</span>
                </button>
              </div>

              {/* Edit Score Criteria Button (Admin Only on Mobile) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setThresholdInput(thresholds);
                    setIsThresholdModalOpen(true);
                  }}
                  className="w-full py-1.5 px-3 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="แก้ไขปรับระดับเกณฑ์คะแนน (การอ่าน / คิดวิเคราะห์ / การเขียน)"
                >
                  <Edit className="w-3.5 h-3.5 text-amber-700" />
                  <span>แก้ไขเกณฑ์คะแนน (Admin)</span>
                </button>
              )}
            </div>

            {/* DESKTOP VIEW SUB-TABS (hidden sm:flex) */}
            <div className="hidden sm:flex sm:items-center sm:justify-between gap-2.5 w-full">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-600 px-1 inline shrink-0">ตารางประเมิน:</span>
                  
                  {rwConfig.tables.map((tbl) => {
                    const isSelected = selectedTableId === tbl.id;
                    const label = cleanTitle(tbl.title);

                    return (
                      <button
                        key={tbl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTableId(tbl.id);
                          setIsSummaryDropdownOpen(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ปุ่มสรุปภาพรวม (Desktop) */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSummaryDropdownOpen(!isSummaryDropdownOpen)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                      selectedTableId === 'summary'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>
                      {selectedTableId === 'summary'
                        ? (summaryViewType === 'quantity' ? 'สรุปปริมาณ' : 'สรุปคุณภาพ')
                        : 'สรุปภาพรวม'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSummaryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSummaryDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsSummaryDropdownOpen(false)}
                      />
                      <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTableId('summary');
                            setSummaryViewType('quantity');
                            setIsSummaryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                            selectedTableId === 'summary' && summaryViewType === 'quantity'
                              ? 'text-emerald-700 bg-emerald-50/60'
                              : 'text-slate-700'
                          }`}
                        >
                          <BarChart2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="flex flex-col">
                            <span>📊 สรุปปริมาณ</span>
                            <span className="text-[10px] text-slate-400 font-normal">ตารางคะแนนรวมตัวเลข</span>
                          </div>
                          {selectedTableId === 'summary' && summaryViewType === 'quantity' && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTableId('summary');
                            setSummaryViewType('quality');
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                            selectedTableId === 'summary' && summaryViewType === 'quality'
                              ? 'text-blue-700 bg-blue-50/60'
                              : 'text-slate-700'
                          }`}
                        >
                          <Award className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="flex flex-col">
                            <span>🏆 สรุปคุณภาพ</span>
                            <span className="text-[10px] text-slate-400 font-normal">ตารางระดับเกณฑ์ตัวหนังสือ</span>
                          </div>
                          {selectedTableId === 'summary' && summaryViewType === 'quality' && (
                            <Check className="w-3.5 h-3.5 text-blue-600 ml-auto shrink-0" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Far Right: Edit Score Criteria Button (Admin Only on Desktop) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setThresholdInput(thresholds);
                    setIsThresholdModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                  title="แก้ไขปรับระดับเกณฑ์คะแนน (การอ่าน / คิดวิเคราะห์ / การเขียน)"
                >
                  <Edit className="w-3.5 h-3.5 text-amber-700" />
                  <span>แก้ไขเกณฑ์คะแนน</span>
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE TABLE CONTENT VIEW */}
          {selectedTableId !== 'summary' && activeTableConfig && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              {/* Table Bar Header */}
              <div className="p-3 bg-amber-50/80 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                  <h4 className="text-xs font-bold text-amber-950">
                    {cleanTitle(activeTableConfig.title)} (คะแนนเต็ม {getTableMaxScore(activeTableConfig)} คะแนน)
                  </h4>
                </div>

                {/* Admin Button: "+ เพิ่มช่องคะแนน / ตัวชี้วัด" */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setColumnModalState({
                        isOpen: true,
                        tableId: activeTableConfig.id,
                        indicatorId: undefined,
                        nameInput: `ข้อ ${activeTableConfig.indicators.length + 1}.1 `,
                        maxScoreInput: 10
                      });
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                    title=" Admin เพิ่มช่องตัวชี้วัด/ลงคะแนนใหม่ในตารางนี้"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มช่องลงคะแนน</span>
                  </button>
                )}
              </div>

              {/* TABLE DATA GRID (DESKTOP) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">เลขที่</th>
                      <th className="py-2.5 px-3 min-w-[150px]">ชื่อ - นามสกุล</th>
                      
                      {/* Dynamic Column Headers */}
                      {activeTableConfig.indicators.map((ind) => (
                        <th key={ind.id} className="py-2.5 px-3 text-center min-w-[120px]">
                          <div className="flex flex-col items-center justify-center">
                            <div className="font-bold text-slate-800 flex items-center gap-1 justify-center">
                              <span>{ind.name}</span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setColumnModalState({
                                      isOpen: true,
                                      tableId: activeTableConfig.id,
                                      indicatorId: ind.id,
                                      nameInput: ind.name,
                                      maxScoreInput: ind.maxScore
                                    });
                                  }}
                                  className="p-0.5 hover:bg-amber-100 rounded text-amber-700 cursor-pointer"
                                  title="Admin แก้ไขชื่อหรือคะแนนเต็มของช่องนี้"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <span>(เต็ม {ind.maxScore})</span>
                              {isAdmin && activeTableConfig.indicators.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setColumnToDelete({ tableId: activeTableConfig.id, indicator: ind })}
                                  className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                                  title="Admin ลบช่องลงคะแนนนี้"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </th>
                      ))}

                      <th className="py-2.5 px-3 text-center w-28 bg-amber-50/60 font-bold text-amber-900 border-r border-slate-200/60">
                        รวมตารางนี้ ({getTableMaxScore(activeTableConfig)})
                      </th>
                      <th className="py-2.5 px-3 text-center w-36 bg-amber-100/50 font-bold text-amber-950">
                        เกณฑ์คะแนนตัวหนังสือ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.map((st) => {
                      const rec = getStudentAssessment(st);
                      const hasScore = hasStudentTableScore(rec, activeTableConfig);
                      const tableTotal = getStudentTableScore(rec, activeTableConfig);

                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center font-mono text-slate-500 font-bold">
                            {st.rollNumber ?? '-'}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            {st.prefix}{st.firstName} {st.lastName}
                          </td>

                          {/* Dynamic Student Score Input Cells */}
                          {activeTableConfig.indicators.map((ind) => {
                            const val = rec.indicatorScores?.[ind.id] !== undefined ? rec.indicatorScores[ind.id] : '';

                            return (
                              <td key={ind.id} className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={ind.maxScore}
                                  disabled={isReadOnlyForUser}
                                  value={val}
                                  onChange={(e) => updateIndicatorScore(st, ind.id, e.target.value, ind.maxScore)}
                                  placeholder="-"
                                  className={`w-14 text-center font-bold font-mono py-1 rounded-lg border focus:outline-none placeholder:text-slate-300 ${
                                    isReadOnlyForUser
                                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                                      : 'bg-white text-slate-800 border-slate-200 focus:ring-1 focus:ring-amber-500'
                                  }`}
                                />
                              </td>
                            );
                          })}

                          <td className="py-2 px-3 text-center bg-amber-50/40 border-r border-slate-100">
                            <span className="font-bold font-mono text-amber-900 text-xs">
                              {hasScore ? `${tableTotal} / ${getTableMaxScore(activeTableConfig)}` : `- / ${getTableMaxScore(activeTableConfig)}`}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center bg-amber-100/30">
                            {hasScore ? getTableLevelTextBadge(tableTotal, activeTableConfig) : <span className="text-slate-400 font-normal">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* TABLE DATA GRID (MOBILE: เลขที่, รูปโปรไฟล์นักเรียน, ชื่อนามสกุล, เกณฑ์คะแนน) */}
              <div className="sm:hidden overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-12">เลขที่</th>
                      <th className="py-2.5 px-2 text-center w-14">รูปโปรไฟล์</th>
                      <th className="py-2.5 px-2">ชื่อนามสกุล</th>
                      <th className="py-2.5 px-2 text-center w-24">เกณฑ์คะแนน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.map((st) => {
                      const rec = getStudentAssessment(st);
                      const hasScore = hasStudentTableScore(rec, activeTableConfig);
                      const tableTotal = getStudentTableScore(rec, activeTableConfig);

                      return (
                        <tr
                          key={st.id}
                          onClick={() => setMobileGradingStudent(st)}
                          className="hover:bg-amber-50/40 active:bg-amber-100/50 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-xs text-slate-600">
                            {st.rollNumber ?? '-'}
                          </td>
                          <td className="py-2 px-1 text-center">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 mx-auto flex items-center justify-center">
                              {st.photoUrl ? (
                                <img src={st.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="font-semibold text-xs text-slate-800 leading-tight">
                              {st.prefix}{st.firstName} {st.lastName}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {hasScore ? `รวม: ${tableTotal}/${getTableMaxScore(activeTableConfig)}` : 'ยังไม่ได้ลงคะแนน'}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {hasScore ? (
                              getTableLevelTextBadge(tableTotal, activeTableConfig)
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: SUMMARY OVERVIEW WITH 2 CLEAR PAGES (สรุปปริมาณ & สรุปคุณภาพ) */}
          {selectedTableId === 'summary' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-0">
              {/* Header with 2 clear page buttons: สรุปปริมาณ และ สรุปคุณภาพ (Hidden on mobile because sub-tabs bar above handles it) */}
              <div className="hidden sm:flex p-3.5 bg-amber-50/90 border-b border-amber-100 flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-amber-700 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                    สรุป อ่าน คิดวิเคราะห์ เขียน (คะแนนรวม {getGrandMaxScore()} คะแนน)
                  </h4>
                </div>

                {/* 2 ปุ่มชัดเจนเป็น 2 หน้า: สรุปปริมาณ และ สรุปคุณภาพ */}
                <div className="flex items-center p-1 bg-white/95 rounded-xl border border-amber-200 shadow-2xs gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSummaryViewType('quantity')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      summaryViewType === 'quantity'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>สรุปปริมาณ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSummaryViewType('quality')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      summaryViewType === 'quality'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>สรุปคุณภาพ</span>
                  </button>
                </div>
              </div>

              {/* เมื่อกดปุ่มสรุปปริมาณ: รวมตารางการอ่าน รวมตารางการคิดวิเคราะห์ รวมตารางการเขียน และรวมทั้งหมด */}
              {summaryViewType === 'quantity' && (
                <>
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">เลขที่</th>
                          <th className="py-2.5 px-3 min-w-[150px]">ชื่อ - นามสกุล</th>
                          
                          {/* Sub-total header for each table */}
                          {rwConfig.tables.map(tbl => (
                            <th key={tbl.id} className="py-2.5 px-3 text-center min-w-[180px] text-amber-950 bg-amber-50/30 border-x border-slate-100">
                              <div className="font-bold text-xs">{getQuantityTableColumnTitle(tbl)}</div>
                            </th>
                          ))}

                          <th className="py-2.5 px-3 text-center min-w-[110px] bg-amber-100/60 font-bold text-amber-950">
                            รวมทั้งหมด ({getGrandMaxScore()})
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.map((st) => {
                          const rec = getStudentAssessment(st);
                          const hasAny = hasStudentAnyRWScore(rec);
                          const grandTotal = getStudentGrandTotalScore(rec);

                          return (
                            <tr key={st.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-center font-mono text-slate-500 font-bold">
                                {st.rollNumber ?? '-'}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                                {st.prefix}{st.firstName} {st.lastName}
                              </td>

                              {rwConfig.tables.map(tbl => {
                                const hasTbl = hasStudentTableScore(rec, tbl);
                                const tScore = getStudentTableScore(rec, tbl);
                                return (
                                  <td key={tbl.id} className="py-2 px-3 text-center font-mono font-bold text-slate-700 bg-amber-50/10">
                                    {hasTbl ? tScore : '-'}
                                  </td>
                                );
                              })}

                              <td className="py-2 px-3 text-center font-mono font-bold text-amber-950 bg-amber-100/40 text-xs">
                                {hasAny ? `${grandTotal} / ${getGrandMaxScore()}` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Quantity Summary Table */}
                  <div className="sm:hidden overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-2 text-center w-12">เลขที่</th>
                          <th className="py-2.5 px-2 text-center w-14">รูปโปรไฟล์</th>
                          <th className="py-2.5 px-2">ชื่อนามสกุล</th>
                          <th className="py-2.5 px-2 text-center w-24">เกณฑ์คะแนน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.map((st) => {
                          const rec = getStudentAssessment(st);
                          const hasAny = hasStudentAnyRWScore(rec);
                          const grandTotal = getStudentGrandTotalScore(rec);

                          return (
                            <tr key={st.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-xs text-slate-600">
                                {st.rollNumber ?? '-'}
                              </td>
                              <td className="py-2 px-1 text-center">
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 mx-auto flex items-center justify-center">
                                  {st.photoUrl ? (
                                    <img src={st.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="font-semibold text-xs text-slate-800 leading-tight">
                                  {st.prefix}{st.firstName} {st.lastName}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-950 text-xs">
                                {hasAny ? `${grandTotal}/${getGrandMaxScore()}` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* เมื่อกดปุ่มสรุปคุณภาพ: การอ่าน คิดวิเคราะห์ การเขียน และสรุป */}
              {summaryViewType === 'quality' && (
                <>
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">เลขที่</th>
                          <th className="py-2.5 px-3 min-w-[150px]">ชื่อ - นามสกุล</th>
                          
                          {/* Sub-total header for each table */}
                          {rwConfig.tables.map(tbl => (
                            <th key={tbl.id} className="py-2.5 px-3 text-center min-w-[140px] text-blue-950 bg-blue-50/30 border-x border-slate-100">
                              <div className="font-bold text-xs">{getQualityTableColumnTitle(tbl)}</div>
                            </th>
                          ))}

                          <th className="py-2.5 px-3 text-center min-w-[120px] bg-blue-100/60 font-bold text-blue-950">
                            สรุป
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.map((st) => {
                          const rec = getStudentAssessment(st);
                          const hasAny = hasStudentAnyRWScore(rec);
                          const overallLvl = calculateStudentLevel(rec);

                          return (
                            <tr key={st.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-center font-mono text-slate-500 font-bold">
                                {st.rollNumber ?? '-'}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                                {st.prefix}{st.firstName} {st.lastName}
                              </td>

                              {rwConfig.tables.map(tbl => {
                                const hasTbl = hasStudentTableScore(rec, tbl);
                                const tScore = getStudentTableScore(rec, tbl);
                                return (
                                  <td key={tbl.id} className="py-2 px-3 text-center bg-blue-50/10">
                                    {hasTbl ? getTableLevelTextBadge(tScore, tbl) : <span className="text-slate-400 font-normal">-</span>}
                                  </td>
                                );
                              })}

                              <td className="py-2 px-3 text-center bg-blue-100/40">
                                {hasAny ? getQualityTextBadge(overallLvl) : <span className="text-slate-400 font-normal">-</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Quality Summary Table */}
                  <div className="sm:hidden overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-2 text-center w-12">เลขที่</th>
                          <th className="py-2.5 px-2 text-center w-14">รูปโปรไฟล์</th>
                          <th className="py-2.5 px-2">ชื่อนามสกุล</th>
                          <th className="py-2.5 px-2 text-center w-24">เกณฑ์คะแนน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.map((st) => {
                          const rec = getStudentAssessment(st);
                          const hasAny = hasStudentAnyRWScore(rec);
                          const overallLvl = calculateStudentLevel(rec);

                          return (
                            <tr key={st.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-xs text-slate-600">
                                {st.rollNumber ?? '-'}
                              </td>
                              <td className="py-2 px-1 text-center">
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 mx-auto flex items-center justify-center">
                                  {st.photoUrl ? (
                                    <img src={st.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="font-semibold text-xs text-slate-800 leading-tight">
                                  {st.prefix}{st.firstName} {st.lastName}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                {hasAny ? getQualityTextBadge(overallLvl) : <span className="text-slate-400 text-xs">-</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* หน้าที่ 2: คุณลักษณะอันพึงประสงค์ (8 ประการ) */}
      {/* ========================================================= */}
      {activeBooklet === 'characteristics' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">เลขที่</th>
                    <th className="py-2.5 px-3 min-w-[150px]">
                      <div>ชื่อ - นามสกุล</div>
                      {!isAdmin && <div className="text-[9px] font-normal text-blue-600">(กดชื่อเพื่อประเมิน)</div>}
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]" title="1. รักชาติ ศาสน์ กษัตริย์">
                      1.รักชาติ
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]" title="2. ซื่อสัตย์สุจริต">
                      2.ซื่อสัตย์
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]" title="3. มีวินัย">
                      3.มีวินัย
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]" title="4. ใฝ่เรียนรู้">
                      4.ใฝ่เรียน
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]" title="5. อยู่อย่างพอเพียง">
                      5.พอเพียง
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]" title="6. มุ่งมั่นในการทำงาน">
                      6.มุ่งมั่น
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]" title="7. รักความเป็นไทย">
                      7.รักไทย
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]" title="8. มีจิตสาธารณะ">
                      8.จิตสาธารณะ
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[100px] bg-amber-50/80 font-bold text-amber-950">
                      สรุปผล
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((st) => {
                    const rec = getStudentAssessment(st);
                    const ch = rec.characteristics || {};
                    const hasChar = hasStudentCharacteristicsScore(rec);
                    const items: ('item1' | 'item2' | 'item3' | 'item4' | 'item5' | 'item6' | 'item7' | 'item8')[] = [
                      'item1', 'item2', 'item3', 'item4',
                      'item5', 'item6', 'item7', 'item8'
                    ];

                    return (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-slate-500 font-bold">
                          {st.rollNumber ?? '-'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {isReadOnlyForUser ? (
                            <span className="font-semibold text-slate-800">
                              {st.prefix}{st.firstName} {st.lastName}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenCharacteristicsModal(st)}
                              className="group text-left text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1.5 hover:underline cursor-pointer"
                              title="กดเพื่อเปิดหน้าต่างประเมินคุณลักษณะอันพึงประสงค์ 8 ประการแบบละเอียด"
                            >
                              <span>{st.prefix}{st.firstName} {st.lastName}</span>
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-1.5 py-0.5 rounded-md border border-blue-200 transition-colors">
                                <Edit className="w-2.5 h-2.5" />
                                <span>ประเมิน</span>
                              </span>
                            </button>
                          )}
                        </td>
                        {items.map((itKey) => {
                          const val = hasChar ? ch[itKey] : undefined;
                          return (
                            <td key={itKey} className="py-2 px-1 text-center font-mono select-none">
                              {val !== undefined && val !== null ? (
                                <span 
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shadow-2xs ${
                                    val === 3 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    val === 2 ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                    val === 1 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                  title={`คะแนนระดับ ${val} (กดชื่อนักเรียนเพื่อแก้ไข)`}
                                >
                                  {val}
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-normal text-slate-400 bg-slate-50 border border-slate-200/70">
                                  -
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center bg-amber-50/40">
                          {hasChar && ch.overallLevel !== undefined ? getLevelBadge(ch.overallLevel) : <span className="text-slate-400 font-normal">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Table */}
            <div className="sm:hidden overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-12">เลขที่</th>
                    <th className="py-2.5 px-2 text-center w-14">รูปโปรไฟล์</th>
                    <th className="py-2.5 px-2">ชื่อนามสกุล</th>
                    <th className="py-2.5 px-2 text-center w-24">เกณฑ์คะแนน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((st) => {
                    const rec = getStudentAssessment(st);
                    const ch = rec.characteristics || {};
                    const hasChar = hasStudentCharacteristicsScore(rec);

                    return (
                      <tr
                        key={st.id}
                        onClick={() => handleOpenCharacteristicsModal(st)}
                        className="hover:bg-amber-50/40 active:bg-amber-100/50 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-xs text-slate-600">
                          {st.rollNumber ?? '-'}
                        </td>
                        <td className="py-2 px-1 text-center">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 mx-auto flex items-center justify-center">
                            {st.photoUrl ? (
                              <img src={st.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="font-semibold text-xs text-slate-800 leading-tight">
                            {st.prefix}{st.firstName} {st.lastName}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {hasChar && ch.overallLevel !== undefined ? (
                            getLevelBadge(ch.overallLevel)
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
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

      {/* ========================================================= */}
      {/* หน้าที่ 3: สมรรถนะสำคัญ (5 ด้าน) */}
      {/* ========================================================= */}
      {activeBooklet === 'competencies' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">เลขที่</th>
                    <th className="py-2.5 px-3 min-w-[140px]">ชื่อ - นามสกุล</th>
                    <th className="py-2.5 px-2 text-center min-w-[80px]" title="1. ความสามารถในการสื่อสาร">
                      1.การสื่อสาร
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[80px]" title="2. ความสามารถในการคิด">
                      2.การคิด
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[80px]" title="3. ความสามารถในการแก้ปัญหา">
                      3.แก้ปัญหา
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[80px]" title="4. ความสามารถในการใช้ทักษะชีวิต">
                      4.ทักษะชีวิต
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[80px]" title="5. ความสามารถในการใช้เทคโนโลยี">
                      5.เทคโนโลยี
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[100px] bg-amber-50/80 font-bold text-amber-950">
                      สรุปผล
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((st) => {
                    const rec = getStudentAssessment(st);
                    const comp = rec.competency || {};
                    const hasComp = hasStudentCompetencyScore(rec);
                    const comps: ('comp1' | 'comp2' | 'comp3' | 'comp4' | 'comp5')[] = [
                      'comp1', 'comp2', 'comp3', 'comp4', 'comp5'
                    ];

                    return (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center font-mono text-slate-500 font-bold">
                          {st.rollNumber ?? '-'}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {st.prefix}{st.firstName} {st.lastName}
                        </td>
                        {comps.map((cKey) => {
                          const val = hasComp && comp[cKey] !== undefined && comp[cKey] !== null ? comp[cKey] : '';
                          return (
                            <td key={cKey} className="py-1.5 px-1.5 text-center">
                              <select
                                value={val}
                                disabled={isReadOnlyForUser}
                                onChange={(e) => updateCompetency(st, cKey, e.target.value)}
                                className={`text-xs font-bold font-mono px-2 py-1 rounded-lg border focus:outline-none ${
                                  isReadOnlyForUser
                                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                                    : 'bg-white text-slate-800 border-slate-200 focus:ring-1 focus:ring-emerald-500 cursor-pointer'
                                }`}
                              >
                                <option value="">-</option>
                                <option value={3}>3</option>
                                <option value={2}>2</option>
                                <option value={1}>1</option>
                                <option value={0}>0</option>
                              </select>
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 text-center bg-amber-50/40">
                          {hasComp && comp.overallLevel !== undefined ? getLevelBadge(comp.overallLevel) : <span className="text-slate-400 font-normal">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Table */}
            <div className="sm:hidden overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-12">เลขที่</th>
                    <th className="py-2.5 px-2 text-center w-14">รูปโปรไฟล์</th>
                    <th className="py-2.5 px-2">ชื่อนามสกุล</th>
                    <th className="py-2.5 px-2 text-center w-24">เกณฑ์คะแนน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((st) => {
                    const rec = getStudentAssessment(st);
                    const comp = rec.competency || {};
                    const hasComp = hasStudentCompetencyScore(rec);

                    return (
                      <tr
                        key={st.id}
                        onClick={() => setEvaluatingCompetencyStudent(st)}
                        className="hover:bg-amber-50/40 active:bg-amber-100/50 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-xs text-slate-600">
                          {st.rollNumber ?? '-'}
                        </td>
                        <td className="py-2 px-1 text-center">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 mx-auto flex items-center justify-center">
                            {st.photoUrl ? (
                              <img src={st.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="font-semibold text-xs text-slate-800 leading-tight">
                            {st.prefix}{st.firstName} {st.lastName}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {hasComp && comp.overallLevel !== undefined ? (
                            getLevelBadge(comp.overallLevel)
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
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

      {/* ========================================================= */}
      {/* ADMIN MODALS FOR CONFIGURING HEADERS, TABLES & COLUMNS */}
      {/* ========================================================= */}

      {/* 1. Modal: Edit Main Title */}
      {isEditingMainTitleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  แก้ไขชื่อหัวข้อประเมิน (Admin)
                </h3>
              </div>
              <button
                onClick={() => setIsEditingMainTitleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ชื่อหัวข้อหลัก *
              </label>
              <input
                type="text"
                value={mainTitleInput}
                onChange={(e) => setMainTitleInput(e.target.value)}
                placeholder="ระบุชื่อหัวข้อหลัก"
                autoFocus
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditingMainTitleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!mainTitleInput.trim()}
                onClick={handleSaveMainTitle}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs"
              >
                บันทึกชื่อหัวข้อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Add or Edit Table Title */}
      {tableModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  {tableModalState.tableId ? 'แก้ไขชื่อตาราง' : 'เพิ่มตารางลงคะแนนประเมินใหม่ (Admin)'}
                </h3>
              </div>
              <button
                onClick={() => setTableModalState({ isOpen: false, titleInput: '' })}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ชื่อตารางประเมิน *
              </label>
              <input
                type="text"
                value={tableModalState.titleInput}
                onChange={(e) => setTableModalState({ ...tableModalState, titleInput: e.target.value })}
                placeholder="เช่น ตารางที่ 4: การฟังและดู"
                autoFocus
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTableModalState({ isOpen: false, titleInput: '' })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!tableModalState.titleInput.trim()}
                onClick={handleSaveTableTitle}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs"
              >
                {tableModalState.tableId ? 'บันทึกชื่อตาราง' : 'สร้างตารางใหม่'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Add or Edit Column Indicator / Max Score */}
      {columnModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  {columnModalState.indicatorId ? 'แก้ไขช่องตัวชี้วัด / คะแนนเต็ม' : 'เพิ่มช่องตัวชี้วัดใหม่ (Admin)'}
                </h3>
              </div>
              <button
                onClick={() => setColumnModalState({ isOpen: false, tableId: '', nameInput: '', maxScoreInput: 10 })}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อช่อง / ตัวชี้วัด *
                </label>
                <input
                  type="text"
                  value={columnModalState.nameInput}
                  onChange={(e) => setColumnModalState({ ...columnModalState, nameInput: e.target.value })}
                  placeholder="เช่น 1.1 อ่านจับใจความสำคัญ"
                  autoFocus
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  คะแนนเต็มสำหรับช่องนี้ *
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={columnModalState.maxScoreInput}
                  onChange={(e) => setColumnModalState({ ...columnModalState, maxScoreInput: Number(e.target.value) })}
                  className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * เมื่อปรับคะแนนเต็ม ระบบจะคำนวณสัดส่วนและรวมคะแนนประจำตารางให้อัตโนมัติ
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setColumnModalState({ isOpen: false, tableId: '', nameInput: '', maxScoreInput: 10 })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!columnModalState.nameInput.trim()}
                onClick={handleSaveColumn}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs"
              >
                บันทึกช่องคะแนน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Delete Table Confirmation */}
      {tableToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold">ยืนยันการลบตาราง</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              คุณต้องการลบ <strong>{tableToDelete.title}</strong> ออกจากระบบใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTableToDelete(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTableConfirm(tableToDelete.id)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                ยืนยันลบตาราง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Delete Column Confirmation */}
      {columnToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold">ยืนยันการลบช่องคะแนน</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              คุณต้องการลบช่อง <strong>{columnToDelete.indicator.name}</strong> ออกใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setColumnToDelete(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDeleteColumnConfirm(columnToDelete.tableId, columnToDelete.indicator.id)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                ยืนยันลบช่อง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Edit Grading Thresholds (Admin) */}
      {isThresholdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  ปรับระดับเกณฑ์คะแนน (Admin)
                </h3>
              </div>
              <button
                onClick={() => setIsThresholdModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Reading Thresholds */}
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-2.5">
                <div className="font-bold text-amber-950 text-xs">1. เกณฑ์การอ่าน (คะแนนเต็ม {thresholdInput.reading.maxScore} คะแนน)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">คะแนนเต็ม *</label>
                    <input
                      type="number"
                      min={1}
                      value={thresholdInput.reading.maxScore}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        reading: { ...thresholdInput.reading, maxScore: Math.max(1, Number(e.target.value)) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-amber-300 font-bold font-mono bg-amber-100/70 text-center text-xs text-amber-950 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ดีเยี่ยม (ขั้นต่ำ)</label>
                    <input
                      type="number"
                      value={thresholdInput.reading.excellent}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        reading: { ...thresholdInput.reading, excellent: Number(e.target.value) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-bold font-mono bg-white text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ดี (ขั้นต่ำ)</label>
                    <input
                      type="number"
                      value={thresholdInput.reading.good}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        reading: { ...thresholdInput.reading, good: Number(e.target.value) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-bold font-mono bg-white text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ผ่านเกณฑ์ (ขั้นต่ำ)</label>
                    <input
                      type="number"
                      value={thresholdInput.reading.passing}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        reading: { ...thresholdInput.reading, passing: Number(e.target.value) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-bold font-mono bg-white text-center text-xs"
                    />
                  </div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-amber-200/50 text-[10px] text-amber-900 font-medium leading-relaxed">
                  <strong>ช่วงคะแนนปัจจุบัน:</strong> ดีเยี่ยม ({thresholdInput.reading.excellent}-{thresholdInput.reading.maxScore}) | ดี ({thresholdInput.reading.good}-{thresholdInput.reading.excellent - 1}) | ผ่านเกณฑ์ ({thresholdInput.reading.passing}-{thresholdInput.reading.good - 1}) | ไม่ผ่านเกณฑ์ (0-{thresholdInput.reading.passing - 1})
                </div>
              </div>

              {/* Thinking Thresholds */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/60 space-y-2.5">
                <div className="font-bold text-blue-950 text-xs">2. เกณฑ์คิดวิเคราะห์ (คะแนนเต็ม {thresholdInput.thinking.maxScore} คะแนน)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-blue-900 mb-1">คะแนนเต็ม *</label>
                    <input
                      type="number"
                      min={1}
                      value={thresholdInput.thinking.maxScore}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        thinking: { ...thresholdInput.thinking, maxScore: Math.max(1, Number(e.target.value)) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-blue-300 font-bold font-mono bg-blue-100/70 text-center text-xs text-blue-950 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ดีเยี่ยม (ขั้นต่ำ)</label>
                    <input
                      type="number"
                      value={thresholdInput.thinking.excellent}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        thinking: { ...thresholdInput.thinking, excellent: Number(e.target.value) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-bold font-mono bg-white text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ดี (ขั้นต่ำ)</label>
                    <input
                      type="number"
                      value={thresholdInput.thinking.good}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        thinking: { ...thresholdInput.thinking, good: Number(e.target.value) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-bold font-mono bg-white text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ผ่านเกณฑ์ (ขั้นต่ำ)</label>
                    <input
                      type="number"
                      value={thresholdInput.thinking.passing}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        thinking: { ...thresholdInput.thinking, passing: Number(e.target.value) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-bold font-mono bg-white text-center text-xs"
                    />
                  </div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-blue-200/50 text-[10px] text-blue-900 font-medium leading-relaxed">
                  <strong>ช่วงคะแนนปัจจุบัน:</strong> ดีเยี่ยม ({thresholdInput.thinking.excellent}-{thresholdInput.thinking.maxScore}) | ดี ({thresholdInput.thinking.good}-{thresholdInput.thinking.excellent - 1}) | ผ่านเกณฑ์ ({thresholdInput.thinking.passing}-{thresholdInput.thinking.good - 1}) | ไม่ผ่านเกณฑ์ (0-{thresholdInput.thinking.passing - 1})
                </div>
              </div>

              {/* Writing Thresholds */}
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/60 space-y-2.5">
                <div className="font-bold text-emerald-950 text-xs">3. เกณฑ์การเขียน (คะแนนเต็ม {thresholdInput.writing.maxScore} คะแนน)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">คะแนนเต็ม *</label>
                    <input
                      type="number"
                      min={1}
                      value={thresholdInput.writing.maxScore}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        writing: { ...thresholdInput.writing, maxScore: Math.max(1, Number(e.target.value)) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-emerald-300 font-bold font-mono bg-emerald-100/70 text-center text-xs text-emerald-950 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ดีเยี่ยม (ขั้นต่ำ)</label>
                    <input
                      type="number"
                      value={thresholdInput.writing.excellent}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        writing: { ...thresholdInput.writing, excellent: Number(e.target.value) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-bold font-mono bg-white text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ดี (ขั้นต่ำ)</label>
                    <input
                      type="number"
                      value={thresholdInput.writing.good}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        writing: { ...thresholdInput.writing, good: Number(e.target.value) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-bold font-mono bg-white text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ผ่านเกณฑ์ (ขั้นต่ำ)</label>
                    <input
                      type="number"
                      value={thresholdInput.writing.passing}
                      onChange={(e) => setThresholdInput({
                        ...thresholdInput,
                        writing: { ...thresholdInput.writing, passing: Number(e.target.value) }
                      })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-bold font-mono bg-white text-center text-xs"
                    />
                  </div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-emerald-200/50 text-[10px] text-emerald-900 font-medium leading-relaxed">
                  <strong>ช่วงคะแนนปัจจุบัน:</strong> ดีเยี่ยม ({thresholdInput.writing.excellent}-{thresholdInput.writing.maxScore}) | ดี ({thresholdInput.writing.good}-{thresholdInput.writing.excellent - 1}) | ผ่านเกณฑ์ ({thresholdInput.writing.passing}-{thresholdInput.writing.good - 1}) | ไม่ผ่านเกณฑ์ (0-{thresholdInput.writing.passing - 1})
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsThresholdModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  saveThresholds(thresholdInput);
                  setIsThresholdModalOpen(false);
                  onShowToast('success', 'บันทึกเกณฑ์คะแนนสำเร็จ', 'ปรับระดับเกณฑ์คะแนนประเมินใหม่เรียบร้อยแล้ว');
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
              >
                บันทึกเกณฑ์คะแนน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* POP-UP MODAL: ประเมินคุณลักษณะอันพึงประสงค์ 8 ประการ (รายข้อย่อย) */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* POP-UP MODAL: ประเมินคุณลักษณะอันพึงประสงค์ 8 ประการ (รายข้อย่อย) */}
      {/* ========================================================= */}
      {evaluatingStudent && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 ${
          isModalFullScreen ? 'p-0' : 'p-2 sm:p-4'
        }`}>
          <div className={`bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 ${
            isModalFullScreen ? 'w-screen h-screen rounded-none' : 'max-w-5xl w-full max-h-[92vh] rounded-3xl'
          }`}>
            {/* Modal Header */}
            <div className="px-3 py-1.5 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-white/15 items-center justify-center backdrop-blur-xs border border-white/20 shrink-0">
                  <Award className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Mobile dropdown selector for student (sm:hidden) */}
                    <div className="relative flex items-center min-w-0 max-w-[240px] sm:hidden">
                      <select
                        value={evaluatingStudent.id}
                        onChange={(e) => {
                          handleSaveCharacteristicsEvaluationSilently(evaluatingStudent);
                          const selected = classStudents.find(s => s.id === e.target.value);
                          if (selected) handleOpenCharacteristicsModal(selected);
                        }}
                        className="appearance-none bg-white/20 hover:bg-white/30 text-white font-bold text-xs pl-2.5 pr-7 py-1 rounded-xl border border-white/30 outline-none cursor-pointer truncate w-full"
                      >
                        {classStudents.map((st) => (
                          <option key={st.id} value={st.id} className="text-slate-800 bg-white">
                            เลขที่ {st.rollNumber ?? '-'}: {st.prefix}{st.firstName} {st.lastName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-white/80 absolute right-2 pointer-events-none" />
                    </div>

                    {/* Desktop static title (hidden sm:flex) */}
                    <div className="hidden sm:flex sm:items-center sm:gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                        เลขที่ {evaluatingStudent.rollNumber ?? '-'}
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        {evaluatingStudent.prefix}{evaluatingStudent.firstName} {evaluatingStudent.lastName}
                      </h3>
                    </div>
                  </div>
                  <p className="hidden sm:block text-xs sm:text-sm text-blue-100 mt-0.5 font-medium truncate">
                    แบบประเมินคุณลักษณะอันพึงประสงค์ 8 ประการ • ชั้น {selectedGrade} • ภาคเรียนที่ {currentSemester}/{currentAcademicYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalFullScreen(!isModalFullScreen)}
                  className="hidden sm:flex p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title={isModalFullScreen ? "ย่อขนาดหน้าต่าง" : "แสดงเต็มจอ"}
                >
                  {isModalFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setEvaluatingStudent(null)}
                  className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Top Category Selection Circles (1, 2, 3, 4, 5, 6, 7, 8) */}
            <div className="p-2 sm:p-3 bg-white border-b border-slate-200 flex items-center justify-between gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <div className="flex items-center gap-1 sm:gap-3 mx-auto">
                {CHARACTERISTICS_GROUPS.map((grp, idx) => {
                  const isSelected = activeCategoryIndex === idx;
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setActiveCategoryIndex(idx)}
                      className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full font-bold text-xs sm:text-base flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 font-extrabold scale-105 sm:scale-110'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                      title={`${grp.number}. ${grp.title}`}
                    >
                      {grp.number}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-bar: Category title only (Fixed header for active category) */}
            <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {CHARACTERISTICS_GROUPS[activeCategoryIndex]?.title}
              </div>
            </div>

            {/* Modal Body: Render ONLY selected category */}
            <div className="overflow-y-auto p-4 sm:p-6 flex-1">
              {(() => {
                const grp = CHARACTERISTICS_GROUPS[activeCategoryIndex] || CHARACTERISTICS_GROUPS[0];
                const groupScore = getGroupCalculatedScore(grp, modalSubScores);

                return (
                  <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-5">
                    {/* Header of Group (Non-editable topic title) */}
                    <div className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="hidden sm:inline-block w-3 h-3 rounded-full bg-blue-600 shrink-0"></span>
                        <h4 className="hidden sm:block font-bold text-sm sm:text-base text-slate-900">
                          {grp.title}
                        </h4>
                        <span className="hidden sm:inline-flex text-xs font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md">
                          (เป็นหัวข้อกรอกไม่ได้)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-xs text-slate-600 font-bold">ให้เฉพาะข้อนี้:</span>
                        <button
                          type="button"
                          disabled={isReadOnlyForUser}
                          onClick={() => handleFillGroupModalSubScores(grp.id, 3)}
                          className="px-3 py-1 text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          ให้ 3
                        </button>
                        <button
                          type="button"
                          disabled={isReadOnlyForUser}
                          onClick={() => handleFillGroupModalSubScores(grp.id, 2)}
                          className="px-3 py-1 text-xs font-bold bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          ให้ 2
                        </button>
                      </div>
                    </div>

                    {/* Sub-indicators List */}
                    <div className="space-y-3 divide-y divide-slate-100">
                      {grp.indicators.map((ind) => {
                        const currentVal = modalSubScores[ind.id];
                        return (
                          <div 
                            key={ind.id} 
                            className="pt-3.5 first:pt-0 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            <div className="text-sm sm:text-base text-slate-900 font-semibold leading-relaxed pr-2">
                              {ind.text}
                            </div>

                            {/* 4 Score Buttons: 3, 2, 1, 0 */}
                            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                              {[3, 2, 1, 0].map((score) => {
                                const isSelected = currentVal === score;
                                return (
                                  <button
                                    key={score}
                                    type="button"
                                    disabled={isReadOnlyForUser}
                                    onClick={() => handleSetModalSubScore(ind.id, score)}
                                    className={`w-9 h-9 sm:w-10 sm:h-10 text-xs sm:text-sm font-extrabold rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                                      isSelected
                                        ? score === 3
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200 scale-105'
                                          : score === 2
                                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-200 scale-105'
                                          : score === 1
                                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-200 scale-105'
                                          : 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-200 scale-105'
                                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                                    }`}
                                  >
                                    {score}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Group Summary Row (สรุป) */}
                    <div className="p-2.5 sm:p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-amber-950 flex items-center gap-1.5 shrink-0">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="sm:hidden">สรุป</span>
                        <span className="hidden sm:inline">สรุป {grp.title}</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {groupScore !== undefined ? (
                          <>
                            <span className="text-xs sm:text-sm font-mono font-bold text-amber-900">
                              (ระดับ {groupScore})
                            </span>
                            {getLevelBadge(groupScore)}
                          </>
                        ) : (
                          <span className="text-xs sm:text-sm font-mono font-bold text-slate-400">-</span>
                        )}
                      </div>
                    </div>

                    {/* Category Navigation Buttons (< หัวข้อก่อนหน้า | หัวข้อถัดไป >) */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={activeCategoryIndex === 0}
                        onClick={() => setActiveCategoryIndex(prev => Math.max(0, prev - 1))}
                        className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                          activeCategoryIndex > 0
                            ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer shadow-2xs'
                            : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>หัวข้อก่อนหน้า</span>
                      </button>

                      <span className="text-xs sm:text-sm font-mono font-bold text-slate-500">
                        <span className="sm:hidden">{activeCategoryIndex + 1}/{CHARACTERISTICS_GROUPS.length}</span>
                        <span className="hidden sm:inline">หัวข้อที่ {activeCategoryIndex + 1} / {CHARACTERISTICS_GROUPS.length}</span>
                      </span>

                      <button
                        type="button"
                        disabled={activeCategoryIndex === CHARACTERISTICS_GROUPS.length - 1}
                        onClick={() => setActiveCategoryIndex(prev => Math.min(CHARACTERISTICS_GROUPS.length - 1, prev + 1))}
                        className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                          activeCategoryIndex < CHARACTERISTICS_GROUPS.length - 1
                            ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 cursor-pointer shadow-2xs'
                            : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span>หัวข้อถัดไป</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-3 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
              {/* Grand Total Badge */}
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-xs sm:text-base font-bold text-slate-900">
                  <span className="sm:hidden">สรุปรวม:</span>
                  <span className="hidden sm:inline">สรุปรวมคุณลักษณะ 8 ประการ:</span>
                </span>
                {(() => {
                  const grandScore = getModalGrandOverallScore(modalSubScores);
                  return (
                    <div className="flex items-center gap-1.5">
                      {grandScore !== undefined ? (
                        <>
                          <span className="text-xs sm:text-sm font-mono font-bold text-slate-700">
                            ({grandScore} คะแนน)
                          </span>
                          {getLevelBadge(grandScore)}
                        </>
                      ) : (
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-400">-</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEvaluatingStudent(null)}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>

                {(() => {
                  const curIdx = classStudents.findIndex(s => s.id === evaluatingStudent.id);
                  const hasNext = curIdx >= 0 && curIdx < classStudents.length - 1;
                  if (!hasNext) return null;
                  return (
                    <button
                      type="button"
                      disabled={isReadOnlyForUser}
                      onClick={() => handleSaveCharacteristicsEvaluation(true)}
                      className="hidden sm:flex px-4 py-2.5 text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer items-center gap-1 shadow-2xs"
                      title="บันทึกแล้วเปิดหน้านักเรียนคนถัดไปทันที"
                    >
                      <span>บันทึก & คนถัดไป</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  );
                })()}

                <button
                  type="button"
                  disabled={isReadOnlyForUser}
                  onClick={() => handleSaveCharacteristicsEvaluation(false)}
                  className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Check className="w-4.5 h-4.5" />
                  <span>บันทึกผลการประเมิน</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Rapid Grading Modal for Reading/Writing */}
      {mobileGradingStudent && activeTableConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs sm:hidden">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30 bg-white/10 shrink-0 flex items-center justify-center">
                  {mobileGradingStudent.photoUrl ? (
                    <img src={mobileGradingStudent.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-white/80" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="relative flex items-center min-w-0 max-w-[220px]">
                    <select
                      value={mobileGradingStudent.id}
                      onChange={(e) => {
                        const selected = classStudents.find(s => s.id === e.target.value);
                        if (selected) setMobileGradingStudent(selected);
                      }}
                      className="appearance-none bg-white/20 hover:bg-white/30 text-white font-bold text-xs pl-2 pr-7 py-1 rounded-lg border border-white/30 outline-none cursor-pointer truncate w-full"
                    >
                      {classStudents.map((st) => (
                        <option key={st.id} value={st.id} className="text-slate-800 bg-white">
                          เลขที่ {st.rollNumber ?? '-'}: {st.prefix}{st.firstName} {st.lastName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/80 absolute right-2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-blue-100 truncate mt-0.5">
                    {cleanTitle(activeTableConfig.title)} (เต็ม {getTableMaxScore(activeTableConfig)} คะแนน)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileGradingStudent(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors ml-2 shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Indicators Scoring */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-slate-50">
              {(() => {
                const rec = getStudentAssessment(mobileGradingStudent);
                const hasScore = hasStudentTableScore(rec, activeTableConfig);
                const tableTotal = getStudentTableScore(rec, activeTableConfig);
                return (
                  <>
                    <div className="space-y-2.5">
                      {activeTableConfig.indicators.map((ind) => {
                        const currentVal = rec.indicatorScores?.[ind.id];
                        const displayVal = currentVal !== undefined && currentVal !== null ? currentVal : '';
                        return (
                          <div key={ind.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-800 truncate">
                                {ind.name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                คะแนนเต็ม {ind.maxScore} คะแนน
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={isReadOnlyForUser}
                                value={displayVal}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  if (val === '' || val === '-') {
                                    updateIndicatorScore(mobileGradingStudent, ind.id, '', ind.maxScore);
                                  } else {
                                    const num = Number(val);
                                    if (!isNaN(num)) {
                                      updateIndicatorScore(mobileGradingStudent, ind.id, num, ind.maxScore);
                                    }
                                  }
                                }}
                                placeholder="-"
                                className="w-16 h-10 px-2 text-center text-sm font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-blue-700 outline-none disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 placeholder:font-bold"
                              />
                              <span className="text-xs text-slate-400">/{ind.maxScore}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Table Total Score & Quality Badge */}
                    <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-medium text-slate-500">รวมคะแนนตารางนี้</div>
                        <div className="text-base font-black text-blue-700 font-mono">
                          {hasScore ? `${Math.round(tableTotal * 10) / 10} / ${getTableMaxScore(activeTableConfig)}` : '-'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-medium text-slate-500 mb-0.5">เกณฑ์คะแนน</div>
                        {hasScore ? getTableLevelTextBadge(tableTotal, activeTableConfig) : <span className="text-slate-400 font-bold text-sm">-</span>}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer with Prev / Save / Next */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrevMobileGradingStudent}
                disabled={currentMobileGradingIndex <= 0}
                className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ก่อนหน้า</span>
              </button>

              <button
                type="button"
                disabled={isReadOnlyForUser}
                onClick={() => {
                  syncAssessmentDataToGrades();
                  onShowToast('success', 'บันทึกเรียบร้อย', `บันทึกคะแนนของ ${mobileGradingStudent.prefix}${mobileGradingStudent.firstName} ${mobileGradingStudent.lastName} เรียบร้อยแล้ว`);
                  setMobileGradingStudent(null);
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>บันทึก</span>
              </button>

              <button
                type="button"
                onClick={handleNextMobileGradingStudent}
                disabled={currentMobileGradingIndex >= classStudents.length - 1}
                className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>ถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Rapid Grading Modal for Competencies */}
      {evaluatingCompetencyStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs sm:hidden">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30 bg-white/10 shrink-0 flex items-center justify-center">
                  {evaluatingCompetencyStudent.photoUrl ? (
                    <img src={evaluatingCompetencyStudent.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-white/80" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="relative flex items-center min-w-0 max-w-[220px]">
                    <select
                      value={evaluatingCompetencyStudent.id}
                      onChange={(e) => {
                        const selected = classStudents.find(s => s.id === e.target.value);
                        if (selected) setEvaluatingCompetencyStudent(selected);
                      }}
                      className="appearance-none bg-white/20 hover:bg-white/30 text-white font-bold text-xs pl-2 pr-7 py-1 rounded-lg border border-white/30 outline-none cursor-pointer truncate w-full"
                    >
                      {classStudents.map((st) => (
                        <option key={st.id} value={st.id} className="text-slate-800 bg-white">
                          เลขที่ {st.rollNumber ?? '-'}: {st.prefix}{st.firstName} {st.lastName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/80 absolute right-2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-purple-100 truncate mt-0.5">
                    สมรรถนะสำคัญ 5 ประการ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEvaluatingCompetencyStudent(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors ml-2 shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-slate-50">
              {(() => {
                const rec = getStudentAssessment(evaluatingCompetencyStudent);
                const comp = rec.competency || {};
                const compList: Array<{ key: keyof Competency5Criteria; title: string; desc: string }> = [
                  { key: 'comp1', title: '1. ความสามารถในการสื่อสาร', desc: 'การใช้ภาษาถ่ายทอดความคิด ความรู้ ความเข้าใจ' },
                  { key: 'comp2', title: '2. ความสามารถในการคิด', desc: 'การคิดวิเคราะห์ สังเคราะห์ สร้างสรรค์ มีวิจารณญาณ' },
                  { key: 'comp3', title: '3. ความสามารถในการแก้ปัญหา', desc: 'การแก้ปัญหาและอุปสรรคได้อย่างถูกต้องเหมาะสม' },
                  { key: 'comp4', title: '4. ความสามารถในการใช้ทักษะชีวิต', desc: 'การนำกระบวนการต่างๆ ไปใช้ในการดำเนินชีวิตประจำวัน' },
                  { key: 'comp5', title: '5. ความสามารถในการใช้เทคโนโลยี', desc: 'การเลือกและใช้เทคโนโลยีด้านต่างๆ เพื่อการพัฒนาตนเอง' },
                ];

                return (
                  <>
                    {/* Quick fill buttons */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-600">กรอกทั้ง 5 ข้อ:</span>
                      <div className="flex items-center gap-1.5">
                        {[
                          { val: 3, label: '3 ดีเยี่ยม', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
                          { val: 2, label: '2 ดี', color: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' },
                          { val: 1, label: '1 ผ่าน', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' }
                        ].map(q => (
                          <button
                            key={q.val}
                            type="button"
                            disabled={isReadOnlyForUser}
                            onClick={() => {
                              updateAllCompetenciesForStudent(evaluatingCompetencyStudent, q.val);
                            }}
                            className={`px-2 py-1 text-[11px] font-bold border rounded-lg transition-all active:scale-95 cursor-pointer ${q.color}`}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Competency 5 criteria */}
                    <div className="space-y-2.5">
                      {compList.map(item => {
                        const val = comp[item.key] as number | undefined;
                        return (
                          <div key={item.key} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                            <div>
                              <div className="text-xs font-bold text-slate-800">{item.title}</div>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[
                                { level: 3, label: 'ดีเยี่ยม (3)', activeBg: 'bg-emerald-600 text-white border-emerald-600' },
                                { level: 2, label: 'ดี (2)', activeBg: 'bg-sky-600 text-white border-sky-600' },
                                { level: 1, label: 'ผ่าน (1)', activeBg: 'bg-amber-500 text-white border-amber-500' },
                                { level: 0, label: 'ไม่ผ่าน (0)', activeBg: 'bg-rose-600 text-white border-rose-600' }
                              ].map(lvl => {
                                const isSelected = val === lvl.level;
                                return (
                                  <button
                                    key={lvl.level}
                                    type="button"
                                    disabled={isReadOnlyForUser}
                                    onClick={() => updateCompetency(evaluatingCompetencyStudent, item.key, lvl.level)}
                                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border text-center transition-all cursor-pointer ${
                                      isSelected
                                        ? `${lvl.activeBg} shadow-xs scale-100`
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {lvl.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary row */}
                    <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-2xs flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-medium text-slate-500">ผลการประเมินสมรรถนะรวม</div>
                      </div>
                      <div className="text-right">
                        {comp.overallLevel !== undefined ? getQualityTextBadge(comp.overallLevel) : (
                          <span className="text-xs text-slate-400 font-bold">-</span>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer with Prev / Save / Next */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrevCompGradingStudent}
                disabled={currentCompGradingIndex <= 0}
                className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ก่อนหน้า</span>
              </button>

              <button
                type="button"
                disabled={isReadOnlyForUser}
                onClick={() => {
                  syncAssessmentDataToGrades();
                  onShowToast('success', 'บันทึกเรียบร้อย', `บันทึกสมรรถนะสำคัญของ ${evaluatingCompetencyStudent.prefix}${evaluatingCompetencyStudent.firstName} ${evaluatingCompetencyStudent.lastName} เรียบร้อยแล้ว`);
                  setEvaluatingCompetencyStudent(null);
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>บันทึก</span>
              </button>

              <button
                type="button"
                onClick={handleNextCompGradingStudent}
                disabled={currentCompGradingIndex >= classStudents.length - 1}
                className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>ถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
