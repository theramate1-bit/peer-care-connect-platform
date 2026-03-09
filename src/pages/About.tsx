import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateAvatarUrl } from "@/lib/avatar-generator";
import MetaTags from "@/components/SEO/MetaTags";
import { 
  Heart, 
  Shield, 
  Users, 
  Stethoscope, 
  Calendar, 
  FileText, 
  Award, 
  TrendingUp,
  MessageCircle,
  Clock,
  CheckCircle,
  Star,
  MapPin,
  GraduationCap,
  Building2,
  Target,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import StandardPage from "@/components/layouts/StandardPage";
import theramatemascot from "@/assets/theramatemascot.png";

const About = () => {

  return (
    <>
      <MetaTags
        title="About Us | TheraMate - Healthcare Platform Mission & Vision"
        description="Learn about TheraMate's mission to connect clients with qualified healthcare professionals. Founded by healthcare experts, we're building an inclusive community for therapy services."
        keywords="about theramate, healthcare platform mission, therapy platform founders, healthcare professionals, inclusive healthcare, therapy community, UK healthcare"
        canonicalUrl="https://theramate.co.uk/about"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "About TheraMate",
          "description": "Learn about TheraMate's mission to connect clients with qualified healthcare professionals",
          "url": "https://theramate.co.uk/about",
          "mainEntity": {
            "@type": "Organization",
            "name": "TheraMate",
            "description": "Healthcare platform connecting clients with qualified healthcare professionals including sports therapists, massage therapists, and osteopaths",
            "foundingDate": "2024",
            "areaServed": "United Kingdom",
            "mission": "To create an inclusive community that serves both clients seeking care and healthcare professionals who want to provide quality services",
            "founder": {
              "@type": "Person",
              "name": "TheraMate Founders",
              "description": "Healthcare professionals with backgrounds in therapy and healthcare technology"
            }
          }
        }}
      />
      <StandardPage title="About TheraMate" badgeText="About" subtitle="Connecting clients and qualified healthcare professionals across the UK.">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img src={theramatemascot} alt="TheraMate Mascot" className="w-20 h-20 object-contain" />
          </div>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            We're passionate about transforming healthcare access by creating a community where both clients and healthcare professionals can connect, learn, and grow together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button asChild size="lg"><Link to="/register">Get Started</Link></Button>
            <Button variant="outline" asChild size="lg"><Link to="/contact">Contact Us</Link></Button>
          </div>
        </div>

      {/* Our Story */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4">Our Story</Badge>
            <h2 className="text-3xl font-bold mb-8">Founded by Healthcare Professionals, For Healthcare Professionals</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <Card className="p-8">
                <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-4">Educational Background</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our collective knowledge spans Business and Sports Therapy & Rehabilitation, 
                  giving us unique insights into the challenges and opportunities within 
                  healthcare provision for both clients and professionals.
                </p>
              </Card>
              
              <Card className="p-8">
                <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-4">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Helping people is at the forefront of our business, mindset, and beliefs. 
                  We're committed to creating meaningful connections and improving access 
                  to quality healthcare services.
                </p>
              </Card>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-8">
              <h3 className="text-2xl font-semibold mb-4">Building Community</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We're creating a community that serves both clients seeking care and 
                healthcare professionals who want to provide quality services. Our platform 
                recognizes that great healthcare comes in many forms and from many qualified 
                professionals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Our Vision</Badge>
              <h2 className="text-3xl font-bold mb-6">Democratizing Healthcare Access</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                We believe everyone deserves access to quality healthcare services, and every qualified 
                professional deserves the opportunity to serve their community. TheraMate creates a 
                bridge between those seeking care and skilled practitioners, fostering a community 
                where both clients and professionals can thrive.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Qualified healthcare professionals</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Comprehensive practice management tools</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Community-driven learning and development</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Secure client management and documentation</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center p-6">
                <Heart className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Community First</h3>
                <p className="text-sm text-muted-foreground">Building connections between clients and professionals</p>
              </Card>
              <Card className="text-center p-6">
                <Shield className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Inclusive Platform</h3>
                <p className="text-sm text-muted-foreground">Welcoming all qualified healthcare professionals</p>
              </Card>
              <Card className="text-center p-6">
                <Building2 className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Practice Support</h3>
                <p className="text-sm text-muted-foreground">Tools for successful practice management</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* What We Built */}
      <section className="py-20 bg-secondary/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4">Platform Features</Badge>
            <h2 className="text-3xl font-bold mb-6">Comprehensive Healthcare Professional Platform</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              TheraMate isn't just a booking platform—it's a complete ecosystem designed specifically 
              for healthcare professionals and their clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Professional Exchange */}
            <Card className="transition-[border-color,background-color] duration-200 ease-out">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle>Professional Exchange</CardTitle>
                </div>
                <CardDescription>
                  Licensed healthcare professionals exchange services with verified peers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Verified practitioner profiles</li>
                  <li>• Service exchange marketplace</li>
                  <li>• Peer-to-peer booking system</li>
                  <li>• Professional networking</li>
                </ul>
              </CardContent>
            </Card>

            {/* Client Marketplace */}
            <Card className="transition-[border-color,background-color] duration-200 ease-out">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Stethoscope className="h-6 w-6 text-primary" />
                  <CardTitle>Client Marketplace</CardTitle>
                </div>
                <CardDescription>
                  Public marketplace for clients to discover and book healthcare services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Public practitioner profiles</li>
                  <li>• Advanced search & filtering</li>
                  <li>• Client booking interface</li>
                  <li>• Session management</li>
                </ul>
              </CardContent>
            </Card>

            {/* Practice Management */}
            <Card className="transition-[border-color,background-color] duration-200 ease-out">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-6 w-6 text-primary" />
                  <CardTitle>Practice Management</CardTitle>
                </div>
                <CardDescription>
                  Complete practice management suite for healthcare professionals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Client management system</li>
                  <li>• Appointment scheduling</li>
                  <li>• SOAP notes & documentation</li>
                  <li>• Business analytics</li>
                </ul>
              </CardContent>
            </Card>

            {/* Secure Communication */}
            <Card className="transition-[border-color,background-color] duration-200 ease-out">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <MessageCircle className="h-6 w-6 text-primary" />
                  <CardTitle>Secure Communication</CardTitle>
                </div>
                <CardDescription>
                  Secure messaging and document sharing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Encrypted messaging</li>
                  <li>• Document sharing</li>
                  <li>• Session notes</li>
                  <li>• Client communication</li>
                </ul>
              </CardContent>
            </Card>

            {/* Analytics & Insights */}
            <Card className="transition-[border-color,background-color] duration-200 ease-out">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <CardTitle>Analytics & Insights</CardTitle>
                </div>
                <CardDescription>
                  Data-driven insights for practice growth and optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Practice performance metrics</li>
                  <li>• Client demographics</li>
                  <li>• Revenue tracking</li>
                  <li>• Growth insights</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4">Our Story</Badge>
              <h2 className="text-3xl font-bold mb-6">Born from a Simple Observation</h2>
            </div>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                TheraMate was founded on a simple yet profound observation: healthcare professionals 
                spend their careers caring for others, but often struggle to find quality care for themselves. 
                Massage therapists, sports therapists, osteopaths, and other healthcare practitioners 
                face unique challenges in accessing the very services they provide to their clients.
              </p>
              
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                We recognized that these professionals needed more than just another booking platform—they 
                needed a comprehensive ecosystem that understands their unique needs, respects their expertise, 
                and provides tools specifically designed for healthcare practice management.
              </p>
              
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Today, TheraMate serves as the bridge between healthcare professionals and the care they 
                deserve, while also providing clients with access to verified, high-quality healthcare services 
                in a transparent, user-friendly marketplace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-secondary/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4">Our Team</Badge>
            <h2 className="text-3xl font-bold mb-6">Built by Healthcare Professionals, for Healthcare Professionals</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our team combines deep healthcare industry experience with cutting-edge technology expertise 
              to create solutions that truly serve the professional community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <Avatar className="h-20 w-20 mx-auto mb-4">
                  <AvatarImage src={generateAvatarUrl("healthcare")} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">HC</AvatarFallback>
                </Avatar>
                <CardTitle>Healthcare Expertise</CardTitle>
                <CardDescription>Industry professionals with decades of experience</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Our team includes licensed healthcare professionals who understand the unique 
                  challenges and opportunities in the industry.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <Avatar className="h-20 w-20 mx-auto mb-4">
                  <AvatarImage src={generateAvatarUrl("technology")} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">TC</AvatarFallback>
                </Avatar>
                <CardTitle>Technology Innovation</CardTitle>
                <CardDescription>Cutting-edge platform development</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We leverage modern technology to create intuitive, secure, and scalable solutions 
                  for healthcare practice management.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <Avatar className="h-20 w-20 mx-auto mb-4">
                  <AvatarImage src={generateAvatarUrl("community")} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">CM</AvatarFallback>
                </Avatar>
                <CardTitle>Community Focus</CardTitle>
                <CardDescription>Building meaningful professional relationships</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We're committed to fostering a supportive community where healthcare professionals 
                  can thrive and grow together.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      </StandardPage>
    </>
  );
};

export default About;