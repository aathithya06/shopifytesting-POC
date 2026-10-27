import {useState, useEffect, useMemo, useCallback} from 'react';
import {
  Link,
  useFetcher,
  useRouteError,
  isRouteErrorResponse,
} from 'react-router';
import {CartForm, Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/wishlist';
import {useWishlist} from '~/lib/useWishlist';
import type {
  WishlistProduct,
  WishlistProductsApiResponse,
} from '~/routes/api.wishlist-products';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'My Wishlist | Store'},
    {
      name: 'description',
      content: 'View and manage your saved wishlist products.',
    },
  ];
};

export async function loader() {
  // Cheap loader: product details and wishlist items are loaded client-side from the single source of truth
  return null;
}

export default function WishlistPage() {
  const {items, count, toggle, isLoggedIn} = useWishlist();
  const fetcher = useFetcher<WishlistProductsApiResponse>();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Normalize IDs to full GIDs
  const normalizedIds = useMemo(() => {
    return items
      .map((item) => {
        const id = item.productId.trim();
        if (id.startsWith('gid://shopify/Product/')) {
          return id;
        }
        const digits = id.replace(/\D/g, '');
        return digits ? `gid://shopify/Product/${digits}` : null;
      })
      .filter((id): id is string => Boolean(id));
  }, [items]);

  const idsKey = normalizedIds.join(',');

  const fetchProducts = useCallback(() => {
    if (normalizedIds.length === 0) return;
    const encoded = normalizedIds.map(encodeURIComponent).join(',');
    fetcher.load(`/api/wishlist-products?ids=${encoded}`);
  }, [normalizedIds, fetcher]);

  // Fetch product metadata after hydration
  useEffect(() => {
    if (!hasHydrated) return;
    if (normalizedIds.length > 0) {
      fetchProducts();
    }
  }, [hasHydrated, idsKey]);

  // Map fetched products to current items order
  const products = useMemo(() => {
    const list = fetcher.data?.products ?? [];
    const map = new Map<string, WishlistProduct>();
    for (const item of list) {
      map.set(item.id, item);
    }
    return normalizedIds
      .map((id) => map.get(id))
      .filter((p): p is WishlistProduct => Boolean(p));
  }, [fetcher.data?.products, normalizedIds]);

  const hasFetchError = Boolean(fetcher.data?.error);
  const isLoadingProducts =
    normalizedIds.length > 0 &&
    products.length === 0 &&
    fetcher.state === 'loading';

  return (
    <div className="wish-page">
      <div className="wish-page__header">
        <h1 className="wish-page__title">My Wishlist</h1>
        <p className="wish-page__subtitle">
          {count === 0
            ? 'No saved items'
            : `${count} saved ${count === 1 ? 'item' : 'items'}`}
        </p>
      </div>

      {/* Guest Banner */}
      {!isLoggedIn && (
        <aside
          className="wish-banner"
          aria-label="Guest wishlist sync notice"
        >
          <div className="wish-banner__content">
            <span className="wish-banner__icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div className="wish-banner__text">
              <strong className="wish-banner__headline">
                Sign in to sync your wishlist across devices
              </strong>
              <p className="wish-banner__subline">
                Your items are currently saved only to this browser session.
              </p>
            </div>
          </div>
          <Link to="/auth?redirect=/wishlist" className="wish-banner__btn">
            Sign in
          </Link>
        </aside>
      )}

      {/* Fetch Error + Retry State */}
      {hasFetchError && (
        <div className="wish-error-state" role="alert">
          <p className="wish-error-message">
            {fetcher.data?.error || 'Unable to load some product details.'}
          </p>
          <button
            type="button"
            className="wish-retry-btn"
            onClick={fetchProducts}
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Empty State: ONLY when items count is 0 */}
      {hasHydrated && count === 0 ? (
        <div className="wish-empty">
          <div className="wish-empty__icon" aria-hidden="true">
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h2 className="wish-empty__title">Your wishlist is empty</h2>
          <p className="wish-empty__description">
            Explore our collections and save items you love to find them anytime.
          </p>
          <Link to="/collections" className="wish-empty__cta">
            Continue shopping
          </Link>
        </div>
      ) : isLoadingProducts ? (
        /* Loading skeleton while products are in-flight */
        <div className="wish-grid" aria-busy="true">
          {normalizedIds.map((id) => (
            <div key={id} className="wish-card wish-card--skeleton">
              <div className="wish-skeleton-image" />
              <div className="wish-card__details">
                <div className="wish-skeleton-text" />
                <div className="wish-skeleton-price" />
                <div className="wish-skeleton-button" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Products Grid */
        <div className="wish-grid">
          {products.map((product) => {
            const firstVariant = product.variants?.nodes?.[0];
            const isAvailable = Boolean(firstVariant?.availableForSale);
            const image = product.featuredImage;

            return (
              <div key={product.id} className="wish-card">
                <button
                  type="button"
                  className="wish-card__remove"
                  onClick={() =>
                    toggle({productId: product.id, handle: product.handle})
                  }
                  aria-label={`Remove ${product.title} from wishlist`}
                  title="Remove from wishlist"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>

                <Link
                  to={`/products/${product.handle}`}
                  className="wish-card__image-link"
                >
                  {image ? (
                    <Image
                      alt={image.altText || product.title}
                      aspectRatio="1/1"
                      data={image}
                      sizes="(min-width: 45em) 300px, 100vw"
                      className="wish-card__image"
                    />
                  ) : (
                    <div className="wish-card__image-placeholder" />
                  )}
                </Link>

                <div className="wish-card__details">
                  <Link
                    to={`/products/${product.handle}`}
                    className="wish-card__title"
                  >
                    {product.title}
                  </Link>

                  <div className="wish-card__price">
                    <Money data={product.priceRange.minVariantPrice} />
                  </div>

                  <div className="wish-card__actions">
                    {isAvailable && firstVariant ? (
                      <CartForm
                        route="/cart"
                        inputs={{
                          lines: [
                            {
                              merchandiseId: firstVariant.id,
                              quantity: 1,
                            },
                          ],
                        }}
                        action={CartForm.ACTIONS.LinesAdd}
                      >
                        {(cartFetcher) => (
                          <button
                            type="submit"
                            className="wish-card__add-btn"
                            disabled={cartFetcher.state !== 'idle'}
                          >
                            {cartFetcher.state !== 'idle'
                              ? 'Adding...'
                              : 'Add to cart'}
                          </button>
                        )}
                      </CartForm>
                    ) : (
                      <button
                        type="button"
                        className="wish-card__add-btn wish-card__add-btn--disabled"
                        disabled
                      >
                        Out of stock
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'An error occurred while loading your wishlist.';

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data ?? errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="wish-page">
      <div className="wish-error-state" role="alert">
        <h2>Unable to display wishlist</h2>
        <p>{errorMessage}</p>
        <Link to="/" className="wish-retry-btn" style={{textDecoration: 'none'}}>
          Return to Home
        </Link>
      </div>
    </div>
  );
}
