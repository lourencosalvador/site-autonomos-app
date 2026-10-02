import type { SiteEvent, SiteRequest, Application } from './types';

export const PAGE_LABELS: Record<string, string> = {
  '/': 'Início',
  '/services': 'Serviços',
  '/solicitar-servico': 'Solicitar serviço',
  '/ser-profissional': 'Ser profissional',
  '/sobre': 'Sobre',
  '/contato': 'Contacto',
};

export const pageLabel = (path?: string | null) => (path ? PAGE_LABELS[path] ?? path : '—');

export const REQUEST_STATUS: Record<SiteRequest['status'], { label: string; tone: 'brand' | 'warning' | 'neutral' | 'success' | 'danger' }> = {
  novo: { label: 'Novo', tone: 'brand' },
  em_contacto: { label: 'Em contacto', tone: 'warning' },
  agendado: { label: 'Agendado', tone: 'neutral' },
  concluido: { label: 'Concluído', tone: 'success' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
};

export const APPLICATION_STATUS: Record<Application['status'], { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  approved: { label: 'Aprovada', tone: 'success' },
  rejected: { label: 'Rejeitada', tone: 'danger' },
};

export const EVENT_TYPES: Record<SiteEvent['type'], string> = {
  page_view: 'Visita',
  search: 'Pesquisa',
  service_click: 'Clique em serviço',
  request_submitted: 'Pedido enviado',
  application_submitted: 'Candidatura enviada',
  contact_click: 'Contacto',
};

export const ROLE_LABELS = { client: 'Cliente', professional: 'Profissional' } as const;

export const APP_REQUEST_STATUS: Record<string, string> = {
  pending: 'Pendente',
  accepted: 'Aceite',
  completed: 'Concluído',
  rejected: 'Rejeitado',
  cancelled: 'Cancelado',
};

const ACTIONS: Record<string, string> = {
  login: 'entrou no painel',
  'site_request.status': 'alterou o estado de um pedido',
  'site_request.delete': 'apagou um pedido',
  'application.status': 'alterou o estado de uma candidatura',
  'application.delete': 'apagou uma candidatura',
  'user.update': 'editou um utilizador',
  'user.suspend': 'suspendeu um utilizador',
  'user.unsuspend': 'reativou um utilizador',
  'user.sessions_revoked': 'terminou as sessões de um utilizador',
  'user.delete': 'removeu um utilizador',
  'service.create': 'criou um serviço',
  'service.update': 'editou um serviço',
  'service.delete': 'removeu um serviço',
  'service.reorder': 'reordenou os serviços',
  'admin.create': 'adicionou um administrador',
  'admin.reset_key': 'gerou uma nova chave de acesso',
  'admin.enable': 'reativou um administrador',
  'admin.disable': 'desativou um administrador',
  'admin.end_other_sessions': 'terminou as outras sessões',
};

export const actionLabel = (action: string) => ACTIONS[action] ?? action;

/** Detalhe legível de uma entrada de auditoria. */
export function auditDetail(details: Record<string, unknown>): string | null {
  const d = details ?? {};
  if (typeof d.title === 'string') return d.title;
  if (typeof d.name === 'string') return d.name;
  if (typeof d.nome === 'string') return d.nome;
  if (typeof d.status === 'string') {
    const s = d.status as string;
    return (REQUEST_STATUS as Record<string, { label: string }>)[s]?.label
      ?? (APPLICATION_STATUS as Record<string, { label: string }>)[s]?.label
      ?? s;
  }
  if ('days' in d) return d.days ? `${d.days} dias` : 'Indefinidamente';
  if (typeof d.ip === 'string') return `IP ${d.ip}`;
  return null;
}
