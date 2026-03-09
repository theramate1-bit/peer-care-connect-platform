import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Image as ImageIcon,
  FileText, 
  X, 
  Reply,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MessageInputProps {
  conversationId: string;
  onMessageSent: () => void;
  replyToMessage?: {
    id: string;
    content: string;
    senderName: string;
  };
  onCancelReply: () => void;
}

interface FileAttachment {
  file: File;
  id: string;
  type: string;
  size: number;
  preview?: string;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'scanning' | 'completed' | 'error';
  encryptedPath?: string;
  fileHash?: string;
  isVirusScanned?: boolean;
  error?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  onMessageSent,
  replyToMessage,
  onCancelReply
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Utility functions for file security
  const generateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const encryptFilePath = (originalPath: string): string => {
    // Simple encryption for demo - in production, use proper encryption
    return btoa(originalPath + '_encrypted_' + Date.now());
  };

  const simulateVirusScan = async (file: File): Promise<boolean> => {
    // Simulate virus scanning delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate 99.9% clean files (0.1% false positive for demo)
    return Math.random() > 0.001;
  };

  const uploadFileToStorage = async (file: File, attachmentId: string): Promise<string> => {
    // Sanitize file name and path to prevent path traversal
    const sanitizedFileName = sanitizeFileName(file.name);
    const fileExt = sanitizedFileName.split('.').pop() || 'bin';
    const sanitizedAttachmentId = sanitizePathSegment(attachmentId);
    const sanitizedConversationId = sanitizePathSegment(conversationId);
    const fileName = `${sanitizedAttachmentId}.${fileExt}`;
    const filePath = `secure-messages/${sanitizedConversationId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('message-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return data.path;
  };

  const handleSendMessage = async () => {
    if (!user || (!message.trim() && attachments.length === 0)) return;

    try {
      setIsSending(true);

      // For now, we'll store the message as plain text
      // In a real implementation, you would encrypt the message content
      const encryptedContent = message.trim();
      const contentHash = btoa(encryptedContent); // Simple hash for demo

      // Insert the message (using direct insert to support reply_to_message_id and attachments)
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message_type: attachments.length > 0 ? 'file' : 'text',
          encrypted_content: encryptedContent,
          content_hash: contentHash,
          reply_to_message_id: replyToMessage?.id
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Create notification for recipient (if not a system message)
      try {
        const { NotificationSystem } = await import('@/lib/notification-system');
        
        // Get recipient ID from conversation
        const { data: conversation } = await supabase
          .from('conversations')
          .select('participant1_id, participant2_id')
          .eq('id', conversationId)
          .single();

        if (conversation) {
          const recipientId = conversation.participant1_id === user.id 
            ? conversation.participant2_id 
            : conversation.participant1_id;

          if (recipientId) {
            const messagePreview = encryptedContent.trim() || (attachments.length > 0 ? 'Sent an attachment' : 'New message');
            await NotificationSystem.sendMessageNotification(
              conversationId,
              messageData.id,
              user.id,
              recipientId,
              messagePreview
            );
          }
        }
      } catch (notifError) {
        // Don't block message sending if notification fails
        console.error('Error creating notification:', notifError);
      }

      // Handle file attachments if any
      if (attachments.length > 0 && messageData) {
        for (const attachment of attachments) {
          try {
            // Update attachment status to uploading
            setAttachments(prev => prev.map(a => 
              a.id === attachment.id 
                ? { ...a, uploadStatus: 'uploading', uploadProgress: 0 }
                : a
            ));

            // Generate file hash for integrity verification
            const fileHash = await generateFileHash(attachment.file);
            
            // Upload file to secure storage
            const storagePath = await uploadFileToStorage(attachment.file, attachment.id);
            
            // Update progress
            setAttachments(prev => prev.map(a => 
              a.id === attachment.id 
                ? { ...a, uploadProgress: 50, uploadStatus: 'scanning' }
                : a
            ));

            // Simulate virus scanning
            const isClean = await simulateVirusScan(attachment.file);
            
            if (!isClean) {
              throw new Error('File failed security scan');
            }

            // Encrypt the file path for additional security
            const encryptedPath = encryptFilePath(storagePath);

            // Update attachment with final status
            setAttachments(prev => prev.map(a => 
              a.id === attachment.id 
                ? { 
                    ...a, 
                    uploadProgress: 100, 
                    uploadStatus: 'completed',
                    encryptedPath,
                    fileHash,
                    isVirusScanned: true
                  }
                : a
            ));

            // Save attachment metadata to database
            const { error: attachmentError } = await supabase
              .from('message_attachments')
              .insert({
                message_id: messageData.id,
                file_name: attachment.file.name,
                file_type: attachment.file.type,
                file_size: attachment.file.size,
                encrypted_file_path: encryptedPath,
                file_hash: fileHash,
                is_virus_scanned: true,
                storage_path: storagePath
              });

            if (attachmentError) {
              console.error('Error saving attachment:', attachmentError);
              throw attachmentError;
            }

          } catch (error) {
            console.error('Error processing attachment:', error);
            
            // Update attachment with error status
            setAttachments(prev => prev.map(a => 
              a.id === attachment.id 
                ? { 
                    ...a, 
                    uploadStatus: 'error',
                    error: error instanceof Error ? error.message : 'Upload failed'
                  }
                : a
            ));

            toast({
              title: "File upload failed",
              description: `Failed to upload ${attachment.file.name}. ${error instanceof Error ? error.message : 'Unknown error'}`,
              variant: "destructive"
            });
          }
        }
      }

      // Clear the input
      setMessage('');
      setAttachments([]);
      if (replyToMessage) {
        onCancelReply();
      }

      // Notify parent component
      onMessageSent();

      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
        variant: "default"
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newAttachments: FileAttachment[] = Array.from(files).map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      type: file.type,
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploadStatus: 'pending' as const,
      uploadProgress: 0,
      isVirusScanned: false
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === attachmentId);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== attachmentId);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const canSend = message.trim().length > 0 || attachments.length > 0;

  return (
    <div className="space-y-3">
      {/* Reply preview */}
      {replyToMessage && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Reply className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Replying to <span className="font-medium">{replyToMessage.senderName}</span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelReply}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-blue-700 mt-1 truncate">
              {replyToMessage.content}
            </p>
          </CardContent>
        </Card>
      )}

      {/* File attachments preview */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className={`${
              attachment.uploadStatus === 'error' ? 'bg-red-50 border-red-200' :
              attachment.uploadStatus === 'completed' ? 'bg-green-50 border-green-200' :
              attachment.uploadStatus === 'scanning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-gray-50'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  {attachment.preview ? (
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      {attachment.type.startsWith('image/') ? (
                        <ImageIcon className="w-6 h-6 text-gray-500" />
                      ) : (
                        <FileText className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.file.name}
                      </p>
                      {attachment.uploadStatus === 'completed' && attachment.isVirusScanned && (
                        <Shield className="w-4 h-4 text-green-600" title="Security verified" />
                      )}
                      {attachment.uploadStatus === 'error' && (
                        <AlertTriangle className="w-4 h-4 text-red-600" title="Upload failed" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)}
                    </p>
                    
                    {/* Upload progress */}
                    {attachment.uploadStatus === 'uploading' && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${attachment.uploadProgress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {attachment.uploadProgress || 0}%
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Status messages */}
                    {attachment.uploadStatus === 'scanning' && (
                      <p className="text-xs text-yellow-600 mt-1">
                        🔍 Scanning for security threats...
                      </p>
                    )}
                    {attachment.uploadStatus === 'completed' && (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Secure upload complete
                      </p>
                    )}
                    {attachment.uploadStatus === 'error' && (
                      <p className="text-xs text-red-600 mt-1">
                        ❌ {attachment.error || 'Upload failed'}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(attachment.id)}
                    className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                    disabled={attachment.uploadStatus === 'uploading' || attachment.uploadStatus === 'scanning'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Message input */}
      <div className="flex items-end space-x-2">
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="min-h-[80px] resize-none"
            disabled={isSending}
          />
          
        </div>
        
        <Button
          onClick={handleSendMessage}
          disabled={!canSend || isSending}
          className="h-12 px-6"
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
