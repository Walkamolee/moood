/**
 * Plaid Link Component for Money Mood
 * Handles secure bank account connection using Plaid Link
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { usePlaidLink, PlaidLinkProps } from 'react-plaid-link';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { plaidService } from '../services/plaidService';
import { consentManagementService, ConsentCategory } from '../services/consentManagementService';
import { biometricAuthService } from '../services/biometricAuthService';
import { securityMonitoringService, SecurityEventType } from '../services/securityMonitoringService';
import { Permission } from '../types/financial';

/**
 * Plaid Link Component Props
 */
interface PlaidLinkComponentProps {
  userId: string;
  onSuccess: (publicToken: string, metadata: any) => void;
  onError: (error: any) => void;
  onExit?: (error?: any, metadata?: any) => void;
  buttonText?: string;
  disabled?: boolean;
  style?: any;
}

/**
 * Connection status enum
 */
enum ConnectionStatus {
  IDLE = 'idle',
  REQUESTING_CONSENT = 'requesting_consent',
  AUTHENTICATING = 'authenticating',
  CREATING_LINK_TOKEN = 'creating_link_token',
  CONNECTING = 'connecting',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Plaid Link Component
 */
export const PlaidLinkComponent: React.FC<PlaidLinkComponentProps> = ({
  userId,
  onSuccess,
  onError,
  onExit,
  buttonText = 'Connect Bank Account',
  disabled = false,
  style,
}) => {
  const dispatch = useDispatch();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Plaid Link configuration
  const config: PlaidLinkProps = {
    token: linkToken,
    onSuccess: handlePlaidSuccess,
    onError: handlePlaidError,
    onExit: handlePlaidExit,
  };

  const { open, ready } = usePlaidLink(config);

  /**
   * Handle successful Plaid Link connection
   */
  async function handlePlaidSuccess(publicToken: string, metadata: any) {
    try {
      setConnectionStatus(ConnectionStatus.SUCCESS);
      
      // Record security event
      await securityMonitoringService.recordSecurityEvent(
        userId,
        SecurityEventType.ACCOUNT_ACCESS,
        'Bank account successfully connected via Plaid Link',
        {
          ipAddress: 'mobile_app',
          userAgent: 'money_mood_app',
          metadata: {
            institutionId: metadata.institution.institution_id,
            institutionName: metadata.institution.name,
            accountCount: metadata.accounts.length,
          },
        }
      );

      onSuccess(publicToken, metadata);
    } catch (error) {
      console.error('Error handling Plaid success:', error);
      handlePlaidError(error);
    }
  }

  /**
   * Handle Plaid Link errors
   */
  async function handlePlaidError(error: any) {
    console.error('Plaid Link error:', error);
    setConnectionStatus(ConnectionStatus.ERROR);
    setError(error.message || 'Failed to connect bank account');
    
    // Record security event
    await securityMonitoringService.recordSecurityEvent(
      userId,
      SecurityEventType.ACCOUNT_ACCESS,
      'Bank account connection failed',
      {
        ipAddress: 'mobile_app',
        userAgent: 'money_mood_app',
        metadata: {
          error: error.message,
          errorCode: error.error_code,
        },
      }
    );

    onError(error);
  }

  /**
   * Handle Plaid Link exit
   */
  function handlePlaidExit(error?: any, metadata?: any) {
    if (error) {
      console.log('Plaid Link exited with error:', error);
    } else {
      console.log('Plaid Link exited by user');
    }
    
    setConnectionStatus(ConnectionStatus.IDLE);
    onExit?.(error, metadata);
  }

  /**
   * Request user consent for financial data access
   */
  const requestConsent = async (): Promise<boolean> => {
    try {
      setConnectionStatus(ConnectionStatus.REQUESTING_CONSENT);

      const consentGranted = await consentManagementService.requestConsent(
        userId,
        ConsentCategory.FINANCIAL_DATA,
        [Permission.READ_ACCOUNTS, Permission.READ_TRANSACTIONS, Permission.READ_BALANCES],
        {
          purpose: 'Connect your bank accounts to Money Mood for automatic transaction tracking and budgeting',
          dataTypes: ['Account information', 'Transaction history', 'Account balances'],
          retentionPeriod: '5 years',
          sharingWithThirdParties: false,
          automaticRenewal: true,
        }
      );

      if (!consentGranted) {
        setError('Financial data access consent is required to connect bank accounts');
        setConnectionStatus(ConnectionStatus.ERROR);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting consent:', error);
      setError('Failed to process consent request');
      setConnectionStatus(ConnectionStatus.ERROR);
      return false;
    }
  };

  /**
   * Authenticate user with biometrics
   */
  const authenticateUser = async (): Promise<boolean> => {
    try {
      setConnectionStatus(ConnectionStatus.AUTHENTICATING);

      const authResult = await biometricAuthService.authenticate(
        'Authenticate to connect your bank account',
        'Use your fingerprint or Face ID to securely connect your bank account to Money Mood'
      );

      if (!authResult.success) {
        setError(authResult.error || 'Authentication failed');
        setConnectionStatus(ConnectionStatus.ERROR);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error during authentication:', error);
      setError('Authentication failed');
      setConnectionStatus(ConnectionStatus.ERROR);
      return false;
    }
  };

  /**
   * Create Plaid Link token
   */
  const createLinkToken = async (): Promise<boolean> => {
    try {
      setConnectionStatus(ConnectionStatus.CREATING_LINK_TOKEN);

      const linkTokenData = await plaidService.createLinkToken(userId, {
        clientName: 'Money Mood',
        countryCodes: ['US'],
        language: 'en',
        products: ['transactions'],
        webhook: 'https://your-webhook-url.com/plaid/webhook', // Replace with actual webhook URL
      });

      setLinkToken(linkTokenData.linkToken);
      return true;
    } catch (error) {
      console.error('Error creating link token:', error);
      setError('Failed to initialize bank connection');
      setConnectionStatus(ConnectionStatus.ERROR);
      return false;
    }
  };

  /**
   * Start the bank account connection process
   */
  const startConnection = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Request consent
      const consentGranted = await requestConsent();
      if (!consentGranted) return;

      // Step 2: Authenticate user
      const authenticated = await authenticateUser();
      if (!authenticated) return;

      // Step 3: Create link token
      const tokenCreated = await createLinkToken();
      if (!tokenCreated) return;

      // Step 4: Open Plaid Link
      setConnectionStatus(ConnectionStatus.CONNECTING);
      
      // Wait a moment for the link token to be set
      setTimeout(() => {
        if (ready) {
          open();
        } else {
          setError('Bank connection service is not ready. Please try again.');
          setConnectionStatus(ConnectionStatus.ERROR);
        }
      }, 500);

    } catch (error) {
      console.error('Error starting connection:', error);
      setError('Failed to start bank connection process');
      setConnectionStatus(ConnectionStatus.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get status message based on current connection status
   */
  const getStatusMessage = (): string => {
    switch (connectionStatus) {
      case ConnectionStatus.REQUESTING_CONSENT:
        return 'Requesting permission to access financial data...';
      case ConnectionStatus.AUTHENTICATING:
        return 'Authenticating with biometrics...';
      case ConnectionStatus.CREATING_LINK_TOKEN:
        return 'Preparing secure connection...';
      case ConnectionStatus.CONNECTING:
        return 'Opening bank connection interface...';
      case ConnectionStatus.SUCCESS:
        return 'Bank account connected successfully!';
      case ConnectionStatus.ERROR:
        return error || 'Connection failed';
      default:
        return '';
    }
  };

  /**
   * Get button color based on status
   */
  const getButtonColor = (): string => {
    switch (connectionStatus) {
      case ConnectionStatus.SUCCESS:
        return '#4CAF50'; // Green
      case ConnectionStatus.ERROR:
        return '#F44336'; // Red
      case ConnectionStatus.IDLE:
        return '#2196F3'; // Blue
      default:
        return '#FF9800'; // Orange (processing)
    }
  };

  /**
   * Check if button should be disabled
   */
  const isButtonDisabled = (): boolean => {
    return disabled || 
           isLoading || 
           connectionStatus === ConnectionStatus.REQUESTING_CONSENT ||
           connectionStatus === ConnectionStatus.AUTHENTICATING ||
           connectionStatus === ConnectionStatus.CREATING_LINK_TOKEN ||
           connectionStatus === ConnectionStatus.CONNECTING;
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.connectButton,
          { backgroundColor: getButtonColor() },
          isButtonDisabled() && styles.disabledButton,
        ]}
        onPress={startConnection}
        disabled={isButtonDisabled()}
      >
        <View style={styles.buttonContent}>
          {isLoading && (
            <ActivityIndicator 
              size="small" 
              color="#FFFFFF" 
              style={styles.loadingIndicator} 
            />
          )}
          <Text style={styles.buttonText}>
            {connectionStatus === ConnectionStatus.SUCCESS ? '✓ Connected' : buttonText}
          </Text>
        </View>
      </TouchableOpacity>

      {connectionStatus !== ConnectionStatus.IDLE && (
        <View style={styles.statusContainer}>
          <Text style={[
            styles.statusText,
            connectionStatus === ConnectionStatus.ERROR && styles.errorText,
            connectionStatus === ConnectionStatus.SUCCESS && styles.successText,
          ]}>
            {getStatusMessage()}
          </Text>
        </View>
      )}

      {connectionStatus === ConnectionStatus.ERROR && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setConnectionStatus(ConnectionStatus.IDLE);
            setError(null);
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  connectButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusContainer: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666666',
  },
  errorText: {
    color: '#F44336',
  },
  successText: {
    color: '#4CAF50',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PlaidLinkComponent;

