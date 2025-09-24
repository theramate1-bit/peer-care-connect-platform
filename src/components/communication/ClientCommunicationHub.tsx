import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Send, 
  Phone, 
  Video, 
  Mail, 
  Clock, 
  User, 
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Bell,
  BellOff
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface Conversation {
  id: string;
  client_id: string;
  therapist_id: string;
  client_name: string;
  therapist_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  read: boolean;
  created_at: string;
}

interface ClientCommunicationHubProps {
  className?: string;
}

export const ClientCommunicationHub: React.FC<ClientCommunicationHubProps> = ({
  className
}) => {
  const { user, userProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Real-time subscription for conversations
  const { data: realtimeConversations } = useRealtimeSubscription(
    'conversations',
    `client_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time conversation update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setConversations(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setConversations(prev => 
          prev.map(conversation => 
            conversation.id === payload.new.id ? payload.new : conversation
          )
        );
      }
    }
  );

  // Real-time subscription for messages
  const { data: realtimeMessages } = useRealtimeSubscription(
    'messages',
    `conversation_id=eq.${selectedConversation?.id}`,
    (payload) => {
      console.log('Real-time message update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setMessages(prev => [payload.new, ...prev]);
        
        // Show notification for new messages
        if (notificationsEnabled && payload.new.sender_id !== user?.id) {
          toast.info('New message', {
            description: payload.new.content.substring(0, 50) + '...',
            duration: 3000
          });
        }
      } else if (payload.eventType === 'UPDATE') {
        setMessages(prev => 
          prev.map(message => 
            message.id === payload.new.id ? payload.new : message
          )
        );
      }
    }
  );

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          client:client_id (first_name, last_name),
          therapist:therapist_id (first_name, last_name)
        `)
        .eq('client_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const conversationsData = data?.map(conv => ({
        ...conv,
        client_name: `${conv.client.first_name} ${conv.client.last_name}`,
        therapist_name: `${conv.therapist.first_name} ${conv.therapist.last_name}`
      })) || [];

      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedConversation) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (first_name, last_name)
        `)
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messagesData = data?.map(msg => ({
        ...msg,
        sender_name: `${msg.sender.first_name} ${msg.sender.last_name}`
      })) || [];

      setMessages(messagesData);
      
      // Mark messages as read
      markMessagesAsRead();
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', selectedConversation.id)
        .eq('sender_id', selectedConversation.therapist_id)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user?.id,
          content: newMessage.trim(),
          message_type: 'text',
          read: false
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [data, ...prev]);
      setNewMessage('');

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: newMessage.trim(),
          last_message_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConversation.id);

      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const startVideoCall = () => {
    toast.info('Video calling feature coming soon');
  };

  const startPhoneCall = () => {
    toast.info('Phone calling feature coming soon');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations.filter(conv =>
    conv.therapist_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.last_message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Communication Hub
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={notificationsEnabled ? 'bg-green-100 text-green-800' : ''}
              >
                {notificationsEnabled ? (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications ON
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Notifications OFF
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conversations</CardTitle>
              <Badge variant="outline">{conversations.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                <p>No conversations yet</p>
                <p className="text-sm">Start a conversation with your therapist</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b ${
                      selectedConversation?.id === conversation.id ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{conversation.therapist_name}</h4>
                          {conversation.unread_count > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.last_message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(conversation.last_message_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="lg:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{selectedConversation.therapist_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">Therapist</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={startPhoneCall}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm" onClick={startVideoCall}>
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages */}
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation below</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs opacity-70">
                              {formatTime(message.created_at)}
                            </span>
                            {message.sender_id === user?.id && (
                              <CheckCircle className={`h-3 w-3 ${message.read ? 'text-blue-400' : 'text-gray-400'}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};
