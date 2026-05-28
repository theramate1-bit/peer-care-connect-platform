import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { LegalDocumentView } from "@/components/marketing/LegalDocumentView";
import { PRIVACY_DOCUMENT } from "@/constants/legal/privacyDocument";

const PrivacyPage = () => (
  <MarketingLayout>
    <LegalDocumentView title="Privacy Policy" document={PRIVACY_DOCUMENT} />
  </MarketingLayout>
);

export default PrivacyPage;
