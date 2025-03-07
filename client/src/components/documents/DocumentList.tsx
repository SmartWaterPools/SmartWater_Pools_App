import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/types";
import { FileText, Download, Trash2, Edit, FilePlus, Filter } from "lucide-react";
import { documentSchema, type DocumentData } from "./documentSchema";
import { z } from "zod";

interface DocumentListProps {
  projectId: number;
  phaseId?: number | null;
  documentType?: string | null;
}

export function DocumentList({ projectId, phaseId, documentType }: DocumentListProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentData | null>(null);
  const [docTypeFilter, setDocTypeFilter] = useState<string | null>(documentType || null);
  
  const queryClient = useQueryClient();
  
  // Form for editing document details
  const form = useForm<z.infer<typeof documentSchema>>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: "",
      description: "",
      documentType: "",
      fileUrl: ""
    }
  });
  
  // Query for fetching documents
  const queryEndpoint = phaseId 
    ? `/api/phases/${phaseId}/documents` 
    : documentType 
      ? `/api/projects/${projectId}/documents/type/${documentType}`
      : `/api/projects/${projectId}/documents`;
  
  const { data: documents = [], isLoading } = useQuery<DocumentData[]>({
    queryKey: [queryEndpoint],
    enabled: !!projectId
  });
  
  // Mutation for updating document
  const updateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof documentSchema>) => {
      if (!selectedDocument) return null;
      return apiRequest(
        `/api/documents/${selectedDocument.id}`,
        "PATCH",
        values
      );
    },
    onSuccess: () => {
      toast({
        title: "Document updated",
        description: "Document details have been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: [queryEndpoint] });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating the document. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for deleting document
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest(
        `/api/documents/${documentId}`,
        "DELETE"
      );
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "Document has been removed successfully."
      });
      queryClient.invalidateQueries({ queryKey: [queryEndpoint] });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the document. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  function onSubmit(data: z.infer<typeof documentSchema>) {
    updateMutation.mutate(data);
  }
  
  function handleDocTypeFilter(type: string | null) {
    setDocTypeFilter(type);
  }
  
  function handleEdit(doc: DocumentData) {
    setSelectedDocument(doc);
    form.reset({
      title: doc.title,
      description: doc.description || "",
      documentType: doc.documentType,
      fileUrl: doc.fileUrl
    });
    setIsEditDialogOpen(true);
  }
  
  function handleDelete(documentId: number) {
    if (window.confirm("Are you sure you want to delete this document? This cannot be undone.")) {
      deleteMutation.mutate(documentId);
    }
  }
  
  // Get unique document types
  const uniqueDocTypes = documents.length > 0
    ? Array.from(new Set(documents.map((doc) => doc.documentType)))
    : [];
  
  // Filter documents if a type filter is applied
  const filteredDocuments = docTypeFilter
    ? documents.filter((doc) => doc.documentType === docTypeFilter)
    : documents;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center p-4 border rounded animate-pulse">
                <div className="h-10 w-10 rounded bg-muted"></div>
                <div className="ml-4 space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Documents</CardTitle>
        
        {uniqueDocTypes.length > 0 && !documentType && (
          <div className="flex items-center">
            <Select value={docTypeFilter || "all"} onValueChange={(value) => handleDocTypeFilter(value === "all" ? null : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {uniqueDocTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {docTypeFilter && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDocTypeFilter(null)}
                className="ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredDocuments.length > 0 ? (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="flex items-start p-4 border rounded-lg hover:bg-accent/5">
                <div className="mr-4 p-2 bg-muted rounded">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{doc.title}</h3>
                  <p className="text-sm text-muted-foreground">{doc.description}</p>
                  <div className="flex items-center mt-1 text-xs">
                    <span className="mr-4">{formatDate(doc.uploadDate)}</span>
                    <span className="bg-accent/30 px-2 py-0.5 rounded">{doc.documentType}</span>
                    {doc.phaseId && (
                      <span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Phase: {doc.phaseName || doc.phaseId}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1 ml-2">
                  <Button variant="ghost" size="icon" asChild>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEdit(doc as DocumentData)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No documents found</h3>
            <p className="text-muted-foreground">
              {documentType
                ? `No ${documentType} documents have been uploaded for this project.`
                : phaseId
                  ? "No documents have been uploaded for this phase."
                  : "No documents have been uploaded for this project yet."
              }
            </p>
          </div>
        )}
      </CardContent>

      {/* Edit Document Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update the document details below.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || "blueprint"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}