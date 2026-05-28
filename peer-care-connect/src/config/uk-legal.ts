/**
 * UK legal display strings — Theramate Limited (England & Wales).
 *
 * Verified Companies House defaults are baked in so production shows correct details
 * without relying on environment variables. Optional Vite vars override when set
 * (e.g. staging or after a registered office change before code deploy):
 * - VITE_COMPANY_REGISTRATION_NUMBER
 * - VITE_REGISTERED_OFFICE (single line)
 * - VITE_ICO_REGISTRATION_REFERENCE
 *
 * @see https://ico.org.uk/
 * @see https://www.gov.uk/government/organisations/companies-house
 */

/** Legal name as registered at Companies House */
export const COMPANY_LEGAL_NAME = 'Theramate Limited' as const;

/** Companies House company number — Theramate Limited (verified public record) */
export const DEFAULT_COMPANY_REGISTRATION_NUMBER = '17150275';

/** Registered office as filed — Suite A, 82 James Carter Road, Mildenhall IP28 7DE */
export const DEFAULT_REGISTERED_OFFICE_LINE =
  '82, Suite A James Carter Road, Mildenhall, United Kingdom, IP28 7DE';

export const LEGAL_LAST_UPDATED = '16 April 2026';
export const LEGAL_TERMS_VERSION = '5.1';

type LegalEnvKey =
  | 'VITE_COMPANY_REGISTRATION_NUMBER'
  | 'VITE_REGISTERED_OFFICE'
  | 'VITE_ICO_REGISTRATION_REFERENCE';

function envTrim(key: LegalEnvKey): string {
  const raw = import.meta.env[key];
  if (typeof raw !== 'string') return '';
  const t = raw.trim();
  return t.length ? t : '';
}

/** Companies House company registration number (England and Wales). */
export function getCompanyRegistrationNumber(): string {
  const n = envTrim('VITE_COMPANY_REGISTRATION_NUMBER');
  return n || DEFAULT_COMPANY_REGISTRATION_NUMBER;
}

/** Single-line registered office address. */
export function getRegisteredOfficeLine(): string {
  const a = envTrim('VITE_REGISTERED_OFFICE');
  return a || DEFAULT_REGISTERED_OFFICE_LINE;
}

/** ICO self-assessment / registration reference, when configured. */
export function getIcoRegistrationReference(): string | undefined {
  const n = envTrim('VITE_ICO_REGISTRATION_REFERENCE');
  return n || undefined;
}

/** Company registration line for legal pages and footers. */
export function getCompanyRegistrationDisplay(): string {
  return `Company registration number (England and Wales): ${getCompanyRegistrationNumber()}.`;
}

/** Registered office line for legal pages and footers. */
export function getRegisteredOfficeDisplay(): string {
  return `Registered office: ${getRegisteredOfficeLine()}.`;
}

/** Place of incorporation (jurisdiction). */
export function getPlaceOfRegistrationDisplay(): string {
  return 'Incorporated in England and Wales.';
}

/** ICO line — uses env or UK-appropriate fallback (fee paid / register verification). */
export function getIcoRegistrationDisplay(): string {
  const ref = getIcoRegistrationReference();
  if (ref) {
    return `ICO registration / data protection fee reference: ${ref}.`;
  }
  return (
    'ICO: we pay the data protection fee where required. You can verify organisations on the ICO register at ico.org.uk ' +
    'or ask privacy@theramate.co.uk for our public fee reference.'
  );
}

/** One block for footers / compact legal strips. */
export function getCompanyLegalFooterLine(): string {
  return `${COMPANY_LEGAL_NAME} · ${getCompanyRegistrationDisplay()} ${getRegisteredOfficeDisplay()}`;
}
