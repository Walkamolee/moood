/**
 * Tests for Biometric Authentication Service
 * Testing security, authentication flows, and error handling
 */

import { biometricAuthService } from '../../services/biometricAuthService';
import { BiometricType, AuthenticationResult, BiometricCapability } from '../../types/financial';

// Mock Expo LocalAuthentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  getEnrolledLevelAsync: jest.fn(),
}));

// Mock React Native Keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
  canImplyAuthentication: jest.fn(),
  getSupportedBiometryType: jest.fn(),
}));

// Mock device info
jest.mock('react-native-device-info', () => ({
  getSystemVersion: jest.fn().mockReturnValue('15.0'),
  getModel: jest.fn().mockReturnValue('iPhone 13'),
  isEmulator: jest.fn().mockReturnValue(false),
}));

describe('BiometricAuthService', () => {
  const mockLocalAuth = require('expo-local-authentication');
  const mockKeychain = require('react-native-keychain');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('device capability detection', () => {
    it('should detect Face ID capability on supported devices', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([2]); // Face ID
      mockKeychain.getSupportedBiometryType.mockResolvedValue('FaceID');

      const capabilities = await biometricAuthService.getDeviceCapabilities();

      expect(capabilities.hasHardware).toBe(true);
      expect(capabilities.supportedTypes).toContain(BiometricType.FACE_ID);
      expect(capabilities.primaryType).toBe(BiometricType.FACE_ID);
    });

    it('should detect Touch ID capability on supported devices', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1]); // Touch ID
      mockKeychain.getSupportedBiometryType.mockResolvedValue('TouchID');

      const capabilities = await biometricAuthService.getDeviceCapabilities();

      expect(capabilities.hasHardware).toBe(true);
      expect(capabilities.supportedTypes).toContain(BiometricType.TOUCH_ID);
      expect(capabilities.primaryType).toBe(BiometricType.TOUCH_ID);
    });

    it('should detect fingerprint capability on Android devices', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1]); // Fingerprint
      mockKeychain.getSupportedBiometryType.mockResolvedValue('Fingerprint');

      const capabilities = await biometricAuthService.getDeviceCapabilities();

      expect(capabilities.hasHardware).toBe(true);
      expect(capabilities.supportedTypes).toContain(BiometricType.FINGERPRINT);
      expect(capabilities.primaryType).toBe(BiometricType.FINGERPRINT);
    });

    it('should handle devices without biometric hardware', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);
      mockKeychain.getSupportedBiometryType.mockResolvedValue(null);

      const capabilities = await biometricAuthService.getDeviceCapabilities();

      expect(capabilities.hasHardware).toBe(false);
      expect(capabilities.supportedTypes).toHaveLength(0);
      expect(capabilities.primaryType).toBeNull();
      expect(capabilities.fallbackAvailable).toBe(true); // PIN/password fallback
    });
  });

  describe('enrollment status', () => {
    it('should detect enrolled biometrics', async () => {
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.getEnrolledLevelAsync.mockResolvedValue(2); // Strong biometrics

      const isEnrolled = await biometricAuthService.isBiometricEnrolled();
      const enrollmentLevel = await biometricAuthService.getEnrollmentLevel();

      expect(isEnrolled).toBe(true);
      expect(enrollmentLevel).toBe('strong');
    });

    it('should detect when biometrics are not enrolled', async () => {
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      const isEnrolled = await biometricAuthService.isBiometricEnrolled();

      expect(isEnrolled).toBe(false);
    });

    it('should handle enrollment check errors gracefully', async () => {
      mockLocalAuth.isEnrolledAsync.mockRejectedValue(new Error('Hardware not available'));

      const isEnrolled = await biometricAuthService.isBiometricEnrolled();

      expect(isEnrolled).toBe(false);
    });
  });

  describe('authentication', () => {
    it('should authenticate successfully with Face ID', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
      });

      const result = await biometricAuthService.authenticate(
        'Authenticate to access your financial data',
        'Use Face ID to securely access your accounts'
      );

      expect(result.success).toBe(true);
      expect(result.biometricType).toBe(BiometricType.FACE_ID);
      expect(result.error).toBeUndefined();
      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Authenticate to access your financial data',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });
    });

    it('should authenticate successfully with Touch ID', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
      });

      // Mock Touch ID as primary type
      mockKeychain.getSupportedBiometryType.mockResolvedValue('TouchID');

      const result = await biometricAuthService.authenticate(
        'Authenticate to view transactions',
        'Use Touch ID to continue'
      );

      expect(result.success).toBe(true);
      expect(result.biometricType).toBe(BiometricType.TOUCH_ID);
    });

    it('should handle authentication cancellation', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const result = await biometricAuthService.authenticate(
        'Authenticate to access data',
        'Use biometric authentication'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('user_cancel');
      expect(result.errorMessage).toBe('Authentication was cancelled by user');
    });

    it('should handle authentication failure', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'authentication_failed',
      });

      const result = await biometricAuthService.authenticate(
        'Authenticate to access data',
        'Use biometric authentication'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('authentication_failed');
      expect(result.errorMessage).toBe('Authentication failed');
    });

    it('should handle biometric lockout', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'lockout',
      });

      const result = await biometricAuthService.authenticate(
        'Authenticate to access data',
        'Use biometric authentication'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('lockout');
      expect(result.errorMessage).toBe('Biometric authentication is temporarily locked');
      expect(result.fallbackAvailable).toBe(true);
    });

    it('should handle permanent lockout', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'lockout_permanent',
      });

      const result = await biometricAuthService.authenticate(
        'Authenticate to access data',
        'Use biometric authentication'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('lockout_permanent');
      expect(result.errorMessage).toBe('Biometric authentication is permanently disabled');
      expect(result.fallbackAvailable).toBe(true);
    });
  });

  describe('secure storage integration', () => {
    it('should store biometric authentication token securely', async () => {
      mockKeychain.setInternetCredentials.mockResolvedValue(true);

      const token = 'secure-auth-token-12345';
      const result = await biometricAuthService.storeBiometricToken('test-user', token);

      expect(result).toBe(true);
      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'money-mood-biometric-test-user',
        'test-user',
        token,
        {
          accessControl: 'BiometryAny',
          authenticationType: 'biometrics',
          storage: 'keychain',
        }
      );
    });

    it('should retrieve biometric authentication token', async () => {
      const mockCredentials = {
        username: 'test-user',
        password: 'secure-auth-token-12345',
      };

      mockKeychain.getInternetCredentials.mockResolvedValue(mockCredentials);

      const token = await biometricAuthService.getBiometricToken('test-user');

      expect(token).toBe('secure-auth-token-12345');
      expect(mockKeychain.getInternetCredentials).toHaveBeenCalledWith(
        'money-mood-biometric-test-user'
      );
    });

    it('should handle missing biometric token', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue(false);

      const token = await biometricAuthService.getBiometricToken('test-user');

      expect(token).toBeNull();
    });

    it('should clear biometric authentication token', async () => {
      mockKeychain.resetInternetCredentials.mockResolvedValue(true);

      const result = await biometricAuthService.clearBiometricToken('test-user');

      expect(result).toBe(true);
      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith(
        'money-mood-biometric-test-user'
      );
    });
  });

  describe('fallback authentication', () => {
    it('should provide PIN fallback when biometrics fail', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'authentication_failed',
      });

      const result = await biometricAuthService.authenticateWithFallback(
        'Authenticate to access data',
        'Use biometric or PIN authentication'
      );

      expect(result.fallbackUsed).toBe(true);
      expect(result.fallbackType).toBe('pin');
    });

    it('should provide password fallback when PIN is not available', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'lockout_permanent',
      });

      // Mock PIN not available
      const result = await biometricAuthService.authenticateWithFallback(
        'Authenticate to access data',
        'Use password authentication',
        { allowPassword: true, allowPin: false }
      );

      expect(result.fallbackUsed).toBe(true);
      expect(result.fallbackType).toBe('password');
    });
  });

  describe('security settings', () => {
    it('should enable biometric authentication for user', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);

      const result = await biometricAuthService.enableBiometricAuth('test-user');

      expect(result.success).toBe(true);
      expect(result.enabled).toBe(true);
    });

    it('should disable biometric authentication for user', async () => {
      mockKeychain.resetInternetCredentials.mockResolvedValue(true);

      const result = await biometricAuthService.disableBiometricAuth('test-user');

      expect(result.success).toBe(true);
      expect(result.enabled).toBe(false);
    });

    it('should get biometric authentication settings', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'test-user',
        password: 'token',
      });

      const settings = await biometricAuthService.getBiometricSettings('test-user');

      expect(settings.enabled).toBe(true);
      expect(settings.hasToken).toBe(true);
    });

    it('should update biometric authentication preferences', async () => {
      const preferences = {
        requireBiometricForTransactions: true,
        requireBiometricForSettings: true,
        allowFallback: true,
        lockoutDuration: 300, // 5 minutes
      };

      const result = await biometricAuthService.updateBiometricPreferences(
        'test-user',
        preferences
      );

      expect(result.success).toBe(true);
      expect(result.preferences).toEqual(preferences);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle hardware not available error', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Hardware not available'));

      const capabilities = await biometricAuthService.getDeviceCapabilities();

      expect(capabilities.hasHardware).toBe(false);
      expect(capabilities.error).toBe('Hardware not available');
    });

    it('should handle authentication timeout', async () => {
      mockLocalAuth.authenticateAsync.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Authentication timeout')), 100)
        )
      );

      const result = await biometricAuthService.authenticate(
        'Authenticate quickly',
        'This will timeout',
        { timeout: 50 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('timeout');
    });

    it('should handle keychain access errors', async () => {
      mockKeychain.setInternetCredentials.mockRejectedValue(
        new Error('Keychain access denied')
      );

      const result = await biometricAuthService.storeBiometricToken('test-user', 'token');

      expect(result).toBe(false);
    });

    it('should validate authentication attempts and implement lockout', async () => {
      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        mockLocalAuth.authenticateAsync.mockResolvedValue({
          success: false,
          error: 'authentication_failed',
        });

        await biometricAuthService.authenticate('Test auth', 'Test prompt');
      }

      // Next attempt should be locked out
      const result = await biometricAuthService.authenticate('Test auth', 'Test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('too_many_attempts');
      expect(result.lockoutTimeRemaining).toBeGreaterThan(0);
    });
  });

  describe('performance and optimization', () => {
    it('should cache device capabilities to avoid repeated checks', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([2]);

      // First call
      await biometricAuthService.getDeviceCapabilities();
      
      // Second call should use cache
      await biometricAuthService.getDeviceCapabilities();

      expect(mockLocalAuth.hasHardwareAsync).toHaveBeenCalledTimes(1);
      expect(mockLocalAuth.supportedAuthenticationTypesAsync).toHaveBeenCalledTimes(1);
    });

    it('should preload biometric prompt for faster authentication', async () => {
      await biometricAuthService.preloadBiometricPrompt();

      const startTime = Date.now();
      
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
      });

      await biometricAuthService.authenticate('Quick auth', 'Fast prompt');
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should be very fast due to preloading
    });
  });

  describe('accessibility and user experience', () => {
    it('should provide appropriate prompts for different biometric types', async () => {
      // Test Face ID prompt
      mockKeychain.getSupportedBiometryType.mockResolvedValue('FaceID');
      
      await biometricAuthService.authenticate(
        'Access financial data',
        'Custom prompt'
      );

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: 'Access financial data',
        })
      );

      // Test Touch ID prompt
      mockKeychain.getSupportedBiometryType.mockResolvedValue('TouchID');
      
      await biometricAuthService.authenticate(
        'Access financial data',
        'Custom prompt'
      );

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: 'Access financial data',
        })
      );
    });

    it('should support custom authentication options', async () => {
      const customOptions = {
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Not Now',
        disableDeviceFallback: true,
        requireConfirmation: true,
      };

      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined,
      });

      await biometricAuthService.authenticate(
        'Custom auth',
        'Custom prompt',
        customOptions
      );

      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackLabel: 'Use PIN',
          cancelLabel: 'Not Now',
          disableDeviceFallback: true,
        })
      );
    });
  });
});

