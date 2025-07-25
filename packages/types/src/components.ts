// Component-specific types

// File components expect serialized dates
export interface FileItem {
  id: string;
  fileName: string;
  size?: number;
  mimeType?: string;
  createdAt: string; // ISO string
  processingStatus?: string;
  uploadedBy?: string;
  supplier?: string;
  metadata?: {
    displayName?: string;
    supplierName?: string;
    documentType?: string;
    [key: string]: any;
  };
  extraction?: {
    overallConfidence: number;
    documentType: string;
    validationStatus: string;
    extractedFields?: Record<string, any>;
  };
}

export interface Supplier {
  name: string;
  fileCount: number;
  supplierId?: string | null;
  files?: FileItem[];
}

export interface YearData {
  year: string;
  totalFiles: number;
  suppliers: Record<string, Supplier>;
}

// Serialized version of FileData for API responses
export interface FileDataSerialized {
  byYear: Record<string, YearData>;
  totalFiles: number;
}