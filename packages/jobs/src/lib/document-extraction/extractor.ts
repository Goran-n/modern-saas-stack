import { getPortkeyClient } from "@figgy/config";
import type { ExtractedFields } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { CONFIDENCE_THRESHOLDS, PROCESSING_CONFIG } from "./constants";
import {
  AccountingDocumentExtractor,
  CompanyProfileExtractor,
  DocumentClassifier,
  TextExtractor,
} from "./services";
import type {
  AccountingDocument,
  DocumentType,
  ExtractedDocument,
} from "./types";

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

    logger.info(
      "DocumentExtractor initialized with Portkey gateway using Claude",
    );
  }

  async extractDocument(
    fileUrl: string,
    mimeType: string,
  ): Promise<ExtractedDocument> {
    const startTime = Date.now();

    logger.info("Starting document extraction", { fileUrl, mimeType });

    try {
      // Extract text from document
      const extractedText = await this.textExtractor.extractFromUrl(
        fileUrl,
        mimeType,
      );

      // Classify document type
      const classification = await this.classifier.classify(extractedText);

      // Extract if accounting document
      if (this.isAccountingDocument(classification.type)) {
        const extractionResult =
          await this.accountingExtractor.extract(extractedText);

        // Build flat document for company profile extraction
        const flatDocument = this.buildFlatDocument(extractionResult.fields);
        const companyProfile = this.companyExtractor.extract(flatDocument);

        return {
          documentType: classification.type,
          documentTypeConfidence: classification.confidence,
          processingVersion: this.processingVersion,
          fields: extractionResult.fields,
          companyProfile,
          lineItems: this.processLineItems(extractionResult.lineItems),
          overallConfidence: extractionResult.overallConfidence,
          dataCompleteness: this.calculateDataCompleteness(
            extractionResult.fields,
          ),
          validationStatus: this.determineValidationStatus(
            extractionResult.overallConfidence,
            this.calculateDataCompleteness(extractionResult.fields),
          ),
          extractionMethod: "primary",
          processingDuration: Date.now() - startTime,
          errors: [],
        };
      }

      // Return minimal extraction for non-accounting documents
      return {
        documentType: classification.type,
        documentTypeConfidence: classification.confidence,
        processingVersion: this.processingVersion,
        fields: {},
        overallConfidence: classification.confidence,
        dataCompleteness: 0,
        validationStatus: "valid",
        extractionMethod: "primary",
        processingDuration: Date.now() - startTime,
        errors: [],
      };
    } catch (error) {
      logger.error("Document extraction failed", { error, fileUrl });
      throw error;
    }
  }

  private buildFlatDocument(fields: ExtractedFields): AccountingDocument {
    // Build flat document for company profile extraction
    const flatDocument: any = {};

    Object.entries(fields).forEach(([fieldName, fieldData]) => {
      if (fieldData) {
        flatDocument[fieldName] = fieldData.value;
      }
    });

    return flatDocument as AccountingDocument;
  }

  private calculateDataCompleteness(fields: ExtractedFields): number {
    const criticalFields = [
      "totalAmount",
      "currency",
      "vendorName",
      "documentDate",
    ];
    const presentCriticalFields = criticalFields.filter(
      (field) =>
        fields[field] &&
        fields[field].value !== null &&
        fields[field].value !== undefined,
    );
    return (presentCriticalFields.length / criticalFields.length) * 100;
  }

  private determineValidationStatus(
    confidence: number,
    completeness: number,
  ): ExtractedDocument["validationStatus"] {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH && completeness >= 80) {
      return "valid";
    }
    if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM || completeness >= 60) {
      return "needs_review";
    }
    return "invalid";
  }

  private isAccountingDocument(type: DocumentType): boolean {
    return [
      "invoice",
      "receipt",
      "purchase_order",
      "credit_note",
      "statement",
    ].includes(type);
  }

  private processLineItems(lineItems: any[]): ExtractedDocument["lineItems"] {
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return [];
    }

    return lineItems.map((item) => ({
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
    if (typeof item.totalPrice === "number") scores.push(95);
    if (typeof item.quantity === "number") scores.push(85);
    if (typeof item.unitPrice === "number") scores.push(85);

    if (scores.length === 0) return 50;

    return Math.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length,
    );
  }
}
