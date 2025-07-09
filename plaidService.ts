/**
 * Plaid Service for Money Mood
 * Comprehensive integration with Plaid API for financial data access
 */

import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';
import { config } from '../config/environment';
import { encryptionService, SecureStorage } from '../utils/encryption';
import { auditLogger } from '../utils/auditLogger';
import { pciComplianceService, PCIDataType } from './pciComplianceService';
import { consentManagementService, ConsentCategory } from './consentManagementService';
import { securityMonitoringService, SecurityEventType } from './securityMonitoringService';
import {
  Account,
  Transaction,
  Institution,
  FinancialProvider,
  AccountType,
  TransactionType,
  Permission,
  ConsentType,
} from '../types/financial';

/**
 * Plaid-specific interfaces
 */
export interface PlaidLinkToken {
  linkToken: string;
  expiration: string;
  requestId: string;
}

export interface PlaidPublicToken {
  publicToken: string;
  metadata: {
    institution: {
      name: string;
      institution_id: string;
    };
    accounts: Array<{
      id: string;
      name: string;
      type: string;
      subtype: string;
    }>;
  };
}

export interface PlaidAccessToken {
  accessToken: string;
  itemId: string;
  institutionId: string;
  userId: string;
  createdAt: string;
  lastUsed?: string;
  status: 'active' | 'inactive' | 'error';
}

export interface PlaidWebhookEvent {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: any;
  new_transactions?: number;
  removed_transactions?: string[];
}

export interface PlaidAccountData {
  account_id: string;
  balances: {
    available: number | null;
    current: number | null;
    limit: number | null;
    iso_currency_code: string | null;
  };
  mask: string | null;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
}

export interface PlaidTransactionData {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code: string | null;
  date: string;
  datetime: string | null;
  authorized_date: string | null;
  authorized_datetime: string | null;
  name: string;
  merchant_name: string | null;
  payment_channel: string;
  category: string[] | null;
  category_id: string | null;
  account_owner: string | null;
  pending: boolean;
  pending_transaction_id: string | null;
  transaction_code: string | null;
  location: {
    address: string | null;
    city: string | null;
    region: string | null;
    postal_code: string | null;
    country: string | null;
    lat: number | null;
    lon: number | null;
    store_number: string | null;
  } | null;
}

/**
 * Plaid Service Implementation
 */
export class PlaidService {
  private static instance: PlaidService;
  private plaidClient: PlaidApi;
  private accessTokens: Map<string, PlaidAccessToken> = new Map();

  private constructor() {
    this.initializePlaidClient();
  }

  public static getInstance(): PlaidService {
    if (!PlaidService.instance) {
      PlaidService.instance = new PlaidService();
    }
    return PlaidService.instance;
  }

  /**
   * Initialize Plaid client with configuration
   */
  private initializePlaidClient(): void {
    const configuration = new Configuration({
      basePath: config.plaid.environment === 'production' 
        ? PlaidEnvironments.production 
        : config.plaid.environment === 'development'
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': config.plaid.clientId,
          'PLAID-SECRET': config.plaid.secretKey,
          'Plaid-Version': '2020-09-14',
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
    console.log('Plaid client initialized for environment:', config.plaid.environment);
  }

  /**
   * Create Link token for account connection
   */
  public async createLinkToken(
    userId: string,
    options: {
      clientName?: string;
      countryCodes?: string[];
      language?: string;
      products?: string[];
      accountFilters?: any;
      redirectUri?: string;
      webhook?: string;
    } = {}
  ): Promise<PlaidLinkToken> {
    try {
      // Check user consent for financial data access
      const hasConsent = await consentManagementService.hasConsent(
        userId,
        ConsentCategory.FINANCIAL_DATA,
        [Permission.READ_ACCOUNTS, Permission.READ_TRANSACTIONS]
      );

      if (!hasConsent) {
        throw new Error('User consent required for financial data access');
      }

      const request = {
        user: {
          client_user_id: userId,
        },
        client_name: options.clientName || 'Money Mood',
        products: options.products || ['transactions'],
        country_codes: options.countryCodes || ['US'],
        language: options.language || 'en',
        account_filters: options.accountFilters,
        redirect_uri: options.redirectUri,
        webhook: options.webhook || config.plaid.webhookUrl,
      };

      const response = await this.plaidClient.linkTokenCreate(request);
      
      const linkToken: PlaidLinkToken = {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
        requestId: response.data.request_id,
      };

      // Log link token creation
      await auditLogger.logEvent(
        'FINANCIAL_DATA_ACCESS',
        'plaid_link_token',
        linkToken.linkToken,
        'create_link_token',
        'Plaid Link token created for account connection',
        userId,
        {
          newValues: {
            products: request.products,
            countryCodes: request.country_codes,
          },
        }
      );

      // Record security event
      await securityMonitoringService.recordSecurityEvent(
        userId,
        SecurityEventType.ACCOUNT_ACCESS,
        'Plaid Link token created for account connection',
        {
          ipAddress: 'system',
          userAgent: 'plaid-service',
          metadata: {
            products: request.products,
            linkToken: linkToken.linkToken,
          },
        }
      );

      return linkToken;

    } catch (error) {
      console.error('Failed to create Plaid Link token:', error);
      
      await auditLogger.logEvent(
        'FINANCIAL_DATA_ACCESS',
        'plaid_link_token',
        '',
        'create_link_token_failed',
        `Failed to create Plaid Link token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        userId,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      throw new Error(`Failed to create Link token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Exchange public token for access token
   */
  public async exchangePublicToken(
    userId: string,
    publicToken: string,
    metadata: PlaidPublicToken['metadata']
  ): Promise<PlaidAccessToken> {
    try {
      const request = {
        public_token: publicToken,
      };

      const response = await this.plaidClient.linkTokenExchange(request);
      
      const accessToken: PlaidAccessToken = {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
        institutionId: metadata.institution.institution_id,
        userId,
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      // Securely store access token
      await this.storeAccessToken(accessToken);

      // Log successful token exchange
      await auditLogger.logEvent(
        'FINANCIAL_DATA_ACCESS',
        'plaid_access_token',
        accessToken.accessToken,
        'exchange_public_token',
        `Access token obtained for institution: ${metadata.institution.name}`,
        userId,
        {
          newValues: {
            institutionId: accessToken.institutionId,
            institutionName: metadata.institution.name,
            accountCount: metadata.accounts.length,
          },
        }
      );

      // Record security event
      await securityMonitoringService.recordSecurityEvent(
        userId,
        SecurityEventType.ACCOUNT_ACCESS,
        `Financial account connected: ${metadata.institution.name}`,
        {
          ipAddress: 'system',
          userAgent: 'plaid-service',
          metadata: {
            institutionId: accessToken.institutionId,
            institutionName: metadata.institution.name,
            itemId: accessToken.itemId,
          },
        }
      );

      return accessToken;

    } catch (error) {
      console.error('Failed to exchange public token:', error);
      
      await auditLogger.logEvent(
        'FINANCIAL_DATA_ACCESS',
        'plaid_access_token',
        '',
        'exchange_public_token_failed',
        `Failed to exchange public token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        userId,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      throw new Error(`Failed to exchange public token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get accounts for a user
   */
  public async getAccounts(userId: string, itemId?: string): Promise<Account[]> {
    try {
      const accessTokens = await this.getUserAccessTokens(userId);
      const filteredTokens = itemId 
        ? accessTokens.filter(token => token.itemId === itemId)
        : accessTokens;

      if (filteredTokens.length === 0) {
        return [];
      }

      const allAccounts: Account[] = [];

      for (const tokenData of filteredTokens) {
        try {
          const request = {
            access_token: tokenData.accessToken,
          };

          const response = await this.plaidClient.accountsGet(request);
          const plaidAccounts = response.data.accounts;

          // Transform Plaid accounts to our format
          const accounts = await Promise.all(
            plaidAccounts.map(async (plaidAccount: PlaidAccountData) => {
              const account: Account = {
                id: plaidAccount.account_id,
                userId,
                institutionId: tokenData.institutionId,
                name: plaidAccount.name,
                officialName: plaidAccount.official_name || plaidAccount.name,
                type: this.mapPlaidAccountType(plaidAccount.type, plaidAccount.subtype),
                subtype: plaidAccount.subtype || '',
                mask: plaidAccount.mask || '',
                balance: plaidAccount.balances.current || 0,
                availableBalance: plaidAccount.balances.available,
                creditLimit: plaidAccount.balances.limit,
                currency: plaidAccount.balances.iso_currency_code || 'USD',
                isActive: true,
                lastSynced: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                provider: FinancialProvider.PLAID,
                externalId: plaidAccount.account_id,
                metadata: {
                  itemId: tokenData.itemId,
                  plaidAccountType: plaidAccount.type,
                  plaidSubtype: plaidAccount.subtype,
                },
              };

              // Handle PCI data securely
              await pciComplianceService.handlePCIData(
                { accountNumber: plaidAccount.mask },
                PCIDataType.PRIMARY_ACCOUNT_NUMBER,
                'store',
                userId
              );

              return account;
            })
          );

          allAccounts.push(...accounts);

          // Update last used timestamp
          tokenData.lastUsed = new Date().toISOString();
          await this.storeAccessToken(tokenData);

        } catch (error) {
          console.error(`Failed to get accounts for item ${tokenData.itemId}:`, error);
          
          // Mark token as error if it's invalid
          if (error instanceof Error && error.message.includes('INVALID_ACCESS_TOKEN')) {
            tokenData.status = 'error';
            await this.storeAccessToken(tokenData);
          }
        }
      }

      // Log account retrieval
      await auditLogger.logEvent(
        'FINANCIAL_DATA_ACCESS',
        'accounts',
        '',
        'get_accounts',
        `Retrieved ${allAccounts.length} accounts`,
        userId,
        {
          newValues: {
            accountCount: allAccounts.length,
            itemIds: filteredTokens.map(t => t.itemId),
          },
        }
      );

      return allAccounts;

    } catch (error) {
      console.error('Failed to get accounts:', error);
      throw new Error(`Failed to get accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transactions for accounts
   */
  public async getTransactions(
    userId: string,
    options: {
      accountIds?: string[];
      startDate?: string;
      endDate?: string;
      count?: number;
      offset?: number;
    } = {}
  ): Promise<Transaction[]> {
    try {
      const accessTokens = await this.getUserAccessTokens(userId);
      
      if (accessTokens.length === 0) {
        return [];
      }

      const allTransactions: Transaction[] = [];
      const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = options.endDate || new Date().toISOString().split('T')[0];

      for (const tokenData of accessTokens) {
        try {
          const request = {
            access_token: tokenData.accessToken,
            start_date: startDate,
            end_date: endDate,
            count: options.count || 500,
            offset: options.offset || 0,
            account_ids: options.accountIds,
          };

          const response = await this.plaidClient.transactionsGet(request);
          const plaidTransactions = response.data.transactions;

          // Transform Plaid transactions to our format
          const transactions = plaidTransactions.map((plaidTxn: PlaidTransactionData) => {
            const transaction: Transaction = {
              id: plaidTxn.transaction_id,
              accountId: plaidTxn.account_id,
              userId,
              amount: Math.abs(plaidTxn.amount),
              type: plaidTxn.amount > 0 ? TransactionType.DEBIT : TransactionType.CREDIT,
              description: plaidTxn.name,
              merchantName: plaidTxn.merchant_name || undefined,
              category: plaidTxn.category?.[0] || 'Other',
              subcategory: plaidTxn.category?.[1] || undefined,
              date: plaidTxn.date,
              authorizedDate: plaidTxn.authorized_date || undefined,
              isPending: plaidTxn.pending,
              currency: plaidTxn.iso_currency_code || 'USD',
              location: plaidTxn.location ? {
                address: plaidTxn.location.address || undefined,
                city: plaidTxn.location.city || undefined,
                state: plaidTxn.location.region || undefined,
                postalCode: plaidTxn.location.postal_code || undefined,
                country: plaidTxn.location.country || undefined,
                latitude: plaidTxn.location.lat || undefined,
                longitude: plaidTxn.location.lon || undefined,
              } : undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              provider: FinancialProvider.PLAID,
              externalId: plaidTxn.transaction_id,
              metadata: {
                itemId: tokenData.itemId,
                paymentChannel: plaidTxn.payment_channel,
                transactionCode: plaidTxn.transaction_code,
                categoryId: plaidTxn.category_id,
                pendingTransactionId: plaidTxn.pending_transaction_id,
              },
            };

            return transaction;
          });

          allTransactions.push(...transactions);

          // Update last used timestamp
          tokenData.lastUsed = new Date().toISOString();
          await this.storeAccessToken(tokenData);

        } catch (error) {
          console.error(`Failed to get transactions for item ${tokenData.itemId}:`, error);
          
          // Mark token as error if it's invalid
          if (error instanceof Error && error.message.includes('INVALID_ACCESS_TOKEN')) {
            tokenData.status = 'error';
            await this.storeAccessToken(tokenData);
          }
        }
      }

      // Log transaction retrieval
      await auditLogger.logEvent(
        'FINANCIAL_DATA_ACCESS',
        'transactions',
        '',
        'get_transactions',
        `Retrieved ${allTransactions.length} transactions`,
        userId,
        {
          newValues: {
            transactionCount: allTransactions.length,
            dateRange: `${startDate} to ${endDate}`,
            accountIds: options.accountIds,
          },
        }
      );

      return allTransactions;

    } catch (error) {
      console.error('Failed to get transactions:', error);
      throw new Error(`Failed to get transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get institution information
   */
  public async getInstitution(institutionId: string): Promise<Institution | null> {
    try {
      const request = {
        institution_id: institutionId,
        country_codes: ['US'],
      };

      const response = await this.plaidClient.institutionsGetById(request);
      const plaidInstitution = response.data.institution;

      const institution: Institution = {
        id: plaidInstitution.institution_id,
        name: plaidInstitution.name,
        url: plaidInstitution.url || undefined,
        logo: plaidInstitution.logo || undefined,
        primaryColor: plaidInstitution.primary_color || undefined,
        products: plaidInstitution.products || [],
        countryCodes: plaidInstitution.country_codes || ['US'],
        routingNumbers: plaidInstitution.routing_numbers || [],
        oauth: plaidInstitution.oauth || false,
        status: {
          itemLogins: plaidInstitution.status?.item_logins || 'HEALTHY',
          transactionsUpdates: plaidInstitution.status?.transactions_updates || 'HEALTHY',
          auth: plaidInstitution.status?.auth || 'HEALTHY',
          identity: plaidInstitution.status?.identity || 'HEALTHY',
          investmentsUpdates: plaidInstitution.status?.investments_updates || 'HEALTHY',
          liabilitiesUpdates: plaidInstitution.status?.liabilities_updates || 'HEALTHY',
          liabilities: plaidInstitution.status?.liabilities || 'HEALTHY',
          investments: plaidInstitution.status?.investments || 'HEALTHY',
        },
        provider: FinancialProvider.PLAID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return institution;

    } catch (error) {
      console.error('Failed to get institution:', error);
      return null;
    }
  }

  /**
   * Handle Plaid webhook events
   */
  public async handleWebhook(webhookData: PlaidWebhookEvent): Promise<void> {
    try {
      const { webhook_type, webhook_code, item_id } = webhookData;

      // Find the user associated with this item
      const accessToken = await this.getAccessTokenByItemId(item_id);
      if (!accessToken) {
        console.error('No access token found for item:', item_id);
        return;
      }

      // Log webhook event
      await auditLogger.logEvent(
        'FINANCIAL_DATA_ACCESS',
        'plaid_webhook',
        item_id,
        `${webhook_type}_${webhook_code}`,
        `Plaid webhook received: ${webhook_type}/${webhook_code}`,
        accessToken.userId,
        {
          newValues: {
            webhookType: webhook_type,
            webhookCode: webhook_code,
            itemId: item_id,
            data: webhookData,
          },
        }
      );

      switch (webhook_type) {
        case 'TRANSACTIONS':
          await this.handleTransactionsWebhook(accessToken, webhook_code, webhookData);
          break;
        
        case 'ITEM':
          await this.handleItemWebhook(accessToken, webhook_code, webhookData);
          break;
        
        case 'AUTH':
          await this.handleAuthWebhook(accessToken, webhook_code, webhookData);
          break;
        
        case 'ASSETS':
          await this.handleAssetsWebhook(accessToken, webhook_code, webhookData);
          break;
        
        default:
          console.log('Unhandled webhook type:', webhook_type);
      }

    } catch (error) {
      console.error('Failed to handle webhook:', error);
    }
  }

  /**
   * Remove item and revoke access
   */
  public async removeItem(userId: string, itemId: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessTokenByItemId(itemId);
      
      if (!accessToken || accessToken.userId !== userId) {
        throw new Error('Access token not found or unauthorized');
      }

      const request = {
        access_token: accessToken.accessToken,
      };

      await this.plaidClient.itemRemove(request);

      // Remove stored access token
      await this.removeAccessToken(itemId);

      // Log item removal
      await auditLogger.logEvent(
        'FINANCIAL_DATA_ACCESS',
        'plaid_item',
        itemId,
        'remove_item',
        'Plaid item removed and access revoked',
        userId,
        {
          oldValues: {
            itemId,
            institutionId: accessToken.institutionId,
          },
        }
      );

      // Record security event
      await securityMonitoringService.recordSecurityEvent(
        userId,
        SecurityEventType.ACCOUNT_ACCESS,
        'Financial account disconnected',
        {
          ipAddress: 'system',
          userAgent: 'plaid-service',
          metadata: {
            itemId,
            institutionId: accessToken.institutionId,
          },
        }
      );

      return true;

    } catch (error) {
      console.error('Failed to remove item:', error);
      return false;
    }
  }

  // Private helper methods

  private async storeAccessToken(accessToken: PlaidAccessToken): Promise<void> {
    // Store in memory cache
    this.accessTokens.set(accessToken.itemId, accessToken);
    
    // Store securely with encryption
    await SecureStorage.storeSecureData(
      `plaid_access_token_${accessToken.itemId}`,
      accessToken
    );
  }

  private async getUserAccessTokens(userId: string): Promise<PlaidAccessToken[]> {
    // In a real implementation, this would query the database
    // For now, return from memory cache filtered by userId
    return Array.from(this.accessTokens.values()).filter(
      token => token.userId === userId && token.status === 'active'
    );
  }

  private async getAccessTokenByItemId(itemId: string): Promise<PlaidAccessToken | null> {
    // Check memory cache first
    const cached = this.accessTokens.get(itemId);
    if (cached) {
      return cached;
    }

    // Try to load from secure storage
    try {
      const stored = await SecureStorage.retrieveSecureData<PlaidAccessToken>(
        `plaid_access_token_${itemId}`
      );
      
      if (stored) {
        this.accessTokens.set(itemId, stored);
        return stored;
      }
    } catch (error) {
      console.error('Failed to load access token from storage:', error);
    }

    return null;
  }

  private async removeAccessToken(itemId: string): Promise<void> {
    // Remove from memory cache
    this.accessTokens.delete(itemId);
    
    // Remove from secure storage
    await SecureStorage.removeSecureData(`plaid_access_token_${itemId}`);
  }

  private mapPlaidAccountType(type: string, subtype: string | null): AccountType {
    switch (type) {
      case 'depository':
        if (subtype === 'checking') return AccountType.CHECKING;
        if (subtype === 'savings') return AccountType.SAVINGS;
        return AccountType.CHECKING;
      
      case 'credit':
        return AccountType.CREDIT_CARD;
      
      case 'loan':
        return AccountType.LOAN;
      
      case 'investment':
        return AccountType.INVESTMENT;
      
      default:
        return AccountType.OTHER;
    }
  }

  private async handleTransactionsWebhook(
    accessToken: PlaidAccessToken,
    webhookCode: string,
    webhookData: PlaidWebhookEvent
  ): Promise<void> {
    switch (webhookCode) {
      case 'INITIAL_UPDATE':
      case 'HISTORICAL_UPDATE':
      case 'DEFAULT_UPDATE':
        // Trigger transaction sync
        console.log(`Transaction update for item ${accessToken.itemId}: ${webhookCode}`);
        // Implementation would trigger background sync
        break;
      
      case 'TRANSACTIONS_REMOVED':
        // Handle removed transactions
        console.log(`Transactions removed for item ${accessToken.itemId}`);
        break;
    }
  }

  private async handleItemWebhook(
    accessToken: PlaidAccessToken,
    webhookCode: string,
    webhookData: PlaidWebhookEvent
  ): Promise<void> {
    switch (webhookCode) {
      case 'ERROR':
        // Handle item error
        accessToken.status = 'error';
        await this.storeAccessToken(accessToken);
        console.error(`Item error for ${accessToken.itemId}:`, webhookData.error);
        break;
      
      case 'PENDING_EXPIRATION':
        // Handle pending expiration
        console.log(`Item expiring soon: ${accessToken.itemId}`);
        break;
      
      case 'USER_PERMISSION_REVOKED':
        // Handle permission revocation
        accessToken.status = 'inactive';
        await this.storeAccessToken(accessToken);
        console.log(`User revoked permissions for item: ${accessToken.itemId}`);
        break;
    }
  }

  private async handleAuthWebhook(
    accessToken: PlaidAccessToken,
    webhookCode: string,
    webhookData: PlaidWebhookEvent
  ): Promise<void> {
    switch (webhookCode) {
      case 'AUTOMATICALLY_VERIFIED':
        console.log(`Auth automatically verified for item: ${accessToken.itemId}`);
        break;
      
      case 'VERIFICATION_EXPIRED':
        console.log(`Auth verification expired for item: ${accessToken.itemId}`);
        break;
    }
  }

  private async handleAssetsWebhook(
    accessToken: PlaidAccessToken,
    webhookCode: string,
    webhookData: PlaidWebhookEvent
  ): Promise<void> {
    switch (webhookCode) {
      case 'PRODUCT_READY':
        console.log(`Assets product ready for item: ${accessToken.itemId}`);
        break;
      
      case 'ERROR':
        console.error(`Assets error for item ${accessToken.itemId}:`, webhookData.error);
        break;
    }
  }
}

// Export singleton instance
export const plaidService = PlaidService.getInstance();

