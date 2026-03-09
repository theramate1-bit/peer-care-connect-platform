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
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { formatDistanceToNow } from 'date-fns';
import { formatTimeHHMM } from '@/lib/date';
import { useNavigate } from 'react-router-dom';
import { cleanNotificationMessage, handleNotificationNavigation, normalizeNotification, parseNotificationRows, type Notification, type NormalizedNotification } from '@/lib/notification-utils';

interface RealTimeNotificationsProps {
  className?: string;
}

export const RealTimeNotifications: React.FC<RealTimeNotificationsProps> = ({
  className
}) => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NormalizedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Real-time subscription for notifications - using correct schema
  const { data: realtimeNotifications } = useRealtimeSubscription(
    'notifications',
    `recipient_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time notification update:', payload);
      
      if (payload.eventType === 'INSERT') {
        const newNotif = normalizeNotification(payload.new as Notification);
        setNotifications(prev => [newNotif, ...prev]);
        if (!newNotif.read) {
          setUnreadCount(prev => prev + 1);
          // Show toast notification
          toast.info(newNotif.title, {
            description: newNotif.message,
            duration: 5000
          });
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedNotif = normalizeNotification(payload.new as Notification);
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === updatedNotif.id ? updatedNotif : notification
          )
        );
        
        // Update unread count
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
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const transformed = parseNotificationRows((data || []) as Notification[]);

      setNotifications(transformed);
      setUnreadCount(transformed.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh when dropdown opens to avoid stale local state.
  useEffect(() => {
    if (isOpen) {
      void fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;
    const target = notifications.find((n) => n.id === notificationId);
    if (!target || target.read) return;

    // Optimistic update for immediate UI feedback.
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      // Preferred path: shared RPC used elsewhere for consistency.
      const { error: rpcError } = await supabase.rpc('mark_notifications_read', {
        p_ids: [notificationId],
      });

      if (!rpcError) return;

      // Fallback path: direct update scoped to recipient.
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('recipient_id', user.id);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Re-sync local state if server update failed.
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: false } : notification
        )
      );
      setUnreadCount((prev) => prev + 1);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update so the dropdown reflects action immediately.
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
    setUnreadCount(0);

    try {
      // Preferred path: shared RPC.
      const { error: rpcError } = await supabase.rpc('mark_notifications_read', {
        p_ids: unreadIds
      });

      if (!rpcError) return;

      // Fallback: direct update scoped to current recipient.
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .in('id', unreadIds);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Could not mark all notifications as read');
      void fetchNotifications();
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const existing = notifications.find((n) => n.id === notificationId);
    if (!existing) return;

    // Optimistic remove from list.
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (!existing.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('recipient_id', user?.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Could not delete notification');
      void fetchNotifications();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'client_check_in': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'session_reminder': return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'message':
      case 'new_message':
        return <MessageSquare className="h-4 w-4 text-purple-600" />;
      case 'payment': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'system': return <Info className="h-4 w-4 text-gray-600" />;
      default: return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  // Keep normalized notifications; no content-based grouping for actionable events.
  const processedNotifications = useMemo(() => {
    // Filter out notifications older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return notifications.filter(n => 
      new Date(n.created_at || 0) > thirtyDaysAgo
    );
  }, [notifications]);

  // Handle notification click with consistent navigation
  const handleNotificationClick = useCallback((notification: NormalizedNotification) => {
    handleNotificationNavigation(notification, navigate, markAsRead, userProfile?.user_role);
    setIsOpen(false); // Close dropdown after navigation
  }, [navigate, userProfile?.user_role]);

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-emerald-600" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs text-white bg-emerald-500 hover:bg-emerald-600"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mx-auto"></div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading...</p>
              </div>
            ) : processedNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {processedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group ${
                      !notification.read ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 mt-0.5 p-2 rounded-lg ${
                        !notification.read 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                          : 'bg-slate-100 dark:bg-slate-700'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium mb-1 ${
                              !notification.read 
                                ? 'text-slate-900 dark:text-white' 
                                : 'text-slate-600 dark:text-slate-400'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mb-2 leading-relaxed">
                              {cleanNotificationMessage(notification)}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {formatDistanceToNow(new Date(notification.created_at || 0), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-slate-400" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};



