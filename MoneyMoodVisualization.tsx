/**
 * Money Mood Visualization Component
 * Enhanced facial expressions and mood indicators based on real financial data
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { calculateBudgetStatus, calculateOverallBudgetStatus, BudgetStatus } from '../utils/budgetColorSystem';
import { dynamicAppIconService } from '../services/dynamicAppIcon';

/**
 * Money Mood Visualization Props
 */
interface MoneyMoodVisualizationProps {
  userId: string;
  style?: any;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  animated?: boolean;
  onMoodPress?: (mood: BudgetStatus) => void;
}

/**
 * Mood configuration for different states
 */
const MOOD_CONFIG = {
  excellent: {
    emoji: '😊',
    color: '#4CAF50',
    backgroundColor: '#E8F5E8',
    title: 'Excellent!',
    message: 'You\'re crushing your budget goals!',
    animation: 'bounce',
  },
  good: {
    emoji: '🙂',
    color: '#8BC34A',
    backgroundColor: '#F1F8E9',
    title: 'Good Job!',
    message: 'You\'re doing well and staying on track!',
    animation: 'pulse',
  },
  warning: {
    emoji: '😐',
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    title: 'Be Mindful',
    message: 'Getting close to your limit - be mindful!',
    animation: 'shake',
  },
  danger: {
    emoji: '☹️',
    color: '#FF5722',
    backgroundColor: '#FFEBEE',
    title: 'Slow Down',
    message: 'You\'ve hit your budget limit - time to slow down',
    animation: 'shake',
  },
  over_budget: {
    emoji: '😱',
    color: '#F44336',
    backgroundColor: '#FFEBEE',
    title: 'Over Budget!',
    message: 'Over budget! Take immediate action!',
    animation: 'shake',
  },
};

/**
 * Mood face component with animations
 */
const MoodFace: React.FC<{
  mood: BudgetStatus;
  size: number;
  animated: boolean;
  onPress?: () => void;
}> = ({ mood, size, animated, onPress }) => {
  const [animatedValue] = useState(new Animated.Value(1));
  const config = MOOD_CONFIG[mood.status];

  useEffect(() => {
    if (!animated) return;

    const createAnimation = () => {
      switch (config.animation) {
        case 'bounce':
          return Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 1.2,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]);
        
        case 'pulse':
          return Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 1.1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]);
        
        case 'shake':
          return Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 1.05,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.95,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 1.05,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]);
        
        default:
          return Animated.timing(animatedValue, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          });
      }
    };

    const animation = createAnimation();
    animation.start();

    // Repeat animation for certain moods
    if (mood.status === 'over_budget' || mood.status === 'danger') {
      const interval = setInterval(() => {
        animation.start();
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [mood.status, animated, animatedValue, config.animation]);

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Animated.View
        style={[
          styles.moodFaceContainer,
          {
            width: size,
            height: size,
            backgroundColor: config.backgroundColor,
            borderColor: config.color,
            transform: [{ scale: animatedValue }],
          },
        ]}
      >
        <Text style={[styles.moodEmoji, { fontSize: size * 0.6 }]}>
          {config.emoji}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * Mood details component
 */
const MoodDetails: React.FC<{
  mood: BudgetStatus;
  totalSpent: number;
  totalBudget: number;
  categoryBreakdown: Array<{ category: string; spent: number; budget: number; status: BudgetStatus }>;
}> = ({ mood, totalSpent, totalBudget, categoryBreakdown }) => {
  const config = MOOD_CONFIG[mood.status];
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <View style={styles.moodDetails}>
      <Text style={[styles.moodTitle, { color: config.color }]}>
        {config.title}
      </Text>
      
      <Text style={styles.moodMessage}>
        {config.message}
      </Text>

      <View style={styles.budgetSummary}>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Spent:</Text>
          <Text style={[styles.budgetValue, { color: config.color }]}>
            {formatCurrency(totalSpent)}
          </Text>
        </View>
        
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Budget:</Text>
          <Text style={styles.budgetValue}>
            {formatCurrency(totalBudget)}
          </Text>
        </View>
        
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Remaining:</Text>
          <Text style={[
            styles.budgetValue,
            { color: totalBudget - totalSpent >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {formatCurrency(totalBudget - totalSpent)}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${Math.min(spentPercentage, 100)}%`,
                backgroundColor: config.color,
              }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(spentPercentage)}% of budget used
        </Text>
      </View>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.categoryBreakdown}>
          <Text style={styles.breakdownTitle}>Category Breakdown</Text>
          {categoryBreakdown.slice(0, 3).map((item, index) => {
            const categoryConfig = MOOD_CONFIG[item.status.status];
            const categoryPercentage = item.budget > 0 ? (item.spent / item.budget) * 100 : 0;
            
            return (
              <View key={index} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{item.category}</Text>
                  <Text style={styles.categoryEmoji}>{categoryConfig.emoji}</Text>
                </View>
                
                <View style={styles.categoryProgress}>
                  <View style={styles.categoryProgressBar}>
                    <View 
                      style={[
                        styles.categoryProgressFill,
                        { 
                          width: `${Math.min(categoryPercentage, 100)}%`,
                          backgroundColor: categoryConfig.color,
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryProgressText}>
                    {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                  </Text>
                </View>
              </View>
            );
          })}
          
          {categoryBreakdown.length > 3 && (
            <Text style={styles.moreCategories}>
              +{categoryBreakdown.length - 3} more categories
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * Main Money Mood Visualization Component
 */
export const MoneyMoodVisualization: React.FC<MoneyMoodVisualizationProps> = ({
  userId,
  style,
  size = 'medium',
  showDetails = true,
  animated = true,
  onMoodPress,
}) => {
  const budgets = useSelector((state: RootState) => state.budgets.budgets);
  const categories = useSelector((state: RootState) => state.categories.categories);
  const transactions = useSelector((state: RootState) => state.transactions.transactions);

  // Calculate overall mood based on budget data
  const moodData = useMemo(() => {
    if (budgets.length === 0) {
      return {
        mood: { status: 'good' as const, color: '#8BC34A', message: 'No budgets set up yet' },
        totalSpent: 0,
        totalBudget: 0,
        categoryBreakdown: [],
      };
    }

    // Calculate total spent and budget
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);

    // Calculate overall mood
    const overallMood = calculateOverallBudgetStatus(budgets);

    // Create category breakdown
    const categoryBreakdown = budgets.map(budget => {
      const category = categories.find(c => c.id === budget.categoryId);
      const categoryMood = calculateBudgetStatus(budget.spent, budget.amount);
      
      return {
        category: category?.name || 'Unknown',
        spent: budget.spent,
        budget: budget.amount,
        status: categoryMood,
      };
    }).sort((a, b) => {
      // Sort by percentage spent (highest first)
      const aPercentage = a.budget > 0 ? a.spent / a.budget : 0;
      const bPercentage = b.budget > 0 ? b.spent / b.budget : 0;
      return bPercentage - aPercentage;
    });

    return {
      mood: overallMood,
      totalSpent,
      totalBudget,
      categoryBreakdown,
    };
  }, [budgets, categories]);

  // Update app icon based on mood
  useEffect(() => {
    if (animated) {
      dynamicAppIconService.updateAppIcon(moodData.mood.status);
    }
  }, [moodData.mood.status, animated]);

  // Get face size based on size prop
  const getFaceSize = () => {
    switch (size) {
      case 'small':
        return 60;
      case 'large':
        return 120;
      default:
        return 80;
    }
  };

  const handleMoodPress = () => {
    onMoodPress?.(moodData.mood);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.moodContainer}>
        <MoodFace
          mood={moodData.mood}
          size={getFaceSize()}
          animated={animated}
          onPress={handleMoodPress}
        />
        
        {showDetails && (
          <MoodDetails
            mood={moodData.mood}
            totalSpent={moodData.totalSpent}
            totalBudget={moodData.totalBudget}
            categoryBreakdown={moodData.categoryBreakdown}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  moodContainer: {
    alignItems: 'center',
    padding: 16,
  },
  moodFaceContainer: {
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  moodEmoji: {
    textAlign: 'center',
  },
  moodDetails: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  moodTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moodMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  budgetSummary: {
    width: '100%',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666666',
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  categoryBreakdown: {
    width: '100%',
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  categoryItem: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginRight: 8,
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  categoryProgressText: {
    fontSize: 10,
    color: '#666666',
    minWidth: 80,
    textAlign: 'right',
  },
  moreCategories: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default MoneyMoodVisualization;

