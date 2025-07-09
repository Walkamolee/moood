/**
 * Tests for Plaid Service
 * Comprehensive testing of financial data integration
 */

import { plaidService } from '../../services/plaidService';
import { FinancialProvider } from '../../types/financial';

// Mock Plaid client
jest.mock('plaid', () => ({
  PlaidApi: jest.fn().mockImplementation(() => ({
    linkTokenCreate: jest.fn(),
    itemPublicTokenExchange: jest.fn(),
    accountsGet: jest.fn(),
    transactionsGet: jest.fn(),
    itemGet: jest.fn(),
    itemRemove: jest.fn(),
  })),
  Configuration: jest.fn(),
  PlaidEnvironments: {
    sandbox: 'https://sandbox.plaid.com',
    development: 'https://development.plaid.com',
    production: 'https://production.plaid.com',
  },
  CountryCode: {
    Us: 'US',
    Ca: 'CA',
  },
  Products: {
    Transactions: 'transactions',
    Auth: 'auth',
    Identity: 'identity',
  },
}));

// Mock environment configuration
jest.mock('../../config/environment', () => ({
  environment: {
    plaid: {
      clientId: 'test_client_id',
      secret: 'test_secret',
      environment: 'sandbox',
      webhookUrl: 'https://test.webhook.com',
    },
  },
}));

describe('PlaidService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLinkToken', () => {
    it('should create a link token successfully', async () => {
      const mockResponse = {
        data: {
          link_token: 'link-sandbox-test-token',
          expiration: '2024-01-01T00:00:00Z',
        },
      };

      const mockPlaidClient = {
        linkTokenCreate: jest.fn().mockResolvedValue(mockResponse),
      };

      // Mock the plaid client
      (plaidService as any).plaidClient = mockPlaidClient;

      const result = await plaidService.createLinkToken('test-user-id', {
        clientName: 'Money Mood',
        countryCodes: ['US'],
        language: 'en',
        products: ['transactions'],
        webhook: 'https://test.webhook.com',
      });

      expect(result).toEqual({
        linkToken: 'link-sandbox-test-token',
        expiration: '2024-01-01T00:00:00Z',
      });

      expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith({
        user: { client_user_id: 'test-user-id' },
        client_name: 'Money Mood',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        webhook: 'https://test.webhook.com',
      });
    });

    it('should handle link token creation errors', async () => {
      const mockError = new Error('Invalid client credentials');
      const mockPlaidClient = {
        linkTokenCreate: jest.fn().mockRejectedValue(mockError),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      await expect(
        plaidService.createLinkToken('test-user-id', {
          clientName: 'Money Mood',
          countryCodes: ['US'],
          language: 'en',
          products: ['transactions'],
        })
      ).rejects.toThrow('Invalid client credentials');
    });
  });

  describe('exchangePublicToken', () => {
    it('should exchange public token for access token', async () => {
      const mockResponse = {
        data: {
          access_token: 'access-sandbox-test-token',
          item_id: 'test-item-id',
        },
      };

      const mockPlaidClient = {
        itemPublicTokenExchange: jest.fn().mockResolvedValue(mockResponse),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      const result = await plaidService.exchangePublicToken('public-sandbox-test-token');

      expect(result).toEqual({
        accessToken: 'access-sandbox-test-token',
        itemId: 'test-item-id',
      });

      expect(mockPlaidClient.itemPublicTokenExchange).toHaveBeenCalledWith({
        public_token: 'public-sandbox-test-token',
      });
    });

    it('should handle public token exchange errors', async () => {
      const mockError = new Error('Invalid public token');
      const mockPlaidClient = {
        itemPublicTokenExchange: jest.fn().mockRejectedValue(mockError),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      await expect(
        plaidService.exchangePublicToken('invalid-token')
      ).rejects.toThrow('Invalid public token');
    });
  });

  describe('getAccounts', () => {
    it('should retrieve accounts successfully', async () => {
      const mockResponse = {
        data: {
          accounts: [
            {
              account_id: 'test-account-1',
              name: 'Checking Account',
              type: 'depository',
              subtype: 'checking',
              balances: {
                available: 1000.50,
                current: 1000.50,
                iso_currency_code: 'USD',
              },
            },
            {
              account_id: 'test-account-2',
              name: 'Credit Card',
              type: 'credit',
              subtype: 'credit_card',
              balances: {
                available: 2500.00,
                current: -150.75,
                iso_currency_code: 'USD',
              },
            },
          ],
          item: {
            item_id: 'test-item-id',
            institution_id: 'ins_test',
          },
        },
      };

      const mockPlaidClient = {
        accountsGet: jest.fn().mockResolvedValue(mockResponse),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      const result = await plaidService.getAccounts('access-token');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'test-account-1',
        name: 'Checking Account',
        type: 'checking',
        balance: 1000.50,
        currency: 'USD',
      });
      expect(result[1]).toMatchObject({
        id: 'test-account-2',
        name: 'Credit Card',
        type: 'credit_card',
        balance: -150.75,
        currency: 'USD',
      });
    });

    it('should handle account retrieval errors', async () => {
      const mockError = new Error('Invalid access token');
      const mockPlaidClient = {
        accountsGet: jest.fn().mockRejectedValue(mockError),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      await expect(
        plaidService.getAccounts('invalid-token')
      ).rejects.toThrow('Invalid access token');
    });
  });

  describe('getTransactions', () => {
    it('should retrieve transactions successfully', async () => {
      const mockResponse = {
        data: {
          transactions: [
            {
              transaction_id: 'test-transaction-1',
              account_id: 'test-account-1',
              amount: 45.67,
              date: '2024-01-01',
              name: 'Starbucks Coffee',
              merchant_name: 'Starbucks',
              category: ['Food and Drink', 'Restaurants', 'Coffee Shop'],
              location: {
                city: 'New York',
                region: 'NY',
                country: 'US',
              },
              pending: false,
            },
            {
              transaction_id: 'test-transaction-2',
              account_id: 'test-account-1',
              amount: -2500.00,
              date: '2024-01-01',
              name: 'Salary Deposit',
              category: ['Deposit'],
              pending: false,
            },
          ],
          total_transactions: 2,
        },
      };

      const mockPlaidClient = {
        transactionsGet: jest.fn().mockResolvedValue(mockResponse),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await plaidService.getTransactions('access-token', startDate, endDate);

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]).toMatchObject({
        id: 'test-transaction-1',
        accountId: 'test-account-1',
        amount: 45.67,
        description: 'Starbucks Coffee',
        merchantName: 'Starbucks',
        isPending: false,
      });
      expect(result.totalTransactions).toBe(2);
    });

    it('should handle transaction retrieval errors', async () => {
      const mockError = new Error('Date range too large');
      const mockPlaidClient = {
        transactionsGet: jest.fn().mockRejectedValue(mockError),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await expect(
        plaidService.getTransactions('invalid-token', startDate, endDate)
      ).rejects.toThrow('Date range too large');
    });
  });

  describe('removeItem', () => {
    it('should remove item successfully', async () => {
      const mockResponse = {
        data: {
          removed: true,
        },
      };

      const mockPlaidClient = {
        itemRemove: jest.fn().mockResolvedValue(mockResponse),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      const result = await plaidService.removeItem('access-token');

      expect(result).toBe(true);
      expect(mockPlaidClient.itemRemove).toHaveBeenCalledWith({
        access_token: 'access-token',
      });
    });

    it('should handle item removal errors', async () => {
      const mockError = new Error('Item not found');
      const mockPlaidClient = {
        itemRemove: jest.fn().mockRejectedValue(mockError),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      await expect(
        plaidService.removeItem('invalid-token')
      ).rejects.toThrow('Item not found');
    });
  });

  describe('processWebhook', () => {
    it('should process transaction webhook successfully', async () => {
      const webhookData = {
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'DEFAULT_UPDATE',
        item_id: 'test-item-id',
        new_transactions: 5,
        removed_transactions: [],
      };

      const result = await plaidService.processWebhook(webhookData);

      expect(result).toMatchObject({
        type: 'TRANSACTIONS',
        code: 'DEFAULT_UPDATE',
        itemId: 'test-item-id',
        processed: true,
      });
    });

    it('should process item webhook successfully', async () => {
      const webhookData = {
        webhook_type: 'ITEM',
        webhook_code: 'ERROR',
        item_id: 'test-item-id',
        error: {
          error_code: 'ITEM_LOGIN_REQUIRED',
          error_message: 'User needs to re-authenticate',
        },
      };

      const result = await plaidService.processWebhook(webhookData);

      expect(result).toMatchObject({
        type: 'ITEM',
        code: 'ERROR',
        itemId: 'test-item-id',
        processed: true,
        error: {
          code: 'ITEM_LOGIN_REQUIRED',
          message: 'User needs to re-authenticate',
        },
      });
    });

    it('should handle unknown webhook types', async () => {
      const webhookData = {
        webhook_type: 'UNKNOWN',
        webhook_code: 'UNKNOWN_CODE',
        item_id: 'test-item-id',
      };

      const result = await plaidService.processWebhook(webhookData);

      expect(result).toMatchObject({
        type: 'UNKNOWN',
        code: 'UNKNOWN_CODE',
        itemId: 'test-item-id',
        processed: false,
        error: {
          message: 'Unknown webhook type: UNKNOWN',
        },
      });
    });
  });

  describe('getInstitution', () => {
    it('should retrieve institution information', async () => {
      const mockResponse = {
        data: {
          institution: {
            institution_id: 'ins_test',
            name: 'Test Bank',
            products: ['transactions', 'auth'],
            country_codes: ['US'],
            logo: 'https://example.com/logo.png',
            primary_color: '#003366',
            url: 'https://testbank.com',
          },
        },
      };

      const mockPlaidClient = {
        institutionsGetById: jest.fn().mockResolvedValue(mockResponse),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      const result = await plaidService.getInstitution('ins_test');

      expect(result).toMatchObject({
        id: 'ins_test',
        name: 'Test Bank',
        products: ['transactions', 'auth'],
        countryCodes: ['US'],
        logo: 'https://example.com/logo.png',
        primaryColor: '#003366',
        url: 'https://testbank.com',
      });
    });
  });

  describe('error handling', () => {
    it('should handle rate limiting errors', async () => {
      const mockError = {
        response: {
          data: {
            error_code: 'RATE_LIMIT_EXCEEDED',
            error_message: 'Rate limit exceeded',
          },
        },
      };

      const mockPlaidClient = {
        accountsGet: jest.fn().mockRejectedValue(mockError),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      await expect(
        plaidService.getAccounts('access-token')
      ).rejects.toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
      });
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network error');
      mockError.name = 'NetworkError';

      const mockPlaidClient = {
        accountsGet: jest.fn().mockRejectedValue(mockError),
      };

      (plaidService as any).plaidClient = mockPlaidClient;

      await expect(
        plaidService.getAccounts('access-token')
      ).rejects.toThrow('Network error');
    });
  });

  describe('data transformation', () => {
    it('should transform Plaid account data correctly', () => {
      const plaidAccount = {
        account_id: 'test-account',
        name: 'Test Checking',
        type: 'depository',
        subtype: 'checking',
        balances: {
          available: 1000.50,
          current: 1000.50,
          iso_currency_code: 'USD',
        },
      };

      const transformed = (plaidService as any).transformAccount(plaidAccount);

      expect(transformed).toMatchObject({
        id: 'test-account',
        name: 'Test Checking',
        type: 'checking',
        balance: 1000.50,
        availableBalance: 1000.50,
        currency: 'USD',
        provider: FinancialProvider.PLAID,
      });
    });

    it('should transform Plaid transaction data correctly', () => {
      const plaidTransaction = {
        transaction_id: 'test-transaction',
        account_id: 'test-account',
        amount: 45.67,
        date: '2024-01-01',
        name: 'Test Merchant',
        merchant_name: 'Test Merchant Inc',
        category: ['Food and Drink', 'Restaurants'],
        location: {
          city: 'New York',
          region: 'NY',
          country: 'US',
        },
        pending: false,
      };

      const transformed = (plaidService as any).transformTransaction(plaidTransaction);

      expect(transformed).toMatchObject({
        id: 'test-transaction',
        accountId: 'test-account',
        amount: 45.67,
        description: 'Test Merchant',
        merchantName: 'Test Merchant Inc',
        isPending: false,
        location: {
          city: 'New York',
          state: 'NY',
          country: 'US',
        },
      });
    });
  });
});

