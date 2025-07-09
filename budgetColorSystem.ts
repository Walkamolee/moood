// Dynamic Color System for Budget Status
// Colors change based on user's spending relative to their budget

export interface BudgetStatus {
  percentage: number;
  status: 'excellent' | 'good' | 'warning' | 'danger' | 'over_budget';
  color: string;
  description: string;
}

export interface DynamicTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

// Budget status thresholds
export const BUDGET_THRESHOLDS = {
  EXCELLENT: 0,      // 0-49% spent
  GOOD: 50,          // 50-74% spent  
  WARNING: 75,       // 75-99% spent
  DANGER: 100,       // 100-109% spent
  OVER_BUDGET: 110,  // 110%+ spent
} as const;

// Color palette for different budget states
export const BUDGET_COLORS = {
  EXCELLENT: '#00D4AA',    // Bright mint green
  GOOD: '#00D4AA',         // Mint green
  WARNING: '#FFC107',      // Yellow
  DANGER: '#FF8C42',       // Orange  
  OVER_BUDGET: '#DC3545',  // Red
} as const;

/**
 * Calculate budget status based on total spent vs total budgeted
 */
export const calculateBudgetStatus = (
  totalSpent: number,
  totalBudgeted: number
): BudgetStatus => {
  if (totalBudgeted === 0) {
    return {
      percentage: 0,
      status: 'excellent',
      color: BUDGET_COLORS.EXCELLENT,
      description: 'No budget set'
    };
  }

  const percentage = (totalSpent / totalBudgeted) * 100;

  if (percentage < BUDGET_THRESHOLDS.GOOD) {
    return {
      percentage,
      status: 'excellent',
      color: BUDGET_COLORS.EXCELLENT,
      description: 'Great job! You\'re well within budget'
    };
  } else if (percentage < BUDGET_THRESHOLDS.WARNING) {
    return {
      percentage,
      status: 'good',
      color: BUDGET_COLORS.GOOD,
      description: 'On track with your spending'
    };
  } else if (percentage < BUDGET_THRESHOLDS.DANGER) {
    return {
      percentage,
      status: 'warning',
      color: BUDGET_COLORS.WARNING,
      description: 'Approaching your budget limit'
    };
  } else if (percentage < BUDGET_THRESHOLDS.OVER_BUDGET) {
    return {
      percentage,
      status: 'danger',
      color: BUDGET_COLORS.DANGER,
      description: 'You\'ve reached your budget limit'
    };
  } else {
    return {
      percentage,
      status: 'over_budget',
      color: BUDGET_COLORS.OVER_BUDGET,
      description: 'Over budget - consider adjusting spending'
    };
  }
};

/**
 * Generate dynamic theme based on budget status
 */
export const generateDynamicTheme = (budgetStatus: BudgetStatus): DynamicTheme => {
  const baseColor = budgetStatus.color;
  
  return {
    primary: baseColor,
    primaryLight: lightenColor(baseColor, 20),
    primaryDark: darkenColor(baseColor, 20),
    accent: baseColor,
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#2C3E50',
    textSecondary: '#7F8C8D',
  };
};

/**
 * Lighten a hex color by a percentage
 */
export const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16)
    .slice(1);
};

/**
 * Darken a hex color by a percentage
 */
export const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  
  return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
    (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
    (B > 255 ? 255 : B < 0 ? 0 : B))
    .toString(16)
    .slice(1);
};

/**
 * Get interpolated color between two colors based on percentage
 */
export const interpolateColor = (
  color1: string,
  color2: string,
  percentage: number
): string => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const r = Math.round(r1 + (r2 - r1) * percentage);
  const g = Math.round(g1 + (g2 - g1) * percentage);
  const b = Math.round(b1 + (b2 - b1) * percentage);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Get smooth color transition based on budget percentage
 */
export const getSmoothBudgetColor = (percentage: number): string => {
  if (percentage < 50) {
    // Green to Green (excellent range)
    return BUDGET_COLORS.EXCELLENT;
  } else if (percentage < 75) {
    // Green to Yellow transition (50-75%)
    const transitionPercentage = (percentage - 50) / 25;
    return interpolateColor(BUDGET_COLORS.GOOD, BUDGET_COLORS.WARNING, transitionPercentage);
  } else if (percentage < 100) {
    // Yellow to Orange transition (75-100%)
    const transitionPercentage = (percentage - 75) / 25;
    return interpolateColor(BUDGET_COLORS.WARNING, BUDGET_COLORS.DANGER, transitionPercentage);
  } else if (percentage < 110) {
    // Orange to Red transition (100-110%)
    const transitionPercentage = (percentage - 100) / 10;
    return interpolateColor(BUDGET_COLORS.DANGER, BUDGET_COLORS.OVER_BUDGET, transitionPercentage);
  } else {
    // Full red for over 110%
    return BUDGET_COLORS.OVER_BUDGET;
  }
};

/**
 * Calculate overall budget status from multiple budgets
 */
export const calculateOverallBudgetStatus = (budgets: Array<{spent: number, budgeted: number}>): BudgetStatus => {
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalBudgeted = budgets.reduce((sum, budget) => sum + budget.budgeted, 0);
  
  return calculateBudgetStatus(totalSpent, totalBudgeted);
};

/**
 * Get budget status message with emoji
 */
export const getBudgetStatusMessage = (status: BudgetStatus): string => {
  const emoji = {
    excellent: '🎉',
    good: '👍',
    warning: '⚠️',
    danger: '🚨',
    over_budget: '🔴'
  };
  
  return `${emoji[status.status]} ${status.description}`;
};



// Calculate overall budget status from all budget periods
export const calculateOverallBudgetStatus = (budgetPeriods: Array<{spentAmount: number, budgetedAmount: number}>): BudgetStatus => {
  if (budgetPeriods.length === 0) {
    return {
      status: 'good',
      color: BUDGET_COLORS.GOOD,
      percentage: 0,
      description: 'No active budgets',
      icon: '💚',
      message: 'Set up your first budget',
    };
  }

  // Calculate weighted average based on budget amounts
  let totalBudgeted = 0;
  let totalSpent = 0;

  budgetPeriods.forEach(period => {
    totalBudgeted += period.budgetedAmount;
    totalSpent += period.spentAmount;
  });

  const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  return calculateBudgetStatus(totalSpent, totalBudgeted);
};

// Get budget status for app icon updates
export const getBudgetStatusForIcon = (budgetPeriods: Array<{spentAmount: number, budgetedAmount: number}>): {
  color: string;
  status: string;
  percentage: number;
} => {
  const budgetStatus = calculateOverallBudgetStatus(budgetPeriods);
  
  return {
    color: budgetStatus.color,
    status: budgetStatus.status,
    percentage: budgetStatus.percentage,
  };
};

