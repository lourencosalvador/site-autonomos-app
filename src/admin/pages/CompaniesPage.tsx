import { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '../ui/card';
import { Button } from '../ui/button';
import { Input, Label } from '../ui/input';
import { Switch } from '../ui/misc';
import { EmptyState, ErrorBanner, Table, TBody, TD, TH, THead, TR } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import { useAction } from '../lib/useAction';
import { formatIban } from '../../lib/phone';
import { type PaymentInfo } from '../../lib/settings';
import { supabase } from '../../lib/supabase';

type Company = { id: string; name: string; active: boolean; created_at: string; professionals: number };

export function CompaniesPage() {
  return (
    <>
      <PageHeader title="Empresas e pagamentos" description="Empresas parceiras que os profissionais podem escolher no registo, taxas da plataforma e dados para transferência." />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <CompaniesCard />
        <PaymentSettingsCard />
      </div>
    </>
  );
}

function CompaniesCard() {
  const q = useAdminQuery(() => rpc<Company[]>('admin_list_companies'), []);
  const run = useAction();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Company | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = q.data ?? [];

  const save = async (id: string | null, n: string, active: boolean, msg: string) => {
    setBusy(true);
    try { await run(() => rpc('admin_save_company', { p_id: id, p_name: n.trim(), p_active: active }), msg); q.reload(); setName(''); setEditing(null); } catch {} finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="size-4 text-zinc-400" /> Empresas parceiras</CardTitle>
        <CardDescription>Só as empresas ativas aparecem no registo dos profissionais.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) void save(null, name, true, 'Empresa adicionada.'); }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da empresa" />
          <Button type="submit" disabled={busy || name.trim().length < 2}><Plus /> Adicionar</Button>
        </form>
        {q.error && <ErrorBanner message={q.error} onRetry={q.reload} />}
      </CardContent>
      {q.loading && !q.data ? (
        <div className="space-y-2 p-4"><Skeleton className="h-9" /><Skeleton className="h-9" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Building2} title="Sem empresas parceiras" description="Adicione as empresas com quem a AUTONOMOUS tem parceria." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Empresa</TH>
              <TH>Profissionais</TH>
              <TH>Ativa</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((c) => (
              <TR key={c.id}>
                <TD>
                  {editing?.id === c.id ? (
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void save(c.id, editing.name, c.active, 'Empresa atualizada.'); }}>
                      <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
                      <Button type="submit" size="sm" disabled={busy}>Guardar</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                    </form>
                  ) : <span className="font-medium text-zinc-900">{c.name}</span>}
                </TD>
                <TD className="tabular-nums">{c.professionals}</TD>
                <TD>
                  <Switch checked={c.active} disabled={busy} onCheckedChange={(v) => void save(c.id, c.name, v, v ? 'Empresa ativada.' : 'Empresa desativada.')} />
                </TD>
                <TD className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon-sm" variant="ghost" aria-label="Editar" onClick={() => setEditing(c)}><Pencil /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Apagar" disabled={busy || c.professionals > 0}
                      title={c.professionals > 0 ? 'Tem profissionais associados: desative em vez de apagar' : 'Apagar'}
                      onClick={async () => { setBusy(true); try { await run(() => rpc('admin_delete_company', { p_id: c.id }), 'Empresa apagada.'); q.reload(); } catch {} finally { setBusy(false); } }}>
                      <Trash2 className="text-red-500" />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

function PaymentSettingsCard() {
  const run = useAction();
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [form, setForm] = useState({ client: '10', provider: '10', bank: '', iban: '', holder: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.rpc('payment_info').then(({ data }) => {
      const d = data as PaymentInfo | null;
      if (!d) return;
      setInfo(d);
      setForm({
        client: String(Math.round(Number(d.client_fee_rate) * 1000) / 10),
        provider: String(Math.round(Number(d.provider_fee_rate) * 1000) / 10),
        bank: d.bank_name ?? '', iban: d.iban ? formatIban(d.iban) : '', holder: d.account_holder ?? '',
      });
    });
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      const d = await run(() => rpc<PaymentInfo>('admin_update_app_settings', {
        p_client_fee_rate: Number(form.client.replace(',', '.')) / 100,
        p_provider_fee_rate: Number(form.provider.replace(',', '.')) / 100,
        p_bank_name: form.bank || null, p_iban: form.iban, p_account_holder: form.holder,
      }), 'Configuração guardada. Aplica-se aos próximos orçamentos aceites.');
      setInfo(d);
    } catch {} finally { setBusy(false); }
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings2 className="size-4 text-zinc-400" /> Taxas e dados de pagamento</CardTitle>
        <CardDescription>Os clientes transferem para esta conta. As taxas ficam registadas em cada pedido quando o orçamento é aceite.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!info && <Skeleton className="h-40" />}
        {info && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fee-c">Taxa do cliente (%)</Label>
                <Input id="fee-c" inputMode="decimal" value={form.client} onChange={(e) => set('client', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fee-p">Comissão do profissional (%)</Label>
                <Input id="fee-p" inputMode="decimal" value={form.provider} onChange={(e) => set('provider', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iban">IBAN da AUTONOMOUS</Label>
              <Input id="iban" value={form.iban} onChange={(e) => set('iban', e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holder">Titular</Label>
              <Input id="holder" value={form.holder} onChange={(e) => set('holder', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bank">Banco (opcional)</Label>
              <Input id="bank" value={form.bank} onChange={(e) => set('bank', e.target.value)} placeholder="Ex.: BAI" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Badge tone="outline">Atual: cliente {Math.round(Number(info.client_fee_rate) * 1000) / 10}% · profissional {Math.round(Number(info.provider_fee_rate) * 1000) / 10}%</Badge>
              <Button onClick={save} disabled={busy}>Guardar</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
