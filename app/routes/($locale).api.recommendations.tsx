import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import type {LoaderFunctionArgs} from 'react-router';

const PRODUCT_ID = /^gid:\/\/shopify\/Product\/\d+$/;

export type CartRecommendationProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  featuredImage?: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  selectedOrFirstAvailableVariant?: {
    id: string;
    availableForSale: boolean;
    title: string;
    price: {amount: string; currencyCode: CurrencyCode};
    selectedOptions: Array<{name: string; value: string}>;
    image?: {
      id?: string | null;
      url: string;
      altText?: string | null;
      width?: number | null;
      height?: number | null;
    } | null;
    product: {id: string; title: string; handle: string};
  } | null;
};

export type CartRecommendationsResult = {
  productIds: string[];
  products: CartRecommendationProduct[];
};

/**
 * Recommendations for the products currently in the cart.
 * Loaded by the cart drawer with useFetcher when the drawer opens.
 */
export async function loader({
  request,
  context,
}: LoaderFunctionArgs): Promise<CartRecommendationsResult> {
  const url = new URL(request.url);
  const productIds = [
    ...new Set(
      (url.searchParams.get('productIds') ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => PRODUCT_ID.test(id)),
    ),
  ].slice(0, 4);

  if (!productIds.length) {
    return {productIds: [], products: []};
  }

  const {storefront} = context;
  const inCart = new Set(productIds);
  const seen = new Set<string>();
  const products: CartRecommendationProduct[] = [];

  const responses = await Promise.all(
    productIds.map((productId) =>
      storefront
        .query(CART_PRODUCT_RECOMMENDATIONS_QUERY, {
          variables: {productId},
          cache: storefront.CacheShort(),
        })
        .catch((error: Error) => {
          console.error(error);
          return null;
        }),
    ),
  );

  for (const response of responses) {
    for (const product of response?.productRecommendations ?? []) {
      if (!product?.id || seen.has(product.id) || inCart.has(product.id)) {
        continue;
      }
      const variant = product.selectedOrFirstAvailableVariant;
      if (!variant?.availableForSale) continue;
      seen.add(product.id);
      products.push(product);
      if (products.length >= 8) break;
    }
    if (products.length >= 8) break;
  }

  return {productIds, products};
}

const CART_PRODUCT_RECOMMENDATIONS_QUERY = `#graphql
  query CartProductRecommendations(
    $productId: ID!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId) {
      id
      title
      handle
      vendor
      featuredImage {
        id
        url
        altText
        width
        height
      }
      selectedOrFirstAvailableVariant {
        id
        availableForSale
        title
        price {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        image {
          id
          url
          altText
          width
          height
        }
        product {
          id
          title
          handle
        }
      }
    }
  }
` as const;
