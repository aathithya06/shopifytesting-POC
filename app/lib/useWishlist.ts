import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  createElement,
  type ReactNode,
} from 'react';
import {
  type WishlistItem,
  type WishlistData,
  type WishlistLoaderResponse,
  type WishlistActionResponse,
  readLocal,
  writeLocal,
  clearLocal,
  addItem,
  removeItem,
  hasItem,
  dispatchWishlistChange,
} from './wishlist';

export interface WishlistToastPayload {
  id?: string;
  message: string;
  linkText?: string;
  linkUrl?: string;
  duration?: number;
}

export function showWishlistToast(payload: WishlistToastPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<WishlistToastPayload>('wishlist:toast', {
      detail: payload,
    }),
  );
}

export interface WishlistContextType {
  items: WishlistItem[];
  count: number;
  has: (productId: string) => boolean;
  toggle: (item: {productId: string; handle: string}) => void;
  isLoggedIn: boolean;
  status: 'idle' | 'loading' | 'submitting';
}

const WishlistContext = createContext<WishlistContextType | null>(null);

interface WishlistProviderProps {
  children: ReactNode;
  isLoggedIn?: boolean | Promise<boolean>;
}

export function WishlistProvider({
  children,
  isLoggedIn: isLoggedInProp,
}: WishlistProviderProps) {
  const [resolvedLoggedIn, setResolvedLoggedIn] = useState<boolean>(false);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'submitting'>('idle');

  const hasFetchedServerRef = useRef<boolean>(false);
  const isMergingRef = useRef<boolean>(false);

  // 1. Resolve isLoggedIn from prop safely (boolean or Promise)
  useEffect(() => {
    let active = true;
    if (typeof isLoggedInProp === 'boolean') {
      setResolvedLoggedIn(isLoggedInProp);
    } else if (
      isLoggedInProp &&
      typeof isLoggedInProp === 'object' &&
      'then' in isLoggedInProp &&
      typeof (isLoggedInProp as {then: unknown}).then === 'function'
    ) {
      Promise.resolve(isLoggedInProp)
        .then((val) => {
          if (active) setResolvedLoggedIn(Boolean(val));
        })
        .catch(() => {
          if (active) setResolvedLoggedIn(false);
        });
    } else {
      setResolvedLoggedIn(false);
    }
    return () => {
      active = false;
    };
  }, [isLoggedInProp]);

  // 2. Hydration & Guest setup: read local state once hydrated if guest
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!resolvedLoggedIn) {
      const localData = readLocal();
      setItems(localData.items);
      hasFetchedServerRef.current = false;
    }
  }, [resolvedLoggedIn]);

  // 3. Logged-in setup: GET /api/wishlist once on login/app load, cache in provider
  useEffect(() => {
    if (typeof window === 'undefined' || !resolvedLoggedIn) return;
    if (hasFetchedServerRef.current) return;
    hasFetchedServerRef.current = true;

    async function fetchServerWishlist() {
      setStatus('loading');
      try {
        const res = await fetch('/api/wishlist');
        const json = (await res.json()) as WishlistLoaderResponse;

        let serverList: WishlistItem[] = [];
        if (json && 'wishlist' in json && json.wishlist?.items) {
          serverList = json.wishlist.items;
        }

        console.log(
          '[WishlistProvider] GET /api/wishlist returned items count:',
          serverList.length,
        );
        setItems(serverList);
        setStatus('idle');

        // On login: GET server list first, then merge guest items.
        // If guest list is empty, do NOT POST anything. Never write before read finished.
        const alreadyMerged =
          sessionStorage.getItem('wishlist:merged') === 'true';
        if (!alreadyMerged && !isMergingRef.current) {
          const guest = readLocal();
          if (guest.items.length === 0) {
            sessionStorage.setItem('wishlist:merged', 'true');
          } else {
            isMergingRef.current = true;
            console.log(
              '[WishlistProvider] Merging guest items into server account:',
              guest.items.length,
            );
            const formData = new FormData();
            formData.append('intent', 'merge');
            formData.append('items', JSON.stringify(guest.items));

            try {
              const mergeRes = await fetch('/api/wishlist', {
                method: 'POST',
                body: formData,
              });
              const mergeData =
                (await mergeRes.json()) as WishlistActionResponse;

              if (mergeData.success) {
                setItems(mergeData.wishlist.items);
                clearLocal();
                sessionStorage.setItem('wishlist:merged', 'true');
                showWishlistToast({
                  id: 'wishlist-synced',
                  message: 'Your wishlist was synced to your account',
                });
              } else {
                console.error(
                  '[WishlistProvider] Guest wishlist merge failed:',
                  mergeData.error,
                );
              }
            } catch (mergeErr) {
              console.error(
                '[WishlistProvider] Guest wishlist merge network error:',
                mergeErr,
              );
            } finally {
              isMergingRef.current = false;
            }
          }
        }
      } catch (err) {
        console.error(
          '[WishlistProvider] Failed to fetch server wishlist:',
          err,
        );
        setStatus('idle');
      }
    }

    void fetchServerWishlist();
  }, [resolvedLoggedIn]);

  // 4. Logout data safety: clear local state and localStorage ONLY. Never call server or write empty list.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (resolvedLoggedIn) {
      sessionStorage.setItem('wishlist:wasLoggedIn', 'true');
    } else {
      const wasLoggedIn =
        sessionStorage.getItem('wishlist:wasLoggedIn') === 'true';
      if (wasLoggedIn) {
        hasFetchedServerRef.current = false;
        setItems([]);
        clearLocal();
        sessionStorage.removeItem('wishlist:wasLoggedIn');
        sessionStorage.removeItem('wishlist:merged');
        dispatchWishlistChange({v: 1, items: []});
      }
    }
  }, [resolvedLoggedIn]);

  // 5. Cross-tab & storage listener for guests
  useEffect(() => {
    function handleChanged(e: Event) {
      if (resolvedLoggedIn) return;
      const customEvent = e as CustomEvent<WishlistData | undefined>;
      if (customEvent.detail) {
        setItems(customEvent.detail.items);
      } else {
        setItems(readLocal().items);
      }
    }

    window.addEventListener('wishlist:changed', handleChanged);
    window.addEventListener('storage', handleChanged);
    return () => {
      window.removeEventListener('wishlist:changed', handleChanged);
      window.removeEventListener('storage', handleChanged);
    };
  }, [resolvedLoggedIn]);

  // 6. Toggle handler: single source of truth for both guest and customer
  const toggle = useCallback(
    (item: {productId: string; handle: string}) => {
      const isCurrentlyIn = items.some((i) => i.productId === item.productId);

      if (!resolvedLoggedIn) {
        // Guest mode: update context + localStorage
        const currentData = {v: 1 as const, items};
        const next = isCurrentlyIn
          ? removeItem(currentData, item.productId)
          : addItem(currentData, item);

        setItems(next.items);
        writeLocal(next);
        dispatchWishlistChange(next);

        if (!isCurrentlyIn) {
          const guestToastShown =
            sessionStorage.getItem('wishlist:guest_toast_shown') === 'true';
          if (!guestToastShown) {
            sessionStorage.setItem('wishlist:guest_toast_shown', 'true');
            showWishlistToast({
              id: 'guest-first-add',
              message:
                'Saved on this device. Sign in to keep it across devices',
              linkText: 'Sign in',
              linkUrl: '/auth?redirect=/wishlist',
              duration: 6000,
            });
          }
        }
      } else {
        // Logged-in mode: optimistic toggle on context items
        const intent = isCurrentlyIn ? 'remove' : 'add';
        const currentData = {v: 1 as const, items};
        const nextOptimistic = isCurrentlyIn
          ? removeItem(currentData, item.productId)
          : addItem(currentData, item);

        setItems(nextOptimistic.items);
        setStatus('submitting');

        const formData = new FormData();
        formData.append('intent', intent);
        formData.append('productId', item.productId);
        formData.append('handle', item.handle);

        fetch('/api/wishlist', {
          method: 'POST',
          body: formData,
        })
          .then((res) => res.json() as Promise<WishlistActionResponse>)
          .then((actionRes) => {
            setStatus('idle');
            if (actionRes.success) {
              setItems(actionRes.wishlist.items);
            } else {
              console.error(
                '[WishlistProvider] Server action returned error:',
                actionRes.error,
              );
              // Rollback to previous items if server rejected
              setItems(items);
            }
          })
          .catch((err) => {
            setStatus('idle');
            console.error(
              '[WishlistProvider] Network error toggling wishlist item:',
              err,
            );
            // Rollback on network error
            setItems(items);
          });
      }
    },
    [items, resolvedLoggedIn],
  );

  const has = useCallback(
    (productId: string) => {
      return items.some((item) => item.productId === productId);
    },
    [items],
  );

  const contextValue = useMemo<WishlistContextType>(
    () => ({
      items,
      count: items.length,
      has,
      toggle,
      isLoggedIn: resolvedLoggedIn,
      status,
    }),
    [items, has, toggle, resolvedLoggedIn, status],
  );

  return createElement(
    WishlistContext.Provider,
    {value: contextValue},
    children,
  );
}

export function useWishlist(): WishlistContextType {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
