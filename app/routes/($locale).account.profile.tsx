import type {CustomerFragment} from 'customer-accountapi.generated';
import type {CustomerUpdateInput} from '@shopify/hydrogen/customer-account-api-types';
import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from 'react-router';
import type {Route} from './+types/($locale).account.profile';

export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Profile'}];
};

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  if (request.method !== 'PUT') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const form = await request.formData();

  try {
    const customer: CustomerUpdateInput = {};
    const validInputKeys = ['firstName', 'lastName'] as const;
    for (const [key, value] of form.entries()) {
      if (!validInputKeys.includes(key as any)) {
        continue;
      }
      if (typeof value === 'string' && value.length) {
        customer[key as (typeof validInputKeys)[number]] = value;
      }
    }

    // update customer and possibly password
    const {data, errors} = await customerAccount.mutate(
      CUSTOMER_UPDATE_MUTATION,
      {
        variables: {
          customer,
          language: customerAccount.i18n.language,
        },
      },
    );

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    if (!data?.customerUpdate?.customer) {
      throw new Error('Customer profile update failed.');
    }

    return {
      error: null,
      customer: data?.customerUpdate?.customer,
    };
  } catch (error: any) {
    return data(
      {error: error.message, customer: null},
      {
        status: 400,
      },
    );
  }
}

export default function AccountProfile() {
  const account = useOutletContext<{customer: CustomerFragment}>();
  const {state} = useNavigation();
  const action = useActionData<ActionResponse>();
  const customer = action?.customer ?? account?.customer;
  const isUpdating = state !== 'idle';
  const isSuccess = Boolean(action?.customer && !action?.error);

  const firstName = customer?.firstName || '';
  const lastName = customer?.lastName || '';
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';

  return (
    <div className="account-card account-profile-card">
      <div className="account-card-header">
        <div className="account-card-icon-pill" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <h2 className="account-card-title">Personal Profile</h2>
          <p className="account-card-subtitle">
            Keep your account details up to date for seamless order tracking and delivery.
          </p>
        </div>
      </div>

      {/* Mini Avatar / Identity Badge */}
      <div className="account-profile-id-banner">
        <div className="account-profile-avatar-circle" aria-hidden="true">
          {initials}
        </div>
        <div className="account-profile-id-text">
          <strong>{`${firstName} ${lastName}`.trim() || 'Account Member'}</strong>
          <span>Shopify Customer Account</span>
        </div>
        <span className="account-status-badge">
          <span className="account-status-badge-dot" />
          Active Member
        </span>
      </div>

      {/* Feedback Alerts */}
      {isSuccess && (
        <div className="account-alert account-alert--success" role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Your profile information has been saved successfully!</span>
        </div>
      )}

      {action?.error && (
        <div className="account-alert account-alert--error" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{action.error}</span>
        </div>
      )}

      {/* Profile Form */}
      <Form method="PUT" className="account-form">
        <div className="account-form-grid">
          <div className="account-field-group">
            <label htmlFor="firstName" className="account-field-label">
              First Name <span className="account-required-star">*</span>
            </label>
            <div className="account-input-box">
              <span className="account-input-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="e.g. John"
                aria-label="First name"
                defaultValue={customer?.firstName ?? ''}
                minLength={2}
                required
                className="account-input"
              />
            </div>
          </div>

          <div className="account-field-group">
            <label htmlFor="lastName" className="account-field-label">
              Last Name <span className="account-required-star">*</span>
            </label>
            <div className="account-input-box">
              <span className="account-input-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="e.g. Doe"
                aria-label="Last name"
                defaultValue={customer?.lastName ?? ''}
                minLength={2}
                required
                className="account-input"
              />
            </div>
          </div>
        </div>

        <div className="account-security-callout">
          <div className="account-security-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="account-security-text">
            <strong>Passwordless Security</strong>
            <p>
              Your account is securely verified via Shopify Customer Accounts. Passwordless one-time verification codes are sent directly to your registered email address.
            </p>
          </div>
        </div>

        <div className="account-form-actions">
          <button
            type="submit"
            disabled={isUpdating}
            className={`account-btn-primary ${isUpdating ? 'is-loading' : ''}`}
          >
            {isUpdating ? (
              <>
                <span className="account-btn-spinner" aria-hidden="true" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </Form>
    </div>
  );
}
