import { describe, it, expect } from 'vitest';
import { formatDate, formatNotaNumero } from '../../src/lib/format';

describe('formatDate', () => {
  it('converts ISO date to dd-mm-yyyy', () => {
    expect(formatDate('2026-02-18')).toBe('18-02-2026');
  });

  it('handles datetime strings (takes date part)', () => {
    expect(formatDate('2026-02-18T10:30:00')).toBe('18-02-2026');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('reverses dash-separated parts (treats any dash-string as date)', () => {
    // 'not-a-date' splits into [not, a, date] and reverses to 'date-a-not'
    expect(formatDate('not-a-date')).toBe('date-a-not');
  });
});

describe('formatNotaNumero', () => {
  it('pads to 4 digits with default prefix', () => {
    expect(formatNotaNumero(1)).toBe('NS-0001');
    expect(formatNotaNumero(42)).toBe('NS-0042');
    expect(formatNotaNumero(9999)).toBe('NS-9999');
  });

  it('handles 5+ digit numbers', () => {
    expect(formatNotaNumero(10000)).toBe('NS-10000');
  });

  it('uses custom prefix', () => {
    expect(formatNotaNumero(1, 'GE-M')).toBe('GE-M-0001');
  });
});
