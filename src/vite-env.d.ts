/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Companies House company number for Theramate Limited (optional; shown on legal pages). */
  readonly VITE_COMPANY_REGISTRATION_NUMBER?: string;
  /** Single-line UK registered office address (optional). */
  readonly VITE_REGISTERED_OFFICE?: string;
  /** ICO data protection public register / fee reference (optional). */
  readonly VITE_ICO_REGISTRATION_REFERENCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
