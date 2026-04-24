import { useState, useEffect } from 'react';
import { toast } from './Toast';

interface SmtpState {
  host: string;
  port: string;
  user: string;
  pass: string;
  from: string;
  enabled: boolean;
  hasPassword: boolean;
}

export default function AdminConfig() {
  const [companyName, setCompanyName] = useState('');
  const [notaPrefix, setNotaPrefix] = useState('');
  const [notaCounter, setNotaCounter] = useState('');
  const [stats, setStats] = useState<{ totalNotas: number; dbPath: string; version: string }>({ totalNotas: 0, dbPath: '', version: '' });
  const [counterStep, setCounterStep] = useState(0);
  const [smtp, setSmtp] = useState<SmtpState>({ host: 'smtp.resend.com', port: '465', user: 'resend', pass: '', from: 'PetroAlianza <onboarding@resend.dev>', enabled: false, hasPassword: false });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);

  const fetchConfig = async () => {
    const res = await fetch('/api/config');
    const data = await res.json();
    setCompanyName(data.config.company_name || '');
    setNotaPrefix(data.config.nota_prefix || 'NS');
    setNotaCounter(data.config.nota_counter || '1');
    setStats(data.stats);

    const smtpRes = await fetch('/api/config/smtp');
    if (smtpRes.ok) {
      const s = await smtpRes.json();
      setSmtp({
        host: s.host || 'smtp.resend.com',
        port: String(s.port || 465),
        user: s.user || 'resend',
        pass: s.pass || '',
        from: s.from || 'PetroAlianza <onboarding@resend.dev>',
        enabled: s.enabled,
        hasPassword: s.hasPassword,
      });
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const saveSmtp = async () => {
    setSmtpSaving(true);
    try {
      const res = await fetch('/api/config/smtp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtp.host,
          port: parseInt(smtp.port),
          user: smtp.user,
          pass: smtp.pass,
          from: smtp.from,
          enabled: smtp.enabled,
        }),
      });
      if (res.ok) {
        toast('Configuración SMTP guardada');
      } else {
        const data = await res.json();
        toast(data.error || 'Error al guardar', 'error');
      }
    } catch {
      toast('Error de conexión', 'error');
    } finally {
      setSmtpSaving(false);
    }
  };

  const testSmtp = async () => {
    setSmtpTesting(true);
    const res = await fetch('/api/config/smtp', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      toast('Conexión SMTP exitosa');
    } else {
      toast(data.error || 'Error de conexión SMTP', 'error');
    }
    setSmtpTesting(false);
  };

  const saveCompanyName = async () => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: companyName }),
    });
    if (res.ok) { toast('Nombre de empresa actualizado'); }
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
      toast('Contador actualizado');
      setCounterStep(0);
    } else {
      toast(data.error, 'error');
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

      {/* Nota prefix */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">Prefijo de Notas</h2>
        <p className="mb-3 text-xs text-gray-500">Prefijo que aparece antes del número de nota, por ejemplo: {notaPrefix}-0001</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={notaPrefix}
            onChange={(e) => setNotaPrefix(e.target.value.toUpperCase())}
            maxLength={10}
            className="w-32 rounded-md border px-3 py-2 text-sm font-mono focus:border-pa-orange focus:outline-none"
          />
          <button
            onClick={async () => {
              const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nota_prefix: notaPrefix }),
              });
              if (res.ok) { toast('Prefijo actualizado'); }
            }}
            className="rounded-lg bg-pa-orange px-4 py-2 text-sm font-semibold text-white"
          >
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

      {/* SMTP / Email */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">Correo Electrónico (SMTP)</h2>
        <p className="mb-4 text-xs text-gray-500">Configuración para envío de correos de firma. Pre-configurado para Resend.</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="w-24 text-sm text-gray-600 shrink-0">Habilitado</label>
            <button
              type="button"
              onClick={() => setSmtp({ ...smtp, enabled: !smtp.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${smtp.enabled ? 'bg-pa-orange' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition transform ${smtp.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24 text-sm text-gray-600 shrink-0">Host</label>
            <input type="text" value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
              className="flex-1 rounded-md border px-3 py-2 text-sm focus:border-pa-orange focus:outline-none" />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24 text-sm text-gray-600 shrink-0">Puerto</label>
            <input type="number" value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })}
              className="w-24 rounded-md border px-3 py-2 text-sm focus:border-pa-orange focus:outline-none" />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24 text-sm text-gray-600 shrink-0">Usuario</label>
            <input type="text" value={smtp.user} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
              className="flex-1 rounded-md border px-3 py-2 text-sm focus:border-pa-orange focus:outline-none" />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24 text-sm text-gray-600 shrink-0">Contraseña</label>
            <input type="password" value={smtp.pass} onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
              placeholder={smtp.hasPassword ? '(guardada)' : 'API key de Resend'}
              className="flex-1 rounded-md border px-3 py-2 text-sm focus:border-pa-orange focus:outline-none" />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24 text-sm text-gray-600 shrink-0">Remitente</label>
            <input type="text" value={smtp.from} onChange={(e) => setSmtp({ ...smtp, from: e.target.value })}
              className="flex-1 rounded-md border px-3 py-2 text-sm focus:border-pa-orange focus:outline-none" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={saveSmtp} disabled={smtpSaving}
              className="rounded-lg bg-pa-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {smtpSaving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={testSmtp} disabled={smtpTesting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {smtpTesting ? 'Probando...' : 'Probar conexión'}
            </button>
          </div>
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

    </div>
  );
}
