import type {
  OrderQuery,
  ReturnLineItemFullFragment,
} from 'customer-accountapi.generated';

export interface ReturnReasonOption {
  value: string;
  label: string;
  description: string;
}

/**
 * Standard ReturnReason enum values from Shopify Customer Account API
 * mapped to user-friendly labels and descriptions.
 */
export const RETURN_REASONS: ReturnReasonOption[] = [
  {
    value: 'DEFECTIVE',
    label: 'Defective or damaged',
    description: 'Item has manufacturing defect, broken parts, or arrived damaged.',
  },
  {
    value: 'SIZE_TOO_SMALL',
    label: 'Size too small',
    description: 'The item fits smaller than expected.',
  },
  {
    value: 'SIZE_TOO_LARGE',
    label: 'Size too large',
    description: 'The item fits larger than expected.',
  },
  {
    value: 'NOT_AS_DESCRIBED',
    label: 'Not as described',
    description: 'The item does not match photos, specs, or product description.',
  },
  {
    value: 'WRONG_ITEM',
    label: 'Received wrong item',
    description: 'Received a completely different item from what was ordered.',
  },
  {
    value: 'UNWANTED',
    label: 'Changed mind / Unwanted',
    description: 'No longer needed or wanted.',
  },
  {
    value: 'COLOR',
    label: 'Color not as expected',
    description: 'The color differs significantly from images.',
  },
  {
    value: 'STYLE',
    label: 'Style not as expected',
    description: 'Style or fit did not suit expectations.',
  },
  {
    value: 'OTHER',
    label: 'Other reason',
    description: 'Another reason not listed above.',
  },
];

export type ReturnStatusTone =
  | 'warning'
  | 'info'
  | 'success'
  | 'critical'
  | 'neutral';

export interface ReturnStatusConfig {
  label: string;
  badgeClass: string;
  tone: ReturnStatusTone;
  description: string;
}

/**
 * Shopify Customer Account API ReturnStatus mapping:
 * REQUESTED | OPEN | CLOSED | DECLINED | CANCELED
 */
export const RETURN_STATUS_MAP: Record<string, ReturnStatusConfig> = {
  REQUESTED: {
    label: 'Requested',
    badgeClass: 'return-badge--requested',
    tone: 'warning',
    description: 'Your return request has been submitted and is under merchant review.',
  },
  OPEN: {
    label: 'Approved / In Progress',
    badgeClass: 'return-badge--open',
    tone: 'info',
    description: 'Return approved. Follow return instructions or reverse shipment details below.',
  },
  CLOSED: {
    label: 'Completed / Refunded',
    badgeClass: 'return-badge--closed',
    tone: 'success',
    description: 'Return received and finalized. Any applicable refunds have been processed.',
  },
  DECLINED: {
    label: 'Declined',
    badgeClass: 'return-badge--declined',
    tone: 'critical',
    description: 'The return request was declined by the merchant.',
  },
  CANCELED: {
    label: 'Canceled',
    badgeClass: 'return-badge--canceled',
    tone: 'neutral',
    description: 'This return request was canceled.',
  },
};

/**
 * Returns the human-readable label for a return reason.
 */
export function getReturnReasonLabel(reasonKey?: string | null): string {
  if (!reasonKey) return 'Not specified';
  const found = RETURN_REASONS.find(
    (r) => r.value.toUpperCase() === reasonKey.toUpperCase(),
  );
  if (found) return found.label;

  // Format enum or snake_case/kebab-case strings
  return reasonKey
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Formats an ISO date into a localized human-readable string.
 */
export function formatReturnDate(rawDate?: string | null): string {
  if (!rawDate) return '';
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    }
  } catch {
    // fallback
  }
  return rawDate;
}

export type OrderData = NonNullable<OrderQuery['order']>;
export type ReturnableNode =
  OrderData['returnInformation']['returnableLineItems']['nodes'][number];
export type ReturnNode = OrderData['returns']['nodes'][number];

export interface ReturnEligibilityResult {
  isEligible: boolean;
  returnableItems: ReturnableNode[];
  statusType:
    | 'eligible'
    | 'not_delivered'
    | 'window_closed'
    | 'already_returned'
    | 'not_eligible';
  title: string;
  message: string;
}

/**
 * Evaluates return eligibility for an order based on Customer Account API returnInformation
 * and fulfillment/delivery status without computing eligibility from dates in code.
 */
export function evaluateReturnEligibility(
  order: OrderData,
  isDelivered?: boolean,
): ReturnEligibilityResult {
  const returnInfo = order?.returnInformation;
  const returnableItems = (returnInfo?.returnableLineItems?.nodes || []).filter(
    (item) => item.quantity > 0,
  );
  const nonReturnableSummary = returnInfo?.nonReturnableSummary;
  const nonReturnableReasons = nonReturnableSummary?.nonReturnableReasons || [];

  if (returnableItems.length > 0) {
    return {
      isEligible: true,
      returnableItems,
      statusType: 'eligible',
      title: 'Eligible for return',
      message: 'Items in this order are eligible for return.',
    };
  }

  // If no eligible items, show "Return window closed" (if delivered) or "Return not available yet" (if not delivered)
  const isDeliveredEffective =
    !nonReturnableReasons.includes('UNFULFILLED') &&
    (Boolean(isDelivered) ||
      nonReturnableReasons.includes('RETURN_WINDOW_EXPIRED') ||
      Boolean(
        order.fulfillments?.nodes?.some(
          (f) =>
            f.latestShipmentStatus?.toUpperCase() === 'DELIVERED' ||
            f.displayStatus?.toUpperCase() === 'DELIVERED' ||
            f.status?.toUpperCase() === 'DELIVERED',
        ),
      ));

  if (isDeliveredEffective) {
    return {
      isEligible: false,
      returnableItems: [],
      statusType: 'window_closed',
      title: 'Return window closed',
      message: 'The return window has closed for this order.',
    };
  }

  return {
    isEligible: false,
    returnableItems: [],
    statusType: 'not_delivered',
    title: 'Return not available yet',
    message: 'Returns can only be requested once your order has been delivered.',
  };
}
