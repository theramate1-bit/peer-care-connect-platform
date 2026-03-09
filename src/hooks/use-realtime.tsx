import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

export function useRealtimeSubscription(
  table: string,
  filter?: string,
  callback?: (payload: any) => void
) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<RealtimeSubscription | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const callbackRef = useRef(callback); // ✅ Use ref for callback

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Skip if already retrying or too many retries
    if (isRetrying || retryCount > 3) {
      console.log('⏸️ Skipping realtime subscription - too many retries');
      return;
    }
    
    // Add exponential backoff: 1s, 2s, 4s, 8s
    const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 8000);
    
    const timer = setTimeout(() => {
      // Initial data fetch
      const fetchData = async () => {
      try {
        setLoading(true);
        let query = supabase.from(table).select('*');
        
        if (filter) {
          // Parse filter correctly - handle both simple and complex filters
          if (filter.includes('=eq.')) {
            // Handle Supabase filter format: "user_id=eq.userId"
            const [column, value] = filter.split('=eq.');
            query = query.eq(column, value);
          } else if (filter.includes('=')) {
            // Handle simple format: "user_id=userId"
            const [column, value] = filter.split('=');
            query = query.eq(column, value);
          }
        }
        
        const { data: initialData, error: fetchError } = await query;
        
        if (fetchError) {
          console.log(`Table ${table} not found or error:`, fetchError.message);
          setError(fetchError.message);
          setData([]); // Set empty array instead of crashing
          
          // Increment retry count for network errors
          if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
            setIsRetrying(true);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              setIsRetrying(false);
            }, backoffDelay);
          }
        } else {
          setData(initialData || []);
          setRetryCount(0); // Reset retry count on success
        }
      } catch (err) {
        console.log(`Failed to fetch data from ${table}:`, err);
        setError('Failed to fetch data');
        setData([]); // Set empty array instead of crashing
        
        // Increment retry count for network errors
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_INSUFFICIENT_RESOURCES')) {
          setIsRetrying(true);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setIsRetrying(false);
          }, backoffDelay);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    }, backoffDelay);

    // Set up real-time subscription
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {
          console.log('Realtime update:', payload);
          
          if (callbackRef.current) { // ✅ Use ref instead of prop
            callbackRef.current(payload);
          }

          // Update local data based on event type
          setData(prevData => {
            switch (payload.eventType) {
              case 'INSERT':
                return [...prevData, payload.new];
              case 'UPDATE':
                return prevData.map(item => 
                  item.id === payload.new.id ? payload.new : item
                );
              case 'DELETE':
                return prevData.filter(item => item.id !== payload.old.id);
              default:
                return prevData;
            }
          });
        }
      )
      .subscribe();

    subscriptionRef.current = {
      channel,
      unsubscribe: () => {
        supabase.removeChannel(channel);
      }
    };

    return () => {
      clearTimeout(timer);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [table, filter, retryCount]);

  return { data, loading, error };
}

export function useRealtimeMessages(conversationId?: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (err) {
        setError('Failed to fetch messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time subscription for messages
    const channel = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, error };
}

export function useRealtimeNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // Fetch initial notifications - using correct schema (recipient_id, read_at, body)
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Transform to include computed read status and message alias
      const transformed = (data || []).map(notif => ({
        ...notif,
        read: notif.read_at !== null,
        message: notif.body,
        user_id: notif.recipient_id // Keep for backward compatibility
      }));

      setNotifications(transformed);
      setUnreadCount(transformed.filter(n => !n.read).length);
    };

    fetchNotifications();

    // Set up real-time subscription for notifications - using correct filter
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          const newNotif = {
            ...payload.new,
            read: payload.new.read_at !== null,
            message: payload.new.body,
            user_id: payload.new.recipient_id
          };
          setNotifications(prev => [newNotif, ...prev]);
          if (!newNotif.read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          const updatedNotif = {
            ...payload.new,
            read: payload.new.read_at !== null,
            message: payload.new.body,
            user_id: payload.new.recipient_id
          };
          setNotifications(prev => 
            prev.map(notif => 
              notif.id === updatedNotif.id ? updatedNotif : notif
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    // Use RPC function or update read_at directly
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } else {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    // Use RPC function for better performance
    const { data: unreadNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (fetchError || !unreadNotifications || unreadNotifications.length === 0) {
      return;
    }

    const notificationIds = unreadNotifications.map(n => n.id);
    const { error } = await supabase.rpc('mark_notifications_read', {
      p_ids: notificationIds
    });

    if (!error) {
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          read: true,
          read_at: new Date().toISOString()
        }))
      );
      setUnreadCount(0);
    } else {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}

export function useRealtimePresence(channelName: string, userId?: string) {
  const [presence, setPresence] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId
        }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users = Object.values(presenceState).flat();
        setPresence(users);
        setOnlineUsers(users.length);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, userId]);

  return { presence, onlineUsers };
}
