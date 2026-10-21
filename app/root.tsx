import { Analytics, getShopAnalytics, useNonce } from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  useLoaderData,
} from 'react-router';
import type { Route } from './+types/root';
import favicon from '~/assets/favicon.svg';
import { FOOTER_QUERY, HEADER_QUERY } from '~/lib/fragments';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import tailwindCss from './styles/tailwind.css?url';
import { PageLayout } from './components/PageLayout';
import { fetchShippingConfig } from '~/lib/shipping-config.server';
import { WishlistProvider } from '~/lib/useWishlist';
import { withTimeout } from '~/lib/timeout';

export type RootLoader = typeof loader;

/**
 * Avoid re-fetching root queries on sub-navigations,
 * especially on background wishlist actions and products resource queries.
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
  formAction,
}) => {
  // Do not revalidate root loader on wishlist fetcher submissions or loads
  if (
    formAction?.includes('/api/wishlist') ||
    formAction?.includes('/api/wishlist-products') ||
    nextUrl.pathname.startsWith('/api/wishlist')
  ) {
    return false;
  }

  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  return false;
};

export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    { rel: 'icon', type: 'image/svg+xml', href: favicon },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const { storefront, env } = args.context;

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

export const GIFT_CARD_QUERY = `#graphql
  query GiftCardProduct(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      handle
      productType
      featuredImage {
        id
        url
        altText
        width
        height
      }
      variants(first: 10) {
        nodes {
          id
          title
          availableForSale
          price {
            amount
            currencyCode
          }
        }
      }
    }
  }
` as const;

/**
 * Load data necessary for rendering content above the fold.
 */
async function loadCriticalData({ context }: Route.LoaderArgs) {
  const { storefront } = context;

  const [header, giftCardResult] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu',
      },
    }),
    withTimeout(
      storefront.query(GIFT_CARD_QUERY, {
        cache: storefront.CacheLong(),
        variables: {
          handle: 'gift-card',
        },
      }),
      4000,
      'Storefront GIFT_CARD_QUERY',
      null,
    ).catch((error: Error) => {
      console.error('Failed to load gift card product:', error);
      return null;
    }),
  ]);

  return { header, giftCardProduct: giftCardResult?.product ?? null };
}

/**
 * Load data for rendering content below the fold or deferred.
 */
function loadDeferredData({ context }: Route.LoaderArgs) {
  const { storefront, customerAccount, cart, env } = context;

  // Defer shipping config (calls Admin API) so root loader is cheap and non-blocking
  const shippingConfig = fetchShippingConfig(env).catch((error: unknown) => {
    console.error('[root] shipping config deferred load error:', error);
    return null;
  });

  // defer the footer query (below the fold) with 4s timeout protection
  const footer = withTimeout(
    storefront.query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer',
      },
    }),
    4000,
    'Storefront FOOTER_QUERY',
    null,
  ).catch((error: Error) => {
    console.error(error);
    return null;
  });

  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
    shippingConfig,
  };
}

export function Layout({ children }: { children?: React.ReactNode }) {
  const nonce = useNonce();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={tailwindCss}></link>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const loaderData = useLoaderData<RootLoader>();
  const routeData = useRouteLoaderData<RootLoader>('root');
  const data = loaderData ?? routeData;

  if (!data) {
    return <Outlet />;
  }

  return (
    <Analytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <WishlistProvider isLoggedIn={data.isLoggedIn}>
        <PageLayout {...data}>
          <Outlet />
        </PageLayout>
      </WishlistProvider>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="route-error">
      <h1>Oops</h1>
      <h2>{errorStatus}</h2>
      {errorMessage && (
        <fieldset>
          <pre>{errorMessage}</pre>
        </fieldset>
      )}
    </div>
  );
}
