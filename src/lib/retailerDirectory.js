/**
 * retailerDirectory — real URLs for major shoe retailers by region.
 * Used to build actual buy links instead of relying on LLM to generate them.
 */

// Map country codes / common country names to known retailer domains
const RETAILER_BY_REGION = {
  // Israel
  IL: [
    { name: "adidas Israel", domain: "https://www.adidas.co.il", searchPath: "/search?q={query}", brands: ["Adidas"] },
    { name: "Nike Israel", domain: "https://www.nike.com/il", searchPath: "/search?q={query}", brands: ["Nike"] },
    { name: "Fox Shoes", domain: "https://www.foxshoes.co.il", searchPath: "/search?q={query}", brands: [] },
    { name: "Ace", domain: "https://www.ace.co.il", searchPath: "/catalogsearch/result/?q={query}", brands: [] },
    { name: "Shilav", domain: "https://www.shilav.co.il", searchPath: "/search?q={query}", brands: [] },
    { name: "Intisport", domain: "https://www.intisport.co.il", searchPath: "/search?q={query}", brands: [] },
  ],
  // United States
  US: [
    { name: "Nike", domain: "https://www.nike.com", searchPath: "/search?q={query}", brands: ["Nike"] },
    { name: "Adidas", domain: "https://www.adidas.com", searchPath: "/search?q={query}", brands: ["Adidas"] },
    { name: "Foot Locker", domain: "https://www.footlocker.com", searchPath: "/search?query={query}", brands: [] },
    { name: "Finish Line", domain: "https://www.finishline.com", searchPath: "/store/browse/search.jsp?query={query}", brands: [] },
    { name: "DSW", domain: "https://www.dsw.com", searchPath: "/en/us/search?q={query}", brands: [] },
    { name: "JD Sports", domain: "https://www.jdsports.com", searchPath: "/search/{query}", brands: [] },
  ],
  // United Kingdom
  GB: [
    { name: "Nike UK", domain: "https://www.nike.com/gb", searchPath: "/search?q={query}", brands: ["Nike"] },
    { name: "Adidas UK", domain: "https://www.adidas.co.uk", searchPath: "/search?q={query}", brands: ["Adidas"] },
    { name: "JD Sports UK", domain: "https://www.jdsports.co.uk", searchPath: "/search/{query}", brands: [] },
    { name: "Foot Locker UK", domain: "https://www.footlocker.co.uk", searchPath: "/search?query={query}", brands: [] },
    { name: "Size?", domain: "https://www.size.co.uk", searchPath: "/search/{query}", brands: [] },
    { name: "ASOS", domain: "https://www.asos.com", searchPath: "/search/?q={query}", brands: [] },
  ],
  // Germany
  DE: [
    { name: "Nike DE", domain: "https://www.nike.com/de", searchPath: "/search?q={query}", brands: ["Nike"] },
    { name: "Adidas DE", domain: "https://www.adidas.de", searchPath: "/search?q={query}", brands: ["Adidas"] },
    { name: "Zalando", domain: "https://www.zalando.de", searchPath: "/catalog/?q={query}", brands: [] },
    { name: "JD Sports DE", domain: "https://www.jdsports.de", searchPath: "/search/{query}", brands: [] },
    { name: "Snipes", domain: "https://www.snipes.com", searchPath: "/c/sneakers?search={query}", brands: [] },
  ],
  // France
  FR: [
    { name: "Nike FR", domain: "https://www.nike.com/fr", searchPath: "/search?q={query}", brands: ["Nike"] },
    { name: "Adidas FR", domain: "https://www.adidas.fr", searchPath: "/search?q={query}", brands: ["Adidas"] },
    { name: "Zalando FR", domain: "https://www.zalando.fr", searchPath: "/catalog/?q={query}", brands: [] },
    { name: "JD Sports FR", domain: "https://www.jdsports.fr", searchPath: "/search/{query}", brands: [] },
    { name: "Foot Locker FR", domain: "https://www.footlocker.fr", searchPath: "/search?query={query}", brands: [] },
  ],
  // Australia
  AU: [
    { name: "Nike AU", domain: "https://www.nike.com/au", searchPath: "/search?q={query}", brands: ["Nike"] },
    { name: "Adidas AU", domain: "https://www.adidas.com.au", searchPath: "/search?q={query}", brands: ["Adidas"] },
    { name: "JD Sports AU", domain: "https://www.jdsports.com.au", searchPath: "/search/{query}", brands: [] },
    { name: "The Iconic", domain: "https://www.theiconic.com.au", searchPath: "/search/?q={query}", brands: [] },
    { name: "Platypus Shoes", domain: "https://www.platypusshoes.com.au", searchPath: "/search?q={query}", brands: [] },
  ],
  // Canada
  CA: [
    { name: "Nike CA", domain: "https://www.nike.com/ca", searchPath: "/search?q={query}", brands: ["Nike"] },
    { name: "Adidas CA", domain: "https://www.adidas.ca", searchPath: "/search?q={query}", brands: ["Adidas"] },
    { name: "Foot Locker CA", domain: "https://www.footlocker.ca", searchPath: "/search?query={query}", brands: [] },
    { name: "Sport Chek", domain: "https://www.sportchek.ca", searchPath: "/search-results/search={query}", brands: [] },
    { name: "DSW CA", domain: "https://www.dsw.ca", searchPath: "/en/ca/search?q={query}", brands: [] },
  ],
  // Default fallback (international)
  DEFAULT: [
    { name: "Nike", domain: "https://www.nike.com", searchPath: "/search?q={query}", brands: ["Nike"] },
    { name: "Adidas", domain: "https://www.adidas.com", searchPath: "/search?q={query}", brands: ["Adidas"] },
    { name: "ASOS", domain: "https://www.asos.com", searchPath: "/search/?q={query}", brands: [] },
    { name: "Amazon", domain: "https://www.amazon.com", searchPath: "/s?k={query}", brands: [] },
    { name: "eBay", domain: "https://www.ebay.com", searchPath: "/sch/i.html?_nkw={query}", brands: [] },
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

// Known competitor brand pairs — if shoe is brand A, exclude brand B's dedicated stores
const BRAND_EXCLUSIONS = {
  "nike":    ["adidas", "puma", "reebok", "new balance", "converse owned by nike is ok"],
  "adidas":  ["nike", "puma", "reebok"],
  "puma":    ["nike", "adidas", "reebok"],
  "reebok":  ["nike", "adidas", "puma"],
  "jordan":  ["adidas", "puma", "reebok"],
  "new balance": ["nike", "adidas", "puma"],
  "converse": ["adidas", "puma", "reebok"],
  "vans":    ["nike", "adidas", "puma"],
  "skechers":["nike", "adidas", "puma"],
};

/**
 * Returns a list of retailers with real URLs for the given country.
 * Filters out dedicated competitor brand stores (e.g. won't show Adidas store for a Nike shoe).
 */
export function getRetailersForCountry(country, shoeName, brand) {
  const code = getCountryCode(country);
  const list = RETAILER_BY_REGION[code] || RETAILER_BY_REGION["DEFAULT"];
  const brandLower = (brand || "").toLowerCase();

  // Get which competitor brands to exclude
  const excludedBrands = BRAND_EXCLUSIONS[brandLower] || [];

  // Filter: remove retailers whose brands array contains ONLY a competing brand
  const filtered = list.filter(r => {
    if (r.brands.length === 0) return true; // multi-brand retailer, always include
    // If this retailer is dedicated to a competitor brand, exclude it
    const isCompetitor = r.brands.some(b =>
      excludedBrands.some(ex => b.toLowerCase().includes(ex))
    );
    return !isCompetitor;
  });

  // Sort: brand-specific retailers first
  const sorted = [...filtered].sort((a, b) => {
    const aMatch = a.brands.some(b => b.toLowerCase() === brandLower) ? -1 : 0;
    const bMatch = b.brands.some(b => b.toLowerCase() === brandLower) ? -1 : 0;
    return aMatch - bMatch;
  });

  return sorted.map(r => ({
    name: r.name,
    url: buildSearchUrl(r, shoeName, brand),
    domain: r.domain,
  }));
}