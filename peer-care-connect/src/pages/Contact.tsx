import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import StandardPage from "@/components/layouts/StandardPage";
import { MapPin, Clock, MessageSquare, HelpCircle, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const contactData = {
        first_name: formData.get('firstName'),
        last_name: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        subject: formData.get('subject'),
        user_type: formData.get('userType'),
        message: formData.get('message'),
        status: 'new',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('contact_messages')
        .insert([contactData]);

      if (error) {
        throw error;
      }

      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });

      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast({
        title: "Error sending message",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardPage title="Contact TheraMate" badgeText="Get in Touch" subtitle="Questions or support needs? We're here to help.">
      <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="mb-8">
              <BackButton />
            </div>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Get in Touch
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Contact
              <span className="block text-primary">TheraMate</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Have questions? Need support? Want to learn more about our platform? 
              We're here to help you connect with the right healthcare professionals.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-primary" />
                    Send us a Message
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Fill out the form below and we'll get back to you as soon as possible.
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          required
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          required
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="Enter your email address"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Select name="subject" required>
                        <SelectTrigger>
                          <SelectValue placeholder="What can we help you with?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="support">Technical Support</SelectItem>
                          <SelectItem value="billing">Billing Question</SelectItem>
                          <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                          <SelectItem value="feedback">Feedback & Suggestions</SelectItem>
                          <SelectItem value="media">Media & Press</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="userType">I am a *</Label>
                      <Select name="userType" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Client seeking healthcare</SelectItem>
                          <SelectItem value="practitioner">Healthcare Professional</SelectItem>
                          <SelectItem value="clinic">Clinic/Organization</SelectItem>
                          <SelectItem value="student">Student/Researcher</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        required
                        rows={5}
                        placeholder="Please describe your question or how we can help you..."
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending..." : "Send Message"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Contact Information & FAQ */}
              <div className="space-y-6">
                {/* Contact Info */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Address</p>
                        <p className="text-sm text-muted-foreground">London, United Kingdom</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Response Time</p>
                        <p className="text-sm text-muted-foreground">Within 24 hours</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Help */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-primary" />
                      Quick Help
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">For Clients</h4>
                      <p className="text-sm text-muted-foreground">
                        Need help finding a therapist? Questions about booking? 
                        We're here to help you connect with the right healthcare professional.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">For Practitioners</h4>
                      <p className="text-sm text-muted-foreground">
                        Technical support, billing questions, or want to learn about our features? 
                        Our team is ready to assist.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">For Organizations</h4>
                      <p className="text-sm text-muted-foreground">
                        Interested in enterprise solutions or partnerships? 
                        Let's discuss how TheraMate can support your organization.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate('/pricing?tab=enterprise')}
                        className="mt-2"
                      >
                        View Enterprise Pricing
                        <ArrowRight className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* FAQ Link */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">Frequently Asked Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Looking for quick answers? Check out our FAQ section for common questions about 
                      our platform, pricing, and services.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/help')}
                    >
                      View FAQ
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </StandardPage>
    );
};

export default Contact;