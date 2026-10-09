import {useOptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/components/CartLineItem';
import {CartRecommendations} from '~/components/CartRecommendations';
import {FreeShippingBar} from '~/components/FreeShippingBar';
import {CartSummary} from './CartSummary';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

export type LineItemChildrenMap = {[parentId: string]: CartLine[]};
/** Returns a map of all line items and their children. */
function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const lineChildren = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childIds] of Object.entries(lineChildren)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childIds);
      }
    }
  }
  return children;
}
/** Drawer title, including the optimistic item count. */
export function CartDrawerHeading({
  cart,
}: {
  cart: CartApiQueryFragment | null;
}) {
  const optimisticCart = useOptimisticCart(cart);
  const count = optimisticCart?.totalQuantity ?? 0;
  return <>Your Cart ({count})</>;
}

/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog.
 */
export function CartMain({layout, cart: originalCart}: CartMainProps) {
  // The useOptimisticCart hook applies pending actions to the cart
  // so the user immediately sees feedback when they modify the cart.
  const cart = useOptimisticCart(originalCart);

  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);

  return (
    <section
      className={`cart-main cart-main-${layout}`}
      aria-label={layout === 'page' ? 'Cart page' : 'Cart drawer'}
    >
      {cartHasItems ? (
        <div className="cart-details">
          <p id="cart-lines" className="sr-only">
            Line items
          </p>
          <div className="cart-lines">
            <FreeShippingBar cart={cart} />
            <ul aria-labelledby="cart-lines">
              {(cart?.lines?.nodes ?? []).map((line) => {
                // we do not render non-parent lines at the root of the cart
                if (
                  'parentRelationship' in line &&
                  line.parentRelationship?.parent
                ) {
                  return null;
                }
                return (
                  <CartLineItem
                    key={line.id}
                    line={line}
                    layout={layout}
                    childrenMap={childrenMap}
                  />
                );
              })}
            </ul>
            {layout === 'aside' ? (
              <CartRecommendations lines={cart?.lines?.nodes ?? []} />
            ) : null}
          </div>
          <CartSummary cart={cart} layout={layout} />
        </div>
      ) : (
        <CartEmpty layout={layout} />
      )}
    </section>
  );
}

function CartEmpty({layout}: {layout?: CartMainProps['layout']}) {
  const {close} = useAside();
  return (
    <div className="cart-empty">
      <p>Your cart is empty</p>
      <Link
        className="cart-empty-cta"
        to="/collections"
        onClick={() => {
          if (layout === 'aside') close();
        }}
        prefetch="viewport"
      >
        Continue shopping
      </Link>
    </div>
  );
}
