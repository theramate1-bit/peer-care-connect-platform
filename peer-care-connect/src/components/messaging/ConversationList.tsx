import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateAvatarUrl } from '@/lib/avatar-generator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

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
  last_message?: {
    id: string;
    encrypted_content: string;
    message_type: 'text' | 'file' | 'image' | 'document' | 'system';
    created_at: string;
  };
  unread_count: number;
}

interface ConversationListProps {
  onConversationSelect: (conversationId: string) => void;
  selectedConversationId?: string;
}

const ConversationList: React.FC<ConversationListProps> = ({
  onConversationSelect,
  selectedConversationId
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch conversations with participant info and last message
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          other_user:users!conversations_participant2_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          ),
          last_message:messages(
            id,
            encrypted_content,
            message_type,
            created_at
          )
        `)
        .eq('participant1_id', user.id)
        .eq('conversation_status', 'active')
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Also fetch conversations where user is participant2
      const { data: participant2Data, error: error2 } = await supabase
        .from('conversations')
        .select(`
          *,
          other_user:users!conversations_participant1_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          ),
          last_message:messages(
            id,
            encrypted_content,
            message_type,
            created_at
          )
        `)
        .eq('participant2_id', user.id)
        .eq('conversation_status', 'active')
        .order('last_message_at', { ascending: false });

      if (error2) throw error2;

      // Combine and sort conversations
      const allConversations = [...(data || []), ...(participant2Data || [])]
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      // Get unread counts for each conversation
      const conversationsWithUnreadCounts = await Promise.all(
        allConversations.map(async (conv) => {
          const { count } = await supabase
            .from('message_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('conversation_id', conv.id)
            .eq('is_read', false);

          return {
            ...conv,
            unread_count: count || 0
          };
        })
      );

      setConversations(conversationsWithUnreadCounts);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDisplayName = (conversation: Conversation) => {
    if (conversation.other_user) {
      return `${conversation.other_user.first_name} ${conversation.other_user.last_name}`;
    }
    return 'Unknown User';
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.last_message) return 'No messages yet';
    
    const message = conversation.last_message;
    switch (message.message_type) {
      case 'text':
        return message.encrypted_content.length > 50 
          ? `${message.encrypted_content.substring(0, 50)}...`
          : message.encrypted_content;
      case 'file':
        return '📎 File shared';
      case 'image':
        return '🖼️ Image shared';
      case 'document':
        return '📄 Document shared';
      default:
        return 'Message sent';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Conversations */}
      <div className="space-y-2">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No conversations yet</p>
            <p className="text-sm">Start a conversation with a therapist or client</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <Card
              key={conversation.id}
              className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                selectedConversationId === conversation.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => onConversationSelect(conversation.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage 
                        src={generateAvatarUrl(
                          `${conversation.other_user?.first_name}${conversation.other_user?.last_name}`,
                          conversation.other_user?.avatar_preferences
                        )} 
                        alt={getDisplayName(conversation)}
                      />
                      <AvatarFallback>
                        {conversation.other_user?.first_name?.[0]}{conversation.other_user?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.unread_count > 0 && (
                      <Badge 
                        className="absolute -top-1 -right-1 min-w-[20px] h-5 text-xs"
                        variant="destructive"
                      >
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {getDisplayName(conversation)}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate">
                      {getLastMessagePreview(conversation)}
                    </p>
                  </div>
                  
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
