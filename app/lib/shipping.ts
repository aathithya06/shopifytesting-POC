type ShippingConfig = {
  threshold: number | null;
  currency: string | null;
  standardPrice: number | null;
  minDays: number | null;
  maxDays: number | null;
  methodName: string | null;
};

type CartForShipping = {
  lines?: {
    nodes?: ReadonlyArray<unknown>;
  } | null;
  cost?: {
    subtotalAmount?: {
      amount?: string | null;
      currencyCode?: string | null;
    } | null;
  } | null;
  discountAllocations?: ReadonlyArray<{
    discountedAmount?: {
      amount?: string | null;
    } | null;
  }> | null;
} | null;

export type ShippingProgress =
  | {isValid: false}
  | {
      isValid: true;
      subtotal: number;
      currency: string;
      threshold: number;
      remaining: number;
      percent: number;
      isUnlocked: boolean;
    };

export function getShippingProgress(
  cart: CartForShipping,
  config: ShippingConfig | null,
): ShippingProgress {
  if (config?.threshold == null) return {isValid: false};

  const lines = cart?.lines?.nodes;
  if (!lines || lines.length === 0) return {isValid: false};

  const amount = cart?.cost?.subtotalAmount?.amount;
  const currency = cart?.cost?.subtotalAmount?.currencyCode;
  if (amount == null || amount === '' || !currency) return {isValid: false};

  const subtotal = Number.parseFloat(amount);
  if (Number.isNaN(subtotal) || subtotal < 0) return {isValid: false};

  const cartDiscounts = cart?.discountAllocations ?? [];
  const cartDiscountTotal = cartDiscounts.reduce((sum, allocation) => {
    const discountAmount = allocation?.discountedAmount?.amount;
    if (discountAmount == null || discountAmount === '') return sum;
    const value = Number.parseFloat(discountAmount);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  const adjustedSubtotal = Math.max(subtotal - cartDiscountTotal, 0);

  const threshold = config.threshold;
  const remaining = Math.max(threshold - adjustedSubtotal, 0);
  const ratio = threshold === 0 ? (adjustedSubtotal > 0 ? 100 : 0) : (adjustedSubtotal / threshold) * 100;
  const percent = Math.min(100, Math.max(0, Number.isFinite(ratio) ? ratio : 0));

  return {
    isValid: true,
    subtotal: adjustedSubtotal,
    currency,
    threshold,
    remaining,
    percent,
    isUnlocked: remaining === 0,
  };
}

export function getDeliveryEstimate(
  config: ShippingConfig | null,
  today = new Date(),
): {start: string; end: string} | null {
  if (config?.minDays == null || config.maxDays == null) return null;

  const start = addBusinessDays(today, config.minDays);
  const end = addBusinessDays(today, config.maxDays);
  const format = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return {start: format.format(start), end: format.format(end)};
}

function addBusinessDays(from: Date, days: number): Date {
  const date = new Date(from);
  date.setHours(12, 0, 0, 0);
  if (days <= 0) return date;

  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return date;
}
