import { useState } from 'react';
import { generatePdf } from './PdfExporter';

interface Props {
  notaId: number;
  username: string;
  notaPrefix?: string;
}

export default function PdfPreviewButton({ notaId, username, notaPrefix = 'NS' }: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePreview() {
    setLoading(true);
    try {
      const res = await fetch(`/api/notas/${notaId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const doc = await generatePdf(data, username, notaPrefix);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      alert(err.message || 'Error al generar PDF');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/notas/${notaId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const doc = await generatePdf(data, username, notaPrefix);
      doc.save(`${notaPrefix}-${String(data.numero).padStart(4, '0')}.pdf`);
    } catch (err: any) {
      alert(err.message || 'Error al generar PDF');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handlePreview}
        disabled={loading}
        className="rounded-lg border border-pa-dark px-4 py-2 text-sm font-medium text-pa-dark hover:bg-pa-dark hover:text-white transition disabled:opacity-50"
      >
        {loading ? 'Generando...' : 'Vista Previa PDF'}
      </button>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="rounded-lg border border-pa-dark px-2 py-2 text-sm text-pa-dark hover:bg-pa-dark hover:text-white transition disabled:opacity-50"
        title="Descargar PDF"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
        </svg>
      </button>
    </div>
  );
}
