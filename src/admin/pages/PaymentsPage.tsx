import { useState } from 'react';
import { Download, Plus, Settings2 } from 'lucide-react';
import { PageHeader } from '../components/Shell';
import { Button } from '../ui/button';
import { Segmented } from '../ui/misc';
import { rpc, useAdminQuery } from '../lib/api';
import type { MoneyCtx, PaymentMeta } from '../lib/types';
import { Summary } from './payments/Summary';
import { Transactions } from './payments/Transactions';
import { Charges } from './payments/Charges';
import { Withdrawals } from './payments/Withdrawals';
import { Balances } from './payments/Balances';
import { ExportDialog, NewChargeDialog, SettingsDialog } from './payments/Dialogs';

type Tab = 'resumo' | 'transacoes' | 'cobrancas' | 'saques' | 'prestadores';

export function PaymentsPage({ onChange }: { onChange: () => void }) {
  const [tab, setTab] = useState<Tab>('resumo');
  const [dialog, setDialog] = useState<'charge' | 'settings' | 'export' | null>(null);
  const [chargesVersion, setChargesVersion] = useState(0);
  const meta = useAdminQuery(() => rpc<PaymentMeta>('admin_payment_meta'), []);
  const ctx: MoneyCtx = { currency: 'AOA', factor: meta.data?.settings.minor_unit_factor ?? 100 };

  return (
    <>
      <PageHeader
        title="Pagamentos"
        description="Dinheiro que entra pelos clientes, escrow, receita e saques dos prestadores."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setDialog('settings')} aria-label="Configuração de pagamentos" title="Configuração">
              <Settings2 />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialog('export')}>
              <Download /> Exportar
            </Button>
            <Button size="sm" onClick={() => setDialog('charge')}>
              <Plus /> Nova cobrança
            </Button>
          </>
        }
      />

      <div className="mb-5 overflow-x-auto">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'resumo', label: 'Resumo' },
            { value: 'transacoes', label: 'Transações' },
            { value: 'cobrancas', label: 'Cobranças AppyPay' },
            { value: 'saques', label: 'Saques' },
            { value: 'prestadores', label: 'Saldos dos prestadores' },
          ]}
        />
      </div>

      {tab === 'resumo' && <Summary onOpenTab={setTab} />}
      {tab === 'transacoes' && <Transactions ctx={ctx} />}
      {tab === 'cobrancas' && <Charges ctx={ctx} version={chargesVersion} />}
      {tab === 'saques' && <Withdrawals ctx={ctx} meta={meta.data} onChanged={onChange} />}
      {tab === 'prestadores' && <Balances ctx={ctx} />}

      <NewChargeDialog
        open={dialog === 'charge'}
        ctx={ctx}
        onClose={() => setDialog(null)}
        onCreated={() => {
          setChargesVersion((v) => v + 1);
          onChange();
        }}
      />
      <SettingsDialog open={dialog === 'settings'} meta={meta.data} onClose={() => setDialog(null)} onSaved={() => void meta.reload()} />
      <ExportDialog open={dialog === 'export'} ctx={ctx} onClose={() => setDialog(null)} />
    </>
  );
}
