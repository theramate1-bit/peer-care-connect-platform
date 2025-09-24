import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Send, User, Clock, Search, Plus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender: {
    first_name: string;
    last_name: string;
    user_role: string;
  };
  recipient: {
    first_name: string;
    last_name: string;
    user_role: string;
  };
}

interface Conversation {
  id: string;
  other_user: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
  };
  last_message: Message | null;
  unread_count: number;
}

const Messages = () => {
  const { user, userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [initialMessage, setInitialMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (showNewConversation) {
      loadAvailableUsers();
    }
  }, [showNewConversation]);

  useEffect(() => {
    const userId = searchParams.get('user');
    if (userId && conversations.length > 0) {
      // Check if we already have a conversation with this user
      const existingConversation = conversations.find(conv => conv.other_user.id === userId);
      if (existingConversation) {
        setSelectedConversation(userId);
      } else {
        // Open new conversation dialog with this user pre-selected
        setShowNewConversation(true);
        setSelectedUser(userId);
      }
    }
  }, [searchParams, conversations]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Get messages where user is either sender or recipient
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          created_at,
          read_at
        `)
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs for conversations
      const userIds = new Set<string>();
      (data || []).forEach(message => {
        userIds.add(message.sender_id);
        userIds.add(message.recipient_id);
      });

      // Get user details for all conversation partners
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, user_role')
        .in('id', Array.from(userIds));

      if (usersError) throw usersError;

      // Create user lookup map
      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();
      
      (data || []).forEach((message) => {
        const otherUserId = message.sender_id === user?.id ? message.recipient_id : message.sender_id;
        const otherUser = userMap.get(otherUserId);
        
        if (!otherUser) return;
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: otherUserId,
            other_user: {
              id: otherUserId,
              first_name: otherUser.first_name,
              last_name: otherUser.last_name,
              user_role: otherUser.user_role
            },
            last_message: null,
            unread_count: 0
          });
        }
        
        const conversation = conversationMap.get(otherUserId)!;
        
        // Set the most recent message
        if (!conversation.last_message || new Date(message.created_at) > new Date(conversation.last_message.created_at)) {
          conversation.last_message = {
            ...message,
            sender: userMap.get(message.sender_id)!,
            recipient: userMap.get(message.recipient_id)!
          };
        }
        
        // Count unread messages
        if (message.recipient_id === user?.id && !message.read_at) {
          conversation.unread_count++;
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          created_at,
          read_at
        `)
        .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get user details for sender and recipient
      const userIds = new Set<string>();
      (data || []).forEach(message => {
        userIds.add(message.sender_id);
        userIds.add(message.recipient_id);
      });

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, user_role')
        .in('id', Array.from(userIds));

      if (usersError) throw usersError;

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Transform messages with user details
      const messagesWithUsers = (data || []).map(message => ({
        ...message,
        sender: userMap.get(message.sender_id)!,
        recipient: userMap.get(message.recipient_id)!
      }));

      setMessages(messagesWithUsers);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user?.id)
        .eq('sender_id', otherUserId)
        .is('read_at', null);

      // Update unread count in conversations
      setConversations(prev => 
        prev.map(conv => 
          conv.id === otherUserId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          recipient_id: selectedConversation,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
      loadMessages(selectedConversation);
      loadConversations(); // Refresh conversations to update last message
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      // Get all users except the current user
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, user_role')
        .neq('id', user?.id)
        .order('first_name');

      if (error) throw error;

      // Filter out users we already have conversations with
      const existingUserIds = new Set<string>();
      conversations.forEach(conv => {
        existingUserIds.add(conv.other_user.id);
      });

      const availableUsers = (data || []).filter(user => !existingUserIds.has(user.id));
      setAvailableUsers(availableUsers);
    } catch (error) {
      console.error('Error loading available users:', error);
      toast.error('Failed to load available users');
    }
  };

  const startNewConversation = async () => {
    if (!selectedUser || !initialMessage.trim()) return;

    try {
      setSending(true);
      
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          recipient_id: selectedUser,
          content: initialMessage.trim()
        });

      if (error) throw error;

      toast.success('Conversation started!');
      setShowNewConversation(false);
      setSelectedUser('');
      setInitialMessage('');
      loadConversations(); // Refresh conversations
      setSelectedConversation(selectedUser); // Open the new conversation
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setSending(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sports_therapist': return 'Sports Therapist';
      case 'massage_therapist': return 'Massage Therapist';
      case 'osteopath': return 'Osteopath';
      case 'client': return 'Client';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'sports_therapist': return 'bg-blue-50 text-blue-700';
      case 'massage_therapist': return 'bg-green-50 text-green-700';
      case 'osteopath': return 'bg-purple-50 text-purple-700';
      case 'client': return 'bg-gray-50 text-gray-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.other_user.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Messages</h1>
        <p className="text-muted-foreground">Communicate with therapists and clients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversations
              </CardTitle>
              <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Start New Conversation</DialogTitle>
                    <DialogDescription>
                      Choose a user to start a new conversation with.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Select User</label>
                      <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                        {availableUsers.map((user) => (
                          <div
                            key={user.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedUser === user.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedUser(user.id)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {user.first_name[0]}{user.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {user.first_name} {user.last_name}
                              </p>
                              <Badge className={getRoleBadgeColor(user.user_role)}>
                                {getRoleDisplayName(user.user_role)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Initial Message</label>
                      <Textarea
                        placeholder="Type your message..."
                        value={initialMessage}
                        onChange={(e) => setInitialMessage(e.target.value)}
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowNewConversation(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={startNewConversation}
                        disabled={!selectedUser || !initialMessage.trim() || sending}
                      >
                        {sending ? 'Starting...' : 'Start Conversation'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No conversations</h3>
                <p className="text-muted-foreground">
                  Start a conversation by booking a session with a therapist.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 cursor-pointer hover:bg-muted transition-colors ${
                      selectedConversation === conversation.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {conversation.other_user.first_name[0]}{conversation.other_user.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium truncate">
                            {conversation.other_user.first_name} {conversation.other_user.last_name}
                          </h4>
                          {conversation.unread_count > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(conversation.other_user.user_role)}`}>
                          {getRoleDisplayName(conversation.other_user.user_role)}
                        </Badge>
                        {conversation.last_message && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {conversation.last_message.content}
                          </p>
                        )}
                        {conversation.last_message && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(conversation.last_message.created_at), 'MMM dd, HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="lg:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {(() => {
                    const conversation = conversations.find(c => c.id === selectedConversation);
                    return conversation ? `${conversation.other_user.first_name} ${conversation.other_user.last_name}` : 'Messages';
                  })()}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-[500px]">
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_id === user?.id
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}>
                            {format(new Date(message.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="flex-1 min-h-[60px] resize-none"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the list to start messaging.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Messages;