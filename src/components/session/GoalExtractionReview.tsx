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
import { Edit, CheckCircle2, AlertCircle, Info, Calendar, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExtractedGoal } from '@/lib/goal-extraction';

interface GoalExtractionReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: ExtractedGoal[];
  onAddGoals: (goals: ExtractedGoal[]) => void;
  onSkip: () => void;
}

export const GoalExtractionReview: React.FC<GoalExtractionReviewProps> = ({
  open,
  onOpenChange,
  goals,
  onAddGoals,
  onSkip,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedGoals, setEditedGoals] = useState<ExtractedGoal[]>(goals);

  // Initialize selected indices - select all high-confidence goals by default
  React.useEffect(() => {
    const highConfidenceIndices = new Set<number>();
    editedGoals.forEach((goal, index) => {
      if (goal.confidence >= 0.7) {
        highConfidenceIndices.add(index);
      }
    });
    setSelectedIndices(highConfidenceIndices);
  }, [editedGoals]);

  // Update edited goals when goals prop changes
  React.useEffect(() => {
    setEditedGoals(goals);
  }, [goals]);

  const handleToggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleEditGoal = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (index: number, updates: Partial<ExtractedGoal>) => {
    const updated = [...editedGoals];
    updated[index] = { ...updated[index], ...updates };
    setEditedGoals(updated);
    setEditingIndex(null);
  };

  const handleAddSelected = () => {
    const selectedGoals = Array.from(selectedIndices)
      .map(index => editedGoals[index])
      .filter(Boolean);
    
    if (selectedGoals.length === 0) {
      return;
    }

    onAddGoals(selectedGoals);
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

  const getSourceSectionBadge = (section: string) => {
    const colors: Record<string, string> = {
      plan: 'bg-blue-100 text-blue-700',
      assessment: 'bg-purple-100 text-purple-700',
      objective: 'bg-green-100 text-green-700',
      subjective: 'bg-orange-100 text-orange-700',
    };
    return (
      <Badge className={`text-xs ${colors[section] || 'bg-gray-100 text-gray-700'}`}>
        {section.charAt(0).toUpperCase() + section.slice(1)}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extracted Treatment Goals</DialogTitle>
          <DialogDescription>
            We found {goals.length} goal{goals.length !== 1 ? 's' : ''} in your SOAP notes. 
            Review and select which ones to add to the Goals tab.
          </DialogDescription>
        </DialogHeader>

        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-2">No treatment goals were found in this SOAP note.</p>
            <p className="text-xs mb-3">Goals are typically found in the Plan or Assessment sections.</p>
            <div className="text-xs bg-muted/50 p-3 rounded-md text-left max-w-md mx-auto">
              <p className="font-medium mb-1">Examples of goal statements:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>"Goal: Increase ROM to 90 degrees by next month"</li>
                <li>"Target: Reduce pain to 3/10 within 6 weeks"</li>
                <li>"Objective: Achieve 120° knee flexion"</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {editedGoals.map((goal, index) => (
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
                        {getSourceSectionBadge(goal.source_section)}
                        {getConfidenceBadge(goal.confidence)}
                        {selectedIndices.has(index) && (
                          <Badge variant="default" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>

                      {editingIndex === index ? (
                        <div className="space-y-2 pt-2">
                          <div>
                            <Label className="text-xs">Goal Name</Label>
                            <Input
                              value={goal.goal_name}
                              onChange={(e) =>
                                handleSaveEdit(index, { goal_name: e.target.value })
                              }
                              className="h-8"
                              placeholder="e.g., Increase Shoulder ROM"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={goal.description}
                              onChange={(e) =>
                                handleSaveEdit(index, { description: e.target.value })
                              }
                              className="h-8"
                              placeholder="Full goal description"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Target Value</Label>
                              <Input
                                type="number"
                                value={goal.target_value}
                                onChange={(e) =>
                                  handleSaveEdit(index, { target_value: parseFloat(e.target.value) || 0 })
                                }
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Unit</Label>
                              <Input
                                value={goal.target_unit}
                                onChange={(e) =>
                                  handleSaveEdit(index, { target_unit: e.target.value })
                                }
                                placeholder="e.g., degrees, /10, kg"
                                className="h-8"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Target Date</Label>
                            <Input
                              type="date"
                              value={goal.target_date}
                              onChange={(e) =>
                                handleSaveEdit(index, { target_date: e.target.value })
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
                          {goal.notes && (
                            <div className="text-xs text-muted-foreground">
                              {goal.notes}
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
                          onClick={() => handleEditGoal(index)}
                          className="h-8 w-8 p-0"
                          aria-label="Edit goal"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="relative">
                        <Checkbox
                          checked={selectedIndices.has(index)}
                          onCheckedChange={() => handleToggleSelection(index)}
                          disabled={editingIndex === index}
                          aria-label={`Select goal: ${goal.goal_name}`}
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
            Add {selectedIndices.size} Goal{selectedIndices.size !== 1 ? 's' : ''} to Progress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

