import { useState, useEffect } from 'react';

export default function AdminConfig() {
  const [companyName, setCompanyName] = useState('');
  const [notaCounter, setNotaCounter] = useState('');
  const [stats, setStats] = useState<{ totalNotas: number; dbPath: string; version: string }>({ totalNotas: 0, dbPath: '', version: '' });
  const [message, setMessage] = useState('');
  const [counterStep, setCounterStep] = useState(0); // 0=idle, 1=first confirm, 2=second confirm

  const fetchConfig = async () => {
    const res = await fetch('/api/config');
    const data = await res.json();
    setCompanyName(data.config.company_name || '');
    setNotaCounter(data.config.nota_counter || '1');
    setStats(data.stats);
  };

  useEffect(() => { fetchConfig(); }, []);

  const saveCompanyName = async () => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: companyName }),
    });
    if (res.ok) setMessage('Nombre de empresa actualizado');
  };

  const handleCounterChange = async () => {
    if (counterStep === 0) {
      setCounterStep(1);
      return;
    }
    if (counterStep === 1) {
      setCounterStep(2);
      return;
    }

    // Step 2: actually save
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nota_counter: notaCounter }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('Contador actualizado');
      setCounterStep(0);
    } else {
      setMessage(data.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Company name */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">Nombre de Empresa</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full max-w-sm rounded-md border px-3 py-2 text-sm focus:border-pa-orange focus:outline-none"
          />
          <button onClick={saveCompanyName} className="rounded-lg bg-pa-orange px-4 py-2 text-sm font-semibold text-white">
            Guardar
          </button>
        </div>
      </div>

      {/* Nota counter */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">Contador de Notas</h2>
        <p className="mb-3 text-xs text-gray-500">La próxima nota creada usará este número. Cambiar puede causar duplicados.</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={notaCounter}
            onChange={(e) => { setNotaCounter(e.target.value); setCounterStep(0); }}
            className="w-32 rounded-md border px-3 py-2 text-sm focus:border-pa-orange focus:outline-none"
          />
          <button
            onClick={handleCounterChange}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              counterStep === 0 ? 'bg-pa-orange' :
              counterStep === 1 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          >
            {counterStep === 0 && 'Cambiar'}
            {counterStep === 1 && '¿Está seguro? Puede generar duplicados'}
            {counterStep === 2 && 'Confirmar definitivamente'}
          </button>
          {counterStep > 0 && (
            <button onClick={() => setCounterStep(0)} className="text-sm text-gray-500 hover:underline">Cancelar</button>
          )}
        </div>
      </div>

      {/* System info */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">Información del Sistema</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Versión</dt>
          <dd>{stats.version}</dd>
          <dt className="text-gray-500">Ruta BD</dt>
          <dd className="font-mono text-xs">{stats.dbPath}</dd>
          <dt className="text-gray-500">Total de Notas</dt>
          <dd>{stats.totalNotas}</dd>
        </dl>
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}
    </div>
  );
}
