import { useState, useEffect, useMemo } from 'react';

interface PozoStats {
  pozo: string;
  total: number;
  vigentes: number;
  nulas: number;
  items: number;
}

interface DateCount {
  date: string;
  count: number;
}

interface Stats {
  totals: { notas: number; vigentes: number; nulas: number };
  byPozo: PozoStats[];
  byDate: DateCount[];
}

function getDefaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

const BAR_COLORS = [
  '#FF6101', '#2563EB', '#16A34A', '#DC2626', '#9333EA',
  '#D97706', '#0891B2', '#BE185D', '#4F46E5', '#059669',
];

export default function DashboardCharts() {
  const [range, setRange] = useState(getDefaultRange);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    const res = await fetch(`/api/dashboard/stats?from=${range.from}&to=${range.to}`);
    const data = await res.json();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, [range.from, range.to]);

  if (loading || !stats) {
    return <div className="py-8 text-center text-gray-400">Cargando estadísticas...</div>;
  }

  const maxPozo = Math.max(...stats.byPozo.map(p => p.total), 1);
  const maxDate = Math.max(...stats.byDate.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Date range picker */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <span className="text-sm font-medium text-gray-600">Rango de fechas:</span>
        <input
          type="date"
          value={range.from}
          onChange={(e) => setRange(r => ({ ...r, from: e.target.value }))}
          className="rounded-md border px-3 py-1.5 text-sm focus:border-pa-orange focus:outline-none"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          value={range.to}
          onChange={(e) => setRange(r => ({ ...r, to: e.target.value }))}
          className="rounded-md border px-3 py-1.5 text-sm focus:border-pa-orange focus:outline-none"
        />
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setRange(getDefaultRange())}
            className="rounded border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Este mes
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const from = new Date(now.getFullYear(), 0, 1);
              setRange({ from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) });
            }}
            className="rounded border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Este año
          </button>
          <button
            onClick={() => setRange({ from: '', to: '' })}
            className="rounded border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Todo
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Notas en rango</p>
          <p className="mt-1 text-3xl font-bold text-pa-dark">{stats.totals.notas}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Vigentes</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{stats.totals.vigentes}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Nulas</p>
          <p className="mt-1 text-3xl font-bold text-red-500">{stats.totals.nulas}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar chart: Notas por Pozo */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">Notas por Pozo</h2>
          {stats.byPozo.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Sin datos en este rango</p>
          ) : (
            <div className="space-y-2">
              {stats.byPozo.map((p, i) => (
                <div key={p.pozo} className="flex items-center gap-3">
                  <span className="w-28 truncate text-right text-xs font-medium text-gray-600" title={p.pozo}>
                    {p.pozo}
                  </span>
                  <div className="flex-1">
                    <div
                      className="h-6 rounded-r"
                      style={{
                        width: `${Math.max((p.total / maxPozo) * 100, 2)}%`,
                        backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-bold text-gray-700">{p.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Line chart: Notas por día */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">Notas por Día</h2>
          {stats.byDate.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Sin datos en este rango</p>
          ) : (
            <LineChart data={stats.byDate} max={maxDate} />
          )}
        </div>
      </div>

      {/* Summary table by Pozo */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-pa-orange">Resumen por Pozo</h2>
        {stats.byPozo.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Sin datos en este rango</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500">
                  <th className="px-4 py-2">Pozo</th>
                  <th className="px-4 py-2 text-right">Total Notas</th>
                  <th className="px-4 py-2 text-right">Vigentes</th>
                  <th className="px-4 py-2 text-right">Nulas</th>
                  <th className="px-4 py-2 text-right">Total Ítems</th>
                </tr>
              </thead>
              <tbody>
                {stats.byPozo.map((p, i) => (
                  <tr key={p.pozo} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 font-medium">{p.pozo}</td>
                    <td className="px-4 py-2 text-right font-bold">{p.total}</td>
                    <td className="px-4 py-2 text-right text-green-600">{p.vigentes}</td>
                    <td className="px-4 py-2 text-right text-red-500">{p.nulas}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{p.items}</td>
                  </tr>
                ))}
                <tr className="border-t bg-gray-100 font-bold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right">{stats.byPozo.reduce((s, p) => s + p.total, 0)}</td>
                  <td className="px-4 py-2 text-right text-green-600">{stats.byPozo.reduce((s, p) => s + p.vigentes, 0)}</td>
                  <td className="px-4 py-2 text-right text-red-500">{stats.byPozo.reduce((s, p) => s + p.nulas, 0)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{stats.byPozo.reduce((s, p) => s + p.items, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LineChart({ data, max }: { data: DateCount[]; max: number }) {
  const W = 500;
  const H = 160;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = data.map((d, i) => ({
    x: padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    y: padT + chartH - (d.count / max) * chartH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;

  // Y-axis labels
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => Math.round((max / ySteps) * i));

  // X-axis: show max ~8 labels
  const xStep = Math.max(1, Math.floor(data.length / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {yLabels.map((val) => {
        const y = padT + chartH - (val / max) * chartH;
        return (
          <g key={val}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#E5E7EB" strokeWidth="0.5" />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="8" fill="#9CA3AF">{val}</text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill="#FF6101" fillOpacity="0.1" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#FF6101" strokeWidth="2" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#FF6101" />
          {/* Tooltip-like label on hover area */}
          <title>{`${formatDateLabel(p.date)}: ${p.count} nota${p.count !== 1 ? 's' : ''}`}</title>
        </g>
      ))}

      {/* X-axis labels */}
      {points.filter((_, i) => i % xStep === 0 || i === points.length - 1).map((p) => (
        <text key={p.date} x={p.x} y={H - 6} textAnchor="middle" fontSize="7" fill="#9CA3AF">
          {formatDateLabel(p.date)}
        </text>
      ))}
    </svg>
  );
}
