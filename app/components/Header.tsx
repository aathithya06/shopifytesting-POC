import {Suspense, useState, useRef, useEffect} from 'react';
import {Await, Form, NavLink, useAsyncValue, useLocation} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {useWishlist} from '~/lib/useWishlist';
import {clearLocal} from '~/lib/wishlist';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <header className="header">
      <NavLink prefetch="intent" to="/" style={activeLinkStyle} end>
        <strong>{shop.name}</strong>
      </NavLink>
      <HeaderMenu
        menu={menu}
        viewport="desktop"
        primaryDomainUrl={header.shop.primaryDomain.url}
        publicStoreDomain={publicStoreDomain}
      />
      <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
    </header>
  );
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
}) {
  const className = `header-menu-${viewport}`;
  const {close} = useAside();

  return (
    <nav className={className} role="navigation">
      {viewport === 'mobile' && (
        <NavLink
          end
          onClick={close}
          prefetch="intent"
          style={activeLinkStyle}
          to="/"
        >
          Home
        </NavLink>
      )}
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
        if (!item.url) return null;

        // if the url is internal, we strip the domain
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        return (
          <NavLink
            className="header-menu-item"
            end
            key={item.id}
            onClick={close}
            prefetch="intent"
            style={activeLinkStyle}
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

function HeaderCtas({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  const location = useLocation();
  const currentPath = location.pathname + location.search;
  const authUrl = currentPath.startsWith('/auth')
    ? '/auth'
    : `/auth?redirect=${encodeURIComponent(currentPath)}`;

  return (
    <nav className="header-ctas" role="navigation">
      <HeaderMenuMobileToggle />
      <Suspense
        fallback={
          <NavLink prefetch="intent" to={authUrl} style={activeLinkStyle}>
            Sign in
          </NavLink>
        }
      >
        <Await
          resolve={Promise.all([isLoggedIn, cart])}
          errorElement={
            <NavLink prefetch="intent" to={authUrl} style={activeLinkStyle}>
              Sign in
            </NavLink>
          }
        >
          {([resolvedLoggedIn, resolvedCart]) => {
            if (!resolvedLoggedIn) {
              return (
                <NavLink prefetch="intent" to={authUrl} style={activeLinkStyle}>
                  Sign in
                </NavLink>
              );
            }
            const firstName = resolvedCart?.buyerIdentity?.customer?.firstName;
            const greeting = firstName ? `Hi, ${firstName}` : 'Account';
            return <AccountDropdown greeting={greeting} />;
          }}
        </Await>
      </Suspense>
      <SearchToggle />
      <WishlistToggle />
      <CartToggle cart={cart} />
    </nav>
  );
}

function AccountDropdown({greeting}: {greeting: string}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="account-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="account-dropdown-toggle reset"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{greeting}</span>
        <span className="account-dropdown-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {isOpen && (
        <div className="account-dropdown-menu" role="menu">
          <NavLink
            to="/account"
            className="account-dropdown-item"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            Account
          </NavLink>
          <NavLink
            to="/account/orders"
            className="account-dropdown-item"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            Orders
          </NavLink>
          <Form
            method="POST"
            action="/account/logout"
            className="account-dropdown-logout-form"
            onSubmit={() => {
              clearLocal();
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('wishlist:merged');
                sessionStorage.setItem('wishlist:wasLoggedIn', 'true');
              }
            }}
          >
            <button
              type="submit"
              className="account-dropdown-item account-dropdown-logout-btn reset"
              role="menuitem"
            >
              Sign out
            </button>
          </Form>
        </div>
      )}
    </div>
  );
}

function WishlistToggle() {
  const {count} = useWishlist();

  return (
    <NavLink
      prefetch="intent"
      to="/wishlist"
      className="header-wishlist-link reset"
      aria-label={`Wishlist (${count} items)`}
    >
      <span className="header-wishlist-icon" aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={count > 0 ? '#ec4899' : 'none'}
          stroke={count > 0 ? '#ec4899' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </span>
      <span className="wish-badge" aria-label={`${count} items in wishlist`}>
        {count}
      </span>
    </NavLink>
  );
}


function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      className="header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
    >
      <h3>☰</h3>
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return (
    <button className="reset" onClick={() => open('search')}>
      Search
    </button>
  );
}

function CartBadge({count}: {count: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <a
      href="/cart"
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
    >
      Cart <span aria-label={`(items: ${count})`}>{count}</span>
    </a>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Blog',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Policies',
      type: 'HTTP',
      url: '/policies',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'About',
      type: 'PAGE',
      url: '/pages/about',
      items: [],
    },
  ],
};

function activeLinkStyle({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  return {
    fontWeight: isActive ? 'bold' : undefined,
    color: isPending ? 'grey' : 'black',
  };
}
