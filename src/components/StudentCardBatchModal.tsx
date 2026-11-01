import React, { useState, useMemo } from 'react';
import { Student, SchoolInfo, GradeLevel, Personnel } from '../types';
import { StorageService } from '../services/storage';
import { 
  Printer, 
  Download, 
  X, 
  CreditCard, 
  Phone, 
  User, 
  ShieldCheck,
  Check,
  Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { domToCanvas } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

interface StudentCardBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  schoolInfo: SchoolInfo;
  personnel?: Personnel[];
  initialSide?: 'front' | 'back';
  initialGrade?: string;
  onShowToast?: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

const CARDS_PER_A4_PAGE = 8; // 2 columns x 4 rows fits standard CR80 (85.6mm x 54mm) on A4 Portrait

/**
 * Converts unsupported CSS Color 4 functions (oklch, oklab, lab, lch, color-mix, color)
 * and gradient interpolation tokens ("in oklab", "in oklch") into standard rgb/rgba
 * inside html2canvas's cloned document so html2canvas renders 100% faithfully without crashing.
 */
export const sanitizeOklchForHtml2Canvas = (clonedDoc: Document): void => {
  try {
    const canvas = clonedDoc.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const colorCache = new Map<string, string>();

    const singleColorToRgb = (cssColor: string): string => {
      const trimmed = cssColor.trim();
      if (!trimmed || trimmed.includes('var(')) return cssColor;
      const cached = colorCache.get(trimmed);
      if (cached) return cached;

      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillStyle = trimmed;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        const result =
          a === 0
            ? 'rgba(0, 0, 0, 0)'
            : a === 255
            ? `rgb(${r}, ${g}, ${b})`
            : `rgba(${r}, ${g}, ${b}, ${+(a / 255).toFixed(3)})`;
        colorCache.set(trimmed, result);
        return result;
      } catch {
        return cssColor;
      }
    };

    const sanitizeCssText = (cssText: string): string => {
      if (!cssText) return cssText;
      let out = cssText;

      // Remove CSS Color 4 gradient color-space interpolation tokens unsupported by html2canvas
      if (out.includes('in ')) {
        out = out.replace(
          /\bin\s+(?:oklab|oklch|srgb-linear|srgb|hsl|hwb|lab|lch|xyz|xyz-d50|xyz-d65)(?:\s+(?:shorter|longer|increasing|decreasing)\s+hue)?\s*,/gi,
          'to bottom,'
        );
        out = out.replace(
          /\s*\bin\s+(?:oklab|oklch|srgb-linear|srgb|hsl|hwb|lab|lch|xyz|xyz-d50|xyz-d65)(?:\s+(?:shorter|longer|increasing|decreasing)\s+hue)?\b/gi,
          ''
        );
      }

      if (
        !out.includes('oklch') &&
        !out.includes('oklab') &&
        !out.includes('lch(') &&
        !out.includes('lab(') &&
        !out.includes('color(') &&
        !out.includes('color-mix(')
      ) {
        return out;
      }

      // 1. Replace direct oklch(...), oklab(...), lch(...), lab(...), color(...)
      out = out.replace(
        /\b(?:oklch|oklab|lch|lab|color)\(\s*[^()]+\)/gi,
        (match) => singleColorToRgb(match)
      );

      // 2. Replace color-mix(...) that have no unresolved var()
      out = out.replace(
        /\bcolor-mix\((?:[^()]+|\([^()]*\))*\)/gi,
        (match) => singleColorToRgb(match)
      );

      return out;
    };

    // Sanitize all <style> tags in the cloned document first
    const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
    for (const styleTag of styleTags) {
      if (styleTag.textContent) {
        styleTag.textContent = sanitizeCssText(styleTag.textContent);
      }
    }

    // Sanitize computed styles on all elements in the cloned document
    const win = clonedDoc.defaultView || window;
    const colorProps: Array<[keyof CSSStyleDeclaration, string]> = [
      ['color', 'color'],
      ['backgroundColor', 'background-color'],
      ['borderTopColor', 'border-top-color'],
      ['borderRightColor', 'border-right-color'],
      ['borderBottomColor', 'border-bottom-color'],
      ['borderLeftColor', 'border-left-color'],
      ['outlineColor', 'outline-color'],
      ['textDecorationColor', 'text-decoration-color'],
      ['boxShadow', 'box-shadow'],
      ['textShadow', 'text-shadow'],
      ['backgroundImage', 'background-image'],
      ['fill' as keyof CSSStyleDeclaration, 'fill'],
      ['stroke' as keyof CSSStyleDeclaration, 'stroke'],
    ];

    const allElements = [
      clonedDoc.documentElement,
      clonedDoc.body,
      ...Array.from(clonedDoc.querySelectorAll<HTMLElement | SVGElement>('*')),
    ].filter(Boolean);

    for (const el of allElements) {
      if (!el || !('style' in el)) continue;
      const computed = win.getComputedStyle(el as Element);
      if (!computed) continue;

      for (const [jsProp, cssProp] of colorProps) {
        const val = computed[jsProp] as unknown as string;
        if (
          typeof val === 'string' &&
          (val.includes('oklch') ||
            val.includes('oklab') ||
            val.includes('lch(') ||
            val.includes('lab(') ||
            val.includes('color(') ||
            val.includes('color-mix(') ||
            val.includes('in '))
        ) {
          const sanitized = sanitizeCssText(val);
          if (sanitized !== val) {
            (el as HTMLElement).style.setProperty(cssProp, sanitized, 'important');
          }
        }
      }
    }
  } catch (e) {
    console.warn('sanitizeOklchForHtml2Canvas warning:', e);
  }
};

/**
 * Renders an A4 DOM element into a high-resolution HTMLCanvasElement with 100% visual fidelity.
 * Uses native browser rendering via modern-screenshot (SVG foreignObject) so Thai typography,
 * flexbox/grid alignment, gradients, and object-fit images match the screen preview 100%,
 * with an automatic fallback to html2canvas.
 */
export const captureElementAsA4Canvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
  if (document.fonts) {
    await document.fonts.ready;
  }

  // Wait for any images inside the element to finish decoding
  const imgs = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  const origShadow = element.style.boxShadow;
  const origBorder = element.style.border;
  const origMargin = element.style.margin;
  element.style.boxShadow = 'none';
  element.style.border = 'none';
  element.style.margin = '0';

  try {
    const canvas = await domToCanvas(element, {
      scale: 3.5,
      backgroundColor: '#ffffff',
      style: {
        boxShadow: 'none',
        border: 'none',
        margin: '0',
        transform: 'none',
      },
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList.contains('no-print')) {
          return false;
        }
        return true;
      },
    });
    return canvas;
  } catch (primaryErr) {
    console.warn('Primary domToCanvas fallback to html2canvas:', primaryErr);
    return await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollY: 0,
      scrollX: 0,
      ignoreElements: (el) => !!(el.classList && el.classList.contains('no-print')),
      onclone: (clonedDoc) => sanitizeOklchForHtml2Canvas(clonedDoc),
    });
  } finally {
    element.style.boxShadow = origShadow;
    element.style.border = origBorder;
    element.style.margin = origMargin;
  }
};

/**
 * Stage mapping helper:
 * อ.1 - 3  -> ชั้นอนุบาล
 * ป.1 - 3  -> ชั้นประถมศึกษาตอนต้น
 * ป.4 - 6  -> ชั้นประถมศึกษาตอนปลาย
 * ม.1 - 3  -> ชั้นมัธยมศึกษาตอนต้น
 * ม.4 - 6  -> ชั้นมัธยมศึกษาตอนปลาย
 */
export const getGradeStageLabel = (gradeLevel: string): string => {
  const g = (gradeLevel || '').trim();
  if (g.startsWith('อ.')) return 'ชั้นอนุบาล';
  if (['ป.1', 'ป.2', 'ป.3'].includes(g)) return 'ชั้นประถมศึกษาตอนต้น';
  if (['ป.4', 'ป.5', 'ป.6'].includes(g)) return 'ชั้นประถมศึกษาตอนปลาย';
  if (['ม.1', 'ม.2', 'ม.3'].includes(g)) return 'ชั้นมัธยมศึกษาตอนต้น';
  if (g.includes('อนุบาล')) return 'ชั้นอนุบาล';
  if (g.includes('ประถม')) return 'ชั้นประถมศึกษา';
  return `ชั้น${g}`;
};

export const StudentCardBatchModal: React.FC<StudentCardBatchModalProps> = ({
  isOpen,
  onClose,
  students,
  schoolInfo,
  personnel = [],
  initialSide = 'front',
  initialGrade = 'all',
  onShowToast
}) => {
  const [cardSide, setCardSide] = useState<'front' | 'back'>(initialSide);
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);

  // Sync initial side or grade if props change
  React.useEffect(() => {
    if (isOpen) {
      setCardSide(initialSide);
      if (initialGrade && initialGrade !== 'ประถม' && initialGrade !== 'มัธยม') {
        setSelectedGrade(initialGrade);
      } else {
        setSelectedGrade('all');
      }
    }
  }, [isOpen, initialSide, initialGrade]);

  // Personnel list fallback to StorageService if prop is empty
  const activePersonnel = useMemo(() => {
    if (personnel && personnel.length > 0) return personnel;
    try {
      return StorageService.getPersonnel() || [];
    } catch {
      return [];
    }
  }, [personnel]);

  // Find school director and director's uploaded signature
  const director = useMemo(() => {
    if (!activePersonnel || activePersonnel.length === 0) return null;
    return activePersonnel.find(p => 
      (p.position && p.position.includes('ผู้อำนวยการ')) ||
      (p.personnelType && p.personnelType.includes('ผู้อำนวยการ'))
    ) || activePersonnel.find(p => p.personnelType === 'ผู้บริหาร' || p.personnelType === 'ผู้อำนวยการ') || null;
  }, [activePersonnel]);

  const rawSchoolName = (schoolInfo.schoolName || 'บ้านไสโป๊ะ').trim();
  const cleanSchool = rawSchoolName.replace(/^โรงเรียน/, '').trim() || 'บ้านไสโป๊ะ';
  const defaultDirectorPosition = `ผู้อำนวยการโรงเรียน${cleanSchool}`;

  // ดึงข้อมูลตำแหน่งจากช่องตำแหน่งของข้อมูลบุคลากร (Personnel -> position)
  const directorPositionTitle = useMemo(() => {
    const rawPos = (director?.position || '').trim();
    if (!rawPos) {
      return defaultDirectorPosition;
    }
    // หากเป็นเพียงคำกว้างๆ เช่น "ผู้อำนวยการ" หรือ "ผู้อำนวยการโรงเรียน" หรือ "ผู้อำนวยการสถานศึกษา" ให้ประกอบชื่อโรงเรียนเป็น "ผู้อำนวยการโรงเรียนบ้านไสโป๊ะ"
    if (rawPos === 'ผู้อำนวยการ' || rawPos === 'ผู้อำนวยการโรงเรียน' || rawPos === 'ผู้อำนวยการสถานศึกษา') {
      return defaultDirectorPosition;
    }
    return rawPos;
  }, [director, defaultDirectorPosition]);

  const directorSignature = director?.signatureUrl;
  const directorDisplayName = schoolInfo.directorName || 
    (director ? `${director.prefix || ''}${director.firstName} ${director.lastName}`.trim() : 'ผู้อำนวยการโรงเรียน');

  // Available grade levels present in the school's students
  const availableGrades = useMemo(() => {
    const gradeOrder: GradeLevel[] = [
      'อ.1', 'อ.2', 'อ.3',
      'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
      'ม.1', 'ม.2', 'ม.3'
    ];
    const unique = Array.from(new Set(students.map(s => s.gradeLevel))).filter(Boolean);
    return gradeOrder.filter(g => unique.includes(g));
  }, [students]);

  // Filter students based on selected grade
  const targetStudents = useMemo(() => {
    const list = selectedGrade === 'all'
      ? students
      : students.filter(s => s.gradeLevel === selectedGrade);

    return [...list].sort((a, b) => {
      if (a.gradeLevel !== b.gradeLevel) {
        return a.gradeLevel.localeCompare(b.gradeLevel);
      }
      if (a.rollNumber !== undefined && b.rollNumber !== undefined) {
        return a.rollNumber - b.rollNumber;
      }
      if (a.rollNumber !== undefined) return -1;
      if (b.rollNumber !== undefined) return 1;
      return (a.studentCode || '').localeCompare(b.studentCode || '');
    });
  }, [students, selectedGrade]);

  // Chunk students into pages of 8 cards
  const studentPages = useMemo(() => {
    const pages: Student[][] = [];
    for (let i = 0; i < targetStudents.length; i += CARDS_PER_A4_PAGE) {
      pages.push(targetStudents.slice(i, i + CARDS_PER_A4_PAGE));
    }
    return pages;
  }, [targetStudents]);

  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
    if (onShowToast) {
      onShowToast(
        'success',
        'เตรียมพิมพ์',
        `พร้อมพิมพ์บัตรนักเรียน (${cardSide === 'front' ? 'หน้าบัตร' : 'หลังบัตร'}) ขนาด 85.6 × 54 มม. บนกระดาษ A4 แนวตั้ง`
      );
    }
  };

  // Helper date formatter
  const formatThaiBirthDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const shortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const thaiYear = y > 2400 ? y : y + 543;
        return `${d} ${shortMonths[m] || ''} ${thaiYear}`;
      }
    } catch {}
    return dateStr;
  };

  const academicYear = schoolInfo.academicYear || '2569';
  const nextYear = String(parseInt(academicYear, 10) + 1);

  /**
   * Loads an image URL or Data URL into an HTMLImageElement for high-DPI canvas drawing.
   */
  const loadImageElement = (url?: string): Promise<HTMLImageElement | null> => {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      if (!url.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Retry without crossOrigin if CORS header is missing
        if (!url.startsWith('data:')) {
          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackImg);
          fallbackImg.onerror = () => resolve(null);
          fallbackImg.src = url;
        } else {
          resolve(null);
        }
      };
      img.src = url;
    });
  };

  /**
   * Renders a full A4 page (210mm x 297mm) of up to 8 CR80 Student ID Cards (85.6mm x 54mm)
   * directly onto a 406-DPI HTML5 Canvas (16 px/mm -> 3360 x 4752 px).
   * Guarantees crystal-clear vector-grade Thai text/photos and 0% chance of line wrapping.
   */
  const renderStudentCardPageCanvas = async (
    pageStudents: Student[],
    side: 'front' | 'back'
  ): Promise<HTMLCanvasElement> => {
    if (document.fonts) {
      await document.fonts.ready;
    }

    const PX_PER_MM = 16; // 406.4 DPI (3360 x 4752 px per A4 sheet)
    const mm = (val: number) => val * PX_PER_MM;
    const cssPx = (px: number) => px * (PX_PER_MM / 3.779527559);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(mm(210));
    canvas.height = Math.round(mm(297));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Pure white A4 background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const FONT_SANS = '"Sarabun", "Plus Jakarta Sans", sans-serif';
    const FONT_MONO = '"JetBrains Mono", "Sarabun", monospace';

    // Helper: draw rounded rectangle path
    const traceRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    };

    // Helper: draw image with object-fit: cover or contain
    const drawFittedImage = (
      img: HTMLImageElement,
      boxX: number,
      boxY: number,
      boxW: number,
      boxH: number,
      mode: 'cover' | 'contain'
    ) => {
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return;

      if (mode === 'cover') {
        const scale = Math.max(boxW / iw, boxH / ih);
        const sw = boxW / scale;
        const sh = boxH / scale;
        const sx = (iw - sw) / 2;
        const sy = (ih - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, boxX, boxY, boxW, boxH);
      } else {
        const scale = Math.min(boxW / iw, boxH / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = boxX + (boxW - dw) / 2;
        const dy = boxY + (boxH - dh) / 2;
        ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
      }
    };

    // Helper: draw single-line text that automatically shrinks font size if needed so it NEVER wraps or overflows
    const drawSingleLineText = (
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      opts: {
        fontSizePx: number;
        minFontSizePx?: number;
        fontWeight?: string | number;
        fontFamily?: string;
        color: string;
        align?: CanvasTextAlign;
        baseline?: CanvasTextBaseline;
      }
    ): number => {
      const family = opts.fontFamily || FONT_SANS;
      const weight = opts.fontWeight ?? 400;
      const minPx = opts.minFontSizePx ?? 4.5;
      let currentPx = opts.fontSizePx;

      ctx.save();
      ctx.fillStyle = opts.color;
      ctx.textAlign = opts.align || 'left';
      ctx.textBaseline = opts.baseline || 'middle';

      ctx.font = `${weight} ${cssPx(currentPx)}px ${family}`;
      while (maxWidth > 0 && ctx.measureText(text).width > maxWidth && currentPx > minPx) {
        currentPx = Math.max(minPx, currentPx - 0.2);
        ctx.font = `${weight} ${cssPx(currentPx)}px ${family}`;
      }

      ctx.fillText(text, x, y);
      const drawnWidth = ctx.measureText(text).width;
      ctx.restore();
      return drawnWidth;
    };

    // Preload shared images (school logo & director signature)
    const [logoImg, signatureImg, ...studentPhotos] = await Promise.all([
      loadImageElement(schoolInfo.logoUrl),
      loadImageElement(directorSignature),
      ...pageStudents.map((s) => loadImageElement(s.photoUrl)),
    ]);

    const startX = mm(15.15);
    const startY = mm(14);
    const cardW = mm(85.6);
    const cardH = mm(54);
    const gapX = mm(8.5);
    const gapY = mm(6.5);

    for (let idx = 0; idx < pageStudents.length; idx++) {
      const student = pageStudents[idx];
      const photoImg = studentPhotos[idx];
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);

      const codeDisplay = student.studentCode || '-';
      const idCardDisplay = student.idCard || student.citizenId || '-';
      const gradeStage = getGradeStageLabel(student.gradeLevel);
      const emergencyPhone =
        student.guardianPhone || student.fatherPhone || student.motherPhone || schoolInfo.phone || '-';

      ctx.save();
      // Clip card to rounded 3mm rectangle
      traceRoundRect(cx, cy, cardW, cardH, mm(3));
      ctx.clip();

      if (side === 'front') {
        /* ===================== FRONT OF CARD (85.6 x 54 mm) ===================== */
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx, cy, cardW, cardH);

        // 1. Top Header (13mm tall) with Royal Blue -> Indigo Gradient
        const headerH = mm(13);
        const grad = ctx.createLinearGradient(cx, cy, cx + cardW, cy);
        grad.addColorStop(0, '#1d4ed8');
        grad.addColorStop(0.5, '#1e40af');
        grad.addColorStop(1, '#312e81');
        ctx.fillStyle = grad;
        ctx.fillRect(cx, cy, cardW, headerH);

        // Subtle decorative circle on right of header
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx + cardW - mm(3), cy + headerH - mm(1), mm(8), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fill();
        ctx.restore();

        // School Logo (8.5mm x 8.5mm circle)
        const logoSize = mm(8.5);
        const logoX = cx + mm(2.5);
        const logoY = cy + (headerH - logoSize) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        if (logoImg) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.fill();
          ctx.clip();
          const pad = mm(0.5);
          drawFittedImage(logoImg, logoX + pad, logoY + pad, logoSize - pad * 2, logoSize - pad * 2, 'contain');
        } else {
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
          drawSingleLineText('รร', logoX + logoSize / 2, logoY + logoSize / 2, logoSize, {
            fontSizePx: 9,
            fontWeight: 900,
            color: '#172554',
            align: 'center',
          });
        }
        ctx.restore();

        // Academic Year Badge on Right of Header
        const badgeText = `ปีการศึกษา ${academicYear}`;
        ctx.font = `800 ${cssPx(7)}px ${FONT_SANS}`;
        const badgeTextW = ctx.measureText(badgeText).width;
        const badgePadX = mm(1.6);
        const badgeW = badgeTextW + badgePadX * 2;
        const badgeH = mm(4.4);
        const badgeX = cx + cardW - mm(2.5) - badgeW;
        const badgeY = cy + (headerH - badgeH) / 2;

        traceRoundRect(badgeX, badgeY, badgeW, badgeH, mm(1));
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        drawSingleLineText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2, badgeW - mm(1), {
          fontSizePx: 7,
          fontWeight: 800,
          color: '#172554',
          align: 'center',
        });

        // School Name & Subtitle in Header
        const titleLeftX = logoX + logoSize + mm(1.6);
        const titleMaxW = badgeX - titleLeftX - mm(1.8);
        drawSingleLineText(
          schoolInfo.schoolName || 'โรงเรียนวัดผลประเมินพัฒนาการ',
          titleLeftX,
          cy + mm(4.8),
          titleMaxW,
          {
            fontSizePx: 9.5,
            minFontSizePx: 6.5,
            fontWeight: 900,
            color: '#fcd34d',
            align: 'left',
          }
        );
        drawSingleLineText(
          'บัตรประจำตัวนักเรียน • STUDENT IDENTITY CARD',
          titleLeftX,
          cy + mm(8.8),
          titleMaxW,
          {
            fontSizePx: 6.8,
            minFontSizePx: 5.2,
            fontWeight: 600,
            color: '#dbeafe',
            align: 'left',
          }
        );

        // 2. Thin Gold Accent Stripe (1mm)
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(cx, cy + headerH, cardW, mm(1));

        // 3. Card Body (y = 14mm to 52mm)
        const bodyTop = cy + mm(14);

        // Left Column: Photo (22mm x 27.5mm) + ID Badge
        const photoW = mm(22);
        const photoH = mm(27.5);
        const photoX = cx + mm(2.8);
        const photoY = bodyTop + mm(2);

        ctx.save();
        traceRoundRect(photoX, photoY, photoW, photoH, mm(2));
        ctx.fillStyle = '#f8fafc';
        ctx.fill();
        ctx.clip();
        if (photoImg) {
          drawFittedImage(photoImg, photoX, photoY, photoW, photoH, 'cover');
        } else {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(photoX, photoY, photoW, photoH);
          // User silhouette icon
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.arc(photoX + photoW / 2, photoY + mm(9.5), mm(3.2), 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(photoX + photoW / 2, photoY + mm(19.5), mm(5.5), Math.PI, 0, false);
          ctx.fill();
          drawSingleLineText('ไม่มีรูปถ่าย', photoX + photoW / 2, photoY + mm(23), photoW - mm(2), {
            fontSizePx: 6.5,
            fontWeight: 700,
            color: '#94a3b8',
            align: 'center',
          });
        }
        ctx.restore();

        // Photo border
        ctx.save();
        traceRoundRect(photoX, photoY, photoW, photoH, mm(2));
        ctx.lineWidth = cssPx(1.8);
        ctx.strokeStyle = '#60a5fa';
        ctx.stroke();
        ctx.restore();

        // ID Badge below photo
        const idBoxY = photoY + photoH + mm(1.2);
        const idBoxH = mm(4.4);
        traceRoundRect(photoX, idBoxY, photoW, idBoxH, mm(1));
        ctx.fillStyle = '#eff6ff';
        ctx.fill();
        ctx.lineWidth = cssPx(0.8);
        ctx.strokeStyle = '#bfdbfe';
        ctx.stroke();

        drawSingleLineText(`ID: ${codeDisplay}`, photoX + photoW / 2, idBoxY + idBoxH / 2, photoW - mm(1.5), {
          fontSizePx: 7.5,
          minFontSizePx: 5.5,
          fontWeight: 700,
          fontFamily: FONT_MONO,
          color: '#172554',
          align: 'center',
        });

        // Right Column (Particulars & Signature)
        const rightX = photoX + photoW + mm(2.8);
        const rightW = cx + cardW - mm(2.8) - rightX;

        // Student Full Name & Nickname
        const fullName = `${student.prefix || ''}${student.firstName || ''} ${student.lastName || ''}`.trim();
        drawSingleLineText(fullName, rightX, bodyTop + mm(3.8), rightW, {
          fontSizePx: 11.8,
          minFontSizePx: 8,
          fontWeight: 900,
          color: '#0f172a',
          align: 'left',
        });

        let nameDividerY = bodyTop + mm(7.2);
        if (student.nickname) {
          drawSingleLineText(`ชื่อเล่น: ${student.nickname}`, rightX, bodyTop + mm(7.3), rightW, {
            fontSizePx: 7.8,
            minFontSizePx: 6,
            fontWeight: 600,
            color: '#64748b',
            align: 'left',
          });
          nameDividerY = bodyTop + mm(9.6);
        }

        // Divider under student name
        ctx.beginPath();
        ctx.moveTo(rightX, nameDividerY);
        ctx.lineTo(rightX + rightW, nameDividerY);
        ctx.lineWidth = cssPx(0.8);
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();

        // Particulars 3 rows (National ID, Grade Stage Badge, Birth Date & Blood Group)
        const row1Y = nameDividerY + mm(3.1);
        const row2Y = row1Y + mm(4.7);
        const row3Y = row2Y + mm(4.7);

        // Row 1: เลขประชาชน
        const lblIdW = drawSingleLineText('เลขประชาชน:', rightX, row1Y, mm(20), {
          fontSizePx: 7.5,
          fontWeight: 600,
          color: '#64748b',
        });
        drawSingleLineText(
          idCardDisplay,
          rightX + lblIdW + mm(1.5),
          row1Y,
          rightW - lblIdW - mm(1.5),
          {
            fontSizePx: 8.5,
            minFontSizePx: 6.5,
            fontWeight: 700,
            fontFamily: FONT_MONO,
            color: '#0f172a',
          }
        );

        // Row 2: ระดับชั้น + Pill Badge (never wraps!)
        const lblGradeW = drawSingleLineText('ระดับชั้น:', rightX, row2Y, mm(16), {
          fontSizePx: 7.5,
          fontWeight: 600,
          color: '#64748b',
        });

        const pillX = rightX + lblGradeW + mm(1.5);
        const pillMaxW = rightW - lblGradeW - mm(1.5);
        ctx.font = `700 ${cssPx(8.5)}px ${FONT_SANS}`;
        const rawStageW = ctx.measureText(gradeStage).width;
        const pillPadX = mm(1.8);
        const pillW = Math.min(pillMaxW, rawStageW + pillPadX * 2);
        const pillH = mm(4.1);

        traceRoundRect(pillX, row2Y - pillH / 2, pillW, pillH, mm(1));
        ctx.fillStyle = '#eff6ff';
        ctx.fill();
        ctx.lineWidth = cssPx(0.8);
        ctx.strokeStyle = '#bfdbfe';
        ctx.stroke();

        drawSingleLineText(
          gradeStage,
          pillX + pillW / 2,
          row2Y,
          pillW - mm(1.4),
          {
            fontSizePx: 8.5,
            minFontSizePx: 6.2,
            fontWeight: 700,
            color: '#1e3a8a',
            align: 'center',
          }
        );

        // Row 3: วันเกิด & หมู่เลือด (both guaranteed single-line!)
        let bloodReservedW = 0;
        if (student.bloodGroup) {
          const bloodValW = drawSingleLineText(
            student.bloodGroup,
            rightX + rightW,
            row3Y,
            mm(10),
            {
              fontSizePx: 7.5,
              fontWeight: 700,
              color: '#be123c',
              align: 'right',
            }
          );
          const bloodLblW = drawSingleLineText(
            'หมู่เลือด:',
            rightX + rightW - bloodValW - mm(0.8),
            row3Y,
            mm(14),
            {
              fontSizePx: 7.3,
              fontWeight: 600,
              color: '#64748b',
              align: 'right',
            }
          );
          bloodReservedW = bloodValW + bloodLblW + mm(2.5);
        }

        const lblDobW = drawSingleLineText('วันเกิด:', rightX, row3Y, mm(13), {
          fontSizePx: 7.5,
          fontWeight: 600,
          color: '#64748b',
        });
        drawSingleLineText(
          formatThaiBirthDate(student.birthDate),
          rightX + lblDobW + mm(1.2),
          row3Y,
          rightW - lblDobW - mm(1.2) - bloodReservedW,
          {
            fontSizePx: 7.6,
            minFontSizePx: 6,
            fontWeight: 700,
            color: '#1e293b',
          }
        );

        // Signature Section Divider
        const sigDividerY = cy + mm(39.4);
        ctx.beginPath();
        ctx.moveTo(rightX, sigDividerY);
        ctx.lineTo(rightX + rightW, sigDividerY);
        ctx.lineWidth = cssPx(0.7);
        ctx.strokeStyle = '#f1f5f9';
        ctx.stroke();

        // Left: Issued By (constrained width so it never touches director name)
        const sigBlockW = mm(34);
        const sigCenterX = rightX + rightW - sigBlockW / 2;
        const issuedByMaxW = rightW - sigBlockW - mm(1);

        drawSingleLineText(
          `ออกโดย ${schoolInfo.schoolName || 'สถานศึกษา'}`,
          rightX,
          cy + mm(49.5),
          issuedByMaxW,
          {
            fontSizePx: 5.8,
            minFontSizePx: 4.5,
            fontWeight: 500,
            color: '#94a3b8',
            align: 'left',
          }
        );

        // Right: Director Signature + ( Name ) + Position (all single-line auto-fitted!)
        if (signatureImg) {
          drawFittedImage(
            signatureImg,
            sigCenterX - mm(13),
            sigDividerY + mm(0.4),
            mm(26),
            mm(5.6),
            'contain'
          );
        } else {
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([mm(0.5), mm(0.5)]);
          ctx.moveTo(sigCenterX - mm(10), sigDividerY + mm(4.8));
          ctx.lineTo(sigCenterX + mm(10), sigDividerY + mm(4.8));
          ctx.lineWidth = cssPx(0.8);
          ctx.strokeStyle = '#cbd5e1';
          ctx.stroke();
          ctx.restore();
        }

        drawSingleLineText(
          `( ${directorDisplayName} )`,
          sigCenterX,
          cy + mm(47.3),
          sigBlockW,
          {
            fontSizePx: 7.4,
            minFontSizePx: 5.5,
            fontWeight: 700,
            color: '#0f172a',
            align: 'center',
          }
        );

        drawSingleLineText(
          directorPositionTitle,
          sigCenterX,
          cy + mm(49.8),
          sigBlockW,
          {
            fontSizePx: 6.3,
            minFontSizePx: 4.8,
            fontWeight: 500,
            color: '#64748b',
            align: 'center',
          }
        );

        // 4. Bottom Micro Strip (2mm tall)
        const footerH = mm(2);
        const footerY = cy + cardH - footerH;
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(cx, footerY, cardW, footerH);

        drawSingleLineText(
          'กระทรวงศึกษาธิการ • MINISTRY OF EDUCATION',
          cx + mm(2.5),
          footerY + footerH / 2,
          mm(55),
          {
            fontSizePx: 5,
            fontWeight: 500,
            color: '#bfdbfe',
            align: 'left',
          }
        );
        drawSingleLineText(
          `VALID THRU 03/${nextYear}`,
          cx + cardW - mm(2.5),
          footerY + footerH / 2,
          mm(25),
          {
            fontSizePx: 5,
            fontWeight: 600,
            fontFamily: FONT_MONO,
            color: '#bfdbfe',
            align: 'right',
          }
        );
      } else {
        /* ===================== BACK OF CARD (85.6 x 54 mm) ===================== */
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cx, cy, cardW, cardH);

        const padX = mm(2.8);
        const innerW = cardW - padX * 2;
        const centerX = cx + cardW / 2;

        // 1. Header School Info
        drawSingleLineText(
          schoolInfo.schoolName || 'โรงเรียนวัดผลประเมินพัฒนาการ',
          centerX,
          cy + mm(4.2),
          innerW,
          {
            fontSizePx: 9,
            minFontSizePx: 6.5,
            fontWeight: 900,
            color: '#172554',
            align: 'center',
          }
        );

        if (schoolInfo.address) {
          drawSingleLineText(schoolInfo.address, centerX, cy + mm(7.3), innerW, {
            fontSizePx: 6.4,
            minFontSizePx: 4.8,
            fontWeight: 500,
            color: '#475569',
            align: 'center',
          });
        }

        drawSingleLineText(
          `โทรศัพท์ติดต่อ: ${schoolInfo.phone || 'ยังไม่ได้ระบุ'}`,
          centerX,
          cy + (schoolInfo.address ? mm(10.1) : mm(7.8)),
          innerW,
          {
            fontSizePx: 6.8,
            minFontSizePx: 5.5,
            fontWeight: 700,
            color: '#1e3a8a',
            align: 'center',
          }
        );

        // Header bottom border
        const headerBottomY = cy + mm(12.2);
        ctx.beginPath();
        ctx.moveTo(cx + padX, headerBottomY);
        ctx.lineTo(cx + cardW - padX, headerBottomY);
        ctx.lineWidth = cssPx(0.8);
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();

        // 2. Rules Box
        const rulesY = cy + mm(13.4);
        const rulesH = mm(20.6);
        traceRoundRect(cx + padX, rulesY, innerW, rulesH, mm(1.4));
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = cssPx(0.8);
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();

        const ruleTextX = cx + padX + mm(1.8);
        const ruleMaxW = innerW - mm(3.6);
        drawSingleLineText(
          'ข้อปฏิบัติในการใช้บัตรประจำตัวนักเรียน:',
          ruleTextX,
          rulesY + mm(2.8),
          ruleMaxW,
          {
            fontSizePx: 6.8,
            fontWeight: 700,
            color: '#1e3a8a',
          }
        );

        const rules = [
          '1. บัตรนี้เป็นเอกสารแสดงตนของผู้ถือบัตร และเป็นสมบัติของโรงเรียน',
          '2. นักเรียนต้องพกติดตัวตลอดเวลาขณะอยู่ในสถานศึกษา และแสดงเมื่อเจ้าหน้าที่ร้องขอ',
          '3. ใช้ในการติดต่อราชการ เข้าห้องสอบ ยืม-คืนหนังสือห้องสมุด และร่วมกิจกรรม',
          '4. หากเก็บบัตรนี้ได้ กรุณาส่งคืนสถานศึกษาตามที่อยู่ข้างต้น หรือหย่อนลงตู้ไปรษณีย์',
        ];
        rules.forEach((ruleLine, rIdx) => {
          drawSingleLineText(
            ruleLine,
            ruleTextX,
            rulesY + mm(6.6 + rIdx * 3.6),
            ruleMaxW,
            {
              fontSizePx: 6.2,
              minFontSizePx: 5,
              fontWeight: 500,
              color: '#334155',
            }
          );
        });

        // 3. Student Details Summary Bar
        const summaryY = cy + mm(35.3);
        const summaryH = mm(5.2);
        traceRoundRect(cx + padX, summaryY, innerW, summaryH, mm(1.2));
        ctx.fillStyle = '#eff6ff';
        ctx.fill();
        ctx.lineWidth = cssPx(0.8);
        ctx.strokeStyle = '#bfdbfe';
        ctx.stroke();

        const summaryMidY = summaryY + summaryH / 2;
        const phoneValW = drawSingleLineText(
          emergencyPhone,
          cx + cardW - padX - mm(2),
          summaryMidY,
          mm(24),
          {
            fontSizePx: 7,
            fontWeight: 700,
            fontFamily: FONT_MONO,
            color: '#be123c',
            align: 'right',
          }
        );
        const phoneLblW = drawSingleLineText(
          'ฉุกเฉินโทร: ',
          cx + cardW - padX - mm(2) - phoneValW,
          summaryMidY,
          mm(16),
          {
            fontSizePx: 7,
            fontWeight: 500,
            color: '#64748b',
            align: 'right',
          }
        );

        const holderLblW = drawSingleLineText(
          'ผู้ถือบัตร: ',
          cx + padX + mm(2),
          summaryMidY,
          mm(15),
          {
            fontSizePx: 7,
            fontWeight: 500,
            color: '#64748b',
            align: 'left',
          }
        );
        drawSingleLineText(
          `${student.prefix || ''}${student.firstName || ''} ${student.lastName || ''}`.trim(),
          cx + padX + mm(2) + holderLblW,
          summaryMidY,
          innerW - mm(4) - holderLblW - phoneLblW - phoneValW - mm(2),
          {
            fontSizePx: 7,
            minFontSizePx: 5.5,
            fontWeight: 700,
            color: '#0f172a',
            align: 'left',
          }
        );

        // 4. Barcode & Validity Strip
        const bottomDividerY = cy + mm(42);
        ctx.beginPath();
        ctx.moveTo(cx + padX, bottomDividerY);
        ctx.lineTo(cx + cardW - padX, bottomDividerY);
        ctx.lineWidth = cssPx(0.8);
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();

        // Barcode bars
        let barX = cx + padX;
        const barY = cy + mm(43.4);
        const barH = mm(3.6);
        for (let b = 0; b < 38; b++) {
          const wPx = b % 4 === 0 ? cssPx(2) : b % 3 === 0 ? cssPx(1.5) : cssPx(0.8);
          ctx.fillStyle = b % 5 === 0 ? 'rgba(15, 23, 42, 0.35)' : '#0f172a';
          ctx.fillRect(barX, barY, wPx, barH);
          barX += wPx + cssPx(1);
        }

        drawSingleLineText(`*${codeDisplay}*`, cx + padX, cy + mm(49.2), mm(35), {
          fontSizePx: 5.5,
          fontWeight: 600,
          fontFamily: FONT_MONO,
          color: '#64748b',
          align: 'left',
        });

        drawSingleLineText(
          `วันออกบัตร: 16 พ.ค. ${academicYear}`,
          cx + cardW - padX,
          cy + mm(45.2),
          mm(40),
          {
            fontSizePx: 6,
            fontWeight: 500,
            color: '#475569',
            align: 'right',
          }
        );
        drawSingleLineText(
          `วันหมดอายุ: 31 มี.ค. ${nextYear}`,
          cx + cardW - padX,
          cy + mm(48.8),
          mm(40),
          {
            fontSizePx: 6,
            fontWeight: 700,
            color: '#1e3a8a',
            align: 'right',
          }
        );
      }

      ctx.restore();

      // Card crisp outer border
      ctx.save();
      traceRoundRect(cx, cy, cardW, cardH, mm(3));
      ctx.lineWidth = cssPx(1);
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();
      ctx.restore();
    }

    return canvas;
  };

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      if (studentPages.length === 0) {
        if (onShowToast) {
          onShowToast('warning', 'ไม่พบข้อมูล', 'ไม่มีข้อมูลบัตรนักเรียนสำหรับดาวน์โหลด');
        }
        setIsDownloading(false);
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      for (let i = 0; i < studentPages.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const canvas = await renderStudentCardPageCanvas(studentPages[i], cardSide);
        const imgData = canvas.toDataURL('image/jpeg', 0.99);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      const sideName = cardSide === 'front' ? 'หน้าบัตร' : 'หลังบัตร';
      const gradeName = selectedGrade === 'all' ? 'ทุกระดับชั้น' : `ชั้น${selectedGrade}`;
      const cleanSchoolName = (schoolInfo.schoolName || 'โรงเรียน').replace(/\s+/g, '_');
      const fileName = `บัตรนักเรียน_${sideName}_${gradeName}_${cleanSchoolName}.pdf`;
      pdf.save(fileName);

      if (onShowToast) {
        onShowToast('success', 'ดาวน์โหลดสำเร็จ', `ดาวน์โหลดไฟล์ PDF บัตรนักเรียน (${sideName}) เรียบร้อยแล้ว`);
      }
    } catch (err) {
      console.error('Download student cards failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-hidden">
      {/* Print Specific CSS Styles injected for pixel-perfect A4 printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .student-card-a4-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 14mm 15.15mm !important;
            margin: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: none !important;
          }
          .student-card-item {
            border: 1px solid #94a3b8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* MODAL CONTROL HEADER (Hidden on print) */}
      <div className="no-print bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shadow-md z-10 shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>ดาวน์โหลดบัตรนักเรียน</span>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                มาตรฐาน CR80 (85.6 × 54 มม.) 8 ใบ/หน้า A4
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {cardSide === 'front' ? 'หน้าบัตรนักเรียน' : 'หลังบัตรนักเรียน'} • รวม {targetStudents.length} คน ({studentPages.length} หน้า A4)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Side Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setCardSide('front')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                cardSide === 'front'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>หน้าบัตร</span>
            </button>
            <button
              type="button"
              onClick={() => setCardSide('back')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                cardSide === 'back'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>หลังบัตร</span>
            </button>
          </div>

          {/* Grade Selector */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">ระดับชั้น:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-transparent text-xs font-bold text-blue-900 outline-none cursor-pointer py-0.5"
            >
              <option value="all">ทุกระดับชั้น ({students.length} คน)</option>
              {availableGrades.map(g => (
                <option key={g} value={g}>
                  ชั้น {g} ({students.filter(s => s.gradeLevel === g).length} คน)
                </option>
              ))}
            </select>
          </div>

          {/* Direct Download PDF Button */}
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
            title="ดาวน์โหลดเป็นไฟล์ PDF ทันที"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isDownloading ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด'}</span>
          </button>

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PREVIEW CONTAINER (Scrollable on screen, 100% clean on print) */}
      <div className="flex-1 overflow-auto bg-slate-300/80 p-4 sm:p-8 flex flex-col items-center">
        {targetStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center max-w-md w-full shadow-lg border border-slate-200 my-auto">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">ไม่มีข้อมูลนักเรียนในชั้นที่เลือก</p>
            <p className="text-xs text-slate-500 mt-1">กรุณาเลือกระดับชั้นที่มีข้อมูลนักเรียน</p>
          </div>
        ) : (
          studentPages.map((pageStudents, pageIdx) => (
            <div
              key={`a4-page-${pageIdx}`}
              className="student-card-a4-page bg-white shadow-2xl mb-8 border border-slate-300/80 relative shrink-0"
              style={{
                width: '210mm',
                minWidth: '210mm',
                maxWidth: '210mm',
                minHeight: '297mm',
                maxHeight: '297mm',
                height: '297mm',
                padding: '14mm 15.15mm',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 85.6mm)',
                gridTemplateRows: 'repeat(4, 54mm)',
                columnGap: '8.5mm',
                rowGap: '6.5mm',
                justifyContent: 'center',
                alignContent: 'start',
                boxSizing: 'border-box'
              }}
            >
              {/* Page Number indicator for screen view */}
              <div className="no-print absolute top-2 right-4 text-[10px] text-slate-400 font-mono font-medium whitespace-nowrap">
                หน้า A4 ที่ {pageIdx + 1} / {studentPages.length} ({cardSide === 'front' ? 'หน้าบัตร' : 'หลังบัตร'})
              </div>

              {pageStudents.map((student) => {
                const codeDisplay = student.studentCode || '-';
                const idCardDisplay = student.idCard || student.citizenId || '-';
                const gradeStage = getGradeStageLabel(student.gradeLevel);
                const emergencyPhone = student.guardianPhone || student.fatherPhone || student.motherPhone || schoolInfo.phone || '-';

                return (
                  <div
                    key={student.id}
                    className="student-card-item rounded-[3mm] border border-slate-300 relative overflow-hidden bg-white shadow-2xs select-none"
                    style={{
                      width: '85.6mm',
                      height: '54mm',
                      minWidth: '85.6mm',
                      maxWidth: '85.6mm',
                      minHeight: '54mm',
                      maxHeight: '54mm',
                      boxSizing: 'border-box'
                    }}
                  >
                    {cardSide === 'front' ? (
                      /* ===================== FRONT OF CARD (หน้าบัตร 85.6 x 54 mm) ===================== */
                      <div className="w-full h-full flex flex-col justify-between bg-white relative">
                        {/* Decorative Top Background Header */}
                        <div
                          className="h-[13mm] bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white px-2.5 py-1 flex items-center justify-between relative overflow-hidden shrink-0"
                          style={{
                            backgroundImage: 'linear-gradient(90deg, #1d4ed8 0%, #1e40af 50%, #312e81 100%)'
                          }}
                        >
                          {/* Subtle background crest accent */}
                          <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

                          {/* Logo + School Title */}
                          <div className="flex items-center gap-1.5 z-10 min-w-0">
                            {schoolInfo.logoUrl ? (
                              <img
                                src={schoolInfo.logoUrl}
                                alt="Logo"
                                className="w-[8.5mm] h-[8.5mm] object-contain rounded-full bg-white/10 p-0.5 shrink-0"
                              />
                            ) : (
                              <div className="w-[8.5mm] h-[8.5mm] rounded-full bg-amber-400 text-blue-950 font-black text-[9px] flex items-center justify-center shrink-0 shadow-xs whitespace-nowrap">
                                รร
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-[9.5px] font-black text-amber-300 leading-tight truncate tracking-tight whitespace-nowrap">
                                {schoolInfo.schoolName || 'โรงเรียนวัดผลประเมินพัฒนาการ'}
                              </h4>
                              <p className="text-[6.8px] text-blue-100 font-medium leading-none mt-0.5 truncate whitespace-nowrap">
                                บัตรประจำตัวนักเรียน • STUDENT IDENTITY CARD
                              </p>
                            </div>
                          </div>

                          {/* Academic Year Badge */}
                          <div className="z-10 bg-amber-400 text-blue-950 text-[7px] font-extrabold px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap shrink-0">
                            ปีการศึกษา {academicYear}
                          </div>
                        </div>

                        {/* Thin Gold accent stripe */}
                        <div className="h-[1mm] bg-amber-400 shrink-0" />

                        {/* Card Body: Non-wrapping single-line rows */}
                        <div className="flex-1 px-2.5 py-1.5 flex items-center gap-2.5 min-w-0">
                          {/* Left Column: Photo & Student Code */}
                          <div className="w-[22mm] flex flex-col items-center shrink-0">
                            <div className="w-[22mm] h-[27.5mm] rounded-[2mm] border-2 border-blue-400 bg-slate-50 overflow-hidden flex items-center justify-center shadow-2xs">
                              {student.photoUrl ? (
                                <img
                                  src={student.photoUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-100">
                                  <User className="w-8 h-8 text-slate-300" />
                                  <span className="text-[6.5px] text-slate-400 font-bold mt-0.5 whitespace-nowrap">ไม่มีรูปถ่าย</span>
                                </div>
                              )}
                            </div>
                            <div className="text-[7.5px] font-bold font-mono text-blue-950 text-center mt-1 bg-blue-50 px-1 py-0.5 rounded border border-blue-200 w-full truncate whitespace-nowrap">
                              ID: {codeDisplay}
                            </div>
                          </div>

                          {/* Right Column: Particulars & Official Seal */}
                          <div className="flex-1 flex flex-col justify-between h-full min-w-0 py-0.5">
                            {/* Student Name */}
                            <div className="border-b border-slate-200 pb-0.5">
                              <h3 className="text-[11.5px] font-black text-slate-900 leading-tight truncate whitespace-nowrap">
                                {student.prefix}{student.firstName} {student.lastName}
                              </h3>
                              {student.nickname && (
                                <p className="text-[7.8px] text-slate-500 font-medium leading-none mt-0.5 truncate whitespace-nowrap">
                                  ชื่อเล่น: {student.nickname}
                                </p>
                              )}
                            </div>

                            {/* Particulars grid (guaranteed single-line rows) */}
                            <div className="space-y-0.5 text-[7.8px] text-slate-700 py-0.5">
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="text-slate-500 font-medium text-[7.5px] shrink-0">เลขประชาชน:</span>
                                <span className="font-mono font-bold text-slate-900 text-[8.5px] tracking-tight truncate">{idCardDisplay}</span>
                              </div>
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="text-slate-500 font-medium text-[7.5px] shrink-0">ระดับชั้น:</span>
                                <span className="font-bold text-blue-900 text-[8.2px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 whitespace-nowrap leading-none">
                                  {gradeStage}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[7.4px] whitespace-nowrap gap-1">
                                <div className="flex items-center gap-1 whitespace-nowrap min-w-0">
                                  <span className="text-slate-500 shrink-0">วันเกิด:</span>
                                  <span className="font-semibold text-slate-800 whitespace-nowrap">{formatThaiBirthDate(student.birthDate)}</span>
                                </div>
                                {student.bloodGroup && (
                                  <div className="flex items-center gap-0.5 pr-0.5 whitespace-nowrap shrink-0">
                                    <span className="text-slate-500">หมู่เลือด:</span>
                                    <span className="font-bold text-rose-700">{student.bloodGroup}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Director Signature verification */}
                            <div className="border-t border-slate-100 pt-0.5 flex items-end justify-between gap-1 whitespace-nowrap">
                              <div className="text-[5.8px] text-slate-400 font-medium pb-0.5 truncate max-w-[19mm] whitespace-nowrap">
                                ออกโดย {schoolInfo.schoolName || 'สถานศึกษา'}
                              </div>
                              <div className="text-center flex flex-col items-center shrink-0 whitespace-nowrap">
                                {directorSignature ? (
                                  <img 
                                    src={directorSignature} 
                                    alt="ลายเซ็นผู้บริหาร" 
                                    className="h-[5.8mm] max-w-[26mm] object-contain mb-0.5" 
                                  />
                                ) : (
                                  <div className="h-[4.2mm] flex items-end">
                                    <div className="w-18 border-b border-dotted border-slate-300 mb-0.5" />
                                  </div>
                                )}
                                <p className="text-[7.2px] font-bold text-slate-900 leading-none whitespace-nowrap">
                                  ( {directorDisplayName} )
                                </p>
                                <p className="text-[6.2px] text-slate-500 font-medium leading-none mt-0.5 whitespace-nowrap">
                                  {directorPositionTitle}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Micro bottom strip */}
                        <div className="h-[2mm] bg-blue-900 flex items-center justify-between px-2.5 text-[5px] text-blue-200 shrink-0 font-medium whitespace-nowrap">
                          <span>กระทรวงศึกษาธิการ • MINISTRY OF EDUCATION</span>
                          <span className="font-mono">VALID THRU 03/{nextYear}</span>
                        </div>
                      </div>
                    ) : (
                      /* ===================== BACK OF CARD (หลังบัตร 85.6 x 54 mm) ===================== */
                      <div className="w-full h-full flex flex-col justify-between bg-slate-50 relative p-2.5 text-slate-800">
                        {/* Header School Info */}
                        <div className="border-b border-slate-200 pb-1 text-center">
                          <h4 className="text-[9px] font-black text-blue-950 leading-tight truncate whitespace-nowrap">
                            {schoolInfo.schoolName || 'โรงเรียนวัดผลประเมินพัฒนาการ'}
                          </h4>
                          {schoolInfo.address && (
                            <p className="text-[6.4px] text-slate-600 leading-tight mt-0.5 truncate whitespace-nowrap">
                              {schoolInfo.address}
                            </p>
                          )}
                          <p className="text-[6.8px] text-blue-900 font-bold leading-tight mt-0.5 whitespace-nowrap">
                            โทรศัพท์ติดต่อ: {schoolInfo.phone || 'ยังไม่ได้ระบุ'}
                          </p>
                        </div>

                        {/* Card Rules / Regulations */}
                        <div className="py-1 px-1.5 bg-white rounded border border-slate-200 text-[6.1px] text-slate-700 space-y-0.5 leading-snug">
                          <div className="font-bold text-blue-900 text-[6.8px] mb-0.5 whitespace-nowrap">ข้อปฏิบัติในการใช้บัตรประจำตัวนักเรียน:</div>
                          <p className="whitespace-nowrap truncate">1. บัตรนี้เป็นเอกสารแสดงตนของผู้ถือบัตร และเป็นสมบัติของโรงเรียน</p>
                          <p className="whitespace-nowrap truncate">2. นักเรียนต้องพกติดตัวตลอดเวลาขณะอยู่ในสถานศึกษา และแสดงเมื่อเจ้าหน้าที่ร้องขอ</p>
                          <p className="whitespace-nowrap truncate">3. ใช้ในการติดต่อราชการ เข้าห้องสอบ ยืม-คืนหนังสือห้องสมุด และร่วมกิจกรรม</p>
                          <p className="whitespace-nowrap truncate">4. หากเก็บบัตรนี้ได้ กรุณาส่งคืนสถานศึกษาตามที่อยู่ข้างต้น หรือหย่อนลงตู้ไปรษณีย์</p>
                        </div>

                        {/* Student Details Summary Bar */}
                        <div className="flex items-center justify-between bg-blue-50/90 px-2 py-0.5 rounded border border-blue-200 text-[7px] whitespace-nowrap gap-2">
                          <div className="truncate min-w-0">
                            <span className="text-slate-500">ผู้ถือบัตร: </span>
                            <span className="font-bold text-slate-900">
                              {student.prefix}{student.firstName} {student.lastName}
                            </span>
                          </div>
                          <div className="shrink-0">
                            <span className="text-slate-500">ฉุกเฉินโทร: </span>
                            <span className="font-bold font-mono text-rose-700">{emergencyPhone}</span>
                          </div>
                        </div>

                        {/* Barcode & Security strip simulation */}
                        <div className="flex items-center justify-between pt-0.5 border-t border-slate-200 whitespace-nowrap">
                          {/* Simulated Barcode */}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-[1px] h-3">
                              {Array.from({ length: 38 }).map((_, idx) => (
                                <div
                                  key={idx}
                                  className="h-full bg-slate-900"
                                  style={{
                                    width: idx % 4 === 0 ? '2px' : idx % 3 === 0 ? '1.5px' : '0.8px',
                                    opacity: idx % 5 === 0 ? 0.3 : 1
                                  }}
                                />
                              ))}
                            </div>
                            <span className="text-[5.5px] font-mono text-slate-500">
                              *{codeDisplay}*
                            </span>
                          </div>

                          {/* Validity dates */}
                          <div className="text-right text-[6px] text-slate-600 space-y-0.2 whitespace-nowrap">
                            <div>วันออกบัตร: 16 พ.ค. {academicYear}</div>
                            <div className="font-bold text-blue-900">วันหมดอายุ: 31 มี.ค. {nextYear}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
