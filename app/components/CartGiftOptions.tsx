import { CartForm, type OptimisticCart } from '@shopify/hydrogen';
import { useEffect, useId, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import type { CartApiQueryFragment } from 'storefrontapi.generated';

const MAX_MESSAGE_LENGTH = 200;

export function CartGiftOptions({
    cart,
}: {
    cart: OptimisticCart<CartApiQueryFragment | null> | null | undefined;
}) {
    const panelId = useId();
    const toggleId = useId();
    const messageId = useId();
    const wrapId = useId();

    const fetcher = useFetcher({ key: 'gift-options-update' });

    // Helper to extract initial values from cart
    const initialGift = cart?.attributes?.some(
        (attr) => attr.key === '_gift' && attr.value === 'true',
    ) ?? false;

    const initialWrap = cart?.attributes?.some(
        (attr) => attr.key === 'gift_wrap' && attr.value === 'true',
    ) ?? false;

    const initialMessage = (() => {
        const rawNote = cart?.note ?? '';
        const prefix = 'Gift message: ';
        if (rawNote.startsWith(prefix)) {
            return rawNote.slice(prefix.length);
        }
        return rawNote;
    })();

    const [isGift, setIsGift] = useState<boolean>(initialGift);
    const [giftWrap, setGiftWrap] = useState<boolean>(initialWrap);
    const [giftMessage, setGiftMessage] = useState<string>(initialMessage);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialMount = useRef(true);
    const lastSavedRef = useRef({
        isGift: initialGift,
        giftWrap: initialWrap,
        giftMessage: initialMessage,
    });

    // Keep in sync if cart updates from external sources (e.g. page refresh)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
    }, []);

    const saveOptions = (
        nextIsGift: boolean,
        nextWrap: boolean,
        nextMessage: string,
    ) => {
        setSaveStatus('saving');

        // Preserve existing non-gift attributes
        const existingAttrs = (cart?.attributes ?? [])
            .filter((a) => a.key !== '_gift' && a.key !== 'gift_wrap')
            .map((a) => ({ key: a.key, value: a.value ?? '' }));

        const attributes = nextIsGift
            ? [
                ...existingAttrs,
                { key: '_gift', value: 'true' },
                { key: 'gift_wrap', value: nextWrap ? 'true' : 'false' },
            ]
            : [
                ...existingAttrs,
                { key: '_gift', value: '' },
                { key: 'gift_wrap', value: '' },
            ];

        const note = nextIsGift
            ? (nextMessage.trim() ? `Gift message: ${nextMessage.trim()}` : '')
            : '';

        const payload = {
            action: CartForm.ACTIONS.AttributesUpdateInput,
            inputs: {
                attributes,
                note,
            },
        };

        fetcher.submit(
            { [CartForm.INPUT_NAME]: JSON.stringify(payload) },
            { method: 'POST', action: '/cart' },
        );

        lastSavedRef.current = {
            isGift: nextIsGift,
            giftWrap: nextWrap,
            giftMessage: nextMessage,
        };
    };

    // Monitor fetcher state
    useEffect(() => {
        if (fetcher.state === 'idle') {
            if (fetcher.data?.errors && fetcher.data.errors.length > 0) {
                setSaveStatus('error');
            } else if (saveStatus === 'saving') {
                setSaveStatus('saved');
                const timer = setTimeout(() => {
                    setSaveStatus('idle');
                }, 2000);
                return () => clearTimeout(timer);
            }
        }
    }, [fetcher.state, fetcher.data, saveStatus]);

    const scheduleSave = (
        nextIsGift: boolean,
        nextWrap: boolean,
        nextMessage: string,
    ) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            saveOptions(nextIsGift, nextWrap, nextMessage);
        }, 500);
    };

    const handleToggle = (checked: boolean) => {
        setIsGift(checked);
        if (!checked) {
            // Clear message and wrap when turned off
            setGiftWrap(false);
            setGiftMessage('');
            scheduleSave(false, false, '');
        } else {
            scheduleSave(true, giftWrap, giftMessage);
        }
    };

    const handleWrapChange = (checked: boolean) => {
        setGiftWrap(checked);
        scheduleSave(isGift, checked, giftMessage);
    };

    const handleMessageChange = (value: string) => {
        const truncated = value.slice(0, MAX_MESSAGE_LENGTH);
        setGiftMessage(truncated);
        scheduleSave(isGift, giftWrap, truncated);
    };

    return (
        <section className="gift-options" aria-label="Gift options">
            <div className="gift-options__header">
                <label htmlFor={toggleId} className="gift-options__toggle-label">
                    <input
                        id={toggleId}
                        type="checkbox"
                        className="gift-options__checkbox-input sr-only"
                        checked={isGift}
                        onChange={(e) => handleToggle(e.target.checked)}
                        aria-expanded={isGift}
                        aria-controls={panelId}
                    />
                    <span className="gift-toggle-switch" aria-hidden="true">
                        <span className="gift-toggle-knob" />
                    </span>
                    <span className="gift-options__title">
                        <span className="gift-options__icon" aria-hidden="true">
                            🎁
                        </span>
                        This is a gift
                    </span>
                </label>

                {saveStatus === 'saving' && (
                    <span className="gift-status gift-status--saving" aria-live="polite">
                        Saving…
                    </span>
                )}
                {saveStatus === 'saved' && (
                    <span className="gift-status gift-status--saved" aria-live="polite">
                        ✓ Saved
                    </span>
                )}
                {saveStatus === 'error' && (
                    <span className="gift-status gift-status--error" role="alert">
                        Failed to save
                    </span>
                )}
            </div>

            {isGift && (
                <div id={panelId} className="gift-options__panel">
                    <div className="gift-field">
                        <div className="gift-field__header">
                            <label htmlFor={messageId} className="gift-field__label">
                                Gift message
                            </label>
                            <span
                                className={`gift-counter ${giftMessage.length >= MAX_MESSAGE_LENGTH ? 'is-limit' : ''}`}
                                aria-live="polite"
                            >
                                {giftMessage.length}/{MAX_MESSAGE_LENGTH}
                            </span>
                        </div>
                        <textarea
                            id={messageId}
                            rows={3}
                            value={giftMessage}
                            maxLength={MAX_MESSAGE_LENGTH}
                            placeholder="Write a personalized note for the recipient..."
                            className="gift-textarea"
                            onChange={(e) => handleMessageChange(e.target.value)}
                        />
                    </div>

                    <div className="gift-field">
                        <label htmlFor={wrapId} className="gift-wrap-label">
                            <input
                                id={wrapId}
                                type="checkbox"
                                checked={giftWrap}
                                className="gift-checkbox"
                                onChange={(e) => handleWrapChange(e.target.checked)}
                            />
                            <span className="gift-wrap-text">
                                <strong>Add gift wrapping</strong>
                                <span className="gift-wrap-sub">
                                    Includes a decorative box & ribbon
                                </span>
                            </span>
                        </label>
                    </div>
                </div>
            )}
        </section>
    );
}
