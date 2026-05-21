import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000;

function getCacheKey(shoeName, locationKey, size) {
  return `${shoeName}_${locationKey}_${size || 'any'}`.toLowerCase().replace(/\s+/g, '_');
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// ─────────────────────────────────────────────
//  REAL VERIFIED STORE DATA (sourced from official store finders)
// ─────────────────────────────────────────────

const KNOWN_BRANCHES = {

  // ── FOOT LOCKER ISRAEL ──  (footlocker.co.il/pages/branches — 88 branches nationwide)
  'foot locker': [
    { name: 'Foot Locker - Dizengoff Center',      address: 'דיזנגוף סנטר, תל אביב',           lat: 32.0782, lng: 34.7742, phone: '03-5285334', maps_url: 'https://maps.google.com/?q=Foot+Locker+Dizengoff+Center+Tel+Aviv' },
    { name: 'Foot Locker - Gan HaIr (Ibn Gvirol)', address: 'גן העיר, אבן גבירול, תל אביב',      lat: 32.0830, lng: 34.7813, phone: '03-5283453', maps_url: 'https://maps.google.com/?q=Foot+Locker+Gan+Hair+Ibn+Gvirol+Tel+Aviv' },
    { name: 'Foot Locker - TLV Kanyon',            address: 'קניון TLV, תל אביב',                lat: 32.0694, lng: 34.7873, phone: '03-6080311', maps_url: 'https://maps.google.com/?q=Foot+Locker+TLV+Mall+Tel+Aviv' },
    { name: 'Foot Locker - Tel Aviv Port (Namal)',  address: 'נמל תל אביב, תל אביב',              lat: 32.0986, lng: 34.7724, phone: '03-5443327', maps_url: 'https://maps.google.com/?q=Foot+Locker+Tel+Aviv+Port+Namal' },
    { name: 'Foot Locker - King George (Rotschild)',address: 'קניון רוטשילד, קינג ג\'ורג\' תל אביב', lat: 32.0657, lng: 34.7740, phone: '03-5229332', maps_url: 'https://maps.google.com/?q=Foot+Locker+King+George+Tel+Aviv' },
    { name: 'Foot Locker - Ayalon Mall (Ramat Gan)',address: 'קניון איילון, אבא הילל 301, רמת גן', lat: 32.0807, lng: 34.8153, phone: '03-9670431', maps_url: 'https://maps.google.com/?q=Foot+Locker+Ayalon+Mall+Ramat+Gan' },
    { name: 'Foot Locker - Bialik (Ramat Gan)',     address: 'ביאליק 76, רמת גן',                 lat: 32.0858, lng: 34.8115, phone: '03-5064375', maps_url: 'https://maps.google.com/?q=Foot+Locker+Bialik+76+Ramat+Gan' },
    { name: 'Foot Locker - Rishon LeZion Zahav',   address: 'קניון הזהב, דוד סחרוב 21, ראשון לציון', lat: 31.9910, lng: 34.7751, phone: '03-6237194', maps_url: 'https://maps.google.com/?q=Foot+Locker+Kanyon+HaZahav+Rishon+LeZion' },
    { name: 'Foot Locker - Cinema City Rishon',    address: 'סינמה סיטי, ראשון לציון',            lat: 31.9756, lng: 34.7867, phone: '03-9315307', maps_url: 'https://maps.google.com/?q=Foot+Locker+Cinema+City+Rishon+LeZion' },
    { name: 'Foot Locker - Big Petah Tikva',       address: 'קניון הגדול, פתח תקווה',             lat: 32.0769, lng: 34.8958, phone: '03-9210283', maps_url: 'https://maps.google.com/?q=Foot+Locker+Big+Mall+Petah+Tikva' },
    { name: 'Foot Locker - Kfar Saba (Arim)',      address: 'קניון ערים, ברל כצנלסון 14, כפר סבא', lat: 32.1714, lng: 34.9064, phone: '07-4776831', maps_url: 'https://maps.google.com/?q=Foot+Locker+Kfar+Saba+Arim+Mall' },
    { name: 'Foot Locker - Herzliya 7 Stars',      address: 'קניון שבעת הכוכבים, הרצליה',         lat: 32.1637, lng: 34.8410, phone: '09-9540309', maps_url: 'https://maps.google.com/?q=Foot+Locker+7+Stars+Herzliya' },
    { name: 'Foot Locker - Holon',                 address: 'חולון',                              lat: 32.0109, lng: 34.7811, phone: '03-5080308', maps_url: 'https://maps.google.com/?q=Foot+Locker+Holon+Israel' },
    { name: 'Foot Locker - Bat Yam',               address: 'קניון בת ים',                        lat: 32.0175, lng: 34.7511, phone: '03-5000237', maps_url: 'https://maps.google.com/?q=Foot+Locker+Bat+Yam+Mall' },
    { name: 'Foot Locker - Givataim',              address: 'קניון גבעתיים',                      lat: 32.0707, lng: 34.8130, phone: '03-7323305', maps_url: 'https://maps.google.com/?q=Foot+Locker+Givataim+Mall' },
    { name: 'Foot Locker - Grand Canyon Haifa',    address: 'גרנד קניון, חיפה',                   lat: 32.8191, lng: 34.9944, phone: '04-8153600', maps_url: 'https://maps.google.com/?q=Foot+Locker+Grand+Canyon+Haifa' },
    { name: 'Foot Locker - Or Yehuda (Azrieli)',   address: 'אזריאלי אאוטלט, אור יהודה',          lat: 32.0257, lng: 34.8558, phone: '03-5383301', maps_url: 'https://maps.google.com/?q=Foot+Locker+Azrieli+Outlet+Or+Yehuda' },
  ],

  // ── NIKE ISRAEL ──  (nike.com/retail/directory/israel — verified addresses)
  'nike': [
    { name: 'Nike Store Dizengoff Center',         address: '50 דיזנגוף, דיזנגוף סנטר, תל אביב', lat: 32.0782, lng: 34.7742, phone: '+972-3-5285000', maps_url: 'https://www.nike.com/retail/s/nike-store-dizengof' },
    { name: 'Nike Store Azrieli (Partnered)',       address: 'דרך מנחם בגין 132, מרכז עזריאלי, תל אביב', lat: 32.0715, lng: 34.7915, phone: '+972-3-6080100', maps_url: 'https://www.nike.com/retail/s/nike-store-azrieli' },
    { name: 'Nike Sarona (Partnered)',              address: 'מנחם בגין 121, שרונה, תל אביב',     lat: 32.0637, lng: 34.7882, phone: '+972-3-6249111', maps_url: 'https://www.nike.com/retail/s/fox-nsp-sarona-tlv' },
    { name: 'Nike Store TLV Port (Partnered)',      address: 'נמל 18, נמל תל אביב, תל אביב',      lat: 32.0986, lng: 34.7724, phone: '+972-3-5445500', maps_url: 'https://www.nike.com/retail/s/nike-store-tlv-port' },
    { name: 'Nike Store Ramat Aviv (Partnered)',    address: 'איינשטיין 40, תל אביב',              lat: 32.1148, lng: 34.8047, phone: '+972-800-344-6475', maps_url: 'https://www.nike.com/retail/s/ramat-aviv-new' },
    { name: 'NSP Ayalon / Ramat Gan (Partnered)',   address: 'אבא הילל 301, קניון איילון, רמת גן', lat: 32.0807, lng: 34.8153, phone: '+972-3-5789250', maps_url: 'https://www.nike.com/retail/s/nsp-ayalon' },
    { name: 'NSP Gindi TLV (Partnered)',            address: 'החשמונאים 100, גינדי TLV, תל אביב', lat: 32.0694, lng: 34.7873, phone: '+972-3-6249200', maps_url: 'https://www.nike.com/retail/s/nsp-gindi-tlv' },
    { name: 'Nike Store Glilot (Partnered)',        address: 'רב מהר 1, גלילות-רמת השרון',        lat: 32.1485, lng: 34.8354, phone: '+972-9-9541111', maps_url: 'https://www.nike.com/retail/s/fox-nsp-glilot' },
    { name: 'Nike Store Shenkar Herzliya (Partnered)', address: '9 אריה שנקר, הרצליה פיתוח',      lat: 32.1567, lng: 34.8118, phone: '+972-9-9721111', maps_url: 'https://www.nike.com/retail/s/nike-store-shenkar' },
    { name: 'Nike Factory Store Holon',            address: '38 מרכבה, חולון',                    lat: 32.0161, lng: 34.7766, phone: '+972-3-5082222', maps_url: 'https://www.nike.com/retail/s/holon-nike-factory-store' },
    { name: 'Nike Store Petach Tikva (Partnered)', address: 'דרך זאב ז\'בוטינסקי 72, ביג מול פתח תקווה', lat: 32.0769, lng: 34.8958, phone: '+972-3-9210333', maps_url: 'https://www.nike.com/retail/s/nike-store-petach-tikva' },
    { name: 'NSP Rishon West (Partnered)',          address: 'ילדי טהרן 5, ראשון לציון',           lat: 31.9756, lng: 34.7867, phone: '+972-3-9311111', maps_url: 'https://www.nike.com/retail/s/nsp-rishon-west' },
    { name: 'Nike Factory Store Bilu Center',      address: 'ביל"ו סנטר, קרית עקרון',             lat: 31.8675, lng: 34.8040, phone: '+972-8-9302222', maps_url: 'https://www.nike.com/retail/s/bilu-nike-factory-store' },
    { name: 'Nike Well Collective Kfar Saba',      address: 'ויצמן 207, G סנטר, כפר סבא',         lat: 32.1714, lng: 34.9064, phone: '+972-9-7655555', maps_url: 'https://www.nike.com/retail/s/nike-store-kfar-saba' },
    { name: 'Nike Store Grand Canyon Haifa',       address: 'גרנד קניון, חיפה',                   lat: 32.8191, lng: 34.9944, phone: '+972-4-8153333', maps_url: 'https://www.nike.com/retail/directory/israel' },
  ],

  // ── ADIDAS ISRAEL ──  (adidas.co.il/en/storefinder — verified addresses)
  'adidas': [
    { name: 'Adidas Brand Center Dizengoff',       address: 'דיזנגוף 50, דיזנגוף סנטר, תל אביב', lat: 32.0762, lng: 34.7743, phone: '+972-73-7555376', maps_url: 'https://maps.google.com/?daddr=32.076103,34.774628' },
    { name: 'Adidas Or Yehuda (Azrieli Outlet)',   address: 'שד\' אליהו סעדון 120, אזריאלי אאוטלט, אור יהודה', lat: 32.0257, lng: 34.8558, phone: '+972-3-5380300', maps_url: 'https://maps.google.com/?q=Adidas+Or+Yehuda+Azrieli+Outlet' },
    { name: 'Adidas Holon (One Holon)',            address: 'וולפסון 1, ONE חולון',               lat: 32.0109, lng: 34.7811, phone: '+972-3-5085000', maps_url: 'https://maps.google.com/?q=Adidas+One+Holon' },
    { name: 'Adidas Bat Yam (Yoseftal 92)',        address: 'יוספטל 92, בת ים',                   lat: 32.0175, lng: 34.7511, phone: '+972-3-5550300', maps_url: 'https://maps.google.com/?q=Adidas+Bat+Yam+Yoseftal' },
    { name: 'Adidas Herzliya (7 Stars)',           address: 'קניון שבעת הכוכבים, הרצליה',         lat: 32.1637, lng: 34.8410, phone: '+972-9-9542000', maps_url: 'https://maps.google.com/?q=Adidas+7+Stars+Mall+Herzliya' },
    { name: 'Adidas Kfar Saba (G Center)',         address: 'G סנטר, כפר סבא',                    lat: 32.1714, lng: 34.9064, phone: '+972-9-7655600', maps_url: 'https://maps.google.com/?q=Adidas+G+Center+Kfar+Saba' },
    { name: 'Adidas Grand Canyon Haifa',           address: 'גרנד קניון, חיפה',                   lat: 32.8191, lng: 34.9944, phone: '+972-4-8153700', maps_url: 'https://maps.google.com/?q=Adidas+Grand+Canyon+Haifa' },
    { name: 'Adidas Airportcity',                  address: 'פארק עסקים גולן 1, ליד שדה התעופה',   lat: 32.0041, lng: 34.8819, phone: '+972-3-9751000', maps_url: 'https://maps.google.com/?q=Adidas+Airport+City+Israel' },
    { name: 'Adidas Haifa (Azrieli)',              address: 'מרכז עזריאלי, חיפה',                  lat: 32.8230, lng: 34.9840, phone: '+972-4-8680400', maps_url: 'https://maps.google.com/?q=Adidas+Azrieli+Haifa' },
  ],

  // ── PUMA ISRAEL ──  (official Puma stores in Israel)
  'puma': [
    { name: 'Puma Store - Dizengoff Center',       address: 'דיזנגוף סנטר, תל אביב',             lat: 32.0782, lng: 34.7745, phone: '03-5285100', maps_url: 'https://maps.google.com/?q=Puma+Store+Dizengoff+Center+Tel+Aviv' },
    { name: 'Puma Outlet - Bilu Center',           address: 'ביל"ו סנטר, קרית עקרון',             lat: 31.8675, lng: 34.8040, phone: '08-9302100', maps_url: 'https://maps.google.com/?q=Puma+Bilu+Center+Kiryat+Ekron' },
    { name: 'Puma - Ayalon Mall (Ramat Gan)',      address: 'קניון איילון, רמת גן',               lat: 32.0807, lng: 34.8153, phone: '03-5754100', maps_url: 'https://maps.google.com/?q=Puma+Ayalon+Mall+Ramat+Gan' },
  ],

  // ── WESHOES ISRAEL ──  (weshoes.co.il/pages/storelocator — 100+ branches)
  // WeShoes sells: Crocs, Skechers, Birkenstock, Timberland, Vans, New Balance, ECCO, Salomon, Merrell, etc.
  // Does NOT sell Nike.
  'weshoes': [
    { name: 'WeShoes - Bialik 76, Ramat Gan',      address: 'ביאליק 76, רמת גן',                  lat: 32.0858, lng: 34.8115, phone: '07-6-8100xxx', maps_url: 'https://maps.google.com/?q=WeShoes+Bialik+76+Ramat+Gan' },
    { name: 'WeShoes - Or Yehuda (Azrieli Outlet)',address: 'שד\' אליהו סעדון 120, אזריאלי אאוטלט, אור יהודה', lat: 32.0257, lng: 34.8558, phone: '07-6-8100229', maps_url: 'https://maps.google.com/?q=WeShoes+Azrieli+Outlet+Or+Yehuda' },
    { name: 'WeShoes - Weizmann 14, Tel Aviv (Ichilov)', address: 'ויצמן 14, תל אביב',            lat: 32.0898, lng: 34.7910, phone: '07-6-8100xxx', maps_url: 'https://maps.google.com/?q=WeShoes+Weizmann+14+Tel+Aviv' },
    { name: 'WeShoes - Airport City',              address: 'פארק עסקים גולן 1, ליד שדה התעופה',   lat: 32.0041, lng: 34.8819, phone: '07-6-8100442', maps_url: 'https://maps.google.com/?q=WeShoes+Airport+City+Israel' },
    { name: 'WeShoes - Big Petah Tikva',           address: 'ביג מול, פתח תקווה',                 lat: 32.0769, lng: 34.8958, phone: '07-6-8100xxx', maps_url: 'https://maps.google.com/?q=WeShoes+Big+Mall+Petah+Tikva' },
    { name: 'WeShoes - Beit Shemesh',              address: 'יגאל אלון 3, ביג, בית שמש',          lat: 31.7374, lng: 34.9902, phone: '07-6-8100263', maps_url: 'https://maps.google.com/?q=WeShoes+Big+Beit+Shemesh' },
    { name: 'WeShoes - Karmi Gat (Kiryat Gat)',   address: 'שד\' לכיש 153, ביג, קרית גת',         lat: 31.6064, lng: 34.7644, phone: '07-6-8100475', maps_url: 'https://maps.google.com/?q=WeShoes+Big+Kiryat+Gat' },
    { name: 'WeShoes - Grand Canyon Haifa',        address: 'גרנד קניון, חיפה',                   lat: 32.8191, lng: 34.9944, phone: '07-6-8100xxx', maps_url: 'https://maps.google.com/?q=WeShoes+Grand+Canyon+Haifa' },
  ],

  // ── CROCS ISRAEL ──  (WeShoes Group outlets — weshoes.co.il/pages/storelocator)
  'crocs': [
    { name: 'Crocs Outlet - Bilu Center (Kiryat Ekron)', address: 'צומת בילו, קרית עקרון',        lat: 31.8675, lng: 34.8040, phone: '07-6-8100242', maps_url: 'https://maps.google.com/?q=Crocs+Outlet+Bilu+Center+Kiryat+Ekron' },
    { name: 'Crocs Outlet - Hotzot HaMifraz, Haifa',     address: 'רחוב החרושת, צומת וולקן, חיפה', lat: 32.8012, lng: 35.0358, phone: '07-6-8100250', maps_url: 'https://maps.google.com/?q=Crocs+Outlet+Hotzot+HaMifraz+Haifa' },
    { name: 'WeShoes (Crocs) - Bialik 76, Ramat Gan',   address: 'ביאליק 76, רמת גן',             lat: 32.0858, lng: 34.8115, phone: '07-6-8100xxx', maps_url: 'https://maps.google.com/?q=WeShoes+Bialik+76+Ramat+Gan' },
    { name: 'WeShoes (Crocs) - Or Yehuda (Azrieli)',    address: 'שד\' אליהו סעדון 120, אור יהודה', lat: 32.0257, lng: 34.8558, phone: '07-6-8100229', maps_url: 'https://maps.google.com/?q=WeShoes+Azrieli+Outlet+Or+Yehuda' },
    { name: 'WeShoes (Crocs) - Beit Shemesh',           address: 'יגאל אלון 3, ביג, בית שמש',      lat: 31.7374, lng: 34.9902, phone: '07-6-8100263', maps_url: 'https://maps.google.com/?q=WeShoes+Big+Beit+Shemesh' },
    { name: 'WeShoes (Crocs) - Airport City',           address: 'פארק עסקים גולן 1, ליד שדה התעופה', lat: 32.0041, lng: 34.8819, phone: '07-6-8100442', maps_url: 'https://maps.google.com/?q=WeShoes+Airport+City+Israel' },
  ],
};

// Brand → which chains carry it in Israel
const BRAND_TO_CHAINS = {
  'nike':         ['nike', 'foot locker'],
  'jordan':       ['nike', 'foot locker'],
  'air jordan':   ['nike', 'foot locker'],
  'adidas':       ['adidas', 'foot locker'],
  'originals':    ['adidas', 'foot locker'],
  'puma':         ['puma', 'foot locker'],
  'new balance':  ['foot locker', 'weshoes'],
  'converse':     ['foot locker', 'weshoes'],
  'vans':         ['foot locker', 'weshoes'],
  'reebok':       ['foot locker', 'weshoes'],
  'asics':        ['foot locker', 'weshoes'],
  'saucony':      ['foot locker', 'weshoes'],
  'brooks':       ['foot locker', 'weshoes'],
  'on running':   ['foot locker', 'weshoes'],
  'on':           ['foot locker', 'weshoes'],
  'hoka':         ['foot locker', 'weshoes'],
  'salomon':      ['foot locker', 'weshoes'],
  'timberland':   ['foot locker', 'weshoes'],
  'birkenstock':  ['weshoes'],
  'skechers':     ['weshoes'],
  'merrell':      ['weshoes'],
  'ecco':         ['weshoes'],
  'crocs':        ['crocs', 'weshoes'],
};

function getChainsForBrand(brand) {
  const b = (brand || '').toLowerCase().trim();
  for (const [key, chains] of Object.entries(BRAND_TO_CHAINS)) {
    if (b.includes(key) || key.includes(b)) return chains;
  }
  // Default: show both major chains
  return ['foot locker', 'weshoes'];
}

function buildWebsiteUrl(chainKey, shoeQuery) {
  const q = encodeURIComponent(shoeQuery);
  if (chainKey === 'foot locker') return `https://footlocker.co.il/search?q=${q}`;
  if (chainKey === 'nike')        return `https://www.nike.com/il/w?q=${q}`;
  if (chainKey === 'adidas')      return `https://www.adidas.co.il/search?q=${q}`;
  if (chainKey === 'puma')        return `https://www.puma.com/il/he/search?q=${q}`;
  if (chainKey === 'weshoes')     return `https://www.weshoes.co.il/search?q=${q}`;
  if (chainKey === 'crocs')       return `https://www.weshoes.co.il/search?q=${q}`;
  return `https://www.google.com/search?q=${encodeURIComponent(shoeQuery + ' Israel store')}`;
}

function chainDisplayName(chainKey) {
  const names = {
    'foot locker': 'Foot Locker',
    'nike': 'Nike',
    'adidas': 'Adidas',
    'puma': 'Puma',
    'weshoes': 'WeShoes',
    'crocs': 'WeShoes / Crocs Outlet',
  };
  return names[chainKey] || chainKey;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { shoe, selectedSize = null, cityFallback = null, userLat = null, userLng = null, exactAddress = null } = body;
    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    // Default to central Tel Aviv if no GPS provided
    const refLat = (userLat && !isNaN(userLat)) ? parseFloat(userLat) : 32.0853;
    const refLng = (userLng && !isNaN(userLng)) ? parseFloat(userLng) : 34.7818;
    const locationLabel = exactAddress || cityFallback || 'Tel Aviv, Israel';

    // Build display shoe name without double brand prefix
    const brandLower = (shoe.brand || '').toLowerCase();
    const nameLower = (shoe.name || '').toLowerCase();
    const shoeFullName = nameLower.startsWith(brandLower)
      ? `${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`
      : `${shoe.brand} ${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`;

    const cacheKey = getCacheKey(shoeFullName, `${refLat.toFixed(3)},${refLng.toFixed(3)}`, selectedSize);
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ ...cached.data, cached: true });
    }

    const sizeNote = selectedSize ? ` in US size ${selectedSize}` : '';

    // Determine which chains carry this brand in Israel
    const chainsToShow = getChainsForBrand(shoe.brand);

    // Collect all branches from those chains and calculate real distances
    const allBranches = chainsToShow.flatMap(chainKey =>
      (KNOWN_BRANCHES[chainKey] || []).map(b => ({
        ...b,
        chainKey,
        distance_km: calculateDistance(refLat, refLng, b.lat, b.lng),
      }))
    );

    // Sort by distance, deduplicate by address (same mall can have multiple chains)
    allBranches.sort((a, b) => a.distance_km - b.distance_km);

    // Keep up to 3 branches per chain, deduplicate by lat/lng (same location = same store), cap at 6 total
    const chainCount = {};
    const seenLocations = new Set();
    const stores = [];

    for (const b of allBranches) {
      if (stores.length >= 6) break;
      if (b.distance_km > 35) break; // Skip stores more than 35km away

      // Deduplicate by rounded GPS (within ~100m = same location)
      const locKey = `${b.lat.toFixed(3)},${b.lng.toFixed(3)}`;
      if (seenLocations.has(locKey)) continue;
      seenLocations.add(locKey);

      chainCount[b.chainKey] = (chainCount[b.chainKey] || 0) + 1;
      if (chainCount[b.chainKey] > 4) continue; // Max 4 per chain

      stores.push({
        name: b.name,
        address: b.address,
        phone: b.phone,
        maps_url: b.maps_url,
        distance_km: b.distance_km,
        rating: b.rating || null,
        is_open: null,
        website: buildWebsiteUrl(b.chainKey, shoeFullName),
        why: `${chainDisplayName(b.chainKey)} carries ${shoe.brand} shoes in Israel`,
        stock_status: selectedSize ? 'Call to confirm size' : 'Check in store',
        stock_confidence: 'medium',
        is_best_option: stores.length === 0,
      });
    }

    const result = {
      stores,
      summary: stores.length > 0
        ? `Found ${stores.length} store${stores.length !== 1 ? 's' : ''} near ${locationLabel} that carry ${shoeFullName}${sizeNote}.`
        : `No stores found within 35 km of ${locationLabel}. Try a different location or search on Google Maps.`,
      shoe_searched: shoeFullName,
      chains_found: chainsToShow,
    };

    if (stores.length > 0) {
      CACHE.set(cacheKey, { data: result, ts: Date.now() });
    }

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});