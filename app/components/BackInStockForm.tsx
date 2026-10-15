import {useState, useEffect} from 'react';
import {useFetcher} from 'react-router';
import type {BackInStockActionResponse} from '~/routes/api.back-in-stock';

export function BackInStockForm({variantId}: {variantId: string}) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const fetcher = useFetcher<BackInStockActionResponse>();
  const isSubmitting = fetcher.state === 'submitting';

  // Read localStorage for this specific variant on mount or variant change
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`bis_subscribed_${variantId}`);
      setIsSubscribed(stored === 'true');
    } catch {
      setIsSubscribed(false);
    }
    setIsOpen(false);
    setClientError(null);
  }, [variantId]);

  // Update subscription state when fetcher action succeeds
  useEffect(() => {
    if (fetcher.data?.success) {
      setIsSubscribed(true);
      try {
        localStorage.setItem(`bis_subscribed_${variantId}`, 'true');
      } catch {
        // Safe fallback if storage quota exceeded or disabled
      }
    }
  }, [fetcher.data, variantId]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setClientError(null);

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setClientError('Please enter a valid email address.');
      return;
    }

    void fetcher.submit(
      {email: trimmedEmail, variantId},
      {method: 'POST', action: '/api/back-in-stock'},
    );
  };

  const errorMessage =
    clientError ||
    (fetcher.data && !fetcher.data.success ? fetcher.data.error : null);
  const successMessage = fetcher.data?.success ? fetcher.data.message : null;

  if (isSubscribed) {
    return (
      <div className="bis-container">
        <button
          type="button"
          className="bis-btn bis-btn--subscribed"
          disabled
          aria-disabled="true"
        >
          <span className="bis-btn-icon" aria-hidden="true">
            ✓
          </span>{' '}
          We&apos;ll notify you
        </button>
        {successMessage ? (
          <p className="bis-status" role="status">
            {successMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bis-container">
      {!isOpen ? (
        <button
          type="button"
          className="bis-btn"
          onClick={() => {
            setIsOpen(true);
            setClientError(null);
          }}
          aria-expanded={isOpen}
        >
          Notify me when available
        </button>
      ) : (
        <div className="bis-inline-wrapper">
          <form className="bis-form" onSubmit={handleSubmit} noValidate>
            <div className="bis-header">
              <span className="bis-title">Notify me when back in stock</span>
              <button
                type="button"
                className="bis-close-btn"
                onClick={() => {
                  setIsOpen(false);
                  setClientError(null);
                }}
                aria-label="Close notification form"
              >
                ✕
              </button>
            </div>

            <div className="bis-input-group">
              <label
                htmlFor={`bis-email-${variantId}`}
                className="bis-label sr-only"
              >
                Email address
              </label>
              <input
                id={`bis-email-${variantId}`}
                type="email"
                name="email"
                className={`bis-input ${
                  errorMessage ? 'bis-input--error' : ''
                }`}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (clientError) setClientError(null);
                }}
                autoComplete="email"
                required
                disabled={isSubmitting}
              />
              <button
                type="submit"
                className="bis-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>

            {errorMessage ? (
              <p className="bis-alert" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <p className="bis-consent">
              We&apos;ll email you once when this is back in stock.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
