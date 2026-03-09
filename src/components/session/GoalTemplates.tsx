import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { GOAL_TEMPLATES, calculateTargetFromTemplate, getTargetDateFromTemplate, GoalTemplate } from '@/lib/goal-templates';
import { Sparkles } from 'lucide-react';

interface GoalTemplatesProps {
  onSelectTemplate: (template: GoalTemplate, targetValue: number, targetDate: string) => void;
  currentMetricValue?: number;
  disabled?: boolean;
}

export const GoalTemplates: React.FC<GoalTemplatesProps> = ({
  onSelectTemplate,
  currentMetricValue,
  disabled = false
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | undefined>(undefined);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = GOAL_TEMPLATES.find(t => t.id === templateId);
    if (template && currentMetricValue !== undefined) {
      const targetValue = calculateTargetFromTemplate(template, currentMetricValue);
      const targetDate = getTargetDateFromTemplate(template);
      onSelectTemplate(template, targetValue, targetDate);
      // Reset selection after applying template
      setSelectedTemplateId(undefined);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Use Goal Template
      </Label>
      <Select
        value={selectedTemplateId || undefined}
        onValueChange={handleTemplateSelect}
        disabled={disabled || currentMetricValue === undefined}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a goal template..." />
        </SelectTrigger>
        <SelectContent>
          {GOAL_TEMPLATES.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div>
                <div className="font-medium">{template.name}</div>
                <div className="text-xs text-muted-foreground">{template.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {currentMetricValue === undefined && (
        <p className="text-xs text-muted-foreground">
          Link to a metric first to use templates
        </p>
      )}
    </div>
  );
};

