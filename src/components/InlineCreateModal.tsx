import { useState } from 'react';

interface Field {
  key: string;
  label: string;
  required?: boolean;
}

interface Props {
  title: string;
  fields: Field[];
  apiUrl: string;
  onCreated: (data: Record<string, string>) => void;
  onClose: () => void;
}

export default function InlineCreateModal({ title, fields, apiUrl, onCreated, onClose }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...form }),
      });
      if (res.ok) {
        onCreated(form);
      } else {
        const data = await res.json();
        setError(data.error || 'Error al crear');
      }
    } catch {
      setError('Error de conexión');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium text-gray-600">{f.label}</label>
              <input
                value={form[f.key] || ''}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                required={f.required}
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-pa-orange focus:outline-none"
                autoFocus={f === fields[0]}
              />
            </div>
          ))}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-pa-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Creando...' : 'Crear'}
            </button>
            <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm text-gray-600">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
