import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, Heart, Users, Shield, Star, CheckCircle, User as UserIcon, Calendar, Bell, FileText, Award } from "lucide-react";
import { FeaturesSection } from "@/components/FeaturesSection";
import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import StandardPage from "@/components/layouts/StandardPage";
import MetaTags from "@/components/SEO/MetaTags";

const HowItWorks = () => {
  const [userType, setUserType] = useState<'professional' | 'client'>('professional');

  const professionalSteps = [
    {
      step: 1,
      title: "Step One",
      description: "Join the platform",
      icon: Shield,
      details: []
    },
    {
      step: 2,
      title: "Step Two",
      description: "Set up your profile",
      icon: Heart,
      details: []
    },
    {
      step: 3,
      title: "Step Three",
      description: "Start providing services",
      icon: Users,
      details: []
    },
    {
      step: 4,
      title: "Step Four",
      description: "Use credits for treatment exchange",
      icon: Star,
      details: []
    }
  ];

  const clientSteps = [
    {
      step: 1,
      title: "Browse Therapists",
      description: "Search and discover qualified healthcare professionals in your area",
      icon: Users,
      details: [
        "View therapist profiles and specialties",
        "Read reviews and ratings",
        "Check availability and pricing"
      ]
    },
    {
      step: 2,
      title: "Book Your Session",
      description: "Schedule appointments that work with your schedule and preferences",
      icon: Calendar,
      details: [
        "Choose your preferred therapist",
        "Select date and time",
        "Confirm your booking"
      ]
    },
    {
      step: 3,
      title: "Attend Your Session",
      description: "Receive professional healthcare services in a comfortable environment",
      icon: Heart,
      details: [
        "Arrive at your scheduled time",
        "Receive quality treatment",
        "Provide feedback after session"
      ]
    },
    {
      step: 4,
      title: "Track Your Progress",
      description: "Monitor your wellness journey and book follow-up sessions as needed",
      icon: Star,
      details: [
        "View session history",
        "Track your progress",
        "Book recurring appointments"
      ]
    }
  ];

  const currentSteps = userType === 'professional' ? professionalSteps : clientSteps;

  return (
    <>
      <MetaTags
        title="How It Works | TheraMate"
        description="How TheraMate connects clients and healthcare professionals. Learn the simple steps to get started."
        canonicalUrl="https://theramate.co.uk/how-it-works"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How TheraMate Works",
          "description": "Steps for clients and professionals to use TheraMate",
          "url": "https://theramate.co.uk/how-it-works"
        }}
      />
      <StandardPage title="How TheraMate Works" badgeText="Guide" subtitle="Choose your role to see how TheraMate works for you.">
      {/* User Type Selection */}
      <section className="py-8 bg-wellness-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-4" />
            
            {/* Toggle Buttons */}
            <div className="flex justify-center mb-8">
              <div className="bg-white p-1 rounded-lg shadow-sm border w-full max-w-md grid grid-cols-2 gap-1">
                <Button
                  size="sm"
                  variant={userType === 'professional' ? 'default' : 'ghost'}
                  onClick={() => setUserType('professional')}
                  className="w-full px-3 py-2 text-xs sm:text-sm"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Healthcare Professionals
                </Button>
                <Button
                  size="sm"
                  variant={userType === 'client' ? 'default' : 'ghost'}
                  onClick={() => setUserType('client')}
                  className="w-full px-3 py-2 text-xs sm:text-sm"
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  Therapy Clients
                </Button>
              </div>
            </div>

            {/* Dynamic Description */}
            <div className="max-w-2xl mx-auto px-2">
              {userType === 'professional' ? (
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Join our professional exchange platform where licensed healthcare professionals trade services using our credit system. Earn credits by providing services and spend them on your own wellness needs.
                </p>
              ) : (
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Find and book sessions with qualified healthcare professionals in your area. Browse profiles, read reviews, and schedule appointments that work with your schedule.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>


      {/* How It Works Steps */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-wellness-800 mb-4">
              {userType === 'professional' ? 'Four Simple Steps to Better Self-Care' : 'Four Simple Steps to Find Your Therapist'}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {userType === 'professional' 
                ? 'Our platform makes it easy for healthcare professionals to give and receive professional care within a trusted community.'
                : 'Our platform makes it easy to find qualified healthcare professionals and book sessions that work for you.'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {currentSteps.map((step, index) => (
              <div key={step.step} className="relative">
                <Card className="h-full">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-wellness-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <step.icon className="h-8 w-8 text-wellness-600" />
                    </div>
                    <Badge variant="outline" className="w-fit mx-auto mb-2">
                      Step {step.step}
                    </Badge>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                    {step.description && <CardDescription>{step.description}</CardDescription>}
                  </CardHeader>
                  {step.details.length > 0 && (
                    <CardContent>
                      <ul className="space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-start space-x-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}
                </Card>
                
                {index < currentSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-wellness-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credit System Explanation - Only for Professionals */}
      {userType === 'professional' && (
        <section className="py-16 bg-wellness-50">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-wellness-800 mb-4">
                  Understanding the Credit System
                </h2>
                <p className="text-lg text-muted-foreground">
                  As clients book through Theramate, use these credits for our treatment exchange service.
                </p>
              </div>

            <div className="bg-card p-6 rounded-lg border">
              <h3 className="font-semibold mb-4">Credit System Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">No Money Exchange</p>
                    <p className="text-sm text-muted-foreground">Pure professional service exchange</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Flexible Usage</p>
                    <p className="text-sm text-muted-foreground">Earn when convenient, spend when needed</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Community Building</p>
                    <p className="text-sm text-muted-foreground">Encourages ongoing professional relationships</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}


      </StandardPage>
    </>
  );
};

export default HowItWorks;


