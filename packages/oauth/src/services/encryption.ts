import crypto from "crypto";
import { getConfig } from "@figgy/config";

/**
 * Service for encrypting and decrypting OAuth tokens
 */
export class OAuthEncryptionService {
  private algorithm = "aes-256-gcm";
  private key: Buffer;

  constructor() {
    const config = getConfig().getCore();
    // Use JWT_SECRET as encryption key (should be at least 32 bytes)
    const secret = config.JWT_SECRET;
    this.key = crypto.scryptSync(secret, "salt", 32);
  }

  /**
   * Encrypt a string value
   */
  encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;

    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Combine iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  /**
   * Decrypt a string value
   */
  decrypt(encryptedValue: string): string {
    const parts = encryptedValue.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted value format");
    }

    const [ivHex, authTagHex, encrypted] = parts;
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error("Invalid encrypted value format");
    }
    
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Encrypt state parameter for OAuth flow
   */
  encryptState(data: any): string {
    const json = JSON.stringify({
      ...data,
      timestamp: Date.now(),
    });
    return this.encrypt(json);
  }

  /**
   * Decrypt and validate state parameter
   */
  decryptState(encryptedState: string, maxAge = 600000): any {
    // 10 minutes default
    try {
      const decrypted = this.decrypt(encryptedState);
      const data = JSON.parse(decrypted);

      // Check timestamp to prevent replay attacks
      if (Date.now() - data.timestamp > maxAge) {
        throw new Error("State parameter expired");
      }

      return data;
    } catch (error) {
      throw new Error("Invalid state parameter");
    }
  }
}

// Singleton instance
let encryptionService: OAuthEncryptionService | null = null;

/**
 * Get the OAuth encryption service instance
 */
export function getOAuthEncryptionService(): OAuthEncryptionService {
  if (!encryptionService) {
    encryptionService = new OAuthEncryptionService();
  }
  return encryptionService;
}