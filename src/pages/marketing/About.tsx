import { MarketingLayout } from "@/components/marketing/MarketingLayout";

const About = () => (
  <MarketingLayout>
    <div className="max-w-3xl mx-auto px-6">
      <h1 className="text-3xl font-bold mb-4">About Theramate</h1>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Theramate Limited (company number 17150275) operates the UK marketplace
        and practice platform for osteopaths, sports massage therapists, sports
        therapists, and related practitioners.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        We connect clients with independent practitioners and provide software
        for booking, messaging, clinical documentation, mobile visit requests,
        and practitioner-to-practitioner treatment exchange — without providing
        clinical care ourselves.
      </p>
      <p className="text-sm text-muted-foreground">
        Registered office: 82, Suite A James Carter Road, Mildenhall, United
        Kingdom, IP28 7DE · support@theramate.co.uk
      </p>
    </div>
  </MarketingLayout>
);

export default About;
