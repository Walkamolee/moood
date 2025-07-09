/**
 * Tests for Plaid Link Component
 * Testing UI interactions, integration flows, and error handling
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PlaidLinkComponent from '../../components/PlaidLinkComponent';
import { financialProvidersSlice } from '../../store/slices/financialProvidersSlice';

// Mock dependencies
jest.mock('react-plaid-link', () => ({
  usePlaidLink: jest.fn(),
}));

jest.mock('../../services/plaidService');
jest.mock('../../services/biometricAuthService');
jest.mock('../../services/consentManagementService');

// Mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      financialProviders: financialProvidersSlice.reducer,
    },
    preloadedState: {
      financialProviders: {
        providers: [],
        linkingStatus: {
          step: 'institution_selection',
          isLoading: false,
          error: null,
          progress: 0,
        },
        syncJobs: [],
        ...initialState,
      },
    },
  });
};

describe('PlaidLinkComponent', () => {
  const mockUsePlaidLink = require('react-plaid-link').usePlaidLink;
  const mockPlaidService = require('../../services/plaidService').plaidService;
  const mockBiometricAuth = require('../../services/biometricAuthService').biometricAuthService;
  const mockConsentService = require('../../services/consentManagementService').consentManagementService;

  const defaultProps = {
    userId: 'test-user-id',
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onExit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockUsePlaidLink.mockReturnValue({
      open: jest.fn(),
      ready: true,
      error: null,
    });

    mockPlaidService.createLinkToken.mockResolvedValue({
      linkToken: 'link-test-token',
      expiration: '2024-12-31T23:59:59Z',
    });

    mockBiometricAuth.authenticate.mockResolvedValue({
      success: true,
      biometricType: 'face_id',
    });

    mockConsentService.requestConsent.mockResolvedValue(true);
  });

  describe('component rendering', () => {
    it('should render initial state correctly', () => {
      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      expect(screen.getByText('Connect Your Bank Account')).toBeTruthy();
      expect(screen.getByText('Securely connect your financial accounts to start tracking your spending and budgets.')).toBeTruthy();
      expect(screen.getByText('Start Connection')).toBeTruthy();
    });

    it('should show loading state during link token creation', () => {
      const store = createMockStore({
        linkingStatus: {
          step: 'creating_link_token',
          isLoading: true,
          error: null,
          progress: 25,
        },
      });

      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      expect(screen.getByText('Creating secure connection...')).toBeTruthy();
      expect(screen.getByTestId('progress-bar')).toBeTruthy();
    });

    it('should show error state when link token creation fails', () => {
      const store = createMockStore({
        linkingStatus: {
          step: 'error',
          isLoading: false,
          error: 'Failed to create link token',
          progress: 0,
        },
      });

      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      expect(screen.getByText('Connection Error')).toBeTruthy();
      expect(screen.getByText('Failed to create link token')).toBeTruthy();
      expect(screen.getByText('Try Again')).toBeTruthy();
    });
  });

  describe('consent management flow', () => {
    it('should request user consent before starting connection', async () => {
      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockConsentService.requestConsent).toHaveBeenCalledWith(
          'test-user-id',
          'FINANCIAL_DATA',
          ['READ_ACCOUNTS', 'READ_TRANSACTIONS'],
          expect.objectContaining({
            purpose: 'Connect your bank accounts for automatic transaction tracking',
            dataTypes: ['Account information', 'Transaction history', 'Account balances'],
            retentionPeriod: '5 years',
            sharingWithThirdParties: false,
          })
        );
      });
    });

    it('should show consent dialog with detailed information', async () => {
      mockConsentService.requestConsent.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(screen.getByText('Data Access Consent')).toBeTruthy();
        expect(screen.getByText('We need your permission to:')).toBeTruthy();
        expect(screen.getByText('• Read your account information')).toBeTruthy();
        expect(screen.getByText('• Access your transaction history')).toBeTruthy();
        expect(screen.getByText('• View account balances')).toBeTruthy();
      });
    });

    it('should handle consent denial gracefully', async () => {
      mockConsentService.requestConsent.mockResolvedValue(false);

      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith({
          error: 'consent_denied',
          message: 'User denied consent for financial data access',
        });
      });
    });
  });

  describe('biometric authentication flow', () => {
    it('should require biometric authentication before Plaid Link', async () => {
      mockConsentService.requestConsent.mockResolvedValue(true);

      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockBiometricAuth.authenticate).toHaveBeenCalledWith(
          'Authenticate to connect your bank account',
          'Use your biometric authentication to securely connect your financial accounts'
        );
      });
    });

    it('should show biometric authentication prompt', async () => {
      mockConsentService.requestConsent.mockResolvedValue(true);
      mockBiometricAuth.authenticate.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(screen.getByText('Biometric Authentication Required')).toBeTruthy();
        expect(screen.getByText('Please authenticate to continue with bank account connection')).toBeTruthy();
      });
    });

    it('should handle biometric authentication failure', async () => {
      mockConsentService.requestConsent.mockResolvedValue(true);
      mockBiometricAuth.authenticate.mockResolvedValue({
        success: false,
        error: 'authentication_failed',
        errorMessage: 'Authentication failed',
      });

      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeTruthy();
        expect(screen.getByText('Authentication failed')).toBeTruthy();
        expect(screen.getByText('Try Again')).toBeTruthy();
      });
    });

    it('should offer fallback authentication when biometrics fail', async () => {
      mockConsentService.requestConsent.mockResolvedValue(true);
      mockBiometricAuth.authenticate.mockResolvedValue({
        success: false,
        error: 'lockout',
        errorMessage: 'Biometric authentication is temporarily locked',
        fallbackAvailable: true,
      });

      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(screen.getByText('Use PIN Instead')).toBeTruthy();
      });
    });
  });

  describe('Plaid Link integration', () => {
    it('should create link token after successful authentication', async () => {
      mockConsentService.requestConsent.mockResolvedValue(true);
      mockBiometricAuth.authenticate.mockResolvedValue({ success: true });

      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockPlaidService.createLinkToken).toHaveBeenCalledWith(
          'test-user-id',
          expect.objectContaining({
            clientName: 'Money Mood',
            countryCodes: ['US'],
            language: 'en',
            products: ['transactions'],
          })
        );
      });
    });

    it('should open Plaid Link when token is ready', async () => {
      const mockOpen = jest.fn();
      mockUsePlaidLink.mockReturnValue({
        open: mockOpen,
        ready: true,
        error: null,
      });

      mockConsentService.requestConsent.mockResolvedValue(true);
      mockBiometricAuth.authenticate.mockResolvedValue({ success: true });

      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalled();
      });
    });

    it('should handle Plaid Link success', async () => {
      const mockOnSuccess = jest.fn();
      mockUsePlaidLink.mockImplementation(({ onSuccess }) => {
        // Simulate successful link
        setTimeout(() => onSuccess({
          public_token: 'public-test-token',
          metadata: {
            institution: {
              name: 'Test Bank',
              institution_id: 'ins_test',
            },
            accounts: [
              {
                id: 'account-1',
                name: 'Checking',
                type: 'depository',
                subtype: 'checking',
              },
            ],
          },
        }), 100);

        return {
          open: jest.fn(),
          ready: true,
          error: null,
        };
      });

      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} onSuccess={mockOnSuccess} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          publicToken: 'public-test-token',
          institution: {
            name: 'Test Bank',
            id: 'ins_test',
          },
          accounts: [
            {
              id: 'account-1',
              name: 'Checking',
              type: 'checking',
            },
          ],
        });
      });
    });

    it('should handle Plaid Link errors', async () => {
      mockUsePlaidLink.mockImplementation(({ onError }) => {
        setTimeout(() => onError({
          error_code: 'INVALID_CREDENTIALS',
          error_message: 'Invalid bank credentials',
          error_type: 'INVALID_INPUT',
        }), 100);

        return {
          open: jest.fn(),
          ready: true,
          error: null,
        };
      });

      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid bank credentials',
          type: 'INVALID_INPUT',
        });
      });
    });

    it('should handle Plaid Link exit', async () => {
      mockUsePlaidLink.mockImplementation(({ onExit }) => {
        setTimeout(() => onExit({
          error: null,
          metadata: {
            status: 'requires_questions',
            institution: {
              name: 'Test Bank',
              institution_id: 'ins_test',
            },
          },
        }), 100);

        return {
          open: jest.fn(),
          ready: true,
          error: null,
        };
      });

      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(defaultProps.onExit).toHaveBeenCalledWith({
          error: null,
          status: 'requires_questions',
          institution: {
            name: 'Test Bank',
            id: 'ins_test',
          },
        });
      });
    });
  });

  describe('progress tracking', () => {
    it('should show progress through connection steps', async () => {
      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      // Initial state
      expect(screen.getByText('Step 1 of 4: Consent')).toBeTruthy();

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      // After consent
      await waitFor(() => {
        expect(screen.getByText('Step 2 of 4: Authentication')).toBeTruthy();
      });

      // After biometric auth
      await waitFor(() => {
        expect(screen.getByText('Step 3 of 4: Bank Selection')).toBeTruthy();
      });
    });

    it('should update progress bar correctly', async () => {
      const store = createMockStore({
        linkingStatus: {
          step: 'biometric_auth',
          isLoading: false,
          error: null,
          progress: 50,
        },
      });

      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar.props.progress).toBe(0.5); // 50%
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility labels', () => {
      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      expect(screen.getByLabelText('Start bank account connection')).toBeTruthy();
      expect(screen.getByLabelText('Connection progress')).toBeTruthy();
    });

    it('should announce progress changes to screen readers', async () => {
      const store = createMockStore();
      
      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const startButton = screen.getByText('Start Connection');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Step 2 of 4: Authentication in progress')).toBeTruthy();
      });
    });
  });

  describe('error recovery', () => {
    it('should allow retry after errors', async () => {
      const store = createMockStore({
        linkingStatus: {
          step: 'error',
          isLoading: false,
          error: 'Network error',
          progress: 0,
        },
      });

      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const retryButton = screen.getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(mockConsentService.requestConsent).toHaveBeenCalled();
      });
    });

    it('should reset state when retrying', async () => {
      const store = createMockStore({
        linkingStatus: {
          step: 'error',
          isLoading: false,
          error: 'Previous error',
          progress: 75,
        },
      });

      render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      const retryButton = screen.getByText('Try Again');
      fireEvent.press(retryButton);

      // Should reset to initial state
      await waitFor(() => {
        expect(screen.getByText('Step 1 of 4: Consent')).toBeTruthy();
      });
    });
  });

  describe('performance optimization', () => {
    it('should not re-render unnecessarily', () => {
      const store = createMockStore();
      
      const { rerender } = render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      // Re-render with same props
      rerender(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      // Should not create new link token
      expect(mockPlaidService.createLinkToken).not.toHaveBeenCalled();
    });

    it('should cleanup resources on unmount', () => {
      const store = createMockStore();
      
      const { unmount } = render(
        <Provider store={store}>
          <PlaidLinkComponent {...defaultProps} />
        </Provider>
      );

      unmount();

      // Should cleanup any pending operations
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});

