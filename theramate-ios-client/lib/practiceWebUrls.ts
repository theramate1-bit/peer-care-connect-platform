import { APP_CONFIG } from "@/constants/config";

function webBase(): string {
  return APP_CONFIG.WEB_URL.replace(/\/$/, "");
}

/** Same route as web app `Link to="/practice/scheduler"`. */
export function practiceSchedulerWebUrl(): string {
  return `${webBase()}/practice/scheduler`;
}

/** Same route as web app calendar settings (`/practice/calendar`). */
export function practiceCalendarWebUrl(): string {
  return `${webBase()}/practice/calendar`;
}

/** Same route as web practice billing (invoices, tax docs, Stripe extras). */
export function practiceBillingWebUrl(): string {
  return `${webBase()}/practice/billing`;
}

/** Published page on the configured web host (e.g. `/help`, `/privacy`). */
export function publishedWebsitePath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${webBase()}${p}`;
}
