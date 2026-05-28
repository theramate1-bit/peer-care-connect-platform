import { Link } from "react-router-dom";
import { Calendar, MessageCircle, Search } from "lucide-react";

import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";

const HowItWorks = () => (
  <MarketingLayout>
    <div className="max-w-3xl mx-auto px-6">
      <h1 className="text-3xl font-bold mb-4">How it works</h1>
      <p className="text-muted-foreground mb-8">
        Book qualified therapists across the UK — clinic or mobile visits — with
        the same flows on web and mobile.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Explore & book</h2>
          <p className="text-muted-foreground">
            Search the marketplace, open a public profile, and book a clinic
            slot or request a mobile visit. Guests can book with an email;
            signed-in clients see sessions and messages in one place.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">2. Sessions & reviews</h2>
          <p className="text-muted-foreground">
            Track upcoming and past appointments. Find a booking by email if you
            checked out as a guest. Leave reviews after eligible visits.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">3. For practitioners</h2>
          <p className="text-muted-foreground">
            Manage diary, mobile requests, care plans, clinical notes, treatment
            exchange, and payouts from your practice dashboard on web or app.
          </p>
        </section>
      </div>

      <div className="flex flex-wrap gap-3 mt-10">
        <Button asChild>
          <Link to="/marketplace">
            <Search className="h-4 w-4 mr-2" />
            Find therapists
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/client/booking">
            <Calendar className="h-4 w-4 mr-2" />
            Book a session
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/pricing">Practitioner plans</Link>
        </Button>
      </div>
    </div>
  </MarketingLayout>
);

export default HowItWorks;
