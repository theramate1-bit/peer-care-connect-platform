import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ClientSession {
  id: string;
  client_id?: string;
  session_date: string;
  session_type: string;
  status: string;
  session_number?: number;
}

interface SessionHistorySummaryProps {
  clientId: string;
  currentSessionNumber?: number;
  sessions: ClientSession[];
}

export const SessionHistorySummary: React.FC<SessionHistorySummaryProps> = ({ 
  clientId, 
  currentSessionNumber, 
  sessions 
}) => {
  // Filter sessions for this client
  const clientSessions = sessions.filter(s => s.client_id === clientId);
  
  // Calculate session statistics
  const completedSessions = clientSessions.filter(s => s.status === 'completed').length;
  const totalSessions = clientSessions.length;
  const upcomingSessions = clientSessions.filter(s => s.status === 'scheduled' || s.status === 'confirmed').length;
  const inProgressSessions = clientSessions.filter(s => s.status === 'in_progress').length;
  
  // Calculate completion percentage
  const completionPercentage = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
  
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="text-primary"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Session Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current Session */}
        {currentSessionNumber && (
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Current Session</span>
            <Badge variant="default" className="font-mono">
              #{currentSessionNumber}
            </Badge>
          </div>
        )}
        
        {/* Session Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Progress</span>
            <span className="text-sm font-semibold">
              {completedSessions} of {totalSessions} completed
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
        
        {/* Session Breakdown */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="flex flex-col items-center p-2 rounded-md bg-background/50 border border-border/50">
            <span className="text-xs text-muted-foreground">Completed</span>
            <span className="text-lg font-bold text-green-600">{completedSessions}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-md bg-background/50 border border-border/50">
            <span className="text-xs text-muted-foreground">Upcoming</span>
            <span className="text-lg font-bold text-blue-600">{upcomingSessions}</span>
          </div>
        </div>
        
        {/* In Progress indicator */}
        {inProgressSessions > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
            <span className="text-xs text-yellow-700 dark:text-yellow-400">
              {inProgressSessions} session{inProgressSessions !== 1 ? 's' : ''} in progress
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

