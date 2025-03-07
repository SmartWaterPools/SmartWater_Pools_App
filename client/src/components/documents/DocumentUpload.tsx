import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Loader2 } from "lucide-react";
import { documentSchema, type DocumentData } from "./documentSchema";
import { FileUploader } from "./FileUploader";
import { suggestDocumentType, readFileAsDataURL } from "@/lib/fileUtils";

interface DocumentUploadProps {
  projectId: number;
  phaseId?: number | null;
  onUploadComplete?: (fileUrl: string) => void;
}

export function DocumentUpload({ projectId, phaseId, onUploadComplete }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Create Document First with data from the form
  const queryClient = useQueryClient();
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("blueprint");
  const [documentDescription, setDocumentDescription] = useState("");
  
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      
      let fileUrl;
      if (fileDataUrl) {
        // In a production app, we'd upload to a storage service
        // For now, use the data URL as the file URL (works for images)
        fileUrl = fileDataUrl;
      } else {
        // For non-image files we can't preview, create a link with filename
        fileUrl = `/documents/${Date.now()}_${file.name}`;
      }
      
      // Create document in the database
      const requestBody = {
        title: documentName || file.name,
        description: documentDescription,
        documentType: documentType,
        fileUrl: fileUrl,
        phaseId: phaseId || null,
        uploadedBy: 1, // Using default admin user ID as a temporary solution
        // Let the server handle the upload date with defaultNow()
        tags: [],
        isPublic: true // Set to true for visibility
      };
      
      const response = await apiRequest(
        `/api/projects/${projectId}/documents`,
        "POST",
        requestBody
      );
      
      return { fileUrl, response };
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
      handleClearFile();
      
      // Invalidate queries to refresh the document list
      const projectDocumentsKey = `/api/projects/${projectId}/documents`;
      const phaseDocumentsKey = phaseId ? `/api/phases/${phaseId}/documents` : null;
      
      queryClient.invalidateQueries({ queryKey: [projectDocumentsKey] });
      if (phaseDocumentsKey) {
        queryClient.invalidateQueries({ queryKey: [phaseDocumentsKey] });
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

  const handleFileSelected = async (selectedFile: File, preview: string | null, metadata: any) => {
    setFile(selectedFile);
    
    // Set preview URL
    if (preview) {
      setPreviewUrl(preview);
      setFileDataUrl(preview);
    } else {
      setPreviewUrl(null);
      
      // For non-image files, we still try to get the data URL for storage
      try {
        const dataUrl = await readFileAsDataURL(selectedFile);
        setFileDataUrl(dataUrl);
      } catch (err) {
        console.error('Error creating data URL:', err);
        setFileDataUrl(null);
      }
    }
    
    // Auto-populate document name (without extension for cleaner display)
    const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, "");
    setDocumentName(nameWithoutExtension);
    
    // Extract and format metadata for description
    const lastModifiedDate = new Date(selectedFile.lastModified);
    const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
    
    const metadataText = [
      `Filename: ${selectedFile.name}`,
      `Type: ${selectedFile.type || "Unknown"}`,
      `Size: ${fileSizeMB} MB`,
      `Last modified: ${lastModifiedDate.toLocaleString()}`
    ].join("\n");
    
    setDocumentDescription(metadataText);
    
    // Auto-detect document type based on file metadata
    const suggestedType = suggestDocumentType(selectedFile);
    setDocumentType(suggestedType);
  };

  const handleClearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setFileDataUrl(null);
    setUploading(false);
    setDocumentName("");
    setDocumentDescription("");
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
    
    if (!documentName) {
      toast({
        title: "Document name required",
        description: "Please provide a name for this document.",
        variant: "destructive"
      });
      return;
    }
    
    uploadFileMutation.mutate(file);
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <FileUploader 
            onFileSelected={handleFileSelected}
            onFileClear={handleClearFile}
            file={file}
            isUploading={uploading}
            maxSizeMB={20}
          />
          
          {file && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="document-name">Document Name</Label>
                <Input
                  id="document-name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="mt-1"
                  placeholder="Enter document name"
                  disabled={uploading}
                />
              </div>
              
              <div>
                <Label htmlFor="document-type">Document Type</Label>
                <Select
                  value={documentType}
                  onValueChange={(value) => setDocumentType(value)}
                  disabled={uploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blueprint">Blueprint</SelectItem>
                    <SelectItem value="permit">Permit</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="render">Render</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="document-description">Description</Label>
                <Textarea
                  id="document-description"
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  className="mt-1"
                  placeholder="Enter a description"
                  disabled={uploading}
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClearFile}
                  disabled={uploading}
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}