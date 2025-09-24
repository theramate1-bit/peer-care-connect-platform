import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateAvatarUrl } from '@/lib/avatar-generator';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Star,
  Heart
} from 'lucide-react';
import { MessagesService, Message } from '@/lib/database';
import { FileUploadService } from '@/lib/file-upload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChatInterfaceProps {
  conversationId: string;
  therapistId: string;
  onBack?: () => void;
  className?: string;
}

interface TherapistInfo {
  id: string;
  first_name: string;
  last_name: string;
  user_role: string;
  avatar_url?: string;
  specialties?: string[];
  rating?: number;
  is_online?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  conversationId, 
  therapistId, 
  onBack,
  className 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [therapist, setTherapist] = useState<TherapistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversationId && therapistId) {
      fetchMessages();
      fetchTherapistInfo();
      setupRealtimeSubscription();
    }

    return () => {
      // Cleanup subscription
      supabase.removeAllChannels();
    };
  }, [conversationId, therapistId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const conversationMessages = await MessagesService.getMessages(conversationId);
      setMessages(conversationMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTherapistInfo = async () => {
    try {
      const { data: therapistData } = await supabase
        .from('users')
        .select('id, first_name, last_name, user_role, avatar_url, specialties, rating')
        .eq('id', therapistId)
        .single();

      setTherapist(therapistData || null);
    } catch (error) {
      console.error('Error fetching therapist info:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    // Subscribe to new messages in this conversation
    const messagesChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if it's from the therapist
          if (newMessage.sender_id !== user?.id) {
            MessagesService.markAsRead(newMessage.id);
          }
        }
      )
      .subscribe();

    // Subscribe to message read status updates
    const readStatusChannel = supabase
      .channel(`read-status-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
        }
      )
      .subscribe();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      setSending(true);
      
      const message = await MessagesService.sendMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: therapistId,
        content: newMessage.trim(),
        message_type: 'text'
      });

      setNewMessage('');
      
      // Add message to local state immediately for optimistic UI
      setMessages(prev => [...prev, message]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      
      for (const file of Array.from(files)) {
        // Upload file
        const uploadedFile = await FileUploadService.uploadFile(file, 'messages', {
          maxSize: 10 * 1024 * 1024, // 10MB
          compressImages: true,
          quality: 0.8
        });

        // Send file message
        await MessagesService.sendMessage({
          conversation_id: conversationId,
          sender_id: user?.id || '',
          recipient_id: therapistId,
          content: `📎 ${file.name}`,
          message_type: FileUploadService.isImage(file.type) ? 'image' : 'file',
          file_url: uploadedFile.url
        });

        // Add to local messages for optimistic UI
        const newMessage: Message = {
          id: `temp-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: user?.id || '',
          recipient_id: therapistId,
          content: `📎 ${file.name}`,
          message_type: FileUploadService.isImage(file.type) ? 'image' : 'file',
          file_url: uploadedFile.url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMessage]);
      }

      toast({
        title: "File Uploaded",
        description: `${files.length} file(s) uploaded successfully`
      });

    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5 cursor-pointer" onClick={onBack} />
            Loading...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={generateAvatarUrl(
                `${therapist?.first_name}${therapist?.last_name}`,
                therapist?.avatar_preferences
              )} 
            />
            <AvatarFallback>
              {therapist?.first_name[0]}{therapist?.last_name[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <CardTitle className="text-lg">
              {therapist?.first_name} {therapist?.last_name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {getRoleDisplayName(therapist?.user_role || '')}
              </Badge>
              {therapist?.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-xs text-muted-foreground">
                    {therapist.rating.toFixed(1)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">Online</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Messages Area */}
        <div className="h-64 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.sender_id === user?.id;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.message_type === 'image' && message.file_url ? (
                      <div className="space-y-2">
                        <img 
                          src={message.file_url} 
                          alt={message.content}
                          className="max-w-xs rounded-lg cursor-pointer"
                          onClick={() => window.open(message.file_url, '_blank')}
                        />
                        <p className="text-sm">{message.content}</p>
                      </div>
                    ) : message.message_type === 'file' && message.file_url ? (
                      <div className="space-y-2">
                        <div 
                          className="flex items-center gap-2 p-2 bg-white/10 rounded cursor-pointer hover:bg-white/20"
                          onClick={() => window.open(message.file_url, '_blank')}
                        >
                          <span className="text-lg">{FileUploadService.getFileIcon('file')}</span>
                          <div>
                            <p className="text-sm font-medium">{message.content}</p>
                            <p className="text-xs opacity-75">Click to download</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                  <div className={`text-xs text-muted-foreground mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                    {formatTime(message.created_at)}
                    {isOwnMessage && message.read_at && (
                      <span className="ml-1">✓✓</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleFileClick}
              disabled={uploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Smile className="h-4 w-4" />
            </Button>
            
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sending || uploading}
            />
            
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || sending || uploading}
              size="sm"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {uploading && (
            <div className="mt-2 text-sm text-muted-foreground">
              Uploading files...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
