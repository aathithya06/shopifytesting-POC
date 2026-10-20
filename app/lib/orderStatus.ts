import {formatPreorderDate} from '~/lib/preorder';

export type TrackerStepId =
  | 'placed'
  | 'preorder_confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered';

export interface TrackerTrackingInfo {
  carrier: string | null;
  number: string | null;
  url: string | null;
}

export interface TrackerStep {
  id: TrackerStepId;
  title: string;
  description: string;
  date: string | null;
  isComplete: boolean;
  isCurrent: boolean;
  tracking: TrackerTrackingInfo | null;
}

export interface OrderStatusTrackerData {
  statusPillText: string;
  estimatedDeliveryText: string | null;
  steps: TrackerStep[];
}

export interface OrderTrackingInfoRaw {
  company?: string | null;
  number?: string | null;
  url?: string | null;
}

export interface OrderFulfillmentLike {
  status?: string | null;
  latestShipmentStatus?: string | null;
  displayStatus?: string | null;
  createdAt?: string | null;
  estimatedDeliveryAt?: string | null;
  trackingInfo?: OrderTrackingInfoRaw[] | OrderTrackingInfoRaw | null;
  trackingInformation?: OrderTrackingInfoRaw[] | null;
}

export interface OrderAttributeLike {
  key?: string | null;
  value?: string | null;
}

export interface OrderLineItemLike {
  properties?:
    | OrderAttributeLike[]
    | Record<string, string | null | undefined>
    | null;
  customAttributes?: OrderAttributeLike[] | null;
}

export interface OrderStatusInput {
  processedAt?: string | null;
  createdAt?: string | null;
  tags?: string[] | null;
  customAttributes?: OrderAttributeLike[] | null;
  financialStatus?: string | null;
  fulfillmentStatus?: string | null;
  fulfillments?:
    | {
        nodes?: OrderFulfillmentLike[] | null;
      }
    | OrderFulfillmentLike[]
    | null;
  lineItems?:
    | {
        nodes?: OrderLineItemLike[] | null;
      }
    | OrderLineItemLike[]
    | null;
}

/**
 * Formats an ISO date string to a human-readable format (e.g. "Oct 16, 2026").
 * Safely handles null, undefined, or invalid date values.
 */
export function formatTrackerDate(rawDate?: string | null): string {
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
    // fallback to raw date
  }
  return rawDate;
}

/**
 * Normalizes properties from array or object formats.
 */
function extractLineItemProperties(
  lineItem: OrderLineItemLike,
): Record<string, string> {
  const map: Record<string, string> = {};

  if (Array.isArray(lineItem.properties)) {
    for (const attr of lineItem.properties) {
      if (attr?.key && attr.value != null) {
        map[attr.key] = attr.value;
      }
    }
  } else if (lineItem.properties && typeof lineItem.properties === 'object') {
    for (const [key, value] of Object.entries(lineItem.properties)) {
      if (value != null) {
        map[key] = String(value);
      }
    }
  }

  if (Array.isArray(lineItem.customAttributes)) {
    for (const attr of lineItem.customAttributes) {
      if (attr?.key && attr.value != null && map[attr.key] === undefined) {
        map[attr.key] = attr.value;
      }
    }
  }

  return map;
}

/**
 * Normalizes order tags from array, string, or custom attributes.
 */
function extractOrderTags(order: OrderStatusInput): string[] {
  const tags: string[] = [];

  if (Array.isArray(order.tags)) {
    for (const tag of order.tags) {
      if (typeof tag === 'string') {
        const trimmed = tag.trim().toLowerCase();
        if (trimmed && !tags.includes(trimmed)) {
          tags.push(trimmed);
        }
      }
    }
  }

  // Fallback to order customAttributes if tags are mirrored there
  if (Array.isArray(order.customAttributes)) {
    for (const attr of order.customAttributes) {
      const key = attr?.key?.toLowerCase();
      if ((key === 'tags' || key === 'tag') && attr?.value) {
        const items = attr.value.split(',').map((t) => t.trim().toLowerCase());
        for (const item of items) {
          if (item && !tags.includes(item)) {
            tags.push(item);
          }
        }
      }
    }
  }

  return tags;
}

/**
 * Resolves the delivery status from a fulfillment.
 * In Shopify Customer Account API, latestShipmentStatus (and displayStatus alias)
 * carries values such as "DELIVERED", "IN_TRANSIT", "OUT_FOR_DELIVERY", etc.
 */
export function getFulfillmentDeliveryStatus(
  f: OrderFulfillmentLike,
): string | null {
  if (
    f.displayStatus &&
    typeof f.displayStatus === 'string' &&
    f.displayStatus.trim()
  ) {
    return f.displayStatus.trim();
  }
  if (
    f.latestShipmentStatus &&
    typeof f.latestShipmentStatus === 'string' &&
    f.latestShipmentStatus.trim()
  ) {
    return f.latestShipmentStatus.trim();
  }
  // Fallback: check if status carries a delivery status string (e.g. in test/mock objects)
  if (
    f.status &&
    typeof f.status === 'string' &&
    [
      'DELIVERED',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'CONFIRMED',
      'ATTEMPTED_DELIVERY',
    ].includes(f.status.toUpperCase())
  ) {
    return f.status.trim();
  }
  return null;
}

/**
 * Derives the Order Status Tracker data from an order object.
 *
 * Flow: Placed -> (Pre-order confirmed, only if applicable) -> Processing -> Shipped -> Delivered
 *
 * Rules:
 * 1. "Placed": always complete, timestamp = order.processedAt.
 * 2. "Pre-order confirmed": only shown if any line item has properties._preorder == "true".
 *    Complete immediately (same time as Placed). Show "Ships <preorder_ship_date formatted>" as subtext.
 * 3. "Processing": complete if order.tags includes "status:processing" OR a fulfillment exists.
 *    No timestamp, shows "In progress" until complete.
 * 4. "Shipped": complete if order.fulfillments.length > 0.
 *    Timestamp = fulfillments[0].createdAt. If trackingInfo exists, show carrier + track link.
 * 5. "Delivered": complete if order.tags includes "status:delivered".
 *    No real timestamp, show "Delivered" once complete.
 * 6. Steps after the last completed one render as upcoming/grey.
 */
export function deriveOrderStatus(order: OrderStatusInput): OrderStatusTrackerData {
  // Normalize fulfillments
  const fulfillments: OrderFulfillmentLike[] = Array.isArray(order.fulfillments)
    ? order.fulfillments
    : (order.fulfillments?.nodes ?? []);

  // Normalize line items
  const lineItems: OrderLineItemLike[] = Array.isArray(order.lineItems)
    ? order.lineItems
    : (order.lineItems?.nodes ?? []);

  // Normalize tags
  const tags = extractOrderTags(order);

  // Pre-order evaluation
  let hasPreorder = false;
  let rawPreorderShipDate: string | null = null;

  for (const item of lineItems) {
    const props = extractLineItemProperties(item);
    if (props._preorder === 'true' || props._preorder === '1') {
      hasPreorder = true;
    }
    if (!rawPreorderShipDate && props.preorder_ship_date) {
      rawPreorderShipDate = props.preorder_ship_date;
    }
  }

  const formattedPreorderShipDate = rawPreorderShipDate
    ? formatPreorderDate(rawPreorderShipDate)
    : '';

  // Extract first fulfillment & tracking info
  const firstFulfillment = fulfillments[0] ?? null;
  let tracking: TrackerTrackingInfo | null = null;

  if (firstFulfillment) {
    const rawTracking = Array.isArray(firstFulfillment.trackingInfo)
      ? firstFulfillment.trackingInfo[0]
      : firstFulfillment.trackingInfo ||
        (Array.isArray(firstFulfillment.trackingInformation)
          ? firstFulfillment.trackingInformation[0]
          : null);

    if (rawTracking) {
      tracking = {
        carrier: rawTracking.company || null,
        number: rawTracking.number || null,
        url: rawTracking.url || null,
      };
    }
  }

  // Completion flags
  const isPlacedComplete = true;
  const isPreorderComplete = hasPreorder;
  const hasProcessingTag = tags.includes('status:processing');
  const hasDeliveredTag = tags.includes('status:delivered');

  // Delivery status evaluation:
  // In Customer Account API, latestShipmentStatus (and displayStatus alias)
  // carries values such as "DELIVERED", "IN_TRANSIT", "OUT_FOR_DELIVERY", etc.
  const availableDeliveryStatuses = fulfillments
    .map(getFulfillmentDeliveryStatus)
    .filter((s): s is string => Boolean(s));

  const hasDeliveryStatusAvailable = availableDeliveryStatuses.length > 0;

  // "Delivered" step: complete when the fulfillment's delivery status equals "DELIVERED"
  // (case-insensitive). Fall back to checking order.tags for "status:delivered" only
  // if the fulfillment has no delivery status field available at all.
  const isDeliveredComplete = hasDeliveryStatusAvailable
    ? availableDeliveryStatuses.some(
        (status) => status.toUpperCase() === 'DELIVERED',
      )
    : hasDeliveredTag;

  // "Shipped" step: complete when at least one fulfillment exists (status is fulfilled)
  // or when delivered is complete.
  const hasFulfilledFulfillment =
    fulfillments.length > 0 &&
    fulfillments.some((f) => {
      if (!f || !f.status) return true;
      const s = f.status.toUpperCase();
      return s !== 'CANCELLED' && s !== 'ERROR' && s !== 'FAILURE';
    });
  const isShippedComplete = hasFulfilledFulfillment || isDeliveredComplete;

  // "Processing" step: keep on the status:processing tag as before OR fulfillment exists
  const isProcessingComplete = hasProcessingTag || isShippedComplete;

  // Build steps list
  const steps: TrackerStep[] = [];

  // Step 1: Placed
  const placedDate =
    formatTrackerDate(order.processedAt) ||
    formatTrackerDate(order.createdAt) ||
    null;

  steps.push({
    id: 'placed',
    title: 'Order Placed',
    description: 'We received your order',
    date: placedDate,
    isComplete: isPlacedComplete,
    isCurrent: false,
    tracking: null,
  });

  // Step 2: Pre-order confirmed (conditional)
  if (hasPreorder) {
    const shipSubtext = formattedPreorderShipDate
      ? `Ships ${formattedPreorderShipDate}`
      : 'Ships soon';

    steps.push({
      id: 'preorder_confirmed',
      title: 'Pre-order confirmed',
      description: shipSubtext,
      date: null,
      isComplete: isPreorderComplete,
      isCurrent: false,
      tracking: null,
    });
  }

  // Step 3: Processing
  const processingDesc = isProcessingComplete
    ? 'Order processed'
    : 'In progress';

  steps.push({
    id: 'processing',
    title: 'Processing',
    description: processingDesc,
    date: null,
    isComplete: isProcessingComplete,
    isCurrent: false,
    tracking: null,
  });

  // Step 4: Shipped
  const shippedDate = firstFulfillment?.createdAt
    ? formatTrackerDate(firstFulfillment.createdAt)
    : null;

  let shippedDesc = 'Upcoming';
  if (isShippedComplete) {
    if (tracking?.carrier && tracking.number) {
      shippedDesc = `${tracking.carrier} · ${tracking.number}`;
    } else if (tracking?.carrier) {
      shippedDesc = tracking.carrier;
    } else {
      shippedDesc = 'Package on the way';
    }
  }

  steps.push({
    id: 'shipped',
    title: 'Shipped',
    description: shippedDesc,
    date: shippedDate,
    isComplete: isShippedComplete,
    isCurrent: false,
    tracking,
  });

  // Step 5: Delivered
  const deliveredDesc = isDeliveredComplete ? 'Delivered' : 'Pending delivery';

  steps.push({
    id: 'delivered',
    title: 'Delivered',
    description: deliveredDesc,
    date: null,
    isComplete: isDeliveredComplete,
    isCurrent: false,
    tracking: null,
  });

  // Determine current active step (for aria-current="step")
  // The current step is the first incomplete step, or the last step if all are complete.
  const firstIncompleteIndex = steps.findIndex((step) => !step.isComplete);
  const currentIndex =
    firstIncompleteIndex !== -1 ? firstIncompleteIndex : steps.length - 1;

  if (steps[currentIndex]) {
    steps[currentIndex].isCurrent = true;
  }

  // Derive top status pill text based on latest milestone reached
  let statusPillText = 'Order Placed';
  if (isDeliveredComplete) {
    statusPillText = 'Order Delivered';
  } else if (isShippedComplete) {
    statusPillText = 'Order Shipped';
  } else if (isProcessingComplete) {
    statusPillText = 'Order Processing';
  } else if (hasPreorder) {
    statusPillText = 'Pre-order Confirmed';
  }

  // Derive Estimated delivery chip text
  let estimatedDeliveryText: string | null = null;
  if (firstFulfillment?.estimatedDeliveryAt) {
    const formattedEst = formatTrackerDate(firstFulfillment.estimatedDeliveryAt);
    if (formattedEst) {
      estimatedDeliveryText = `Estimated delivery: ${formattedEst}`;
    }
  } else if (formattedPreorderShipDate) {
    estimatedDeliveryText = `Estimated ship date: ${formattedPreorderShipDate}`;
  }

  return {
    statusPillText,
    estimatedDeliveryText,
    steps,
  };
}
