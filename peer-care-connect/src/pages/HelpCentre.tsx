import { HeaderClean } from "@/components/landing/HeaderClean";
import { FooterClean } from "@/components/FooterClean";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  FileText, 
  Users, 
  Settings, 
  CreditCard, 
  Shield, 
  MessageCircle,
  Book,
  ArrowRight,
  HelpCircle,
  Phone,
  Calendar
} from "lucide-react";
import MetaTags from "@/components/SEO/MetaTags";
import HelpArticle from "@/components/help/HelpArticle";
import { BackButton } from "@/components/BackButton";
import { useState } from "react";

const HelpCentre = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [showFAQs, setShowFAQs] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);


  // Handle contact page redirect
  const handleContactRedirect = () => {
    window.location.href = "/contact";
  };

  // Handle article selection
  const handleArticleClick = (articleId: string) => {
    setSelectedArticle(articleId);
  };

  // Handle back to help centre
  const handleBackToHelp = () => {
    setSelectedArticle(null);
  };

  const categories = [
    {
      title: "Getting Started",
      icon: Book,
      articles: 12,
      description: "Essential guides for new TheraMate users and platform setup",
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "Client Portal",
      icon: Users,
      articles: 8,
      description: "How to browse, book, and connect with healthcare professionals",
      color: "bg-green-100 text-green-600"
    },
    {
      title: "Practitioner Tools",
      icon: FileText,
      articles: 15,
      description: "Profile management, scheduling, and practice optimization on TheraMate",
      color: "bg-purple-100 text-purple-600"
    },
    {
      title: "Booking & Sessions",
      icon: Calendar,
      articles: 10,
      description: "How to book sessions, manage appointments, and track progress",
      color: "bg-orange-100 text-orange-600"
    },
    {
      title: "Platform Features",
      icon: Settings,
      articles: 12,
      description: "Messaging, reviews, analytics, and other TheraMate features",
      color: "bg-red-100 text-red-600"
    },
    {
      title: "Account & Billing",
      icon: CreditCard,
      articles: 6,
      description: "Account management, subscription plans, and payment processing",
      color: "bg-gray-100 text-gray-600"
    }
  ];

  const popularArticles = [
    {
      id: "platform-setup",
      title: "Getting Started with TheraMate",
      category: "Getting Started",
      views: "1.2k views",
      difficulty: "Beginner",
      description: "Learn how to create your account, choose your role, and navigate the platform"
    },
    {
      id: "client-management",
      title: "Client Portal & Profile Management",
      category: "Client Portal",
      views: "980 views",
      difficulty: "Beginner",
      description: "Complete your client profile, set your goals, and start browsing healthcare professionals"
    },
    {
      id: "billing-management",
      title: "Understanding Our Pricing Structure",
      category: "Account & Billing",
      views: "850 views",
      difficulty: "Beginner",
      description: "Free client access, professional subscription plans, and enterprise solutions"
    },
    {
      id: "progress-tracking",
      title: "Tracking Your Progress",
      category: "Booking & Sessions",
      views: "720 views",
      difficulty: "Beginner",
      description: "Learn how to track your therapy progress and manage your appointments"
    },
    {
      id: "hipaa-compliance",
      title: "Security & Privacy on TheraMate",
      category: "Platform Features",
      views: "650 views",
      difficulty: "Beginner",
      description: "How we protect your data and ensure secure communication"
    },
    {
      id: "telehealth-best-practices",
      title: "Getting Help and Support",
      category: "Platform Features",
      views: "580 views",
      difficulty: "Beginner",
      description: "How to contact our support team and get assistance with your account"
    }
  ];

  const quickLinks = [
    { title: "Contact Support", icon: MessageCircle, href: "/contact" },
    { title: "FAQs", icon: HelpCircle, href: "#faqs" },
    { title: "User Guide", icon: Book, href: "#guide" },
    { title: "Troubleshooting", icon: Settings, href: "#troubleshooting" }
  ];

  // If an article is selected, show the article component
  if (selectedArticle) {
    return <HelpArticle articleId={selectedArticle} onBack={handleBackToHelp} />;
  }

  return (
    <>
      <MetaTags
        title="Help Center | TheraMate - Support & FAQ"
        description="Get help with TheraMate platform. Find answers to common questions, learn how to use features, and get support for clients and healthcare professionals."
        keywords="theramate help, therapy platform support, FAQ, how to use theramate, client support, professional support, booking help, platform guide"
        canonicalUrl="https://theramate.com/help"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "name": "TheraMate Help Center",
          "description": "Frequently asked questions about TheraMate platform",
          "url": "https://theramate.com/help",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "How do I book a therapy session?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "To book a therapy session, browse our marketplace, select a healthcare professional, choose an available time slot, and complete the booking process. Sessions are paid per booking."
              }
            },
            {
              "@type": "Question",
              "name": "What types of therapy services are available?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "TheraMate offers sports therapy, massage therapy, and osteopathy services from qualified healthcare professionals across the UK."
              }
            },
            {
              "@type": "Question",
              "name": "How much does it cost to use TheraMate?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Client access is free with pay-per-session model. Professional plans start from £79.99/month for professional features and £199.99/month for premium features."
              }
            },
            {
              "@type": "Question",
              "name": "How do I become a healthcare professional on TheraMate?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Register as a professional, complete verification, set up your profile, and choose a subscription plan. Our team will guide you through the onboarding process."
              }
            },
            {
              "@type": "Question",
              "name": "Is my data secure on TheraMate?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, TheraMate uses HIPAA-compliant security measures to protect all user data and communications. Your privacy and security are our top priorities."
              }
            }
          ]
        }}
      />
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <HeaderClean />
      
      <div className="py-20 mt-16">
        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="mb-8">
              <BackButton />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              How can we
              <span className="block text-primary">help you today?</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Find answers to your questions, learn how to use our features, 
              and get the most out of your healthcare practice platform.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for articles, guides, or tutorials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg"
              />
              <Button className="absolute right-2 top-1/2 transform -translate-y-1/2">
                Search
              </Button>
            </div>
          </div>

          {/* Direct Support Access */}
          <div className="max-w-2xl mx-auto mb-16">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 text-center">
                <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Need Immediate Help?</h3>
                <p className="text-muted-foreground mb-4">
                  Can't find what you're looking for? Contact our support team directly.
                </p>
                <Button 
                  className="w-full max-w-sm" 
                  onClick={handleContactRedirect}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">

              {/* Categories */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categories.map((category, index) => (
                    <Card 
                      key={index} 
                      className="cursor-pointer transition-[border-color,background-color] duration-200 ease-out group"
                      onClick={() => {
                        // Show first article from this category
                        const categoryArticles = popularArticles.filter(article => 
                          article.category === category.title
                        );
                        if (categoryArticles.length > 0) {
                          handleArticleClick(categoryArticles[0].id);
                        }
                      }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${category.color}`}>
                            <category.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">{category.title}</h3>
                              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {category.description}
                            </p>
                            <Badge variant="secondary">
                              {category.articles} articles
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Popular Articles */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Popular Articles</h2>
                <div className="space-y-4">
                  {popularArticles.map((article, index) => (
                    <Card 
                      key={index} 
                      className="cursor-pointer transition-[border-color,background-color] duration-200 ease-out"
                      onClick={() => handleArticleClick(article.id || `article-${index}`)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-2 hover:text-primary transition-colors text-lg">
                              {article.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                              {article.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="font-medium">{article.category}</span>
                              <span>•</span>
                              <span>{article.views}</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {article.difficulty}
                              </Badge>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Recent Help Articles */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Recent Help Articles</h2>
                <div className="space-y-4">
                  <Card 
                    className="cursor-pointer transition-[border-color,background-color] duration-200 ease-out"
                    onClick={() => handleArticleClick("platform-setup")}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2 hover:text-primary transition-colors text-lg">
                            Choosing Your Portal: Client vs Professional
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                            Understand the difference between client and professional portals and choose the right one for your needs
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-medium">Getting Started</span>
                            <span>•</span>
                            <span>Updated 2 days ago</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              Beginner
                            </Badge>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className="cursor-pointer transition-[border-color,background-color] duration-200 ease-out"
                    onClick={() => handleArticleClick("client-management")}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2 hover:text-primary transition-colors text-lg">
                            Using the Marketplace to Find Therapists
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                            Navigate the marketplace, filter by location and specialty, and find the perfect healthcare professional
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-medium">Client Portal</span>
                            <span>•</span>
                            <span>Updated 5 days ago</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              Beginner
                            </Badge>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className="cursor-pointer transition-[border-color,background-color] duration-200 ease-out"
                    onClick={() => handleArticleClick("outcome-measurement")}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2 hover:text-primary transition-colors text-lg">
                            Professional Dashboard Overview
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                            Learn about the professional dashboard features and how to manage your practice on TheraMate
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-medium">Practitioner Tools</span>
                            <span>•</span>
                            <span>Updated 1 week ago</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              Beginner
                            </Badge>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Contact Support */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Need More Help?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Can't find what you're looking for? Contact our support team and we'll help you get sorted.
                  </p>
                  
                  <div className="space-y-3">
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={handleContactRedirect}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                    
                    <div className="text-center pt-2">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>We'll get back to you within 24 hours</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Frequently Asked Questions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setShowFAQs(!showFAQs)}>
                      <h4 className="font-medium mb-1">How do I reset my password?</h4>
                      <p className="text-sm text-muted-foreground">Account security</p>
                    </div>
                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setShowFAQs(!showFAQs)}>
                      <h4 className="font-medium mb-1">Can I export my data?</h4>
                      <p className="text-sm text-muted-foreground">Data management</p>
                    </div>
                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setShowFAQs(!showFAQs)}>
                      <h4 className="font-medium mb-1">How to update billing info?</h4>
                      <p className="text-sm text-muted-foreground">Payment & billing</p>
                    </div>
                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setShowFAQs(!showFAQs)}>
                      <h4 className="font-medium mb-1">How do I schedule appointments?</h4>
                      <p className="text-sm text-muted-foreground">Practice management</p>
                    </div>
                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setShowFAQs(!showFAQs)}>
                      <h4 className="font-medium mb-1">Is my data HIPAA compliant?</h4>
                      <p className="text-sm text-muted-foreground">Security & compliance</p>
                    </div>
                  </div>
                  
                  {/* Expanded FAQ Content */}
                  {showFAQs && (
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                      <div className="space-y-6">
                        <div className="p-4 border rounded-lg bg-background">
                          <h4 className="font-medium mb-2">How do I reset my password?</h4>
                          <p className="text-sm text-muted-foreground mb-2">Account security</p>
                          <p className="text-sm text-muted-foreground">Go to login page → "Forgot Password" → Enter email → Check inbox for reset link</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-background">
                          <h4 className="font-medium mb-2">Can I export my data?</h4>
                          <p className="text-sm text-muted-foreground mb-2">Data management</p>
                          <p className="text-sm text-muted-foreground">Yes, go to Settings → Data Export → Select data types → Download as CSV/PDF</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-background">
                          <h4 className="font-medium mb-2">How to update billing info?</h4>
                          <p className="text-sm text-muted-foreground mb-2">Payment & billing</p>
                          <p className="text-sm text-muted-foreground">Navigate to Settings → Billing → Update payment method → Save changes</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-background">
                          <h4 className="font-medium mb-2">How do I schedule appointments?</h4>
                          <p className="text-sm text-muted-foreground mb-2">Practice management</p>
                          <p className="text-sm text-muted-foreground">Go to Calendar → Click date/time → Select client → Choose service → Confirm booking</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-background">
                          <h4 className="font-medium mb-2">Is my data HIPAA compliant?</h4>
                          <p className="text-sm text-muted-foreground mb-2">Security & compliance</p>
                          <p className="text-sm text-muted-foreground">Yes, TheraMate is fully HIPAA compliant with encryption, access controls, and audit logs</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-background">
                          <h4 className="font-medium mb-2">How do I create SOAP notes?</h4>
                          <p className="text-sm text-muted-foreground mb-2">Clinical documentation</p>
                          <p className="text-sm text-muted-foreground">Go to Client → Select session → Create SOAP Note → Fill in Subjective, Objective, Assessment, Plan → Save</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-background">
                          <h4 className="font-medium mb-2">What payment methods do you accept?</h4>
                          <p className="text-sm text-muted-foreground mb-2">Payment & billing</p>
                          <p className="text-sm text-muted-foreground">We accept all major credit cards, bank transfers, and Stripe payments for secure transactions</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => setShowFAQs(!showFAQs)}
                  >
                    {showFAQs ? "Hide Detailed Answers" : "View Detailed Answers"}
                  </Button>
                </CardContent>
              </Card>

              {/* Troubleshooting Guide */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Troubleshooting Guide
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <h4 className="text-sm font-medium">Login Issues</h4>
                      <p className="text-xs text-muted-foreground">Common login problems</p>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <h4 className="text-sm font-medium">App Performance</h4>
                      <p className="text-xs text-muted-foreground">Slow loading & crashes</p>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <h4 className="text-sm font-medium">Data Sync Issues</h4>
                      <p className="text-xs text-muted-foreground">Sync problems</p>
                    </div>
                  </div>
                  
                  {/* Expanded Troubleshooting Content */}
                  {showTroubleshooting && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
                      <div className="space-y-4">
                        <div className="p-3 border rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Login Issues</h4>
                          <p className="text-xs text-muted-foreground mb-2">Common login problems</p>
                          <p className="text-xs text-muted-foreground">Clear browser cache, check internet connection, verify credentials, try password reset</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <h4 className="text-sm font-medium mb-2">App Performance</h4>
                          <p className="text-xs text-muted-foreground mb-2">Slow loading & crashes</p>
                          <p className="text-xs text-muted-foreground">Close other apps, restart device, check internet speed, clear app cache</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Data Sync Issues</h4>
                          <p className="text-xs text-muted-foreground mb-2">Sync problems</p>
                          <p className="text-xs text-muted-foreground">Check internet connection, force refresh, restart app, contact support if persistent</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Voice Recording Problems</h4>
                          <p className="text-xs text-muted-foreground mb-2">Audio issues</p>
                          <p className="text-xs text-muted-foreground">Check microphone permissions, test with other apps, restart device, update app</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Payment Processing Errors</h4>
                          <p className="text-xs text-muted-foreground mb-2">Billing issues</p>
                          <p className="text-xs text-muted-foreground">Verify card details, check bank account, try different payment method, contact billing support</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                  >
                    {showTroubleshooting ? "Hide Troubleshooting" : "View Troubleshooting"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      <FooterClean />
    </div>
    </>
  );
};

export default HelpCentre;