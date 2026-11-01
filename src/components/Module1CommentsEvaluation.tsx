import React, { useState, useMemo, useEffect } from 'react';
import { 
  Student, 
  UserSession, 
  SchoolInfo, 
  Personnel,
  StudentBehaviorEvaluation,
  BehaviorScores,
  EVALUATION_CRITERIA_ITEMS,
  EvaluationCriteriaKey,
  GradeLevel
} from '../types';
import { StorageService } from '../services/storage';
import { 
  Search, 
  Save, 
  CheckCircle2, 
  Calendar, 
  Edit3, 
  Eye,
  Filter, 
  X, 
  Star,
  Award,
  Layers,
  Sparkles,
  User
} from 'lucide-react';

interface Module1CommentsEvaluationProps {
  user: UserSession;
  students: Student[];
  schoolInfo?: SchoolInfo;
  personnel?: Personnel[];
  registeredHomeroomGrades?: GradeLevel[];
  selectedGrade?: string;
  selectedAcademicYear?: string;
  selectedSemester?: string;
  onSelectGrade?: (grade: string) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  onOpenLightbox?: (imageUrl: string, title: string, subtitle?: string) => void;
}

const PRESET_COMMENTS = [
  'นักเรียนมีความตั้งใจในการเรียนดี มีความรับผิดชอบต่องานที่ได้รับมอบหมาย ปฏิบัติตามกฎระเบียบของโรงเรียนอย่างสม่ำเสมอ',
  'มีมนุษยสัมพันธ์ที่ดีกับเพื่อนและครู สุขภาพร่างกายแข็งแรง อารมณ์แจ่มใส เข้าร่วมกิจกรรมของโรงเรียนด้วยความกระตือรือร้น',
  'ควรส่งเสริมความเอาใจใส่ในการส่งงานให้ตรงเวลา และหมั่นทบทวนบทเรียนเพิ่มเติมเพื่อผลสัมฤทธิ์ที่ดียิ่งขึ้น',
  'มีพัฒนาการด้านการเรียนและอารมณ์ดีขึ้นอย่างต่อเนื่อง สามารถทำงานร่วมกับผู้อื่นได้เป็นอย่างดี',
  'เป็นเด็กดี มีมารยาทเรียบร้อย มีวินัยในตนเอง มีความซื่อสัตย์สุจริต และช่วยเหลืองานส่วนรวมเสมอ',
  'มีความคิดริเริ่มสร้างสรรค์ ใช้เวลาว่างให้เกิดประโยชน์ และปฏิบัติตนเป็นแบบอย่างที่ดีแก่เพื่อนร่วมชั้น'
];

const DEFAULT_SCORES: BehaviorScores = {
  learning: 3,
  attention: 3,
  responsibility: 3,
  freeTimeUsage: 3,
  relationships: 3,
  emotionalControl: 3,
  habitsPersonality: 3,
  health: 3
};

export const Module1CommentsEvaluation: React.FC<Module1CommentsEvaluationProps> = ({
  user,
  students,
  schoolInfo,
  registeredHomeroomGrades = [],
  selectedGrade,
  selectedAcademicYear,
  selectedSemester,
  onSelectGrade,
  onShowToast,
  onOpenLightbox
}) => {
  const isReadOnly = user.role === 'admin';

  // For Admin: follow the dropdown selection from Module1ClassroomAdmin; For Member: strictly follow schoolInfo configured by Admin in Settings
  const academicYear = user.role === 'admin'
    ? (selectedAcademicYear || schoolInfo?.academicYear || '2569')
    : (schoolInfo?.academicYear || '2569');
  const semester = user.role === 'admin'
    ? (selectedSemester || schoolInfo?.semester || '1')
    : (schoolInfo?.semester || '1');

  // Stored evaluations: key = `${studentId}_${academicYear}_${semester}`
  const [evaluations, setEvaluations] = useState<Record<string, StudentBehaviorEvaluation>>(() => 
    StorageService.getBehaviorEvaluations()
  );

  useEffect(() => {
    const unsubscribe = StorageService.subscribe((changedKeys) => {
      if (changedKeys.some(k => k.startsWith('ams_behavior_evaluations'))) {
        setEvaluations(StorageService.getBehaviorEvaluations());
      }
    });
    return () => unsubscribe();
  }, []);

  // Available grade levels
  const availableGradeLevels = useMemo(() => {
    if (user.role === 'admin' && registeredHomeroomGrades.length > 0) {
      return registeredHomeroomGrades;
    }
    const gradesSet = new Set<string>();
    students.forEach(s => {
      if (s.gradeLevel) gradesSet.add(s.gradeLevel.trim());
    });
    const order: GradeLevel[] = [
      'อ.1', 'อ.2', 'อ.3',
      'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
      'ม.1', 'ม.2', 'ม.3'
    ];
    return order.filter(g => gradesSet.has(g));
  }, [students, user.role, registeredHomeroomGrades]);

  // Grade filter & Search
  const [gradeFilter, setGradeFilter] = useState<string>(() => {
    if (user.role === 'member' && user.assignedGrade) {
      return user.assignedGrade;
    }
    if (selectedGrade && selectedGrade !== 'ALL') {
      return selectedGrade;
    }
    return availableGradeLevels[0] || 'ป.1';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Modal for evaluating a specific student
  const [selectedStudentForEval, setSelectedStudentForEval] = useState<Student | null>(null);
  const [currentEvalDraft, setCurrentEvalDraft] = useState<{ scores: BehaviorScores; teacherComment: string }>({
    scores: { ...DEFAULT_SCORES },
    teacherComment: ''
  });

  useEffect(() => {
    if (user.role === 'member' && user.assignedGrade) {
      setGradeFilter(user.assignedGrade);
    } else if (user.role === 'admin') {
      if (selectedGrade && selectedGrade !== 'ALL' && availableGradeLevels.includes(selectedGrade as GradeLevel)) {
        setGradeFilter(selectedGrade);
      } else if (availableGradeLevels.length > 0 && !availableGradeLevels.includes(gradeFilter as GradeLevel)) {
        const nextGrade = availableGradeLevels[0];
        setGradeFilter(nextGrade);
        onSelectGrade?.(nextGrade);
      }
    }
  }, [user.role, user.assignedGrade, selectedGrade, availableGradeLevels]);

  const handleGradeChange = (val: string) => {
    setGradeFilter(val);
    onSelectGrade?.(val);
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      const matchGrade = gradeFilter === 'ALL' || (st.gradeLevel || '').trim() === gradeFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || 
        `${st.prefix || ''}${st.firstName} ${st.lastName}`.toLowerCase().includes(q) ||
        (st.studentCode || '').toLowerCase().includes(q) ||
        String(st.rollNumber || '').includes(q);
      return matchGrade && matchSearch;
    }).sort((a, b) => {
      if (a.gradeLevel !== b.gradeLevel) {
        return (a.gradeLevel || '').localeCompare(b.gradeLevel || '');
      }
      if (a.rollNumber !== undefined && b.rollNumber !== undefined) {
        return a.rollNumber - b.rollNumber;
      }
      return (a.studentCode || '').localeCompare(b.studentCode || '');
    });
  }, [students, gradeFilter, searchQuery]);

  // Get evaluation record key for student in current semester
  const getEvalKey = (studentId: string) => `${studentId}_${academicYear}_${semester}`;

  // Open evaluation modal for student
  const handleOpenEvalModal = (st: Student) => {
    const key = getEvalKey(st.id);
    const existing = evaluations[key];
    if (existing) {
      setCurrentEvalDraft({
        scores: { ...existing.scores },
        teacherComment: existing.teacherComment || ''
      });
    } else {
      setCurrentEvalDraft({
        scores: { ...DEFAULT_SCORES },
        teacherComment: ''
      });
    }
    setSelectedStudentForEval(st);
  };

  // Bulk set all 8 criteria scores (3 All or 2 All)
  const handleBulkSetAllScores = (val: number) => {
    if (isReadOnly) return;
    setCurrentEvalDraft(prev => ({
      ...prev,
      scores: {
        learning: val,
        attention: val,
        responsibility: val,
        freeTimeUsage: val,
        relationships: val,
        emotionalControl: val,
        habitsPersonality: val,
        health: val
      }
    }));
  };

  // Past comment history for selected student across previous semesters and years
  const studentPastEvaluations = useMemo(() => {
    if (!selectedStudentForEval) return [];
    const list: { academicYear: string; semester: string; teacherComment: string; updatedAt?: string }[] = [];
    Object.values(evaluations).forEach(ev => {
      if (ev.studentId === selectedStudentForEval.id && ev.teacherComment && ev.teacherComment.trim() !== '') {
        list.push({
          academicYear: ev.academicYear || '2569',
          semester: ev.semester || '1',
          teacherComment: ev.teacherComment,
          updatedAt: ev.updatedAt
        });
      }
    });
    // Sort descending by year & semester
    return list.sort((a, b) => `${b.academicYear}-${b.semester}`.localeCompare(`${a.academicYear}-${a.semester}`));
  }, [selectedStudentForEval, evaluations]);

  // Save single student evaluation
  const handleSaveStudentEval = () => {
    if (isReadOnly || !selectedStudentForEval) return;
    const key = getEvalKey(selectedStudentForEval.id);
    const evalData: StudentBehaviorEvaluation = {
      id: evaluations[key]?.id || `eval-${selectedStudentForEval.id}-${academicYear}-${semester}`,
      studentId: selectedStudentForEval.id,
      academicYear,
      semester,
      scores: currentEvalDraft.scores,
      teacherComment: currentEvalDraft.teacherComment.trim(),
      updatedAt: new Date().toISOString()
    };

    const updatedMap = StorageService.saveBehaviorEvaluation(evalData);
    setEvaluations({ ...updatedMap });
    setSelectedStudentForEval(null);
    onShowToast('success', 'บันทึกผลการประเมินสำเร็จ', `บันทึกพฤติกรรมและความคิดเห็นของ ${selectedStudentForEval.prefix}${selectedStudentForEval.firstName} (ภาคเรียนที่ ${semester}/${academicYear}) เรียบร้อยแล้ว`);
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* Action Bar & Filters (Hidden for Admin since single grade dropdown is in the top bar) */}
      {!isReadOnly && (
        <div className="bg-white rounded-2xl p-2.5 sm:p-5 shadow-xs border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            {/* Grade Level Filter Display */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Grade Level Display */}
              <div className="flex items-center justify-center sm:justify-start gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
                <span className="shrink-0 font-bold">ชั้น:</span>
                <span className="text-slate-900 font-bold truncate">{gradeFilter}</span>
              </div>
            </div>

            {/* Search Input (Hidden on Mobile, Visible on Desktop) */}
            <div className="hidden sm:relative sm:flex sm:flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, เลขที่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STUDENT TABLE DIRECTLY DISPLAYED */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {!isReadOnly && (
          <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">
                รายชื่อนักเรียน ({filteredStudents.length} คน) — ภาคเรียนที่ {semester} ปีการศึกษา {academicYear}
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-lg">
              บันทึกประเมิน 1 ครั้งต่อ 1 ภาคเรียน
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold text-xs border-b border-slate-200">
                <th className="py-3 px-3 text-center w-16">เลขที่</th>
                <th className="py-3 px-3 text-center w-24">ระดับชั้น</th>
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-4 text-center w-40">สถานะการประเมิน</th>
                <th className="py-3 px-4 text-center w-40">{isReadOnly ? 'ดูข้อมูล' : 'จัดการ'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    ไม่พบรายชื่อนักเรียนในเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const key = getEvalKey(st.id);
                  const hasEvaluated = !!evaluations[key];

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-bold">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                          {st.rollNumber ?? (idx + 1)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-bold text-slate-700 border border-slate-200">
                          {st.gradeLevel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div
                            onClick={() => {
                              if (st.photoUrl && onOpenLightbox) {
                                onOpenLightbox(st.photoUrl, `${st.prefix}${st.firstName} ${st.lastName}`, `ชั้น ${st.gradeLevel} • เลขที่ ${st.rollNumber ?? (idx + 1)}`);
                              }
                            }}
                            className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center shadow-2xs ${st.photoUrl && onOpenLightbox ? 'cursor-pointer hover:opacity-85' : ''}`}
                            title={st.photoUrl ? 'คลิกเพื่อดูรูปภาพขนาดใหญ่' : 'รูปโปรไฟล์นักเรียน'}
                          >
                            {st.photoUrl ? (
                              <img src={st.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 text-xs">
                              {st.prefix}{st.firstName} {st.lastName}
                            </span>
                            {st.nickname && (
                              <span className="text-slate-400 font-normal text-[11px]">
                                ({st.nickname})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasEvaluated ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ประเมินแล้ว</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            <span>รอประเมิน</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isReadOnly ? (
                          hasEvaluated ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEvalModal(st)}
                              className="px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>ดูผลประเมิน</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 font-bold">-</span>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEvalModal(st)}
                            className={`px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                              hasEvaluated 
                                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{hasEvaluated ? 'แก้ไขประเมิน' : 'ประเมิน 8 ด้าน'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EVALUATE 8 CRITERIA & TEACHER COMMENT FOR A STUDENT */}
      {selectedStudentForEval && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-indigo-900 to-blue-900 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => {
                    if (selectedStudentForEval.photoUrl && onOpenLightbox) {
                      onOpenLightbox(selectedStudentForEval.photoUrl, `${selectedStudentForEval.prefix}${selectedStudentForEval.firstName} ${selectedStudentForEval.lastName}`, `ชั้น ${selectedStudentForEval.gradeLevel}`);
                    }
                  }}
                  className={`w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 border-white/30 bg-white/10 flex items-center justify-center shadow-xs ${selectedStudentForEval.photoUrl && onOpenLightbox ? 'cursor-pointer hover:opacity-85' : ''}`}
                  title={selectedStudentForEval.photoUrl ? 'คลิกเพื่อดูรูปภาพขนาดใหญ่' : 'รูปโปรไฟล์นักเรียน'}
                >
                  {selectedStudentForEval.photoUrl ? (
                    <img src={selectedStudentForEval.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-indigo-200" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold">ประเมินพฤติกรรมและความคิดเห็น (8 ด้าน)</h3>
                  <p className="text-indigo-200 text-xs mt-0.5">
                    นักเรียน: <span className="text-white font-bold">{selectedStudentForEval.prefix}{selectedStudentForEval.firstName} {selectedStudentForEval.lastName}</span> (ชั้น {selectedStudentForEval.gradeLevel}) | ภาคเรียนที่ {semester} ปีการศึกษา {academicYear}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudentForEval(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {!isReadOnly && (
                <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-2xl text-xs text-indigo-900 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-indigo-600 shrink-0" />
                    <p className="text-indigo-900 font-semibold">
                      ให้คะแนนรวดเร็ว:
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkSetAllScores(3)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>(3) All - ดีทั้งหมด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetAllScores(2)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>(2) All - พอใช้ทั้งหมด</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 8 CRITERIA ITEMS */}
              <div className="space-y-4">
                {EVALUATION_CRITERIA_ITEMS.map((item) => {
                  const currentScore = currentEvalDraft.scores[item.id as EvaluationCriteriaKey] ?? 3;

                  return (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:border-indigo-200 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {item.number}
                            </span>
                            <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                          </div>
                          <p className="text-slate-500 text-xs mt-1 ml-8">{item.desc}</p>
                        </div>

                        {/* Score selector pills 1, 2, 3 */}
                        <div className="flex items-center gap-2 ml-8 sm:ml-0 shrink-0">
                          {[
                            { val: 1, text: '1 - ปรับปรุง' },
                            { val: 2, text: '2 - พอใช้' },
                            { val: 3, text: '3 - ดี' }
                          ].map((opt) => {
                            const isSelected = currentScore === opt.val;
                            return (
                              <button
                                key={opt.val}
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => {
                                  if (isReadOnly) return;
                                  setCurrentEvalDraft(prev => ({
                                    ...prev,
                                    scores: {
                                      ...prev.scores,
                                      [item.id]: opt.val
                                    }
                                  }));
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                  isReadOnly ? 'cursor-default' : 'cursor-pointer'
                                } ${
                                  isSelected
                                    ? opt.val === 3 
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-105' 
                                      : opt.val === 2 
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm scale-105' 
                                        : 'bg-rose-600 text-white border-rose-600 shadow-sm scale-105'
                                    : 'bg-white text-slate-700 border-slate-200'
                                }`}
                              >
                                {opt.text}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TEACHER COMMENT INPUT, PAST HISTORY & PRESET CHIPS */}
              <div className="space-y-4 pt-2">
                {/* Past Comment History (Previous Semesters & Years) */}
                {!isReadOnly && studentPastEvaluations.length > 0 && (
                  <div className="space-y-2 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>📜 ประวัติความคิดเห็นจากภาคเรียนหรือปีที่ผ่านมา:</span>
                    </span>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {studentPastEvaluations.map((past, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                          <div>
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded mr-2 border border-indigo-100">
                              ปี {past.academicYear} / ภาค {past.semester}
                            </span>
                            <span className="text-slate-700">{past.teacherComment}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCurrentEvalDraft(prev => ({ ...prev, teacherComment: past.teacherComment }))}
                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg shrink-0 transition-all cursor-pointer border border-indigo-200"
                          >
                            นำมาใช้
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    ความคิดเห็นและข้อเสนอแนะของครูประจำชั้น
                  </label>
                  {!isReadOnly && (
                    <span className="text-[11px] text-slate-400">เลือกข้อความสำเร็จรูปด้านล่างเพื่อความรวดเร็ว</span>
                  )}
                </div>

                {/* Preset comment chips */}
                {!isReadOnly && (
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COMMENTS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentEvalDraft(prev => ({ ...prev, teacherComment: preset }));
                        }}
                        className="text-left text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer line-clamp-1 max-w-full"
                        title={preset}
                      >
                        💡 {preset}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  rows={3}
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                  value={isReadOnly ? (currentEvalDraft.teacherComment || '-') : currentEvalDraft.teacherComment}
                  onChange={(e) => {
                    if (isReadOnly) return;
                    setCurrentEvalDraft(prev => ({ ...prev, teacherComment: e.target.value }));
                  }}
                  placeholder="พิมพ์ความคิดเห็น พฤติกรรมเด่น หรือข้อควรพัฒนาเพิ่มเติมของนักเรียน..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs leading-relaxed disabled:opacity-90"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedStudentForEval(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                {isReadOnly ? 'ปิด' : 'ยกเลิก'}
              </button>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleSaveStudentEval}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการประเมิน</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

