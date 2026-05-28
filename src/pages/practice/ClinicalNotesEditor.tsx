import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteClinicalSessionAttachment,
  fetchClinicalSessionAttachments,
  getClinicalSessionAttachmentSignedUrl,
  uploadClinicalSessionFile,
  type ClinicalSessionAttachmentRow,
} from "@/lib/clinicalSessionAttachments";
import {
  fetchTreatmentNotesForSession,
  notesByType,
  saveAllSoapNotes,
  type TreatmentNoteType,
} from "@/lib/practitionerTreatmentNotes";
import { fetchPractitionerSessionById } from "@/lib/practitionerSessions";
import { generateSoapNotesFromTranscript } from "@/lib/soapNotes";

const SECTIONS: { key: TreatmentNoteType; label: string }[] = [
  { key: "subjective", label: "Subjective" },
  { key: "objective", label: "Objective" },
  { key: "data", label: "Data (DAP)" },
  { key: "assessment", label: "Assessment" },
  { key: "plan", label: "Plan" },
];

const ClinicalNotesEditor: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const [sessionName, setSessionName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<
    ClinicalSessionAttachmentRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiTranscript, setAiTranscript] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const merged = useMemo(() => {
    return { ...draft };
  }, [draft]);

  const load = useCallback(async () => {
    if (!user?.id || !sessionId) return;
    setLoading(true);
    try {
      const [sessRes, notesRes, attRes] = await Promise.all([
        fetchPractitionerSessionById({
          therapistId: user.id,
          sessionId,
        }),
        fetchTreatmentNotesForSession(sessionId),
        fetchClinicalSessionAttachments(sessionId),
      ]);
      if (sessRes.error) throw sessRes.error;
      if (notesRes.error) throw notesRes.error;
      if (attRes.error) throw attRes.error;
      const s = sessRes.data;
      if (s) {
        setSessionName(s.client_name);
        setClientId(s.client_id);
      }
      setDraft(notesByType(notesRes.data));
      setAttachments(attRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load session notes");
    } finally {
      setLoading(false);
    }
  }, [user?.id, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!user?.id || !sessionId) return;
    setSaving(true);
    try {
      const sections: Partial<Record<TreatmentNoteType, string>> = {};
      for (const sec of SECTIONS) {
        sections[sec.key] = merged[sec.key] ?? "";
      }
      const { ok, error } = await saveAllSoapNotes({
        sessionId,
        practitionerId: user.id,
        clientId,
        sections,
      });
      if (error) throw error;
      if (!ok) throw new Error("Save failed");
      toast.success("Notes saved");
      void load();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not save notes");
    } finally {
      setSaving(false);
    }
  };

  const runAi = async () => {
    if (!aiTranscript.trim() || !sessionId) return;
    setAiBusy(true);
    try {
      const { data, error, status } = await generateSoapNotesFromTranscript({
        transcript: aiTranscript.trim(),
        sessionId,
        save: false,
      });
      if (error) {
        if (status === 403) {
          toast.error("AI notes require Pro/Clinic subscription");
        } else {
          toast.error(error.message);
        }
        return;
      }
      if (!data) return;
      setDraft((d) => ({
        ...d,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
      }));
      toast.success("Draft applied — review and save");
    } finally {
      setAiBusy(false);
    }
  };

  const onUpload = async (file: File) => {
    if (!user?.id || !sessionId) return;
    setUploading(true);
    try {
      const res = await uploadClinicalSessionFile({
        sessionId,
        practitionerId: user.id,
        file,
      });
      if (!res.ok) throw res.error ?? new Error("Upload failed");
      toast.success("File uploaded");
      void load();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openAttachment = async (row: ClinicalSessionAttachmentRow) => {
    const { url, error } = await getClinicalSessionAttachmentSignedUrl(
      row.storage_path,
    );
    if (error || !url) {
      toast.error(error?.message ?? "Could not open file");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const removeAttachment = async (row: ClinicalSessionAttachmentRow) => {
    if (!user?.id) return;
    const { ok, error } = await deleteClinicalSessionAttachment({
      attachmentId: row.id,
      practitionerId: user.id,
    });
    if (!ok) {
      toast.error(error?.message ?? "Delete failed");
      return;
    }
    toast.success("File removed");
    void load();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-4" asChild>
        <Link to="/practice/clinical-files">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Clinical files
        </Link>
      </Button>

      <PageHeader
        title="Clinical notes"
        description={sessionName ? `Session with ${sessionName}` : undefined}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </PageHeader>

      {loading ? (
        <p className="text-muted-foreground py-8 text-center">Loading…</p>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI draft (Pro/Clinic)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Paste session transcript or summary…"
                value={aiTranscript}
                onChange={(e) => setAiTranscript(e.target.value)}
                rows={3}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runAi()}
                disabled={aiBusy}
              >
                {aiBusy ? "Generating…" : "Generate SOAP draft"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4 mb-6">
            {SECTIONS.map((sec) => (
              <div key={sec.key}>
                <Label>{sec.label}</Label>
                <Textarea
                  rows={4}
                  value={merged[sec.key] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [sec.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          <Button
            className="mb-8"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save all sections"}
          </Button>

          <h3 className="text-lg font-semibold mb-3">Attachments</h3>
          <input
            type="file"
            className="mb-4 text-sm"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
              e.target.value = "";
            }}
          />
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files attached.</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((a) => (
                <Card key={a.id}>
                  <CardContent className="py-3 flex justify-between items-center text-sm">
                    <span>{a.file_name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openAttachment(a)}
                      >
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void removeAttachment(a)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClinicalNotesEditor;
