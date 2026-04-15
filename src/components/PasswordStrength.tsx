interface Props {
  password: string;
  confirm?: string;
}

interface Rule {
  label: string;
  ok: boolean;
}

export function checkPasswordRules(password: string): Rule[] {
  return [
    { label: 'Al menos 8 caracteres', ok: password.length >= 8 },
    { label: 'Una letra mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Una letra minúscula', ok: /[a-z]/.test(password) },
    { label: 'Un número', ok: /[0-9]/.test(password) },
    { label: 'Un caracter especial (!@#$…)', ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return checkPasswordRules(password).every((r) => r.ok);
}

export default function PasswordStrength({ password, confirm }: Props) {
  const rules = checkPasswordRules(password);
  const showMatch = confirm !== undefined && confirm.length > 0;
  const match = password === confirm;

  return (
    <ul className="mt-2 space-y-1 text-xs">
      {rules.map((r) => (
        <li key={r.label} className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${r.ok ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className={r.ok ? 'text-green-700' : 'text-gray-500'}>{r.label}</span>
        </li>
      ))}
      {showMatch && (
        <li className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${match ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className={match ? 'text-green-700' : 'text-gray-500'}>Las contraseñas coinciden</span>
        </li>
      )}
    </ul>
  );
}
