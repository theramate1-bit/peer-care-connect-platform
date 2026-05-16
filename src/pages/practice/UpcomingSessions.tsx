import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, User, Banknote, Plus } from "lucide-react";
import MarkPaidButton from "@/components/booking/MarkPaidButton";
import CancelSessionButton from "@/components/booking/CancelSessionButton";
import RescheduleSessionButton from "@/components/booking/RescheduleSessionButton";
import { Button } from "@/components/ui/button";

interface Session {
  id: string;
  client_name: string;
  client_email: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  price: number;
  status: string;
  payment_status: string;
  payment_collection: string;
  payment_method: string | null;
  appointment_type: string;
  is_guest_booking: boolean;
}

const UpcomingSessions: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("client_sessions")
        .select(
          "id, client_name, client_email, session_date, start_time, duration_minutes, session_type, price, status, payment_status, payment_collection, payment_method, appointment_type, is_guest_booking",
        )
        .eq("therapist_id", user.id)
        .gte("session_date", today)
        .in("status", [
          "scheduled",
          "confirmed",
          "in_progress",
          "pending_payment",
        ])
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error("Error loading sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatTime = (time: string) => time.slice(0, 5);

  const getPaymentBadge = (s: Session) => {
    if (s.payment_collection === "in_person") {
      if (s.payment_status === "completed")
        return (
          <Badge className="bg-green-100 text-green-800">Paid in person</Badge>
        );
      return (
        <Badge className="bg-amber-100 text-amber-800">
          Awaiting payment at clinic
        </Badge>
      );
    }
    if (s.payment_status === "completed")
      return <Badge className="bg-green-100 text-green-800">Paid online</Badge>;
    if (s.payment_status === "pending")
      return (
        <Badge className="bg-yellow-100 text-yellow-800">Payment pending</Badge>
      );
    return <Badge variant="secondary">{s.payment_status}</Badge>;
  };

  const getPaymentSummary = (s: Session) => {
    if (s.payment_collection === "in_person") {
      if (s.payment_status === "completed")
        return "Payment method recorded at clinic.";
      return "Client will pay at appointment. Mark as paid after collection.";
    }
    if (s.payment_status === "completed") return "Online payment completed.";
    if (s.payment_status === "pending")
      return "Awaiting online checkout/payment.";
    return `Payment status: ${s.payment_status}`;
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Please log in to view your sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <PageHeader
        title="Upcoming Sessions"
        description="View and manage your upcoming client sessions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Sessions" },
        ]}
        backTo="/dashboard"
      />

      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-end">
          <a href="/practice/manual-booking">
            <Button className="gap-1">
              <Plus className="h-4 w-4" /> New manual booking
            </Button>
          </a>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No upcoming sessions</p>
              <p className="text-sm">New bookings will appear here.</p>
              <a href="/practice/manual-booking" className="inline-block mt-4">
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Create a manual booking
                </Button>
              </a>
            </CardContent>
          </Card>
        ) : (
          sessions.map((s) => (
            <Card key={s.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {s.client_name}
                      {s.is_guest_booking && (
                        <Badge variant="outline" className="text-xs">
                          Guest
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {s.client_email}
                    </CardDescription>
                  </div>
                  {getPaymentBadge(s)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(s.session_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {formatTime(s.start_time)} ({s.duration_minutes} min)
                  </span>
                  <span className="flex items-center gap-1">
                    <Banknote className="h-4 w-4 text-muted-foreground" />£
                    {Number(s.price).toFixed(2)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {s.session_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {s.payment_collection === "in_person"
                      ? "Pay at clinic"
                      : "Pay online"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {getPaymentSummary(s)}
                </p>

                <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-2">
                  {s.payment_collection === "in_person" &&
                    s.payment_status !== "completed" && (
                      <MarkPaidButton
                        sessionId={s.id}
                        paymentCollection={s.payment_collection}
                        paymentStatus={s.payment_status}
                        onMarkedPaid={loadSessions}
                      />
                    )}
                  <RescheduleSessionButton
                    sessionId={s.id}
                    sessionDate={s.session_date}
                    startTime={s.start_time}
                    paymentCollection={s.payment_collection}
                    sessionStatus={s.status}
                    onRescheduled={loadSessions}
                  />
                  <CancelSessionButton
                    sessionId={s.id}
                    paymentCollection={s.payment_collection}
                    paymentStatus={s.payment_status}
                    sessionStatus={s.status}
                    onCancelled={loadSessions}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default UpcomingSessions;
