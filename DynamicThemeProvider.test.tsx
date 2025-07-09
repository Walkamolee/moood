// Tests for Dynamic Theme Provider
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DynamicThemeProvider, useDynamicTheme } from '../../contexts/DynamicThemeContext';
import budgetsReducer from '../../store/slices/budgetsSlice';

// Test component to access theme context
const TestComponent = () => {
  const { theme, budgetStatus } = useDynamicTheme();
  return (
    <>
      <div testID="primary-color">{theme.colors.primary}</div>
      <div testID="budget-status">{budgetStatus.status}</div>
      <div testID="budget-percentage">{budgetStatus.percentage}</div>
    </>
  );
};

const createMockStore = (budgetPeriods: any[] = []) => {
  return configureStore({
    reducer: {
      budgets: budgetsReducer,
    },
    preloadedState: {
      budgets: {
        budgets: [],
        budgetPeriods,
        loading: false,
        error: null,
      },
    },
  });
};

describe('DynamicThemeProvider', () => {
  it('should provide default theme when no budget periods exist', () => {
    const store = createMockStore([]);
    
    const { getByTestId } = render(
      <Provider store={store}>
        <DynamicThemeProvider>
          <TestComponent />
        </DynamicThemeProvider>
      </Provider>
    );

    expect(getByTestId('primary-color')).toHaveTextContent('#00D4AA');
    expect(getByTestId('budget-status')).toHaveTextContent('good');
    expect(getByTestId('budget-percentage')).toHaveTextContent('0');
  });

  it('should calculate theme based on excellent budget status', () => {
    const excellentBudgetPeriods = [
      {
        id: '1',
        budgetId: 'budget1',
        categoryId: 'food',
        budgetedAmount: 1000,
        spentAmount: 300,
        remainingAmount: 700,
        percentage: 30,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        isOverBudget: false,
      },
    ];

    const store = createMockStore(excellentBudgetPeriods);
    
    const { getByTestId } = render(
      <Provider store={store}>
        <DynamicThemeProvider>
          <TestComponent />
        </DynamicThemeProvider>
      </Provider>
    );

    expect(getByTestId('primary-color')).toHaveTextContent('#00D4AA');
    expect(getByTestId('budget-status')).toHaveTextContent('excellent');
    expect(getByTestId('budget-percentage')).toHaveTextContent('30');
  });

  it('should calculate theme based on warning budget status', () => {
    const warningBudgetPeriods = [
      {
        id: '1',
        budgetId: 'budget1',
        categoryId: 'food',
        budgetedAmount: 1000,
        spentAmount: 800,
        remainingAmount: 200,
        percentage: 80,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        isOverBudget: false,
      },
    ];

    const store = createMockStore(warningBudgetPeriods);
    
    const { getByTestId } = render(
      <Provider store={store}>
        <DynamicThemeProvider>
          <TestComponent />
        </DynamicThemeProvider>
      </Provider>
    );

    expect(getByTestId('primary-color')).toHaveTextContent('#FFC107');
    expect(getByTestId('budget-status')).toHaveTextContent('warning');
    expect(getByTestId('budget-percentage')).toHaveTextContent('80');
  });

  it('should calculate theme based on over-budget status', () => {
    const overBudgetPeriods = [
      {
        id: '1',
        budgetId: 'budget1',
        categoryId: 'food',
        budgetedAmount: 1000,
        spentAmount: 1200,
        remainingAmount: -200,
        percentage: 120,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        isOverBudget: true,
      },
    ];

    const store = createMockStore(overBudgetPeriods);
    
    const { getByTestId } = render(
      <Provider store={store}>
        <DynamicThemeProvider>
          <TestComponent />
        </DynamicThemeProvider>
      </Provider>
    );

    expect(getByTestId('primary-color')).toHaveTextContent('#DC3545');
    expect(getByTestId('budget-status')).toHaveTextContent('over_budget');
    expect(getByTestId('budget-percentage')).toHaveTextContent('120');
  });

  it('should calculate overall status from multiple budget periods', () => {
    const multipleBudgetPeriods = [
      {
        id: '1',
        budgetId: 'budget1',
        categoryId: 'food',
        budgetedAmount: 500,
        spentAmount: 200,
        remainingAmount: 300,
        percentage: 40,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        isOverBudget: false,
      },
      {
        id: '2',
        budgetId: 'budget2',
        categoryId: 'entertainment',
        budgetedAmount: 300,
        spentAmount: 250,
        remainingAmount: 50,
        percentage: 83,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        isOverBudget: false,
      },
    ];

    const store = createMockStore(multipleBudgetPeriods);
    
    const { getByTestId } = render(
      <Provider store={store}>
        <DynamicThemeProvider>
          <TestComponent />
        </DynamicThemeProvider>
      </Provider>
    );

    // Overall percentage should be (200+250)/(500+300) = 56.25%
    expect(getByTestId('budget-status')).toHaveTextContent('good');
    expect(getByTestId('budget-percentage')).toHaveTextContent('56.25');
  });

  it('should provide theme with all required properties', () => {
    const store = createMockStore([]);
    
    const ThemeTestComponent = () => {
      const { theme } = useDynamicTheme();
      return (
        <>
          <div testID="colors-primary">{theme.colors.primary}</div>
          <div testID="colors-background">{theme.colors.background}</div>
          <div testID="colors-surface">{theme.colors.surface}</div>
          <div testID="colors-text">{theme.colors.text}</div>
          <div testID="colors-text-secondary">{theme.colors.textSecondary}</div>
          <div testID="colors-border">{theme.colors.border}</div>
          <div testID="colors-success">{theme.colors.success}</div>
          <div testID="colors-warning">{theme.colors.warning}</div>
          <div testID="colors-error">{theme.colors.error}</div>
          <div testID="spacing-xs">{theme.spacing.xs}</div>
          <div testID="spacing-sm">{theme.spacing.sm}</div>
          <div testID="spacing-md">{theme.spacing.md}</div>
          <div testID="spacing-lg">{theme.spacing.lg}</div>
          <div testID="spacing-xl">{theme.spacing.xl}</div>
          <div testID="border-radius">{theme.borderRadius}</div>
          <div testID="font-size-small">{theme.fontSize.small}</div>
          <div testID="font-size-medium">{theme.fontSize.medium}</div>
          <div testID="font-size-large">{theme.fontSize.large}</div>
          <div testID="font-size-xlarge">{theme.fontSize.xlarge}</div>
        </>
      );
    };
    
    const { getByTestId } = render(
      <Provider store={store}>
        <DynamicThemeProvider>
          <ThemeTestComponent />
        </DynamicThemeProvider>
      </Provider>
    );

    // Verify all theme properties are present
    expect(getByTestId('colors-primary')).toBeTruthy();
    expect(getByTestId('colors-background')).toBeTruthy();
    expect(getByTestId('colors-surface')).toBeTruthy();
    expect(getByTestId('colors-text')).toBeTruthy();
    expect(getByTestId('colors-text-secondary')).toBeTruthy();
    expect(getByTestId('colors-border')).toBeTruthy();
    expect(getByTestId('colors-success')).toBeTruthy();
    expect(getByTestId('colors-warning')).toBeTruthy();
    expect(getByTestId('colors-error')).toBeTruthy();
    expect(getByTestId('spacing-xs')).toBeTruthy();
    expect(getByTestId('spacing-sm')).toBeTruthy();
    expect(getByTestId('spacing-md')).toBeTruthy();
    expect(getByTestId('spacing-lg')).toBeTruthy();
    expect(getByTestId('spacing-xl')).toBeTruthy();
    expect(getByTestId('border-radius')).toBeTruthy();
    expect(getByTestId('font-size-small')).toBeTruthy();
    expect(getByTestId('font-size-medium')).toBeTruthy();
    expect(getByTestId('font-size-large')).toBeTruthy();
    expect(getByTestId('font-size-xlarge')).toBeTruthy();
  });

  it('should throw error when used outside provider', () => {
    const TestComponentOutsideProvider = () => {
      useDynamicTheme();
      return null;
    };

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('useDynamicTheme must be used within a DynamicThemeProvider');

    console.error = originalError;
  });
});

