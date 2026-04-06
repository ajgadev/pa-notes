/** Format ISO date string (YYYY-MM-DD or datetime) to dd-mm-yyyy for display */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const date = isoDate.slice(0, 10); // take YYYY-MM-DD part
  const [y, m, d] = date.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}-${m}-${y}`;
}

/** Format note number with prefix, e.g. NS-0001 */
export function formatNotaNumero(numero: number, prefix = 'NS'): string {
  return `${prefix}-${String(numero).padStart(4, '0')}`;
}
