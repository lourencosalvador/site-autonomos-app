import { type ReactNode } from 'react';

export function Field({
  label,
  name,
  required,
  error,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-zinc-800">
        {label} {required && <span className="text-accent-700">*</span>}
      </label>
      {children}
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

const base =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-700/25';

export function inputCls(hasError?: boolean) {
  return `${base} ${hasError ? 'border-red-400' : 'border-zinc-300 focus:border-accent-700'}`;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const { hasError, className = '', ...rest } = props;
  return <input {...rest} className={`${inputCls(hasError)} ${className}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }) {
  const { hasError, className = '', ...rest } = props;
  return <textarea {...rest} className={`${inputCls(hasError)} ${className} min-h-[120px] resize-y`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }) {
  const { hasError, className = '', children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`${inputCls(hasError)} ${className} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%2371717a%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10`}
    >
      {children}
    </select>
  );
}
