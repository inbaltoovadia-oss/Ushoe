/**
 * retailerDirectory — verified multi-brand shoe resellers by region.
 * ONLY includes authorised multi-brand retailers (no single-brand stores).
 * Brand-owned stores (Nike.com, Adidas.com, etc.) are intentionally excluded
 * because agents must only search verified resellers that carry multiple brands.
 */

const RETAILER_BY_REGION = {
  // Israel — verified multi-brand resellers with physical stores
  IL: [
    { name: "Terminal X",      domain: "https://www.terminalx.com",        searchPath: "/catalogsearch/result/?q={query}" },
    { name: "Foot Locker Israel", domain: "https://footlocker.co.il",      searchPath: "/search?q={query}" },
    { name: "Fox Shoes",       domain: "https://www.foxshoes.co.il",       searchPath: "/search?q={query}" },
    { name: "Shilav",          domain: "https://www.shilav.co.il",         searchPath: "/search?q={query}" },
    { name: "Intisport",       domain: "https://www.intisport.co.il",      searchPath: "/search?q={query}" },
    { name: "Sport Depot",     domain: "https://www.sport-depot.co.il",    searchPath: "/search?q={query}" },
  ],
  // United States — verified multi-brand resellers
  US: [
    { name: "Foot Locker",  domain: "https://www.footlocker.com",  searchPath: "/search?query={query}" },
    { name: "Finish Line",  domain: "https://www.finishline.com",  searchPath: "/store/browse/search.jsp?query={query}" },
    { name: "DSW",          domain: "https://www.dsw.com",         searchPath: "/en/us/search?q={query}" },
    { name: "JD Sports",    domain: "https://www.jdsports.com",    searchPath: "/search/{query}" },
    { name: "Champs Sports",domain: "https://www.champssports.com",searchPath: "/search?query={query}" },
    { name: "Eastbay",      domain: "https://www.eastbay.com",     searchPath: "/search?query={query}" },
    { name: "Zappos",       domain: "https://www.zappos.com",      searchPath: "/search/term/{query}" },
    { name: "Amazon",       domain: "https://www.amazon.com",      searchPath: "/s?k={query}" },
  ],
  // United Kingdom — verified multi-brand resellers
  GB: [
    { name: "JD Sports",    domain: "https://www.jdsports.co.uk",  searchPath: "/search/{query}" },
    { name: "Foot Locker",  domain: "https://www.footlocker.co.uk",searchPath: "/search?query={query}" },
    { name: "Size?",        domain: "https://www.size.co.uk",      searchPath: "/search/{query}" },
    { name: "ASOS",         domain: "https://www.asos.com",        searchPath: "/search/?q={query}" },
    { name: "Sports Direct",domain: "https://www.sportsdirect.com",searchPath: "/search?term={query}" },
    { name: "Footasylum",   domain: "https://www.footasylum.com",  searchPath: "/search?q={query}" },
  ],
  // Germany — verified multi-brand resellers
  DE: [
    { name: "Zalando",      domain: "https://www.zalando.de",      searchPath: "/catalog/?q={query}" },
    { name: "JD Sports",    domain: "https://www.jdsports.de",     searchPath: "/search/{query}" },
    { name: "Snipes",       domain: "https://www.snipes.com",      searchPath: "/c/sneakers?search={query}" },
    { name: "Foot Locker",  domain: "https://www.footlocker.de",   searchPath: "/search?query={query}" },
    { name: "About You",    domain: "https://www.aboutyou.de",     searchPath: "/search?term={query}" },
  ],
  // France — verified multi-brand resellers
  FR: [
    { name: "Zalando",      domain: "https://www.zalando.fr",      searchPath: "/catalog/?q={query}" },
    { name: "JD Sports",    domain: "https://www.jdsports.fr",     searchPath: "/search/{query}" },
    { name: "Foot Locker",  domain: "https://www.footlocker.fr",   searchPath: "/search?query={query}" },
    { name: "Snipes",       domain: "https://www.snipes.fr",       searchPath: "/c/sneakers?search={query}" },
    { name: "ASOS",         domain: "https://www.asos.com/fr",     searchPath: "/search/?q={query}" },
  ],
  // Australia — verified multi-brand resellers
  AU: [
    { name: "JD Sports",       domain: "https://www.jdsports.com.au",   searchPath: "/search/{query}" },
    { name: "The Iconic",      domain: "https://www.theiconic.com.au",  searchPath: "/search/?q={query}" },
    { name: "Platypus Shoes",  domain: "https://www.platypusshoes.com.au", searchPath: "/search?q={query}" },
    { name: "Foot Locker AU",  domain: "https://www.footlocker.com.au", searchPath: "/search?query={query}" },
    { name: "Stylerunner",     domain: "https://www.stylerunner.com",   searchPath: "/search?type=product&q={query}" },
  ],
  // Canada — verified multi-brand resellers
  CA: [
    { name: "Foot Locker",  domain: "https://www.footlocker.ca",   searchPath: "/search?query={query}" },
    { name: "Sport Chek",   domain: "https://www.sportchek.ca",    searchPath: "/search-results/search={query}" },
    { name: "DSW",          domain: "https://www.dsw.ca",          searchPath: "/en/ca/search?q={query}" },
    { name: "Champs Sports",domain: "https://www.champssports.com",searchPath: "/search?query={query}" },
    { name: "Zappos",       domain: "https://www.zappos.com",      searchPath: "/search/term/{query}" },
  ],
  // Default fallback (international)
  DEFAULT: [
    { name: "Foot Locker",  domain: "https://www.footlocker.com",  searchPath: "/search?query={query}" },
    { name: "JD Sports",    domain: "https://www.jdsports.com",    searchPath: "/search/{query}" },
    { name: "Zappos",       domain: "https://www.zappos.com",      searchPath: "/search/term/{query}" },
    { name: "ASOS",         domain: "https://www.asos.com",        searchPath: "/search/?q={query}" },
    { name: "Amazon",       domain: "https://www.amazon.com",      searchPath: "/s?k={query}" },
  ],
};

// Country name → country code mapping
const COUNTRY_CODE_MAP = {
  "israel": "IL", "il": "IL",
  "united states": "US", "usa": "US", "us": "US",
  "united kingdom": "GB", "uk": "GB", "gb": "GB", "england": "GB",
  "germany": "DE", "de": "DE",
  "france": "FR", "fr": "FR",
  "australia": "AU", "au": "AU",
  "canada": "CA", "ca": "CA",
};

function getCountryCode(country) {
  if (!country) return "DEFAULT";
  const normalized = country.toLowerCase().trim();
  return COUNTRY_CODE_MAP[normalized] || "DEFAULT";
}

function buildSearchUrl(retailer, shoeName, brand) {
  const query = encodeURIComponent(`${brand} ${shoeName}`.trim());
  return retailer.domain + retailer.searchPath.replace("{query}", query);
}

/**
 * Returns a list of verified multi-brand resellers with real search URLs for the given country.
 * All retailers in the directory are multi-brand — no single-brand stores included.
 */
export function getRetailersForCountry(country, shoeName, brand) {
  const code = getCountryCode(country);
  const list = RETAILER_BY_REGION[code] || RETAILER_BY_REGION["DEFAULT"];
  return list.map(r => ({
    name: r.name,
    url: buildSearchUrl(r, shoeName, brand),
    domain: r.domain,
  }));
}