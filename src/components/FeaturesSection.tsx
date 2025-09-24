import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Users, 
  Calendar, 
  Shield, 
  BookOpen,
  CreditCard,
  Star,
  MapPin,
  Award,
  Bell,
  FileText
} from "lucide-react";

export const FeaturesSection = () => {
  const features = [
    {
      icon: Heart,
      title: "Professional Network",
      description: "Connect with verified healthcare professionals. Book sessions and build professional relationships.",
      badge: "Core Feature",
      badgeColor: "bg-primary/10 text-primary",
      items: ["Professional profiles", "Location matching", "Specialty preferences", "Real-time booking"]
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Integrated calendar with booking and availability management. Advanced features coming soon.",
      badge: "Popular",
      badgeColor: "bg-accent/10 text-accent",
      items: ["Internal calendar", "Basic booking", "Availability management", "Coming Soon: Auto-reminders"]
    },
    {
      icon: BookOpen,
      title: "CPD Information",
      description: "Access to CPD requirements and external provider links. No tracking needed.",
      badge: "Professional",
      badgeColor: "bg-secondary/40 text-secondary-foreground",
      items: ["External provider links", "Simple requirements info", "No tracking needed"]
    },
    {
      icon: Shield,
      title: "Trust & Safety",
      description: "Professional verification, secure messaging, and rating system.",
      badge: "Secure",
      badgeColor: "bg-primary/10 text-primary",
      items: ["License verification", "Admin review", "Secure messaging", "Basic insurance tracking"]
    },
    {
      icon: Users,
      title: "Professional Community",
      description: "Connect with fellow therapists, share knowledge, and build lasting professional relationships.",
      badge: "Community",
      badgeColor: "bg-secondary/40 text-secondary-foreground",
      items: ["Discussion forums", "Basic networking", "Referral system", "Professional messaging"]
    }
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-6 leading-tight">
            Everything You Need for
            <span className="block text-primary">Wellness & Growth</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-2">
            A focused platform designed specifically for healthcare professionals to practice self-care 
            while building stronger, more successful practices through our credit-based exchange system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="shadow-wellness hover:shadow-wellness-medium transition-wellness group hover:scale-105 cursor-pointer"
            >
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="p-2.5 sm:p-3 wellness-gradient rounded-lg group-hover:glow-primary transition-wellness">
                    <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <Badge className={feature.badgeColor}>
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-lg sm:text-xl mb-1 sm:mb-2">{feature.title}</CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 sm:space-y-2">
                  {feature.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center gap-2 text-xs sm:text-sm">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full"></div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Features Grid */}
        <div className="mt-10 sm:mt-14 md:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="text-center p-4 sm:p-6 rounded-lg bg-muted/50 hover:bg-muted/70 transition-wellness">
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2 sm:mb-3" />
            <h4 className="font-semibold mb-1">Credit System</h4>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Fair exchange value</p>
          </div>
          
          <div className="text-center p-4 sm:p-6 rounded-lg bg-muted/50 hover:bg-muted/70 transition-wellness">
            <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-accent mx-auto mb-2 sm:mb-3" />
            <h4 className="font-semibold mb-1">Location Match</h4>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Find nearby therapists</p>
          </div>
          
          <div className="text-center p-4 sm:p-6 rounded-lg bg-muted/50 hover:bg-muted/70 transition-wellness">
            <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2 sm:mb-3" />
            <h4 className="font-semibold mb-1">Rating System</h4>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Build trust & quality</p>
          </div>
          
          <div className="text-center p-4 sm:p-6 rounded-lg bg-muted/50 hover:bg-muted/70 transition-wellness">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-accent mx-auto mb-2 sm:mb-3" />
            <h4 className="font-semibold mb-1">Session Notes</h4>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Track treatment progress</p>
          </div>
        </div>
      </div>
    </section>
  );
};