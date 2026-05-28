import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import StandardPage from "@/components/layouts/StandardPage";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_TERMS_VERSION,
  getCompanyRegistrationDisplay,
  getPlaceOfRegistrationDisplay,
  getRegisteredOfficeDisplay,
} from "@/config/uk-legal";

const TermsConditions = () => {
  return (
    <StandardPage title="Terms and Conditions" badgeText="Legal">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Badge>Last updated: {LEGAL_LAST_UPDATED}</Badge>
            <Badge variant="outline">Version {LEGAL_TERMS_VERSION}</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            This page is the consolidated web version of the official <strong>Theramate Limited</strong> Terms and
            Conditions. For any discrepancies, the signed or most recently published legal document provided by
            Theramate takes precedence, except where UK law does not permit us to vary your statutory rights.
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            These Terms are governed by the laws of England and Wales. Nothing in these Terms affects your statutory
            rights under UK law (including the Consumer Rights Act 2015 where you are a consumer).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terms of Service Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[min(85vh,880px)] pr-4">
              <div className="space-y-10 text-sm">
                {/* Welcome */}
                <section className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Welcome to Theramate</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    This agreement governs your use of the Theramate platform available at{" "}
                    <a href="https://theramate.co.uk" className="text-primary underline">
                      https://theramate.co.uk
                    </a>{" "}
                    and any mobile applications we make available (together, the &quot;Platform&quot;), and any other
                    services made available through the Platform. By using the Platform, you agree to be bound by this
                    agreement which forms a binding contractual agreement between you, the User, and us,{" "}
                    <strong>Theramate Limited</strong> (&quot;Theramate&quot;, &quot;we&quot;, &quot;us&quot;), registered
                    in England and Wales.
                  </p>
                  <div className="rounded-md bg-muted/50 p-3 text-left text-muted-foreground text-xs sm:text-sm space-y-1">
                    <p className="font-medium text-foreground">Company details</p>
                    <p>{getPlaceOfRegistrationDisplay()}</p>
                    <p>{getCompanyRegistrationDisplay()}</p>
                    <p>{getRegisteredOfficeDisplay()}</p>
                  </div>
                  <p className="text-muted-foreground leading-relaxed font-medium text-foreground">
                    What parts of these Terms apply to me?
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    The remainder of this agreement is divided into three parts:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
                    <li>
                      <strong>Part A (All Users)</strong>, which sets out terms that apply to all Users;
                    </li>
                    <li>
                      <strong>Part B (Practitioners)</strong>, which sets out additional terms that apply to Users who
                      offer healthcare or related services through the Platform (&quot;Practitioners&quot;); and
                    </li>
                    <li>
                      <strong>Part C (Clients)</strong>, which sets out additional terms that apply to Users who book or
                      receive those services (&quot;Clients&quot;), including guest checkout Users where applicable.
                    </li>
                  </ul>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
                    <li>If you use the Platform as a Practitioner, <strong>Part A and Part B</strong> apply to you.</li>
                    <li>If you use the Platform as a Client (including as a guest), <strong>Part A and Part C</strong> apply to you.</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    If you access or download our mobile application from the Apple App Store or Google Play Store, you
                    agree to Apple&apos;s or Google&apos;s applicable licensed application terms, usage rules, and store
                    policies (as updated from time to time), in addition to these Terms.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    The Platform may display maps, location, or routing features provided by third parties (for example
                    map tiles or geocoding). Your use of those features may be subject to the relevant third
                    party&apos;s terms (for example map provider terms). See also our Privacy Policy regarding location
                    data.
                  </p>
                </section>

                <hr className="border-border" />

                {/* PART A */}
                <section className="space-y-6">
                  <h2 className="text-lg font-bold text-foreground tracking-wide">Part A — All Users</h2>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A1 Eligibility</h3>
                    <ol className="list-[lower-alpha] list-outside ml-6 space-y-2 text-muted-foreground leading-relaxed">
                      <li>
                        The Platform is not intended for unsupervised use by any person under the age of 18, or by any
                        person who has previously been suspended or prohibited from using the Platform. By using the
                        Platform, you represent and warrant that you are either: (i) 18 or over and accessing the
                        Platform for your own use; or (ii) accessing on behalf of someone under 18 with appropriate
                        parental/guardian consent where that is lawful and appropriate.
                      </li>
                      <li>
                        If you use the Platform on behalf of a company or other legal entity (&quot;Represented
                        Entity&quot;), you represent that you have authority to bind that entity. In that case,
                        &quot;you&quot; includes the Represented Entity.
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A2 Accounts</h3>
                    <ol className="list-[lower-alpha] list-outside ml-6 space-y-2 text-muted-foreground leading-relaxed">
                      <li>
                        To use most functionality, you must register an Account and provide accurate information
                        (including contact details, and for Practitioners, professional and billing information as
                        requested).
                      </li>
                      <li>You must keep Account information accurate and up to date.</li>
                      <li>
                        You must not share your Account with others or allow others to use your credentials. Notify us
                        promptly of any unauthorised use.
                      </li>
                      <li>
                        We may offer sign-in via third-party providers (for example OAuth). Where you use those, you
                        authorise us to access the information necessary to operate your Account in line with our
                        Privacy Policy and the provider&apos;s terms.
                      </li>
                      <li>
                        We encourage communications relating to bookings and disputes to take place through the Platform
                        where possible, so we can support safety and dispute resolution. You must not use the Platform
                        to circumvent applicable fees or to arrange bookings in order to evade payment obligations owed
                        under these Terms or our payment arrangements.
                      </li>
                      <li>
                        We may suspend or refuse registration, or suspend or terminate Accounts, in accordance with these
                        Terms.
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A3 User obligations</h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">As a User, you agree:</p>
                    <ol className="list-[lower-alpha] list-outside ml-6 space-y-2 text-muted-foreground leading-relaxed">
                      <li>
                        not to intimidate, harass, impersonate, stalk, threaten, bully or endanger any other User, or
                        distribute spam, bulk unsolicited content, or unlawful material;
                      </li>
                      <li>
                        not to use the Platform for any unlawful purpose or in connection with fraud, or to request or
                        facilitate illegal services;
                      </li>
                      <li>
                        not to scrape, hack, or make unauthorised automated use of the Platform, or copy the Platform
                        beyond what is permitted by law or with our written consent;
                      </li>
                      <li>
                        not to harm our reputation or the Platform, or act contrary to our legitimate interests in
                        operating a safe marketplace;
                      </li>
                      <li>
                        that information made available through the Platform may be general in nature and that clinical
                        decisions are between Clients and Practitioners.
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A4 Posted materials (content you upload)</h3>
                    <p className="font-medium text-foreground mb-1">A4.1 Warranties</p>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      By posting content on the Platform (&quot;Posted Material&quot;), you represent and warrant that:
                      you are entitled to post it; it is accurate where it states facts; reviews are genuinely held and
                      fair; it is not defamatory, discriminatory, unlawful, or infringing; and it does not contain
                      malware.
                    </p>
                    <p className="font-medium text-foreground mb-1">A4.2 Licence</p>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      You grant Theramate a non-exclusive, worldwide, royalty-free licence to host, store, reproduce,
                      display, and distribute Posted Material as needed to operate, promote, and secure the Platform,
                      and to comply with law. To the extent moral rights apply, you waive them to the extent permitted
                      for operation of the Platform.
                    </p>
                    <p className="font-medium text-foreground mb-1">A4.3 Removal</p>
                    <p className="text-muted-foreground leading-relaxed">
                      We may remove Posted Material where we reasonably consider it necessary for legal, safety, or
                      operational reasons. You remain responsible for retaining your own records where required for your
                      profession or business.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A5 Refunds, interruptions, and cancellations</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      To the maximum extent permitted by law, Theramate will have no liability to you if a booking is
                      cancelled, cannot be completed, or is interrupted (including due to technical faults), except where
                      liability cannot be excluded for consumers or other persons under mandatory UK law. Your remedies
                      may lie against the relevant Practitioner or Client in accordance with Part B or Part C and
                      applicable law.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A6 Online payment partner (Stripe)</h3>
                    <ol className="list-[lower-alpha] list-outside ml-6 space-y-2 text-muted-foreground leading-relaxed">
                      <li>
                        We use third-party payment services, currently <strong>Stripe</strong> (including Stripe
                        Connect where applicable), to collect and distribute payments relating to the Platform.
                      </li>
                      <li>
                        Payment processing is subject to Stripe&apos;s terms and privacy policy, in addition to these
                        Terms.
                      </li>
                      <li>
                        To the maximum extent permitted by law, you release Theramate from liability for loss arising
                        from acts or omissions of the payment provider, except where liability cannot be excluded under
                        UK law.
                      </li>
                      <li>We may instruct corrections to payment errors in line with Stripe functionality and law.</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A7 Service limitations</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. Without
                      limitation, we do not warrant that the Platform will be error-free, always available, that
                      messages will be delivered promptly, or that information supplied through the Platform is complete
                      or accurate.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A8 Intellectual property</h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      Theramate retains ownership of Platform software, branding, and materials we provide
                      (&quot;Platform Content&quot;), except for your Posted Material and Practitioner/Client content
                      you own. &quot;Intellectual Property Rights&quot; includes copyright, trade marks, designs,
                      patents, database rights, domain names, trade secrets, and similar rights.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      You may not copy or exploit Platform Content except as necessary for normal use of the Platform or
                      as permitted by law.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A9 Third party content</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      The Platform may display third-party content. We do not control and are not responsible for such
                      content, and make no representation as to accuracy or suitability.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A10 Third party terms</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Features that rely on third parties (including payments, maps, authentication, email, analytics,
                      and hosting) may be subject to third party terms. Where you use those features, you agree to
                      comply with applicable third party terms.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A11 Disputes between Users; disputes with Theramate</h3>
                    <ol className="list-[lower-alpha] list-outside ml-6 space-y-2 text-muted-foreground leading-relaxed">
                      <li>
                        Complaints about another User should first be directed to that User where appropriate. Users
                        should take reasonable steps to resolve disputes directly.
                      </li>
                      <li>
                        You may report issues to us at{" "}
                        <a href="mailto:support@theramate.co.uk" className="text-primary underline">
                          support@theramate.co.uk
                        </a>
                        . We may assist informally but are not obliged to mediate.
                      </li>
                      <li>
                        If you have a dispute with Theramate, you agree to notify us first at{" "}
                        <a href="mailto:legal@theramate.co.uk" className="text-primary underline">
                          legal@theramate.co.uk
                        </a>{" "}
                        and attempt to resolve the dispute in good faith for at least <strong>120 days</strong> before
                        commencing court proceedings (except where urgent injunctive relief is necessary or limitation
                        periods require otherwise).
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A12 Security</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      You are responsible for securing your devices and credentials. We do not accept responsibility for
                      loss or damage to your devices arising from your use of the Platform; you should use up-to-date
                      security protections.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A13 Disclaimers and limitation of liability</h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      <strong>(a) Introduction / marketplace role.</strong> Theramate facilitates introductions and
                      bookings between Clients and independent Practitioners. Except where we expressly agree
                      otherwise in writing, we are not a party to the healthcare services contract between a Client and a
                      Practitioner, and we do not provide medical treatment. In an emergency, call <strong>999</strong>{" "}
                      (UK) or the appropriate emergency number.
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      <strong>(b) Limitation.</strong> To the fullest extent permitted by applicable law, we exclude
                      liability for indirect or consequential loss and for loss of profits, data, goodwill, or business
                      opportunity arising from use of the Platform. Our total aggregate liability to you for all claims
                      arising out of or relating to the Platform (except where prohibited by law) is capped at the
                      greater of: (i) £100; and (ii) the platform fees paid by you to Theramate (if any) in the 12 months
                      before the claim arose.
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      Nothing in these Terms excludes or limits liability for death or personal injury caused by
                      negligence, fraud or fraudulent misrepresentation, or any other liability which cannot be limited
                      under English law.
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      <strong>(c) Unfair Contract Terms Act 1977 / Consumer Rights Act 2015.</strong> If you are a
                      consumer, statutory rights apply and nothing in these Terms is intended to exclude remedies that
                      cannot lawfully be excluded. If you deal on standard written terms of business as a business, any
                      liability exclusion is subject to the requirement of reasonableness under the Unfair Contract Terms
                      Act 1977 where that Act applies.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A14 Indemnity</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      You agree to indemnify Theramate against losses arising from your breach of these Terms, your
                      misuse of the Platform, or your Posted Material infringing third-party rights, except to the
                      extent caused by our negligence or breach.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A15 Confidentiality</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      You must not misuse confidential information you obtain about Theramate&apos;s business or other
                      Users beyond what is necessary to receive or provide services through the Platform, subject to
                      professional and legal duties that apply to you.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A16 Privacy</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      You agree to our{" "}
                      <a href="/privacy" className="text-primary underline">
                        Privacy Policy
                      </a>{" "}
                      (including how we process health-related data where applicable).
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A17 Collection notice</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      We collect personal data to operate the Platform, communicate with you, process payments, comply
                      with law, and for the purposes set out in our Privacy Policy.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A18 Apple App Store</h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      If you access the Services via Apple&apos;s App Store, you acknowledge that: (a) these Terms are
                      between you and Theramate, not Apple; (b) Apple has no obligation to provide support; (c) Apple is
                      not responsible for the Services or third-party claims relating to the Services; (d) Apple has no
                      obligation to defend IP claims; and (e) Apple and its subsidiaries are intended third party
                      beneficiaries of this clause and may enforce it. You also represent you are not located in a
                      U.S.-embargoed country and not on a U.S. government prohibited parties list, to the extent Apple
                      requires such representations.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A19 Termination</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      We may suspend or terminate access to the Platform where reasonably necessary, including for
                      breach, risk, or non-payment. You may terminate your Account using in-app controls where available.
                      Provisions which by their nature should survive (including IP, limitation, indemnity, governing
                      law) survive termination.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A20 Tax</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Users are responsible for their own taxes (including VAT where applicable) arising from services
                      they provide or receive, except where we are legally required to account for tax.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A21 Records</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      To the extent permitted by law, we may retain records of transactions and communications made
                      through the Platform for administration, security, and dispute resolution.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A22 Notices</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Notices to us should be sent to{" "}
                      <a href="mailto:legal@theramate.co.uk" className="text-primary underline">
                        legal@theramate.co.uk
                      </a>{" "}
                      unless another process is required by law. We may send notices to your registered email address.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">A23 General</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2 leading-relaxed">
                      <li>
                        <strong>Governing law and jurisdiction:</strong> English law. Courts of England and Wales (subject
                        to mandatory consumer jurisdiction rules).
                      </li>
                      <li>
                        <strong>Third party rights:</strong> Except where expressly stated (including for Apple as
                        relevant), nothing in these Terms confers third party rights under the Contracts (Rights of Third
                        Parties) Act 1999 to enforce terms.
                      </li>
                      <li>
                        <strong>Waiver and severability:</strong> Failure to enforce a provision is not a waiver. If any
                        provision is invalid, the remainder continues in effect to the fullest extent permitted by law.
                      </li>
                      <li>
                        <strong>Assignment:</strong> You may not assign these Terms without our consent. We may assign
                        our rights to a group company or a purchaser of our business.
                      </li>
                      <li>
                        <strong>Entire agreement:</strong> These Terms, together with the Privacy Policy and Cookie
                        Policy, are the entire agreement regarding the Platform.
                      </li>
                      <li>
                        <strong>Changes:</strong> We may update these Terms; material changes will be notified by email,
                        in-app notice, or a prominent notice on the website (typically at least 30 days for material
                        changes where required). Continued use after changes may constitute acceptance where permitted by
                        law.
                      </li>
                    </ul>
                  </div>
                </section>

                <hr className="border-border" />

                {/* PART B */}
                <section className="space-y-6">
                  <h2 className="text-lg font-bold text-foreground tracking-wide">Part B — Practitioners</h2>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">B1 Eligibility and qualifications</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      You must maintain valid qualifications, registrations, and insurance as required for your
                      profession and as described on the Platform. If we request evidence, you must provide it promptly.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">B2 Listings, services, and profiles</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      You must provide accurate, lawful listings and availability. We may refuse or limit listings for
                      operational or compliance reasons. Additional terms between you and a Client must not conflict with
                      these Terms or applicable consumer law.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">B3 Provision of services</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      You must provide services with reasonable care and skill, in accordance with applicable law and
                      professional standards, and as described in the booking.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">B4 Fees, payouts, and subscriptions</h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      Platform fees and practitioner subscription terms are as disclosed at booking or in your account.
                      Stripe Connect onboarding is required to receive payouts. You authorise us and Stripe to collect and
                      distribute amounts in accordance with these Terms and Stripe&apos;s rules.
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      Practitioner subscription plans (where applicable) renew automatically unless cancelled before the
                      renewal date. We will notify you by email and/or in-app before renewal. You may cancel via Profile →
                      Subscription or the Stripe customer portal where linked. Cancellation takes effect at the end of the
                      current billing period. We will give at least 30 days&apos; notice of subscription price increases;
                      you may cancel before the new price applies if you do not accept the change.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">B5 Cancellations and refunds</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Your cancellation and refund practices must comply with UK consumer law where applicable. We may
                      facilitate refunds through Stripe as described on the Platform.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">B6 Circumvention</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      While you use the Platform as a Practitioner, you must not solicit Clients to book or pay outside
                      the Platform to avoid fees or undermine marketplace integrity, except where we expressly permit in
                      writing or where required by law.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">B7 Contract with the Client</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      When a booking is confirmed in line with Platform rules, a contract for services is formed between
                      you and the Client. Theramate is not a party to that clinical services contract.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">B8 Clinical records</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Treatment notes and related records remain your professional responsibility. You must comply with
                      UK GDPR and professional record-keeping requirements.
                    </p>
                  </div>
                </section>

                <hr className="border-border" />

                {/* PART C */}
                <section className="space-y-6">
                  <h2 className="text-lg font-bold text-foreground tracking-wide">Part C — Clients (including guests)</h2>

                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                    <h3 className="text-base font-semibold text-foreground">Your statutory rights (UK) — summary</h3>
                    <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">
                      If you are a consumer, the Consumer Rights Act 2015 gives you important statutory rights relating
                      to services, including that services must be performed with reasonable care and skill. Remedies
                      can include repeat performance or a price reduction in some circumstances. For some distance
                      contracts, additional cancellation rights may apply under the Consumer Contracts (Information,
                      Cancellation and Additional Charges) Regulations 2013, subject to exceptions (for example where a
                      service has started with your agreement before the cooling-off period ends). This is a summary
                      only; for detailed guidance contact Citizens Advice (
                      <a href="https://www.citizensadvice.org.uk" className="text-primary underline" target="_blank" rel="noopener noreferrer">
                        citizensadvice.org.uk
                      </a>
                      ) or call <strong>0808 223 1133</strong>.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">C1 Bookings and fees</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      When you book, you agree to pay the price shown (including VAT where stated). Platform fees may be
                      included in the total amount charged as disclosed at checkout.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">C2 Payment</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Payment is processed by our payment partner. Card charges, declines, and authentication steps are
                      subject to your bank and Stripe rules.
                    </p>
                  </div>

                  <div id="cancellation">
                    <h3 className="text-base font-semibold mb-2 text-foreground">C3 Cancellation and refunds</h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      Cancellation and refund policies are set by individual Practitioners and must comply with UK
                      consumer protection laws, including the Consumer Rights Act 2015:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2 leading-relaxed">
                      <li>
                        Cancellations made more than 24 hours before the scheduled session time are typically eligible for
                        a full refund, unless otherwise stated by the Practitioner.
                      </li>
                      <li>
                        Cancellations made less than 24 hours before the scheduled session may be subject to cancellation
                        fees as set by the Practitioner.
                      </li>
                      <li>No-shows may be charged the full session fee.</li>
                      <li>
                        Practitioners may cancel sessions with reasonable notice, in which case Clients will typically
                        receive a full refund for the affected booking.
                      </li>
                      <li>Refunds will be processed through the original payment method within a reasonable period (often 5–10 business days, depending on banks).</li>
                    </ul>
                    <p className="text-muted-foreground leading-relaxed mt-2">
                      If you believe you are entitled to a statutory remedy (for example because services were not provided
                      with reasonable care and skill), you may have rights independent of the Practitioner&apos;s policy.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">C4 Ratings and reviews</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Reviews must be honest, fair, and based on a genuine booking experience through the Platform. We
                      may remove reviews that breach these Terms or law.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">C5 Independent Practitioners</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Practitioners are independent businesses/professionals. Listing on Theramate does not constitute our
                      endorsement of a particular Practitioner.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2 text-foreground">C6 Contact</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      You must not use the Platform to circumvent fees or to arrange paid treatment with a Practitioner
                      in order to evade payment obligations that would otherwise apply through the Platform.
                    </p>
                  </div>
                </section>

                <hr className="border-border" />

                <section className="space-y-3 pb-4">
                  <h2 className="text-base font-semibold text-foreground">Contact</h2>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    Questions about these Terms:{" "}
                    <a href="mailto:legal@theramate.co.uk" className="text-primary underline">
                      legal@theramate.co.uk
                    </a>
                    . Support:{" "}
                    <a href="mailto:support@theramate.co.uk" className="text-primary underline">
                      support@theramate.co.uk
                    </a>
                    .
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                    <p className="font-medium text-foreground">Theramate Limited</p>
                    <p>Website: https://theramate.co.uk</p>
                    <p className="text-muted-foreground">{getPlaceOfRegistrationDisplay()}</p>
                    <p className="text-muted-foreground">{getCompanyRegistrationDisplay()}</p>
                    <p className="text-muted-foreground">{getRegisteredOfficeDisplay()}</p>
                  </div>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </StandardPage>
  );
};

export default TermsConditions;
