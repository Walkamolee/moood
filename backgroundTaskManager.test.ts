// Tests for Background Task Manager
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  performNightlyUpdate,
  registerBackgroundFetch,
  unregisterBackgroundFetch,
  isBackgroundFetchAvailable,
  triggerManualUpdate,
  getLastUpdateInfo,
  initializeBackgroundTasks,
} from '../../services/backgroundTaskManager';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

jest.mock('../store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({
      budgets: {
        budgets: [
          {
            id: '1',
            categoryId: 'food',
            amount: 500,
            spent: 200,
            startDate: '2024-01-01',
            endDate: '2024-01-31',
          },
        ],
        budgetPeriods: [
          {
            id: '1',
            budgetId: '1',
            categoryId: 'food',
            budgetedAmount: 500,
            spentAmount: 200,
            remainingAmount: 300,
            percentage: 40,
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            isOverBudget: false,
          },
        ],
      },
      transactions: {
        transactions: [
          {
            id: '1',
            categoryId: 'food',
            amount: -50,
            description: 'Grocery store',
            date: '2024-01-15',
          },
        ],
      },
    })),
  },
}));

jest.mock('../store/slices/budgetsSlice', () => ({
  fetchBudgets: jest.fn(() => ({ type: 'budgets/fetchBudgets' })),
  updateBudgetPeriods: jest.fn((periods) => ({
    type: 'budgets/updateBudgetPeriods',
    payload: periods,
  })),
}));

jest.mock('../store/slices/transactionsSlice', () => ({
  fetchTransactions: jest.fn(() => ({ type: 'transactions/fetchTransactions' })),
}));

jest.mock('./dynamicAppIcon', () => ({
  updateAppIcon: jest.fn(),
}));

jest.mock('../utils/budgetColorSystem', () => ({
  calculateOverallBudgetStatus: jest.fn(() => ({
    status: 'good',
    color: '#00D4AA',
    percentage: 40,
    description: 'On track with spending',
    icon: '👍',
    message: 'Keep up the good work!',
  })),
}));

describe('Background Task Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('performNightlyUpdate', () => {
    it('should complete nightly update successfully', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      
      await performNightlyUpdate();
      
      // Verify that update timestamp was set
      expect(mockSetItem).toHaveBeenCalledWith(
        'lastNightlyUpdate',
        expect.any(String)
      );
      
      // Verify that update log was created
      expect(mockSetItem).toHaveBeenCalledWith(
        'lastUpdateLog',
        expect.any(String)
      );
    });

    it('should handle errors gracefully', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      mockSetItem.mockRejectedValue(new Error('Storage error'));
      
      await expect(performNightlyUpdate()).rejects.toThrow('Storage error');
    });

    it('should update app icon based on budget status', async () => {
      const { updateAppIcon } = require('./dynamicAppIcon');
      
      await performNightlyUpdate();
      
      expect(updateAppIcon).toHaveBeenCalledWith('#00D4AA', 'good');
    });

    it('should log update completion with statistics', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      
      await performNightlyUpdate();
      
      const updateLogCall = mockSetItem.mock.calls.find(
        ([key]) => key === 'lastUpdateLog'
      );
      expect(updateLogCall).toBeDefined();
      
      const logData = JSON.parse(updateLogCall[1]);
      expect(logData).toMatchObject({
        timestamp: expect.any(String),
        budgetCount: expect.any(Number),
        transactionCount: expect.any(Number),
        overallBudgetStatus: expect.any(Object),
      });
    });
  });

  describe('registerBackgroundFetch', () => {
    it('should register background simulation for web', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await registerBackgroundFetch();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '✅ Web background simulation registered'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle registration errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock setInterval to throw an error
      const originalSetInterval = global.setInterval;
      global.setInterval = jest.fn(() => {
        throw new Error('Timer error');
      });
      
      await registerBackgroundFetch();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to register background fetch:',
        expect.any(Error)
      );
      
      global.setInterval = originalSetInterval;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('unregisterBackgroundFetch', () => {
    it('should unregister background simulation for web', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // First register, then unregister
      await registerBackgroundFetch();
      await unregisterBackgroundFetch();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '✅ Web background simulation unregistered'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('isBackgroundFetchAvailable', () => {
    it('should return true for demo purposes', async () => {
      const result = await isBackgroundFetchAvailable();
      expect(result).toBe(true);
    });
  });

  describe('triggerManualUpdate', () => {
    it('should trigger update in development mode', async () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      
      await triggerManualUpdate();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '🔧 Triggering manual nightly update for testing...'
      );
      expect(mockSetItem).toHaveBeenCalled();
      
      (global as any).__DEV__ = originalDev;
      consoleSpy.mockRestore();
    });

    it('should not trigger in production mode', async () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = false;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await triggerManualUpdate();
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        '🔧 Triggering manual nightly update for testing...'
      );
      
      (global as any).__DEV__ = originalDev;
      consoleSpy.mockRestore();
    });
  });

  describe('getLastUpdateInfo', () => {
    it('should return last update information', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      const mockDate = '2024-01-15T00:00:00.000Z';
      const mockLog = {
        timestamp: mockDate,
        budgetCount: 5,
        transactionCount: 20,
      };
      
      mockGetItem
        .mockResolvedValueOnce(mockDate)
        .mockResolvedValueOnce(JSON.stringify(mockLog));
      
      const result = await getLastUpdateInfo();
      
      expect(result).toEqual({
        lastUpdate: new Date(mockDate),
        lastLog: mockLog,
      });
    });

    it('should handle missing update information', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockResolvedValue(null);
      
      const result = await getLastUpdateInfo();
      
      expect(result).toEqual({
        lastUpdate: null,
        lastLog: null,
      });
    });

    it('should handle storage errors', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockRejectedValue(new Error('Storage error'));
      
      const result = await getLastUpdateInfo();
      
      expect(result).toEqual({
        lastUpdate: null,
        lastLog: null,
      });
    });
  });

  describe('initializeBackgroundTasks', () => {
    it('should initialize background tasks when available', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await initializeBackgroundTasks();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '🌙 Money Mood background tasks initialized'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle initialization errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock isBackgroundFetchAvailable to throw an error
      const mockIsAvailable = jest.fn().mockRejectedValue(new Error('Init error'));
      jest.doMock('./backgroundTaskManager', () => ({
        ...jest.requireActual('./backgroundTaskManager'),
        isBackgroundFetchAvailable: mockIsAvailable,
      }));
      
      await initializeBackgroundTasks();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to initialize background tasks:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });
});

