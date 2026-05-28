import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Contact = () => (
  <MarketingLayout>
    <div className="max-w-3xl mx-auto px-6">
      <h1 className="text-3xl font-bold mb-4">Contact</h1>
      <p className="text-muted-foreground mb-8">
        Questions about booking, your account, or practitioner onboarding.
      </p>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <p className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <a
              href="mailto:support@theramate.co.uk"
              className="font-medium hover:underline"
            >
              support@theramate.co.uk
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            For urgent clinical matters, contact your practitioner or emergency
            services — Theramate cannot provide medical advice.
          </p>
          <Button variant="outline" asChild>
            <Link to="/help">Help centre</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  </MarketingLayout>
);

export default Contact;
