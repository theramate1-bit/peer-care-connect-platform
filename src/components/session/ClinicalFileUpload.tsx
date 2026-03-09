import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  X, 
  Download, 
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
  Paperclip,
  FileImage,
  FileAudio,
  FileVideo
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeFileName, sanitizePathSegment } from '@/lib/file-path-sanitizer';

interface ClinicalFile {
  id: string;
  name: string;
  type: 'image' | 'document' | 'audio' | 'other';
  size: number;
  url: string;
  uploaded_at: string;
  description?: string;
  file_path: string;
}

interface ClinicalFileUploadProps {
  sessionId: string;
  clientId: string;
  practitionerId: string;
  onFileUploaded?: (file: ClinicalFile) => void;
  existingFiles?: ClinicalFile[];
}

export const ClinicalFileUpload: React.FC<ClinicalFileUploadProps> = ({
  sessionId,
  clientId,
  practitionerId,
  onFileUploaded,
  existingFiles = []
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [clinicalFiles, setClinicalFiles] = useState<ClinicalFile[]>(existingFiles);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFileTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp3'],
    video: ['video/mp4', 'video/webm', 'video/ogg']
  };

  const getFileType = (file: File): ClinicalFile['type'] => {
    if (acceptedFileTypes.image.includes(file.type)) return 'image';
    if (acceptedFileTypes.document.includes(file.type)) return 'document';
    if (acceptedFileTypes.audio.includes(file.type)) return 'audio';
    if (acceptedFileTypes.video.includes(file.type)) return 'audio'; // Treat video as audio for now
    return 'other';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: ClinicalFile['type'], fileName: string) => {
    switch (type) {
      case 'image': return <FileImage className="h-4 w-4 text-green-600" />;
      case 'document': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'audio': return <FileAudio className="h-4 w-4 text-purple-600" />;
      default: return <File className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDescriptionChange = (index: number, description: string) => {
    setDescriptions(prev => ({ ...prev, [index]: description }));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFiles: ClinicalFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = getFileType(file);
        
        // Sanitize file name and path segments to prevent path traversal
        const sanitizedPractitionerId = sanitizePathSegment(practitionerId);
        const sanitizedClientId = sanitizePathSegment(clientId);
        const sanitizedSessionId = sanitizePathSegment(sessionId);
        const sanitizedFileName = sanitizeFileName(file.name);
        
        // Create unique filename with organized structure
        const timestamp = Date.now();
        const fileName = `${sanitizedPractitionerId}/${sanitizedClientId}/${sanitizedSessionId}/${timestamp}-${sanitizedFileName}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('clinical-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('clinical-files')
          .getPublicUrl(fileName);

        // Save file metadata to database
        const { data: dbData, error: dbError } = await supabase
          .from('clinical_files')
          .insert({
            session_id: sessionId,
            practitioner_id: practitionerId,
            client_id: clientId,
            file_name: file.name,
            file_path: fileName,
            file_type: fileType,
            file_size: file.size,
            file_url: urlData.publicUrl,
            description: descriptions[i] || '',
            uploaded_at: new Date().toISOString()
          })
          .select()
          .single();

        if (dbError) throw dbError;

        uploadedFiles.push({
          id: dbData.id,
          name: file.name,
          type: fileType,
          size: file.size,
          url: urlData.publicUrl,
          uploaded_at: dbData.uploaded_at,
          description: descriptions[i] || '',
          file_path: fileName
        });

        // Update progress
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      toast.success(`${files.length} file(s) uploaded successfully`);
      
      // Reset state
      setFiles([]);
      setDescriptions({});
      setUploadProgress(0);
      
      // Update clinical files list
      setClinicalFiles(prev => [...uploadedFiles, ...prev]);
      
      // Notify parent component
      if (onFileUploaded) {
        uploadedFiles.forEach(file => onFileUploaded(file));
      }

    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('clinical-files')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('clinical_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      // Update local state
      setClinicalFiles(prev => prev.filter(file => file.id !== fileId));
      
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const fetchClinicalFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('clinical_files')
        .select('*')
        .eq('session_id', sessionId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setClinicalFiles(data || []);
    } catch (error) {
      console.error('Error fetching clinical files:', error);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchClinicalFiles();
    }
  }, [sessionId]);

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Clinical Files
          </CardTitle>
          <CardDescription>
            Upload images, documents, audio, or video files related to this session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input */}
          <div>
            <Label htmlFor="file-upload">Select Files</Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,audio/*,video/*"
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Supported formats: Images (JPEG, PNG, GIF, WebP), Documents (PDF, DOC, DOCX, TXT), Audio (MP3, WAV, WebM), Video (MP4, WebM)
            </p>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Selected Files ({files.length})</h4>
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    {getFileIcon(getFileType(file), file.name)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {getFileType(file)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add description..."
                      value={descriptions[index] || ''}
                      onChange={(e) => handleDescriptionChange(index, e.target.value)}
                      className="w-48 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Upload Button */}
              <div className="flex gap-2">
                <Button
                  onClick={uploadFiles}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Uploading... {Math.round(uploadProgress)}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload {files.length} File(s)
                    </>
                  )}
                </Button>
              </div>

              {/* Progress Bar */}
              {uploading && (
                <Progress value={uploadProgress} className="w-full" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Files */}
      {clinicalFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Session Files ({clinicalFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clinicalFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2 flex-1">
                    {getFileIcon(file.type, file.name)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {file.type} • {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                      {file.description && (
                        <p className="text-xs text-gray-600 mt-1">{file.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={file.url} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFile(file.id, file.file_path)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {clinicalFiles.length === 0 && files.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Paperclip className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Files Uploaded</h3>
            <p className="text-muted-foreground mb-4">
              Upload clinical files, images, or documents to enhance your session notes
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicalFileUpload;
