import { jsPDF } from 'jspdf';
import { formatDate } from '../lib/format';

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
}

const PA_ORANGE = '#FF6101';
const PA_DARK = '#191825';

export function generatePdf(nota: NotaData, username: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;
  const margin = 10;
  let y = margin;

  // === HEADER BAR ===
  doc.setFillColor(PA_DARK);
  doc.rect(margin, y, W - 2 * margin, 14, 'F');

  // Logo text
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#FFFFFF');
  doc.text('Petro', margin + 4, y + 9);
  const petroW = doc.getTextWidth('Petro');
  doc.setTextColor(PA_ORANGE);
  doc.text('Alianza', margin + 4 + petroW, y + 9);

  // Title centered
  doc.setFontSize(9);
  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'normal');
  doc.text('AUTORIZACIÓN DE SALIDA DE MATERIALES Y/O EQUIPOS', W / 2, y + 6, { align: 'center' });
  doc.setFontSize(7);
  doc.text('FO-SF-001 REV.3', W / 2, y + 11, { align: 'center' });

  // Nota number
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#FFFFFF');
  doc.text(`N° ${String(nota.numero).padStart(4, '0')}`, W - margin - 4, y + 10, { align: 'right' });

  y += 18;

  // === HEADER FIELDS ===
  doc.setFontSize(7);
  doc.setTextColor('#000000');

  const field = (label: string, value: string, x: number, fy: number, w: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', x, fy);
    doc.setFont('helvetica', 'normal');
    const labelW = doc.getTextWidth(label + ': ');
    doc.text(value || '—', x + labelW, fy);
    // underline
    doc.setDrawColor('#CCCCCC');
    doc.line(x + labelW, fy + 1, x + w, fy + 1);
  };

  const col1 = margin;
  const col2 = margin + 90;
  const col3 = margin + 185;

  field('Departamento', nota.departamento, col1, y, 85);
  field('Fecha', formatDate(nota.fecha), col2, y, 85);
  field('Empresa', nota.empresa, col3, y, 90);
  y += 7;
  field('Base', nota.base, col1, y, 85);
  field('Pozo', nota.pozo, col2, y, 85);
  field('Taladro / Gabarra', nota.taladro, col3, y, 90);
  y += 7;
  field('Tipo de Salida', nota.tipoSalida, col1, y, 85);
  field('Solicitado por', nota.solicitante, col2, y, 85);
  field('Destino', nota.destino, col3, y, 90);
  y += 10;

  // === ITEMS TABLE ===
  const cols = [
    { header: 'Item', w: 12 },
    { header: 'N° Parte', w: 35 },
    { header: 'Und', w: 15 },
    { header: 'Cant', w: 15 },
    { header: 'Descripción', w: 120 },
    { header: 'N° Serial', w: 40 },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const tableX = (W - tableW) / 2;

  // Table header
  doc.setFillColor(PA_DARK);
  doc.rect(tableX, y, tableW, 6, 'F');
  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  let cx = tableX;
  for (const col of cols) {
    doc.text(col.header, cx + 2, y + 4);
    cx += col.w;
  }
  y += 6;

  // Table rows
  doc.setTextColor('#000000');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  for (let i = 0; i < nota.items.length; i++) {
    const item = nota.items[i];
    if (i % 2 === 0) {
      doc.setFillColor('#F9FAFB');
      doc.rect(tableX, y, tableW, 5.5, 'F');
    }
    cx = tableX;
    const row = [
      String(i + 1),
      item.noParte,
      String(item.unidad),
      String(item.cantidad),
      item.descripcion,
      item.noSerial,
    ];
    for (let j = 0; j < cols.length; j++) {
      doc.text(row[j] || '', cx + 2, y + 3.8, { maxWidth: cols[j].w - 4 });
      cx += cols[j].w;
    }
    // Row border
    doc.setDrawColor('#E5E7EB');
    doc.line(tableX, y + 5.5, tableX + tableW, y + 5.5);
    y += 5.5;
  }

  // Table outer border
  doc.setDrawColor('#D1D5DB');
  doc.rect(tableX, y - nota.items.length * 5.5 - 6, tableW, nota.items.length * 5.5 + 6);

  y += 8;

  // === VEHICLE ===
  field('Placa', nota.vPlaca, col1, y, 85);
  field('Marca', nota.vMarca, col2, y, 85);
  field('Modelo', nota.vModelo, col3, y, 90);
  y += 10;

  // === SIGNATURES ===
  const sigW = (W - 2 * margin - 15) / 4;
  const sigBoxes = [
    { title: 'Conductor', nombre: nota.cNombre, ci: nota.cCi },
    { title: 'Gerente General', nombre: nota.gNombre, ci: nota.gCi },
    { title: 'Seguridad Física', nombre: nota.sNombre, ci: nota.sCi },
    { title: 'Elaborado / Aprobado', nombre: `${nota.elabNombre}\n${nota.aproNombre}`, ci: `${nota.elabCi}\n${nota.aproCi}` },
  ];

  for (let i = 0; i < sigBoxes.length; i++) {
    const sx = margin + i * (sigW + 5);
    doc.setDrawColor('#D1D5DB');
    doc.rect(sx, y, sigW, 28);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PA_ORANGE);
    doc.text(sigBoxes[i].title, sx + sigW / 2, y + 4, { align: 'center' });

    // Signature line
    doc.setDrawColor('#000000');
    doc.line(sx + 5, y + 16, sx + sigW - 5, y + 16);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#000000');

    const names = sigBoxes[i].nombre.split('\n').filter(Boolean);
    const cis = sigBoxes[i].ci.split('\n').filter(Boolean);

    doc.text(names[0] || '', sx + sigW / 2, y + 20, { align: 'center' });
    doc.text(cis[0] ? `C.I.: ${cis[0]}` : '', sx + sigW / 2, y + 23.5, { align: 'center' });

    if (names.length > 1 || cis.length > 1) {
      doc.text(names[1] || '', sx + sigW / 2, y + 26, { align: 'center', maxWidth: sigW - 4 });
    }
  }

  y += 32;

  // === FOOTER ===
  doc.setFontSize(5.5);
  doc.setTextColor('#9CA3AF');
  doc.text(`Generado: ${new Date().toLocaleString('es-VE')} — Usuario: ${username}`, margin, H - 5);
  doc.text('PetroAlianza FO-SF-001 · Sistema de Notas de Salida', W - margin, H - 5, { align: 'right' });

  // === WATERMARK for Nula ===
  if (nota.estado === 'Nula') {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.setTextColor('#FF0000');
    doc.setFontSize(80);
    doc.setFont('helvetica', 'bold');
    // Rotate text diagonally
    const centerX = W / 2;
    const centerY = H / 2;
    doc.text('NULA', centerX, centerY, {
      align: 'center',
      angle: 45,
    });
    doc.restoreGraphicsState();
  }

  return doc;
}

export default function PdfExportButton({ nota, username }: Props) {
  const handleExport = () => {
    const doc = generatePdf(nota, username);
    doc.save(`nota-${String(nota.numero).padStart(4, '0')}.pdf`);
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
