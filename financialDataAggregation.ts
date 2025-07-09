/**
 * Financial Data Aggregation Service
 * Provides unified interface for multiple financial data providers
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from '../config/environment';
import { encryptionService, SecureStorage, DataSanitizer } from '../utils/encryption';

/**
 * Financial data provider types
 */
export type FinancialProvider = 'plaid' | 'yodlee';

/**
 * Account linking status
 */
export type LinkingStatus = 'pending' | 'connected' | 'error' | 'requires_update' | 'disconnected';

/**
 * Financial institution information
 */
export interface FinancialInstitution {
  id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  url?: string;
  products: string[];
  countryCode: string;
}

/**
 * Account linking request
 */
export interface AccountLinkRequest {
  institutionId: string;
  provider: FinancialProvider;
  publicToken?: string;
  metadata?: any;
}

/**
 * Account linking response
 */
export interface AccountLinkResponse {
  linkToken: string;
  accessToken?: string;
  itemId?: string;
  accounts: LinkedAccount[];
  status: LinkingStatus;
  error?: string;
}

/**
 * Linked account information
 */
export interface LinkedAccount {
  id: string;
  institutionId: string;
  provider: FinancialProvider;
  accountId: string;
  name: string;
  type: string;
  subtype: string;
  balance: {
    available: number | null;
    current: number;
    limit: number | null;
    isoCurrencyCode: string;
  };
  mask: string;
  lastUpdated: Date;
  status: LinkingStatus;
}

/**
 * Transaction data from providers
 */
export interface ProviderTransaction {
  id: string;
  accountId: string;
  amount: number;
  isoCurrencyCode: string;
  date: string;
  name: string;
  merchantName?: string;
  category: string[];
  subcategory?: string;
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    lat?: number;
    lon?: number;
  };
  pending: boolean;
  accountOwner?: string;
}

/**
 * Data synchronization options
 */
export interface SyncOptions {
  accounts?: boolean;
  transactions?: boolean;
  balances?: boolean;
  startDate?: Date;
  endDate?: Date;
  count?: number;
}

/**
 * Provider-specific error types
 */
export interface ProviderError {
  code: string;
  message: string;
  type: 'ITEM_ERROR' | 'INVALID_CREDENTIALS' | 'INVALID_MFA' | 'ITEM_LOCKED' | 'USER_SETUP_REQUIRED' | 'INSUFFICIENT_CREDENTIALS' | 'UNKNOWN';
  provider: FinancialProvider;
  suggestion?: string;
}

/**
 * Abstract base class for financial data providers
 */
export abstract class FinancialDataProvider {
  protected httpClient: AxiosInstance;
  protected provider: FinancialProvider;

  constructor(provider: FinancialProvider, baseURL: string) {
    this.provider = provider;
    this.httpClient = axios.create({
      baseURL,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MoneyMood/1.0',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        const sanitizedConfig = DataSanitizer.sanitizeForLogging(config);
        console.log(`[${this.provider}] API Request:`, sanitizedConfig);
        return config;
      },
      (error) => {
        console.error(`[${this.provider}] Request Error:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response: AxiosResponse) => {
        const sanitizedResponse = DataSanitizer.sanitizeForLogging(response.data);
        console.log(`[${this.provider}] API Response:`, sanitizedResponse);
        return response;
      },
      (error) => {
        console.error(`[${this.provider}] Response Error:`, error);
        return Promise.reject(this.handleProviderError(error));
      }
    );
  }

  /**
   * Handle provider-specific errors
   */
  protected abstract handleProviderError(error: any): ProviderError;

  /**
   * Get list of supported financial institutions
   */
  public abstract getInstitutions(countryCode?: string): Promise<FinancialInstitution[]>;

  /**
   * Create link token for account linking
   */
  public abstract createLinkToken(userId: string): Promise<string>;

  /**
   * Exchange public token for access token
   */
  public abstract exchangePublicToken(publicToken: string): Promise<AccountLinkResponse>;

  /**
   * Get linked accounts
   */
  public abstract getAccounts(accessToken: string): Promise<LinkedAccount[]>;

  /**
   * Get transactions for accounts
   */
  public abstract getTransactions(
    accessToken: string,
    options?: SyncOptions
  ): Promise<ProviderTransaction[]>;

  /**
   * Get account balances
   */
  public abstract getBalances(accessToken: string): Promise<LinkedAccount[]>;

  /**
   * Remove linked item
   */
  public abstract removeItem(accessToken: string): Promise<boolean>;

  /**
   * Update item credentials
   */
  public abstract updateCredentials(accessToken: string): Promise<string>;
}

/**
 * Plaid provider implementation
 */
export class PlaidProvider extends FinancialDataProvider {
  constructor() {
    const plaidConfig = config.financialProviders.plaid;
    super('plaid', plaidConfig.baseUrl);
    
    // Add Plaid-specific headers
    this.httpClient.defaults.headers.common['PLAID-CLIENT-ID'] = plaidConfig.clientId;
    this.httpClient.defaults.headers.common['PLAID-SECRET'] = process.env.EXPO_PUBLIC_PLAID_SECRET || '';
  }

  protected handleProviderError(error: any): ProviderError {
    const plaidError = error.response?.data?.error_code || 'UNKNOWN_ERROR';
    const message = error.response?.data?.error_message || error.message;

    let errorType: ProviderError['type'] = 'UNKNOWN';
    let suggestion = '';

    switch (plaidError) {
      case 'INVALID_CREDENTIALS':
        errorType = 'INVALID_CREDENTIALS';
        suggestion = 'Please check your username and password and try again.';
        break;
      case 'INVALID_MFA':
        errorType = 'INVALID_MFA';
        suggestion = 'Please verify your multi-factor authentication code.';
        break;
      case 'ITEM_LOCKED':
        errorType = 'ITEM_LOCKED';
        suggestion = 'Your account is temporarily locked. Please try again later.';
        break;
      case 'USER_SETUP_REQUIRED':
        errorType = 'USER_SETUP_REQUIRED';
        suggestion = 'Please complete the setup process with your financial institution.';
        break;
      default:
        errorType = 'UNKNOWN';
        suggestion = 'An unexpected error occurred. Please try again.';
    }

    return {
      code: plaidError,
      message,
      type: errorType,
      provider: 'plaid',
      suggestion,
    };
  }

  public async getInstitutions(countryCode: string = 'US'): Promise<FinancialInstitution[]> {
    try {
      const response = await this.httpClient.post('/institutions/get', {
        count: 500,
        offset: 0,
        country_codes: [countryCode],
        products: ['transactions'],
      });

      return response.data.institutions.map((inst: any) => ({
        id: inst.institution_id,
        name: inst.name,
        logo: inst.logo,
        primaryColor: inst.primary_color,
        url: inst.url,
        products: inst.products,
        countryCode: countryCode,
      }));
    } catch (error) {
      console.error('Failed to get institutions:', error);
      throw error;
    }
  }

  public async createLinkToken(userId: string): Promise<string> {
    try {
      const response = await this.httpClient.post('/link/token/create', {
        client_name: 'Money Mood',
        country_codes: ['US'],
        language: 'en',
        user: {
          client_user_id: userId,
        },
        products: ['transactions'],
        required_if_supported_products: ['identity'],
      });

      return response.data.link_token;
    } catch (error) {
      console.error('Failed to create link token:', error);
      throw error;
    }
  }

  public async exchangePublicToken(publicToken: string): Promise<AccountLinkResponse> {
    try {
      const response = await this.httpClient.post('/link/token/exchange', {
        public_token: publicToken,
      });

      const { access_token, item_id } = response.data;

      // Get accounts after successful token exchange
      const accounts = await this.getAccounts(access_token);

      return {
        linkToken: '',
        accessToken: access_token,
        itemId: item_id,
        accounts,
        status: 'connected',
      };
    } catch (error) {
      console.error('Failed to exchange public token:', error);
      throw error;
    }
  }

  public async getAccounts(accessToken: string): Promise<LinkedAccount[]> {
    try {
      const response = await this.httpClient.post('/accounts/get', {
        access_token: accessToken,
      });

      return response.data.accounts.map((account: any) => ({
        id: account.account_id,
        institutionId: '', // Will be populated from item info
        provider: 'plaid' as FinancialProvider,
        accountId: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        balance: {
          available: account.balances.available,
          current: account.balances.current,
          limit: account.balances.limit,
          isoCurrencyCode: account.balances.iso_currency_code || 'USD',
        },
        mask: account.mask || '',
        lastUpdated: new Date(),
        status: 'connected' as LinkingStatus,
      }));
    } catch (error) {
      console.error('Failed to get accounts:', error);
      throw error;
    }
  }

  public async getTransactions(
    accessToken: string,
    options: SyncOptions = {}
  ): Promise<ProviderTransaction[]> {
    try {
      const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = options.endDate || new Date();

      const response = await this.httpClient.post('/transactions/get', {
        access_token: accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        count: options.count || 500,
      });

      return response.data.transactions.map((transaction: any) => ({
        id: transaction.transaction_id,
        accountId: transaction.account_id,
        amount: transaction.amount,
        isoCurrencyCode: transaction.iso_currency_code || 'USD',
        date: transaction.date,
        name: transaction.name,
        merchantName: transaction.merchant_name,
        category: transaction.category || [],
        subcategory: transaction.category?.[1],
        location: transaction.location ? {
          address: transaction.location.address,
          city: transaction.location.city,
          region: transaction.location.region,
          postalCode: transaction.location.postal_code,
          country: transaction.location.country,
          lat: transaction.location.lat,
          lon: transaction.location.lon,
        } : undefined,
        pending: transaction.pending,
        accountOwner: transaction.account_owner,
      }));
    } catch (error) {
      console.error('Failed to get transactions:', error);
      throw error;
    }
  }

  public async getBalances(accessToken: string): Promise<LinkedAccount[]> {
    // For Plaid, balances are included in accounts/get
    return this.getAccounts(accessToken);
  }

  public async removeItem(accessToken: string): Promise<boolean> {
    try {
      await this.httpClient.post('/item/remove', {
        access_token: accessToken,
      });
      return true;
    } catch (error) {
      console.error('Failed to remove item:', error);
      return false;
    }
  }

  public async updateCredentials(accessToken: string): Promise<string> {
    try {
      const response = await this.httpClient.post('/link/token/create', {
        client_name: 'Money Mood',
        country_codes: ['US'],
        language: 'en',
        access_token: accessToken,
        user: {
          client_user_id: 'update_mode',
        },
      });

      return response.data.link_token;
    } catch (error) {
      console.error('Failed to create update link token:', error);
      throw error;
    }
  }
}

/**
 * Yodlee provider implementation (placeholder)
 */
export class YodleeProvider extends FinancialDataProvider {
  constructor() {
    const yodleeConfig = config.financialProviders.yodlee;
    super('yodlee', yodleeConfig.baseUrl);
  }

  protected handleProviderError(error: any): ProviderError {
    // Implement Yodlee-specific error handling
    return {
      code: 'YODLEE_ERROR',
      message: error.message,
      type: 'UNKNOWN',
      provider: 'yodlee',
      suggestion: 'Please try again later.',
    };
  }

  // Placeholder implementations - would be implemented based on Yodlee API
  public async getInstitutions(): Promise<FinancialInstitution[]> {
    throw new Error('Yodlee integration not yet implemented');
  }

  public async createLinkToken(): Promise<string> {
    throw new Error('Yodlee integration not yet implemented');
  }

  public async exchangePublicToken(): Promise<AccountLinkResponse> {
    throw new Error('Yodlee integration not yet implemented');
  }

  public async getAccounts(): Promise<LinkedAccount[]> {
    throw new Error('Yodlee integration not yet implemented');
  }

  public async getTransactions(): Promise<ProviderTransaction[]> {
    throw new Error('Yodlee integration not yet implemented');
  }

  public async getBalances(): Promise<LinkedAccount[]> {
    throw new Error('Yodlee integration not yet implemented');
  }

  public async removeItem(): Promise<boolean> {
    throw new Error('Yodlee integration not yet implemented');
  }

  public async updateCredentials(): Promise<string> {
    throw new Error('Yodlee integration not yet implemented');
  }
}

/**
 * Financial Data Aggregation Service
 * Unified interface for multiple financial data providers
 */
export class FinancialDataAggregationService {
  private providers: Map<FinancialProvider, FinancialDataProvider>;
  private static instance: FinancialDataAggregationService;

  private constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  public static getInstance(): FinancialDataAggregationService {
    if (!FinancialDataAggregationService.instance) {
      FinancialDataAggregationService.instance = new FinancialDataAggregationService();
    }
    return FinancialDataAggregationService.instance;
  }

  private initializeProviders(): void {
    this.providers.set('plaid', new PlaidProvider());
    // this.providers.set('yodlee', new YodleeProvider()); // Uncomment when implemented
  }

  /**
   * Get provider instance
   */
  public getProvider(provider: FinancialProvider): FinancialDataProvider {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not available`);
    }
    return providerInstance;
  }

  /**
   * Get all available providers
   */
  public getAvailableProviders(): FinancialProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Store access token securely
   */
  public async storeAccessToken(
    provider: FinancialProvider,
    itemId: string,
    accessToken: string
  ): Promise<void> {
    const key = `access_token_${provider}_${itemId}`;
    await SecureStorage.storeSecureData(key, { accessToken, provider, itemId });
  }

  /**
   * Retrieve access token securely
   */
  public async getAccessToken(
    provider: FinancialProvider,
    itemId: string
  ): Promise<string | null> {
    const key = `access_token_${provider}_${itemId}`;
    const data = await SecureStorage.retrieveSecureData<{
      accessToken: string;
      provider: FinancialProvider;
      itemId: string;
    }>(key);
    
    return data?.accessToken || null;
  }

  /**
   * Remove access token
   */
  public async removeAccessToken(provider: FinancialProvider, itemId: string): Promise<void> {
    const key = `access_token_${provider}_${itemId}`;
    await SecureStorage.removeSecureData(key);
  }
}

// Export singleton instance
export const financialDataService = FinancialDataAggregationService.getInstance();

