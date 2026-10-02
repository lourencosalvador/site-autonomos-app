import { useEffect, useState } from 'react';
import { Check, Copy, Download, Loader2, MessageCircle, Smartphone, Ticket } from 'lucide-react';
import { Button, buttonClass } from '../../ui/button';
import { FieldHint, Input, Label, Select, Textarea } from '../../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { appypayAdmin, rpc } from '../../lib/api';
import { useAction } from '../../lib/useAction';
import { formatMoney, toMajor } from '../../lib/money';
import type { Charge, MoneyCtx, PaymentMeta, PaymentSettings } from '../../lib/types';
import { cn, formatDateTime, phoneDigits } from '../../lib/utils';
import { paymentInstructions } from './Charges';

/* ================= Nova cobrança ================= */

type PublicCharge = {
  id: string; method: 'REF' | 'GPO'; status: Charge['status']; amount_minor: number; currency: string;
  reference: { entity: string; number: string; due_at: string | null } | null; message: string | null;
};

export function NewChargeDialog({ open, ctx, onClose, onCreated }: { open: boolean; ctx: MoneyCtx; onClose: () => void; onCreated: () => void }) {
  const run = useAction();
  const [method, setMethod] = useState<'REF' | 'GPO'>('REF');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<PublicCharge | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setResult(null);
      setCopied(false);
    }
  }, [open]);

  const reset = () => {
    setAmount('');
    setName('');
    setPhone('');
    setDescription('');
    setResult(null);
  };

  const value = Number(amount.replace(/\s/g, '').replace(',', '.'));
  const phoneOk = phoneDigits(phone).length >= 9;
  const valid = value >= 1 && (method === 'REF' || phoneOk);

  const submit = async () => {
    setSaving(true);
    try {
      const r = await run(() => appypayAdmin<{ charge: PublicCharge }>('create', {
        charge: { method, amount: value, name: name || null, phone: phone || null, description: description || null },
      }));
      setResult(r.charge);
      onCreated();
    } catch {
      // erro já mostrado
    } finally {
      setSaving(false);
    }
  };

  const instructions = result?.reference
    ? paymentInstructions({
        method: 'REF', reference_entity: result.reference.entity, reference_number: result.reference.number,
        reference_due_at: result.reference.due_at, amount_minor: result.amount_minor, description: description || 'Pagamento',
      }, ctx)
    : '';
  const wa = phoneDigits(phone);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) { onClose(); if (result) reset(); } }}>
      <DialogContent className="max-w-md">
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle>Nova cobrança</DialogTitle>
              <DialogDescription>Gera uma referência ou envia um pedido Multicaixa Express a um cliente, por exemplo a partir de um pedido do site.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'REF' as const, icon: Ticket, title: 'Referência', text: 'Paga no ATM, Express ou homebanking' },
                { id: 'GPO' as const, icon: Smartphone, title: 'Multicaixa Express', text: 'Aprova no telemóvel' },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setMethod(o.id)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    method === o.id ? 'border-zinc-950 ring-1 ring-zinc-950' : 'border-zinc-200 hover:border-zinc-300',
                  )}
                >
                  <o.icon className="size-4 text-zinc-700" />
                  <p className="mt-2 text-[13px] font-medium text-zinc-950">{o.title}</p>
                  <p className="text-xs text-zinc-500">{o.text}</p>
                </button>
              ))}
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (valid) void submit();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="nc-amount">Valor (Kz)</Label>
                <Input id="nc-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 15000" autoFocus />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nc-name">Nome do cliente</Label>
                  <Input id="nc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Opcional" maxLength={60} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nc-phone">Telefone{method === 'GPO' ? '' : ' (SMS)'}</Label>
                  <Input id="nc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9XX XXX XXX" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-desc">Descrição</Label>
                <Textarea id="nc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={60} placeholder="Ex: Reparação de fuga — Talatona" />
                <FieldHint>{method === 'REF' ? 'Com telefone, o cliente recebe a referência por SMS.' : 'O cliente recebe o pedido na app Multicaixa Express e tem cerca de 1 minuto para aprovar.'}</FieldHint>
              </div>
              <DialogFooter className="pt-1">
                <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button type="submit" disabled={!valid || saving}>
                  {saving && <Loader2 className="animate-spin" />}
                  {method === 'REF' ? 'Gerar referência' : 'Enviar pedido'}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{result.method === 'REF' ? 'Referência gerada' : 'Pedido enviado'}</DialogTitle>
              <DialogDescription>
                {result.method === 'REF'
                  ? 'Partilhe estes dados com o cliente. O pagamento é confirmado automaticamente.'
                  : `O cliente deve aprovar ${formatMoney(result.amount_minor, ctx)} na app Multicaixa Express do número ${phone}.`}
              </DialogDescription>
            </DialogHeader>
            {result.reference ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-xs text-zinc-500">Entidade</p><p className="mt-0.5 font-mono text-lg font-semibold">{result.reference.entity}</p></div>
                  <div className="col-span-2"><p className="text-xs text-zinc-500">Referência</p><p className="mt-0.5 font-mono text-lg font-semibold">{result.reference.number.replace(/(\d{3})(?=\d)/g, '$1 ')}</p></div>
                </div>
                <p className="mt-3 text-[13px] text-zinc-700">Valor: <span className="font-semibold">{formatMoney(result.amount_minor, ctx)}</span></p>
                {result.reference.due_at && <p className="text-xs text-zinc-500">Válida até {formatDateTime(result.reference.due_at)}</p>}
              </div>
            ) : (
              <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-600">{result.message ?? 'A aguardar aprovação do cliente.'} Acompanhe o estado em Cobranças.</p>
            )}
            <DialogFooter>
              {result.reference && (
                <>
                  <Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(instructions).catch(() => undefined); setCopied(true); }}>
                    {copied ? <><Check /> Copiado</> : <><Copy /> Copiar</>}
                  </Button>
                  {wa && (
                    <a className={buttonClass('outline')} target="_blank" rel="noopener noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(instructions)}`}>
                      <MessageCircle /> WhatsApp
                    </a>
                  )}
                </>
              )}
              <Button onClick={() => { onClose(); reset(); }}>Concluir</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ================= Configuração ================= */

export function SettingsDialog({ open, meta, onClose, onSaved }: { open: boolean; meta: PaymentMeta | null; onClose: () => void; onSaved: () => void }) {
  const run = useAction();
  const [form, setForm] = useState<PaymentSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && meta) setForm({ ...meta.settings });
  }, [open, meta]);

  const set = <K extends keyof PaymentSettings>(k: K, v: PaymentSettings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/appypay-webhook?secret=<APPYPAY_WEBHOOK_SECRET>`;

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await run(() => rpc('admin_update_payment_settings', { p_settings: form }), 'Configuração guardada.');
      onSaved();
      onClose();
    } catch {
      // erro já mostrado
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configuração de pagamentos</DialogTitle>
          <DialogDescription>Parâmetros usados para registar os pagamentos AppyPay da mesma forma que a app.</DialogDescription>
        </DialogHeader>
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="ps-factor">Valores guardados em</Label>
                <Select id="ps-factor" value={form.minor_unit_factor} onChange={(e) => set('minor_unit_factor', Number(e.target.value))}>
                  <option value={100}>Cêntimos</option>
                  <option value={1}>Kwanzas</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ps-cfee">Taxa do cliente (%)</Label>
                <Input id="ps-cfee" type="number" min={0} max={100} step={0.5} value={Math.round(form.client_fee_rate * 1000) / 10}
                  onChange={(e) => set('client_fee_rate', Number(e.target.value) / 100)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ps-pfee">Taxa do prestador (%)</Label>
                <Input id="ps-pfee" type="number" min={0} max={100} step={0.5} value={Math.round(form.provider_fee_rate * 1000) / 10}
                  onChange={(e) => set('provider_fee_rate', Number(e.target.value) / 100)} />
              </div>
            </div>
            <FieldHint>As taxas só são usadas quando o pedido não traz a decomposição já calculada pela app.</FieldHint>

            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="text-[13px] font-medium text-zinc-900">Nomes dos estados na app</p>
              <p className="mt-0.5 text-xs text-zinc-500">Têm de coincidir com os que a app e o backend usam. As sugestões vêm dos dados existentes.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <StatusInput id="ps-pay" label="Pagamento confirmado" value={form.payment_success_status} options={meta?.payment_statuses ?? []} onChange={(v) => set('payment_success_status', v)} />
                <StatusInput id="ps-req" label="Pedido pago" value={form.request_paid_status} options={meta?.payment_statuses ?? []} onChange={(v) => set('request_paid_status', v)} />
                <StatusInput id="ps-esc" label="Escrow retido" value={form.escrow_held_status} options={meta?.escrow_statuses ?? []} onChange={(v) => set('escrow_held_status', v)} />
                <StatusInput id="ps-wd" label="Saque pago" value={form.withdrawal_paid_status} options={meta?.withdrawal_statuses ?? []} onChange={(v) => set('withdrawal_paid_status', v)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>URL do webhook (configurar na AppyPay)</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button variant="outline" size="icon" aria-label="Copiar URL" onClick={() => void navigator.clipboard.writeText(webhookUrl)}>
                  <Copy />
                </Button>
              </div>
              <FieldHint>Substitua &lt;APPYPAY_WEBHOOK_SECRET&gt; pelo segredo definido nas Edge Functions.</FieldHint>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={saving || !form}>{saving && <Loader2 className="animate-spin" />} Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusInput({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} list={`${id}-list`} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      <datalist id={`${id}-list`}>{options.map((o) => <option key={o} value={o} />)}</datalist>
    </div>
  );
}

/* ================= Exportação CSV ================= */

type ExportRow = {
  id: string; paid_at: string; service: string | null; client: string | null; provider: string | null; method: string;
  reference: string | null; currency: string; amount: number; agreed_amount: number | null; request_fee: number | null;
  service_fee: number | null; urgent_bonus: number | null; provider_net: number | null; platform_net: number | null;
  escrow_status: string | null; released_at: string | null;
};

export function ExportDialog({ open, ctx, onClose }: { open: boolean; ctx: MoneyCtx; onClose: () => void }) {
  const run = useAction();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const rows = await run(() => rpc<ExportRow[]>('admin_export_payments', { p_from: from, p_to: to }));
      const num = (v: number | null) => (v == null ? '' : toMajor(v, ctx.factor).toFixed(2).replace('.', ','));
      const esc = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ['Data', 'Serviço', 'Cliente', 'Prestador', 'Método', 'Referência', 'Moeda', 'Total pago', 'Valor acordado',
        'Taxa cliente', 'Taxa prestador', 'Bónus urgência', 'Prestador recebe', 'Receita AUTONOMOUS', 'Escrow', 'Libertado em', 'ID'];
      const lines = rows.map((r) => [
        formatDateTime(r.paid_at), r.service, r.client, r.provider, r.method, r.reference, r.currency?.toUpperCase(),
        num(r.amount), num(r.agreed_amount), num(r.request_fee), num(r.service_fee), num(r.urgent_bonus),
        num(r.provider_net), num(r.platform_net), r.escrow_status, r.released_at ? formatDateTime(r.released_at) : '', r.id,
      ].map(esc).join(';'));
      // BOM + ";" para abrir direto no Excel em português
      const blob = new Blob([`\uFEFF${header.join(';')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autonomous-pagamentos-${from}-a-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      // erro já mostrado
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Exportar pagamentos</DialogTitle>
          <DialogDescription>Ficheiro CSV com todas as taxas, pronto a abrir no Excel.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="ex-from">De</Label><Input id="ex-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="ex-to">Até</Label><Input id="ex-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={() => void download()} disabled={busy || !from || !to || from > to}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />} Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
