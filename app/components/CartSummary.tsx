import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {getCartDiscounts, getTotalSavings} from '~/lib/discounts';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function CartSummary({cart, layout}: CartSummaryProps) {
  const className =
    layout === 'page' ? 'cart-summary-page' : 'cart-summary-aside';
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();
  const giftCardHeadingId = useId();
  const giftCardInputId = useId();

  const cartDiscounts = getCartDiscounts(cart);
  const totalSavings = getTotalSavings(cart);
  const hasSavings = totalSavings.amount > 0;
  const summaryCurrency =
    cart?.cost?.totalAmount?.currencyCode ??
    cart?.cost?.subtotalAmount?.currencyCode ??
    'USD';

  return (
    <div aria-labelledby={summaryId} className={className}>
      <CartDiscounts
        discountCodes={cart?.discountCodes}
        discountsHeadingId={discountsHeadingId}
        discountCodeInputId={discountCodeInputId}
      />
      <CartGiftCard
        giftCardCodes={cart?.appliedGiftCards}
        giftCardHeadingId={giftCardHeadingId}
        giftCardInputId={giftCardInputId}
      />
      <div className="cart-summary-footer">
        <dl role="group" className="cart-subtotal">
          <dt id={summaryId}>Subtotal</dt>
          <dd>
            {cart?.cost?.subtotalAmount?.amount ? (
              <Money data={cart?.cost?.subtotalAmount} />
            ) : (
              '-'
            )}
          </dd>
        </dl>
        {cartDiscounts.map((discount) => (
          <dl key={discount.label} className="disc-cart-row" role="group">
            <dt>{discount.label}</dt>
            <dd>-{formatMoney(discount.amount, summaryCurrency)}</dd>
          </dl>
        ))}
        <dl role="group" className="cart-total">
          <dt>Total</dt>
          <dd>
            {cart?.cost?.totalAmount?.amount ? (
              <Money data={cart?.cost?.totalAmount} />
            ) : (
              '-'
            )}
          </dd>
        </dl>
        {hasSavings ? (
          <div className="disc-savings-banner" role="status">
            You saved {formatMoney(totalSavings.amount, totalSavings.currency)}{' '}
            🎉
          </div>
        ) : null}
        <CartCheckoutActions checkoutUrl={cart?.checkoutUrl} />
      </div>
    </div>
  );
}

function CartCheckoutActions({checkoutUrl}: {checkoutUrl?: string}) {
  if (!checkoutUrl) {
    return (
      <span className="cart-checkout-button is-disabled" aria-disabled="true">
        Checkout
      </span>
    );
  }

  return (
    <a className="cart-checkout-button" href={checkoutUrl} target="_self">
      Checkout
    </a>
  );
}

function CartDiscounts({
  discountCodes,
  discountsHeadingId,
  discountCodeInputId,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
  discountsHeadingId: string;
  discountCodeInputId: string;
}) {
  const applicableCodes =
    discountCodes?.filter((discount) => discount.applicable) ?? [];
  const inapplicableCodes =
    discountCodes?.filter((discount) => !discount.applicable) ?? [];
  const allCodes = discountCodes?.map(({code}) => code) ?? [];

  return (
    <section aria-label="Discounts">
      {applicableCodes.length > 0 ? (
        <dl>
          <div>
            <dt id={discountsHeadingId}>Discounts</dt>
            <dd className="disc-code-chips">
              {applicableCodes.map((discount) => {
                const remainingCodes = allCodes.filter(
                  (code) => code !== discount.code,
                );
                return (
                  <UpdateDiscountForm
                    key={discount.code}
                    discountCodes={remainingCodes}
                  >
                    <span
                      className="disc-chip disc-chip--code"
                      role="group"
                      aria-labelledby={discountsHeadingId}
                    >
                      <code>{discount.code}</code>
                      <button
                        type="submit"
                        aria-label={`Remove discount code ${discount.code}`}
                        className="disc-chip__remove"
                      >
                        ✕
                      </button>
                    </span>
                  </UpdateDiscountForm>
                );
              })}
            </dd>
          </div>
        </dl>
      ) : null}

      {inapplicableCodes.length > 0 ? (
        <p className="disc-code-invalid" role="alert">
          This code isn&apos;t valid for your cart
        </p>
      ) : null}

      <UpdateDiscountForm discountCodes={applicableCodes.map(({code}) => code)}>
        <div className="cart-code-field">
          <label htmlFor={discountCodeInputId} className="sr-only">
            Discount code
          </label>
          <input
            id={discountCodeInputId}
            type="text"
            name="discountCode"
            placeholder="Discount code"
          />
          <button type="submit" aria-label="Apply discount code">
            Apply
          </button>
        </div>
      </UpdateDiscountForm>
    </section>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {children}
    </CartForm>
  );
}

function CartGiftCard({
  giftCardCodes,
  giftCardHeadingId,
  giftCardInputId,
}: {
  giftCardCodes: CartApiQueryFragment['appliedGiftCards'] | undefined;
  giftCardHeadingId: string;
  giftCardInputId: string;
}) {
  const giftCardCodeInput = useRef<HTMLInputElement>(null);
  const removeButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const previousCardIdsRef = useRef<string[]>([]);
  const giftCardAddFetcher = useFetcher({key: 'gift-card-add'});
  const [removedCardIndex, setRemovedCardIndex] = useState<number | null>(null);

  useEffect(() => {
    if (giftCardAddFetcher.data) {
      if (giftCardCodeInput.current !== null) {
        giftCardCodeInput.current.value = '';
      }
    }
  }, [giftCardAddFetcher.data]);

  useEffect(() => {
    const currentCardIds = giftCardCodes?.map((card) => card.id) || [];

    if (removedCardIndex !== null && giftCardCodes) {
      const focusTargetIndex = Math.min(
        removedCardIndex,
        giftCardCodes.length - 1,
      );
      const focusTargetCard = giftCardCodes[focusTargetIndex];
      const focusButton = focusTargetCard
        ? removeButtonRefs.current.get(focusTargetCard.id)
        : null;

      if (focusButton) {
        focusButton.focus();
      } else if (giftCardCodeInput.current) {
        giftCardCodeInput.current.focus();
      }

      setRemovedCardIndex(null);
    }

    previousCardIdsRef.current = currentCardIds;
  }, [giftCardCodes, removedCardIndex]);

  const handleRemoveClick = (cardId: string) => {
    const index = previousCardIdsRef.current.indexOf(cardId);
    if (index !== -1) {
      setRemovedCardIndex(index);
    }
  };

  return (
    <section aria-label="Gift cards">
      {giftCardCodes && giftCardCodes.length > 0 && (
        <dl>
          <dt id={giftCardHeadingId}>Applied Gift Card(s)</dt>
          {giftCardCodes.map((giftCard) => (
            <dd key={giftCard.id} className="cart-discount">
              <RemoveGiftCardForm
                giftCardId={giftCard.id}
                lastCharacters={giftCard.lastCharacters}
                onRemoveClick={() => handleRemoveClick(giftCard.id)}
                buttonRef={(el: HTMLButtonElement | null) => {
                  if (el) {
                    removeButtonRefs.current.set(giftCard.id, el);
                  } else {
                    removeButtonRefs.current.delete(giftCard.id);
                  }
                }}
              >
                <code>***{giftCard.lastCharacters}</code>
                &nbsp;
                <Money data={giftCard.amountUsed} />
              </RemoveGiftCardForm>
            </dd>
          ))}
        </dl>
      )}

      <AddGiftCardForm fetcherKey="gift-card-add">
        <div className="cart-code-field">
          <label htmlFor={giftCardInputId} className="sr-only">
            Gift card code
          </label>
          <input
            id={giftCardInputId}
            type="text"
            name="giftCardCode"
            placeholder="Gift card code"
            ref={giftCardCodeInput}
          />
          <button
            type="submit"
            disabled={giftCardAddFetcher.state !== 'idle'}
            aria-label="Apply gift card code"
          >
            Apply
          </button>
        </div>
      </AddGiftCardForm>
    </section>
  );
}

function AddGiftCardForm({
  fetcherKey,
  children,
}: {
  fetcherKey?: string;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      fetcherKey={fetcherKey}
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesAdd}
    >
      {children}
    </CartForm>
  );
}

function RemoveGiftCardForm({
  giftCardId,
  lastCharacters,
  children,
  onRemoveClick,
  buttonRef,
}: {
  giftCardId: string;
  lastCharacters: string;
  children: React.ReactNode;
  onRemoveClick?: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesRemove}
      inputs={{
        giftCardCodes: [giftCardId],
      }}
    >
      {children}
      &nbsp;
      <button
        type="submit"
        aria-label={`Remove gift card ending in ${lastCharacters}`}
        onClick={onRemoveClick}
        ref={buttonRef}
      >
        Remove
      </button>
    </CartForm>
  );
}
