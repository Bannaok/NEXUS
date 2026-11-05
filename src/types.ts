export type Role = 'developer' | 'admin' | 'member';

export interface HomeroomClassAssignment {
  gradeLevel: GradeLevel | string;
  room?: string;
}

export interface UserSession {
  id: string;
  username: string;
  prefix?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  position?: string;
  phone?: string; // เบอร์โทรติดต่อ
  assignedGrade?: GradeLevel | string;
  assignedRoom?: string; // ห้องประจำชั้น เช่น '1', '2', '3'
  assignedClasses?: HomeroomClassAssignment[]; // กรณีเป็นครูประจำชั้นหลายชั้น (เช่น 2-3 ชั้น)
  learningGroup?: string;
  avatarUrl?: string;
  schoolId?: string;
  schoolName?: string;
  isLoggedIn?: boolean;
}

export interface SchoolAdminAccount {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  schoolName: string;
  schoolCode?: string;
  affiliation?: string;
  directorName?: string;
  createdAt: string;
  isSuspended?: boolean;
  disableAssignments?: boolean;
  disableDocuments?: boolean;
  googleSheetId?: string;
  googleSheetUrl?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
}

export type GradeLevel = 
  | 'อ.1' | 'อ.2' | 'อ.3' 
  | 'ป.1' | 'ป.2' | 'ป.3' | 'ป.4' | 'ป.5' | 'ป.6' 
  | 'ม.1' | 'ม.2' | 'ม.3';

export type ParentsMaritalStatus = 
  | 'อยู่ด้วยกัน' 
  | 'แยกกันอยู่' 
  | 'หย่าร้าง' 
  | 'พ่อหรือแม่เสียชีวิต/สาบสูญ' 
  | 'แม่สมรสใหม่' 
  | 'พ่อสมรสใหม่' 
  | 'พ่อแม่ทอดทิ้ง' 
  | 'พ่อแม่หย่าร้าง' 
  | 'พ่อแม่เสีย' 
  | 'พ่อแม่ทิ้ง' 
  | 'อื่นๆ'
  | string;

export interface Student {
  id: string;
  rollNumber?: number; // เลขที่
  studentCode?: string; // รหัสนักเรียน (ไม่บังคับ)
  idCard?: string;
  citizenId?: string;
  prefix: string; // คำนำหน้า (บังคับ)
  firstName: string; // ชื่อจริง (บังคับ)
  lastName: string; // นามสกุล (บังคับ)
  nickname?: string; // ชื่อเล่น
  gender?: 'ชาย' | 'หญิง'; // เอาออกจากฟอร์ม (อิงจากคำนำหน้า)
  birthDate?: string; // YYYY-MM-DD (ไม่บังคับ)
  age?: number;
  religion?: string; // ศาสนา
  bloodGroup?: string; // หมู่เลือด (ไม่บังคับ)
  gradeLevel: GradeLevel; // ระดับชั้น (บังคับ)
  room?: string;
  chronicDisease?: string; // โรคประจำตัว / แพ้อาหาร / ยา
  address?: string; // ที่อยู่ปัจจุบันของนักเรียน

  // ข้อมูลบิดา
  fatherPrefix?: string; // คำนำหน้าบิดา
  fatherName?: string;
  fatherDeceased?: boolean; // เสียชีวิต
  fatherMissing?: boolean; // สาบสูญ
  fatherAge?: number;
  fatherOccupation?: string;
  fatherIncome?: number; // รายได้บิดา บาท/เดือน
  fatherEducation?: string; // การศึกษาสูงสุดของบิดา
  fatherPhone?: string;

  // ข้อมูลมารดา
  motherPrefix?: string; // คำนำหน้ามารดา
  motherName?: string;
  motherDeceased?: boolean; // เสียชีวิต
  motherMissing?: boolean; // สาบสูญ
  motherAge?: number;
  motherOccupation?: string;
  motherIncome?: number; // รายได้มารดา บาท/เดือน
  motherEducation?: string; // การศึกษาสูงสุดของมารดา
  motherPhone?: string;

  // สถานภาพของบิดา-มารดา
  parentsMaritalStatus?: ParentsMaritalStatus;
  parentsMaritalStatusOther?: string; // ถ้าระบุอื่นๆ

  // ข้อมูลผู้ปกครอง (สามารถคัดลอกจากพ่อหรือแม่ หรือกรอกเองได้)
  guardianPrefix?: string; // คำนำหน้าผู้ปกครอง
  guardianRelation?: string; // บิดา, มารดา, ปู่/ย่า, ตา/ยาย, ลุง/ป้า/น้า/อา, อื่นๆ
  guardianRelationOther?: string; // ถ้าระบุอื่นๆ
  guardianName?: string;
  guardianAge?: number;
  guardianOccupation?: string;
  guardianIncome?: number; // รายได้ผู้ปกครอง บาท/เดือน
  guardianEducation?: string; // การศึกษาสูงสุดของผู้ปกครอง
  guardianPhone?: string;
  guardianAddress?: string; // ที่อยู่ปัจจุบันผู้ปกครอง

  // ข้อมูลพี่น้องและการศึกษา
  birthOrder?: number; // เป็นบุตรคนที่
  isOnlyChild?: boolean; // เป็นบุตรคนเดียว
  totalSiblings?: number; // จากจำนวนพี่น้องทั้งหมด
  brothersCount?: number; // พี่ชาย/น้องชายกี่คน
  sistersCount?: number; // พี่สาว/น้องสาวกี่คน
  hasOlderHalfSiblings?: boolean; // มีพี่ต่างบิดา-มารดา
  olderHalfSiblingsCount?: number; // จำนวนพี่ต่างบิดา-มารดา (คน)
  hasYoungerHalfSiblings?: boolean; // มีน้องต่างบิดา-มารดา
  youngerHalfSiblingsCount?: number; // จำนวนน้องต่างบิดา-มารดา (คน)
  hasHalfSiblings?: boolean; // มีพี่น้องต่างบิดา-มารดา (backward compatibility)
  halfSiblingsCount?: number; // จำนวนพี่น้องต่างบิดา-มารดา
  studyingSiblingsCount?: number; // พี่น้องที่กำลังศึกษาอยู่ (คน)

  // ข้อมูลที่อยู่อาศัย & ครัวเรือน
  housingStatus?: 'บ้านตัวเอง' | 'บ้านเช่า' | 'อาศัยบ้านคนอื่น' | 'อื่นๆ' | string;
  rentAmount?: number; // จำนวนเงินที่จ่ายบ้านเช่า (บาท/เดือน) เมื่อเลือกบ้านเช่า
  housingStatusOther?: string; // ระบุสถานะที่อยู่อาศัยเพิ่มเติม เมื่อเลือกอื่นๆ
  houseType?: 'บ้านชั้นเดียว' | 'บ้านสองชั้น' | 'ทาวน์เฮ้าส์' | 'อื่นๆ' | string;
  houseTypeOther?: string; // ระบุลักษณะของบ้านเพิ่มเติม เมื่อเลือกอื่นๆ
  householdBurden?: string[]; // ครัวเรือนมีภาระพึ่งพิง
  livingWith?: string; // นักเรียนพักอาศัยอยู่กับ: บิดามารดา, บิดา, มารดา, ปู่/ย่า/ตา/ยาย, ญาติ, อื่นๆ
  livingWithOther?: string; // ระบุเมื่อเลือกอื่นๆ
  travelMethod?: string; // การเดินทางมาโรงเรียน: เดิน, จักรยาน, รถโรงเรียน, จักรยานยนต์ส่วนตัว, รถส่วนตัว, รถโดยสารประจำทาง, อื่นๆ
  travelMethodOther?: string; // ระบุเมื่อเลือกอื่นๆ
  distanceToSchool?: string | number; // ระยะทางจากบ้านถึงโรงเรียน
  travelTimeToSchool?: string | number; // ระยะเวลาในการเดินทางจากบ้านถึงโรงเรียน

  parentOccupation?: string;
  dailyAllowance?: number; // บาท/วัน
  photoUrl?: string;
  status: 'กำลังศึกษา' | 'ย้าย' | 'จบการศึกษา';
}

export interface Personnel {
  id: string;
  prefix: string;
  firstName: string;
  lastName: string;
  personnelType?: string; // ผู้อำนวยการ, รองผู้อำนวยการ, ครู, บุคลากรอื่น
  department?: string; // วิชาการ, บริหารทั่วไป, งบประมาณ, บริหารงานบุคคล, อื่นๆ
  customDepartment?: string;
  position: string;
  advisorGrade?: string; // ครูที่ปรึกษาประจำชั้น เช่น ป.1, ป.2, ฯลฯ
  advisorRoom?: string; // ห้องที่ปรึกษาประจำชั้น เช่น '1', '2', '3'
  advisorClasses?: HomeroomClassAssignment[]; // กรณีเป็นที่ปรึกษาหลายชั้น
  birthDate: string;
  employmentDate: string;
  retirementDate: string;
  major: string;
  degree: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  photoUrl?: string;
  signatureUrl?: string; // ลายเซ็นสำหรับบัตรนักเรียนและเอกสารราชการ
}

export interface SchoolInfo {
  schoolName: string;
  schoolCode: string;
  affiliation: string; // สังกัด เช่น สพป. เขต 1
  history: string;
  vision: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  directorName: string;
  logoUrl?: string;
  academicYear: string;
  semester: string;
  leaveRound?: '1' | '2'; // รอบการลา ครั้งที่ 1 (1 ตุลาคม – 31 มีนาคม) หรือ ครั้งที่ 2 (1 เมษายน – 30 กันยายน)
  leaveRoundFiscalYear?: string; // ปีงบประมาณของรอบการลา เช่น '2569'
  dutyReportGrades?: string[]; // ระดับชั้นที่แสดงในตารางสถิตินักเรียนรายงานครูเวร (อ.1 - ม.3)
  customFields?: { label: string; value: string }[];
  googleSheetId?: string;
  googleSheetUrl?: string;
  driveFolderId?: string;
}

export interface DailyTracking {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  gradeLevel: GradeLevel;
  weight: number; // kg
  height: number; // cm
  bmi: number;
  bmiStatus?: 'ผอม' | 'สมส่วน' | 'ท้วม' | 'เริ่มอ้วน' | 'อ้วน';
  milkStatus?: 'ดื่มครบ' | 'ไม่ได้ดื่ม' | 'แพ้นม';
  toothBrushStatus?: 'แปรงฟันแล้ว' | 'ยังไม่ได้แปรง';
  milkTeethRecorded?: boolean;
}

export interface BehaviorScores {
  learning: number; // 1. การเรียน (1=ปรับปรุง, 2=พอใช้, 3=ดี)
  attention: number; // 2. ความเอาใจใส่ในการเรียน (1, 2, 3)
  responsibility: number; // 3. ความรับผิดชอบ (1, 2, 3)
  freeTimeUsage: number; // 4. การใช้เวลาว่างให้เป็นประโยชน์ (1, 2, 3)
  relationships: number; // 5. ความสัมพันธ์กับครู/เพื่อน/ครอบครัว (1, 2, 3)
  emotionalControl: number; // 6. การควบคุมอารมณ์ตนเอง (1, 2, 3)
  habitsPersonality: number; // 7. อุปนิสัยและบุคลิกภาพ (1, 2, 3)
  health: number; // 8. สุขภาพ (1, 2, 3)
}

export interface StudentBehaviorEvaluation {
  id: string;
  studentId: string;
  sessionId?: string;
  date?: string;
  academicYear?: string;
  semester?: string;
  scores: BehaviorScores;
  teacherComment: string; // ช่องกรอกความคิดเห็นของครู
  updatedAt?: string;
}

export interface CommentSession {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  academicYear: string;
  semester: string;
  createdAt: string;
}

export const EVALUATION_CRITERIA_ITEMS = [
  { id: 'learning', number: 1, title: 'การเรียน', desc: 'ความรู้ความเข้าใจและทักษะการเรียนรู้' },
  { id: 'attention', number: 2, title: 'ความเอาใจใส่ในการเรียน', desc: 'ความตั้งใจ สนใจ และมุ่งมั่นในการเรียน' },
  { id: 'responsibility', number: 3, title: 'ความรับผิดชอบ', desc: 'การส่งงานตรงเวลาและปฏิบัติตามหน้าที่' },
  { id: 'freeTimeUsage', number: 4, title: 'การใช้เวลาว่างให้เป็นประโยชน์', desc: 'อ่านหนังสือ กิจกรรมสร้างสรรค์' },
  { id: 'relationships', number: 5, title: 'ความสัมพันธ์กับครู/เพื่อน/ครอบครัว', desc: 'การมีปฏิสัมพันธ์ที่ดี สุภาพ ให้เกียรติผู้อื่น' },
  { id: 'emotionalControl', number: 6, title: 'การควบคุมอารมณ์ตนเอง', desc: 'ความเยือกเย็น การปรับตัว และการจัดการอารมณ์' },
  { id: 'habitsPersonality', number: 7, title: 'อุปนิสัยและบุคลิกภาพ', desc: 'ความมีวินัย กิริยามารยาท ความเรียบร้อย' },
  { id: 'health', number: 8, title: 'สุขภาพ', desc: 'สุขอนามัย ความแข็งแรง และความสมบูรณ์ของร่างกาย' }
] as const;

export type EvaluationCriteriaKey = typeof EVALUATION_CRITERIA_ITEMS[number]['id'];

export interface AssignmentItem {
  id: string;
  name: string; // e.g., 'งานที่ 1: แบบฝึกหัด'
  maxScore?: number; // default 5
  unitNumber?: number; // หน่วยการเรียนรู้ เช่น 1, 2, 3
}

export interface LearningUnitDetail {
  unitNumber: number;
  name?: string; // ชื่อหน่วยการเรียนรู้ (ไม่บังคับ)
  score?: number; // คะแนนเก็บของหน่วย
  standard?: string; // มาตรฐานการเรียนรู้
  indicator?: string; // ตัวชี้วัด
}

export interface RubricLevel {
  level: number; // e.g. 1, 2, 3
  label: string; // e.g. 'ควรเสริม', 'ได้บางครั้ง', 'ปฏิบัติได้'
}

export interface KindergartenCompetency {
  id: string;
  title: string; // ชื่อสมรรถนะ (ไม่บังคับพิมพ์) ตามหลักสูตรการศึกษาปฐมวัย พ.ศ. 2568
  elements: string[]; // องค์ประกอบ/ประเด็น 1, 2, 3... ที่อยู่ภายใต้สมรรถนะนี้
}

export interface Subject {
  id: string;
  code: string; // e.g., ว11101
  name: string;
  gradeLevel: GradeLevel;
  room?: string; // ห้องเรียน เช่น '1', '2', '3' (ค่าเริ่มต้น '1')
  hoursPerWeek: number;
  semester: '1' | '2';
  totalScore: number; // 100
  courseworkScore: number; // e.g., 70
  examScore: number; // e.g., 30
  teacherId?: string;
  teacherName?: string;
  assignmentItems?: AssignmentItem[];
  learningUnits?: number[]; // หน่วยการเรียนรู้ เช่น [1, 2, 3] แล้วแต่วิชา
  learningUnitDetails?: LearningUnitDetail[]; // รายละเอียดชื่อและคะแนนเก็บแต่ละหน่วย
  academicYear?: string; // ปีการศึกษา เช่น '2568', '2569'
  teachingSchedule?: Record<number, number>; // dayOfWeek (1=จันทร์, 2=อังคาร, 3=พุธ, 4=พฤหัสบดี, 5=ศุกร์) -> hours (default 1)
  subtopics?: string[]; // สำหรับ อ.1, อ.2, อ.3 สมรรถนะ/หน้าประเมินด้านล่างชื่อวิชา
  kindergartenCompetencies?: KindergartenCompetency[]; // สำหรับ อ.1, อ.2, อ.3 โครงสร้างสมรรถนะ + องค์ประกอบ/ประเด็น (หลักสูตรปฐมวัย พ.ศ. 2568)
  hasKindergartenCompetency?: boolean; // สำหรับ อ.1, อ.2, อ.3 เปิด/ปิด ช่องสมรรถนะ (true = มีสมรรถนะ+องค์ประกอบ/ประเด็น, false = มีเฉพาะองค์ประกอบ/ประเด็นของด้านความสามารถ)
  rubricLevels?: RubricLevel[]; // สำหรับ อ.1, อ.2, อ.3 ระดับคะแนนคุณภาพ (เช่น 1: ควรเสริม, 2: ได้บางครั้ง, 3: ปฏิบัติได้)
  rubricMaxLevel?: number; // จำนวนระดับคะแนนคุณภาพ (ค่าเริ่มต้น 3)
  hasCustomAssignments?: boolean;
  isActivity?: boolean; // กิจกรรมพัฒนาผู้เรียน (ประเมินผล ผ่าน / ไม่ผ่าน)
  sortOrder?: number; // ลำดับการจัดเรียงรายวิชาที่ Admin กำหนดด้วยการลากเลื่อน
}

export interface GradeRecord {
  id: string;
  studentId: string;
  studentName: string;
  gradeLevel: GradeLevel;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semester: '1' | '2';
  academicYear: string;
  assignmentScores?: Record<string, number>; // assignmentId -> score 0-5
  courseworkScore: number;
  examScore: number;
  totalScore: number;
  gradeGpa: number; // 0, 1, 1.5, 2, 2.5, 3, 3.5, 4
  readingWritingScore: number; // 0=ไม่ผ่าน, 1=ผ่าน, 2=ดี, 3=ดีเยี่ยม
  desiredCharacteristicsScore: number; // 0-3
  competencyScore: number; // 0-3
  activityResult?: 'ผ่าน' | 'ไม่ผ่าน' | ''; // ผลการประเมินกิจกรรม (ผ่าน / ไม่ผ่าน)
}

export interface SchoolDayItem {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // จันทร์, อังคาร, พุธ, พฤหัสบดี, ศุกร์, เสาร์, อาทิตย์
  isHoliday: boolean; // ถ้าคลิกเป็นวันหยุด ลำดับจะถูกลบ/ข้าม
  note?: string; // หมายเหตุ เช่น วันหยุดนักขัตฤกษ์ หรือกิจกรรม
}

export interface AttendanceDayConfig {
  academicYear: string;
  semester: '1' | '2';
  startDate: string;
  endDate: string;
  targetDays: number; // 100 school days
  schoolDays?: SchoolDayItem[];
}

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'sick';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  gradeLevel: GradeLevel;
  status: AttendanceStatus;
  note?: string;
  semester?: '1' | '2';
  academicYear?: string;
}

export interface SavingsRecord {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  gradeLevel: GradeLevel;
  type: 'deposit' | 'withdrawal';
  amount: number;
  balanceAfter: number;
  originalAmount?: number;
  deductedAmount?: number;
  deductedFromDeposits?: boolean;
  deductionBreakdown?: { depositId: string; date: string; amount: number }[];
  notes?: string;
  semester?: '1' | '2';
  academicYear?: string;
}

export interface TaskSubmission {
  id?: string;
  memberId: string;
  memberName: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  submittedAt: string;
  driveFileId?: string;
  localHostedUrl?: string;
  downloadUrl?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  type?: 'assignment' | 'announcement';
  academicYear?: string;
  assignedTo?: string;
  priority?: 'urgent' | 'high' | 'normal';
  dueDate: string;
  isCompleted?: boolean;
  completedAt?: string;
  createdBy: string;
  createdAt?: string;
  attachmentUrl?: string;
  submittedFileUrl?: string;
  submittedFileName?: string;
  submittedFileData?: string;
  submittedFileSize?: string;
  submittedBy?: string;
  submittedByName?: string;
  submittedAt?: string;
  submissions?: TaskSubmission[];
  deletedSubmissionsMap?: Record<string, string>;
  isManualCompleted?: boolean;
  order?: number;
  calendarEventId?: string;
  driveFileId?: string;
}

export interface DocumentItem {
  id: string;
  docNumber: string;
  title: string;
  category?: string;
  docType?: 'document' | 'order';
  academicYear?: string;
  activityName?: string;
  folderName?: string;
  date: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: string;
  fileData?: string;
  uploadedBy: string;
  order?: number;
  driveFileId?: string;
}

export interface RecommendedWebsite {
  id: string;
  title: string;
  url: string;
  logoUrl?: string;
  category: string;
  description: string;
  isOfficial?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  type: 'academic' | 'holiday' | 'exam' | 'activity' | 'meeting';
  color?: string;
  announcement?: string; // แจ้งอะไร
  taskDue?: string; // ให้ส่งงานอะไร
  taskPriority?: 'urgent' | 'high' | 'normal';
  linkedTaskIds?: string[];
}

export interface MemberAccount {
  id: string;
  username: string;
  password?: string;
  prefix?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  phone?: string; // เบอร์โทรติดต่อ
  gradeLevel?: GradeLevel;
  room?: string; // ห้องประจำชั้น เช่น '1', '2', '3'
  assignedClasses?: HomeroomClassAssignment[]; // กรณีเป็นครูประจำชั้นหลายชั้น (เช่น 2-3 ชั้น)
  position: string;
  learningGroup?: string;
  avatarUrl?: string;
  isSuspended?: boolean; // ระงับการใช้งาน
  schoolId?: string; // รหัสโรงเรียน/Admin ที่สังกัด
  schoolName?: string; // ชื่อโรงเรียนที่สังกัด
}

export interface GoogleConfig {
  webAppUrl: string;
  driveFolderId: string;
  isConnected: boolean;
  lastSynced?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

export interface CustomButton {
  id: string;
  label: string;
  actionUrl: string;
  category?: string;
  icon?: string;
  color?: string; // indigo, emerald, blue, amber, rose, purple
  targetRole?: 'all' | 'admin' | 'member';
  openInNewTab?: boolean;
  order?: number;
  schoolId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  targetRole?: 'all' | 'admin' | 'member';
  contentMarkdown?: string;
  externalUrl?: string;
  buttonLinks?: Array<{ label: string; url: string; color?: string }>;
  schoolId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LeaveRequestRecord {
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

