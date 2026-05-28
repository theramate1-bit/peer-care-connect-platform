import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target, 
  Loader2,
  BarChart3,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { findMatchingMetrics } from '@/lib/goal-suggestions';
import { ProgressMetric, ProgressMetricMetadata } from '@/lib/types/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  PAIN_AREAS,
  JOINTS,
  MOVEMENTS,
  STRENGTH_GRADES,
  STRENGTH_VALUE_MAP
} from '@/lib/constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EditingMetric {
  id: string;
  metric_name: string;
  metric_type: 'pain_level' | 'mobility' | 'strength' | 'flexibility' | 'function' | 'custom';
  value: number;
  max_value: number;
  unit: string;
  notes: string;
  session_id: string | null;
  session_date: string;
  metadata?: ProgressMetricMetadata;
}

interface EditingGoal {
  id: string;
  goal_name: string;
  description: string;
  target_value: number;
  current_value: number;
  target_date: string;
  status: 'active' | 'achieved' | 'paused' | 'cancelled';
  linked_metric_name?: string | null;
  auto_update_enabled?: boolean;
}

interface UnifiedProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  sessionId?: string;
  onSuccess?: () => void;
  editingMetric?: EditingMetric | null;
  editingGoal?: EditingGoal | null;
  existingMetrics?: Array<{
    id: string;
    metric_name: string;
    metric_type: string;
    value: number;
    max_value: number;
    unit: string;
    session_date: string;
  }>;
  existingSessions?: Array<{
    id: string;
    session_date: string;
    session_type: string;
    session_number?: number;
  }>;
}

export const UnifiedProgressModal: React.FC<UnifiedProgressModalProps> = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  sessionId,
  onSuccess,
  editingMetric = null,
  editingGoal = null,
  existingMetrics = [],
  existingSessions = []
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Metric form state
  const [newMetric, setNewMetric] = useState({
    metric_name: '',
    metric_type: 'custom' as 'pain_level' | 'mobility' | 'strength' | 'flexibility' | 'function' | 'custom',
    value: 0,
    max_value: 0,
    unit: '',
    notes: '',
    metadata: {} as ProgressMetricMetadata,
    session_id: sessionId || null as string | null,
    session_date: new Date().toISOString().split('T')[0],
    date_selection_method: 'session' as 'session' | 'manual'
  });
  
  // Store input value as string to allow free typing
  const [valueInput, setValueInput] = useState<string>('');
  const [maxValueInput, setMaxValueInput] = useState<string>('');
  
  // Helper state for structured inputs
  const [structuredInput, setStructuredInput] = useState({
    joint: '',
    side: 'right' as 'right' | 'left' | 'bilateral',
    movement: '',
    area: ''
  });

  // Auto-generate metric name based on structured input
  useEffect(() => {
    if (newMetric.metric_type === 'mobility' || newMetric.metric_type === 'strength') {
      if (structuredInput.joint && structuredInput.movement) {
        const sideText = structuredInput.side === 'bilateral' ? 'bilateral' : structuredInput.side === 'right' ? 'right side' : 'left side';
        const jointLower = structuredInput.joint.toLowerCase();
        const movementLower = structuredInput.movement.toLowerCase();
        const typePrefix = newMetric.metric_type === 'mobility' ? 'ROM' : 'Strength';
        const name = `${typePrefix} - ${sideText} ${jointLower} ${movementLower}`;
        setNewMetric(prev => ({ ...prev, metric_name: name }));
      } else {
        // Clear metric name if structured inputs are incomplete
        if (!structuredInput.joint || !structuredInput.movement) {
          setNewMetric(prev => ({ ...prev, metric_name: '' }));
        }
      }
    } else if (newMetric.metric_type === 'pain_level') {
      if (structuredInput.area) {
        // e.g. "Right Shoulder Pain (VAS)" or "Left Lower Back Pain (VAS)"
        const sideText = structuredInput.side === 'bilateral' ? 'Bilateral' : structuredInput.side === 'right' ? 'Right' : 'Left';
        const name = `${sideText} ${structuredInput.area} Pain (VAS)`;
        setNewMetric(prev => ({ 
          ...prev, 
          metric_name: name,
          max_value: 10, 
          unit: '/10' 
        }));
      } else if (!editingMetric) {
      setNewMetric(prev => ({ ...prev, metric_name: 'Pain Level (VAS)', max_value: 10, unit: '/10' }));
      }
    }
  }, [structuredInput, newMetric.metric_type, editingMetric]);
  
  // Goal form state
  const [newGoal, setNewGoal] = useState({
    goal_name: '',
    description: '',
    target_value: 0,
    target_date: '',
    linked_metric_name: null as string | null,
    auto_update_enabled: true
  });
  const [showAutoLinkDialog, setShowAutoLinkDialog] = useState(false);
  const [pendingAutoLink, setPendingAutoLink] = useState<{ metric_name: string; match_score: number } | null>(null);
  

  // Reset forms when modal opens/closes or editing changes
  useEffect(() => {
    if (open) {
      if (editingMetric) {
        // Check if this is a new metric (empty id) or editing existing one
        if (editingMetric.id && editingMetric.id.trim() !== '') {
          // Populate metric form for editing existing metric
        setNewMetric({
          metric_name: editingMetric.metric_name,
          metric_type: editingMetric.metric_type,
          value: editingMetric.value,
          max_value: editingMetric.max_value,
          unit: editingMetric.unit,
            notes: editingMetric.notes || '',
            metadata: editingMetric.metadata || {},
            session_id: editingMetric.session_id || null,
            session_date: editingMetric.session_date || new Date().toISOString().split('T')[0],
            date_selection_method: editingMetric.session_id ? 'session' : 'manual'
          });
          
          // Set input values for editing
          setValueInput(editingMetric.value?.toString() || '');
          setMaxValueInput(editingMetric.max_value?.toString() || '');
          
          // Parse name to populate structured inputs if possible
          // This is a basic attempt to reverse-engineer the structured input from the name/metadata
          if (editingMetric.metadata?.joint) {
            setStructuredInput({
              joint: editingMetric.metadata.joint,
              side: editingMetric.metadata.side as any || 'right',
              movement: editingMetric.metadata.movement || ''
            });
          }
        } else {
          // New metric with pre-filled type
          setNewMetric({
            metric_name: editingMetric.metric_name || '',
            metric_type: editingMetric.metric_type,
            value: editingMetric.value || 0,
            max_value: editingMetric.max_value || 0,
            unit: editingMetric.unit || '',
            notes: editingMetric.notes || '',
            metadata: editingMetric.metadata || {},
            session_id: sessionId || null,
            session_date: sessionId ? (existingSessions.find(s => s.id === sessionId)?.session_date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
            date_selection_method: sessionId ? 'session' : 'manual'
          });
          
          // Reset input values for new metrics
          setValueInput('');
          setMaxValueInput('');
          
          // Reset structured input for new metrics
          setStructuredInput({
            joint: '',
            side: 'right',
            movement: '',
            area: ''
          });
        }
        
        setNewGoal({
          goal_name: '',
          description: '',
          target_value: 0,
          target_date: '',
          linked_metric_name: null,
          auto_update_enabled: true
        });
      } else if (editingGoal) {
        // Populate goal form for editing
        setNewGoal({
          goal_name: editingGoal.goal_name,
          description: editingGoal.description || '',
          target_value: editingGoal.target_value,
          target_date: editingGoal.target_date,
          linked_metric_name: editingGoal.linked_metric_name || null,
          auto_update_enabled: editingGoal.auto_update_enabled ?? true
        });
        setNewMetric({
          metric_name: '',
          metric_type: 'custom',
          value: 0,
          max_value: 0,
          unit: '',
          notes: '',
          metadata: {}
        });
        setNewGoal({
          goal_name: '',
          description: '',
          target_value: 0,
          target_date: '',
          linked_metric_name: null,
          auto_update_enabled: true
        });
        setNewMetric({
          metric_name: '',
          metric_type: 'custom',
          value: 0,
          max_value: 0,
          unit: '',
          notes: '',
          metadata: {},
          session_id: sessionId || null,
          session_date: sessionId ? (existingSessions.find(s => s.id === sessionId)?.session_date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
          date_selection_method: sessionId ? 'session' : 'manual'
        });
        setStructuredInput({
            joint: '',
            side: 'right',
            movement: '',
            area: ''
        });
        
        // Reset input values
        setValueInput('');
        setMaxValueInput('');
      } else {
        // No editing - reset everything
        setValueInput('');
        setMaxValueInput('');
      }
    }
  }, [open, editingMetric, editingGoal]);

  // Add or update metric
  const saveMetric = async () => {
    if (!newMetric.metric_name.trim()) {
      toast.error('Please enter a metric name');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      
      if (editingMetric && editingMetric.id && editingMetric.id.trim() !== '') {
        // Update existing metric
        const { error } = await supabase
          .from('progress_metrics')
          .update({
            metric_name: newMetric.metric_name,
            metric_type: newMetric.metric_type,
            value: newMetric.value,
            max_value: newMetric.max_value,
            unit: newMetric.unit,
            notes: newMetric.notes || '',
            session_id: newMetric.session_id,
            session_date: newMetric.date_selection_method === 'session' && newMetric.session_id
              ? (existingSessions.find(s => s.id === newMetric.session_id)?.session_date || newMetric.session_date)
              : newMetric.session_date,
            metadata: {
              ...newMetric.metadata,
              ...((newMetric.metric_type === 'mobility' || newMetric.metric_type === 'strength' || newMetric.metric_type === 'pain_level') ? structuredInput : {})
            }
          } as any) // Type assertion for metadata column
          .eq('id', editingMetric.id);

        if (error) throw error;
        toast.success('Metric updated');
      } else {
        // Create new metric
        const { error } = await supabase
          .from('progress_metrics')
          .insert({
            client_id: clientId,
            practitioner_id: user.id,
            session_id: newMetric.session_id,
            metric_name: newMetric.metric_name,
            metric_type: newMetric.metric_type,
            value: newMetric.value,
            max_value: newMetric.max_value,
            unit: newMetric.unit,
            notes: newMetric.notes || '',
            session_date: newMetric.date_selection_method === 'session' && newMetric.session_id
              ? (existingSessions.find(s => s.id === newMetric.session_id)?.session_date || newMetric.session_date)
              : newMetric.session_date,
            metadata: {
              ...newMetric.metadata,
              ...((newMetric.metric_type === 'mobility' || newMetric.metric_type === 'strength' || newMetric.metric_type === 'pain_level') ? structuredInput : {})
            }
          } as any); // Type assertion for metadata column

        if (error) throw error;
        toast.success('Metric added');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving metric:', error);
      toast.error(`Failed to save metric: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Add or update goal
  const saveGoal = async () => {
    if (!newGoal.goal_name.trim()) {
      toast.error('Please enter a goal name');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      
      if (editingGoal) {
        // Update existing goal
        const { error } = await supabase
          .from('progress_goals')
          .update({
            goal_name: newGoal.goal_name,
            description: newGoal.description || '',
            target_value: newGoal.target_value,
            target_date: newGoal.target_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            linked_metric_name: newGoal.linked_metric_name,
            auto_update_enabled: newGoal.auto_update_enabled,
          })
          .eq('id', editingGoal.id);

        if (error) throw error;
        toast.success('Goal updated');
      } else {
        // Create new goal
        const { error } = await supabase
          .from('progress_goals')
          .insert({
            client_id: clientId,
            practitioner_id: user.id,
            goal_name: newGoal.goal_name,
            description: newGoal.description || '',
            target_value: newGoal.target_value,
            current_value: 0,
            target_date: newGoal.target_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active',
            linked_metric_name: newGoal.linked_metric_name,
            auto_update_enabled: newGoal.auto_update_enabled,
          });

        if (error) throw error;
        toast.success('Progress goal added');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving goal:', error);
      toast.error(`Failed to save goal: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingMetric ? (
                <>
                  <BarChart3 className="h-5 w-5" />
                  {editingMetric.id && editingMetric.id.trim() !== '' ? 'Edit Metric' : 'Add Metric'}
                </>
              ) : editingGoal ? (
                <>
                  <Target className="h-5 w-5" />
                  Edit Goal
                </>
              ) : (
                <>
                  <Target className="h-5 w-5" />
                  Add Goal
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingMetric 
                ? `${editingMetric.id && editingMetric.id.trim() !== '' ? 'Edit' : 'Add'} metric for ${clientName}`
                : `Track goals for ${clientName}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {editingMetric ? (
              /* Metric Form */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Date Selection</Label>
                  <RadioGroup
                    value={newMetric.date_selection_method}
                    onValueChange={(value: 'session' | 'manual') => {
                      setNewMetric(prev => ({
                        ...prev,
                        date_selection_method: value,
                        // Clear session ID if switching to manual, or set default session if switching to session
                        session_id: value === 'manual' ? null : (existingSessions[0]?.id || null)
                      }));
                    }}
                    className="flex gap-4 mb-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="session" id="r-session" disabled={existingSessions.length === 0} />
                      <Label htmlFor="r-session" className={existingSessions.length === 0 ? 'text-muted-foreground' : ''}>Link to Session</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="manual" id="r-manual" />
                      <Label htmlFor="r-manual">Manual Date</Label>
                    </div>
                  </RadioGroup>

                  {newMetric.date_selection_method === 'session' ? (
                    <div>
                      <Label htmlFor="metric-session">Session</Label>
                      <Select
                        value={newMetric.session_id || ''}
                        onValueChange={(value) => {
                          const selectedSession = existingSessions.find(s => s.id === value);
                          setNewMetric(prev => ({
                            ...prev,
                            session_id: value,
                            session_date: selectedSession?.session_date || prev.session_date
                          }));
                        }}
                      >
                        <SelectTrigger id="metric-session">
                          <SelectValue placeholder="Select a session" />
                        </SelectTrigger>
                        <SelectContent>
                          {existingSessions
                            .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
                            .map((session) => (
                              <SelectItem key={session.id} value={session.id}>
                                Session {session.session_number ? `#${session.session_number}` : ''} ({new Date(session.session_date).toLocaleDateString()})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="metric-date">Date</Label>
                      <Input
                        id="metric-date"
                        type="date"
                        value={newMetric.session_date}
                        onChange={(e) => setNewMetric(prev => ({ ...prev, session_date: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="modal-metric-type">Metric Type</Label>
                  <Select
                    value={newMetric.metric_type}
                    onValueChange={(value: any) => {
                      setNewMetric(prev => {
                        const updates: any = { metric_type: value };
                        if (value === 'pain_level') {
                          updates.unit = '/10';
                          updates.max_value = 10;
                          updates.metric_name = 'Pain Level (VAS)';
                        } else if (value === 'strength') {
                          updates.unit = '/5';
                          updates.max_value = 5;
                        } else if (value === 'mobility') {
                          updates.unit = 'degrees';
                          updates.max_value = 180; // Default max for ROM in degrees
                        }
                        return { ...prev, ...updates };
                      });
                    }}
                  >
                    <SelectTrigger id="modal-metric-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pain_level">Pain Level (VAS)</SelectItem>
                      <SelectItem value="mobility">Range of Movement</SelectItem>
                      <SelectItem value="strength">Strength</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Structured Inputs for Pain Level */}
                {newMetric.metric_type === 'pain_level' && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div>
                    <Label htmlFor="metric-area">Area of Pain</Label>
                    <Select
                      value={structuredInput.area}
                      onValueChange={(value) => setStructuredInput(prev => ({ ...prev, area: value }))}
                    >
                      <SelectTrigger id="metric-area">
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAIN_AREAS.map(area => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                    <div>
                      <Label htmlFor="metric-pain-side">Side</Label>
                      <Select
                        value={structuredInput.side}
                        onValueChange={(value: any) => setStructuredInput(prev => ({ ...prev, side: value }))}
                      >
                        <SelectTrigger id="metric-pain-side">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="bilateral">Bilateral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Structured Inputs for ROM and Strength */}
                {(newMetric.metric_type === 'mobility' || newMetric.metric_type === 'strength') && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div>
                      <Label htmlFor="metric-joint">Joint</Label>
                      <Select
                        value={structuredInput.joint}
                        onValueChange={(value) => setStructuredInput(prev => ({ ...prev, joint: value, movement: '' }))}
                      >
                        <SelectTrigger id="metric-joint">
                          <SelectValue placeholder="Select joint" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOINTS.map(joint => (
                            <SelectItem key={joint} value={joint}>{joint}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="metric-side">Side</Label>
                      <Select
                        value={structuredInput.side}
                        onValueChange={(value: any) => setStructuredInput(prev => ({ ...prev, side: value }))}
                      >
                        <SelectTrigger id="metric-side">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="bilateral">Bilateral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="metric-movement">Movement</Label>
                      <Select
                        value={structuredInput.movement}
                        onValueChange={(value) => setStructuredInput(prev => ({ ...prev, movement: value }))}
                        disabled={!structuredInput.joint}
                      >
                        <SelectTrigger id="metric-movement">
                          <SelectValue placeholder="Select movement" />
                        </SelectTrigger>
                        <SelectContent>
                          {structuredInput.joint && MOVEMENTS[structuredInput.joint as keyof typeof MOVEMENTS]?.map(movement => (
                            <SelectItem key={movement} value={movement}>{movement}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="modal-metric-name">Metric Name</Label>
                  <Input
                    id="modal-metric-name"
                    value={newMetric.metric_name}
                    onChange={(e) => setNewMetric(prev => ({ ...prev, metric_name: e.target.value }))}
                    placeholder="e.g., Lower Back Pain"
                    disabled={newMetric.metric_type === 'mobility' || newMetric.metric_type === 'strength' || (newMetric.metric_type === 'pain_level' && !!structuredInput.area)}
                  />
                  {(newMetric.metric_type === 'pain_level' || newMetric.metric_type === 'mobility' || newMetric.metric_type === 'strength') && (
                    <p className="text-xs text-muted-foreground mt-1">Auto-generated from selections</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="modal-metric-value">Value</Label>
                  {newMetric.metric_type === 'strength' ? (
                    <Select
                      value={(() => {
                        // Convert numeric value back to Oxford Scale string for display
                        const numValue = newMetric.value;
                        if (numValue === 0) return '0';
                        if (numValue === 1) return '1';
                        if (numValue === 2) return '2';
                        if (numValue === 3) return '3';
                        if (numValue === 3.5) return '4-';
                        if (numValue === 4) return '4';
                        if (numValue === 4.5) return '4+';
                        if (numValue === 5) return '5';
                        // Default fallback
                        return numValue?.toString() || '0';
                      })()}
                      onValueChange={(value) => {
                        // Convert Oxford Scale values to numeric for storage
                        setNewMetric(prev => ({ ...prev, value: STRENGTH_VALUE_MAP[value] || 0 }));
                      }}
                    >
                      <SelectTrigger id="modal-metric-value">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STRENGTH_GRADES.map((grade) => (
                          <SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : newMetric.metric_type === 'pain_level' ? (
                    <Select
                      value={newMetric.value.toString()}
                      onValueChange={(value) => setNewMetric(prev => ({ ...prev, value: Number(value) }))}
                    >
                      <SelectTrigger id="modal-metric-value">
                        <SelectValue placeholder="Select score" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                          <SelectItem key={score} value={score.toString()}>
                            {score} - {score === 0 ? 'No Pain' : score === 10 ? 'Worst Pain' : score < 4 ? 'Mild' : score < 7 ? 'Moderate' : 'Severe'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                  <Input
                      id="modal-metric-value"
                    type="number"
                      step="any"
                      value={valueInput}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // For mobility (Range of Movement), allow any numeric value including negative
                        if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
                          setValueInput(inputValue);
                          // Convert to number for the metric state, but allow empty string for typing
                          // Only update metric value if input is not empty
                          if (inputValue !== '') {
                            const numValue = Number(inputValue);
                            if (!isNaN(numValue)) {
                              setNewMetric(prev => ({ ...prev, value: numValue }));
                            }
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // On blur, ensure we have a valid number or 0
                        const finalValue = e.target.value.trim();
                        if (finalValue === '') {
                          setValueInput('0');
                          setNewMetric(prev => ({ ...prev, value: 0 }));
                        } else {
                          const numValue = Number(finalValue);
                          if (!isNaN(numValue)) {
                            setValueInput(numValue.toString());
                            setNewMetric(prev => ({ ...prev, value: numValue }));
                          } else {
                            // Invalid number, reset to 0
                            setValueInput('0');
                            setNewMetric(prev => ({ ...prev, value: 0 }));
                          }
                        }
                      }}
                      onFocus={(e) => {
                        // When focusing, if value is 0, clear the input for easier typing
                        if (newMetric.value === 0 && valueInput === '0') {
                          setValueInput('');
                        }
                      }}
                  />
                  )}
                </div>
                <div>
                  <Label htmlFor="modal-metric-unit">Unit</Label>
                  <Input
                    id="modal-metric-unit"
                    value={newMetric.unit}
                    onChange={(e) => setNewMetric(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g., /10, kg, degrees"
                    disabled={newMetric.metric_type === 'pain_level' || newMetric.metric_type === 'mobility' || newMetric.metric_type === 'strength'}
                  />
                  {(newMetric.metric_type === 'pain_level' || newMetric.metric_type === 'mobility' || newMetric.metric_type === 'strength') && (
                    <p className="text-xs text-muted-foreground mt-1">Auto-set based on metric type</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="modal-metric-notes">Notes</Label>
                  <Textarea
                    id="modal-metric-notes"
                    value={newMetric.notes}
                    onChange={(e) => setNewMetric(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this metric..."
                  />
                </div>
              </div>
            ) : (
              /* Goal Form */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="modal-goal-name">Goal Name</Label>
                  <Input
                    id="modal-goal-name"
                    value={newGoal.goal_name}
                    onChange={async (e) => {
                      const goalName = e.target.value;
                      setNewGoal(prev => ({ ...prev, goal_name: goalName }));
                      
                      if (goalName.trim().length >= 3 && !newGoal.linked_metric_name) {
                        const matches = await findMatchingMetrics(clientId, goalName);
                        if (matches.length > 0 && matches[0].match_score >= 0.9) {
                          setNewGoal(prev => ({
                            ...prev,
                            linked_metric_name: matches[0].metric_name,
                            auto_update_enabled: true
                          }));
                          toast.success(`Auto-linked to metric: ${matches[0].metric_name}`);
                        } else if (matches.length > 0) {
                          const topMatch = matches[0];
                          setPendingAutoLink(topMatch);
                          setShowAutoLinkDialog(true);
                        }
                      }
                    }}
                    placeholder="e.g., Reduce pain to 3/10"
                  />
                </div>
                <div>
                  <Label htmlFor="modal-target-date">Target Date</Label>
                  <Input
                    id="modal-target-date"
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="modal-description">Description</Label>
                  <Textarea
                    id="modal-description"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the goal and how it will be measured..."
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={editingMetric ? saveMetric : saveGoal}
              disabled={loading || (editingMetric ? !newMetric.metric_name.trim() : !newGoal.goal_name.trim())}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingMetric ? 'Saving...' : editingGoal ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  {editingMetric ? (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Update Metric
                    </>
                  ) : editingGoal ? (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Update Goal
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Add Goal
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-link Confirmation Dialog */}
      <AlertDialog open={showAutoLinkDialog} onOpenChange={setShowAutoLinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Link Goal to Metric?</AlertDialogTitle>
            <AlertDialogDescription>
              Found similar metric: "{pendingAutoLink?.metric_name}" ({pendingAutoLink ? Math.round(pendingAutoLink.match_score * 100) : 0}% match).
              Would you like to link this goal to it? The goal will automatically update when this metric changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAutoLink(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingAutoLink) {
                  setNewGoal(prev => ({
                    ...prev,
                    linked_metric_name: pendingAutoLink.metric_name,
                    auto_update_enabled: true
                  }));
                  toast.success(`Linked to metric: ${pendingAutoLink.metric_name}`);
                }
                setShowAutoLinkDialog(false);
                setPendingAutoLink(null);
              }}
            >
              Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

