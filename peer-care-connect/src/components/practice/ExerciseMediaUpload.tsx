import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video, 
  Loader2,
  Play,
  Eye
} from 'lucide-react';
import { ExerciseMediaAttachment } from '@/lib/hep-service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ExerciseMediaUploadProps {
  practitionerId: string;
  clientId: string;
  programId?: string; // Optional for new programs
  exerciseIndex: number;
  existingMedia?: ExerciseMediaAttachment[];
  onMediaChange: (media: ExerciseMediaAttachment[]) => void;
  disabled?: boolean;
}

export const ExerciseMediaUpload: React.FC<ExerciseMediaUploadProps> = ({
  practitionerId,
  clientId,
  programId,
  exerciseIndex,
  existingMedia = [],
  onMediaChange,
  disabled = false
}) => {
  const [media, setMedia] = useState<ExerciseMediaAttachment[]>(existingMedia);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => {
      const isValidImage = file.type.startsWith('image/') && 
        ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
      const isValidVideo = file.type.startsWith('video/') && 
        ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'].includes(file.type);
      
      if (!isValidImage && !isValidVideo) {
        toast.error('Unsupported file type', {
          description: `${file.name}: use images (JPEG, PNG, GIF, WebP) or videos (MP4, WebM, MOV, AVI).`,
        });
        return false;
      }

      const maxMb = 50;
      if (file.size > maxMb * 1024 * 1024) {
        toast.error('File too large', {
          description: `${file.name} is over ${maxMb}MB. Use a smaller file or compress it.`,
        });
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    await uploadFiles(validFiles);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedMedia: ExerciseMediaAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = ((i + 1) / files.length) * 100;
        setUploadProgress(progress);

        // Create file path: {practitioner_id}/{client_id}/{program_id or 'temp'}/{exercise_index}/{filename}
        const sanitizePath = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_');
        const sanitizedPractitionerId = sanitizePath(practitionerId);
        const sanitizedClientId = sanitizePath(clientId);
        const programPath = programId ? sanitizePath(programId) : 'temp';
        const sanitizedExerciseIndex = sanitizePath(exerciseIndex.toString());
        const timestamp = Date.now();
        const sanitizedFileName = sanitizePath(file.name);
        const fileExt = file.name.split('.').pop() || 'bin';
        const fileName = `${timestamp}-${sanitizedFileName}`;
        
        const filePath = `${sanitizedPractitionerId}/${sanitizedClientId}/${programPath}/${sanitizedExerciseIndex}/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('exercise-media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          const rawMsg = (uploadError as { message?: string }).message || 'Upload failed';
          const isGenericEdge =
            /edge function|non-2xx|2xx status/i.test(rawMsg);
          const status =
            (uploadError as { status?: number }).status ??
            (uploadError as { statusCode?: number | string }).statusCode;
          const statusStr = status != null ? ` (${status})` : '';
          let description: string;
          if (isGenericEdge) {
            description = status
              ? `Server returned ${status}. Check storage bucket "exercise-media" exists and RLS allows uploads. Try again.`
              : 'Server error. Check storage bucket "exercise-media" and permissions. Try again.';
            toast.error(`Exercise media upload failed${statusStr}`, {
              description: `${file.name}: ${description}`,
            });
          } else {
            const isQuota = /quota|storage|limit/i.test(rawMsg);
            toast.error(isQuota ? 'Storage limit reached' : 'Upload failed', {
              description: isQuota
                ? 'Free up space or use a smaller file.'
                : `${file.name}: ${rawMsg}. Try again or use a different file.`,
            });
          }
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('exercise-media')
          .getPublicUrl(filePath);

        const mediaAttachment: ExerciseMediaAttachment = {
          url: urlData.publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          filename: file.name,
          file_size: file.size,
          uploaded_at: new Date().toISOString()
        };

        uploadedMedia.push(mediaAttachment);
      }

      const newMedia = [...media, ...uploadedMedia];
      setMedia(newMedia);
      onMediaChange(newMedia);
      
      if (uploadedMedia.length > 0) {
        toast.success(`Successfully uploaded ${uploadedMedia.length} file(s)`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      const message = error instanceof Error ? error.message : '';
      const isGenericEdge = /edge function|non-2xx|2xx status/i.test(message);
      if (isGenericEdge) {
        toast.error('Exercise media upload failed', {
          description:
            'Server returned an error. Ensure the "exercise-media" storage bucket exists and allows uploads (RLS). Try again.',
        });
      } else {
        toast.error('Upload failed', {
          description: message
            ? `${message} Check your connection and try again.`
            : 'Check your connection and try again.',
        });
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveMedia = async (index: number) => {
    const mediaToRemove = media[index];
    const newMedia = media.filter((_, i) => i !== index);
    setMedia(newMedia);
    onMediaChange(newMedia);

    // Try to delete from storage (don't fail if it doesn't exist)
    if (mediaToRemove.url) {
      try {
        // Extract path from URL
        const urlParts = mediaToRemove.url.split('/exercise-media/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0];
          await supabase.storage
            .from('exercise-media')
            .remove([filePath]);
        }
      } catch (error) {
        console.error('Error deleting file from storage:', error);
        // Don't show error to user - file might already be deleted
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Exercise Media</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" aria-label="What is exercise media?" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-sm">
                Add images/videos of yourself or client performing this exercise to help guide them later on!
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Add Images/Videos
          </>
        )}
      </Button>

      {uploading && uploadProgress > 0 && (
        <Progress value={uploadProgress} className="h-2" />
      )}

      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          {media.map((item, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-2">
                {item.type === 'image' ? (
                  <div className="relative aspect-video bg-muted rounded overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveMedia(index)}
                      disabled={disabled}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => window.open(item.url, '_blank')}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative aspect-video bg-muted rounded overflow-hidden">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      controls={false}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play className="h-8 w-8 text-white" />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveMedia(index)}
                      disabled={disabled}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => window.open(item.url, '_blank')}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1 truncate" title={item.filename}>
                  {item.filename}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
