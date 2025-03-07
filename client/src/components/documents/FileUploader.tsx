import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { readFileAsDataURL, extractFileMetadata, suggestDocumentType } from '@/lib/fileUtils';
import { Upload, X, Loader2, FileText, Image, FileImage, Film, Presentation } from 'lucide-react';

interface FileUploaderProps {
  onFileSelected: (file: File, preview: string | null, metadata: any) => void;
  onFileClear: () => void;
  fileTypes?: string; // MIME types allowed
  maxSizeMB?: number; // Max file size in MB
  file: File | null;
  isUploading?: boolean;
}

export function FileUploader({ 
  onFileSelected, 
  onFileClear, 
  fileTypes = "*",
  maxSizeMB = 10, 
  file,
  isUploading = false
}: FileUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Clean up URL object when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  
  // Simulate upload progress (for demonstration)
  useEffect(() => {
    if (isUploading && uploadProgress < 90) {
      const timer = setTimeout(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 300);
      return () => clearTimeout(timer);
    } else if (!isUploading) {
      setUploadProgress(0);
    }
  }, [isUploading, uploadProgress]);

  // Generate preview when file changes
  useEffect(() => {
    if (file) {
      if (file.type.startsWith('image/')) {
        const generatePreview = async () => {
          try {
            const dataUrl = await readFileAsDataURL(file);
            setPreviewUrl(dataUrl);
          } catch (err) {
            console.error('Error creating preview:', err);
            setPreviewUrl(null);
          }
        };
        generatePreview();
      } else {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Validate file size
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: `File size exceeds the maximum allowed size of ${maxSizeMB}MB.`,
        variant: 'destructive'
      });
      return;
    }
    
    // Extract metadata
    const metadata = extractFileMetadata(selectedFile);
    
    // Generate preview for image files
    let preview: string | null = null;
    if (selectedFile.type.startsWith('image/')) {
      try {
        preview = await readFileAsDataURL(selectedFile);
      } catch (err) {
        console.error('Error creating preview:', err);
      }
    }
    
    onFileSelected(selectedFile, preview, metadata);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Validate file size
      if (droppedFile.size > maxSizeMB * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `File size exceeds the maximum allowed size of ${maxSizeMB}MB.`,
          variant: 'destructive'
        });
        return;
      }
      
      // Extract metadata
      const metadata = extractFileMetadata(droppedFile);
      
      // Generate preview for image files
      let preview: string | null = null;
      if (droppedFile.type.startsWith('image/')) {
        try {
          preview = await readFileAsDataURL(droppedFile);
        } catch (err) {
          console.error('Error creating preview:', err);
        }
      }
      
      onFileSelected(droppedFile, preview, metadata);
    }
  };

  const handleClear = () => {
    onFileClear();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="h-8 w-8" />;
    
    const type = file.type.toLowerCase();
    if (type.startsWith('image/')) {
      return <FileImage className="h-6 w-6 text-primary" />;
    } else if (type.startsWith('video/')) {
      return <Film className="h-6 w-6 text-primary" />;
    } else if (type.includes('pdf')) {
      return <FileText className="h-6 w-6 text-primary" />;
    } else if (type.includes('presentation') || file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
      return <Presentation className="h-6 w-6 text-primary" />;
    }
    
    return <FileText className="h-6 w-6 text-primary" />;
  };

  return (
    <div className="w-full">
      <input
        type="file"
        id="file-upload"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={fileTypes}
        disabled={isUploading}
      />
      
      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center space-y-2 cursor-pointer">
            <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
            <h3 className="text-lg font-medium">Drop your file here or click to browse</h3>
            <p className="text-sm text-muted-foreground">
              Maximum file size: {maxSizeMB}MB
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-background">
          <div className="flex items-start space-x-4">
            {previewUrl ? (
              <div className="relative flex-shrink-0">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded border"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center rounded bg-muted">
                {getFileIcon()}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{file.name}</h4>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB • Last modified: {new Date(file.lastModified).toLocaleDateString()}
              </p>
              
              {isUploading && (
                <div className="mt-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Uploading... {uploadProgress}%</p>
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              disabled={isUploading}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}