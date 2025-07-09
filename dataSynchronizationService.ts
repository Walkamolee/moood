/**
 * Data Synchronization Service for Money Mood
 * Manages real-time synchronization of financial data from multiple providers
 */

import { plaidService } from './plaidService';
import { encryptionService, SecureStorage } from '../utils/encryption';
import { auditLogger } from '../utils/auditLogger';
import { securityMonitoringService, SecurityEventType } from './securityMonitoringService';
import {
  Account,
  Transaction,
  SyncJob,
  SyncJobStatus,
  SyncType,
  SyncPriority,
  FinancialProvider,
} from '../types/financial';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sync configuration interface
 */
export interface SyncConfiguration {
  userId: string;
  providers: FinancialProvider[];
  syncTypes: SyncType[];
  frequency: SyncFrequency;
  enabled: boolean;
  lastSync?: string;
  nextSync?: string;
  retryAttempts: number;
  maxRetries: number;
  backoffMultiplier: number;
  timeout: number; // in milliseconds
}

/**
 * Sync frequency options
 */
export enum SyncFrequency {
  REAL_TIME = 'real_time', // Immediate on webhook
  EVERY_15_MINUTES = 'every_15_minutes',
  EVERY_30_MINUTES = 'every_30_minutes',
  HOURLY = 'hourly',
  EVERY_4_HOURS = 'every_4_hours',
  DAILY = 'daily',
  MANUAL = 'manual',
}

/**
 * Sync result interface
 */
export interface SyncResult {
  jobId: string;
  userId: string;
  provider: FinancialProvider;
  syncType: SyncType;
  status: SyncJobStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: SyncError[];
  metadata: Record<string, any>;
}

/**
 * Sync error interface
 */
export interface SyncError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  retryable: boolean;
}

/**
 * Conflict resolution strategy
 */
export enum ConflictResolution {
  PROVIDER_WINS = 'provider_wins', // Provider data takes precedence
  LOCAL_WINS = 'local_wins', // Local data takes precedence
  MERGE = 'merge', // Attempt to merge data
  MANUAL = 'manual', // Require manual resolution
}

/**
 * Data conflict interface
 */
export interface DataConflict {
  id: string;
  type: 'account' | 'transaction' | 'balance';
  recordId: string;
  userId: string;
  provider: FinancialProvider;
  localData: unknown;
  providerData: unknown;
  conflictFields: string[];
  resolution?: ConflictResolution;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

/**
 * Sync statistics interface
 */
export interface SyncStatistics {
  userId: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageDuration: number;
  lastSuccessfulSync?: string;
  lastFailedSync?: string;
  totalRecordsProcessed: number;
  totalErrors: number;
  providerStats: Record<FinancialProvider, {
    syncs: number;
    success: number;
    failures: number;
    avgDuration: number;
  }>;
}

/**
 * Data Synchronization Service
 */
export class DataSynchronizationService {
  private static instance: DataSynchronizationService;
  private syncJobs: Map<string, SyncJob> = new Map();
  private syncConfigurations: Map<string, SyncConfiguration> = new Map();
  private dataConflicts: Map<string, DataConflict> = new Map();
  private syncStatistics: Map<string, SyncStatistics> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.initializeService();
  }

  public static getInstance(): DataSynchronizationService {
    if (!DataSynchronizationService.instance) {
      DataSynchronizationService.instance = new DataSynchronizationService();
    }
    return DataSynchronizationService.instance;
  }

  /**
   * Initialize the synchronization service
   */
  private async initializeService(): Promise<void> {
    try {
      // Load existing configurations and jobs
      await this.loadStoredData();
      
      // Start scheduled sync processes
      this.startScheduledSyncs();
      
      console.log('Data synchronization service initialized');
    } catch (error) {
      console.error('Failed to initialize data synchronization service:', error);
    }
  }

  /**
   * Configure synchronization for a user
   */
  public async configureSynchronization(
    userId: string,
    config: Partial<SyncConfiguration>
  ): Promise<SyncConfiguration> {
    const defaultConfig: SyncConfiguration = {
      userId,
      providers: [FinancialProvider.PLAID],
      syncTypes: [SyncType.ACCOUNTS, SyncType.TRANSACTIONS, SyncType.BALANCES],
      frequency: SyncFrequency.EVERY_30_MINUTES,
      enabled: true,
      retryAttempts: 0,
      maxRetries: 3,
      backoffMultiplier: 2,
      timeout: 30000, // 30 seconds
    };

    const syncConfig = { ...defaultConfig, ...config };
    
    // Calculate next sync time
    syncConfig.nextSync = this.calculateNextSyncTime(syncConfig.frequency);

    // Store configuration
    this.syncConfigurations.set(userId, syncConfig);
    await this.persistSyncConfiguration(syncConfig);

    // Schedule sync if enabled
    if (syncConfig.enabled) {
      this.scheduleSyncForUser(userId);
    }

    // Log configuration
    await auditLogger.logEvent(
      'DATA_SYNC',
      'sync_configuration',
      userId,
      'configure_sync',
      'Data synchronization configured',
      userId,
      {
        newValues: {
          providers: syncConfig.providers,
          syncTypes: syncConfig.syncTypes,
          frequency: syncConfig.frequency,
          enabled: syncConfig.enabled,
        },
      }
    );

    return syncConfig;
  }

  /**
   * Start synchronization job
   */
  public async startSyncJob(
    userId: string,
    options: {
      provider?: FinancialProvider;
      syncType?: SyncType;
      priority?: SyncPriority;
      force?: boolean;
    } = {}
  ): Promise<string> {
    const jobId = uuidv4();
    const config = this.syncConfigurations.get(userId);

    if (!config && !options.force) {
      throw new Error('Sync configuration not found for user');
    }

    const syncJob: SyncJob = {
      id: jobId,
      userId,
      provider: options.provider || FinancialProvider.PLAID,
      type: options.syncType || SyncType.FULL,
      priority: options.priority || SyncPriority.NORMAL,
      status: SyncJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      metadata: {
        force: options.force || false,
        triggeredBy: 'manual',
      },
    };

    // Store job
    this.syncJobs.set(jobId, syncJob);
    await this.persistSyncJob(syncJob);

    // Start job execution
    this.executeSyncJob(jobId);

    return jobId;
  }

  /**
   * Execute synchronization job
   */
  private async executeSyncJob(jobId: string): Promise<void> {
    const job = this.syncJobs.get(jobId);
    if (!job) {
      console.error('Sync job not found:', jobId);
      return;
    }

    try {
      // Update job status
      job.status = SyncJobStatus.RUNNING;
      job.startedAt = new Date().toISOString();
      await this.persistSyncJob(job);

      // Record security event
      await securityMonitoringService.recordSecurityEvent(
        job.userId,
        SecurityEventType.DATA_ACCESS,
        `Data synchronization started: ${job.type}`,
        {
          ipAddress: 'system',
          userAgent: 'sync-service',
          metadata: {
            jobId,
            provider: job.provider,
            syncType: job.type,
          },
        }
      );

      // Execute sync based on type
      const result = await this.performSync(job);

      // Update job with results
      job.status = result.status;
      job.completedAt = new Date().toISOString();
      job.metadata = { ...job.metadata, ...result.metadata };

      await this.persistSyncJob(job);

      // Update statistics
      await this.updateSyncStatistics(job.userId, result);

      // Log completion
      await auditLogger.logEvent(
        'DATA_SYNC',
        'sync_job',
        jobId,
        'complete_sync',
        `Sync job completed: ${result.status}`,
        job.userId,
        {
          newValues: {
            status: result.status,
            recordsProcessed: result.recordsProcessed,
            duration: result.duration,
            errors: result.errors.length,
          },
        }
      );

    } catch (error) {
      console.error('Sync job failed:', error);
      
      // Update job status
      job.status = SyncJobStatus.FAILED;
      job.completedAt = new Date().toISOString();
      job.error = error instanceof Error ? error.message : 'Unknown error';

      await this.persistSyncJob(job);

      // Handle retry logic
      await this.handleSyncRetry(job);
    }
  }

  /**
   * Perform the actual synchronization
   */
  private async performSync(job: SyncJob): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      jobId: job.id,
      userId: job.userId,
      provider: job.provider,
      syncType: job.type,
      status: SyncJobStatus.COMPLETED,
      startTime: job.startedAt!,
      recordsProcessed: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [],
      metadata: {},
    };

    try {
      switch (job.provider) {
        case FinancialProvider.PLAID:
          await this.syncPlaidData(job, result);
          break;
        
        case FinancialProvider.YODLEE:
          await this.syncYodleeData(job, result);
          break;
        
        default:
          throw new Error(`Unsupported provider: ${job.provider}`);
      }

      // Calculate duration
      result.endTime = new Date().toISOString();
      result.duration = Date.now() - startTime;

      // Determine final status
      if (result.errors.length > 0) {
        result.status = result.recordsProcessed > 0 
          ? SyncJobStatus.COMPLETED_WITH_ERRORS 
          : SyncJobStatus.FAILED;
      }

    } catch (error) {
      result.status = SyncJobStatus.FAILED;
      result.errors.push({
        code: 'SYNC_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        retryable: true,
      });
    }

    return result;
  }

  /**
   * Sync data from Plaid
   */
  private async syncPlaidData(job: SyncJob, result: SyncResult): Promise<void> {
    try {
      switch (job.type) {
        case SyncType.ACCOUNTS:
        case SyncType.FULL:
          await this.syncPlaidAccounts(job, result);
          if (job.type === SyncType.ACCOUNTS) break;
          // Fall through for full sync
        
        case SyncType.TRANSACTIONS:
          await this.syncPlaidTransactions(job, result);
          if (job.type === SyncType.TRANSACTIONS) break;
          // Fall through for full sync
        
        case SyncType.BALANCES:
          await this.syncPlaidBalances(job, result);
          break;
      }
    } catch (error) {
      throw new Error(`Plaid sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync accounts from Plaid
   */
  private async syncPlaidAccounts(job: SyncJob, result: SyncResult): Promise<void> {
    try {
      const accounts = await plaidService.getAccounts(job.userId);
      
      for (const account of accounts) {
        // Check for conflicts with existing data
        const conflicts = await this.detectAccountConflicts(account);
        
        if (conflicts.length > 0) {
          await this.handleDataConflicts(conflicts);
        }

        // Process account (add/update)
        const isNew = await this.processAccount(account);
        
        if (isNew) {
          result.recordsAdded++;
        } else {
          result.recordsUpdated++;
        }
        
        result.recordsProcessed++;
      }

      result.metadata.accountsSync = {
        totalAccounts: accounts.length,
        processed: result.recordsProcessed,
      };

    } catch (error) {
      result.errors.push({
        code: 'ACCOUNTS_SYNC_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        retryable: true,
      });
    }
  }

  /**
   * Sync transactions from Plaid
   */
  private async syncPlaidTransactions(job: SyncJob, result: SyncResult): Promise<void> {
    try {
      // Get transactions for the last 30 days by default
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const transactions = await plaidService.getTransactions(job.userId, {
        startDate,
        endDate,
      });

      for (const transaction of transactions) {
        // Check for conflicts and duplicates
        const conflicts = await this.detectTransactionConflicts(transaction);
        
        if (conflicts.length > 0) {
          await this.handleDataConflicts(conflicts);
        }

        // Process transaction (add/update)
        const isNew = await this.processTransaction(transaction);
        
        if (isNew) {
          result.recordsAdded++;
        } else {
          result.recordsUpdated++;
        }
        
        result.recordsProcessed++;
      }

      result.metadata.transactionsSync = {
        totalTransactions: transactions.length,
        processed: result.recordsProcessed,
        dateRange: `${startDate} to ${endDate}`,
      };

    } catch (error) {
      result.errors.push({
        code: 'TRANSACTIONS_SYNC_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        retryable: true,
      });
    }
  }

  /**
   * Sync balances from Plaid
   */
  private async syncPlaidBalances(job: SyncJob, result: SyncResult): Promise<void> {
    try {
      const accounts = await plaidService.getAccounts(job.userId);
      
      for (const account of accounts) {
        // Update account balance
        await this.updateAccountBalance(account);
        result.recordsUpdated++;
        result.recordsProcessed++;
      }

      result.metadata.balancesSync = {
        accountsUpdated: accounts.length,
        processed: result.recordsProcessed,
      };

    } catch (error) {
      result.errors.push({
        code: 'BALANCES_SYNC_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        retryable: true,
      });
    }
  }

  /**
   * Sync data from Yodlee (placeholder)
   */
  private async syncYodleeData(job: SyncJob, result: SyncResult): Promise<void> {
    // Placeholder for Yodlee integration
    throw new Error('Yodlee integration not yet implemented');
  }

  /**
   * Detect conflicts in account data
   */
  private async detectAccountConflicts(account: Account): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];
    
    // Check if account already exists locally
    const existingAccount = await this.getExistingAccount(account.id);
    
    if (existingAccount) {
      const conflictFields: string[] = [];
      
      // Check for field conflicts
      if (existingAccount.name !== account.name) {
        conflictFields.push('name');
      }
      
      if (existingAccount.balance !== account.balance) {
        conflictFields.push('balance');
      }
      
      if (existingAccount.isActive !== account.isActive) {
        conflictFields.push('isActive');
      }

      if (conflictFields.length > 0) {
        const conflict: DataConflict = {
          id: uuidv4(),
          type: 'account',
          recordId: account.id,
          userId: account.userId,
          provider: account.provider,
          localData: existingAccount,
          providerData: account,
          conflictFields,
          createdAt: new Date().toISOString(),
        };
        
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  /**
   * Detect conflicts in transaction data
   */
  private async detectTransactionConflicts(transaction: Transaction): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];
    
    // Check for duplicate transactions
    const existingTransaction = await this.getExistingTransaction(transaction.id);
    
    if (existingTransaction) {
      const conflictFields: string[] = [];
      
      // Check for field conflicts
      if (existingTransaction.amount !== transaction.amount) {
        conflictFields.push('amount');
      }
      
      if (existingTransaction.description !== transaction.description) {
        conflictFields.push('description');
      }
      
      if (existingTransaction.category !== transaction.category) {
        conflictFields.push('category');
      }

      if (conflictFields.length > 0) {
        const conflict: DataConflict = {
          id: uuidv4(),
          type: 'transaction',
          recordId: transaction.id,
          userId: transaction.userId,
          provider: transaction.provider,
          localData: existingTransaction,
          providerData: transaction,
          conflictFields,
          createdAt: new Date().toISOString(),
        };
        
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  /**
   * Handle data conflicts
   */
  private async handleDataConflicts(conflicts: DataConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      // Store conflict for potential manual resolution
      this.dataConflicts.set(conflict.id, conflict);
      await this.persistDataConflict(conflict);

      // Apply automatic resolution based on strategy
      const resolution = ConflictResolution.PROVIDER_WINS; // Default strategy
      
      switch (resolution) {
        case ConflictResolution.PROVIDER_WINS:
          conflict.resolution = resolution;
          conflict.resolvedAt = new Date().toISOString();
          conflict.resolvedBy = 'system';
          break;
        
        case ConflictResolution.LOCAL_WINS:
          // Keep local data, ignore provider data
          conflict.resolution = resolution;
          conflict.resolvedAt = new Date().toISOString();
          conflict.resolvedBy = 'system';
          break;
        
        case ConflictResolution.MERGE:
          // Attempt to merge data intelligently
          await this.mergeConflictData(conflict);
          break;
        
        case ConflictResolution.MANUAL:
          // Leave for manual resolution
          break;
      }

      await this.persistDataConflict(conflict);
    }
  }

  /**
   * Merge conflict data intelligently
   */
  private async mergeConflictData(conflict: DataConflict): Promise<void> {
    // Implementation would merge data based on field types and business rules
    // For now, default to provider wins
    conflict.resolution = ConflictResolution.PROVIDER_WINS;
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolvedBy = 'system_merge';
  }

  /**
   * Handle sync retry logic
   */
  private async handleSyncRetry(job: SyncJob): Promise<void> {
    const config = this.syncConfigurations.get(job.userId);
    
    if (!config || job.retryCount >= config.maxRetries) {
      console.log(`Max retries exceeded for job ${job.id}`);
      return;
    }

    // Calculate backoff delay
    const delay = Math.pow(config.backoffMultiplier, job.retryCount) * 1000; // Start with 1 second
    
    setTimeout(async () => {
      job.retryCount = (job.retryCount || 0) + 1;
      job.status = SyncJobStatus.PENDING;
      job.error = undefined;
      
      await this.persistSyncJob(job);
      this.executeSyncJob(job.id);
    }, delay);
  }

  /**
   * Update sync statistics
   */
  private async updateSyncStatistics(userId: string, result: SyncResult): Promise<void> {
    let stats = this.syncStatistics.get(userId);
    
    if (!stats) {
      stats = {
        userId,
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageDuration: 0,
        totalRecordsProcessed: 0,
        totalErrors: 0,
        providerStats: {},
      };
    }

    // Update overall stats
    stats.totalSyncs++;
    stats.totalRecordsProcessed += result.recordsProcessed;
    stats.totalErrors += result.errors.length;

    if (result.status === SyncJobStatus.COMPLETED || result.status === SyncJobStatus.COMPLETED_WITH_ERRORS) {
      stats.successfulSyncs++;
      stats.lastSuccessfulSync = result.endTime;
    } else {
      stats.failedSyncs++;
      stats.lastFailedSync = result.endTime;
    }

    // Update average duration
    if (result.duration) {
      stats.averageDuration = (stats.averageDuration * (stats.totalSyncs - 1) + result.duration) / stats.totalSyncs;
    }

    // Update provider-specific stats
    if (!stats.providerStats[result.provider]) {
      stats.providerStats[result.provider] = {
        syncs: 0,
        success: 0,
        failures: 0,
        avgDuration: 0,
      };
    }

    const providerStats = stats.providerStats[result.provider];
    providerStats.syncs++;
    
    if (result.status === SyncJobStatus.COMPLETED || result.status === SyncJobStatus.COMPLETED_WITH_ERRORS) {
      providerStats.success++;
    } else {
      providerStats.failures++;
    }

    if (result.duration) {
      providerStats.avgDuration = (providerStats.avgDuration * (providerStats.syncs - 1) + result.duration) / providerStats.syncs;
    }

    // Store updated stats
    this.syncStatistics.set(userId, stats);
    await this.persistSyncStatistics(stats);
  }

  /**
   * Calculate next sync time based on frequency
   */
  private calculateNextSyncTime(frequency: SyncFrequency): string {
    const now = new Date();
    
    switch (frequency) {
      case SyncFrequency.EVERY_15_MINUTES:
        return new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      
      case SyncFrequency.EVERY_30_MINUTES:
        return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
      
      case SyncFrequency.HOURLY:
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      
      case SyncFrequency.EVERY_4_HOURS:
        return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
      
      case SyncFrequency.DAILY:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      
      default:
        return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    }
  }

  /**
   * Schedule sync for user
   */
  private scheduleSyncForUser(userId: string): void {
    const config = this.syncConfigurations.get(userId);
    
    if (!config || !config.enabled || config.frequency === SyncFrequency.MANUAL) {
      return;
    }

    // Clear existing interval
    const existingInterval = this.syncIntervals.get(userId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Calculate interval in milliseconds
    let intervalMs: number;
    
    switch (config.frequency) {
      case SyncFrequency.EVERY_15_MINUTES:
        intervalMs = 15 * 60 * 1000;
        break;
      case SyncFrequency.EVERY_30_MINUTES:
        intervalMs = 30 * 60 * 1000;
        break;
      case SyncFrequency.HOURLY:
        intervalMs = 60 * 60 * 1000;
        break;
      case SyncFrequency.EVERY_4_HOURS:
        intervalMs = 4 * 60 * 60 * 1000;
        break;
      case SyncFrequency.DAILY:
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      default:
        intervalMs = 30 * 60 * 1000;
    }

    // Set up interval
    const interval = setInterval(async () => {
      try {
        await this.startSyncJob(userId, {
          syncType: SyncType.INCREMENTAL,
          priority: SyncPriority.LOW,
        });
      } catch (error) {
        console.error(`Scheduled sync failed for user ${userId}:`, error);
      }
    }, intervalMs);

    this.syncIntervals.set(userId, interval);
  }

  /**
   * Start scheduled syncs for all users
   */
  private startScheduledSyncs(): void {
    for (const [userId, config] of this.syncConfigurations.entries()) {
      if (config.enabled) {
        this.scheduleSyncForUser(userId);
      }
    }
  }

  // Placeholder methods for data operations (would be implemented with actual database)

  private async getExistingAccount(accountId: string): Promise<Account | null> {
    // Implementation would query database
    return null;
  }

  private async getExistingTransaction(transactionId: string): Promise<Transaction | null> {
    // Implementation would query database
    return null;
  }

  private async processAccount(account: Account): Promise<boolean> {
    // Implementation would save/update account in database
    console.log('Processing account:', account.name);
    return true; // Return true if new, false if updated
  }

  private async processTransaction(transaction: Transaction): Promise<boolean> {
    // Implementation would save/update transaction in database
    console.log('Processing transaction:', transaction.description);
    return true; // Return true if new, false if updated
  }

  private async updateAccountBalance(account: Account): Promise<void> {
    // Implementation would update account balance in database
    console.log('Updating balance for account:', account.name);
  }

  private async loadStoredData(): Promise<void> {
    // Implementation would load stored configurations and jobs
  }

  private async persistSyncConfiguration(config: SyncConfiguration): Promise<void> {
    await SecureStorage.storeSecureData(`sync_config_${config.userId}`, config);
  }

  private async persistSyncJob(job: SyncJob): Promise<void> {
    await SecureStorage.storeSecureData(`sync_job_${job.id}`, job);
  }

  private async persistDataConflict(conflict: DataConflict): Promise<void> {
    await SecureStorage.storeSecureData(`data_conflict_${conflict.id}`, conflict);
  }

  private async persistSyncStatistics(stats: SyncStatistics): Promise<void> {
    await SecureStorage.storeSecureData(`sync_stats_${stats.userId}`, stats);
  }

  /**
   * Get sync status for user
   */
  public async getSyncStatus(userId: string): Promise<{
    configuration: SyncConfiguration | null;
    activeJobs: SyncJob[];
    recentJobs: SyncJob[];
    statistics: SyncStatistics | null;
    conflicts: DataConflict[];
  }> {
    const configuration = this.syncConfigurations.get(userId) || null;
    const statistics = this.syncStatistics.get(userId) || null;
    
    const allJobs = Array.from(this.syncJobs.values()).filter(job => job.userId === userId);
    const activeJobs = allJobs.filter(job => 
      job.status === SyncJobStatus.PENDING || job.status === SyncJobStatus.RUNNING
    );
    const recentJobs = allJobs
      .filter(job => job.status !== SyncJobStatus.PENDING && job.status !== SyncJobStatus.RUNNING)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const conflicts = Array.from(this.dataConflicts.values()).filter(
      conflict => conflict.userId === userId && !conflict.resolution
    );

    return {
      configuration,
      activeJobs,
      recentJobs,
      statistics,
      conflicts,
    };
  }

  /**
   * Pause synchronization for user
   */
  public async pauseSynchronization(userId: string): Promise<boolean> {
    const config = this.syncConfigurations.get(userId);
    
    if (!config) {
      return false;
    }

    config.enabled = false;
    await this.persistSyncConfiguration(config);

    // Clear scheduled interval
    const interval = this.syncIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(userId);
    }

    return true;
  }

  /**
   * Resume synchronization for user
   */
  public async resumeSynchronization(userId: string): Promise<boolean> {
    const config = this.syncConfigurations.get(userId);
    
    if (!config) {
      return false;
    }

    config.enabled = true;
    config.nextSync = this.calculateNextSyncTime(config.frequency);
    await this.persistSyncConfiguration(config);

    // Schedule sync
    this.scheduleSyncForUser(userId);

    return true;
  }
}

// Export singleton instance
export const dataSynchronizationService = DataSynchronizationService.getInstance();

