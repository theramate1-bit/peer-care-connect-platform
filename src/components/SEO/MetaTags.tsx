import React, { useEffect, useMemo } from 'react';

interface MetaTagsProps {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  keywords?: string | React.ReactNode;
  canonicalUrl?: string | React.ReactNode;
  ogImage?: string | React.ReactNode;
  ogType?: string | React.ReactNode;
  noIndex?: boolean;
  structuredData?: object;
}

const toSafeString = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (React.isValidElement(value)) return '';
  try {
    return String(value);
  } catch {
    return '';
  }
};

const upsertMeta = (selector: string, attrs: Record<string, string>) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
};

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
  const normalized = useMemo(() => {
    const cleanTitle = toSafeString(title);
    const cleanDescription = toSafeString(description);
    const cleanKeywords = toSafeString(keywords);
    const cleanCanonical = toSafeString(canonicalUrl);
    const cleanOgImage = toSafeString(ogImage) || "https://theramate.co.uk/og-image.png";
    const cleanOgType = toSafeString(ogType) || "website";
    const fullTitle = cleanTitle.includes("TheraMate") ? cleanTitle : `${cleanTitle} | TheraMate`;

    return {
      title: fullTitle || "TheraMate",
      description: cleanDescription || "Find qualified sports therapists, massage therapists, and osteopaths near you. Book sessions, manage appointments, and connect with healthcare professionals on TheraMate.",
      keywords: cleanKeywords || "therapy, sports therapy, massage therapy, osteopathy, healthcare professionals, book sessions, therapy platform, find therapists, healthcare networking, UK therapy services",
      canonicalUrl: cleanCanonical,
      ogImage: cleanOgImage,
      ogType: cleanOgType,
      robots: noIndex ? "noindex, nofollow" : "index, follow"
    };
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, noIndex]);

  useEffect(() => {
    document.title = normalized.title;

    upsertMeta('meta[name="description"]', { name: "description", content: normalized.description });
    upsertMeta('meta[name="keywords"]', { name: "keywords", content: normalized.keywords });
    upsertMeta('meta[name="author"]', { name: "author", content: "TheraMate" });
    upsertMeta('meta[name="robots"]', { name: "robots", content: normalized.robots });
    upsertMeta('meta[name="googlebot"]', { name: "googlebot", content: normalized.robots });

    upsertMeta('meta[property="og:title"]', { property: "og:title", content: normalized.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: normalized.description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: normalized.ogType });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: normalized.ogImage });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: normalized.canonicalUrl || "https://theramate.co.uk" });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "TheraMate" });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: "en_GB" });

    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:site"]', { name: "twitter:site", content: "@theramate_app" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: normalized.title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: normalized.description });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: normalized.ogImage });

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (normalized.canonicalUrl) {
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', normalized.canonicalUrl);
    }

    const scriptId = "theramate-structured-data";
    const existingScript = document.getElementById(scriptId);
    if (structuredData && typeof structuredData === "object") {
      const script = existingScript ?? document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.text = JSON.stringify(structuredData);
      if (!existingScript) {
        document.head.appendChild(script);
      }
    } else if (existingScript) {
      existingScript.remove();
    }
  }, [normalized, structuredData]);

  return null;
};

export default MetaTags;
