import React, {useState, useEffect, useRef} from 'react';
import {useFetcher} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {ReturnableNode} from '~/lib/returns';
import {RETURN_REASONS} from '~/lib/returns';

export interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderName: string;
  returnableItems: ReturnableNode[];
}

export interface ReturnActionResponse {
  success: boolean;
  returnId?: string;
  returnName?: string;
  errors?: string[];
}

interface ItemFormState {
  selected: boolean;
  quantity: number;
  reason: string;
}

export function ReturnRequestModal({
  isOpen,
  onClose,
  orderId,
  orderName,
  returnableItems,
}: ReturnRequestModalProps) {
  const fetcher = useFetcher<ReturnActionResponse>();
  const modalRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize line items state
  const [itemsState, setItemsState] = useState<Record<string, ItemFormState>>(() => {
    const initial: Record<string, ItemFormState> = {};
    for (const node of returnableItems) {
      initial[node.lineItem.id] = {
        selected: false,
        quantity: 1,
        reason: '',
      };
    }
    return initial;
  });

  const [customerNote, setCustomerNote] = useState('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  // Reset or initialize state when opening
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, ItemFormState> = {};
      for (const node of returnableItems) {
        initial[node.lineItem.id] = {
          selected: false,
          quantity: 1,
          reason: '',
        };
      }
      setItemsState(initial);
      setCustomerNote('');
      setClientErrors({});
    }
  }, [isOpen, returnableItems]);

  // Handle ESC key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Trap focus or focus modal container when opened
  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isSubmitting = fetcher.state !== 'idle';
  const isSuccess = Boolean(fetcher.data?.success);
  const serverErrors = fetcher.data?.errors || [];

  const handleToggleSelect = (lineItemId: string) => {
    setItemsState((prev) => ({
      ...prev,
      [lineItemId]: {
        ...prev[lineItemId],
        selected: !prev[lineItemId]?.selected,
      },
    }));
    // Clear item error if any
    setClientErrors((prev) => {
      const next = {...prev};
      delete next[lineItemId];
      delete next.form;
      return next;
    });
  };

  const handleQuantityChange = (lineItemId: string, qty: number, max: number) => {
    const validQty = Math.max(1, Math.min(qty, max));
    setItemsState((prev) => ({
      ...prev,
      [lineItemId]: {
        ...prev[lineItemId],
        quantity: validQty,
      },
    }));
  };

  const handleReasonChange = (lineItemId: string, reason: string) => {
    setItemsState((prev) => ({
      ...prev,
      [lineItemId]: {
        ...prev[lineItemId],
        reason,
      },
    }));
    setClientErrors((prev) => {
      const next = {...prev};
      delete next[lineItemId];
      delete next.form;
      return next;
    });
  };

  const validateClient = (): boolean => {
    const errors: Record<string, string> = {};
    const selectedEntries = Object.entries(itemsState).filter(
      ([, state]) => state.selected,
    );

    if (selectedEntries.length === 0) {
      errors.form = 'Please select at least one item to return.';
    }

    for (const [lineItemId, state] of selectedEntries) {
      const node = returnableItems.find((n) => n.lineItem.id === lineItemId);
      if (!node) continue;

      if (!state.quantity || state.quantity < 1) {
        errors[lineItemId] = 'Quantity must be at least 1.';
      } else if (state.quantity > node.quantity) {
        errors[lineItemId] = `Maximum returnable quantity is ${node.quantity}.`;
      }

      if (!state.reason) {
        errors[lineItemId] = 'Please select a reason for return.';
      }
    }

    if (customerNote.length > 300) {
      errors.note = 'Additional note cannot exceed 300 characters.';
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSuccess) return;

    if (!validateClient()) {
      return;
    }

    // Build payload for server action
    const selectedPayload = Object.entries(itemsState)
      .filter(([, state]) => state.selected)
      .map(([lineItemId, state]) => {
        const node = returnableItems.find((n) => n.lineItem.id === lineItemId);
        // Check if the reason matches a suggested definition ID
        const suggestedDefs =
          node?.lineItem.suggestedReturnReasonDefinitions?.nodes || [];
        const matchedDef = suggestedDefs.find(
          (d) => d.id === state.reason || d.handle === state.reason.toLowerCase(),
        );

        return {
          lineItemId,
          quantity: state.quantity,
          reason: state.reason,
          returnReasonDefinitionId: matchedDef ? matchedDef.id : undefined,
        };
      });

    const formData = new FormData();
    formData.set('intent', 'request_return');
    formData.set('orderId', orderId);
    formData.set('items', JSON.stringify(selectedPayload));
    formData.set('customerNote', customerNote.trim());

    void fetcher.submit(formData, {method: 'POST'});
  };

  return (
    <div
      className="return-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="return-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-modal-title"
        tabIndex={-1}
      >
        <div className="return-modal-header">
          <div>
            <h3 id="return-modal-title" className="return-modal-title">
              Request a Return
            </h3>
            <p className="return-modal-subtitle">
              Order {orderName}
            </p>
          </div>
          <button
            type="button"
            className="return-modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close return request modal"
          >
            ✕
          </button>
        </div>

        {isSuccess ? (
          <div className="return-modal-success" role="status">
            <div className="return-success-icon" aria-hidden="true">
              ✓
            </div>
            <h4>Return Request Submitted</h4>
            <p>
              Your return request for {orderName} has been received. Our team will
              review your request and update the status in your account.
            </p>
            {fetcher.data?.returnName && (
              <p className="return-success-ref">
                Return Reference: <strong>{fetcher.data.returnName}</strong>
              </p>
            )}
            <div className="return-modal-actions">
              <button
                type="button"
                className="return-btn return-btn--primary"
                onClick={onClose}
              >
                Close & View Order
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="return-modal-form">
            <div className="return-modal-body">
              {/* Server errors alert */}
              {serverErrors.length > 0 && (
                <div className="return-alert return-alert--error" role="alert">
                  <strong>Return request could not be processed:</strong>
                  <ul>
                    {serverErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form level validation alert */}
              {clientErrors.form && (
                <div className="return-alert return-alert--warning" role="alert">
                  {clientErrors.form}
                </div>
              )}

              <p className="return-modal-intro">
                Select the items and quantity you would like to return, and specify a reason for each:
              </p>

              {/* Line items list */}
              <div className="return-selection-list">
                {returnableItems.map((node) => {
                  const lineItem = node.lineItem;
                  const itemState = itemsState[lineItem.id] || {
                    selected: false,
                    quantity: 1,
                    reason: '',
                  };
                  const itemError = clientErrors[lineItem.id];
                  const suggestedDefs =
                    lineItem.suggestedReturnReasonDefinitions?.nodes || [];

                  return (
                    <div
                      key={lineItem.id}
                      className={`return-item-card ${
                        itemState.selected ? 'return-item-card--selected' : ''
                      } ${itemError ? 'return-item-card--error' : ''}`}
                    >
                      <div className="return-item-header">
                        <label className="return-item-checkbox-label">
                          <input
                            type="checkbox"
                            checked={itemState.selected}
                            onChange={() => handleToggleSelect(lineItem.id)}
                            disabled={isSubmitting}
                            className="return-item-checkbox"
                            aria-label={`Select ${lineItem.title} for return`}
                          />
                          <span className="return-item-checkbox-custom" />
                        </label>

                        <div className="return-item-thumb">
                          {lineItem.image ? (
                            <Image
                              data={lineItem.image}
                              width={60}
                              height={60}
                              alt={lineItem.image.altText || lineItem.title}
                            />
                          ) : (
                            <div className="return-thumb-placeholder">📦</div>
                          )}
                        </div>

                        <div className="return-item-info">
                          <span className="return-item-title-text">
                            {lineItem.title}
                          </span>
                          {lineItem.variantTitle && (
                            <span className="return-item-variant-text">
                              {lineItem.variantTitle}
                            </span>
                          )}
                          <div className="return-item-avail-badge">
                            Max returnable: {node.quantity}
                          </div>
                        </div>

                        {lineItem.price && (
                          <div className="return-item-price-col">
                            <Money data={lineItem.price} />
                          </div>
                        )}
                      </div>

                      {/* Config section for selected item */}
                      {itemState.selected && (
                        <div className="return-item-config">
                          <div className="return-item-config-row">
                            <div className="return-item-field">
                              <label
                                htmlFor={`qty-${lineItem.id}`}
                                className="return-field-label"
                              >
                                Quantity:
                              </label>
                              <select
                                id={`qty-${lineItem.id}`}
                                value={itemState.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    lineItem.id,
                                    parseInt(e.target.value, 10),
                                    node.quantity,
                                  )
                                }
                                disabled={isSubmitting}
                                className="return-field-select"
                              >
                                {Array.from(
                                  {length: node.quantity},
                                  (_, i) => i + 1,
                                ).map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="return-item-field return-item-field--grow">
                              <label
                                htmlFor={`reason-${lineItem.id}`}
                                className="return-field-label"
                              >
                                Reason for return: <span className="req">*</span>
                              </label>
                              <select
                                id={`reason-${lineItem.id}`}
                                value={itemState.reason}
                                onChange={(e) =>
                                  handleReasonChange(
                                    lineItem.id,
                                    e.target.value,
                                  )
                                }
                                disabled={isSubmitting}
                                className={`return-field-select ${
                                  itemError ? 'return-field--invalid' : ''
                                }`}
                                aria-required="true"
                              >
                                <option value="">Select a reason...</option>
                                {/* If product taxonomy has suggested definitions, list them */}
                                {suggestedDefs.length > 0 ? (
                                  <optgroup label="Suggested Reasons">
                                    {suggestedDefs.map((def) => (
                                      <option key={def.id} value={def.id}>
                                        {def.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                                <optgroup label="Standard Reasons">
                                  {RETURN_REASONS.map((r) => (
                                    <option key={r.value} value={r.value}>
                                      {r.label}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>
                          </div>

                          {itemError && (
                            <p className="return-field-error" role="alert">
                              {itemError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Customer Note textarea */}
              <div className="return-note-section">
                <div className="return-note-header">
                  <label
                    htmlFor="return-customer-note"
                    className="return-field-label"
                  >
                    Additional note (optional):
                  </label>
                  <span className="return-char-count">
                    {customerNote.length}/300
                  </span>
                </div>
                <textarea
                  id="return-customer-note"
                  ref={noteInputRef}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  maxLength={300}
                  disabled={isSubmitting}
                  placeholder="Provide any additional details or explanations for your return..."
                  rows={3}
                  className="return-note-textarea"
                />
                {clientErrors.note && (
                  <p className="return-field-error">{clientErrors.note}</p>
                )}
              </div>

              {/* Photo upload note */}
              {/* NOTE: Photo upload is out of scope because the Shopify Customer Account API
                  orderRequestReturn mutation does not support media attachments or file uploads. */}
              <div className="return-out-of-scope-notice">
                <span className="return-notice-icon">ℹ</span>
                <span>
                  Photo upload is not supported by Shopify Customer Account return requests.
                  If photos are required, our support team will reach out after receiving your request.
                </span>
              </div>
            </div>

            <div className="return-modal-footer">
              <button
                type="button"
                className="return-btn return-btn--secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="return-btn return-btn--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="return-spinner" aria-hidden="true" />
                    Submitting Return...
                  </>
                ) : (
                  'Submit Return Request'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
