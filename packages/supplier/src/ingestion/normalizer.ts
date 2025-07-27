import crypto from "node:crypto";

/**
 * Core attribute normalization for deduplication
 */
export class AttributeNormalizer {
  /**
   * Generate deterministic hash for deduplication
   */
  static hash(value: any): string {
    const normalized = AttributeNormalizer.normalize(value);
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(normalized))
      .digest("hex");
  }

  /**
   * Normalize values for consistent comparison
   */
  static normalize(value: any): any {
    if (typeof value === "string") {
      return value.trim().toLowerCase();
    }

    if (Array.isArray(value)) {
      return value.map((v) => AttributeNormalizer.normalize(v)).sort();
    }

    if (value && typeof value === "object") {
      const normalized: any = {};
      Object.keys(value)
        .sort()
        .forEach((key) => {
          if (
            value[key] !== null &&
            value[key] !== undefined &&
            value[key] !== ""
          ) {
            normalized[key] = AttributeNormalizer.normalize(value[key]);
          }
        });
      return normalized;
    }

    return value;
  }
}
