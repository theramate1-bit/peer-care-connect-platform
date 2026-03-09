import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, CheckCircle2, AlertCircle, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExtractedMetric } from '@/lib/metric-extraction';

interface MetricExtractionReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics: ExtractedMetric[];
  onAddMetrics: (metrics: ExtractedMetric[]) => void;
  onSkip: () => void;
}

export const MetricExtractionReview: React.FC<MetricExtractionReviewProps> = ({
  open,
  onOpenChange,
  metrics,
  onAddMetrics,
  onSkip,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedMetrics, setEditedMetrics] = useState<ExtractedMetric[]>(metrics);

  // Initialize selected indices - select all high-confidence metrics by default
  React.useEffect(() => {
    const highConfidenceIndices = new Set<number>();
    editedMetrics.forEach((metric, index) => {
      if (metric.confidence >= 0.7) {
        highConfidenceIndices.add(index);
      }
    });
    setSelectedIndices(highConfidenceIndices);
  }, [editedMetrics]);

  // Update edited metrics when metrics prop changes
  React.useEffect(() => {
    setEditedMetrics(metrics);
  }, [metrics]);

  const handleToggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleEditMetric = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (index: number, updates: Partial<ExtractedMetric>) => {
    const updated = [...editedMetrics];
    updated[index] = { ...updated[index], ...updates };
    setEditedMetrics(updated);
    setEditingIndex(null);
  };

  const handleAddSelected = () => {
    const selectedMetrics = Array.from(selectedIndices)
      .map(index => editedMetrics[index])
      .filter(Boolean);
    
    if (selectedMetrics.length === 0) {
      return;
    }

    onAddMetrics(selectedMetrics);
    setSelectedIndices(new Set());
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip();
    setSelectedIndices(new Set());
    onOpenChange(false);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <Badge variant="outline" className="text-xs text-green-600 border-green-300">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          High Confidence
        </Badge>
      );
    } else if (confidence >= 0.6) {
      return (
        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          Medium Confidence
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-xs text-red-600 border-red-300">
          <Info className="h-3 w-3 mr-1" />
          Review Needed
        </Badge>
      );
    }
  };

  const getMetricTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      pain_level: 'bg-red-100 text-red-700',
      mobility: 'bg-blue-100 text-blue-700',
      strength: 'bg-green-100 text-green-700',
      flexibility: 'bg-purple-100 text-purple-700',
      function: 'bg-orange-100 text-orange-700',
      custom: 'bg-gray-100 text-gray-700',
    };
    return (
      <Badge className={`text-xs ${colors[type] || colors.custom}`}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extracted Progress Metrics</DialogTitle>
          <DialogDescription>
            We found {metrics.length} measurable metric{metrics.length !== 1 ? 's' : ''} in your SOAP notes. 
            Review and select which ones to add to the Progress tab.
          </DialogDescription>
        </DialogHeader>

        {metrics.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-2">No measurable metrics were found in this SOAP note.</p>
            <div className="text-xs bg-muted/50 p-3 rounded-md text-left max-w-md mx-auto">
              <p className="font-medium mb-1">Examples of measurable metrics:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>"Pain level 6/10"</li>
                <li>"ROM: 90 degrees"</li>
                <li>"Strength: 4/5"</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {editedMetrics.map((metric, index) => (
              <Card 
                key={index} 
                className={cn(
                  'transition-[border-color,background-color] duration-200 ease-out',
                  selectedIndices.has(index) 
                    ? 'border-primary border-2 bg-primary/5 shadow-sm' 
                    : 'border-border'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getMetricTypeBadge(metric.metric_type)}
                        <span className="font-medium">{metric.metric_name}</span>
                        {getConfidenceBadge(metric.confidence)}
                        <span className="text-xs text-muted-foreground">
                          ({metric.source_section})
                        </span>
                        {selectedIndices.has(index) && (
                          <Badge variant="default" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>

                      {editingIndex === index ? (
                        <div className="space-y-2 pt-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Value</Label>
                              <Input
                                type="number"
                                value={metric.value}
                                onChange={(e) =>
                                  handleSaveEdit(index, { value: parseFloat(e.target.value) || 0 })
                                }
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Max Value</Label>
                              <Input
                                type="number"
                                value={metric.max_value}
                                onChange={(e) =>
                                  handleSaveEdit(index, { max_value: parseFloat(e.target.value) || 10 })
                                }
                                className="h-8"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Unit</Label>
                            <Input
                              value={metric.unit}
                              onChange={(e) =>
                                handleSaveEdit(index, { unit: e.target.value })
                              }
                              placeholder="e.g., degrees, /10, kg"
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Metric Name</Label>
                            <Input
                              value={metric.metric_name}
                              onChange={(e) =>
                                handleSaveEdit(index, { metric_name: e.target.value })
                              }
                              className="h-8"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingIndex(null)}
                            className="w-full"
                          >
                            Done Editing
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm font-semibold text-primary">
                            {metric.value}/{metric.max_value} {metric.unit}
                          </div>
                          {metric.notes && (
                            <div className="text-xs text-muted-foreground">
                              {metric.notes}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {editingIndex !== index && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditMetric(index)}
                          className="h-8 w-8 p-0"
                          aria-label="Edit metric"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="relative">
                        <Checkbox
                          checked={selectedIndices.has(index)}
                          onCheckedChange={() => handleToggleSelection(index)}
                          disabled={editingIndex === index}
                          aria-label={`Select metric: ${metric.metric_name}`}
                        />
                        {selectedIndices.has(index) && (
                          <Check className="h-3 w-3 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={selectedIndices.size === 0}
          >
            Add {selectedIndices.size} Metric{selectedIndices.size !== 1 ? 's' : ''} to Progress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

