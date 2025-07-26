export interface FileDeduplicationResult {
  isDuplicate: boolean;
  duplicateFileId?: string | undefined;
  contentHash: string;
  confidence: number;
}

export interface InvoiceDeduplicationResult {
  isDuplicate: boolean;
  duplicateExtractionId?: string | undefined;
  invoiceFingerprint: string;
  duplicateConfidence: number;
  duplicateType: "exact" | "likely" | "possible" | "unique";
  similarityScores?: {
    vendorMatch: number;
    invoiceNumberMatch: number;
    dateProximity: number;
    amountMatch: number;
    overallScore: number;
  };
}

export interface DeduplicationThresholds {
  CERTAIN: number;
  LIKELY: number;
  POSSIBLE: number;
  UNLIKELY: number;
}

export interface InvoiceData {
  vendorName?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | Date | null;
  totalAmount?: number | string | null;
  currency?: string | null;
}

export interface ExtractedFieldsData {
  [key: string]: {
    value: any;
    confidence: number;
    source: string;
  };
}
