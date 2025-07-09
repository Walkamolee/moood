# Money Mood - Credit Card Integration Analysis

## Current Codebase Review

### Architecture Overview
Money Mood is built with a solid foundation using:
- **React Native + Expo** for cross-platform mobile development
- **TypeScript** for type safety and better development experience
- **Redux Toolkit** for state management
- **React Navigation** for navigation
- **Modular architecture** with clear separation of concerns

### Current Data Models

#### Account Structure
```typescript
interface Account {
  id: string;
  userId: string;
  accountType: AccountType; // checking, savings, credit_card, investment, loan, mortgage
  institutionName: string;
  accountName: string;
  balance: number;
  currency: string;
  isActive: boolean;
  lastSynced: string;
  accountNumber?: string; // Currently masked (****1234)
  routingNumber?: string;
}
```

#### Transaction Structure
```typescript
interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  isPending: boolean;
  merchantName?: string;
  location?: string;
  notes?: string;
  tags?: string[];
}
```

### Current Mock Data Implementation
The app currently uses mock data for:
- **3 Mock Accounts**: Chase Checking ($2,450.75), Chase Savings ($8,750.00), AmEx Credit Card (-$1,250.30)
- **Rich Transaction History**: 20+ mock transactions with realistic merchant names, amounts, and categories
- **Budget Tracking**: Mock budgets with spending calculations
- **Category System**: 25+ predefined categories for transaction classification

### State Management Architecture
- **Redux Store** with separate slices for accounts, transactions, budgets, categories, and auth
- **Async Thunks** for API calls (currently mocked)
- **Error Handling** and loading states built-in
- **Type Safety** throughout the application

### Current Limitations for Real Credit Card Integration
1. **No Real Financial Institution Connectivity**
2. **Mock Data Only** - no actual bank/credit card APIs
3. **No Authentication** with financial institutions
4. **No Real-Time Sync** capabilities
5. **No Security Infrastructure** for handling sensitive financial data
6. **No Compliance Framework** for financial regulations

### Strengths for Integration
1. **Solid Data Models** - Account and Transaction interfaces are well-designed
2. **Modular Architecture** - Easy to add new services and components
3. **State Management** - Redux structure supports real API integration
4. **Error Handling** - Built-in patterns for handling API failures
5. **TypeScript** - Type safety will help with complex financial data
6. **Cross-Platform** - Single codebase for iOS and Android

## Integration Requirements Analysis

### Technical Requirements
1. **Financial Data Aggregation Service** (Plaid, Yodlee, MX, etc.)
2. **Secure API Integration** with proper authentication
3. **Real-Time Data Synchronization** 
4. **Error Handling** for bank connectivity issues
5. **Data Encryption** for sensitive financial information
6. **Offline Support** for when connectivity is poor

### Security Requirements
1. **PCI DSS Compliance** for credit card data handling
2. **Bank-Level Encryption** (AES-256, TLS 1.3)
3. **Secure Token Storage** (no raw credentials stored)
4. **Biometric Authentication** for app access
5. **Session Management** with automatic timeouts
6. **Audit Logging** for all financial data access

### Regulatory Requirements
1. **Open Banking Compliance** (PSD2 in EU, similar in other regions)
2. **Consumer Financial Protection** regulations
3. **Data Privacy Laws** (GDPR, CCPA, etc.)
4. **Financial Institution Agreements** and terms of service
5. **User Consent Management** for data access

### User Experience Requirements
1. **Simple Onboarding** - easy bank account connection
2. **Institution Search** - find and connect to any bank/credit card
3. **Multi-Factor Authentication** support
4. **Connection Status** - clear indication of sync status
5. **Manual Refresh** capability
6. **Account Management** - add/remove accounts easily




## Financial Data Aggregation Services Research

### Major Players in the Market

#### 1. **Plaid** - Market Leader
- **Overview**: Leading financial data aggregation platform with the largest market share
- **Coverage**: 12,000+ financial institutions in North America and Europe
- **Strengths**: 
  - Excellent developer experience and documentation
  - Strong security and compliance (SOC 2 Type II, ISO 27001)
  - Comprehensive API coverage (accounts, transactions, identity, assets)
  - Real-time and historical data access
- **Use Cases**: Personal finance apps, lending, payments, wealth management
- **Pricing**: Tiered pricing based on API calls and features (typically $0.60-$3.00 per successful connection)
- **Integration**: RESTful APIs with SDKs for major platforms

#### 2. **Yodlee (Envestnet)** - Enterprise Focus
- **Overview**: One of the oldest and most established data aggregators
- **Coverage**: 17,000+ financial institutions globally
- **Strengths**:
  - Extensive global coverage including international banks
  - Strong enterprise features and customization
  - Robust data cleansing and categorization
  - FastLink widget for easy account connection
- **Use Cases**: Enterprise financial software, wealth management, banking platforms
- **Pricing**: Enterprise pricing model (typically higher cost than Plaid)
- **Integration**: REST APIs with comprehensive documentation

#### 3. **MX Technologies** - Data Intelligence Focus
- **Overview**: Focuses on financial data intelligence and insights
- **Coverage**: 13,000+ financial institutions
- **Strengths**:
  - Advanced data cleansing and categorization
  - Strong analytics and insights capabilities
  - White-label solutions available
  - Focus on data accuracy and reliability
- **Use Cases**: Digital banking, personal finance management, financial wellness
- **Pricing**: Custom enterprise pricing
- **Integration**: Platform API with extensive customization options

#### 4. **Finicity (Mastercard)** - Open Banking Leader
- **Overview**: Acquired by Mastercard in 2020, focuses on open banking
- **Coverage**: 4,000+ financial institutions in North America
- **Strengths**:
  - Strong open banking compliance and standards
  - Mastercard backing and resources
  - Focus on consumer-permissioned data access
  - Good developer tools and documentation
- **Use Cases**: Open banking applications, lending, account verification
- **Pricing**: Pay-per-use model with volume discounts
- **Integration**: RESTful APIs with React Native SDK available

#### 5. **Akoya** - Bank-Owned Network
- **Overview**: Industry-owned data access network backed by major banks
- **Coverage**: 12+ major North American financial institutions (growing)
- **Strengths**:
  - 100% API-driven (no screen scraping)
  - Bank-owned ensures institutional support
  - Strong security and compliance focus
  - Transparent data sharing model
- **Use Cases**: Applications requiring bank-grade security and compliance
- **Pricing**: Competitive pricing with bank backing
- **Integration**: RESTful APIs with focus on standardization

### Comparison Matrix

| Provider | Coverage | Pricing | Security | Developer Experience | Best For |
|----------|----------|---------|----------|---------------------|----------|
| **Plaid** | 12,000+ FIs | $0.60-$3.00/connection | Excellent | Outstanding | Startups, Consumer Apps |
| **Yodlee** | 17,000+ FIs | Enterprise (Higher) | Excellent | Good | Enterprise, Global |
| **MX** | 13,000+ FIs | Custom Enterprise | Excellent | Good | Data Intelligence |
| **Finicity** | 4,000+ FIs | Pay-per-use | Excellent | Good | Open Banking |
| **Akoya** | 12+ Major Banks | Competitive | Bank-grade | Good | High Security Needs |

### Technical Integration Considerations

#### API Capabilities Needed for Money Mood
1. **Account Information**
   - Account details (name, type, balance, institution)
   - Account numbers (masked for security)
   - Account status and metadata

2. **Transaction Data**
   - Historical transactions (typically 24 months)
   - Real-time transaction updates
   - Transaction categorization
   - Merchant information and location data

3. **Authentication & Security**
   - OAuth 2.0 or similar secure authentication
   - Token-based access with refresh capabilities
   - Webhook support for real-time updates
   - Secure credential handling (no storage of bank credentials)

4. **Account Management**
   - Add/remove account connections
   - Re-authentication when needed
   - Connection status monitoring
   - Error handling and recovery

#### Integration Architecture Requirements
1. **Backend Service Layer**
   - Secure API proxy to handle aggregator communications
   - Token management and refresh logic
   - Webhook handling for real-time updates
   - Data transformation and normalization

2. **Data Storage**
   - Encrypted storage for sensitive financial data
   - Audit logging for all data access
   - Data retention policies compliance
   - Backup and disaster recovery

3. **Mobile App Integration**
   - Secure communication with backend services
   - Account linking UI/UX flows
   - Real-time sync status indicators
   - Offline data access capabilities

### Recommended Approach for Money Mood

#### Primary Choice: **Plaid**
**Rationale:**
- **Best Developer Experience**: Excellent documentation and SDKs
- **Startup-Friendly Pricing**: Reasonable costs for early-stage app
- **Market Leadership**: Proven track record with thousands of apps
- **Comprehensive Coverage**: 12,000+ institutions covers most users
- **Strong Security**: Bank-level security with regulatory compliance

#### Backup/Secondary: **Finicity (Mastercard)**
**Rationale:**
- **React Native SDK**: Direct mobile integration support
- **Open Banking Focus**: Future-proof approach
- **Mastercard Backing**: Strong institutional support
- **Competitive Pricing**: Pay-per-use model good for scaling

#### Implementation Strategy
1. **Phase 1**: Integrate with Plaid for core functionality
2. **Phase 2**: Add Finicity as secondary provider for broader coverage
3. **Phase 3**: Consider MX or Akoya for enterprise features if needed

### Cost Analysis for Money Mood

#### Plaid Pricing Estimate
- **Development**: Free sandbox environment
- **Production**: 
  - Account connections: $0.60-$1.20 per successful connection
  - Transaction updates: $0.01-$0.05 per update
  - Identity verification: $0.30-$0.60 per check

#### Monthly Cost Projections
- **1,000 users**: ~$600-$1,200/month
- **10,000 users**: ~$6,000-$12,000/month  
- **100,000 users**: ~$60,000-$120,000/month (volume discounts apply)

#### Cost Optimization Strategies
1. **Efficient Polling**: Minimize unnecessary API calls
2. **Webhook Usage**: Use real-time updates instead of frequent polling
3. **Data Caching**: Cache transaction data to reduce API calls
4. **User Segmentation**: Different update frequencies for different user types


## Technical Implementation Plan

### Phase 1: Backend Infrastructure Setup

#### 1.1 Backend Service Architecture
```
Money Mood App (React Native)
    ↓ HTTPS/TLS 1.3
Backend API Server (Node.js/Express or Python/FastAPI)
    ↓ Secure API Calls
Financial Data Aggregator (Plaid/Finicity)
    ↓ Bank APIs/Screen Scraping
Financial Institutions (Banks/Credit Cards)
```

#### 1.2 Required Backend Components

**A. Authentication Service**
```typescript
// JWT-based authentication with refresh tokens
interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  refreshToken(refreshToken: string): Promise<AuthResponse>;
  logout(userId: string): Promise<void>;
  validateToken(token: string): Promise<User>;
}
```

**B. Financial Data Service**
```typescript
// Plaid integration service
interface FinancialDataService {
  // Account Management
  createLinkToken(userId: string): Promise<LinkToken>;
  exchangePublicToken(publicToken: string): Promise<AccessToken>;
  getAccounts(accessToken: string): Promise<Account[]>;
  removeAccount(accessToken: string): Promise<void>;
  
  // Transaction Management
  getTransactions(accessToken: string, options: TransactionOptions): Promise<Transaction[]>;
  syncTransactions(accessToken: string): Promise<SyncResult>;
  
  // Webhooks
  handleWebhook(webhookData: WebhookPayload): Promise<void>;
}
```

**C. Data Processing Service**
```typescript
// Transaction categorization and processing
interface DataProcessingService {
  categorizeTransaction(transaction: RawTransaction): Promise<CategorizedTransaction>;
  detectDuplicates(transactions: Transaction[]): Promise<DuplicateReport>;
  calculateBudgetStatus(userId: string): Promise<BudgetStatus>;
  generateInsights(userId: string): Promise<SpendingInsights>;
}
```

#### 1.3 Database Schema Updates

**Extended Account Model**
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plaid_account_id VARCHAR(255) UNIQUE,
  plaid_access_token_id UUID REFERENCES plaid_tokens(id),
  account_type VARCHAR(50),
  institution_name VARCHAR(255),
  institution_id VARCHAR(255),
  account_name VARCHAR(255),
  account_subtype VARCHAR(100),
  balance_current DECIMAL(12,2),
  balance_available DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  mask VARCHAR(10), -- Last 4 digits
  is_active BOOLEAN DEFAULT true,
  last_synced TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Plaid Token Management**
```sql
CREATE TABLE plaid_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  access_token VARCHAR(255) ENCRYPTED, -- Encrypted storage
  item_id VARCHAR(255),
  institution_id VARCHAR(255),
  institution_name VARCHAR(255),
  webhook_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_webhook TIMESTAMP,
  error_code VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Enhanced Transaction Model**
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  plaid_transaction_id VARCHAR(255) UNIQUE,
  amount DECIMAL(12,2),
  iso_currency_code VARCHAR(3),
  description TEXT,
  merchant_name VARCHAR(255),
  merchant_entity_id VARCHAR(255),
  logo_url VARCHAR(500),
  website VARCHAR(255),
  location_address VARCHAR(255),
  location_city VARCHAR(100),
  location_region VARCHAR(100),
  location_postal_code VARCHAR(20),
  location_country VARCHAR(3),
  location_lat DECIMAL(10,8),
  location_lon DECIMAL(11,8),
  category_id UUID REFERENCES categories(id),
  subcategory VARCHAR(100),
  date DATE,
  authorized_date DATE,
  is_pending BOOLEAN DEFAULT false,
  account_owner VARCHAR(255),
  personal_finance_category VARCHAR(100),
  confidence_level VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 2: Mobile App Integration

#### 2.1 Plaid Link Integration

**Install Required Dependencies**
```bash
npm install react-native-plaid-link-sdk
# iOS additional setup required in Xcode
# Android additional setup required in build.gradle
```

**Plaid Link Component**
```typescript
import { PlaidLink, LinkSuccess, LinkExit } from 'react-native-plaid-link-sdk';

interface PlaidLinkProps {
  linkToken: string;
  onSuccess: (success: LinkSuccess) => void;
  onExit: (exit: LinkExit) => void;
}

const PlaidLinkComponent: React.FC<PlaidLinkProps> = ({ linkToken, onSuccess, onExit }) => {
  return (
    <PlaidLink
      tokenConfig={{
        token: linkToken,
      }}
      onSuccess={onSuccess}
      onExit={onExit}
    >
      <TouchableOpacity style={styles.linkButton}>
        <Text style={styles.linkButtonText}>Connect Bank Account</Text>
      </TouchableOpacity>
    </PlaidLink>
  );
};
```

#### 2.2 Account Connection Flow

**Account Connection Service**
```typescript
// src/services/accountConnectionService.ts
import { PlaidLinkSuccess } from 'react-native-plaid-link-sdk';
import { apiClient } from './apiClient';

class AccountConnectionService {
  async createLinkToken(): Promise<string> {
    const response = await apiClient.post('/api/plaid/create-link-token');
    return response.data.link_token;
  }

  async exchangePublicToken(publicToken: string): Promise<void> {
    await apiClient.post('/api/plaid/exchange-public-token', {
      public_token: publicToken,
    });
  }

  async getConnectedAccounts(): Promise<Account[]> {
    const response = await apiClient.get('/api/accounts');
    return response.data;
  }

  async removeAccount(accountId: string): Promise<void> {
    await apiClient.delete(`/api/accounts/${accountId}`);
  }

  async syncAccount(accountId: string): Promise<void> {
    await apiClient.post(`/api/accounts/${accountId}/sync`);
  }
}

export const accountConnectionService = new AccountConnectionService();
```

#### 2.3 Updated Redux Store Integration

**Enhanced Accounts Slice**
```typescript
// src/store/slices/accountsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { accountConnectionService } from '../../services/accountConnectionService';

// Async thunks for real API integration
export const connectAccount = createAsyncThunk(
  'accounts/connect',
  async (publicToken: string) => {
    await accountConnectionService.exchangePublicToken(publicToken);
    return await accountConnectionService.getConnectedAccounts();
  }
);

export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAccounts',
  async () => {
    return await accountConnectionService.getConnectedAccounts();
  }
);

export const syncAccount = createAsyncThunk(
  'accounts/sync',
  async (accountId: string) => {
    await accountConnectionService.syncAccount(accountId);
    return await accountConnectionService.getConnectedAccounts();
  }
);

export const removeAccount = createAsyncThunk(
  'accounts/remove',
  async (accountId: string) => {
    await accountConnectionService.removeAccount(accountId);
    return accountId;
  }
);

// Enhanced slice with real integration
const accountsSlice = createSlice({
  name: 'accounts',
  initialState: {
    accounts: [] as Account[],
    isLoading: false,
    isConnecting: false,
    error: null as string | null,
    lastSynced: null as string | null,
    connectionStatus: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'error',
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Connect account
      .addCase(connectAccount.pending, (state) => {
        state.isConnecting = true;
        state.connectionStatus = 'connecting';
        state.error = null;
      })
      .addCase(connectAccount.fulfilled, (state, action) => {
        state.isConnecting = false;
        state.connectionStatus = 'connected';
        state.accounts = action.payload;
        state.lastSynced = new Date().toISOString();
      })
      .addCase(connectAccount.rejected, (state, action) => {
        state.isConnecting = false;
        state.connectionStatus = 'error';
        state.error = action.error.message || 'Failed to connect account';
      })
      // Fetch accounts
      .addCase(fetchAccounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts = action.payload;
        state.lastSynced = new Date().toISOString();
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch accounts';
      })
      // Sync account
      .addCase(syncAccount.fulfilled, (state, action) => {
        state.accounts = action.payload;
        state.lastSynced = new Date().toISOString();
      })
      // Remove account
      .addCase(removeAccount.fulfilled, (state, action) => {
        state.accounts = state.accounts.filter(account => account.id !== action.payload);
      });
  },
});

export const { clearError, setConnectionStatus } = accountsSlice.actions;
export default accountsSlice.reducer;
```

### Phase 3: Real-Time Data Synchronization

#### 3.1 Webhook Implementation

**Backend Webhook Handler**
```typescript
// Backend webhook endpoint
app.post('/api/webhooks/plaid', async (req, res) => {
  const { webhook_type, webhook_code, item_id, error } = req.body;

  try {
    switch (webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionWebhook(webhook_code, item_id);
        break;
      case 'ITEM':
        await handleItemWebhook(webhook_code, item_id, error);
        break;
      case 'ASSETS':
        await handleAssetsWebhook(webhook_code, item_id);
        break;
      default:
        console.log(`Unhandled webhook type: ${webhook_type}`);
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleTransactionWebhook(code: string, itemId: string) {
  switch (code) {
    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE':
    case 'DEFAULT_UPDATE':
      await syncTransactionsForItem(itemId);
      break;
    case 'TRANSACTIONS_REMOVED':
      await handleRemovedTransactions(itemId);
      break;
  }
}
```

#### 3.2 Background Sync Service

**Enhanced Background Task Manager**
```typescript
// src/services/backgroundSyncService.ts
import { backgroundTaskManager } from './backgroundTaskManager';
import { accountConnectionService } from './accountConnectionService';
import { store } from '../store';
import { fetchAccounts } from '../store/slices/accountsSlice';
import { fetchTransactions } from '../store/slices/transactionsSlice';

class BackgroundSyncService {
  private syncInterval: NodeJS.Timeout | null = null;

  async startPeriodicSync() {
    // Sync every 4 hours during active hours
    this.syncInterval = setInterval(async () => {
      await this.performSync();
    }, 4 * 60 * 60 * 1000);

    // Register background task for when app is backgrounded
    await backgroundTaskManager.registerBackgroundFetch(async () => {
      await this.performSync();
    });
  }

  async performSync() {
    try {
      console.log('Starting background sync...');
      
      // Sync accounts first
      await store.dispatch(fetchAccounts());
      
      // Sync transactions for all accounts
      await store.dispatch(fetchTransactions());
      
      // Update budget status and app icon
      await backgroundTaskManager.performNightlyUpdate();
      
      console.log('Background sync completed successfully');
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const backgroundSyncService = new BackgroundSyncService();
```

### Phase 4: Error Handling and Recovery

#### 4.1 Connection Error Handling

**Error Types and Recovery Strategies**
```typescript
enum PlaidErrorType {
  ITEM_LOGIN_REQUIRED = 'ITEM_LOGIN_REQUIRED',
  INSUFFICIENT_CREDENTIALS = 'INSUFFICIENT_CREDENTIALS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_MFA = 'INVALID_MFA',
  ITEM_LOCKED = 'ITEM_LOCKED',
  USER_SETUP_REQUIRED = 'USER_SETUP_REQUIRED',
  MFA_NOT_SUPPORTED = 'MFA_NOT_SUPPORTED',
  INVALID_SEND_METHOD = 'INVALID_SEND_METHOD',
  NO_ACCOUNTS = 'NO_ACCOUNTS',
  ITEM_NOT_SUPPORTED = 'ITEM_NOT_SUPPORTED',
  TOO_MANY_VERIFICATION_ATTEMPTS = 'TOO_MANY_VERIFICATION_ATTEMPTS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PLANNED_MAINTENANCE = 'PLANNED_MAINTENANCE',
  PRODUCTS_NOT_SUPPORTED = 'PRODUCTS_NOT_SUPPORTED',
  INSTITUTION_DOWN = 'INSTITUTION_DOWN',
  INSTITUTION_NOT_RESPONDING = 'INSTITUTION_NOT_RESPONDING',
}

class ErrorRecoveryService {
  async handlePlaidError(error: PlaidError, accountId: string): Promise<RecoveryAction> {
    switch (error.error_code) {
      case PlaidErrorType.ITEM_LOGIN_REQUIRED:
        return {
          type: 'REAUTH_REQUIRED',
          message: 'Please reconnect your account - your bank requires re-authentication',
          action: () => this.initiateReauth(accountId),
        };

      case PlaidErrorType.INSUFFICIENT_CREDENTIALS:
      case PlaidErrorType.INVALID_CREDENTIALS:
        return {
          type: 'CREDENTIALS_INVALID',
          message: 'Your bank credentials are invalid. Please update them.',
          action: () => this.initiateReauth(accountId),
        };

      case PlaidErrorType.INSTITUTION_DOWN:
        return {
          type: 'TEMPORARY_UNAVAILABLE',
          message: 'Your bank is temporarily unavailable. We\'ll try again later.',
          action: () => this.scheduleRetry(accountId, 30 * 60 * 1000), // 30 minutes
        };

      case PlaidErrorType.RATE_LIMIT_EXCEEDED:
        return {
          type: 'RATE_LIMITED',
          message: 'Too many requests. Please wait before trying again.',
          action: () => this.scheduleRetry(accountId, 60 * 60 * 1000), // 1 hour
        };

      default:
        return {
          type: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
          action: () => this.scheduleRetry(accountId, 15 * 60 * 1000), // 15 minutes
        };
    }
  }

  private async initiateReauth(accountId: string) {
    // Create new link token for re-authentication
    // Navigate user to Plaid Link flow
    // Update account status to require reauth
  }

  private async scheduleRetry(accountId: string, delayMs: number) {
    // Schedule automatic retry after delay
    // Update account status to show temporary error
    // Notify user of the issue and expected resolution time
  }
}
```

#### 4.2 Offline Support

**Offline Data Management**
```typescript
// src/services/offlineDataService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

class OfflineDataService {
  private readonly CACHE_KEYS = {
    ACCOUNTS: 'cached_accounts',
    TRANSACTIONS: 'cached_transactions',
    BUDGETS: 'cached_budgets',
    LAST_SYNC: 'last_sync_timestamp',
  };

  async cacheData(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  async getCachedData(key: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<any> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      // Check if data is still fresh
      if (Date.now() - timestamp > maxAge) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await Promise.all(
        Object.values(this.CACHE_KEYS).map(key => 
          AsyncStorage.removeItem(key)
        )
      );
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

export const offlineDataService = new OfflineDataService();
```

### Phase 5: Performance Optimization

#### 5.1 Data Pagination and Lazy Loading

**Transaction Pagination**
```typescript
interface TransactionPaginationOptions {
  page: number;
  limit: number;
  accountId?: string;
  categoryId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

class TransactionService {
  async getTransactions(options: TransactionPaginationOptions): Promise<PaginatedTransactions> {
    const response = await apiClient.get('/api/transactions', {
      params: options,
    });

    return {
      transactions: response.data.transactions,
      pagination: {
        page: response.data.page,
        limit: response.data.limit,
        total: response.data.total,
        hasMore: response.data.hasMore,
      },
    };
  }

  async getTransactionsByDateRange(
    startDate: string,
    endDate: string,
    page: number = 1
  ): Promise<PaginatedTransactions> {
    return this.getTransactions({
      page,
      limit: 50,
      dateRange: { start: startDate, end: endDate },
    });
  }
}
```

#### 5.2 Intelligent Sync Strategies

**Smart Sync Algorithm**
```typescript
class SmartSyncService {
  async determineSyncStrategy(account: Account): Promise<SyncStrategy> {
    const lastSync = new Date(account.lastSynced);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    // High-frequency accounts (checking, credit cards)
    if (account.accountType === 'checking' || account.accountType === 'credit_card') {
      if (hoursSinceSync < 2) return 'skip';
      if (hoursSinceSync < 6) return 'incremental';
      return 'full';
    }

    // Low-frequency accounts (savings, investments)
    if (account.accountType === 'savings' || account.accountType === 'investment') {
      if (hoursSinceSync < 12) return 'skip';
      if (hoursSinceSync < 24) return 'incremental';
      return 'full';
    }

    return 'incremental';
  }

  async performIntelligentSync(): Promise<SyncResult> {
    const accounts = await accountConnectionService.getConnectedAccounts();
    const syncResults: SyncResult[] = [];

    for (const account of accounts) {
      const strategy = await this.determineSyncStrategy(account);
      
      switch (strategy) {
        case 'skip':
          console.log(`Skipping sync for account ${account.id} - recently synced`);
          break;
        case 'incremental':
          const result = await this.performIncrementalSync(account);
          syncResults.push(result);
          break;
        case 'full':
          const fullResult = await this.performFullSync(account);
          syncResults.push(fullResult);
          break;
      }
    }

    return this.consolidateSyncResults(syncResults);
  }
}
```

