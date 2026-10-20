import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router';
import type {Route} from './+types/($locale).account.orders._index';
import {useRef} from 'react';
import {
  Money,
  getPaginationVariables,
  flattenConnection,
} from '@shopify/hydrogen';
import {
  buildOrderSearchQuery,
  parseOrderFilters,
  ORDER_FILTER_FIELDS,
  type OrderFilterParams,
} from '~/lib/orderFilters';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import type {
  CustomerOrdersFragment,
  OrderItemFragment,
} from 'customer-accountapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';

type OrdersLoaderData = {
  customer: CustomerOrdersFragment;
  filters: OrderFilterParams;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Orders'}];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const url = new URL(request.url);
  const filters = parseOrderFilters(url.searchParams);
  const query = buildOrderSearchQuery(filters);

  const {data, errors} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {
      ...paginationVariables,
      query,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

  return {customer: data.customer, filters};
}

export default function Orders() {
  const {customer, filters} = useLoaderData<OrdersLoaderData>();
  const {orders} = customer;

  return (
    <div className="account-card account-orders-card">
      <div className="account-card-header">
        <div className="account-card-icon-pill" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <div>
          <h2 className="account-card-title">Order History</h2>
          <p className="account-card-subtitle">
            View real-time status, tracking numbers, and details of your previous orders.
          </p>
        </div>
      </div>

      <OrderSearchForm currentFilters={filters} />
      <OrdersTable orders={orders} filters={filters} />
    </div>
  );
}

function OrdersTable({
  orders,
  filters,
}: {
  orders: CustomerOrdersFragment['orders'];
  filters: OrderFilterParams;
}) {
  const hasFilters = !!(filters.name || filters.confirmationNumber);

  return (
    <div className="account-orders-list" aria-live="polite">
      {orders?.nodes.length ? (
        <PaginatedResourceSection connection={orders}>
          {({node: order}) => <OrderItem key={order.id} order={order} />}
        </PaginatedResourceSection>
      ) : (
        <EmptyOrders hasFilters={hasFilters} />
      )}
    </div>
  );
}

function EmptyOrders({hasFilters = false}: {hasFilters?: boolean}) {
  return (
    <div className="account-empty-state">
      <div className="account-empty-icon" aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      </div>
      {hasFilters ? (
        <>
          <h3 className="account-empty-title">No matching orders found</h3>
          <p className="account-empty-desc">
            We couldn&apos;t find any orders matching your search filters. Try clearing filters to see all your orders.
          </p>
          <Link to="/account/orders" className="account-btn-secondary">
            Clear Filters
          </Link>
        </>
      ) : (
        <>
          <h3 className="account-empty-title">No orders yet</h3>
          <p className="account-empty-desc">
            You haven&apos;t placed any orders with us yet. Discover our curated collections and start shopping today!
          </p>
          <Link to="/collections" className="account-btn-primary">
            Explore Collections
          </Link>
        </>
      )}
    </div>
  );
}

function OrderSearchForm({
  currentFilters,
}: {
  currentFilters: OrderFilterParams;
}) {
  const [, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSearching =
    navigation.state !== 'idle' &&
    navigation.location?.pathname?.includes('orders');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const name = formData.get(ORDER_FILTER_FIELDS.NAME)?.toString().trim();
    const confirmationNumber = formData
      .get(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER)
      ?.toString()
      .trim();

    if (name) params.set(ORDER_FILTER_FIELDS.NAME, name);
    if (confirmationNumber)
      params.set(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER, confirmationNumber);

    setSearchParams(params);
  };

  const hasFilters = Boolean(currentFilters.name || currentFilters.confirmationNumber);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="account-order-filter-bar"
      aria-label="Search orders"
    >
      <div className="account-filter-inputs">
        <div className="account-input-box account-input-box--sm">
          <span className="account-input-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            name={ORDER_FILTER_FIELDS.NAME}
            placeholder="Search by Order # (e.g. 1001)"
            aria-label="Order number"
            defaultValue={currentFilters.name || ''}
            className="account-input"
          />
        </div>

        <div className="account-input-box account-input-box--sm">
          <span className="account-input-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <input
            type="search"
            name={ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER}
            placeholder="Confirmation #"
            aria-label="Confirmation number"
            defaultValue={currentFilters.confirmationNumber || ''}
            className="account-input"
          />
        </div>
      </div>

      <div className="account-filter-buttons">
        <button type="submit" disabled={isSearching} className="account-btn-sm account-btn-primary">
          {isSearching ? 'Filtering...' : 'Filter'}
        </button>
        {hasFilters && (
          <button
            type="button"
            disabled={isSearching}
            className="account-btn-sm account-btn-secondary"
            onClick={() => {
              setSearchParams(new URLSearchParams());
              formRef.current?.reset();
            }}
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}

function OrderItem({order}: {order: OrderItemFragment}) {
  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status;
  const isPaid = order.financialStatus?.toLowerCase().includes('paid');
  const isFulfilled = fulfillmentStatus?.toLowerCase().includes('fulfilled');
  const orderUrl = `/account/orders/${btoa(order.id)}`;
  const orderDate = new Date(order.processedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="account-order-card">
      <div className="account-order-card-header">
        <div className="account-order-card-id-block">
          <Link to={orderUrl} className="account-order-number-badge">
            #{order.number}
          </Link>
          <span className="account-order-date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {orderDate}
          </span>
        </div>

        <div className="account-order-status-pills">
          <span className={`account-status-pill ${isPaid ? 'is-paid' : 'is-pending'}`}>
            <span className="account-status-pill-dot" />
            {order.financialStatus || 'PAID'}
          </span>
          {fulfillmentStatus && (
            <span className={`account-status-pill ${isFulfilled ? 'is-fulfilled' : 'is-processing'}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              {fulfillmentStatus}
            </span>
          )}
        </div>
      </div>

      <div className="account-order-card-body">
        {order.confirmationNumber && (
          <div className="account-order-meta-item">
            <span className="account-meta-label">Confirmation:</span>
            <span className="account-meta-value">{order.confirmationNumber}</span>
          </div>
        )}
      </div>

      <div className="account-order-card-footer">
        <div className="account-order-total">
          <span className="account-meta-label">Total Amount</span>
          <div className="account-order-price">
            <Money data={order.totalPrice} />
          </div>
        </div>

        <Link to={orderUrl} className="account-btn-view-order">
          <span>View Details</span>
          <span className="account-btn-arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
