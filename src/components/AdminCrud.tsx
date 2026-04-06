import { useState, useEffect, useMemo } from 'react';

interface Column {
  key: string;
  label: string;
  editable?: boolean;
}

interface Props {
  title: string;
  apiUrl: string;
  columns: Column[];
  csvFormat?: string;
  csvImportUrl?: string;
}

const PAGE_SIZE = 15;

export default function AdminCrud({ title, apiUrl, columns, csvFormat, csvImportUrl }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const baseUrl = apiUrl.split('?')[0];
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any>(null);
  const [sortKey, setSortKey] = useState<string>(columns[0]?.key || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const fetchItems = async () => {
    const sep = apiUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${apiUrl}${sep}q=${encodeURIComponent(search)}`);
    setItems(await res.json());
  };

  useEffect(() => { fetchItems(); }, [search]);

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = String(va).localeCompare(String(vb), 'es', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [items, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const sortIcon = (key: string) => {
    if (sortKey !== key) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...form }),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({});
      fetchItems();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const handleUpdate = async (id: number) => {
    await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, ...editForm }),
    });
    setEditId(null);
    fetchItems();
  };

  const toggleActive = async (id: number, current: boolean) => {
    await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id, active: !current }),
    });
    fetchItems();
  };

  const handleCsvUpload = async () => {
    if (!csvFile || !csvImportUrl) return;
    const formData = new FormData();
    formData.append('file', csvFile);
    const res = await fetch(csvImportUrl, { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      setCsvPreview(null);
      setCsvFile(null);
      fetchItems();
      alert(`Importados: ${data.imported}, Duplicados ignorados: ${data.duplicates}`);
    } else {
      alert(data.error);
    }
  };

  const previewCsv = async () => {
    if (!csvFile) return;
    const text = await csvFile.text();
    const lines = text.trim().split('\n').map(l => l.split(',').map(c => c.trim()));
    setCsvPreview({ preview: lines.slice(0, 6), total: lines.length });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border px-4 py-2 text-sm focus:border-pa-orange focus:outline-none"
        />
        <button onClick={() => setShowCreate(!showCreate)} className="rounded-lg bg-pa-orange px-4 py-2 text-sm font-semibold text-white">
          {showCreate ? 'Cancelar' : `+ Crear`}
        </button>
        {csvImportUrl && (
          <label className="cursor-pointer rounded-lg border border-pa-orange px-4 py-2 text-sm font-medium text-pa-orange hover:bg-pa-orange hover:text-white">
            Importar CSV
            <input type="file" accept=".csv" className="hidden" onChange={(e) => { setCsvFile(e.target.files?.[0] || null); setCsvPreview(null); }} />
          </label>
        )}
        {csvFormat && (
          <span className="text-xs text-gray-400">Formato: {csvFormat}</span>
        )}
      </div>

      {csvFile && !csvPreview && (
        <div className="mb-4 rounded-lg border bg-yellow-50 p-4">
          <p className="text-sm">Archivo: <strong>{csvFile.name}</strong></p>
          <button onClick={previewCsv} className="mt-2 rounded bg-pa-orange px-3 py-1 text-sm text-white">Preview</button>
        </div>
      )}
      {csvPreview && (
        <div className="mb-4 rounded-lg border bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-medium">Preview ({csvPreview.total} filas totales):</p>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <tbody>
                {csvPreview.preview.map((row: string[], i: number) => (
                  <tr key={i} className={i === 0 ? 'font-bold' : ''}>
                    {row.map((cell: string, j: number) => (
                      <td key={j} className="border px-2 py-1">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleCsvUpload} className="rounded bg-pa-orange px-4 py-1.5 text-sm font-semibold text-white">Confirmar Importación</button>
            <button onClick={() => { setCsvFile(null); setCsvPreview(null); }} className="rounded border px-4 py-1.5 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            {columns.filter(c => c.editable !== false).map((col) => (
              <input
                key={col.key}
                placeholder={col.label}
                required
                value={form[col.key] || ''}
                onChange={(e) => setForm({ ...form, [col.key]: e.target.value })}
                className="rounded-md border px-3 py-2 text-sm"
              />
            ))}
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button type="submit" className="mt-3 rounded bg-pa-orange px-4 py-1.5 text-sm font-semibold text-white">Crear</button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pa-dark text-left text-xs text-white">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="cursor-pointer select-none px-4 py-3 hover:bg-white/10"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}{sortIcon(col.key)}
                </th>
              ))}
              <th
                className="cursor-pointer select-none px-4 py-3 hover:bg-white/10"
                onClick={() => handleSort('active')}
              >
                Estado{sortIcon('active')}
              </th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length + 2} className="px-4 py-8 text-center text-gray-400">Sin resultados</td></tr>
            ) : (
              paginated.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-2">
                      {editId === item.id && col.editable !== false ? (
                        <input
                          value={editForm[col.key] ?? item[col.key]}
                          onChange={(e) => setEditForm({ ...editForm, [col.key]: e.target.value })}
                          className="rounded border px-2 py-1 text-sm"
                        />
                      ) : (
                        item[col.key]
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${item.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1.5">
                      {editId === item.id ? (
                        <>
                          <button onClick={() => handleUpdate(item.id)} className="rounded border border-green-400 px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-500 hover:text-white">Guardar</button>
                          <button onClick={() => setEditId(null)} className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100">Cancelar</button>
                        </>
                      ) : (
                        <button onClick={() => { setEditId(item.id); setEditForm({}); }} className="rounded border border-pa-orange px-2.5 py-1 text-xs font-medium text-pa-orange hover:bg-pa-orange hover:text-white">Editar</button>
                      )}
                      <button onClick={() => toggleActive(item.id, item.active)} className={`rounded border px-2.5 py-1 text-xs font-medium ${item.active ? 'border-red-400 text-red-500 hover:bg-red-500 hover:text-white' : 'border-green-400 text-green-600 hover:bg-green-500 hover:text-white'}`}>
                        {item.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-3">
          <span>{sorted.length} registros en total</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded border px-2 py-1 text-xs"
          >
            {[10, 15, 25, 50, 100].map(n => (
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
