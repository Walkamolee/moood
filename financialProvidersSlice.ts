/**
 * Financial Providers Redux Slice
 * Manages state for financial data providers, institutions, and account linking
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  FinancialProvidersState,
  EnhancedInstitution,
  AccountLinkingSession,
  SyncJob,
  LinkingSessionStatus,
  SyncJobStatus,
  LinkingStep,
  SyncType,
  SyncPriority,
} from '../../types/financial';
import {
  financialDataService,
  FinancialProvider,
  AccountLinkRequest,
  AccountLinkResponse,
  SyncOptions,
} from '../../services/financialDataAggregation';

// Initial state
const initialState: FinancialProvidersState = {
  providers: ['plaid'], // Available providers
  institutions: [],
  linkingSessions: [],
  syncJobs: [],
  isLoading: false,
  error: null,
};

// Async thunks

/**
 * Fetch available financial institutions
 */
export const fetchInstitutions = createAsyncThunk(
  'financialProviders/fetchInstitutions',
  async (params: { provider: FinancialProvider; countryCode?: string }) => {
    const providerInstance = financialDataService.getProvider(params.provider);
    const institutions = await providerInstance.getInstitutions(params.countryCode);
    
    // Transform to enhanced institution format
    const enhancedInstitutions: EnhancedInstitution[] = institutions.map(inst => ({
      id: inst.id,
      name: inst.name,
      logo: inst.logo,
      primaryColor: inst.primaryColor,
      url: inst.url,
      products: inst.products,
      supportedAccountTypes: [], // Would be mapped from products
      countryCode: inst.countryCode,
      providers: [params.provider],
      isActive: true,
      popularity: 0,
      reliability: 100,
      lastUpdated: new Date().toISOString(),
    }));
    
    return enhancedInstitutions;
  }
);

/**
 * Create link token for account linking
 */
export const createLinkToken = createAsyncThunk(
  'financialProviders/createLinkToken',
  async (params: { provider: FinancialProvider; userId: string; institutionId: string }) => {
    const providerInstance = financialDataService.getProvider(params.provider);
    const linkToken = await providerInstance.createLinkToken(params.userId);
    
    const session: AccountLinkingSession = {
      id: `session_${Date.now()}`,
      userId: params.userId,
      provider: params.provider,
      institutionId: params.institutionId,
      linkToken,
      status: LinkingSessionStatus.CREATED,
      step: LinkingStep.INSTITUTION_SELECTION,
      completedSteps: [],
      linkedAccounts: [],
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };
    
    return session;
  }
);

/**
 * Exchange public token for access token
 */
export const exchangePublicToken = createAsyncThunk(
  'financialProviders/exchangePublicToken',
  async (params: { sessionId: string; publicToken: string }) => {
    // Find the session
    const session = financialDataService.getProvider('plaid'); // Simplified for now
    const result = await session.exchangePublicToken(params.publicToken);
    
    return {
      sessionId: params.sessionId,
      result,
    };
  }
);

/**
 * Start data synchronization job
 */
export const startSyncJob = createAsyncThunk(
  'financialProviders/startSyncJob',
  async (params: {
    provider: FinancialProvider;
    itemId: string;
    userId: string;
    options?: SyncOptions;
  }) => {
    const syncJob: SyncJob = {
      id: `sync_${Date.now()}`,
      userId: params.userId,
      provider: params.provider,
      itemId: params.itemId,
      type: SyncType.FULL,
      priority: SyncPriority.NORMAL,
      scheduledAt: new Date().toISOString(),
      status: SyncJobStatus.PENDING,
      accountsUpdated: 0,
      transactionsAdded: 0,
      transactionsUpdated: 0,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // In a real implementation, this would trigger actual sync
    // For now, we'll simulate the job creation
    
    return syncJob;
  }
);

/**
 * Update sync job status
 */
export const updateSyncJobStatus = createAsyncThunk(
  'financialProviders/updateSyncJobStatus',
  async (params: {
    jobId: string;
    status: SyncJobStatus;
    accountsUpdated?: number;
    transactionsAdded?: number;
    transactionsUpdated?: number;
    error?: any;
  }) => {
    return params;
  }
);

/**
 * Remove linked account
 */
export const removeLinkedAccount = createAsyncThunk(
  'financialProviders/removeLinkedAccount',
  async (params: { provider: FinancialProvider; itemId: string; accessToken: string }) => {
    const providerInstance = financialDataService.getProvider(params.provider);
    const success = await providerInstance.removeItem(params.accessToken);
    
    if (success) {
      // Remove stored access token
      await financialDataService.removeAccessToken(params.provider, params.itemId);
    }
    
    return {
      provider: params.provider,
      itemId: params.itemId,
      success,
    };
  }
);

// Slice definition
const financialProvidersSlice = createSlice({
  name: 'financialProviders',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Update linking session
    updateLinkingSession: (state, action: PayloadAction<{
      sessionId: string;
      updates: Partial<AccountLinkingSession>;
    }>) => {
      const { sessionId, updates } = action.payload;
      const sessionIndex = state.linkingSessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex !== -1) {
        state.linkingSessions[sessionIndex] = {
          ...state.linkingSessions[sessionIndex],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    
    // Remove linking session
    removeLinkingSession: (state, action: PayloadAction<string>) => {
      state.linkingSessions = state.linkingSessions.filter(
        session => session.id !== action.payload
      );
    },
    
    // Add linked accounts to session
    addLinkedAccountsToSession: (state, action: PayloadAction<{
      sessionId: string;
      accountIds: string[];
    }>) => {
      const { sessionId, accountIds } = action.payload;
      const sessionIndex = state.linkingSessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex !== -1) {
        state.linkingSessions[sessionIndex].linkedAccounts = [
          ...state.linkingSessions[sessionIndex].linkedAccounts,
          ...accountIds,
        ];
        state.linkingSessions[sessionIndex].updatedAt = new Date().toISOString();
      }
    },
    
    // Update sync job progress
    updateSyncJobProgress: (state, action: PayloadAction<{
      jobId: string;
      progress: Partial<SyncJob>;
    }>) => {
      const { jobId, progress } = action.payload;
      const jobIndex = state.syncJobs.findIndex(job => job.id === jobId);
      
      if (jobIndex !== -1) {
        state.syncJobs[jobIndex] = {
          ...state.syncJobs[jobIndex],
          ...progress,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    
    // Remove completed sync jobs
    removeCompletedSyncJobs: (state) => {
      state.syncJobs = state.syncJobs.filter(
        job => job.status !== SyncJobStatus.COMPLETED && job.status !== SyncJobStatus.FAILED
      );
    },
    
    // Set institutions
    setInstitutions: (state, action: PayloadAction<EnhancedInstitution[]>) => {
      state.institutions = action.payload;
    },
    
    // Update institution
    updateInstitution: (state, action: PayloadAction<{
      institutionId: string;
      updates: Partial<EnhancedInstitution>;
    }>) => {
      const { institutionId, updates } = action.payload;
      const institutionIndex = state.institutions.findIndex(inst => inst.id === institutionId);
      
      if (institutionIndex !== -1) {
        state.institutions[institutionIndex] = {
          ...state.institutions[institutionIndex],
          ...updates,
          lastUpdated: new Date().toISOString(),
        };
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch institutions
    builder
      .addCase(fetchInstitutions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInstitutions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.institutions = action.payload;
      })
      .addCase(fetchInstitutions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch institutions';
      });
    
    // Create link token
    builder
      .addCase(createLinkToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createLinkToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.linkingSessions.push(action.payload);
      })
      .addCase(createLinkToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create link token';
      });
    
    // Exchange public token
    builder
      .addCase(exchangePublicToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(exchangePublicToken.fulfilled, (state, action) => {
        state.isLoading = false;
        const { sessionId, result } = action.payload;
        const sessionIndex = state.linkingSessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex !== -1) {
          state.linkingSessions[sessionIndex] = {
            ...state.linkingSessions[sessionIndex],
            status: result.status as LinkingSessionStatus,
            linkedAccounts: result.accounts.map(acc => acc.id),
            accessToken: result.accessToken,
            itemId: result.itemId,
            updatedAt: new Date().toISOString(),
          };
        }
      })
      .addCase(exchangePublicToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to exchange public token';
      });
    
    // Start sync job
    builder
      .addCase(startSyncJob.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startSyncJob.fulfilled, (state, action) => {
        state.isLoading = false;
        state.syncJobs.push(action.payload);
      })
      .addCase(startSyncJob.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to start sync job';
      });
    
    // Update sync job status
    builder
      .addCase(updateSyncJobStatus.fulfilled, (state, action) => {
        const { jobId, status, accountsUpdated, transactionsAdded, transactionsUpdated, error } = action.payload;
        const jobIndex = state.syncJobs.findIndex(job => job.id === jobId);
        
        if (jobIndex !== -1) {
          state.syncJobs[jobIndex] = {
            ...state.syncJobs[jobIndex],
            status,
            accountsUpdated: accountsUpdated ?? state.syncJobs[jobIndex].accountsUpdated,
            transactionsAdded: transactionsAdded ?? state.syncJobs[jobIndex].transactionsAdded,
            transactionsUpdated: transactionsUpdated ?? state.syncJobs[jobIndex].transactionsUpdated,
            error: error || state.syncJobs[jobIndex].error,
            updatedAt: new Date().toISOString(),
            completedAt: status === SyncJobStatus.COMPLETED ? new Date().toISOString() : undefined,
          };
        }
      });
    
    // Remove linked account
    builder
      .addCase(removeLinkedAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeLinkedAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        const { itemId } = action.payload;
        
        // Remove linking sessions for this item
        state.linkingSessions = state.linkingSessions.filter(
          session => session.itemId !== itemId
        );
        
        // Remove sync jobs for this item
        state.syncJobs = state.syncJobs.filter(
          job => job.itemId !== itemId
        );
      })
      .addCase(removeLinkedAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to remove linked account';
      });
  },
});

// Export actions
export const {
  clearError,
  updateLinkingSession,
  removeLinkingSession,
  addLinkedAccountsToSession,
  updateSyncJobProgress,
  removeCompletedSyncJobs,
  setInstitutions,
  updateInstitution,
} = financialProvidersSlice.actions;

// Selectors
export const selectFinancialProviders = (state: { financialProviders: FinancialProvidersState }) =>
  state.financialProviders;

export const selectInstitutions = (state: { financialProviders: FinancialProvidersState }) =>
  state.financialProviders.institutions;

export const selectLinkingSessions = (state: { financialProviders: FinancialProvidersState }) =>
  state.financialProviders.linkingSessions;

export const selectActiveLinkingSession = (state: { financialProviders: FinancialProvidersState }) =>
  state.financialProviders.linkingSessions.find(
    session => session.status === LinkingSessionStatus.IN_PROGRESS
  );

export const selectSyncJobs = (state: { financialProviders: FinancialProvidersState }) =>
  state.financialProviders.syncJobs;

export const selectActiveSyncJobs = (state: { financialProviders: FinancialProvidersState }) =>
  state.financialProviders.syncJobs.filter(
    job => job.status === SyncJobStatus.PENDING || job.status === SyncJobStatus.RUNNING
  );

export const selectInstitutionById = (institutionId: string) =>
  (state: { financialProviders: FinancialProvidersState }) =>
    state.financialProviders.institutions.find(inst => inst.id === institutionId);

export const selectLinkingSessionById = (sessionId: string) =>
  (state: { financialProviders: FinancialProvidersState }) =>
    state.financialProviders.linkingSessions.find(session => session.id === sessionId);

export const selectSyncJobById = (jobId: string) =>
  (state: { financialProviders: FinancialProvidersState }) =>
    state.financialProviders.syncJobs.find(job => job.id === jobId);

// Export reducer
export default financialProvidersSlice.reducer;

