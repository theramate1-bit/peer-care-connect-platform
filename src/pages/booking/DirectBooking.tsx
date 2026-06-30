import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPublicTherapistBySlugOrId } from "@/lib/guestBooking";

/**
 * Web parity with `theramate-ios-client/app/book/[slug].tsx`.
 * Resolves `users.booking_slug` (or legacy UUID); guest vs signed-in choice.
 */
const DirectBooking: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string | null>(null);
  const [practitionerId, setPractitionerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!slug?.trim()) {
        setLoading(false);
        setError("Invalid booking link.");
        return;
      }
      const { data, error: e } = await fetchPublicTherapistBySlugOrId(slug);
      if (!mounted) return;
      if (e) {
        setError(e.message);
        setLoading(false);
        return;
      }
      if (data) {
        setName(
          `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
            "Practitioner",
        );
        setPractitionerId(data.id);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const bookingBase = practitionerId
    ? `/client/booking?therapistId=${encodeURIComponent(practitionerId)}`
    : null;

  const continueAsGuest = () => {
    if (!bookingBase) return;
    navigate(`${bookingBase}&guest=1`);
  };

  const continueSignedIn = () => {
    if (!bookingBase) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(bookingBase)}`);
      return;
    }
    navigate(bookingBase);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Direct booking</CardTitle>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading booking link…"
              : name
                ? `Book with ${name}.`
                : error ||
                  "We could not find this practitioner. Check the link or browse the marketplace."}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {practitionerId ? (
            <>
              <Button
                className="w-full"
                variant="default"
                onClick={continueAsGuest}
              >
                Book as guest
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={continueSignedIn}
              >
                {user ? "Book signed in" : "Sign in to book"}
              </Button>
            </>
          ) : null}

          <Button variant="outline" className="w-full" asChild>
            <Link to="/marketplace">Browse practitioners</Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/booking/find">Find an existing booking</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DirectBooking;
