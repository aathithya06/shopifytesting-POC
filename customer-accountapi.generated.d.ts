/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as CustomerAccountAPI from '@shopify/hydrogen/customer-account-api-types';

export type CustomerAddressUpdateMutationVariables = CustomerAccountAPI.Exact<{
  address: CustomerAccountAPI.CustomerAddressInput;
  addressId: CustomerAccountAPI.Scalars['ID']['input'];
  defaultAddress?: CustomerAccountAPI.InputMaybe<
    CustomerAccountAPI.Scalars['Boolean']['input']
  >;
  language?: CustomerAccountAPI.InputMaybe<CustomerAccountAPI.LanguageCode>;
}>;

export type CustomerAddressUpdateMutation = {
  customerAddressUpdate?: CustomerAccountAPI.Maybe<{
    customerAddress?: CustomerAccountAPI.Maybe<
      Pick<CustomerAccountAPI.CustomerAddress, 'id'>
    >;
    userErrors: Array<
      Pick<
        CustomerAccountAPI.UserErrorsCustomerAddressUserErrors,
        'code' | 'field' | 'message'
      >
    >;
  }>;
};

export type CustomerAddressDeleteMutationVariables = CustomerAccountAPI.Exact<{
  addressId: CustomerAccountAPI.Scalars['ID']['input'];
  language?: CustomerAccountAPI.InputMaybe<CustomerAccountAPI.LanguageCode>;
}>;

export type CustomerAddressDeleteMutation = {
  customerAddressDelete?: CustomerAccountAPI.Maybe<
    Pick<
      CustomerAccountAPI.CustomerAddressDeletePayload,
      'deletedAddressId'
    > & {
      userErrors: Array<
        Pick<
          CustomerAccountAPI.UserErrorsCustomerAddressUserErrors,
          'code' | 'field' | 'message'
        >
      >;
    }
  >;
};

export type CustomerAddressCreateMutationVariables = CustomerAccountAPI.Exact<{
  address: CustomerAccountAPI.CustomerAddressInput;
  defaultAddress?: CustomerAccountAPI.InputMaybe<
    CustomerAccountAPI.Scalars['Boolean']['input']
  >;
  language?: CustomerAccountAPI.InputMaybe<CustomerAccountAPI.LanguageCode>;
}>;

export type CustomerAddressCreateMutation = {
  customerAddressCreate?: CustomerAccountAPI.Maybe<{
    customerAddress?: CustomerAccountAPI.Maybe<
      Pick<CustomerAccountAPI.CustomerAddress, 'id'>
    >;
    userErrors: Array<
      Pick<
        CustomerAccountAPI.UserErrorsCustomerAddressUserErrors,
        'code' | 'field' | 'message'
      >
    >;
  }>;
};

export type CustomerFragment = Pick<
  CustomerAccountAPI.Customer,
  'id' | 'firstName' | 'lastName'
> & {
  defaultAddress?: CustomerAccountAPI.Maybe<
    Pick<
      CustomerAccountAPI.CustomerAddress,
      | 'id'
      | 'formatted'
      | 'firstName'
      | 'lastName'
      | 'company'
      | 'address1'
      | 'address2'
      | 'territoryCode'
      | 'zoneCode'
      | 'city'
      | 'zip'
      | 'phoneNumber'
    >
  >;
  addresses: {
    nodes: Array<
      Pick<
        CustomerAccountAPI.CustomerAddress,
        | 'id'
        | 'formatted'
        | 'firstName'
        | 'lastName'
        | 'company'
        | 'address1'
        | 'address2'
        | 'territoryCode'
        | 'zoneCode'
        | 'city'
        | 'zip'
        | 'phoneNumber'
      >
    >;
  };
};

export type AddressFragment = Pick<
  CustomerAccountAPI.CustomerAddress,
  | 'id'
  | 'formatted'
  | 'firstName'
  | 'lastName'
  | 'company'
  | 'address1'
  | 'address2'
  | 'territoryCode'
  | 'zoneCode'
  | 'city'
  | 'zip'
  | 'phoneNumber'
>;

export type CustomerDetailsQueryVariables = CustomerAccountAPI.Exact<{
  language?: CustomerAccountAPI.InputMaybe<CustomerAccountAPI.LanguageCode>;
}>;

export type CustomerDetailsQuery = {
  customer: Pick<
    CustomerAccountAPI.Customer,
    'id' | 'firstName' | 'lastName'
  > & {
    defaultAddress?: CustomerAccountAPI.Maybe<
      Pick<
        CustomerAccountAPI.CustomerAddress,
        | 'id'
        | 'formatted'
        | 'firstName'
        | 'lastName'
        | 'company'
        | 'address1'
        | 'address2'
        | 'territoryCode'
        | 'zoneCode'
        | 'city'
        | 'zip'
        | 'phoneNumber'
      >
    >;
    addresses: {
      nodes: Array<
        Pick<
          CustomerAccountAPI.CustomerAddress,
          | 'id'
          | 'formatted'
          | 'firstName'
          | 'lastName'
          | 'company'
          | 'address1'
          | 'address2'
          | 'territoryCode'
          | 'zoneCode'
          | 'city'
          | 'zip'
          | 'phoneNumber'
        >
      >;
    };
  };
};

export type OrderMoneyFragment = Pick<
  CustomerAccountAPI.MoneyV2,
  'amount' | 'currencyCode'
>;

export type DiscountApplicationFragment = {
  value:
    | ({__typename: 'MoneyV2'} & Pick<
        CustomerAccountAPI.MoneyV2,
        'amount' | 'currencyCode'
      >)
    | ({__typename: 'PricingPercentageValue'} & Pick<
        CustomerAccountAPI.PricingPercentageValue,
        'percentage'
      >);
};

export type OrderLineItemFullFragment = Pick<
  CustomerAccountAPI.LineItem,
  'id' | 'title' | 'quantity' | 'variantTitle'
> & {
  price?: CustomerAccountAPI.Maybe<
    Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  discountAllocations: Array<{
    allocatedAmount: Pick<
      CustomerAccountAPI.MoneyV2,
      'amount' | 'currencyCode'
    >;
    discountApplication: {
      value:
        | ({__typename: 'MoneyV2'} & Pick<
            CustomerAccountAPI.MoneyV2,
            'amount' | 'currencyCode'
          >)
        | ({__typename: 'PricingPercentageValue'} & Pick<
            CustomerAccountAPI.PricingPercentageValue,
            'percentage'
          >);
    };
  }>;
  totalDiscount: Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>;
  image?: CustomerAccountAPI.Maybe<
    Pick<
      CustomerAccountAPI.Image,
      'altText' | 'height' | 'url' | 'id' | 'width'
    >
  >;
  customAttributes: Array<Pick<CustomerAccountAPI.Attribute, 'key' | 'value'>>;
  properties: Array<Pick<CustomerAccountAPI.Attribute, 'key' | 'value'>>;
};

export type ReturnableLineItemFullFragment = Pick<
  CustomerAccountAPI.ReturnableLineItem,
  'quantity'
> & {
  lineItem: Pick<
    CustomerAccountAPI.LineItem,
    'id' | 'title' | 'variantTitle' | 'quantity'
  > & {
    image?: CustomerAccountAPI.Maybe<
      Pick<
        CustomerAccountAPI.Image,
        'altText' | 'height' | 'id' | 'url' | 'width'
      >
    >;
    price?: CustomerAccountAPI.Maybe<
      Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
    >;
    suggestedReturnReasonDefinitions?: CustomerAccountAPI.Maybe<{
      nodes: Array<
        Pick<
          CustomerAccountAPI.ReturnReasonDefinition,
          'id' | 'name' | 'handle' | 'deleted'
        >
      >;
    }>;
  };
};

type ReturnLineItemFull_ReturnLineItem_Fragment = Pick<
  CustomerAccountAPI.ReturnLineItem,
  'id' | 'quantity' | 'returnReason'
> & {
  returnReasonDefinition?: CustomerAccountAPI.Maybe<
    Pick<CustomerAccountAPI.ReturnReasonDefinition, 'id' | 'name' | 'handle'>
  >;
  lineItem: Pick<
    CustomerAccountAPI.LineItem,
    'id' | 'title' | 'variantTitle'
  > & {
    image?: CustomerAccountAPI.Maybe<
      Pick<
        CustomerAccountAPI.Image,
        'altText' | 'height' | 'id' | 'url' | 'width'
      >
    >;
    price?: CustomerAccountAPI.Maybe<
      Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
    >;
  };
};

type ReturnLineItemFull_UnverifiedReturnLineItem_Fragment = Pick<
  CustomerAccountAPI.UnverifiedReturnLineItem,
  'id' | 'quantity' | 'returnReason'
> & {
  returnReasonDefinition?: CustomerAccountAPI.Maybe<
    Pick<CustomerAccountAPI.ReturnReasonDefinition, 'id' | 'name' | 'handle'>
  >;
  lineItem: Pick<
    CustomerAccountAPI.LineItem,
    'id' | 'title' | 'variantTitle'
  > & {
    image?: CustomerAccountAPI.Maybe<
      Pick<
        CustomerAccountAPI.Image,
        'altText' | 'height' | 'id' | 'url' | 'width'
      >
    >;
    price?: CustomerAccountAPI.Maybe<
      Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
    >;
  };
};

export type ReturnLineItemFullFragment =
  | ReturnLineItemFull_ReturnLineItem_Fragment
  | ReturnLineItemFull_UnverifiedReturnLineItem_Fragment;

export type ReturnFullFragment = Pick<
  CustomerAccountAPI.Return,
  'id' | 'name' | 'status' | 'createdAt' | 'closedAt'
> & {
  returnLineItems: {
    nodes: Array<
      | (Pick<
          CustomerAccountAPI.ReturnLineItem,
          'id' | 'quantity' | 'returnReason'
        > & {
          returnReasonDefinition?: CustomerAccountAPI.Maybe<
            Pick<
              CustomerAccountAPI.ReturnReasonDefinition,
              'id' | 'name' | 'handle'
            >
          >;
          lineItem: Pick<
            CustomerAccountAPI.LineItem,
            'id' | 'title' | 'variantTitle'
          > & {
            image?: CustomerAccountAPI.Maybe<
              Pick<
                CustomerAccountAPI.Image,
                'altText' | 'height' | 'id' | 'url' | 'width'
              >
            >;
            price?: CustomerAccountAPI.Maybe<
              Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
          };
        })
      | (Pick<
          CustomerAccountAPI.UnverifiedReturnLineItem,
          'id' | 'quantity' | 'returnReason'
        > & {
          returnReasonDefinition?: CustomerAccountAPI.Maybe<
            Pick<
              CustomerAccountAPI.ReturnReasonDefinition,
              'id' | 'name' | 'handle'
            >
          >;
          lineItem: Pick<
            CustomerAccountAPI.LineItem,
            'id' | 'title' | 'variantTitle'
          > & {
            image?: CustomerAccountAPI.Maybe<
              Pick<
                CustomerAccountAPI.Image,
                'altText' | 'height' | 'id' | 'url' | 'width'
              >
            >;
            price?: CustomerAccountAPI.Maybe<
              Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
          };
        })
    >;
  };
};

export type OrderFragment = Pick<
  CustomerAccountAPI.Order,
  | 'id'
  | 'name'
  | 'confirmationNumber'
  | 'statusPageUrl'
  | 'fulfillmentStatus'
  | 'financialStatus'
  | 'processedAt'
> & {
  fulfillments: {
    nodes: Array<
      Pick<
        CustomerAccountAPI.Fulfillment,
        'status' | 'latestShipmentStatus' | 'createdAt'
      > & {
        displayStatus: CustomerAccountAPI.Fulfillment['latestShipmentStatus'];
      } & {
        trackingInformation: Array<
          Pick<
            CustomerAccountAPI.TrackingInformation,
            'company' | 'number' | 'url'
          >
        >;
        trackingInfo: Array<
          Pick<
            CustomerAccountAPI.TrackingInformation,
            'company' | 'number' | 'url'
          >
        >;
      }
    >;
  };
  totalTax?: CustomerAccountAPI.Maybe<
    Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  totalPrice: Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>;
  subtotal?: CustomerAccountAPI.Maybe<
    Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  shippingAddress?: CustomerAccountAPI.Maybe<
    Pick<
      CustomerAccountAPI.CustomerAddress,
      'name' | 'formatted' | 'formattedArea'
    >
  >;
  discountApplications: {
    nodes: Array<{
      value:
        | ({__typename: 'MoneyV2'} & Pick<
            CustomerAccountAPI.MoneyV2,
            'amount' | 'currencyCode'
          >)
        | ({__typename: 'PricingPercentageValue'} & Pick<
            CustomerAccountAPI.PricingPercentageValue,
            'percentage'
          >);
    }>;
  };
  lineItems: {
    nodes: Array<
      Pick<
        CustomerAccountAPI.LineItem,
        'id' | 'title' | 'quantity' | 'variantTitle'
      > & {
        price?: CustomerAccountAPI.Maybe<
          Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
        >;
        discountAllocations: Array<{
          allocatedAmount: Pick<
            CustomerAccountAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          discountApplication: {
            value:
              | ({__typename: 'MoneyV2'} & Pick<
                  CustomerAccountAPI.MoneyV2,
                  'amount' | 'currencyCode'
                >)
              | ({__typename: 'PricingPercentageValue'} & Pick<
                  CustomerAccountAPI.PricingPercentageValue,
                  'percentage'
                >);
          };
        }>;
        totalDiscount: Pick<
          CustomerAccountAPI.MoneyV2,
          'amount' | 'currencyCode'
        >;
        image?: CustomerAccountAPI.Maybe<
          Pick<
            CustomerAccountAPI.Image,
            'altText' | 'height' | 'url' | 'id' | 'width'
          >
        >;
        customAttributes: Array<
          Pick<CustomerAccountAPI.Attribute, 'key' | 'value'>
        >;
        properties: Array<Pick<CustomerAccountAPI.Attribute, 'key' | 'value'>>;
      }
    >;
  };
  returnInformation: Pick<
    CustomerAccountAPI.OrderReturnInformation,
    'hasRestockingFee' | 'hasReturnShippingFee' | 'returnShippingMethodNote'
  > & {
    nonReturnableSummary?: CustomerAccountAPI.Maybe<
      Pick<CustomerAccountAPI.OrderNonReturnableSummary, 'nonReturnableReasons'>
    >;
    returnableLineItems: {
      nodes: Array<
        Pick<CustomerAccountAPI.ReturnableLineItem, 'quantity'> & {
          lineItem: Pick<
            CustomerAccountAPI.LineItem,
            'id' | 'title' | 'variantTitle' | 'quantity'
          > & {
            image?: CustomerAccountAPI.Maybe<
              Pick<
                CustomerAccountAPI.Image,
                'altText' | 'height' | 'id' | 'url' | 'width'
              >
            >;
            price?: CustomerAccountAPI.Maybe<
              Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            suggestedReturnReasonDefinitions?: CustomerAccountAPI.Maybe<{
              nodes: Array<
                Pick<
                  CustomerAccountAPI.ReturnReasonDefinition,
                  'id' | 'name' | 'handle' | 'deleted'
                >
              >;
            }>;
          };
        }
      >;
    };
  };
  returns: {
    nodes: Array<
      Pick<
        CustomerAccountAPI.Return,
        'id' | 'name' | 'status' | 'createdAt' | 'closedAt'
      > & {
        returnLineItems: {
          nodes: Array<
            | (Pick<
                CustomerAccountAPI.ReturnLineItem,
                'id' | 'quantity' | 'returnReason'
              > & {
                returnReasonDefinition?: CustomerAccountAPI.Maybe<
                  Pick<
                    CustomerAccountAPI.ReturnReasonDefinition,
                    'id' | 'name' | 'handle'
                  >
                >;
                lineItem: Pick<
                  CustomerAccountAPI.LineItem,
                  'id' | 'title' | 'variantTitle'
                > & {
                  image?: CustomerAccountAPI.Maybe<
                    Pick<
                      CustomerAccountAPI.Image,
                      'altText' | 'height' | 'id' | 'url' | 'width'
                    >
                  >;
                  price?: CustomerAccountAPI.Maybe<
                    Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                };
              })
            | (Pick<
                CustomerAccountAPI.UnverifiedReturnLineItem,
                'id' | 'quantity' | 'returnReason'
              > & {
                returnReasonDefinition?: CustomerAccountAPI.Maybe<
                  Pick<
                    CustomerAccountAPI.ReturnReasonDefinition,
                    'id' | 'name' | 'handle'
                  >
                >;
                lineItem: Pick<
                  CustomerAccountAPI.LineItem,
                  'id' | 'title' | 'variantTitle'
                > & {
                  image?: CustomerAccountAPI.Maybe<
                    Pick<
                      CustomerAccountAPI.Image,
                      'altText' | 'height' | 'id' | 'url' | 'width'
                    >
                  >;
                  price?: CustomerAccountAPI.Maybe<
                    Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                };
              })
          >;
        };
      }
    >;
  };
};

export type OrderQueryVariables = CustomerAccountAPI.Exact<{
  orderId: CustomerAccountAPI.Scalars['ID']['input'];
  language?: CustomerAccountAPI.InputMaybe<CustomerAccountAPI.LanguageCode>;
}>;

export type OrderQuery = {
  order?: CustomerAccountAPI.Maybe<
    Pick<
      CustomerAccountAPI.Order,
      | 'id'
      | 'name'
      | 'confirmationNumber'
      | 'statusPageUrl'
      | 'fulfillmentStatus'
      | 'financialStatus'
      | 'processedAt'
    > & {
      fulfillments: {
        nodes: Array<
          Pick<
            CustomerAccountAPI.Fulfillment,
            'status' | 'latestShipmentStatus' | 'createdAt'
          > & {
            displayStatus: CustomerAccountAPI.Fulfillment['latestShipmentStatus'];
          } & {
            trackingInformation: Array<
              Pick<
                CustomerAccountAPI.TrackingInformation,
                'company' | 'number' | 'url'
              >
            >;
            trackingInfo: Array<
              Pick<
                CustomerAccountAPI.TrackingInformation,
                'company' | 'number' | 'url'
              >
            >;
          }
        >;
      };
      totalTax?: CustomerAccountAPI.Maybe<
        Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      totalPrice: Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>;
      subtotal?: CustomerAccountAPI.Maybe<
        Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      shippingAddress?: CustomerAccountAPI.Maybe<
        Pick<
          CustomerAccountAPI.CustomerAddress,
          'name' | 'formatted' | 'formattedArea'
        >
      >;
      discountApplications: {
        nodes: Array<{
          value:
            | ({__typename: 'MoneyV2'} & Pick<
                CustomerAccountAPI.MoneyV2,
                'amount' | 'currencyCode'
              >)
            | ({__typename: 'PricingPercentageValue'} & Pick<
                CustomerAccountAPI.PricingPercentageValue,
                'percentage'
              >);
        }>;
      };
      lineItems: {
        nodes: Array<
          Pick<
            CustomerAccountAPI.LineItem,
            'id' | 'title' | 'quantity' | 'variantTitle'
          > & {
            price?: CustomerAccountAPI.Maybe<
              Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
            >;
            discountAllocations: Array<{
              allocatedAmount: Pick<
                CustomerAccountAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
              discountApplication: {
                value:
                  | ({__typename: 'MoneyV2'} & Pick<
                      CustomerAccountAPI.MoneyV2,
                      'amount' | 'currencyCode'
                    >)
                  | ({__typename: 'PricingPercentageValue'} & Pick<
                      CustomerAccountAPI.PricingPercentageValue,
                      'percentage'
                    >);
              };
            }>;
            totalDiscount: Pick<
              CustomerAccountAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
            image?: CustomerAccountAPI.Maybe<
              Pick<
                CustomerAccountAPI.Image,
                'altText' | 'height' | 'url' | 'id' | 'width'
              >
            >;
            customAttributes: Array<
              Pick<CustomerAccountAPI.Attribute, 'key' | 'value'>
            >;
            properties: Array<
              Pick<CustomerAccountAPI.Attribute, 'key' | 'value'>
            >;
          }
        >;
      };
      returnInformation: Pick<
        CustomerAccountAPI.OrderReturnInformation,
        'hasRestockingFee' | 'hasReturnShippingFee' | 'returnShippingMethodNote'
      > & {
        nonReturnableSummary?: CustomerAccountAPI.Maybe<
          Pick<
            CustomerAccountAPI.OrderNonReturnableSummary,
            'nonReturnableReasons'
          >
        >;
        returnableLineItems: {
          nodes: Array<
            Pick<CustomerAccountAPI.ReturnableLineItem, 'quantity'> & {
              lineItem: Pick<
                CustomerAccountAPI.LineItem,
                'id' | 'title' | 'variantTitle' | 'quantity'
              > & {
                image?: CustomerAccountAPI.Maybe<
                  Pick<
                    CustomerAccountAPI.Image,
                    'altText' | 'height' | 'id' | 'url' | 'width'
                  >
                >;
                price?: CustomerAccountAPI.Maybe<
                  Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>
                >;
                suggestedReturnReasonDefinitions?: CustomerAccountAPI.Maybe<{
                  nodes: Array<
                    Pick<
                      CustomerAccountAPI.ReturnReasonDefinition,
                      'id' | 'name' | 'handle' | 'deleted'
                    >
                  >;
                }>;
              };
            }
          >;
        };
      };
      returns: {
        nodes: Array<
          Pick<
            CustomerAccountAPI.Return,
            'id' | 'name' | 'status' | 'createdAt' | 'closedAt'
          > & {
            returnLineItems: {
              nodes: Array<
                | (Pick<
                    CustomerAccountAPI.ReturnLineItem,
                    'id' | 'quantity' | 'returnReason'
                  > & {
                    returnReasonDefinition?: CustomerAccountAPI.Maybe<
                      Pick<
                        CustomerAccountAPI.ReturnReasonDefinition,
                        'id' | 'name' | 'handle'
                      >
                    >;
                    lineItem: Pick<
                      CustomerAccountAPI.LineItem,
                      'id' | 'title' | 'variantTitle'
                    > & {
                      image?: CustomerAccountAPI.Maybe<
                        Pick<
                          CustomerAccountAPI.Image,
                          'altText' | 'height' | 'id' | 'url' | 'width'
                        >
                      >;
                      price?: CustomerAccountAPI.Maybe<
                        Pick<
                          CustomerAccountAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >
                      >;
                    };
                  })
                | (Pick<
                    CustomerAccountAPI.UnverifiedReturnLineItem,
                    'id' | 'quantity' | 'returnReason'
                  > & {
                    returnReasonDefinition?: CustomerAccountAPI.Maybe<
                      Pick<
                        CustomerAccountAPI.ReturnReasonDefinition,
                        'id' | 'name' | 'handle'
                      >
                    >;
                    lineItem: Pick<
                      CustomerAccountAPI.LineItem,
                      'id' | 'title' | 'variantTitle'
                    > & {
                      image?: CustomerAccountAPI.Maybe<
                        Pick<
                          CustomerAccountAPI.Image,
                          'altText' | 'height' | 'id' | 'url' | 'width'
                        >
                      >;
                      price?: CustomerAccountAPI.Maybe<
                        Pick<
                          CustomerAccountAPI.MoneyV2,
                          'amount' | 'currencyCode'
                        >
                      >;
                    };
                  })
              >;
            };
          }
        >;
      };
    }
  >;
};

export type OrderItemFragment = Pick<
  CustomerAccountAPI.Order,
  | 'financialStatus'
  | 'fulfillmentStatus'
  | 'id'
  | 'number'
  | 'confirmationNumber'
  | 'processedAt'
> & {
  totalPrice: Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>;
  fulfillments: {nodes: Array<Pick<CustomerAccountAPI.Fulfillment, 'status'>>};
  returns: {nodes: Array<Pick<CustomerAccountAPI.Return, 'id' | 'status'>>};
};

export type CustomerOrdersFragment = {
  orders: {
    nodes: Array<
      Pick<
        CustomerAccountAPI.Order,
        | 'financialStatus'
        | 'fulfillmentStatus'
        | 'id'
        | 'number'
        | 'confirmationNumber'
        | 'processedAt'
      > & {
        totalPrice: Pick<CustomerAccountAPI.MoneyV2, 'amount' | 'currencyCode'>;
        fulfillments: {
          nodes: Array<Pick<CustomerAccountAPI.Fulfillment, 'status'>>;
        };
        returns: {
          nodes: Array<Pick<CustomerAccountAPI.Return, 'id' | 'status'>>;
        };
      }
    >;
    pageInfo: Pick<
      CustomerAccountAPI.PageInfo,
      'hasPreviousPage' | 'hasNextPage' | 'endCursor' | 'startCursor'
    >;
  };
};

export type CustomerOrdersQueryVariables = CustomerAccountAPI.Exact<{
  endCursor?: CustomerAccountAPI.InputMaybe<
    CustomerAccountAPI.Scalars['String']['input']
  >;
  first?: CustomerAccountAPI.InputMaybe<
    CustomerAccountAPI.Scalars['Int']['input']
  >;
  last?: CustomerAccountAPI.InputMaybe<
    CustomerAccountAPI.Scalars['Int']['input']
  >;
  startCursor?: CustomerAccountAPI.InputMaybe<
    CustomerAccountAPI.Scalars['String']['input']
  >;
  query?: CustomerAccountAPI.InputMaybe<
    CustomerAccountAPI.Scalars['String']['input']
  >;
  language?: CustomerAccountAPI.InputMaybe<CustomerAccountAPI.LanguageCode>;
}>;

export type CustomerOrdersQuery = {
  customer: {
    orders: {
      nodes: Array<
        Pick<
          CustomerAccountAPI.Order,
          | 'financialStatus'
          | 'fulfillmentStatus'
          | 'id'
          | 'number'
          | 'confirmationNumber'
          | 'processedAt'
        > & {
          totalPrice: Pick<
            CustomerAccountAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
          fulfillments: {
            nodes: Array<Pick<CustomerAccountAPI.Fulfillment, 'status'>>;
          };
          returns: {
            nodes: Array<Pick<CustomerAccountAPI.Return, 'id' | 'status'>>;
          };
        }
      >;
      pageInfo: Pick<
        CustomerAccountAPI.PageInfo,
        'hasPreviousPage' | 'hasNextPage' | 'endCursor' | 'startCursor'
      >;
    };
  };
};

export type CustomerUpdateMutationVariables = CustomerAccountAPI.Exact<{
  customer: CustomerAccountAPI.CustomerUpdateInput;
  language?: CustomerAccountAPI.InputMaybe<CustomerAccountAPI.LanguageCode>;
}>;

export type CustomerUpdateMutation = {
  customerUpdate?: CustomerAccountAPI.Maybe<{
    customer?: CustomerAccountAPI.Maybe<
      Pick<CustomerAccountAPI.Customer, 'firstName' | 'lastName'> & {
        emailAddress?: CustomerAccountAPI.Maybe<
          Pick<CustomerAccountAPI.CustomerEmailAddress, 'emailAddress'>
        >;
        phoneNumber?: CustomerAccountAPI.Maybe<
          Pick<CustomerAccountAPI.CustomerPhoneNumber, 'phoneNumber'>
        >;
      }
    >;
    userErrors: Array<
      Pick<
        CustomerAccountAPI.UserErrorsCustomerUserErrors,
        'code' | 'field' | 'message'
      >
    >;
  }>;
};

export type OrderRequestReturnMutationVariables = CustomerAccountAPI.Exact<{
  orderId: CustomerAccountAPI.Scalars['ID']['input'];
  requestedLineItems:
    | Array<CustomerAccountAPI.RequestedLineItemInput>
    | CustomerAccountAPI.RequestedLineItemInput;
  language?: CustomerAccountAPI.InputMaybe<CustomerAccountAPI.LanguageCode>;
}>;

export type OrderRequestReturnMutation = {
  orderRequestReturn?: CustomerAccountAPI.Maybe<{
    return?: CustomerAccountAPI.Maybe<
      Pick<CustomerAccountAPI.Return, 'id' | 'name' | 'status'>
    >;
    userErrors: Array<
      Pick<CustomerAccountAPI.ReturnUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

interface GeneratedQueryTypes {
  '#graphql\n  query CustomerDetails($language: LanguageCode) @inContext(language: $language) {\n    customer {\n      ...Customer\n    }\n  }\n  #graphql\n  fragment Customer on Customer {\n    id\n    firstName\n    lastName\n    defaultAddress {\n      ...Address\n    }\n    addresses(first: 6) {\n      nodes {\n        ...Address\n      }\n    }\n  }\n  fragment Address on CustomerAddress {\n    id\n    formatted\n    firstName\n    lastName\n    company\n    address1\n    address2\n    territoryCode\n    zoneCode\n    city\n    zip\n    phoneNumber\n  }\n\n': {
    return: CustomerDetailsQuery;
    variables: CustomerDetailsQueryVariables;
  };
  '#graphql\n  fragment OrderMoney on MoneyV2 {\n    amount\n    currencyCode\n  }\n  fragment DiscountApplication on DiscountApplication {\n    value {\n      __typename\n      ... on MoneyV2 {\n        ...OrderMoney\n      }\n      ... on PricingPercentageValue {\n        percentage\n      }\n    }\n  }\n  fragment OrderLineItemFull on LineItem {\n    id\n    title\n    quantity\n    price {\n      ...OrderMoney\n    }\n    discountAllocations {\n      allocatedAmount {\n        ...OrderMoney\n      }\n      discountApplication {\n        ...DiscountApplication\n      }\n    }\n    totalDiscount {\n      ...OrderMoney\n    }\n    image {\n      altText\n      height\n      url\n      id\n      width\n    }\n    variantTitle\n    customAttributes {\n      key\n      value\n    }\n    properties: customAttributes {\n      key\n      value\n    }\n  }\n  fragment ReturnableLineItemFull on ReturnableLineItem {\n    quantity\n    lineItem {\n      id\n      title\n      variantTitle\n      quantity\n      image {\n        altText\n        height\n        id\n        url\n        width\n      }\n      price {\n        ...OrderMoney\n      }\n      suggestedReturnReasonDefinitions(first: 20) {\n        nodes {\n          id\n          name\n          handle\n          deleted\n        }\n      }\n    }\n  }\n  fragment ReturnLineItemFull on ReturnLineItemType {\n    id\n    quantity\n    returnReason\n    returnReasonDefinition {\n      id\n      name\n      handle\n    }\n    lineItem {\n      id\n      title\n      variantTitle\n      image {\n        altText\n        height\n        id\n        url\n        width\n      }\n      price {\n        ...OrderMoney\n      }\n    }\n  }\n  fragment ReturnFull on Return {\n    id\n    name\n    status\n    createdAt\n    closedAt\n    returnLineItems(first: 50) {\n      nodes {\n        ...ReturnLineItemFull\n      }\n    }\n  }\n  fragment Order on Order {\n    id\n    name\n    confirmationNumber\n    statusPageUrl\n    fulfillmentStatus\n    financialStatus\n    processedAt\n    fulfillments(first: 10) {\n      nodes {\n        status\n        latestShipmentStatus\n        displayStatus: latestShipmentStatus\n        createdAt\n        trackingInformation {\n          company\n          number\n          url\n        }\n        trackingInfo: trackingInformation {\n          company\n          number\n          url\n        }\n      }\n    }\n    totalTax {\n      ...OrderMoney\n    }\n    totalPrice {\n      ...OrderMoney\n    }\n    subtotal {\n      ...OrderMoney\n    }\n    shippingAddress {\n      name\n      formatted(withName: true)\n      formattedArea\n    }\n    discountApplications(first: 100) {\n      nodes {\n        ...DiscountApplication\n      }\n    }\n    lineItems(first: 100) {\n      nodes {\n        ...OrderLineItemFull\n      }\n    }\n    returnInformation {\n      hasRestockingFee\n      hasReturnShippingFee\n      returnShippingMethodNote\n      nonReturnableSummary {\n        nonReturnableReasons\n      }\n      returnableLineItems(first: 50) {\n        nodes {\n          ...ReturnableLineItemFull\n        }\n      }\n    }\n    returns(first: 20) {\n      nodes {\n        ...ReturnFull\n      }\n    }\n  }\n  query Order($orderId: ID!, $language: LanguageCode)\n    @inContext(language: $language) {\n    order(id: $orderId) {\n      ... on Order {\n        ...Order\n      }\n    }\n  }\n': {
    return: OrderQuery;
    variables: OrderQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment CustomerOrders on Customer {\n    orders(\n      sortKey: PROCESSED_AT,\n      reverse: true,\n      first: $first,\n      last: $last,\n      before: $startCursor,\n      after: $endCursor,\n      query: $query\n    ) {\n      nodes {\n        ...OrderItem\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        endCursor\n        startCursor\n      }\n    }\n  }\n  #graphql\n  fragment OrderItem on Order {\n    totalPrice {\n      amount\n      currencyCode\n    }\n    financialStatus\n    fulfillmentStatus\n    fulfillments(first: 1) {\n      nodes {\n        status\n      }\n    }\n    returns(first: 1) {\n      nodes {\n        id\n        status\n      }\n    }\n    id\n    number\n    confirmationNumber\n    processedAt\n  }\n\n\n  query CustomerOrders(\n    $endCursor: String\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $query: String\n    $language: LanguageCode\n  ) @inContext(language: $language) {\n    customer {\n      ...CustomerOrders\n    }\n  }\n': {
    return: CustomerOrdersQuery;
    variables: CustomerOrdersQueryVariables;
  };
}

interface GeneratedMutationTypes {
  '#graphql\n  mutation customerAddressUpdate(\n    $address: CustomerAddressInput!\n    $addressId: ID!\n    $defaultAddress: Boolean\n    $language: LanguageCode\n ) @inContext(language: $language) {\n    customerAddressUpdate(\n      address: $address\n      addressId: $addressId\n      defaultAddress: $defaultAddress\n    ) {\n      customerAddress {\n        id\n      }\n      userErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerAddressUpdateMutation;
    variables: CustomerAddressUpdateMutationVariables;
  };
  '#graphql\n  mutation customerAddressDelete(\n    $addressId: ID!\n    $language: LanguageCode\n  ) @inContext(language: $language) {\n    customerAddressDelete(addressId: $addressId) {\n      deletedAddressId\n      userErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerAddressDeleteMutation;
    variables: CustomerAddressDeleteMutationVariables;
  };
  '#graphql\n  mutation customerAddressCreate(\n    $address: CustomerAddressInput!\n    $defaultAddress: Boolean\n    $language: LanguageCode\n  ) @inContext(language: $language) {\n    customerAddressCreate(\n      address: $address\n      defaultAddress: $defaultAddress\n    ) {\n      customerAddress {\n        id\n      }\n      userErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerAddressCreateMutation;
    variables: CustomerAddressCreateMutationVariables;
  };
  '#graphql\n  mutation customerUpdate(\n    $customer: CustomerUpdateInput!\n    $language: LanguageCode\n  ) @inContext(language: $language) {\n    customerUpdate(input: $customer) {\n      customer {\n        firstName\n        lastName\n        emailAddress {\n          emailAddress\n        }\n        phoneNumber {\n          phoneNumber\n        }\n      }\n      userErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: CustomerUpdateMutation;
    variables: CustomerUpdateMutationVariables;
  };
  '#graphql\n  mutation OrderRequestReturn(\n    $orderId: ID!\n    $requestedLineItems: [RequestedLineItemInput!]!\n    $language: LanguageCode\n  ) @inContext(language: $language) {\n    orderRequestReturn(\n      orderId: $orderId\n      requestedLineItems: $requestedLineItems\n    ) {\n      return {\n        id\n        name\n        status\n      }\n      userErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: OrderRequestReturnMutation;
    variables: OrderRequestReturnMutationVariables;
  };
}

declare module '@shopify/hydrogen' {
  interface CustomerAccountQueries extends GeneratedQueryTypes {}
  interface CustomerAccountMutations extends GeneratedMutationTypes {}
}
