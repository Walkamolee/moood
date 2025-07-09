/**
 * Enhanced Financial Types for Money Mood
 * Extends existing types for real financial data integration
 */

import { FinancialProvider, LinkingStatus, ProviderError } from '../services/financialDataAggregation';

/**
 * Enhanced Account interface for real financial data
 */
export interface EnhancedAccount {
  id: string;
  userId: string;
  
  // Provider information
  provider: FinancialProvider;
  providerAccountId: string;
  institutionId: string;
  itemId?: string;
  
  // Account details
  accountType: AccountType;
  accountSubtype?: string;
  institutionName: string;
  accountName: string;
  officialName?: string;
  
  // Balance information
  balance: {
    available: number | null;
    current: number;
    limit: number | null;
    isoCurrencyCode: string;
  };
  
  // Account identifiers
  mask: string;
  accountNumber?: string; // Encrypted
  routingNumber?: string; // Encrypted
  
  // Status and sync information
  status: LinkingStatus;
  isActive: boolean;
  lastSynced: string;
  syncFrequency: SyncFrequency;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Error information
  lastError?: ProviderError;
  errorCount: number;
}

/**
 * Enhanced Transaction interface for real financial data
 */
export interface EnhancedTransaction {
  id: string;
  accountId: string;
  
  // Provider information
  provider: FinancialProvider;
  providerTransactionId: string;
  
  // Transaction details
  amount: number;
  isoCurrencyCode: string;
  description: string;
  date: string;
  authorizedDate?: string;
  
  // Merchant information
  merchantName?: string;
  merchantId?: string;
  
  // Location information
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    lat?: number;
    lon?: number;
    storeNumber?: string;
  };
  
  // Categorization
  categoryId: string;
  providerCategory: string[];
  subcategory?: string;
  confidence?: number; // AI categorization confidence
  
  // Status
  isPending: boolean;
  isRecurring?: boolean;
  accountOwner?: string;
  
  // User modifications
  userDescription?: string;
  notes?: string;
  tags?: string[];
  isHidden: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Sync information
  lastSynced: string;
}

/**
 * Financial Institution with enhanced details
 */
export interface EnhancedInstitution {
  id: string;
  name: string;
  
  // Visual branding
  logo?: string;
  primaryColor?: string;
  url?: string;
  
  // Capabilities
  products: string[];
  supportedAccountTypes: AccountType[];
  
  // Geographic information
  countryCode: string;
  regions?: string[];
  
  // Provider information
  providers: FinancialProvider[];
  
  // Status
  isActive: boolean;
  maintenanceSchedule?: MaintenanceWindow[];
  
  // Metadata
  popularity: number;
  reliability: number;
  lastUpdated: string;
}

/**
 * Account linking session
 */
export interface AccountLinkingSession {
  id: string;
  userId: string;
  provider: FinancialProvider;
  institutionId: string;
  
  // Session details
  linkToken: string;
  status: LinkingSessionStatus;
  
  // Progress tracking
  step: LinkingStep;
  completedSteps: LinkingStep[];
  
  // Results
  linkedAccounts: string[];
  accessToken?: string; // Encrypted
  itemId?: string;
  
  // Error handling
  error?: ProviderError;
  retryCount: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/**
 * Data synchronization job
 */
export interface SyncJob {
  id: string;
  userId: string;
  provider: FinancialProvider;
  itemId: string;
  
  // Job configuration
  type: SyncType;
  priority: SyncPriority;
  scheduledAt: string;
  
  // Execution details
  status: SyncJobStatus;
  startedAt?: string;
  completedAt?: string;
  
  // Results
  accountsUpdated: number;
  transactionsAdded: number;
  transactionsUpdated: number;
  
  // Error handling
  error?: ProviderError;
  retryCount: number;
  maxRetries: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * User consent and permissions
 */
export interface UserConsent {
  id: string;
  userId: string;
  provider: FinancialProvider;
  institutionId: string;
  
  // Consent details
  consentType: ConsentType;
  permissions: Permission[];
  
  // Status
  status: ConsentStatus;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  
  // Legal compliance
  consentVersion: string;
  ipAddress: string;
  userAgent: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Financial health metrics
 */
export interface FinancialHealthMetrics {
  userId: string;
  
  // Overall score
  healthScore: number; // 0-100
  previousScore?: number;
  scoreChange: number;
  
  // Component scores
  spendingScore: number;
  savingsScore: number;
  debtScore: number;
  budgetScore: number;
  
  // Key metrics
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  debtToIncomeRatio: number;
  
  // Trends
  spendingTrend: TrendDirection;
  savingsTrend: TrendDirection;
  
  // Insights
  insights: FinancialInsight[];
  recommendations: FinancialRecommendation[];
  
  // Metadata
  calculatedAt: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Financial insight
 */
export interface FinancialInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  impact: InsightImpact;
  confidence: number;
  
  // Data
  amount?: number;
  percentage?: number;
  category?: string;
  
  // Actions
  actionable: boolean;
  suggestedActions?: string[];
  
  // Metadata
  createdAt: string;
  dismissedAt?: string;
}

/**
 * Financial recommendation
 */
export interface FinancialRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: RecommendationPriority;
  
  // Impact estimation
  potentialSavings?: number;
  timeToImplement?: string;
  difficulty: DifficultyLevel;
  
  // Status
  status: RecommendationStatus;
  implementedAt?: string;
  dismissedAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  userId: string;
  
  // Event details
  eventType: AuditEventType;
  entityType: string;
  entityId: string;
  
  // Action details
  action: string;
  description: string;
  
  // Context
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  
  // Data changes
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  
  // Metadata
  timestamp: string;
  source: string;
}

// Enums and types

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  INVESTMENT = 'investment',
  LOAN = 'loan',
  MORTGAGE = 'mortgage',
  MONEY_MARKET = 'money_market',
  CD = 'cd',
  BROKERAGE = 'brokerage',
  IRA = 'ira',
  ROTH_IRA = 'roth_ira',
  FOUR_OH_ONE_K = '401k',
}

export enum SyncFrequency {
  REAL_TIME = 'real_time',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MANUAL = 'manual',
}

export enum LinkingSessionStatus {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum LinkingStep {
  INSTITUTION_SELECTION = 'institution_selection',
  CREDENTIAL_INPUT = 'credential_input',
  MFA_VERIFICATION = 'mfa_verification',
  ACCOUNT_SELECTION = 'account_selection',
  CONSENT_CONFIRMATION = 'consent_confirmation',
  COMPLETION = 'completion',
}

export enum SyncType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  BALANCES_ONLY = 'balances_only',
  TRANSACTIONS_ONLY = 'transactions_only',
}

export enum SyncPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum SyncJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export enum ConsentType {
  ACCOUNT_ACCESS = 'account_access',
  TRANSACTION_ACCESS = 'transaction_access',
  IDENTITY_ACCESS = 'identity_access',
  BALANCE_ACCESS = 'balance_access',
}

export enum Permission {
  READ_ACCOUNTS = 'read_accounts',
  READ_TRANSACTIONS = 'read_transactions',
  READ_BALANCES = 'read_balances',
  READ_IDENTITY = 'read_identity',
  READ_INVESTMENTS = 'read_investments',
}

export enum ConsentStatus {
  GRANTED = 'granted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

export enum InsightType {
  SPENDING_SPIKE = 'spending_spike',
  UNUSUAL_TRANSACTION = 'unusual_transaction',
  BUDGET_ALERT = 'budget_alert',
  SAVINGS_OPPORTUNITY = 'savings_opportunity',
  RECURRING_CHARGE = 'recurring_charge',
  CASHFLOW_PREDICTION = 'cashflow_prediction',
}

export enum InsightImpact {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum RecommendationType {
  BUDGET_OPTIMIZATION = 'budget_optimization',
  SAVINGS_INCREASE = 'savings_increase',
  DEBT_REDUCTION = 'debt_reduction',
  SUBSCRIPTION_REVIEW = 'subscription_review',
  INVESTMENT_ADVICE = 'investment_advice',
}

export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum RecommendationStatus {
  ACTIVE = 'active',
  IMPLEMENTED = 'implemented',
  DISMISSED = 'dismissed',
  EXPIRED = 'expired',
}

export enum AuditEventType {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  ACCOUNT_LINKED = 'account_linked',
  ACCOUNT_UNLINKED = 'account_unlinked',
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_UPDATED = 'transaction_updated',
  TRANSACTION_DELETED = 'transaction_deleted',
  BUDGET_CREATED = 'budget_created',
  BUDGET_UPDATED = 'budget_updated',
  BUDGET_DELETED = 'budget_deleted',
  CONSENT_GRANTED = 'consent_granted',
  CONSENT_REVOKED = 'consent_revoked',
  DATA_SYNC = 'data_sync',
  SECURITY_EVENT = 'security_event',
  FINANCIAL_DATA_ACCESS = 'financial_data_access',
  DATA_TRANSFORMATION = 'data_transformation',
}

export interface MaintenanceWindow {
  start: string;
  end: string;
  description: string;
  recurring: boolean;
}

// State interfaces for Redux

export interface FinancialProvidersState {
  providers: FinancialProvider[];
  institutions: EnhancedInstitution[];
  linkingSessions: AccountLinkingSession[];
  syncJobs: SyncJob[];
  isLoading: boolean;
  error: string | null;
}

export interface ConsentState {
  consents: UserConsent[];
  isLoading: boolean;
  error: string | null;
}

export interface FinancialHealthState {
  metrics: FinancialHealthMetrics | null;
  insights: FinancialInsight[];
  recommendations: FinancialRecommendation[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface AuditState {
  entries: AuditLogEntry[];
  isLoading: boolean;
  error: string | null;
  filters: AuditFilters;
}

export interface AuditFilters {
  eventTypes?: AuditEventType[];
  dateRange?: {
    start: string;
    end: string;
  };
  entityTypes?: string[];
  userIds?: string[];
}

// Enhanced root state
export interface EnhancedRootState {
  auth: AuthState;
  accounts: AccountsState;
  transactions: TransactionsState;
  budgets: BudgetsState;
  categories: CategoriesState;
  financialProviders: FinancialProvidersState;
  consent: ConsentState;
  financialHealth: FinancialHealthState;
  audit: AuditState;
}

// Re-export existing types for compatibility
export * from './index';
import { AuthState, AccountsState, TransactionsState, BudgetsState, CategoriesState } from './index';

