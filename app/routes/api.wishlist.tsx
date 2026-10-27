import {data} from 'react-router';
import type {Route} from './+types/api.wishlist';
import {
  type WishlistData,
  WISHLIST_NAMESPACE,
  WISHLIST_KEY,
  parseWishlist,
  mergeWishlists,
  addItem,
  removeItem,
  isValidProductId,
} from '~/lib/wishlist';
import {withTimeout} from '~/lib/timeout';

export const CUSTOMER_WISHLIST_QUERY = `#graphql
  query CustomerWishlistMetafield {
    customer {
      id
      metafield(namespace: "custom", key: "wishlist") {
        id
        value
      }
    }
  }
` as const;

export const SET_CUSTOMER_WISHLIST_MUTATION = `#graphql
  mutation SetCustomerWishlist($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        key
        namespace
        value
      }
      userErrors {
        code
        elementIndex
        field
        message
      }
    }
  }
` as const;

interface CustomerWishlistQueryResult {
  customer?: {
    id: string;
    metafield?: {
      id?: string | null;
      value?: string | null;
    } | null;
  } | null;
}

import type {
  MetafieldSetUserError,
  WishlistLoaderResponse,
  WishlistActionResponse,
} from '~/lib/wishlist';

export type {
  MetafieldSetUserError,
  WishlistLoaderResponse,
  WishlistActionResponse,
};

interface SetCustomerWishlistMutationResult {
  metafieldsSet?: {
    metafields?: Array<{
      id: string;
      key: string;
      namespace: string;
      value: string;
    }> | null;
    userErrors: MetafieldSetUserError[];
  } | null;
}

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;

  const isLoggedIn = await withTimeout<boolean>(
    customerAccount.isLoggedIn(),
    4000,
    'customerAccount.isLoggedIn',
    false,
  );

  if (!isLoggedIn) {
    return data<WishlistLoaderResponse>(
      {isLoggedIn: false, wishlist: null},
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
  }

  const queryResult = await withTimeout<CustomerWishlistQueryResult | null>(
    customerAccount
      .query<CustomerWishlistQueryResult>(CUSTOMER_WISHLIST_QUERY)
      .then((res) => res.data),
    4000,
    'Customer Account Wishlist Query',
    null,
  );

  const rawValue = queryResult?.customer?.metafield?.value;
  const wishlist = parseWishlist(rawValue);
  console.log('[api.wishlist] GET /api/wishlist returned items count:', wishlist.items.length);

  return data<WishlistLoaderResponse>(
    {isLoggedIn: true, wishlist},
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return data<WishlistActionResponse>(
      {success: false, error: 'Method not allowed'},
      {status: 405},
    );
  }

  const {customerAccount} = context;

  const isLoggedIn = await withTimeout<boolean>(
    customerAccount.isLoggedIn(),
    4000,
    'customerAccount.isLoggedIn action',
    false,
  );

  if (!isLoggedIn) {
    return data<WishlistActionResponse>(
      {
        success: false,
        error: 'Unauthorized. Sign in required.',
        isLoggedIn: false,
      },
      {status: 401},
    );
  }

  let intent = '';
  let productId = '';
  let handle = '';
  let itemsJson = '';

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      if (typeof body.intent === 'string') intent = body.intent.trim();
      if (typeof body.productId === 'string') productId = body.productId.trim();
      if (typeof body.handle === 'string') handle = body.handle.trim();
      if (typeof body.items === 'string') {
        itemsJson = body.items;
      } else if (Array.isArray(body.items)) {
        itemsJson = JSON.stringify(body.items);
      }
    } catch {
      return data<WishlistActionResponse>(
        {success: false, error: 'Invalid JSON request payload'},
        {status: 400},
      );
    }
  } else {
    try {
      const formData = await request.formData();
      const rawIntent = formData.get('intent');
      const rawProductId = formData.get('productId');
      const rawHandle = formData.get('handle');
      const rawItems = formData.get('items');

      if (typeof rawIntent === 'string') intent = rawIntent.trim();
      if (typeof rawProductId === 'string') productId = rawProductId.trim();
      if (typeof rawHandle === 'string') handle = rawHandle.trim();
      if (typeof rawItems === 'string') itemsJson = rawItems.trim();
    } catch {
      return data<WishlistActionResponse>(
        {success: false, error: 'Invalid form data payload'},
        {status: 400},
      );
    }
  }

  if (!['add', 'remove', 'merge', 'clear'].includes(intent)) {
    return data<WishlistActionResponse>(
      {success: false, error: 'Invalid intent parameter'},
      {status: 400},
    );
  }

  // ALWAYS read-modify-write:
  // 1. Read current metafield and customer ID
  const currentQueryData = await withTimeout<{
    data?: CustomerWishlistQueryResult;
    errors?: unknown[];
  } | null>(
    customerAccount.query<CustomerWishlistQueryResult>(CUSTOMER_WISHLIST_QUERY),
    4000,
    'Customer Account Query for Update',
    null,
  );

  const customerId = currentQueryData?.data?.customer?.id;
  if (!customerId) {
    return data<WishlistActionResponse>(
      {success: false, error: 'Unable to retrieve customer account details'},
      {status: 500},
    );
  }

  const currentWishlist = parseWishlist(
    currentQueryData?.data?.customer?.metafield?.value,
  );

  // 2. Modify wishlist according to intent
  let nextWishlist: WishlistData;

  switch (intent) {
    case 'add': {
      if (!isValidProductId(productId)) {
        return data<WishlistActionResponse>(
          {
            success: false,
            error:
              'Invalid productId. Must be a valid gid://shopify/Product/ GID.',
          },
          {status: 400},
        );
      }
      nextWishlist = addItem(currentWishlist, {productId, handle});
      break;
    }

    case 'remove': {
      if (!isValidProductId(productId)) {
        return data<WishlistActionResponse>(
          {
            success: false,
            error:
              'Invalid productId. Must be a valid gid://shopify/Product/ GID.',
          },
          {status: 400},
        );
      }
      nextWishlist = removeItem(currentWishlist, productId);
      break;
    }

    case 'merge': {
      let guestData: WishlistData;
      if (!itemsJson || itemsJson.trim() === '[]') {
        guestData = {v: 1, items: []};
      } else if (itemsJson.trim().startsWith('{')) {
        guestData = parseWishlist(itemsJson);
      } else {
        try {
          guestData = parseWishlist(
            JSON.stringify({v: 1, items: JSON.parse(itemsJson)}),
          );
        } catch {
          guestData = {v: 1, items: []};
        }
      }

      // If guest list is empty, nothing to merge; do not alter current
      if (guestData.items.length === 0) {
        return data<WishlistActionResponse>({
          success: true,
          wishlist: currentWishlist,
          isLoggedIn: true,
        });
      }

      nextWishlist = mergeWishlists(currentWishlist, guestData);
      break;
    }

    case 'clear': {
      nextWishlist = {v: 1, items: []};
      break;
    }

    default: {
      return data<WishlistActionResponse>(
        {success: false, error: 'Unknown intent'},
        {status: 400},
      );
    }
  }

  // Data safety: reject/log any write that would replace a non-empty server list with an empty one
  // unless it is a 'remove' of a specific productId
  if (
    currentWishlist.items.length > 0 &&
    nextWishlist.items.length === 0 &&
    intent !== 'remove'
  ) {
    console.warn(
      `[api.wishlist] REJECTED write: attempt to replace non-empty server list (${currentWishlist.items.length} items) with empty list for intent: '${intent}'`,
    );
    return data<WishlistActionResponse>(
      {
        success: false,
        error:
          'Operation rejected: cannot overwrite existing server wishlist with an empty list',
        wishlist: currentWishlist,
      },
      {status: 400},
    );
  }

  // 3. Write with metafieldsSet via context.customerAccount.mutate
  const mutationResult = await withTimeout<{
    data?: SetCustomerWishlistMutationResult;
    errors?: unknown[];
  } | null>(
    customerAccount.mutate<SetCustomerWishlistMutationResult>(
      SET_CUSTOMER_WISHLIST_MUTATION,
      {
        variables: {
          metafields: [
            {
              ownerId: customerId,
              namespace: WISHLIST_NAMESPACE,
              key: WISHLIST_KEY,
              type: 'json',
              value: JSON.stringify(nextWishlist),
            },
          ],
        },
      },
    ),
    4000,
    'Customer Account Wishlist Mutation',
    null,
  );

  const userErrors = mutationResult?.data?.metafieldsSet?.userErrors;
  if (userErrors && userErrors.length > 0) {
    return data<WishlistActionResponse>(
      {
        success: false,
        error: userErrors[0]?.message || 'Failed to update customer wishlist',
        userErrors,
      },
      {status: 400},
    );
  }

  if (mutationResult?.errors && mutationResult.errors.length > 0) {
    return data<WishlistActionResponse>(
      {
        success: false,
        error: 'GraphQL mutation encountered errors',
      },
      {status: 500},
    );
  }

  return data<WishlistActionResponse>({
    success: true,
    wishlist: nextWishlist,
    isLoggedIn: true,
  });
}
