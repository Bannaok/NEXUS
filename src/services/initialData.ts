import { 
  Student, 
  Personnel, 
  SchoolInfo, 
  DailyTracking, 
  Subject, 
  GradeRecord, 
  AttendanceRecord, 
  SavingsRecord, 
  TaskItem, 
  DocumentItem, 
  RecommendedWebsite, 
  CalendarEvent, 
  MemberAccount,
  AttendanceDayConfig,
  SchoolAdminAccount
} from '../types';

export const INITIAL_ADMINS: SchoolAdminAccount[] = [
  {
    id: "admin-school-01",
    username: "Admin",
    password: "123456",
    fullName: "ผู้ดูแลระบบ โรงเรียนอนุบาลเทศบาลดอนวิทยา",
    schoolName: "โรงเรียนอนุบาลเทศบาลดอนวิทยา",
    schoolCode: "1050230045",
    affiliation: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษา (สพป.)",
    directorName: "ดร.วิโรจน์ เจริญรัตนกุล",
    createdAt: "2026-01-01",
    googleSheetId: "1mVJl2FSHiJmQlOR8t-7h1Z4wXfbMWepUU_Qzkd1FSAM",
    googleSheetUrl: "https://docs.google.com/spreadsheets/d/1mVJl2FSHiJmQlOR8t-7h1Z4wXfbMWepUU_Qzkd1FSAM/edit",
    driveFolderId: "11IXjrNHXyGpf3A-7ZT38t8B_jXtoFGS9"
  },
  {
    id: "admin-school-02",
    username: "Admin_Watphra",
    password: "123456",
    fullName: "ผู้ดูแลระบบ โรงเรียนวัดพระปฐมเจดีย์",
    schoolName: "โรงเรียนวัดพระปฐมเจดีย์",
    schoolCode: "1050230078",
    affiliation: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษา (สพป.)",
    directorName: "นางสาวมณีรัตน์ วงศ์สุวรรณ",
    createdAt: "2026-01-10"
  },
  {
    id: "admin-school-03",
    username: "Admin_Bandon",
    password: "123456",
    fullName: "ผู้ดูแลระบบ โรงเรียนบ้านดอนขามพิทยา",
    schoolName: "โรงเรียนบ้านดอนขามพิทยา",
    schoolCode: "1050230099",
    affiliation: "สำนักงานเขตพื้นที่การศึกษามัธยมศึกษา (สพม.)",
    directorName: "นายชัยวัฒน์ เกียรติสกุล",
    createdAt: "2026-01-15"
  }
];

export const INITIAL_SCHOOL_INFO: SchoolInfo = {
  schoolName: "โรงเรียนอนุบาลเทศบาลดอนวิทยา",
  schoolCode: "1050230045",
  affiliation: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษา (สพป.) / องค์กรปกครองส่วนท้องถิ่น",
  history: "โรงเรียนอนุบาลเทศบาลดอนวิทยา ก่อตั้งขึ้นเมื่อปี พ.ศ. 2515 เพื่อจัดการศึกษาระดับปฐมวัยถึงมัธยมศึกษาตอนต้น มุ่งเน้นพัฒนาผู้เรียนให้มีคุณธรรม นำความรู้ สู่มาตรฐานสากล น้อมนำหลักปรัชญาของเศรษฐกิจพอเพียง",
  vision: "จัดการศึกษาอย่างมีคุณภาพ ผู้เรียนมีคุณธรรม จริยธรรม ก้าวทันเทคโนโลยี รักษ์ความเป็นไทย ใส่ใจสิ่งแวดล้อม",
  address: "เลขที่ 128 หมู่ที่ 4 ถนนพัฒนาการศึกษา ตำบลดอน อำเภอเมือง จังหวัดนครปฐม",
  subdistrict: "ดอน",
  district: "เมือง",
  province: "นครปฐม",
  postalCode: "73000",
  phone: "034-251234",
  email: "donwittaya.school@ac.th",
  directorName: "ดร.วิโรจน์ เจริญรัตนกุล",
  logoUrl: "/nexus-logo.png",
  academicYear: "2569",
  semester: "1",
  customFields: [
    { label: "สีประจำโรงเรียน", value: "ฟ้า - ขาว (Blue - White)" },
    { label: "คำขวัญโรงเรียน", value: "วินัยดี มีวิชา กีฬาเด่น เน้นคุณธรรม" },
    { label: "ต้นไม้ประจำโรงเรียน", value: "ต้นราชพฤกษ์" }
  ],
  googleSheetId: "1mVJl2FSHiJmQlOR8t-7h1Z4wXfbMWepUU_Qzkd1FSAM",
  googleSheetUrl: "https://docs.google.com/spreadsheets/d/1mVJl2FSHiJmQlOR8t-7h1Z4wXfbMWepUU_Qzkd1FSAM/edit",
  driveFolderId: "11IXjrNHXyGpf3A-7ZT38t8B_jXtoFGS9"
};

export const INITIAL_MEMBERS: MemberAccount[] = [
  {
    id: "mem-admin",
    username: "Admin",
    password: "", // Handled by default '123456'
    fullName: "ผู้ดูแลระบบโรงเรียน (System Admin)",
    role: "admin",
    position: "หัวหน้างานวิชาการและธุรการ",
    schoolId: "admin-school-01",
    schoolName: "โรงเรียนอนุบาลเทศบาลดอนวิทยา"
  },
  {
    id: "mem-01",
    username: "krusomsri",
    password: "123",
    fullName: "นางสาวสมศรี ใจดีงาม",
    role: "member",
    gradeLevel: "ป.1",
    position: "ครูประจำชั้น ป.1 / หัวหน้ากลุ่มสาระภาษาไทย",
    schoolId: "admin-school-01",
    schoolName: "โรงเรียนอนุบาลเทศบาลดอนวิทยา"
  },
  {
    id: "mem-02",
    username: "kruwichai",
    password: "123",
    fullName: "นายวิชัย สุวรรณมาลา",
    role: "member",
    gradeLevel: "ป.2",
    position: "ครูประจำชั้น ป.2 / ครูผู้สอนวิทยาศาสตร์",
    schoolId: "admin-school-01",
    schoolName: "โรงเรียนอนุบาลเทศบาลดอนวิทยา"
  },
  {
    id: "mem-03",
    username: "kruaree",
    password: "123",
    fullName: "นางอารีย์ รักความรู้",
    role: "member",
    gradeLevel: "อ.1",
    position: "ครูปฐมวัย อนุบาล 1",
    schoolId: "admin-school-01",
    schoolName: "โรงเรียนอนุบาลเทศบาลดอนวิทยา"
  },
  {
    id: "mem-04",
    username: "krukesorn",
    password: "123",
    fullName: "นางเกสร เพชรบูรพา",
    role: "member",
    gradeLevel: "ป.3",
    position: "ครูประจำชั้น ป.3",
    schoolId: "admin-school-02",
    schoolName: "โรงเรียนวัดพระปฐมเจดีย์"
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: "std-001",
    rollNumber: 1,
    studentCode: "69001",
    prefix: "เด็กชาย",
    firstName: "กิตติพงษ์",
    lastName: "เจริญสุข",
    nickname: "น้องกิต",
    gender: "ชาย",
    birthDate: "2019-05-12",
    age: 7,
    gradeLevel: "ป.1",
    room: "1",
    chronicDisease: "ไม่มี",
    fatherName: "นายสมชาย เจริญสุข",
    fatherDeceased: false,
    fatherMissing: false,
    fatherAge: 38,
    fatherOccupation: "ค้าขาย",
    fatherIncome: 18000,
    fatherPhone: "081-2345678",
    motherName: "นางสมหญิง เจริญสุข",
    motherDeceased: false,
    motherMissing: false,
    motherAge: 35,
    motherOccupation: "ค้าขาย",
    motherIncome: 15000,
    motherPhone: "082-3456789",
    parentsMaritalStatus: "อยู่ด้วยกัน",
    guardianRelation: "บิดา",
    guardianName: "นายสมชาย เจริญสุข",
    guardianAge: 38,
    guardianOccupation: "ค้าขาย",
    guardianIncome: 18000,
    guardianPhone: "081-2345678",
    guardianAddress: "24/1 ม.4 ต.ดอน อ.เมือง จ.นครปฐม",
    birthOrder: 1,
    totalSiblings: 2,
    brothersCount: 0,
    sistersCount: 1,
    hasOlderHalfSiblings: false,
    olderHalfSiblingsCount: 0,
    hasYoungerHalfSiblings: false,
    youngerHalfSiblingsCount: 0,
    hasHalfSiblings: false,
    halfSiblingsCount: 0,
    studyingSiblingsCount: 1,
    housingStatus: "บ้านตัวเอง",
    houseType: "บ้านชั้นเดียว",
    householdBurden: ["ครัวเรือนไม่มีภาระพึ่งพิง"],
    livingWith: "บิดามารดา",
    travelMethod: "รถจักรยานยนต์",
    parentOccupation: "ค้าขาย",
    dailyAllowance: 40,
    address: "24/1 ม.4 ต.ดอน อ.เมือง จ.นครปฐม",
    photoUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=80",
    status: "กำลังศึกษา"
  },
  {
    id: "std-002",
    rollNumber: 2,
    studentCode: "69002",
    prefix: "เด็กหญิง",
    firstName: "พิมพ์ชนก",
    lastName: "แก้วมณี",
    nickname: "น้องพิม",
    gender: "หญิง",
    birthDate: "2019-08-20",
    age: 7,
    gradeLevel: "ป.1",
    room: "1",
    chronicDisease: "แพ้อาหารทะเล (กุ้ง)",
    fatherName: "นายประเสริฐ แก้วมณี",
    fatherDeceased: false,
    fatherMissing: false,
    fatherAge: 42,
    fatherOccupation: "รับราชการ",
    fatherIncome: 28000,
    fatherPhone: "083-4567890",
    motherName: "นางรัชนี แก้วมณี",
    motherDeceased: false,
    motherMissing: false,
    motherAge: 40,
    motherOccupation: "พนักงานรัฐวิสาหกิจ",
    motherIncome: 25000,
    motherPhone: "084-5678901",
    parentsMaritalStatus: "อยู่ด้วยกัน",
    guardianRelation: "มารดา",
    guardianName: "นางรัชนี แก้วมณี",
    guardianAge: 40,
    guardianOccupation: "พนักงานรัฐวิสาหกิจ",
    guardianIncome: 25000,
    guardianPhone: "084-5678901",
    guardianAddress: "88/3 ม.2 ต.ดอน อ.เมือง จ.นครปฐม",
    birthOrder: 2,
    totalSiblings: 2,
    brothersCount: 1,
    sistersCount: 0,
    hasOlderHalfSiblings: false,
    olderHalfSiblingsCount: 0,
    hasYoungerHalfSiblings: false,
    youngerHalfSiblingsCount: 0,
    hasHalfSiblings: false,
    halfSiblingsCount: 0,
    studyingSiblingsCount: 2,
    housingStatus: "บ้านตัวเอง",
    houseType: "บ้านสองชั้น",
    householdBurden: ["มีผู้สูงอายุ (มากกว่า 60 ปี)"],
    livingWith: "บิดามารดา",
    travelMethod: "รถยนต์ส่วนบุคคล",
    parentOccupation: "รับราชการ",
    dailyAllowance: 50,
    address: "88/3 ม.2 ต.ดอน อ.เมือง จ.นครปฐม",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    status: "กำลังศึกษา"
  },
  {
    id: "std-003",
    rollNumber: 3,
    studentCode: "69003",
    prefix: "เด็กชาย",
    firstName: "ธนวัฒน์",
    lastName: "ปัญญาวงศ์",
    nickname: "น้องท็อป",
    gender: "ชาย",
    birthDate: "2019-02-14",
    age: 7,
    gradeLevel: "ป.1",
    room: "1",
    chronicDisease: "ไม่มี",
    fatherName: "นายเอกชัย ปัญญาวงศ์",
    fatherDeceased: false,
    fatherMissing: false,
    fatherAge: 45,
    fatherOccupation: "เกษตรกรรม",
    fatherIncome: 12000,
    fatherPhone: "085-6789012",
    motherName: "นางมาลี ปัญญาวงศ์",
    motherDeceased: false,
    motherMissing: false,
    motherAge: 43,
    motherOccupation: "เกษตรกรรม",
    motherIncome: 10000,
    motherPhone: "086-7890123",
    parentsMaritalStatus: "อยู่ด้วยกัน",
    guardianRelation: "บิดา",
    guardianName: "นายเอกชัย ปัญญาวงศ์",
    guardianAge: 45,
    guardianOccupation: "เกษตรกรรม",
    guardianIncome: 12000,
    guardianPhone: "085-6789012",
    guardianAddress: "15 ม.1 ต.บ่อพลับ อ.เมือง จ.นครปฐม",
    birthOrder: 1,
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
    housingStatus: "บ้านตัวเอง",
    houseType: "บ้านชั้นเดียว",
    householdBurden: ["ครัวเรือนไม่มีภาระพึ่งพิง"],
    livingWith: "บิดามารดา",
    travelMethod: "เดินเท้า",
    parentOccupation: "เกษตรกรรม",
    dailyAllowance: 30,
    address: "15 ม.1 ต.บ่อพลับ อ.เมือง จ.นครปฐม",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
    status: "กำลังศึกษา"
  },
  {
    id: "std-004",
    rollNumber: 1,
    studentCode: "69004",
    prefix: "เด็กหญิง",
    firstName: "ณัฐธิดา",
    lastName: "ศิริวัฒนา",
    nickname: "น้องน้ำ",
    gender: "หญิง",
    birthDate: "2018-11-03",
    age: 8,
    gradeLevel: "ป.2",
    room: "1",
    chronicDisease: "ไม่มี",
    fatherName: "นายธีระ ศิริวัฒนา",
    fatherDeceased: true,
    fatherMissing: false,
    motherName: "นางวรรณา ศิริวัฒนา",
    motherDeceased: false,
    motherMissing: false,
    motherAge: 39,
    motherOccupation: "พนักงานบริษัท",
    motherIncome: 22000,
    motherPhone: "089-1122334",
    parentsMaritalStatus: "แม่สมรสใหม่",
    guardianRelation: "ตา/ยาย",
    guardianName: "นายสมศักดิ์ วงศ์สว่าง",
    guardianAge: 65,
    guardianOccupation: "ข้าราชการบำนาญ",
    guardianIncome: 16000,
    guardianPhone: "086-9988776",
    guardianAddress: "102/5 หมู่ 6 ถ.มาลัยแมน อ.เมือง จ.นครปฐม",
    birthOrder: 1,
    totalSiblings: 2,
    brothersCount: 0,
    sistersCount: 1,
    hasOlderHalfSiblings: false,
    olderHalfSiblingsCount: 0,
    hasYoungerHalfSiblings: true,
    youngerHalfSiblingsCount: 1,
    hasHalfSiblings: true,
    halfSiblingsCount: 1,
    studyingSiblingsCount: 2,
    housingStatus: "บ้านเช่า",
    rentAmount: 3500,
    houseType: "ทาวน์เฮ้าส์",
    householdBurden: ["มีผู้สูงอายุ (มากกว่า 60 ปี)"],
    livingWith: "ปู่/ย่า/ตา/ยาย",
    travelMethod: "รถรับส่งนักเรียน",
    parentOccupation: "พนักงานบริษัท",
    dailyAllowance: 45,
    address: "102/5 หมู่ 6 ถ.มาลัยแมน อ.เมือง จ.นครปฐม",
    photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80",
    status: "กำลังศึกษา"
  },
  {
    id: "std-005",
    rollNumber: 2,
    studentCode: "69005",
    prefix: "เด็กชาย",
    firstName: "วรภัทร",
    lastName: "โชคอนันต์",
    nickname: "น้องภัทร",
    gender: "ชาย",
    birthDate: "2018-04-18",
    age: 8,
    gradeLevel: "ป.2",
    room: "1",
    chronicDisease: "หอบหืด",
    fatherName: "นายเกรียงไกร โชคอนันต์",
    fatherDeceased: false,
    fatherMissing: false,
    fatherAge: 44,
    fatherOccupation: "ธุรกิจส่วนตัว",
    fatherIncome: 45000,
    fatherPhone: "081-9988771",
    motherName: "นางสุภาพร โชคอนันต์",
    motherDeceased: false,
    motherMissing: true,
    parentsMaritalStatus: "พ่อแม่หย่าร้าง",
    guardianRelation: "บิดา",
    guardianName: "นายเกรียงไกร โชคอนันต์",
    guardianAge: 44,
    guardianOccupation: "ธุรกิจส่วนตัว",
    guardianIncome: 45000,
    guardianPhone: "081-9988771",
    birthOrder: 2,
    totalSiblings: 3,
    hasHalfSiblings: false,
    halfSiblingsCount: 0,
    studyingSiblingsCount: 2,
    housingStatus: "บ้านตัวเอง",
    houseType: "บ้านตึกชั้นเดียว",
    householdBurden: ["เป็นบิดา/มารดาเลี้ยงเดี่ยว"],
    livingWith: "บิดา",
    travelMethod: "รถยนต์ส่วนบุคคล",
    parentOccupation: "ธุรกิจส่วนตัว",
    dailyAllowance: 60,
    address: "56/7 ต.พระปฐมเจดีย์ อ.เมือง จ.นครปฐม",
    photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80",
    status: "กำลังศึกษา"
  },
  {
    id: "std-006",
    rollNumber: 1,
    studentCode: "69006",
    prefix: "เด็กชาย",
    firstName: "ภูวดล",
    lastName: "สิทธิพงษ์",
    gender: "ชาย",
    birthDate: "2021-09-09",
    age: 5,
    gradeLevel: "อ.1",
    room: "1",
    fatherName: "นายวิทวัส สิทธิพงษ์",
    motherName: "นางกานดา สิทธิพงษ์",
    parentOccupation: "รับจ้างทั่วไป",
    dailyAllowance: 20,
    address: "9 ม.4 ต.ดอน อ.เมือง จ.นครปฐม",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
    status: "กำลังศึกษา"
  },
  {
    id: "std-007",
    rollNumber: 2,
    studentCode: "69007",
    prefix: "เด็กหญิง",
    firstName: "กัญญาณัฐ",
    lastName: "ทองใบ",
    gender: "หญิง",
    birthDate: "2021-03-25",
    age: 5,
    gradeLevel: "อ.1",
    room: "1",
    fatherName: "นายบุญเลิศ ทองใบ",
    motherName: "นางมณี ทองใบ",
    parentOccupation: "เกษตรกร",
    dailyAllowance: 20,
    address: "41 ม.3 ต.ดอน อ.เมือง จ.นครปฐม",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80",
    status: "กำลังศึกษา"
  },
  {
    id: "std-008",
    rollNumber: 1,
    studentCode: "69008",
    prefix: "เด็กชาย",
    firstName: "ชลธาร",
    lastName: "รักษ์ถิ่น",
    gender: "ชาย",
    birthDate: "2014-06-11",
    age: 12,
    gradeLevel: "ม.1",
    room: "1",
    fatherName: "นายชาญชัย รักษ์ถิ่น",
    motherName: "นางอรสา รักษ์ถิ่น",
    parentOccupation: "รับราชการครู",
    dailyAllowance: 70,
    address: "333/1 ถ.เทศา ต.พระปฐมเจดีย์ จ.นครปฐม",
    photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80",
    status: "กำลังศึกษา"
  }
];

export const INITIAL_PERSONNEL: Personnel[] = [
  {
    id: "prs-001",
    prefix: "ดร.",
    firstName: "วิโรจน์",
    lastName: "เจริญรัตนกุล",
    personnelType: "ผู้อำนวยการ",
    department: "บริหารทั่วไป",
    position: "ผู้อำนวยการโรงเรียนบ้านไสโป๊ะ",
    birthDate: "1972-04-15",
    employmentDate: "2000-05-16",
    retirementDate: "2032-09-30",
    major: "การบริหารการศึกษา",
    degree: "ปรัชญาดุษฎีบัณฑิต (ปร.ด.)",
    phone: "081-4567890",
    email: "wirote.c@school.ac.th",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "prs-002",
    prefix: "นางสาว",
    firstName: "สมศรี",
    lastName: "ใจดีงาม",
    personnelType: "ครู",
    department: "บริหารงานบุคคล",
    position: "ครูชำนาญการพิเศษ (ประจำชั้น ป.1)",
    birthDate: "1984-07-22",
    employmentDate: "2008-10-01",
    retirementDate: "2044-09-30",
    major: "ภาษาไทย",
    degree: "การศึกษามหาบัณฑิต (กศ.ม.)",
    phone: "089-1234567",
    email: "somsri.j@school.ac.th",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "prs-003",
    prefix: "นาย",
    firstName: "วิชัย",
    lastName: "สุวรรณมาลา",
    personnelType: "ครู",
    department: "วิชาการ",
    position: "ครู คศ.2 (ประจำชั้น ป.2)",
    birthDate: "1988-12-10",
    employmentDate: "2012-05-18",
    retirementDate: "2048-09-30",
    major: "วิทยาศาสตร์ทั่วไป",
    degree: "ครุศาสตรบัณฑิต (ค.บ.)",
    phone: "086-7890123",
    email: "wichai.s@school.ac.th",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "prs-004",
    prefix: "นาง",
    firstName: "อารีย์",
    lastName: "รักความรู้",
    personnelType: "ครู",
    department: "งบประมาณ",
    position: "ครู คศ.1 (ประจำชั้น อ.1)",
    birthDate: "1992-03-05",
    employmentDate: "2016-06-01",
    retirementDate: "2052-09-30",
    major: "การศึกษาปฐมวัย",
    degree: "ครุศาสตรบัณฑิต (ค.บ.) เกียรตินิยม",
    phone: "084-5556677",
    email: "aree.r@school.ac.th",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80"
  }
];

export const INITIAL_DAILY_TRACKING: DailyTracking[] = [
  {
    id: "dt-001",
    date: "2026-10-14",
    studentId: "std-001",
    studentName: "เด็กชายกิตติพงษ์ เจริญสุข",
    gradeLevel: "ป.1",
    weight: 22.5,
    height: 120,
    bmi: 15.6,
    bmiStatus: "สมส่วน",
    milkStatus: "ดื่มครบ",
    toothBrushStatus: "แปรงฟันแล้ว"
  },
  {
    id: "dt-002",
    date: "2026-10-14",
    studentId: "std-002",
    studentName: "เด็กหญิงพิมพ์ชนก แก้วมณี",
    gradeLevel: "ป.1",
    weight: 21.0,
    height: 118,
    bmi: 15.1,
    bmiStatus: "สมส่วน",
    milkStatus: "ดื่มครบ",
    toothBrushStatus: "แปรงฟันแล้ว"
  },
  {
    id: "dt-003",
    date: "2026-10-14",
    studentId: "std-003",
    studentName: "เด็กชายธนวัฒน์ ปัญญาวงศ์",
    gradeLevel: "ป.1",
    weight: 18.2,
    height: 116,
    bmi: 13.5,
    bmiStatus: "ผอม",
    milkStatus: "ดื่มครบ",
    toothBrushStatus: "แปรงฟันแล้ว"
  },
  {
    id: "dt-004",
    date: "2026-10-14",
    studentId: "std-004",
    studentName: "เด็กหญิงณัฐธิดา ศิริวัฒนา",
    gradeLevel: "ป.2",
    weight: 26.0,
    height: 125,
    bmi: 16.6,
    bmiStatus: "สมส่วน",
    milkStatus: "ดื่มครบ",
    toothBrushStatus: "แปรงฟันแล้ว"
  }
];

export interface PrimarySubjectTemplate {
  order: number;
  prefix: string;
  name: string;
  lowerHours: number; // ป.1 - ป.3
  upperHours: number; // ป.4 - ป.6
  totalScore: number;
  courseworkScore: number;
  examScore: number;
}

export const PRIMARY_DEFAULT_SUBJECT_TEMPLATES: PrimarySubjectTemplate[] = [
  { order: 1, prefix: "ท", name: "ภาษาไทย", lowerHours: 5, upperHours: 4, totalScore: 50, courseworkScore: 35, examScore: 15 },
  { order: 2, prefix: "ค", name: "คณิตศาสตร์", lowerHours: 5, upperHours: 4, totalScore: 50, courseworkScore: 35, examScore: 15 },
  { order: 3, prefix: "ส", name: "สังคมศึกษา", lowerHours: 2, upperHours: 2, totalScore: 50, courseworkScore: 35, examScore: 15 },
  { order: 4, prefix: "พ", name: "สุขศึกษาและพลศึกษา", lowerHours: 2, upperHours: 2, totalScore: 50, courseworkScore: 40, examScore: 10 },
  { order: 5, prefix: "ศ", name: "ศิลปะ", lowerHours: 1, upperHours: 2, totalScore: 50, courseworkScore: 40, examScore: 10 },
  { order: 6, prefix: "ง", name: "การงานอาชีพ", lowerHours: 1, upperHours: 1, totalScore: 50, courseworkScore: 40, examScore: 10 },
  { order: 7, prefix: "อ", name: "ภาษาต่างประเทศ", lowerHours: 3, upperHours: 2, totalScore: 50, courseworkScore: 35, examScore: 15 },
  { order: 8, prefix: "ว", name: "วิทยาศาสตร์และเทคโนโลยี", lowerHours: 2, upperHours: 3, totalScore: 50, courseworkScore: 35, examScore: 15 },
  { order: 9, prefix: "ป", name: "ประวัติศาสตร์", lowerHours: 1, upperHours: 1, totalScore: 50, courseworkScore: 40, examScore: 10 }
];

export function buildDefaultPrimarySubjectsForYears(years: string[] = ["2568", "2569"]): Subject[] {
  const results: Subject[] = [];
  const primaryGrades: { gradeNum: number; gradeLevel: Subject["gradeLevel"] }[] = [
    { gradeNum: 1, gradeLevel: "ป.1" },
    { gradeNum: 2, gradeLevel: "ป.2" },
    { gradeNum: 3, gradeLevel: "ป.3" },
    { gradeNum: 4, gradeLevel: "ป.4" },
    { gradeNum: 5, gradeLevel: "ป.5" },
    { gradeNum: 6, gradeLevel: "ป.6" }
  ];
  const semesters: ("1" | "2")[] = ["1", "2"];

  for (const yr of years) {
    for (const sem of semesters) {
      for (const { gradeNum, gradeLevel } of primaryGrades) {
        const isLower = gradeNum <= 3;
        for (const tpl of PRIMARY_DEFAULT_SUBJECT_TEMPLATES) {
          const code = `${tpl.prefix}1${gradeNum}101`;
          const hoursPerWeek = isLower ? tpl.lowerHours : tpl.upperHours;

          // Keep backward-compatible IDs for original initial subjects where applicable
          let id = `sub-def-${yr}-sem${sem}-p${gradeNum}-${tpl.order}`;
          let teacherId = "";
          let teacherName = "";
          let assignmentItems = [
            { id: `asg-${code}-${yr}-${sem}-1`, name: "งานที่ 1: แบบฝึกหัด", maxScore: 5 },
            { id: `asg-${code}-${yr}-${sem}-2`, name: "งานที่ 2: ใบงาน", maxScore: 5 }
          ];

          if (gradeNum === 1 && tpl.prefix === "ท") {
            id = yr === "2568" && sem === "1" ? "sub-001" : `sub-001-${yr}-sem${sem}`;
            teacherId = "mem-01";
            teacherName = "นางสาวสมศรี ใจดีงาม";
            if (sem === "1") {
              assignmentItems = [
                { id: "asg-01", name: "งานที่ 1: แบบฝึกหัด", maxScore: 5 },
                { id: "asg-02", name: "งานที่ 2: ใบงาน", maxScore: 5 },
                { id: "asg-03", name: "งานที่ 3: ชิ้นงาน/นำเสนอ", maxScore: 5 }
              ];
            } else {
              assignmentItems = [
                { id: "asg-01", name: "งานที่ 1: แบบฝึกหัด", maxScore: 5 },
                { id: "asg-02", name: "งานที่ 2: ใบงาน", maxScore: 5 }
              ];
            }
          } else if (gradeNum === 1 && tpl.prefix === "ค") {
            id = yr === "2568" && sem === "1" ? "sub-002" : `sub-002-${yr}-sem${sem}`;
            teacherId = "mem-01";
            teacherName = "นางสาวสมศรี ใจดีงาม";
          } else if (gradeNum === 1 && tpl.prefix === "ว") {
            id = yr === "2568" && sem === "1" ? "sub-003" : `sub-003-${yr}-sem${sem}`;
            teacherId = "mem-02";
            teacherName = "นายวิชัย สุวรรณมาลา";
          } else if (gradeNum === 1 && tpl.prefix === "อ") {
            id = yr === "2568" && sem === "1" ? "sub-004" : `sub-004-${yr}-sem${sem}`;
            teacherId = "mem-01";
            teacherName = "นางสาวสมศรี ใจดีงาม";
          } else if (gradeNum === 2 && tpl.prefix === "ว") {
            id = yr === "2568" && sem === "1" ? "sub-005" : `sub-005-${yr}-sem${sem}`;
            teacherId = "mem-02";
            teacherName = "นายวิชัย สุวรรณมาลา";
          }

          results.push({
            id,
            code,
            name: tpl.name,
            gradeLevel,
            hoursPerWeek,
            semester: sem,
            academicYear: yr,
            totalScore: tpl.totalScore,
            courseworkScore: tpl.courseworkScore,
            examScore: tpl.examScore,
            teacherId,
            teacherName,
            assignmentItems
          });
        }
      }
    }
  }

  return results;
}

export const INITIAL_SUBJECTS: Subject[] = buildDefaultPrimarySubjectsForYears(["2568", "2569"]);


export const INITIAL_GRADES: GradeRecord[] = [];

export const INITIAL_ATTENDANCE_CONFIG: AttendanceDayConfig = {
  academicYear: "2569",
  semester: "1",
  startDate: "2026-05-18",
  endDate: "2026-10-07",
  targetDays: 100 // 100 school days requirement
};

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_SAVINGS: SavingsRecord[] = [];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: "task-001",
    title: "ส่งแผนการจัดการเรียนรู้ ภาคเรียนที่ 1",
    description: "ขอให้คุณครูทุกท่านจัดทำและส่งแผนการจัดการเรียนรู้ (Unit Plan) พร้อมบันทึกหลังสอน ภาคเรียนที่ 1 ให้ฝ่ายวิชาการตรวจ",
    assignedTo: "all",
    priority: "urgent",
    dueDate: "2026-10-20",
    isCompleted: false,
    createdBy: "ฝ่ายวิชาการ",
    attachmentUrl: "https://drive.google.com"
  },
  {
    id: "task-002",
    title: "บันทึกข้อมูลการดื่มนมและแปรงฟันประจำสัปดาห์",
    description: "ครูประจำชั้นทุกห้องบันทึกข้อมูลการแจกจ่ายนมโรงเรียนและการแปรงฟันหลังอาหารกลางวันลงระบบ",
    assignedTo: "all",
    priority: "high",
    dueDate: "2026-10-16",
    isCompleted: false,
    createdBy: "งานอนามัยโรงเรียน"
  },
  {
    id: "task-003",
    title: "ส่งรายงานผลการคัดกรองนักเรียนรายบุคคล (SDQ)",
    description: "ส่งแบบสรุปการเยี่ยมบ้านและการประเมินพฤติกรรมนักเรียน SDQ ให้งานแนะแนว",
    assignedTo: "mem-01",
    priority: "normal",
    dueDate: "2026-10-25",
    isCompleted: false,
    createdBy: "หัวหน้าระบบดูแลช่วยเหลือนักเรียน"
  }
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: "doc-001",
    docNumber: "ว 12/2569",
    title: "คำสั่งแต่งตั้งคณะกรรมการจัดกิจกรรมสัปดาห์วิทยาศาสตร์และวันภาษาไทยแห่งชาติ",
    category: "คำสั่งโรงเรียน",
    activityName: "ScienceAndThaiWeek",
    folderName: "ScienceAndThaiWeek_2026-08-18",
    date: "2026-08-18",
    fileUrl: "https://drive.google.com",
    fileSize: "1.2 MB",
    uploadedBy: "Admin"
  },
  {
    id: "doc-002",
    docNumber: "ศธ 04112/ว 350",
    title: "แนวทางการประเมินผลสัมฤทธิ์ทางการเรียนและการอ่าน คิดวิเคราะห์ และเขียน",
    category: "แบบฟอร์มวิชาการ",
    activityName: "AcademicGuidelines",
    folderName: "AcademicGuidelines_2026-06-01",
    date: "2026-06-01",
    fileUrl: "https://drive.google.com",
    fileSize: "3.4 MB",
    uploadedBy: "Admin"
  },
  {
    id: "doc-003",
    docNumber: "คำสั่งที่ 085/2569",
    title: "คำสั่งมอบหมายหน้าที่ครูเวรประจำวันและเวรยามรักษาความปลอดภัยสถานที่ราชการ",
    category: "คำสั่งโรงเรียน",
    activityName: "DutySchedule",
    folderName: "DutySchedule_2026-05-15",
    date: "2026-05-15",
    fileUrl: "https://drive.google.com",
    fileSize: "850 KB",
    uploadedBy: "Admin"
  },
  {
    id: "doc-004",
    docNumber: "รป 03/2569",
    title: "รายงานการประชุมคณะกรรมการสถานศึกษาขั้นพื้นฐาน ครั้งที่ 2/2569",
    category: "รายงานการประชุม",
    activityName: "SchoolBoardMeeting",
    folderName: "SchoolBoardMeeting_2026-09-10",
    date: "2026-09-10",
    fileUrl: "https://drive.google.com",
    fileSize: "2.1 MB",
    uploadedBy: "Admin"
  }
];

export const INITIAL_WEBSITES: RecommendedWebsite[] = [
  {
    id: "web-001",
    title: "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)",
    url: "https://www.obec.go.th",
    category: "หน่วยงานต้นสังกัด",
    description: "ศูนย์รวมนโยบาย ข่าวสารการศึกษา ประกาศผลการประกวดแข่งขัน และแนวทางการจัดการเรียนรู้ระดับชาติ",
    isOfficial: true,
    logoUrl: "https://www.obec.go.th/wp-content/uploads/2021/04/cropped-logo_obec-32x32.png"
  },
  {
    id: "web-002",
    title: "DLIT มูลนิธิการศึกษาทางไกลผ่านดาวเทียม",
    url: "https://www.dltv.ac.th",
    category: "สื่อและคลังบทเรียน",
    description: "คลังสื่อการสอน วีดิทัศน์การเรียนรู้ และแผนการจัดการเรียนรู้ทางไกลระดับปฐมวัยถึงมัธยมศึกษา",
    isOfficial: true
  },
  {
    id: "web-003",
    title: "คลังข้อสอบและสื่อครูเชียงราย (KruChiangRai)",
    url: "https://www.kruchiangrai.net",
    category: "แหล่งดาวน์โหลดใบงาน",
    description: "รวมแผนการสอน แบบฝึกหัด ใบงาน คลังข้อสอบ ปพ. และแบบฟอร์มเอกสารวิชาการครูไทย",
    isOfficial: false
  },
  {
    id: "web-004",
    title: "Google Classroom / Google Workspace for Education",
    url: "https://classroom.google.com",
    category: "ระบบห้องเรียนออนไลน์",
    description: "แพลตฟอร์มจัดการเรียนการสอน มอบหมายงาน และประเมินผลการเรียนรู้แบบดิจิทัล",
    isOfficial: false
  },
  {
    id: "web-005",
    title: "Canva เพื่อการศึกษา (Canva for Education)",
    url: "https://www.canva.com/education",
    category: "เครื่องมือออกแบบสื่อการสอน",
    description: "เครื่องมือออกแบบสื่อ ใบงาน สไลด์นำเสนอ และเกียรติบัตรฟรีสำหรับครูและนักเรียน",
    isOfficial: false
  },
  {
    id: "web-006",
    title: "ศูนย์ข้อมูลสารสนเทศทางการศึกษา (DMC)",
    url: "https://portal.bopp-obec.info/obec66",
    category: "ระบบสารสนเทศ",
    description: "ระบบจัดเก็บข้อมูลนักเรียนรายบุคคล (Data Management Center) กระทรวงศึกษาธิการ",
    isOfficial: true
  }
];

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "cal-001",
    title: "เปิดภาคเรียนที่ 1/2569",
    description: "เปิดเรียนวันแรก ต้อนรับนักเรียนทุกระดับชั้น",
    date: "2026-05-16",
    type: "academic",
    color: "#2563EB"
  },
  {
    id: "cal-002",
    title: "พิธีไหว้ครู ประจำปีการศึกษา 2569",
    description: "นักเรียนร่วมพิธีมอบพานดอกไม้ไหว้ครู ณ หอประชุมโรงเรียน",
    date: "2026-06-18",
    type: "activity",
    color: "#7C3AED"
  },
  {
    id: "cal-003",
    title: "สอบวัดผลกลางภาคเรียนที่ 1",
    description: "การทดสอบวัดผลการเรียนรู้กลางภาค ทุกระดับชั้น",
    date: "2026-07-28",
    endDate: "2026-07-30",
    type: "exam",
    color: "#DC2626"
  },
  {
    id: "cal-004",
    title: "วันสัปดาห์วิทยาศาสตร์และวันภาษาไทย",
    description: "จัดนิทรรศการ ซุ้มกิจกรรมทดลอง และการประกวดคัดลายมือ",
    date: "2026-08-18",
    type: "activity",
    color: "#059669"
  },
  {
    id: "cal-005",
    title: "ประชุมผู้ปกครองภาคเรียนที่ 1",
    description: "รายงานผลการพัฒนาผู้เรียนและรับทราบผลสัมฤทธิ์",
    date: "2026-10-17",
    type: "meeting",
    color: "#D97706"
  },
  {
    id: "cal-006",
    title: "วันปิดภาคเรียนที่ 1 / ประเมินผล 100 วัน",
    description: "สรุปเวลาเรียน 100 วันทำการและจัดทำรายงานผลการเรียน ปพ.",
    date: "2026-10-31",
    type: "academic",
    color: "#0284C7"
  }
];
