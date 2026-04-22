import { useState, useEffect, useMemo } from 'react';
import { generatePdf } from './PdfExporter';
import { formatDate, formatNotaNumero } from '../lib/format';

interface Nota {
  id: number;
  numero: number;
  estado: 'Vigente' | 'Nula';
  signatureStatus: 'borrador' | 'pendiente' | 'completa';
  departamento: string;
  fecha: string | null;
  pozo: string;
  tipoSalida: string;
  solicitante: string;
  destino: string;
  createdAt: string;
}

interface Props {
  isAdmin: boolean;
  username: string;
  notaPrefix?: string;
}

function SignatureBadge({ status }: { status: string }) {
  if (status === 'completa') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
      Firmada
    </span>;
  }
  if (status === 'pendiente') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" /></svg>
      Pendiente
    </span>;
  }
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">—</span>;
}

type SortKey = 'numero' | 'estado' | 'departamento' | 'pozo' | 'tipoSalida' | 'solicitante' | 'destino' | 'fecha';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'numero', label: 'N°' },
  { key: 'estado', label: 'Estado' },
  { key: 'departamento', label: 'Departamento' },
  { key: 'pozo', label: 'Pozo' },
  { key: 'tipoSalida', label: 'Tipo' },
  { key: 'solicitante', label: 'Solicitante' },
  { key: 'destino', label: 'Destino' },
  { key: 'fecha', label: 'Fecha' },
];

export default function NotasList({ isAdmin, username, notaPrefix = 'NS' }: Props) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('numero');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(20);
  const [toast, setToast] = useState('');
  const [sigWarnings, setSigWarnings] = useState<string[]>([]);
  const [tab, setTab] = useState<'todas' | 'pendientes'>('todas');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('guardado') === '1') {
      setToast('Nota guardada exitosamente');
      const warnings = params.get('sigWarnings');
      if (warnings) {
        setSigWarnings(warnings.split('||'));
      }
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setToast(''), 4000);
      setTimeout(() => setSigWarnings([]), 10000);
    }
  }, []);

  const fetchNotas = async () => {
    setLoading(true);
    const url = tab === 'pendientes'
      ? '/api/notas/pendientes'
      : `/api/notas?page=1&limit=9999${search ? `&q=${encodeURIComponent(search)}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    setNotas(data.data);
    setTotal(data.total);
    setLoading(false);
  };

  const fetchPendingCount = async () => {
    const res = await fetch('/api/notas/pendientes');
    const data = await res.json();
    setPendingCount(data.total);
  };

  useEffect(() => { fetchNotas(); }, [search, tab]);
  useEffect(() => { fetchPendingCount(); }, []);

  const sorted = useMemo(() => {
    const arr = [...notas];
    arr.sort((a, b) => {
      let va: string | number = a[sortKey] ?? '';
      let vb: string | number = b[sortKey] ?? '';
      if (sortKey === 'numero') { va = Number(va); vb = Number(vb); }
      if (sortKey === 'fecha') { va = a.fecha || a.createdAt || ''; vb = b.fecha || b.createdAt || ''; }
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [notas, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  const toggleEstado = async (id: number, current: string) => {
    const nuevoEstado = current === 'Vigente' ? 'Nula' : 'Vigente';
    if (!confirm(`¿Cambiar estado a "${nuevoEstado}"?`)) return;
    await fetch(`/api/notas/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    fetchNotas();
    fetchPendingCount();
    window.dispatchEvent(new CustomEvent('notas-updated'));
  };

  const exportPdf = async (id: number) => {
    const res = await fetch(`/api/notas/${id}`);
    const data = await res.json();
    const doc = await generatePdf(data, username, notaPrefix);
    doc.save(`${notaPrefix}-${String(data.numero).padStart(4, '0')}.pdf`);
  };

  return (
    <div>
      {toast && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {toast}
        </div>
      )}
      {sigWarnings.length > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium mb-1">No se pudo enviar enlace de firma a:</p>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {sigWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
          <p className="text-xs text-amber-600 mt-1">Puede copiar el enlace manualmente desde la página de edición de la nota.</p>
        </div>
      )}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => { setTab('todas'); setPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            tab === 'todas' ? 'border-pa-orange text-pa-orange' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => { setTab('pendientes'); setPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-1.5 ${
            tab === 'pendientes' ? 'border-pa-orange text-pa-orange' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pendientes mi firma
          {pendingCount > 0 && (
            <span className="rounded-full bg-yellow-100 text-yellow-700 px-1.5 py-0.5 text-xs font-semibold leading-none">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pa-orange focus:ring-1 focus:ring-pa-orange/30 focus:outline-none sm:max-w-md"
        />
        <a
          href="/notas/nueva"
          className="shrink-0 rounded-lg bg-pa-orange px-4 py-2 text-sm font-semibold text-white hover:bg-pa-orange/90"
        >
          + Nueva
        </a>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pa-dark text-left text-xs text-white">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="cursor-pointer select-none px-4 py-3 hover:bg-white/10"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}{sortIcon(col.key)}
                </th>
              ))}
              <th className="px-4 py-3">Firmas</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No hay notas</td></tr>
            ) : (
              paginated.map((n, i) => {
                const isNula = n.estado === 'Nula';
                return (
                  <tr
                    key={n.id}
                    onClick={() => window.location.href = `/notas/${n.id}`}
                    className={`cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50 ${isNula ? 'text-gray-400' : ''}`}
                  >
                    <td className="px-4 py-2 font-mono font-bold">{formatNotaNumero(n.numero, notaPrefix)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        n.estado === 'Vigente' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {n.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2">{n.departamento}</td>
                    <td className="px-4 py-2">{n.pozo || ''}</td>
                    <td className="px-4 py-2">{n.tipoSalida}</td>
                    <td className="px-4 py-2">{n.solicitante}</td>
                    <td className="px-4 py-2">{n.destino}</td>
                    <td className="px-4 py-2 text-gray-500">{n.fecha ? formatDate(n.fecha) : ''}</td>
                    <td className="px-4 py-2">
                      <SignatureBadge status={n.signatureStatus} />
                    </td>
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        {!isNula && (
                          <a href={`/notas/${n.id}/editar`} className="rounded border border-pa-orange px-2.5 py-1 text-xs font-medium text-pa-orange hover:bg-pa-orange hover:text-white">Editar</a>
                        )}
                        <button onClick={() => exportPdf(n.id)} className="rounded border border-pa-dark px-2.5 py-1 text-xs font-medium text-pa-dark hover:bg-pa-dark hover:text-white">PDF</button>
                        {isAdmin && (
                          <button
                            onClick={() => toggleEstado(n.id, n.estado)}
                            className={`rounded border px-2.5 py-1 text-xs font-medium ${isNula ? 'border-green-400 text-green-600 hover:bg-green-500 hover:text-white' : 'border-red-400 text-red-500 hover:bg-red-500 hover:text-white'}`}
                          >
                            {isNula ? 'Restaurar' : 'Anular'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-gray-400">Cargando...</p>
        ) : paginated.length === 0 ? (
          <p className="py-8 text-center text-gray-400">No hay notas</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-gray-500">Ordenar:</span>
              {COLUMNS.map((col) => (
                <button
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`rounded-full border px-2 py-0.5 ${sortKey === col.key ? 'border-pa-orange bg-pa-orange/10 font-medium text-pa-orange' : 'text-gray-500'}`}
                >
                  {col.label}{sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              ))}
            </div>
            {paginated.map((n) => {
              const isNula = n.estado === 'Nula';
              return (
                <div key={n.id} onClick={() => window.location.href = `/notas/${n.id}`} className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm hover:border-pa-orange/50 ${isNula ? 'opacity-70' : ''}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{formatNotaNumero(n.numero, notaPrefix)}</span>
                    <div className="flex items-center gap-1.5">
                      <SignatureBadge status={n.signatureStatus} />
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        n.estado === 'Vigente' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {n.estado}
                      </span>
                    </div>
                  </div>
                  <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div><span className="text-gray-400">Depto: </span><span className="text-gray-700">{n.departamento}</span></div>
                    <div><span className="text-gray-400">Pozo: </span><span className="text-gray-700">{n.pozo || '—'}</span></div>
                    <div><span className="text-gray-400">Tipo: </span><span className="text-gray-700">{n.tipoSalida}</span></div>
                    <div><span className="text-gray-400">Fecha: </span><span className="text-gray-700">{n.fecha ? formatDate(n.fecha) : '—'}</span></div>
                    <div className="col-span-2"><span className="text-gray-400">Solicitante: </span><span className="text-gray-700">{n.solicitante}</span></div>
                    <div className="col-span-2"><span className="text-gray-400">Destino: </span><span className="text-gray-700">{n.destino}</span></div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {!isNula && (
                      <a href={`/notas/${n.id}/editar`} className="rounded border border-pa-orange px-3 py-1.5 text-xs font-medium text-pa-orange hover:bg-pa-orange hover:text-white">Editar</a>
                    )}
                    <button onClick={() => exportPdf(n.id)} className="rounded border border-pa-dark px-3 py-1.5 text-xs font-medium text-pa-dark hover:bg-pa-dark hover:text-white">PDF</button>
                    {isAdmin && (
                      <button
                        onClick={() => toggleEstado(n.id, n.estado)}
                        className={`rounded border px-3 py-1.5 text-xs font-medium ${isNula ? 'border-green-400 text-green-600 hover:bg-green-500 hover:text-white' : 'border-red-400 text-red-500 hover:bg-red-500 hover:text-white'}`}
                      >
                        {isNula ? 'Restaurar' : 'Anular'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
        <div className="flex items-center gap-3">
          <span>{sorted.length} notas</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded border px-2 py-1 text-xs"
          >
            {[10, 20, 50, 100].map(n => (
              <option key={n} value={n}>{n} por pág.</option>
            ))}
          </select>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border px-3 py-1 disabled:opacity-30"
            >
              ←
            </button>
            <span className="px-1 py-1 text-xs">{page}/{totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded border px-3 py-1 disabled:opacity-30"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
