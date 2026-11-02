/*
# Pedidos já pagos no modelo antigo

Pedidos pagos antes do modelo "pagar no fim" ficavam com payment_status = 'paid'
e status = 'accepted'. Quando o cliente confirmava a conclusão, a página pedia uma
transferência que já não era devida. Agora, se o pagamento já estiver feito,
confirmar a conclusão fecha o pedido (status = 'completed').
*/

create or replace function public.client_confirm_service(p_id uuid)
returns public.service_broadcasts
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.service_broadcasts;
begin
  update public.service_broadcasts
     set client_confirmed_at = now(),
         status = case when payment_status = 'paid' then 'completed' else status end,
         completed_at = case when payment_status = 'paid' then coalesce(completed_at, now()) else completed_at end,
         updated_at = now()
   where id = p_id and client_id = auth.uid() and status = 'accepted'
     and provider_done_at is not null and client_confirmed_at is null
  returning * into v_row;
  return v_row;
end $$;

grant execute on function public.client_confirm_service(uuid) to authenticated;

-- Fecha os pedidos que já ficaram nesse estado.
update public.service_broadcasts
   set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
 where status = 'accepted' and payment_status = 'paid' and client_confirmed_at is not null;
