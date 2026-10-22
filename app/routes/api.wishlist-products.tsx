import {data} from 'react-router';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import type {Route} from './+types/api.wishlist-products';
import {withTimeout} from '~/lib/timeout';

export const WISHLIST_PRODUCTS_QUERY = `#graphql
  query WishlistProducts(
    $ids: [ID!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        handle
        featuredImage {
          id
          url
          altText
          width
          height
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 1) {
          nodes {
            id
            availableForSale
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
` as const;

export interface WishlistProductVariant {
  id: string;
  availableForSale: boolean;
  price: {
    amount: string;
    currencyCode: CurrencyCode;
  };
  compareAtPrice?: {
    amount: string;
    currencyCode: CurrencyCode;
  } | null;
}

export interface WishlistProduct {
  id: string;
  title: string;
  handle: string;
  featuredImage?: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: CurrencyCode;
    };
  };
  variants: {
    nodes: WishlistProductVariant[];
  };
}

interface WishlistProductsQueryResult {
  nodes?: Array<WishlistProduct | null> | null;
}

export type WishlistProductsApiResponse = {
  products: WishlistProduct[];
  count: number;
  error?: string;
};

function normalizeProductGid(id: string): string | null {
  const trimmed = id.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('gid://shopify/Product/')) {
    return trimmed;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits) {
    return `gid://shopify/Product/${digits}`;
  }
  return null;
}

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get('ids') || '';

  const rawIds = idsParam
    .split(',')
    .map((s) => decodeURIComponent(s))
    .filter(Boolean);

  const normalizedIds: string[] = [];
  for (const rawId of rawIds) {
    const gid = normalizeProductGid(rawId);
    if (gid && !normalizedIds.includes(gid)) {
      normalizedIds.push(gid);
    }
  }

  if (normalizedIds.length === 0) {
    return data<WishlistProductsApiResponse>(
      {products: [], count: 0},
      {
        headers: {
          'Cache-Control': 'public, max-age=60',
        },
      },
    );
  }

  const cappedIds = normalizedIds.slice(0, 100);
  console.log('[api.wishlist-products] IDs sent:', cappedIds);

  const {storefront} = context;

  try {
    const queryPromise = storefront.query<WishlistProductsQueryResult>(
      WISHLIST_PRODUCTS_QUERY,
      {
        variables: {
          ids: cappedIds,
          country: storefront.i18n.country,
          language: storefront.i18n.language,
        },
      },
    );

    const queryData = await withTimeout<WishlistProductsQueryResult | null>(
      queryPromise,
      4000,
      'Storefront WishlistProducts query',
      null,
    );

    const rawNodes = queryData?.nodes ?? [];
    const nullNodesCount = rawNodes.filter((n) => !n).length;
    console.log(
      `[api.wishlist-products] Nodes returned count: ${rawNodes.length}, null nodes: ${nullNodesCount}`,
    );

    const productMap = new Map<string, WishlistProduct>();
    for (const node of rawNodes) {
      if (node && node.id) {
        productMap.set(node.id, node);
      }
    }

    const orderedProducts = cappedIds
      .map((id) => productMap.get(id))
      .filter((p): p is WishlistProduct => Boolean(p));

    return data<WishlistProductsApiResponse>(
      {
        products: orderedProducts,
        count: orderedProducts.length,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60',
        },
      },
    );
  } catch (error) {
    console.error('[api.wishlist-products] Failed to fetch product details:', error);
    return data<WishlistProductsApiResponse>(
      {
        products: [],
        count: 0,
        error: 'Failed to load product details. Please try again.',
      },
      {status: 500},
    );
  }
}
