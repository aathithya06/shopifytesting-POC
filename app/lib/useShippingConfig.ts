import {useState, useEffect} from 'react';
import {useRouteLoaderData} from 'react-router';
import type {RootLoader} from '~/root';
import type {ShippingConfig} from '~/lib/shipping-config.server';

const EMPTY_SHIPPING_CONFIG: ShippingConfig = {
  threshold: null,
  currency: null,
  standardPrice: null,
  minDays: null,
  maxDays: null,
  methodName: null,
};

export function useShippingConfig(): ShippingConfig {
  const data = useRouteLoaderData<RootLoader>('root');
  const raw = data?.shippingConfig;

  const [config, setConfig] = useState<ShippingConfig>(() => {
    if (raw && !(raw instanceof Promise) && typeof raw === 'object' && !('then' in raw)) {
      return raw as ShippingConfig;
    }
    return EMPTY_SHIPPING_CONFIG;
  });

  useEffect(() => {
    let active = true;
    if (!raw) {
      setConfig(EMPTY_SHIPPING_CONFIG);
      return;
    }

    if (raw instanceof Promise || (typeof raw === 'object' && 'then' in raw)) {
      Promise.resolve(raw)
        .then((resolved) => {
          if (active && resolved) {
            setConfig(resolved as ShippingConfig);
          }
        })
        .catch(() => {
          if (active) setConfig(EMPTY_SHIPPING_CONFIG);
        });
    } else {
      setConfig(raw as ShippingConfig);
    }

    return () => {
      active = false;
    };
  }, [raw]);

  return config;
}
