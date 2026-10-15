import { CartForm, Money, type OptimisticCart } from '@shopify/hydrogen';
import { useMemo } from 'react';
import { useRouteLoaderData } from 'react-router';
import type { CartApiQueryFragment } from 'storefrontapi.generated';
import type { RootLoader } from '~/root';

export const GIFT_CARD_HANDLE = 'gift-card';

type GiftCardVariant = NonNullable<
  NonNullable<
    NonNullable<ReturnType<typeof useRouteLoaderData<RootLoader>>>['giftCardProduct']
  >['variants']['nodes'][number]
>;

export function hasGiftCardInCart(
    cart: OptimisticCart<CartApiQueryFragment | null> | null | undefined,
): boolean {
    const lines = cart?.lines?.nodes ?? [];
    return lines.some((line) => {
        if (!('merchandise' in line) || !line.merchandise) return false;
        const merchandise = line.merchandise;
        if (!('product' in merchandise) || !merchandise.product) return false;
        const product = merchandise.product;
        const isGiftType =
            'productType' in product &&
            typeof product.productType === 'string' &&
            product.productType.toLowerCase() === 'giftcard';
        const isGiftHandle = product.handle === GIFT_CARD_HANDLE;
        return isGiftType || isGiftHandle;
    });
}

export function GiftCardAddOn({
    cart,
}: {
    cart: OptimisticCart<CartApiQueryFragment | null> | null | undefined;
}) {
    const rootData = useRouteLoaderData<RootLoader>('root');
    const giftCardProduct = rootData?.giftCardProduct;

    const alreadyInCart = useMemo(() => hasGiftCardInCart(cart), [cart]);

    if (alreadyInCart || !giftCardProduct) {
        return null;
    }

    const variants = (giftCardProduct.variants?.nodes ?? []).filter(
        (variant): variant is GiftCardVariant =>
            Boolean(variant && variant.availableForSale),
    );

    if (variants.length === 0) {
        return null;
    }

    return (
        <section
            className="gift-card-addon"
            aria-labelledby="gift-card-addon-heading"
        >
            <div className="gift-card-addon__header">
                <div className="gift-card-addon__icon" aria-hidden="true">
                    🎁
                </div>
                <div>
                    <h3 id="gift-card-addon-heading" className="gift-card-addon__title">
                        Add a gift card
                    </h3>
                    <p className="gift-card-addon__subtitle">
                        Send the perfect gift instantly
                    </p>
                </div>
            </div>

            <div className="gift-card-addon__denominations">
                {variants.map((variant) => (
                    <CartForm
                        key={variant.id}
                        route="/cart"
                        action={CartForm.ACTIONS.LinesAdd}
                        inputs={{
                            lines: [
                                {
                                    merchandiseId: variant.id,
                                    quantity: 1,
                                },
                            ],
                        }}
                    >
                        {(fetcher) => {
                            const isAdding = fetcher.state !== 'idle';
                            return (
                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="gift-card-addon__chip"
                                    aria-label={`Add ${variant.title} gift card`}
                                >
                                    <span className="gift-card-addon__amount">
                                        <Money data={variant.price} />
                                    </span>
                                    <span className="gift-card-addon__plus" aria-hidden="true">
                                        +
                                    </span>
                                </button>
                            );
                        }}
                    </CartForm>
                ))}
            </div>
        </section>
    );
}
