import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  role: string;
  active: boolean;
  nombre: string;
  apellido: string;
  ci: string;
  resetToken: string | null;
}

export default function AdminUsuarios() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'operador', nombre: '', apellido: '', ci: '' });
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    const res = await fetch('/api/usuarios');
    setUsers(await res.json());
  };

  useEffect(() => { fetchUsers(); }, []);

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
      setForm({ username: '', password: '', role: 'operador', nombre: '', apellido: '', ci: '' });
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
    alert('Contraseña actualizada');
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usuarios</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="rounded-lg bg-pa-orange px-4 py-2 text-sm font-semibold text-white">
          {showCreate ? 'Cancelar' : '+ Crear Usuario'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <input placeholder="Usuario" required value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} className="rounded-md border px-3 py-2 text-sm" />
            <input placeholder="Contraseña" required type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="rounded-md border px-3 py-2 text-sm" />
            <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="rounded-md border px-3 py-2 text-sm">
              <option value="operador">Operador</option>
              <option value="admin">Admin</option>
            </select>
            <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} className="rounded-md border px-3 py-2 text-sm" />
            <input placeholder="Apellido" value={form.apellido} onChange={(e) => setForm({...form, apellido: e.target.value})} className="rounded-md border px-3 py-2 text-sm" />
            <input placeholder="C.I." value={form.ci} onChange={(e) => setForm({...form, ci: e.target.value})} className="rounded-md border px-3 py-2 text-sm" />
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button type="submit" className="mt-3 rounded-lg bg-pa-orange px-4 py-2 text-sm font-semibold text-white">Crear</button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pa-dark text-left text-xs text-white">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Token Activo</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 font-medium">{u.username}</td>
                <td className="px-4 py-2">{u.nombre} {u.apellido}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
