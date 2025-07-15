import {
  type ExtractedDocument,
  type DocumentType,
  type AccountingDocument,
} from './types';
import { logger } from '@kibly/utils';
import { getPortkeyClient } from './portkey-client';
import { PROCESSING_CONFIG, CONFIDENCE_THRESHOLDS } from './constants';
import { MonetaryValidator } from './monetary-validator';
import {
  DocumentClassifier,
  TextExtractor,
  CompanyProfileExtractor,
  AccountingDocumentExtractor,
} from './services';

export class DocumentExtractor {
  private readonly portkey;
  private readonly processingVersion = PROCESSING_CONFIG.PROCESSING_VERSION;
  
  private readonly classifier: DocumentClassifier;
  private readonly textExtractor: TextExtractor;
  private readonly companyExtractor: CompanyProfileExtractor;
  private readonly accountingExtractor: AccountingDocumentExtractor;
  
  constructor() {
    this.portkey = getPortkeyClient();
    
    // Initialize services
    this.classifier = new DocumentClassifier(this.portkey);
    this.textExtractor = new TextExtractor();
    this.companyExtractor = new CompanyProfileExtractor();
    this.accountingExtractor = new AccountingDocumentExtractor(this.portkey);
    
    logger.info('DocumentExtractor initialized with Portkey gateway using Claude');
  }

  async extractDocument(fileUrl: string, mimeType: string): Promise<ExtractedDocument> {
    const startTime = Date.now();
    
    logger.info('Starting document extraction', { fileUrl, mimeType });
    
    try {
      // Extract text from document
      const extractedText = await this.textExtractor.extractFromUrl(fileUrl, mimeType);
      
      // Classify document type
      const classification = await this.classifier.classify(extractedText);
      
      // Extract if accounting document
      if (this.isAccountingDocument(classification.type)) {
        const extractionResult = await this.accountingExtractor.extract(extractedText);
        const companyProfile = this.companyExtractor.extract(extractionResult.document);
        
        return this.buildExtractedDocument({
          documentType: classification.type,
          documentTypeConfidence: classification.confidence,
          extraction: extractionResult.document,
          fieldConfidences: extractionResult.fieldConfidences,
          overallConfidence: extractionResult.overallConfidence,
          companyProfile,
          processingDuration: Date.now() - startTime,
          extractionMethod: 'primary',
        });
      }
      
      // Return minimal extraction for non-accounting documents
      return {
        documentType: classification.type,
        documentTypeConfidence: classification.confidence,
        processingVersion: this.processingVersion,
        fields: {},
        overallConfidence: classification.confidence,
        dataCompleteness: 0,
        validationStatus: 'valid',
        extractionMethod: 'primary',
        processingDuration: Date.now() - startTime,
        errors: [],
      };
    } catch (error) {
      logger.error('Document extraction failed', { error, fileUrl });
      throw error;
    }
  }

  private buildExtractedDocument(params: {
    documentType: DocumentType;
    documentTypeConfidence: number;
    extraction: AccountingDocument;
    fieldConfidences: Record<string, number>;
    overallConfidence: number;
    companyProfile?: any;
    processingDuration: number;
    extractionMethod?: 'primary' | 'ocr_fallback';
  }): ExtractedDocument {
    // Build fields with LLM-provided confidence scores
    const fields: ExtractedDocument['fields'] = {};
    const source = params.extractionMethod === 'ocr_fallback' ? 'ocr' : 'ai_extraction';
    
    Object.entries(params.extraction).forEach(([fieldName, value]) => {
      if (value !== null && value !== undefined && fieldName !== 'lineItems') {
        fields[fieldName] = {
          value,
          confidence: params.fieldConfidences[fieldName] || 0,
          source,
        };
      }
    });
    
    // Calculate data completeness
    const criticalFields = ['totalAmount', 'currency', 'vendorName', 'documentDate'];
    const presentCriticalFields = criticalFields.filter(field => 
      params.extraction[field as keyof AccountingDocument] !== null
    );
    const dataCompleteness = (presentCriticalFields.length / criticalFields.length) * 100;
    
    // Perform monetary validation
    const monetaryValidation = MonetaryValidator.validate(params.extraction);
    const errors: Array<{ field: string; error: string }> = monetaryValidation.errors.map(error => ({
      field: 'monetary',
      error,
    }));
    
    // Add warnings as lower priority errors
    monetaryValidation.warnings.forEach(warning => {
      errors.push({
        field: 'monetary_warning',
        error: warning,
      });
    });
    
    // Determine validation status
    let validationStatus = this.determineValidationStatus(params.overallConfidence, dataCompleteness);
    if (!monetaryValidation.isValid) {
      validationStatus = 'invalid';
    } else if (monetaryValidation.warnings.length > 0 && validationStatus === 'valid') {
      validationStatus = 'needs_review';
    }
    
    return {
      documentType: params.documentType,
      documentTypeConfidence: params.documentTypeConfidence,
      processingVersion: this.processingVersion,
      fields,
      companyProfile: params.companyProfile,
      lineItems: this.processLineItems(params.extraction.lineItems),
      overallConfidence: params.overallConfidence,
      dataCompleteness,
      validationStatus,
      extractionMethod: params.extractionMethod || 'primary',
      processingDuration: params.processingDuration,
      errors,
    };
  }

  private determineValidationStatus(confidence: number, completeness: number): ExtractedDocument['validationStatus'] {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH && completeness >= 80) {
      return 'valid';
    }
    if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM || completeness >= 60) {
      return 'needs_review';
    }
    return 'invalid';
  }

  private isAccountingDocument(type: DocumentType): boolean {
    return ['invoice', 'receipt', 'purchase_order', 'credit_note', 'statement'].includes(type);
  }

  private processLineItems(lineItems: any[]): ExtractedDocument['lineItems'] {
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return [];
    }

    return lineItems.map(item => ({
      description: item.description ?? null,
      quantity: item.quantity ?? null,
      unitPrice: item.unitPrice ?? null,
      totalPrice: item.totalPrice ?? null,
      taxAmount: item.taxAmount ?? null,
      confidence: this.calculateLineItemConfidence(item),
    }));
  }

  private calculateLineItemConfidence(item: any): number {
    const scores: number[] = [];
    
    if (item.description) scores.push(90);
    if (typeof item.totalPrice === 'number') scores.push(95);
    if (typeof item.quantity === 'number') scores.push(85);
    if (typeof item.unitPrice === 'number') scores.push(85);
    
    if (scores.length === 0) return 50;
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }
}