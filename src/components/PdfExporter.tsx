import { jsPDF } from 'jspdf';
import { formatDate, formatNotaNumero } from '../lib/format';

interface NotaItem {
  noParte: string;
  unidad: number;
  cantidad: number;
  descripcion: string;
  noSerial: string;
}

interface NotaData {
  numero: number;
  estado: string;
  departamento: string;
  fecha: string | null;
  empresa: string;
  base: string;
  pozo: string;
  taladro: string;
  tipoSalida: string;
  solicitante: string;
  destino: string;
  vPlaca: string;
  vMarca: string;
  vModelo: string;
  cNombre: string;
  cCi: string;
  gNombre: string;
  gCi: string;
  sNombre: string;
  sCi: string;
  elabNombre: string;
  elabCi: string;
  aproNombre: string;
  aproCi: string;
  items: NotaItem[];
  createdAt: string;
}

interface Props {
  nota: NotaData;
  username: string;
  notaPrefix?: string;
}

const PA_ORANGE = '#FF6101';
const PA_DARK = '#191825';
const BORDER_COLOR = '#000000';
const MIN_ITEM_ROWS = 30;

type CellOpts = {
  bold?: boolean;
  size?: number;
  align?: 'left' | 'center' | 'right';
  fill?: string;
  color?: string;
  border?: boolean;
  padding?: number;
  vAlign?: 'top' | 'middle';
};

function drawCell(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  opts: CellOpts = {},
) {
  const {
    bold = false,
    size = 7,
    align = 'left',
    fill,
    color = '#000000',
    border = true,
    padding = 1.5,
    vAlign = 'middle',
  } = opts;

  if (fill) {
    doc.setFillColor(fill);
    doc.rect(x, y, w, h, border ? 'FD' : 'F');
  } else if (border) {
    doc.rect(x, y, w, h);
  }

  if (!text) return;

  doc.setFontSize(size);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setTextColor(color);

  const textY = vAlign === 'top' ? y + size * 0.35 + padding : y + h / 2 + size * 0.13;
  let textX: number;
  if (align === 'center') textX = x + w / 2;
  else if (align === 'right') textX = x + w - padding;
  else textX = x + padding;

  doc.text(text, textX, textY, { align, maxWidth: w - 2 * padding });
}

function drawCheckbox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  checked: boolean,
) {
  doc.rect(x, y, w, h);
  const boxSize = 2.8;
  const boxX = x + 1.5;
  const boxY = y + (h - boxSize) / 2;
  doc.setDrawColor(BORDER_COLOR);
  doc.rect(boxX, boxY, boxSize, boxSize);

  if (checked) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor('#000000');
    doc.text('X', boxX + boxSize / 2, boxY + boxSize * 0.78, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor('#000000');
  doc.text(label, boxX + boxSize + 1.5, y + h / 2 + 1, { maxWidth: w - boxSize - 5 });
}

export function generatePdf(nota: NotaData, username: string, notaPrefix = 'NS') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PW = 297;
  const PH = 210;
  const M = 7;

  // Column widths for the 15-col grid (A through O)
  // A=14, B-C=16 each, D=20, E=20, F-K=6×20.5=123, L-O=4×18.5=74
  // Total: 14+32+20+20+123+74 = 283
  const colWidths = [14, 16, 16, 20, 20, 20.5, 20.5, 20.5, 20.5, 20.5, 20.5, 18.5, 18.5, 18.5, 18.5];
  const c: number[] = [M];
  for (let i = 0; i < 15; i++) c.push(c[i] + colWidths[i]);

  doc.setLineWidth(0.2);
  doc.setDrawColor(BORDER_COLOR);

  let y = M;

  // ============================================================
  // HEADER (rows 1-3): Logo | Title | FO-SF-001/Date/Rev
  // ============================================================
  const hdrH = 15;
  const hdrRowH = hdrH / 3;

  // Logo area (A1:C3) - dark background
  drawCell(doc, c[0], y, c[3] - c[0], hdrH, '', { fill: PA_DARK });

  // Logo text on dark background
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#FFFFFF');
  const logoTextX = c[0] + 3;
  const logoTextY = y + hdrH / 2 + 1;
  doc.text('Petro', logoTextX, logoTextY);
  const pw = doc.getTextWidth('Petro');
  doc.setTextColor(PA_ORANGE);
  doc.text('Alianza', logoTextX + pw, logoTextY);

  // Title area (D1:K3)
  drawCell(doc, c[3], y, c[11] - c[3], hdrH, '', {});
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  const titleCX = (c[3] + c[11]) / 2;
  doc.text('AUTORIZACIÓN DE SALIDA DE MATERIALES Y/O EQUIPOS', titleCX, y + 5, { align: 'center' });

  // Form reference (L1:O1, L2:O2, L3:O3)
  drawCell(doc, c[11], y, c[15] - c[11], hdrRowH, 'FO-SF-001', {
    bold: true, size: 8, align: 'center',
  });
  drawCell(doc, c[11], y + hdrRowH, c[15] - c[11], hdrRowH, 'FECHA: 21/09/2023', {
    size: 6.5, align: 'center',
  });
  drawCell(doc, c[11], y + 2 * hdrRowH, c[15] - c[11], hdrRowH, 'REV.3', {
    size: 6.5, align: 'center',
  });

  y += hdrH;

  // ============================================================
  // INFO ROW 1 (rows 5-6): Departamento, Fecha, Empresa, Base, Pozo, Taladro
  // ============================================================
  const infoH = 5;

  // Labels
  drawCell(doc, c[0], y, c[2] - c[0], infoH, 'Departamento:', { bold: true, size: 6.5 });
  drawCell(doc, c[2], y, c[3] - c[2], infoH, 'Fecha:', { bold: true, size: 6.5 });
  drawCell(doc, c[3], y, c[5] - c[3], infoH, 'Empresa:', { bold: true, size: 6.5 });
  drawCell(doc, c[5], y, c[8] - c[5], infoH, 'Base:', { bold: true, size: 6.5 });
  drawCell(doc, c[8], y, c[11] - c[8], infoH, 'Pozo:', { bold: true, size: 6.5 });
  drawCell(doc, c[11], y, c[15] - c[11], infoH, 'Taladro / Gabarra:', { bold: true, size: 6.5 });
  y += infoH;

  // Values
  drawCell(doc, c[0], y, c[2] - c[0], infoH, nota.departamento, { size: 6.5 });
  drawCell(doc, c[2], y, c[3] - c[2], infoH, formatDate(nota.fecha), { size: 6.5 });
  drawCell(doc, c[3], y, c[5] - c[3], infoH, nota.empresa, { size: 6.5 });
  drawCell(doc, c[5], y, c[8] - c[5], infoH, nota.base, { size: 6.5 });
  drawCell(doc, c[8], y, c[11] - c[8], infoH, nota.pozo || '', { size: 6.5 });
  drawCell(doc, c[11], y, c[15] - c[11], infoH, nota.taladro || '', { size: 6.5 });
  y += infoH;

  // ============================================================
  // INFO ROW 2 (rows 7-8): Solicitado Por, Razón/Destino, Tipo de Salida checkboxes
  // ============================================================
  const tipoSalida = nota.tipoSalida;
  const isOtros = tipoSalida.startsWith('Otros');

  // Labels + top checkboxes
  drawCell(doc, c[0], y, c[2] - c[0], infoH, 'Solicitado Por:', { bold: true, size: 6.5 });
  drawCell(doc, c[2], y, c[5] - c[2], infoH, 'Razón y Destino:', { bold: true, size: 6.5 });
  drawCell(doc, c[5], y, c[8] - c[5], infoH, 'Tipo de Salida:', { bold: true, size: 6.5 });
  drawCheckbox(doc, c[8], y, c[11] - c[8], infoH, 'Inspección', tipoSalida === 'Inspección');
  drawCheckbox(doc, c[11], y, c[15] - c[11], infoH, 'Alquiler', tipoSalida === 'Alquiler');
  y += infoH;

  // Values + bottom checkboxes
  drawCell(doc, c[0], y, c[2] - c[0], infoH, nota.solicitante, { size: 6.5 });
  drawCell(doc, c[2], y, c[5] - c[2], infoH, nota.destino, { size: 6.5 });
  drawCheckbox(doc, c[5], y, c[8] - c[5], infoH, 'Con Retorno', tipoSalida === 'Con Retorno');
  drawCheckbox(doc, c[8], y, c[11] - c[8], infoH, 'Sin Retorno', tipoSalida === 'Sin Retorno');
  const otrosLabel = isOtros && tipoSalida !== 'Otros' ? `Otros: ${tipoSalida.replace('Otros: ', '')}` : 'Otros';
  drawCheckbox(doc, c[11], y, c[15] - c[11], infoH, otrosLabel, isOtros);
  y += infoH;

  // ============================================================
  // ITEMS TABLE (rows 9-39)
  // ============================================================
  // Item columns: Item(A) | N°Parte(B-C) | Unidad(D) | Cantidad(E) | Descripción(F-K) | N°Serial(L-O)
  const itemColX = [c[0], c[1], c[3], c[4], c[5], c[11], c[15]];
  const itemHeaders = ['Item', 'N° de Parte', 'Unidad', 'Cantidad', 'Descripción del Material y/o Equipo', 'N° de Serial'];
  const itemHeaderH = 5.5;

  // Header row
  for (let i = 0; i < 6; i++) {
    drawCell(doc, itemColX[i], y, itemColX[i + 1] - itemColX[i], itemHeaderH, itemHeaders[i], {
      bold: true, size: 6, align: 'center', fill: '#E8E8E8',
    });
  }
  y += itemHeaderH;

  // Calculate row height to fill available space
  const sigSectionH = 36;
  const footerH = 8;
  const availableForItems = PH - M - y - sigSectionH - footerH;
  const numRows = Math.max(nota.items.length, MIN_ITEM_ROWS);
  const itemRowH = Math.min(3.8, availableForItems / numRows);

  // Data rows
  for (let i = 0; i < numRows; i++) {
    const item = nota.items[i];
    const rowData = item
      ? [
          String(i + 1),
          item.noParte || '',
          String(item.unidad),
          String(item.cantidad),
          item.descripcion,
          item.noSerial || '',
        ]
      : [String(i + 1), '', '', '', '', ''];

    const rowFill = i % 2 === 0 ? '#FAFAFA' : undefined;
    for (let j = 0; j < 6; j++) {
      drawCell(doc, itemColX[j], y, itemColX[j + 1] - itemColX[j], itemRowH, rowData[j], {
        size: 6, fill: rowFill, align: j === 0 ? 'center' : 'left',
      });
    }
    y += itemRowH;
  }

  // ============================================================
  // VEHICLE + SIGNATURES (rows 40-48, 9 sub-rows)
  // ============================================================
  // 4 main columns:
  //   Col1 (A-C): Vehicle (top 4) + Elaborado Por (bottom 5)
  //   Col2 (D-F): Conductor (top 4) + Aprobado Por (bottom 5)
  //   Col3 (G-K): Gerente General (full 9)
  //   Col4 (L-O): Seguridad Física (full 9)
  const sr = 4; // sub-row height
  const sigY = y;
  const col1x = c[0]; const col1w = c[3] - c[0];
  const col2x = c[3]; const col2w = c[6] - c[3];
  const col3x = c[6]; const col3w = c[11] - c[6];
  const col4x = c[11]; const col4w = c[15] - c[11];

  // --- Column 1: Vehicle (rows 0-3) ---
  drawCell(doc, col1x, sigY, col1w, sr, 'Vehículo:', { bold: true, size: 6.5 });
  drawCell(doc, col1x, sigY + sr, col1w, sr, `Marca: ${nota.vMarca}`, { size: 6 });
  drawCell(doc, col1x, sigY + 2 * sr, col1w, sr, `Placa: ${nota.vPlaca}`, { size: 6 });
  drawCell(doc, col1x, sigY + 3 * sr, col1w, sr, `Modelo: ${nota.vModelo}`, { size: 6 });

  // --- Column 1: Elaborado Por (rows 4-8) ---
  drawCell(doc, col1x, sigY + 4 * sr, col1w, sr, 'Elaborado Por:', { bold: true, size: 6.5 });
  drawCell(doc, col1x, sigY + 5 * sr, col1w, sr, `Nombre: ${nota.elabNombre}`, { size: 6 });
  drawCell(doc, col1x, sigY + 6 * sr, col1w, sr, `C.I.: ${nota.elabCi}`, { size: 6 });
  drawCell(doc, col1x, sigY + 7 * sr, col1w, 2 * sr, 'Firma:', { size: 6, vAlign: 'top' });

  // --- Column 2: Conductor (rows 0-3) ---
  drawCell(doc, col2x, sigY, col2w, sr, 'Conductor', { bold: true, size: 6.5, align: 'center' });
  drawCell(doc, col2x, sigY + sr, col2w, sr, `Nombre: ${nota.cNombre}`, { size: 6 });
  drawCell(doc, col2x, sigY + 2 * sr, col2w, sr, `C.I.: ${nota.cCi}`, { size: 6 });
  drawCell(doc, col2x, sigY + 3 * sr, col2w, sr, 'Firma:', { size: 6 });

  // --- Column 2: Aprobado Por (rows 4-8) ---
  drawCell(doc, col2x, sigY + 4 * sr, col2w, sr, 'Aprobado Por:', { bold: true, size: 6.5 });
  drawCell(doc, col2x, sigY + 5 * sr, col2w, sr, `Nombre: ${nota.aproNombre}`, { size: 6 });
  drawCell(doc, col2x, sigY + 6 * sr, col2w, sr, `C.I.: ${nota.aproCi}`, { size: 6 });
  drawCell(doc, col2x, sigY + 7 * sr, col2w, 2 * sr, 'Firma:', { size: 6, vAlign: 'top' });

  // --- Column 3: Gerente General (rows 0-8) ---
  drawCell(doc, col3x, sigY, col3w, sr, 'Gerente General', { bold: true, size: 6.5, align: 'center' });
  drawCell(doc, col3x, sigY + sr, col3w, sr, `Nombre: ${nota.gNombre}`, { size: 6 });
  // Empty rows 2-3 (merged area for name/space)
  drawCell(doc, col3x, sigY + 2 * sr, col3w, 2 * sr, '', {});
  drawCell(doc, col3x, sigY + 4 * sr, col3w, sr, `C.I.: ${nota.gCi}`, { size: 6 });
  drawCell(doc, col3x, sigY + 5 * sr, col3w, 4 * sr, 'Firma:', { size: 6, vAlign: 'top' });

  // --- Column 4: Seguridad Física (rows 0-8) ---
  drawCell(doc, col4x, sigY, col4w, sr, 'Seguridad Física', { bold: true, size: 6.5, align: 'center' });
  drawCell(doc, col4x, sigY + sr, col4w, sr, `Nombre: ${nota.sNombre}`, { size: 6 });
  drawCell(doc, col4x, sigY + 2 * sr, col4w, 2 * sr, '', {}); // empty rows 2-3
  drawCell(doc, col4x, sigY + 4 * sr, col4w, sr, `C.I.: ${nota.sCi}`, { size: 6 });
  drawCell(doc, col4x, sigY + 5 * sr, col4w, 4 * sr, 'Firma:', { size: 6, vAlign: 'top' });

  y = sigY + 9 * sr;

  // ============================================================
  // FOOTER (row 50)
  // ============================================================
  y += 2; // small gap

  const notaNumStr = `N° ${formatNotaNumero(nota.numero, notaPrefix)}`;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#000000');
  doc.text('Pág. 1 de 1', PW / 2, y + 3, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(notaNumStr, c[15] - 2, y + 3, { align: 'right' });

  // Small generation info
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#999999');
  doc.text(
    `Generado: ${new Date().toLocaleString('es-VE')} — ${username}`,
    c[0],
    PH - 3,
  );

  // ============================================================
  // WATERMARK for Nula
  // ============================================================
  if (nota.estado === 'Nula') {
    doc.saveGraphicsState();
    // @ts-expect-error GState exists on jsPDF instance
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.setTextColor('#FF0000');
    doc.setFontSize(80);
    doc.setFont('helvetica', 'bold');
    doc.text('NULA', PW / 2, PH / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }

  return doc;
}

export default function PdfExportButton({ nota, username, notaPrefix = 'NS' }: Props) {
  const handleExport = () => {
    const doc = generatePdf(nota, username, notaPrefix);
    doc.save(`${notaPrefix}-${String(nota.numero).padStart(4, '0')}.pdf`);
  };

  return (
    <button
      onClick={handleExport}
      className="rounded-lg border border-pa-orange px-4 py-2 text-sm font-medium text-pa-orange transition hover:bg-pa-orange hover:text-white"
    >
      Exportar PDF
    </button>
  );
}
