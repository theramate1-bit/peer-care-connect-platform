import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  findBookingsByEmail,
  type GuestBookingLookupRow,
} from "@/lib/guestBooking";

const FindBooking: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GuestBookingLookupRow[]>([]);

  const search = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: e } = await findBookingsByEmail(email);
      if (e) {
        setError(e.message);
        setResults([]);
        return;
      }
      setResults(data);
      if (data.length === 0) {
        toast.message("No bookings found for this email.");
      }
    } finally {
      setLoading(false);
    }
  };

  const openSession = (row: GuestBookingLookupRow) => {
    const token = row.guest_view_token?.trim();
    if (!token) {
      toast.error(
        "Open the secure link from your confirmation email, or contact support.",
      );
      return;
    }
    navigate(
      `/booking/view/${row.session_id}?token=${encodeURIComponent(token)}`,
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Button variant="ghost" className="mb-4" asChild>
        <Link to="/marketplace">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Find my booking</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the email you used at checkout to see recent bookings.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            className="w-full"
            disabled={!email.trim() || loading}
            onClick={() => void search()}
          >
            {loading ? (
              "Searching…"
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search bookings
              </>
            )}
          </Button>

          {results.length > 0 ? (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium">Results</p>
              {results.map((row) => (
                <button
                  key={row.session_id}
                  type="button"
                  onClick={() => openSession(row)}
                  className="w-full text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <p className="font-medium">
                    {row.session_date
                      ? format(parseISO(row.session_date), "EEE d MMM yyyy")
                      : "Date TBC"}{" "}
                    {row.start_time ? `at ${row.start_time.slice(0, 5)}` : ""}
                  </p>
                  {row.practitioner_name ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      {row.practitioner_name}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground mt-1 capitalize">
                    {row.status || "unknown"}
                    {row.session_type ? ` · ${row.session_type}` : ""}
                  </p>
                </button>
              ))}
            </div>
          ) : null}

          <Button variant="outline" className="w-full" asChild>
            <Link to="/guest/mobile-requests">Guest mobile requests</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FindBooking;
