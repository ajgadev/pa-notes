import { useState, useEffect, useMemo } from 'react';
import PasswordInput from './PasswordInput';
import { toast } from './Toast';

interface User {
  id: number;
  username: string;
  role: string;
  email: string;
  active: boolean;
  nombre: string;
  apellido: string;
  ci: string;
  resetToken: string | null;
}

type SortKey = 'username' | 'nombre' | 'role' | 'active';

const PAGE_SIZE = 15;

export default function AdminUsuarios() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'operador', nombre: '', apellido: '', ci: '', email: '' });
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('username');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    const res = await fetch('/api/usuarios');
    setUsers(await res.json());
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.nombre?.toLowerCase().includes(q) ||
      u.apellido?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: string | boolean = sortKey === 'nombre' ? `${a.nombre} ${a.apellido}` : a[sortKey];
      let vb: string | boolean = sortKey === 'nombre' ? `${b.nombre} ${b.apellido}` : b[sortKey];
      if (typeof va === 'boolean') { va = va ? 'a' : 'z'; vb = (vb as boolean) ? 'a' : 'z'; }
      const cmp = String(va).localeCompare(String(vb), 'es', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...form }),
    });
    const data = await res.json();
    if (res.ok) {
      setShowCreate(false);
      setForm({ username: '', password: '', role: 'operador', nombre: '', apellido: '', ci: '', email: '' });
      fetchUsers();
    } else {
      setError(data.error);
    }
  };

  const toggleActive = async (id: number, current: boolean) => {
    await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, active: !current }),
    });
    fetchUsers();
  };

  const changeRole = async (id: number, role: string) => {
    await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, role }),
    });
    fetchUsers();
  };

  const resetPassword = async (id: number) => {
    const newPassword = prompt('Nueva contraseña temporal:');
    if (!newPassword) return;
    await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-password', id, newPassword }),
    });
    toast('Contraseña actualizada');
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:border-pa-orange focus:outline-none sm:max-w-xs"
        />
        <button onClick={() => setShowCreate(!showCreate)} className="shrink-0 rounded-lg bg-pa-orange px-4 py-2 text-sm font-semibold text-white">
          {showCreate ? 'Cancelar' : '+ Crear'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <input placeholder="Usuario" required value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} className="rounded-md border px-3 py-2 text-sm" />
            <PasswordInput placeholder="Contraseña" required minLength={8} value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full rounded-md border px-3 py-2 pr-10 text-sm" />
            <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="rounded-md border px-3 py-2 text-sm">
              <option value="operador">Operador</option>
              <option value="admin">Admin</option>
            </select>
            <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} className="rounded-md border px-3 py-2 text-sm" />
            <input placeholder="Apellido" value={form.apellido} onChange={(e) => setForm({...form, apellido: e.target.value})} className="rounded-md border px-3 py-2 text-sm" />
            <input placeholder="C.I." value={form.ci} onChange={(e) => setForm({...form, ci: e.target.value})} className="rounded-md border px-3 py-2 text-sm" />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="rounded-md border px-3 py-2 text-sm" />
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button type="submit" className="mt-3 rounded-lg bg-pa-orange px-4 py-2 text-sm font-semibold text-white">Crear</button>
        </form>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pa-dark text-left text-xs text-white">
              <th className="cursor-pointer select-none px-4 py-3 hover:bg-white/10" onClick={() => handleSort('username')}>Usuario{sortIcon('username')}</th>
              <th className="cursor-pointer select-none px-4 py-3 hover:bg-white/10" onClick={() => handleSort('nombre')}>Nombre{sortIcon('nombre')}</th>
              <th className="px-4 py-3">Email</th>
              <th className="cursor-pointer select-none px-4 py-3 hover:bg-white/10" onClick={() => handleSort('role')}>Rol{sortIcon('role')}</th>
              <th className="cursor-pointer select-none px-4 py-3 hover:bg-white/10" onClick={() => handleSort('active')}>Estado{sortIcon('active')}</th>
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin usuarios</td></tr>
            ) : (
              paginated.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 font-medium">{u.username}</td>
                  <td className="px-4 py-2">{u.nombre} {u.apellido}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{u.email || '—'}</td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="operador">Operador</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-pa-orange">{u.resetToken || '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1.5">
                      <button onClick={() => toggleActive(u.id, u.active)} className={`rounded border px-2.5 py-1 text-xs font-medium ${u.active ? 'border-red-400 text-red-500 hover:bg-red-500 hover:text-white' : 'border-green-400 text-green-600 hover:bg-green-500 hover:text-white'}`}>
                        {u.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => resetPassword(u.id)} className="rounded border border-pa-orange px-2.5 py-1 text-xs font-medium text-pa-orange hover:bg-pa-orange hover:text-white">
                        Reset Pass
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {paginated.length === 0 ? (
          <p className="py-8 text-center text-gray-400">Sin usuarios</p>
        ) : (
          paginated.map((u) => (
            <div key={u.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{u.username}</span>
                  <span className="ml-2 text-xs text-gray-400">{u.nombre} {u.apellido}</span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {u.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div><span className="text-gray-400">Rol: </span>
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="rounded border px-1 py-0.5 text-xs"
                  >
                    <option value="admin">Admin</option>
                    <option value="operador">Operador</option>
                  </select>
                </div>
                <div><span className="text-gray-400">Email: </span><span className="text-gray-600">{u.email || '—'}</span></div>
                {u.resetToken && (
                  <div className="col-span-2"><span className="text-gray-400">Token: </span><span className="font-mono text-pa-orange">{u.resetToken}</span></div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(u.id, u.active)} className={`rounded border px-3 py-1.5 text-xs font-medium ${u.active ? 'border-red-400 text-red-500 hover:bg-red-500 hover:text-white' : 'border-green-400 text-green-600 hover:bg-green-500 hover:text-white'}`}>
                  {u.active ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => resetPassword(u.id)} className="rounded border border-pa-orange px-3 py-1.5 text-xs font-medium text-pa-orange hover:bg-pa-orange hover:text-white">
                  Reset Pass
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
        <div className="flex items-center gap-3">
          <span>{sorted.length} usuarios</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded border px-2 py-1 text-xs"
          >
            {[10, 15, 25, 50, 100].map(n => (
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
