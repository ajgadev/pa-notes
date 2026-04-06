import { useState, useEffect } from 'react';
import { generatePdf } from './PdfExporter';
import { formatDate } from '../lib/format';

interface Nota {
  id: number;
  numero: number;
  estado: 'Vigente' | 'Nula';
  departamento: string;
  fecha: string | null;
  tipoSalida: string;
  solicitante: string;
  destino: string;
  createdAt: string;
}

interface Props {
  isAdmin: boolean;
  username: string;
}

export default function NotasList({ isAdmin, username }: Props) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchNotas = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('q', search);
    const res = await fetch(`/api/notas?${params}`);
    const data = await res.json();
    setNotas(data.data);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => { fetchNotas(); }, [page, search]);

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
    const doc = generatePdf(data, username);
    doc.save(`nota-${String(data.numero).padStart(4, '0')}.pdf`);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Search */}
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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pa-dark text-left text-xs text-white">
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Departamento</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Solicitante</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : notas.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No hay notas</td></tr>
            ) : (
              notas.map((n, i) => (
                <tr
                  key={n.id}
                  className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${n.estado === 'Nula' ? 'line-through opacity-50' : ''}`}
                >
                  <td className="px-4 py-2 font-mono font-bold">{n.numero}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      n.estado === 'Vigente' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {n.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2">{n.departamento}</td>
                  <td className="px-4 py-2">{n.tipoSalida}</td>
                  <td className="px-4 py-2">{n.solicitante}</td>
                  <td className="px-4 py-2">{n.destino}</td>
                  <td className="px-4 py-2 text-gray-500">{formatDate(n.fecha) || formatDate(n.createdAt)}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1.5">
                      <a href={`/notas/${n.id}/editar`} className="rounded border border-pa-orange px-2.5 py-1 text-xs font-medium text-pa-orange hover:bg-pa-orange hover:text-white">Editar</a>
                      <button onClick={() => exportPdf(n.id)} className="rounded border border-pa-dark px-2.5 py-1 text-xs font-medium text-pa-dark hover:bg-pa-dark hover:text-white">PDF</button>
                      {isAdmin && (
                        <button
                          onClick={() => toggleEstado(n.id, n.estado)}
                          className={`rounded border px-2.5 py-1 text-xs font-medium ${n.estado === 'Vigente' ? 'border-red-400 text-red-500 hover:bg-red-500 hover:text-white' : 'border-green-400 text-green-600 hover:bg-green-500 hover:text-white'}`}
                        >
                          {n.estado === 'Vigente' ? 'Anular' : 'Restaurar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>{total} notas en total</span>
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
        </div>
      )}
    </div>
  );
}
