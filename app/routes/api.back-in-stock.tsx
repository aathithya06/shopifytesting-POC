import {data} from 'react-router';
import type {Route} from './+types/api.back-in-stock';

export type BackInStockActionResponse =
  | {success: true; message: string}
  | {success: false; error: string};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loader() {
  return data({error: 'Method not allowed'}, {status: 405});
}

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return data<BackInStockActionResponse>(
      {success: false, error: 'Method not allowed.'},
      {status: 405},
    );
  }

  let email = '';
  let variantId = '';

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as {
        email?: unknown;
        variantId?: unknown;
      };
      if (typeof body?.email === 'string') email = body.email.trim();
      if (typeof body?.variantId === 'string') variantId = body.variantId.trim();
    } catch {
      return data<BackInStockActionResponse>(
        {success: false, error: 'Invalid JSON request.'},
        {status: 400},
      );
    }
  } else {
    try {
      const formData = await request.formData();
      const rawEmail = formData.get('email');
      const rawVariantId = formData.get('variantId');
      if (typeof rawEmail === 'string') email = rawEmail.trim();
      if (typeof rawVariantId === 'string') variantId = rawVariantId.trim();
    } catch {
      return data<BackInStockActionResponse>(
        {success: false, error: 'Invalid form submission.'},
        {status: 400},
      );
    }
  }

  // 1. Email validation
  if (!email || !EMAIL_REGEX.test(email)) {
    return data<BackInStockActionResponse>(
      {success: false, error: 'Please enter a valid email address.'},
      {status: 400},
    );
  }

  // 2. Variant ID validation and extraction of numeric ID from GID
  const numericVariantId = variantId.replace(
    /^gid:\/\/shopify\/ProductVariant\//,
    '',
  );
  if (!numericVariantId || !/^\d+$/.test(numericVariantId)) {
    return data<BackInStockActionResponse>(
      {success: false, error: 'A valid product variant is required.'},
      {status: 400},
    );
  }

  // 3. Klaviyo Public Company ID
  const companyId =
    context.env?.PUBLIC_KLAVIYO_COMPANY_ID ||
    process.env.PUBLIC_KLAVIYO_COMPANY_ID;

  if (!companyId) {
    return data<BackInStockActionResponse>(
      {success: false, error: 'Klaviyo configuration is missing.'},
      {status: 500},
    );
  }

  // 4. Call Klaviyo Back in Stock Subscriptions Client API
  // IMPORTANT: Do NOT log the email.
  const klaviyoUrl = `https://a.klaviyo.com/client/back-in-stock-subscriptions/?company_id=${encodeURIComponent(
    companyId,
  )}`;

  try {
    const response = await fetch(klaviyoUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        revision: '2024-10-15',
      },
      body: JSON.stringify({
        data: {
          type: 'back-in-stock-subscription',
          attributes: {
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email,
                },
              },
            },
            channels: ['EMAIL'],
          },
          relationships: {
            variant: {
              data: {
                type: 'catalog-variant',
                id: `$shopify:::$default:::${numericVariantId}`,
              },
            },
          },
        },
      }),
    });

    if (response.ok || response.status === 202) {
      return data<BackInStockActionResponse>({
        success: true,
        message: "We'll email you once when this is back in stock.",
      });
    }

    const errorBody = (await response.json().catch(() => null)) as {
      errors?: Array<{detail?: string; title?: string; code?: string}>;
    } | null;

    const firstError = errorBody?.errors?.[0];
    const errorMessage =
      firstError?.detail ||
      firstError?.title ||
      'Failed to subscribe. Please try again.';

    const status =
      response.status >= 400 && response.status < 600 ? response.status : 500;

    return data<BackInStockActionResponse>(
      {success: false, error: errorMessage},
      {status},
    );
  } catch (err) {
    console.error(
      'Klaviyo Back-in-Stock request error:',
      err instanceof Error ? err.message : 'Unknown error',
    );
    return data<BackInStockActionResponse>(
      {
        success: false,
        error: 'Unable to subscribe at this time. Please try again later.',
      },
      {status: 500},
    );
  }
}
