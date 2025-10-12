import { Router } from "express";
import multer from "multer";
import path from "path";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { type User, type ProjectDocument } from "@shared/schema";
import { insertProjectDocumentSchema } from "@shared/schema";
import fs from "fs";
import { promisify } from "util";

const router = Router();
const unlinkAsync = promisify(fs.unlink);

// Configure multer for file uploads
const uploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create directory if it doesn't exist
    const uploadPath = path.join(process.cwd(), "uploads", "documents");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "-");
    cb(null, uniqueSuffix + "-" + baseName + ext);
  }
});

// File filter to validate file types
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed"
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, images, documents, and archives are allowed."), false);
  }
};

const upload = multer({
  storage: uploadStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

// GET /api/projects/:id/documents - List all documents for a project
router.get("/projects/:id/documents", isAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const user = req.user as User;
    
    // Verify project exists and user has access
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Get client to verify organization access
    const client = await storage.getUser(project.clientId);
    if (!client || client.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Get all documents for the project
    const documents = await storage.getProjectDocuments(projectId);
    
    // Add uploader names to the documents
    const documentsWithUploaders = await Promise.all(documents.map(async (doc) => {
      const uploader = await storage.getUser(doc.uploadedBy);
      return {
        ...doc,
        uploadedByName: uploader?.name || "Unknown"
      };
    }));
    
    res.json(documentsWithUploaders);
  } catch (error) {
    console.error("Error fetching project documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// GET /api/projects/:id/documents/type/:documentType - Get documents by type
router.get("/projects/:id/documents/type/:documentType", isAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const documentType = req.params.documentType;
    const user = req.user as User;
    
    // Verify project exists and user has access
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Get client to verify organization access
    const client = await storage.getUser(project.clientId);
    if (!client || client.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Get documents by type
    const documents = await storage.getDocumentsByType(projectId, documentType);
    
    // Add uploader names to the documents
    const documentsWithUploaders = await Promise.all(documents.map(async (doc) => {
      const uploader = await storage.getUser(doc.uploadedBy);
      return {
        ...doc,
        uploadedByName: uploader?.name || "Unknown"
      };
    }));
    
    res.json(documentsWithUploaders);
  } catch (error) {
    console.error("Error fetching documents by type:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// GET /api/phases/:phaseId/documents - Get documents for a project phase
router.get("/phases/:phaseId/documents", isAuthenticated, async (req, res) => {
  try {
    const phaseId = parseInt(req.params.phaseId);
    const user = req.user as User;
    
    // Verify phase exists and user has access via project
    const phase = await storage.getProjectPhase(phaseId);
    if (!phase) {
      return res.status(404).json({ error: "Phase not found" });
    }
    
    const project = await storage.getProject(phase.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const client = await storage.getUser(project.clientId);
    if (!client || client.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Get documents for the phase
    const documents = await storage.getDocumentsByPhase(phaseId);
    
    // Add uploader names to the documents
    const documentsWithUploaders = await Promise.all(documents.map(async (doc) => {
      const uploader = await storage.getUser(doc.uploadedBy);
      return {
        ...doc,
        uploadedByName: uploader?.name || "Unknown",
        phaseName: phase.name
      };
    }));
    
    res.json(documentsWithUploaders);
  } catch (error) {
    console.error("Error fetching phase documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// POST /api/projects/:id/documents - Upload new document
router.post("/projects/:id/documents", isAuthenticated, upload.single("file"), async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const user = req.user as User;
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    // Verify project exists and user has access
    const project = await storage.getProject(projectId);
    if (!project) {
      // Clean up uploaded file
      await unlinkAsync(req.file.path);
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Get client to verify organization access
    const client = await storage.getUser(project.clientId);
    if (!client || client.organizationId !== user.organizationId) {
      // Clean up uploaded file
      await unlinkAsync(req.file.path);
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Parse request body for document metadata
    const { title, description, documentType, phaseId, tags } = req.body;
    
    // Create document record in database
    const documentData = {
      projectId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: user.id,
      url: `/uploads/documents/${req.file.filename}`,
      title: title || req.file.originalname,
      description: description || null,
      documentType: documentType || "other",
      phaseId: phaseId ? parseInt(phaseId) : null,
      isPublic: false,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : null
    };
    
    // Validate the document data
    const validationResult = insertProjectDocumentSchema.safeParse(documentData);
    if (!validationResult.success) {
      // Clean up uploaded file
      await unlinkAsync(req.file.path);
      return res.status(400).json({ error: "Invalid document data", details: validationResult.error });
    }
    
    const newDocument = await storage.createDocument(documentData);
    
    // Add uploader name
    const documentWithUploader = {
      ...newDocument,
      uploadedByName: user.name
    };
    
    res.status(201).json(documentWithUploader);
  } catch (error) {
    console.error("Error uploading document:", error);
    // Try to clean up uploaded file if it exists
    if (req.file) {
      try {
        await unlinkAsync(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError);
      }
    }
    res.status(500).json({ error: "Failed to upload document" });
  }
});

// PATCH /api/documents/:id - Update document metadata
router.patch("/documents/:id", isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const user = req.user as User;
    
    // Get the document
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Verify project access through document
    const project = await storage.getProject(document.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const client = await storage.getUser(project.clientId);
    if (!client || client.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Update only allowed fields
    const { title, description, documentType, phaseId, tags } = req.body;
    const updateData: Partial<ProjectDocument> = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (documentType !== undefined) updateData.documentType = documentType;
    if (phaseId !== undefined) updateData.phaseId = phaseId ? parseInt(phaseId) : null;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [tags];
    
    const updatedDocument = await storage.updateDocument(documentId, updateData);
    
    if (!updatedDocument) {
      return res.status(500).json({ error: "Failed to update document" });
    }
    
    // Add uploader name
    const uploader = await storage.getUser(updatedDocument.uploadedBy);
    const documentWithUploader = {
      ...updatedDocument,
      uploadedByName: uploader?.name || "Unknown"
    };
    
    res.json(documentWithUploader);
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// DELETE /api/documents/:id - Delete a document
router.delete("/documents/:id", isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const user = req.user as User;
    
    // Get the document
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Verify project access through document
    const project = await storage.getProject(document.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const client = await storage.getUser(project.clientId);
    if (!client || client.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Delete file from filesystem
    const filePath = path.join(process.cwd(), "uploads", "documents", document.filename);
    try {
      await unlinkAsync(filePath);
    } catch (error) {
      console.error("Error deleting file from filesystem:", error);
      // Continue with database deletion even if file deletion fails
    }
    
    // Delete from database
    const deleted = await storage.deleteDocument(documentId);
    if (!deleted) {
      return res.status(500).json({ error: "Failed to delete document" });
    }
    
    res.json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// GET /api/documents/:id - Download/view a document
router.get("/documents/:id", isAuthenticated, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const user = req.user as User;
    
    // Get the document
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Verify project access through document (unless document is public)
    if (!document.isPublic) {
      const project = await storage.getProject(document.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const client = await storage.getUser(project.clientId);
      if (!client || client.organizationId !== user.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    
    // Send file
    const filePath = path.join(process.cwd(), "uploads", "documents", document.filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    
    // Set appropriate headers
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${document.originalName}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error downloading document:", error);
    res.status(500).json({ error: "Failed to download document" });
  }
});

export default router;