import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type PaymentInfo = {
  client_fee_rate: number;
  provider_fee_rate: number;
  bank_name: string | null;
  iban: string | null;
  account_holder: string | null;
};

export type PartnerCompany = { id: string; name: string };

export const DEFAULT_PAYMENT_INFO: PaymentInfo = {
  client_fee_rate: 0.1,
  provider_fee_rate: 0.1,
  bank_name: null,
  iban: 'AO06004000008529834810207',
  account_holder: 'EDSON SANTOS',
};

let paymentCache: Promise<PaymentInfo> | null = null;

export function paymentInfo(): Promise<PaymentInfo> {
  if (!paymentCache) {
    paymentCache = (async () => {
      const { data, error } = await supabase.rpc('payment_info');
      if (error || !data) return DEFAULT_PAYMENT_INFO;
      const d = data as PaymentInfo;
      return { ...d, client_fee_rate: Number(d.client_fee_rate), provider_fee_rate: Number(d.provider_fee_rate) };
    })().catch(() => {
      paymentCache = null;
      return DEFAULT_PAYMENT_INFO;
    });
  }
  return paymentCache;
}

export function usePaymentInfo(): PaymentInfo {
  const [info, setInfo] = useState<PaymentInfo>(DEFAULT_PAYMENT_INFO);
  useEffect(() => {
    let active = true;
    paymentInfo().then((d) => { if (active) setInfo(d); });
    return () => { active = false; };
  }, []);
  return info;
}

export function feeBreakdown(serviceMinor: number, info: PaymentInfo) {
  const clientFee = Math.round(serviceMinor * info.client_fee_rate);
  const providerFee = Math.round(serviceMinor * info.provider_fee_rate);
  return {
    service: serviceMinor,
    clientFee,
    providerFee,
    clientTotal: serviceMinor + clientFee,
    providerNet: serviceMinor - providerFee,
  };
}

export function pct(rate: number) {
  return `${Math.round(rate * 1000) / 10}%`;
}

export function usePartnerCompanies(): PartnerCompany[] | null {
  const [list, setList] = useState<PartnerCompany[] | null>(null);
  useEffect(() => {
    let active = true;
    supabase.from('partner_companies').select('id, name').eq('active', true).order('name')
      .then(({ data }) => { if (active) setList((data as PartnerCompany[] | null) ?? []); });
    return () => { active = false; };
  }, []);
  return list;
}
