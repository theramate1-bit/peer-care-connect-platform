import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { LegalDocumentView } from "@/components/marketing/LegalDocumentView";
import { TERMS_DOCUMENT } from "@/constants/legal/termsDocument";

const TermsPage = () => (
  <MarketingLayout>
    <LegalDocumentView title="Terms of Service" document={TERMS_DOCUMENT} />
  </MarketingLayout>
);

export default TermsPage;
