// Centralized SEO metadata for every public page.
// Each entry generates <title>, meta description, canonical URL, OG tags, and Twitter cards.

export const SITE = {
  name: "Ushoe",
  domain: "https://ushoe.base44.app",
  ogImage: "https://media.base44.com/images/public/69dd3a6cca76d34373f1ad42/cece0ad5d_generated_image.png",
  twitter: "@ushoe",
  themeColor: "#1d4ed8",
  description: "Discover, compare & share your favorite shoes. AI-powered sneaker discovery, real-time price comparison, trending releases, and nearby store finder.",
};

export const PAGE_META = {
  "/": {
    title: "Ushoe | Discover, Compare & Share Your Favorite Shoes",
    description: "Explore trending sneakers, discover new releases, compare styles, and build your personal shoe collection with Ushoe.",
    keywords: "sneakers, shoe discovery, compare shoes, trending sneakers, shoe deals, Nike, Adidas, Jordan, New Balance, AI shoe finder",
    priority: "1.0",
  },
  "/discover": {
    title: "Discover Sneakers | Ushoe",
    description: "Browse thousands of sneakers across all brands. Filter by category, price, and style to find your next pair.",
    keywords: "discover sneakers, browse shoes, shoe catalog, sneaker finder",
    priority: "0.9",
  },
  "/trending": {
    title: "Trending Sneakers | Ushoe",
    description: "See what's trending in the sneaker world right now. The hottest drops, most searched models, and rising stars.",
    keywords: "trending sneakers, hot drops, popular shoes, sneaker trends",
    priority: "0.9",
  },
  "/deals": {
    title: "Best Shoe Deals & Discounts | Ushoe",
    description: "Find the best sneaker deals and discounts from top retailers. Compare prices and save on your favorite shoes.",
    keywords: "shoe deals, sneaker discounts, cheap sneakers, shoe sales",
    priority: "0.8",
  },
  "/price-drops": {
    title: "Sneaker Price Drops & Alerts | Ushoe",
    description: "Track sneaker price drops in real time. Get alerts when your favorite shoes go on sale.",
    keywords: "price drop alerts, sneaker price tracking, shoe sale alerts",
    priority: "0.8",
  },
  "/collections": {
    title: "Sneaker Collections & Curated Lists | Ushoe",
    description: "Explore curated sneaker collections by style, brand, and category. Find the perfect pair for any occasion.",
    keywords: "sneaker collections, shoe lists, curated sneakers",
    priority: "0.7",
  },
  "/compare": {
    title: "Compare Sneakers Side by Side | Ushoe",
    description: "Compare sneakers side by side — prices, features, ratings, and specs. Make the best choice for your next pair.",
    keywords: "compare sneakers, shoe comparison, sneaker specs, compare shoes",
    priority: "0.7",
  },
  "/find-shoe": {
    title: "Find Any Shoe with AI | Ushoe",
    description: "Upload a photo or paste a social link — our AI identifies any sneaker instantly and finds where to buy it.",
    keywords: "AI shoe finder, identify sneakers, shoe recognition, find shoes by photo",
    priority: "0.8",
  },
  "/assistant": {
    title: "AI Shoe Assistant | Ushoe",
    description: "Chat with our AI shoe assistant for personalized recommendations, style advice, and finding the perfect pair.",
    keywords: "AI shoe assistant, sneaker recommendations, shoe advice",
    priority: "0.7",
  },
  "/style-quiz": {
    title: "Sneaker Style Quiz | Ushoe",
    description: "Take our style quiz to discover which sneakers match your personality and aesthetic.",
    keywords: "sneaker style quiz, shoe personality, style finder",
    priority: "0.6",
  },
  "/fit-predictor": {
    title: "Sneaker Fit Predictor | Ushoe",
    description: "Predict how sneakers will fit before you buy. Get size recommendations based on your measurements.",
    keywords: "sneaker fit predictor, shoe size guide, fit recommendation",
    priority: "0.6",
  },
  "/outfit-matcher": {
    title: "Outfit Matcher for Sneakers | Ushoe",
    description: "Find the perfect sneakers to match your outfits. AI-powered outfit matching for any style.",
    keywords: "outfit matcher, sneaker outfits, shoe styling, fashion matching",
    priority: "0.6",
  },
  "/nearby-stores": {
    title: "Find Shoe Stores Near You | Ushoe",
    description: "Locate nearby shoe stores that carry your favorite brands. Real-time stock info and directions.",
    keywords: "shoe stores near me, sneaker stores, local shoe shops, find shoes nearby",
    priority: "0.7",
  },
  "/subscription": {
    title: "Ushoe Plans & Pricing | Ushoe",
    description: "Choose your Ushoe plan — Free, Pro, or Brand. Unlock unlimited AI searches, price alerts, and more.",
    keywords: "ushoe pricing, subscription plans, pro plan, brand plan",
    priority: "0.5",
  },
  "/about": {
    title: "About Ushoe | AI Shoe Discovery Platform",
    description: "Learn about Ushoe — the AI-powered sneaker discovery and price comparison platform built for sneakerheads.",
    keywords: "about ushoe, shoe platform, sneaker app",
    priority: "0.4",
  },
  "/contact": {
    title: "Contact Us | Ushoe",
    description: "Get in touch with the Ushoe team. Questions, feedback, partnerships — we'd love to hear from you.",
    keywords: "contact ushoe, shoe support, sneaker help",
    priority: "0.4",
  },
  "/feedback": {
    title: "Send Feedback | Ushoe",
    description: "Share your feedback, report bugs, or request features. Help us make Ushoe better.",
    keywords: "ushoe feedback, bug report, feature request",
    priority: "0.3",
  },
};

export function getMeta(pathname) {
  return PAGE_META[pathname] || {
    title: `${SITE.name} | Discover, Compare & Share Shoes`,
    description: SITE.description,
    keywords: "sneakers, shoe discovery, compare shoes, trending sneakers",
    priority: "0.5",
  };
}