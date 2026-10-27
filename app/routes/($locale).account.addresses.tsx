import {useState, useEffect} from 'react';
import type {CustomerAddressInput} from '@shopify/hydrogen/customer-account-api-types';
import type {
  AddressFragment,
  CustomerFragment,
} from 'customer-accountapi.generated';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
  type Fetcher,
} from 'react-router';
import type {Route} from './+types/($locale).account.addresses';
import {
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  CREATE_ADDRESS_MUTATION,
} from '~/graphql/customer-account/CustomerAddressMutations';

export type ActionResponse = {
  addressId?: string | null;
  createdAddress?: AddressFragment;
  defaultAddress?: string | null;
  deletedAddress?: string | null;
  error: Record<AddressFragment['id'], string> | null;
  updatedAddress?: AddressFragment;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Addresses'}];
};

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  try {
    const form = await request.formData();

    const addressId = form.has('addressId')
      ? String(form.get('addressId'))
      : null;
    if (!addressId) {
      throw new Error('You must provide an address id.');
    }

    // this will ensure redirecting to login never happen for mutatation
    const isLoggedIn = await customerAccount.isLoggedIn();
    if (!isLoggedIn) {
      return data(
        {error: {[addressId]: 'Unauthorized'}},
        {
          status: 401,
        },
      );
    }

    const defaultAddress = form.has('defaultAddress')
      ? String(form.get('defaultAddress')) === 'on'
      : false;
    const address: CustomerAddressInput = {};
    const keys: (keyof CustomerAddressInput)[] = [
      'address1',
      'address2',
      'city',
      'company',
      'territoryCode',
      'firstName',
      'lastName',
      'phoneNumber',
      'zoneCode',
      'zip',
    ];

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        address[key] = value;
      }
    }

    switch (request.method) {
      case 'POST': {
        // handle new address creation
        try {
          const {data, errors} = await customerAccount.mutate(
            CREATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressCreate?.userErrors?.length) {
            throw new Error(data?.customerAddressCreate?.userErrors[0].message);
          }

          if (!data?.customerAddressCreate?.customerAddress) {
            throw new Error('Customer address create failed.');
          }

          return {
            error: null,
            createdAddress: data?.customerAddressCreate?.customerAddress,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'PUT': {
        // handle address updates
        try {
          const {data, errors} = await customerAccount.mutate(
            UPDATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                addressId: decodeURIComponent(addressId),
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressUpdate?.userErrors?.length) {
            throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
          }

          if (!data?.customerAddressUpdate?.customerAddress) {
            throw new Error('Customer address update failed.');
          }

          return {
            error: null,
            updatedAddress: address,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'DELETE': {
        // handles address deletion
        try {
          const {data, errors} = await customerAccount.mutate(
            DELETE_ADDRESS_MUTATION,
            {
              variables: {
                addressId: decodeURIComponent(addressId),
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressDelete?.userErrors?.length) {
            throw new Error(data?.customerAddressDelete?.userErrors[0].message);
          }

          if (!data?.customerAddressDelete?.deletedAddressId) {
            throw new Error('Customer address delete failed.');
          }

          return {error: null, deletedAddress: addressId};
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      default: {
        return data(
          {error: {[addressId]: 'Method not allowed'}},
          {
            status: 405,
          },
        );
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return data(
        {error: error.message},
        {
          status: 400,
        },
      );
    }
    return data(
      {error},
      {
        status: 400,
      },
    );
  }
}

export default function Addresses() {
  const {customer} = useOutletContext<{customer: CustomerFragment}>();
  const {defaultAddress, addresses} = customer;
  const [isAddingNew, setIsAddingNew] = useState(false);
  const actionData = useActionData<ActionResponse>();

  useEffect(() => {
    if (actionData?.createdAddress) {
      setIsAddingNew(false);
    }
  }, [actionData]);

  return (
    <div className="account-card account-addresses-card">
      <div className="account-card-header account-card-header--with-action">
        <div className="account-header-left">
          <div className="account-card-icon-pill" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div>
            <h2 className="account-card-title">Saved Addresses</h2>
            <p className="account-card-subtitle">
              Manage your delivery locations and choose your default shipping address.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingNew((prev) => !prev)}
          className={`account-btn-sm ${isAddingNew ? 'account-btn-secondary' : 'account-btn-primary'}`}
        >
          {isAddingNew ? (
            <>
              <span>✕ Cancel</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add New Address</span>
            </>
          )}
        </button>
      </div>

      {/* Expandable New Address Form Card */}
      {isAddingNew && (
        <div className="account-address-form-drawer">
          <div className="account-drawer-header">
            <h3>Add a New Delivery Address</h3>
            <p>Please enter your shipping information below.</p>
          </div>
          <NewAddressForm
            key={addresses.nodes.length}
            onCancel={() => setIsAddingNew(false)}
          />
        </div>
      )}

      {/* Address List */}
      {!addresses.nodes.length && !isAddingNew ? (
        <div className="account-empty-state">
          <div className="account-empty-icon" aria-hidden="true">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h3 className="account-empty-title">No addresses saved yet</h3>
          <p className="account-empty-desc">
            Add a shipping address to speed up checkout and manage your deliveries.
          </p>
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="account-btn-primary"
          >
            + Add Your First Address
          </button>
        </div>
      ) : (
        <ExistingAddresses
          addresses={addresses}
          defaultAddress={defaultAddress}
        />
      )}
    </div>
  );
}

function NewAddressForm({onCancel}: {onCancel?: () => void}) {
  const newAddress = {
    address1: '',
    address2: '',
    city: '',
    company: '',
    territoryCode: '',
    firstName: '',
    id: 'new',
    lastName: '',
    phoneNumber: '',
    zoneCode: '',
    zip: '',
  } as CustomerAddressInput;

  return (
    <AddressForm
      addressId={'NEW_ADDRESS_ID'}
      address={newAddress}
      defaultAddress={null}
    >
      {({stateForMethod}) => (
        <div className="account-form-actions">
          <button
            disabled={stateForMethod('POST') !== 'idle'}
            formMethod="POST"
            type="submit"
            className="account-btn-primary"
          >
            {stateForMethod('POST') !== 'idle' ? 'Saving...' : 'Save Address'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="account-btn-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </AddressForm>
  );
}

function ExistingAddresses({
  addresses,
  defaultAddress,
}: Pick<CustomerFragment, 'addresses' | 'defaultAddress'>) {
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const actionData = useActionData<ActionResponse>();

  useEffect(() => {
    if (actionData?.updatedAddress) {
      setEditingAddressId(null);
    }
  }, [actionData]);

  return (
    <div className="account-addresses-grid">
      {addresses.nodes.map((address) => {
        const isDefault = defaultAddress?.id === address.id;
        const isEditing = editingAddressId === address.id;

        if (isEditing) {
          return (
            <div key={address.id} className="account-address-card account-address-card--editing">
              <div className="account-drawer-header">
                <h3>Edit Address</h3>
                <button
                  type="button"
                  onClick={() => setEditingAddressId(null)}
                  className="account-card-close-btn"
                  aria-label="Close form"
                >
                  ✕
                </button>
              </div>
              <AddressForm
                addressId={address.id}
                address={address}
                defaultAddress={defaultAddress}
              >
                {({stateForMethod}) => (
                  <div className="account-form-actions">
                    <button
                      disabled={stateForMethod('PUT') !== 'idle'}
                      formMethod="PUT"
                      type="submit"
                      className="account-btn-primary"
                    >
                      {stateForMethod('PUT') !== 'idle' ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAddressId(null)}
                      className="account-btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </AddressForm>
            </div>
          );
        }

        return (
          <article
            key={address.id}
            className={`account-address-card ${isDefault ? 'is-default' : ''}`}
          >
            <div className="account-address-card-header">
              <div className="account-address-recipient">
                <strong>{`${address.firstName || ''} ${address.lastName || ''}`.trim() || 'Address Recipient'}</strong>
                {address.company && <span className="account-address-company">{address.company}</span>}
              </div>

              {isDefault && (
                <span className="account-default-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  DEFAULT
                </span>
              )}
            </div>

            <div className="account-address-card-body">
              <p className="account-address-line">{address.address1}</p>
              {address.address2 && <p className="account-address-line">{address.address2}</p>}
              <p className="account-address-line">
                {address.city ? `${address.city}, ` : ''}
                {address.zoneCode ? `${address.zoneCode} ` : ''}
                {address.zip || ''}
              </p>
              {address.territoryCode && (
                <p className="account-address-country">{address.territoryCode}</p>
              )}
              {address.phoneNumber && (
                <p className="account-address-phone">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {address.phoneNumber}
                </p>
              )}
            </div>

            <div className="account-address-card-footer">
              <button
                type="button"
                onClick={() => setEditingAddressId(address.id)}
                className="account-btn-address-edit"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit</span>
              </button>

              <Form id={`delete-${address.id}`} className="account-address-delete-form">
                <input type="hidden" name="addressId" defaultValue={address.id} />
                <button
                  type="submit"
                  formMethod="DELETE"
                  className="account-btn-address-delete"
                  title="Delete address"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Delete</span>
                </button>
              </Form>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function AddressForm({
  addressId,
  address,
  defaultAddress,
  children,
}: {
  addressId: AddressFragment['id'];
  address: CustomerAddressInput;
  defaultAddress: CustomerFragment['defaultAddress'];
  children: (props: {
    stateForMethod: (method: 'PUT' | 'POST' | 'DELETE') => Fetcher['state'];
  }) => React.ReactNode;
}) {
  const {state, formMethod} = useNavigation();
  const action = useActionData<ActionResponse>();
  const error = action?.error?.[addressId];
  const isDefaultAddress = defaultAddress?.id === addressId;

  return (
    <Form id={addressId} className="account-address-form">
      <input type="hidden" name="addressId" defaultValue={addressId} />

      <div className="account-form-grid">
        <div className="account-field-group">
          <label htmlFor={`firstName-${addressId}`} className="account-field-label">
            First name <span className="account-required-star">*</span>
          </label>
          <div className="account-input-box">
            <input
              aria-label="First name"
              autoComplete="given-name"
              defaultValue={address?.firstName ?? ''}
              id={`firstName-${addressId}`}
              name="firstName"
              placeholder="First name"
              required
              type="text"
              className="account-input"
            />
          </div>
        </div>

        <div className="account-field-group">
          <label htmlFor={`lastName-${addressId}`} className="account-field-label">
            Last name <span className="account-required-star">*</span>
          </label>
          <div className="account-input-box">
            <input
              aria-label="Last name"
              autoComplete="family-name"
              defaultValue={address?.lastName ?? ''}
              id={`lastName-${addressId}`}
              name="lastName"
              placeholder="Last name"
              required
              type="text"
              className="account-input"
            />
          </div>
        </div>

        <div className="account-field-group account-field-group--full">
          <label htmlFor={`company-${addressId}`} className="account-field-label">
            Company (optional)
          </label>
          <div className="account-input-box">
            <input
              aria-label="Company"
              autoComplete="organization"
              defaultValue={address?.company ?? ''}
              id={`company-${addressId}`}
              name="company"
              placeholder="Company name"
              type="text"
              className="account-input"
            />
          </div>
        </div>

        <div className="account-field-group account-field-group--full">
          <label htmlFor={`address1-${addressId}`} className="account-field-label">
            Address line 1 <span className="account-required-star">*</span>
          </label>
          <div className="account-input-box">
            <input
              aria-label="Address line 1"
              autoComplete="address-line1"
              defaultValue={address?.address1 ?? ''}
              id={`address1-${addressId}`}
              name="address1"
              placeholder="Street address or P.O. Box"
              required
              type="text"
              className="account-input"
            />
          </div>
        </div>

        <div className="account-field-group account-field-group--full">
          <label htmlFor={`address2-${addressId}`} className="account-field-label">
            Apartment, suite, etc. (optional)
          </label>
          <div className="account-input-box">
            <input
              aria-label="Address line 2"
              autoComplete="address-line2"
              defaultValue={address?.address2 ?? ''}
              id={`address2-${addressId}`}
              name="address2"
              placeholder="Apt, Suite, Unit, Building"
              type="text"
              className="account-input"
            />
          </div>
        </div>

        <div className="account-field-group">
          <label htmlFor={`city-${addressId}`} className="account-field-label">
            City <span className="account-required-star">*</span>
          </label>
          <div className="account-input-box">
            <input
              aria-label="City"
              autoComplete="address-level2"
              defaultValue={address?.city ?? ''}
              id={`city-${addressId}`}
              name="city"
              placeholder="City"
              required
              type="text"
              className="account-input"
            />
          </div>
        </div>

        <div className="account-field-group">
          <label htmlFor={`zoneCode-${addressId}`} className="account-field-label">
            State / Province <span className="account-required-star">*</span>
          </label>
          <div className="account-input-box">
            <input
              aria-label="State/Province"
              autoComplete="address-level1"
              defaultValue={address?.zoneCode ?? ''}
              id={`zoneCode-${addressId}`}
              name="zoneCode"
              placeholder="State or Province"
              required
              type="text"
              className="account-input"
            />
          </div>
        </div>

        <div className="account-field-group">
          <label htmlFor={`zip-${addressId}`} className="account-field-label">
            Zip / Postal Code <span className="account-required-star">*</span>
          </label>
          <div className="account-input-box">
            <input
              aria-label="Zip"
              autoComplete="postal-code"
              defaultValue={address?.zip ?? ''}
              id={`zip-${addressId}`}
              name="zip"
              placeholder="ZIP or Postal Code"
              required
              type="text"
              className="account-input"
            />
          </div>
        </div>

        <div className="account-field-group">
          <label htmlFor={`territoryCode-${addressId}`} className="account-field-label">
            Country Code (2 letters) <span className="account-required-star">*</span>
          </label>
          <div className="account-input-box">
            <input
              aria-label="Country code"
              autoComplete="country"
              defaultValue={address?.territoryCode ?? ''}
              id={`territoryCode-${addressId}`}
              name="territoryCode"
              placeholder="e.g. US, IN, CA"
              required
              type="text"
              maxLength={2}
              className="account-input"
            />
          </div>
        </div>

        <div className="account-field-group account-field-group--full">
          <label htmlFor={`phoneNumber-${addressId}`} className="account-field-label">
            Phone Number (optional)
          </label>
          <div className="account-input-box">
            <input
              aria-label="Phone Number"
              autoComplete="tel"
              defaultValue={address?.phoneNumber ?? ''}
              id={`phoneNumber-${addressId}`}
              name="phoneNumber"
              placeholder="+1234567890"
              pattern="^\+?[1-9]\d{3,14}$"
              type="tel"
              className="account-input"
            />
          </div>
        </div>
      </div>

      <div className="account-checkbox-group">
        <label className="account-checkbox-label">
          <input
            defaultChecked={isDefaultAddress}
            id={`defaultAddress-${addressId}`}
            name="defaultAddress"
            type="checkbox"
            className="account-checkbox"
          />
          <span className="account-checkbox-text">Set as default shipping address</span>
        </label>
      </div>

      {error && (
        <div className="account-alert account-alert--error" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {children({
        stateForMethod: (method) => (formMethod === method ? state : 'idle'),
      })}
    </Form>
  );
}
