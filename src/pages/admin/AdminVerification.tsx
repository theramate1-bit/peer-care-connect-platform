import React, { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPendingPractitionerVerifications,
  setPractitionerVerified,
  type PendingPractitioner,
} from "@/lib/adminVerification";

function displayName(p: PendingPractitioner): string {
  const n = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return n || p.email || p.id.slice(0, 8);
}

/**
 * Admin queue — practitioners with `users.is_verified` false/null.
 */
const AdminVerification: React.FC = () => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.user_role === "admin";
  const [rows, setRows] = useState<PendingPractitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchPendingPractitionerVerifications();
      if (error) throw error;
      setRows(data);
    } catch (e) {
      console.error(e);
      toast.error("Could not load verification queue");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setVerified = async (id: string, verified: boolean) => {
    setBusyId(id);
    try {
      const { error } = await setPractitionerVerified(id, verified);
      if (error) throw error;
      toast.success(
        verified ? "Practitioner verified" : "Verification removed",
      );
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error
          ? e.message
          : "Update failed — check admin RLS policies",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <PageHeader title="Admin verification" />
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Admin access required.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageHeader
        title="Practitioner verification"
        description="Approve practitioners for marketplace “Verified” badges."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </PageHeader>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading queue…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No pending verifications.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base">{displayName(p)}</CardTitle>
                  <Badge variant="outline">{p.user_role ?? "—"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {p.email ? (
                  <p className="text-muted-foreground">{p.email}</p>
                ) : null}
                {p.location ? <p>{p.location}</p> : null}
                {p.bio ? (
                  <p className="text-muted-foreground line-clamp-2">{p.bio}</p>
                ) : null}
                {p.created_at ? (
                  <p className="text-xs text-muted-foreground">
                    Joined {format(new Date(p.created_at), "PP")}
                  </p>
                ) : null}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => void setVerified(p.id, true)}
                    disabled={busyId === p.id}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRows((prev) => prev.filter((r) => r.id !== p.id))
                    }
                    disabled={busyId === p.id}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Skip for now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVerification;
