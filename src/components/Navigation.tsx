import React, { useState } from 'react';
import { 
  Home, 
  Users, 
  Award, 
  CalendarCheck, 
  ClipboardList, 
  FileText, 
  Globe, 
  BarChart3, 
  Settings,
  Activity,
  Lock,
  ChevronDown,
  ChevronUp,
  LayoutGrid
} from 'lucide-react';

import { UserSession } from '../types';

export type NavTab = 
  | 'dashboard'
  | 'classroom'
  | 'data_others'
  | 'grading'
  | 'attendance_savings'
  | 'assignments'
  | 'documents'
  | 'websites'
  | 'reports'
  | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingTasksCount: number;
  user?: UserSession;
  disableAssignments?: boolean;
  disableDocuments?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  pendingTasksCount,
  user,
  disableAssignments = false,
  disableDocuments = false
}) => {
  const menuItems: { 
    id: NavTab; 
    label: string; 
    subLabel: string;
    icon: React.ReactNode; 
    badge?: number; 
    color: string;
    activeColor: string;
    disabled?: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'หน้าหลัก',
      subLabel: 'ปฏิทินกิจกรรม',
      icon: <Home className="w-4 h-4 sm:w-5 sm:h-5" />,
      badge: !disableAssignments && pendingTasksCount > 0 ? pendingTasksCount : undefined,
      color: 'text-indigo-600 bg-indigo-50',
      activeColor: 'bg-indigo-600 text-white'
    },
    {
      id: 'classroom',
      label: 'ธุรการ',
      subLabel: 'บันทึกสุขภาพ',
      icon: <Activity className="w-4 h-4 sm:w-5 sm:h-5" />,
      color: 'text-blue-600 bg-blue-50',
      activeColor: 'bg-blue-600 text-white'
    },
    {
      id: 'data_others',
      label: 'ข้อมูล/อื่นๆ',
      subLabel: 'นักเรียน/ครู/รร.',
      icon: <Users className="w-4 h-4 sm:w-5 sm:h-5" />,
      color: 'text-cyan-600 bg-cyan-50',
      activeColor: 'bg-cyan-600 text-white'
    },
    {
      id: 'attendance_savings',
      label: 'เวลาเรียน',
      subLabel: 'เงินฝากออม',
      icon: <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5" />,
      color: 'text-emerald-600 bg-emerald-50',
      activeColor: 'bg-emerald-600 text-white'
    },
    {
      id: 'grading',
      label: 'งานวัดผล',
      subLabel: 'ประเมินเกรด',
      icon: <Award className="w-4 h-4 sm:w-5 sm:h-5" />,
      color: 'text-amber-600 bg-amber-50',
      activeColor: 'bg-amber-600 text-white'
    },
    {
      id: 'assignments',
      label: user?.role === 'member' ? 'ส่งงาน' : 'มอบหมาย',
      subLabel: disableAssignments ? 'ปิดใช้งาน (OFF)' : 'แจ้งให้ทราบ',
      icon: <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />,
      color: 'text-purple-600 bg-purple-50',
      activeColor: 'bg-purple-600 text-white',
      disabled: disableAssignments
    },
    {
      id: 'documents',
      label: 'ศูนย์เอกสาร',
      subLabel: disableDocuments ? 'ปิดใช้งาน (OFF)' : 'หนังสือคำสั่ง',
      icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5" />,
      color: 'text-teal-600 bg-teal-50',
      activeColor: 'bg-teal-600 text-white',
      disabled: disableDocuments
    },
    {
      id: 'reports',
      label: 'แสดงผล',
      subLabel: 'พิมพ์รายงาน',
      icon: <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />,
      color: 'text-rose-600 bg-rose-50',
      activeColor: 'bg-rose-600 text-white'
    },
    {
      id: 'websites',
      label: 'Website',
      subLabel: 'แนะนำ',
      icon: <Globe className="w-4 h-4 sm:w-5 sm:h-5" />,
      color: 'text-sky-600 bg-sky-50',
      activeColor: 'bg-sky-600 text-white'
    }
  ];

  const settingsMenuItem: typeof menuItems[0] = {
    id: 'settings',
    label: 'ตั้งค่า',
    subLabel: 'ระบบ/โปรไฟล์',
    icon: <Settings className="w-4 h-4 sm:w-5 sm:h-5" />,
    color: 'text-slate-600 bg-slate-100',
    activeColor: 'bg-slate-700 text-white'
  };

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const allMobileItems = [...menuItems, settingsMenuItem];
  const activeItem = allMobileItems.find(m => m.id === activeTab) || menuItems[0];
  const tier1Items = allMobileItems.slice(0, 5);
  const tier2Items = allMobileItems.slice(5, 10);

  const renderMobileButton = (item: typeof allMobileItems[0]) => {
    const isActive = activeTab === item.id && !item.disabled;
    const isDisabled = Boolean(item.disabled);
    return (
      <button
        key={item.id}
        type="button"
        disabled={isDisabled}
        onClick={() => {
          if (isDisabled) return;
          onSelectTab(item.id);
        }}
        title={
          isDisabled
            ? `${item.label} ถูกปิดการใช้งาน (OFF) สำหรับโรงเรียนนี้โดยผู้พัฒนาระบบ`
            : item.label
        }
        className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl border text-center transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs ${
          isDisabled
            ? 'bg-slate-100/90 border-slate-200/80 opacity-50 cursor-not-allowed select-none grayscale'
            : isActive
            ? 'bg-indigo-50 border-indigo-600 shadow-xs ring-1 ring-indigo-500/30'
            : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20'
        }`}
      >
        {/* Disabled OFF Badge */}
        {isDisabled && (
          <span className="absolute -top-1 -right-0.5 px-1 py-0 rounded-full text-[7px] font-black bg-slate-500 text-white shadow-xs z-10 flex items-center gap-0.5">
            <Lock className="w-1.5 h-1.5" />
            <span>OFF</span>
          </span>
        )}

        {/* Notification Badge */}
        {!isDisabled && item.badge !== undefined && (
          <span className="absolute -top-1 -right-0.5 px-1 py-0 rounded-full text-[8px] font-bold bg-rose-500 text-white shadow-xs animate-pulse z-10">
            {item.badge}
          </span>
        )}

        {/* Icon in shaped container */}
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 ${
            isDisabled
              ? 'bg-slate-200 text-slate-400'
              : isActive
              ? item.activeColor
              : item.color
          }`}
        >
          {item.icon}
        </div>

        {/* Label */}
        <span
          className={`text-[9px] font-bold truncate max-w-full leading-tight mt-0.5 ${
            isDisabled
              ? 'text-slate-400'
              : isActive
              ? 'text-indigo-700'
              : 'text-slate-800'
          }`}
        >
          {item.label}
        </span>

        {/* Active indicator bar */}
        {isActive && !isDisabled && (
          <div className="absolute bottom-0.5 inset-x-2 h-0.5 bg-indigo-600 rounded-full" />
        )}
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:static sm:bg-slate-100/95 bg-white/95 backdrop-blur-md border-t sm:border-t-0 sm:border-b border-slate-200/90 shadow-2xl sm:shadow-xs no-print">
      {/* ============================================================ */}
      {/* MOBILE VIEW (sm:hidden): 2-Tier Layout with Fold/Expand        */}
      {/* ============================================================ */}
      <div className="sm:hidden">
        {isCollapsed ? (
          /* Collapsed Bar: Compact view with active item & 'ดูเมนูทั้งหมด' */
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/95 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="flex items-center gap-2 min-w-0 text-left cursor-pointer active:scale-95 transition-all"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white ${activeItem.activeColor}`}>
                {activeItem.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                  {activeItem.label}
                </div>
                <div className="text-[10px] text-slate-500 truncate leading-tight">
                  {activeItem.subLabel}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>ดูเมนูทั้งหมด</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Expanded: Exactly 2 Tiers (5 items in row 1, 5 items in row 2 including ตั้งค่า) */
          <div className="flex flex-col bg-white/95 backdrop-blur-md">
            {/* Top drawer mini bar */}
            <div className="flex items-center justify-between px-3 py-0.5 border-b border-slate-100 bg-slate-50/70 text-[10px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>เมนูหลัก (2 ชั้น)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 px-2 py-0.5 rounded-md hover:bg-slate-200/60 active:scale-95 transition-all text-[11px] font-bold cursor-pointer"
                title="ซ้อนเมนู"
              >
                <span>ซ้อนเมนู</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2-Tier Grids */}
            <div className="p-1.5 space-y-1">
              {/* Tier 1 (5 items) */}
              <div className="grid grid-cols-5 gap-1">
                {tier1Items.map(renderMobileButton)}
              </div>

              {/* Tier 2 (5 items including ตั้งค่า) */}
              <div className="grid grid-cols-5 gap-1">
                {tier2Items.map(renderMobileButton)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* DESKTOP VIEW (hidden sm:block): Original 9-Column Grid       */}
      {/* ============================================================ */}
      <div className="hidden sm:block max-w-7xl mx-auto px-1.5 sm:px-6 lg:px-8 py-1.5 sm:py-2.5">
        <div className="grid sm:grid-cols-9 gap-1 sm:gap-2 justify-center">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id && !item.disabled;
            const isDisabled = Boolean(item.disabled);
            return (
              <button
                key={item.id}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  onSelectTab(item.id);
                }}
                title={
                  isDisabled
                    ? `${item.label} ถูกปิดการใช้งาน (OFF) สำหรับโรงเรียนนี้โดยผู้พัฒนาระบบ`
                    : item.label
                }
                className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all duration-150 group shadow-2xs ${
                  isDisabled
                    ? 'bg-slate-100/90 border-slate-200/80 opacity-50 cursor-not-allowed select-none grayscale'
                    : isActive
                    ? 'bg-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/25 active:scale-95 cursor-pointer'
                    : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/20 active:scale-95 cursor-pointer'
                }`}
              >
                {/* Disabled OFF Badge */}
                {isDisabled && (
                  <span className="absolute -top-1 -right-0.5 px-1.5 py-0 rounded-full text-[8px] font-black bg-slate-500 text-white shadow-xs z-10 flex items-center gap-0.5">
                    <Lock className="w-2 h-2" />
                    <span>OFF</span>
                  </span>
                )}

                {/* Notification Badge */}
                {!isDisabled && item.badge !== undefined && (
                  <span className="absolute -top-1 -right-0.5 px-1 py-0 rounded-full text-[9px] font-bold bg-rose-500 text-white shadow-xs animate-pulse z-10">
                    {item.badge}
                  </span>
                )}

                {/* Icon in shaped square container */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${
                    !isDisabled ? 'group-hover:scale-105' : ''
                  } shrink-0 [&>svg]:w-5 [&>svg]:h-5 ${
                    isDisabled
                      ? 'bg-slate-200 text-slate-400'
                      : isActive
                      ? item.activeColor
                      : item.color
                  }`}
                >
                  {item.icon}
                </div>

                {/* Label */}
                <div className="mt-1.5 flex flex-col items-center leading-tight w-full px-0">
                  <span
                    className={`text-xs font-bold truncate max-w-full ${
                      isDisabled
                        ? 'text-slate-400'
                        : isActive
                        ? 'text-indigo-700'
                        : 'text-slate-800'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`text-[10px] font-medium truncate max-w-full ${
                      isDisabled
                        ? 'text-rose-500 font-bold'
                        : isActive
                        ? 'text-indigo-500'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.subLabel}
                  </span>
                </div>

                {/* Active indicator bar */}
                {isActive && !isDisabled && (
                  <div className="absolute bottom-1 inset-x-4 h-1 bg-indigo-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
