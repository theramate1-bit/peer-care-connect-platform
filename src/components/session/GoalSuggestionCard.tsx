import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Target, Sparkles } from 'lucide-react';
import { SuggestedGoal } from '@/lib/goal-suggestions';

interface GoalSuggestionCardProps {
  suggestions: SuggestedGoal[];
  onAccept: (suggestion: SuggestedGoal) => void;
  onDismiss: () => void;
}

export const GoalSuggestionCard: React.FC<GoalSuggestionCardProps> = ({
  suggestions,
  onAccept,
  onDismiss
}) => {
  if (suggestions.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">Suggested Goal</CardTitle>
            <Badge variant="outline" className="text-xs">
              {Math.round(suggestions[0].confidence * 100)}% confidence
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
            aria-label="Dismiss suggestion"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion, idx) => (
          <div key={idx} className="space-y-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{suggestion.goal_name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{suggestion.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onAccept(suggestion)}
                className="flex-1"
              >
                Create Goal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

