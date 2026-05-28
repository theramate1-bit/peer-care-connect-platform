import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchFavoriteTherapistIds, removeFavorite } from "@/lib/favorites";

type TherapistCard = {
  id: string;
  name: string;
  location: string | null;
  user_role: string | null;
};

const ClientFavorites: React.FC = () => {
  const { user } = useAuth();
  const [therapists, setTherapists] = useState<TherapistCard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: ids, error } = await fetchFavoriteTherapistIds(user.id);
      if (error) throw error;
      if (ids.length === 0) {
        setTherapists([]);
        return;
      }
      const { data: rows, error: uErr } = await supabase
        .from("users")
        .select("id, first_name, last_name, location, user_role")
        .in("id", ids);
      if (uErr) throw uErr;
      setTherapists(
        (rows || []).map((r) => {
          const row = r as {
            id: string;
            first_name: string | null;
            last_name: string | null;
            location: string | null;
            user_role: string | null;
          };
          return {
            id: row.id,
            name:
              `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
              "Practitioner",
            location: row.location,
            user_role: row.user_role,
          };
        }),
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to load favorites");
      setTherapists([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRemove = async (therapistId: string) => {
    if (!user?.id) return;
    const { error } = await removeFavorite(user.id, therapistId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTherapists((prev) => prev.filter((t) => t.id !== therapistId));
    toast.success("Removed from favorites");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title="Saved practitioners"
        description="Quick access to therapists you saved in Explore."
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
        <p className="text-center py-8 text-muted-foreground">Loading…</p>
      ) : therapists.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <Heart className="h-8 w-8 mx-auto opacity-40" />
            <p className="text-muted-foreground">No saved practitioners yet.</p>
            <Button asChild>
              <Link to="/marketplace">Explore marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {therapists.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove favorite"
                  onClick={() => void onRemove(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground flex justify-between items-center">
                <span>{t.location || t.user_role || "—"}</span>
                <Button variant="link" className="h-auto p-0" asChild>
                  <Link to={`/therapist/${t.id}/public`}>View profile</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientFavorites;
