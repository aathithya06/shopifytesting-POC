import type { CartApiQueryFragment } from 'storefrontapi.generated';
import { CartForm, Money } from '@shopify/hydrogen';
import { useEffect, useId, useRef, useState } from 'react';
import { hasGiftCardInCart } from '~/components/GiftCardAddOn';

export function CartGiftCards({
    appliedGiftCards,
    cart,
}: {
    appliedGiftCards?: CartApiQueryFragment['appliedGiftCards'];
    cart: Parameters<typeof hasGiftCardInCart>[0];
}) {
    const headingId = useId();
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [lastSubmittedCode, setLastSubmittedCode] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const appliedCards = appliedGiftCards ?? [];
    const containsGiftCard = hasGiftCardInCart(cart);

    return (
        <section className="gift-cards-section" aria-labelledby={headingId}>
            {appliedCards.length > 0 && (
                <dl className="gift-cards-list">
                    <dt id={headingId} className="gift-cards-title">
                        Applied Gift Card(s)
                    </dt>
                    <dd className="gift-chips">
                        {appliedCards.map((card) => {
                            const lastChars = card.lastCharacters ?? '••••';
                            const balance = card.balance;

                            return (
                                <div key={card.id} className="gift-chip-wrapper">
                                    <div className="gift-chip">
                                        <span className="gift-chip__icon" aria-hidden="true">
                                            💳
                                        </span>
                                        <span className="gift-chip__label">
                                            Gift card •••• {lastChars}
                                        </span>
                                        <span className="gift-chip__amount">
                                            -{card.amountUsed ? <Money data={card.amountUsed} /> : null}
                                        </span>
                                        <CartForm
                                            route="/cart"
                                            action={CartForm.ACTIONS.GiftCardCodesRemove}
                                            inputs={{
                                                giftCardCodes: [card.id],
                                            }}
                                        >
                                            <button
                                                type="submit"
                                                aria-label={`Remove gift card ending in ${lastChars}`}
                                                className="gift-chip__remove"
                                            >
                                                ✕
                                            </button>
                                        </CartForm>
                                    </div>
                                    {balance && (
                                        <div className="gift-chip__balance">
                                            Balance: <Money data={balance} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </dd>
                </dl>
            )}

            {containsGiftCard ? (
                <p className="gift-code-notice" role="status">
                    Gift cards can&apos;t be used to buy gift cards.
                </p>
            ) : (
                <CartForm
                    route="/cart"
                    action={CartForm.ACTIONS.GiftCardCodesUpdate}
                >
                    {(fetcher) => {
                        // Track submission completion to check if the code was applied
                        // eslint-disable-next-line react-hooks/rules-of-hooks
                        useEffect(() => {
                            if (lastSubmittedCode && fetcher.state === 'idle' && fetcher.data) {
                                const cartData = fetcher.data.cart as CartApiQueryFragment | undefined;
                                const newCards = cartData?.appliedGiftCards ?? appliedCards;
                                const codeSuffix = lastSubmittedCode.slice(-4).toUpperCase();
                                const matched = newCards.some(
                                    (c) =>
                                        c.lastCharacters?.toUpperCase() === codeSuffix ||
                                        c.lastCharacters?.toUpperCase() === lastSubmittedCode.toUpperCase(),
                                );

                                if (matched) {
                                    if (inputRef.current) inputRef.current.value = '';
                                    setErrorMessage(null);
                                } else {
                                    setErrorMessage('This gift card code is invalid or has no balance.');
                                }
                                setLastSubmittedCode(null);
                            }
                        }, [fetcher.state, fetcher.data]);

                        const isSubmitting = fetcher.state !== 'idle';

                        return (
                            <div className="gift-code-form">
                                <div className="cart-code-field">
                                    <label htmlFor={inputId} className="sr-only">
                                        Gift card code
                                    </label>
                                    <input
                                        ref={inputRef}
                                        id={inputId}
                                        type="text"
                                        name="giftCardCode"
                                        placeholder="Gift card code"
                                        autoComplete="off"
                                        onChange={() => {
                                            if (errorMessage) setErrorMessage(null);
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        onClick={() => {
                                            const code = inputRef.current?.value?.trim();
                                            if (code) {
                                                setLastSubmittedCode(code);
                                                setErrorMessage(null);
                                            }
                                        }}
                                        aria-label="Apply gift card code"
                                    >
                                        {isSubmitting ? 'Applying…' : 'Apply'}
                                    </button>
                                </div>
                                {errorMessage && (
                                    <p className="gift-code-error" role="alert">
                                        {errorMessage}
                                    </p>
                                )}
                            </div>
                        );
                    }}
                </CartForm>
            )}
        </section>
    );
}
