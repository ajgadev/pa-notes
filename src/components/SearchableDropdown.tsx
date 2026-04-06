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
}

export default function SearchableDropdown({ label, name, value, onChange, fetchUrl, mapOptions, placeholder, required }: Props) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value);
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
    setLoading(true);
    try {
      const res = await fetch(`${fetchUrl}?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setOptions(mapOptions(data));
    } catch {
      setOptions([]);
    }
    setLoading(false);
  };

  const handleInput = (val: string) => {
    setQuery(val);
    onChange(val);
    setOpen(true);
    fetchOptions(val);
  };

  const handleSelect = (opt: Option) => {
    setQuery(opt.label);
    onChange(opt.value, opt.data);
    setOpen(false);
  };

  const handleFocus = () => {
    setOpen(true);
    fetchOptions(query);
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
            onClick={() => { setQuery(''); onChange(''); inputRef.current?.focus(); }}
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
          {!loading && options.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>
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
