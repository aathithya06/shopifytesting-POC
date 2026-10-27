// NOTE: https://shopify.dev/docs/api/customer/latest/mutations/orderRequestReturn
export const ORDER_REQUEST_RETURN_MUTATION = `#graphql
  mutation OrderRequestReturn(
    $orderId: ID!
    $requestedLineItems: [RequestedLineItemInput!]!
    $language: LanguageCode
  ) @inContext(language: $language) {
    orderRequestReturn(
      orderId: $orderId
      requestedLineItems: $requestedLineItems
    ) {
      return {
        id
        name
        status
      }
      userErrors {
        code
        field
        message
      }
    }
  }
` as const;
