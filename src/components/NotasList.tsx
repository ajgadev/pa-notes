import { useState, useEffect, useMemo } from 'react';
import { generatePdf } from './PdfExporter';
import { formatDate, formatNotaNumero } from '../lib/format';

interface Nota {
  id: number;
  numero: number;
  estado: 'Vigente' | 'Nula';
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

  const fetchNotas = async () => {
    setLoading(true);
    const res = await fetch(`/api/notas?page=1&limit=9999${search ? `&q=${encodeURIComponent(search)}` : ''}`);
    const data = await res.json();
    setNotas(data.data);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => { fetchNotas(); }, [search]);

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
  };

  const exportPdf = async (id: number) => {
    const res = await fetch(`/api/notas/${id}`);
    const data = await res.json();
    const doc = await generatePdf(data, username, notaPrefix);
    doc.save(`${notaPrefix}-${String(data.numero).padStart(4, '0')}.pdf`);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por número, departamento, solicitante..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-pa-orange focus:ring-1 focus:ring-pa-orange/30 focus:outline-none"
        />
        <a
          href="/notas/nueva"
          className="shrink-0 rounded-lg bg-pa-orange px-4 py-2 text-sm font-semibold text-white hover:bg-pa-orange/90"
        >
          + Nueva Nota
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
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
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No hay notas</td></tr>
            ) : (
              paginated.map((n, i) => {
                const isNula = n.estado === 'Nula';
                return (
                  <tr
                    key={n.id}
                    className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isNula ? 'text-gray-400' : ''}`}
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

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-3">
          <span>{sorted.length} notas en total</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded border px-2 py-1 text-xs"
          >
            {[10, 20, 50, 100].map(n => (
              <option key={n} value={n}>{n} por página</option>
            ))}
          </select>
        </div>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border px-3 py-1 disabled:opacity-30"
            >
              Anterior
            </button>
            <span className="px-2 py-1">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded border px-3 py-1 disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
