import { useState, useEffect } from "react";
import {
  Globe, Loader2, ExternalLink, CheckCircle, RefreshCw,
  TrendingDown, Tag, ShieldCheck, Search, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import SizeStandardToggle from "./SizeStandardToggle";
import LocationInput from "./LocationInput";
import { fromUSSize } from "../lib/sizeConverter";
import { base44 } from "@/api/base44Client";

// Verified brand → retailer mapping for Israel based on official store data
// WeShoes Israel: ONLY Crocs, HOKA, Blundstone, Desigual, Freedom Moses, Kizik, Native Shoes, Gap footwear
// Foot Locker Israel: Nike, Jordan, Adidas, Converse, New Balance, Puma, Under Armour, Vans, Reebok, Asics
// Nike stores: Nike & Jordan only
// Adidas stores: Adidas & Yeezy only

function getIsraelRetailers(brand, q) {
  const b = brand.toLowerCase();
  const retailers = [];

  // Official brand stores (highest priority)
  if (b.includes('nike') || b.includes('jordan') || b.includes('air jordan')) {
    retailers.push({ name: 'Nike Israel', url: `https://www.nike.com/il/w?q=${q}`, note: 'Official Nike Israel · Free shipping' });
  }
  if (b.includes('adidas') || b.includes('yeezy')) {
    retailers.push({ name: 'Adidas Israel', url: `https://www.adidas.co.il/search?q=${q}`, note: 'Official Adidas Israel · Free shipping' });
  }
  if (b.includes('puma')) {
    retailers.push({ name: 'Puma Israel', url: `https://www.puma.com/il/he/search?q=${q}`, note: 'Official Puma Israel' });
  }

  // Foot Locker Israel — carries: Nike, Jordan, Adidas, Converse, New Balance, Puma, Under Armour, Vans, Reebok, Asics, Saucony
  const footLockerBrands = ['nike', 'jordan', 'air jordan', 'adidas', 'converse', 'new balance', 'puma', 'under armour', 'vans', 'reebok', 'asics', 'saucony', 'brooks'];
  if (footLockerBrands.some(fl => b.includes(fl))) {
    retailers.push({ name: 'Foot Locker Israel', url: `https://footlocker.co.il/search?q=${q}`, note: 'Large selection · Ships within Israel' });
  }

  // WeShoes Israel — carries: Crocs, HOKA, Blundstone, Desigual, Freedom Moses, Kizik, Native, Gap footwear
  const weshoeBrands = ['crocs', 'hoka', 'blundstone', 'desigual', 'freedom moses', 'kizik', 'native shoes', 'ilse jacobsen'];
  if (weshoeBrands.some(w => b.includes(w))) {
    retailers.push({ name: 'WeShoes Israel', url: `https://www.weshoes.co.il/search?q=${q}`, note: 'Official Israeli retailer · Ships within Israel' });
  }

  // Farfetch always shown for Israel — ships designer/premium sneakers
  retailers.push({ name: 'Farfetch', url: `https://www.farfetch.com/il/shopping/men/search/items.aspx?q=${q}`, note: 'International luxury retailer · Ships to Israel' });

  // Fallback for unknown brands
  if (retailers.length <= 1) {
    retailers.unshift({ name: 'Foot Locker Israel', url: `https://footlocker.co.il/search?q=${q}`, note: 'Ships within Israel' });
  }

  return retailers;
}

// Build instant verified retailer list — only retailers that SHIP to the user's country
function getInstantRetailers(shoe, countryCode, city) {
  const brand = (shoe?.brand || '').toLowerCase();
  const q = encodeURIComponent(`${shoe?.brand || ''} ${shoe?.name || ''}`);

  // Detect Israel by countryCode OR by city name
  const isIsrael = countryCode === 'IL' ||
    ['tel aviv', 'haifa', 'jerusalem', 'beer sheva', 'netanya', 'rishon', 'petah', 'herzliya', 'ramat gan', 'holon', 'bat yam', 'ashdod'].some(c => (city || '').toLowerCase().includes(c));

  if (isIsrael) {
    return getIsraelRetailers(brand, q);
  }

  // UK
  if (countryCode === 'GB') {
    const retailers = [
      { name: 'Foot Locker UK', url: `https://www.footlocker.co.uk/search?query=${q}`, note: 'Ships within UK · Free delivery £60+' },
      { name: 'JD Sports UK',   url: `https://www.jdsports.co.uk/search/?query=${q}`,  note: 'Ships within UK' },
      { name: 'ASOS',           url: `https://www.asos.com/search/?q=${q}`,            note: 'Free next-day delivery with ASOS Premier' },
    ];
    if (brand.includes('nike'))   retailers.unshift({ name: 'Nike UK',   url: `https://www.nike.com/gb/w?q=${q}`, note: 'Official Nike UK store' });
    if (brand.includes('adidas')) retailers.unshift({ name: 'Adidas UK', url: `https://www.adidas.co.uk/search?q=${q}`, note: 'Official Adidas UK store' });
    return retailers;
  }

  // EU
  if (['DE','FR','ES','IT','NL','BE','AT','PL','SE','DK','FI','NO'].includes(countryCode)) {
    const retailers = [
      { name: 'Foot Locker EU', url: `https://www.footlocker.eu/en/search?query=${q}`, note: 'Ships across Europe' },
      { name: 'Zalando',        url: `https://www.zalando.com/catalog/?q=${q}`,        note: 'Free delivery & returns · Ships to EU' },
    ];
    if (brand.includes('nike'))   retailers.unshift({ name: 'Nike EU',   url: `https://www.nike.com/de/w?q=${q}`, note: 'Official Nike EU store' });
    if (brand.includes('adidas')) retailers.unshift({ name: 'Adidas EU', url: `https://www.adidas.com/de/search?q=${q}`, note: 'Official Adidas EU store' });
    return retailers;
  }

  // US only
  const retailers = [
    { name: 'Foot Locker',  url: `https://www.footlocker.com/search?query=${q}`, note: 'Ships within US · Free shipping $75+' },
    { name: 'Zappos',       url: `https://www.zappos.com/search/term/${q}`,      note: 'Free shipping & free returns · US only' },
    { name: 'DSW',          url: `https://www.dsw.com/en/us/search?q=${q}`,      note: 'Rewards points on every purchase · US only' },
  ];
  if (brand.includes('nike'))   retailers.unshift({ name: 'Nike.com',   url: `https://www.nike.com/w?q=${q}`,           note: 'Official store · Free shipping & returns' });
  if (brand.includes('adidas')) retailers.unshift({ name: 'Adidas.com', url: `https://www.adidas.com/us/search?q=${q}`, note: 'Official store · Free shipping on $50+' });
  if (brand.includes('puma'))   retailers.push(   { name: 'Puma.com',   url: `https://us.puma.com/en_US/search?q=${q}`, note: 'Official Puma US store' });
  return retailers;
}

export default function BuyOnline({ shoe, selectedSize = null, selectedColor = null }) {
  const [sizeStandard, setSizeStandard] = useState("US");
  const [loc, setLoc] = useState(getLocation());
  const [liveRetailers, setLiveRetailers] = useState(null); // null = not fetched yet
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);

  useEffect(() => subscribeLocation(setLoc), []);

  // Reset when shoe changes
  useEffect(() => {
    setLiveRetailers(null);
    setLiveFailed(false);
    setLoadingLive(false);
  }, [shoe?.id]);

  const instantRetailers = getInstantRetailers(shoe, loc.countryCode, loc.city);

  // Try to fetch live prices from backend — 65s timeout to match backend
  const fetchLivePrices = async () => {
    setLoadingLive(true);
    setLiveFailed(false);
    setLiveRetailers(null);
    try {
      // Race the backend call against a 65-second client timeout
      const res = await Promise.race([
        base44.functions.invoke('fastWebSearch', {
          query: `${shoe?.brand || ''} ${shoe?.name || ''}`,
          brand: shoe?.brand || '',
          city: loc.city,
          country: loc.country || '',
          countryCode: loc.countryCode || 'US',
          selectedSize: selectedSize || null,
          userLat: loc.lat || null,
          userLng: loc.lng || null,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 65000)),
      ]);
      const picks = (res?.data?.web_picks || []).filter(
        p => !p.is_fallback_search_link && p.price && parseFloat((p.price || '').replace(/[^0-9.]/g, '')) > 0
      );
      if (picks.length > 0) {
        setLiveRetailers(picks);
      } else {
        setLiveFailed(true);
      }
    } catch {
      setLiveFailed(true);
    }
    setLoadingLive(false);
  };

  const displaySize = selectedSize && sizeStandard !== "US"
    ? fromUSSize(selectedSize, sizeStandard, shoe?.gender)
    : selectedSize;

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SizeStandardToggle standard={sizeStandard} onChange={setSizeStandard} />
        <LocationInput onLocated={(newLoc) => setLoc(newLoc)} compact />
      </div>

      {selectedSize && (
        <div className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg w-fit">
          Size: {displaySize} {sizeStandard}
        </div>
      )}

      {/* Live prices section */}
      {liveRetailers && liveRetailers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">Live Prices Found</p>
          </div>
          <AnimatePresence>
            {liveRetailers.map((r, i) => {
              const priceNum = parseFloat((r.price || '').replace(/[^0-9.]/g, ''));
              const origNum = parseFloat((r.original_price || '').replace(/[^0-9.]/g, ''));
              const hasDiscount = origNum > priceNum;
              const sym = r.currency === 'ILS' ? '₪' : r.currency === 'EUR' ? '€' : '$';
              return (
                <motion.div
                  key={r.retailer + i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card border rounded-2xl p-4 ${r.is_best_deal ? 'border-green-400/60 ring-1 ring-green-400/20' : 'border-border/50'}`}
                >
                  {r.is_best_deal && (
                    <div className="flex items-center gap-1 mb-2 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wide">
                      <CheckCircle className="w-3 h-3" /> Best Price
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-heading font-semibold text-sm">{r.retailer}</p>
                      {hasDiscount && (
                        <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{r.discount_percent}% OFF</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`font-heading font-bold text-xl ${r.is_best_deal ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {sym}{priceNum}
                      </div>
                      {hasDiscount && <div className="text-xs text-muted-foreground line-through">{sym}{origNum}</div>}
                    </div>
                  </div>
                  <a
                    href={r.buy_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] ${r.is_best_deal ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Shop at {r.retailer}
                  </a>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <button onClick={fetchLivePrices} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto">
            <RefreshCw className="w-3 h-3" /> Refresh prices
          </button>
        </div>
      )}

      {/* Live price fetch button */}
      {!liveRetailers && (
        <div className="border border-dashed border-border rounded-xl p-4 text-center space-y-2">
          <Globe className="w-6 h-6 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-medium text-foreground">Get live prices</p>
          <p className="text-[10px] text-muted-foreground">AI searches retailer sites in real-time. Takes ~45 seconds.</p>
          <button
            onClick={fetchLivePrices}
            disabled={loadingLive}
            className="flex items-center gap-2 text-xs font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity mx-auto disabled:opacity-60"
          >
            {loadingLive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            {loadingLive ? "Searching prices…" : "Check Live Prices"}
          </button>
          {liveFailed && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">Live prices unavailable right now — use the links below.</p>
          )}
        </div>
      )}

      {/* Instant verified retailer links — always shown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Shop at verified retailers</p>
        </div>
        <div className="space-y-2">
          {instantRetailers.map((r, i) => (
            <motion.a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between gap-3 bg-card border border-border/50 rounded-2xl px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              <div>
                <p className="font-heading font-semibold text-sm group-hover:text-primary transition-colors">{r.name}</p>
                {r.note && <p className="text-[10px] text-muted-foreground mt-0.5">{r.note}</p>}
              </div>
              <div className="flex items-center gap-1.5 text-primary">
                <span className="text-xs font-semibold">Search</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.a>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <ShieldCheck className="w-3 h-3 flex-shrink-0" />
        Prices shown are live from retailer sites. Always confirm final price before purchase.
      </p>
    </div>
  );
}