/**
 * Utility functions for handling file operations
 */

/**
 * Reads a file and returns it as a data URL
 * @param file The file to read
 * @returns A promise that resolves to the data URL
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a file to a base64 string
 * @param file The file to convert
 * @returns A promise that resolves to the base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts metadata from a file
 * @param file The file to extract metadata from
 * @returns An object containing file metadata
 */
export function extractFileMetadata(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    extension,
  };
}

/**
 * Suggests a document type based on file metadata
 * @param file The file to analyze
 * @returns A suggested document type
 */
export function suggestDocumentType(file: File): string {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  const extension = fileName.split('.').pop() || '';
  
  // Check for images
  if (fileType.startsWith('image/')) {
    if (fileName.includes('render') || fileName.includes('design')) {
      return 'render';
    }
    return 'photo';
  }
  
  // Check for PDFs and documents
  if (fileType.includes('pdf') || extension === 'pdf') {
    if (fileName.includes('contract') || fileName.includes('agreement')) {
      return 'contract';
    }
    if (fileName.includes('permit') || fileName.includes('approval')) {
      return 'permit';
    }
    if (fileName.includes('invoice') || fileName.includes('bill') || fileName.includes('receipt')) {
      return 'invoice';
    }
    if (fileName.includes('report') || fileName.includes('analysis')) {
      return 'report';
    }
    if (fileName.includes('blueprint') || fileName.includes('plan') || fileName.includes('drawing')) {
      return 'blueprint';
    }
  }
  
  // Check file extensions for specific document types
  switch (extension) {
    case 'dwg':
    case 'dxf':
    case 'skp':
      return 'blueprint';
    case 'docx':
    case 'doc':
      if (fileName.includes('contract')) return 'contract';
      if (fileName.includes('report')) return 'report';
      break;
    case 'xls':
    case 'xlsx':
      if (fileName.includes('invoice')) return 'invoice';
      break;
  }
  
  // Default based on name patterns
  if (fileName.includes('blueprint') || fileName.includes('plan') || fileName.includes('drawing')) {
    return 'blueprint';
  }
  if (fileName.includes('permit') || fileName.includes('license')) {
    return 'permit';
  }
  if (fileName.includes('contract') || fileName.includes('agreement')) {
    return 'contract';
  }
  if (fileName.includes('invoice') || fileName.includes('bill')) {
    return 'invoice';
  }
  if (fileName.includes('report')) {
    return 'report';
  }
  
  // Default to blueprint for unidentified files
  return 'other';
}