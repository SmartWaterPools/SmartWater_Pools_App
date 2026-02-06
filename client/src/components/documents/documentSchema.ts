import { z } from "zod";

// Schema for validating document data
export const documentSchema = z.object({
  title: z.string().min(1, { message: "Document title is required" }),
  description: z.string().nullable().optional(),
  documentType: z.string(),
  url: z.string().min(1, { message: "File URL is required" }),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// Extended schema with additional properties returned from the API
export const documentApiSchema = documentSchema.extend({
  id: z.number(),
  projectId: z.number(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  phaseId: z.number().nullable(),
  phaseName: z.string().nullable().optional(),
  uploadDate: z.string().or(z.date()),
  uploadedBy: z.number(),
  uploadedByName: z.string().optional(),
});

// Type for document data
export type DocumentData = z.infer<typeof documentApiSchema>;

// File data with preview
export interface FileData {
  file: File;
  preview: string | null;
  metadata?: {
    lastModified?: number;
    name?: string;
    size?: number;
    type?: string;
  };
}