import {redirect, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/($locale).account.orders.$id';
import {Money, Image} from '@shopify/hydrogen';
import type {
  OrderLineItemFullFragment,
  OrderQuery,
} from 'customer-accountapi.generated';
import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';
import {deriveOrderStatus} from '~/lib/orderStatus';
import {OrderStatusTracker} from '~/components/OrderStatusTracker';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Order ${data?.order?.name}`}];
};

export async function loader({params, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  if (!params.id) {
    return redirect('/account/orders');
  }

  const orderId = atob(params.id);
  const {data, errors}: {data: OrderQuery; errors?: Array<{message: string}>} =
    await customerAccount.query(CUSTOMER_ORDER_QUERY, {
      variables: {
        orderId,
        language: customerAccount.i18n.language,
      },
    });

  if (errors?.length || !data?.order) {
    throw new Error('Order not found');
  }

  const {order} = data;

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

  return {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
    orderTracker,
  };
}

export default function OrderRoute() {
  const {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
    orderTracker,
  } = useLoaderData<typeof loader>();

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
