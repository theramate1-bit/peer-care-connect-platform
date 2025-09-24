import { Helmet } from 'react-helmet-async';

interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  structuredData?: object;
}

const MetaTags = ({
  title = "TheraMate - Connect with Healthcare Professionals | Book Therapy Sessions",
  description = "Find qualified sports therapists, massage therapists, and osteopaths near you. Book sessions, manage appointments, and connect with healthcare professionals on TheraMate.",
  keywords = "therapy, sports therapy, massage therapy, osteopathy, healthcare professionals, book sessions, therapy platform, find therapists, healthcare networking, UK therapy services",
  canonicalUrl,
  ogImage = "https://theramate.co.uk/og-image.png",
  ogType = "website",
  noIndex = false,
  structuredData
}: MetaTagsProps) => {
  const fullTitle = title.includes('TheraMate') ? title : `${title} | TheraMate`;
  const fullDescription = description || "Find qualified sports therapists, massage therapists, and osteopaths near you. Book sessions, manage appointments, and connect with healthcare professionals on TheraMate.";
  const fullKeywords = keywords || "therapy, sports therapy, massage therapy, osteopathy, healthcare professionals, book sessions, therapy platform, find therapists, healthcare networking, UK therapy services";

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={fullKeywords} />
      <meta name="author" content="TheraMate" />
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      <meta name="googlebot" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl || "https://theramate.co.uk"} />
      <meta property="og:site_name" content="TheraMate" />
      <meta property="og:locale" content="en_GB" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@theramate_app" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default MetaTags;
