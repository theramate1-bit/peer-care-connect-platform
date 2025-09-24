import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Calendar, CreditCard, Shield, Clock, Star, CheckCircle, User, Users, MapPin, Phone, MessageCircle } from "lucide-react";
import StandardPage from "@/components/layouts/StandardPage";
import { BackButton } from "@/components/BackButton";

const ClientHowItWorks = () => {
  const steps = [
    {
      step: 1,
      title: "Find Your Healthcare Professional",
      description: "Browse verified licensed healthcare professionals in your area",
      icon: Search,
      details: [
        "Search by location and professional type",
        "View verified licenses and reviews",
        "Filter by availability and specialties"
      ]
    },
    {
      step: 2,
      title: "Book Your Session",
      description: "Choose a convenient time and book instantly",
      icon: Calendar,
      details: [
        "Select your preferred date and time",
        "Choose from available appointment slots",
        "Book with secure online payment"
      ]
    },
    {
      step: 3,
      title: "Attend Your Session",
      description: "Meet with your healthcare professional at their practice location",
      icon: User,
      details: [
        "In-person treatment sessions",
        "Professional treatment room environment",
        "Licensed and experienced professionals"
      ]
    },
    {
      step: 4,
      title: "Track Your Wellness",
      description: "Monitor your wellness journey and treatment benefits",
      icon: Star,
      details: [
        "Access session notes and progress",
        "Schedule follow-up appointments",
        "Build a relationship with your practitioner"
      ]
    }
  ];

  const benefits = [
    {
      title: "Licensed Professionals",
      description: "All healthcare professionals are licensed and background-checked",
      icon: Shield
    },
    {
      title: "Flexible Booking",
      description: "24/7 online booking with instant confirmation",
      icon: Calendar
    },
    {
      title: "Secure Payments",
      description: "Multiple payment options with encryption",
      icon: CreditCard
    },
    {
      title: "Quality Care",
      description: "Rated and reviewed by other clients",
      icon: Star
    }
  ];



  const specialties = [
    "Massage Therapists",
    "Sports Therapists",
    "Osteopaths",
    "Physiotherapists",
    "Chiropractors",
    "Acupuncturists",
    "Reiki Practitioners",
    "Wellness Coaches"
  ];

  return (
    <StandardPage title="How TheraMate Works for You" badgeText="Client Guide" subtitle="Discover how easy it is to find the right healthcare professional, book sessions, and start your wellness journey.">
      <div className="text-center mb-6">
        <Button size="lg" asChild>
          <Link to="/find-therapists">
            Find Your Healthcare Professional <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </Button>
      </div>

      {/* How It Works Steps */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Four Simple Steps to Better Wellness
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform makes it simple to connect with qualified massage therapists and start your wellness journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.step} className="relative">
                <Card className="h-full">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <step.icon className="h-8 w-8 text-primary" />
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
                
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-primary/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Specialties Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Healthcare Professional Types
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform connects you with various licensed healthcare professionals to help you with specific wellness needs and goals.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {specialties.map((specialty, index) => (
                <Card key={index} className="text-center hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-sm">{specialty}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Choose TheraMate?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We're committed to making healthcare services accessible, convenient, and effective for your wellness needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Getting Started is Easy
              </h2>
                              <p className="text-lg text-muted-foreground">
                  Follow these simple steps to begin your wellness journey with TheraMate.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>1. Search & Compare</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Browse healthcare professionals by location, specialty, and availability. Read reviews and compare options.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>2. Book Your Session</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Choose your preferred time and book instantly. Receive confirmation and reminders.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>3. Start Your Journey</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Attend your session and begin working with your healthcare professional toward your wellness goals.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Need Help Getting Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Our support team is here to help you find the right healthcare professional and answer any questions.
            </p>
            
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center justify-center gap-3 p-4 bg-background rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
                                 <span className="font-medium">Find Local Healthcare Professionals</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/contact">
                  Contact Support
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/help">
                  View Help Centre
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Navigation Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Two Ways to Use TheraMate
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Whether you're a healthcare professional looking to exchange services or a client seeking therapy, we have the right solution for you.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="h-full">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                                     <CardTitle className="text-xl">For Healthcare Clients</CardTitle>
                   <CardDescription>
                     Find and book sessions with qualified healthcare professionals in your area
                   </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                                     <p className="text-sm text-muted-foreground mb-4">
                     You're currently viewing the client portal. Learn how to find healthcare professionals, book sessions, and start your wellness journey.
                   </p>
                   <Button className="w-full" asChild>
                     <Link to="/find-therapists">
                       Find Your Healthcare Professional
                     </Link>
                   </Button>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-wellness-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-wellness-600" />
                  </div>
                  <CardTitle className="text-xl">For Healthcare Professionals</CardTitle>
                  <CardDescription>
                    Exchange services with other licensed professionals using our credit system
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Are you a licensed healthcare professional? Learn about our professional exchange portal where you can earn and spend credits.
                  </p>
                  <Button className="w-full" variant="outline" asChild>
                    <Link to="/how-it-works">
                      Learn About the Exchange
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 text-center">
                     <h2 className="text-3xl font-bold mb-4">Ready to Start Your Wellness Journey?</h2>
           <p className="text-lg mb-8 opacity-90">
             Join thousands of clients who have found relief and wellness with TheraMate.
           </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-background text-primary hover:bg-background/90" asChild>
              <Link to="/find-therapists">
                                 Find Your Healthcare Professional <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
                         <Button size="lg" variant="outline" className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white" asChild>
               <Link to="/contact">
                 Have Questions?
               </Link>
             </Button>
          </div>
        </div>
      </section>

    </StandardPage>
  );
};

export default ClientHowItWorks;
