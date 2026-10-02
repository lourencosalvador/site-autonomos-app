import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = 'Africa/Luanda';
const numberFmt = new Intl.NumberFormat('pt-PT', { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions);
const dateFmt = new Intl.DateTimeFormat('pt-PT', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('pt-PT', {
  timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const shortDayFmt = new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', day: '2-digit', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('pt-PT', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const relativeFmt = new Intl.RelativeTimeFormat('pt', { numeric: 'auto' });

export const formatNumber = (n: number | null | undefined) => numberFmt.format(n ?? 0);

export function formatDate(value?: string | null) {
  return value ? dateFmt.format(new Date(value)).replace('.', '') : '—';
}

export function formatDateTime(value?: string | null) {
  return value ? dateTimeFmt.format(new Date(value)).replace('.', '') : '—';
}

export function formatTime(value: Date | string) {
  return timeFmt.format(typeof value === 'string' ? new Date(value) : value);
}

/** "2026-10-02" → "02 out" (datas sem hora, já no fuso de Luanda). */
export function formatDay(isoDate: string) {
  return shortDayFmt.format(new Date(`${isoDate}T00:00:00Z`)).replace('.', '');
}

export function timeAgo(value?: string | null) {
  if (!value) return '—';
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'agora mesmo';
  if (abs < 3600) return relativeFmt.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relativeFmt.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return relativeFmt.format(Math.round(seconds / 86400), 'day');
  return formatDate(value);
}

/** Variação percentual entre períodos; null quando não há base de comparação. */
export function delta(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}

export function initials(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Número para links wa.me / tel: (só dígitos, com indicativo de Angola por defeito). */
export function phoneDigits(phone?: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 9 ? `244${digits}` : digits;
}
