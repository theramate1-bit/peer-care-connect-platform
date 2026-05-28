import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User as UserIcon, Eye, Stethoscope, Target, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface TreatmentNote {
  id: string;
  session_id?: string;
  note_type: string;
  content: string;
  created_at: string;
  updated_at: string;
  template_type?: string;
}

interface ClientSOAPNotesViewerProps {
  notes: TreatmentNote[];
  sessionId?: string;
  sessionDate?: string;
  practitionerName?: string;
}

export const ClientSOAPNotesViewer: React.FC<ClientSOAPNotesViewerProps> = ({
  notes,
  sessionId,
  sessionDate,
  practitionerName
}) => {
  // Filter notes for this session if sessionId is provided
  const sessionNotes = sessionId 
    ? notes.filter(note => note.session_id === sessionId)
    : notes;

  // Group notes by template type and note type
  const soapNotes = sessionNotes.filter(n => 
    n.template_type === 'SOAP' || 
    (['subjective', 'objective', 'assessment', 'plan'].includes(n.note_type) && !n.template_type)
  );
  
  const dapNotes = sessionNotes.filter(n => 
    n.template_type === 'DAP' || 
    (['data', 'assessment', 'plan'].includes(n.note_type) && n.template_type === 'DAP')
  );

  const generalNotes = sessionNotes.filter(n => 
    n.note_type === 'general' || 
    (n.template_type === 'FREE_TEXT' && n.note_type !== 'subjective' && n.note_type !== 'objective' && n.note_type !== 'assessment' && n.note_type !== 'plan' && n.note_type !== 'data')
  );

  // Build SOAP structure
  const soapStructure = {
    subjective: soapNotes.find(n => n.note_type === 'subjective')?.content || '',
    objective: soapNotes.find(n => n.note_type === 'objective')?.content || '',
    assessment: soapNotes.find(n => n.note_type === 'assessment' && soapNotes.some(s => s.template_type === 'SOAP' || !s.template_type))?.content || '',
    plan: soapNotes.find(n => n.note_type === 'plan' && soapNotes.some(s => s.template_type === 'SOAP' || !s.template_type))?.content || ''
  };

  // Build DAP structure
  const dapStructure = {
    data: dapNotes.find(n => n.note_type === 'data')?.content || '',
    assessment: dapNotes.find(n => n.note_type === 'assessment' && dapNotes.some(s => s.template_type === 'DAP'))?.content || '',
    plan: dapNotes.find(n => n.note_type === 'plan' && dapNotes.some(s => s.template_type === 'DAP'))?.content || ''
  };

  const hasSOAP = soapNotes.length > 0 && (soapStructure.subjective || soapStructure.objective || soapStructure.assessment || soapStructure.plan);
  const hasDAP = dapNotes.length > 0 && (dapStructure.data || dapStructure.assessment || dapStructure.plan);
  const hasGeneral = generalNotes.length > 0;

  if (!hasSOAP && !hasDAP && !hasGeneral) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No notes available for this session</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Info */}
      {sessionDate && (
        <div className="text-sm text-muted-foreground">
          <p>Session Date: {format(new Date(sessionDate), 'MMMM dd, yyyy')}</p>
          {practitionerName && <p>Practitioner: {practitionerName}</p>}
        </div>
      )}

      {/* SOAP Notes */}
      {hasSOAP && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              SOAP Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subjective */}
              {soapStructure.subjective && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-blue-600 flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    Subjective
                  </h4>
                  <div className="border rounded-lg p-4 bg-blue-50/50 min-h-32">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {soapStructure.subjective}
                    </p>
                  </div>
                </div>
              )}

              {/* Objective */}
              {soapStructure.objective && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-green-600 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Objective
                  </h4>
                  <div className="border rounded-lg p-4 bg-green-50/50 min-h-32">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {soapStructure.objective}
                    </p>
                  </div>
                </div>
              )}

              {/* Assessment */}
              {soapStructure.assessment && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-amber-600 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    Assessment
                  </h4>
                  <div className="border rounded-lg p-4 bg-amber-50/50 min-h-32">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {soapStructure.assessment}
                    </p>
                  </div>
                </div>
              )}

              {/* Plan */}
              {soapStructure.plan && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-purple-600 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Plan
                  </h4>
                  <div className="border rounded-lg p-4 bg-purple-50/50 min-h-32">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {soapStructure.plan}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DAP Notes */}
      {hasDAP && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              DAP Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data */}
              {dapStructure.data && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-blue-600 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Data
                  </h4>
                  <div className="border rounded-lg p-4 bg-blue-50/50 min-h-32">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {dapStructure.data}
                    </p>
                  </div>
                </div>
              )}

              {/* Assessment */}
              {dapStructure.assessment && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-amber-600 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    Assessment
                  </h4>
                  <div className="border rounded-lg p-4 bg-amber-50/50 min-h-32">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {dapStructure.assessment}
                    </p>
                  </div>
                </div>
              )}

              {/* Plan */}
              {dapStructure.plan && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-purple-600 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Plan
                  </h4>
                  <div className="border rounded-lg p-4 bg-purple-50/50 min-h-32">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {dapStructure.plan}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Notes */}
      {hasGeneral && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              General Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generalNotes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(note.created_at), 'MMM dd, yyyy')}
                  </Badge>
                  {note.updated_at !== note.created_at && (
                    <span className="text-xs text-muted-foreground">
                      Updated {format(new Date(note.updated_at), 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

