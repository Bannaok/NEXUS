import React, { useState, useRef } from 'react';
import { 
  SchoolInfo, 
  MemberAccount, 
  UserSession,
  GradeLevel,
  Student
} from '../types';
import { StorageService } from '../services/storage';
import { 
  Settings, 
  Building2, 
  Check, 
  Plus, 
  X, 
  Upload, 
  UserCheck, 
  Lock,
  Phone,
  Calendar,
  LogOut
} from 'lucide-react';
import { cleanTeacherName } from './ModuleDataOthers';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface SettingsProps {
  user: UserSession;
  schoolInfo: SchoolInfo;
  members: MemberAccount[];
  students?: Student[];
  onClose: () => void;
  onSaveSchoolInfo: (info: SchoolInfo) => void;
  onSaveMember: (member: MemberAccount) => void;
  onDeleteMember?: (id: string) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  onSaveUserSession?: (user: UserSession) => void;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsProps> = ({
  user,
  schoolInfo,
  members,
  students,
  onClose,
  onSaveSchoolInfo,
  onSaveMember,
  onDeleteMember,
  onShowToast,
  onSaveUserSession,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'school'>(user.role === 'admin' ? 'school' : 'profile');
  const [confirmDeleteSetting, setConfirmDeleteSetting] = useState<{
    type: 'avatar' | 'homeroom_slot' | 'school_logo';
    title: string;
    categoryLabel: string;
    itemTitle: string;
    itemSubtitle?: string;
    slotIndex?: number;
  } | null>(null);

  // Profile Form States (Requirement 10.2) - Ensure prefix (e.g., นาย) and firstName (e.g., อีรฟัน) have no space between them
  const parsedPrefixMatch = (user.fullName || '').trim().match(/^(นางสาว|นาย|นาง|ดร\.|ครู|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี)/u);
  const [userPrefix, setUserPrefix] = useState<string>(user.prefix || (parsedPrefixMatch ? parsedPrefixMatch[1] : 'นาย'));
  const [userFirstName, setUserFirstName] = useState<string>(() => {
    const stripped = (user.fullName || '').trim().replace(/^(นางสาว|นาย|นาง|ดร\.|ครู|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี)\s*/u, '');
    const rawFirst = user.firstName || stripped.split(/\s+/)[0] || '';
    return rawFirst.replace(/^(นางสาว|นาย|นาง|ดร\.|ครู|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี)\s*/u, '').trim();
  });
  const [userLastName, setUserLastName] = useState<string>(() => {
    if (user.lastName) return user.lastName.trim();
    const stripped = (user.fullName || '').trim().replace(/^(นางสาว|นาย|นาง|ดร\.|ครู|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี)\s*/u, '');
    return stripped.split(/\s+/).slice(1).join(' ').trim();
  });
  const [userHomeroomClasses, setUserHomeroomClasses] = useState<Array<{ gradeLevel: string; room: string }>>(() => {
    const foundMem = members.find(m => m.id === user.id || m.username.toLowerCase() === user.username.toLowerCase());
    const rawClasses =
      (user.assignedClasses && user.assignedClasses.length > 0 ? user.assignedClasses : undefined) ||
      (foundMem?.assignedClasses && foundMem.assignedClasses.length > 0 ? foundMem.assignedClasses : undefined);
    if (rawClasses && rawClasses.length > 0) {
      return rawClasses.map(c => ({
        gradeLevel: (c.gradeLevel as string) || 'ป.1',
        room: (c.room || '1').toString().trim().replace(/^ห้อง\s*/, '') || '1'
      }));
    }
    const rawGrade = (user.assignedGrade as string) || (foundMem?.gradeLevel as string) || 'ป.1';
    const rawRoom = (user.assignedRoom || foundMem?.room || '1').toString().trim().replace(/^ห้อง\s*/, '') || '1';
    if (rawGrade.includes(',')) {
      return rawGrade
        .split(',')
        .map(g => g.trim())
        .filter(Boolean)
        .map(g => ({ gradeLevel: g, room: rawRoom }));
    }
    return [{ gradeLevel: rawGrade, room: rawRoom }];
  });

  // Dynamically detect rooms from students for any selected grade
  const allStudentsList = students && students.length > 0 ? students : StorageService.getStudents();
  const getAvailableRoomsForGrade = (targetGrade: string, currentRoom?: string): string[] => {
    const rooms = new Set<string>(['1']);
    allStudentsList
      .filter(s => (s.gradeLevel || '').trim() === targetGrade)
      .forEach(s => {
        const r = (s.room || '1').toString().trim().replace(/^ห้อง\s*/, '') || '1';
        if (r) rooms.add(r);
      });
    members
      .filter(m => {
        if ((m.gradeLevel || '').trim() === targetGrade && m.room) return true;
        if (m.assignedClasses?.some(c => (c.gradeLevel || '').trim() === targetGrade && c.room)) return true;
        return false;
      })
      .forEach(m => {
        if ((m.gradeLevel || '').trim() === targetGrade && m.room) {
          const r = (m.room || '1').toString().trim().replace(/^ห้อง\s*/, '') || '1';
          if (r) rooms.add(r);
        }
        m.assignedClasses?.forEach(c => {
          if ((c.gradeLevel || '').trim() === targetGrade && c.room) {
            const r = (c.room || '1').toString().trim().replace(/^ห้อง\s*/, '') || '1';
            if (r) rooms.add(r);
          }
        });
      });
    if (currentRoom) rooms.add(currentRoom);
    return Array.from(rooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const ALL_GRADE_OPTIONS = [
    { value: 'อ.1', label: 'ชั้นอนุบาล 1 (อ.1)' },
    { value: 'อ.2', label: 'ชั้นอนุบาล 2 (อ.2)' },
    { value: 'อ.3', label: 'ชั้นอนุบาล 3 (อ.3)' },
    { value: 'ป.1', label: 'ชั้นประถมศึกษาปีที่ 1 (ป.1)' },
    { value: 'ป.2', label: 'ชั้นประถมศึกษาปีที่ 2 (ป.2)' },
    { value: 'ป.3', label: 'ชั้นประถมศึกษาปีที่ 3 (ป.3)' },
    { value: 'ป.4', label: 'ชั้นประถมศึกษาปีที่ 4 (ป.4)' },
    { value: 'ป.5', label: 'ชั้นประถมศึกษาปีที่ 5 (ป.5)' },
    { value: 'ป.6', label: 'ชั้นประถมศึกษาปีที่ 6 (ป.6)' },
    { value: 'ม.1', label: 'ชั้นมัธยมศึกษาปีที่ 1 (ม.1)' },
    { value: 'ม.2', label: 'ชั้นมัธยมศึกษาปีที่ 2 (ม.2)' },
    { value: 'ม.3', label: 'ชั้นมัธยมศึกษาปีที่ 3 (ม.3)' },
    { value: 'ม.4', label: 'ชั้นมัธยมศึกษาปีที่ 4 (ม.4)' },
    { value: 'ม.5', label: 'ชั้นมัธยมศึกษาปีที่ 5 (ม.5)' },
    { value: 'ม.6', label: 'ชั้นมัธยมศึกษาปีที่ 6 (ม.6)' }
  ];

  const handleAddHomeroomClassSlot = () => {
    const usedGrades = new Set(userHomeroomClasses.map(c => c.gradeLevel));
    const nextDefault = ALL_GRADE_OPTIONS.find(g => !usedGrades.has(g.value))?.value || 'ป.1';
    setUserHomeroomClasses(prev => [...prev, { gradeLevel: nextDefault, room: '1' }]);
  };

  const handleRemoveHomeroomClassSlot = (index: number) => {
    setUserHomeroomClasses(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateHomeroomGrade = (index: number, nextGrade: string) => {
    if (index === 0 && nextGrade === 'ไม่ได้เป็นครูประจำชั้น') {
      setUserHomeroomClasses([{ gradeLevel: 'ไม่ได้เป็นครูประจำชั้น', room: '1' }]);
      return;
    }
    setUserHomeroomClasses(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const nextRooms = getAvailableRoomsForGrade(nextGrade);
        const validRoom = nextRooms.includes(item.room) ? item.room : '1';
        return { gradeLevel: nextGrade, room: validRoom };
      })
    );
  };

  const handleUpdateHomeroomRoom = (index: number, nextRoom: string) => {
    setUserHomeroomClasses(prev =>
      prev.map((item, i) => (i === index ? { ...item, room: nextRoom } : item))
    );
  };

  const [userLearningGroup, setUserLearningGroup] = useState<string>(
    user.learningGroup || 'กลุ่มสาระการเรียนรู้ภาษาไทย'
  );
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>(
    user.avatarUrl || ''
  );
  const [userPhone, setUserPhone] = useState<string>(user.phone || '');
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  // Leave Round selection state (Admin control: ครั้งที่ 1 vs ครั้งที่ 2)
  const [selectedLeaveRound, setSelectedLeaveRound] = useState<'1' | '2'>(schoolInfo.leaveRound || '1');
  const [selectedLeaveFiscalYear, setSelectedLeaveFiscalYear] = useState<string>(
    schoolInfo.leaveRoundFiscalYear || schoolInfo.academicYear || '2569'
  );

  // School Logo state
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string>(schoolInfo.logoUrl || '');
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Academic Years state & Add Year Modal state
  const [academicYears, setAcademicYears] = useState<string[]>(() => StorageService.getAcademicYears());
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(schoolInfo.academicYear || '2569');
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  const handleAddNewAcademicYear = () => {
    const trimmed = newYearInput.trim();
    if (!trimmed) {
      onShowToast('warning', 'กรอกปีการศึกษา', 'กรุณากรอกปีการศึกษา (เช่น 2570)');
      return;
    }
    const updated = StorageService.addAcademicYear(trimmed);
    setAcademicYears(updated);
    setSelectedAcademicYear(trimmed);
    setIsAddYearModalOpen(false);
    setNewYearInput('');
    onShowToast('success', 'เพิ่มปีการศึกษาสำเร็จ', `เพิ่มปีการศึกษา ${trimmed} เข้าสู่ระบบเรียบร้อยแล้ว`);
  };

  // Handle Logo Image File Change
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('warning', 'ไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          setSchoolLogoUrl(dataUrl);
          onShowToast('info', 'เลือกรูปโลโก้สำเร็จ', 'กดบันทึกข้อมูลโรงเรียนด้านล่างเพื่อจัดเก็บตราสัญลักษณ์ลง Google Drive');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle User Avatar File Change (Requirement 10.2)
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('warning', 'ไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          setUserAvatarUrl(dataUrl);
          onShowToast('info', 'เลือกรูปโปรไฟล์สำเร็จ', 'กดบันทึกข้อมูลส่วนตัวด้านล่างเพื่อจัดเก็บรูปโปรไฟล์ลง Google Drive');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle Save Profile Form (Requirement: include contact phone & attach prefix directly to firstName with no space)
  const handleSaveProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirst = userFirstName.trim().replace(/^(นางสาว|นาย|นาง|ดร\.|ครู|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี)\s*/u, '');
    const cleanLast = userLastName.trim();
    const full = `${userPrefix.trim()}${cleanFirst}${cleanLast ? ` ${cleanLast}` : ''}`.trim();

    const isHomeroom =
      userHomeroomClasses.length > 0 &&
      userHomeroomClasses[0].gradeLevel !== 'ไม่ได้เป็นครูประจำชั้น';

    const seenClassKeys = new Set<string>();
    const normalizedClasses = isHomeroom
      ? userHomeroomClasses
          .filter(c => c.gradeLevel && c.gradeLevel !== 'ไม่ได้เป็นครูประจำชั้น')
          .map(c => ({
            gradeLevel: c.gradeLevel.trim(),
            room: (c.room || '1').toString().trim().replace(/^ห้อง\s*/, '') || '1'
          }))
          .filter(c => {
            const key = `${c.gradeLevel}_${c.room}`;
            if (seenClassKeys.has(key)) return false;
            seenClassKeys.add(key);
            return true;
          })
      : [];

    const primaryGrade = normalizedClasses[0]?.gradeLevel;
    const primaryRoom = normalizedClasses[0]?.room;

    const updatedUser: UserSession = {
      ...user,
      prefix: userPrefix.trim(),
      firstName: cleanFirst,
      lastName: cleanLast,
      fullName: full || user.fullName,
      phone: userPhone,
      assignedGrade: isHomeroom ? primaryGrade : undefined,
      assignedRoom: isHomeroom ? primaryRoom : undefined,
      assignedClasses: isHomeroom ? normalizedClasses : [],
      learningGroup: userLearningGroup,
      avatarUrl: userAvatarUrl
    };

    if (onSaveUserSession) {
      onSaveUserSession(updatedUser);
    } else {
      StorageService.setSession(updatedUser);
    }

    // Also update member list record if match
    const foundMem = members.find(m => m.id === user.id || m.username.toLowerCase() === user.username.toLowerCase());
    if (foundMem) {
      onSaveMember({
        ...foundMem,
        prefix: userPrefix,
        firstName: userFirstName,
        lastName: userLastName,
        fullName: full || foundMem.fullName,
        phone: userPhone,
        gradeLevel: (isHomeroom ? primaryGrade : undefined) as GradeLevel,
        room: isHomeroom ? primaryRoom : undefined,
        assignedClasses: isHomeroom ? normalizedClasses : [],
        learningGroup: userLearningGroup,
        avatarUrl: userAvatarUrl
      });
    }

    // Also synchronize phone & homeroom grade/room to matching Personnel record
    try {
      const allPersonnel = StorageService.getPersonnel();
      const matchedP = allPersonnel.find(p => 
        p.id === user.id || 
        cleanTeacherName(`${p.prefix}${p.firstName} ${p.lastName}`) === cleanTeacherName(full) ||
        cleanTeacherName(`${p.firstName} ${p.lastName}`) === cleanTeacherName(full)
      );
      if (matchedP) {
        StorageService.savePersonnel({
          ...matchedP,
          phone: userPhone || matchedP.phone,
          prefix: userPrefix || matchedP.prefix,
          firstName: userFirstName || matchedP.firstName,
          lastName: userLastName || matchedP.lastName,
          advisorGrade: isHomeroom ? normalizedClasses.map(c => c.gradeLevel).join(', ') : '',
          advisorRoom: isHomeroom ? primaryRoom : undefined,
          advisorClasses: isHomeroom ? normalizedClasses : []
        });
      }
    } catch {
      // ignore sync errors
    }

    const classesSummaryText = normalizedClasses
      .map(c => `${c.gradeLevel} ห้อง ${c.room}`)
      .join(', ');

    onShowToast(
      'success',
      'บันทึกข้อมูลส่วนตัวสำเร็จ 🎉',
      isHomeroom
        ? `อัปเดตข้อมูลครูประจำชั้น (${classesSummaryText}) เรียบร้อยแล้ว`
        : 'อัปเดตข้อมูลส่วนตัว เบอร์โทรติดต่อ และรูปโปรไฟล์เรียบร้อยแล้ว'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/90 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center border border-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">ตั้งค่าระบบ (System Settings)</h2>
              <p className="hidden sm:block text-xs text-slate-400">
                จัดการฐานข้อมูล Google Sheets, บัญชีสมาชิก และข้อมูลโปรไฟล์ส่วนตัว
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="ปิดหน้าต่างตั้งค่า"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub Tabs Bar */}
        <div className="bg-slate-100/80 px-6 py-2 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto shrink-0">
          {user.role !== 'admin' && (
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>โปรไฟล์ & ข้อมูลส่วนตัว</span>
            </button>
          )}

          {/* Member management removed from Admin settings (Developer only) */}

          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => setActiveTab('school')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'school'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>ตั้งค่าโรงเรียน</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="ml-auto px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-rose-200 shrink-0"
              title="ออกจากระบบ"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>ออกจากระบบ</span>
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 0: PERSONAL PROFILE SETTINGS (Requirement 10.2) */}
          {user.role !== 'admin' && activeTab === 'profile' && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs max-w-2xl mx-auto space-y-5">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-600" />
                    <span>ตั้งค่าโปรไฟล์และข้อมูลส่วนตัว</span>
                  </h3>
                  <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
                    อัปโหลดรูปประจำตัว กำหนดคำนำหน้า ชื่อ-สกุล ชั้นประจำชั้น และกลุ่มสาระการเรียนรู้
                  </p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border ${
                  user.role === 'developer'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'hidden sm:inline-block bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {user.role === 'developer' ? 'ผู้พัฒนาระบบ (Developer)' : 'ครูผู้สอน / สมาชิก'}
                </span>
              </div>

              <form onSubmit={handleSaveProfileSubmit} className="space-y-4">
                {/* 1. Avatar Image Upload */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    รูปประจำตัว / รูปโปรไฟล์ (อัปโหลดจากอุปกรณ์) *
                  </label>

                  <input
                    type="file"
                    ref={avatarFileInputRef}
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />

                  <div className="flex items-center gap-4 pt-1">
                    <div
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-indigo-300 hover:border-indigo-500 overflow-hidden flex items-center justify-center cursor-pointer transition-all shrink-0 shadow-2xs group relative"
                      title="คลิกเพื่อเลือกไฟล์รูปภาพโปรไฟล์"
                    >
                      {userAvatarUrl ? (
                        <>
                          <img
                            src={userAvatarUrl}
                            alt="Profile Avatar"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                            เปลี่ยนรูป
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-indigo-400 p-2 text-center">
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-bold text-indigo-600">อัปโหลดรูป</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => avatarFileInputRef.current?.click()}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{userAvatarUrl ? 'เปลี่ยนรูปภาพโปรไฟล์' : 'เลือกไฟล์รูปภาพโปรไฟล์'}</span>
                        </button>

                        {userAvatarUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteSetting({
                                type: 'avatar',
                                title: 'ยืนยันการลบรูปโปรไฟล์',
                                categoryLabel: 'ข้อมูลส่วนตัว',
                                itemTitle: 'รูปภาพโปรไฟล์ของคุณ',
                                itemSubtitle: `${userPrefix}${userFirstName} ${userLastName}`.trim()
                              })
                            }
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                          >
                            ลบรูป
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        รองรับไฟล์ JPG, PNG, WebP
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Prefix & Names */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      คำนำหน้า *
                    </label>
                    <select
                      value={userPrefix}
                      onChange={(e) => setUserPrefix(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อจริง *
                    </label>
                    <input
                      type="text"
                      required
                      value={userFirstName}
                      onChange={(e) => setUserFirstName(e.target.value)}
                      placeholder="ชื่อ"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      นามสกุล *
                    </label>
                    <input
                      type="text"
                      required
                      value={userLastName}
                      onChange={(e) => setUserLastName(e.target.value)}
                      placeholder="นามสกุล"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                    />
                  </div>
                </div>

                {/* 3. Grade & Learning Group */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div className="space-y-3">
                    {userHomeroomClasses.map((clsItem, idx) => {
                      const roomsForThisGrade = getAvailableRoomsForGrade(clsItem.gradeLevel, clsItem.room);
                      const isFirst = idx === 0;
                      const isNotHomeroom = clsItem.gradeLevel === 'ไม่ได้เป็นครูประจำชั้น';
                      return (
                        <div
                          key={idx}
                          className={
                            isFirst
                              ? 'space-y-2'
                              : 'p-3 bg-indigo-50/40 rounded-xl border border-indigo-200/80 space-y-2 relative'
                          }
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <label className="block text-xs font-semibold text-slate-700">
                              {isFirst ? 'ครูประจำชั้นระดับชั้น *' : `ครูประจำชั้นระดับชั้นที่ ${idx + 1} *`}
                            </label>
                            {isFirst && !isNotHomeroom && (
                              <button
                                type="button"
                                onClick={handleAddHomeroomClassSlot}
                                className="w-6 h-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0"
                                title="เพิ่มช่องครูประจำชั้นอีกชั้น"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            )}
                            {!isFirst && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDeleteSetting({
                                    type: 'homeroom_slot',
                                    title: 'ยืนยันการลบชั้นประจำชั้น',
                                    categoryLabel: 'ครูประจำชั้น',
                                    itemTitle: `ชั้นประจำชั้นที่ ${idx + 1}: ${clsItem.gradeLevel} ห้อง ${clsItem.room}`,
                                    slotIndex: idx
                                  })
                                }
                                className="w-5 h-5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                title="ลบชั้นประจำชั้นนี้"
                              >
                                <X className="w-3 h-3 stroke-[2.5]" />
                              </button>
                            )}
                          </div>

                          <select
                            value={clsItem.gradeLevel}
                            onChange={(e) => handleUpdateHomeroomGrade(idx, e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer"
                          >
                            {ALL_GRADE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                            {isFirst && (
                              <option value="ไม่ได้เป็นครูประจำชั้น">ไม่ได้เป็นครูประจำชั้น</option>
                            )}
                          </select>

                          {!isNotHomeroom && (
                            <div className="pt-0.5">
                              <label className="block text-[11px] font-bold text-indigo-700 mb-1.5">
                                เลือกห้องประจำชั้น ({clsItem.gradeLevel}) *
                              </label>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {roomsForThisGrade.map(rm => {
                                  const isSelected = clsItem.room === rm;
                                  const countInRoom = allStudentsList.filter(
                                    s =>
                                      (s.gradeLevel || '').trim() === clsItem.gradeLevel &&
                                      ((s.room || '1').toString().trim().replace(/^ห้อง\s*/, '') || '1') === rm
                                  ).length;
                                  return (
                                    <button
                                      key={rm}
                                      type="button"
                                      onClick={() => handleUpdateHomeroomRoom(idx, rm)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                                      }`}
                                    >
                                      <span>ห้อง {rm}</span>
                                      <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                                          isSelected ? 'bg-indigo-500 text-indigo-100' : 'bg-slate-100 text-slate-500'
                                        }`}
                                      >
                                        {countInRoom} คน
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      กลุ่มสาระการเรียนรู้ *
                    </label>
                    <select
                      value={userLearningGroup}
                      onChange={(e) => setUserLearningGroup(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white cursor-pointer"
                    >
                      <option value="กลุ่มสาระการเรียนรู้ภาษาไทย">กลุ่มสาระการเรียนรู้ภาษาไทย</option>
                      <option value="กลุ่มสาระการเรียนรู้คณิตศาสตร์">กลุ่มสาระการเรียนรู้คณิตศาสตร์</option>
                      <option value="กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี">กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี</option>
                      <option value="กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม">กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม</option>
                      <option value="กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา">กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา</option>
                      <option value="กลุ่มสาระการเรียนรู้ศิลปะ">กลุ่มสาระการเรียนรู้ศิลปะ</option>
                      <option value="กลุ่มสาระการเรียนรู้การงานอาชีพ">กลุ่มสาระการเรียนรู้การงานอาชีพ</option>
                      <option value="กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ">กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ</option>
                      <option value="งานบริหารวิชาการ / ธุรการโรงเรียน">งานบริหารวิชาการ / ธุรการโรงเรียน</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>
                </div>

                {/* 4. Contact Phone (Requirement: เบอร์โทรติดต่อสำหรับสมาชิก) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>เบอร์โทรติดต่อ (สำหรับสมาชิกเพื่อนำไปใช้ในระบบการลาและเอกสารราชการ)</span>
                  </label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    * เมื่อบันทึกแล้ว เบอร์โทรนี้จะถูกเชื่อมโยงไปยังแบบใบลาป่วย ลากิจส่วนตัว และข้อมูลติดต่ออัตโนมัติ
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>บันทึกข้อมูลส่วนตัว</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Google Sheets tab content removed (Developer only) */}

          {/* Member management tab removed (Developer only) */}

          {/* TAB 3: SCHOOL SETTINGS */}
          {user.role === 'admin' && activeTab === 'school' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs max-w-2xl mx-auto space-y-5">

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const fd = new FormData(form);
                  const updated: SchoolInfo = {
                    ...schoolInfo,
                    schoolName: fd.get('schoolName') as string,
                    schoolCode: fd.get('schoolCode') as string,
                    affiliation: fd.get('affiliation') as string,
                    logoUrl: schoolLogoUrl,
                    academicYear: fd.get('academicYear') as string,
                    semester: fd.get('semester') as string,
                    leaveRound: selectedLeaveRound,
                    leaveRoundFiscalYear: selectedLeaveFiscalYear
                  };
                  onSaveSchoolInfo(updated);
                  onShowToast('success', 'บันทึกสำเร็จ', 'อัปเดตข้อมูลโรงเรียนและระบบรอบการลาเรียบร้อยแล้ว');
                }}
                className="space-y-4"
              >
                {/* School Emblem / Logo File Upload Picker */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    ตราสัญลักษณ์ / โลโก้โรงเรียน (อัปโหลดรูปภาพจากอุปกรณ์)
                  </label>

                  <input
                    type="file"
                    ref={logoFileInputRef}
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />

                  <div className="flex items-center gap-4 pt-1">
                    <div
                      onClick={() => logoFileInputRef.current?.click()}
                      className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 hover:border-emerald-500 overflow-hidden flex items-center justify-center cursor-pointer transition-all shrink-0 shadow-2xs group relative"
                      title="คลิกเพื่อเลือกไฟล์ตราสัญลักษณ์โรงเรียน"
                    >
                      {schoolLogoUrl ? (
                        <>
                          <img
                            src={schoolLogoUrl}
                            alt="School Logo"
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                            เปลี่ยนรูป
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                          <Upload className="w-5 h-5 text-emerald-600 mb-1" />
                          <span className="text-[10px] font-semibold text-slate-600">อัปโหลดตราสัญลักษณ์</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{schoolLogoUrl ? 'เปลี่ยนไฟล์รูปภาพตราสัญลักษณ์' : 'เลือกไฟล์รูปภาพจากอุปกรณ์'}</span>
                        </button>

                        {schoolLogoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteSetting({
                                type: 'school_logo',
                                title: 'ยืนยันการลบตราสัญลักษณ์',
                                categoryLabel: 'ตั้งค่าโรงเรียน',
                                itemTitle: 'ตราสัญลักษณ์ / โลโก้โรงเรียน',
                                itemSubtitle: schoolInfo.schoolName
                              })
                            }
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                          >
                            ลบรูป
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        รองรับไฟล์ JPG, PNG, WebP (ระบบจะบีบอัดภาพให้อัตโนมัติ เพื่อนำไปแสดงในหัวกระดาษและรายงาน)
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อโรงเรียน *
                  </label>
                  <input
                    type="text"
                    name="schoolName"
                    required
                    defaultValue={schoolInfo.schoolName}
                    placeholder="เช่น บ้านนาออก"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  />

                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      รหัสสถานศึกษา
                    </label>
                    <input
                      type="text"
                      name="schoolCode"
                      defaultValue={schoolInfo.schoolCode}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      สังกัดหน่วยงาน
                    </label>
                    <input
                      type="text"
                      name="affiliation"
                      defaultValue={schoolInfo.affiliation}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-indigo-950">
                        ปีการศึกษาหลักของระบบ *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextYr = String(Math.max(...academicYears.map(Number), 2568) + 1);
                          setNewYearInput(nextYr);
                          setIsAddYearModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="คลิกเพื่อเพิ่มปีการศึกษาใหม่"
                      >
                        <Plus className="w-3 h-3" />
                        <span>เพิ่มปีการศึกษา</span>
                      </button>
                    </div>

                    <select
                      name="academicYear"
                      value={selectedAcademicYear}
                      onChange={(e) => setSelectedAcademicYear(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-indigo-200 bg-white text-indigo-950 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      {academicYears.map(yr => (
                        <option key={yr} value={yr}>ปีการศึกษา {yr}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                      ภาคเรียนหลักของระบบ *
                    </label>
                    <select
                      name="semester"
                      defaultValue={schoolInfo.semester}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-indigo-200 bg-white text-indigo-950 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="1">ภาคเรียนที่ 1</option>
                      <option value="2">ภาคเรียนที่ 2</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 text-[11px] text-indigo-900 bg-white/80 p-2.5 rounded-xl border border-indigo-100 flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>ล็อกการแสดงผลของสมาชิก (ครูประจำชั้น):</strong> ปีการศึกษาและภาคเรียนนี้จะถูกใช้เป็นค่าหลักในทุกระบบ (เวลาเรียน, งานวัดผล, ธุรการ, ปฏิทินวิชาการ) ทำให้สมาชิกแสดงข้อมูลตรงกันและไม่สามารถกดเปลี่ยนเองได้
                    </div>
                  </div>
                </div>

                {/* ADMIN LEAVE SYSTEM ROUND CONFIGURATION CARD */}
                <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-slate-50 rounded-2xl border border-indigo-100/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-indigo-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span>ระบบการลา: กำหนดรอบการประเมินและการนับสถิติ</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                            Admin กำหนด
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          เมื่อ Admin กำหนดเลือกครั้งที่... แล้ว สมาชิกจะแสดงครั้งนั้นๆ และการนับสถิติการลาจะเริ่มนับใหม่ตามรอบที่เลือก
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-indigo-950 font-bold bg-white px-3 py-1 rounded-xl border border-indigo-200">
                      <span>ปีงบประมาณ:</span>
                      <select
                        value={selectedLeaveFiscalYear}
                        onChange={(e) => setSelectedLeaveFiscalYear(e.target.value)}
                        className="font-bold text-indigo-700 bg-transparent focus:outline-none cursor-pointer"
                      >
                        {academicYears.map(yr => (
                          <option key={yr} value={yr}>พ.ศ. {yr}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2 Big Choice Buttons: ครั้งที่ 1 vs ครั้งที่ 2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedLeaveRound('1')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start justify-between gap-3 relative ${
                        selectedLeaveRound === '1'
                          ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                          : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center ${
                            selectedLeaveRound === '1' ? 'bg-indigo-600 ring-2 ring-indigo-200' : 'bg-slate-300'
                          }`}>
                            {selectedLeaveRound === '1' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          <strong className="text-xs font-bold text-slate-900">
                            ครั้งที่ 1 (1 ตุลาคม – 31 มีนาคม)
                          </strong>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-5">
                          รอบการประเมินครึ่งปีแรก เริ่มนับสถิติการลาใหม่จาก 0 วัน
                        </p>
                      </div>
                      {selectedLeaveRound === '1' && (
                        <span className="p-1.5 bg-indigo-600 text-white rounded-xl shrink-0 shadow-2xs">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedLeaveRound('2')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start justify-between gap-3 relative ${
                        selectedLeaveRound === '2'
                          ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-200'
                          : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center ${
                            selectedLeaveRound === '2' ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-slate-300'
                          }`}>
                            {selectedLeaveRound === '2' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          <strong className="text-xs font-bold text-slate-900">
                            ครั้งที่ 2 (1 เมษายน – 30 กันยายน)
                          </strong>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-5">
                          รอบการประเมินครึ่งปีหลัง เริ่มนับสถิติการลาใหม่จาก 0 วัน
                        </p>
                      </div>
                      {selectedLeaveRound === '2' && (
                        <span className="p-1.5 bg-blue-600 text-white rounded-xl shrink-0 shadow-2xs">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="text-[11px] text-indigo-900 bg-white/90 p-2.5 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <span>
                      📌 <strong>รอบที่เลือกใช้งาน:</strong> ครั้งที่ {selectedLeaveRound} ({selectedLeaveRound === '1' ? '1 ตุลาคม – 31 มีนาคม' : '1 เมษายน – 30 กันยายน'}) ปีงบประมาณ {selectedLeaveFiscalYear}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      สมาชิกจะแสดงรอบนี้โดยอัตโนมัติ
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer active:scale-95"
                  >
                    บันทึกการตั้งค่า
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* MODAL: Admin Add Academic Year */}
      {isAddYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>เพิ่มปีการศึกษาใหม่</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddYearModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ปีการศึกษา (พ.ศ.) *
                </label>
                <input
                  type="text"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="เช่น 2570"
                  autoFocus
                  className="w-full text-sm font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                เมื่อเพิ่มแล้ว ปีการศึกษานี้จะปรากฏในตัวเลือกของทั้งระบบ และสามารถเลือกเป็นปีการศึกษาหลักได้
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddYearModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddNewAcademicYear}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>เพิ่มปีการศึกษา</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(confirmDeleteSetting)}
        title={confirmDeleteSetting?.title || 'ยืนยันการลบข้อมูล'}
        categoryLabel={confirmDeleteSetting?.categoryLabel}
        itemTitle={confirmDeleteSetting?.itemTitle || ''}
        itemSubtitle={confirmDeleteSetting?.itemSubtitle}
        onCancel={() => setConfirmDeleteSetting(null)}
        onConfirm={() => {
          if (!confirmDeleteSetting) return;
          if (confirmDeleteSetting.type === 'avatar') {
            setUserAvatarUrl('');
          } else if (confirmDeleteSetting.type === 'homeroom_slot' && typeof confirmDeleteSetting.slotIndex === 'number') {
            handleRemoveHomeroomClassSlot(confirmDeleteSetting.slotIndex);
          } else if (confirmDeleteSetting.type === 'school_logo') {
            setSchoolLogoUrl('');
          }
          setConfirmDeleteSetting(null);
        }}
      />
    </div>
  );
};
