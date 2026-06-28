import { useEffect, useState } from 'react';
import { SERVICES, type Service } from '../data';

function imageLoads(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export function useValidServices(services: Service[] = SERVICES) {
  const [valid, setValid] = useState<Service[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      services.map(async (service) => ({
        service,
        ok: await imageLoads(service.image),
      })),
    ).then((results) => {
      if (!cancelled) {
        setValid(results.filter((r) => r.ok).map((r) => r.service));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [services]);

  return valid;
}
