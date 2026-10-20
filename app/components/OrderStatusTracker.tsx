import React from 'react';
import type {
  OrderStatusTrackerData,
  TrackerStep,
} from '~/lib/orderStatus';

export interface OrderStatusTrackerProps {
  tracker?: OrderStatusTrackerData | null;
  steps?: TrackerStep[];
  statusPillText?: string;
  estimatedDeliveryText?: string | null;
}

export function OrderStatusTracker({
  tracker,
  steps: directSteps,
  statusPillText: directPillText,
  estimatedDeliveryText: directEstText,
}: OrderStatusTrackerProps) {
  const steps = tracker?.steps ?? directSteps ?? [];
  const statusPillText = tracker?.statusPillText ?? directPillText ?? 'Order Placed';
  const estimatedDeliveryText =
    tracker?.estimatedDeliveryText !== undefined
      ? tracker.estimatedDeliveryText
      : directEstText ?? null;

  if (!steps.length) {
    return null;
  }

  // Derive tone for the top pill
  const isDelivered = steps.some(
    (s) => s.id === 'delivered' && s.isComplete,
  );
  const isShipped = steps.some(
    (s) => s.id === 'shipped' && s.isComplete,
  );

  let pillModifier = 'tracker-pill--default';
  if (isDelivered) {
    pillModifier = 'tracker-pill--delivered';
  } else if (isShipped) {
    pillModifier = 'tracker-pill--shipped';
  } else {
    pillModifier = 'tracker-pill--processing';
  }

  return (
    <section className="tracker-card" aria-label="Order Status Tracker">
      <div className="tracker-header">
        <div className="tracker-header-left">
          <span className={`tracker-pill ${pillModifier}`}>
            <span className="tracker-pill-dot" aria-hidden="true" />
            {statusPillText}
          </span>
          {estimatedDeliveryText && (
            <span className="tracker-chip">
              <svg
                className="tracker-chip-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{estimatedDeliveryText}</span>
            </span>
          )}
        </div>
      </div>

      <ol className="tracker-timeline" aria-label="Order status timeline">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          // Connect steps with a vertical line, green between completed steps, grey after.
          const isConnectorComplete =
            step.isComplete && !isLast && steps[index + 1]?.isComplete;

          return (
            <li
              key={step.id}
              className={`tracker-step ${
                step.isComplete
                  ? 'tracker-step--complete'
                  : 'tracker-step--upcoming'
              } ${step.isCurrent ? 'tracker-step--current' : ''}`}
              aria-current={step.isCurrent ? 'step' : undefined}
            >
              <div className="tracker-indicator">
                <span
                  className={`tracker-circle ${
                    step.isComplete
                      ? 'tracker-circle--complete'
                      : 'tracker-circle--upcoming'
                  }`}
                  aria-hidden="true"
                >
                  {step.isComplete && (
                    <svg
                      className="tracker-check-icon"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
                {!isLast && (
                  <span
                    className={`tracker-line ${
                      isConnectorComplete
                        ? 'tracker-line--complete'
                        : 'tracker-line--upcoming'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="tracker-content">
                <div className="tracker-title-row">
                  <span className="tracker-title">
                    {step.title}
                    {step.isCurrent && !step.isComplete && (
                      <span className="tracker-current-badge">In Progress</span>
                    )}
                  </span>
                  {step.date && (
                    <time className="tracker-date">{step.date}</time>
                  )}
                </div>

                <div className="tracker-desc-row">
                  <span className="tracker-desc">{step.description}</span>
                  {step.tracking?.url && (
                    <a
                      href={step.tracking.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tracker-track-link"
                      aria-label={`Track package with ${
                        step.tracking.carrier || 'carrier'
                      } (opens in new tab)`}
                    >
                      Track package
                      <svg
                        className="tracker-link-icon"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
