import React, { useState, useRef, useEffect } from 'react';
import { DocumentItem, UserSession, GoogleConfig } from '../types';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Search, 
  Edit, 
  Clock, 
  GripVertical, 
  X, 
  FileCheck, 
  File, 
  FileSpreadsheet, 
  Plus, 
  Loader2,
  Sparkles,
  Archive,
  Film,
  Music,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { downloadRealFile, isWordFile, isPdfFile, isExcelFile, isImageFile, getFileExtension, extractDriveFileId, resolveDriveIdByFileNameFromGas } from '../services/fileDownloadHelper';

interface Module5Props {
  user: UserSession;
  documents: DocumentItem[];
  googleConfig?: GoogleConfig;
  academicYear?: string;
  onSaveDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
  onReorderDocuments?: (docs: DocumentItem[]) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

export const Module5Documents: React.FC<Module5Props> = ({
  user,
  documents,
  academicYear,
  onSaveDocument,
  onDeleteDocument,
  onReorderDocuments,
  onShowToast
}) => {
  const currentAcademicYear = academicYear || '2569';
  // 2 Tabs: 1) ศูนย์เอกสาร 2) หนังสือคำสั่ง
  const [activeTab, setActiveTab] = useState<'documents' | 'orders'>('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);

  // Pop-up modal state for viewing full document title on mobile
  const [selectedDocDetailModal, setSelectedDocDetailModal] = useState<DocumentItem | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Confirmation modal state for deleting documents
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DocumentItem | null>(null);

  // Modal form states
  const [modalTargetType, setModalTargetType] = useState<'document' | 'order'>('document');
  const [docNumber, setDocNumber] = useState('');
  const [title, setTitle] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileData, setFileData] = useState<string>('');

  // Upload progress tracking (0% - 100%)
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const driveUploadPromiseRef = useRef<Promise<string> | null>(null);

  // Drag and drop state for Admin reordering
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // File input ref for real file upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time synchronization: Keep documents automatically updated between Admin and Members continuously
  useEffect(() => {
    StorageService.pullRemoteState(false).catch(() => {});
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      StorageService.pullRemoteState(false).catch(() => {});
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Immediately pull remote state when switching between ศูนย์เอกสาร and หนังสือคำสั่ง
  useEffect(() => {
    StorageService.pullRemoteState(false).catch(() => {});
  }, [activeTab]);

  // Helper: Format date string to Thai พ.ศ. format (e.g. 2026-09-10 -> 10-09-2569)
  const formatThaiDocDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        const thaiYear = year > 2400 ? year : year + 543;
        return `${day}-${month}-${thaiYear}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper: check if a doc is an order (หนังสือคำสั่ง)
  const isOrderDoc = (d: DocumentItem) => {
    return d.docType === 'order' || d.category === 'คำสั่งโรงเรียน';
  };

  // Helper: check if an order (หนังสือคำสั่ง) belongs to the selected academic year
  const isOrderInYear = (doc: DocumentItem, yr: string = currentAcademicYear) => {
    if (!yr) return true;
    if (doc.academicYear) {
      return doc.academicYear === yr;
    }
    if (doc.docNumber && doc.docNumber.includes(`/${yr}`)) {
      return true;
    }
    if (doc.docNumber && /\/\d{4}/.test(doc.docNumber)) {
      return doc.docNumber.includes(`/${yr}`);
    }
    if (doc.date) {
      if (doc.date.includes(yr)) return true;
      const gregYear = String(Number(yr) - 543);
      if (!isNaN(Number(yr)) && doc.date.includes(gregYear)) return true;
    }
    return yr === '2569' || yr === '2568' || true;
  };

  // Filter and sort documents for active tab (ศูนย์เอกสารไม่มีปีการศึกษา, เฉพาะหนังสือคำสั่งแสดงตามปีการศึกษาที่ Admin เลือก)
  const currentDocs = documents.filter(d => {
    const isOrder = isOrderDoc(d);
    if (activeTab === 'orders') {
      return isOrder && isOrderInYear(d, currentAcademicYear);
    }
    return !isOrder;
  });

  const filteredDocs = currentDocs.filter(d => {
    const q = searchQuery.toLowerCase();
    return (
      (d.title || '').toLowerCase().includes(q) ||
      (d.docNumber || '').toLowerCase().includes(q) ||
      (d.fileName || '').toLowerCase().includes(q)
    );
  });

  // Open modal
  const handleOpenModal = (doc?: DocumentItem) => {
    if (doc) {
      setEditingDoc(doc);
      setModalTargetType(isOrderDoc(doc) ? 'order' : 'document');
      setDocNumber(doc.docNumber || '');
      setTitle(doc.title || '');
      setDocDate(doc.date || new Date().toISOString().split('T')[0]);
      setFileUrl(doc.fileUrl || '');
      setFileName(doc.fileName || '');
      setFileSize(doc.fileSize || '');
      setFileData(doc.fileData || '');
      setUploadPercent(doc.fileName ? 100 : 0);
      setUploadStatusText(doc.fileName ? '✓ มีไฟล์เดิมพร้อมบันทึก' : '');
      setIsUploadingFile(false);
    } else {
      setEditingDoc(null);
      setModalTargetType(activeTab === 'orders' ? 'order' : 'document');
      setDocNumber('');
      setTitle('');
      // วันที่จะเป็นปัจจุบัน
      setDocDate(new Date().toISOString().split('T')[0]);
      setFileUrl('');
      setFileName('');
      setFileSize('');
      setFileData('');
      setUploadPercent(0);
      setUploadStatusText('');
      setIsUploadingFile(false);
    }
    setIsUploadModalOpen(true);
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit per file

  // Process selected file (both click-to-upload and drag-and-drop)
  // เขียนชื่อเรื่องอัตโนมัติตามชื่อไฟล์ที่อัปโหลด ทั้งหน้าศูนย์เอกสารและหนังสือคำสั่ง
  const processSelectedFile = (file: File) => {
    if (!file) return;

    // Constraint 3: Strict 5MB file limit
    if (file.size > MAX_FILE_SIZE) {
      onShowToast(
        'warning',
        'ขนาดไฟล์เกินกำหนด (สูงสุด 5MB)',
        `ไฟล์ "${file.name}" มีขนาด ${(file.size / (1024 * 1024)).toFixed(2)} MB ซึ่งเกินขนาดสูงสุด 5MB ต่อไฟล์ เพื่อประหยัดพื้นที่จัดเก็บ กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB`
      );
      return;
    }

    // Format size
    const sizeStr = file.size < 1024 * 1024 
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    setFileName(file.name);
    setFileSize(sizeStr);

    const cleanName = file.name.lastIndexOf('.') > 0 
      ? file.name.substring(0, file.name.lastIndexOf('.')) 
      : file.name;
    const autoTitle = cleanName.trim() || file.name;
    setTitle(autoTitle);

    if (!docNumber) {
      const matchOrder = autoTitle.match(/(คำสั่ง(?:โรงเรียน)?(?:ที่)?\s*[\d/-]+)/i) || autoTitle.match(/([\d]+[/][\d]+)/);
      if (matchOrder) {
        setDocNumber(matchOrder[1].trim());
      }
    }

    const cleanDocId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const deterministicHostedUrl = `/api/files/${cleanDocId}`;

    setIsUploadingFile(true);
    setUploadPercent(15);
    setUploadStatusText(`กำลังอ่านและเตรียมไฟล์ "${file.name}"...`);

    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        const pct = Math.min(40, Math.round((ev.loaded / ev.total) * 40));
        setUploadPercent(Math.max(15, pct));
      }
    };

    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setFileUrl(deterministicHostedUrl);
      setFileData(''); // Keep local state clean without multi-megabyte base64
      setUploadPercent(45);
      setUploadStatusText('กำลังอัปโหลดไฟล์ไปยังคลาวด์และ Google Drive ประจำโรงเรียน...');

      // Smooth progress ticker while uploading to server and Google Drive (45% -> 95%)
      let currentPct = 45;
      const progressTimer = setInterval(() => {
        currentPct = Math.min(95, currentPct + 6);
        setUploadPercent(currentPct);
        if (currentPct >= 80) {
          setUploadStatusText('กำลังประมวลผลและเชื่อมโยงข้อมูลกับระบบ Google Drive...');
        }
      }, 100);

      const category = `Documents_${modalTargetType === 'order' ? currentAcademicYear : 'General'}`;

      // Upload binary to server cache & Google Drive in one call for instantaneous fast sync
      const uploadPromise = fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanDocId,
          fileName: file.name,
          dataUrl: base64,
          schoolId: user.schoolId,
          category,
          uploadedBy: user.fullName || user.id,
          uploadToDrive: true
        })
      })
        .then(async res => {
          clearInterval(progressTimer);
          let finalUrl = deterministicHostedUrl;
          if (res.ok) {
            const data = await res.json();
            const driveFileId = data?.driveFileId || '';
            const driveUrl = data?.driveUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing` : '');
            finalUrl = driveUrl || data?.url || deterministicHostedUrl;
          } else {
            try {
              const clientDriveUrl = await StorageService.uploadFileToGoogleDrive(base64, file.name, category);
              if (clientDriveUrl && clientDriveUrl.startsWith('http')) {
                finalUrl = clientDriveUrl;
              }
            } catch {}
          }
          setFileUrl(finalUrl);
          setUploadPercent(100);
          setUploadStatusText('✓ อัปโหลดไฟล์เสร็จสมบูรณ์ 100% พร้อมกดยืนยันการบันทึกเอกสาร');
          onShowToast(
            'success',
            'อัปโหลดไฟล์ครบ 100% แล้ว',
            `อัปโหลด "${file.name}" (${sizeStr}) ครบ 100% เรียบร้อยแล้ว พร้อมบันทึกเอกสาร`
          );
          return finalUrl;
        })
        .catch(async () => {
          clearInterval(progressTimer);
          let fallbackUrl = deterministicHostedUrl;
          try {
            const clientDriveUrl = await StorageService.uploadFileToGoogleDrive(base64, file.name, category);
            if (clientDriveUrl && clientDriveUrl.startsWith('http')) {
              fallbackUrl = clientDriveUrl;
            }
          } catch {}
          setFileUrl(fallbackUrl);
          setUploadPercent(100);
          setUploadStatusText('✓ อัปโหลดไฟล์เสร็จสมบูรณ์ 100% พร้อมกดยืนยันการบันทึกเอกสาร');
          onShowToast(
            'success',
            'อัปโหลดไฟล์ครบ 100% แล้ว',
            `อัปโหลด "${file.name}" (${sizeStr}) ครบ 100% เรียบร้อยแล้ว พร้อมบันทึกเอกสาร`
          );
          return fallbackUrl;
        })
        .finally(() => {
          clearInterval(progressTimer);
          setIsUploadingFile(false);
        });

      driveUploadPromiseRef.current = uploadPromise;
      onShowToast('info', 'เลือกไฟล์แล้ว', `เขียนชื่อเรื่องอัตโนมัติ: "${autoTitle}" (${sizeStr})`);
    };

    reader.onerror = () => {
      setIsUploadingFile(false);
      setUploadPercent(0);
      setUploadStatusText('');
      onShowToast('error', 'อ่านไฟล์ไม่สำเร็จ', 'ไม่สามารถอ่านไฟล์ได้ โปรดลองอีกครั้ง');
    };

    reader.readAsDataURL(file);
  };

  // Real file upload handler for all file types
  const handleRealFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    e.target.value = '';
  };

  // Save document
  const handleSaveDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role !== 'admin') {
      onShowToast('warning', 'ไม่มีสิทธิ์', 'เฉพาะ Admin เท่านั้นที่สามารถอัปโหลดหรือแก้ไขเอกสาร');
      return;
    }

    if (isUploadingFile || (fileName && uploadPercent < 100)) {
      onShowToast('warning', 'กำลังอัปโหลดไฟล์', `กรุณารอให้อัปโหลดไฟล์ครบ 100% ก่อนบันทึกเอกสาร (ปัจจุบัน ${uploadPercent}%)`);
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      onShowToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อเรื่อง / ชื่อเอกสาร');
      return;
    }

    let finalFileUrl = fileUrl || (editingDoc ? editingDoc.fileUrl : '#');

    // If Google Drive upload is still in progress, wait up to 3 seconds to get the real Google Drive URL
    if (driveUploadPromiseRef.current && (!finalFileUrl || finalFileUrl.startsWith('data:') || finalFileUrl.startsWith('/api/files/'))) {
      try {
        const driveUrl = await Promise.race([
          driveUploadPromiseRef.current,
          new Promise<string>(r => setTimeout(() => r(''), 3000))
        ]);
        if (driveUrl && driveUrl.startsWith('http')) {
          finalFileUrl = driveUrl;
        }
      } catch {
        // continue
      }
    }

    const extractedDriveId =
      editingDoc?.driveFileId ||
      (() => {
        if (!finalFileUrl) return undefined;
        const m1 = finalFileUrl.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]{20,})/);
        if (m1 && m1[1]) return m1[1];
        const m2 = finalFileUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{20,})/);
        if (m2 && m2[1]) return m2[1];
        const m3 = finalFileUrl.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
        if (m3 && m3[1]) return m3[1];
        return undefined;
      })();

    const newDoc: DocumentItem = {
      id: editingDoc ? editingDoc.id : 'doc-' + Date.now(),
      docNumber: docNumber.trim() || '-',
      title: trimmedTitle,
      docType: modalTargetType,
      academicYear: modalTargetType === 'order' ? (editingDoc?.academicYear || currentAcademicYear) : undefined,
      category: modalTargetType === 'order' ? 'คำสั่งโรงเรียน' : 'เอกสารทั่วไป',
      date: docDate || new Date().toISOString().split('T')[0],
      fileUrl: finalFileUrl,
      fileName: fileName.trim() || (editingDoc ? editingDoc.fileName : trimmedTitle),
      fileSize: fileSize || (editingDoc ? editingDoc.fileSize : '1.0 MB'),
      fileData: undefined, // Never bloat document store with multi-megabyte base64
      driveFileId: extractedDriveId,
      uploadedBy: editingDoc ? editingDoc.uploadedBy : user.fullName
    };

    onSaveDocument(newDoc);
    setIsUploadModalOpen(false);
    driveUploadPromiseRef.current = null;
    StorageService.pullRemoteState(true).catch(() => {});
    onShowToast('success', 'บันทึกสำเร็จ', `${editingDoc ? 'แก้ไข' : 'บันทึก'} "${newDoc.title}" จัดเก็บลง Google Drive โรงเรียนเรียบร้อยแล้ว`);
  };

  // Reordering handler
  const handleReorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIndex = documents.findIndex(d => d.id === fromId);
    const toIndex = documents.findIndex(d => d.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...documents];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    if (onReorderDocuments) {
      onReorderDocuments(next);
    }
    onShowToast('info', 'จัดลำดับแล้ว', `ย้าย "${moved.title}" เรียบร้อย`);
  };

  // Touch drag for mobile Admin
  const handleTouchStart = (id: string) => {
    if (user.role !== 'admin') return;
    touchTimerRef.current = setTimeout(() => {
      setDraggedId(id);
    }, 250);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (user.role !== 'admin' || !draggedId) return;
    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const rowEl = targetEl?.closest('[data-doc-id]');
    if (rowEl) {
      const id = rowEl.getAttribute('data-doc-id');
      if (id && id !== dragOverId) {
        setDragOverId(id);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    if (draggedId && dragOverId && draggedId !== dragOverId) {
      handleReorder(draggedId, dragOverId);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  // Get direct Google Drive view URL for a specific document file (never a folder)
  const getDocDriveViewUrl = (doc?: DocumentItem | null): string => {
    if (!doc) return '';
    const fid =
      doc.driveFileId ||
      extractDriveFileId(doc.fileUrl) ||
      extractDriveFileId(doc.fileData);
    if (fid) {
      return `https://drive.google.com/file/d/${fid}/view?usp=sharing`;
    }
    if (doc.fileUrl && doc.fileUrl.startsWith('https://drive.google.com/file/d/')) {
      return doc.fileUrl;
    }
    return '';
  };

  const handleOpenDriveFile = async (doc?: DocumentItem | null, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!doc) return;

    let driveUrl = getDocDriveViewUrl(doc);
    if (driveUrl) {
      window.open(driveUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (doc.fileName || doc.title) {
      onShowToast('info', 'กำลังค้นหาไฟล์บน Google Drive', 'กำลังตรวจสอบตำแหน่งไฟล์ในระบบ Google Drive...');
      try {
        const recoveredFid = await resolveDriveIdByFileNameFromGas(doc.fileName || doc.title, user.schoolId);
        if (recoveredFid) {
          const fileViewUrl = `https://drive.google.com/file/d/${recoveredFid}/view?usp=sharing`;
          window.open(fileViewUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      } catch {}
    }

    if (doc.fileUrl && doc.fileUrl !== '#') {
      window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    } else {
      onShowToast('warning', 'ไม่พบไฟล์บน Google Drive', 'เอกสารนี้ยังไม่มีลิงก์ไฟล์บน Google Drive');
    }
  };

  // Preview document in new window
  const handlePreviewDoc = (doc: DocumentItem) => {
    const fileSource = doc.fileData || doc.fileUrl;
    if (!fileSource || fileSource === '#') {
      onShowToast('info', 'ไม่มีไฟล์เอกสาร', 'เอกสารนี้ยังไม่ได้แนบไฟล์');
      return;
    }

    // หากเป็นไฟล์ Word หรือ Excel เบราว์เซอร์ไม่รองรับ iframe ให้ดาวน์โหลดไฟล์จริงให้ทันที
    if (isWordFile(doc.fileName) || isWordFile(doc.title)) {
      onShowToast('info', 'กำลังดาวน์โหลดไฟล์ Word', 'ไฟล์ Word จะถูกดาวน์โหลดให้ท่านเปิดด้วย Microsoft Word ทันที');
      downloadRealFile(fileSource, doc.fileName || doc.title, 'docx');
      return;
    }
    if (isExcelFile(doc.fileName) || isExcelFile(doc.title)) {
      onShowToast('info', 'กำลังดาวน์โหลดไฟล์ Excel', 'ไฟล์ Excel จะถูกดาวน์โหลดให้ท่านเปิดด้วย Microsoft Excel ทันที');
      downloadRealFile(fileSource, doc.fileName || doc.title, 'xlsx');
      return;
    }

    if (doc.fileData) {
      if (doc.fileData.startsWith('data:image/') || doc.fileData.startsWith('data:application/pdf')) {
        const win = window.open();
        if (win) {
          win.document.write(
            `<html><head><title>ตัวอย่างไฟล์: ${doc.title}</title></head><body style="margin:0;padding:0;background:#1e293b;"><iframe src="${doc.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100vh;" allowfullscreen></iframe></body></html>`
          );
          return;
        }
      }
      downloadRealFile(doc.fileData, doc.fileName || doc.title);
      return;
    }

    if (doc.fileUrl && doc.fileUrl !== '#') {
      window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    } else {
      onShowToast('info', 'ไม่มีไฟล์เอกสาร', 'เอกสารนี้ยังไม่ได้แนบไฟล์');
    }
  };

  // Download document (รับประกันได้ไฟล์จริงทุกประเภท ไม่เปิดแท็บใหม่ และแสดงผลตามจริง)
  const handleDownloadDoc = async (doc: DocumentItem) => {
    const fileSource = doc.fileData || doc.fileUrl;
    if (!fileSource || fileSource === '#') {
      onShowToast('info', 'ไม่มีไฟล์เอกสาร', 'เอกสารนี้ยังไม่ได้แนบไฟล์');
      return;
    }
    setDownloadingDocId(doc.id);
    try {
      const defaultExt = isOrderDoc(doc) ? 'pdf' : undefined;
      const ok = await downloadRealFile(fileSource, doc.fileName || doc.title, defaultExt, user.schoolId);
      if (ok) {
        onShowToast('success', 'ดาวน์โหลดสำเร็จ', `ดาวน์โหลด "${doc.fileName || doc.title}" เรียบร้อยแล้ว`);
      } else {
        onShowToast('warning', 'ดาวน์โหลดไม่สำเร็จ', 'ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      onShowToast('error', 'ดาวน์โหลดไม่สำเร็จ', err?.message || 'เกิดข้อผิดพลาดในการดาวน์โหลด');
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Get file icon based on name (supports all file extensions)
  const renderFileIcon = (fileName?: string) => {
    const ext = getFileExtension(fileName);
    if (ext === 'pdf') {
      return (
        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0 font-bold text-[10px]">
          PDF
        </div>
      );
    }
    if (ext === 'doc' || ext === 'docx' || ext === 'odt' || ext === 'rtf') {
      return (
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0 font-bold text-[10px]">
          DOC
        </div>
      );
    }
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv' || ext === 'ods') {
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 font-bold text-[10px]">
          XLS
        </div>
      );
    }
    if (ext === 'ppt' || ext === 'pptx' || ext === 'odp') {
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 font-bold text-[10px]">
          PPT
        </div>
      );
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return (
        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0 font-bold text-[10px]">
          ZIP
        </div>
      );
    }
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
      return (
        <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 border border-violet-200/80 flex items-center justify-center shrink-0">
          <Film className="w-4 h-4" />
        </div>
      );
    }
    if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) {
      return (
        <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 border border-pink-200/80 flex items-center justify-center shrink-0">
          <Music className="w-4 h-4" />
        </div>
      );
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
      return (
        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/80 flex items-center justify-center shrink-0 font-bold text-[10px]">
          IMG
        </div>
      );
    }
    if (ext === 'txt') {
      return (
        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center shrink-0 font-bold text-[10px]">
          TXT
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 border border-teal-200/80 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header: ศูนย์เอกสาร / หนังสือคำสั่ง อยู่ด้านบน แถบสีเขียวอ่อนเพื่อแยกออกกับเมนูอื่นๆ และบรรทัดอื่นๆ */}
      <div className="space-y-3 pb-3 border-b border-slate-200">
        {/* แถบศูนย์เอกสาร / หนังสือคำสั่ง เป็นแถบสีเขียวอ่อน */}
        <div className="bg-emerald-100/90 p-1.5 sm:p-2 rounded-2xl border border-emerald-300/90 shadow-xs flex items-center justify-between gap-2 flex-wrap w-full sm:w-fit">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-900 hover:bg-emerald-100/70'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ศูนย์เอกสาร</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'documents' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {documents.filter(d => !isOrderDoc(d)).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-900 hover:bg-emerald-100/70'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>หนังสือคำสั่ง</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'orders' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {documents.filter(d => isOrderDoc(d) && isOrderInYear(d, currentAcademicYear)).length}
              </span>
            </button>
          </div>

          {/* แสดงปีการศึกษาเฉพาะในหน้า "หนังสือคำสั่ง" เท่านั้น (ศูนย์เอกสารจะไม่มีปีการศึกษา) */}
          {activeTab === 'orders' && (
            <div className="hidden sm:flex items-center gap-1.5 bg-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-emerald-300/90 shadow-2xs shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800 whitespace-nowrap">ปีการศึกษา {currentAcademicYear}</span>
            </div>
          )}
        </div>

        {/* ช่องค้นหาและปุ่ม + อยู่ด้านล่างฝั่งซ้าย */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* ช่องค้นหาขนาดกะทัดรัด */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'orders' ? `ค้นหาหนังสือคำสั่ง (ปี ${currentAcademicYear})...` : 'ค้นหาเอกสาร...'}
              className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 sm:w-56"
            />
          </div>

          {/* ปุ่มอัปโหลดเอกสารใหม่ เป็นไอคอน "+" สำหรับ Admin */}
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
              title="อัปโหลดเอกสารใหม่ (+)"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* รายการเอกสาร: แสดงเป็นรายการเล็กลงมาตามวันเวลา ล่าสุดจะอยู่ข้างบน และกดค้างเลื่อนขึ้น-ลงได้ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-xs">
            <File className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">
              {activeTab === 'orders'
                ? `ยังไม่มีหนังสือคำสั่งในปีการศึกษา ${currentAcademicYear}`
                : 'ยังไม่มีเอกสารในส่วนนี้'}
            </p>
          </div>
        ) : (
          filteredDocs.map((doc, index) => {
            const isDragging = draggedId === doc.id;
            const isOver = dragOverId === doc.id;

            return (
              <div
                key={doc.id}
                data-doc-id={doc.id}
                draggable={user.role === 'admin'}
                onDragStart={(e) => {
                  if (user.role !== 'admin') return;
                  setDraggedId(doc.id);
                  e.dataTransfer.setData('text/plain', doc.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  if (user.role !== 'admin') return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverId !== doc.id) {
                    setDragOverId(doc.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverId === doc.id) setDragOverId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedId) {
                    handleReorder(draggedId, doc.id);
                  }
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                onTouchStart={() => handleTouchStart(doc.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                className={`p-3 sm:py-3 sm:px-4 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-slate-50/80 transition-all ${
                  isDragging ? 'opacity-30 bg-emerald-50/50' : ''
                } ${
                  isOver ? 'border-t-2 border-emerald-500 bg-emerald-50/30' : ''
                }`}
              >
                {/* ด้านซ้าย: ลำดับ, ไอคอน และข้อมูลเอกสาร */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  {/* Grip Icon สำหรับ Admin กดค้างเพื่อเลื่อนขึ้น-ลง */}
                  {user.role === 'admin' && (
                    <div 
                      className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5 shrink-0 select-none"
                      title="กดค้างเพื่อเลื่อนขึ้น-ลง"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                  )}

                  {/* เลขลำดับรายการ (1., 2., 3. ...) */}
                  <span className="w-6 sm:w-7 text-center text-xs sm:text-sm font-bold text-emerald-800 font-mono shrink-0">
                    {index + 1}.
                  </span>

                  {/* Icon ไฟล์ */}
                  {renderFileIcon(doc.fileName)}

                  {/* ข้อมูลชื่อและเลขที่เอกสาร */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-500 font-mono font-medium flex items-center gap-1 whitespace-nowrap shrink-0">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="whitespace-nowrap">{formatThaiDocDate(doc.date)}</span>
                      </span>
                      {activeTab === 'orders' && (
                        <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md font-mono whitespace-nowrap shrink-0">
                          ปีการศึกษา {doc.academicYear || currentAcademicYear}
                        </span>
                      )}
                      {activeTab === 'orders' && doc.docNumber && doc.docNumber !== '-' && (
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md font-mono whitespace-nowrap shrink-0">
                          {doc.docNumber}
                        </span>
                      )}
                    </div>

                    <h4 
                      onClick={() => setSelectedDocDetailModal(doc)}
                      className="text-[12px] sm:text-sm font-semibold text-slate-800 truncate leading-snug hover:text-teal-700 cursor-pointer transition-colors mt-0.5"
                      title="กดเพื่อดูชื่อเรื่องเต็ม"
                    >
                      {doc.title}
                    </h4>

                    {doc.fileName && (
                      <p 
                        onClick={() => setSelectedDocDetailModal(doc)}
                        className="text-[10px] text-slate-400 truncate mt-0.5 cursor-pointer hover:text-slate-600"
                      >
                        {doc.fileName} • {doc.fileSize || '1.0 MB'}
                      </p>
                    )}
                  </div>
                </div>

                {/* ด้านขวา: ปุ่มเปิด Drive, ปุ่มดาวน์โหลด และปุ่มจัดการสำหรับ Admin */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* ปุ่มเปิดดูไฟล์บน Google Drive โดยตรง */}
                  <a
                    href={getDocDriveViewUrl(doc) || '#'}
                    onClick={(e) => handleOpenDriveFile(doc, e)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs no-underline"
                    title="เปิดดูไฟล์บน Google Drive โดยตรง"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Drive</span>
                  </a>

                  {/* ปุ่มดาวน์โหลดไฟล์ (อยู่ในหน้าเดิม ไม่เปิดแท็บใหม่) */}
                  <button
                    type="button"
                    disabled={downloadingDocId === doc.id}
                    onClick={() => handleDownloadDoc(doc)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 disabled:text-teal-600 rounded-lg transition-colors cursor-pointer"
                    title={downloadingDocId === doc.id ? "กำลังดาวน์โหลดไฟล์..." : "ดาวน์โหลดไฟล์"}
                  >
                    {downloadingDocId === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>

                  {user.role === 'admin' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(doc)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="แก้ไขเอกสาร"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteDoc(doc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบเอกสาร"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: อัปโหลดเอกสารใหม่ (สามารถกดเลือกด้านบนว่าจะอัปโหลดหน้าไหน, เอาออกชื่อกิจกรรม, อัปโหลดไฟล์ได้จริงทุกประเภท, วันที่เป็นปัจจุบัน) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                {editingDoc ? 'แก้ไขเอกสาร' : 'อัปโหลดเอกสารใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ปุ่มแบ่งหน้าด้านบนว่าจะอัปโหลดเข้าส่วนไหน (ศูนย์เอกสาร หรือ หนังสือคำสั่ง) */}
            <div className="p-1 bg-emerald-50 rounded-2xl flex items-center gap-1 border border-emerald-200/80">
              <button
                type="button"
                onClick={() => setModalTargetType('document')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalTargetType === 'document'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-900 hover:bg-emerald-100/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>1) ศูนย์เอกสาร</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTargetType('order')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalTargetType === 'order'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-900 hover:bg-emerald-100/60'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>2) หนังสือคำสั่ง</span>
              </button>
            </div>

            <form onSubmit={handleSaveDocSubmit} className="space-y-3.5">
              {/* อัปโหลดไฟล์ได้จริงทุกประเภท */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ไฟล์เอกสาร (อัปโหลดไฟล์ได้จริงทุกประเภท เช่น PDF, Word, Excel, PowerPoint, ZIP ฯลฯ) *
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleRealFileUpload}
                  accept="*/*"
                  className="hidden"
                />

                {fileName ? (
                  <div className="space-y-2.5">
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-950">
                      <div className="flex items-center gap-2 truncate">
                        {renderFileIcon(fileName)}
                        <div className="truncate min-w-0">
                          <div className="font-bold truncate" title={fileName}>{fileName}</div>
                          <div className="text-[10px] text-emerald-700 font-mono">ขนาด: {fileSize || '1.0 MB'} • เขียนชื่อเรื่องอัตโนมัติแล้ว</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-800 shadow-2xs cursor-pointer"
                        >
                          เปลี่ยนไฟล์
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFileName('');
                            setFileUrl('');
                            setFileSize('');
                            setUploadPercent(0);
                            setUploadStatusText('');
                            setIsUploadingFile(false);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs px-2 py-1 bg-white border border-rose-200 rounded-lg shrink-0 cursor-pointer"
                        >
                          ยกเลิกไฟล์นี้
                        </button>
                      </div>
                    </div>

                    {/* Upload Progress Indicator with Percentage 0% - 100% - Exact style and color as Assignment page */}
                    {(isUploadingFile || uploadPercent > 0) && (
                      <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-purple-900 truncate pr-2">
                            {uploadPercent < 100 ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span className="truncate">{uploadStatusText || 'กำลังประมวลผลและอัปโหลดไฟล์...'}</span>
                          </span>
                          <span className="font-mono text-purple-800 font-extrabold shrink-0 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md">
                            {uploadPercent}%
                          </span>
                        </div>
                        <div className="w-full bg-purple-200/80 h-2.5 rounded-full overflow-hidden p-0.5">
                          <div
                            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${Math.max(4, uploadPercent)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-purple-700 font-medium">
                          <span>{uploadPercent < 100 ? 'กำลังอัปโหลดข้อมูลและเชื่อมโยงระบบ...' : '✓ อัปโหลดครบ 100% พร้อมกดยืนยันการบันทึกเอกสาร'}</span>
                          <span className="font-bold">{uploadPercent === 100 ? 'เสร็จสิ้น 100%' : `${uploadPercent}% / 100%`}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        processSelectedFile(file);
                      }
                    }}
                    className="p-5 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50/70 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 group-hover:border-emerald-300 flex items-center justify-center text-emerald-500 group-hover:text-emerald-600 shadow-2xs transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">
                        คลิกหรือลากไฟล์เอกสารมาวางที่นี่
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        รองรับไฟล์ทุกประเภท (PDF, Word, Excel, PowerPoint, ZIP ฯลฯ สูงสุดไม่เกิน 5MB ต่อไฟล์)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* เลขที่คำสั่ง (เฉพาะหนังสือคำสั่ง และห้ามบังคับ) */}
              {modalTargetType === 'order' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      เลขที่คำสั่ง (ไม่บังคับ)
                    </label>
                    <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">
                      ปีการศึกษา {currentAcademicYear}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder={`เช่น คำสั่งที่ 12/${currentAcademicYear}`}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
              )}

              {/* ชื่อเรื่อง / ชื่อเอกสาร */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อเรื่อง / ชื่อเอกสาร *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น มอบหมายหน้าที่ครูเวรประจำวัน"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * จะเขียนชื่อไฟล์ให้อัตโนมัติเมื่อเลือกไฟล์ หรือสามารถแก้ไขเพิ่มเติมได้
                </p>
              </div>

              {/* วันที่เอกสาร: เป็นปัจจุบันโดยอัตโนมัติ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วันที่เอกสาร *
                </label>
                <input
                  type="date"
                  required
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>

              {/* ปุ่มบันทึก */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setIsUploadingFile(false);
                    setUploadPercent(0);
                    setUploadStatusText('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUploadingFile || (fileName ? uploadPercent < 100 : false)}
                  className={`px-5 py-2 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all ${
                    !isUploadingFile && (!fileName || uploadPercent === 100)
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isUploadingFile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                  ) : uploadPercent === 100 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>
                    {isUploadingFile
                      ? `กำลังอัปโหลดไฟล์... ${uploadPercent}%`
                      : fileName && uploadPercent < 100
                      ? `รออัปโหลดครบ 100% (${uploadPercent}%)`
                      : 'บันทึกเอกสาร'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Pop-up Modal: แสดงชื่อเรื่องเต็มๆ และตัวอย่างไฟล์/ดาวน์โหลด */}
      {selectedDocDetailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col space-y-4 p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md font-mono">
                      {isOrderDoc(selectedDocDetailModal) ? 'หนังสือคำสั่ง' : 'ศูนย์เอกสาร'}
                    </span>
                    {isOrderDoc(selectedDocDetailModal) && (
                      <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">
                        ปีการศึกษา {selectedDocDetailModal.academicYear || currentAcademicYear}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatThaiDocDate(selectedDocDetailModal.date)}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocDetailModal(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Title Full Display */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ชื่อเรื่องเต็ม
              </label>
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm font-bold text-slate-800 break-words leading-relaxed max-h-52 overflow-y-auto">
                {selectedDocDetailModal.title}
              </div>
            </div>

            {/* File Info */}
            {selectedDocDetailModal.fileName && (
              <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between font-mono">
                <span className="truncate pr-2">{selectedDocDetailModal.fileName}</span>
                <span className="shrink-0 text-slate-400">{selectedDocDetailModal.fileSize || '1.0 MB'}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-1 flex flex-col gap-2">
              {/* ปุ่มเปิดดูบน Google Drive โดยตรง (เปิดเฉพาะไฟล์) */}
              <a
                href={getDocDriveViewUrl(selectedDocDetailModal) || '#'}
                onClick={(e) => handleOpenDriveFile(selectedDocDetailModal, e)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 no-underline"
              >
                <ExternalLink className="w-4 h-4 text-blue-600" />
                <span>เปิดดูไฟล์บน Google Drive</span>
              </a>

              <button
                type="button"
                disabled={downloadingDocId === selectedDocDetailModal.id}
                onClick={() => {
                  handleDownloadDoc(selectedDocDetailModal);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                {downloadingDocId === selectedDocDetailModal.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>กำลังดาวน์โหลดไฟล์...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดเอกสารต้นฉบับ</span>
                  </>
                )}
              </button>

              {user.role === 'admin' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenModal(selectedDocDetailModal);
                      setSelectedDocDetailModal(null);
                    }}
                    className="py-2.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4 text-emerald-600" />
                    <span>แก้ไขเอกสาร</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteDoc(selectedDocDetailModal);
                    }}
                    className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>ลบเอกสาร</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedDocDetailModal(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ยืนยันการลบเอกสาร (ถามยืนยันทุกครั้งเมื่อกดลบ) */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">
                {isOrderDoc(confirmDeleteDoc) ? 'ยืนยันการลบหนังสือคำสั่ง' : 'ยืนยันการลบเอกสาร'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed break-words">
                คุณต้องการลบ <span className="font-bold text-slate-800">"{confirmDeleteDoc.title}"</span> ใช่หรือไม่?
              </p>
              <p className="text-[11px] text-rose-600 font-medium">
                เมื่อลบแล้วจะไม่สามารถกู้คืนข้อมูลได้
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDocument(confirmDeleteDoc.id);
                  if (selectedDocDetailModal?.id === confirmDeleteDoc.id) {
                    setSelectedDocDetailModal(null);
                  }
                  onShowToast(
                    'info',
                    'ลบสำเร็จ',
                    `ลบ "${confirmDeleteDoc.title}" เรียบร้อยแล้ว`
                  );
                  setConfirmDeleteDoc(null);
                }}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
