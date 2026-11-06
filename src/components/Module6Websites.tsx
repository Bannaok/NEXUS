import React, { useState, useRef } from 'react';
import { RecommendedWebsite, UserSession } from '../types';
import { 
  Globe, 
  Plus, 
  Trash2, 
  Edit, 
  Upload, 
  X, 
  ExternalLink
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface Module6Props {
  user: UserSession;
  websites: RecommendedWebsite[];
  onSaveWebsite: (website: RecommendedWebsite) => void;
  onDeleteWebsite: (id: string) => void;
  onReorderWebsites?: (websites: RecommendedWebsite[]) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

export const Module6Websites: React.FC<Module6Props> = ({
  user,
  websites,
  onSaveWebsite,
  onDeleteWebsite,
  onReorderWebsites,
  onShowToast
}) => {
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<RecommendedWebsite | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Info modal state (กด "!" ตรงโลโก้)
  const [selectedSiteForInfo, setSelectedSiteForInfo] = useState<RecommendedWebsite | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<RecommendedWebsite | null>(null);
  const [confirmDeleteLogo, setConfirmDeleteLogo] = useState(false);

  // Drag and drop / long press reorder state for Admin
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open add / edit modal
  const handleOpenModal = (site?: RecommendedWebsite) => {
    if (site) {
      setEditingSite(site);
      setTitle(site.title);
      setUrl(site.url || '');
      setDescription(site.description || '');
      setLogoUrl(site.logoUrl || '');
    } else {
      setEditingSite(null);
      setTitle('');
      setUrl(''); // ตรงช่อง url ต้องว่างจริง ห้ามมีตัวหนังสือใดๆ ทั้งสิ้น
      setDescription('');
      setLogoUrl('');
    }
    setIsModalOpen(true);
  };

  // Real image file upload handler (FileReader)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('warning', 'ไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('warning', 'ไฟล์ใหญ่เกินไป', 'กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoUrl(base64);
      onShowToast('info', 'เลือกรูปโลโก้สำเร็จ', 'กดบันทึกเว็บไซต์เพื่อจัดเก็บรูปโลโก้ลงระบบและ Google Drive');
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be selected again if needed
    e.target.value = '';
  };

  // Submit form handler
  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role !== 'admin') {
      onShowToast('warning', 'ไม่มีสิทธิ์', 'เฉพาะ Admin เท่านั้นที่สามารถเพิ่มหรือแก้ไขเว็บไซต์');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      onShowToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณากรอกชื่อสั้นๆ ใต้โลโก้');
      return;
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      onShowToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณากรอก URL เว็บไซต์');
      return;
    }

    // Format URL with https:// if user didn't enter protocol
    const formattedUrl = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
      ? trimmedUrl
      : `https://${trimmedUrl}`;

    const newSite: RecommendedWebsite = {
      id: editingSite ? editingSite.id : 'web-' + Date.now(),
      title: trimmedTitle,
      url: formattedUrl,
      category: 'ทั่วไป', // เอาออกหมวดหมู่ตามคำสั่ง
      description: description.trim(),
      logoUrl: logoUrl.trim() || undefined,
      isOfficial: false
    };

    onSaveWebsite(newSite);
    setIsModalOpen(false);
    onShowToast('success', 'บันทึกสำเร็จ', `บันทึกเว็บไซต์ "${newSite.title}" เรียบร้อยแล้ว`);
  };

  // Reorder websites handler
  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= websites.length || toIndex >= websites.length) {
      return;
    }
    const updated = [...websites];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);

    if (onReorderWebsites) {
      onReorderWebsites(updated);
    }
    onShowToast('info', 'จัดลำดับแล้ว', `ย้าย "${movedItem.title}" เรียบร้อย`);
  };

  // Touch drag handlers for mobile Admin
  const handleTouchStart = (index: number) => {
    if (user.role !== 'admin') return;
    touchTimerRef.current = setTimeout(() => {
      setDraggedIndex(index);
    }, 300);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (user.role !== 'admin' || draggedIndex === null) return;
    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardEl = targetEl?.closest('[data-index]');
    if (cardEl) {
      const idx = Number(cardEl.getAttribute('data-index'));
      if (!isNaN(idx) && idx !== dragOverIndex) {
        setDragOverIndex(idx);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      handleReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* Header: เรียบ สะอาด ไม่มีคำอธิบายหรือคำแนะนำใดๆ ให้รกตา */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-sky-600" />
          <h2 className="text-base font-bold text-slate-800">
            Website
          </h2>
        </div>

        {user.role === 'admin' && (
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มเว็บไซต์</span>
          </button>
        )}
      </div>

      {/* Grid: 5 โลโก้ ต่อ 1 บรรทัด (แสดงเฉพาะโลโก้และชื่อสั้นๆ ใต้โลโก้) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-y-7 gap-x-4 sm:gap-6 justify-items-center pt-2">
        {websites.map((site, index) => {
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index;

          return (
            <div
              key={site.id}
              data-index={index}
              draggable={user.role === 'admin'}
              onDragStart={(e) => {
                if (user.role !== 'admin') return;
                setDraggedIndex(index);
                e.dataTransfer.setData('text/plain', index.toString());
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                if (user.role !== 'admin') return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIndex !== index) {
                  setDragOverIndex(index);
                }
              }}
              onDragLeave={() => {
                if (dragOverIndex === index) {
                  setDragOverIndex(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIndex !== null) {
                  handleReorder(draggedIndex, index);
                }
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onTouchStart={() => handleTouchStart(index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className={`relative flex flex-col items-center group transition-all duration-200 select-none ${
                user.role === 'admin' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
              } ${
                isDragging ? 'opacity-30 scale-90' : ''
              } ${
                isOver ? 'scale-105 ring-4 ring-sky-400 ring-offset-2 rounded-3xl' : ''
              }`}
            >
              {/* โลโก้เว็บไซต์ */}
              <div 
                onClick={() => window.open(site.url, '_blank', 'noopener,noreferrer')}
                className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-sky-400 flex items-center justify-center p-2.5 transition-all group-hover:scale-105 active:scale-95 cursor-pointer overflow-visible"
              >
                {site.logoUrl ? (
                  <img
                    src={site.logoUrl}
                    alt={site.title}
                    className="w-full h-full object-contain pointer-events-none"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 font-bold text-xl sm:text-2xl">
                    {site.title.charAt(0) || <Globe className="w-8 h-8 text-sky-500" />}
                  </div>
                )}

              </div>

              {/* ชื่อสั้นๆ ใต้โลโก้ พร้อมเครื่องหมาย "!" ด้านหลังชื่อ */}
              <div className="mt-2 flex items-center justify-center gap-1 max-w-[120px] sm:max-w-[140px] text-center">
                <span 
                  onClick={() => window.open(site.url, '_blank', 'noopener,noreferrer')}
                  className="text-xs sm:text-sm font-semibold text-slate-700 leading-tight break-words group-hover:text-sky-600 transition-colors cursor-pointer line-clamp-2"
                  title={site.title}
                >
                  {site.title}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedSiteForInfo(site);
                  }}
                  className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-90 text-white font-black text-[10px] sm:text-[11px] inline-flex items-center justify-center shadow-xs cursor-pointer transition-transform hover:scale-110 shrink-0 select-none ring-1 ring-white"
                  title="คลิกดูว่าเว็ปนี้ใช้สำหรับอะไร (!)"
                >
                  !
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ส่วนอธิบาย เมื่อกดคำว่า "!" ตรงโลโก้ จะรู้ว่าเว็ปนี้ใช้สำหรับอะไร */}
      {selectedSiteForInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  !
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  ข้อมูลเว็บไซต์
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSiteForInfo(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* โลโก้และชื่อเว็บไซต์ */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0">
                {selectedSiteForInfo.logoUrl ? (
                  <img
                    src={selectedSiteForInfo.logoUrl}
                    alt={selectedSiteForInfo.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Globe className="w-7 h-7 text-sky-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-800 leading-tight">
                  {selectedSiteForInfo.title}
                </h4>
              </div>
            </div>

            {/* ส่วนอธิบาย: เว็ปนี้ใช้สำหรับอะไร */}
            <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/70 space-y-1">
              <div className="text-[11px] font-bold text-amber-900">
                เว็ปนี้ใช้สำหรับ:
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedSiteForInfo.description?.trim() || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับเว็บไซต์นี้'}
              </p>
            </div>

            {/* ปุ่มเข้าสู่เว็บไซต์ */}
            <div className="space-y-2 pt-1">
              <a
                href={selectedSiteForInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>เข้าสู่เว็บไซต์</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* ปุ่มจัดการสำหรับ Admin */}
              {user.role === 'admin' && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {/* ปุ่มย้ายตำแหน่ง */}
                  {(() => {
                    const siteIndex = websites.findIndex(w => w.id === selectedSiteForInfo.id);
                    return (
                      <>
                        <button
                          type="button"
                          disabled={siteIndex <= 0}
                          onClick={() => {
                            handleReorder(siteIndex, siteIndex - 1);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
                          title="เลื่อนไปข้างหน้า"
                        >
                          ◀ ย้ายหน้า
                        </button>
                        <button
                          type="button"
                          disabled={siteIndex >= websites.length - 1}
                          onClick={() => {
                            handleReorder(siteIndex, siteIndex + 1);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
                          title="เลื่อนไปข้างหลัง"
                        >
                          ย้ายหลัง ▶
                        </button>
                      </>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => {
                      const site = selectedSiteForInfo;
                      setSelectedSiteForInfo(null);
                      handleOpenModal(site);
                    }}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSiteToDelete(selectedSiteForInfo);
                    }}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer"
                    title="ลบเว็บไซต์นี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: เพิ่ม/แก้ไขเว็บไซต์ (อัปโหลดไฟล์รูปได้จริงไม่ใช่ URL, เอาออกหมวดหมู่, ช่อง url ว่างจริงห้ามมีตัวหนังสือใดๆ) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                {editingSite ? 'แก้ไขเว็บไซต์' : 'เพิ่มเว็บไซต์'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-4">
              {/* อัปโหลดไฟล์รูปภาพโลโก้ได้จริง ไม่ใช่ URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  โลโก้เว็บไซต์
                </label>
                
                {/* Hidden input for real file upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {logoUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                      <img 
                        src={logoUrl} 
                        alt="Logo Preview" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-sky-600" />
                        <span>เลือกรูปภาพใหม่</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteLogo(true)}
                        className="text-[11px] text-rose-600 hover:text-rose-700 text-left font-medium cursor-pointer"
                      >
                        ลบรูปภาพออก
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-2xl bg-slate-50/70 hover:bg-sky-50/40 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 group-hover:border-sky-300 flex items-center justify-center text-slate-400 group-hover:text-sky-600 shadow-2xs transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700 group-hover:text-sky-700">
                        คลิกเพื่ออัปโหลดไฟล์รูปภาพโลโก้
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        รองรับไฟล์ PNG, JPG, WebP, SVG
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ชื่อสั้นๆ ใต้โลโก้ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อเว็บไซต์ (สั้นๆ ใต้โลโก้) *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder=""
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* URL เว็บไซต์: ตรงช่อง url ต้องว่างจริง ห้ามมีตัวหนังสือใดๆ ทั้งสิ้น */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL เว็บไซต์ *
                </label>
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder=""
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* คำอธิบายเว็บไซต์: เว็ปนี้ใช้สำหรับอะไร */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  คำอธิบาย (เว็ปนี้ใช้สำหรับอะไร - แสดงเมื่อกด "!")
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder=""
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                />
              </div>

              {/* ปุ่มบันทึก */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  บันทึกเว็บไซต์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ยืนยันการลบเว็บไซต์ */}
      <ConfirmDeleteModal
        isOpen={Boolean(siteToDelete)}
        title="ยืนยันการลบเว็บไซต์"
        categoryLabel="เว็บไซต์แนะนำ"
        itemTitle={siteToDelete?.title || ''}
        itemSubtitle={siteToDelete?.url || ''}
        onCancel={() => setSiteToDelete(null)}
        onConfirm={() => {
          if (!siteToDelete) return;
          onDeleteWebsite(siteToDelete.id);
          if (selectedSiteForInfo?.id === siteToDelete.id) {
            setSelectedSiteForInfo(null);
          }
          onShowToast('info', 'ลบเว็บไซต์สำเร็จ', `ลบเว็บไซต์ "${siteToDelete.title}" เรียบร้อยแล้ว`);
          setSiteToDelete(null);
        }}
      />

      {/* MODAL: ยืนยันการลบรูปภาพโลโก้ */}
      <ConfirmDeleteModal
        isOpen={confirmDeleteLogo}
        title="ยืนยันการลบรูปโลโก้"
        categoryLabel="รูปภาพโลโก้"
        itemTitle={title || 'รูปภาพโลโก้เว็บไซต์'}
        itemSubtitle="ต้องการนำรูปภาพโลโก้นี้ออกใช่หรือไม่"
        onCancel={() => setConfirmDeleteLogo(false)}
        onConfirm={() => {
          setLogoUrl('');
          setConfirmDeleteLogo(false);
        }}
      />
    </div>
  );
};
