export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  /** Shown under the title, e.g. "Last updated: April 2026" */
  lastUpdated: string;
  sections: LegalSection[];
  /** Optional short note below all sections */
  footerNote?: string;
};
