import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  acceptExchangeRequest,
  bookExchangeReciprocalSession,
  cancelExchangeRequestByRequester,
  declineExchangeRequest,
  fetchAcceptedExchangesNeedingReciprocal,
  fetchExchangeRequestByIdForParticipant,
  fetchPendingExchangeRequestsSentByRequester,
  fetchPendingExchangeRequestsWithDetails,
  formatExchangeConflictMessage,
  type ExchangeRequestDetail,
  type ExchangeRequestRow,
} from "@/lib/practitionerExchange";

type Tab = "incoming" | "outgoing" | "detail";

function fmtTime(t: string | null | undefined): string {
  if (!t) return "";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function statusLabel(status: string | null): string {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "accepted") return "Accepted";
  if (s === "declined") return "Different time requested";
  if (s === "cancelled") return "Cancelled";
  if (s === "expired") return "Expired";
  return status || "Unknown";
}

function statusBadge(status: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "accepted")
    return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
  if (s === "pending")
    return <Badge className="bg-amber-100 text-amber-900">Pending</Badge>;
  return <Badge variant="secondary">{statusLabel(status)}</Badge>;
}

/**
 * Treatment exchange inbox + detail — parity with app `exchange/*`.
 * Deep link: `/practice/exchange-requests?request=<uuid>`
 */
export default function ExchangeRequestsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("request") ?? searchParams.get("id");
  const [tab, setTab] = useState<Tab>(requestId ? "detail" : "incoming");
  const [incoming, setIncoming] = useState<ExchangeRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<ExchangeRequestRow[]>([]);
  const [detail, setDetail] = useState<ExchangeRequestDetail | null>(null);
  const [needsReciprocal, setNeedsReciprocal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [reciprocalDate, setReciprocalDate] = useState("");
  const [reciprocalTime, setReciprocalTime] = useState("10:00");

  const loadLists = useCallback(async () => {
    if (!user?.id) return;
    const [inc, out] = await Promise.all([
      fetchPendingExchangeRequestsWithDetails(user.id),
      fetchPendingExchangeRequestsSentByRequester(user.id),
    ]);
    if (inc.error) toast.error(inc.error.message);
    else setIncoming(inc.data);
    if (out.error) toast.error(out.error.message);
    else setOutgoing(out.data);
  }, [user?.id]);

  const loadDetail = useCallback(async () => {
    if (!user?.id || !requestId) {
      setDetail(null);
      setNeedsReciprocal(false);
      return;
    }
    const { data, error } = await fetchExchangeRequestByIdForParticipant({
      requestId,
      userId: user.id,
    });
    if (error) {
      toast.error(error.message);
      setDetail(null);
      return;
    }
    setDetail(data);
    if (data?.status === "accepted" && data.viewerRole === "recipient") {
      const { data: recip } = await fetchAcceptedExchangesNeedingReciprocal(
        user.id,
      );
      setNeedsReciprocal(
        !!recip?.some((r) => r.exchange_request_id === requestId),
      );
    } else {
      setNeedsReciprocal(false);
    }
  }, [user?.id, requestId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadLists();
      if (requestId) await loadDetail();
    } finally {
      setLoading(false);
    }
  }, [loadLists, loadDetail, requestId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setTab(requestId ? "detail" : "incoming");
  }, [requestId]);

  const openDetail = (id: string) => {
    setSearchParams({ request: id });
    setTab("detail");
  };

  const backToList = () => {
    setSearchParams({});
    setTab("incoming");
    setDetail(null);
  };

  const onAccept = async () => {
    if (!user?.id || !detail) return;
    if (
      !window.confirm(
        "Accept this treatment exchange? A session will be created for their visit.",
      )
    )
      return;
    setBusy(true);
    try {
      const res = await acceptExchangeRequest({
        requestId: detail.id,
        recipientId: user.id,
      });
      if (!res.ok) {
        toast.error(
          formatExchangeConflictMessage(res.error || "Accept failed"),
        );
        return;
      }
      toast.success(
        "Exchange accepted. Book your reciprocal session when ready.",
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onDecline = async () => {
    if (!user?.id || !detail) return;
    if (
      !window.confirm(
        "Request a different time? The requester will be notified.",
      )
    )
      return;
    setBusy(true);
    try {
      const res = await declineExchangeRequest({
        requestId: detail.id,
        recipientId: user.id,
        reason: declineReason.trim() || undefined,
      });
      if (!res.ok) {
        toast.error(
          formatExchangeConflictMessage(res.error || "Could not update"),
        );
        return;
      }
      toast.success("Different time requested.");
      backToList();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    if (!user?.id || !detail) return;
    if (!window.confirm("Cancel this exchange request?")) return;
    setBusy(true);
    try {
      const res = await cancelExchangeRequestByRequester({
        requestId: detail.id,
        requesterId: user.id,
      });
      if (!res.ok) {
        toast.error(res.error || "Cancel failed");
        return;
      }
      toast.success("Request cancelled.");
      backToList();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onBookReciprocal = async () => {
    if (!user?.id || !detail || !reciprocalDate) {
      toast.error("Choose a date for your reciprocal session.");
      return;
    }
    setBusy(true);
    try {
      const res = await bookExchangeReciprocalSession({
        requestId: detail.id,
        recipientId: user.id,
        sessionDate: reciprocalDate,
        startTime: reciprocalTime,
        durationMinutes: detail.duration_minutes ?? 60,
      });
      if (!res.ok) {
        toast.error(
          formatExchangeConflictMessage(res.error || "Booking failed"),
        );
        return;
      }
      toast.success("Reciprocal session booked.");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const renderList = (
    rows: ExchangeRequestRow[],
    mode: "incoming" | "outgoing",
  ) => (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No pending {mode} requests.
          </CardContent>
        </Card>
      ) : (
        rows.map((r) => (
          <Card
            key={r.id}
            className="cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => openDetail(r.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between gap-2">
                <CardTitle className="text-base">
                  {mode === "incoming"
                    ? (r.requester_name ?? "Practitioner")
                    : (r.recipient_name ?? "Practitioner")}
                </CardTitle>
                {statusBadge(r.status)}
              </div>
              <CardDescription>
                {r.session_type ?? "Treatment exchange"} ·{" "}
                {r.requested_session_date
                  ? format(new Date(r.requested_session_date), "EEE d MMM")
                  : "—"}{" "}
                {fmtTime(r.requested_start_time)}
              </CardDescription>
            </CardHeader>
          </Card>
        ))
      )}
    </div>
  );

  const renderDetail = () => {
    if (!requestId) return null;
    if (loading && !detail) {
      return <p className="text-center py-8 text-muted-foreground">Loading…</p>;
    }
    if (!detail) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Request not found.</p>
            <Button className="mt-4" variant="outline" onClick={backToList}>
              Back to list
            </Button>
          </CardContent>
        </Card>
      );
    }

    const counterparty =
      detail.viewerRole === "recipient"
        ? detail.requester_name
        : detail.recipient_name;

    return (
      <Card>
        <CardHeader>
          <Button
            variant="ghost"
            className="w-fit -ml-2 mb-2"
            onClick={backToList}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            All requests
          </Button>
          <CardTitle>Treatment exchange</CardTitle>
          <CardDescription>
            With {counterparty} · {statusLabel(detail.status)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">
                Their session
              </Label>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {detail.requested_session_date
                  ? format(new Date(detail.requested_session_date), "PPP")
                  : "—"}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Time</Label>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {fmtTime(detail.requested_start_time)}
                {detail.duration_minutes
                  ? ` · ${detail.duration_minutes} min`
                  : ""}
              </p>
            </div>
          </div>
          {detail.requester_notes ? (
            <p className="text-sm border-t pt-3">
              <span className="font-medium">Notes: </span>
              {detail.requester_notes}
            </p>
          ) : null}

          {detail.status === "pending" && detail.viewerRole === "recipient" ? (
            <div className="border-t pt-4 space-y-3">
              <div>
                <Label htmlFor="decline-reason">
                  Reason for different time (optional)
                </Label>
                <Input
                  id="decline-reason"
                  className="mt-1"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Suggest when you are available"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => void onAccept()}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void onDecline()}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Request different time
                </Button>
              </div>
            </div>
          ) : null}

          {detail.status === "pending" && detail.viewerRole === "requester" ? (
            <div className="border-t pt-4">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void onCancel()}
              >
                Cancel request
              </Button>
            </div>
          ) : null}

          {needsReciprocal ? (
            <div className="border-t pt-4 space-y-3 rounded-lg bg-muted/40 p-4">
              <p className="text-sm font-medium">
                Book your reciprocal session
              </p>
              <p className="text-xs text-muted-foreground">
                You accepted their visit — schedule when they treat you in
                return.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="recip-date">Date</Label>
                  <Input
                    id="recip-date"
                    type="date"
                    className="mt-1"
                    value={reciprocalDate}
                    onChange={(e) => setReciprocalDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="recip-time">Start time</Label>
                  <Input
                    id="recip-time"
                    type="time"
                    className="mt-1"
                    value={reciprocalTime}
                    onChange={(e) => setReciprocalTime(e.target.value)}
                  />
                </div>
              </div>
              <Button disabled={busy} onClick={() => void onBookReciprocal()}>
                Book reciprocal session
              </Button>
            </div>
          ) : null}

          {detail.reciprocal_booking_deadline ? (
            <p className="text-xs text-muted-foreground">
              Reciprocal booking deadline:{" "}
              {format(new Date(detail.reciprocal_booking_deadline), "PPp")}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title="Treatment exchange"
        description="Peer treatment swaps — accept incoming requests and book reciprocal sessions."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </PageHeader>

      {tab !== "detail" ? (
        <>
          <div className="flex gap-2 mb-6">
            <Button
              variant={tab === "incoming" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("incoming")}
            >
              Incoming ({incoming.length})
            </Button>
            <Button
              variant={tab === "outgoing" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("outgoing")}
            >
              Sent ({outgoing.length})
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/credits">Peer credits</Link>
            </Button>
          </div>
          {tab === "incoming"
            ? renderList(incoming, "incoming")
            : renderList(outgoing, "outgoing")}
        </>
      ) : (
        renderDetail()
      )}
    </div>
  );
}
