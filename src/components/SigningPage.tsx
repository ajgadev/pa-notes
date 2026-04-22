import { useState, useEffect } from 'react';
import NotaReadOnly from './NotaReadOnly';
import SignaturePad from './SignaturePad';

interface Props {
  token: string;
  notaPrefix: string;
}

export default function SigningPage({ token, notaPrefix }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notaData, setNotaData] = useState<any>(null);
  const [signerInfo, setSignerInfo] = useState<{ role: string; roleLabel: string; name: string } | null>(null);
  const [success, setSuccess] = useState(false);
  const [allSigned, setAllSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/firmar/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Error al cargar la nota');
        }
        return res.json();
      })
      .then((data) => {
        setNotaData(data.nota);
        setSignerInfo(data.signer);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSign(signatureData: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/firmar/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      setAllSigned(data.allSigned);
    } catch (err: any) {
      alert(err.message || 'Error al registrar firma');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pa-orange" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 max-w-md w-full text-center">
          <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Enlace no válido</h2>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm border border-green-200 p-8 max-w-md w-full text-center">
          <svg className="mx-auto h-12 w-12 text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Firma registrada</h2>
          <p className="text-sm text-gray-600">
            {allSigned
              ? 'Todas las firmas han sido completadas para esta nota.'
              : 'Su firma ha sido registrada exitosamente. Aún faltan firmas de otros participantes.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-pa-dark text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-pa-orange rounded flex items-center justify-center text-sm font-bold">PA</div>
          <div>
            <h1 className="text-lg font-semibold">PetroAlianza</h1>
            <p className="text-xs text-gray-400">Firma de Autorización de Salida</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Signer info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">{signerInfo?.name}</span>, se requiere su firma como{' '}
            <span className="font-semibold">{signerInfo?.roleLabel}</span> en la siguiente nota.
          </p>
          <p className="text-xs text-blue-600 mt-1">Revise el documento y firme al final de la página.</p>
        </div>

        {/* Read-only nota */}
        <NotaReadOnly nota={notaData} notaPrefix={notaPrefix} />

        {/* Signature section */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Firmar como: {signerInfo?.roleLabel}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Dibuje su firma en el recuadro o suba una imagen de su firma.
          </p>
          <SignaturePad onSubmit={handleSign} submitting={submitting} />
        </div>
      </div>
    </div>
  );
}
