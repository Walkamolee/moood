// Tests for Dynamic App Icon Service
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppIconVariant,
  APP_ICON_CONFIGS,
  getAppIconVariant,
  updateAppIcon,
  getCurrentAppIcon,
  initializeAppIcon,
  isDynamicIconSupported,
  getIconStatusDescription,
  logIconChange,
  resetAppIcon,
} from '../../services/dynamicAppIcon';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

describe('Dynamic App Icon Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAppIconVariant', () => {
    it('should return EXCELLENT for low budget percentage', () => {
      expect(getAppIconVariant(30)).toBe(AppIconVariant.EXCELLENT);
      expect(getAppIconVariant(49)).toBe(AppIconVariant.EXCELLENT);
    });

    it('should return GOOD for moderate budget percentage', () => {
      expect(getAppIconVariant(50)).toBe(AppIconVariant.GOOD);
      expect(getAppIconVariant(65)).toBe(AppIconVariant.GOOD);
      expect(getAppIconVariant(74)).toBe(AppIconVariant.GOOD);
    });

    it('should return WARNING for high budget percentage', () => {
      expect(getAppIconVariant(75)).toBe(AppIconVariant.WARNING);
      expect(getAppIconVariant(85)).toBe(AppIconVariant.WARNING);
      expect(getAppIconVariant(99)).toBe(AppIconVariant.WARNING);
    });

    it('should return DANGER for at-limit budget percentage', () => {
      expect(getAppIconVariant(100)).toBe(AppIconVariant.DANGER);
      expect(getAppIconVariant(105)).toBe(AppIconVariant.DANGER);
      expect(getAppIconVariant(109)).toBe(AppIconVariant.DANGER);
    });

    it('should return OVER_BUDGET for excessive budget percentage', () => {
      expect(getAppIconVariant(110)).toBe(AppIconVariant.OVER_BUDGET);
      expect(getAppIconVariant(150)).toBe(AppIconVariant.OVER_BUDGET);
    });

    it('should handle edge cases', () => {
      expect(getAppIconVariant(0)).toBe(AppIconVariant.EXCELLENT);
      expect(getAppIconVariant(-10)).toBe(AppIconVariant.EXCELLENT);
      expect(getAppIconVariant(1000)).toBe(AppIconVariant.OVER_BUDGET);
    });
  });

  describe('APP_ICON_CONFIGS', () => {
    it('should have configurations for all variants', () => {
      const variants = Object.values(AppIconVariant);
      variants.forEach(variant => {
        expect(APP_ICON_CONFIGS[variant]).toBeDefined();
        expect(APP_ICON_CONFIGS[variant].variant).toBe(variant);
        expect(APP_ICON_CONFIGS[variant].color).toMatch(/^#[0-9A-F]{6}$/i);
        expect(APP_ICON_CONFIGS[variant].fileName).toMatch(/\.png$/);
      });
    });

    it('should have unique colors for each variant', () => {
      const colors = Object.values(APP_ICON_CONFIGS).map(config => config.color);
      const uniqueColors = [...new Set(colors)];
      expect(uniqueColors.length).toBeGreaterThan(1);
    });

    it('should have descriptive status messages', () => {
      Object.values(APP_ICON_CONFIGS).forEach(config => {
        expect(config.description).toBeTruthy();
        expect(config.description.length).toBeGreaterThan(10);
      });
    });
  });

  describe('updateAppIcon', () => {
    it('should store current icon variant', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      
      await updateAppIcon('#00D4AA', 'excellent');
      
      expect(mockSetItem).toHaveBeenCalledWith(
        'currentAppIcon',
        AppIconVariant.EXCELLENT
      );
    });

    it('should handle unknown color/status combinations', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      
      await updateAppIcon('#UNKNOWN', 'unknown');
      
      expect(mockSetItem).toHaveBeenCalledWith(
        'currentAppIcon',
        AppIconVariant.GOOD
      );
    });

    it('should not throw on errors', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      mockSetItem.mockRejectedValue(new Error('Storage error'));
      
      await expect(updateAppIcon('#00D4AA', 'excellent')).resolves.not.toThrow();
    });
  });

  describe('getCurrentAppIcon', () => {
    it('should return stored icon variant', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockResolvedValue(AppIconVariant.WARNING);
      
      const result = await getCurrentAppIcon();
      
      expect(result).toBe(AppIconVariant.WARNING);
      expect(mockGetItem).toHaveBeenCalledWith('currentAppIcon');
    });

    it('should return null if no icon is stored', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockResolvedValue(null);
      
      const result = await getCurrentAppIcon();
      
      expect(result).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockRejectedValue(new Error('Storage error'));
      
      const result = await getCurrentAppIcon();
      
      expect(result).toBeNull();
    });
  });

  describe('initializeAppIcon', () => {
    it('should set icon based on budget percentage', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      
      await initializeAppIcon(80);
      
      expect(mockSetItem).toHaveBeenCalledWith(
        'currentAppIcon',
        AppIconVariant.WARNING
      );
    });

    it('should handle initialization errors', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      mockSetItem.mockRejectedValue(new Error('Init error'));
      
      await expect(initializeAppIcon(50)).resolves.not.toThrow();
    });
  });

  describe('isDynamicIconSupported', () => {
    it('should return true for supported platforms', () => {
      expect(isDynamicIconSupported()).toBe(true);
    });
  });

  describe('getIconStatusDescription', () => {
    it('should return description for current icon', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockResolvedValue(AppIconVariant.EXCELLENT);
      
      const description = await getIconStatusDescription();
      
      expect(description).toBe(APP_ICON_CONFIGS[AppIconVariant.EXCELLENT].description);
    });

    it('should return default message for unknown icon', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockResolvedValue(null);
      
      const description = await getIconStatusDescription();
      
      expect(description).toBe('App icon status unknown');
    });
  });

  describe('logIconChange', () => {
    it('should log icon changes with metadata', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      
      mockGetItem.mockResolvedValue('[]');
      
      await logIconChange(
        AppIconVariant.GOOD,
        AppIconVariant.WARNING,
        80
      );
      
      expect(mockSetItem).toHaveBeenCalled();
      const [key, value] = mockSetItem.mock.calls[0];
      expect(key).toBe('iconHistory');
      
      const history = JSON.parse(value);
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        fromVariant: AppIconVariant.GOOD,
        toVariant: AppIconVariant.WARNING,
        budgetPercentage: 80,
        reason: 'nightly_update',
      });
    });

    it('should limit history to 30 entries', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      
      // Create 35 existing entries
      const existingHistory = Array.from({ length: 35 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        fromVariant: AppIconVariant.GOOD,
        toVariant: AppIconVariant.WARNING,
        budgetPercentage: 50,
        reason: 'test',
      }));
      
      mockGetItem.mockResolvedValue(JSON.stringify(existingHistory));
      
      await logIconChange(
        AppIconVariant.WARNING,
        AppIconVariant.DANGER,
        100
      );
      
      const [, value] = mockSetItem.mock.calls[0];
      const history = JSON.parse(value);
      expect(history).toHaveLength(30);
    });
  });

  describe('resetAppIcon', () => {
    it('should reset to default good status', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      
      await resetAppIcon();
      
      expect(mockSetItem).toHaveBeenCalledWith(
        'currentAppIcon',
        AppIconVariant.GOOD
      );
    });
  });
});

