import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  BudgetStatus, 
  DynamicTheme, 
  calculateOverallBudgetStatus, 
  generateDynamicTheme,
  getSmoothBudgetColor
} from '../utils/budgetColorSystem';

interface DynamicThemeContextType {
  theme: DynamicTheme;
  budgetStatus: BudgetStatus;
  isTransitioning: boolean;
  updateTheme: () => void;
}

const defaultTheme: DynamicTheme = {
  primary: '#00D4AA',
  primaryLight: '#33DDB8',
  primaryDark: '#00A693',
  accent: '#00D4AA',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#2C3E50',
  textSecondary: '#7F8C8D',
};

const defaultBudgetStatus: BudgetStatus = {
  percentage: 0,
  status: 'excellent',
  color: '#00D4AA',
  description: 'Great job! You\'re well within budget'
};

const DynamicThemeContext = createContext<DynamicThemeContextType>({
  theme: defaultTheme,
  budgetStatus: defaultBudgetStatus,
  isTransitioning: false,
  updateTheme: () => {},
});

interface DynamicThemeProviderProps {
  children: ReactNode;
}

export const DynamicThemeProvider: React.FC<DynamicThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<DynamicTheme>(defaultTheme);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus>(defaultBudgetStatus);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get budget data from Redux store
  const budgets = useSelector((state: RootState) => state.budgets.budgets);
  const transactions = useSelector((state: RootState) => state.transactions.transactions);

  const calculateCurrentBudgetStatus = (): BudgetStatus => {
    if (!budgets.length) {
      return defaultBudgetStatus;
    }

    // Calculate spending for current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const currentMonthTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear &&
             transaction.amount < 0; // Only expenses
    });

    // Calculate spent amounts by category
    const spentByCategory = currentMonthTransactions.reduce((acc, transaction) => {
      const categoryId = transaction.categoryId;
      acc[categoryId] = (acc[categoryId] || 0) + Math.abs(transaction.amount);
      return acc;
    }, {} as Record<string, number>);

    // Calculate total spent and budgeted
    const budgetData = budgets.map(budget => ({
      spent: spentByCategory[budget.categoryId] || 0,
      budgeted: budget.amount
    }));

    return calculateOverallBudgetStatus(budgetData);
  };

  const updateTheme = () => {
    setIsTransitioning(true);
    
    const newBudgetStatus = calculateCurrentBudgetStatus();
    const newTheme = generateDynamicTheme(newBudgetStatus);
    
    // Smooth color transition
    const smoothColor = getSmoothBudgetColor(newBudgetStatus.percentage);
    newTheme.primary = smoothColor;
    newTheme.accent = smoothColor;
    
    setBudgetStatus(newBudgetStatus);
    setTheme(newTheme);
    
    // End transition after animation completes
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // Update theme when budgets or transactions change
  useEffect(() => {
    updateTheme();
  }, [budgets, transactions]);

  // Initial theme calculation
  useEffect(() => {
    updateTheme();
  }, []);

  const contextValue: DynamicThemeContextType = {
    theme,
    budgetStatus,
    isTransitioning,
    updateTheme,
  };

  return (
    <DynamicThemeContext.Provider value={contextValue}>
      {children}
    </DynamicThemeContext.Provider>
  );
};

export const useDynamicTheme = (): DynamicThemeContextType => {
  const context = useContext(DynamicThemeContext);
  if (!context) {
    throw new Error('useDynamicTheme must be used within a DynamicThemeProvider');
  }
  return context;
};

// Hook for getting theme-aware styles
export const useThemedStyles = () => {
  const { theme, isTransitioning } = useDynamicTheme();
  
  return {
    theme,
    isTransitioning,
    // Common themed styles
    primaryButton: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    primaryText: {
      color: theme.primary,
    },
    surface: {
      backgroundColor: theme.surface,
    },
    background: {
      backgroundColor: theme.background,
    },
    text: {
      color: theme.text,
    },
    textSecondary: {
      color: theme.textSecondary,
    },
    // Animated styles for transitions
    animatedPrimary: {
      backgroundColor: theme.primary,
      transition: isTransitioning ? 'background-color 0.3s ease-in-out' : 'none',
    },
    animatedBorder: {
      borderColor: theme.primary,
      transition: isTransitioning ? 'border-color 0.3s ease-in-out' : 'none',
    },
  };
};

// Hook for budget status indicator
export const useBudgetStatusIndicator = () => {
  const { budgetStatus, theme } = useDynamicTheme();
  
  const getStatusIcon = () => {
    switch (budgetStatus.status) {
      case 'excellent':
        return '🎉';
      case 'good':
        return '👍';
      case 'warning':
        return '⚠️';
      case 'danger':
        return '🚨';
      case 'over_budget':
        return '🔴';
      default:
        return '📊';
    }
  };

  const getStatusColor = () => {
    return budgetStatus.color;
  };

  const getStatusMessage = () => {
    return budgetStatus.description;
  };

  const getProgressPercentage = () => {
    return Math.min(budgetStatus.percentage, 100);
  };

  return {
    icon: getStatusIcon(),
    color: getStatusColor(),
    message: getStatusMessage(),
    percentage: budgetStatus.percentage,
    progressPercentage: getProgressPercentage(),
    status: budgetStatus.status,
  };
};

