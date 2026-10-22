import {useState, useEffect} from 'react';
import {Link} from 'react-router';
import type {WishlistToastPayload} from '~/lib/useWishlist';

interface ToastItem extends WishlistToastPayload {
  key: string;
}

export function WishlistToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleToast(e: Event) {
      const customEvent = e as CustomEvent<WishlistToastPayload>;
      const detail = customEvent.detail;
      if (!detail || !detail.message) return;

      const item: ToastItem = {
        ...detail,
        key: detail.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        duration: detail.duration ?? 4500,
      };

      setToasts((prev) => [...prev.filter((t) => t.id !== item.id), item]);

      if (item.duration && item.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.key !== item.key));
        }, item.duration);
      }
    }

    window.addEventListener('wishlist:toast', handleToast);
    return () => {
      window.removeEventListener('wishlist:toast', handleToast);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="wish-toast-container"
      role="region"
      aria-label="Wishlist notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.key} className="wish-toast">
          <div className="wish-toast__icon" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="#ec4899"
              stroke="#ec4899"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div className="wish-toast__body">
            <span className="wish-toast__message">{toast.message}</span>
            {toast.linkUrl && toast.linkText && (
              <Link to={toast.linkUrl} className="wish-toast__link">
                {toast.linkText}
              </Link>
            )}
          </div>
          <button
            type="button"
            className="wish-toast__close"
            onClick={() => setToasts((prev) => prev.filter((t) => t.key !== toast.key))}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
