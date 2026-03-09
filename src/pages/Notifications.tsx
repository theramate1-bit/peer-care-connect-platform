import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellRing, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Calendar,
  User as UserIcon,
  MessageSquare,
  Clock,
  X,
  Check,
  Trash2,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { formatDistanceToNow } from 'date-fns';
import { formatTimeHHMM, getFriendlyDateLabel } from '@/lib/date';
import { useNavigate } from 'react-router-dom';
import { FadeIn } from '@/components/ui/fade-in';
import { cleanNotificationMessage, handleNotificationNavigation, normalizeNotification, parseNotificationRows, type Notification, type NormalizedNotification } from '@/lib/notification-utils';

type FilterType = 'all' | 'unread' | 'read';

const Notifications = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NormalizedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Real-time subscription for notifications
  const { data: realtimeNotifications } = useRealtimeSubscription(
    'notifications',
    `recipient_id=eq.${user?.id}`,
    (payload) => {
      if (payload.eventType === 'INSERT') {
        const newNotif = normalizeNotification(payload.new as Notification);
        setNotifications(prev => [newNotif, ...prev]);
        if (!newNotif.read) {
          setUnreadCount(prev => prev + 1);
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedNotif = normalizeNotification(payload.new as Notification);
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === updatedNotif.id ? updatedNotif : notification
          )
        );
        
        const wasRead = payload.old.read_at !== null;
        const isRead = updatedNotif.read;
        if (!wasRead && isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        } else if (wasRead && !isRead) {
          setUnreadCount(prev => prev + 1);
        }
      } else if (payload.eventType === 'DELETE') {
        setNotifications(prev => 
          prev.filter(notification => notification.id !== payload.old.id)
        );
        const wasRead = payload.old.read_at !== null;
        if (!wasRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    }
  );

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      // Filter out notifications older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const transformed = parseNotificationRows((data || []) as Notification[]);

      setNotifications(transformed);
      setUnreadCount(transformed.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      if (unreadNotifications.length === 0) return;

      const notificationIds = unreadNotifications.map(n => n.id);
      
      // Try RPC function first, fallback to individual updates
      const { error: rpcError } = await supabase.rpc('mark_notifications_read', {
        p_ids: notificationIds
      });

      if (rpcError) {
        // Fallback to individual updates
        for (const id of notificationIds) {
          await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', id);
        }
      }

      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          read: true
        }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      setDeletingId(notificationId);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    } finally {
      setDeletingId(null);
    }
  };

  const handleNotificationClick = (notification: NormalizedNotification) => {
    handleNotificationNavigation(notification, navigate, markAsRead, userProfile?.user_role);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmation':
      case 'booking_confirmed':
      case 'session_reminder':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'message':
      case 'new_message':
        return <MessageSquare className="h-5 w-5 text-emerald-500" />;
      case 'treatment_exchange_request':
        return <UserIcon className="h-5 w-5 text-purple-500" />;
      case 'payment_confirmation':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-slate-500" />;
    }
  };

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.read);
  }, [notifications, filter]);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FadeIn delay={0.1}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Mark all as read
              </Button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-6">
            <Filter className="h-4 w-4 text-gray-500" />
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({notifications.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </Button>
              <Button
                variant={filter === 'read' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('read')}
              >
                Read ({notifications.length - unreadCount})
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 
                   filter === 'read' ? 'No read notifications' : 
                   'No notifications'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {filter === 'unread' ? 'You\'re all caught up!' : 
                   'Notifications will appear here when you receive them.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => (
                <Card
                  key={notif.id}
                  className={`cursor-pointer transition-[border-color,background-color] duration-200 ease-out ${
                    !notif.read 
                      ? 'border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' 
                      : 'border-l-4 border-l-transparent'
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`font-semibold text-sm ${
                            !notif.read 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notif.title}
                          </h3>
                          {!notif.read && (
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {cleanNotificationMessage(notif)}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(notif.created_at || 0), { addSuffix: true })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!notif.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notif.id);
                                }}
                                className="h-7 text-xs"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Mark read
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              disabled={deletingId === notif.id}
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deletingId === notif.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </FadeIn>
      </div>
    </div>
  );
};

export default Notifications;


