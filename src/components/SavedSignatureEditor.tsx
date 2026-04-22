import { useState } from 'react';
import SignaturePad from './SignaturePad';
import { toast } from './Toast';
import { confirm } from './ConfirmDialog';

interface Props {
  savedSignature: string | null;
}

export default function SavedSignatureEditor({ savedSignature: initial }: Props) {
  const [saved, setSaved] = useState<string | null>(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(dataUrl: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/perfil/firma', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData: dataUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSaved(dataUrl);
      setEditing(false);
      toast('Firma guardada');
    } catch (err: any) {
      toast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({ message: '¿Eliminar su firma guardada?', confirmText: 'Eliminar', danger: true });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch('/api/perfil/firma', {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error');
      setSaved(null);
      toast('Firma eliminada');
    } catch {
      toast('Error al eliminar', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div>
        <SignaturePad
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
          submitting={saving}
        />
      </div>
    );
  }

  return (
    <div>
      {saved ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="border border-gray-200 rounded-lg bg-white p-2">
              <img src={saved} alt="Mi firma" className="h-16 object-contain" />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-xs font-medium text-pa-orange border border-pa-orange rounded hover:bg-pa-orange hover:text-white"
              >
                Cambiar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-300 rounded hover:bg-red-500 hover:text-white disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-pa-orange rounded-lg hover:bg-orange-600"
        >
          Crear firma
        </button>
      )}
    </div>
  );
}
