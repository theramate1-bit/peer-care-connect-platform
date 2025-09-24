import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  User, 
  FileText,
  Stethoscope,
  ArrowLeft,
  ArrowRight,
  History,
  TrendingUp
} from 'lucide-react';

interface SOAPSession {
  id: string;
  session_id: string;
  client_name: string;
  client_id: string;
  therapy_type: string;
  session_date: string;
  duration_minutes: number;
  status: 'draft' | 'completed' | 'archived';
  soap_subjective: string;
  soap_objective: string;
  soap_assessment: string;
  soap_plan: string;
  chief_complaint: string;
  session_notes: string;
  created_at: string;
}

interface VisitHistoryNavigationProps {
  sessions: SOAPSession[];
  currentSession: SOAPSession | null;
  onSessionSelect: (session: SOAPSession) => void;
  onNavigate: (direction: 'previous' | 'next') => void;
}

export const VisitHistoryNavigation: React.FC<VisitHistoryNavigationProps> = ({
  sessions,
  currentSession,
  onSessionSelect,
  onNavigate
}) => {
  const getCurrentIndex = () => {
    return sessions.findIndex(s => s.id === currentSession?.id);
  };

  const getAdjacentSessions = () => {
    const currentIndex = getCurrentIndex();
    return {
      previous: currentIndex > 0 ? sessions[currentIndex - 1] : null,
      next: currentIndex < sessions.length - 1 ? sessions[currentIndex + 1] : null
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const adjacentSessions = getAdjacentSessions();
  const currentIndex = getCurrentIndex();

  return (
    <div className="space-y-4">
      {/* Navigation Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Visit History Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {/* Previous Session */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('previous')}
                disabled={!adjacentSessions.previous}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              {adjacentSessions.previous && (
                <div className="text-sm text-muted-foreground">
                  {formatDate(adjacentSessions.previous.session_date)}
                </div>
              )}
            </div>

            {/* Current Session Info */}
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                Session {currentIndex + 1} of {sessions.length}
              </div>
              {currentSession && (
                <div className="font-medium">
                  {currentSession.client_name}
                </div>
              )}
            </div>

            {/* Next Session */}
            <div className="flex items-center gap-3">
              {adjacentSessions.next && (
                <div className="text-sm text-muted-foreground">
                  {formatDate(adjacentSessions.next.session_date)}
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('next')}
                disabled={!adjacentSessions.next}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Session Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.slice(0, 5).map((session, index) => (
              <div
                key={session.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  session.id === currentSession?.id 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onSessionSelect(session)}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${
                    session.id === currentSession?.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{session.client_name}</h4>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(session.session_date)}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{session.duration_minutes} min</span>
                      <span>•</span>
                      <span>{session.therapy_type}</span>
                    </div>
                    
                    {session.chief_complaint && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {session.chief_complaint}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  #{sessions.length - index}
                </div>
              </div>
            ))}
            
            {sessions.length > 5 && (
              <div className="text-center text-sm text-muted-foreground py-2">
                ... and {sessions.length - 5} more sessions
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {sessions.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {sessions.filter(s => s.status === 'draft').length}
            </div>
            <div className="text-sm text-muted-foreground">Drafts</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(sessions.reduce((acc, s) => acc + s.duration_minutes, 0) / sessions.length) || 0}
            </div>
            <div className="text-sm text-muted-foreground">Avg Duration</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisitHistoryNavigation;
