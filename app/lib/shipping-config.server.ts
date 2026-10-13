const SHIPPING_COUNTRY = 'US';
const SHIPPING_METHOD_NAME = 'Standard';
const ADMIN_API_VERSION = '2026-07';
const CACHE_TTL_MS = 60_000;

export type ShippingConfig = {
  threshold: number | null;
  currency: string | null;
  standardPrice: number | null;
  minDays: number | null;
  maxDays: number | null;
  methodName: string | null;
};

const EMPTY_SHIPPING_CONFIG: ShippingConfig = {
  threshold: null,
  currency: null,
  standardPrice: null,
  minDays: null,
  maxDays: null,
  methodName: null,
};

const RANGE_DAYS = /(\d+)\s*(?:-|to|–|—)\s*(\d+)\s*(?:business\s*)?days?/i;
const SINGLE_DAYS = /(\d+)\s*(?:business\s*)?days?/i;

const SHIPPING_RATES_QUERY = `query ShippingRates {
  deliveryProfiles(first: 5) {
    nodes {
      name
      default
      profileLocationGroups {
        locationGroupZones(first: 10) {
          nodes {
            zone { name countries { name code { countryCode } } }
            methodDefinitions(first: 20) {
              nodes {
                name
                description
                active
                rateProvider {
                  ... on DeliveryRateDefinition {
                    price { amount currencyCode }
                  }
                }
                methodConditions {
                  field
                  operator
                  conditionCriteria {
                    ... on MoneyV2 { amount currencyCode }
                    ... on Weight { value unit }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

type AdminGraphQLError = {
  message?: string;
  extensions?: {code?: string};
};

type CacheEntry = {
  expiresAt: number;
  value: ShippingConfig;
};

let cache: CacheEntry | null = null;

class ShippingConfigError extends Error {
  status: number | null;
  errors: AdminGraphQLError[];

  constructor(
    message: string,
    status: number | null,
    errors: AdminGraphQLError[],
  ) {
    super(message);
    this.name = 'ShippingConfigError';
    this.status = status;
    this.errors = errors;
  }
}

export async function fetchShippingConfig(env: Env): Promise<ShippingConfig> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  try {
    const value = await loadShippingConfig(env);
    cache = {expiresAt: now + CACHE_TTL_MS, value};
    return value;
  } catch (error) {
    const status = error instanceof ShippingConfigError ? error.status : null;
    const errors = error instanceof ShippingConfigError ? error.errors : [];
    const denied = errors.some(
      (entry) =>
        entry.extensions?.code === 'ACCESS_DENIED' ||
        entry.message?.includes('ACCESS_DENIED'),
    );
    const hints = [
      status == null ? 'HTTP n/a' : `HTTP ${status}`,
      status === 401 ? '401 = token expired/wrong domain' : null,
      denied ? 'ACCESS_DENIED = missing read_shipping scope' : null,
    ].filter((hint): hint is string => Boolean(hint));

    console.error(`[shipping-config] ${hints.join('; ')}`, errors, error);
    return {...EMPTY_SHIPPING_CONFIG};
  }
}

async function loadShippingConfig(env: Env): Promise<ShippingConfig> {
  if (!env.PUBLIC_STORE_DOMAIN || !env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new ShippingConfigError(
      'Missing store domain or admin access token',
      null,
      [],
    );
  }

  const endpoint = `https://${env.PUBLIC_STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query: SHIPPING_RATES_QUERY}),
    });
  } catch (error) {
    throw new ShippingConfigError(
      error instanceof Error ? error.message : 'Admin API request failed',
      null,
      [],
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  const errors = readErrors(payload);
  if (!response.ok || errors.length > 0) {
    throw new ShippingConfigError(
      'Admin shipping query failed',
      response.status,
      errors,
    );
  }

  const methods = findStandardMethods(payload);
  const thresholdMethod =
    methods.find((method) => readPriceThreshold(method) != null) ?? methods[0] ?? null;
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[shipping-config] matched Standard method',
      JSON.stringify(thresholdMethod, null, 2),
    );
  }

  const config = configFromMethods(methods);
  if (config.minDays == null || config.maxDays == null) {
    const transit = await loadTransitDays(env);
    if (transit) {
      config.minDays = transit.minDays;
      config.maxDays = transit.maxDays;
    }
  }

  return config;
}

async function loadTransitDays(
  env: Env,
): Promise<{minDays: number; maxDays: number} | null> {
  try {
    const response = await fetch(
      `https://${env.PUBLIC_STORE_DOMAIN}/admin/api/unstable/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({query: SHIPPING_TRANSIT_QUERY}),
      },
    );
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || readErrors(payload).length > 0) return null;
    return transitDaysFromMethods(findStandardMethods(payload));
  } catch (error) {
    console.error('[shipping-config] transit time lookup failed', error);
    return null;
  }
}

const SHIPPING_TRANSIT_QUERY = `query ShippingTransit {
  deliveryProfiles(first: 5) {
    nodes {
      name
      default
      profileLocationGroups {
        locationGroupZones(first: 10) {
          nodes {
            zone { name countries { name code { countryCode } } }
            methodDefinitions(first: 20) {
              nodes {
                name
                active
                rateProvider {
                  ... on DeliveryRateDefinition {
                    minTransitTime
                    maxTransitTime
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

function findStandardMethods(payload: unknown): Record<string, unknown>[] {
  const profiles = readNodes(
    isRecord(payload) && isRecord(payload.data)
      ? payload.data.deliveryProfiles
      : null,
  );
  const ordered = [...profiles].sort(
    (left, right) => Number(right.default === true) - Number(left.default === true),
  );

  for (const profile of ordered) {
    const groups = Array.isArray(profile.profileLocationGroups)
      ? profile.profileLocationGroups.filter(isRecord)
      : [];

    for (const group of groups) {
      const zones = readNodes(group.locationGroupZones);
      for (const zoneNode of zones) {
        if (!zoneIncludesCountry(zoneNode.zone, SHIPPING_COUNTRY)) continue;
        const methods = readNodes(zoneNode.methodDefinitions).filter(isStandardMethod);
        if (methods.length > 0) return methods;
      }
    }
  }

  return [];
}

function isStandardMethod(definition: Record<string, unknown>): boolean {
  return (
    definition.active === true &&
    typeof definition.name === 'string' &&
    definition.name.trim().toLowerCase() === SHIPPING_METHOD_NAME.toLowerCase()
  );
}

function configFromMethods(methods: Record<string, unknown>[]): ShippingConfig {
  if (methods.length === 0) return {...EMPTY_SHIPPING_CONFIG};

  const thresholdMethod =
    methods.find((method) => readPriceThreshold(method) != null) ?? null;
  const pricedMethod =
    methods.find((method) => {
      const price = readRatePrice(method.rateProvider);
      return price != null && price.amount > 0;
    }) ??
    thresholdMethod ??
    methods[0];
  const thresholdMoney = thresholdMethod
    ? readPriceThreshold(thresholdMethod)
    : null;
  const price = readRatePrice(pricedMethod?.rateProvider);
  const days = methods.reduce<{minDays: number; maxDays: number} | null>(
    (found, method) => found ?? readMethodDays(method),
    null,
  );

  return {
    threshold: thresholdMoney?.amount ?? null,
    currency: thresholdMoney?.currency ?? price?.currency ?? null,
    standardPrice: price?.amount ?? null,
    minDays: days?.minDays ?? null,
    maxDays: days?.maxDays ?? null,
    methodName:
      typeof pricedMethod?.name === 'string' ? pricedMethod.name : null,
  };
}

function readPriceThreshold(
  method: Record<string, unknown>,
): {amount: number; currency: string} | null {
  const condition = readConditions(method.methodConditions).find(
    (entry) =>
      entry.field === 'TOTAL_PRICE' &&
      entry.operator === 'GREATER_THAN_OR_EQUAL_TO' &&
      isMoney(entry.conditionCriteria),
  );
  return isMoney(condition?.conditionCriteria)
    ? readMoney(condition.conditionCriteria)
    : null;
}

function readMethodDays(
  method: Record<string, unknown>,
): {minDays: number; maxDays: number} | null {
  return (
    parseDeliveryDays(
      typeof method.description === 'string' ? method.description : null,
    ) ??
    parseDeliveryDays(typeof method.name === 'string' ? method.name : null) ??
    transitDays(method.rateProvider)
  );
}

function transitDaysFromMethods(
  methods: Record<string, unknown>[],
): {minDays: number; maxDays: number} | null {
  for (const method of methods) {
    const days = transitDays(method.rateProvider);
    if (days) return days;
  }
  return null;
}

function transitDays(
  rateProvider: unknown,
): {minDays: number; maxDays: number} | null {
  if (!isRecord(rateProvider)) return null;
  const minDays = secondsToDays(rateProvider.minTransitTime);
  const maxDays = secondsToDays(rateProvider.maxTransitTime);
  if (minDays == null && maxDays == null) return null;
  const start = minDays ?? maxDays;
  const end = maxDays ?? minDays;
  if (start == null || end == null) return null;
  return {minDays: Math.min(start, end), maxDays: Math.max(start, end)};
}

function secondsToDays(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value / 86_400);
}

function parseDeliveryDays(
  text: string | null,
): {minDays: number; maxDays: number} | null {
  if (!text) return null;

  const range = RANGE_DAYS.exec(text);
  if (range?.[1] && range[2]) {
    const first = Number(range[1]);
    const second = Number(range[2]);
    if (Number.isFinite(first) && Number.isFinite(second)) {
      return {
        minDays: Math.min(first, second),
        maxDays: Math.max(first, second),
      };
    }
  }

  const single = SINGLE_DAYS.exec(text);
  if (single?.[1]) {
    const days = Number(single[1]);
    if (Number.isFinite(days)) return {minDays: days, maxDays: days};
  }

  return null;
}

function zoneIncludesCountry(zone: unknown, countryCode: string): boolean {
  if (!isRecord(zone) || !Array.isArray(zone.countries)) return false;
  return zone.countries.some((country) => {
    if (!isRecord(country) || !isRecord(country.code)) return false;
    return country.code.countryCode === countryCode;
  });
}

function readRatePrice(
  rateProvider: unknown,
): {amount: number; currency: string} | null {
  if (!isRecord(rateProvider)) return null;
  return readMoney(rateProvider.price);
}

function readConditions(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function readMoney(
  value: unknown,
): {amount: number; currency: string} | null {
  if (!isMoney(value)) return null;
  const amount = Number.parseFloat(value.amount);
  if (!Number.isFinite(amount)) return null;
  return {amount, currency: value.currencyCode};
}

function isMoney(
  value: unknown,
): value is {amount: string; currencyCode: string} {
  return (
    isRecord(value) &&
    typeof value.amount === 'string' &&
    typeof value.currencyCode === 'string'
  );
}

function readNodes(connection: unknown): Array<Record<string, unknown>> {
  if (!isRecord(connection) || !Array.isArray(connection.nodes)) return [];
  return connection.nodes.filter(isRecord);
}

function readErrors(payload: unknown): AdminGraphQLError[] {
  if (!isRecord(payload)) return [];
  if (typeof payload.errors === 'string') return [{message: payload.errors}];
  if (!Array.isArray(payload.errors)) return [];
  return payload.errors.filter(isRecord).map((error) => {
    const extensions = isRecord(error.extensions) ? error.extensions : null;
    return {
      message: typeof error.message === 'string' ? error.message : undefined,
      extensions: {
        code:
          extensions && typeof extensions.code === 'string'
            ? extensions.code
            : undefined,
      },
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
