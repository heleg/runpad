export const workspaceName = "@runpad/logger";

export function normalizeSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function sumPrices(prices) {
  if (prices.some((price) => !Number.isSafeInteger(price) || price < 0)) {
    throw new TypeError('Prices must be non-negative integer cents');
  }
  return prices.reduce((sum, price) => sum + price, 0);
}
