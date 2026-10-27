import {useState} from 'react';
import {data, redirect, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/($locale).account.orders.$id';
import {Money, Image} from '@shopify/hydrogen';
import type {
  OrderLineItemFullFragment,
  OrderQuery,
} from 'customer-accountapi.generated';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';
import {ORDER_REQUEST_RETURN_MUTATION} from '~/graphql/customer-account/OrderRequestReturnMutation';
import {deriveOrderStatus} from '~/lib/orderStatus';
import {OrderStatusTracker} from '~/components/OrderStatusTracker';
import {OrderReturnsSection} from '~/components/OrderReturnsSection';
import {ReturnRequestModal} from '~/components/ReturnRequestModal';
import {
  evaluateReturnEligibility,
  getReturnReasonLabel,
  RETURN_STATUS_MAP,
} from '~/lib/returns';

export const meta: Route.MetaFunction = ({data: metaData}) => {
  return [{title: `Order ${metaData?.order?.name}`}];
};

export async function loader({params, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  if (!params.id) {
    return redirect('/account/orders');
  }

  const orderId = atob(params.id);
  const {data: queryData, errors}: {data: OrderQuery; errors?: Array<{message: string}>} =
    await customerAccount.query(CUSTOMER_ORDER_QUERY, {
      variables: {
        orderId,
        language: customerAccount.i18n.language,
      },
    });

  if (errors?.length || !queryData?.order) {
    if (errors?.length) {
      console.error('CustomerOrderQuery errors:', errors);
    }
    throw new Error('Order not found');
  }

  const {order} = queryData;

  // Extract line items directly from nodes array
  const lineItems = order.lineItems.nodes;

  // Extract discount applications directly from nodes array
  const discountApplications = order.discountApplications.nodes;

  // Get fulfillment status from first fulfillment node
  const fulfillmentStatus = order.fulfillments.nodes[0]?.status ?? 'N/A';

  // Get first discount value with proper type checking
  const firstDiscount = discountApplications[0]?.value;

  // Type guard for MoneyV2 discount
  const discountValue =
    firstDiscount?.__typename === 'MoneyV2'
      ? (firstDiscount as Extract<
          typeof firstDiscount,
          {__typename: 'MoneyV2'}
        >)
      : null;

  // Type guard for percentage discount
  const discountPercentage =
    firstDiscount?.__typename === 'PricingPercentageValue'
      ? (
          firstDiscount as Extract<
            typeof firstDiscount,
            {__typename: 'PricingPercentageValue'}
          >
        ).percentage
      : null;

  const orderTracker = deriveOrderStatus(order);

  // Delivery status check
  const isDelivered = orderTracker.steps.some(
    (step) => step.id === 'delivered' && step.isComplete,
  );

  const returnEligibility = evaluateReturnEligibility(order, isDelivered);
  const returns = order.returns?.nodes ?? [];

  return {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
    orderTracker,
    returnEligibility,
    returns,
  };
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  if (request.method !== 'POST') {
    return data({success: false, errors: ['Method not allowed']}, {status: 405});
  }

  const isLoggedIn = await customerAccount.isLoggedIn();
  if (!isLoggedIn) {
    return data({success: false, errors: ['Unauthorized. Please sign in.']}, {status: 401});
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent !== 'request_return') {
    return data({success: false, errors: ['Invalid intent.']}, {status: 400});
  }

  const orderId = formData.get('orderId')?.toString();
  const rawItems = formData.get('items')?.toString();
  const customerNote = formData.get('customerNote')?.toString() || '';

  if (!orderId) {
    return data({success: false, errors: ['Order ID is required.']}, {status: 400});
  }

  if (!rawItems) {
    return data({success: false, errors: ['No items selected for return.']}, {status: 400});
  }

  let parsedItems: Array<{
    lineItemId: string;
    quantity: number;
    reason: string;
    returnReasonDefinitionId?: string;
  }> = [];

  try {
    parsedItems = JSON.parse(rawItems) as typeof parsedItems;
  } catch {
    return data({success: false, errors: ['Invalid items payload.']}, {status: 400});
  }

  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    return data(
      {success: false, errors: ['Please select at least one item to return.']},
      {status: 400},
    );
  }

  // Server-side validation
  const validationErrors: string[] = [];
  for (const item of parsedItems) {
    if (!item.lineItemId) {
      validationErrors.push('Missing line item ID.');
    }
    if (!item.quantity || item.quantity < 1) {
      validationErrors.push('Quantity must be at least 1.');
    }
    if (!item.reason) {
      validationErrors.push('Reason is required for each selected item.');
    }
  }

  if (validationErrors.length > 0) {
    return data({success: false, errors: validationErrors}, {status: 400});
  }

  // Construct RequestedLineItemInput array for Customer Account API
  const requestedLineItems = parsedItems.map((item) => {
    const isGidDefinition =
      item.returnReasonDefinitionId?.startsWith('gid://shopify/ReturnReasonDefinition/') ||
      item.reason?.startsWith('gid://shopify/ReturnReasonDefinition/');

    const reasonLabel = getReturnReasonLabel(item.reason);
    let note = customerNote;
    if (!isGidDefinition && reasonLabel) {
      note = note
        ? `[Reason: ${reasonLabel}] ${note}`
        : `[Reason: ${reasonLabel}]`;
    }
    if (note.length > 300) {
      note = note.slice(0, 300);
    }

    const input: {
      lineItemId: string;
      quantity: number;
      returnReasonDefinitionId?: string;
      customerNote?: string;
    } = {
      lineItemId: item.lineItemId,
      quantity: item.quantity,
    };

    if (isGidDefinition) {
      input.returnReasonDefinitionId = item.returnReasonDefinitionId || item.reason;
    }
    if (note) {
      input.customerNote = note;
    }

    return input;
  });

  try {
    const {data: mutationData, errors: graphQLErrors} =
      await customerAccount.mutate(ORDER_REQUEST_RETURN_MUTATION, {
        variables: {
          orderId,
          requestedLineItems,
          language: customerAccount.i18n.language,
        },
      });

    if (graphQLErrors?.length) {
      return data(
        {success: false, errors: graphQLErrors.map((e) => e.message)},
        {status: 400},
      );
    }

    const payload = mutationData?.orderRequestReturn;
    if (payload?.userErrors && payload.userErrors.length > 0) {
      return data(
        {
          success: false,
          errors: payload.userErrors.map((u) => u.message),
        },
        {status: 400},
      );
    }

    if (!payload?.return) {
      return data(
        {success: false, errors: ['Failed to submit return request.']},
        {status: 500},
      );
    }

    return data({
      success: true,
      returnId: payload.return.id,
      returnName: payload.return.name,
    });
  } catch (error: any) {
    return data(
      {
        success: false,
        errors: [
          error?.message ||
            'An unexpected error occurred while requesting return.',
        ],
      },
      {status: 500},
    );
  }
}

export default function OrderRoute() {
  const {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
    orderTracker,
    returnEligibility,
    returns,
  } = useLoaderData<typeof loader>();

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const isFulfilled = fulfillmentStatus?.toLowerCase().includes('fulfilled');

  return (
    <div className="account-card account-order-details-card">
      <div className="account-order-top-nav">
        <Link to="/account/orders" className="account-back-btn">
          ← Back to Orders
        </Link>
      </div>

      <div className="account-card-header account-card-header--with-action">
        <div>
          <div className="account-hero-badge-row">
            <span className="account-order-number-badge">Order {order.name}</span>
            <span className={`account-status-pill ${isFulfilled ? 'is-fulfilled' : 'is-processing'}`}>
              {fulfillmentStatus}
            </span>
          </div>
          <p className="account-card-subtitle">
            Placed on {new Date(order.processedAt!).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {order.statusPageUrl && (
          <a
            target="_blank"
            href={order.statusPageUrl}
            rel="noreferrer"
            className="account-btn-sm account-btn-primary"
          >
            Track with Shopify ↗
          </a>
        )}
      </div>

      {order.confirmationNumber && (
        <div className="account-confirmation-banner">
          <span>Confirmation Code:</span>
          <strong>{order.confirmationNumber}</strong>
        </div>
      )}
      <br />
      <OrderStatusTracker tracker={orderTracker} />
      <br />

      {/* Return Management Banner & Action */}
      <section
        className="return-management-card"
        aria-labelledby="return-mgmt-title"
      >
        <div className="return-mgmt-header">
          <div className="return-mgmt-title-wrap">
            <h3 id="return-mgmt-title" className="return-mgmt-title">
              Return Management
            </h3>
          </div>

          {returnEligibility.isEligible ? (
            <button
              type="button"
              className="return-trigger-btn"
              onClick={() => setIsReturnModalOpen(true)}
              aria-haspopup="dialog"
            >
              Request a Return
            </button>
          ) : null}
        </div>

        <div className="return-mgmt-body">
          {returnEligibility.isEligible ? (
            <p className="return-mgmt-desc">
              Items in this order are eligible for return. Click above to select
              items and submit a request.
            </p>
          ) : (
            <div
              className={`return-status-callout return-status-callout--${returnEligibility.statusType}`}
              role="status"
            >
              <div className="return-callout-icon" aria-hidden="true">
                {returnEligibility.statusType === 'not_delivered'
                  ? '⏳'
                  : returnEligibility.statusType === 'window_closed'
                  ? '🔒'
                  : 'ℹ️'}
              </div>
              <div>
                <strong className="return-callout-title">
                  {returnEligibility.title}
                </strong>
                <p className="return-callout-msg">
                  {returnEligibility.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Return Request Modal */}
      {returnEligibility.isEligible && (
        <ReturnRequestModal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          orderId={order.id}
          orderName={order.name}
          returnableItems={returnEligibility.returnableItems}
        />
      )}

      {/* Returns History Section */}
      {returns.length > 0 && (
        <>
          <br />
          <OrderReturnsSection returns={returns} />
        </>
      )}

      <br />
      <div>
        <table>
          <thead>
            <tr>
              <th scope="col">Product Item</th>
              <th scope="col">Price</th>
              <th scope="col">Qty</th>
              <th scope="col" className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((lineItem, lineItemIndex) => (
              <OrderLineRow key={lineItemIndex} lineItem={lineItem} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Breakdown & Shipping Details */}
      <div className="account-order-breakdown-grid">
        <div className="account-order-shipping-box">
          <h3>Shipping Address</h3>
          {order?.shippingAddress ? (
            <address className="account-order-address-text">
              <strong>{order.shippingAddress.name}</strong>
              {order.shippingAddress.formatted && <p>{order.shippingAddress.formatted}</p>}
              {order.shippingAddress.formattedArea && <p>{order.shippingAddress.formattedArea}</p>}
            </address>
          ) : (
            <p className="account-meta-label">No shipping address recorded</p>
          )}
        </div>

        <div className="account-order-summary-box">
          <div className="account-summary-row">
            <span>Subtotal</span>
            <span><Money data={order.subtotal!} /></span>
          </div>

          {((discountValue && discountValue.amount) || discountPercentage) && (
            <div className="account-summary-row account-summary-row--discount">
              <span>Discounts</span>
              <span>
                {discountPercentage ? (
                  `-${discountPercentage}% OFF`
                ) : (
                  discountValue && <Money data={discountValue!} />
                )}
              </span>
            </div>
          )}

          <div className="account-summary-row">
            <span>Tax</span>
            <span><Money data={order.totalTax!} /></span>
          </div>

          <div className="account-summary-row account-summary-row--total">
            <span>Total</span>
            <span className="account-summary-total-price">
              <Money data={order.totalPrice!} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderLineRow({lineItem}: {lineItem: OrderLineItemFullFragment}) {
  return (
    <tr key={lineItem.id}>
      <td>
        <div>
          {lineItem?.image && (
            <div>
              <Image data={lineItem.image} width={96} height={96} />
            </div>
          )}
          <div>
            <p>{lineItem.title}</p>
            <small>{lineItem.variantTitle}</small>
          </div>
        </div>
      </td>
      <td>
        <Money data={lineItem.price!} />
      </td>
      <td>{lineItem.quantity}</td>
      <td>
        <Money data={lineItem.totalDiscount!} />
      </td>
    </tr>
  );
}
