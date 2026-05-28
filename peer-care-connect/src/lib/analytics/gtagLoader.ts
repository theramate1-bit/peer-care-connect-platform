/**
 * Load GA4 only after the user has accepted analytics cookies (UK PECR / consent alignment).
 */

const DEFAULT_GA_MEASUREMENT_ID = "G-QD941NQNJ9";

export function getGaMeasurementId(): string {
  const fromEnv = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  return DEFAULT_GA_MEASUREMENT_ID;
}

let loadPromise: Promise<void> | null = null;

function ensureGtagStub(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== "function") {
    w.gtag = function gtag(...args: unknown[]) {
      w.dataLayer!.push(args);
    };
  }
}

/**
 * Injects gtag.js once and runs config. Safe to call multiple times (idempotent after first load).
 */
export function loadGtagOnce(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (loadPromise) return loadPromise;

  const id = getGaMeasurementId();
  ensureGtagStub();
  const w = window as Window & { gtag?: (...args: unknown[]) => void };

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src*="googletagmanager.com/gtag/js?id=${id}"]`,
    );
    if (existing && w.gtag) {
      w.gtag("js", new Date());
      w.gtag("config", id);
      resolve();
      return;
    }

    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    s.onload = () => {
      try {
        w.gtag!("js", new Date());
        w.gtag!("config", id);
        resolve();
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };
    s.onerror = () => reject(new Error("Failed to load gtag.js"));
    document.head.appendChild(s);
  });

  return loadPromise;
}

export async function enableGoogleAnalytics(): Promise<void> {
  await loadGtagOnce();
}
