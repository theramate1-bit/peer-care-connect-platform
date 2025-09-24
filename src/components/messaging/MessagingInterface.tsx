import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  MoreVertical, 
  Phone, 
  Video, 
  Search,
  Archive,
  Block,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessagingManager, Conversation, Message } from '@/lib/messaging';
import ConversationList from './ConversationList';
import MessageDisplay from './MessageDisplay';
import MessageInput from './MessageInput';

interface Conversation {
  id: string;
  conversation_key: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  last_message_id: string;
  conversation_status: 'active' | 'archived' | 'blocked';
  created_at: string;
  updated_at: string;
  other_user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'file' | 'image' | 'document' | 'system';
  encrypted_content: string;
  content_hash: string;
  message_status: 'sent' | 'delivered' | 'read' | 'failed';
  is_edited: boolean;
  edited_at?: string;
  reply_to_message_id?: string;
  created_at: string;
  updated_at: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  attachments?: any[];
  reply_to_message?: {
    id: string;
    encrypted_content: string;
    message_type: string;
    sender: {
      first_name: string;
      last_name: string;
    };
  };
}

const MessagingInterface: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<{
    id: string;
    content: string;
    senderName: string;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationSubscription = useRef<any>(null);
  const messageSubscription = useRef<any>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      setupRealtimeSubscriptions();
    }

    return () => {
      if (conversationSubscription.current) {
        supabase.removeChannel(conversationSubscription.current);
      }
      if (messageSubscription.current) {
        supabase.removeChannel(messageSubscription.current);
      }
    };
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to conversation updates
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
          fetchConversations();
        }
      )
      .subscribe();

    // Subscribe to message updates
    messageSubscription.current = supabase
      .channel('message_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (selectedConversation && payload.new?.conversation_id === selectedConversation.id) {
            fetchMessages(selectedConversation.id);
          }
        }
      )
      .subscribe();
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch conversations where user is participant1
      const { data: participant1Data, error: error1 } = await supabase
        .from('conversations')
        .select(`
          *,
          other_user:users!conversations_participant2_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('participant1_id', user.id)
        .eq('conversation_status', 'active')
        .order('last_message_at', { ascending: false });

      if (error1) throw error1;

      // Fetch conversations where user is participant2
      const { data: participant2Data, error: error2 } = await supabase
        .from('conversations')
        .select(`
          *,
          other_user:users!conversations_participant1_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('participant2_id', user.id)
        .eq('conversation_status', 'active')
        .order('last_message_at', { ascending: false });

      if (error2) throw error2;

      // Combine and sort conversations
      const allConversations = [...(participant1Data || []), ...(participant2Data || [])]
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      setConversations(allConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!conversationId) return;

    try {
      setMessagesLoading(true);
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(
            id,
            first_name,
            last_name,
            avatar_url
          ),
          attachments:message_attachments(*),
          reply_to_message:messages(
            id,
            encrypted_content,
            message_type,
            sender:users(first_name, last_name)
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      
      // Mark messages as read
      markMessagesAsRead(conversationId);
      
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      // Update message status tracking
      await supabase
        .from('message_status_tracking')
        .update({ message_status: 'read' })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', user.id)
        .eq('message_status', 'delivered');

      // Mark notifications as read
      await supabase
        .from('message_notifications')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .eq('is_read', false);

    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
      setReplyToMessage(null);
    }
  };

  const handleMessageSent = () => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      fetchConversations(); // Update conversation list with new last message
    }
  };

  const handleReply = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyToMessage({
        id: messageId,
        content: message.encrypted_content,
        senderName: `${message.sender.first_name} ${message.sender.last_name}`
      });
    }
  };

  const handleReaction = async (messageId: string, reaction: 'helpful' | 'unhelpful') => {
    // In a real implementation, you would save reactions to the database
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getDisplayName = (conversation: Conversation) => {
    if (conversation.other_user) {
      return `${conversation.other_user.first_name} ${conversation.other_user.last_name}`;
    }
    return 'Unknown User';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Messages</CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-4rem)] overflow-y-auto">
                <ConversationList
                  onConversationSelect={handleConversationSelect}
                  selectedConversationId={selectedConversation?.id}
                />
              </CardContent>
            </Card>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Conversation Header */}
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedConversation(null)}
                          className="lg:hidden"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        
                        <Avatar className="w-10 h-10">
                          <AvatarImage 
                            src={selectedConversation.other_user?.avatar_url} 
                            alt={getDisplayName(selectedConversation)}
                          />
                          <AvatarFallback>
                            {selectedConversation.other_user?.first_name?.[0]}{selectedConversation.other_user?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {getDisplayName(selectedConversation)}
                          </h3>
                          <p className="text-sm text-gray-500">Active now</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Video className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messagesLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="flex items-start space-x-2">
                              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-24"></div>
                                <div className="h-16 bg-gray-200 rounded w-48"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <MessageDisplay
                          key={message.id}
                          message={message}
                          isOwnMessage={message.sender_id === user?.id}
                          onReply={handleReply}
                          onReaction={handleReaction}
                        />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </CardContent>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <MessageInput
                      conversationId={selectedConversation.id}
                      onMessageSent={handleMessageSent}
                      replyToMessage={replyToMessage}
                      onCancelReply={() => setReplyToMessage(null)}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p className="text-sm">Choose a conversation from the list to start messaging</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagingInterface;
