import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentList } from "./DocumentList";
import { DocumentUpload } from "./DocumentUpload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FilePenLine, Upload, Image, FileText, Folder } from "lucide-react";

interface DocumentGalleryProps {
  projectId: number;
  projectPhases?: Array<{
    id: number;
    name: string;
    order: number;
  }>;
}

export function DocumentGallery({ projectId, projectPhases = [] }: DocumentGalleryProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Document type categories
  const documentCategories = [
    { id: "all", name: "All Documents", icon: <Folder className="h-4 w-4" /> },
    { id: "blueprints", name: "Blueprints & Plans", icon: <Image className="h-4 w-4" /> },
    { id: "permits", name: "Permits & Legal", icon: <FilePenLine className="h-4 w-4" /> },
    { id: "photos", name: "Site Photos", icon: <Image className="h-4 w-4" /> },
    { id: "contracts", name: "Contracts", icon: <FileText className="h-4 w-4" /> }
  ];

  // Map category IDs to document types for filtering
  const categoryToTypeMap: Record<string, string | null> = {
    "all": null,
    "blueprints": "blueprint",
    "permits": "permit",
    "photos": "photo",
    "contracts": "contract"
  };

  // Handle file upload completion
  const handleUploadComplete = (fileUrl: string) => {
    setIsUploadDialogOpen(false);
    // We could do additional handling here if needed
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Project Documentation</h2>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Project Document</DialogTitle>
              <DialogDescription>
                Upload a document or image to add to the project documentation.
              </DialogDescription>
            </DialogHeader>
            <DocumentUpload 
              projectId={projectId} 
              phaseId={selectedPhaseId}
              onUploadComplete={handleUploadComplete}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setSelectedPhaseId(null);
        }}
        className="w-full"
      >
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0">
          <div className="w-full md:w-64 md:mr-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Categories</CardTitle>
                <CardDescription>
                  Browse by document type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TabsList className="flex flex-col h-auto space-y-1">
                  {documentCategories.map(category => (
                    <TabsTrigger 
                      key={category.id} 
                      value={category.id}
                      className="justify-start w-full"
                    >
                      <div className="flex items-center">
                        {category.icon}
                        <span className="ml-2">{category.name}</span>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {projectPhases.length > 0 && (
                  <>
                    <div className="my-4 text-sm font-medium">Project Phases</div>
                    <div className="space-y-1">
                      {projectPhases.map(phase => (
                        <Button
                          key={phase.id}
                          variant={selectedPhaseId === phase.id ? "secondary" : "ghost"}
                          className="justify-start w-full"
                          onClick={() => {
                            setActiveTab("phase");
                            setSelectedPhaseId(phase.id);
                          }}
                        >
                          <Folder className="h-4 w-4 mr-2" />
                          {phase.name}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="flex-1">
            {documentCategories.map(category => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                <DocumentList 
                  projectId={projectId} 
                  documentType={categoryToTypeMap[category.id]} 
                />
              </TabsContent>
            ))}
            
            <TabsContent value="phase" className="mt-0">
              {selectedPhaseId && (
                <DocumentList 
                  projectId={projectId} 
                  phaseId={selectedPhaseId} 
                />
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}