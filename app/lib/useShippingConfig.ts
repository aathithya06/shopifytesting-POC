import {useRouteLoaderData} from 'react-router';
import type {RootLoader} from '~/root';

const EMPTY_SHIPPING_CONFIG = {
  threshold: null,
  currency: null,
  standardPrice: null,
  minDays: null,
  maxDays: null,
  methodName: null,
};

export function useShippingConfig() {
  const data = useRouteLoaderData<RootLoader>('root');
  return data?.shippingConfig ?? EMPTY_SHIPPING_CONFIG;
}
