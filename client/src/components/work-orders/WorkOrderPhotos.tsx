import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Camera, Upload, X, Image, Maximize2, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface WorkOrderPhotosProps {
  workOrderId: number;
  photos: string[] | null;
  compact?: boolean;
}

const isVideo = (url: string) => /\.(mp4|mov|webm|avi)$/i.test(url);

export function WorkOrderPhotos({ workOrderId, photos, compact = false }: WorkOrderPhotosProps) {
  const { toast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  const photoList = photos || [];

  const uploadPhotos = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('photos', file));
      const response = await fetch(`/api/work-orders/${workOrderId}/photos`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      toast({ title: "Photos uploaded", description: "Photos have been added to this work order." });
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Failed to upload photos. Please try again.", variant: "destructive" });
    },
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoUrl: string) => {
      const response = await fetch(`/api/work-orders/${workOrderId}/photos`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl }),
      });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', workOrderId] });
      toast({ title: "Photo removed" });
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Failed to remove photo. Please try again.", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadPhotos.mutate(e.target.files);
      e.target.value = '';
    }
  };

  const content = (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div className={`flex gap-2 ${compact ? 'mb-3' : 'mb-4'}`}>
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "lg"}
          className={compact ? "flex-1" : "flex-1 py-5 text-base"}
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploadPhotos.isPending}
        >
          {uploadPhotos.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
          Take Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "lg"}
          className={compact ? "flex-1" : "flex-1 py-5 text-base"}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadPhotos.isPending}
        >
          {uploadPhotos.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Upload
        </Button>
      </div>

      {uploadPhotos.isPending && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading...
        </div>
      )}

      {photoList.length > 0 ? (
        <div className={`grid gap-2 ${
          compact
            ? 'grid-cols-2'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        }`}>
          {photoList.map((photo, index) => (
            <div
              key={`${photo}-${index}`}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border dark:border-gray-700 bg-muted"
            >
              {isVideo(photo) ? (
                <video
                  src={photo}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={photo}
                  alt={`Work order photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewingPhoto(photo)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => deletePhoto.mutate(photo)}
                  disabled={deletePhoto.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Image className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No photos yet</p>
        </div>
      )}

      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-4xl p-2">
          {viewingPhoto && (
            isVideo(viewingPhoto) ? (
              <video
                src={viewingPhoto}
                controls
                autoPlay
                className="w-full h-auto max-h-[80vh] object-contain rounded"
              />
            ) : (
              <img
                src={viewingPhoto}
                alt="Full size photo"
                className="w-full h-auto max-h-[80vh] object-contain rounded"
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  if (compact) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos & Media
          </CardTitle>
          {photoList.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {photoList.length} photo{photoList.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}