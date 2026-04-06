interface NotaItem {
  noParte: string;
  unidad: number;
  cantidad: number;
  descripcion: string;
  noSerial: string;
}

interface Props {
  items: NotaItem[];
  onChange: (items: NotaItem[]) => void;
}

const emptyItem = (): NotaItem => ({
  noParte: '',
  unidad: 1,
  cantidad: 1,
  descripcion: '',
  noSerial: '',
});

export default function ItemsTable({ items, onChange }: Props) {
  const updateItem = (index: number, field: keyof NotaItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addItem = () => onChange([...items, emptyItem()]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
        Items / Materiales
      </label>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pa-dark text-left text-xs text-white">
              <th className="px-3 py-2 w-12">Item</th>
              <th className="px-3 py-2">N° de Parte</th>
              <th className="px-3 py-2 w-20">Unidad</th>
              <th className="px-3 py-2 w-20">Cantidad</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">N° de Serial</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-1 text-center text-gray-400">{i + 1}</td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={item.noParte}
                    onChange={(e) => updateItem(i, 'noParte', e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-pa-orange focus:outline-none"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min={1}
                    value={item.unidad}
                    onChange={(e) => updateItem(i, 'unidad', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-pa-orange focus:outline-none"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(e) => updateItem(i, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-pa-orange focus:outline-none"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={item.descripcion}
                    onChange={(e) => updateItem(i, 'descripcion', e.target.value)}
                    required
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-pa-orange focus:outline-none"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={item.noSerial}
                    onChange={(e) => updateItem(i, 'noSerial', e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-pa-orange focus:outline-none"
                  />
                </td>
                <td className="px-1 py-1 text-center">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="text-red-400 hover:text-red-600"
                    >
                      &times;
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-2 rounded-md border border-dashed border-gray-300 px-4 py-1.5 text-sm text-gray-500 hover:border-pa-orange hover:text-pa-orange"
      >
        + Agregar ítem
      </button>
    </div>
  );
}
