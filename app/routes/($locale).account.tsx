import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
} from 'react-router';
import type {Route} from './+types/($locale).account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';

export function shouldRevalidate() {
  return true;
}

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return remixData(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();
  const firstName = customer?.firstName || '';
  const lastName = customer?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Valued Customer';
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';
  const addressCount = customer?.addresses?.nodes?.length ?? 0;

  return (
    <div className="account-dashboard-wrapper">
      {/* Hero Welcome Banner */}
      <section className="account-hero-banner" aria-label="Account Overview">
        <div className="account-hero-backdrop" />
        <div className="account-hero-content">
          <div className="account-hero-avatar-wrapper">
            <div className="account-hero-avatar" aria-hidden="true">
              <span>{initials}</span>
            </div>
            <span className="account-hero-status-dot" title="Account Active" />
          </div>

          <div className="account-hero-info">
            <div className="account-hero-badge-row">
              <span className="account-hero-badge">Verified Customer</span>
              {addressCount > 0 && (
                <span className="account-hero-badge account-hero-badge--subtle">
                  {addressCount} Saved {addressCount === 1 ? 'Address' : 'Addresses'}
                </span>
              )}
            </div>
            <h1 className="account-hero-title">Welcome, {fullName}</h1>
            <p className="account-hero-subtitle">
              Manage your orders, update your personal info, and customize your delivery addresses.
            </p>
          </div>
        </div>
      </section>

      {/* Main Dashboard Layout: SideNav + Content */}
      <div className="account-dashboard-layout">
        {/* Sidebar Navigation */}
        <aside className="account-sidebar" aria-label="Account Navigation">
          <div className="account-sidebar-card">
            <div className="account-sidebar-header">
              <span className="account-sidebar-tag">ACCOUNT MENU</span>
            </div>

            <nav className="account-nav-list" role="navigation">
              <NavLink
                to="/account/orders"
                className={({isActive}) =>
                  `account-nav-item ${isActive ? 'is-active' : ''}`
                }
              >
                <span className="account-nav-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </span>
                <span className="account-nav-text">My Orders</span>
                <span className="account-nav-arrow" aria-hidden="true">›</span>
              </NavLink>

              <NavLink
                to="/account/profile"
                className={({isActive}) =>
                  `account-nav-item ${isActive ? 'is-active' : ''}`
                }
              >
                <span className="account-nav-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span className="account-nav-text">Personal Profile</span>
                <span className="account-nav-arrow" aria-hidden="true">›</span>
              </NavLink>

              <NavLink
                to="/account/addresses"
                className={({isActive}) =>
                  `account-nav-item ${isActive ? 'is-active' : ''}`
                }
              >
                <span className="account-nav-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <span className="account-nav-text">Addresses</span>
                <span className="account-nav-arrow" aria-hidden="true">›</span>
              </NavLink>
            </nav>

            <div className="account-sidebar-divider" />

            <div className="account-sidebar-footer">
              <NavLink to="/collections" className="account-nav-item account-nav-item--store">
                <span className="account-nav-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </span>
                <span className="account-nav-text">Continue Shopping</span>
                <span className="account-nav-arrow" aria-hidden="true">↗</span>
              </NavLink>

              <Form className="account-logout-form" method="POST" action="/account/logout">
                <button type="submit" className="account-logout-btn">
                  <span className="account-logout-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </span>
                  <span>Sign Out</span>
                </button>
              </Form>
            </div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="account-content-pane" role="region" aria-label="Account Section Content">
          <Outlet context={{customer}} />
        </main>
      </div>
    </div>
  );
}
