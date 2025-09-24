import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ExternalLink, Calendar, Award, Info } from "lucide-react";
import StandardPage from "@/components/layouts/StandardPage";

const CPDInfo = () => {
  const cpdRequirements = [
    {
      profession: "Sports Therapists",
      hours: "1-2 sessions per year",
      description: "Minimal CPD requirements - no formal tracking needed",
      color: "bg-blue-100 text-blue-800"
    },
    {
      profession: "Massage Therapists", 
      hours: "1-2 sessions per year",
      description: "Minimal CPD requirements - no formal tracking needed",
      color: "bg-green-100 text-green-800"
    },
    {
      profession: "Osteopaths",
      hours: "1-2 sessions per year", 
      description: "Minimal CPD requirements - no formal tracking needed",
      color: "bg-purple-100 text-purple-800"
    }
  ];

  const externalProviders = [
    {
      name: "Sports Therapy Association",
      description: "Professional development courses and workshops",
      url: "https://www.sportstherapyassociation.com/cpd",
      category: "Sports Therapy"
    },
    {
      name: "Massage Therapy Association",
      description: "Continuing education and certification programs",
      url: "https://www.massagetherapyassociation.com/cpd",
      category: "Massage Therapy"
    },
    {
      name: "Osteopathic Association",
      description: "Professional development and training courses",
      url: "https://www.osteopathicassociation.com/cpd",
      category: "Osteopathy"
    },
    {
      name: "General Healthcare CPD",
      description: "Multi-disciplinary continuing education",
      url: "https://www.healthcarecpd.com",
      category: "General"
    }
  ];

  return (
    <StandardPage title="Continuing Professional Development" badgeText="CPD" subtitle="Simple CPD information and external provider links - no tracking required">
      <div className="container mx-auto px-4 py-4 space-y-8">
        {/* CPD Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              CPD Requirements by Profession
            </CardTitle>
            <CardDescription>
              Minimal requirements - no formal tracking needed for your practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cpdRequirements.map((req, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{req.profession}</h3>
                    <Badge className={req.color}>
                      {req.hours}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {req.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* External Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              External CPD Providers
            </CardTitle>
            <CardDescription>
              Links to external providers for your 1-2 annual CPD sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {externalProviders.map((provider, index) => (
                <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{provider.name}</h3>
                    <Badge variant="outline">{provider.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {provider.description}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(provider.url, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Provider
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Simple Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              CPD Information
            </CardTitle>
            <CardDescription>
              No complex tracking needed for your practice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Why No Tracking?</h4>
              <p className="text-sm text-muted-foreground">
                With only 1-2 CPD sessions required per year, complex tracking systems are unnecessary. 
                Simply maintain your own records and certificates as needed for your professional body.
              </p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">What You Need to Do</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Complete 1-2 CPD sessions per year</li>
                <li>• Keep certificates for your records</li>
                <li>• Submit to your professional body as required</li>
                <li>• No platform tracking needed</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardPage>
  );
};

export default CPDInfo;
