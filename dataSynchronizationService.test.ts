/**
 * Tests for Data Synchronization Service
 * Testing real-time sync, conflict resolution, and performance
 */

import { dataSynchronizationService } from '../../services/dataSynchronizationService';
import { SyncPriority, SyncType, SyncStatus, ConflictResolutionStrategy } from '../../types/financial';

// Mock dependencies
jest.mock('../../services/plaidService');
jest.mock('../../utils/auditLogger');
jest.mock('../../store/index');

describe('DataSynchronizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    (dataSynchronizationService as any).activeSyncJobs.clear();
    (dataSynchronizationService as any).syncQueue = [];
  });

  describe('startSyncJob', () => {
    it('should start a sync job successfully', async () => {
      const userId = 'test-user-id';
      const options = {
        priority: SyncPriority.HIGH,
        type: SyncType.INCREMENTAL,
        accountIds: ['account-1', 'account-2'],
      };

      const jobId = await dataSynchronizationService.startSyncJob(userId, options);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      const jobStatus = await dataSynchronizationService.getSyncJobStatus(jobId);
      expect(jobStatus.status).toBe(SyncStatus.RUNNING);
      expect(jobStatus.priority).toBe(SyncPriority.HIGH);
      expect(jobStatus.type).toBe(SyncType.INCREMENTAL);
    });

    it('should queue sync job when max concurrent jobs reached', async () => {
      const userId = 'test-user-id';
      const options = { priority: SyncPriority.NORMAL, type: SyncType.FULL };

      // Start multiple jobs to reach the limit
      const jobs = [];
      for (let i = 0; i < 5; i++) {
        jobs.push(await dataSynchronizationService.startSyncJob(userId, options));
      }

      // This job should be queued
      const queuedJobId = await dataSynchronizationService.startSyncJob(userId, options);
      const queuedJobStatus = await dataSynchronizationService.getSyncJobStatus(queuedJobId);

      expect(queuedJobStatus.status).toBe(SyncStatus.QUEUED);
    });

    it('should prioritize high priority jobs in queue', async () => {
      const userId = 'test-user-id';

      // Fill up active jobs
      for (let i = 0; i < 5; i++) {
        await dataSynchronizationService.startSyncJob(userId, {
          priority: SyncPriority.NORMAL,
          type: SyncType.FULL,
        });
      }

      // Add normal priority job to queue
      const normalJobId = await dataSynchronizationService.startSyncJob(userId, {
        priority: SyncPriority.NORMAL,
        type: SyncType.INCREMENTAL,
      });

      // Add high priority job to queue
      const highJobId = await dataSynchronizationService.startSyncJob(userId, {
        priority: SyncPriority.HIGH,
        type: SyncType.INCREMENTAL,
      });

      const queueStatus = await dataSynchronizationService.getQueueStatus();
      expect(queueStatus.queue[0].id).toBe(highJobId);
      expect(queueStatus.queue[1].id).toBe(normalJobId);
    });
  });

  describe('syncAccounts', () => {
    it('should sync accounts successfully', async () => {
      const userId = 'test-user-id';
      const accessToken = 'test-access-token';

      // Mock plaid service response
      const mockAccounts = [
        {
          id: 'account-1',
          name: 'Checking Account',
          type: 'checking',
          balance: 1000.50,
          currency: 'USD',
        },
        {
          id: 'account-2',
          name: 'Savings Account',
          type: 'savings',
          balance: 5000.00,
          currency: 'USD',
        },
      ];

      const plaidService = require('../../services/plaidService').plaidService;
      plaidService.getAccounts.mockResolvedValue(mockAccounts);

      const result = await dataSynchronizationService.syncAccounts(userId, accessToken);

      expect(result.success).toBe(true);
      expect(result.accountsProcessed).toBe(2);
      expect(result.accountsUpdated).toBe(2);
      expect(plaidService.getAccounts).toHaveBeenCalledWith(accessToken);
    });

    it('should handle account sync errors gracefully', async () => {
      const userId = 'test-user-id';
      const accessToken = 'invalid-token';

      const plaidService = require('../../services/plaidService').plaidService;
      plaidService.getAccounts.mockRejectedValue(new Error('Invalid access token'));

      const result = await dataSynchronizationService.syncAccounts(userId, accessToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Invalid access token');
    });
  });

  describe('syncTransactions', () => {
    it('should sync transactions with incremental update', async () => {
      const userId = 'test-user-id';
      const accessToken = 'test-access-token';
      const accountIds = ['account-1'];

      const mockTransactions = {
        transactions: [
          {
            id: 'transaction-1',
            accountId: 'account-1',
            amount: 45.67,
            description: 'Coffee Shop',
            date: new Date('2024-01-01'),
            isPending: false,
          },
          {
            id: 'transaction-2',
            accountId: 'account-1',
            amount: 12.34,
            description: 'Lunch',
            date: new Date('2024-01-02'),
            isPending: false,
          },
        ],
        totalTransactions: 2,
      };

      const plaidService = require('../../services/plaidService').plaidService;
      plaidService.getTransactions.mockResolvedValue(mockTransactions);

      const result = await dataSynchronizationService.syncTransactions(
        userId,
        accessToken,
        accountIds,
        SyncType.INCREMENTAL
      );

      expect(result.success).toBe(true);
      expect(result.transactionsProcessed).toBe(2);
      expect(result.transactionsAdded).toBe(2);
      expect(result.duplicatesDetected).toBe(0);
    });

    it('should detect and handle duplicate transactions', async () => {
      const userId = 'test-user-id';
      const accessToken = 'test-access-token';
      const accountIds = ['account-1'];

      // Mock existing transactions in store
      const existingTransactions = [
        {
          id: 'transaction-1',
          accountId: 'account-1',
          amount: 45.67,
          description: 'Coffee Shop',
          date: new Date('2024-01-01'),
        },
      ];

      // Mock new transactions from Plaid (including duplicate)
      const mockTransactions = {
        transactions: [
          {
            id: 'transaction-1', // Duplicate
            accountId: 'account-1',
            amount: 45.67,
            description: 'Coffee Shop',
            date: new Date('2024-01-01'),
            isPending: false,
          },
          {
            id: 'transaction-3', // New transaction
            accountId: 'account-1',
            amount: 25.00,
            description: 'Gas Station',
            date: new Date('2024-01-03'),
            isPending: false,
          },
        ],
        totalTransactions: 2,
      };

      const plaidService = require('../../services/plaidService').plaidService;
      plaidService.getTransactions.mockResolvedValue(mockTransactions);

      // Mock store to return existing transactions
      const mockStore = require('../../store/index').store;
      mockStore.getState.mockReturnValue({
        transactions: {
          transactions: existingTransactions,
        },
      });

      const result = await dataSynchronizationService.syncTransactions(
        userId,
        accessToken,
        accountIds,
        SyncType.INCREMENTAL
      );

      expect(result.success).toBe(true);
      expect(result.transactionsProcessed).toBe(2);
      expect(result.transactionsAdded).toBe(1); // Only new transaction
      expect(result.duplicatesDetected).toBe(1);
    });
  });

  describe('conflict resolution', () => {
    it('should resolve conflicts using provider wins strategy', async () => {
      const localTransaction = {
        id: 'transaction-1',
        accountId: 'account-1',
        amount: 45.67,
        description: 'Coffee Shop (edited)',
        categoryId: 'category-1',
        lastModified: new Date('2024-01-01T10:00:00Z'),
      };

      const providerTransaction = {
        id: 'transaction-1',
        accountId: 'account-1',
        amount: 45.67,
        description: 'Starbucks Coffee',
        categoryId: 'category-2',
        lastModified: new Date('2024-01-01T12:00:00Z'),
      };

      const resolved = await dataSynchronizationService.resolveDataConflict(
        localTransaction,
        providerTransaction,
        ConflictResolutionStrategy.PROVIDER_WINS
      );

      expect(resolved.description).toBe('Starbucks Coffee');
      expect(resolved.categoryId).toBe('category-2');
      expect(resolved.conflictResolution).toBe(ConflictResolutionStrategy.PROVIDER_WINS);
    });

    it('should resolve conflicts using local wins strategy', async () => {
      const localTransaction = {
        id: 'transaction-1',
        accountId: 'account-1',
        amount: 45.67,
        description: 'Coffee Shop (edited)',
        categoryId: 'category-1',
        lastModified: new Date('2024-01-01T10:00:00Z'),
      };

      const providerTransaction = {
        id: 'transaction-1',
        accountId: 'account-1',
        amount: 45.67,
        description: 'Starbucks Coffee',
        categoryId: 'category-2',
        lastModified: new Date('2024-01-01T12:00:00Z'),
      };

      const resolved = await dataSynchronizationService.resolveDataConflict(
        localTransaction,
        providerTransaction,
        ConflictResolutionStrategy.LOCAL_WINS
      );

      expect(resolved.description).toBe('Coffee Shop (edited)');
      expect(resolved.categoryId).toBe('category-1');
      expect(resolved.conflictResolution).toBe(ConflictResolutionStrategy.LOCAL_WINS);
    });

    it('should resolve conflicts using merge strategy', async () => {
      const localTransaction = {
        id: 'transaction-1',
        accountId: 'account-1',
        amount: 45.67,
        description: 'Coffee Shop (edited)',
        categoryId: 'category-1',
        notes: 'Personal note',
        lastModified: new Date('2024-01-01T10:00:00Z'),
      };

      const providerTransaction = {
        id: 'transaction-1',
        accountId: 'account-1',
        amount: 45.67,
        description: 'Starbucks Coffee',
        merchantName: 'Starbucks',
        location: { city: 'New York', state: 'NY' },
        lastModified: new Date('2024-01-01T12:00:00Z'),
      };

      const resolved = await dataSynchronizationService.resolveDataConflict(
        localTransaction,
        providerTransaction,
        ConflictResolutionStrategy.MERGE
      );

      expect(resolved.description).toBe('Coffee Shop (edited)'); // Keep local edit
      expect(resolved.merchantName).toBe('Starbucks'); // Add provider data
      expect(resolved.notes).toBe('Personal note'); // Keep local data
      expect(resolved.location).toEqual({ city: 'New York', state: 'NY' }); // Add provider data
      expect(resolved.conflictResolution).toBe(ConflictResolutionStrategy.MERGE);
    });
  });

  describe('performance optimization', () => {
    it('should batch process large transaction sets', async () => {
      const userId = 'test-user-id';
      const accessToken = 'test-access-token';
      const accountIds = ['account-1'];

      // Create large transaction set
      const largeTransactionSet = {
        transactions: Array.from({ length: 1000 }, (_, i) => ({
          id: `transaction-${i}`,
          accountId: 'account-1',
          amount: Math.random() * 100,
          description: `Transaction ${i}`,
          date: new Date(),
          isPending: false,
        })),
        totalTransactions: 1000,
      };

      const plaidService = require('../../services/plaidService').plaidService;
      plaidService.getTransactions.mockResolvedValue(largeTransactionSet);

      const startTime = Date.now();
      const result = await dataSynchronizationService.syncTransactions(
        userId,
        accessToken,
        accountIds,
        SyncType.FULL
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.transactionsProcessed).toBe(1000);
      expect(result.batchesProcessed).toBeGreaterThan(1); // Should be processed in batches
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should optimize sync frequency based on account activity', async () => {
      const userId = 'test-user-id';
      const accountId = 'account-1';

      // Mock high activity account
      const highActivityAccount = {
        id: accountId,
        transactionCount: 100,
        lastTransactionDate: new Date(),
        avgDailyTransactions: 10,
      };

      const frequency = await dataSynchronizationService.calculateOptimalSyncFrequency(
        highActivityAccount
      );

      expect(frequency).toBeLessThanOrEqual(15 * 60 * 1000); // Should sync more frequently (≤15 min)

      // Mock low activity account
      const lowActivityAccount = {
        id: accountId,
        transactionCount: 5,
        lastTransactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        avgDailyTransactions: 0.5,
      };

      const lowFrequency = await dataSynchronizationService.calculateOptimalSyncFrequency(
        lowActivityAccount
      );

      expect(lowFrequency).toBeGreaterThanOrEqual(4 * 60 * 60 * 1000); // Should sync less frequently (≥4 hours)
    });
  });

  describe('error handling and recovery', () => {
    it('should retry failed sync operations', async () => {
      const userId = 'test-user-id';
      const accessToken = 'test-access-token';

      const plaidService = require('../../services/plaidService').plaidService;
      
      // Mock first two calls to fail, third to succeed
      plaidService.getAccounts
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce([
          {
            id: 'account-1',
            name: 'Test Account',
            type: 'checking',
            balance: 1000,
            currency: 'USD',
          },
        ]);

      const result = await dataSynchronizationService.syncAccounts(userId, accessToken);

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBe(2);
      expect(plaidService.getAccounts).toHaveBeenCalledTimes(3);
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const userId = 'test-user-id';
      const accessToken = 'test-access-token';

      const rateLimitError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        retryAfter: 60, // seconds
      };

      const plaidService = require('../../services/plaidService').plaidService;
      plaidService.getAccounts.mockRejectedValue(rateLimitError);

      const startTime = Date.now();
      const result = await dataSynchronizationService.syncAccounts(userId, accessToken);
      const endTime = Date.now();

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000); // Should wait before retrying
    });

    it('should gracefully handle partial sync failures', async () => {
      const userId = 'test-user-id';
      const accessToken = 'test-access-token';
      const accountIds = ['account-1', 'account-2', 'account-3'];

      const plaidService = require('../../services/plaidService').plaidService;
      
      // Mock partial failure - some accounts succeed, some fail
      plaidService.getTransactions
        .mockResolvedValueOnce({ transactions: [{ id: 'tx-1' }], totalTransactions: 1 }) // account-1 success
        .mockRejectedValueOnce(new Error('Account access denied')) // account-2 failure
        .mockResolvedValueOnce({ transactions: [{ id: 'tx-2' }], totalTransactions: 1 }); // account-3 success

      const result = await dataSynchronizationService.syncTransactions(
        userId,
        accessToken,
        accountIds,
        SyncType.INCREMENTAL
      );

      expect(result.success).toBe(true); // Overall success despite partial failure
      expect(result.accountsProcessed).toBe(3);
      expect(result.accountsSucceeded).toBe(2);
      expect(result.accountsFailed).toBe(1);
      expect(result.partialFailures).toHaveLength(1);
    });
  });

  describe('sync statistics and monitoring', () => {
    it('should track sync performance metrics', async () => {
      const userId = 'test-user-id';
      const options = { priority: SyncPriority.NORMAL, type: SyncType.FULL };

      const jobId = await dataSynchronizationService.startSyncJob(userId, options);
      
      // Wait for job to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = await dataSynchronizationService.getSyncStatistics(userId);

      expect(stats.totalSyncJobs).toBeGreaterThan(0);
      expect(stats.averageSyncDuration).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.lastSyncTime).toBeDefined();
    });

    it('should provide real-time sync progress updates', async () => {
      const userId = 'test-user-id';
      const options = { priority: SyncPriority.HIGH, type: SyncType.FULL };

      const jobId = await dataSynchronizationService.startSyncJob(userId, options);
      
      // Check initial progress
      let progress = await dataSynchronizationService.getSyncProgress(jobId);
      expect(progress.percentage).toBe(0);
      expect(progress.currentStep).toBe('Initializing');

      // Wait for some progress
      await new Promise(resolve => setTimeout(resolve, 50));
      
      progress = await dataSynchronizationService.getSyncProgress(jobId);
      expect(progress.percentage).toBeGreaterThan(0);
      expect(progress.currentStep).toBeDefined();
    });
  });
});

