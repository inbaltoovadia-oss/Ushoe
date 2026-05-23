/**
 * FindNearbyNonCatalog — works exactly like the catalog NearbyStores
 * but accepts a plain {name, brand} object instead of a full DB entity.
 */
import NearbyStores from "./NearbyStores";

export default function FindNearbyNonCatalog({ query, brand = "" }) {
  // Build a minimal shoe-like object from the search query
  // so NearbyStores can work exactly as it does for catalog shoes
  const shoe = {
    id: `search_${query}`,
    name: query,
    brand: brand || extractBrand(query),
    category: "Lifestyle",
    colorway: null,
    sizes_available: [],
  };

  return <NearbyStores shoe={shoe} title="Find Nearby" />;
}

// Try to guess brand from the query string
function extractBrand(query) {
  const brands = ["Nike", "Adidas", "Jordan", "New Balance", "Puma", "Reebok", "Vans",
    "Converse", "HOKA", "Salomon", "Asics", "Under Armour", "Skechers", "Crocs",
    "Timberland", "Ugg", "On Running", "Brooks", "Saucony"];
  const q = query.toLowerCase();
  return brands.find(b => q.includes(b.toLowerCase())) || "";
}