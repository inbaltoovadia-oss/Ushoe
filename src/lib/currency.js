/**
 * Currency utilities — maps country codes to symbols
 */

const CURRENCY_MAP = {
  IL: 'ILS', GB: 'GBP', EU: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR',
  NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
  AU: 'AUD', CA: 'CAD', JP: 'JPY', KR: 'KRW', CN: 'CNY', IN: 'INR',
  BR: 'BRL', MX: 'MXN', SE: 'SEK', NO: 'NOK', DK: 'DKK', CH: 'CHF',
  SG: 'SGD', HK: 'HKD', NZ: 'NZD', ZA: 'ZAR', AE: 'AED', SA: 'SAR',
};

const CURRENCY_SYMBOLS = {
  USD: '$', ILS: '₪', GBP: '£', EUR: '€', AUD: 'A$', CAD: 'C$',
  JPY: '¥', KRW: '₩', CNY: '¥', INR: '₹', BRL: 'R$', MXN: 'MX$',
  SEK: 'kr', NOK: 'kr', DKK: 'kr', CHF: 'CHF', SGD: 'S$', HKD: 'HK$',
  NZD: 'NZ$', ZAR: 'R', AED: 'AED', SAR: 'SAR',
};

export function getCurrencySymbol(countryCode) {
  const currency = CURRENCY_MAP[(countryCode || '').toUpperCase()] || 'USD';
  return CURRENCY_SYMBOLS[currency] || '$';
}

export function formatPrice(amount, countryCode) {
  if (amount == null) return null;
  const symbol = getCurrencySymbol(countryCode);
  return `${symbol}${Number(amount).toLocaleString()}`;
}