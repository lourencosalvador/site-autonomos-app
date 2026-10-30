export const PHONE_EMAIL_DOMAIN = 'telefone.autonomous.ao';

export function phoneDigits(value: string | null | undefined): string {
  let d = (value ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('244')) d = d.slice(3);
  return d;
}

export function isValidAoPhone(value: string | null | undefined): boolean {
  return /^9\d{8}$/.test(phoneDigits(value));
}

export function formatAoPhone(value: string | null | undefined): string | null {
  const d = phoneDigits(value);
  if (!/^9\d{8}$/.test(d)) return null;
  return `+244 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function phoneEmail(value: string): string {
  return `244${phoneDigits(value)}@${PHONE_EMAIL_DOMAIN}`;
}

export function isPhoneEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}

export function formatIban(value: string | null | undefined): string {
  const d = (value ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  return d.replace(/(.{4})/g, '$1 ').trim();
}

export function isValidIban(value: string | null | undefined): boolean {
  let d = (value ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (d.startsWith('AO06')) d = d.slice(4);
  return /^\d{21}$/.test(d);
}
