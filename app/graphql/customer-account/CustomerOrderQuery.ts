// NOTE: https://shopify.dev/docs/api/customer/latest/queries/order
export const CUSTOMER_ORDER_QUERY = `#graphql
  fragment OrderMoney on MoneyV2 {
    amount
    currencyCode
  }
  fragment DiscountApplication on DiscountApplication {
    value {
      __typename
      ... on MoneyV2 {
        ...OrderMoney
      }
      ... on PricingPercentageValue {
        percentage
      }
    }
  }
  fragment OrderLineItemFull on LineItem {
    id
    title
    quantity
    price {
      ...OrderMoney
    }
    discountAllocations {
      allocatedAmount {
        ...OrderMoney
      }
      discountApplication {
        ...DiscountApplication
      }
    }
    totalDiscount {
      ...OrderMoney
    }
    image {
      altText
      height
      url
      id
      width
    }
    variantTitle
    customAttributes {
      key
      value
    }
    properties: customAttributes {
      key
      value
    }
  }
  fragment ReturnableLineItemFull on ReturnableLineItem {
    quantity
    lineItem {
      id
      title
      variantTitle
      quantity
      image {
        altText
        height
        id
        url
        width
      }
      price {
        ...OrderMoney
      }
      suggestedReturnReasonDefinitions(first: 20) {
        nodes {
          id
          name
          handle
          deleted
        }
      }
    }
  }
  fragment ReturnLineItemFull on ReturnLineItemType {
    id
    quantity
    returnReason
    returnReasonDefinition {
      id
      name
      handle
    }
    lineItem {
      id
      title
      variantTitle
      image {
        altText
        height
        id
        url
        width
      }
      price {
        ...OrderMoney
      }
    }
  }
  fragment ReturnFull on Return {
    id
    name
    status
    createdAt
    closedAt
    returnLineItems(first: 50) {
      nodes {
        ...ReturnLineItemFull
      }
    }
  }
  fragment Order on Order {
    id
    name
    confirmationNumber
    statusPageUrl
    fulfillmentStatus
    financialStatus
    processedAt
    fulfillments(first: 10) {
      nodes {
        status
        latestShipmentStatus
        displayStatus: latestShipmentStatus
        createdAt
        trackingInformation {
          company
          number
          url
        }
        trackingInfo: trackingInformation {
          company
          number
          url
        }
      }
    }
    totalTax {
      ...OrderMoney
    }
    totalPrice {
      ...OrderMoney
    }
    subtotal {
      ...OrderMoney
    }
    shippingAddress {
      name
      formatted(withName: true)
      formattedArea
    }
    discountApplications(first: 100) {
      nodes {
        ...DiscountApplication
      }
    }
    lineItems(first: 100) {
      nodes {
        ...OrderLineItemFull
      }
    }
    returnInformation {
      hasRestockingFee
      hasReturnShippingFee
      returnShippingMethodNote
      nonReturnableSummary {
        nonReturnableReasons
      }
      returnableLineItems(first: 50) {
        nodes {
          ...ReturnableLineItemFull
        }
      }
    }
    returns(first: 20) {
      nodes {
        ...ReturnFull
      }
    }
  }
  query Order($orderId: ID!, $language: LanguageCode)
    @inContext(language: $language) {
    order(id: $orderId) {
      ... on Order {
        ...Order
      }
    }
  }
` as const;
