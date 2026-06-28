import { Helmet } from "react-helmet-async";
import { SITE, getMeta } from "@/lib/seoConfig";

// JSON-LD structured data — WebSite, Organization, SoftwareApplication
const STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.domain,
    description: SITE.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.domain}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.domain,
    logo: SITE.ogImage,
    description: SITE.description,
    sameAs: [
      "https://twitter.com/ushoe",
      "https://instagram.com/ushoe",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    url: SITE.domain,
    applicationCategory: "FashionApplication",
    operatingSystem: "Web",
    description: SITE.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1200",
    },
  },
];

export default function Seo({ path, title, description, image, keywords }) {
  const meta = getMeta(path);
  const pageTitle = title || meta.title;
  const pageDescription = description || meta.description;
  const pageKeywords = keywords || meta.keywords;
  const ogImage = image || SITE.ogImage;
  const canonicalUrl = `${SITE.domain}${path}`;

  return (
    <Helmet>
      {/* Primary Meta */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={SITE.name} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content={SITE.twitter} />

      {/* Theme Color */}
      <meta name="theme-color" content={SITE.themeColor} />

      {/* Structured Data */}
      <script type="application/ld+json">{JSON.stringify(STRUCTURED_DATA)}</script>
    </Helmet>
  );
}