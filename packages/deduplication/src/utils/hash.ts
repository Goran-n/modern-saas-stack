import { logger } from "@figgy/utils";
import { createHash } from "crypto";

export class HashUtils {
  /**
   * Generate SHA256 hash from buffer or string
   */
  static generateSHA256(data: Buffer | string): string {
    const hash = createHash("sha256");
    hash.update(data);
    return hash.digest("hex");
  }

  /**
   * Generate a composite hash from multiple fields
   */
  static generateCompositeHash(fields: Record<string, any>): string {
    // Sort keys to ensure consistent hashing
    const sortedKeys = Object.keys(fields).sort();
    const values = sortedKeys.map((key) => {
      const value = fields[key];
      // Normalize values
      if (value === null || value === undefined) return "";
      if (typeof value === "string") return value.trim().toLowerCase();
      if (value instanceof Date) return value.toISOString();
      return String(value);
    });

    const composite = values.join("|");
    return HashUtils.generateSHA256(composite);
  }

  /**
   * Generate invoice fingerprint from key fields
   */
  static generateInvoiceFingerprint(
    vendorName: string | null | undefined,
    invoiceNumber: string | null | undefined,
    invoiceDate: Date | string | null | undefined,
    totalAmount: number | string | null | undefined,
    currency: string | null | undefined = "GBP",
  ): string {
    // Normalize vendor name
    const normalizedVendor = vendorName
      ? vendorName.trim().toLowerCase().replace(/\s+/g, " ")
      : "";

    // Normalize invoice number
    const normalizedInvoiceNumber = invoiceNumber
      ? invoiceNumber.trim().toUpperCase()
      : "";

    // Normalize date to YYYY-MM-DD
    let normalizedDate = "";
    if (invoiceDate) {
      const date =
        invoiceDate instanceof Date ? invoiceDate : new Date(invoiceDate);
      if (!isNaN(date.getTime())) {
        normalizedDate = date.toISOString().split("T")[0] || "";
      }
    }

    // Normalize amount to 2 decimal places
    let normalizedAmount = "";
    if (totalAmount !== null && totalAmount !== undefined) {
      const amount =
        typeof totalAmount === "string" ? parseFloat(totalAmount) : totalAmount;
      if (!isNaN(amount)) {
        normalizedAmount = amount.toFixed(2);
      }
    }

    // Normalize currency
    const normalizedCurrency = currency ? currency.trim().toUpperCase() : "GBP";

    // Generate composite hash
    const fingerprint = HashUtils.generateCompositeHash({
      vendor: normalizedVendor,
      invoice: normalizedInvoiceNumber,
      date: normalizedDate,
      amount: normalizedAmount,
      currency: normalizedCurrency,
    });

    logger.debug("Generated invoice fingerprint", {
      vendor: normalizedVendor,
      invoice: normalizedInvoiceNumber,
      date: normalizedDate,
      amount: normalizedAmount,
      currency: normalizedCurrency,
      fingerprint,
    });

    return fingerprint;
  }

  /**
   * Calculate content hash from file buffer
   */
  static async calculateFileHash(buffer: Buffer): Promise<string> {
    return HashUtils.generateSHA256(buffer);
  }
}
