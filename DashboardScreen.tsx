import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { fetchAccounts } from '../../store/slices/accountsSlice';
import { fetchTransactions } from '../../store/slices/transactionsSlice';
import { fetchBudgets } from '../../store/slices/budgetsSlice';
import { useDynamicTheme, useThemedStyles, useBudgetStatusIndicator } from '../../contexts/DynamicThemeContext';

const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { accounts } = useSelector((state: RootState) => state.accounts);
  const { transactions } = useSelector((state: RootState) => state.transactions);
  const { budgets, budgetPeriods } = useSelector((state: RootState) => state.budgets);
  
  const { theme, isTransitioning } = useDynamicTheme();
  const themedStyles = useThemedStyles();
  const budgetStatus = useBudgetStatusIndicator();

  useEffect(() => {
    dispatch(fetchAccounts());
    dispatch(fetchTransactions());
    dispatch(fetchBudgets());
  }, [dispatch]);

  const calculateNetWorth = () => {
    return accounts.reduce((total, account) => {
      if (account.type === 'credit_card' || account.type === 'loan') {
        return total - account.balance;
      }
      return total + account.balance;
    }, 0);
  };

  const getRecentTransactions = () => {
    return transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  const getTotalBudgetProgress = () => {
    if (budgetPeriods.length === 0) return { spent: 0, budgeted: 0, percentage: 0 };
    
    const totalSpent = budgetPeriods.reduce((sum, period) => sum + period.spentAmount, 0);
    const totalBudgeted = budgetPeriods.reduce((sum, period) => sum + period.budgetedAmount, 0);
    const percentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
    
    return { spent: totalSpent, budgeted: totalBudgeted, percentage };
  };

  const netWorth = calculateNetWorth();
  const recentTransactions = getRecentTransactions();
  const budgetProgress = getTotalBudgetProgress();

  return (
    <ScrollView style={[styles.container, themedStyles.background]}>
      {/* Header with Budget Status */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Good morning!</Text>
          <View style={styles.budgetStatusContainer}>
            <Text style={styles.budgetStatusIcon}>{budgetStatus.icon}</Text>
            <Text style={styles.budgetStatusText}>{budgetStatus.message}</Text>
          </View>
        </View>
      </View>

      {/* Net Worth Card */}
      <Animated.View style={[
        styles.netWorthCard, 
        themedStyles.surface,
        { 
          borderLeftColor: theme.primary,
          borderLeftWidth: 4,
          transform: isTransitioning ? [{ scale: 1.02 }] : [{ scale: 1 }]
        }
      ]}>
        <Text style={[styles.netWorthLabel, themedStyles.textSecondary]}>Net Worth</Text>
        <Text style={[styles.netWorthAmount, themedStyles.text]}>
          ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
        <View style={styles.growthContainer}>
          <Text style={[styles.growthText, { color: '#28A745' }]}>
            ↗ +2.3% this month
          </Text>
        </View>
      </Animated.View>

      {/* Budget Overview Card */}
      <Animated.View style={[
        styles.budgetCard, 
        themedStyles.surface,
        { borderColor: theme.primary }
      ]}>
        <View style={styles.budgetHeader}>
          <Text style={[styles.cardTitle, themedStyles.text]}>Budget Overview</Text>
          <Text style={[styles.budgetPercentage, { color: budgetStatus.color }]}>
            {budgetProgress.percentage.toFixed(0)}%
          </Text>
        </View>
        
        <View style={styles.budgetProgressContainer}>
          <View style={[styles.progressBar, { backgroundColor: '#E9ECEF' }]}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: budgetStatus.color,
                  width: `${Math.min(budgetProgress.percentage, 100)}%`
                }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.budgetAmounts}>
          <Text style={[styles.budgetText, themedStyles.textSecondary]}>
            ${budgetProgress.spent.toFixed(2)} of ${budgetProgress.budgeted.toFixed(2)}
          </Text>
          <Text style={[styles.budgetRemaining, themedStyles.textSecondary]}>
            ${(budgetProgress.budgeted - budgetProgress.spent).toFixed(2)} remaining
          </Text>
        </View>
      </Animated.View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={[styles.sectionTitle, themedStyles.text]}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.primary }]}>
            <Text style={styles.actionButtonText}>Add Transaction</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.primary }]}>
            <Text style={styles.actionButtonText}>View Budgets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.primary }]}>
            <Text style={styles.actionButtonText}>Sync Accounts</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.recentTransactionsContainer}>
        <Text style={[styles.sectionTitle, themedStyles.text]}>Recent Transactions</Text>
        {recentTransactions.map((transaction) => (
          <View key={transaction.id} style={[styles.transactionItem, themedStyles.surface]}>
            <View style={styles.transactionInfo}>
              <Text style={[styles.transactionDescription, themedStyles.text]}>
                {transaction.description}
              </Text>
              <Text style={[styles.transactionDate, themedStyles.textSecondary]}>
                {new Date(transaction.date).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[
              styles.transactionAmount,
              { color: transaction.amount < 0 ? '#DC3545' : '#28A745' }
            ]}>
              {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  budgetStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  budgetStatusIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  budgetStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  netWorthCard: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  netWorthLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  netWorthAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  growthText: {
    fontSize: 14,
    fontWeight: '500',
  },
  budgetCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  budgetPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  budgetProgressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetText: {
    fontSize: 14,
  },
  budgetRemaining: {
    fontSize: 14,
  },
  quickActionsContainer: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  recentTransactionsContainer: {
    margin: 20,
    marginTop: 0,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;

