import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateAvatarUrl } from '@/lib/avatar-generator';
import { 
  MessageSquare, 
  Clock, 
  User, 
  Phone,
  Mail,
  MapPin,
  Star,
  Heart
} from 'lucide-react';
import { MessagesService, Conversation } from '@/lib/database';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MessagesListProps {
  onSelectConversation: (conversationId: string, therapistId: string) => void;
  className?: string;
}

interface ConversationWithDetails extends Conversation {
  therapist: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
    avatar_url?: string;
    specialties?: string[];
    rating?: number;
  };
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unreadCount: number;
}

export const MessagesList: React.FC<MessagesListProps> = ({ 
  onSelectConversation, 
  className 
}) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
      setupRealtimeSubscription();
    }

    return () => {
      // Cleanup subscription
      supabase.removeAllChannels();
    };
  }, [user]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Get user's conversations
      const userConversations = await MessagesService.getConversations(user?.id || '');
      
      if (userConversations.length === 0) {
        setConversations([]);
        return;
      }

      // Fetch therapist details and last messages for each conversation
      const conversationsWithDetails = await Promise.all(
        userConversations.map(async (conversation) => {
          // Get therapist details
          const { data: therapist } = await supabase
            .from('users')
            .select('id, first_name, last_name, user_role, avatar_url, specialties, rating')
            .eq('id', conversation.therapist_id)
            .single();

          // Get last message
          const messages = await MessagesService.getMessages(conversation.id);
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;

          // Get unread count
          const unreadCount = await MessagesService.getUnreadCount(user?.id || '');

          return {
            ...conversation,
            therapist: therapist || {
              id: conversation.therapist_id,
              first_name: 'Unknown',
              last_name: 'Therapist',
              user_role: 'sports_therapist'
            },
            lastMessage,
            unreadCount: lastMessage?.sender_id !== user?.id ? unreadCount : 0
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          // Update conversations when new message arrives
          fetchConversations();
        }
      )
      .subscribe();

    // Subscribe to conversation updates
    const conversationsChannel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          // Update conversations when last_message_at changes
          fetchConversations();
        }
      )
      .subscribe();
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sports_therapist':
        return 'Sports Therapist';
      case 'massage_therapist':
        return 'Massage Therapist';
      case 'osteopath':
        return 'Osteopath';
      default:
        return 'Therapist';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Messages
          </CardTitle>
          <CardDescription>Your conversations with therapists</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Messages
        </CardTitle>
        <CardDescription>Your conversations with therapists</CardDescription>
      </CardHeader>
      <CardContent>
        {conversations.length > 0 ? (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onSelectConversation(conversation.id, conversation.therapist_id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={generateAvatarUrl(
                          `${conversation.therapist.first_name}${conversation.therapist.last_name}`,
                          conversation.therapist.avatar_preferences
                        )} 
                      />
                      <AvatarFallback>
                        {conversation.therapist.first_name[0]}{conversation.therapist.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">
                        {conversation.therapist.first_name} {conversation.therapist.last_name}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conversation.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {getRoleDisplayName(conversation.therapist.user_role)}
                      </Badge>
                      {conversation.therapist.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs text-muted-foreground">
                            {conversation.therapist.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {conversation.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                        {truncateMessage(conversation.lastMessage.content)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Conversations Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a conversation with your therapist to begin messaging.
            </p>
            <Button variant="outline" size="sm">
              Find Therapists
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
