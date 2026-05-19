/**
 * Currency converter — maps country codes to currency symbols + approximate USD exchange rates.
 * Rates are approximate and for display purposes only (not financial).
 */

const CURRENCY_MAP = {
  US: { code: "USD", symbol: "$",   rate: 1 },
  GB: { code: "GBP", symbol: "£",   rate: 0.79 },
  EU: { code: "EUR", symbol: "€",   rate: 0.92 },
  DE: { code: "EUR", symbol: "€",   rate: 0.92 },
  FR: { code: "EUR", symbol: "€",   rate: 0.92 },
  IT: { code: "EUR", symbol: "€",   rate: 0.92 },
  ES: { code: "EUR", symbol: "€",   rate: 0.92 },
  NL: { code: "EUR", symbol: "€",   rate: 0.92 },
  BE: { code: "EUR", symbol: "€",   rate: 0.92 },
  PT: { code: "EUR", symbol: "€",   rate: 0.92 },
  AT: { code: "EUR", symbol: "€",   rate: 0.92 },
  GR: { code: "EUR", symbol: "€",   rate: 0.92 },
  FI: { code: "EUR", symbol: "€",   rate: 0.92 },
  SE: { code: "SEK", symbol: "kr",  rate: 10.4 },
  NO: { code: "NOK", symbol: "kr",  rate: 10.7 },
  DK: { code: "DKK", symbol: "kr",  rate: 6.9 },
  CH: { code: "CHF", symbol: "Fr",  rate: 0.90 },
  PL: { code: "PLN", symbol: "zł",  rate: 3.95 },
  CZ: { code: "CZK", symbol: "Kč",  rate: 23.2 },
  IL: { code: "ILS", symbol: "₪",   rate: 3.65 },
  CA: { code: "CAD", symbol: "C$",  rate: 1.36 },
  AU: { code: "AUD", symbol: "A$",  rate: 1.53 },
  NZ: { code: "NZD", symbol: "NZ$", rate: 1.63 },
  JP: { code: "JPY", symbol: "¥",   rate: 150.5 },
  KR: { code: "KRW", symbol: "₩",   rate: 1330 },
  CN: { code: "CNY", symbol: "¥",   rate: 7.24 },
  IN: { code: "INR", symbol: "₹",   rate: 83.5 },
  BR: { code: "BRL", symbol: "R$",  rate: 5.0 },
  MX: { code: "MXN", symbol: "MX$", rate: 17.2 },
  ZA: { code: "ZAR", symbol: "R",   rate: 18.8 },
  SG: { code: "SGD", symbol: "S$",  rate: 1.34 },
  HK: { code: "HKD", symbol: "HK$", rate: 7.82 },
  AE: { code: "AED", symbol: "د.إ", rate: 3.67 },
  SA: { code: "SAR", symbol: "﷼",   rate: 3.75 },
  TR: { code: "TRY", symbol: "₺",   rate: 32.5 },
  RU: { code: "RUB", symbol: "₽",   rate: 91 },
  AR: { code: "ARS", symbol: "AR$", rate: 900 },
  TH: { code: "THB", symbol: "฿",   rate: 35.1 },
  ID: { code: "IDR", symbol: "Rp",  rate: 15700 },
  MY: { code: "MYR", symbol: "RM",  rate: 4.70 },
};

export function getCurrencyForCountry(countryCode) {
  return CURRENCY_MAP[countryCode] || CURRENCY_MAP["US"];
}

/**
 * Format a USD price into the user's local currency.
 * @param {number|string} usdPrice - price in USD
 * @param {string} countryCode - ISO country code
 * @returns {string} formatted price string e.g. "₪ 365" or "€ 92"
 */
export function formatLocalPrice(usdPrice, countryCode) {
  const price = parseFloat(usdPrice);
  if (!price || isNaN(price)) return null;

  const currency = getCurrencyForCountry(countryCode);
  const converted = price * currency.rate;

  // Format based on magnitude
  let formatted;
  if (converted >= 1000) {
    formatted = Math.round(converted).toLocaleString();
  } else if (converted >= 10) {
    formatted = Math.round(converted * 10) / 10; // 1 decimal
  } else {
    formatted = (Math.round(converted * 100) / 100).toFixed(2);
  }

  return `${currency.symbol}${formatted}`;
}