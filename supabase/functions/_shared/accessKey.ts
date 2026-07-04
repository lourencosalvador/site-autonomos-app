// Alfabeto sem caracteres ambíguos (0/O, 1/I/L) — mais fácil de ditar/ler por SMS.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Gera uma chave de acesso aleatória e legível (default 8 chars). */
export function generateAccessKey(len = 8): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/**
 * Normaliza um telefone para E.164 (formato que o Twilio/Supabase exigem).
 * Assume Angola (+244) quando não vem indicativo internacional.
 */
export function normalizePhone(raw: string): string {
  let p = (raw || '').replace(/[^\d+]/g, '');
  if (p.startsWith('+')) return p;
  p = p.replace(/^0+/, '');
  return '+244' + p;
}
