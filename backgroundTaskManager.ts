// Background Task Manager for Money Mood
// Handles nightly updates, budget recalculations, and app icon updates

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { store } from '../store';
import { fetchBudgets, updateBudgetPeriods } from '../store/slices/budgetsSlice';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import { updateAppIcon, getIconChangeStats } from './dynamicAppIcon';
import { calculateOverallBudgetStatus, BudgetStatus } from '../utils/budgetColorSystem';

// Background task identifier
const BACKGROUND_FETCH_TASK = 'money-mood-nightly-update';

// Simulated background task for web/development
let backgroundTaskInterval: NodeJS.Timeout | null = null;

// Simulated background task function
const backgroundTaskFunction = async () => {
  try {
    console.log('🌙 Money Mood: Starting nightly update...');
    
    // Perform nightly update tasks
    await performNightlyUpdate();
    
    console.log('✅ Money Mood: Nightly update completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Money Mood: Nightly update failed:', error);
    return false;
  }
};

// Main nightly update function
export const performNightlyUpdate = async (): Promise<void> => {
  try {
    // 1. Update last sync timestamp
    await AsyncStorage.setItem('lastNightlyUpdate', new Date().toISOString());
    
    // 2. Refresh budget data
    await refreshBudgetData();
    
    // 3. Recalculate budget periods
    await recalculateBudgetPeriods();
    
    // 4. Update app icon based on current budget status
    await updateAppIconBasedOnBudget();
    
    // 5. Clean up old data (optional)
    await cleanupOldData();
    
    // 6. Log update completion
    await logUpdateCompletion();
    
  } catch (error) {
    console.error('Error in nightly update:', error);
    throw error;
  }
};

// Refresh budget and transaction data
const refreshBudgetData = async (): Promise<void> => {
  try {
    // Dispatch actions to refresh data
    store.dispatch(fetchBudgets() as any);
    store.dispatch(fetchTransactions() as any);
    
    // Wait for data to be loaded
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('Error refreshing budget data:', error);
  }
};

// Recalculate budget periods for the current month
const recalculateBudgetPeriods = async (): Promise<void> => {
  try {
    const state = store.getState();
    const { budgets } = state.budgets;
    const { transactions } = state.transactions;
    
    // Calculate new budget periods
    const updatedPeriods = budgets.map(budget => {
      const relevantTransactions = transactions.filter(
        transaction => transaction.categoryId === budget.categoryId
      );
      
      const spentAmount = relevantTransactions.reduce(
        (sum, transaction) => sum + Math.abs(transaction.amount), 0
      );
      
      return {
        id: budget.id,
        budgetId: budget.id,
        categoryId: budget.categoryId,
        budgetedAmount: budget.amount,
        spentAmount,
        remainingAmount: budget.amount - spentAmount,
        percentage: (spentAmount / budget.amount) * 100,
        startDate: budget.startDate,
        endDate: budget.endDate,
        isOverBudget: spentAmount > budget.amount,
      };
    });
    
    // Update budget periods in store
    store.dispatch(updateBudgetPeriods(updatedPeriods));
    
  } catch (error) {
    console.error('Error recalculating budget periods:', error);
  }
};

// Update app icon based on current budget status
const updateAppIconBasedOnBudget = async (): Promise<void> => {
  try {
    const state = store.getState();
    const { budgetPeriods } = state.budgets;
    
    // Calculate overall budget status
    const overallStatus = calculateOverallBudgetStatus(budgetPeriods);
    
    // Update app icon color
    await updateAppIcon(overallStatus.color, overallStatus.status);
    
    // Store current status for reference
    await AsyncStorage.setItem('currentBudgetStatus', JSON.stringify(overallStatus));
    
  } catch (error) {
    console.error('Error updating app icon:', error);
  }
};

// Clean up old transaction data (keep last 6 months)
const cleanupOldData = async (): Promise<void> => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // This would typically involve database cleanup
    // For now, we'll just log the cleanup action
    console.log('🧹 Cleaning up data older than:', sixMonthsAgo.toISOString());
    
    await AsyncStorage.setItem('lastDataCleanup', new Date().toISOString());
  } catch (error) {
    console.error('Error cleaning up old data:', error);
  }
};

// Log update completion with statistics
const logUpdateCompletion = async (): Promise<void> => {
  try {
    const state = store.getState();
    const { budgetPeriods } = state.budgets;
    const { transactions } = state.transactions;
    
    const updateLog = {
      timestamp: new Date().toISOString(),
      budgetCount: budgetPeriods.length,
      transactionCount: transactions.length,
      overallBudgetStatus: calculateOverallBudgetStatus(budgetPeriods),
    };
    
    await AsyncStorage.setItem('lastUpdateLog', JSON.stringify(updateLog));
    console.log('📊 Update completed:', updateLog);
  } catch (error) {
    console.error('Error logging update completion:', error);
  }
};

// Register background fetch
export const registerBackgroundFetch = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // For web, use interval-based simulation
      if (backgroundTaskInterval) {
        clearInterval(backgroundTaskInterval);
      }
      
      // Run every 24 hours (for demo, we'll use 1 minute)
      backgroundTaskInterval = setInterval(backgroundTaskFunction, 60 * 1000);
      console.log('✅ Web background simulation registered');
    } else {
      // For native platforms, this would use actual background fetch
      console.log('✅ Background fetch would be registered for native platform');
    }
  } catch (error) {
    console.error('❌ Failed to register background fetch:', error);
  }
};

// Unregister background fetch
export const unregisterBackgroundFetch = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web' && backgroundTaskInterval) {
      clearInterval(backgroundTaskInterval);
      backgroundTaskInterval = null;
      console.log('✅ Web background simulation unregistered');
    } else {
      console.log('✅ Background fetch would be unregistered for native platform');
    }
  } catch (error) {
    console.error('❌ Failed to unregister background fetch:', error);
  }
};

// Check if background fetch is available
export const isBackgroundFetchAvailable = async (): Promise<boolean> => {
  try {
    // Always return true for demo purposes
    return true;
  } catch (error) {
    console.error('Error checking background fetch status:', error);
    return false;
  }
};

// Manual trigger for testing (development only)
export const triggerManualUpdate = async (): Promise<void> => {
  if (__DEV__) {
    console.log('🔧 Triggering manual nightly update for testing...');
    await performNightlyUpdate();
  }
};

// Get last update information
export const getLastUpdateInfo = async (): Promise<any> => {
  try {
    const lastUpdate = await AsyncStorage.getItem('lastNightlyUpdate');
    const lastLog = await AsyncStorage.getItem('lastUpdateLog');
    
    return {
      lastUpdate: lastUpdate ? new Date(lastUpdate) : null,
      lastLog: lastLog ? JSON.parse(lastLog) : null,
    };
  } catch (error) {
    console.error('Error getting last update info:', error);
    return { lastUpdate: null, lastLog: null };
  }
};

// Initialize background tasks
export const initializeBackgroundTasks = async (): Promise<void> => {
  try {
    const isAvailable = await isBackgroundFetchAvailable();
    
    if (isAvailable) {
      await registerBackgroundFetch();
      console.log('🌙 Money Mood background tasks initialized');
    } else {
      console.warn('⚠️ Background fetch not available on this device');
    }
  } catch (error) {
    console.error('❌ Failed to initialize background tasks:', error);
  }
};

