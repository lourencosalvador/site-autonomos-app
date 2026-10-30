import { type ReactNode } from 'react';
import { Card } from './ui';

export function ComingSoon({ title, description, action }: { title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center sm:py-16">
      <MaintenanceArt />
      <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        Estamos a trabalhar nisto
      </span>
      <h2 className="mt-4 max-w-md text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-md text-base leading-relaxed text-ink-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

function MaintenanceArt() {
  return (
    <svg viewBox="0 0 240 180" className="h-40 w-auto sm:h-48" role="img" aria-label="Portfólio em construção">
      <ellipse cx="120" cy="160" rx="86" ry="10" fill="#EAF2F7" />
      <rect x="44" y="34" width="132" height="104" rx="14" fill="#FFFFFF" stroke="#DCE9F1" strokeWidth="3" />
      <rect x="58" y="48" width="48" height="36" rx="6" fill="#02E6FF" opacity="0.18" />
      <rect x="114" y="48" width="48" height="36" rx="6" fill="#03475E" opacity="0.10" />
      <rect x="58" y="92" width="48" height="32" rx="6" fill="#03475E" opacity="0.10" />
      <rect x="114" y="92" width="48" height="32" rx="6" fill="#02E6FF" opacity="0.18" />
      <path d="M66 78l10-12 8 9 6-6 10 9" fill="none" stroke="#03475E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <circle cx="94" cy="58" r="4" fill="#03475E" opacity="0.55" />
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 186 52;-14 186 52;0 186 52" dur="2.4s" repeatCount="indefinite" />
        <path d="M200 30a14 14 0 0 0-18.6 17.4l-26 26a5 5 0 0 0 7 7l26-26A14 14 0 0 0 206 36l-8 8-6-1-1-6 8-8a14 14 0 0 0-1-1z" fill="#03475E" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 46 136;360 46 136" dur="6s" repeatCount="indefinite" />
        <path d="M46 120l4 1 2 5 5 1 2 4-3 4 1 5-4 3v4l-4 1-3 4-4-2-5 1-3-4-4-1v-4l-3-4 3-4-1-5 4-2 2-4h5z" fill="#02E6FF" />
        <circle cx="46" cy="136" r="6" fill="#FFFFFF" />
      </g>
      <g fill="#0AC8E0">
        <path d="M176 112l2 6 6 2-6 2-2 6-2-6-6-2 6-2z">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" repeatCount="indefinite" />
        </path>
        <path d="M30 70l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="2.2s" repeatCount="indefinite" />
        </path>
      </g>
    </svg>
  );
}
