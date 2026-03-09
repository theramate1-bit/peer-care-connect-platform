import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, MapPin, Search, ArrowLeft, Send, UserIcon, HelpCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessagingManager } from '@/lib/messaging';
import { toast } from 'sonner';
import { parseDateSafe } from '@/lib/date';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image' | 'system';
  created_at: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  conversation_key: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  last_message_content?: string;
  unread_count: number;
  other_participant_id: string;
  other_participant_name: string;
  other_participant_role: string;
}

const RealTimeMessaging: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionContext, setSessionContext] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationSubscription = useRef<any>(null);
  const messageSubscription = useRef<any>(null);
  const sessionSubscription = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const isInquiry = searchParams.get('inquiry') === 'true';
  const targetMessageId = searchParams.get('messageId');

  useEffect(() => {
    if (user?.id) {
      loadConversations();
      setupRealtimeSubscriptions();
    }

    return () => {
      if (conversationSubscription.current) {
        supabase.removeChannel(conversationSubscription.current);
      }
      if (messageSubscription.current) {
        supabase.removeChannel(messageSubscription.current);
      }
      if (sessionSubscription.current) {
        supabase.removeChannel(sessionSubscription.current);
      }
    };
  }, [user?.id]);

  // Handle conversation selection from URL parameter
  useEffect(() => {
    const conversationIdFromUrl = searchParams.get('conversation');
    if (conversationIdFromUrl && conversations.length > 0) {
      // Find the conversation matching the URL parameter
      const conversationToSelect = conversations.find(
        conv => conv.id === conversationIdFromUrl
      );
      // Only update if we found a conversation and it's different from the currently selected one
      if (conversationToSelect && selectedConversation?.id !== conversationIdFromUrl) {
        setSelectedConversation(conversationToSelect);
      }
    }
  }, [conversations, searchParams]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      // Re-setup real-time subscription when conversation changes
      // Clean up old subscription first
      if (messageSubscription.current) {
        supabase.removeChannel(messageSubscription.current);
        messageSubscription.current = null;
      }
      if (sessionSubscription.current) {
        supabase.removeChannel(sessionSubscription.current);
        sessionSubscription.current = null;
      }
      setupRealtimeSubscriptions();
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!targetMessageId || !selectedConversation) return;
    const targetExists = messages.some((message) => message.id === targetMessageId);
    if (!targetExists) return;

    const timer = window.setTimeout(() => {
      const targetElement = document.querySelector(`[data-message-id="${targetMessageId}"]`) as HTMLElement | null;
      targetElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement?.classList.add('ring-2', 'ring-primary/50', 'rounded-lg');
      window.setTimeout(() => {
        targetElement?.classList.remove('ring-2', 'ring-primary/50', 'rounded-lg');
      }, 1800);
    }, 100);

    return () => window.clearTimeout(timer);
  }, [messages, selectedConversation, targetMessageId]);

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to conversation updates
    if (conversationSubscription.current) {
      supabase.removeChannel(conversationSubscription.current);
      conversationSubscription.current = null;
    }
    conversationSubscription.current = supabase
      .channel('conversation_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant1_id=eq.${user.id} OR participant2_id=eq.${user.id}`
        },
        (payload) => {
          loadConversations();
        }
      )
      .subscribe();

    // Subscribe to message updates for the selected conversation
    if (selectedConversation) {
      messageSubscription.current = supabase
        .channel(`message_updates_${selectedConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversation.id}`
          },
          (payload) => {
            console.log('Real-time message update:', payload);
            // Reload messages when a new message is inserted
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              loadMessages(selectedConversation.id);
            }
          }
        )
        .subscribe();

      // Subscribe to session updates so context card stays live
      // (e.g., rebook/reschedule/status changes without a new message event).
      sessionSubscription.current = supabase
        .channel(`session_context_updates_${selectedConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'client_sessions'
          },
          (payload) => {
            const row = (payload.new ?? payload.old) as {
              therapist_id?: string | null;
              client_id?: string | null;
            } | null;
            if (!row) return;

            const otherUserId = selectedConversation.other_participant_id;
            const isRelevantSession =
              (row.therapist_id === user.id && row.client_id === otherUserId) ||
              (row.therapist_id === otherUserId && row.client_id === user.id);

            if (isRelevantSession) {
              fetchSessionContext(selectedConversation.id);
            }
          }
        )
        .subscribe();
    }
  };

  const loadConversations = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      await retryOperation(async () => {
        // Get user's conversations using the RPC function
        const conversations = await MessagingManager.getUserConversations(user.id, 100, 0);
        
        // Format conversations for component
        const formattedConversations = conversations.map(conv => ({
          id: conv.conversation_id,
          conversation_key: conv.conversation_id, // Use ID as key
          participant1_id: '', // Not needed for display
          participant2_id: conv.other_participant_id,
          last_message_at: conv.last_message_at,
          last_message_content: conv.last_message_content,
          unread_count: conv.unread_count || 0,
          other_participant_id: conv.other_participant_id,
          other_participant_name: conv.other_participant_name,
          other_participant_role: conv.other_participant_role
        }))
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

        setConversations(formattedConversations);
      });
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content:encrypted_content,
          message_type,
          created_at,
          updated_at,
          sender:users!sender_id(
            id,
            first_name,
            last_name,
            avatar_url:profile_photo_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      
      // Mark messages as read
      markMessagesAsRead(conversationId);
      
      // Fetch session context for this conversation
      await fetchSessionContext(conversationId);
      
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const fetchSessionContext = async (conversationId: string) => {
    if (!user || !selectedConversation) return;

    try {
      // Get the other user ID
      const otherUserId = selectedConversation.other_participant_id;

      // Find the most recent session between these users
      const { data: session, error } = await supabase
        .from('client_sessions')
        .select('*')
        .or(`and(therapist_id.eq.${user.id},client_id.eq.${otherUserId}),and(therapist_id.eq.${otherUserId},client_id.eq.${user.id})`)
        .order('session_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching session context:', error);
      } else {
        setSessionContext(session);
      }
    } catch (error) {
      console.error('Error fetching session context:', error);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      // Get all unread messages in this conversation that weren't sent by the current user
      const { data: unreadMessages, error: fetchError } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id);

      if (fetchError) throw fetchError;

      if (!unreadMessages || unreadMessages.length === 0) return;

      // Update message status tracking for each message
      const messageIds = unreadMessages.map(m => m.id);
      
      // First, get existing tracking records
      const { data: existingTracking, error: trackingFetchError } = await supabase
        .from('message_status_tracking')
        .select('message_id')
        .in('message_id', messageIds)
        .eq('recipient_id', user.id);

      if (trackingFetchError) throw trackingFetchError;

      const existingMessageIds = new Set(existingTracking?.map(t => t.message_id) || []);
      const newMessageIds = messageIds.filter(id => !existingMessageIds.has(id));

      // Update existing tracking records to 'read'
      if (existingTracking && existingTracking.length > 0) {
        const { error: updateError } = await supabase
          .from('message_status_tracking')
          .update({ 
            message_status: 'read',
            status_updated_at: new Date().toISOString()
          })
          .in('message_id', Array.from(existingMessageIds))
          .eq('recipient_id', user.id)
          .neq('message_status', 'read');

        if (updateError) throw updateError;
      }

      // Insert new tracking records for messages that don't have tracking yet
      if (newMessageIds.length > 0) {
        const trackingRecords = newMessageIds.map(messageId => ({
          message_id: messageId,
          recipient_id: user.id,
          message_status: 'read' as const,
          status_updated_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('message_status_tracking')
          .insert(trackingRecords);

        if (insertError) throw insertError;
      }

    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id || sending) return;

    const content = newMessage.trim();
    try {
      setSending(true);

      const messageId = await MessagingManager.sendMessage(
        selectedConversation.id,
        user.id,
        content,
        'text'
      );

      setNewMessage('');

      // Create canonical in-app message notification for the recipient.
      try {
        if (messageId) {
          const { NotificationSystem } = await import('@/lib/notification-system');
          await NotificationSystem.sendMessageNotification(
            selectedConversation.id,
            messageId,
            user.id,
            selectedConversation.other_participant_id,
            content
          );
        }
      } catch (notifError) {
        // Keep message delivery successful even if notification creation fails.
        console.error('Error creating in-app message notification:', notifError);
      }

      await loadMessages(selectedConversation.id);
      toast.success('Message sent');

      // Notify guest by email if the recipient is a guest (Edge Function no-ops if not)
      try {
        await supabase.functions.invoke('notify-guest-message', {
          body: {
            conversationId: selectedConversation.id,
            messageId: messageId ?? undefined,
            messagePreview: content.slice(0, 120),
          },
        });
      } catch (_) {
        // Non-blocking: email notification failure should not affect UX
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Retry utility for critical operations
  const retryOperation = async <T,>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
    throw new Error('Max retries exceeded');
  };

  const handleCreateNoteFromMessages = async () => {
    if (!selectedConversation || !messages.length || !user) return;

    try {
      // Find related session
      const { data: sessions } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user.id)
        .eq('client_id', selectedConversation.other_participant_id)
        .order('session_date', { ascending: false })
        .limit(1);

      if (!sessions || sessions.length === 0) {
        toast.error('No session found for this client');
        return;
      }

      const session = sessions[0];

      // Extract client messages for subjective section
      const clientMessages = messages
        .filter(m => m.sender_id === selectedConversation.other_participant_id)
        .map(m => m.content)
        .join('\n\n');

      // Navigate to client management with pre-populated data
      // Get client email from session
      const clientEmail = session.client_email || session.client_id;
      navigate(`/practice/clients?session=${session.id}&subjective=${encodeURIComponent(clientMessages)}&client=${encodeURIComponent(clientEmail)}`);
      toast.success('Navigating to treatment notes...');
    } catch (error) {
      console.error('Error creating note from messages:', error);
      toast.error('Failed to create note');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_participant_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] bg-background border rounded-lg overflow-hidden">
      {/* Conversations Sidebar */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 border-r bg-muted/20 flex-col`}>
        <div className="p-3 sm:p-4 border-b">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          <h2 className="text-lg font-semibold">Messages</h2>
        </div>

        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchTerm ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-primary/10 border-primary/20'
                    : ''
                }`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {conversation.other_participant_name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">
                        {conversation.other_participant_name}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(conversation.last_message_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message_content || 'No messages yet'}
                      </p>
                      {conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className={`${!selectedConversation ? 'hidden lg:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-3 sm:p-4 border-b bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden flex-shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {selectedConversation.other_participant_name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {selectedConversation.other_participant_name}
                      </h3>
                      {isInquiry && (
                        <Badge variant="secondary" className="text-xs">
                          <HelpCircle className="h-3 w-3 mr-1" />
                          Pre-Booking Inquiry
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.other_participant_role}
                    </p>
                  </div>
                </div>

                {/* Session Context */}
                {sessionContext && (() => {
                  // Check if session is in the past
                  const sessionDateTime = new Date(sessionContext.session_date);
                  const [hours, minutes] = (sessionContext.start_time || '').split(':').map(Number);
                  if (!isNaN(hours)) {
                    sessionDateTime.setHours(hours, minutes || 0, 0, 0);
                  }
                  const isPast = sessionDateTime < new Date();
                  const displayStatus = isPast && ['scheduled', 'confirmed'].includes(sessionContext.status) 
                    ? 'missed' 
                    : sessionContext.status;
                  const isUpcoming = !isPast;
                  
                  return (
                    <div className={`mt-3 p-3 border rounded-lg ${isPast ? 'bg-warning/10 border-warning/30' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className={`h-4 w-4 ${isPast ? 'text-warning' : 'text-blue-600'}`} />
                        <span className={`text-sm font-medium ${isPast ? 'text-warning' : 'text-blue-800'}`}>
                          {isUpcoming ? 'Upcoming Session' : 'Session'}
                        </span>
                    </div>
                      <div className={`space-y-1 text-sm ${isPast ? 'text-warning/90' : 'text-blue-700'}`}>
                      <div key="session-time" className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{parseDateSafe(sessionContext.session_date).toLocaleDateString()} at {sessionContext.start_time?.substring(0, 5) || sessionContext.start_time}</span>
                      </div>
                      <div key="session-details" className="flex items-center gap-2">
                        <span className="font-medium">{sessionContext.session_type}</span>
                        <span>•</span>
                        <span>£{sessionContext.price}</span>
                      </div>
                        {displayStatus && (
                          <Badge 
                            key="session-status" 
                            variant={displayStatus === 'missed' ? 'destructive' : displayStatus === 'scheduled' ? 'default' : 'secondary'} 
                            className="text-xs"
                          >
                            {displayStatus.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  );
                })()}

                <div className="flex items-center gap-2">
                  {/* Create Note from Messages - Practitioners only, but NOT for practitioner-to-practitioner conversations */}
                  {userProfile?.user_role !== 'client' && 
                   selectedConversation?.other_participant_role === 'client' && 
                   messages.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateNoteFromMessages}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Create Note
                    </Button>
                  )}
                  
                  {/* Quick Booking - Show in inquiry conversations */}
                  {isInquiry && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/marketplace?practitioner=${selectedConversation.other_participant_id}`)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Session
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-2 sm:p-4">
              <div className="space-y-3 sm:space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      data-message-id={message.id}
                      className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'} px-2 sm:px-0`}
                    >
                <div
                  className={`max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md px-3 sm:px-4 py-2 rounded-lg break-words ${
                    message.sender_id === user?.id
                      ? 'bg-white text-gray-900 border border-gray-200'
                      : 'bg-muted'
                  }`}
                >
                        {/* Render based on message type */}
                        {message.message_type === 'image' ? (
                          <div className="space-y-2">
                            <img 
                              src={message.content} 
                              alt="Shared image" 
                              className="rounded max-w-full h-auto cursor-pointer"
                              onClick={() => window.open(message.content, '_blank')}
                            />
                          </div>
                        ) : message.message_type === 'file' ? (
                          <div className="flex items-center gap-2 p-2 bg-background/10 rounded">
                            <Paperclip className="h-4 w-4 flex-shrink-0" />
                            <a 
                              href={message.content} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm underline hover:no-underline break-all"
                            >
                              View File
                            </a>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                        <p className={`text-xs mt-1.5 ${
                          message.sender_id === user?.id
                            ? 'text-gray-500'
                            : 'text-muted-foreground'
                        }`}>
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-2 sm:p-4 border-t bg-muted/20">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="flex-1 min-w-0">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="text-sm sm:text-base"
                  />
                </div>
                
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="sm"
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeMessaging;
