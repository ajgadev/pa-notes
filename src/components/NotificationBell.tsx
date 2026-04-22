import { useState, useEffect, useRef } from 'react';

interface Notification {
  id: number;
  type: string;
  message: string;
  notaId: number | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function fetchUnread() {
    fetch('/api/notificaciones?unread=1')
      .then((r) => r.json())
      .then((d) => setUnread(d.unread ?? 0))
      .catch(() => {});
  }

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleOpen() {
    if (!open) {
      const res = await fetch('/api/notificaciones?limit=15');
      const data = await res.json();
      setItems(data.data ?? []);
      setLoaded(true);
    }
    setOpen(!open);
  }

  async function markAllRead() {
    await fetch('/api/notificaciones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function clearRead() {
    await fetch('/api/notificaciones', { method: 'DELETE' });
    setItems((prev) => prev.filter((n) => !n.read));
  }

  async function handleClick(n: Notification) {
    if (!n.read) {
      await fetch('/api/notificaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.notaId) {
      window.location.href = `/notas/${n.notaId}`;
    }
    setOpen(false);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `hace ${diffD}d`;
  }

  const typeIcon: Record<string, string> = {
    firma_pendiente: '✍️',
    firma_recibida: '✅',
    todas_firmadas: '🎉',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded p-1.5 text-gray-300 transition hover:bg-white/10 hover:text-white"
        aria-label="Notificaciones"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-gray-900">Notificaciones</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-pa-orange hover:underline">
                  Marcar leídas
                </button>
              )}
              {items.some((n) => n.read) && (
                <button onClick={clearRead} className="text-xs text-gray-400 hover:text-red-500 hover:underline">
                  Limpiar
                </button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Sin notificaciones</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-gray-50 ${
                    !n.read ? 'bg-orange-50/50' : ''
                  }`}
                >
                  <span className="mt-0.5 text-base leading-none">{typeIcon[n.type] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{formatTime(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pa-orange" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
