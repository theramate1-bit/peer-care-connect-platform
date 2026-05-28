import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMyCredits,
  fetchMyCreditTransactions,
  type CreditTransactionRow,
  type CreditsRow,
} from "@/lib/credits";

function balanceDisplay(row: CreditsRow | null): number {
  if (!row) return 0;
  return row.current_balance ?? row.balance ?? 0;
}

/**
 * Peer credits — parity with app `CreditsContent`.
 */
const CreditsPage: React.FC = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<CreditsRow | null>(null);
  const [tx, setTx] = useState<CreditTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        fetchMyCredits(user.id),
        fetchMyCreditTransactions({ userId: user.id, limit: 40 }),
      ]);
      if (cRes.error) throw cRes.error;
      if (tRes.error) throw tRes.error;
      setCredits(cRes.data);
      setTx(tRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load credits");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const bal = balanceDisplay(credits);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title="Peer credits"
        description="Balance and activity for treatment exchange and peer bookings."
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current balance</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <>
              <p className="text-4xl font-bold">{bal}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Earned: {credits?.total_earned ?? 0} · Spent:{" "}
                {credits?.total_spent ?? 0}
              </p>
              <Button className="mt-4" variant="outline" size="sm" asChild>
                <Link to="/practice/exchange-requests">Treatment exchange</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-3">Recent transactions</h2>
      {loading ? null : tx.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No credit transactions yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tx.map((t) => {
            const debit =
              t.amount < 0 ||
              ["session_payment", "spend", "deduction"].includes(
                t.transaction_type,
              );
            return (
              <Card key={t.id}>
                <CardContent className="py-4 flex justify-between gap-4">
                  <div>
                    <p className="font-medium capitalize">
                      {t.transaction_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t.description || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.created_at
                        ? format(new Date(t.created_at), "PPp")
                        : ""}
                    </p>
                  </div>
                  <p className="font-semibold shrink-0">
                    {debit ? `−${Math.abs(t.amount)}` : `+${t.amount}`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CreditsPage;
