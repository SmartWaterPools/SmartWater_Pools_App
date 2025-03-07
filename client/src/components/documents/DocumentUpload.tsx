import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, X, Check, Loader2 } from "lucide-react";

interface DocumentUploadProps {
  projectId: number;
  phaseId?: number | null;
  onUploadComplete?: (fileUrl: string) => void;
}

export function DocumentUpload({ projectId, phaseId, onUploadComplete }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // For a complete implementation, we would have a dedicated endpoint for file uploads
  // Here we're simulating a file upload - in a real implementation, we'd post to S3 or similar
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      
      // Simulate file upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a mock file URL - in real implementation this would be a response from server
      // This is a placeholder for demonstration - real implementation would post to server
      const mockFileUrl = `https://example.com/uploads/${Date.now()}_${file.name}`;
      
      return { fileUrl: mockFileUrl };
    },
    onSuccess: (data) => {
      toast({
        title: "File uploaded",
        description: "File has been successfully uploaded.",
      });
      
      // Call the callback with the file URL
      if (onUploadComplete) {
        onUploadComplete(data.fileUrl);
      }
      
      // Clear the file and preview
      setFile(null);
      setPreviewUrl(null);
      setUploading(false);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive"
      });
      setUploading(false);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Create a preview URL for image files
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive"
      });
      return;
    }
    
    uploadFileMutation.mutate(file);
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Upload Document</Label>
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="mt-1"
              disabled={uploading}
            />
          </div>
          
          {file && !previewUrl && (
            <div className="flex items-center p-2 border rounded">
              <div className="flex-1 truncate">{file.name}</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {previewUrl && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-40 mx-auto border rounded"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1"
                onClick={handleClear}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={!file || uploading}
            >
              Clear
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}