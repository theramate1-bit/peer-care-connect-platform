import { Link } from "react-router-dom";
import { Mail, Search } from "lucide-react";

import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const HelpCentre = () => (
  <MarketingLayout>
    <div className="max-w-3xl mx-auto px-6">
      <h1 className="text-3xl font-bold mb-4">Help centre</h1>
      <p className="text-muted-foreground mb-8">
        Quick answers and links for clients and practitioners.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Common tasks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button variant="outline" asChild>
            <Link to="/marketplace">
              <Search className="h-4 w-4 mr-2" />
              Book a therapist
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/booking/find">Find my booking (guest email)</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/guest/mobile-requests">Track a mobile request</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/settings/subscription">Subscription & billing</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4 text-sm">
        <h2 className="font-semibold text-base">FAQ</h2>
        <div>
          <p className="font-medium">How do I pay?</p>
          <p className="text-muted-foreground mt-1">
            Online card bookings use secure Stripe Checkout. Some practitioners
            offer pay-at-clinic — no platform fee on those bookings when
            enabled.
          </p>
        </div>
        <div>
          <p className="font-medium">
            I booked as a guest — where is my session?
          </p>
          <p className="text-muted-foreground mt-1">
            Use{" "}
            <Link to="/booking/find" className="underline">
              Find my booking
            </Link>{" "}
            with the email you used at checkout.
          </p>
        </div>
        <div>
          <p className="font-medium">Practitioner support</p>
          <p className="text-muted-foreground mt-1">
            Sign in and open your practice dashboard for mobile requests,
            exchange, and clinical notes. See{" "}
            <Link to="/how-it-works" className="underline">
              How it works
            </Link>
            .
          </p>
        </div>
      </div>

      <Button className="mt-8" asChild>
        <a href="mailto:support@theramate.co.uk">
          <Mail className="h-4 w-4 mr-2" />
          Email support
        </a>
      </Button>
    </div>
  </MarketingLayout>
);

export default HelpCentre;
