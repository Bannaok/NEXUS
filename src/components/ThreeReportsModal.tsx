import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Student, 
  Personnel, 
  SchoolInfo, 
  GradeRecord, 
  GradeLevel, 
  Subject 
} from '../types';
import { 
  CHARACTERISTICS_GROUPS, 
  CharacteristicGroup, 
  StudentAssessmentRecord,
  ReadingWritingStructureConfig,
  AssessmentTableConfig
} from './Assessment3Booklets';
import { 
  X, 
  Download, 
  FileText, 
  CheckCircle2, 
  BookOpen, 
  Award, 
  Users, 
  Check, 
  UserCheck,
  Loader2
} from 'lucide-react';
import { exportSheetsToPdf } from '../utils/pdfExport';
import { StorageService } from '../services/storage';

interface ThreeReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  grade: GradeLevel;
  selectedRoom?: string;
  onSelectRoom?: (room: string) => void;
  availableRooms?: string[];
  selectedYear: string;
  selectedSemester: string;
  students: Student[];
  personnel: Personnel[];
  schoolInfo: SchoolInfo;
  grades: GradeRecord[];
  subjects: Subject[];
  selectedAdvisorId: string;
  setSelectedAdvisorId: (id: string) => void;
  selectedAcademicHeadId: string;
  setSelectedAcademicHeadId: (id: string) => void;
  directorDisplayName: string;
  directorPosition?: string;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

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

const getLevelBadgeText = (level: number) => {
  switch (level) {
    case 3: return 'ดีเยี่ยม';
    case 2: return 'ดี';
    case 1: return 'ผ่าน';
    default: return 'ไม่ผ่าน';
  }
};

export const ThreeReportsModal: React.FC<ThreeReportsModalProps> = ({
  isOpen,
  onClose,
  grade,
  selectedRoom: propSelectedRoom,
  onSelectRoom,
  availableRooms: propAvailableRooms,
  selectedYear,
  selectedSemester,
  students,
  personnel,
  schoolInfo,
  grades,
  selectedAdvisorId,
  setSelectedAdvisorId,
  selectedAcademicHeadId,
  setSelectedAcademicHeadId,
  directorDisplayName,
  directorPosition,
  onShowToast
}) => {
  if (!isOpen) return null;

  const normalizeRoom = (r?: string) => (r || '1').toString().trim().replace(/^ห้อง\s*/, '') || '1';
  const [localRoom, setLocalRoom] = useState<string>(normalizeRoom(propSelectedRoom));
  const activeRoom = propSelectedRoom ? normalizeRoom(propSelectedRoom) : normalizeRoom(localRoom);
  const handleSelectRoom = (rm: string) => {
    setLocalRoom(rm);
    if (onSelectRoom) onSelectRoom(rm);
  };

  const roomsForGrade = useMemo(() => {
    if (propAvailableRooms && propAvailableRooms.length > 0) return propAvailableRooms;
    const set = new Set<string>(['1']);
    students
      .filter(s => s.gradeLevel === grade)
      .forEach(s => set.add(normalizeRoom(s.room)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [propAvailableRooms, students, grade]);

  // 3 Primary Tabs
  const [activeTab, setActiveTab] = useState<'readingWriting' | 'characteristics' | 'competencies'>('readingWriting');

  // Report Orientation ('portrait' = default, 'landscape')
  const [reportOrientation, setReportOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Sub-navigation for Tab 1: Reading & Writing
  // 'all' = render all 4 A4 pages continuously; or specific single page
  const [rwSubPage, setRwSubPage] = useState<'all' | 'reading' | 'thinking' | 'writing' | 'summary'>('all');

  // Sub-navigation for Tab 2: Characteristics
  // 'overview' = 8 core items summary for all students; 'individual' = 8 items with all sub-indicators for a selected student
  const [charSubView, setCharSubView] = useState<'overview' | 'individual'>('overview');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');

  // Filter students for this grade & room (sorted by rollNumber 1 -> last)
  const classStudents = useMemo(() => {
    return [
      ...students.filter(
        s => s.gradeLevel === grade && normalizeRoom(s.room) === activeRoom
      )
    ].sort((a, b) => {
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
  }, [students, grade, activeRoom]);

  // Set default student selection to 'all' if not set
  React.useEffect(() => {
    if (classStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId('all');
    }
  }, [classStudents, selectedStudentId]);

  // Subscribe to live storage updates so changes in "ประเมิน 3 เล่ม" reflect immediately
  const [storageVersion, setStorageVersion] = useState(0);
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setStorageVersion(v => v + 1);
    });
    const handleStorage = () => setStorageVersion(v => v + 1);
    window.addEventListener('storage', handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Load Reading/Writing Structure Configuration
  const rwConfig = useMemo<ReadingWritingStructureConfig>(() => {
    try {
      const saved = localStorage.getItem('ams_reading_writing_config_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_RW_CONFIG;
  }, [isOpen, storageVersion]);

  // Load Assessment 3 Booklets data strictly from "ประเมิน 3 เล่ม" storage
  const assessmentData = useMemo<Record<string, StudentAssessmentRecord>>(() => {
    try {
      const saved = localStorage.getItem('ams_assessment_3_booklets_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  }, [isOpen, grade, selectedYear, selectedSemester, storageVersion]);

  // Homeroom advisors for the selected grade
  const currentGradeAdvisors = useMemo(() => {
    const list = personnel.filter(p => p.advisorGrade === grade || p.position?.includes(grade));
    return list.length > 0 ? list : personnel;
  }, [personnel, grade]);

  // Personnel in Academic Department
  const academicPersonnelList = useMemo(() => {
    const list = personnel.filter(p => p.department === 'ฝ่ายวิชาการ' || p.position?.includes('วิชาการ'));
    return list.length > 0 ? list : personnel;
  }, [personnel]);

  // Thresholds for Reading/Writing scoring
  const thresholds = useMemo(() => {
    try {
      const saved = localStorage.getItem('ams_assessment_thresholds_v3');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      reading: { excellent: 24, good: 21, passing: 18, maxScore: 30 },
      thinking: { excellent: 24, good: 21, passing: 18, maxScore: 40 },
      writing: { excellent: 32, good: 28, passing: 24, maxScore: 40 }
    };
  }, [isOpen, storageVersion]);

  // Helper calculating level for reading/thinking/writing
  const getTableScoreLevel = (score: number, type: 'reading' | 'thinking' | 'writing'): number => {
    const th = thresholds[type] || thresholds.reading;
    if (score >= th.excellent) return 3;
    if (score >= th.good) return 2;
    if (score >= th.passing) return 1;
    return 0;
  };

  // Helper getting student assessment record strictly from "ประเมิน 3 เล่ม" of this grade
  const getStudentAssessment = (student: Student): StudentAssessmentRecord => {
    // 1. Try exact key: studentId_grade_semester_academicYear
    const key = `${student.id}_${grade}_${selectedSemester}_${selectedYear}`;
    let existing = assessmentData[key];

    // 2. Fallback: match by studentId, grade, and semester in assessmentData (in case academicYear label differed)
    if (!existing) {
      const foundEntry = Object.entries(assessmentData).find(([k, v]) => 
        (k.startsWith(`${student.id}_${grade}_${selectedSemester}_`) || 
         (v.studentId === student.id && v.gradeLevel === grade && (v.semester === selectedSemester || !v.semester)))
      );
      if (foundEntry) existing = foundEntry[1];
    }

    if (existing) return existing;

    // Never fabricate or copy scores from subject grades when the homeroom teacher hasn't filled "ประเมิน 3 เล่ม"
    return {
      studentId: student.id,
      studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
      rollNumber: student.rollNumber,
      gradeLevel: grade,
      semester: selectedSemester as '1' | '2',
      academicYear: selectedYear,
      indicatorScores: {},
      characteristics: {
        evaluated: false,
        subScores: {}
      },
      competency: {
        evaluated: false
      }
    };
  };

  // Check if a specific indicator has an actual entered score
  const hasIndicatorScore = (rec: StudentAssessmentRecord, indId: string): boolean => {
    const val = rec?.indicatorScores?.[indId];
    return val !== undefined && val !== null && (val as any) !== '';
  };

  // Check if a student has any entered score in a specific table
  const hasStudentTableScore = (rec: StudentAssessmentRecord, table: AssessmentTableConfig): boolean => {
    if (!rec || !rec.indicatorScores) return false;
    return table.indicators.some(ind => hasIndicatorScore(rec, ind.id));
  };

  // Check if a student has any entered score in Booklet 2 (คุณลักษณะอันพึงประสงค์ 8 ประการ)
  const hasStudentCharacteristicsScore = (rec: StudentAssessmentRecord): boolean => {
    if (!rec || !rec.characteristics) return false;
    const c = rec.characteristics;
    if (c.evaluated === true) return true;
    if (c.subScores && Object.keys(c.subScores).some(k => c.subScores![k] !== undefined && c.subScores![k] !== null)) {
      return true;
    }
    return [c.item1, c.item2, c.item3, c.item4, c.item5, c.item6, c.item7, c.item8].some(
      v => v !== undefined && v !== null
    );
  };

  // Check if a student has any entered score in Booklet 3 (สมรรถนะสำคัญ 5 ด้าน)
  const hasStudentCompetencyScore = (rec: StudentAssessmentRecord): boolean => {
    if (!rec || !rec.competency) return false;
    const cp = rec.competency;
    if (cp.evaluated === true) return true;
    return [cp.comp1, cp.comp2, cp.comp3, cp.comp4, cp.comp5].some(
      v => v !== undefined && v !== null
    );
  };

  // Helper calculating student's score for a specific table
  const getStudentTableScore = (rec: StudentAssessmentRecord, table: AssessmentTableConfig): number => {
    if (!rec || !rec.indicatorScores) return 0;
    return table.indicators.reduce((sum, ind) => sum + (Number(rec.indicatorScores[ind.id]) || 0), 0);
  };

  const getStudentTableType = (tbl: AssessmentTableConfig): 'reading' | 'thinking' | 'writing' => {
    const t = (tbl.title || '').toLowerCase();
    if (tbl.id.includes('reading') || t.includes('อ่าน')) return 'reading';
    if (tbl.id.includes('writing') || t.includes('เขียน')) return 'writing';
    return 'thinking';
  };

  // Selected personnel details
  const selectedAdvisor = useMemo(() => {
    if (selectedAdvisorId) {
      const found = personnel.find(p => p.id === selectedAdvisorId);
      if (found) return found;
    }
    return currentGradeAdvisors[0] || personnel.find(p => p.advisorGrade === grade) || null;
  }, [personnel, selectedAdvisorId, currentGradeAdvisors, grade]);

  const selectedAcademicHead = useMemo(() => {
    if (selectedAcademicHeadId) {
      return personnel.find(p => p.id === selectedAcademicHeadId) || null;
    }
    return personnel.find(p => 
      p.department === 'วิชาการ' || 
      (p.position && p.position.includes('วิชาการ')) ||
      (p.personnelType && p.personnelType.includes('วิชาการ'))
    ) || null;
  }, [personnel, selectedAcademicHeadId]);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handlePrint = async () => {
    if (isDownloadingPdf) return;
    if (classStudents.length === 0) {
      onShowToast('warning', 'ไม่มีข้อมูลนักเรียน', 'ยังไม่มีข้อมูลนักเรียนสำหรับดาวน์โหลด PDF');
      return;
    }
    setIsDownloadingPdf(true);
    try {
      const tabLabel =
        activeTab === 'readingWriting'
          ? 'การอ่านคิดวิเคราะห์เขียน'
          : activeTab === 'characteristics'
          ? 'คุณลักษณะอันพึงประสงค์'
          : 'สมรรถนะสำคัญ';
      const subLabel =
        activeTab === 'readingWriting'
          ? rwSubPage === 'all'
            ? 'ทั้งหมด'
            : rwSubPage === 'reading'
            ? 'การอ่าน'
            : rwSubPage === 'thinking'
            ? 'คิดวิเคราะห์'
            : rwSubPage === 'writing'
            ? 'การเขียน'
            : 'สรุปผล'
          : activeTab === 'characteristics'
          ? charSubView === 'overview'
            ? 'สรุป8ข้อ'
            : selectedStudentId === 'all'
            ? 'รายบุคคลทุกคน'
            : targetIndividualStudent
            ? `${targetIndividualStudent.prefix}${targetIndividualStudent.firstName}`
            : 'รายบุคคล'
          : 'สรุป5ด้าน';
      const filename = `รายงาน_${tabLabel}_${subLabel}_${grade}_เทอม${selectedSemester}_${selectedYear}.pdf`;
      const ok = await exportSheetsToPdf({
        container: previewContainerRef.current,
        filename,
        orientation: reportOrientation,
      });
      if (ok) {
        onShowToast('success', 'ดาวน์โหลด PDF สำเร็จ', `บันทึกไฟล์ ${filename} เรียบร้อยแล้ว`);
      } else {
        onShowToast('error', 'ไม่พบหน้าเอกสาร', 'ไม่สามารถสร้างไฟล์ PDF ได้');
      }
    } catch (err) {
      console.error('PDF export error:', err);
      onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถดาวน์โหลดไฟล์ PDF ได้');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Tables for Reading/Writing
  const readingTable = rwConfig.tables.find(t => t.id.includes('reading') || t.title.includes('อ่าน')) || rwConfig.tables[0];
  const thinkingTable = rwConfig.tables.find(t => t.id.includes('thinking') || t.title.includes('คิด')) || rwConfig.tables[1];
  const writingTable = rwConfig.tables.find(t => t.id.includes('writing') || t.title.includes('เขียน')) || rwConfig.tables[2];

  // Selected student for individual evaluation
  const targetIndividualStudent = useMemo(() => {
    return classStudents.find(s => s.id === selectedStudentId) || classStudents[0] || null;
  }, [classStudents, selectedStudentId]);

  // Signatures Component for A4 Pages
  const renderSignatures = () => (
    <div className="grid grid-cols-3 gap-2 text-center text-[11.5px] text-black" style={{ marginTop: '2.1cm' }}>
      <div className="space-y-1">
        <p className="text-black">ลงชื่อ ..................................................</p>
        <p className="font-normal text-black">
          ({selectedAdvisor ? `${selectedAdvisor.prefix || ''}${selectedAdvisor.firstName || ''} ${selectedAdvisor.lastName || ''}`.trim() : '................................................'})
        </p>
        <p className="text-black text-[10.5px]">ครูประจำชั้น</p>
      </div>

      <div className="space-y-1">
        <p className="text-black">ลงชื่อ ..................................................</p>
        <p className="font-normal text-black">
          ({selectedAcademicHead ? `${selectedAcademicHead.prefix || ''}${selectedAcademicHead.firstName || ''} ${selectedAcademicHead.lastName || ''}`.trim() : '................................................'})
        </p>
        <p className="text-black text-[10.5px]">หัวหน้าฝ่ายวิชาการ</p>
      </div>

      <div className="space-y-1">
        <p className="text-black">ลงชื่อ ..................................................</p>
        <p className="font-normal text-black">
          ({directorDisplayName})
        </p>
        <p className="text-black text-[10.5px]">{directorPosition || 'ผู้อำนวยการโรงเรียนบ้านนาออก'}</p>
      </div>
    </div>
  );

  // 3-Line Header Component for A4 Pages
  const renderA4Header = (title: string, subDetail?: string) => (
    <div className="mb-3 text-center text-black">
      <div className="flex justify-center mb-2">
        {schoolInfo.logoUrl ? (
          <img 
            src={schoolInfo.logoUrl} 
            alt="School Logo" 
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto" 
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-2xl mx-auto">
            🏫
          </div>
        )}
      </div>
      <h1 className="text-base font-bold text-black tracking-tight">
        {title}
      </h1>
      <div className="text-xs font-semibold text-black mt-0.5">
        โรงเรียน{schoolInfo.schoolName ? schoolInfo.schoolName.replace(/^โรงเรียน\s*/, '') : '...................................................'} {schoolInfo.affiliation ? `สังกัด${schoolInfo.affiliation}` : ''}
      </div>
      <div className="text-xs font-bold text-black mt-0.5">
        ปีการศึกษา {selectedYear}&nbsp;&nbsp;&nbsp;&nbsp;ภาคเรียนที่ {selectedSemester}&nbsp;&nbsp;&nbsp;&nbsp;{getGradeCleanName(grade)}{roomsForGrade.length > 1 || activeRoom !== '1' ? ` ห้อง ${activeRoom}` : ''}{subDetail ? `\u00A0\u00A0\u00A0\u00A0${subDetail}` : ''}
      </div>
    </div>
  );

  // Render a Single Reading/Writing Table (Reading, Thinking, or Writing)
  const renderSingleRWTableSheet = (table: AssessmentTableConfig, tableIndex: number, pageNum: number) => {
    const tableType = getStudentTableType(table);
    const maxScore = table.indicators.reduce((sum, ind) => sum + (ind.maxScore || 0), 0);

    return (
      <div 
        key={table.id}
        className={`${reportOrientation === 'landscape' ? 'a4-landscape-paper min-h-[210mm]' : 'a4-portrait-paper min-h-[297mm]'} bg-white border border-slate-300 shadow-xl rounded-sm py-4 sm:py-5 mx-auto text-black relative transition-all`}
        style={{ width: reportOrientation === 'landscape' ? '297mm' : '210mm', maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm', paddingLeft: '20mm', paddingRight: '10mm' }}
      >
        {renderA4Header(`แบบประเมินการอ่าน คิดวิเคราะห์ และเขียน (ตารางที่ ${tableIndex}: ${table.title})`)}

        <div className="border border-slate-800 bg-white">
          <table className="w-full text-left text-[11px] border-collapse text-black bg-white">
            <thead className="bg-white" style={{ backgroundColor: '#ffffff' }}>
              <tr className="bg-white text-black font-bold border-b border-slate-800 leading-normal" style={{ backgroundColor: '#ffffff' }}>
                <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-7 shrink-0 font-mono text-[10px] align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                  ที่
                </th>
                <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-16 shrink-0 font-mono text-[10.5px] align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                  รหัสประจำตัว
                </th>
                <th className="py-1.5 px-2 border-r border-b border-slate-800 text-center w-40 shrink-0 text-[11px] align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                  ชื่อ - นามสกุล
                </th>

                {/* Indicator Columns */}
                {table.indicators.map((ind) => (
                  <th key={ind.id} className="py-1.5 px-1 border-r border-b border-slate-800 text-center bg-white text-black align-middle" style={{ backgroundColor: '#ffffff' }}>
                    <div className="font-bold text-[10.5px] leading-snug mx-auto text-black">
                      {ind.name}
                    </div>
                    <div className="text-[9.5px] font-mono text-black font-normal mt-0.5 leading-snug">
                      (เต็ม {ind.maxScore})
                    </div>
                  </th>
                ))}

                <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-13 bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                  รวม ({maxScore})
                </th>
                <th className="py-1.5 px-1 border-b border-slate-800 text-center w-16 bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                  ระดับคุณภาพ
                </th>
              </tr>
            </thead>

            <tbody className="text-black bg-white">
              {classStudents.map((s, idx) => {
                const rec = getStudentAssessment(s);
                const hasTable = hasStudentTableScore(rec, table);
                const tableScore = hasTable ? getStudentTableScore(rec, table) : null;
                const level = hasTable && tableScore !== null ? getTableScoreLevel(tableScore, tableType) : null;

                return (
                  <tr key={s.id} className="hover:bg-slate-50 leading-normal text-black bg-white">
                    <td className="py-1.5 px-0.5 border-r border-b border-slate-800 text-center font-mono tabular-nums text-black text-[10px] align-middle">
                      {s.rollNumber || idx + 1}
                    </td>
                    <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-mono tabular-nums text-black text-[10.5px] align-middle">
                      {s.studentCode || '-'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-b border-slate-800 font-medium text-black whitespace-nowrap text-[11px] align-middle">
                      {s.prefix}{s.firstName} {s.lastName}
                    </td>

                    {/* Indicator Scores */}
                    {table.indicators.map((ind) => {
                      const hasInd = hasIndicatorScore(rec, ind.id);
                      const sc = rec.indicatorScores?.[ind.id];
                      return (
                        <td key={ind.id} className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-mono text-[10.5px] tabular-nums text-black align-middle">
                          {hasInd ? sc : ''}
                        </td>
                      );
                    })}

                    <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-mono text-[10.5px] tabular-nums font-bold bg-white text-black align-middle">
                      {hasTable && tableScore !== null ? tableScore : ''}
                    </td>
                    <td className="py-1.5 px-1 border-b border-slate-800 text-center text-[10px] font-bold align-middle text-black">
                      {hasTable && level !== null ? (
                        <span className="font-bold text-black text-[10px]">
                          {getLevelBadgeText(level)}
                        </span>
                      ) : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot className="bg-white" style={{ backgroundColor: '#ffffff' }}>
              <tr className="bg-white font-bold text-black text-[10.5px] leading-normal" style={{ backgroundColor: '#ffffff' }}>
                <td colSpan={3} className="py-1.5 px-2 border-r border-slate-800 text-center font-bold align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                  คะแนนเฉลี่ย
                </td>
                {table.indicators.map((ind) => {
                  let total = 0, count = 0;
                  classStudents.forEach(s => {
                    const rec = getStudentAssessment(s);
                    if (hasIndicatorScore(rec, ind.id)) {
                      total += Number(rec.indicatorScores![ind.id]);
                      count++;
                    }
                  });
                  return (
                    <td key={ind.id} className="py-1.5 px-1 border-r border-slate-800 text-center font-mono font-medium text-black align-middle bg-white text-[10.5px]" style={{ backgroundColor: '#ffffff' }}>
                      {count > 0 ? (total / count).toFixed(1) : ''}
                    </td>
                  );
                })}
                <td className="py-1.5 px-1 border-r border-slate-800 text-center font-mono font-bold bg-white text-black align-middle text-[10.5px]" style={{ backgroundColor: '#ffffff' }}>
                  {(() => {
                    let total = 0, count = 0;
                    classStudents.forEach(s => {
                      const rec = getStudentAssessment(s);
                      if (hasStudentTableScore(rec, table)) {
                        total += getStudentTableScore(rec, table);
                        count++;
                      }
                    });
                    return count > 0 ? (total / count).toFixed(1) : '';
                  })()}
                </td>
                <td className="py-1.5 px-1 text-center text-[10px] text-black align-middle font-bold bg-white" style={{ backgroundColor: '#ffffff' }}>
                  รวม {classStudents.length} คน
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {renderSignatures()}

        <div className="a4-page-limit-line mt-6 pt-2 border-t-2 border-dashed border-slate-400 text-center text-[10px] font-bold text-black no-print flex items-center justify-center gap-2 bg-slate-50 py-1 rounded">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
          <span>--- สิ้นสุดความยาวกระดาษ A4 แผ่นที่ {pageNum} (297 mm) ---</span>
        </div>
      </div>
    );
  };

  // Render Reading/Writing Summary Sheet (สรุปปริมาณและคุณภาพ)
  const renderRWSummarySheet = (pageNum: number) => {
    const rMax = readingTable.indicators.reduce((sum, ind) => sum + (ind.maxScore || 0), 0);
    const tMax = thinkingTable.indicators.reduce((sum, ind) => sum + (ind.maxScore || 0), 0);
    const wMax = writingTable.indicators.reduce((sum, ind) => sum + (ind.maxScore || 0), 0);
    const totalMax = rMax + tMax + wMax;

    return (
      <div 
        className={`${reportOrientation === 'landscape' ? 'a4-landscape-paper min-h-[210mm]' : 'a4-portrait-paper min-h-[297mm]'} bg-white border border-slate-300 shadow-xl rounded-sm py-4 sm:py-5 mx-auto text-black relative transition-all`}
        style={{ width: reportOrientation === 'landscape' ? '297mm' : '210mm', maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm', paddingLeft: '20mm', paddingRight: '10mm' }}
      >
        {renderA4Header('แบบสรุปผลการประเมินการอ่าน คิดวิเคราะห์ และเขียน', 'สรุปผลเชิงปริมาณและคุณภาพ')}

        <div className="border border-slate-800 bg-white">
          <table className="w-full text-left text-[11px] border-collapse text-black bg-white">
            <thead className="bg-white" style={{ backgroundColor: '#ffffff' }}>
              <tr className="bg-white text-black font-bold leading-normal" style={{ backgroundColor: '#ffffff' }}>
                <th rowSpan={2} className="py-1.5 px-1 bg-white border-r border-b border-slate-800 text-center w-7 shrink-0 font-mono text-[10px] align-middle text-black" style={{ backgroundColor: '#ffffff' }}>
                  ที่
                </th>
                <th rowSpan={2} className="py-1.5 px-1 bg-white border-r border-b border-slate-800 text-center w-16 shrink-0 font-mono text-[10.5px] align-middle text-black" style={{ backgroundColor: '#ffffff' }}>
                  รหัสประจำตัว
                </th>
                <th rowSpan={2} className="py-1.5 px-2 bg-white border-r border-b border-slate-800 text-center w-40 shrink-0 text-[11px] align-middle text-black" style={{ backgroundColor: '#ffffff' }}>
                  ชื่อ - นามสกุล
                </th>

                {/* Column การอ่าน */}
                <th colSpan={2} className="py-1.5 px-1 border-r border-b border-slate-800 text-center bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                  การอ่าน ({rMax})
                </th>

                {/* Column คิดวิเคราะห์ */}
                <th colSpan={2} className="py-1.5 px-1 border-r border-b border-slate-800 text-center bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                  คิดวิเคราะห์ ({tMax})
                </th>

                {/* Column การเขียน */}
                <th colSpan={2} className="py-1.5 px-1 border-r border-b border-slate-800 text-center bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                  การเขียน ({wMax})
                </th>

                {/* Column รวม */}
                <th colSpan={2} className="py-1.5 px-1 border-r border-b border-slate-800 text-center bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                  รวม ({totalMax})
                </th>

                <th rowSpan={2} className="py-1.5 px-1 border-b border-slate-800 text-center w-16 bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                  สรุปผล
                </th>
              </tr>

              <tr className="bg-white text-black font-bold text-[9.5px] leading-normal" style={{ backgroundColor: '#ffffff' }}>
                <th className="py-1.5 px-0.5 bg-white border-r border-b border-slate-800 text-center w-12 align-middle text-black" style={{ backgroundColor: '#ffffff' }}>ปริมาณ</th>
                <th className="py-1.5 px-0.5 bg-white border-r border-b border-slate-800 text-center w-14 align-middle text-black" style={{ backgroundColor: '#ffffff' }}>คุณภาพ</th>

                <th className="py-1.5 px-0.5 bg-white border-r border-b border-slate-800 text-center w-12 align-middle text-black" style={{ backgroundColor: '#ffffff' }}>ปริมาณ</th>
                <th className="py-1.5 px-0.5 bg-white border-r border-b border-slate-800 text-center w-14 align-middle text-black" style={{ backgroundColor: '#ffffff' }}>คุณภาพ</th>

                <th className="py-1.5 px-0.5 bg-white border-r border-b border-slate-800 text-center w-12 align-middle text-black" style={{ backgroundColor: '#ffffff' }}>ปริมาณ</th>
                <th className="py-1.5 px-0.5 bg-white border-r border-b border-slate-800 text-center w-14 align-middle text-black" style={{ backgroundColor: '#ffffff' }}>คุณภาพ</th>

                <th className="py-1.5 px-0.5 border-r border-b border-slate-800 text-center w-12 bg-white align-middle text-black" style={{ backgroundColor: '#ffffff' }}>ปริมาณ</th>
                <th className="py-1.5 px-0.5 border-r border-b border-slate-800 text-center w-14 bg-white align-middle text-black" style={{ backgroundColor: '#ffffff' }}>คุณภาพ</th>
              </tr>
            </thead>

            <tbody className="text-black bg-white">
              {classStudents.map((s, idx) => {
                const rec = getStudentAssessment(s);
                const hasR = hasStudentTableScore(rec, readingTable);
                const hasT = hasStudentTableScore(rec, thinkingTable);
                const hasW = hasStudentTableScore(rec, writingTable);
                const hasAny = hasR || hasT || hasW;

                const rScore = hasR ? getStudentTableScore(rec, readingTable) : null;
                const tScore = hasT ? getStudentTableScore(rec, thinkingTable) : null;
                const wScore = hasW ? getStudentTableScore(rec, writingTable) : null;
                const sumScore = hasAny ? (rScore || 0) + (tScore || 0) + (wScore || 0) : null;

                const lR = hasR && rScore !== null ? getTableScoreLevel(rScore, 'reading') : null;
                const lT = hasT && tScore !== null ? getTableScoreLevel(tScore, 'thinking') : null;
                const lW = hasW && wScore !== null ? getTableScoreLevel(wScore, 'writing') : null;

                const gradedLevels = [lR, lT, lW].filter((l): l is number => l !== null);
                const overallLevel = gradedLevels.length > 0
                  ? Math.min(3, Math.max(0, Math.round(gradedLevels.reduce((a, b) => a + b, 0) / gradedLevels.length)))
                  : null;

                const isLastRow = idx === classStudents.length - 1;

                return (
                  <tr key={s.id} className="hover:bg-slate-50 leading-normal text-black bg-white">
                    <td className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono tabular-nums text-black text-[10px] align-middle`}>
                      {s.rollNumber || idx + 1}
                    </td>
                    <td className={`py-1.5 px-1 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono tabular-nums text-black text-[10.5px] align-middle`}>
                      {s.studentCode || '-'}
                    </td>
                    <td className={`py-1.5 px-2 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 font-medium text-black whitespace-nowrap text-[11px] align-middle`}>
                      {s.prefix}{s.firstName} {s.lastName}
                    </td>

                    {/* การอ่าน */}
                    <td className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono text-[10.5px] tabular-nums align-middle text-black`}>{hasR && rScore !== null ? rScore : ''}</td>
                    <td className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center text-[10px] font-bold align-middle text-black`}>{hasR && lR !== null ? getLevelBadgeText(lR) : ''}</td>

                    {/* คิดวิเคราะห์ */}
                    <td className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono text-[10.5px] tabular-nums align-middle text-black`}>{hasT && tScore !== null ? tScore : ''}</td>
                    <td className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center text-[10px] font-bold align-middle text-black`}>{hasT && lT !== null ? getLevelBadgeText(lT) : ''}</td>

                    {/* การเขียน */}
                    <td className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono text-[10.5px] tabular-nums align-middle text-black`}>{hasW && wScore !== null ? wScore : ''}</td>
                    <td className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center text-[10px] font-bold align-middle text-black`}>{hasW && lW !== null ? getLevelBadgeText(lW) : ''}</td>

                    {/* รวม */}
                    <td className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono text-[10.5px] tabular-nums font-bold bg-white align-middle text-black`}>{hasAny && sumScore !== null ? sumScore : ''}</td>
                    <td className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center text-[10px] font-bold bg-white align-middle text-black`}>{hasAny && overallLevel !== null ? getLevelBadgeText(overallLevel) : ''}</td>

                    {/* Overall Badge */}
                    <td className={`py-1.5 px-1 ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-bold text-[10px] align-middle text-black`}>
                      {hasAny && overallLevel !== null ? (
                        <span className="font-bold text-black text-[10px]">
                          {getLevelBadgeText(overallLevel)}
                        </span>
                      ) : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {renderSignatures()}

        <div className="a4-page-limit-line mt-6 pt-2 border-t-2 border-dashed border-slate-400 text-center text-[10px] font-bold text-black no-print flex items-center justify-center gap-2 bg-slate-50 py-1 rounded">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
          <span>--- สิ้นสุดความยาวกระดาษ A4 แผ่นที่ {pageNum} (297 mm) ---</span>
        </div>
      </div>
    );
  };

  // Render Tab 2: Characteristics Overview Sheet (สรุปข้อหลักทั้ง 8 ข้อ)
  const renderCharacteristicsOverviewSheet = () => (
    <div 
      className={`${reportOrientation === 'landscape' ? 'a4-landscape-paper min-h-[210mm]' : 'a4-portrait-paper min-h-[297mm]'} bg-white border border-slate-300 shadow-xl rounded-sm py-4 sm:py-5 mx-auto text-black relative transition-all`}
      style={{ width: reportOrientation === 'landscape' ? '297mm' : '210mm', maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm', paddingLeft: '20mm', paddingRight: '10mm' }}
    >
      {renderA4Header('แบบสรุปผลการประเมินคุณลักษณะอันพึงประสงค์ 8 ประการ', 'สรุปผลรายบุคคลทั้งห้องเรียน')}

      <div className="border border-slate-800 bg-white">
        <table className="w-full text-left text-[11px] border-collapse text-black bg-white">
          <thead className="bg-white" style={{ backgroundColor: '#ffffff' }}>
            <tr className="bg-white text-black font-bold border-b border-slate-800 leading-normal" style={{ backgroundColor: '#ffffff' }}>
              <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-7 shrink-0 font-mono text-[10px] align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                ที่
              </th>
              <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-16 shrink-0 font-mono text-[10.5px] align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                รหัสประจำตัว
              </th>
              <th className="py-1.5 px-2 border-r border-b border-slate-800 text-center w-36 shrink-0 text-[11px] align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                ชื่อ - นามสกุล
              </th>

              {/* 8 Core Characteristics - Equal Width & Wrapping Full Titles */}
              {CHARACTERISTICS_GROUPS.map((grp) => (
                <th key={grp.id} className="py-1.5 px-0.5 border-r border-b border-slate-800 text-center w-[9%] bg-white text-black font-bold align-middle" style={{ backgroundColor: '#ffffff' }} title={grp.title}>
                  <div className="text-[10px] font-bold text-black leading-snug">ข้อ {grp.number}</div>
                  <div className="text-[9px] font-semibold leading-snug whitespace-normal break-words text-black mt-0.5">
                    {grp.title.replace(/^\d+\)\s*/, '')}
                  </div>
                </th>
              ))}

              <th className="py-1.5 px-1 border-b border-slate-800 text-center w-16 bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                สรุปผล
              </th>
            </tr>
          </thead>

          <tbody className="text-black bg-white">
            {classStudents.map((s, idx) => {
              const rec = getStudentAssessment(s);
              const hasChar = hasStudentCharacteristicsScore(rec);
              const char = rec.characteristics || ({} as any);

              const validItemScores = [
                char.item1, char.item2, char.item3, char.item4,
                char.item5, char.item6, char.item7, char.item8
              ].filter((v): v is number => typeof v === 'number');
              const avgChar = validItemScores.length > 0
                ? Math.round(validItemScores.reduce((a, b) => a + b, 0) / validItemScores.length)
                : null;
              const overall = hasChar
                ? (char.overallLevel !== undefined ? char.overallLevel : avgChar)
                : null;

              const isLastRow = idx === classStudents.length - 1;

              return (
                <tr key={s.id} className="hover:bg-slate-50 leading-normal text-black bg-white">
                  <td className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono tabular-nums text-black text-[10px] align-middle`}>
                    {s.rollNumber || idx + 1}
                  </td>
                  <td className={`py-1.5 px-1 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono tabular-nums text-black text-[10.5px] align-middle`}>
                    {s.studentCode || '-'}
                  </td>
                  <td className={`py-1.5 px-2 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 font-medium text-black whitespace-nowrap text-[11px] align-middle`}>
                    {s.prefix}{s.firstName} {s.lastName}
                  </td>

                  {/* 8 Items */}
                  {CHARACTERISTICS_GROUPS.map((grp) => {
                    const rawScore = (char as any)[grp.itemKey];
                    const hasScore = hasChar && rawScore !== undefined && rawScore !== null;
                    return (
                      <td key={grp.id} className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono text-[10.5px] tabular-nums font-semibold text-black align-middle`}>
                        {hasScore ? rawScore : ''}
                      </td>
                    );
                  })}

                  <td className={`py-1.5 px-1 ${isLastRow ? '' : 'border-b'} border-slate-800 text-center text-[10px] font-bold align-middle text-black`}>
                    {hasChar && overall !== null ? (
                      <span className="font-bold text-black text-[10px]">
                        {getLevelBadgeText(overall)}
                      </span>
                    ) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {renderSignatures()}

      <div className="a4-page-limit-line mt-6 pt-2 border-t-2 border-dashed border-slate-400 text-center text-[10px] font-bold text-black no-print flex items-center justify-center gap-2 bg-slate-50 py-1 rounded">
        <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
        <span>--- สิ้นสุดความยาวกระดาษ A4 หน้าที่ 1 (297 mm) ---</span>
      </div>
    </div>
  );

  // Render Tab 2: Characteristics Individual Student Detailed Sheet (แบ่ง 2 หน้า หน้าละ 4 ข้อใหญ่)
  const renderCharacteristicsIndividualSheet = () => {
    const studentsToRender = selectedStudentId === 'all'
      ? classStudents
      : classStudents.filter(s => s.id === selectedStudentId);

    if (studentsToRender.length === 0) {
      return (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl">
          ไม่พบข้อมูลนักเรียน
        </div>
      );
    }

    const group1_4 = CHARACTERISTICS_GROUPS.slice(0, 4);
    const group5_8 = CHARACTERISTICS_GROUPS.slice(4, 8);

    return (
      <div className="space-y-8 text-black">
        {studentsToRender.map((st) => {
          const rec = getStudentAssessment(st);
          const hasChar = hasStudentCharacteristicsScore(rec);
          const subScores = rec.characteristics?.subScores || {};

          return (
            <div key={st.id} className="space-y-8 print:space-y-0 text-black">
              {/* PAGE 1: Items 1 - 4 */}
              <div 
                className={`${reportOrientation === 'landscape' ? 'a4-landscape-paper min-h-[210mm]' : 'a4-portrait-paper min-h-[297mm]'} bg-white border border-slate-300 shadow-xl rounded-sm py-5 sm:py-6 mx-auto text-black relative transition-all print:shadow-none print:m-0 print:border-none`}
                style={{ width: reportOrientation === 'landscape' ? '297mm' : '210mm', maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm', paddingLeft: '20mm', paddingRight: '10mm', pageBreakAfter: 'always', breakAfter: 'page' }}
              >
                {renderA4Header('แบบประเมินคุณลักษณะอันพึงประสงค์ 8 ประการ (รายบุคคล)')}

                {/* Student Info Bar */}
                <div className="mb-3 px-3.5 py-2 bg-white border border-slate-800 rounded text-[13px] flex items-center justify-between gap-2 leading-normal text-black" style={{ backgroundColor: '#ffffff' }}>
                  <span className="shrink-0 text-black">
                    <span className="text-black font-medium">รหัสประจำตัว: </span>
                    <strong className="text-black font-mono font-bold text-[13px]">{st.studentCode || '-'}</strong>
                  </span>
                  <span className="px-2 text-black">
                    <span className="text-black font-medium">ชื่อ-นามสกุล: </span>
                    <strong className="text-black font-bold text-base">{st.prefix}{st.firstName} {st.lastName}</strong>
                  </span>
                  <span className="shrink-0 text-black">
                    <span className="text-black font-medium">เลขที่: </span>
                    <strong className="text-black font-mono font-bold text-[13px]">{st.rollNumber || '-'}</strong>
                  </span>
                </div>

                {/* Groups 1 to 4 Table */}
                <div className="border border-slate-800 mb-4 bg-white">
                  <table className="w-full text-left text-[13px] border-collapse text-black bg-white">
                    <thead className="bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>
                      <tr className="bg-amber-300 text-black font-bold border-b border-slate-800 text-[13px] leading-normal" style={{ backgroundColor: '#fcd34d' }}>
                        <th className="py-2.5 px-3 border-r border-b border-slate-800 text-left align-middle text-black bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>
                          คุณลักษณะและตัวชี้วัด (ข้อ 1 - 4)
                        </th>
                        <th className="py-2.5 px-1 border-r border-b border-slate-800 text-center w-16 align-middle text-black bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>ดีเยี่ยม (3)</th>
                        <th className="py-2.5 px-1 border-r border-b border-slate-800 text-center w-16 align-middle text-black bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>ดี (2)</th>
                        <th className="py-2.5 px-1 border-r border-b border-slate-800 text-center w-16 align-middle text-black bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>ผ่าน (1)</th>
                        <th className="py-2.5 px-1 border-b border-slate-800 text-center w-16 align-middle text-black bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>ไม่ผ่าน (0)</th>
                      </tr>
                    </thead>

                    <tbody className="text-black bg-white">
                      {group1_4.map((grp) => {
                        const itemScore = hasChar ? (rec.characteristics as any)?.[grp.itemKey] : undefined;

                        return (
                          <React.Fragment key={grp.id}>
                            <tr className="bg-amber-100 font-bold text-black text-[12.5px] leading-normal" style={{ backgroundColor: '#fef3c7' }}>
                              <td className="py-1.5 px-3 border-r border-b border-slate-800 align-middle text-black bg-amber-100" style={{ backgroundColor: '#fef3c7' }}>
                                {grp.title}
                              </td>
                              <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-amber-100" style={{ backgroundColor: '#fef3c7' }}>
                                {itemScore === 3 ? '✓' : ''}
                              </td>
                              <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-amber-100" style={{ backgroundColor: '#fef3c7' }}>
                                {itemScore === 2 ? '✓' : ''}
                              </td>
                              <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-amber-100" style={{ backgroundColor: '#fef3c7' }}>
                                {itemScore === 1 ? '✓' : ''}
                              </td>
                              <td className="py-1.5 px-1 border-b border-slate-800 text-center font-bold text-black align-middle bg-amber-100" style={{ backgroundColor: '#fef3c7' }}>
                                {itemScore === 0 ? '✓' : ''}
                              </td>
                            </tr>

                            {grp.indicators.map((ind) => {
                              const subSc = hasChar
                                ? (subScores[ind.id] !== undefined ? subScores[ind.id] : itemScore)
                                : undefined;
                              return (
                                <tr key={ind.id} className="hover:bg-slate-50 text-xs text-black leading-normal bg-white" style={{ backgroundColor: '#ffffff' }}>
                                  <td className="py-1.5 px-3 border-r border-b border-slate-800 pl-7 align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                                    {ind.text}
                                  </td>
                                  <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-white" style={{ backgroundColor: '#ffffff' }}>
                                    {subSc === 3 ? '✓' : ''}
                                  </td>
                                  <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-white" style={{ backgroundColor: '#ffffff' }}>
                                    {subSc === 2 ? '✓' : ''}
                                  </td>
                                  <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-white" style={{ backgroundColor: '#ffffff' }}>
                                    {subSc === 1 ? '✓' : ''}
                                  </td>
                                  <td className="py-1.5 px-1 border-b border-slate-800 text-center font-bold text-black align-middle bg-white" style={{ backgroundColor: '#ffffff' }}>
                                    {subSc === 0 ? '✓' : ''}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="a4-page-limit-line mt-6 pt-2 border-t-2 border-dashed border-slate-400 text-center text-xs font-bold text-black no-print flex items-center justify-center gap-2 bg-slate-50 py-1.5 rounded">
                  <CheckCircle2 className="w-4 h-4 text-slate-600" />
                  <span>--- สิ้นสุดความยาวกระดาษ A4 หน้าที่ 1 (297 mm) - {st.prefix}{st.firstName} {st.lastName} ---</span>
                </div>
              </div>

              {/* PAGE 2: Items 5 - 8 + Signatures */}
              <div 
                className={`${reportOrientation === 'landscape' ? 'a4-landscape-paper min-h-[210mm]' : 'a4-portrait-paper min-h-[297mm]'} bg-white border border-slate-300 shadow-xl rounded-sm pb-5 sm:pb-6 mx-auto text-black relative transition-all print:shadow-none print:m-0 print:border-none`}
                style={{ width: reportOrientation === 'landscape' ? '297mm' : '210mm', maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm', paddingTop: '19mm', paddingLeft: '20mm', paddingRight: '10mm', pageBreakAfter: 'always', breakAfter: 'page' }}
              >
                {/* Student Info Bar */}
                <div className="mb-3 px-3.5 py-2 bg-white border border-slate-800 rounded text-[13px] flex items-center justify-between gap-2 leading-normal text-black" style={{ backgroundColor: '#ffffff' }}>
                  <span className="shrink-0 text-black">
                    <span className="text-black font-medium">รหัสประจำตัว: </span>
                    <strong className="text-black font-mono font-bold text-[13px]">{st.studentCode || '-'}</strong>
                  </span>
                  <span className="px-2 text-black">
                    <span className="text-black font-medium">ชื่อ-นามสกุล: </span>
                    <strong className="text-black font-bold text-base">{st.prefix}{st.firstName} {st.lastName}</strong>
                  </span>
                  <span className="shrink-0 text-black">
                    <span className="text-black font-medium">เลขที่: </span>
                    <strong className="text-black font-mono font-bold text-[13px]">{st.rollNumber || '-'}</strong>
                  </span>
                </div>

                {/* Groups 5 to 8 Table */}
                <div className="border border-slate-800 bg-white">
                  <table className="w-full text-left text-[13px] border-collapse text-black bg-white">
                    <thead className="bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>
                      <tr className="bg-amber-300 text-black font-bold border-b border-slate-800 text-[13px] leading-normal" style={{ backgroundColor: '#fcd34d' }}>
                        <th className="py-2.5 px-3 border-r border-b border-slate-800 text-left align-middle text-black bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>
                          คุณลักษณะและตัวชี้วัด (ข้อ 5 - 8)
                        </th>
                        <th className="py-2.5 px-1 border-r border-b border-slate-800 text-center w-16 align-middle text-black bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>ดีเยี่ยม (3)</th>
                        <th className="py-2.5 px-1 border-r border-b border-slate-800 text-center w-16 align-middle text-black bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>ดี (2)</th>
                        <th className="py-2.5 px-1 border-r border-b border-slate-800 text-center w-16 align-middle text-black bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>ผ่าน (1)</th>
                        <th className="py-2.5 px-1 border-b border-slate-800 text-center w-16 align-middle text-black bg-amber-300" style={{ backgroundColor: '#fcd34d' }}>ไม่ผ่าน (0)</th>
                      </tr>
                    </thead>

                    <tbody className="text-black bg-white">
                      {group5_8.map((grp) => {
                        const itemScore = hasChar ? (rec.characteristics as any)?.[grp.itemKey] : undefined;

                        return (
                          <React.Fragment key={grp.id}>
                            <tr className="bg-amber-100 font-bold text-black text-[12.5px] leading-normal" style={{ backgroundColor: '#fef3c7' }}>
                              <td className="py-1.5 px-3 border-r border-b border-slate-800 align-middle text-black bg-amber-100" style={{ backgroundColor: '#fef3c7' }}>
                                {grp.title}
                              </td>
                              <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-amber-100" style={{ backgroundColor: '#fef3c7' }}>
                                {itemScore === 3 ? '✓' : ''}
                              </td>
                              <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-amber-100" style={{ backgroundColor: '#fef3c7' }}>
                                {itemScore === 2 ? '✓' : ''}
                              </td>
                              <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-amber-100" style={{ backgroundColor: '#fef3c7' }}>
                                {itemScore === 1 ? '✓' : ''}
                              </td>
                              <td className="py-1.5 px-1 border-b border-slate-800 text-center font-bold text-black align-middle bg-amber-100" style={{ backgroundColor: '#fef3c7' }}>
                                {itemScore === 0 ? '✓' : ''}
                              </td>
                            </tr>

                            {grp.indicators.map((ind) => {
                              const subSc = hasChar
                                ? (subScores[ind.id] !== undefined ? subScores[ind.id] : itemScore)
                                : undefined;
                              return (
                                <tr key={ind.id} className="hover:bg-slate-50 text-xs text-black leading-normal bg-white" style={{ backgroundColor: '#ffffff' }}>
                                  <td className="py-1.5 px-3 border-r border-b border-slate-800 pl-7 align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                                    {ind.text}
                                  </td>
                                  <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-white" style={{ backgroundColor: '#ffffff' }}>
                                    {subSc === 3 ? '✓' : ''}
                                  </td>
                                  <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-white" style={{ backgroundColor: '#ffffff' }}>
                                    {subSc === 2 ? '✓' : ''}
                                  </td>
                                  <td className="py-1.5 px-1 border-r border-b border-slate-800 text-center font-bold text-black align-middle bg-white" style={{ backgroundColor: '#ffffff' }}>
                                    {subSc === 1 ? '✓' : ''}
                                  </td>
                                  <td className="py-1.5 px-1 border-b border-slate-800 text-center font-bold text-black align-middle bg-white" style={{ backgroundColor: '#ffffff' }}>
                                    {subSc === 0 ? '✓' : ''}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {renderSignatures()}

                <div className="a4-page-limit-line mt-6 pt-2 border-t-2 border-dashed border-slate-400 text-center text-xs font-bold text-black no-print flex items-center justify-center gap-2 bg-slate-50 py-1.5 rounded">
                  <CheckCircle2 className="w-4 h-4 text-slate-600" />
                  <span>--- สิ้นสุดความยาวกระดาษ A4 หน้าที่ 2 (297 mm) - {st.prefix}{st.firstName} {st.lastName} ---</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Tab 3: Competencies Sheet (สมรรถนะสำคัญ 5 ด้าน ตามตารางปกติ)
  const renderCompetenciesSheet = () => (
    <div 
      className={`${reportOrientation === 'landscape' ? 'a4-landscape-paper min-h-[210mm]' : 'a4-portrait-paper min-h-[297mm]'} bg-white border border-slate-300 shadow-xl rounded-sm py-4 sm:py-5 mx-auto text-black relative transition-all`}
      style={{ width: reportOrientation === 'landscape' ? '297mm' : '210mm', maxWidth: reportOrientation === 'landscape' ? '297mm' : '210mm', paddingLeft: '20mm', paddingRight: '10mm' }}
    >
      {renderA4Header('แบบรายงานการประเมินสมรรถนะสำคัญของผู้เรียน 5 ด้าน', 'สรุปผลรายบุคคลทั้งห้องเรียน')}

      <div className="border border-slate-800 bg-white">
        <table className="w-full text-left text-[11px] border-collapse text-black bg-white">
          <thead className="bg-white" style={{ backgroundColor: '#ffffff' }}>
            <tr className="bg-white text-black font-bold border-b border-slate-800 leading-normal" style={{ backgroundColor: '#ffffff' }}>
              <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-7 shrink-0 font-mono text-[10px] align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                ที่
              </th>
              <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-16 shrink-0 font-mono text-[10.5px] align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                รหัสประจำตัว
              </th>
              <th className="py-1.5 px-2 border-r border-b border-slate-800 text-center w-36 shrink-0 text-[11px] align-middle text-black bg-white" style={{ backgroundColor: '#ffffff' }}>
                ชื่อ - นามสกุล
              </th>

              {/* 5 Competencies */}
              <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-16 bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                1. การสื่อสาร
              </th>
              <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-16 bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                2. การคิด
              </th>
              <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-16 bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                3. แก้ปัญหา
              </th>
              <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-16 bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                4. ทักษะชีวิต
              </th>
              <th className="py-1.5 px-1 border-r border-b border-slate-800 text-center w-16 bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                5. เทคโนโลยี
              </th>

              <th className="py-1.5 px-1 border-b border-slate-800 text-center w-16 bg-white text-black font-bold text-[10.5px] align-middle" style={{ backgroundColor: '#ffffff' }}>
                สรุปผล
              </th>
            </tr>
          </thead>

          <tbody className="text-black bg-white">
            {classStudents.map((s, idx) => {
              const rec = getStudentAssessment(s);
              const hasComp = hasStudentCompetencyScore(rec);
              const comp = rec.competency || ({} as any);

              const c1 = hasComp && comp.comp1 !== undefined ? comp.comp1 : null;
              const c2 = hasComp && comp.comp2 !== undefined ? comp.comp2 : null;
              const c3 = hasComp && comp.comp3 !== undefined ? comp.comp3 : null;
              const c4 = hasComp && comp.comp4 !== undefined ? comp.comp4 : null;
              const c5 = hasComp && comp.comp5 !== undefined ? comp.comp5 : null;

              const validComps = [c1, c2, c3, c4, c5].filter((v): v is number => v !== null);
              const avg = validComps.length > 0
                ? Math.round(validComps.reduce((a, b) => a + b, 0) / validComps.length)
                : null;
              const overall = hasComp
                ? (comp.overallLevel !== undefined ? comp.overallLevel : avg)
                : null;

              const isLastRow = idx === classStudents.length - 1;

              return (
                <tr key={s.id} className="hover:bg-slate-50 leading-normal text-black bg-white">
                  <td className={`py-1.5 px-0.5 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono tabular-nums text-black text-[10px] align-middle`}>
                    {s.rollNumber || idx + 1}
                  </td>
                  <td className={`py-1.5 px-1 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono tabular-nums text-black text-[10.5px] align-middle`}>
                    {s.studentCode || '-'}
                  </td>
                  <td className={`py-1.5 px-2 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 font-medium text-black whitespace-nowrap text-[11px] align-middle`}>
                    {s.prefix}{s.firstName} {s.lastName}
                  </td>

                  <td className={`py-1.5 px-1 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono text-[10.5px] tabular-nums font-semibold text-black align-middle`}>{c1 !== null ? c1 : ''}</td>
                  <td className={`py-1.5 px-1 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono text-[10.5px] tabular-nums font-semibold text-black align-middle`}>{c2 !== null ? c2 : ''}</td>
                  <td className={`py-1.5 px-1 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono text-[10.5px] tabular-nums font-semibold text-black align-middle`}>{c3 !== null ? c3 : ''}</td>
                  <td className={`py-1.5 px-1 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono text-[10.5px] tabular-nums font-semibold text-black align-middle`}>{c4 !== null ? c4 : ''}</td>
                  <td className={`py-1.5 px-1 border-r ${isLastRow ? '' : 'border-b'} border-slate-800 text-center font-mono text-[10.5px] tabular-nums font-semibold text-black align-middle`}>{c5 !== null ? c5 : ''}</td>

                  <td className={`py-1.5 px-1 ${isLastRow ? '' : 'border-b'} border-slate-800 text-center text-[10px] font-bold align-middle text-black`}>
                    {hasComp && overall !== null ? (
                      <span className="font-bold text-black text-[10px]">
                        {getLevelBadgeText(overall)}
                      </span>
                    ) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {renderSignatures()}

      <div className="a4-page-limit-line mt-6 pt-2 border-t-2 border-dashed border-slate-400 text-center text-[10px] font-bold text-black no-print flex items-center justify-center gap-2 bg-slate-50 py-1 rounded">
        <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
        <span>--- สิ้นสุดความยาวกระดาษ A4 หน้าที่ 1 (297 mm) ---</span>
      </div>
    </div>
  );

  return (
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
            margin: 5mm !important;
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
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: 1px solid #94a3b8 !important;
            border-radius: 0 !important;
            padding: 5mm 10mm 5mm 20mm !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: ${reportOrientation === 'landscape' ? '297mm' : '210mm'} !important;
          }
          .a4-page-limit-line {
            display: none !important;
          }
        }
      ` }} />

      <div className={`bg-slate-100 rounded-2xl w-full ${reportOrientation === 'landscape' ? 'max-w-[1240px]' : 'max-w-[980px]'} max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 animate-in fade-in zoom-in-95 duration-150 my-auto a4-modal-content`}>
        
        {/* Top Header Bar (No-Print) */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          
          {/* LEFT SIDE: 3 Main Tab Buttons aligned to far left edge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('readingWriting')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'readingWriting'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                การอ่านคิดวิเคราะห์เขียน
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('characteristics')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'characteristics'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                คุณลักษณะอันพึงประสงค์
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('competencies')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'competencies'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                สมรรถนะสำคัญ
              </button>
            </div>


          </div>

          {/* RIGHT SIDE: Sub-page selector, Orientation Toggle, Close button */}
          <div className="flex items-center gap-2 flex-wrap shrink-0 ml-auto">
            {/* Document Sub-page Selector for Reading/Writing Tab */}
            {activeTab === 'readingWriting' && (
              <div className="flex items-center gap-1">
                <select
                  value={rwSubPage}
                  onChange={(e) => setRwSubPage(e.target.value as any)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-emerald-300 font-bold bg-emerald-50 text-emerald-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                >
                  <option value="all">แสดงทั้งหมด (4 หน้า A4)</option>
                  <option value="reading">1) การอ่าน</option>
                  <option value="thinking">2) คิดวิเคราะห์</option>
                  <option value="writing">3) การเขียน</option>
                  <option value="summary">4) สรุปปริมาณกับคุณภาพ</option>
                </select>
              </div>
            )}

            {/* Orientation Toggle: แนวตั้ง vs แนวนอน at top right corner */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300">
              <button
                type="button"
                onClick={() => setReportOrientation('portrait')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  reportOrientation === 'portrait'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="ขนาดกระดาษ A4 แนวตั้ง (210 × 297 มม.)"
              >
                <FileText className="w-3 h-3" />
                <span>แนวตั้ง</span>
              </button>
              <button
                type="button"
                onClick={() => setReportOrientation('landscape')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  reportOrientation === 'landscape'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="ขนาดกระดาษ A4 แนวนอน (297 × 210 มม.)"
              >
                <FileText className="w-3 h-3 rotate-90" />
                <span>แนวนอน</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
              title="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Sub-bar Controls (No-Print) */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          {/* LEFT SIDE: Room Selector, Homeroom Teacher & Academic Head + Tab 2 Options */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">เลือกห้อง:</span>
              <select
                value={activeRoom}
                onChange={(e) => handleSelectRoom(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-xl border border-teal-300 font-bold bg-white text-teal-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
              >
                {roomsForGrade.map(rm => (
                  <option key={rm} value={rm}>
                    ห้อง {rm}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">ครูผู้ประจำชั้น:</span>
              <select
                value={selectedAdvisorId}
                onChange={(e) => setSelectedAdvisorId(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20 max-w-[180px] truncate"
              >
                {currentGradeAdvisors.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.prefix}{p.firstName} {p.lastName} {p.advisorGrade ? `(ประจำชั้น ${p.advisorGrade}${p.advisorRoom ? ` ห้อง ${p.advisorRoom}` : ''})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 pr-3">
              <span className="font-bold text-slate-700">ฝ่ายวิชาการ:</span>
              <select
                value={selectedAcademicHeadId}
                onChange={(e) => setSelectedAcademicHeadId(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20 max-w-[180px] truncate"
              >
                {academicPersonnelList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.prefix}{p.firstName} {p.lastName} {p.position ? `(${p.position})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tab 2: Characteristics Mode & Student selector */}
            {activeTab === 'characteristics' && (
              <div className="flex items-center gap-3 flex-wrap border-l border-slate-200 pl-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700">รูปแบบรายงาน:</span>
                  <select
                    value={charSubView}
                    onChange={(e) => setCharSubView(e.target.value as any)}
                    className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="overview">สรุปข้อหลักทั้ง 8 ข้อ (ทุกคน)</option>
                    <option value="individual">ผลการประเมิน 8 ข้อและข้อย่อย (รายบุคคล)</option>
                  </select>
                </div>

                {charSubView === 'individual' && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">เลือกนักเรียน:</span>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20 max-w-[220px] truncate"
                    >
                      <option value="all">นักเรียนทั้งหมด ({classStudents.length} คน เรียงตามเลขที่)</option>
                      {classStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          เลขที่ {s.rollNumber || '-'} {s.prefix}{s.firstName} {s.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Body: A4 Paper Preview Container */}
        <div ref={previewContainerRef} className="p-4 sm:p-6 overflow-y-auto space-y-8 bg-slate-200/70 flex-1">
          {classStudents.length === 0 ? (
            <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 space-y-2 max-w-[210mm] mx-auto">
              <Users className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">
                ยังไม่มีข้อมูลนักเรียนในชั้น {getGradeCleanName(grade)}
              </p>
              <p className="text-xs text-slate-400">
                กรุณาเพิ่มข้อมูลนักเรียนในระบบก่อนพิมพ์แบบรายงาน
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: การอ่าน คิดวิเคราะห์ และเขียน */}
              {activeTab === 'readingWriting' && (
                <>
                  {(rwSubPage === 'all' || rwSubPage === 'reading') && renderSingleRWTableSheet(readingTable, 1, 1)}
                  {(rwSubPage === 'all' || rwSubPage === 'thinking') && renderSingleRWTableSheet(thinkingTable, 2, 2)}
                  {(rwSubPage === 'all' || rwSubPage === 'writing') && renderSingleRWTableSheet(writingTable, 3, 3)}
                  {(rwSubPage === 'all' || rwSubPage === 'summary') && renderRWSummarySheet(4)}
                </>
              )}

              {/* TAB 2: คุณลักษณะอันพึงประสงค์ */}
              {activeTab === 'characteristics' && (
                <>
                  {charSubView === 'overview' && renderCharacteristicsOverviewSheet()}
                  {charSubView === 'individual' && renderCharacteristicsIndividualSheet()}
                </>
              )}

              {/* TAB 3: สมรรถนะสำคัญ */}
              {activeTab === 'competencies' && renderCompetenciesSheet()}
            </>
          )}
        </div>

        {/* Modal Footer (No-Print) */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 rounded-b-2xl flex items-center justify-between gap-3 shrink-0 no-print">
          <span className="text-xs text-slate-500">
            พร้อมสำหรับการดาวน์โหลดเอกสาร PDF รูปแบบ A4 {reportOrientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={handlePrint}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
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
};
