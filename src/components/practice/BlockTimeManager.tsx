import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  Coffee,
  User,
  Ban,
  Check
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import { TimeRangePicker } from '@/components/ui/time-range-picker';
import { cn } from '@/lib/utils';

interface BlockedTime {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  event_type: 'block' | 'unavailable';
  title: string;
  description?: string;
  status: string;
}

interface BlockTimeManagerProps {
  embedded?: boolean;
  className?: string;
}

type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

const QUICK_BLOCKS = [
  { label: 'Lunch Break', title: 'Lunch Break', duration: 60, icon: Coffee },
  { label: 'Personal Time', title: 'Personal Appointment', duration: 120, icon: User },
  { label: 'Unavailable', title: 'Unavailable', duration: 240, icon: Ban },
];

export const BlockTimeManager: React.FC<BlockTimeManagerProps> = ({
  embedded = false,
  className
}) => {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BlockedTime | null>(null);
  const [deletingBlock, setDeletingBlock] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'block' as 'block' | 'unavailable',
    date: '',
    start_time: '',
    end_time: '',
    all_day: false,
    recurrence_type: 'none' as RecurrenceType,
    recurrence_end_date: ''
  });

  useEffect(() => {
    if (user) {
      fetchBlocks();
    }
  }, [user]);

  const fetchBlocks = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .in('event_type', ['block', 'unavailable'])
        .eq('status', 'confirmed')
        .gt('end_time', now)
        .order('start_time', { ascending: true });

      if (error) throw error;

      setBlocks((data || []) as BlockedTime[]);
    } catch (error: any) {
      console.error('Error fetching blocks:', error);
      toast.error('Failed to load blocked time');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'block',
      date: '',
      start_time: '',
      end_time: '',
      all_day: false,
      recurrence_type: 'none',
      recurrence_end_date: ''
    });
    setEditingBlock(null);
    setShowForm(false);
  };

  const handleQuickBlock = (quickBlock: typeof QUICK_BLOCKS[0]) => {
    const today = new Date();
    const defaultStart = '12:00'; // Default to noon
    const [h, m] = defaultStart.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(h, m + quickBlock.duration, 0, 0);
    const defaultEnd = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

    setFormData({
      title: quickBlock.title,
      description: '',
      event_type: quickBlock.label === 'Unavailable' ? 'unavailable' : 'block',
      date: format(today, 'yyyy-MM-dd'),
      start_time: defaultStart,
      end_time: defaultEnd,
      all_day: false,
      recurrence_type: 'none',
      recurrence_end_date: ''
    });
    setShowForm(true);
  };

  const handleEditBlock = (block: BlockedTime) => {
    const startDate = parseISO(block.start_time);
    const endDate = parseISO(block.end_time);

    setEditingBlock(block);
    setFormData({
      title: block.title,
      description: block.description || '',
      event_type: block.event_type,
      date: format(startDate, 'yyyy-MM-dd'),
      start_time: format(startDate, 'HH:mm'),
      end_time: format(endDate, 'HH:mm'),
      all_day: false,
      recurrence_type: 'none',
      recurrence_end_date: ''
    });
    setShowForm(true);
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Are you sure you want to delete this blocked time?')) return;

    try {
      setDeletingBlock(blockId);
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', blockId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Blocked time deleted');
      fetchBlocks();
    } catch (error: any) {
      console.error('Error deleting block:', error);
      toast.error('Failed to delete blocked time');
    } finally {
      setDeletingBlock(null);
    }
  };

  const handleSaveBlock = async () => {
    if (!user?.id) return;

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!formData.date) {
      toast.error('Please select a date');
      return;
    }

    if (!formData.all_day && (!formData.start_time || !formData.end_time)) {
      toast.error('Please select start and end times');
      return;
    }

    if (!formData.all_day && formData.start_time >= formData.end_time) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      let startTime: Date;
      let endTime: Date;

      if (formData.all_day) {
        startTime = startOfDay(new Date(formData.date));
        endTime = endOfDay(new Date(formData.date));
      } else {
        startTime = new Date(`${formData.date}T${formData.start_time}`);
        endTime = new Date(`${formData.date}T${formData.end_time}`);
      }

      if (formData.recurrence_type !== 'none' && formData.recurrence_end_date) {
        const events = generateRecurringEvents(
          startTime,
          endTime,
          formData.recurrence_type,
          new Date(formData.recurrence_end_date)
        );

        const eventsToInsert = events.map(event => ({
          user_id: user.id,
          title: formData.title,
          description: formData.description || null,
          start_time: event.start.toISOString(),
          end_time: event.end.toISOString(),
          event_type: formData.event_type,
          status: 'confirmed',
          source: 'internal',
          provider: 'internal'
        }));

        const { error } = await supabase
          .from('calendar_events')
          .insert(eventsToInsert);

        if (error) throw error;

        toast.success(`Created ${events.length} recurring blocks`);
      } else {
        const blockData = {
          user_id: user.id,
          title: formData.title,
          description: formData.description || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          event_type: formData.event_type,
          status: 'confirmed',
          source: 'internal',
          provider: 'internal'
        };

        if (editingBlock) {
          const { error } = await supabase
            .from('calendar_events')
            .update(blockData)
            .eq('id', editingBlock.id)
            .eq('user_id', user.id);

          if (error) throw error;
          toast.success('Blocked time updated');
        } else {
          const { error } = await supabase
            .from('calendar_events')
            .insert(blockData);

          if (error) throw error;
          toast.success('Blocked time created');
        }
      }

      resetForm();
      fetchBlocks();
    } catch (error: any) {
      console.error('Error saving block:', error);
      toast.error(error.message || 'Failed to save blocked time');
    }
  };

  const generateRecurringEvents = (
    startTime: Date,
    endTime: Date,
    recurrenceType: RecurrenceType,
    endDate: Date
  ): Array<{ start: Date; end: Date }> => {
    const events: Array<{ start: Date; end: Date }> = [];
    let current = new Date(startTime);

    while (current <= endDate) {
      events.push({
        start: new Date(current),
        end: new Date(endTime.getTime() + (current.getTime() - startTime.getTime()))
      });

      switch (recurrenceType) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
        default:
          break;
      }
    }

    return events;
  };

  const formatBlockTime = (block: BlockedTime) => {
    const start = parseISO(block.start_time);
    const end = parseISO(block.end_time);

    const isAllDay =
      format(start, 'HH:mm') === '00:00' &&
      format(end, 'HH:mm') === '23:59';

    if (isAllDay) {
      return format(start, 'MMM d, yyyy') + ' (All day)';
    }

    return `${format(start, 'MMM d, yyyy')} ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading blocked time...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {!embedded && (
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Blocked Time</h2>
          <p className="text-sm text-muted-foreground">
            One-off blocks (lunch, appointments, unavailability). These slots are removed from your bookable availability and are separate from your recurring working hours.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      {!showForm && (
        <Card className="mb-6 border-2 bg-gradient-to-br from-muted/30 to-muted/10">
          <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground mr-1">Quick add:</span>
            {QUICK_BLOCKS.map((quickBlock) => {
              const Icon = quickBlock.icon;
              return (
                <Button
                  key={quickBlock.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickBlock(quickBlock)}
                    className="gap-2 shadow-sm transition-[border-color,background-color] duration-200"
                >
                  <Icon className="h-4 w-4" />
                  {quickBlock.label}
                </Button>
              );
            })}
            <Button
                variant="default"
              size="sm"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  date: format(new Date(), 'yyyy-MM-dd')
                }));
                setShowForm(true);
              }}
                className="gap-2 ml-auto shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Custom Block
            </Button>
          </div>
          </CardContent>
        </Card>
      )}

      {/* Inline Form */}
      {showForm && (
        <Card className="mb-6 border-2 border-primary/30 shadow-lg">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/20">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold">
                {editingBlock ? 'Edit Blocked Time' : 'Block Time'}
              </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetForm}
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Lunch Break"
                />
              </div>

              {/* Event Type */}
              <div className="space-y-2">
                <Label htmlFor="event_type">Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value: 'block' | 'unavailable') =>
                    setFormData({ ...formData, event_type: value })
                  }
                >
                  <SelectTrigger id="event_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">Block (e.g., lunch break)</SelectItem>
                    <SelectItem value="unavailable">Unavailable (personal time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add any additional details..."
                rows={2}
              />
            </div>

            {/* Date & All Day */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex items-end space-x-2">
                <div className="flex items-center space-x-2 flex-1">
                  <Checkbox
                    id="all_day"
                    checked={formData.all_day}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, all_day: checked as boolean })
                    }
                  />
                  <Label htmlFor="all_day" className="cursor-pointer">
                    All day
                  </Label>
                </div>
              </div>
            </div>

            {/* Time Range (if not all day) */}
            {!formData.all_day && (
              <div className="space-y-2">
                <Label>Time Range *</Label>
                <TimeRangePicker
                  startTime={formData.start_time}
                  endTime={formData.end_time}
                  onChange={(start, end) => setFormData({
                    ...formData,
                    start_time: start,
                    end_time: end
                  })}
                  intervalMinutes={15}
                />
              </div>
            )}

            {/* Recurrence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recurrence_type">Recurrence</Label>
                <Select
                  value={formData.recurrence_type}
                  onValueChange={(value: RecurrenceType) =>
                    setFormData({ ...formData, recurrence_type: value })
                  }
                >
                  <SelectTrigger id="recurrence_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No recurrence</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence_type !== 'none' && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence_end_date">Repeat Until *</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                    min={formData.date}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSaveBlock} className="gap-2">
                <Check className="h-4 w-4" />
                {editingBlock ? 'Update' : 'Create'} Block
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocks List */}
      {blocks.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground text-center mb-2">
              No blocked time configured
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Use the quick actions above to add lunch breaks, personal appointments, or custom blocked time
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => (
            <Card key={block.id} className="hover:border-primary/30 transition-[border-color,background-color] duration-200 ease-out border-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{block.title}</h3>
                      <Badge 
                        variant={block.event_type === 'block' ? 'secondary' : 'outline'}
                        className="shrink-0"
                      >
                        {block.event_type === 'block' ? 'Block' : 'Unavailable'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="truncate">{formatBlockTime(block)}</span>
                    </div>
                    {block.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {block.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditBlock(block)}
                      className="h-8 w-8"
                      aria-label={`Edit blocked time from ${block.start_time} to ${block.end_time}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteBlock(block.id)}
                      disabled={deletingBlock === block.id}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label={`Delete blocked time from ${block.start_time} to ${block.end_time}`}
                    >
                      {deletingBlock === block.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
