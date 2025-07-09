/**
 * Data Transformation Service for Money Mood
 * Handles transaction categorization, merchant normalization, and data enrichment
 */

import { Transaction, Account, Category } from '../types/financial';
import { encryptionService, SecureStorage } from '../utils/encryption';
import { auditLogger } from '../utils/auditLogger';

/**
 * Transaction categorization rule
 */
export interface CategorizationRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: CategorizationCondition[];
  category: string;
  subcategory?: string;
  confidence: number;
  enabled: boolean;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

/**
 * Categorization condition
 */
export interface CategorizationCondition {
  field: 'description' | 'merchant' | 'amount' | 'category' | 'location';
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'regex' | 'greater_than' | 'less_than';
  value: string | number;
  caseSensitive?: boolean;
}

/**
 * Merchant normalization entry
 */
export interface MerchantNormalization {
  id: string;
  originalName: string;
  normalizedName: string;
  category: string;
  subcategory?: string;
  logo?: string;
  website?: string;
  confidence: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data enrichment result
 */
export interface EnrichmentResult {
  transactionId: string;
  originalData: Partial<Transaction>;
  enrichedData: Partial<Transaction>;
  enrichments: EnrichmentType[];
  confidence: number;
  timestamp: string;
}

/**
 * Types of data enrichment
 */
export enum EnrichmentType {
  CATEGORY_PREDICTION = 'category_prediction',
  MERCHANT_NORMALIZATION = 'merchant_normalization',
  LOCATION_ENRICHMENT = 'location_enrichment',
  DUPLICATE_DETECTION = 'duplicate_detection',
  CURRENCY_CONVERSION = 'currency_conversion',
  TRANSACTION_SPLITTING = 'transaction_splitting',
  DESCRIPTION_CLEANING = 'description_cleaning',
}

/**
 * Duplicate detection result
 */
export interface DuplicateDetectionResult {
  transactionId: string;
  duplicateIds: string[];
  confidence: number;
  reasons: string[];
  recommendedAction: 'merge' | 'keep_separate' | 'manual_review';
}

/**
 * Currency conversion rate
 */
export interface CurrencyRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: string;
  source: string;
}

/**
 * Data quality score
 */
export interface DataQualityScore {
  transactionId: string;
  overallScore: number;
  scores: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
  };
  issues: DataQualityIssue[];
  recommendations: string[];
}

/**
 * Data quality issue
 */
export interface DataQualityIssue {
  type: 'missing_field' | 'invalid_format' | 'inconsistent_data' | 'outdated_data';
  field: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  fixable: boolean;
}

/**
 * Data Transformation Service
 */
export class DataTransformationService {
  private static instance: DataTransformationService;
  private categorizationRules: CategorizationRule[] = [];
  private merchantNormalizations: Map<string, MerchantNormalization> = new Map();
  private currencyRates: Map<string, CurrencyRate> = new Map();
  private categories: Category[] = [];

  private constructor() {
    this.initializeService();
  }

  public static getInstance(): DataTransformationService {
    if (!DataTransformationService.instance) {
      DataTransformationService.instance = new DataTransformationService();
    }
    return DataTransformationService.instance;
  }

  /**
   * Initialize the data transformation service
   */
  private async initializeService(): Promise<void> {
    try {
      // Load stored data
      await this.loadStoredData();
      
      // Initialize default categorization rules
      this.initializeDefaultRules();
      
      // Initialize default categories
      this.initializeDefaultCategories();
      
      // Start currency rate updates
      this.startCurrencyRateUpdates();
      
      console.log('Data transformation service initialized');
    } catch (error) {
      console.error('Failed to initialize data transformation service:', error);
    }
  }

  /**
   * Transform and enrich a transaction
   */
  public async transformTransaction(transaction: Transaction): Promise<{
    enrichedTransaction: Transaction;
    enrichmentResult: EnrichmentResult;
  }> {
    const enrichmentResult: EnrichmentResult = {
      transactionId: transaction.id,
      originalData: { ...transaction },
      enrichedData: {},
      enrichments: [],
      confidence: 0,
      timestamp: new Date().toISOString(),
    };

    let enrichedTransaction = { ...transaction };

    try {
      // 1. Clean and normalize description
      const cleanedDescription = this.cleanDescription(transaction.description);
      if (cleanedDescription !== transaction.description) {
        enrichedTransaction.description = cleanedDescription;
        enrichmentResult.enrichedData.description = cleanedDescription;
        enrichmentResult.enrichments.push(EnrichmentType.DESCRIPTION_CLEANING);
      }

      // 2. Normalize merchant name
      if (transaction.merchantName) {
        const normalizedMerchant = await this.normalizeMerchant(transaction.merchantName);
        if (normalizedMerchant) {
          enrichedTransaction.merchantName = normalizedMerchant.normalizedName;
          enrichmentResult.enrichedData.merchantName = normalizedMerchant.normalizedName;
          enrichmentResult.enrichments.push(EnrichmentType.MERCHANT_NORMALIZATION);
          
          // Use merchant category if available
          if (normalizedMerchant.category && !transaction.category) {
            enrichedTransaction.category = normalizedMerchant.category;
            enrichmentResult.enrichedData.category = normalizedMerchant.category;
          }
        }
      }

      // 3. Categorize transaction
      const categoryResult = await this.categorizeTransaction(enrichedTransaction);
      if (categoryResult.category !== enrichedTransaction.category) {
        enrichedTransaction.category = categoryResult.category;
        enrichedTransaction.subcategory = categoryResult.subcategory;
        enrichmentResult.enrichedData.category = categoryResult.category;
        enrichmentResult.enrichedData.subcategory = categoryResult.subcategory;
        enrichmentResult.enrichments.push(EnrichmentType.CATEGORY_PREDICTION);
        enrichmentResult.confidence = Math.max(enrichmentResult.confidence, categoryResult.confidence);
      }

      // 4. Handle currency conversion
      if (transaction.currency && transaction.currency !== 'USD') {
        const convertedAmount = await this.convertCurrency(
          transaction.amount,
          transaction.currency,
          'USD'
        );
        if (convertedAmount !== null) {
          enrichedTransaction.convertedAmount = convertedAmount;
          enrichedTransaction.convertedCurrency = 'USD';
          enrichmentResult.enrichedData.convertedAmount = convertedAmount;
          enrichmentResult.enrichedData.convertedCurrency = 'USD';
          enrichmentResult.enrichments.push(EnrichmentType.CURRENCY_CONVERSION);
        }
      }

      // 5. Enrich location data
      if (transaction.location) {
        const enrichedLocation = await this.enrichLocation(transaction.location);
        if (enrichedLocation) {
          enrichedTransaction.location = { ...transaction.location, ...enrichedLocation };
          enrichmentResult.enrichedData.location = enrichedLocation;
          enrichmentResult.enrichments.push(EnrichmentType.LOCATION_ENRICHMENT);
        }
      }

      // 6. Update timestamps
      enrichedTransaction.updatedAt = new Date().toISOString();

      // Calculate overall confidence
      if (enrichmentResult.enrichments.length > 0) {
        enrichmentResult.confidence = enrichmentResult.confidence || 0.8;
      }

      // Log enrichment
      await auditLogger.logEvent(
        'DATA_TRANSFORMATION',
        'transaction_enrichment',
        transaction.id,
        'enrich_transaction',
        `Transaction enriched with ${enrichmentResult.enrichments.length} enrichments`,
        transaction.userId,
        {
          newValues: {
            enrichments: enrichmentResult.enrichments,
            confidence: enrichmentResult.confidence,
          },
        }
      );

      return {
        enrichedTransaction,
        enrichmentResult,
      };

    } catch (error) {
      console.error('Failed to transform transaction:', error);
      return {
        enrichedTransaction: transaction,
        enrichmentResult,
      };
    }
  }

  /**
   * Categorize a transaction using rules
   */
  public async categorizeTransaction(transaction: Transaction): Promise<{
    category: string;
    subcategory?: string;
    confidence: number;
    ruleId?: string;
  }> {
    try {
      // Sort rules by priority (higher priority first)
      const sortedRules = this.categorizationRules
        .filter(rule => rule.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        const matches = this.evaluateCategorizationRule(transaction, rule);
        
        if (matches) {
          // Update rule usage
          rule.lastUsed = new Date().toISOString();
          rule.usageCount++;
          await this.persistCategorizationRule(rule);

          return {
            category: rule.category,
            subcategory: rule.subcategory,
            confidence: rule.confidence,
            ruleId: rule.id,
          };
        }
      }

      // If no rule matches, use default categorization
      const defaultCategory = this.getDefaultCategory(transaction);
      
      return {
        category: defaultCategory,
        confidence: 0.3, // Low confidence for default
      };

    } catch (error) {
      console.error('Failed to categorize transaction:', error);
      return {
        category: transaction.category || 'Other',
        confidence: 0.1,
      };
    }
  }

  /**
   * Normalize merchant name
   */
  public async normalizeMerchant(merchantName: string): Promise<MerchantNormalization | null> {
    try {
      // Check existing normalizations
      const existing = this.merchantNormalizations.get(merchantName.toLowerCase());
      if (existing) {
        return existing;
      }

      // Attempt to normalize using patterns
      const normalized = this.applyMerchantNormalizationPatterns(merchantName);
      
      if (normalized !== merchantName) {
        const normalization: MerchantNormalization = {
          id: `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalName: merchantName,
          normalizedName: normalized,
          category: 'Other',
          confidence: 0.7,
          verified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Store normalization
        this.merchantNormalizations.set(merchantName.toLowerCase(), normalization);
        await this.persistMerchantNormalization(normalization);

        return normalization;
      }

      return null;

    } catch (error) {
      console.error('Failed to normalize merchant:', error);
      return null;
    }
  }

  /**
   * Detect duplicate transactions
   */
  public async detectDuplicates(
    transaction: Transaction,
    existingTransactions: Transaction[]
  ): Promise<DuplicateDetectionResult> {
    const duplicateIds: string[] = [];
    const reasons: string[] = [];
    let confidence = 0;

    try {
      for (const existing of existingTransactions) {
        if (existing.id === transaction.id) continue;

        let matchScore = 0;
        const currentReasons: string[] = [];

        // Check amount match (exact)
        if (Math.abs(existing.amount - transaction.amount) < 0.01) {
          matchScore += 40;
          currentReasons.push('Exact amount match');
        }

        // Check date proximity (within 3 days)
        const dateDiff = Math.abs(
          new Date(existing.date).getTime() - new Date(transaction.date).getTime()
        );
        if (dateDiff <= 3 * 24 * 60 * 60 * 1000) {
          matchScore += 20;
          currentReasons.push('Date within 3 days');
        }

        // Check description similarity
        const descriptionSimilarity = this.calculateStringSimilarity(
          existing.description,
          transaction.description
        );
        if (descriptionSimilarity > 0.8) {
          matchScore += 30;
          currentReasons.push('High description similarity');
        }

        // Check merchant match
        if (existing.merchantName && transaction.merchantName) {
          const merchantSimilarity = this.calculateStringSimilarity(
            existing.merchantName,
            transaction.merchantName
          );
          if (merchantSimilarity > 0.9) {
            matchScore += 10;
            currentReasons.push('Merchant name match');
          }
        }

        // Consider it a duplicate if score is high enough
        if (matchScore >= 70) {
          duplicateIds.push(existing.id);
          reasons.push(...currentReasons);
          confidence = Math.max(confidence, matchScore / 100);
        }
      }

      // Determine recommended action
      let recommendedAction: DuplicateDetectionResult['recommendedAction'] = 'keep_separate';
      
      if (duplicateIds.length > 0) {
        if (confidence > 0.9) {
          recommendedAction = 'merge';
        } else if (confidence > 0.7) {
          recommendedAction = 'manual_review';
        }
      }

      return {
        transactionId: transaction.id,
        duplicateIds,
        confidence,
        reasons,
        recommendedAction,
      };

    } catch (error) {
      console.error('Failed to detect duplicates:', error);
      return {
        transactionId: transaction.id,
        duplicateIds: [],
        confidence: 0,
        reasons: [],
        recommendedAction: 'keep_separate',
      };
    }
  }

  /**
   * Convert currency
   */
  public async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> {
    try {
      if (fromCurrency === toCurrency) {
        return amount;
      }

      const rateKey = `${fromCurrency}_${toCurrency}`;
      const rate = this.currencyRates.get(rateKey);

      if (rate && this.isRateValid(rate)) {
        return amount * rate.rate;
      }

      // Try reverse rate
      const reverseRateKey = `${toCurrency}_${fromCurrency}`;
      const reverseRate = this.currencyRates.get(reverseRateKey);

      if (reverseRate && this.isRateValid(reverseRate)) {
        return amount / reverseRate.rate;
      }

      // Rate not available or expired
      console.warn(`Currency rate not available: ${fromCurrency} to ${toCurrency}`);
      return null;

    } catch (error) {
      console.error('Failed to convert currency:', error);
      return null;
    }
  }

  /**
   * Calculate data quality score
   */
  public calculateDataQualityScore(transaction: Transaction): DataQualityScore {
    const issues: DataQualityIssue[] = [];
    const recommendations: string[] = [];

    // Check completeness
    let completeness = 1.0;
    
    if (!transaction.description || transaction.description.trim().length === 0) {
      completeness -= 0.2;
      issues.push({
        type: 'missing_field',
        field: 'description',
        description: 'Transaction description is missing',
        severity: 'high',
        fixable: false,
      });
      recommendations.push('Ensure transaction descriptions are captured');
    }

    if (!transaction.category) {
      completeness -= 0.1;
      issues.push({
        type: 'missing_field',
        field: 'category',
        description: 'Transaction category is missing',
        severity: 'medium',
        fixable: true,
      });
      recommendations.push('Categorize transaction automatically or manually');
    }

    if (!transaction.merchantName && transaction.description.length > 0) {
      completeness -= 0.1;
      recommendations.push('Extract merchant name from description');
    }

    // Check accuracy
    let accuracy = 1.0;
    
    if (transaction.amount <= 0) {
      accuracy -= 0.3;
      issues.push({
        type: 'invalid_format',
        field: 'amount',
        description: 'Transaction amount is zero or negative',
        severity: 'high',
        fixable: false,
      });
    }

    if (transaction.currency && !/^[A-Z]{3}$/.test(transaction.currency)) {
      accuracy -= 0.1;
      issues.push({
        type: 'invalid_format',
        field: 'currency',
        description: 'Invalid currency format',
        severity: 'medium',
        fixable: true,
      });
    }

    // Check consistency
    let consistency = 1.0;
    
    if (transaction.merchantName && transaction.description) {
      const similarity = this.calculateStringSimilarity(
        transaction.merchantName,
        transaction.description
      );
      if (similarity < 0.3) {
        consistency -= 0.1;
        issues.push({
          type: 'inconsistent_data',
          field: 'merchantName',
          description: 'Merchant name does not match description',
          severity: 'low',
          fixable: true,
        });
      }
    }

    // Check timeliness
    let timeliness = 1.0;
    const transactionAge = Date.now() - new Date(transaction.date).getTime();
    const daysSinceTransaction = transactionAge / (24 * 60 * 60 * 1000);
    
    if (daysSinceTransaction > 90) {
      timeliness -= 0.2;
      issues.push({
        type: 'outdated_data',
        field: 'date',
        description: 'Transaction is more than 90 days old',
        severity: 'low',
        fixable: false,
      });
    }

    // Calculate overall score
    const overallScore = (completeness + accuracy + consistency + timeliness) / 4;

    return {
      transactionId: transaction.id,
      overallScore,
      scores: {
        completeness,
        accuracy,
        consistency,
        timeliness,
      },
      issues,
      recommendations,
    };
  }

  // Private helper methods

  private cleanDescription(description: string): string {
    // Remove common prefixes and suffixes
    let cleaned = description
      .replace(/^(DEBIT CARD PURCHASE|CREDIT CARD PURCHASE|ACH DEBIT|ACH CREDIT)\s*/i, '')
      .replace(/\s*(PENDING|POSTED)$/i, '')
      .replace(/\s*\d{4}$/i, '') // Remove trailing card numbers
      .replace(/\s+/g, ' ')
      .trim();

    // Remove transaction IDs and reference numbers
    cleaned = cleaned.replace(/\s*#\d+\s*/g, ' ');
    cleaned = cleaned.replace(/\s*REF\s*\d+\s*/gi, ' ');
    cleaned = cleaned.replace(/\s*TXN\s*\d+\s*/gi, ' ');

    return cleaned.trim();
  }

  private applyMerchantNormalizationPatterns(merchantName: string): string {
    let normalized = merchantName;

    // Common patterns
    const patterns = [
      { pattern: /\s*\d{4}$/, replacement: '' }, // Remove trailing numbers
      { pattern: /\s*#\d+$/, replacement: '' }, // Remove reference numbers
      { pattern: /\s*(INC|LLC|CORP|LTD)\.?\s*$/i, replacement: '' }, // Remove company suffixes
      { pattern: /^(THE\s+)/i, replacement: '' }, // Remove "THE" prefix
      { pattern: /\s+/g, replacement: ' ' }, // Normalize whitespace
    ];

    for (const { pattern, replacement } of patterns) {
      normalized = normalized.replace(pattern, replacement);
    }

    return normalized.trim();
  }

  private evaluateCategorizationRule(transaction: Transaction, rule: CategorizationRule): boolean {
    return rule.conditions.every(condition => {
      const fieldValue = this.getTransactionFieldValue(transaction, condition.field);
      return this.evaluateCondition(fieldValue, condition);
    });
  }

  private getTransactionFieldValue(transaction: Transaction, field: string): string | number {
    switch (field) {
      case 'description':
        return transaction.description;
      case 'merchant':
        return transaction.merchantName || '';
      case 'amount':
        return transaction.amount;
      case 'category':
        return transaction.category || '';
      case 'location':
        return transaction.location ? `${transaction.location.city}, ${transaction.location.state}` : '';
      default:
        return '';
    }
  }

  private evaluateCondition(fieldValue: string | number, condition: CategorizationCondition): boolean {
    const value = String(fieldValue);
    const conditionValue = String(condition.value);

    switch (condition.operator) {
      case 'contains':
        return condition.caseSensitive 
          ? value.includes(conditionValue)
          : value.toLowerCase().includes(conditionValue.toLowerCase());
      
      case 'equals':
        return condition.caseSensitive
          ? value === conditionValue
          : value.toLowerCase() === conditionValue.toLowerCase();
      
      case 'starts_with':
        return condition.caseSensitive
          ? value.startsWith(conditionValue)
          : value.toLowerCase().startsWith(conditionValue.toLowerCase());
      
      case 'ends_with':
        return condition.caseSensitive
          ? value.endsWith(conditionValue)
          : value.toLowerCase().endsWith(conditionValue.toLowerCase());
      
      case 'regex':
        try {
          const regex = new RegExp(conditionValue, condition.caseSensitive ? '' : 'i');
          return regex.test(value);
        } catch {
          return false;
        }
      
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      
      default:
        return false;
    }
  }

  private getDefaultCategory(transaction: Transaction): string {
    // Simple heuristics for default categorization
    const description = transaction.description.toLowerCase();
    
    if (description.includes('grocery') || description.includes('supermarket')) {
      return 'Groceries';
    }
    
    if (description.includes('gas') || description.includes('fuel')) {
      return 'Gas & Fuel';
    }
    
    if (description.includes('restaurant') || description.includes('food')) {
      return 'Restaurants';
    }
    
    if (description.includes('atm') || description.includes('withdrawal')) {
      return 'Cash & ATM';
    }
    
    return 'Other';
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private async enrichLocation(location: object): Promise<object | null> {
    // Placeholder for location enrichment
    // Would integrate with geocoding services
    return null;
  }

  private isRateValid(rate: CurrencyRate): boolean {
    const ageMs = Date.now() - new Date(rate.timestamp).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    return ageMs < maxAgeMs;
  }

  private initializeDefaultRules(): void {
    this.categorizationRules = [
      {
        id: 'rule_grocery',
        name: 'Grocery Stores',
        description: 'Categorize grocery store transactions',
        priority: 100,
        conditions: [
          {
            field: 'description',
            operator: 'contains',
            value: 'grocery',
            caseSensitive: false,
          },
        ],
        category: 'Groceries',
        confidence: 0.9,
        enabled: true,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      },
      {
        id: 'rule_gas',
        name: 'Gas Stations',
        description: 'Categorize gas station transactions',
        priority: 100,
        conditions: [
          {
            field: 'description',
            operator: 'contains',
            value: 'gas',
            caseSensitive: false,
          },
        ],
        category: 'Gas & Fuel',
        confidence: 0.9,
        enabled: true,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      },
      // Add more default rules...
    ];
  }

  private initializeDefaultCategories(): void {
    this.categories = [
      { id: '1', name: 'Groceries', color: '#4CAF50', icon: '🛒', userId: '', createdAt: '', updatedAt: '' },
      { id: '2', name: 'Gas & Fuel', color: '#FF9800', icon: '⛽', userId: '', createdAt: '', updatedAt: '' },
      { id: '3', name: 'Restaurants', color: '#F44336', icon: '🍽️', userId: '', createdAt: '', updatedAt: '' },
      { id: '4', name: 'Shopping', color: '#9C27B0', icon: '🛍️', userId: '', createdAt: '', updatedAt: '' },
      { id: '5', name: 'Entertainment', color: '#E91E63', icon: '🎬', userId: '', createdAt: '', updatedAt: '' },
      { id: '6', name: 'Transportation', color: '#2196F3', icon: '🚗', userId: '', createdAt: '', updatedAt: '' },
      { id: '7', name: 'Bills & Utilities', color: '#607D8B', icon: '💡', userId: '', createdAt: '', updatedAt: '' },
      { id: '8', name: 'Healthcare', color: '#009688', icon: '🏥', userId: '', createdAt: '', updatedAt: '' },
      { id: '9', name: 'Cash & ATM', color: '#795548', icon: '💰', userId: '', createdAt: '', updatedAt: '' },
      { id: '10', name: 'Other', color: '#9E9E9E', icon: '📝', userId: '', createdAt: '', updatedAt: '' },
    ];
  }

  private startCurrencyRateUpdates(): void {
    // Update currency rates every hour
    setInterval(async () => {
      await this.updateCurrencyRates();
    }, 60 * 60 * 1000);

    // Initial update
    this.updateCurrencyRates();
  }

  private async updateCurrencyRates(): Promise<void> {
    try {
      // Placeholder for currency rate API integration
      // Would fetch rates from a service like exchangerate-api.com
      
      // For now, add some mock rates
      const mockRates = [
        { fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.1, source: 'mock' },
        { fromCurrency: 'GBP', toCurrency: 'USD', rate: 1.3, source: 'mock' },
        { fromCurrency: 'CAD', toCurrency: 'USD', rate: 0.8, source: 'mock' },
      ];

      for (const rate of mockRates) {
        const rateKey = `${rate.fromCurrency}_${rate.toCurrency}`;
        this.currencyRates.set(rateKey, {
          ...rate,
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error) {
      console.error('Failed to update currency rates:', error);
    }
  }

  private async loadStoredData(): Promise<void> {
    // Implementation would load stored rules and normalizations
  }

  private async persistCategorizationRule(rule: CategorizationRule): Promise<void> {
    await SecureStorage.storeSecureData(`categorization_rule_${rule.id}`, rule);
  }

  private async persistMerchantNormalization(normalization: MerchantNormalization): Promise<void> {
    await SecureStorage.storeSecureData(`merchant_normalization_${normalization.id}`, normalization);
  }

  /**
   * Add custom categorization rule
   */
  public async addCategorizationRule(rule: Omit<CategorizationRule, 'id' | 'createdAt' | 'usageCount'>): Promise<string> {
    const newRule: CategorizationRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    this.categorizationRules.push(newRule);
    await this.persistCategorizationRule(newRule);

    return newRule.id;
  }

  /**
   * Get categorization rules
   */
  public getCategorizationRules(): CategorizationRule[] {
    return [...this.categorizationRules];
  }

  /**
   * Get merchant normalizations
   */
  public getMerchantNormalizations(): MerchantNormalization[] {
    return Array.from(this.merchantNormalizations.values());
  }
}

// Export singleton instance
export const dataTransformationService = DataTransformationService.getInstance();

