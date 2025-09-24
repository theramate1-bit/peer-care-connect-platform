import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, Heart, Users, Shield, Star, CheckCircle, User, Calendar, Bell, FileText, Award } from "lucide-react";
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
      title: "Join the Platform",
      description: "Complete professional verification with your license and credentials",
      icon: Shield,
      details: [
        "Upload your professional license",
        "Complete admin verification process",
        "Set up your professional profile"
      ]
    },
    {
      step: 2,
      title: "Set Up Services",
      description: "Configure your professional profile and set your service offerings",
      icon: Heart,
      details: [
        "Set your available time slots",
        "Define your service types and pricing",
        "Complete your professional profile"
      ]
    },
    {
      step: 3,
      title: "Start Booking",
      description: "Begin receiving bookings from clients and manage your schedule",
      icon: Users,
      details: [
        "Receive booking requests from clients",
        "Manage your calendar and availability",
        "Provide professional services"
      ]
    },
    {
      step: 4,
      title: "Build Community",
      description: "Rate experiences and build trust within the therapist community",
      icon: Star,
      details: [
        "Leave honest reviews and ratings",
        "Build your professional reputation",
        "Connect with like-minded professionals"
      ]
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
                  <User className="h-4 w-4 mr-2" />
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
                    <CardDescription>{step.description}</CardDescription>
                  </CardHeader>
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

      {/* Professional Development (basic/vague) */}
      {userType === 'professional' && (
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-wellness-800 mb-3">Professional Development</h2>
                <p className="text-muted-foreground">
                  Grow steadily with simple tools and community support. Keep it flexible and on your terms.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Practice Growth</CardTitle>
                    <CardDescription>Keep your profile current, manage bookings, and build reputation over time.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /> Simple tools to manage availability and services</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /> Reviews help clients understand your strengths</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /> Visibility through consistent, quality care</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Learning & Community</CardTitle>
                    <CardDescription>Keep improving at your own pace with peer support.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /> Peer exchange and feedback opportunities</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /> Light-touch resources and guidance (as needed)</li>
                      <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /> Optional CPD ideas and prompts</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center mt-8">
                <p className="text-sm text-muted-foreground">
                  Coming soon: simple CPD tracking and curated learning moments.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

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
                  Our fair and transparent credit system ensures equal value exchange between professionals.
                </p>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-emerald-600" />
                    <span>Earning Credits</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded">
                    <span>Swedish Massage (60 min)</span>
                    <Badge className="bg-emerald-100 text-emerald-700">6 credits</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded">
                    <span>Deep Tissue (60 min)</span>
                    <Badge className="bg-emerald-100 text-emerald-700">8 credits</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded">
                    <span>Sports Massage (60 min)</span>
                    <Badge className="bg-emerald-100 text-emerald-700">10 credits</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Credits are earned based on service type and session duration.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span>Spending Credits</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span>Book any 60min session</span>
                    <Badge className="bg-blue-100 text-blue-700">6-10 credits</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span>Premium locations</span>
                    <Badge className="bg-blue-100 text-blue-700">+1-2 credits</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span>Specialist services</span>
                    <Badge className="bg-blue-100 text-blue-700">Variable</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Spend credits for the same quality care you provide to others.
                  </p>
                </CardContent>
              </Card>
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
                    <p className="font-medium">Fair Valuation</p>
                    <p className="text-sm text-muted-foreground">Credits reflect service complexity and time</p>
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


      {/* Platform Features */}
      {userType === 'professional' ? (
        <FeaturesSection />
      ) : (
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Everything You Need for
                <span className="block text-primary">Your Wellness Journey</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                A comprehensive platform designed to connect you with qualified healthcare professionals 
                and support your wellness journey with convenient booking and quality care.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Find Your Therapist */}
              <Card className="shadow-wellness hover:shadow-wellness-medium transition-wellness group hover:scale-105 cursor-pointer">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 wellness-gradient rounded-lg group-hover:glow-primary transition-wellness">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-primary/10 text-primary">Core Feature</Badge>
                  </div>
                  <CardTitle className="text-xl mb-2">Find Your Therapist</CardTitle>
                  <p className="text-muted-foreground leading-relaxed">
                    Discover qualified healthcare professionals in your area with detailed profiles and specialties.
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Verified professional profiles</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Location-based search</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Specialty filtering</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Real-time availability</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Easy Booking */}
              <Card className="shadow-wellness hover:shadow-wellness-medium transition-wellness group hover:scale-105 cursor-pointer">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 wellness-gradient rounded-lg group-hover:glow-primary transition-wellness">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-accent/10 text-accent">Popular</Badge>
                  </div>
                  <CardTitle className="text-xl mb-2">Easy Booking</CardTitle>
                  <p className="text-muted-foreground leading-relaxed">
                    Simple scheduling system with real-time availability and instant confirmation.
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Real-time calendar</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Instant booking confirmation</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Flexible scheduling</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Coming Soon: Auto-reminders</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Safety & Trust */}
              <Card className="shadow-wellness hover:shadow-wellness-medium transition-wellness group hover:scale-105 cursor-pointer">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 wellness-gradient rounded-lg group-hover:glow-primary transition-wellness">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-primary/10 text-primary">Secure</Badge>
                  </div>
                  <CardTitle className="text-xl mb-2">Safety & Trust</CardTitle>
                  <p className="text-muted-foreground leading-relaxed">
                    Licensed professionals with verified credentials and comprehensive safety measures.
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>License verification</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Background checks</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Insurance coverage</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Secure messaging</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      </StandardPage>
    </>
  );
};

export default HowItWorks;