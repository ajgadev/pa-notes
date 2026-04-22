import { useRef, useEffect, useState } from 'react';
import SignaturePadLib from 'signature_pad';

interface Props {
  onSubmit: (dataUrl: string) => void;
  onCancel?: () => void;
  savedSignature?: string | null;
  submitting?: boolean;
}

export default function SignaturePad({ onSubmit, onCancel, savedSignature, submitting }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    });

    pad.addEventListener('endStroke', () => {
      setIsEmpty(pad.isEmpty());
    });

    padRef.current = pad;

    return () => {
      pad.off();
    };
  }, [mode]);

  function handleClear() {
    padRef.current?.clear();
    setIsEmpty(true);
  }

  function handleUndo() {
    const pad = padRef.current;
    if (!pad) return;
    const data = pad.toData();
    if (data.length > 0) {
      data.pop();
      pad.fromData(data);
      setIsEmpty(pad.isEmpty());
    }
  }

  function handleUseSaved() {
    if (savedSignature) {
      onSubmit(savedSignature);
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert('La imagen excede 500KB. Por favor use una imagen más pequeña.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadPreview(dataUrl);
      setIsEmpty(false);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (mode === 'upload' && uploadPreview) {
      onSubmit(uploadPreview);
    } else if (mode === 'draw' && padRef.current && !padRef.current.isEmpty()) {
      onSubmit(padRef.current.toDataURL('image/png'));
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => { setMode('draw'); setUploadPreview(null); setIsEmpty(true); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            mode === 'draw' ? 'border-pa-orange text-pa-orange' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Dibujar firma
        </button>
        <button
          type="button"
          onClick={() => { setMode('upload'); setIsEmpty(true); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            mode === 'upload' ? 'border-pa-orange text-pa-orange' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Subir imagen
        </button>
      </div>

      {mode === 'draw' ? (
        <div>
          <canvas
            ref={canvasRef}
            className="w-full border border-gray-300 rounded-lg cursor-crosshair touch-none"
            style={{ height: '200px' }}
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleUndo}
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Deshacer
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-pa-orange hover:bg-orange-50 transition-colors">
            {uploadPreview ? (
              <img src={uploadPreview} alt="Firma" className="max-h-40 object-contain" />
            ) : (
              <div className="text-center">
                <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Haga clic para seleccionar una imagen</p>
                <p className="text-xs text-gray-400">PNG o JPG, máximo 500KB</p>
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Saved signature option */}
      {savedSignature && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 mb-2">Tiene una firma guardada:</p>
          <div className="flex items-center gap-3">
            <img src={savedSignature} alt="Firma guardada" className="h-12 border border-blue-200 rounded bg-white px-2" />
            <button
              type="button"
              onClick={handleUseSaved}
              disabled={submitting}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Usar esta firma
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isEmpty || submitting}
          className="px-6 py-2 text-sm font-medium text-white bg-pa-orange rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Enviando...' : 'Firmar'}
        </button>
      </div>
    </div>
  );
}
