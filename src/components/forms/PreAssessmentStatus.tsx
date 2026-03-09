import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText, Eye } from 'lucide-react';
import { PreAssessmentService, type PreAssessmentForm } from '@/lib/pre-assessment-service';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PreAssessmentFormView } from './PreAssessmentFormView';

interface PreAssessmentStatusProps {
  sessionId: string;
  preAssessmentCompleted?: boolean;
  preAssessmentRequired?: boolean;
  onView?: () => void;
  showViewButton?: boolean;
}

export const PreAssessmentStatus: React.FC<PreAssessmentStatusProps> = ({
  sessionId,
  preAssessmentCompleted,
  preAssessmentRequired,
  onView,
  showViewButton = false
}) => {
  const [form, setForm] = useState<PreAssessmentForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  useEffect(() => {
    if (preAssessmentCompleted) {
      loadForm();
    }
  }, [sessionId, preAssessmentCompleted]);

  const loadForm = async () => {
    setLoading(true);
    try {
      const loadedForm = await PreAssessmentService.getForm(sessionId);
      setForm(loadedForm);
    } catch (error) {
      console.error('Error loading form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = () => {
    if (form) {
      setViewOpen(true);
    } else {
      loadForm().then(() => setViewOpen(true));
    }
    onView?.();
  };

  if (preAssessmentCompleted) {
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 w-fit">
          <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
          <span className="text-xs sm:text-sm">Form Completed</span>
        </Badge>
        {showViewButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleView}
            className="h-8 sm:h-6 text-xs sm:text-xs min-h-[44px] sm:min-h-0 w-full sm:w-auto"
          >
            <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            View
          </Button>
        )}
        {form && (
          <Dialog open={viewOpen} onOpenChange={setViewOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:mx-4">
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                <DialogTitle className="text-lg sm:text-xl">Pre-Assessment Form</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  View the completed pre-assessment form for this session
                </DialogDescription>
              </DialogHeader>
              <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                <PreAssessmentFormView form={form} />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  if (preAssessmentRequired) {
    return (
      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40 w-fit">
        <span className="text-xs sm:text-sm">No Form</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground bg-muted/50 border-border w-fit">
      <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
      <span className="text-xs sm:text-sm">Optional</span>
    </Badge>
  );
};
