import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Activity, 
  HandHeart, 
  Stethoscope, 
  Search, 
  CalendarDays, 
  CreditCard, 
  Users, 
  Star,
  Clock
} from "lucide-react";

export const UserTypesSection = () => {
  const userTypes = [
    {
      type: "Sports Therapist",
      icon: Activity,
      description: "Specialized in sports injury treatment\nand performance enhancement",
      features: [
        "Sports injury rehabilitation",
        "Performance optimization", 
        "Movement analysis",
        "Injury prevention programs"
      ],
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      type: "Massage Therapist",
      icon: HandHeart,
      description: "Licensed massage therapy professionals\noffering various techniques",
      features: [
        "Deep tissue massage",
        "Swedish massage",
        "Sports massage",
        "Therapeutic techniques"
      ],
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      type: "Osteopath",
      icon: Stethoscope,
      description: "Registered osteopathic practitioners\nfocusing on holistic treatment",
      features: [
        "Structural osteopathy",
        "Cranial techniques",
        "Visceral manipulation",
        "Pediatric care"
      ],
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      type: "Client",
      icon: Search,
      description: "Individuals seeking professional\ntherapeutic services",
      features: [
        "Find qualified therapists",
        "Book appointments online",
        "Read reviews & ratings",
        "Secure messaging"
      ],
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    }
  ];

  return (
    <section className="py-10 sm:py-16 md:py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 md:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <Badge className="mb-4 sm:mb-6 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2">
            <Users className="w-4 h-4 mr-2" />
            For Every Healthcare Professional
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            Built for <span className="text-primary">Your Role</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4 sm:px-6">
            TheraMate offers specialized features and tools tailored to your specific profession and needs
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {userTypes.map((userType) => {
            const IconComponent = userType.icon;
            return (
              <Card key={userType.type} className={`relative overflow-hidden border-2 ${userType.borderColor} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 h-full flex flex-col`}>
                <CardHeader className={`${userType.bgColor} pb-6 p-6 flex-shrink-0`}>
                  <div className="flex items-center justify-between mb-4">
                    <IconComponent className={`w-10 h-10 ${userType.color}`} />
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      Professional
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-bold mb-3">{userType.type}</CardTitle>
                  <CardDescription className="text-base leading-relaxed whitespace-pre-line">
                    {userType.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-8 p-6 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-4 text-muted-foreground">SPECIALIZATIONS</h4>
                    <ul className="space-y-3">
                      {userType.features.map((feature, index) => (
                        <li key={index} className="text-base flex items-center">
                          <Star className="w-4 h-4 mr-3 text-primary flex-shrink-0" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12 sm:mt-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 md:gap-10 max-w-5xl mx-auto mb-6 sm:mb-12">
            <div className="flex items-center justify-center gap-4">
              <CalendarDays className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm sm:text-lg">Easy Booking</div>
                <div className="text-xs sm:text-base text-muted-foreground">Schedule in seconds</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <CreditCard className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm sm:text-lg">Secure Payments</div>
                <div className="text-xs sm:text-base text-muted-foreground">Protected transactions</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Clock className="w-5 h-5 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold text-sm sm:text-lg">24/7 Support</div>
                <div className="text-xs sm:text-base text-muted-foreground">Always here to help</div>
              </div>
            </div>
          </div>
          
          <h3 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-6">Ready to get started?</h3>
          <p className="text-sm sm:text-lg text-muted-foreground mb-5 sm:mb-8 px-4 sm:px-6">Join thousands of healthcare professionals and clients already using TheraMate</p>
          <Link to="/register">
            <Button size="default" className="px-6 sm:px-10 text-base sm:text-lg">
              Create Your Account
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};