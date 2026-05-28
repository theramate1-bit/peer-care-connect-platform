import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchSessionsClinicalNotesSummary,
  type SessionClinicalNotesSummary,
} from "@/lib/practitionerTreatmentNotes";

const PracticeClinicalFiles: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionClinicalNotesSummary[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await fetchSessionsClinicalNotesSummary({
        therapistId: user.id,
        limit: 120,
      });
      if (error) throw error;
      setSessions(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load clinical files");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (showAll) return sessions;
    return sessions.filter(
      (s) => s.has_notes || s.clinical_attachment_count > 0,
    );
  }, [sessions, showAll]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <PageHeader
        title="Clinical files"
        description="Session SOAP/DAP notes and attachments vault."
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

      <Card className="mb-4">
        <CardContent className="pt-6 flex gap-3 items-start">
          <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            Open a session to edit notes or upload files. Voice transcription
            and AI drafting are available in the mobile app; web supports manual
            notes and file upload.
          </p>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="mb-4"
        onClick={() => setShowAll((v) => !v)}
      >
        {showAll
          ? "Show only sessions with notes or files"
          : "Show all sessions"}
      </Button>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {showAll ? "No sessions found." : "No saved notes or files yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{s.client_name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground flex justify-between items-center gap-2">
                <span>
                  {s.session_date} · {s.start_time?.slice(0, 5)} ·{" "}
                  {s.has_notes ? "notes saved" : "no notes"}
                  {s.clinical_attachment_count > 0
                    ? ` · ${s.clinical_attachment_count} file(s)`
                    : ""}
                </span>
                <Button size="sm" asChild>
                  <Link to={`/practice/clinical-notes/${s.id}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PracticeClinicalFiles;
