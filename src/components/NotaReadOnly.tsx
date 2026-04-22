import { useState, useEffect } from 'react';

interface NotaItem {
  noParte?: string;
  unidad: number;
  cantidad: number;
  descripcion: string;
  noSerial?: string;
}

interface SignatureInfo {
  role: string;
  signedByName?: string;
  signedAt?: string;
}

interface NotaData {
  id: number;
  numero: number;
  estado: string;
  departamento?: string;
  fecha?: string;
  empresa: string;
  base: string;
  pozo?: string;
  taladro?: string;
  tipoSalida: string;
  solicitante: string;
  destino: string;
  vPlaca?: string;
  vMarca?: string;
  vModelo?: string;
  cNombre?: string;
  cCi?: string;
  gNombre?: string;
  gCi?: string;
  sNombre?: string;
  sCi?: string;
  elabNombre?: string;
  elabCi?: string;
  aproNombre?: string;
  aproCi?: string;
  items: NotaItem[];
  signatures?: SignatureInfo[];
}

interface Props {
  nota: NotaData;
  notaPrefix?: string;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  );
}

const ROLE_MAP: Record<string, { label: string; nameField: keyof NotaData; ciField: keyof NotaData }> = {
  conductor: { label: 'Conductor', nameField: 'cNombre', ciField: 'cCi' },
  gerente: { label: 'Gerente General', nameField: 'gNombre', ciField: 'gCi' },
  seguridad: { label: 'Seguridad Física', nameField: 'sNombre', ciField: 'sCi' },
  elaborado: { label: 'Elaborado por', nameField: 'elabNombre', ciField: 'elabCi' },
  aprobado: { label: 'Aprobado por', nameField: 'aproNombre', ciField: 'aproCi' },
};

export default function NotaReadOnly({ nota, notaPrefix = 'NS' }: Props) {
  const formatNumero = (n: number) => `${notaPrefix}-${String(n).padStart(6, '0')}`;
  const [sigs, setSigs] = useState<SignatureInfo[]>(nota.signatures ?? []);

  useEffect(() => {
    function refresh() {
      fetch(`/api/notas/${nota.id}/firmas`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data?.roles) return;
          setSigs(data.roles.filter((r: any) => r.signed).map((r: any) => ({
            role: r.role,
            signedByName: r.signedByName,
            signedAt: r.signedAt,
          })));
        })
        .catch(() => {});
    }
    window.addEventListener('notas-updated', refresh);
    return () => window.removeEventListener('notas-updated', refresh);
  }, [nota.id]);

  const sigMap = new Map(sigs.map((s) => [s.role, s]));

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nota {formatNumero(nota.numero)}</h2>
            <p className="text-xs text-gray-500">FO-SF-001 — Autorización de Salida de Materiales y/o Equipos</p>
          </div>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            nota.estado === 'Vigente' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {nota.estado}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* General info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Departamento" value={nota.departamento} />
          <Field label="Fecha" value={nota.fecha} />
          <Field label="Empresa" value={nota.empresa} />
          <Field label="Base" value={nota.base} />
          <Field label="Pozo" value={nota.pozo} />
          <Field label="Taladro" value={nota.taladro} />
        </div>

        {/* Exit type */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo de Salida" value={nota.tipoSalida} />
          <Field label="Solicitante" value={nota.solicitante} />
        </div>
        <Field label="Destino / Motivo" value={nota.destino} />

        {/* Items */}
        {nota.items.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Materiales / Equipos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">No. Parte</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Unidad</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Cantidad</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">No. Serial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {nota.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2">{item.noParte || '—'}</td>
                      <td className="px-3 py-2">{item.descripcion}</td>
                      <td className="px-3 py-2 text-center">{item.unidad}</td>
                      <td className="px-3 py-2 text-center">{item.cantidad}</td>
                      <td className="px-3 py-2">{item.noSerial || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vehicle */}
        {(nota.vPlaca || nota.vMarca || nota.vModelo) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Vehículo</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Placa" value={nota.vPlaca} />
              <Field label="Marca" value={nota.vMarca} />
              <Field label="Modelo" value={nota.vModelo} />
            </div>
          </div>
        )}

        {/* Signatures */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Firmas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(ROLE_MAP).map(([role, { label, nameField, ciField }]) => {
              const name = nota[nameField] as string | undefined;
              const ci = nota[ciField] as string | undefined;
              if (!ci?.trim()) return null;

              const sig = sigMap.get(role);
              return (
                <div key={role} className={`p-3 rounded-lg border ${
                  sig ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                    {sig ? (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Firmado
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-600 font-medium">Pendiente</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{name || '—'}</p>
                  <p className="text-xs text-gray-500">CI: {ci}</p>
                  {sig?.signedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      {new Date(sig.signedAt).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
