/**
 * Shoe size conversion table — US, EU, UK
 * Source: industry-standard sizing charts
 */

// Men's size chart (index-aligned)
const MENS = [
  { us: 6,    eu: 38.5, uk: 5.5  },
  { us: 6.5,  eu: 39,   uk: 6    },
  { us: 7,    eu: 40,   uk: 6.5  },
  { us: 7.5,  eu: 40.5, uk: 7    },
  { us: 8,    eu: 41,   uk: 7.5  },
  { us: 8.5,  eu: 42,   uk: 8    },
  { us: 9,    eu: 42.5, uk: 8.5  },
  { us: 9.5,  eu: 43,   uk: 9    },
  { us: 10,   eu: 44,   uk: 9.5  },
  { us: 10.5, eu: 44.5, uk: 10   },
  { us: 11,   eu: 45,   uk: 10.5 },
  { us: 11.5, eu: 45.5, uk: 11   },
  { us: 12,   eu: 46,   uk: 11.5 },
  { us: 13,   eu: 47,   uk: 12.5 },
  { us: 14,   eu: 48,   uk: 13.5 },
];

// Women's size chart
const WOMENS = [
  { us: 5,    eu: 35.5, uk: 2.5 },
  { us: 5.5,  eu: 36,   uk: 3   },
  { us: 6,    eu: 36.5, uk: 3.5 },
  { us: 6.5,  eu: 37,   uk: 4   },
  { us: 7,    eu: 37.5, uk: 4.5 },
  { us: 7.5,  eu: 38,   uk: 5   },
  { us: 8,    eu: 38.5, uk: 5.5 },
  { us: 8.5,  eu: 39,   uk: 6   },
  { us: 9,    eu: 40,   uk: 6.5 },
  { us: 9.5,  eu: 40.5, uk: 7   },
  { us: 10,   eu: 41,   uk: 7.5 },
  { us: 11,   eu: 42,   uk: 8.5 },
];

/**
 * Convert a US size to EU and UK
 * @param {number} usSize
 * @param {"Men"|"Women"|"Unisex"} gender
 * @returns {{ us: number, eu: number, uk: number } | null}
 */
export function convertFromUS(usSize, gender = "Men") {
  const chart = gender === "Women" ? WOMENS : MENS;
  const entry = chart.find(e => e.us === usSize);
  return entry || null;
}

/**
 * Convert EU size to US
 */
export function convertFromEU(euSize, gender = "Men") {
  const chart = gender === "Women" ? WOMENS : MENS;
  const entry = chart.find(e => e.eu === euSize);
  return entry || null;
}

/**
 * Convert UK size to US
 */
export function convertFromUK(ukSize, gender = "Men") {
  const chart = gender === "Women" ? WOMENS : MENS;
  const entry = chart.find(e => e.uk === ukSize);
  return entry || null;
}

/**
 * Get all sizes in a given standard for a list of US sizes
 * @param {number[]} usSizes
 * @param {"US"|"EU"|"UK"} standard
 * @param {"Men"|"Women"|"Unisex"} gender
 * @returns {string[]} sizes in the requested standard
 */
export function convertSizeList(usSizes, standard, gender = "Men") {
  if (standard === "US") return usSizes.map(s => s.toString());
  const chart = gender === "Women" ? WOMENS : MENS;
  return usSizes.map(usSize => {
    const entry = chart.find(e => e.us === usSize);
    if (!entry) return null;
    return standard === "EU" ? entry.eu.toString() : entry.uk.toString();
  }).filter(Boolean);
}

/**
 * Convert a single size from one standard to US
 */
export function toUSSize(size, standard, gender = "Men") {
  if (standard === "US") return size;
  if (standard === "EU") return convertFromEU(size, gender)?.us || null;
  if (standard === "UK") return convertFromUK(size, gender)?.us || null;
  return size;
}

/**
 * Convert a US size to a target standard
 */
export function fromUSSize(usSize, standard, gender = "Men") {
  if (standard === "US") return usSize;
  const entry = convertFromUS(usSize, gender);
  if (!entry) return usSize;
  return standard === "EU" ? entry.eu : entry.uk;
}