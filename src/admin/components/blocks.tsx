import { useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';
import { Card, Skeleton } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn, delta, formatNumber, initials } from '../lib/utils';

/* ---------------- KPI ---------------- */
export function KpiCard({
  label, value, previous, icon: Icon, footnote, loading,
}: {
  label: string;
  value: number;
  previous?: number;
  icon: React.ComponentType<{ className?: string }>;
  footnote?: ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium leading-snug text-zinc-500">{label}</p>
        <Icon className="size-4 shrink-0 text-zinc-400" />
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-36" />
        </>
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-zinc-950 tabular-nums sm:text-[28px]">{formatNumber(value)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {previous !== undefined && <Delta current={value} previous={previous} />}
            {footnote && <span className="text-zinc-500">{footnote}</span>}
          </div>
        </>
      )}
    </Card>
  );
}

export function Delta({ current, previous }: { current: number; previous: number }) {
  const d = delta(current, previous);
  if (d === null) return <span className="font-medium text-zinc-500">Novo</span>;
  if (Math.abs(d) < 0.5) return <span className="font-medium text-zinc-500">Sem variação</span>;
  const up = d > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-medium tabular-nums', up ? 'text-emerald-600' : 'text-red-600')}>
      {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {up ? '+' : ''}
      {d.toLocaleString('pt-PT', { maximumFractionDigits: d > -10 && d < 10 ? 1 : 0 })}%
    </span>
  );
}

/* ---------------- Lista com barras ---------------- */
export function BarList({
  items, empty = 'Ainda sem dados neste período.', loading,
}: {
  items: { label: string; value: number; hint?: string }[];
  empty?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[80, 64, 52, 40].map((w) => <Skeleton key={w} className="h-8" style={{ width: `${w}%` }} />)}
      </div>
    );
  }
  if (items.length === 0) return <p className="py-6 text-center text-[13px] text-zinc-400">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="relative flex h-8 items-center justify-between gap-3 px-2.5 text-[13px]" title={item.hint}>
          <div className="absolute inset-y-0 left-0 rounded-md bg-brand-cyan/[0.13]" style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }} />
          <span className="relative truncate text-zinc-800">{item.label}</span>
          <span className="relative font-medium text-zinc-950 tabular-nums">{formatNumber(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Avatar ---------------- */
export function Avatar({ name, src, className }: { name?: string | null; src?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600', className)}>
      {src && !failed ? <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} /> : initials(name)}
    </div>
  );
}

/* ---------------- Confirmação ---------------- */
export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, destructive, requireText, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Obriga a escrever este texto para confirmar (ações irreversíveis). */
  requireText?: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState('');
  const blocked = !!requireText && typed.trim().toLowerCase() !== requireText.toLowerCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return;
        if (!o) setTyped('');
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div>{description}</div>
          </DialogDescription>
        </DialogHeader>
        {requireText && (
          <div className="space-y-1.5">
            <p className="text-[13px] text-zinc-600">
              Escreva <span className="font-semibold text-zinc-950">{requireText}</span> para confirmar.
            </p>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending || blocked}
            onClick={async () => {
              setPending(true);
              try {
                await onConfirm();
                setTyped('');
                onOpenChange(false);
              } catch {
                // quem chama já mostrou o erro; o diálogo fica aberto para tentar de novo
              } finally {
                setPending(false);
              }
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Linha "rótulo: valor" ---------------- */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 text-[13px]">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words text-zinc-900">{children}</dd>
    </div>
  );
}
