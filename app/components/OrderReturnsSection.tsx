import React from 'react';
import {Image, Money} from '@shopify/hydrogen';
import type {ReturnNode} from '~/lib/returns';
import {
  RETURN_STATUS_MAP,
  getReturnReasonLabel,
  formatReturnDate,
} from '~/lib/returns';

export interface OrderReturnsSectionProps {
  returns: ReturnNode[];
}

export function OrderReturnsSection({returns}: OrderReturnsSectionProps) {
  if (!returns || returns.length === 0) {
    return null;
  }

  return (
    <section
      className="returns-section"
      aria-labelledby="order-returns-heading"
    >
      <div className="returns-section-header">
        <h3 id="order-returns-heading" className="returns-section-title">
          Returns History
        </h3>
        <span className="returns-section-count">
          {returns.length} {returns.length === 1 ? 'return' : 'returns'}
        </span>
      </div>

      <div className="returns-list">
        {returns.map((ret) => {
          const statusConfig =
            RETURN_STATUS_MAP[ret.status] || {
              label: ret.status,
              badgeClass: 'return-badge--neutral',
              tone: 'neutral',
              description: '',
            };

          const returnLineItems = ret.returnLineItems?.nodes || [];

          return (
            <article
              key={ret.id}
              className="return-card"
              aria-label={`Return ${ret.name || ret.id}`}
            >
              <div className="return-card-header">
                <div className="return-card-info">
                  <h4 className="return-card-name">
                    {ret.name || 'Return Request'}
                  </h4>
                  {ret.createdAt && (
                    <span className="return-card-date">
                      Requested on {formatReturnDate(ret.createdAt)}
                    </span>
                  )}
                  {ret.closedAt && (
                    <span className="return-card-date return-card-date--closed">
                      Closed on {formatReturnDate(ret.closedAt)}
                    </span>
                  )}
                </div>

                <div className="return-card-badge-wrap">
                  <span
                    className={`return-badge ${statusConfig.badgeClass}`}
                    role="status"
                    title={statusConfig.description}
                  >
                    <span
                      className="return-badge-dot"
                      aria-hidden="true"
                    />
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {statusConfig.description && (
                <p className="return-status-desc">{statusConfig.description}</p>
              )}

              {ret.status === 'DECLINED' && (
                <div
                  className="return-decline-banner"
                  role="alert"
                >
                  <strong>Return Status:</strong> This return request was declined by the merchant.
                </div>
              )}

              <div className="return-items-wrap">
                <h5 className="return-items-heading">Returned Items</h5>
                <ul className="return-items-list">
                  {returnLineItems.map((item) => {
                    const lineItem = item.lineItem;
                    const reasonText =
                      item.returnReasonDefinition?.name ||
                      getReturnReasonLabel(item.returnReason);

                    return (
                      <li key={item.id} className="return-item-row">
                        <div className="return-item-media">
                          {lineItem.image ? (
                            <Image
                              data={lineItem.image}
                              width={64}
                              height={64}
                              className="return-item-image"
                              alt={
                                lineItem.image.altText ||
                                lineItem.title ||
                                'Product thumbnail'
                              }
                            />
                          ) : (
                            <div
                              className="return-item-placeholder"
                              aria-hidden="true"
                            >
                              📦
                            </div>
                          )}
                        </div>

                        <div className="return-item-details">
                          <span className="return-item-title">
                            {lineItem.title}
                          </span>
                          {lineItem.variantTitle && (
                            <span className="return-item-variant">
                              {lineItem.variantTitle}
                            </span>
                          )}
                          <div className="return-item-meta">
                            <span className="return-item-qty">
                              Quantity: <strong>{item.quantity}</strong>
                            </span>
                            {lineItem.price && (
                              <span className="return-item-price">
                                <Money data={lineItem.price} />
                              </span>
                            )}
                          </div>
                          <div className="return-item-reason">
                            <span className="return-reason-tag">
                              Reason: {reasonText}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
