/*
# Pagamento de TESTE (temporário)

Marca um pedido como pago sem passar pela AppyPay, para testar todo o fluxo
(pagamento → conclusão → carteira) enquanto o gateway não está publicado.
Cria uma cobrança 'success' que o trigger converte em pedido pago.

⚠️ Apagar/desligar quando o pagamento real (broadcast-pay) estiver ativo.
*/

create or replace function public.pay_test_broadcast(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare b public.service_broadcasts; v_total bigint; v_name text; v_phone text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into b from public.service_broadcasts where id = p_id;
  if b.id is null then raise exception 'NOT_FOUND'; end if;
  if b.client_id is distinct from auth.uid() then raise exception 'FORBIDDEN'; end if;
  if b.status <> 'accepted' then raise exception 'REQUEST_CLOSED'; end if;
  if b.payment_status = 'paid' then raise exception 'ALREADY_PAID'; end if;

  v_total := b.price_minor + public.flexpay_fee(b.price_minor);
  select name, phone into v_name, v_phone from public.profiles where id = b.client_id;

  insert into public.payment_charges (
    merchant_tx_id, method, purpose, site_request_id, client_id, provider_id, payer_name, payer_phone,
    description, amount_minor, currency, status, created_by, paid_at
  ) values (
    private.merchant_tx_id(), 'REF', 'service', b.id, b.client_id, b.provider_id, v_name, v_phone,
    'AUTONOMOUS TESTE ' || coalesce(b.category, ''), v_total, 'AOA', 'success', 'app', now()
  );

  select * into b from public.service_broadcasts where id = p_id; -- já pago pelo trigger
  return b;
end $$;

grant execute on function public.pay_test_broadcast(uuid) to authenticated;
