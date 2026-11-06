import React, { useState, useEffect, useRef } from 'react';
import { 
  SchoolAdminAccount, 
  MemberAccount, 
  GradeLevel, 
  UserSession,
  GoogleConfig
} from '../types';
import { StorageService } from '../services/storage';
import { CODE_GS_SOURCE, SETUP_GUIDE_STEPS } from '../services/googleAppsScriptCode';
import { 
  Terminal, 
  Building2, 
  Users, 
  Calendar, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  LogOut, 
  School, 
  RefreshCw,
  Info,
  KeyRound,
  ExternalLink,
  Ban,
  FolderSync,
  Database,
  Copy,
  Check,
  Download,
  FileCode2,
  HelpCircle,
  X,
  Cloud,
  Server,
  Code,
  FileSpreadsheet,
  ClipboardList,
  FileText
} from 'lucide-react';
import { D1Service } from '../services/d1Service';

interface DeveloperConsoleProps {
  currentUser: UserSession;
  admins: SchoolAdminAccount[];
  members: MemberAccount[];
  academicYears: string[];
  googleConfig?: GoogleConfig;
  onSaveGoogleConfig?: (config: GoogleConfig) => void;
  onTestConnection?: (url: string, folderId: string) => Promise<{ success: boolean; message: string }>;
  onSyncAll?: () => Promise<{ success: boolean; message: string }>;
  onResetData?: () => void;
  onRefreshData: () => void;
  onLogout: () => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  onInspectSchoolView?: (admin: SchoolAdminAccount) => void;
}

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({
  currentUser,
  admins,
  members,
  academicYears,
  googleConfig,
  onSaveGoogleConfig,
  onTestConnection,
  onSyncAll,
  onResetData,
  onRefreshData,
  onLogout,
  onShowToast,
  onInspectSchoolView
}) => {
  const [activeTab, setActiveTab] = useState<'admins' | 'members' | 'years' | 'google' | 'cloudflare'>('admins');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>(() => admins[0]?.id || '');
  const [passwordsMap, setPasswordsMap] = useState<Record<string, boolean>>({});

  // Cloudflare D1 states
  const [d1Status, setD1Status] = useState<{ checked: boolean; isOnline: boolean; isD1Available: boolean; message: string }>({
    checked: false,
    isOnline: false,
    isD1Available: false,
    message: ''
  });
  const [isCheckingD1, setIsCheckingD1] = useState(false);
  const [hasCopiedSql, setHasCopiedSql] = useState(false);
  const [hasCopiedWrangler, setHasCopiedWrangler] = useState(false);
  const [copiedSingleIndex, setCopiedSingleIndex] = useState<number | null>(null);

  // Google config states & School Automation
  const [webAppUrl, setWebAppUrl] = useState(googleConfig?.webAppUrl || '');
  const [driveFolderId, setDriveFolderId] = useState(googleConfig?.driveFolderId || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isCreatingSheetForAdmin, setIsCreatingSheetForAdmin] = useState<string | null>(null);
  const [autoCreateSheetOnAdmin, setAutoCreateSheetOnAdmin] = useState(true);

  // Modal States: Create Admin
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('123456');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminSchoolName, setAdminSchoolName] = useState('');
  const [adminSchoolCode, setAdminSchoolCode] = useState('');
  const [adminAffiliation, setAdminAffiliation] = useState('สำนักงานเขตพื้นที่การศึกษาประถมศึกษา (สพป.)');
  const [adminDirectorName, setAdminDirectorName] = useState('');

  // Modal States: Create Member
  const [isCreateMemberModalOpen, setIsCreateMemberModalOpen] = useState(false);
  const [memberSchoolId, setMemberSchoolId] = useState(admins[0]?.id || '');
  const [memberUsername, setMemberUsername] = useState('');
  const [memberPassword, setMemberPassword] = useState('123');
  const [memberPrefix, setMemberPrefix] = useState('ครู');
  const [memberFirstName, setMemberFirstName] = useState('');
  const [memberLastName, setMemberLastName] = useState('');
  const [memberPosition, setMemberPosition] = useState('ครูประจำชั้น');
  const [memberGrade, setMemberGrade] = useState<GradeLevel>('ป.1');

  // Modal States: Delete Year Confirmation
  const [isDeleteYearModalOpen, setIsDeleteYearModalOpen] = useState(false);
  const [yearToDelete, setYearToDelete] = useState('');
  const [confirmYearInput, setConfirmYearInput] = useState('');
  const [isDeletingYear, setIsDeletingYear] = useState(false);

  // Modal States: Add Year
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  // Modal States: Change Developer Own Password
  const [isChangeDevPassOpen, setIsChangeDevPassOpen] = useState(false);
  const [newDevPassword, setNewDevPassword] = useState('');

  // Modal States: Confirm Delete Admin & Member
  const [adminToDelete, setAdminToDelete] = useState<SchoolAdminAccount | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<MemberAccount | null>(null);

  // Modal States: Change Admin Password & Member Password
  const [adminToChangePassword, setAdminToChangePassword] = useState<SchoolAdminAccount | null>(null);
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState('');
  const [memberToChangePassword, setMemberToChangePassword] = useState<MemberAccount | null>(null);
  const [newMemberPasswordInput, setNewMemberPasswordInput] = useState('');
  const [isDeduplicatingFolders, setIsDeduplicatingFolders] = useState(false);

  // Manual & On-demand Drive folder audit & deduplication (Strict 1 School = 1 Real Folder)
  const handleDeduplicateDriveFolders = async (schoolName?: string) => {
    setIsDeduplicatingFolders(true);
    onShowToast('info', 'กำลังตรวจสอบ Google Drive...', 'กำลังตรวจสอบและจัดระเบียบโฟลเดอร์ใน Google Drive (1 โรงเรียน = 1 โฟลเดอร์จริง)...');
    const res = await StorageService.deduplicateSchoolDriveFolders(schoolName);
    setIsDeduplicatingFolders(false);
    if (res.success) {
      onShowToast('success', 'จัดระเบียบ Google Drive สำเร็จ 🎉', res.message);
    } else {
      onShowToast('info', 'สถานะ Google Drive', res.message);
    }
  };

  const handleUpdateDevPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevPassword.trim() || newDevPassword.trim().length < 4) {
      onShowToast('warning', 'รหัสผ่านสั้นเกินไป', 'กรุณากำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษร');
      return;
    }
    StorageService.updateDeveloperPassword(newDevPassword.trim());
    setIsChangeDevPassOpen(false);
    setNewDevPassword('');
    onShowToast('success', 'เปลี่ยนรหัสผ่านสำเร็จ', 'อัปเดตรหัสผ่านของ Developer (airfan) เรียบร้อยแล้ว');
  };

  const openChangeAdminPasswordModal = (admin: SchoolAdminAccount) => {
    setAdminToChangePassword(admin);
    setNewAdminPasswordInput(admin.password || '123456');
  };

  const handleConfirmChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToChangePassword) return;
    const cleanPass = newAdminPasswordInput.trim();
    if (!cleanPass) {
      onShowToast('warning', 'กรุณาระบุรหัสผ่าน', 'รหัสผ่านของ Admin ห้ามว่าง');
      return;
    }
    const target = adminToChangePassword;
    StorageService.updateAdminPassword(target.id, cleanPass);
    setAdminToChangePassword(null);
    setNewAdminPasswordInput('');
    onRefreshData();
    onShowToast(
      'success',
      'เปลี่ยนรหัสผ่าน Admin สำเร็จ ✓',
      `อัปเดตรหัสผ่านของ "${target.username}" (${target.schoolName}) เป็น "${cleanPass}" เรียบร้อยแล้ว`
    );
  };

  const openChangeMemberPasswordModal = (member: MemberAccount) => {
    setMemberToChangePassword(member);
    setNewMemberPasswordInput(member.password || '123');
  };

  const handleConfirmChangeMemberPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToChangePassword) return;
    const cleanPass = newMemberPasswordInput.trim();
    if (!cleanPass) {
      onShowToast('warning', 'กรุณาระบุรหัสผ่าน', 'รหัสผ่านของสมาชิกห้ามว่าง');
      return;
    }
    const target = memberToChangePassword;
    StorageService.updateMemberPassword(target.id, cleanPass);
    setMemberToChangePassword(null);
    setNewMemberPasswordInput('');
    onRefreshData();
    onShowToast(
      'success',
      'เปลี่ยนรหัสผ่านสมาชิกสำเร็จ ✓',
      `อัปเดตรหัสผ่านของ "${target.fullName}" (ID: ${target.username}) เป็น "${cleanPass}" เรียบร้อยแล้ว`
    );
  };

  const toggleShowPassword = (id: string) => {
    setPasswordsMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Google Apps Script Handlers
  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_GS_SOURCE);
    setHasCopiedCode(true);
    onShowToast('success', 'คัดลอกโค้ดแล้ว', 'คัดลอกโค้ด Google Apps Script (Code.gs) ลงคลิปบอร์ดแล้ว');
    setTimeout(() => setHasCopiedCode(false), 2500);
  };

  const handleDownloadCodeGs = () => {
    const blob = new Blob([CODE_GS_SOURCE], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('success', 'ดาวน์โหลดแล้ว', 'บันทึกไฟล์ Code.gs เรียบร้อย');
  };

  const handleTestConnection = async () => {
    if (!webAppUrl.trim()) {
      onShowToast('warning', 'ขาด URL', 'กรุณากรอก Web App URL ของ Google Apps Script');
      return;
    }
    if (!onTestConnection) return;
    setIsTesting(true);
    const res = await onTestConnection(webAppUrl.trim(), driveFolderId.trim());
    setIsTesting(false);
    if (res.success) {
      onShowToast('success', 'เชื่อมต่อสำเร็จ', res.message);
    } else {
      onShowToast('error', 'เชื่อมต่อไม่สำเร็จ', res.message);
    }
  };

  const handleSaveConfig = () => {
    if (!onSaveGoogleConfig) return;
    onSaveGoogleConfig({
      webAppUrl: webAppUrl.trim(),
      driveFolderId: driveFolderId.trim(),
      isConnected: googleConfig?.isConnected || false,
      lastSynced: googleConfig?.lastSynced
    });
    onShowToast('success', 'บันทึกการตั้งค่า', 'บันทึก URL และ Google Drive Folder ID เรียบร้อย');
  };

  const handleSyncNow = async () => {
    if (!onSyncAll) return;
    setIsSyncing(true);
    const res = await onSyncAll();
    setIsSyncing(false);
    if (res.success) {
      onShowToast('success', 'ซิงค์ข้อมูลสำเร็จ', res.message);
    } else {
      onShowToast('error', 'ซิงค์ล้มเหลว', res.message);
    }
  };

  // Cloudflare D1 Handlers
  const handleTestD1 = async () => {
    setIsCheckingD1(true);
    const res = await D1Service.testConnection();
    setIsCheckingD1(false);
    setD1Status({
      checked: true,
      isOnline: res.isOnline,
      isD1Available: res.isD1Available,
      message: res.message
    });
    if (res.isOnline) {
      onShowToast('success', 'เชื่อมต่อ D1 สำเร็จ', res.message);
    } else {
      onShowToast('info', 'สถานะ D1', res.message);
    }
  };

  const handleSyncFromD1 = async () => {
    setIsCheckingD1(true);
    const res = await D1Service.fetchAll();
    setIsCheckingD1(false);
    if (res.success && res.data) {
      if (res.data.admins && res.data.admins.length > 0) {
        res.data.admins.forEach(a => StorageService.saveAdmin(a));
      }
      if (res.data.members && res.data.members.length > 0) {
        res.data.members.forEach(m => StorageService.saveMember(m));
      }
      if (res.data.academicYears && res.data.academicYears.length > 0) {
        res.data.academicYears.forEach(y => StorageService.addAcademicYear(y));
      }
      onRefreshData();
      onShowToast('success', 'ดึงข้อมูล D1 สำเร็จ', 'นำเข้าข้อมูล ID และโรงเรียนจาก Cloudflare D1 เรียบร้อย');
    } else {
      onShowToast('info', 'สถานะ D1', res.message || 'กำลังทำงานในโหมด Client Preview (สามารถ Deploy บน Cloudflare ได้ทันที)');
    }
  };

  // Google Sheet Automation per School Admin
  const handleCreateSheetForAdmin = async (admin: SchoolAdminAccount) => {
    setIsCreatingSheetForAdmin(admin.id);
    onShowToast('info', 'กำลังสร้าง Google Sheet & Drive', `กำลังสร้าง Google Sheet และโฟลเดอร์ Google Drive ประจำโรงเรียน "${admin.schoolName}" ในพื้นหลัง...`);
    const res = await StorageService.createSchoolGoogleSheet(admin.schoolName, admin.schoolCode, admin.id, admin);
    setIsCreatingSheetForAdmin(null);

    if (res.success && res.spreadsheetId) {
      const updatedAdmin: SchoolAdminAccount = {
        ...admin,
        googleSheetId: res.spreadsheetId,
        googleSheetUrl: res.spreadsheetUrl,
        driveFolderId: res.driveFolderId || admin.driveFolderId,
        driveFolderUrl: res.driveFolderUrl || admin.driveFolderUrl
      };
      StorageService.saveAdmin(updatedAdmin);
      onRefreshData();
      onShowToast('success', 'สร้าง Google Sheet & Drive สำเร็จ 🎉', `สร้างไฟล์ตารางข้อมูลและโฟลเดอร์ Google Drive แยกเฉพาะสำหรับ ${admin.schoolName} เรียบร้อยแล้ว`);
    } else {
      onShowToast('error', 'สร้างไม่สำเร็จ', res.message);
    }
  };

  // Handler: Create Admin (School) — Instant 0ms UI + Background Google Sheet Provisioning
  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = adminUsername.trim();
    const cleanSchoolName = adminSchoolName.trim();
    const cleanSchoolCode = adminSchoolCode.trim();
    const cleanPassword = adminPassword.trim() || '123456';
    const cleanFullName = adminFullName.trim() || `ผู้ดูแลระบบ ${cleanSchoolName}`;
    const cleanAffiliation = adminAffiliation.trim();
    const cleanDirector = adminDirectorName.trim() || undefined;

    if (!cleanUsername || !cleanSchoolName) {
      onShowToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อผู้ใช้และชื่อโรงเรียน');
      return;
    }

    // Check duplicate
    if (admins.some(a => a.username.toLowerCase() === cleanUsername.toLowerCase())) {
      onShowToast('error', 'ชื่อผู้ใช้ซ้ำ', `ชื่อผู้ใช้ ${cleanUsername} มีอยู่ในระบบแล้ว`);
      return;
    }

    const adminId = 'admin-' + Date.now().toString(36);

    const newAdmin: SchoolAdminAccount = {
      id: adminId,
      username: cleanUsername,
      password: cleanPassword,
      fullName: cleanFullName,
      schoolName: cleanSchoolName,
      schoolCode: cleanSchoolCode || undefined,
      affiliation: cleanAffiliation,
      directorName: cleanDirector,
      createdAt: new Date().toISOString().split('T')[0]
    };

    // 1. Save Admin & close modal IMMEDIATELY (0ms wait time!)
    StorageService.saveAdmin(newAdmin);
    onRefreshData();
    setIsCreateAdminModalOpen(false);

    // Reset fields immediately
    setAdminUsername('');
    setAdminPassword('123456');
    setAdminFullName('');
    setAdminSchoolName('');
    setAdminSchoolCode('');
    setAdminDirectorName('');

    onShowToast(
      'success',
      'สร้าง ID Admin สำเร็จทันที ⚡',
      `สร้างบัญชี "${cleanUsername}" (${cleanSchoolName}) เรียบร้อยแล้ว กำลังสร้าง Google Sheet และโฟลเดอร์ Google Drive แยกเฉพาะโรงเรียนในพื้นหลัง...`
    );

    // 2. Provision isolated Google Sheet and dedicated Drive folder in the background without blocking UI
    setIsCreatingSheetForAdmin(adminId);
    StorageService.createSchoolGoogleSheet(cleanSchoolName, cleanSchoolCode, adminId, newAdmin)
      .then(sheetRes => {
        if (sheetRes.success && sheetRes.spreadsheetId) {
          // Ensure the admin wasn't deleted while sheet was being created, and merge into latest admin state
          const latestAdmin = StorageService.getAdmins().find(a => a.id === adminId);
          if (latestAdmin) {
            const updatedAdmin: SchoolAdminAccount = {
              ...latestAdmin,
              googleSheetId: sheetRes.spreadsheetId,
              googleSheetUrl: sheetRes.spreadsheetUrl,
              driveFolderId: sheetRes.driveFolderId,
              driveFolderUrl: sheetRes.driveFolderUrl
            };
            StorageService.saveAdmin(updatedAdmin);
            onRefreshData();
            onShowToast(
              'success',
              'สร้าง Google Sheet & Drive โรงเรียนสำเร็จ 🎉',
              `ผูก Google Sheet และโฟลเดอร์ Google Drive แยกเฉพาะสำหรับ "${cleanSchoolName}" เรียบร้อยแล้ว`
            );
          }
        }
      })
      .finally(() => {
        setIsCreatingSheetForAdmin(prev => (prev === adminId ? null : prev));
      });
  };

  // Handler: Toggle Temporary Suspension of Admin (blocks Admin + all Members of that school)
  const handleToggleSuspendAdmin = (admin: SchoolAdminAccount) => {
    const res = StorageService.toggleSuspendAdmin(admin.id);
    onRefreshData();
    if (res.targetAdmin?.isSuspended) {
      onShowToast(
        'warning',
        'ระงับการใช้งานชั่วคราวแล้ว 🚫',
        `ระงับสิทธิ์ "${admin.schoolName}" (${admin.username}) ชั่วคราวแล้ว ทั้ง Admin และสมาชิกในสังกัดทั้งหมดจะไม่สามารถเข้าใช้งานได้ในขณะนี้`
      );
    } else {
      onShowToast(
        'success',
        'ยกเลิกการระงับแล้ว ✓',
        `เปิดสิทธิ์การใช้งานให้ "${admin.schoolName}" (${admin.username}) และสมาชิกในสังกัดกลับมาใช้งานได้ตามปกติแล้ว`
      );
    }
  };

  // Handler: Toggle per-school ON/OFF for หน้ามอบหมาย (disableAssignments) or หน้าศูนย์เอกสาร (disableDocuments)
  const handleToggleSchoolModule = (
    admin: SchoolAdminAccount,
    moduleKey: 'disableAssignments' | 'disableDocuments'
  ) => {
    const res = StorageService.toggleSchoolModuleAccess(admin.id, moduleKey);
    onRefreshData();
    const isNowDisabled = Boolean(res.targetAdmin?.[moduleKey]);
    const moduleLabel = moduleKey === 'disableAssignments' ? 'หน้ามอบหมาย' : 'หน้าศูนย์เอกสาร';

    if (isNowDisabled) {
      onShowToast(
        'warning',
        `ปิดการใช้งาน ${moduleLabel} (OFF) 🚫`,
        `ตั้งค่า OFF "${moduleLabel}" สำหรับ "${admin.schoolName}" แล้ว ทั้ง Admin และสมาชิกของโรงเรียนนี้จะไม่สามารถกดเข้าหน้านี้ได้`
      );
    } else {
      onShowToast(
        'success',
        `เปิดการใช้งาน ${moduleLabel} (ON) ✓`,
        `ตั้งค่า ON "${moduleLabel}" สำหรับ "${admin.schoolName}" แล้ว ทั้ง Admin และสมาชิกสามารถกดเข้าใช้งานได้ตามปกติ`
      );
    }
  };

  // Handler: Delete Admin (opens confirmation modal)
  const handleDeleteAdmin = (admin: SchoolAdminAccount) => {
    setAdminToDelete(admin);
  };

  const confirmDeleteAdminNow = () => {
    if (!adminToDelete) return;
    const target = adminToDelete;
    setAdminToDelete(null);
    StorageService.deleteAdmin(target.id);
    onRefreshData();
    onShowToast(
      'info',
      'ลบ ID Admin และ Google Sheets สำเร็จ',
      `ลบผู้ดูแลระบบ ${target.username} (${target.schoolName}) พร้อมลบข้อมูลและไฟล์ใน Google Sheets ออกจากระบบแล้ว`
    );
  };

  // Handler: Create Member for specific Admin/School
  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUsername.trim() || !memberFirstName.trim() || !memberLastName.trim()) {
      onShowToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อผู้ใช้ ชื่อจริง และนามสกุลสมาชิก');
      return;
    }

    // Check duplicate
    if (members.some(m => m.username.toLowerCase() === memberUsername.trim().toLowerCase())) {
      onShowToast('error', 'ชื่อผู้ใช้ซ้ำ', `ชื่อผู้ใช้ ${memberUsername.trim()} มีอยู่ในระบบแล้ว`);
      return;
    }

    const targetAdmin = admins.find(a => a.id === memberSchoolId) || admins[0];

    const newMember: MemberAccount = {
      id: 'mem-' + Date.now().toString(36),
      username: memberUsername.trim(),
      password: memberPassword.trim() || '123',
      prefix: memberPrefix,
      fullName: `${memberPrefix}${memberFirstName.trim()} ${memberLastName.trim()}`,
      firstName: memberFirstName.trim(),
      lastName: memberLastName.trim(),
      role: 'member',
      gradeLevel: memberGrade,
      position: memberPosition.trim() || 'ครูประจำชั้น',
      schoolId: targetAdmin ? targetAdmin.id : undefined,
      schoolName: targetAdmin ? targetAdmin.schoolName : undefined
    };

    StorageService.saveMember(newMember);
    onRefreshData();
    setIsCreateMemberModalOpen(false);

    // Reset fields
    setMemberUsername('');
    setMemberPassword('123');
    setMemberFirstName('');
    setMemberLastName('');

    onShowToast('success', 'สร้าง ID สมาชิกสำเร็จ', `สร้างบัญชี "${newMember.fullName}" สังกัด ${newMember.schoolName || 'โรงเรียน'} สำเร็จ`);
  };

  // Handler: Delete Member
  const handleDeleteMember = (member: MemberAccount) => {
    setMemberToDelete(member);
  };

  const confirmDeleteMemberNow = () => {
    if (!memberToDelete) return;
    const target = memberToDelete;
    setMemberToDelete(null);
    StorageService.deleteMember(target.id);
    onRefreshData();
    onShowToast('info', 'ลบสมาชิกแล้ว', `ลบบัญชี ${target.fullName} ออกจากระบบและ Google Sheets เรียบร้อยแล้ว`);
  };

  // Handler: Add Academic Year
  const handleAddAcademicYear = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newYearInput.trim();
    if (!trimmed) return;
    StorageService.addAcademicYear(trimmed);
    onRefreshData();
    setIsAddYearModalOpen(false);
    setNewYearInput('');
    onShowToast('success', 'เพิ่มปีการศึกษาสำเร็จ', `เพิ่มปีการศึกษา ${trimmed} เข้าสู่ระบบแล้ว`);
  };

  // Handler: Delete Academic Year (Purge all data in that year)
  const handlePurgeAcademicYear = () => {
    if (confirmYearInput.trim() !== yearToDelete) {
      onShowToast('error', 'ยืนยันไม่ถูกต้อง', `กรุณากรอกเลขปีการศึกษา ${yearToDelete} ให้ตรงกันเพื่อยืนยัน`);
      return;
    }

    setIsDeletingYear(true);
    try {
      const result = StorageService.deleteAcademicYear(yearToDelete);
      onRefreshData();
      setIsDeleteYearModalOpen(false);
      setConfirmYearInput('');
      setYearToDelete('');
      onShowToast(
        'success', 
        'ลบปีการศึกษาและล้างข้อมูลทั้งระบบสำเร็จ', 
        `ลบข้อมูลปีการศึกษา ${yearToDelete} ทั้งหมดบนเว็บ รวมถึงไฟล์ที่อัปโหลดใน Google Drive และข้อมูลใน Google Sheets เรียบร้อยแล้ว (เกรด ${result.deletedGrades}, เวลาเรียน ${result.deletedAttendance}, สุขภาพ ${result.deletedDailyTracking}, เงินออม ${result.deletedSavings}, งานมอบหมาย ${result.deletedTasks || 0}, เอกสาร ${result.deletedDocuments || 0} รายการ)`
      );
    } catch {
      onShowToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถลบปีการศึกษาได้');
    } finally {
      setIsDeletingYear(false);
    }
  };

  // Strictly deduplicated admins by ID and School Name (Never duplicate data in UI)
  const uniqueAdmins = React.useMemo(() => {
    const map = new Map<string, SchoolAdminAccount>();
    for (const a of admins) {
      const key = a.id || a.schoolName;
      if (!map.has(key)) {
        map.set(key, a);
      }
    }
    return Array.from(map.values());
  }, [admins]);

  // Filtered members list
  const filteredMembers = members.filter(m => {
    if (!selectedSchoolFilter) return true;
    const targetAdmin = admins.find(a => a.id === selectedSchoolFilter);
    const normalizedMemberSchoolId = StorageService.getNormalizedSchoolId(m.schoolId, m.schoolName);
    return normalizedMemberSchoolId === selectedSchoolFilter || 
           m.schoolId === selectedSchoolFilter || 
           m.schoolName === targetAdmin?.schoolName || 
           (!m.schoolId && !m.schoolName && targetAdmin === admins[0]);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Superadmin Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-white tracking-wide">
                AMS Developer Control Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-xs font-bold">
                ระดับที่ 1: Developer
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Logged in as: <strong className="text-emerald-400">{currentUser.username}</strong> ({currentUser.fullName})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsChangeDevPassOpen(true)}
            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 border border-indigo-500/40 cursor-pointer"
            title="เปลี่ยนรหัสผ่านของ Developer (airfan)"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">เปลี่ยนรหัสผ่าน</span>
          </button>

          <button
            type="button"
            onClick={onRefreshData}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="รีเฟรชข้อมูลระบบ"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="ออกจากระบบ Developer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        
        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs text-slate-400 font-semibold block">ID Admin (โรงเรียน) ทั้งหมด</span>
              <span className="text-3xl font-black text-white font-mono mt-1 block">{admins.length}</span>
              <span className="text-[11px] text-emerald-400 mt-1 block">✓ รองรับหลายโรงเรียน (Multi-School)</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs text-slate-400 font-semibold block">ID สมาชิก (บุคลากรครู) ทั้งหมด</span>
              <span className="text-3xl font-black text-white font-mono mt-1 block">{members.length}</span>
              <span className="text-[11px] text-indigo-400 mt-1 block">สังกัดตามโรงเรียนของแต่ละ Admin</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs text-slate-400 font-semibold block">ปีการศึกษาที่เปิดในระบบ</span>
              <span className="text-3xl font-black text-white font-mono mt-1 block">{academicYears.length}</span>
              <span className="text-[11px] text-rose-400 mt-1 block">สามารถเลือกลบปีและล้างข้อมูลได้</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 3 Main Action Tabs */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('admins')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'admins'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>1. จัดการ ID Admin (โรงเรียน) [{admins.length}]</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'members'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>2. จัดการ ID สมาชิก (บุคลากร) [{members.length}]</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('years')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'years'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>3. จัดการปีการศึกษา & ล้างข้อมูล [{academicYears.length}]</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('google')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'google'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FolderSync className="w-4 h-4" />
              <span>4. เชื่อมต่อ Google Sheets & Drive</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cloudflare')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'cloudflare'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Cloud className="w-4 h-4 text-amber-400" />
              <span>5. Cloudflare D1 & Deploy</span>
            </button>
          </div>

          {/* TAB 1: ADMINS MANAGEMENT */}
          {activeTab === 'admins' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>รายชื่อผู้ดูแลระบบโรงเรียน (Admin)</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono">
                      {uniqueAdmins.length} โรงเรียน
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Developer บริหารจัดการ Admin ประจำโรงเรียน (1 โรงเรียน = 1 Google Sheet และ 1 โฟลเดอร์ Google Drive ตามจริง ไม่ซ้ำซ้อน)
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isDeduplicatingFolders}
                    onClick={() => handleDeduplicateDriveFolders()}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="ตรวจสอบและลบโฟลเดอร์ซ้ำใน Google Drive (1 โรงเรียน = 1 โฟลเดอร์จริง)"
                  >
                    <FolderSync className={`w-4 h-4 text-emerald-400 ${isDeduplicatingFolders ? 'animate-spin' : ''}`} />
                    <span>{isDeduplicatingFolders ? 'กำลังจัดระเบียบ Drive...' : 'ตรวจสอบโฟลเดอร์ใน Drive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreateAdminModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>สร้าง ID Admin โรงเรียนใหม่</span>
                  </button>
                </div>
              </div>

              {/* Admin List Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uniqueAdmins.map((adm) => {
                  const isPassVisible = passwordsMap[adm.id] || false;
                  const adminMembersCount = members.filter(m => m.schoolId === adm.id || m.schoolName === adm.schoolName).length;
                  const isSuspended = Boolean(adm.isSuspended);

                  return (
                    <div 
                      key={adm.id}
                      className={`rounded-2xl p-5 space-y-3.5 transition-all flex flex-col justify-between border ${
                        isSuspended
                          ? 'bg-rose-950/25 border-rose-500/60 hover:border-rose-400'
                          : 'bg-slate-800/60 border-slate-700/80 hover:border-indigo-500/50'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                              isSuspended ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'
                            }`}>
                              {isSuspended ? <Ban className="w-5 h-5" /> : <School className="w-5 h-5" />}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white line-clamp-1" title={adm.schoolName}>
                                {adm.schoolName}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                {adm.affiliation || 'สังกัด สพป.'}
                              </p>
                            </div>
                          </div>

                          {isSuspended ? (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0 flex items-center gap-1">
                              <Ban className="w-3 h-3" />
                              <span>ระงับชั่วคราว</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                              ระดับ 2 Admin
                            </span>
                          )}
                        </div>

                        {isSuspended && (
                          <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded-xl text-[11px] text-rose-200 flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>ระงับใช้งานชั่วคราว: ทั้ง Admin และสมาชิก ({adminMembersCount} คน) ไม่มีสิทธิ์เข้าใช้งานในขณะนี้</span>
                          </div>
                        )}

                        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-1.5 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">ID (Username):</span>
                            <strong className="text-indigo-300 font-bold">{adm.username}</strong>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Password:</span>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-200">
                                {isPassVisible ? (adm.password || '123456') : '••••••'}
                              </strong>
                              <button
                                type="button"
                                onClick={() => toggleShowPassword(adm.id)}
                                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title={isPassVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => openChangeAdminPasswordModal(adm)}
                                className="px-2 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-sans font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="เปลี่ยนรหัสผ่านของ Admin โรงเรียนนี้"
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>เปลี่ยนรหัส</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                            <span className="text-slate-400">ผู้ดูแล:</span>
                            <span className="text-slate-300 truncate max-w-[150px]">{adm.fullName}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                          <span>จำนวนสมาชิกครูในสังกัด:</span>
                          <strong className="text-indigo-400 font-bold font-mono">{adminMembersCount} คน</strong>
                        </div>

                        {/* Dedicated School Google Sheet & Drive Folder */}
                        <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-700/60 text-[11px] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Google Sheet:</span>
                            </span>
                            {isCreatingSheetForAdmin === adm.id ? (
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>กำลังสร้างในพื้นหลัง...</span>
                              </span>
                            ) : adm.googleSheetId && !adm.googleSheetId.startsWith('sheet_') && adm.googleSheetUrl ? (
                              <a
                                href={adm.googleSheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <span>เปิด Sheet โรงเรียน</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCreateSheetForAdmin(adm)}
                                className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>สร้าง Sheet โรงเรียน</span>
                              </button>
                            )}
                          </div>
                          {adm.googleSheetId && !adm.googleSheetId.startsWith('sheet_') && (
                            <p className="text-[10px] text-slate-500 font-mono truncate" title={adm.googleSheetId}>
                              Sheet ID: {adm.googleSheetId}
                            </p>
                          )}

                          {/* Dedicated School Google Drive Folder */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                            <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                              <FolderSync className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Google Drive:</span>
                            </span>
                            {adm.driveFolderUrl ? (
                              <a
                                href={adm.driveFolderUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <span>เปิด Drive โรงเรียน</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : adm.driveFolderId ? (
                              <a
                                href={`https://drive.google.com/drive/folders/${adm.driveFolderId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <span>เปิด Drive โรงเรียน</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-[10px] text-indigo-300/80 font-mono">
                                แยกโฟลเดอร์โรงเรียนอัตโนมัติ
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Per-School Module ON / OFF Switches (หน้ามอบหมาย & หน้าศูนย์เอกสาร) */}
                        <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                              <Lock className="w-3 h-3 text-purple-400" />
                              <span>เปิด-ปิดระบบงานเฉพาะโรงเรียนนี้ (ON / OFF):</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Toggle 1: หน้ามอบหมาย */}
                            <button
                              type="button"
                              onClick={() => handleToggleSchoolModule(adm, 'disableAssignments')}
                              className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                                adm.disableAssignments
                                  ? 'bg-rose-950/50 border-rose-500/40 text-rose-300 hover:bg-rose-900/50'
                                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                              }`}
                              title={
                                adm.disableAssignments
                                  ? 'ปัจจุบัน OFF: Admin และสมาชิกไม่สามารถกดหน้ามอบหมายได้ (คลิกเพื่อเปิด ON)'
                                  : 'ปัจจุบัน ON: เปิดใช้งานหน้ามอบหมายปกติ (คลิกเพื่อปิด OFF)'
                              }
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">หน้ามอบหมาย</span>
                              </span>
                              <span
                                className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide shrink-0 ${
                                  adm.disableAssignments
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-emerald-500 text-slate-950 shadow-xs'
                                }`}
                              >
                                {adm.disableAssignments ? 'OFF' : 'ON'}
                              </span>
                            </button>

                            {/* Toggle 2: หน้าศูนย์เอกสาร */}
                            <button
                              type="button"
                              onClick={() => handleToggleSchoolModule(adm, 'disableDocuments')}
                              className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                                adm.disableDocuments
                                  ? 'bg-rose-950/50 border-rose-500/40 text-rose-300 hover:bg-rose-900/50'
                                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                              }`}
                              title={
                                adm.disableDocuments
                                  ? 'ปัจจุบัน OFF: Admin และสมาชิกไม่สามารถกดหน้าศูนย์เอกสารได้ (คลิกเพื่อเปิด ON)'
                                  : 'ปัจจุบัน ON: เปิดใช้งานหน้าศูนย์เอกสารปกติ (คลิกเพื่อปิด OFF)'
                              }
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">หน้าศูนย์เอกสาร</span>
                              </span>
                              <span
                                className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide shrink-0 ${
                                  adm.disableDocuments
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-emerald-500 text-slate-950 shadow-xs'
                                }`}
                              >
                                {adm.disableDocuments ? 'OFF' : 'ON'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleSuspendAdmin(adm)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                              isSuspended
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                            }`}
                            title={
                              isSuspended
                                ? 'คลิกเพื่อยกเลิกการระงับ ให้ Admin และสมาชิกในสังกัดกลับมาใช้งานได้'
                                : 'คลิกเพื่อระงับการใช้งานชั่วคราว (Admin และสมาชิกของโรงเรียนนี้จะเข้าใช้งานไม่ได้ชั่วคราว)'
                            }
                          >
                            {isSuspended ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>ยกเลิกการระงับ</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5 shrink-0" />
                                <span>ระงับใช้งานชั่วคราว</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => openChangeAdminPasswordModal(adm)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all cursor-pointer"
                            title="เปลี่ยนรหัสผ่านของ Admin โรงเรียนนี้"
                          >
                            <KeyRound className="w-3.5 h-3.5 shrink-0" />
                            <span>เปลี่ยนรหัส</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteAdmin(adm)}
                          className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer ml-auto"
                          title="ลบ ID Admin นี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERS MANAGEMENT */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>รายชื่อสมาชิก (บุคลากรครู) ทั้งหมดในระบบ</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-mono">
                      {filteredMembers.length} คน
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Developer เป็นผู้มีสิทธิ์สร้าง ID สมาชิกบุคลากรและเลือกผูกสังกัด Admin โรงเรียน (Admin ไม่มีสิทธิ์สร้างสมาชิก)
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Filter by school dropdown */}
                  <select
                    value={selectedSchoolFilter}
                    onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                    className="text-xs bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {admins.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.schoolName} ({members.filter(m => StorageService.getNormalizedSchoolId(m.schoolId, m.schoolName) === a.id || m.schoolId === a.id || m.schoolName === a.schoolName).length})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setMemberSchoolId(selectedSchoolFilter || admins[0]?.id || '');
                      setIsCreateMemberModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>สร้าง ID สมาชิกใหม่</span>
                  </button>
                </div>
              </div>

              {/* Members Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800 text-slate-300 font-bold border-b border-slate-700">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">#</th>
                        <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                        <th className="py-3 px-3">สังกัดโรงเรียน (Admin)</th>
                        <th className="py-3 px-3">ตำแหน่ง / ชั้น</th>
                        <th className="py-3 px-3 font-mono">ID / Password</th>
                        <th className="py-3 px-3 text-center w-20">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500">
                            ยังไม่มีสมาชิกในสังกัดโรงเรียนที่เลือก
                          </td>
                        </tr>
                      ) : (
                        filteredMembers.map((mem, idx) => {
                          const isPassVisible = passwordsMap[mem.id] || false;
                          const matchedSchoolAdmin = admins.find(
                            a => a.id === mem.schoolId || a.schoolName === mem.schoolName
                          );
                          const schoolName = matchedSchoolAdmin?.schoolName || mem.schoolName || 'โรงเรียนหลัก';
                          const isSchoolSuspended = Boolean(matchedSchoolAdmin?.isSuspended);

                          return (
                            <tr key={mem.id} className={`hover:bg-slate-800/40 transition-colors ${isSchoolSuspended ? 'bg-rose-950/15' : ''}`}>
                              <td className="py-3 px-3 text-center font-mono text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-4 font-semibold text-white">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{mem.fullName}</span>
                                  {mem.role === 'admin' && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                      Admin
                                    </span>
                                  )}
                                  {isSchoolSuspended && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                      <Ban className="w-3 h-3" />
                                      <span>ถูกระงับตาม Admin โรงเรียน</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-indigo-300 font-medium">
                                {schoolName}
                              </td>
                              <td className="py-3 px-3 text-slate-400">
                                {mem.position || 'ครูผู้สอน'} {mem.gradeLevel ? `(ชั้น ${mem.gradeLevel})` : ''}
                              </td>
                              <td className="py-3 px-3 font-mono">
                                <div className="space-y-0.5">
                                  <div>
                                    <span className="text-slate-500 text-[10px]">ID: </span>
                                    <strong className="text-emerald-400">{mem.username}</strong>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-500 text-[10px]">Pass: </span>
                                    <strong className="text-slate-300">
                                      {isPassVisible ? (mem.password || '123') : '••••••'}
                                    </strong>
                                    <button
                                      type="button"
                                      onClick={() => toggleShowPassword(mem.id)}
                                      className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                                      title={isPassVisible ? "ซ่อน" : "ดูรหัสผ่าน"}
                                    >
                                      {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openChangeMemberPasswordModal(mem)}
                                      className="px-1.5 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-sans font-bold flex items-center gap-1 transition-all cursor-pointer"
                                      title="เปลี่ยนรหัสผ่านสมาชิกคนนี้"
                                    >
                                      <KeyRound className="w-2.5 h-2.5" />
                                      <span>เปลี่ยนรหัส</span>
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openChangeMemberPasswordModal(mem)}
                                    className="p-1.5 hover:bg-blue-500/20 text-blue-400 hover:text-blue-200 rounded-lg transition-colors cursor-pointer"
                                    title="เปลี่ยนรหัสผ่านสมาชิกนี้"
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMember(mem)}
                                    className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                                    title="ลบสมาชิกนี้"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACADEMIC YEARS MANAGEMENT & DATA PURGING */}
          {activeTab === 'years' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>จัดการปีการศึกษา & การล้างข้อมูลประจำปี</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Developer มีสิทธิ์ลบปีการศึกษา โดยข้อมูลทุกอย่างในเว็บรวมถึงไฟล์ต่างๆ ที่ได้อัปโหลดในปีการศึกษานั้นๆ ใน Google Drive และ Google Sheets จะถูกลบอัตโนมัติอย่างถาวร
                </p>
              </div>

              {/* Active Years Card */}
              <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    ปีการศึกษาที่เปิดอยู่ในระบบ ({academicYears.length} ปี)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const maxYear = Math.max(...academicYears.map(Number), 2568);
                      setNewYearInput(String(maxYear + 1));
                      setIsAddYearModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มปีการศึกษา</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {academicYears.map((yr) => (
                    <div 
                      key={yr}
                      className="p-3.5 bg-slate-900 rounded-xl border border-slate-700/80 flex items-center justify-between group"
                    >
                      <div>
                        <span className="text-[10px] text-slate-500 block">ปีการศึกษา</span>
                        <span className="text-lg font-black text-white font-mono">{yr}</span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setYearToDelete(yr);
                          setConfirmYearInput('');
                          setIsDeleteYearModalOpen(true);
                        }}
                        className="p-2 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title={`ลบปีการศึกษา ${yr} และล้างข้อมูลทั้งหมด`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone: Warning Notice Box */}
              <div className="p-5 bg-rose-950/20 border border-rose-800/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5 text-rose-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>คำเตือนสำคัญเกี่ยวกับการลบปีการศึกษา:</span>
                </div>
                <p className="text-xs text-rose-300/80 leading-relaxed">
                  เมื่อ Developer สั่งลบปีการศึกษาใด ข้อมูลทุกอย่างในเว็บรวมถึงไฟล์ต่างๆ ที่ได้อัปโหลดในปีการศึกษานั้นๆ ที่อยู่ใน Google Drive และ Google Sheets จะถูกลบอัตโนมัติอย่างสมบูรณ์ทันที ได้แก่:
                  ผลการเรียนและคะแนน (Grades), สถิติเวลาเรียน (Attendance), ข้อมูลสุขภาพการดื่มนมและการแปรงฟัน (Daily Tracking), ข้อมูลเงินฝากออมทรัพย์ (Savings), วิชาเรียน (Subjects), งานมอบหมายและไฟล์งานที่สมาชิกส่ง (Assignments & Submissions), หนังสือคำสั่งและศูนย์เอกสาร (Documents), การประเมินพัฒนาการ/ปพ.6 และรายการลาในปีการศึกษานั้น
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: GOOGLE SHEETS & DRIVE CONNECTION */}
          {activeTab === 'google' && (
            <div className="space-y-6">
              {/* Header & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <FolderSync className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">
                      การเชื่อมต่อ Google Sheets &amp; Google Drive (เวอร์ชัน 3.0 รองรับปุ่ม/หน้าใหม่ &amp; สองทางลบ)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      v3.0 Multi-School
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    ซิงค์ข้อมูลวิชาการและธุรการทั้งหมดลง Google Sheets แยกตามโรงเรียน (Admin) พร้อมสร้างปุ่ม/หน้าใหม่และลบสองทางตามจริง
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    googleConfig?.isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${googleConfig?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                    <span>{googleConfig?.isConnected ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}</span>
                  </span>

                  {googleConfig?.lastSynced && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      ซิงค์ล่าสุด: {new Date(googleConfig.lastSynced).toLocaleString('th-TH')}
                    </span>
                  )}
                </div>
              </div>

              {/* Version 3.0 Architectural Features Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-950/70 border border-emerald-900/40 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>1. สร้างปุ่ม/หน้าใหม่ บันทึกในชีตเสมอ</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    เมื่อหน้า Admin หรือสมาชิก สร้างปุ่มลัดใหม่ หน้าเว็บใหม่ หรือเพิ่มฟิลด์ข้อมูลในอนาคต Code.gs จะสร้างแผ่นงานและขยายคอลัมน์ให้อัตโนมัติทันที
                  </p>
                </div>

                <div className="p-4 bg-slate-950/70 border border-rose-900/40 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>2. ลบสองทางจริง (Two-Way Delete)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    เมื่อกดลบในระบบ หรือเปิดลบแถวใน Google Sheets แถวจะถูกลบออกจาก Google Sheets ตามจริง (sheet.deleteRow) ข้อมูลตรงกัน 100%
                  </p>
                </div>

                <div className="p-4 bg-slate-950/70 border border-indigo-900/40 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>3. สร้าง ID Admin แยกชีตอัตโนมัติ</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    เมื่อ Developer สร้าง ID Admin โรงเรียน ระบบจะสั่ง Google Apps Script สร้างไฟล์ Google Sheet ใหม่และย้ายเข้า Drive ทันที แยกข้อมูลแต่ละโรงเรียน
                  </p>
                </div>
              </div>

              {/* Quick Actions & Code.gs Preview Card */}
              <div className="p-4 bg-indigo-950/30 border border-indigo-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <FileCode2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      ไฟล์ Code.gs (Google Apps Script API v3.0)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      รองรับทุกเบราว์เซอร์ ทุกอุปกรณ์ และทุกอีเมล (ไม่มีปัญหา CORS และไม่ต้องล็อกอินขอสิทธิ์)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    {hasCopiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedCode ? 'คัดลอกโค้ดแล้ว' : 'คัดลอก Code.gs'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCodeGs}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดไฟล์</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCodeModalOpen(true)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ดูโค้ดเต็ม</span>
                  </button>
                </div>
              </div>

              {/* Form Inputs & Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800 text-xs">
                  <h4 className="text-white font-bold text-xs flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span>พารามิเตอร์การเชื่อมต่อ (Connection Settings)</span>
                  </h4>

                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">
                      Google Apps Script Web App URL *
                    </label>
                    <input
                      type="url"
                      value={webAppUrl}
                      onChange={(e) => setWebAppUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      URL ที่ได้หลังจากนำโค้ด Code.gs ไปติดตั้งใน Google Apps Script แล้วเลือก Deploy เป็น Web App
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">
                      Google Drive Folder ID (โฟลเดอร์สำหรับเก็บ Sheet โรงเรียนและเอกสาร)
                    </label>
                    <input
                      type="text"
                      value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                      placeholder="เช่น 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      ID ของโฟลเดอร์ Google Drive จาก URL ในแถบที่อยู่เว็บ
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isTesting}
                      onClick={handleTestConnection}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>บันทึกการตั้งค่า</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleSyncNow}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <FolderSync className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลเดี๋ยวนี้'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDeduplicatingFolders}
                      onClick={() => handleDeduplicateDriveFolders()}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                      title="ตรวจสอบและกำจัดโฟลเดอร์ที่อาจซ้ำซ้อนใน Google Drive ให้เหลือ 1 โรงเรียน = 1 โฟลเดอร์จริง"
                    >
                      <FolderSync className={`w-3.5 h-3.5 ${isDeduplicatingFolders ? 'animate-spin' : ''}`} />
                      <span>{isDeduplicatingFolders ? 'กำลังจัดระเบียบ Drive...' : 'ตรวจสอบ & ลบโฟลเดอร์ซ้ำใน Drive'}</span>
                    </button>
                  </div>
                </div>

                {/* Setup Guide */}
                <div className="space-y-3 bg-slate-950/60 p-5 rounded-2xl border border-slate-800 text-xs">
                  <h4 className="text-white font-bold text-xs flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>ขั้นตอนการติดตั้ง Google Apps Script (เข้าได้ทุกเบราว์เซอร์ ทุกอุปกรณ์)</span>
                  </h4>

                  <div className="space-y-2.5 text-slate-300">
                    {SETUP_GUIDE_STEPS.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <strong className="text-white block">{step.title}</strong>
                          <span className="text-[11px] text-slate-400 leading-relaxed block">{step.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-1 text-emerald-300 text-[11px]">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>เคล็ดลับสำคัญในการ Deploy:</span>
                    </div>
                    <p className="text-slate-300 text-[10px] leading-relaxed">
                      ในขั้นตอน Deploy ให้เลือก <strong>ดำเนินการในฐานะ (Execute as): &quot;ตัวฉัน (Me)&quot;</strong> และ <strong>ผู้มีสิทธิ์เข้าถึง (Who has access): &quot;ทุกคน (Anyone)&quot;</strong> เพื่อให้ครูและผู้บริหารทุกคนสามารถบันทึกข้อมูลเข้า Google Sheets ได้จากทุกเครื่อง ทุกเบราว์เซอร์ ทุกอีเมล โดยไม่มีหน้าต่างขอสิทธิ์หรือปัญหา CORS
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLOUDFLARE D1 & DEPLOY GUIDE */}
          {activeTab === 'cloudflare' && (
            <div className="space-y-6">
              {/* Header & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-amber-400" />
                    <span>Cloudflare D1 (SQL Database) & คู่มือการ Deploy</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    จัดเก็บ ID Developer, ID Admin และ ID สมาชิกใน Cloudflare D1 และเก็บข้อมูลวิชาการ/ธุรการแยกโรงเรียนใน Google Sheets & Drive
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isCheckingD1}
                    onClick={handleTestD1}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingD1 ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
                    <span>{isCheckingD1 ? 'กำลังตรวจสอบ...' : 'ทดสอบ D1 Connection'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isCheckingD1}
                    onClick={handleSyncFromD1}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>ดึงข้อมูลจาก Cloudflare D1</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    d1Status.isOnline
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">
                        สถานะ Cloudflare D1 Binding (env.DB):
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        d1Status.isOnline
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {d1Status.checked 
                          ? (d1Status.isOnline ? 'Online (D1 Connected)' : 'Preview Mode (Local Storage Active)') 
                          : 'พร้อมเชื่อมต่อ Cloudflare Pages'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {d1Status.message || 'ระบบรองรับการรันทั้งใน Client Preview และเมื่อ Deploy บน Cloudflare Pages จะผูกเข้ากับ D1 โดยอัตโนมัติ'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Architecture Blueprint Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span>1. ข้อมูลระดับ Developer & บัญชี (Cloudflare D1)</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-white">ID Developer</strong> (Airfan / 456789) เก็บในตาราง <code className="text-indigo-300 font-mono">developers</code></li>
                    <li><strong className="text-white">ID Admin โรงเรียน</strong> เก็บในตาราง <code className="text-indigo-300 font-mono">school_admins</code> (พร้อมผูก ID Google Sheet)</li>
                    <li><strong className="text-white">ID สมาชิกบุคลากร</strong> เก็บในตาราง <code className="text-indigo-300 font-mono">members</code> (ผูกตามโรงเรียน)</li>
                    <li><strong className="text-white">ปีการศึกษา</strong> เก็บในตาราง <code className="text-indigo-300 font-mono">academic_years</code></li>
                    <li><span className="text-emerald-400">เมื่อเพิ่ม/ลบ ID ในหน้า Developer ระบบจะเพิ่ม/ลบใน D1 ทันที</span></li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <FolderSync className="w-4 h-4 text-emerald-400" />
                    <span>2. ข้อมูลวิชาการ & ไฟล์เอกสาร (Google Sheets & Drive)</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-white">สร้าง Google Sheet อัตโนมัติ</strong> ทุกครั้งที่ Developer สร้าง ID Admin โรงเรียนใหม่</li>
                    <li><strong className="text-white">แยก Sheet ตามโรงเรียน</strong> ครูและ Admin ของแต่ละโรงเรียนจะบันทึกข้อมูลลง Sheet ตนเอง</li>
                    <li><strong className="text-white">ข้อมูลวิชาการทั้งหมด</strong> (นักเรียน, คะแนน, เวลาเรียน, ออมทรัพย์, ธุรการ 8 ด้าน) เก็บใน Google Sheets</li>
                    <li><strong className="text-white">ไฟล์เอกสาร & คำสั่ง</strong> เก็บในโฟลเดอร์ Google Drive</li>
                    <li><span className="text-rose-400">หากลบข้อมูลในระบบ ข้อมูลใน Google Sheets จะถูกลบตามจริง</span></li>
                  </ul>
                </div>
              </div>

              {/* Step-by-Step Deploy Instructions via GitHub & Web Dashboard (No Terminal) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Cloud className="w-5 h-5 text-amber-400" />
                    <span>ขั้นตอนการเชื่อมต่อ GitHub & Deploy Cloudflare Pages + D1 (ผ่านหน้าเว็บ 100% ไม่ต้องใช้ Terminal)</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-medium text-[11px] self-start sm:self-auto border border-emerald-500/30">
                    ✓ ดำเนินการผ่านเบราว์เซอร์ทั้งหมด
                  </span>
                </div>

                <div className="space-y-4 text-slate-300">
                  {/* Step 1 */}
                  <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">1</span>
                      <strong className="text-white text-xs font-bold">นำโค้ดขึ้น GitHub Repository</strong>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[11px] pl-8">
                      สร้าง Repository บน GitHub ของคุณ (เช่น <code className="text-indigo-300 font-mono">academic-management-system</code>) จากนั้นนำไฟล์โค้ดทั้งหมดของโปรเจกต์นี้ Push หรืออัปโหลดขึ้น GitHub Repository ของคุณตามต้องการ
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">2</span>
                      <strong className="text-white text-xs font-bold">สร้าง D1 Database บน Cloudflare Web Dashboard</strong>
                    </div>
                    <div className="pl-8 space-y-1.5 text-[11px] text-slate-300">
                      <p>
                        1. ล็อกอินเข้าสู่ระบบที่ <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold hover:text-amber-300 inline-flex items-center gap-1">dash.cloudflare.com <ExternalLink className="w-3 h-3" /></a>
                      </p>
                      <p>
                        2. ที่แถบเมนูด้านซ้าย เลือก <strong>Storage &amp; Databases</strong> &rarr; คลิก <strong>D1 SQL Database</strong>
                      </p>
                      <p>
                        3. คลิกปุ่มสีฟ้า <strong>Create database</strong>
                      </p>
                      <p>
                        4. ตั้งชื่อฐานข้อมูล: <span className="px-2 py-0.5 bg-slate-800 text-amber-300 font-mono rounded font-bold">school-academic-db</span> แล้วกด <strong>Create</strong>
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 bg-slate-900/90 rounded-2xl border border-emerald-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">3</span>
                        <strong className="text-white text-xs font-bold">วางคำสั่ง SQL สร้างตารางข้อมูลในแท็บ Console บนหน้าเว็บ Cloudflare</strong>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-semibold hidden sm:inline">ไม่ต้องเปิด Terminal</span>
                    </div>
                    <div className="pl-8 space-y-2 text-[11px] text-slate-300">
                      <p>
                        1. คลิกเข้าไปที่ฐานข้อมูล <strong className="text-white">school-academic-db</strong> ที่เพิ่งสร้าง
                      </p>
                      <p>
                        2. ที่เมนูด้านบนของฐานข้อมูล ให้เลือกแท็บ <strong className="text-emerald-400 font-mono">Console</strong>
                      </p>
                      <p>
                        3. ให้นำคำสั่ง SQL จากกล่องด้านล่างไปวาง (Paste) แล้วคลิกปุ่ม <strong className="text-white bg-indigo-600 px-2 py-0.5 rounded">Execute</strong> สีฟ้า
                      </p>
                      
                      {/* Alert box solving No SQL statements detected */}
                      <div className="p-3 bg-amber-950/60 border border-amber-600/60 rounded-xl space-y-1.5 text-amber-200 mt-2">
                        <div className="font-bold flex items-center gap-1.5 text-amber-300 text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>หากขึ้นสีแดงเตือน: &quot;No SQL statements detected.&quot; ให้แก้ตามนี้</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 leading-relaxed">
                          <li>
                            <strong className="text-white font-semibold">สาเหตุที่ 1: มีการลากเมาส์คลุมดำ (Highlight) ข้อความบางส่วน:</strong> ในหน้า Console ของ Cloudflare ถ้าเผลอลากเมาส์โดนช่องว่างหรือบรรทัดคอมเมนต์ แล้วกด Execute ระบบจะรันเฉพาะตรงที่คลุมดำ ทำให้ขึ้นว่าไม่พบคำสั่ง SQL <span className="text-amber-300 font-medium">&rarr; วิธีแก้: กดในช่องแล้วกด Ctrl+A แล้วลบออกให้หมด จากนั้นวางใหม่โดยไม่ต้องลากเมาส์</span>
                          </li>
                          <li>
                            <strong className="text-white font-semibold">สาเหตุที่ 2: หน้าเว็บ Cloudflare D1 Console ในบางเบราว์เซอร์ไม่รองรับการรันหลายคำสั่งพร้อมกัน:</strong> <span className="text-emerald-300 font-medium">&rarr; วิธีแก้ที่ได้ผล 100%: ให้ใช้ <strong>&quot;ทางเลือกที่ 2: รันทีละคำสั่ง (Single Statements)&quot;</strong> ด้านล่าง โดยกดคัดลอกทีละคำสั่ง (1 ถึง 6) วางแล้วกด Execute ทีละอัน</span>
                          </li>
                        </ul>
                      </div>

                      <p className="text-emerald-400/90 bg-emerald-950/40 p-2 rounded-xl border border-emerald-900/40">
                        ✓ เมื่อรันครบ ตาราง <strong>developers</strong>, <strong>school_admins</strong>, <strong>members</strong>, <strong>academic_years</strong> และ ID Developer: <code className="font-bold text-white">Airfan</code> (รหัส: <code className="font-bold text-white">456789</code>) จะถูกสร้างบน Cloudflare D1 พร้อมใช้งานทันที!
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">4</span>
                      <strong className="text-white text-xs font-bold">เชื่อมต่อ GitHub เข้ากับ Cloudflare Pages เพื่อ Deploy</strong>
                    </div>
                    <div className="pl-8 space-y-1.5 text-[11px] text-slate-300">
                      <p>
                        1. ที่ Cloudflare Dashboard เมนูด้านซ้ายเลือก <strong>Workers &amp; Pages</strong> &rarr; คลิกปุ่ม <strong>Create application</strong>
                      </p>
                      <p>
                        2. เลือกแท็บ <strong>Pages</strong> &rarr; คลิกปุ่ม <strong>Connect to Git</strong>
                      </p>
                      <p>
                        3. ล็อกอินบัญชี GitHub และเลือก Repository ของคุณ &rarr; กด <strong>Begin setup</strong>
                      </p>
                      <p>
                        4. ตั้งค่า Build Configuration:
                      </p>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1 my-1">
                        <div><span className="text-slate-400">Framework preset:</span> <strong className="text-indigo-300">Vite</strong></div>
                        <div><span className="text-slate-400">Build command:</span> <strong className="text-indigo-300">npm run build</strong></div>
                        <div><span className="text-slate-400">Build output directory:</span> <strong className="text-indigo-300">dist</strong></div>
                      </div>
                      
                      {/* Environment variables tip for Cloudflare Pages npm error */}
                      <div className="p-2.5 bg-indigo-950/40 rounded-xl border border-indigo-800/40 space-y-1 mt-2">
                        <strong className="text-indigo-300 block font-semibold text-[11px]">
                          💡 ตั้งค่า Environment variables (ป้องกัน Build failed: npm error peer dependency):
                        </strong>
                        <p className="text-slate-300 text-[10px] leading-relaxed">
                          ในส่วน <strong>Environment variables (advanced)</strong> ให้เพิ่ม 2 ตัวแปรนี้ (หรือดันไฟล์ <code className="text-amber-300 font-mono">.npmrc</code> ขึ้น GitHub):
                        </p>
                        <div className="font-mono text-[10px] text-slate-300 bg-slate-900 p-2 rounded-lg space-y-0.5 border border-slate-800">
                          <div><span className="text-slate-400">Variable:</span> <strong className="text-amber-400">NPM_CONFIG_LEGACY_PEER_DEPS</strong> &rarr; <span className="text-emerald-400">true</span></div>
                          <div><span className="text-slate-400">Variable:</span> <strong className="text-amber-400">NODE_VERSION</strong> &rarr; <span className="text-emerald-400">20</span></div>
                        </div>
                      </div>

                      <p className="pt-1">
                        5. คลิกปุ่ม <strong>Save and Deploy</strong> &rarr; Cloudflare จะทำการดึงโค้ดและ Build เว็บไซต์ให้ทันที
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="p-4 bg-slate-900/90 rounded-2xl border border-amber-800/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center text-xs">5</span>
                      <strong className="text-white text-xs font-bold">ผูก D1 Database เข้ากับ Pages ผ่านหน้าเว็บ (Bindings)</strong>
                    </div>
                    <div className="pl-8 space-y-1.5 text-[11px] text-slate-300">
                      <p>
                        1. ในหน้าโปรเจกต์ Cloudflare Pages ของคุณ ให้คลิกแท็บ <strong>Settings</strong> ด้านบน
                      </p>
                      <p>
                        2. เมนูด้านซ้ายเลือก <strong>Bindings</strong>
                      </p>
                      <p>
                        3. เลื่อนลงมาที่ส่วน <strong>D1 database bindings</strong> &rarr; คลิก <strong>Add binding</strong>
                      </p>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1 my-1">
                        <div><span className="text-slate-400">Variable name:</span> <strong className="text-amber-400 font-bold">DB</strong> <span className="text-slate-400 text-[10px]">(พิมพ์ตัวใหญ่ DB เท่านั้น)</span></div>
                        <div><span className="text-slate-400">D1 database:</span> <strong className="text-emerald-400 font-bold">school-academic-db</strong></div>
                      </div>
                      <p>
                        4. กดปุ่ม <strong>Save</strong>
                      </p>
                      <p>
                        5. ไปที่แท็บ <strong>Deployments</strong> ด้านบน &rarr; ตรงการ Deploy ล่าสุดคลิกจุดสามจุด (<code className="text-white">...</code>) &rarr; เลือก <strong>Retry deployment</strong>
                      </p>
                      <p className="text-amber-400/90 font-medium">
                        ★ ระบบออนไลน์สมบูรณ์! เมื่อ Developer เพิ่มหรือลบ ID ข้อมูลจะซิงค์กับ Cloudflare D1 ทันที และข้อมูลนักเรียน/เกรดจะเก็บใน Google Sheets แยกตามโรงเรียน
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SQL Schema Preview & Copy Options */}
              <div className="space-y-4">
                
                {/* OPTION 1: Clean All-in-one SQL */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <Code className="w-4 h-4 text-emerald-400" />
                      <span>ทางเลือกที่ 1: คัดลอก SQL ทั้งหมด (Clean SQL ไม่มีคอมเมนต์)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cleanSql = `CREATE TABLE IF NOT EXISTS developers (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO developers (id, username, password, full_name)
VALUES ('dev-airfan', 'Airfan', '456789', 'Airfan');

CREATE TABLE IF NOT EXISTS school_admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  school_code TEXT,
  affiliation TEXT,
  director_name TEXT,
  google_sheet_id TEXT,
  google_sheet_url TEXT,
  drive_folder_id TEXT,
  is_suspended INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  prefix TEXT DEFAULT 'ครู',
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'member',
  grade_level TEXT,
  position TEXT DEFAULT 'ครูประจำชั้น',
  learning_group TEXT,
  avatar_url TEXT,
  is_suspended INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES school_admins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS academic_years (
  year_code TEXT PRIMARY KEY,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO academic_years (year_code) VALUES ('2567');
INSERT OR IGNORE INTO academic_years (year_code) VALUES ('2568');
INSERT OR IGNORE INTO academic_years (year_code) VALUES ('2569');

CREATE INDEX IF NOT EXISTS idx_members_school ON members(school_id);
CREATE INDEX IF NOT EXISTS idx_admins_username ON school_admins(username);
CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);`;
                        navigator.clipboard.writeText(cleanSql);
                        setHasCopiedSql(true);
                        onShowToast('success', 'คัดลอก SQL แล้ว', 'คัดลอกคำสั่ง SQL ทั้งหมดลงในคลิปบอร์ดแล้ว');
                        setTimeout(() => setHasCopiedSql(false), 2500);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
                    >
                      {hasCopiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{hasCopiedSql ? 'คัดลอกแล้ว' : 'คัดลอก SQL ทั้งหมด (Clean)'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    นำไปวางในช่อง Console ของ Cloudflare D1 แล้วกด <strong>Execute</strong> (ห้ามลากเมาส์คลุมดำข้อความก่อนกด Execute)
                  </p>
                </div>

                {/* OPTION 2: Single Statements (100% Guaranteed Fix for No SQL statements detected) */}
                <div className="bg-slate-950/80 border border-indigo-900/40 rounded-2xl p-5 space-y-4 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2 text-white font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                        <span>ทางเลือกที่ 2: รันทีละคำสั่ง (Single Statements - แก้ปัญหา No SQL statements ได้ 100%)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        หากรันแบบรวมแล้วเจอข้อความเตือน ให้กดปุ่มคัดลอกทีละคำสั่งด้านล่างนี้ วางใน Console แล้วกด Execute ทีละอัน
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        step: 1,
                        title: '1. สร้างตาราง developers (สำหรับจัดเก็บ ID Developer)',
                        sql: `CREATE TABLE IF NOT EXISTS developers (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`
                      },
                      {
                        step: 2,
                        title: '2. เพิ่ม ID Developer เริ่มต้น (Airfan / 456789)',
                        sql: `INSERT OR IGNORE INTO developers (id, username, password, full_name)
VALUES ('dev-airfan', 'Airfan', '456789', 'Airfan');`
                      },
                      {
                        step: 3,
                        title: '3. สร้างตาราง school_admins (สำหรับจัดเก็บ ID Admin แต่ละโรงเรียน)',
                        sql: `CREATE TABLE IF NOT EXISTS school_admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  school_code TEXT,
  affiliation TEXT,
  director_name TEXT,
  google_sheet_id TEXT,
  google_sheet_url TEXT,
  drive_folder_id TEXT,
  is_suspended INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`
                      },
                      {
                        step: 4,
                        title: '4. สร้างตาราง members (สำหรับจัดเก็บ ID สมาชิกครู ตามโรงเรียน)',
                        sql: `CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  prefix TEXT DEFAULT 'ครู',
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'member',
  grade_level TEXT,
  position TEXT DEFAULT 'ครูประจำชั้น',
  learning_group TEXT,
  avatar_url TEXT,
  is_suspended INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES school_admins(id) ON DELETE CASCADE
);`
                      },
                      {
                        step: 5,
                        title: '5. สร้างตาราง academic_years (ปีการศึกษาในระบบ)',
                        sql: `CREATE TABLE IF NOT EXISTS academic_years (
  year_code TEXT PRIMARY KEY,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`
                      },
                      {
                        step: 6,
                        title: '6. เพิ่มปีการศึกษาเริ่มต้น (2567, 2568, 2569)',
                        sql: `INSERT OR IGNORE INTO academic_years (year_code) VALUES ('2567');
INSERT OR IGNORE INTO academic_years (year_code) VALUES ('2568');
INSERT OR IGNORE INTO academic_years (year_code) VALUES ('2569');`
                      }
                    ].map((item) => (
                      <div key={item.step} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 text-xs">{item.title}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.sql);
                              setCopiedSingleIndex(item.step);
                              onShowToast('success', 'คัดลอกคำสั่งแล้ว', `คัดลอกคำสั่งที่ ${item.step} แล้ว นำไปวางใน Console แล้วกด Execute`);
                              setTimeout(() => setCopiedSingleIndex(null), 2000);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                              copiedSingleIndex === item.step
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            {copiedSingleIndex === item.step ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSingleIndex === item.step ? 'คัดลอกแล้ว' : `คัดลอกคำสั่งที่ ${item.step}`}</span>
                          </button>
                        </div>
                        <pre className="p-2.5 bg-slate-950 rounded-lg font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre">
                          {item.sql}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* wrangler.toml sample preview */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <FileCode2 className="w-4 h-4 text-indigo-400" />
                    <span>การตั้งค่าไฟล์ wrangler.toml</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const toml = `name = "academic-management-system"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"`;
                      navigator.clipboard.writeText(toml);
                      setHasCopiedWrangler(true);
                      onShowToast('success', 'คัดลอกแล้ว', 'คัดลอกไฟล์ wrangler.toml เรียบร้อย');
                      setTimeout(() => setHasCopiedWrangler(false), 2500);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    {hasCopiedWrangler ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedWrangler ? 'คัดลอกแล้ว' : 'คัดลอก wrangler.toml'}</span>
                  </button>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-300 border border-slate-800 space-y-2">
                  <pre className="whitespace-pre text-emerald-300">
{`name = "academic-management-system"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"`}
                  </pre>
                  <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-2">
                    ✓ การผูกฐานข้อมูล D1 ถูกกำหนดผ่านหน้าเว็บ Cloudflare Pages (Settings &rarr; Bindings: DB) เรียบร้อยแล้ว ไม่จำเป็นต้องใส่ database_id ในไฟล์นี้ เพื่อป้องกันข้อผิดพลาด Invalid database UUID
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* MODAL 1: Create Admin (School) */}
      {isCreateAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">สร้าง ID Admin (โรงเรียนใหม่)</h3>
                  <p className="text-[11px] text-slate-400">สร้างบัญชีผู้ดูแลระบบโรงเรียนระดับที่ 2</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateAdminModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ชื่อโรงเรียน (School Name) *
                </label>
                <input
                  type="text"
                  required
                  value={adminSchoolName}
                  onChange={(e) => setAdminSchoolName(e.target.value)}
                  placeholder="เช่น โรงเรียนวัดพระปฐมเจดีย์"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    รหัสสถานศึกษา
                  </label>
                  <input
                    type="text"
                    value={adminSchoolCode}
                    onChange={(e) => setAdminSchoolCode(e.target.value)}
                    placeholder="เช่น 1050230045"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    สังกัดหน่วยงาน
                  </label>
                  <input
                    type="text"
                    value={adminAffiliation}
                    onChange={(e) => setAdminAffiliation(e.target.value)}
                    placeholder="เช่น สพป. / สพม."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ชื่อ-นามสกุล ผู้ดูแลระบบ หรือ ผู้บริหาร
                </label>
                <input
                  type="text"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  placeholder="เช่น นายสมเกียรติ วิจิตรศิลป์"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-indigo-300 font-bold mb-1">
                    ID ผู้ดูแลระบบ (Username) *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="เช่น Admin_Watphra"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-indigo-300 font-bold mb-1">
                    รหัสผ่าน (Password) *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl space-y-1">
                <label className="flex items-center gap-2 text-emerald-300 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateSheetOnAdmin}
                    onChange={(e) => setAutoCreateSheetOnAdmin(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                  <span>สร้าง Google Sheet ประจำโรงเรียนนี้ใน Google Drive ทันที (อัตโนมัติ)</span>
                </label>
                <p className="text-[11px] text-slate-400 pl-5">
                  ระบบจะสั่ง Google Apps Script สร้างตารางข้อมูลเฉพาะของโรงเรียนนี้ และย้ายเข้าโฟลเดอร์ Google Drive พร้อมใช้งาน
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAdminModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  บันทึกสร้าง Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Member for specific Admin/School */}
      {isCreateMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">สร้าง ID สมาชิก (บุคลากร)</h3>
                  <p className="text-[11px] text-slate-400">สร้างบัญชีครูและเลือกสังกัด Admin โรงเรียน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateMemberModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  เลือกสังกัดโรงเรียน (Admin) *
                </label>
                <select
                  value={memberSchoolId}
                  onChange={(e) => setMemberSchoolId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.schoolName} (Admin: {a.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">คำนำหน้า</label>
                  <select
                    value={memberPrefix}
                    onChange={(e) => setMemberPrefix(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="ดร.">ดร.</option>
                    <option value="ครู">ครู</option>
                    <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ชื่อจริง *</label>
                  <input
                    type="text"
                    required
                    value={memberFirstName}
                    onChange={(e) => setMemberFirstName(e.target.value)}
                    placeholder="เช่น สมศรี"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={memberLastName}
                    onChange={(e) => setMemberLastName(e.target.value)}
                    placeholder="เช่น ใจดีงาม"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={memberPosition}
                    onChange={(e) => setMemberPosition(e.target.value)}
                    placeholder="เช่น ครูประจำชั้น"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ชั้นที่รับผิดชอบ</label>
                  <select
                    value={memberGrade}
                    onChange={(e) => setMemberGrade(e.target.value as GradeLevel)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold cursor-pointer"
                  >
                    <option value="อ.1">อนุบาล 1 (อ.1)</option>
                    <option value="อ.2">อนุบาล 2 (อ.2)</option>
                    <option value="อ.3">อนุบาล 3 (อ.3)</option>
                    <option value="ป.1">ประถมศึกษาปีที่ 1 (ป.1)</option>
                    <option value="ป.2">ประถมศึกษาปีที่ 2 (ป.2)</option>
                    <option value="ป.3">ประถมศึกษาปีที่ 3 (ป.3)</option>
                    <option value="ป.4">ประถมศึกษาปีที่ 4 (ป.4)</option>
                    <option value="ป.5">ประถมศึกษาปีที่ 5 (ป.5)</option>
                    <option value="ป.6">ประถมศึกษาปีที่ 6 (ป.6)</option>
                    <option value="ม.1">มัธยมศึกษาปีที่ 1 (ม.1)</option>
                    <option value="ม.2">มัธยมศึกษาปีที่ 2 (ม.2)</option>
                    <option value="ม.3">มัธยมศึกษาปีที่ 3 (ม.3)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-blue-300 font-bold mb-1">ID สมาชิก (Username) *</label>
                  <input
                    type="text"
                    required
                    value={memberUsername}
                    onChange={(e) => setMemberUsername(e.target.value)}
                    placeholder="เช่น krusomsri"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-blue-300 font-bold mb-1">รหัสผ่าน (Password) *</label>
                  <input
                    type="text"
                    required
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    placeholder="123"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateMemberModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  บันทึกสร้างสมาชิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Danger Delete Academic Year & Purge All Data */}
      {isDeleteYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/60 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">ยืนยันการลบปีการศึกษา {yearToDelete}</h3>
              <p className="text-xs text-rose-400 font-medium">ลบข้อมูลทั้งหมดในปีการศึกษานี้ถาวร</p>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-left space-y-1 text-xs">
              <span className="inline-block text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-800/60">
                ล้างข้อมูลทั้งระบบ
              </span>
              <div className="text-white font-bold">ปีการศึกษา {yearToDelete}</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ลบคะแนน เวลาเรียน เงินออม สุขภาพ งานมอบหมาย เอกสาร รวมถึงไฟล์ใน Google Drive และ Google Sheets
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-left">
              <label className="block text-slate-300">
                พิมพ์เลขปีการศึกษา <strong className="text-rose-400 font-mono">{yearToDelete}</strong> เพื่อยืนยัน:
              </label>
              <input
                type="text"
                value={confirmYearInput}
                onChange={(e) => setConfirmYearInput(e.target.value)}
                placeholder={`พิมพ์ ${yearToDelete}`}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-center tracking-widest text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteYearModalOpen(false);
                  setConfirmYearInput('');
                }}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                disabled={confirmYearInput.trim() !== yearToDelete || isDeletingYear}
                onClick={handlePurgeAcademicYear}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isDeletingYear ? 'กำลังลบ...' : 'ยืนยันการลบ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Academic Year */}
      {isAddYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">เพิ่มปีการศึกษาใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddYearModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAcademicYear} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ปีการศึกษา (พุทธศักราช) *
                </label>
                <input
                  type="text"
                  required
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="เช่น 2570"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-center text-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddYearModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md"
                >
                  เพิ่มปีการศึกษา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Code.gs Viewer */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold">Google Apps Script (Code.gs)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {hasCopiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{hasCopiedCode ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCodeGs}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดไฟล์</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCodeModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-slate-950 text-slate-200 font-mono text-xs">
              <pre className="whitespace-pre">{CODE_GS_SOURCE}</pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Change Developer Password */}
      {isChangeDevPassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">เปลี่ยนรหัสผ่าน Developer (airfan)</h3>
                  <p className="text-[11px] text-slate-400">รหัสผ่านเริ่มต้นคือ 456789</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeDevPassOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDevPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  รหัสผ่านใหม่สำหรับ ID: airfan
                </label>
                <input
                  type="text"
                  required
                  value={newDevPassword}
                  onChange={(e) => setNewDevPassword(e.target.value)}
                  placeholder="ระบุรหัสผ่านใหม่..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChangeDevPassOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: Confirm Delete Admin (School) & Google Sheets */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/60 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">ยืนยันการลบ ID Admin</h3>
              <p className="text-xs text-slate-400">กรุณาตรวจสอบข้อมูลก่อนยืนยันการลบ</p>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-left space-y-1 text-xs">
              <span className="inline-block text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-800/60">
                บัญชีผู้ดูแลโรงเรียน
              </span>
              <div className="text-white font-bold">{adminToDelete.schoolName}</div>
              <div className="text-indigo-300 font-mono text-[11px]">ID: {adminToDelete.username}</div>
              {adminToDelete.googleSheetId && (
                <div className="text-emerald-400 font-mono text-[10px] truncate">
                  Sheet: {adminToDelete.googleSheetId}
                </div>
              )}
            </div>

            <p className="text-[11px] text-rose-400 font-medium">
              * ลบบัญชี ข้อมูลโรงเรียน และ Google Sheets อัตโนมัติ
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteAdminNow}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: Confirm Delete Member */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/60 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">ยืนยันการลบสมาชิก</h3>
              <p className="text-xs text-slate-400">กรุณาตรวจสอบข้อมูลก่อนยืนยันการลบ</p>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-left text-xs space-y-1">
              <span className="inline-block text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-800/60">
                บัญชีสมาชิกบุคลากร
              </span>
              <p className="text-white font-bold">{memberToDelete.fullName}</p>
              <p className="text-slate-400 font-mono text-[11px]">ID: {memberToDelete.username}</p>
              <p className="text-indigo-300 text-[11px]">{memberToDelete.schoolName}</p>
            </div>

            <p className="text-[11px] text-rose-400 font-medium">
              * ลบออกจากระบบและ Google Sheets ถาวร
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteMemberNow}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: Change Admin Password */}
      {adminToChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">เปลี่ยนรหัสผ่าน Admin โรงเรียน</h3>
                  <p className="text-[11px] text-slate-400">อัปเดตรหัสผ่านพร้อมซิงค์ลงฐานข้อมูลทันที</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminToChangePassword(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">โรงเรียน:</span>
                <strong className="text-white">{adminToChangePassword.schoolName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ID (Username):</span>
                <strong className="text-indigo-300 font-mono">{adminToChangePassword.username}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">รหัสผ่านปัจจุบัน:</span>
                <span className="text-amber-300 font-mono">{adminToChangePassword.password || '123456'}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmChangeAdminPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  ระบุรหัสผ่านใหม่ (New Password) *
                </label>
                <input
                  type="text"
                  required
                  value={newAdminPasswordInput}
                  onChange={(e) => setNewAdminPasswordInput(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่ของ Admin..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdminToChangePassword(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 10: Change Member Password */}
      {memberToChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-blue-500/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">เปลี่ยนรหัสผ่านสมาชิก (บุคลากร)</h3>
                  <p className="text-[11px] text-slate-400">อัปเดตรหัสผ่านพร้อมซิงค์ลงฐานข้อมูลทันที</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMemberToChangePassword(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">ชื่อ - นามสกุล:</span>
                <strong className="text-white">{memberToChangePassword.fullName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">สังกัดโรงเรียน:</span>
                <span className="text-indigo-300">{memberToChangePassword.schoolName || 'โรงเรียนหลัก'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ID (Username):</span>
                <strong className="text-emerald-400 font-mono">{memberToChangePassword.username}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">รหัสผ่านปัจจุบัน:</span>
                <span className="text-amber-300 font-mono">{memberToChangePassword.password || '123'}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmChangeMemberPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  ระบุรหัสผ่านใหม่ (New Password) *
                </label>
                <input
                  type="text"
                  required
                  value={newMemberPasswordInput}
                  onChange={(e) => setNewMemberPasswordInput(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่ของสมาชิก..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMemberToChangePassword(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
