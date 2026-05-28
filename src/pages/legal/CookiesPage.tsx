import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { LegalDocumentView } from "@/components/marketing/LegalDocumentView";
import { COOKIES_DOCUMENT } from "@/constants/legal/cookiesDocument";

const CookiesPage = () => (
  <MarketingLayout>
    <LegalDocumentView title="Cookie Policy" document={COOKIES_DOCUMENT} />
  </MarketingLayout>
);

export default CookiesPage;
