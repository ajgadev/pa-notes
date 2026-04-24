import { useState } from 'react';
import PasswordInput from './PasswordInput';
import PasswordStrength, { isPasswordValid } from './PasswordStrength';
import { toast } from './Toast';

interface Props {
  endpoint: string;
  requireCurrent?: boolean;
  tokenField?: string;
  tokenValue?: string;
  successRedirect: string;
  successMessage?: string;
}

export default function ChangePasswordForm({
  endpoint,
  requireCurrent = false,
  tokenField,
  tokenValue,
  successRedirect,
  successMessage = 'Contraseña actualizada. Redirigiendo...',
}: Props) {
  const [current, setCurrent] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = isPasswordValid(newPassword) && newPassword === confirm && (!requireCurrent || current.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    const body: Record<string, string> = { newPassword };
    if (requireCurrent) body.currentPassword = current;
    if (tokenField && tokenValue) body[tokenField] = tokenValue;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast(successMessage);
        setTimeout(() => (window.location.href = successRedirect), 1500);
      } else {
        toast(data.error || 'Error', 'error');
        setSubmitting(false);
      }
    } catch {
      toast('Error de conexión', 'error');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {requireCurrent && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña actual</label>
          <PasswordInput id="currentPassword" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nueva contraseña</label>
        <PasswordInput id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
        <PasswordStrength password={newPassword} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar nueva contraseña</label>
        <PasswordInput id="confirmPassword" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {confirm.length > 0 && (
          <p className={`mt-1 text-xs ${newPassword === confirm ? 'text-green-700' : 'text-red-500'}`}>
            {newPassword === confirm ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full rounded-lg bg-pa-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pa-orange/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Guardando...' : 'Cambiar Contraseña'}
      </button>
    </form>
  );
}
