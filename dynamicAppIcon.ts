// Dynamic App Icon Service for Money Mood
// Updates app icon based on budget status with facial expressions

import { Platform } from 'react-native';
import { BudgetStatus } from '../utils/budgetColorSystem';

export interface AppIconVariant {
  name: string;
  path: string;
  description: string;
  emotion: string;
  budgetStatus: BudgetStatus;
}

// App icon variants with different facial expressions
export const APP_ICON_VARIANTS: Record<BudgetStatus, AppIconVariant> = {
  excellent: {
    name: 'money-mood-excellent',
    path: '/assets/icons/money-mood-excellent.png',
    description: 'Happy smile - Well within budget (0-49% spent)',
    emotion: '😊',
    budgetStatus: 'excellent',
  },
  good: {
    name: 'money-mood-good',
    path: '/assets/icons/money-mood-good.png',
    description: 'Content smile - On track with spending (50-74% spent)',
    emotion: '🙂',
    budgetStatus: 'good',
  },
  warning: {
    name: 'money-mood-warning',
    path: '/assets/icons/money-mood-warning.png',
    description: 'Neutral face - Approaching budget limit (75-99% spent)',
    emotion: '😐',
    budgetStatus: 'warning',
  },
  danger: {
    name: 'money-mood-danger',
    path: '/assets/icons/money-mood-danger.png',
    description: 'Sad frown - At budget limit (100-109% spent)',
    emotion: '☹️',
    budgetStatus: 'danger',
  },
  'over-budget': {
    name: 'money-mood-over-budget',
    path: '/assets/icons/money-mood-over-budget.png',
    description: 'Yelling mouth - Over budget (110%+ spent)',
    emotion: '😱',
    budgetStatus: 'over-budget',
  },
};

// Icon change history for analytics
interface IconChangeEvent {
  timestamp: Date;
  fromStatus: BudgetStatus | null;
  toStatus: BudgetStatus;
  budgetPercentage: number;
  reason: string;
}

let iconChangeHistory: IconChangeEvent[] = [];

// Get current app icon variant
export const getCurrentAppIcon = (): AppIconVariant => {
  // In a real app, this would check the current icon from the system
  // For now, return the default excellent icon
  return APP_ICON_VARIANTS.excellent;
};

// Update app icon based on budget status
export const updateAppIcon = async (
  budgetStatus: BudgetStatus,
  budgetPercentage: number,
  reason: string = 'Budget status change'
): Promise<boolean> => {
  try {
    const currentIcon = getCurrentAppIcon();
    const newIcon = APP_ICON_VARIANTS[budgetStatus];

    // Don't update if already using the correct icon
    if (currentIcon.budgetStatus === budgetStatus) {
      console.log(`App icon already set to ${budgetStatus} status`);
      return true;
    }

    // Log the icon change
    const changeEvent: IconChangeEvent = {
      timestamp: new Date(),
      fromStatus: currentIcon.budgetStatus,
      toStatus: budgetStatus,
      budgetPercentage,
      reason,
    };

    iconChangeHistory.push(changeEvent);

    // Platform-specific icon update logic
    if (Platform.OS === 'ios') {
      // iOS: Use alternate app icons
      await updateiOSAppIcon(newIcon);
    } else if (Platform.OS === 'android') {
      // Android: Use activity aliases
      await updateAndroidAppIcon(newIcon);
    } else {
      // Web: Update favicon
      await updateWebFavicon(newIcon);
    }

    console.log(`App icon updated to ${budgetStatus} (${newIcon.emotion}): ${newIcon.description}`);
    return true;
  } catch (error) {
    console.error('Failed to update app icon:', error);
    return false;
  }
};

// iOS-specific icon update using alternate app icons
const updateiOSAppIcon = async (iconVariant: AppIconVariant): Promise<void> => {
  try {
    // In a real iOS app, this would use:
    // await Application.setAlternateIconName(iconVariant.name);
    
    // For demo purposes, simulate the icon change
    console.log(`iOS: Setting alternate icon to ${iconVariant.name}`);
    
    // Store the current icon preference
    await storeIconPreference(iconVariant);
  } catch (error) {
    console.error('iOS icon update failed:', error);
    throw error;
  }
};

// Android-specific icon update using activity aliases
const updateAndroidAppIcon = async (iconVariant: AppIconVariant): Promise<void> => {
  try {
    // In a real Android app, this would use PackageManager to enable/disable
    // activity aliases with different icons
    
    // For demo purposes, simulate the icon change
    console.log(`Android: Enabling activity alias for ${iconVariant.name}`);
    
    // Store the current icon preference
    await storeIconPreference(iconVariant);
  } catch (error) {
    console.error('Android icon update failed:', error);
    throw error;
  }
};

// Web-specific favicon update
const updateWebFavicon = async (iconVariant: AppIconVariant): Promise<void> => {
  try {
    if (typeof document !== 'undefined') {
      // Update favicon for web
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = iconVariant.path;
      }
      
      // Update apple-touch-icon
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (appleTouchIcon) {
        appleTouchIcon.href = iconVariant.path;
      }
      
      console.log(`Web: Updated favicon to ${iconVariant.name}`);
    }
    
    // Store the current icon preference
    await storeIconPreference(iconVariant);
  } catch (error) {
    console.error('Web favicon update failed:', error);
    throw error;
  }
};

// Store icon preference for persistence
const storeIconPreference = async (iconVariant: AppIconVariant): Promise<void> => {
  try {
    // In a real app, this would use AsyncStorage or SecureStore
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('currentAppIcon', JSON.stringify({
        name: iconVariant.name,
        budgetStatus: iconVariant.budgetStatus,
        timestamp: new Date().toISOString(),
      }));
    }
  } catch (error) {
    console.error('Failed to store icon preference:', error);
  }
};

// Get icon change history for analytics
export const getIconChangeHistory = (): IconChangeEvent[] => {
  return [...iconChangeHistory];
};

// Get icon change statistics
export const getIconChangeStats = () => {
  const stats = {
    totalChanges: iconChangeHistory.length,
    statusDistribution: {} as Record<BudgetStatus, number>,
    averageTimeInStatus: {} as Record<BudgetStatus, number>,
    mostCommonStatus: null as BudgetStatus | null,
    leastCommonStatus: null as BudgetStatus | null,
  };

  // Calculate status distribution
  iconChangeHistory.forEach(event => {
    stats.statusDistribution[event.toStatus] = (stats.statusDistribution[event.toStatus] || 0) + 1;
  });

  // Find most and least common statuses
  const statusCounts = Object.entries(stats.statusDistribution);
  if (statusCounts.length > 0) {
    statusCounts.sort((a, b) => b[1] - a[1]);
    stats.mostCommonStatus = statusCounts[0][0] as BudgetStatus;
    stats.leastCommonStatus = statusCounts[statusCounts.length - 1][0] as BudgetStatus;
  }

  return stats;
};

// Reset icon change history (for testing)
export const resetIconChangeHistory = (): void => {
  iconChangeHistory = [];
};

// Get emotional progression description
export const getEmotionalProgression = (): string => {
  const progression = [
    `😊 Excellent: Happy smile when you're crushing your budget goals!`,
    `🙂 Good: Content smile when you're staying on track`,
    `😐 Warning: Neutral face when you're getting close to your limit`,
    `☹️ Danger: Sad frown when you've hit your budget limit`,
    `😱 Over Budget: Yelling mouth when you've gone over - time to take action!`,
  ];
  
  return progression.join('\n');
};

// Manual icon update for testing
export const manualIconUpdate = async (budgetStatus: BudgetStatus): Promise<boolean> => {
  const percentage = {
    excellent: 25,
    good: 60,
    warning: 85,
    danger: 105,
    'over-budget': 125,
  }[budgetStatus];

  return await updateAppIcon(budgetStatus, percentage, 'Manual update for testing');
};

export default {
  APP_ICON_VARIANTS,
  updateAppIcon,
  getCurrentAppIcon,
  getIconChangeHistory,
  getIconChangeStats,
  resetIconChangeHistory,
  getEmotionalProgression,
  manualIconUpdate,
};

