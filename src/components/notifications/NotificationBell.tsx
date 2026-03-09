import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, Check, Trash2, Calendar, MessageSquare, CheckCircle, Info } from 'lucide-react';
import { useRealtimeNotifications } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications(user?.id);
  const [isOpen, setIsOpen] = useState(false);

  // Group and deduplicate notifications
  const processedNotifications = useMemo(() => {
    // Filter out notifications older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recent = notifications.filter(n => 
      new Date(n.created_at) > thirtyDaysAgo
    );

    // Group similar notifications by type and content
    const grouped = new Map<string, any[]>();
    
    recent.forEach(notif => {
      // Create a key based on type and simplified message
      const key = `${notif.type}_${notif.title}_${notif.body?.substring(0, 50) || ''}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(notif);
    });

    // For each group, keep only the most recent one if there are duplicates
    const deduplicated: any[] = [];
    grouped.forEach((group) => {
      if (group.length === 1) {
        deduplicated.push(group[0]);
      } else {
        // If duplicates, keep the most recent one
        const sorted = group.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        deduplicated.push(sorted[0]);
      }
    });

    // Sort by most recent first
    return deduplicated.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications]);

  // Clean up time strings in notification messages (remove seconds)
  const cleanMessage = (message: string) => {
    if (!message) return '';
    // Replace time patterns like "10:00:00" with "10:00"
    return message.replace(/(\d{1,2}):(\d{2}):(\d{2})/g, '$1:$2');
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    // Delete notification logic would go here if needed
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
      case 'booking_confirmed':
      case 'booking_cancelled':
        return <Calendar className="h-4 w-4 text-emerald-600" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'payment':
      case 'payment_confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'system':
      case 'treatment_exchange':
      case 'exchange_request':
        return <Info className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <Bell className="h-5 w-5 text-emerald-600" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-emerald-500 hover:bg-emerald-600"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        {/* Notifications List */}
        <ScrollArea className="h-[500px]">
          {processedNotifications.length === 0 ? (
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
                      {getNotificationIcon(notification.type || 'system')}
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
                            {cleanMessage(notification.body || notification.message || '')}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
