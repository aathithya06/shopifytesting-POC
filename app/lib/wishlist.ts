export interface WishlistItem {
  productId: string;
  handle: string;
  addedAt: string; // ISO-8601 string
}

export interface WishlistData {
  v: 1;
  items: WishlistItem[];
}

export interface MetafieldSetUserError {
  code?: string | null;
  elementIndex?: number | null;
  field?: string[] | null;
  message: string;
}

export type WishlistLoaderResponse =
  | {isLoggedIn: true; wishlist: WishlistData}
  | {isLoggedIn: false; wishlist: null};

export type WishlistActionResponse =
  | {success: true; wishlist: WishlistData; isLoggedIn: true}
  | {
      success: false;
      error?: string;
      userErrors?: MetafieldSetUserError[];
      isLoggedIn?: boolean;
      wishlist?: WishlistData;
    };

export const WISHLIST_NAMESPACE = 'custom';
export const WISHLIST_KEY = 'wishlist';
export const WISHLIST_MAX = 100;
export const LOCAL_KEY = 'wishlist:v1';

export function isValidProductId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.startsWith('gid://shopify/Product/') &&
    id.length > 'gid://shopify/Product/'.length
  );
}

function isValidIsoDate(dateString: string): boolean {
  const timestamp = Date.parse(dateString);
  return !Number.isNaN(timestamp);
}

/**
 * Safely parse JSON into WishlistData. Returns empty WishlistData on invalid input.
 */
export function parseWishlist(value: string | null | undefined): WishlistData {
  const empty: WishlistData = {v: 1, items: []};

  if (!value || typeof value !== 'string') {
    return empty;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') {
      return empty;
    }

    const candidate = parsed as Record<string, unknown>;
    const rawItems: unknown = Array.isArray(candidate)
      ? candidate
      : Array.isArray(candidate.items)
        ? candidate.items
        : null;

    if (!rawItems || !Array.isArray(rawItems)) {
      return empty;
    }

    const itemsMap = new Map<string, WishlistItem>();

    for (const rawItem of rawItems) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const itemObj = rawItem as Record<string, unknown>;
      const productId = itemObj.productId;
      const handle = itemObj.handle;
      const addedAt = itemObj.addedAt;

      if (!isValidProductId(productId)) continue;
      const validHandle = typeof handle === 'string' ? handle : '';
      const validAddedAt =
        typeof addedAt === 'string' && isValidIsoDate(addedAt)
          ? addedAt
          : new Date().toISOString();

      const existing = itemsMap.get(productId);
      if (!existing) {
        itemsMap.set(productId, {
          productId,
          handle: validHandle,
          addedAt: validAddedAt,
        });
      } else {
        // Keep earliest addedAt
        const existingTime = Date.parse(existing.addedAt);
        const newTime = Date.parse(validAddedAt);
        if (newTime < existingTime) {
          itemsMap.set(productId, {
            productId,
            handle: validHandle || existing.handle,
            addedAt: validAddedAt,
          });
        }
      }
    }

    const items = Array.from(itemsMap.values());
    // Newest first
    items.sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));

    return {
      v: 1,
      items: items.slice(0, WISHLIST_MAX),
    };
  } catch {
    return empty;
  }
}

/**
 * Merge two wishlists: union by productId, keep earliest addedAt, newest first, cap at WISHLIST_MAX.
 */
export function mergeWishlists(
  a: WishlistData | null | undefined,
  b: WishlistData | null | undefined,
): WishlistData {
  const itemsMap = new Map<string, WishlistItem>();
  const listA = a?.items ?? [];
  const listB = b?.items ?? [];

  for (const item of [...listA, ...listB]) {
    if (!isValidProductId(item.productId)) continue;

    const existing = itemsMap.get(item.productId);
    if (!existing) {
      itemsMap.set(item.productId, item);
    } else {
      const existingTime = Date.parse(existing.addedAt);
      const newTime = Date.parse(item.addedAt);
      if (newTime < existingTime) {
        itemsMap.set(item.productId, {
          productId: item.productId,
          handle: item.handle || existing.handle,
          addedAt: item.addedAt,
        });
      }
    }
  }

  const mergedItems = Array.from(itemsMap.values());
  // Sort newest first
  mergedItems.sort((x, y) => Date.parse(y.addedAt) - Date.parse(x.addedAt));

  return {
    v: 1,
    items: mergedItems.slice(0, WISHLIST_MAX),
  };
}

export function addItem(
  data: WishlistData,
  item: {productId: string; handle: string; addedAt?: string},
): WishlistData {
  if (!isValidProductId(item.productId)) {
    return data;
  }

  const existingIndex = data.items.findIndex(
    (i) => i.productId === item.productId,
  );
  if (existingIndex !== -1) {
    return data;
  }

  const newItem: WishlistItem = {
    productId: item.productId,
    handle: item.handle,
    addedAt:
      item.addedAt && isValidIsoDate(item.addedAt)
        ? item.addedAt
        : new Date().toISOString(),
  };

  return {
    v: 1,
    items: [newItem, ...data.items].slice(0, WISHLIST_MAX),
  };
}

export function removeItem(data: WishlistData, productId: string): WishlistData {
  return {
    v: 1,
    items: data.items.filter((i) => i.productId !== productId),
  };
}

export function hasItem(data: WishlistData, productId: string): boolean {
  return data.items.some((i) => i.productId === productId);
}

/**
 * SSR-safe localStorage read helper
 */
export function readLocal(): WishlistData {
  if (typeof window === 'undefined') {
    return {v: 1, items: []};
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return parseWishlist(raw);
  } catch {
    return {v: 1, items: []};
  }
}

/**
 * SSR-safe localStorage write helper
 */
export function writeLocal(data: WishlistData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to write wishlist to localStorage:', err);
  }
}

/**
 * SSR-safe localStorage clear helper
 */
export function clearLocal(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LOCAL_KEY);
  } catch (err) {
    console.error('Failed to clear wishlist from localStorage:', err);
  }
}

/**
 * Dispatches custom event to notify all wishlist listeners
 */
export function dispatchWishlistChange(data?: WishlistData): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent<WishlistData | undefined>('wishlist:changed', {
        detail: data,
      }),
    );
  } catch {
    // Ignore event dispatch errors
  }
}
