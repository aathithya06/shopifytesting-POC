import {useState, useEffect} from 'react';
import {useWishlist} from '~/lib/useWishlist';

interface WishlistButtonProps {
  productId: string;
  handle: string;
  className?: string;
  showLabel?: boolean;
}

export function WishlistButton({
  productId,
  handle,
  className = '',
  showLabel = false,
}: WishlistButtonProps) {
  const {has, toggle} = useWishlist();
  const isWishlisted = has(productId);
  const [isPopping, setIsPopping] = useState(false);

  useEffect(() => {
    if (isPopping) {
      const timer = setTimeout(() => setIsPopping(false), 350);
      return () => clearTimeout(timer);
    }
  }, [isPopping]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPopping(true);
    toggle({productId, handle});
  };

  const label = isWishlisted ? 'Remove from wishlist' : 'Add to wishlist';

  return (
    <button
      type="button"
      className={`wish-btn ${isWishlisted ? 'wish-btn--active' : ''} ${isPopping ? 'wish-pop' : ''} ${className}`.trim()}
      aria-pressed={isWishlisted}
      aria-label={label}
      title={label}
      onClick={handleClick}
    >
      <span className="wish-btn__icon" aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={isWishlisted ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </span>
      {showLabel && (
        <span className="wish-btn__label">
          {isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
        </span>
      )}
    </button>
  );
}
