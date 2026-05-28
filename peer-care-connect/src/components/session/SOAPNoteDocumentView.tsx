import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export interface Addendum {
  id: string;
  content: string;
  created_at: string;
}

interface SOAPNoteDocumentViewProps {
  session: any;
  onBack: () => void;
  addenda?: Addendum[];
  onAddCorrection?: () => void;
}

export const SOAPNoteDocumentView: React.FC<SOAPNoteDocumentViewProps> = ({
  session,
  onBack,
  addenda = [],
  onAddCorrection
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not specified';
    
    // Handle time string formats (HH:MM or HH:MM:SS)
    const timeWithoutSeconds = timeString.includes(':') && timeString.split(':').length === 3
      ? timeString.substring(0, 5)
      : timeString;
    
    try {
      return new Date(`2000-01-01T${timeWithoutSeconds}`).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeString;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Document View */}
      <Card className="shadow-lg print:shadow-none print:border-none">
        <CardContent className="p-12 space-y-8 min-h-[800px] bg-white text-slate-900">
          {/* Document Header */}
          <div className="flex justify-between items-start border-b pb-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clinical SOAP Note</h1>
            </div>
            <div className="text-right space-y-1 text-sm text-slate-600">
              <p className="font-medium text-slate-900">{session.client_name}</p>
              <p>{formatDate(session.session_date)}</p>
              <p>{formatTime(session.start_time)}</p>
              <p className="font-medium text-primary mt-2">{session.therapy_type}</p>
            </div>
          </div>

          {/* Chief Complaint */}
          {session.chief_complaint && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Chief Complaint</h3>
              <p className="text-lg leading-relaxed font-medium text-slate-800">
                {session.chief_complaint}
              </p>
            </div>
          )}

          {/* Main SOAP Sections */}
          <div className="grid gap-8">
            {/* Subjective */}
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">S</div>
                <h3 className="text-lg font-semibold text-slate-900">Subjective</h3>
              </div>
              <div className="pl-11">
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                  {session.soap_subjective || <span className="text-slate-400 italic">No subjective data recorded.</span>}
                </p>
              </div>
            </section>

            <Separator />

            {/* Objective */}
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">O</div>
                <h3 className="text-lg font-semibold text-slate-900">Objective</h3>
              </div>
              <div className="pl-11">
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                  {session.soap_objective || <span className="text-slate-400 italic">No objective data recorded.</span>}
                </p>
              </div>
            </section>

            <Separator />

            {/* Assessment */}
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">A</div>
                <h3 className="text-lg font-semibold text-slate-900">Assessment</h3>
              </div>
              <div className="pl-11">
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                  {session.soap_assessment || <span className="text-slate-400 italic">No assessment recorded.</span>}
                </p>
              </div>
            </section>

            <Separator />

            {/* Plan */}
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">P</div>
                <h3 className="text-lg font-semibold text-slate-900">Plan</h3>
              </div>
              <div className="pl-11">
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                  {session.soap_plan || <span className="text-slate-400 italic">No plan recorded.</span>}
                </p>
              </div>
            </section>
          </div>

          {/* Session Notes */}
          {session.session_notes && (
            <>
              <Separator className="my-8" />
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Additional Notes</h3>
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-lg border">
                  {session.session_notes}
                </p>
              </div>
            </>
          )}

          {/* Corrections & addenda (workaround for completed notes – RLS blocks direct edit) */}
          {(addenda.length > 0 || onAddCorrection) && (
            <>
              <Separator className="my-8" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Corrections & addenda</h3>
                  {onAddCorrection && (
                    <button
                      type="button"
                      onClick={onAddCorrection}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      + Add correction
                    </button>
                  )}
                </div>
                {addenda.length === 0 && onAddCorrection && (
                  <p className="text-sm text-slate-500 italic">No corrections yet. Add one if you need to amend the note.</p>
                )}
                {addenda.map((a) => (
                  <div key={a.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-slate-700">
                    <p className="text-xs text-slate-500 mb-1">
                      {new Date(a.created_at).toLocaleString('en-GB')}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">{a.content}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

