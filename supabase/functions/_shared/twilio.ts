/**
 * Envia um SMS via Twilio Messaging API.
 *
 * Requer os secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e um remetente
 * (TWILIO_MESSAGING_SERVICE_SID **ou** TWILIO_FROM). Se faltar algum, o envio é
 * SIMULADO (log) e devolve `{ sent: false }` — o provisionamento da conta não é
 * bloqueado por causa do SMS.
 */
export async function sendSms(to: string, body: string): Promise<{ sent: boolean; info: string }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM');
  const messagingService = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');

  if (!sid || !token || (!from && !messagingService)) {
    console.warn(`[twilio] credenciais/remetente em falta — SMS simulado para ${to}`);
    return { sent: false, info: 'simulated (twilio sender not configured)' };
  }

  const params = new URLSearchParams();
  params.set('To', to);
  if (messagingService) params.set('MessagingServiceSid', messagingService);
  else params.set('From', from as string);
  params.set('Body', body);

  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    console.error(`[twilio] falha ${resp.status}: ${detail}`);
    return { sent: false, info: `twilio error ${resp.status}` };
  }
  return { sent: true, info: 'sent' };
}
