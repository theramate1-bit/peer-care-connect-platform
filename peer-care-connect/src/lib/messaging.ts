import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
  conversation_id: string;
  other_participant_id: string;
  other_participant_name: string;
  other_participant_role: string;
  last_message_content: string;
  last_message_at: string;
  unread_count: number;
}

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender_name: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

export class MessagingManager {
  /**
   * Get or create a conversation between two users
   */
  static async getOrCreateConversation(user1Id: string, user2Id: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_conversation', {
          p_user1_id: user1Id,
          p_user2_id: user2Id
        });

      if (error) {
        console.error('Error getting/creating conversation:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }
  }

  /**
   * Send a message to a conversation
   */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'system' = 'text'
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('send_message', {
          p_conversation_id: conversationId,
          p_sender_id: senderId,
          p_content: content,
          p_message_type: messageType
        });

      if (error) {
        console.error('Error sending message:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get user's conversations
   */
  static async getUserConversations(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_conversations', {
          p_user_id: userId,
          p_limit: limit,
          p_offset: offset
        });

      if (error) {
        console.error('Error getting conversations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }

  /**
   * Get messages for a conversation
   */
  static async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_conversation_messages', {
          p_conversation_id: conversationId,
          p_user_id: userId,
          p_limit: limit,
          p_offset: offset
        });

      if (error) {
        console.error('Error getting messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(
    conversationId: string,
    userId: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('mark_messages_as_read', {
          p_conversation_id: conversationId,
          p_user_id: userId
        });

      if (error) {
        console.error('Error marking messages as read:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return 0;
    }
  }

  /**
   * Send a message to a user (creates conversation if needed)
   */
  static async sendMessageToUser(
    senderId: string,
    recipientId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'system' = 'text'
  ): Promise<string> {
    try {
      // Get or create conversation
      const conversationId = await this.getOrCreateConversation(senderId, recipientId);
      
      // Send message
      const messageId = await this.sendMessage(conversationId, senderId, content, messageType);
      
      return messageId;
    } catch (error) {
      console.error('Error sending message to user:', error);
      throw error;
    }
  }

  /**
   * Send a message to a guest (creates guest conversation if needed)
   */
  static async sendMessageToGuest(
    practitionerId: string,
    guestEmail: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'system' = 'text'
  ): Promise<string> {
    try {
      // First check if guest already has an account
      const { data: guestUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', guestEmail)
        .single();

      // If guest has account, use normal flow
      if (guestUser) {
        return await this.sendMessageToUser(practitionerId, guestUser.id, content, messageType);
      }

      // Get or create guest conversation
      const { data: conversationId, error: convError } = await supabase
        .rpc('get_or_create_guest_conversation', {
          p_practitioner_id: practitionerId,
          p_guest_email: guestEmail
        });

      if (convError || !conversationId) {
        throw new Error(convError?.message || 'Failed to create guest conversation');
      }

      // Send message
      const messageId = await this.sendMessage(conversationId, practitionerId, content, messageType);

      // Send email notification
      try {
        const { NotificationSystem } = await import('@/lib/notification-system');
        const { data: practitioner } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', practitionerId)
          .single();

        const practitionerName = practitioner 
          ? `${practitioner.first_name} ${practitioner.last_name}`
          : 'Your practitioner';

        await NotificationSystem.sendGuestMessageNotification(
          conversationId,
          guestEmail,
          content,
          practitionerName
        );
      } catch (emailError) {
        console.error('Error sending guest message notification:', emailError);
        // Don't throw - email failures shouldn't block message sending
      }

      return messageId;
    } catch (error) {
      console.error('Error sending message to guest:', error);
      throw error;
    }
  }

  /**
   * Link guest conversations to user when account is created
   */
  static async linkGuestConversationsToUser(
    email: string,
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('link_guest_conversations_to_user', {
          p_email: email,
          p_user_id: userId
        });

      if (error) {
        console.error('Error linking guest conversations:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error linking guest conversations to user:', error);
      throw error;
    }
  }

  /**
   * Link guest sessions to user when account is created
   */
  static async linkGuestSessionsToUser(
    email: string,
    userId: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('link_guest_sessions_to_user', {
          p_email: email,
          p_user_id: userId
        });

      if (error) {
        console.error('Error linking guest sessions:', error);
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Error linking guest sessions to user:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time messages for a conversation
   */
  static subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void,
    onError?: (error: any) => void
  ) {
    return supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          try {
            // Fetch the full message with sender name
            const { data: messageData } = await supabase
              .from('messages')
              .select(`
                id,
                sender_id,
                content,
                message_type,
                is_read,
                read_at,
                created_at,
                users!messages_sender_id_fkey(first_name, last_name)
              `)
              .eq('id', payload.new.id)
              .single();

            if (messageData) {
              const message: Message = {
                id: messageData.id,
                sender_id: messageData.sender_id,
                content: messageData.content,
                message_type: messageData.message_type,
                is_read: messageData.is_read,
                read_at: messageData.read_at,
                created_at: messageData.created_at,
                sender_name: `${messageData.users?.first_name || ''} ${messageData.users?.last_name || ''}`.trim()
              };
              
              onMessage(message);
            }
          } catch (error) {
            console.error('Error processing real-time message:', error);
            onError?.(error);
          }
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to conversation updates (new conversations, unread counts)
   */
  static subscribeToUserConversations(
    userId: string,
    onConversationUpdate: (conversation: Conversation) => void,
    onError?: (error: any) => void
  ) {
    return supabase
      .channel(`user_conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant1_id=eq.${userId},participant2_id=eq.${userId}`
        },
        async (payload) => {
          try {
            // Fetch updated conversation data
            const conversations = await this.getUserConversations(userId, 1, 0);
            if (conversations.length > 0) {
              onConversationUpdate(conversations[0]);
            }
          } catch (error) {
            console.error('Error processing conversation update:', error);
            onError?.(error);
          }
        }
      )
      .subscribe();
  }

  /**
   * Upload file attachment
   */
  static async uploadAttachment(
    file: File,
    messageId: string
  ): Promise<MessageAttachment> {
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${messageId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      // Save attachment record
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('message_attachments')
        .insert({
          message_id: messageId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type
        })
        .select()
        .single();

      if (attachmentError) {
        throw new Error(attachmentError.message);
      }

      return attachmentData;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('is_read', false)
        .neq('sender_id', userId)
        .in('conversation_id', 
          supabase
            .from('conversations')
            .select('id')
            .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        );

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}
