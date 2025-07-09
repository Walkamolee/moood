/**
 * Enhanced Transaction Feed for Money Mood
 * Real-time transaction display with categorization, search, and Money Mood integration
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { Transaction, Category } from '../types/financial';
import { dataTransformationService } from '../services/dataTransformationService';
import { calculateBudgetStatus, BudgetStatus } from '../utils/budgetColorSystem';

/**
 * Transaction feed props
 */
interface EnhancedTransactionFeedProps {
  userId: string;
  accountId?: string;
  style?: any;
  onTransactionPress?: (transaction: Transaction) => void;
  showCategories?: boolean;
  showMoodIndicators?: boolean;
}

/**
 * Transaction filter options
 */
interface TransactionFilters {
  searchQuery: string;
  category: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  amountRange: { min: number; max: number } | null;
  type: 'all' | 'income' | 'expense';
  pending: 'all' | 'pending' | 'posted';
}

/**
 * Transaction item component
 */
const TransactionItem: React.FC<{
  transaction: Transaction;
  onPress?: () => void;
  onCategoryChange?: (categoryId: string) => void;
  showMoodIndicator?: boolean;
  budgetStatus?: BudgetStatus;
}> = ({ 
  transaction, 
  onPress, 
  onCategoryChange, 
  showMoodIndicator = true,
  budgetStatus 
}) => {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const categories = useSelector((state: RootState) => state.categories.categories);

  const getMoodIcon = () => {
    if (!showMoodIndicator || !budgetStatus) return null;
    
    switch (budgetStatus.status) {
      case 'excellent':
        return '😊';
      case 'good':
        return '🙂';
      case 'warning':
        return '😐';
      case 'danger':
        return '☹️';
      case 'over_budget':
        return '😱';
      default:
        return '😐';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: transaction.currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTransactionIcon = () => {
    const category = categories.find(c => c.id === transaction.categoryId);
    return category?.icon || '💳';
  };

  const getAmountColor = () => {
    return transaction.type === 'credit' ? '#4CAF50' : '#333333';
  };

  return (
    <TouchableOpacity style={styles.transactionItem} onPress={onPress}>
      <View style={styles.transactionLeft}>
        <View style={styles.transactionIconContainer}>
          <Text style={styles.transactionIcon}>{getTransactionIcon()}</Text>
          {showMoodIndicator && getMoodIcon() && (
            <Text style={styles.moodIcon}>{getMoodIcon()}</Text>
          )}
        </View>
        
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {transaction.description}
          </Text>
          
          {transaction.merchantName && (
            <Text style={styles.merchantName} numberOfLines={1}>
              {transaction.merchantName}
            </Text>
          )}
          
          <View style={styles.transactionMeta}>
            <Text style={styles.transactionDate}>
              {formatDate(transaction.date)}
            </Text>
            
            <TouchableOpacity 
              style={styles.categoryButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={styles.categoryText}>
                {categories.find(c => c.id === transaction.categoryId)?.name || 'Uncategorized'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.transactionRight}>
        <Text style={[styles.transactionAmount, { color: getAmountColor() }]}>
          {transaction.type === 'credit' ? '+' : '-'}{formatAmount(transaction.amount)}
        </Text>
        
        {transaction.isPending && (
          <Text style={styles.pendingText}>Pending</Text>
        )}
      </View>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.categoryModal}>
            <Text style={styles.modalTitle}>Select Category</Text>
            
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    item.id === transaction.categoryId && styles.selectedCategory
                  ]}
                  onPress={() => {
                    onCategoryChange?.(item.id);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.categoryIcon}>{item.icon}</Text>
                  <Text style={styles.categoryName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
};

/**
 * Transaction filters component
 */
const TransactionFilters: React.FC<{
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  categories: Category[];
}> = ({ filters, onFiltersChange, categories }) => {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof TransactionFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <View style={styles.filtersContainer}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          value={filters.searchQuery}
          onChangeText={(text) => updateFilter('searchQuery', text)}
        />
        
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      {showFilters && (
        <View style={styles.filterOptions}>
          {/* Category Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Category:</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filters.category === 'all' && styles.activeFilterButton
                ]}
                onPress={() => updateFilter('category', 'all')}
              >
                <Text style={styles.filterButtonText}>All</Text>
              </TouchableOpacity>
              
              {categories.slice(0, 3).map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.filterButton,
                    filters.category === category.id && styles.activeFilterButton
                  ]}
                  onPress={() => updateFilter('category', category.id)}
                >
                  <Text style={styles.filterButtonText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Range Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Date:</Text>
            <View style={styles.filterButtons}>
              {['all', 'today', 'week', 'month'].map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.filterButton,
                    filters.dateRange === range && styles.activeFilterButton
                  ]}
                  onPress={() => updateFilter('dateRange', range)}
                >
                  <Text style={styles.filterButtonText}>
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Type Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Type:</Text>
            <View style={styles.filterButtons}>
              {['all', 'income', 'expense'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterButton,
                    filters.type === type && styles.activeFilterButton
                  ]}
                  onPress={() => updateFilter('type', type)}
                >
                  <Text style={styles.filterButtonText}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

/**
 * Main Enhanced Transaction Feed Component
 */
export const EnhancedTransactionFeed: React.FC<EnhancedTransactionFeedProps> = ({
  userId,
  accountId,
  style,
  onTransactionPress,
  showCategories = true,
  showMoodIndicators = true,
}) => {
  const dispatch = useDispatch();
  const transactions = useSelector((state: RootState) => state.transactions.transactions);
  const categories = useSelector((state: RootState) => state.categories.categories);
  const budgets = useSelector((state: RootState) => state.budgets.budgets);
  
  const [filters, setFilters] = useState<TransactionFilters>({
    searchQuery: '',
    category: 'all',
    dateRange: 'all',
    amountRange: null,
    type: 'all',
    pending: 'all',
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Filter transactions based on current filters
   */
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      // Account filter
      if (accountId && transaction.accountId !== accountId) {
        return false;
      }

      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesDescription = transaction.description.toLowerCase().includes(query);
        const matchesMerchant = transaction.merchantName?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesMerchant) {
          return false;
        }
      }

      // Category filter
      if (filters.category !== 'all' && transaction.categoryId !== filters.category) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const transactionDate = new Date(transaction.date);
        const now = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            if (transactionDate.toDateString() !== now.toDateString()) {
              return false;
            }
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (transactionDate < weekAgo) {
              return false;
            }
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (transactionDate < monthAgo) {
              return false;
            }
            break;
        }
      }

      // Type filter
      if (filters.type !== 'all') {
        if (filters.type === 'income' && transaction.type !== 'credit') {
          return false;
        }
        if (filters.type === 'expense' && transaction.type !== 'debit') {
          return false;
        }
      }

      // Pending filter
      if (filters.pending !== 'all') {
        if (filters.pending === 'pending' && !transaction.isPending) {
          return false;
        }
        if (filters.pending === 'posted' && transaction.isPending) {
          return false;
        }
      }

      return true;
    });

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, accountId, filters]);

  /**
   * Calculate budget status for mood indicators
   */
  const getBudgetStatus = useCallback((transaction: Transaction): BudgetStatus | undefined => {
    if (!showMoodIndicators) return undefined;
    
    const categoryBudget = budgets.find(b => b.categoryId === transaction.categoryId);
    if (!categoryBudget) return undefined;

    return calculateBudgetStatus(categoryBudget.spent, categoryBudget.amount);
  }, [budgets, showMoodIndicators]);

  /**
   * Handle transaction category change
   */
  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    try {
      // Update transaction category
      // Implementation would dispatch action to update transaction
      console.log('Updating transaction category:', transactionId, categoryId);
      
      // Re-categorize transaction using data transformation service
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction) {
        const updatedTransaction = { ...transaction, categoryId };
        const { enrichedTransaction } = await dataTransformationService.transformTransaction(updatedTransaction);
        
        // Dispatch update action
        // dispatch(updateTransaction(enrichedTransaction));
      }
    } catch (error) {
      console.error('Failed to update transaction category:', error);
      Alert.alert('Error', 'Failed to update transaction category');
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Trigger data sync
      // Implementation would dispatch sync action
      console.log('Refreshing transactions...');
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Load more transactions (pagination)
   */
  const loadMoreTransactions = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Load more transactions
      console.log('Loading more transactions...');
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Render transaction item
   */
  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TransactionItem
      transaction={item}
      onPress={() => onTransactionPress?.(item)}
      onCategoryChange={(categoryId) => handleCategoryChange(item.id, categoryId)}
      showMoodIndicator={showMoodIndicators}
      budgetStatus={getBudgetStatus(item)}
    />
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>💳</Text>
      <Text style={styles.emptyStateTitle}>No Transactions</Text>
      <Text style={styles.emptyStateText}>
        {filters.searchQuery || filters.category !== 'all' 
          ? 'No transactions match your current filters'
          : 'Connect your bank account to see transactions here'
        }
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {/* Filters */}
      <TransactionFilters
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
      />

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
          />
        }
        onEndReached={loadMoreTransactions}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          filteredTransactions.length === 0 ? styles.emptyContainer : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  emptyContainer: {
    flex: 1,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    backgroundColor: '#F9F9F9',
  },
  filterToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  filterToggleText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterOptions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterButton: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#333333',
  },
  transactionItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  transactionIcon: {
    fontSize: 20,
  },
  moodIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 2,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  merchantName: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999999',
    marginRight: 12,
  },
  categoryButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    color: '#1976D2',
    fontWeight: '500',
  },
  transactionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  pendingText: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  categoryModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 16,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedCategory: {
    backgroundColor: '#E3F2FD',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#333333',
  },
  modalCloseButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default EnhancedTransactionFeed;

