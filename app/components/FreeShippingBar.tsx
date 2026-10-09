import {useEffect, useId, useRef, useState, type CSSProperties} from 'react';
import type {OptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {getDeliveryEstimate, getShippingProgress} from '~/lib/shipping';
import {useShippingConfig} from '~/lib/useShippingConfig';

type FreeShippingBarProps = {
  cart: OptimisticCart<CartApiQueryFragment | null> | null;
};

const MILESTONES = [0, 50, 100] as const;
const CONFETTI = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export function FreeShippingBar({cart}: FreeShippingBarProps) {
  const config = useShippingConfig();
  const progress = getShippingProgress(cart, config);
  const headlineId = useId();
  const [celebrate, setCelebrate] = useState(false);
  const [estimate, setEstimate] = useState<{start: string; end: string} | null>(
    null,
  );
  const wasUnlocked = useRef(false);
  const unlocked = progress.isValid && progress.isUnlocked;

  useEffect(() => {
    if (unlocked && !wasUnlocked.current) setCelebrate(true);
    if (!unlocked) setCelebrate(false);
    wasUnlocked.current = unlocked;
  }, [unlocked]);

  useEffect(() => {
    setEstimate(getDeliveryEstimate(config));
  }, [config]);

  if (!progress.isValid) return null;

  const money = (amount: number) => formatMoney(amount, progress.currency);
  const deliveryLabel = estimate
    ? estimate.start === estimate.end
      ? estimate.start
      : `${estimate.start} - ${estimate.end}`
    : null;

  return (
    <section
      className={`fs-bar${unlocked ? ' is-unlocked' : ''}${
        celebrate ? ' is-celebrating' : ''
      }`}
      aria-labelledby={headlineId}
    >
      {celebrate ? (
        <div className="fs-bar__confetti" aria-hidden="true">
          {CONFETTI.map((piece) => (
            <span key={piece} />
          ))}
        </div>
      ) : null}
      <div className="fs-bar__top">
        <span className="fs-bar__pill">FREE SHIPPING</span>
        <span className="fs-bar__rule">On orders {money(progress.threshold)}+</span>
      </div>
      <p id={headlineId} className="fs-bar__headline" aria-live="polite">
        {unlocked ? (
          "You've unlocked FREE shipping!"
        ) : (
          <>
            You're <b>{money(progress.remaining)}</b> away from FREE shipping
          </>
        )}
      </p>
      <div
        className="fs-bar__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.percent)}
        aria-label="Free shipping progress"
      >
        <div
          className="fs-bar__fill"
          style={{width: `${progress.percent}%`}}
        />
        <span
          className="fs-bar__truck"
          style={
            {
              '--fs-truck': `${progress.percent}%`,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          🚚
        </span>
      </div>
      <div className="fs-bar__milestones">
        {MILESTONES.map((mark) => {
          const reached = progress.percent >= mark;
          const isGoal = mark === 100;
          const amount =
            mark === 0
              ? 0
              : mark === 50
                ? progress.threshold / 2
                : progress.threshold;
          return (
            <div
              key={mark}
              className={`fs-bar__milestone fs-bar__milestone--${mark}`}
            >
              <span
                className={`fs-bar__dot${reached ? ' is-reached' : ''}${
                  isGoal && unlocked ? ' is-check' : ''
                }`}
              >
                {isGoal && unlocked ? '✓' : null}
              </span>
              <span className="fs-bar__milestone-label">{money(amount)}</span>
            </div>
          );
        })}
      </div>
      {deliveryLabel ? (
        <p className="fs-bar__delivery">
          <PackageIcon />
          Estimated delivery: {deliveryLabel}
        </p>
      ) : null}
    </section>
  );
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

function PackageIcon() {
  return (
    <svg
      className="fs-bar__package"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 12 3.5 7.5M12 12l8.5-4.5M12 12v9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

