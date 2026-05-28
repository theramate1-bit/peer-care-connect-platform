import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateAvatarUrl } from '@/lib/avatar-generator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Download, 
  Eye, 
  FileText, 
  Image as ImageIcon, 
  MoreVertical, 
  Paperclip,
  Reply,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  attachments?: MessageAttachment[];
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

interface MessageAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  encrypted_file_path: string;
  file_hash: string;
  thumbnail_url?: string;
  is_virus_scanned: boolean;
  virus_scan_result?: string;
}

interface MessageDisplayProps {
  message: Message;
  isOwnMessage: boolean;
  onReply: (messageId: string) => void;
  onReaction: (messageId: string, reaction: 'helpful' | 'unhelpful') => void;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({
  message,
  isOwnMessage,
  onReply,
  onReaction
}) => {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (fileType.startsWith('text/') || fileType.includes('document')) return <FileText className="w-4 h-4" />;
    return <Paperclip className="w-4 h-4" />;
  };

  const handleDownload = async (attachment: MessageAttachment) => {
    if (!user) return;
    
    try {
      setDownloading(true);
      
      // In a real implementation, you would decrypt the file path and download
      // For now, we'll just show a placeholder
      
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setDownloading(false);
    }
  };

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <div className="text-sm text-gray-900 whitespace-pre-wrap break-words overflow-wrap-anywhere">
            {message.encrypted_content}
          </div>
        );
      
      case 'file':
      case 'document':
        return (
          <div className="space-y-2">
            {message.attachments?.map((attachment) => (
              <Card key={attachment.id} className="max-w-xs">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getFileIcon(attachment.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.file_size)}
                      </p>
                      {attachment.is_virus_scanned && (
                        <Badge 
                          variant={attachment.virus_scan_result === 'clean' ? 'default' : 'destructive'}
                          className="text-xs mt-1"
                        >
                          {attachment.virus_scan_result === 'clean' ? 'Safe' : 'Scan Failed'}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload(attachment)}
                      disabled={downloading}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      
      case 'image':
        return (
          <div className="space-y-2">
            {message.attachments?.map((attachment) => (
              <div key={attachment.id} className="relative group">
                <img
                  src={attachment.thumbnail_url || attachment.encrypted_file_path}
                  alt={attachment.file_name}
                  className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    // In a real app, this would open a lightbox
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => handleDownload(attachment)}
                    disabled={downloading}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-gray-500 italic">
            Unsupported message type
          </div>
        );
    }
  };

  const renderMessageStatus = () => {
    switch (message.message_status) {
      case 'sent':
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
      case 'delivered':
        return <div className="w-2 h-2 bg-blue-400 rounded-full" />;
      case 'read':
        return <div className="w-2 h-2 bg-green-400 rounded-full" />;
      case 'failed':
        return <div className="w-2 h-2 bg-red-400 rounded-full" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4 px-2 sm:px-0`}>
      <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md`}>
        {/* Avatar */}
        <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 hidden sm:flex">
          <AvatarImage 
            src={generateAvatarUrl(
              `${message.sender.first_name}${message.sender.last_name}`,
              message.sender.avatar_preferences
            )} 
            alt={`${message.sender.first_name} ${message.sender.last_name}`}
          />
          <AvatarFallback>
            {message.sender.first_name[0]}{message.sender.last_name[0]}
          </AvatarFallback>
        </Avatar>

        {/* Message Content */}
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
          {/* Reply to message */}
          {message.reply_to_message && (
            <div className={`mb-2 p-2 bg-gray-100 rounded-lg text-xs text-gray-600 max-w-full break-words ${
              isOwnMessage ? 'text-right' : 'text-left'
            }`}>
              <p className="font-medium">
                Replying to {message.reply_to_message.sender.first_name}
              </p>
              <p className="break-words">
                {message.reply_to_message.encrypted_content}
              </p>
            </div>
          )}

          {/* Main message */}
          <div className={`relative group ${
            isOwnMessage 
              ? 'bg-white text-gray-900 border border-gray-200' 
              : 'bg-gray-100 text-gray-900'
          } rounded-lg px-3 py-2 shadow-sm break-words max-w-full`}>
            <div className="break-words overflow-wrap-anywhere">
              {renderMessageContent()}
            </div>
            
            {/* Message actions */}
            <div className={`absolute top-0 ${isOwnMessage ? '-left-12 sm:-left-16' : '-right-12 sm:-right-16'} opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 hidden sm:flex`}>
              <Button
                size="sm"
                variant="ghost"
                className="w-6 h-6 p-0"
                onClick={() => onReply(message.id)}
              >
                <Reply className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-6 h-6 p-0"
                onClick={() => onReaction(message.id, 'helpful')}
              >
                <ThumbsUp className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-6 h-6 p-0"
                onClick={() => onReaction(message.id, 'unhelpful')}
              >
                <ThumbsDown className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Message metadata */}
          <div className={`flex items-center space-x-2 mt-1 text-xs text-gray-500 ${
            isOwnMessage ? 'justify-end' : 'justify-start'
          }`}>
            <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
            {message.is_edited && <span>(edited)</span>}
            {renderMessageStatus()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageDisplay;
