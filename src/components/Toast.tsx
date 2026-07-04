import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastInput {
  type?: ToastType;
  title: string;
  message?: string;
  /** ms antes de fechar automaticamente (default 4800). */
  duration?: number;
}

interface ToastApi {
  toast: (t: ToastInput) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast tem de ser usado dentro de <ToastProvider>');
  return ctx;
}

const CONFIG: Record<ToastType, { Icon: typeof Info; chip: string; bar: string }> = {
  success: { Icon: CheckCircle2, chip: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
  error: { Icon: AlertTriangle, chip: 'bg-red-50 text-red-500', bar: 'bg-red-500' },
  info: { Icon: Info, chip: 'bg-brand-cyan/12 text-brand-dark', bar: 'bg-brand-cyan' },
};

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const timers = useRef<Map<number, number>>(new Map());

  const remove = useCallback((id: number) => {
    setLeaving((s) => new Set(s).add(id));
    window.setTimeout(() => {
      setItems((list) => list.filter((i) => i.id !== id));
      setLeaving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, 240);
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = ++seq;
      setItems((list) => [...list, { id, type: input.type ?? 'info', title: input.title, message: input.message }]);
      const t = window.setTimeout(() => remove(id), input.duration ?? 4800);
      timers.current.set(id, t);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast: push,
      success: (title, message) => push({ type: 'success', title, message }),
      error: (title, message) => push({ type: 'error', title, message }),
      info: (title, message) => push({ type: 'info', title, message }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-center gap-3 sm:inset-x-auto sm:right-5 sm:top-5 sm:items-end">
        {items.map((item) => {
          const { Icon, chip, bar } = CONFIG[item.type];
          const isLeaving = leaving.has(item.id);
          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-cloud-200 bg-white p-4 shadow-card ring-1 ring-black/[0.03] transition-all duration-300 ease-out sm:w-80 ${
                isLeaving ? 'translate-x-0 scale-95 opacity-0 sm:translate-x-4' : 'animate-fadeRight'
              }`}
            >
              <span className={`h-full w-1 shrink-0 self-stretch rounded-full ${bar}`} />
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${chip}`}>
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-bold text-ink-900">{item.title}</p>
                {item.message && <p className="mt-0.5 text-sm leading-snug text-ink-500">{item.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label="Fechar"
                className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-cloud-100 hover:text-ink-700"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
