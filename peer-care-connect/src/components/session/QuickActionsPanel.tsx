import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Target, Download, FileText } from 'lucide-react';

interface QuickActionsPanelProps {
  onCopyLastSession: () => void;
  onCreateGoalFromMetrics: () => void;
  onImportCommonMetrics: () => void;
  hasMetrics: boolean;
  disabled?: boolean;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  onCopyLastSession,
  onCreateGoalFromMetrics,
  onImportCommonMetrics,
  hasMetrics,
  disabled = false
}) => {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCopyLastSession}
          disabled={disabled}
          className="w-full justify-start"
          aria-label="Copy metrics from last session"
        >
          <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
          Copy Last Session Metrics
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateGoalFromMetrics}
          disabled={disabled || !hasMetrics}
          className="w-full justify-start"
          aria-label="Create goal from active metrics"
        >
          <Target className="h-4 w-4 mr-2" aria-hidden="true" />
          Create Goal from Metrics
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onImportCommonMetrics}
          disabled={disabled}
          className="w-full justify-start"
          aria-label="Import common metrics"
        >
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />
          Import Common Metrics
        </Button>
      </CardContent>
    </Card>
  );
};

