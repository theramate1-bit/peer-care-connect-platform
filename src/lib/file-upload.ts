/**
 * File Upload Service
 * Handles file uploads for messaging system
 */

import { supabase } from '@/integrations/supabase/client';

export interface FileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  compressImages?: boolean;
  quality?: number; // 0-1 for image compression
}

export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
  thumbnail?: string;
}

export class FileUploadService {
  private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly DEFAULT_ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  /**
   * Upload file to Supabase Storage
   */
  static async uploadFile(
    file: File,
    bucket: string = 'messages',
    options: FileUploadOptions = {}
  ): Promise<UploadedFile> {
    const opts = {
      maxSize: this.DEFAULT_MAX_SIZE,
      allowedTypes: this.DEFAULT_ALLOWED_TYPES,
      compressImages: true,
      quality: 0.8,
      ...options
    };

    // Validate file
    this.validateFile(file, opts);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      let fileToUpload = file;

      // Compress image if needed
      if (opts.compressImages && file.type.startsWith('image/')) {
        fileToUpload = await this.compressImage(file, opts.quality!);
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Generate thumbnail for images
      let thumbnail: string | undefined;
      if (file.type.startsWith('image/')) {
        thumbnail = await this.generateThumbnail(file);
      }

      return {
        id: data.path,
        url: urlData.publicUrl,
        name: file.name,
        size: fileToUpload.size,
        type: file.type,
        thumbnail
      };

    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadFiles(
    files: File[],
    bucket: string = 'messages',
    options: FileUploadOptions = {}
  ): Promise<UploadedFile[]> {
    const uploadPromises = files.map(file => 
      this.uploadFile(file, bucket, options)
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Multiple file upload error:', error);
      throw new Error('Failed to upload files');
    }
  }

  /**
   * Delete file from storage
   */
  static async deleteFile(fileId: string, bucket: string = 'messages'): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileId]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('File delete error:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get file info
   */
  static async getFileInfo(fileId: string, bucket: string = 'messages'): Promise<any> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list('uploads', {
          search: fileId
        });

      if (error) {
        throw new Error(`Get file info failed: ${error.message}`);
      }

      return data?.[0];
    } catch (error) {
      console.error('Get file info error:', error);
      throw new Error('Failed to get file info');
    }
  }

  /**
   * Validate file before upload
   */
  private static validateFile(file: File, options: FileUploadOptions): void {
    // Check file size
    if (file.size > options.maxSize!) {
      throw new Error(`File size exceeds limit of ${this.formatFileSize(options.maxSize!)}`);
    }

    // Check file type
    if (!options.allowedTypes!.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Check file name
    if (!file.name || file.name.trim() === '') {
      throw new Error('File name is required');
    }
  }

  /**
   * Compress image file
   */
  private static async compressImage(file: File, quality: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920px width)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate thumbnail for image
   */
  private static async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Thumbnail dimensions
        const thumbSize = 150;
        const { width, height } = img;
        
        // Calculate thumbnail dimensions maintaining aspect ratio
        let thumbWidth = thumbSize;
        let thumbHeight = thumbSize;
        
        if (width > height) {
          thumbHeight = (height * thumbSize) / width;
        } else {
          thumbWidth = (width * thumbSize) / height;
        }

        canvas.width = thumbWidth;
        canvas.height = thumbHeight;

        // Draw thumbnail
        ctx?.drawImage(img, 0, 0, thumbWidth, thumbHeight);
        
        // Convert to data URL
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnailDataUrl);
      };

      img.onerror = () => reject(new Error('Thumbnail generation failed'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file icon based on type
   */
  static getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) {
      return '🖼️';
    } else if (fileType.startsWith('video/')) {
      return '🎥';
    } else if (fileType.startsWith('audio/')) {
      return '🎵';
    } else if (fileType === 'application/pdf') {
      return '📄';
    } else if (fileType.includes('word')) {
      return '📝';
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return '📊';
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return '📽️';
    } else if (fileType.includes('zip') || fileType.includes('rar')) {
      return '📦';
    } else {
      return '📎';
    }
  }

  /**
   * Check if file is image
   */
  static isImage(fileType: string): boolean {
    return fileType.startsWith('image/');
  }

  /**
   * Check if file is video
   */
  static isVideo(fileType: string): boolean {
    return fileType.startsWith('video/');
  }

  /**
   * Check if file is audio
   */
  static isAudio(fileType: string): boolean {
    return fileType.startsWith('audio/');
  }

  /**
   * Check if file is document
   */
  static isDocument(fileType: string): boolean {
    return fileType.includes('pdf') || 
           fileType.includes('word') || 
           fileType.includes('excel') || 
           fileType.includes('powerpoint') ||
           fileType.includes('text');
  }
}
