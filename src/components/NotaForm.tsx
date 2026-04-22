import { useState } from 'react';
import ClearableInput from './ClearableInput';
import SearchableDropdown from './SearchableDropdown';
import ItemsTable from './ItemsTable';
import InlineCreateModal from './InlineCreateModal';

interface NotaItem {
  noParte: string;
  unidad: number;
  cantidad: number;
  descripcion: string;
  noSerial: string;
}

interface UserProfile {
  nombre: string;
  apellido: string;
  ci: string;
}

interface NotaData {
  departamento: string;
  fecha: string;
  empresa: string;
  base: string;
  pozo: string;
  taladro: string;
  tipoSalida: string;
  tipoSalidaOtro: string;
  solicitante: string;
  destino: string;
  vPlaca: string;
  vMarca: string;
  vModelo: string;
  cNombre: string;
  cCi: string;
  gNombre: string;
  gCi: string;
  sNombre: string;
  sCi: string;
  elabNombre: string;
  elabCi: string;
  aproNombre: string;
  aproCi: string;
  items: NotaItem[];
}

interface Props {
  userProfile: UserProfile;
  initialData?: Partial<NotaData>;
  notaId?: number;
  isAdmin?: boolean;
}

type ModalType = 'department' | 'vehicle' | 'personal' | null;

const TIPO_SALIDA_OPTIONS = ['Con Retorno', 'Sin Retorno', 'Inspección', 'Alquiler', 'Otros'];

function mapDepartments(data: any[]) {
  return data.map((d) => ({ label: d.name, value: d.name }));
}

function mapVehicles(data: any[]) {
  return data.map((v) => ({
    label: `${v.placa} — ${v.marca} ${v.modelo}`,
    value: v.placa,
    data: { marca: v.marca, modelo: v.modelo },
  }));
}

function mapPersonal(data: any[]) {
  return data.map((p) => ({
    label: `${p.ci} — ${p.nombre} ${p.apellido}`,
    value: p.ci,
    data: { nombre: `${p.nombre} ${p.apellido}`.trim() },
  }));
}

function mapPersonalAsName(data: any[]) {
  return data.map((p) => ({
    label: `${p.ci} — ${p.nombre} ${p.apellido}`,
    value: `${p.nombre} ${p.apellido}`.trim(),
  }));
}

export default function NotaForm({ userProfile, initialData, notaId, isAdmin }: Props) {
  const [form, setForm] = useState<NotaData>({
    departamento: initialData?.departamento ?? '',
    fecha: initialData?.fecha ?? '',
    empresa: initialData?.empresa ?? 'Petro Alianza',
    base: initialData?.base ?? 'Oriente',
    pozo: initialData?.pozo ?? '',
    taladro: initialData?.taladro ?? '',
    tipoSalida: initialData?.tipoSalida ?? '',
    tipoSalidaOtro: initialData?.tipoSalidaOtro ?? '',
    solicitante: initialData?.solicitante ?? '',
    destino: initialData?.destino ?? '',
    vPlaca: initialData?.vPlaca ?? '',
    vMarca: initialData?.vMarca ?? '',
    vModelo: initialData?.vModelo ?? '',
    cNombre: initialData?.cNombre ?? '',
    cCi: initialData?.cCi ?? '',
    gNombre: initialData?.gNombre ?? '',
    gCi: initialData?.gCi ?? '',
    sNombre: initialData?.sNombre ?? '',
    sCi: initialData?.sCi ?? '',
    elabNombre: initialData?.elabNombre ?? `${userProfile.nombre} ${userProfile.apellido}`.trim(),
    elabCi: initialData?.elabCi ?? userProfile.ci,
    aproNombre: initialData?.aproNombre ?? '',
    aproCi: initialData?.aproCi ?? '',
    items: initialData?.items ?? [{ noParte: '', unidad: 1, cantidad: 1, descripcion: '', noSerial: '' }],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalType>(null);

  const set = (field: keyof NotaData) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const tipoSalida = form.tipoSalida === 'Otros' ? `Otros: ${form.tipoSalidaOtro}` : form.tipoSalida;

    const payload = {
      ...form,
      tipoSalida,
      fecha: form.fecha || null,
    };

    try {
      const url = notaId ? `/api/notas/${notaId}` : '/api/notas';
      const method = notaId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.signatureWarnings?.length > 0) {
          const params = new URLSearchParams({ guardado: '1', sigWarnings: data.signatureWarnings.join('||') });
          window.location.href = `/notas?${params}`;
        } else {
          window.location.href = '/notas?guardado=1';
        }
      } else {
        setError(data.error || 'Error al guardar');
      }
    } catch {
      setError('Error de conexión');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header section */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">Cabecera</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SearchableDropdown
            label="Departamento"
            name="departamento"
            value={form.departamento}
            onChange={(val) => set('departamento')(val)}
            fetchUrl="/api/departamentos"
            mapOptions={mapDepartments}
            placeholder="Buscar departamento..."
            onCreateNew={isAdmin ? () => setModal('department') : undefined}
            createLabel="Crear departamento"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Fecha</label>
            <input
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={(e) => set('fecha')(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-pa-orange focus:ring-1 focus:ring-pa-orange/30 focus:outline-none"
            />
          </div>
          <ClearableInput label="Empresa" name="empresa" value={form.empresa} onChange={set('empresa')} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <ClearableInput label="Base" name="base" value={form.base} onChange={set('base')} />
          <ClearableInput label="Pozo" name="pozo" value={form.pozo} onChange={set('pozo')} placeholder="Pozo" />
          <ClearableInput label="Taladro / Gabarra" name="taladro" value={form.taladro} onChange={set('taladro')} placeholder="Taladro Gabarra" />
        </div>

        {/* Tipo de salida */}
        <div className="mt-4">
          <label className="mb-2 block text-xs font-medium text-gray-600">Tipo de Salida</label>
          <div className="flex flex-wrap gap-4">
            {TIPO_SALIDA_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="tipoSalida"
                  value={opt}
                  checked={form.tipoSalida === opt}
                  onChange={(e) => set('tipoSalida')(e.target.value)}
                  required
                  className="accent-pa-orange"
                />
                {opt}
              </label>
            ))}
          </div>
          {form.tipoSalida === 'Otros' && (
            <div className="mt-2 max-w-xs">
              <ClearableInput label="Especificar" name="tipoSalidaOtro" value={form.tipoSalidaOtro} onChange={set('tipoSalidaOtro')} required />
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <SearchableDropdown
            label="Solicitado por"
            name="solicitante"
            value={form.solicitante}
            onChange={(val) => set('solicitante')(val)}
            fetchUrl="/api/personal"
            mapOptions={mapPersonalAsName}
            placeholder="Buscar por C.I., nombre o apellido..."
            onCreateNew={isAdmin ? () => setModal('personal') : undefined}
            createLabel="Crear persona"
            required
          />
          <ClearableInput label="Razón y Destino" name="destino" value={form.destino} onChange={set('destino')} required />
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <ItemsTable items={form.items} onChange={(items) => setForm((f) => ({ ...f, items }))} />
      </div>

      {/* Vehicle */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">Vehículo</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SearchableDropdown
            label="Placa"
            name="vPlaca"
            value={form.vPlaca}
            onChange={(val, data) => {
              setForm((f) => ({
                ...f,
                vPlaca: val,
                vMarca: (data?.marca as string) ?? f.vMarca,
                vModelo: (data?.modelo as string) ?? f.vModelo,
              }));
            }}
            fetchUrl="/api/vehiculos"
            mapOptions={mapVehicles}
            placeholder="Buscar placa..."
            onCreateNew={isAdmin ? () => setModal('vehicle') : undefined}
            createLabel="Crear vehículo"
          />
          <ClearableInput label="Marca" name="vMarca" value={form.vMarca} onChange={set('vMarca')} />
          <ClearableInput label="Modelo" name="vModelo" value={form.vModelo} onChange={set('vModelo')} />
        </div>
      </div>

      {/* Signatures */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">Firmas</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
          {/* Conductor */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500">Conductor</p>
            <SearchableDropdown
              label="C.I."
              name="cCi"
              value={form.cCi}
              onChange={(val, data) => {
                setForm((f) => ({ ...f, cCi: val, cNombre: (data?.nombre as string) ?? f.cNombre }));
              }}
              fetchUrl="/api/personal"
              mapOptions={mapPersonal}
              placeholder="Buscar C.I..."
              onCreateNew={isAdmin ? () => setModal('personal') : undefined}
              createLabel="Crear persona"
            />
            <ClearableInput label="Nombre" name="cNombre" value={form.cNombre} onChange={set('cNombre')} />
          </div>

          {/* Gerente General */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500">Gerente General</p>
            <SearchableDropdown
              label="C.I."
              name="gCi"
              value={form.gCi}
              onChange={(val, data) => {
                setForm((f) => ({ ...f, gCi: val, gNombre: (data?.nombre as string) ?? f.gNombre }));
              }}
              fetchUrl="/api/personal"
              mapOptions={mapPersonal}
              placeholder="Buscar C.I..."
              onCreateNew={isAdmin ? () => setModal('personal') : undefined}
              createLabel="Crear persona"
            />
            <ClearableInput label="Nombre" name="gNombre" value={form.gNombre} onChange={set('gNombre')} />
          </div>

          {/* Seguridad Física */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500">Seguridad Física</p>
            <SearchableDropdown
              label="C.I."
              name="sCi"
              value={form.sCi}
              onChange={(val, data) => {
                setForm((f) => ({ ...f, sCi: val, sNombre: (data?.nombre as string) ?? f.sNombre }));
              }}
              fetchUrl="/api/personal"
              mapOptions={mapPersonal}
              placeholder="Buscar C.I..."
              onCreateNew={isAdmin ? () => setModal('personal') : undefined}
              createLabel="Crear persona"
            />
            <ClearableInput label="Nombre" name="sNombre" value={form.sNombre} onChange={set('sNombre')} />
          </div>

          {/* Elaborado por */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500">Elaborado por</p>
            <SearchableDropdown
              label="C.I."
              name="elabCi"
              value={form.elabCi}
              onChange={(val, data) => {
                setForm((f) => ({ ...f, elabCi: val, elabNombre: (data?.nombre as string) ?? f.elabNombre }));
              }}
              fetchUrl="/api/personal"
              mapOptions={mapPersonal}
              placeholder="Buscar C.I..."
              onCreateNew={isAdmin ? () => setModal('personal') : undefined}
              createLabel="Crear persona"
            />
            <ClearableInput label="Nombre" name="elabNombre" value={form.elabNombre} onChange={set('elabNombre')} />
          </div>

          {/* Aprobado por */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500">Aprobado por</p>
            <SearchableDropdown
              label="C.I."
              name="aproCi"
              value={form.aproCi}
              onChange={(val, data) => {
                setForm((f) => ({ ...f, aproCi: val, aproNombre: (data?.nombre as string) ?? f.aproNombre }));
              }}
              fetchUrl="/api/personal"
              mapOptions={mapPersonal}
              placeholder="Buscar C.I..."
              onCreateNew={isAdmin ? () => setModal('personal') : undefined}
              createLabel="Crear persona"
            />
            <ClearableInput label="Nombre" name="aproNombre" value={form.aproNombre} onChange={set('aproNombre')} />
          </div>
        </div>
      </div>

      {/* Error + Submit */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-pa-orange px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-pa-orange/90 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : notaId ? 'Actualizar Nota' : 'Guardar Nota'}
        </button>
        <a
          href="/notas"
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
        >
          Cancelar
        </a>
      </div>

      {modal === 'department' && (
        <InlineCreateModal
          title="Crear Departamento"
          fields={[{ key: 'name', label: 'Nombre', required: true }]}
          apiUrl="/api/departamentos"
          onCreated={(data) => {
            set('departamento')(data.name || '');
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'vehicle' && (
        <InlineCreateModal
          title="Crear Vehículo"
          fields={[
            { key: 'placa', label: 'Placa', required: true },
            { key: 'marca', label: 'Marca', required: true },
            { key: 'modelo', label: 'Modelo', required: true },
          ]}
          apiUrl="/api/vehiculos"
          onCreated={(data) => {
            setForm((f) => ({ ...f, vPlaca: data.placa || '', vMarca: data.marca || '', vModelo: data.modelo || '' }));
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'personal' && (
        <InlineCreateModal
          title="Crear Persona"
          fields={[
            { key: 'ci', label: 'C.I.', required: true },
            { key: 'nombre', label: 'Nombre', required: true },
            { key: 'apellido', label: 'Apellido', required: true },
            { key: 'cargo', label: 'Cargo' },
          ]}
          apiUrl="/api/personal"
          onCreated={() => {
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </form>
  );
}
