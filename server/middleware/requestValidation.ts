import { Request, Response, NextFunction } from 'express';

// Middleware to validate request size and prevent large payload attacks
export const validateRequestSize = (maxSizeMB: number = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check content-length header first
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = maxSizeMB * 1024 * 1024;
      
      if (sizeInBytes > maxSizeInBytes) {
        console.warn(`Request size validation failed: ${sizeInBytes} bytes exceeds ${maxSizeInBytes} bytes limit`);
        return res.status(413).json({
          error: 'Payload too large',
          message: `Request body exceeds ${maxSizeMB}MB limit`,
          maxSize: `${maxSizeMB}MB`,
          receivedSize: `${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`
        });
      }
    }
    
    next();
  };
};

// Middleware to validate JSON payloads
export const validateJsonPayload = (req: Request, res: Response, next: NextFunction) => {
  // Only validate JSON content type
  if (req.is('application/json')) {
    // Check for common JSON injection patterns
    const bodyStr = JSON.stringify(req.body);
    
    // Check for excessive nesting depth (prevent stack overflow attacks)
    const maxDepth = 10;
    const checkDepth = (obj: any, depth: number = 0): boolean => {
      if (depth > maxDepth) return false;
      
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (!checkDepth(obj[key], depth + 1)) return false;
        }
      }
      
      return true;
    };
    
    if (!checkDepth(req.body)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request body has excessive nesting depth'
      });
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /__proto__/gi,
      /constructor\s*\[/gi,
      /prototype\s*\[/gi
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(bodyStr)) {
        console.warn(`Suspicious pattern detected in request: ${pattern}`);
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Request contains potentially malicious content'
        });
      }
    }
  }
  
  next();
};

// Middleware to sanitize file uploads
export const validateFileUpload = (allowedTypes: string[], maxSizeMB: number = 5) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This would be used with multer or similar file upload middleware
    // For now, we'll just validate if there's file data in the request
    
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      const contentLength = req.headers['content-length'];
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength, 10);
        const maxSizeInBytes = maxSizeMB * 1024 * 1024;
        
        if (sizeInBytes > maxSizeInBytes) {
          return res.status(413).json({
            error: 'File too large',
            message: `File exceeds ${maxSizeMB}MB limit`,
            maxSize: `${maxSizeMB}MB`
          });
        }
      }
    }
    
    next();
  };
};