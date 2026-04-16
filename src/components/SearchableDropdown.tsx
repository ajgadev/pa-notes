import { useState, useRef, useEffect } from 'react';

interface Option {
  label: string;
  value: string;
  data?: Record<string, unknown>;
}

interface Props {
  label: string;
  name: string;
  value: string;
  onChange: (value: string, data?: Record<string, unknown>) => void;
  fetchUrl: string;
  mapOptions: (items: any[]) => Option[];
  placeholder?: string;
  required?: boolean;
  onCreateNew?: () => void;
  createLabel?: string;
}

export default function SearchableDropdown({ label, name, value, onChange, fetchUrl, mapOptions, placeholder, required, onCreateNew, createLabel }: Props) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef(value);
  const reqIdRef = useRef(0);

  useEffect(() => {
    setQuery(value);
    queryRef.current = value;
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchOptions = async (q: string) => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const res = await fetch(`${fetchUrl}?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (reqId === reqIdRef.current) setOptions(mapOptions(data));
    } catch {
      if (reqId === reqIdRef.current) setOptions([]);
    }
    if (reqId === reqIdRef.current) setLoading(false);
  };

  const handleInput = (val: string) => {
    setQuery(val);
    queryRef.current = val;
    onChange(val);
    setOpen(true);
    fetchOptions(val);
  };

  const handleSelect = (opt: Option) => {
    setQuery(opt.value);
    queryRef.current = opt.value;
    onChange(opt.value, opt.data);
    setOpen(false);
  };

  const handleFocus = () => {
    setOpen(true);
    fetchOptions(queryRef.current);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 pr-8 text-sm focus:border-pa-orange focus:ring-1 focus:ring-pa-orange/30 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); queryRef.current = ''; onChange(''); setOpen(true); fetchOptions(''); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            &times;
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-gray-400">Buscando...</div>}
          {!loading && options.length === 0 && !onCreateNew && (
            <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>
          )}
          {!loading && options.length === 0 && onCreateNew && (
            <button
              type="button"
              onClick={() => { setOpen(false); onCreateNew(); }}
              className="w-full px-3 py-2 text-left text-xs font-medium text-pa-orange hover:bg-pa-orange/10"
            >
              + {createLabel || 'Crear nuevo'}
            </button>
          )}
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(opt)}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-pa-orange/10"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
