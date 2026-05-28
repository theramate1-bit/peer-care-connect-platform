import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchGuestSessionByToken,
  type GuestSessionView,
} from "@/lib/guestBooking";

const GuestBookingView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<GuestSessionView | null>(null);

  const load = useCallback(async () => {
    if (!sessionId || !token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await fetchGuestSessionByToken({
        sessionId,
        token: token.trim(),
      });
      if (e || !data) {
        setError(e?.message || "Could not validate this booking link.");
        setSession(null);
        return;
      }
      setSession(data);
    } finally {
      setLoading(false);
    }
  }, [sessionId, token]);

  useEffect(() => {
    if (token.trim()) void load();
  }, [load, token]);

  const location =
    session?.visit_address?.trim() || session?.clinic_address?.trim() || null;

  const directionsUrl = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Button variant="ghost" className="mb-4" asChild>
        <Link to="/booking/find">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Find my booking
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Booking details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use the secure token from your confirmation email, or open the link
            from that email directly.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!searchParams.get("token") ? (
            <div className="space-y-2">
              <Label htmlFor="token">Booking token</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from email"
                autoComplete="off"
              />
              <Button
                className="w-full"
                disabled={!token.trim() || loading}
                onClick={() => void load()}
              >
                {loading ? "Loading…" : "View booking"}
              </Button>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {session ? (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <p className="font-medium">
                {session.session_date
                  ? format(parseISO(session.session_date), "EEEE d MMMM yyyy")
                  : "Date TBC"}
                {session.start_time
                  ? ` at ${session.start_time.slice(0, 5)}`
                  : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {session.session_type || "Session"} ·{" "}
                {session.duration_minutes ?? 0} minutes
              </p>
              <p className="text-sm capitalize">
                Status: {session.status || "unknown"} · Payment:{" "}
                {session.payment_status || "unknown"}
              </p>
              {session.price != null ? (
                <p className="font-medium">
                  £{(Number(session.price) / 100).toFixed(2)}
                </p>
              ) : null}
              {location ? (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{location}</span>
                </div>
              ) : null}
              {session.appointment_type ? (
                <p className="text-sm text-muted-foreground capitalize">
                  {session.appointment_type} session
                </p>
              ) : null}
              {directionsUrl ? (
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get directions
                  </a>
                </Button>
              ) : null}
              <p className="text-xs text-muted-foreground">
                To change or cancel, contact your practitioner or use the link
                in your latest email.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default GuestBookingView;
