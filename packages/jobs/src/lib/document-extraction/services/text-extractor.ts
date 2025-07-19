import { logger } from "@kibly/utils";
import { extractText, getDocumentProxy } from "unpdf";

export class TextExtractor {
  private readonly MAX_SIZE = 10 * 1024 * 1024; // 10MB

  async extractFromUrl(fileUrl: string, mimeType: string): Promise<string> {
    logger.info("Fetching document from URL", { fileUrl, mimeType });

    const response = await fetch(fileUrl);

    // Check content length
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > this.MAX_SIZE) {
      throw new Error(
        `File too large: ${(parseInt(contentLength) / 1024 / 1024).toFixed(2)}MB exceeds 10MB limit`,
      );
    }

    const content = await response.arrayBuffer();

    // Double-check actual size
    if (content.byteLength > this.MAX_SIZE) {
      throw new Error(
        `File too large: ${(content.byteLength / 1024 / 1024).toFixed(2)}MB exceeds 10MB limit`,
      );
    }

    return this.extractFromBuffer(content, mimeType);
  }

  async extractFromBuffer(
    content: ArrayBuffer,
    mimeType: string,
  ): Promise<string> {
    let extractedText = "";

    // Extract text based on file type
    if (
      mimeType === "application/pdf" ||
      mimeType === "application/octet-stream"
    ) {
      try {
        const pdf = await getDocumentProxy(new Uint8Array(content));

        const { text } = await extractText(pdf, { mergePages: true });
        extractedText = text.replaceAll("\u0000", "");

        logger.info("PDF text extraction successful", {
          pageCount: pdf.numPages,
          textLength: extractedText.length,
        });
      } catch (pdfError) {
        logger.error("PDF extraction failed", { error: pdfError });
        throw new Error("Failed to extract text from PDF");
      }
    } else if (mimeType.startsWith("image/")) {
      // For images, we'll need to use an OCR service
      logger.warn(
        "Image files require OCR processing, which is not yet implemented",
        { mimeType },
      );
      extractedText = "[Image file - OCR not implemented]";
    } else {
      // For other file types, try to convert to text
      extractedText = new TextDecoder().decode(content);
    }

    return extractedText;
  }
}
