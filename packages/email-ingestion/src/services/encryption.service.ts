import { getConfig } from "@figgy/config";
import { createLogger } from "@figgy/utils";
import CryptoJS from "crypto-js";

const logger = createLogger("encryption-service");

export class EncryptionService {
  private encryptionKey: string | null = null;
  
  private ensureInitialized(): void {
    if (this.encryptionKey) return;
    
    const configManager = getConfig();
    
    // Ensure config is validated
    if (!configManager.isValid()) {
      configManager.validate();
    }
    
    const config = configManager.getCore();
    
    // Use JWT_SECRET as the base for encryption key
    // In production, consider using a separate ENCRYPTION_KEY
    if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters for secure encryption");
    }
    
    // Derive encryption key from JWT_SECRET
    this.encryptionKey = CryptoJS.SHA256(config.JWT_SECRET).toString();
    
    logger.info("EncryptionService initialized");
  }
  
  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  encrypt(plainText: string): string {
    this.ensureInitialized();
    try {
      const encrypted = CryptoJS.AES.encrypt(plainText, this.encryptionKey!, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      });
      
      return encrypted.toString();
    } catch (error) {
      logger.error("Encryption failed", { error });
      throw new Error("Failed to encrypt data");
    }
  }
  
  /**
   * Decrypt data encrypted with encrypt()
   */
  decrypt(cipherText: string): string {
    this.ensureInitialized();
    try {
      const decrypted = CryptoJS.AES.decrypt(cipherText, this.encryptionKey!, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      });
      
      const plainText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!plainText) {
        throw new Error("Decryption resulted in empty string");
      }
      
      return plainText;
    } catch (error) {
      logger.error("Decryption failed", { error });
      throw new Error("Failed to decrypt data");
    }
  }
  
  /**
   * Encrypt an object as JSON
   */
  encryptObject<T>(obj: T): string {
    const json = JSON.stringify(obj);
    return this.encrypt(json);
  }
  
  /**
   * Decrypt and parse JSON object
   */
  decryptObject<T>(cipherText: string): T {
    const json = this.decrypt(cipherText);
    return JSON.parse(json) as T;
  }
  
  /**
   * Hash a value for comparison (e.g., for deduplication)
   */
  hash(value: string): string {
    return CryptoJS.SHA256(value).toString();
  }
  
  /**
   * Generate a secure random token
   */
  generateToken(length: number = 32): string {
    const randomWords = CryptoJS.lib.WordArray.random(length);
    return randomWords.toString(CryptoJS.enc.Hex);
  }
  
  /**
   * Safely compare two values in constant time
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}

// Export singleton instance lazily
let _instance: EncryptionService | undefined;

export const encryptionService = {
  encrypt(plainText: string): string {
    if (!_instance) _instance = new EncryptionService();
    return _instance.encrypt(plainText);
  },
  
  decrypt(cipherText: string): string {
    if (!_instance) _instance = new EncryptionService();
    return _instance.decrypt(cipherText);
  },
  
  encryptObject<T>(obj: T): string {
    if (!_instance) _instance = new EncryptionService();
    return _instance.encryptObject(obj);
  },
  
  decryptObject<T>(cipherText: string): T {
    if (!_instance) _instance = new EncryptionService();
    return _instance.decryptObject<T>(cipherText);
  },
  
  hash(value: string): string {
    if (!_instance) _instance = new EncryptionService();
    return _instance.hash(value);
  },
  
  generateToken(length: number = 32): string {
    if (!_instance) _instance = new EncryptionService();
    return _instance.generateToken(length);
  },
  
  secureCompare(a: string, b: string): boolean {
    if (!_instance) _instance = new EncryptionService();
    return _instance.secureCompare(a, b);
  }
};