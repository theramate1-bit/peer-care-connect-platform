import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, Clipboard, PenTool } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface TreatmentNotesPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  clientName: string;
}

const templates = [
  {
    type: 'SOAP',
    title: 'SOAP Notes',
    description: 'Structured format: Subjective, Objective, Assessment, Plan',
    icon: Clipboard,
    fields: ['subjective', 'objective', 'assessment', 'plan']
  },
  {
    type: 'DAP',
    title: 'DAP Notes',
    description: 'Data, Assessment, Plan format for focused documentation',
    icon: FileText,
    fields: ['data', 'assessment', 'plan']
  },
  {
    type: 'FREE_TEXT',
    title: 'Free Text',
    description: 'Flexible narrative documentation',
    icon: PenTool,
    fields: ['notes']
  }
];

export const TreatmentNotesPrompt: React.FC<TreatmentNotesPromptProps> = ({
  open,
  onOpenChange,
  sessionId,
  clientName
}) => {
  const navigate = useNavigate();
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);

  const handleSelectTemplate = (templateType: string) => {
    onOpenChange(false);
    // Navigate to client management instead of separate treatment notes page
    navigate(`/practice/clients?session=${sessionId}&template=${templateType}`);
  };

  const handleAddNotes = () => {
    setShowTemplateSelection(true);
  };

  const handleRemindLater = () => {
    onOpenChange(false);
    // Store reminder in localStorage
    const reminders = JSON.parse(localStorage.getItem('treatmentNoteReminders') || '[]');
    reminders.push({
      sessionId,
      clientName,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('treatmentNoteReminders', JSON.stringify(reminders));
  };

  if (showTemplateSelection) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Choose Note Template</DialogTitle>
            <DialogDescription>Select your preferred documentation format for this session</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {templates.map(template => {
              const IconComponent = template.icon;
              return (
                <Card 
                  key={template.type}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectTemplate(template.type)}
                >
                  <CardContent className="pt-6 text-center">
                    <IconComponent className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium">{template.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTemplateSelection(false)}
              className="w-full"
            >
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Add Treatment Notes
          </DialogTitle>
          <DialogDescription>
            Session with {clientName} is now complete. Would you like to add treatment notes now?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Why add notes immediately?</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Record observations while fresh in your mind</li>
              <li>Document treatment progress accurately</li>
              <li>Ensure continuity of care for next session</li>
            </ul>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRemindLater}
            className="w-full sm:w-auto"
          >
            <Clock className="h-4 w-4 mr-2" />
            Remind Me Later
          </Button>
          <Button
            onClick={handleAddNotes}
            className="w-full sm:w-auto"
          >
            <FileText className="h-4 w-4 mr-2" />
            Add Notes Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

