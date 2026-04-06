import { useRef } from 'react';

interface Props {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

export default function ClearableInput({ label, name, value, onChange, placeholder, type = 'text', required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 pr-8 text-sm focus:border-pa-orange focus:ring-1 focus:ring-pa-orange/30 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
