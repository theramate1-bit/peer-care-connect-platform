import { FooterClean } from "@/components/FooterClean";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardRoute } from "@/lib/dashboard-routing";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import MetaTags from "@/components/SEO/MetaTags";
import {
  HeroSectionClean,
  ImpactSection,
  ServicesSection,
  HowItWorksSection,
  TestimonialsSectionClean,
  CTASection,
  HeaderClean,
} from "@/components/landing";

const Index = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users to their appropriate dashboard
    if (user && userProfile && !loading) {
      const dashboardRoute = getDashboardRoute({ userProfile });
      navigate(dashboardRoute, { replace: true });
    }
  }, [user, userProfile, loading, navigate]);

  // Show loading while checking authentication
  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  // Only show landing page for non-authenticated users
  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <>
      <MetaTags
        title="Theramate | Book Osteopaths, Sports Massage & Physical Therapists in the UK"
        description="Find and book osteopaths, sports massage therapists, sports therapists and massage therapists across the UK. Easy booking for back pain, injury recovery, posture correction and muscle relief."
        keywords="osteopath, sports massage, sports therapist, massage therapist, back pain, injury recovery, posture correction, muscle relief, UK therapy, book therapist online"
        canonicalUrl="https://theramate.co.uk/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "MedicalBusiness",
          "name": "Theramate",
          "description": "Book osteopaths, sports massage therapists, sports therapists, and massage therapists online in the UK.",
          "url": "https://theramate.co.uk",
          "areaServed": "GB",
          "medicalSpecialty": [
            "Osteopathy",
            "SportsTherapy",
            "MassageTherapy"
          ],
          "offers": {
            "@type": "Offer",
            "description": "Online booking for pain relief, sports recovery, posture correction, and muscle treatment."
          },
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://theramate.co.uk/marketplace?search={search_term_string}",
            "query-input": "required name=search_term_string"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Theramate",
            "url": "https://theramate.co.uk",
            "logo": "https://theramate.co.uk/logo.png"
          }
        }}
      />
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <HeaderClean />
        <main id="main-content">
          <HeroSectionClean />
          <ImpactSection />
          <ServicesSection />
          <HowItWorksSection />
          <TestimonialsSectionClean />
          <CTASection />
        </main>
        <FooterClean />
      </div>
    </>
  );
};

export default Index;
