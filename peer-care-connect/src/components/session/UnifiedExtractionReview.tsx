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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, CheckCircle2, AlertCircle, Info, Calendar, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExtractedGoal } from '@/lib/goal-extraction';

interface UnifiedExtractionReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals?: ExtractedGoal[];
  onAddGoals?: (goals: ExtractedGoal[]) => void;
  onSkip?: () => void;
}

export const UnifiedExtractionReview: React.FC<UnifiedExtractionReviewProps> = ({
  open,
  onOpenChange,
  goals = [],
  onAddGoals,
  onSkip,
}) => {
  const [selectedGoalIndices, setSelectedGoalIndices] = useState<Set<number>>(new Set());
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null);
  const [editedGoals, setEditedGoals] = useState<ExtractedGoal[]>(goals);

  // Initialize selected indices
  React.useEffect(() => {
    const highConfidenceGoals = new Set<number>();
    editedGoals.forEach((goal, index) => {
      if (goal.confidence >= 0.7) {
        highConfidenceGoals.add(index);
      }
    });
    setSelectedGoalIndices(highConfidenceGoals);
  }, [editedGoals]);

  React.useEffect(() => {
    setEditedGoals(goals);
  }, [goals]);

  const handleAddSelected = () => {
    const selectedGoals = Array.from(selectedGoalIndices)
      .map(index => editedGoals[index])
      .filter(Boolean);

    if (selectedGoals.length > 0 && onAddGoals) {
      onAddGoals(selectedGoals);
    }

    onOpenChange(false);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
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

  const totalItems = goals.length;
  const goalsSelected = selectedGoalIndices.size;

  if (totalItems === 0) {
    return null;
  }

  // Build selection summary text
  const getSelectionSummary = () => {
    if (goalsSelected > 0) {
      return `${goalsSelected} goal${goalsSelected !== 1 ? 's' : ''}`;
    }
    return '0 items';
  };

  // Build add button text
  const getAddButtonText = () => {
    if (goalsSelected > 0) {
      return `Add ${goalsSelected} Goal${goalsSelected !== 1 ? 's' : ''}`;
    }
    return 'Add Selected Items';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Review Extracted Goals
            {goals.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {goals.length} goal{goals.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Review and select goals to add to Progress.
          </DialogDescription>
          {goalsSelected > 0 && (
            <div className="mt-2">
              <Badge variant="default" className="text-sm">
                <Check className="h-3 w-3 mr-1" />
                {getSelectionSummary()} selected
              </Badge>
            </div>
          )}
        </DialogHeader>

        <div className="mt-4 space-y-3">
              {editedGoals.map((goal, index) => (
                <Card 
                  key={index} 
                  className={cn(
                    'transition-[border-color,background-color] duration-200 ease-out',
                    selectedGoalIndices.has(index) 
                      ? 'border-primary border-2 bg-primary/5 shadow-sm' 
                      : 'border-border'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="text-xs bg-purple-100 text-purple-700">{goal.source_section}</Badge>
                          {getConfidenceBadge(goal.confidence)}
                          {selectedGoalIndices.has(index) && (
                            <Badge variant="default" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </div>
                        <div className="font-medium text-lg">{goal.goal_name}</div>
                        <div className="text-sm text-muted-foreground">{goal.description}</div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="font-semibold text-primary">
                            Target: {goal.target_value} {goal.target_unit}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(goal.target_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <Checkbox
                          checked={selectedGoalIndices.has(index)}
                          onCheckedChange={() => {
                            const newSelected = new Set(selectedGoalIndices);
                            if (newSelected.has(index)) {
                              newSelected.delete(index);
                            } else {
                              newSelected.add(index);
                            }
                            setSelectedGoalIndices(newSelected);
                          }}
                          aria-label={`Select goal: ${goal.goal_name}`}
                        />
                        {selectedGoalIndices.has(index) && (
                          <Check className="h-3 w-3 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

        <DialogFooter className="mt-6">
          <div className="flex items-center justify-between w-full">
            {goalsSelected > 0 && (
              <div className="text-sm text-muted-foreground">
                {getSelectionSummary()} ready to add
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={handleSkip}>
                Skip
              </Button>
              <Button
                onClick={handleAddSelected}
                disabled={goalsSelected === 0}
              >
                {getAddButtonText()}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
