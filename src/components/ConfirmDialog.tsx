import { useState, useEffect } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

let pending: PendingConfirm | null = null;
const listeners = new Set<(state: PendingConfirm | null) => void>();

function notify() {
  listeners.forEach((fn) => fn(pending));
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    pending = { options, resolve };
    notify();
  });
}

export default function ConfirmDialogContainer() {
  const [state, setState] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);

  function handleClose(result: boolean) {
    state?.resolve(result);
    pending = null;
    notify();
  }

  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50" onClick={() => handleClose(false)}>
      <div
        className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-sm w-full mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-gray-900 mb-2">{state.options.title}</h3>
        <p className="text-sm text-gray-600 mb-5">{state.options.message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleClose(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {state.options.cancelLabel || 'Cancelar'}
          </button>
          <button
            onClick={() => handleClose(true)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
              state.options.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-pa-orange hover:bg-orange-600'
            }`}
          >
            {state.options.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
