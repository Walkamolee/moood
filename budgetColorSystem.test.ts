// Tests for Budget Color System
import {
  calculateBudgetStatus,
  getBudgetColor,
  getBudgetStatusMessage,
  calculateOverallBudgetStatus,
  getBudgetStatusForIcon,
  BUDGET_COLORS,
  BUDGET_THRESHOLDS,
} from '../../utils/budgetColorSystem';

describe('Budget Color System', () => {
  describe('calculateBudgetStatus', () => {
    it('should return excellent status for low spending', () => {
      const result = calculateBudgetStatus(200, 1000);
      expect(result.status).toBe('excellent');
      expect(result.color).toBe(BUDGET_COLORS.EXCELLENT);
      expect(result.percentage).toBe(20);
      expect(result.icon).toBe('🎉');
    });

    it('should return good status for moderate spending', () => {
      const result = calculateBudgetStatus(600, 1000);
      expect(result.status).toBe('good');
      expect(result.color).toBe(BUDGET_COLORS.GOOD);
      expect(result.percentage).toBe(60);
      expect(result.icon).toBe('👍');
    });

    it('should return warning status for high spending', () => {
      const result = calculateBudgetStatus(800, 1000);
      expect(result.status).toBe('warning');
      expect(result.color).toBe(BUDGET_COLORS.WARNING);
      expect(result.percentage).toBe(80);
      expect(result.icon).toBe('⚠️');
    });

    it('should return danger status for at-limit spending', () => {
      const result = calculateBudgetStatus(1050, 1000);
      expect(result.status).toBe('danger');
      expect(result.color).toBe(BUDGET_COLORS.DANGER);
      expect(result.percentage).toBe(105);
      expect(result.icon).toBe('🚨');
    });

    it('should return over_budget status for excessive spending', () => {
      const result = calculateBudgetStatus(1200, 1000);
      expect(result.status).toBe('over_budget');
      expect(result.color).toBe(BUDGET_COLORS.OVER_BUDGET);
      expect(result.percentage).toBe(120);
      expect(result.icon).toBe('🔴');
    });

    it('should handle zero budget gracefully', () => {
      const result = calculateBudgetStatus(100, 0);
      expect(result.status).toBe('over_budget');
      expect(result.percentage).toBe(Infinity);
    });

    it('should handle negative spending', () => {
      const result = calculateBudgetStatus(-100, 1000);
      expect(result.status).toBe('excellent');
      expect(result.percentage).toBe(-10);
    });
  });

  describe('getBudgetColor', () => {
    it('should return correct colors for each status', () => {
      expect(getBudgetColor('excellent')).toBe(BUDGET_COLORS.EXCELLENT);
      expect(getBudgetColor('good')).toBe(BUDGET_COLORS.GOOD);
      expect(getBudgetColor('warning')).toBe(BUDGET_COLORS.WARNING);
      expect(getBudgetColor('danger')).toBe(BUDGET_COLORS.DANGER);
      expect(getBudgetColor('over_budget')).toBe(BUDGET_COLORS.OVER_BUDGET);
    });

    it('should return default color for unknown status', () => {
      expect(getBudgetColor('unknown' as any)).toBe(BUDGET_COLORS.GOOD);
    });
  });

  describe('getBudgetStatusMessage', () => {
    it('should return appropriate messages for each status', () => {
      expect(getBudgetStatusMessage('excellent')).toContain('Great job');
      expect(getBudgetStatusMessage('good')).toContain('On track');
      expect(getBudgetStatusMessage('warning')).toContain('Approaching');
      expect(getBudgetStatusMessage('danger')).toContain('At budget limit');
      expect(getBudgetStatusMessage('over_budget')).toContain('Over budget');
    });
  });

  describe('calculateOverallBudgetStatus', () => {
    const mockBudgetPeriods = [
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

    it('should calculate overall status from multiple budgets', () => {
      const result = calculateOverallBudgetStatus(mockBudgetPeriods);
      expect(result.status).toBe('good');
      expect(result.percentage).toBeCloseTo(56.25, 1); // (200+250)/(500+300) * 100
    });

    it('should handle empty budget periods', () => {
      const result = calculateOverallBudgetStatus([]);
      expect(result.status).toBe('good');
      expect(result.percentage).toBe(0);
      expect(result.description).toContain('No active budgets');
    });

    it('should handle over-budget scenarios', () => {
      const overBudgetPeriods = [
        {
          ...mockBudgetPeriods[0],
          spentAmount: 600,
          percentage: 120,
          isOverBudget: true,
        },
      ];

      const result = calculateOverallBudgetStatus(overBudgetPeriods);
      expect(result.status).toBe('over_budget');
      expect(result.percentage).toBe(120);
    });
  });

  describe('getBudgetStatusForIcon', () => {
    const mockBudgetPeriods = [
      {
        id: '1',
        budgetId: 'budget1',
        categoryId: 'food',
        budgetedAmount: 1000,
        spentAmount: 600,
        remainingAmount: 400,
        percentage: 60,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        isOverBudget: false,
      },
    ];

    it('should return icon-compatible status data', () => {
      const result = getBudgetStatusForIcon(mockBudgetPeriods);
      expect(result).toHaveProperty('color');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('percentage');
      expect(typeof result.color).toBe('string');
      expect(typeof result.status).toBe('string');
      expect(typeof result.percentage).toBe('number');
    });
  });

  describe('Budget Thresholds', () => {
    it('should have correct threshold values', () => {
      expect(BUDGET_THRESHOLDS.EXCELLENT).toBe(0);
      expect(BUDGET_THRESHOLDS.GOOD).toBe(50);
      expect(BUDGET_THRESHOLDS.WARNING).toBe(75);
      expect(BUDGET_THRESHOLDS.DANGER).toBe(100);
      expect(BUDGET_THRESHOLDS.OVER_BUDGET).toBe(110);
    });
  });

  describe('Budget Colors', () => {
    it('should have valid hex color codes', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      
      expect(BUDGET_COLORS.EXCELLENT).toMatch(hexColorRegex);
      expect(BUDGET_COLORS.GOOD).toMatch(hexColorRegex);
      expect(BUDGET_COLORS.WARNING).toMatch(hexColorRegex);
      expect(BUDGET_COLORS.DANGER).toMatch(hexColorRegex);
      expect(BUDGET_COLORS.OVER_BUDGET).toMatch(hexColorRegex);
    });
  });
});

