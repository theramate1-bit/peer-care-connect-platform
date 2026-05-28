import React, { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Bell, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchUserNotifications,
  type AppNotification,
} from "@/lib/notifications";

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await fetchUserNotifications(user.id);
      if (error) throw error;
      setItems(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load notifications");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = items.filter((n) => n.is_read !== true).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : "You're all caught up."}
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
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Bell className="h-8 w-8 opacity-40" />
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n.id}
              className={
                n.is_read !== true
                  ? "border-primary/30 bg-primary/5"
                  : undefined
              }
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between gap-2">
                  <CardTitle className="text-base">
                    {n.title || n.type}
                  </CardTitle>
                  {n.is_read !== true ? <Badge>New</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {n.message ? <p>{n.message}</p> : null}
                <p className="text-xs mt-2">
                  {n.created_at ? format(new Date(n.created_at), "PPp") : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center mt-8">
        Tap actions in the mobile app for deep links to sessions and requests.
      </p>
    </div>
  );
};

export default NotificationsPage;
