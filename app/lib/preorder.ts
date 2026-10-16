/**
 * Pre-order utility functions for Shopify Hydrogen.
 */

/**
 * Formats a date string (e.g. "2026-11-15" or ISO string) to a human-readable format (e.g. "Nov 15, 2026").
 * Safely handles missing, invalid, or malformed inputs.
 */
export function formatPreorderDate(rawDate?: string | null): string {
  if (!rawDate) return '';
  try {
    const parts = rawDate.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(d);
      }
    }
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    }
  } catch {
    // fallback to raw string if parsing fails
  }
  return rawDate;
}

/**
 * Evaluates whether a product variant qualifies for pre-order.
 * Condition:
 * 1. Product custom.preorder metafield value is "true"
 * 2. variant.currentlyNotInStock is true
 * 3. variant.availableForSale is true
 */
export function isVariantPreorder({
  variant,
  preorderMetafieldValue,
}: {
  variant: {
    availableForSale?: boolean | null;
    currentlyNotInStock?: boolean | null;
  } | null | undefined;
  preorderMetafieldValue?: string | null;
}): boolean {
  if (!variant) return false;
  const isPreorderEnabled = preorderMetafieldValue?.toLowerCase() === 'true';
  if (!isPreorderEnabled) return false;

  const isCurrentlyNotInStock = Boolean(variant.currentlyNotInStock);
  const isAvailableForSale = Boolean(variant.availableForSale);

  return isPreorderEnabled && isCurrentlyNotInStock && isAvailableForSale;
}

/**
 * Checks if a cart line is marked as a pre-order line item.
 */
export function isPreorderCartLine(line: {
  attributes?: Array<{key: string; value?: string | null}> | null;
}): boolean {
  return Boolean(
    line.attributes?.some(
      (attr) =>
        attr.key === '_preorder' &&
        (attr.value === 'true' || attr.value === '1'),
    ),
  );
}

/**
 * Extracts and formats the ship date from cart line attributes.
 */
export function getPreorderShipDateFromAttributes(
  attributes?: Array<{
    key: string;
    value?: string | null;
  }> | null,
): string {
  const attr = attributes?.find((a) => a.key === 'preorder_ship_date');
  return formatPreorderDate(attr?.value);
}
