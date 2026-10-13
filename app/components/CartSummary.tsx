import type { CartApiQueryFragment } from 'storefrontapi.generated';
import type { CartLayout } from '~/components/CartMain';
import { CartForm, Money, type OptimisticCart } from '@shopify/hydrogen';
import { useId } from 'react';
import { getCartDiscounts, getTotalSavings } from '~/lib/discounts';

import { CartGiftCards } from '~/components/CartGiftCards';
import { CartGiftOptions } from '~/components/CartGiftOptions';

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

export function CartSummary({ cart, layout }: CartSummaryProps) {
  const className =
    layout === 'page' ? 'cart-summary-page' : 'cart-summary-aside';
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();

  const cartDiscounts = getCartDiscounts(cart);
  const totalSavings = getTotalSavings(cart);
  const hasSavings = totalSavings.amount > 0;
  const summaryCurrency =
    cart?.cost?.totalAmount?.currencyCode ??
    cart?.cost?.subtotalAmount?.currencyCode ??
    'USD';

  const appliedGiftCards = cart?.appliedGiftCards ?? [];
  const totalGiftCardAmount = appliedGiftCards.reduce((acc, card) => {
    const amt = Number.parseFloat(card.amountUsed?.amount ?? '0');
    return acc + (Number.isFinite(amt) ? amt : 0);
  }, 0);

  const totalAmountNum = Number.parseFloat(
    cart?.cost?.totalAmount?.amount ?? '0',
  );
  const estimatedTotalAfterGiftCard = Math.max(
    0,
    (Number.isFinite(totalAmountNum) ? totalAmountNum : 0) - totalGiftCardAmount,
  );

  return (
    <div aria-labelledby={summaryId} className={className}>
      <CartDiscounts
        discountCodes={cart?.discountCodes}
        discountsHeadingId={discountsHeadingId}
        discountCodeInputId={discountCodeInputId}
      />
      <CartGiftCards appliedGiftCards={cart?.appliedGiftCards} cart={cart} />
      <CartGiftOptions cart={cart} />
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
        {totalGiftCardAmount > 0 && (
          <>
            <dl role="group" className="gift-summary-row">
              <dt>Gift card</dt>
              <dd>-{formatMoney(totalGiftCardAmount, summaryCurrency)}</dd>
            </dl>
            <dl role="group" className="gift-estimated-total">
              <dt>Estimated total after gift card</dt>
              <dd>
                {formatMoney(estimatedTotalAfterGiftCard, summaryCurrency)}
              </dd>
            </dl>
            <p className="gift-confirmed-note">
              Final amount is confirmed at checkout.
            </p>
          </>
        )}
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

function CartCheckoutActions({ checkoutUrl }: { checkoutUrl?: string }) {
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
  const allCodes = discountCodes?.map(({ code }) => code) ?? [];

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

      <UpdateDiscountForm discountCodes={applicableCodes.map(({ code }) => code)}>
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


