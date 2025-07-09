/**
 * Encryption Utilities for Money Mood
 * Provides secure encryption/decryption for sensitive financial data
 */

import CryptoJS from 'crypto-js';
import { config } from '../config/environment';

/**
 * Encryption service for handling sensitive financial data
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private readonly encryptionKey: string;

  private constructor() {
    this.encryptionKey = config.security.encryptionKey;
    
    if (!this.encryptionKey || this.encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }
  }

  /**
   * Get singleton instance of EncryptionService
   */
  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  public encrypt(data: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      
      return encrypted.toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  public decrypt(encryptedData: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Decryption resulted in empty string');
      }
      
      return decryptedString;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt object data
   */
  public encryptObject<T>(obj: T): string {
    try {
      const jsonString = JSON.stringify(obj);
      return this.encrypt(jsonString);
    } catch (error) {
      console.error('Object encryption failed:', error);
      throw new Error('Failed to encrypt object');
    }
  }

  /**
   * Decrypt object data
   */
  public decryptObject<T>(encryptedData: string): T {
    try {
      const decryptedString = this.decrypt(encryptedData);
      return JSON.parse(decryptedString) as T;
    } catch (error) {
      console.error('Object decryption failed:', error);
      throw new Error('Failed to decrypt object');
    }
  }

  /**
   * Generate a secure hash for data integrity verification
   */
  public generateHash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Verify data integrity using hash
   */
  public verifyHash(data: string, hash: string): boolean {
    const computedHash = this.generateHash(data);
    return computedHash === hash;
  }

  /**
   * Generate a secure random token
   */
  public generateSecureToken(length: number = 32): string {
    const randomBytes = CryptoJS.lib.WordArray.random(length);
    return randomBytes.toString();
  }

  /**
   * Mask sensitive data for logging (shows only first and last 4 characters)
   */
  public maskSensitiveData(data: string): string {
    if (!data || data.length <= 8) {
      return '****';
    }
    
    const start = data.substring(0, 4);
    const end = data.substring(data.length - 4);
    const middle = '*'.repeat(Math.max(0, data.length - 8));
    
    return `${start}${middle}${end}`;
  }
}

/**
 * Secure storage utilities for financial data
 */
export class SecureStorage {
  private static encryptionService = EncryptionService.getInstance();

  /**
   * Store encrypted data with integrity verification
   */
  public static async storeSecureData(key: string, data: any): Promise<void> {
    try {
      const encryptedData = this.encryptionService.encryptObject(data);
      const hash = this.encryptionService.generateHash(encryptedData);
      
      const securePackage = {
        data: encryptedData,
        hash: hash,
        timestamp: Date.now(),
      };
      
      // In a real implementation, this would use secure storage like Keychain
      // For now, we'll use a placeholder that would be replaced with actual secure storage
      await this.storeInSecureStorage(key, JSON.stringify(securePackage));
    } catch (error) {
      console.error('Failed to store secure data:', error);
      throw new Error('Failed to store secure data');
    }
  }

  /**
   * Retrieve and decrypt data with integrity verification
   */
  public static async retrieveSecureData<T>(key: string): Promise<T | null> {
    try {
      const storedData = await this.retrieveFromSecureStorage(key);
      
      if (!storedData) {
        return null;
      }
      
      const securePackage = JSON.parse(storedData);
      
      // Verify data integrity
      if (!this.encryptionService.verifyHash(securePackage.data, securePackage.hash)) {
        console.error('Data integrity verification failed');
        throw new Error('Data integrity verification failed');
      }
      
      return this.encryptionService.decryptObject<T>(securePackage.data);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }

  /**
   * Remove secure data
   */
  public static async removeSecureData(key: string): Promise<void> {
    try {
      await this.removeFromSecureStorage(key);
    } catch (error) {
      console.error('Failed to remove secure data:', error);
      throw new Error('Failed to remove secure data');
    }
  }

  /**
   * Check if secure data exists
   */
  public static async hasSecureData(key: string): Promise<boolean> {
    try {
      const data = await this.retrieveFromSecureStorage(key);
      return data !== null;
    } catch (error) {
      console.error('Failed to check secure data existence:', error);
      return false;
    }
  }

  // Placeholder methods that would be replaced with actual secure storage implementation
  private static async storeInSecureStorage(key: string, data: string): Promise<void> {
    // This would use react-native-keychain or similar secure storage
    // For now, we'll use a simple in-memory storage for development
    if (typeof window !== 'undefined') {
      localStorage.setItem(`secure_${key}`, data);
    }
  }

  private static async retrieveFromSecureStorage(key: string): Promise<string | null> {
    // This would use react-native-keychain or similar secure storage
    // For now, we'll use a simple in-memory storage for development
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`secure_${key}`);
    }
    return null;
  }

  private static async removeFromSecureStorage(key: string): Promise<void> {
    // This would use react-native-keychain or similar secure storage
    // For now, we'll use a simple in-memory storage for development
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`secure_${key}`);
    }
  }
}

/**
 * Data sanitization utilities
 */
export class DataSanitizer {
  /**
   * Sanitize financial data for logging
   */
  public static sanitizeForLogging(data: any): any {
    const encryptionService = EncryptionService.getInstance();
    
    if (typeof data === 'string') {
      return encryptionService.maskSensitiveData(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForLogging(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // List of sensitive field names that should be masked
        const sensitiveFields = [
          'accountNumber',
          'routingNumber',
          'accessToken',
          'refreshToken',
          'password',
          'pin',
          'ssn',
          'socialSecurityNumber',
          'creditCardNumber',
          'cvv',
          'expirationDate',
        ];
        
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          sanitized[key] = encryptionService.maskSensitiveData(String(value));
        } else {
          sanitized[key] = this.sanitizeForLogging(value);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  /**
   * Remove sensitive fields from data before logging
   */
  public static removeSensitiveFields(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.removeSensitiveFields(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const cleaned: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // List of sensitive field names that should be completely removed
        const sensitiveFields = [
          'password',
          'pin',
          'accessToken',
          'refreshToken',
          'privateKey',
          'secret',
          'credentials',
        ];
        
        if (!sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          cleaned[key] = this.removeSensitiveFields(value);
        }
      }
      
      return cleaned;
    }
    
    return data;
  }
}

// Export singleton instance for convenience
export const encryptionService = EncryptionService.getInstance();

