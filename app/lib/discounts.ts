type DiscountedAmount = {
  amount: string;
  currencyCode: string;
};

type CartDiscountAllocation =
  | {
      __typename?: 'CartAutomaticDiscountAllocation' | 'CartCustomDiscountAllocation';
      title?: string | null;
      discountedAmount: DiscountedAmount;
    }
  | {
      __typename?: 'CartCodeDiscountAllocation';
      code?: string | null;
      discountedAmount: DiscountedAmount;
    };

type LineWithDiscounts = {
  discountAllocations?: ReadonlyArray<CartDiscountAllocation> | null;
};

type CartWithDiscounts = {
  discountAllocations?: ReadonlyArray<CartDiscountAllocation> | null;
  lines?: {
    nodes?: ReadonlyArray<LineWithDiscounts> | null;
  } | null;
};

export type LineDiscount = {
  label: string;
  amount: number;
};

export type CartDiscount = {
  label: string;
  amount: number;
  type: 'code' | 'automatic';
};

export type TotalSavings = {
  amount: number;
  currency: string;
};

function parseAmount(amount: DiscountedAmount): number {
  const value = Number.parseFloat(amount.amount);
  return Number.isFinite(value) ? value : 0;
}

function allocationLabel(allocation: CartDiscountAllocation): string {
  if (
    allocation.__typename === 'CartAutomaticDiscountAllocation' &&
    'title' in allocation &&
    allocation.title
  ) {
    return allocation.title;
  }
  if (
    allocation.__typename === 'CartCodeDiscountAllocation' &&
    'code' in allocation &&
    allocation.code
  ) {
    return allocation.code;
  }
  if ('title' in allocation && allocation.title) {
    return allocation.title;
  }
  if ('code' in allocation && allocation.code) {
    return allocation.code;
  }
  return 'Discount';
}

export function getLineDiscounts(line: LineWithDiscounts): LineDiscount[] {
  const allocations = line.discountAllocations;
  if (!allocations || allocations.length === 0) return [];

  return allocations.map((allocation) => ({
    label: allocationLabel(allocation),
    amount: parseAmount(allocation.discountedAmount),
  }));
}

export function getCartDiscounts(cart: CartWithDiscounts): CartDiscount[] {
  const allocations = cart.discountAllocations;
  if (!allocations || allocations.length === 0) return [];

  const grouped = new Map<string, CartDiscount>();

  for (const allocation of allocations) {
    const label = allocationLabel(allocation);
    const amount = parseAmount(allocation.discountedAmount);
    const isCode =
      allocation.__typename === 'CartCodeDiscountAllocation' ||
      ('code' in allocation && !!allocation.code);

    const existing = grouped.get(label);
    if (existing) {
      existing.amount += amount;
      if (isCode) {
        existing.type = 'code';
      }
    } else {
      grouped.set(label, {
        label,
        amount,
        type: isCode ? 'code' : 'automatic',
      });
    }
  }

  return Array.from(grouped.values());
}

export function getTotalSavings(
  cart: CartWithDiscounts,
): TotalSavings {
  let total = 0;
  let currency = '';

  const cartAllocations = cart.discountAllocations ?? [];
  for (const allocation of cartAllocations) {
    total += parseAmount(allocation.discountedAmount);
    if (!currency) currency = allocation.discountedAmount.currencyCode;
  }

  const lines = cart.lines?.nodes ?? [];
  for (const line of lines) {
    const lineAllocations = line.discountAllocations ?? [];
    for (const allocation of lineAllocations) {
      total += parseAmount(allocation.discountedAmount);
      if (!currency) currency = allocation.discountedAmount.currencyCode;
    }
  }

  return {amount: total, currency};
}
