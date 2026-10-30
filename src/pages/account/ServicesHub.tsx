import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { type Broadcast, myBroadcasts, subscribeBroadcasts } from '../../lib/broadcasts';
import { isActive } from '../../lib/requestStage';
import { RequestRow } from '../../components/app/RequestRow';
import { Btn, Card, EmptyState, PageHeader, Spinner, Tabs } from '../../components/app/ui';

export function ServicesHub() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Broadcast[] | null>(null);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const load = useCallback(async () => {
    try { setRows(await myBroadcasts()); } catch { setRows((r) => r ?? []); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => subscribeBroadcasts({}, () => { void load(); }), [load]);

  if (!user) return null;
  const isPro = user.activeRole === 'professional';
  const mine = (rows ?? []).filter((r) => (isPro ? r.provider_id === user.id : r.client_id === user.id));
  const active = mine.filter(isActive);
  const history = mine.filter((r) => !isActive(r));
  const list = tab === 'active' ? active : history;

  return (
    <>
      <PageHeader
        title="Serviços"
        description={isPro ? 'Os serviços que aceitou e o seu histórico.' : 'Os seus pedidos e o histórico.'}
        actions={!isPro ? <Btn to="/conta/pedir"><Plus size={18} /> Novo pedido</Btn> : undefined}
      />

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: 'Em curso', count: active.length },
            { value: 'history', label: 'Histórico', count: history.length },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {rows === null ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={tab === 'active' ? 'Nada em curso' : 'Ainda sem histórico'}
            description={tab === 'active'
              ? (isPro ? 'Os pedidos que aceitar aparecem aqui.' : 'Quando fizer um pedido, acompanha-o aqui.')
              : 'Os serviços concluídos e cancelados ficam aqui.'}
            action={!isPro && tab === 'active' ? <Btn to="/conta/pedir"><Plus size={18} /> Novo pedido</Btn> : undefined}
          />
        ) : (
          <div key={tab} className="ui-fade divide-y divide-line">
            {list.map((r) => <RequestRow key={r.id} r={r} asProvider={isPro} />)}
          </div>
        )}
      </Card>
    </>
  );
}
