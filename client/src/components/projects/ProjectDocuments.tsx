import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/types";
import { 
  Upload, 
  Download, 
  Trash2, 
  Edit2, 
  FileText, 
  Image, 
  File, 
  Eye,
  X,
  Loader2
} from "lucide-react";

interface ProjectDocument {
  id: number;
  projectId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadDate: string;
  uploadedBy: number;
  url: string;
  title: string | null;
  description: string | null;
  documentType: string | null;
  phaseId: number | null;
  isPublic: boolean;
  tags: string[] | null;
  uploadedByName?: string;
}

interface ProjectDocumentsProps {
  projectId: number;
  projectPhases?: Array<{
    id: number;
    name: string;
    order: number;
  }>;
}

export function ProjectDocuments({ projectId, projectPhases = [] }: ProjectDocumentsProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ProjectDocument | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("other");
  const [phaseId, setPhaseId] = useState<string>("");
  const [tags, setTags] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Document type categories
  const documentTypes = [
    { value: "all", label: "All Documents" },
    { value: "blueprint", label: "Blueprints & Plans" },
    { value: "permit", label: "Permits & Legal" },
    { value: "photo", label: "Site Photos" },
    { value: "contract", label: "Contracts" },
    { value: "report", label: "Reports" },
    { value: "other", label: "Other" }
  ];

  // Query for fetching documents
  const { data: documents = [], isLoading, refetch } = useQuery<ProjectDocument[]>({
    queryKey: [`/api/projects/${projectId}/documents`],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/documents`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    }
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name);
      formData.append("description", description);
      formData.append("documentType", documentType);
      if (phaseId && phaseId !== "none") formData.append("phaseId", phaseId);
      if (tags) formData.append("tags", tags);

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload document");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document uploaded",
        description: "The document has been uploaded successfully"
      });
      setIsUploadDialogOpen(false);
      resetUploadForm();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<ProjectDocument> }) => {
      return apiRequest("PATCH", `/api/documents/${data.id}`, data.updates);
    },
    onSuccess: () => {
      toast({
        title: "Document updated",
        description: "The document has been updated successfully"
      });
      setIsEditDialogOpen(false);
      setSelectedDocument(null);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetUploadForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setDocumentType("other");
    setPhaseId("");
    setTags("");
    setUploadProgress(0);
  };

  const handleFileSelect = (selectedFile: File) => {
    // Validate file size (50MB max)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    
    // Auto-suggest document type based on file extension
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf" || ext === "dwg" || ext === "dxf") {
      setDocumentType("blueprint");
    } else if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) {
      setDocumentType("photo");
    } else if (["doc", "docx"].includes(ext || "")) {
      setDocumentType("contract");
    }
    
    // Use filename as default title
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (mimeType.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = (document: ProjectDocument) => {
    window.open(`/api/documents/${document.id}`, "_blank");
  };

  const handleView = (document: ProjectDocument) => {
    // For images and PDFs, open in new tab
    if (document.mimeType.startsWith("image/") || document.mimeType.includes("pdf")) {
      window.open(`/api/documents/${document.id}`, "_blank");
    } else {
      // For other files, trigger download
      handleDownload(document);
    }
  };

  // Filter documents by type
  const filteredDocuments = documentTypeFilter === "all" 
    ? documents 
    : documents.filter(doc => doc.documentType === documentTypeFilter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filter and upload button */}
      <div className="flex items-center justify-between">
        <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {documentTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Documents grid */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">No documents uploaded</p>
            <p className="text-sm text-gray-500 mb-4">Upload documents to keep track of project files</p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(document => (
            <Card key={document.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(document.mimeType)}
                    <CardTitle className="text-sm font-medium truncate">
                      {document.title || document.originalName}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {document.documentType || "other"}
                  </Badge>
                </div>
                {document.description && (
                  <CardDescription className="text-xs mt-2 line-clamp-2">
                    {document.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>Size:</span>
                    <span>{formatFileSize(document.size)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Uploaded:</span>
                    <span>{formatDate(document.uploadDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>By:</span>
                    <span className="truncate">{document.uploadedByName || "Unknown"}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleView(document)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(document)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedDocument(document);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this document?")) {
                        deleteMutation.mutate(document.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a new document to the project
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File upload area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileSelect(selectedFile);
                }}
              />
              
              {file ? (
                <div className="space-y-2">
                  <File className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2">Click or drag file to upload</p>
                  <p className="text-sm text-gray-500">Max file size: 50MB</p>
                </>
              )}
            </div>

            {/* Document metadata */}
            {file && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter document title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter document description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Document Type</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger id="documentType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blueprint">Blueprint/Plan</SelectItem>
                        <SelectItem value="permit">Permit/Legal</SelectItem>
                        <SelectItem value="photo">Site Photo</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="report">Report</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {projectPhases.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="phase">Phase (Optional)</Label>
                      <Select value={phaseId} onValueChange={setPhaseId}>
                        <SelectTrigger id="phase">
                          <SelectValue placeholder="Select phase" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {projectPhases.map(phase => (
                            <SelectItem key={phase.id} value={phase.id.toString()}>
                              {phase.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (Optional)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Enter tags separated by commas"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!file || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update document information
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  defaultValue={selectedDocument.title || ""}
                  onChange={(e) => {
                    if (selectedDocument) {
                      setSelectedDocument({
                        ...selectedDocument,
                        title: e.target.value
                      });
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  defaultValue={selectedDocument.description || ""}
                  rows={3}
                  onChange={(e) => {
                    if (selectedDocument) {
                      setSelectedDocument({
                        ...selectedDocument,
                        description: e.target.value
                      });
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-type">Document Type</Label>
                <Select
                  defaultValue={selectedDocument.documentType || "other"}
                  onValueChange={(value) => {
                    if (selectedDocument) {
                      setSelectedDocument({
                        ...selectedDocument,
                        documentType: value
                      });
                    }
                  }}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blueprint">Blueprint/Plan</SelectItem>
                    <SelectItem value="permit">Permit/Legal</SelectItem>
                    <SelectItem value="photo">Site Photo</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedDocument) {
                  updateMutation.mutate({
                    id: selectedDocument.id,
                    updates: {
                      title: selectedDocument.title,
                      description: selectedDocument.description,
                      documentType: selectedDocument.documentType
                    }
                  });
                }
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}