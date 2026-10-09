import {Image, Money} from '@shopify/hydrogen';
import {useEffect, useMemo, useRef} from 'react';
import {useFetcher, useParams} from 'react-router';
import {useAside} from '~/components/Aside';
import {AddToCartButton} from '~/components/AddToCartButton';
import type {CartLine} from '~/components/CartLineItem';
import type {CartRecommendationsResult} from '~/routes/($locale).api.recommendations';

/**
 * Loads productRecommendations for the cart's products when the drawer opens.
 * Products already in the cart are left out. Each card can be added in one click.
 */
export function CartRecommendations({lines}: {lines: CartLine[]}) {
  const {type} = useAside();
  const {locale} = useParams();
  const fetcher = useFetcher<CartRecommendationsResult>();
  const productIds = useMemo(() => getCartProductIds(lines), [lines]);
  const productIdsKey = productIds.join(',');
  const loadedForOpen = useRef(false);

  useEffect(() => {
    if (type !== 'cart') {
      loadedForOpen.current = false;
      return;
    }
    if (!productIdsKey || loadedForOpen.current) return;

    loadedForOpen.current = true;
    const prefix = locale ? `/${locale}` : '';
    void fetcher.load(
      `${prefix}/api/recommendations?productIds=${encodeURIComponent(productIdsKey)}`,
    );
    // fetcher.load is stable enough; the fetcher object itself changes every state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, productIdsKey, locale]);

  const inCart = useMemo(() => new Set(productIds), [productIds]);
  const products = (fetcher.data?.products ?? []).filter(
    (product) => !inCart.has(product.id),
  );
  const loading = fetcher.state !== 'idle' && products.length === 0;

  if (!productIdsKey || (!loading && products.length === 0)) return null;

  return (
    <section className="cart-recommendations" aria-labelledby="cart-recommendations">
      <h2 id="cart-recommendations">You may also like</h2>
      {loading ? (
        <ul className="cart-recommendations-list" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <li key={item} className="cart-recommendation is-loading" />
          ))}
        </ul>
      ) : (
        <ul className="cart-recommendations-list">
          {products.map((product) => (
            <CartRecommendationCard key={product.id} product={product} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CartRecommendationCard({
  product,
}: {
  product: CartRecommendationsResult['products'][number];
}) {
  const variant = product.selectedOrFirstAvailableVariant;
  if (!variant) return null;

  const image = variant.image ?? product.featuredImage;

  return (
    <li className="cart-recommendation">
      {image ? (
        <Image
          alt={image.altText || product.title}
          data={image}
          aspectRatio="1/1"
          width={96}
          height={96}
          loading="lazy"
        />
      ) : (
        <span className="cart-recommendation-fallback" aria-hidden="true" />
      )}
      <p className="cart-recommendation-title">{product.title}</p>
      <p className="cart-recommendation-price">
        <Money data={variant.price} />
      </p>
      <AddToCartButton
        ariaLabel={`Add ${product.title} to cart`}
        className="cart-recommendation-add"
        lines={[
          {
            merchandiseId: variant.id,
            quantity: 1,
            selectedVariant: {
              id: variant.id,
              availableForSale: variant.availableForSale,
              title: variant.title,
              image,
              price: variant.price,
              selectedOptions: variant.selectedOptions,
              product: {
                id: product.id,
                handle: product.handle,
                title: product.title,
                vendor: product.vendor,
              },
            },
          },
        ]}
      >
        + Add
      </AddToCartButton>
    </li>
  );
}

function getCartProductIds(lines: CartLine[]) {
  const ids: string[] = [];
  const seen = new Set<string>();

  const visit = (line: CartLine) => {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      return;
    }
    const id = line.merchandise?.product?.id;
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  };

  for (const line of lines) visit(line);
  return ids;
}
