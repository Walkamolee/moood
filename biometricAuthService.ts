/**
 * Biometric Authentication Service for Money Mood
 * Provides secure biometric authentication with fallback mechanisms
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { encryptionService, SecureStorage } from '../utils/encryption';
import { auditLogger } from '../utils/auditLogger';
import { config } from '../config/environment';

/**
 * Biometric authentication types
 */
export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE_ID = 'face_id',
  IRIS = 'iris',
  VOICE = 'voice',
}

/**
 * Authentication methods
 */
export enum AuthenticationMethod {
  BIOMETRIC = 'biometric',
  PIN = 'pin',
  PASSWORD = 'password',
  PATTERN = 'pattern',
}

/**
 * Biometric enrollment status
 */
export enum EnrollmentStatus {
  NOT_ENROLLED = 'not_enrolled',
  ENROLLED = 'enrolled',
  PENDING = 'pending',
  FAILED = 'failed',
  DISABLED = 'disabled',
}

/**
 * Authentication result
 */
export interface AuthenticationResult {
  success: boolean;
  method: AuthenticationMethod;
  biometricType?: BiometricType;
  error?: string;
  timestamp: string;
  attempts: number;
  fallbackUsed: boolean;
}

/**
 * Biometric capabilities
 */
export interface BiometricCapabilities {
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: BiometricType[];
  securityLevel: SecurityLevel;
  hardwarePresent: boolean;
}

/**
 * Security levels for biometric authentication
 */
export enum SecurityLevel {
  NONE = 'none',
  WEAK = 'weak',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

/**
 * Biometric settings
 */
export interface BiometricSettings {
  enabled: boolean;
  preferredType: BiometricType;
  fallbackMethod: AuthenticationMethod;
  maxAttempts: number;
  lockoutDuration: number; // in minutes
  requireBiometricForTransactions: boolean;
  requireBiometricForAccountAccess: boolean;
  requireBiometricForSettings: boolean;
}

/**
 * Authentication session
 */
export interface AuthenticationSession {
  id: string;
  userId: string;
  method: AuthenticationMethod;
  biometricType?: BiometricType;
  startTime: string;
  endTime?: string;
  attempts: number;
  maxAttempts: number;
  locked: boolean;
  lockoutUntil?: string;
  ipAddress?: string;
  deviceId?: string;
}

/**
 * Biometric template (encrypted storage)
 */
export interface BiometricTemplate {
  id: string;
  userId: string;
  type: BiometricType;
  template: string; // Encrypted biometric template
  quality: number; // 0-100
  enrolledAt: string;
  lastUsed?: string;
  usageCount: number;
  active: boolean;
}

/**
 * Biometric Authentication Service
 */
export class BiometricAuthService {
  private static instance: BiometricAuthService;
  private authenticationSessions: Map<string, AuthenticationSession> = new Map();
  private readonly maxConcurrentSessions = 5;

  private constructor() {
    this.initializeService();
  }

  public static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Initialize the biometric authentication service
   */
  private async initializeService(): Promise<void> {
    try {
      // Check if biometric authentication is enabled in config
      if (!config.features.enableBiometricAuth) {
        console.log('Biometric authentication is disabled in configuration');
        return;
      }

      // Initialize any required setup
      console.log('Biometric authentication service initialized');
    } catch (error) {
      console.error('Failed to initialize biometric authentication service:', error);
    }
  }

  /**
   * Check biometric capabilities of the device
   */
  public async getBiometricCapabilities(): Promise<BiometricCapabilities> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      // Map Expo types to our types
      const mappedTypes: BiometricType[] = [];
      supportedTypes.forEach(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            mappedTypes.push(BiometricType.FINGERPRINT);
            break;
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            mappedTypes.push(BiometricType.FACE_ID);
            break;
          case LocalAuthentication.AuthenticationType.IRIS:
            mappedTypes.push(BiometricType.IRIS);
            break;
        }
      });

      // Determine security level
      let securityLevel = SecurityLevel.NONE;
      if (isAvailable && isEnrolled) {
        if (mappedTypes.includes(BiometricType.FACE_ID) || mappedTypes.includes(BiometricType.IRIS)) {
          securityLevel = SecurityLevel.VERY_STRONG;
        } else if (mappedTypes.includes(BiometricType.FINGERPRINT)) {
          securityLevel = SecurityLevel.STRONG;
        } else {
          securityLevel = SecurityLevel.WEAK;
        }
      }

      return {
        isAvailable,
        isEnrolled,
        supportedTypes: mappedTypes,
        securityLevel,
        hardwarePresent: isAvailable,
      };
    } catch (error) {
      console.error('Failed to get biometric capabilities:', error);
      return {
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: [],
        securityLevel: SecurityLevel.NONE,
        hardwarePresent: false,
      };
    }
  }

  /**
   * Authenticate user with biometrics
   */
  public async authenticateWithBiometrics(
    userId: string,
    options: {
      promptMessage?: string;
      cancelLabel?: string;
      fallbackLabel?: string;
      disableDeviceFallback?: boolean;
    } = {}
  ): Promise<AuthenticationResult> {
    const sessionId = this.generateSessionId();
    const session = this.createAuthenticationSession(sessionId, userId, AuthenticationMethod.BIOMETRIC);

    try {
      // Check if user is locked out
      if (await this.isUserLockedOut(userId)) {
        const lockoutInfo = await this.getLockoutInfo(userId);
        throw new Error(`Account locked until ${lockoutInfo.lockoutUntil}`);
      }

      // Check biometric capabilities
      const capabilities = await this.getBiometricCapabilities();
      if (!capabilities.isAvailable || !capabilities.isEnrolled) {
        throw new Error('Biometric authentication not available');
      }

      // Perform biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options.promptMessage || 'Authenticate to access Money Mood',
        cancelLabel: options.cancelLabel || 'Cancel',
        fallbackLabel: options.fallbackLabel || 'Use Password',
        disableDeviceFallback: options.disableDeviceFallback || false,
      });

      session.attempts++;

      if (result.success) {
        // Authentication successful
        session.endTime = new Date().toISOString();
        
        // Update biometric template usage
        await this.updateBiometricUsage(userId, capabilities.supportedTypes[0]);

        // Log successful authentication
        await auditLogger.logSecurityEvent(
          'biometric_auth_success',
          'Biometric authentication successful',
          userId,
          'medium',
          {
            sessionId,
            biometricType: capabilities.supportedTypes[0],
            attempts: session.attempts,
          }
        );

        // Reset failed attempts
        await this.resetFailedAttempts(userId);

        return {
          success: true,
          method: AuthenticationMethod.BIOMETRIC,
          biometricType: capabilities.supportedTypes[0],
          timestamp: new Date().toISOString(),
          attempts: session.attempts,
          fallbackUsed: false,
        };
      } else {
        // Authentication failed
        await this.handleFailedAuthentication(userId, session);

        const error = result.error || 'Biometric authentication failed';
        
        return {
          success: false,
          method: AuthenticationMethod.BIOMETRIC,
          error,
          timestamp: new Date().toISOString(),
          attempts: session.attempts,
          fallbackUsed: false,
        };
      }
    } catch (error) {
      // Handle authentication error
      await this.handleFailedAuthentication(userId, session);

      return {
        success: false,
        method: AuthenticationMethod.BIOMETRIC,
        error: error instanceof Error ? error.message : 'Authentication failed',
        timestamp: new Date().toISOString(),
        attempts: session.attempts,
        fallbackUsed: false,
      };
    } finally {
      this.authenticationSessions.delete(sessionId);
    }
  }

  /**
   * Enroll biometric template
   */
  public async enrollBiometric(
    userId: string,
    type: BiometricType,
    options: {
      promptMessage?: string;
      quality?: number;
    } = {}
  ): Promise<{
    success: boolean;
    templateId?: string;
    error?: string;
  }> {
    try {
      // Check if biometric type is supported
      const capabilities = await this.getBiometricCapabilities();
      if (!capabilities.supportedTypes.includes(type)) {
        throw new Error(`Biometric type ${type} not supported`);
      }

      // Perform enrollment authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options.promptMessage || `Enroll your ${type} for secure access`,
      });

      if (!result.success) {
        throw new Error('Enrollment authentication failed');
      }

      // Create biometric template
      const template: BiometricTemplate = {
        id: this.generateTemplateId(),
        userId,
        type,
        template: encryptionService.generateSecureToken(256), // Placeholder for actual template
        quality: options.quality || 85,
        enrolledAt: new Date().toISOString(),
        usageCount: 0,
        active: true,
      };

      // Store encrypted template
      await this.storeBiometricTemplate(template);

      // Log enrollment
      await auditLogger.logSecurityEvent(
        'biometric_enrollment',
        `Biometric enrollment completed for ${type}`,
        userId,
        'medium',
        {
          templateId: template.id,
          biometricType: type,
          quality: template.quality,
        }
      );

      return {
        success: true,
        templateId: template.id,
      };
    } catch (error) {
      await auditLogger.logSecurityEvent(
        'biometric_enrollment_failed',
        `Biometric enrollment failed for ${type}`,
        userId,
        'medium',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          biometricType: type,
        }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Enrollment failed',
      };
    }
  }

  /**
   * Get biometric settings for user
   */
  public async getBiometricSettings(userId: string): Promise<BiometricSettings> {
    try {
      const settings = await SecureStorage.retrieveSecureData<BiometricSettings>(
        `biometric_settings_${userId}`
      );

      if (settings) {
        return settings;
      }

      // Return default settings
      const capabilities = await this.getBiometricCapabilities();
      return {
        enabled: capabilities.isAvailable && capabilities.isEnrolled,
        preferredType: capabilities.supportedTypes[0] || BiometricType.FINGERPRINT,
        fallbackMethod: AuthenticationMethod.PIN,
        maxAttempts: 3,
        lockoutDuration: 15, // 15 minutes
        requireBiometricForTransactions: true,
        requireBiometricForAccountAccess: true,
        requireBiometricForSettings: true,
      };
    } catch (error) {
      console.error('Failed to get biometric settings:', error);
      return {
        enabled: false,
        preferredType: BiometricType.FINGERPRINT,
        fallbackMethod: AuthenticationMethod.PIN,
        maxAttempts: 3,
        lockoutDuration: 15,
        requireBiometricForTransactions: false,
        requireBiometricForAccountAccess: false,
        requireBiometricForSettings: false,
      };
    }
  }

  /**
   * Update biometric settings
   */
  public async updateBiometricSettings(
    userId: string,
    settings: Partial<BiometricSettings>
  ): Promise<boolean> {
    try {
      const currentSettings = await this.getBiometricSettings(userId);
      const updatedSettings = { ...currentSettings, ...settings };

      await SecureStorage.storeSecureData(
        `biometric_settings_${userId}`,
        updatedSettings
      );

      // Log settings update
      await auditLogger.logSecurityEvent(
        'biometric_settings_updated',
        'Biometric settings updated',
        userId,
        'low',
        {
          updatedFields: Object.keys(settings),
          newSettings: settings,
        }
      );

      return true;
    } catch (error) {
      console.error('Failed to update biometric settings:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication for user
   */
  public async disableBiometric(userId: string): Promise<boolean> {
    try {
      // Update settings
      await this.updateBiometricSettings(userId, { enabled: false });

      // Remove biometric templates
      const templates = await this.getBiometricTemplates(userId);
      for (const template of templates) {
        await this.removeBiometricTemplate(template.id);
      }

      // Log disable action
      await auditLogger.logSecurityEvent(
        'biometric_disabled',
        'Biometric authentication disabled',
        userId,
        'medium',
        {
          templatesRemoved: templates.length,
        }
      );

      return true;
    } catch (error) {
      console.error('Failed to disable biometric authentication:', error);
      return false;
    }
  }

  /**
   * Check if biometric authentication is required for operation
   */
  public async isBiometricRequired(
    userId: string,
    operation: 'transaction' | 'account_access' | 'settings'
  ): Promise<boolean> {
    try {
      const settings = await this.getBiometricSettings(userId);
      
      if (!settings.enabled) {
        return false;
      }

      switch (operation) {
        case 'transaction':
          return settings.requireBiometricForTransactions;
        case 'account_access':
          return settings.requireBiometricForAccountAccess;
        case 'settings':
          return settings.requireBiometricForSettings;
        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to check biometric requirement:', error);
      return false;
    }
  }

  // Private helper methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createAuthenticationSession(
    sessionId: string,
    userId: string,
    method: AuthenticationMethod
  ): AuthenticationSession {
    const session: AuthenticationSession = {
      id: sessionId,
      userId,
      method,
      startTime: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
      locked: false,
    };

    this.authenticationSessions.set(sessionId, session);

    // Clean up old sessions
    if (this.authenticationSessions.size > this.maxConcurrentSessions) {
      const oldestSession = Array.from(this.authenticationSessions.entries())
        .sort(([, a], [, b]) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
      this.authenticationSessions.delete(oldestSession[0]);
    }

    return session;
  }

  private async handleFailedAuthentication(
    userId: string,
    session: AuthenticationSession
  ): Promise<void> {
    // Increment failed attempts
    await this.incrementFailedAttempts(userId);

    // Check if user should be locked out
    const failedAttempts = await this.getFailedAttempts(userId);
    const settings = await this.getBiometricSettings(userId);

    if (failedAttempts >= settings.maxAttempts) {
      await this.lockoutUser(userId, settings.lockoutDuration);
    }

    // Log failed authentication
    await auditLogger.logSecurityEvent(
      'biometric_auth_failed',
      'Biometric authentication failed',
      userId,
      'medium',
      {
        sessionId: session.id,
        attempts: session.attempts,
        totalFailedAttempts: failedAttempts,
      }
    );
  }

  private async storeBiometricTemplate(template: BiometricTemplate): Promise<void> {
    await SecureStorage.storeSecureData(`biometric_template_${template.id}`, template);
  }

  private async getBiometricTemplates(userId: string): Promise<BiometricTemplate[]> {
    // In a real implementation, this would query all templates for the user
    // For now, we'll return an empty array as a placeholder
    return [];
  }

  private async removeBiometricTemplate(templateId: string): Promise<void> {
    await SecureStorage.removeSecureData(`biometric_template_${templateId}`);
  }

  private async updateBiometricUsage(userId: string, type: BiometricType): Promise<void> {
    // Update usage statistics for biometric template
    // This would be implemented based on actual template storage
  }

  private async isUserLockedOut(userId: string): Promise<boolean> {
    const lockoutInfo = await this.getLockoutInfo(userId);
    return lockoutInfo.locked && new Date() < new Date(lockoutInfo.lockoutUntil || 0);
  }

  private async getLockoutInfo(userId: string): Promise<{
    locked: boolean;
    lockoutUntil?: string;
    failedAttempts: number;
  }> {
    const info = await SecureStorage.retrieveSecureData<{
      locked: boolean;
      lockoutUntil?: string;
      failedAttempts: number;
    }>(`lockout_info_${userId}`);

    return info || { locked: false, failedAttempts: 0 };
  }

  private async lockoutUser(userId: string, durationMinutes: number): Promise<void> {
    const lockoutUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    
    await SecureStorage.storeSecureData(`lockout_info_${userId}`, {
      locked: true,
      lockoutUntil,
      failedAttempts: 0, // Reset after lockout
    });

    await auditLogger.logSecurityEvent(
      'user_locked_out',
      `User locked out for ${durationMinutes} minutes`,
      userId,
      'high',
      {
        lockoutUntil,
        durationMinutes,
      }
    );
  }

  private async getFailedAttempts(userId: string): Promise<number> {
    const info = await this.getLockoutInfo(userId);
    return info.failedAttempts;
  }

  private async incrementFailedAttempts(userId: string): Promise<void> {
    const info = await this.getLockoutInfo(userId);
    info.failedAttempts++;
    
    await SecureStorage.storeSecureData(`lockout_info_${userId}`, info);
  }

  private async resetFailedAttempts(userId: string): Promise<void> {
    const info = await this.getLockoutInfo(userId);
    info.failedAttempts = 0;
    info.locked = false;
    info.lockoutUntil = undefined;
    
    await SecureStorage.storeSecureData(`lockout_info_${userId}`, info);
  }
}

// Export singleton instance
export const biometricAuthService = BiometricAuthService.getInstance();

