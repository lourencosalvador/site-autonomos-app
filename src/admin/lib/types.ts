export type Page<T> = { total: number; rows: T[]; counts?: Record<string, number> };

export type Overview = {
  days: number;
  generated_at: string;
  traffic: {
    visitors: number; visitors_prev: number;
    views: number; views_prev: number;
    sessions: number; sessions_prev: number;
  };
  top_pages: { path: string; views: number; visitors: number }[];
  devices: { device: 'mobile' | 'tablet' | 'desktop'; visitors: number }[];
  referrers: { source: string; visitors: number }[];
  searches: { label: string; count: number }[];
  service_clicks: { label: string; count: number }[];
  site_requests: { period: number; prev: number; open: number; total: number };
  applications?: { period: number; prev: number; pending: number; total: number };
  users: {
    total?: number; clients?: number; professionals?: number; suspended?: number;
    new?: number; new_prev?: number; new_clients?: number; new_professionals?: number;
  };
  series: { date: string; visitors: number; views: number; clients: number; professionals: number }[];
  app_requests?: { period: number; prev: number; pending: number; accepted: number; completed: number; cancelled: number };
  reviews?: { count: number; average: number | null };
  recent: ActivityItem[];
};

export type ActivityItem = {
  kind: 'site_request' | 'application' | 'signup' | 'admin';
  at: string;
  title: string | null;
  detail: string | null;
  target?: string | null;
};

export type SiteRequest = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  endereco: string;
  categoria: string;
  servico: string;
  descricao: string;
  data_desejada: string | null;
  horario_preferencial: string | null;
  anexos: string[];
  status: 'novo' | 'em_contacto' | 'agendado' | 'concluido' | 'cancelado';
  created_at: string;
};

export type Application = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  work_area: string | null;
  specialty: string | null;
  experience_years: number | null;
  description: string | null;
  photo_url: string | null;
  id_document_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  provision_status?: string | null;
  created_at: string;
};

export type AppUser = {
  id: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  work_area?: string | null;
  role: 'client' | 'professional';
  email: string | null;
  auth_phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  suspended: boolean;
  active_sessions?: number;
};

export type UserDetail = {
  user: AppUser;
  stats: {
    requests_as_client?: number;
    requests_as_provider?: number;
    completed?: number;
    recent?: { id: string; service: string; status: string; created_at: string; as: 'client' | 'provider' }[];
    reviews?: { count: number; average: number | null };
  };
};

export type SiteService = {
  id: string;
  title: string;
  description: string;
  price: string | null;
  image_url: string;
  keywords: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SiteEvent = {
  id: number;
  type: 'page_view' | 'search' | 'service_click' | 'request_submitted' | 'application_submitted' | 'contact_click';
  path: string | null;
  label: string | null;
  visitor_id: string;
  device: string | null;
  referrer: string | null;
  created_at: string;
};

export type AuditEntry = {
  id: number;
  admin_id: string | null;
  admin_name: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type AdminAccount = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
  is_me: boolean;
  sessions: number;
};
