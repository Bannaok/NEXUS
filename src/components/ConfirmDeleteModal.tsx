import React from 'react';
import { Trash2 } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  categoryLabel?: string;
  itemTitle: string;
  itemSubtitle?: string;
  warningText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  zIndexClass?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  categoryLabel,
  itemTitle,
  itemSubtitle,
  warningText = 'เมื่อลบแล้วจะไม่สามารถกู้คืนข้อมูลได้',
  confirmLabel = 'ยืนยันการลบ',
  cancelLabel = 'ยกเลิก',
  onConfirm,
  onCancel,
  zIndexClass = 'z-[90]',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150`}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 text-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
          <Trash2 className="w-5 h-5 text-rose-600" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">กรุณาตรวจสอบข้อมูลก่อนยืนยันการลบ</p>
        </div>

        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 text-left space-y-1">
          {categoryLabel && (
            <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
              {categoryLabel}
            </span>
          )}
          <div className="text-xs font-bold text-slate-900 break-words leading-snug">
            {itemTitle}
          </div>
          {itemSubtitle && (
            <div className="text-[11px] text-slate-600 break-words leading-relaxed">
              {itemSubtitle}
            </div>
          )}
        </div>

        {warningText && (
          <p className="text-[11px] text-rose-600 font-semibold leading-relaxed">
            * {warningText}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
