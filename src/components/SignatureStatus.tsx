import { useState, useEffect } from 'react';
import SignaturePad from './SignaturePad';
import { toast } from './Toast';

interface RoleStatus {
  role: string;
  roleLabel: string;
  signerName: string;
  signerCi: string;
  signed: boolean;
  signedAt: string | null;
  signedByName: string | null;
  ip: string | null;
  tokenUrl: string | null;
  tokenExpired: boolean;
}

interface Props {
  notaId: number;
  userCi: string;
  savedSignature?: string | null;
  isAdmin?: boolean;
}

export default function SignatureStatus({ notaId, userCi, savedSignature, isAdmin }: Props) {
  const [roles, setRoles] = useState<RoleStatus[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [signingRole, setSigningRole] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  async function loadStatus() {
    try {
      const res = await fetch(`/api/notas/${notaId}/firmas`);
      const data = await res.json();
      setRoles([...(data.roles || [])]);
      setStatus(data.signatureStatus || '');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStatus(); }, [notaId]);

  async function handleSign(signatureData: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/notas/${notaId}/firmas/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: signingRole, signatureData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSigningRole(null);
      await loadStatus();
      document.getElementById('edit-nota-btn')?.remove();
      window.dispatchEvent(new CustomEvent('notas-updated'));
    } catch (err: any) {
      toast(err.message || 'Error al firmar', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function resendEmail(role?: string) {
    const key = role || 'all';
    setResending(key);
    try {
      const res = await fetch(`/api/notas/${notaId}/firmas/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(data.message, 'success');
      if (data.warnings?.length) {
        data.warnings.forEach((w: string) => toast(w, 'error'));
      }
    } catch (err: any) {
      toast(err.message || 'Error al reenviar', 'error');
    } finally {
      setResending(null);
    }
  }

  function copyTokenLink(tokenUrl: string) {
    const fullUrl = `${window.location.origin}${tokenUrl}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedToken(tokenUrl);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }

  if (loading) return <div className="text-sm text-gray-500">Cargando estado de firmas...</div>;
  if (roles.length === 0) return null;

  const signedCount = roles.filter((r) => r.signed).length;
  const statusColor = status === 'completa' ? 'green' : status === 'pendiente' ? 'yellow' : 'gray';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Firmas</h3>
        <div className="flex items-center gap-2">
          {isAdmin && signedCount < roles.length && (
            <button
              type="button"
              onClick={() => resendEmail()}
              disabled={resending === 'all'}
              className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50"
              title="Reenviar correo a todos los firmantes pendientes"
            >
              {resending === 'all' ? 'Enviando...' : 'Reenviar todos'}
            </button>
          )}
          <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full bg-${statusColor}-100 text-${statusColor}-700`}>
            {signedCount}/{roles.length} firmadas
          </span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {roles.map((r) => {
          const canSign = !r.signed && userCi === r.signerCi;
          return (
            <div key={r.role} className={`p-3 rounded-lg border ${
              r.signed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{r.roleLabel}</span>
                    {r.signed ? (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Firmado
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-600 font-medium">Pendiente</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{r.signerName} — CI: {r.signerCi}</p>
                  {r.signed && r.signedAt && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Firmado: {new Date(r.signedAt).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {r.signedByName ? ` por ${r.signedByName}` : ''}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canSign && (
                    <button
                      type="button"
                      onClick={() => setSigningRole(r.role)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-pa-orange rounded hover:bg-orange-600"
                    >
                      Firmar
                    </button>
                  )}
                  {!r.signed && r.tokenUrl && !r.tokenExpired && (
                    <>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => resendEmail(r.role)}
                          disabled={resending === r.role}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-white border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50"
                          title="Reenviar correo de firma"
                        >
                          {resending === r.role ? 'Enviando...' : 'Reenviar'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyTokenLink(r.tokenUrl!)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        {copiedToken === r.tokenUrl ? 'Copiado!' : 'Copiar enlace'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline signing modal */}
              {signingRole === r.role && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <SignaturePad
                    onSubmit={handleSign}
                    onCancel={() => setSigningRole(null)}
                    savedSignature={savedSignature}
                    submitting={submitting}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
