import { useRef, useState, type ReactNode } from 'react';
import { Eye, EyeOff, FileCheck2, Upload, type LucideIcon } from 'lucide-react';
import { phoneDigits } from '../../lib/phone';
import { usePartnerCompanies } from '../../lib/settings';
import { Select, TextInput } from '../Field';
import { cx } from './ui';

export const PROVINCES = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando', 'Cubango', 'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla',
  'Icolo e Bengo', 'Luanda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico', 'Moxico Leste', 'Namibe', 'Uíge', 'Zaire',
];

export function FormField({ label, htmlFor, required, optional, hint, error, children }: {
  label: string; htmlFor?: string; required?: boolean; optional?: boolean; hint?: ReactNode; error?: string | null; children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[15px] font-medium text-ink-900">
        {label} {required && <span className="text-ink-400">*</span>}
        {optional && <span className="font-normal text-ink-400">(opcional)</span>}
      </label>
      {children}
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : hint ? <p className="text-sm text-ink-400">{hint}</p> : null}
    </div>
  );
}

export function PhoneInput({ id, value, onChange, hasError, autoFocus }: {
  id?: string; value: string; onChange: (digits: string) => void; hasError?: boolean; autoFocus?: boolean;
}) {
  const d = phoneDigits(value).slice(0, 9);
  const shown = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ');
  return (
    <div className={cx('flex h-[50px] items-center overflow-hidden rounded-xl border bg-white transition-colors focus-within:ring-4 focus-within:ring-brand-cyan/15',
      hasError ? 'border-red-400' : 'border-line focus-within:border-brand-cyan2')}>
      <span className="flex h-full items-center border-r border-line bg-cloud-50 px-3.5 text-base font-medium text-ink-700">+244</span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={shown}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
        placeholder="9XX XXX XXX"
        className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-base text-ink-900 placeholder:text-ink-400/70 focus:outline-none"
      />
    </div>
  );
}

export function PasswordInput({ id, value, onChange, hasError, autoComplete = 'new-password', placeholder }: {
  id?: string; value: string; onChange: (v: string) => void; hasError?: boolean; autoComplete?: string; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextInput id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} hasError={hasError}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-12" />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar' : 'Mostrar'}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 hover:text-ink-700">
        {show ? <EyeOff size={19} /> : <Eye size={19} />}
      </button>
    </div>
  );
}

export function ProvinceSelect({ id, value, onChange, hasError }: { id?: string; value: string; onChange: (v: string) => void; hasError?: boolean }) {
  return (
    <Select id={id} value={value} hasError={hasError} onChange={(e) => onChange(e.target.value)}>
      <option value="">Selecione a província</option>
      {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
    </Select>
  );
}

export function CompanyPicker({ enabled, companyId, onToggle, onCompany, hasError }: {
  enabled: boolean; companyId: string; onToggle: (v: boolean) => void; onCompany: (id: string, name: string) => void; hasError?: boolean;
}) {
  const companies = usePartnerCompanies();
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-4 py-3.5 transition-colors hover:bg-cloud-50">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line accent-[#03475E]" />
        <span>
          <span className="block text-[15px] font-medium text-ink-900">Faço parte de uma empresa parceira</span>
          <span className="mt-0.5 block text-sm text-ink-500">Marque se trabalha em nome de uma empresa parceira da AUTONOMOUS.</span>
        </span>
      </label>
      {enabled && (
        <FormField label="Empresa" htmlFor="company" required error={hasError ? 'Escolha a empresa.' : null}
          hint={companies && companies.length === 0 ? 'Ainda não há empresas parceiras registadas. Fale connosco.' : undefined}>
          <Select id="company" value={companyId} hasError={hasError}
            onChange={(e) => onCompany(e.target.value, companies?.find((c) => c.id === e.target.value)?.name ?? '')}>
            <option value="">{companies === null ? 'A carregar…' : 'Selecione a empresa'}</option>
            {(companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormField>
      )}
    </div>
  );
}

export function FilePick({ label, icon: Icon = Upload, file, accept, onChange, hasError, hint }: {
  label: string; icon?: LucideIcon; file: File | null; accept: string; onChange: (f: File | null) => void; hasError?: boolean; hint?: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const preview = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
  return (
    <div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      <button type="button" onClick={() => ref.current?.click()}
        className={cx('flex w-full items-center gap-3 rounded-xl border border-dashed bg-white px-4 py-3.5 text-left transition-colors hover:bg-cloud-50',
          hasError ? 'border-red-400' : file ? 'border-brand-cyan2' : 'border-line')}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-cloud-100 text-ink-500">
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" onLoad={() => URL.revokeObjectURL(preview)} /> : file ? <FileCheck2 size={20} className="text-brand-dark" /> : <Icon size={20} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-ink-900">{file ? file.name : label}</span>
          <span className="block text-sm text-ink-400">{file ? 'Toque para trocar' : hint ?? 'Toque para escolher'}</span>
        </span>
      </button>
    </div>
  );
}
