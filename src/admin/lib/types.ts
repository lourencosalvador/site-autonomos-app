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

/* ---------------- Pagamentos ---------------- */

export type MoneyCtx = { currency: string; factor: number };

export type PaymentsOverview = MoneyCtx & {
  days: number;
  generated_at: string;
  totals: {
    gross: number; gross_prev: number; platform: number; platform_prev: number; provider: number;
    request_fees: number; service_fees: number; urgent: number; count: number; count_prev: number;
    all_gross: number; all_platform: number; all_count: number;
    escrow_held: number; escrow_held_count: number; released: number; released_period: number;
  };
  withdrawals: {
    paid?: number; paid_period?: number; pending?: number; pending_count?: number;
    by_status?: { status: string; count: number; amount: number }[];
    by_method?: { method: string; count: number; amount: number }[];
  };
  provider_available: number;
  series: { date: string; gross: number; platform: number; count: number }[];
  methods: { method: string; count: number; amount: number }[];
  charges: {
    pending: number; pending_amount: number; success: number; failed: number; expired: number;
    refunded: number; created: number; ref: number; gpo: number;
  };
  top_providers: { id: string; name: string; amount: number; count: number }[];
  top_services: { label: string; amount: number; count: number }[];
  other_currencies: { currency: string; amount: number; count: number }[];
  recent: { id: string; paid_at: string; amount: number; currency: string; client: string | null; provider: string | null; service: string | null; released: boolean; method: string }[];
};

export type Transaction = {
  id: string;
  paid_at: string;
  created_at: string;
  amount: number;
  currency: string;
  agreed_amount: number | null;
  request_fee: number | null;
  service_fee: number | null;
  urgent_bonus: number | null;
  provider_net: number | null;
  platform_net: number | null;
  status: string;
  escrow_status: string | null;
  released_at: string | null;
  method: string;
  reference_number: string | null;
  client: { id: string | null; name: string | null };
  provider: { id: string | null; name: string | null };
  service: string | null;
  is_multi_day: boolean | null;
  is_urgent: boolean | null;
  request_id: string | null;
};

export type ChargeEvent = { id: number; source: string; status: string | null; message: string | null; created_at: string; payload?: unknown };

export type Charge = {
  id: string;
  merchant_tx_id: string;
  appypay_id: string | null;
  method: 'REF' | 'GPO';
  purpose: 'service' | 'manual';
  request_id: string | null;
  client_id: string | null;
  provider_id: string | null;
  payer_name: string | null;
  payer_phone: string | null;
  payer_email: string | null;
  description: string | null;
  amount_minor: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'expired' | 'cancelled' | 'refunded';
  gateway_status: string | null;
  gateway_message: string | null;
  reference_entity: string | null;
  reference_number: string | null;
  reference_due_at: string | null;
  payment_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_by: 'app' | 'admin';
  created_by_admin: string | null;
  created_at: string;
  updated_at: string;
  display_name?: string | null;
  events?: ChargeEvent[];
};

export type TransactionDetail = {
  payment: Transaction & Record<string, unknown>;
  method: string;
  request: {
    id: string; status: string; service_name: string | null; location: string | null; is_multi_day: boolean | null;
    is_urgent: boolean | null; client_total: number | null; payment_status: string | null; escrow_status: string | null;
    accepted_at: string | null; completed_at: string | null; cancelled_at: string | null;
  } | null;
  client: { id: string; name: string | null; phone: string | null; email: string | null } | null;
  provider: { id: string; name: string | null; phone: string | null; email: string | null } | null;
  charges: Charge[];
};

export type ChargeDetail = {
  charge: Charge;
  client: { id: string; name: string | null; phone: string | null } | null;
  provider: { id: string; name: string | null } | null;
  request: { id: string; service_name: string | null; status: string } | null;
  events: ChargeEvent[];
};

export type Withdrawal = {
  id: string;
  provider_id: string;
  amount: number;
  currency: string | null;
  status: string;
  method: string | null;
  requested_at: string | null;
  paid_at: string | null;
  created_at: string;
  admin_note: string | null;
  processed_at: string | null;
  processed_by: string | null;
  provider_name: string | null;
  provider_phone: string | null;
  provider_email: string | null;
};

export type ProviderBalance = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  earned: number;
  held: number;
  released: number;
  withdrawn: number;
  pending_withdrawals: number;
  available: number;
  jobs: number;
  last_paid_at: string | null;
  last_withdrawal_at: string | null;
};

export type PaymentSettings = {
  minor_unit_factor: number;
  client_fee_rate: number;
  provider_fee_rate: number;
  payment_success_status: string;
  request_paid_status: string;
  escrow_held_status: string;
  withdrawal_paid_status: string;
  updated_at: string;
};

export type PaymentMeta = {
  settings: PaymentSettings;
  withdrawal_statuses: string[];
  escrow_statuses: string[];
  payment_statuses: string[];
};

export type AppyPayStatus = { environment: string; ref: boolean; gpo: boolean; webhook: boolean; missing: string[] };

/* ---------------- Perfil do profissional ---------------- */

export type ProfApplication = Application & { reviewed_at?: string | null; auth_user_id?: string | null };

export type ProfJob = {
  id: string;
  service: string | null;
  status: string;
  description: string | null;
  location: string | null;
  service_date: string | null;
  service_time: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  rejected_at: string | null;
  is_urgent: boolean | null;
  is_multi_day: boolean | null;
  agreed_amount: number | null;
  client_total: number | null;
  provider_net: number | null;
  payment_status: string | null;
  escrow_status: string | null;
  client: { id: string | null; name: string | null; avatar_url: string | null };
  rating: number | null;
};

export type ProfReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client: { id: string | null; name: string | null; avatar_url: string | null };
  service: string | null;
  request_id: string | null;
};

export type ProfPost = {
  id: string;
  image_url: string;
  caption: string | null;
  highlight: string | null;
  type: 'post' | 'story';
  created_at: string;
};

export type ProfPayment = {
  id: string;
  paid_at: string;
  amount: number;
  agreed_amount: number | null;
  provider_net: number | null;
  platform_net: number | null;
  currency: string;
  released_at: string | null;
  escrow_status: string | null;
  service: string | null;
  client: string | null;
};

export type ProfStats = {
  jobs_total?: number; jobs_pending?: number; jobs_accepted?: number; jobs_completed?: number;
  jobs_rejected?: number; jobs_cancelled?: number; clients?: number; repeat_clients?: number;
  first_job_at?: string | null; last_job_at?: string | null; avg_response_hours?: number | null;
  reviews_count?: number; rating_avg?: number | null; rating_dist?: Record<string, number>; reviews_with_comment?: number;
  posts?: number; stories?: number;
  earned?: number; held?: number; released?: number; platform_generated?: number; gross_billed?: number;
  avg_ticket?: number; paid_jobs?: number; withdrawn?: number; pending_withdrawals?: number; available?: number;
};

export type ProfTimelineItem = { kind: string; at: string; title: string | null; detail: string | null; details?: Record<string, unknown> };

export type AdminNote = { id: number; body: string; admin_name: string | null; created_at: string; entity: 'application' | 'user' };

export type ProfessionalProfile = {
  factor: number;
  application: ProfApplication | null;
  account: (AppUser & Record<string, unknown>) | null;
  link: 'auth_user_id' | 'phone' | 'email' | 'account' | null;
  other_applications: { id: string; status: Application['status']; work_area: string | null; created_at: string }[];
  stats: ProfStats;
  jobs?: ProfJob[];
  services?: { label: string; count: number; completed: number }[];
  monthly?: { month: string; jobs: number; completed: number; earned: number }[];
  reviews?: ProfReview[];
  catalog?: ProfPost[];
  payments?: ProfPayment[];
  withdrawals?: Withdrawal[];
  notes: AdminNote[];
  timeline: ProfTimelineItem[];
};
