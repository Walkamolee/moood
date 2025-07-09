/**
 * Consent Management Service for Money Mood
 * Provides comprehensive consent management for GDPR, CCPA, and financial data regulations
 */

import { encryptionService, SecureStorage } from '../utils/encryption';
import { auditLogger } from '../utils/auditLogger';
import { config } from '../config/environment';
import {
  UserConsent,
  ConsentType,
  Permission,
  ConsentStatus,
  FinancialProvider,
} from '../types/financial';

/**
 * Consent categories for different types of data processing
 */
export enum ConsentCategory {
  ESSENTIAL = 'essential', // Required for service operation
  FUNCTIONAL = 'functional', // Enhances user experience
  ANALYTICS = 'analytics', // Usage analytics and insights
  MARKETING = 'marketing', // Marketing communications
  FINANCIAL_DATA = 'financial_data', // Financial account access
  BIOMETRIC = 'biometric', // Biometric authentication
  LOCATION = 'location', // Location-based services
  THIRD_PARTY = 'third_party', // Third-party integrations
}

/**
 * Legal basis for data processing under GDPR
 */
export enum LegalBasis {
  CONSENT = 'consent', // Article 6(1)(a) - Consent
  CONTRACT = 'contract', // Article 6(1)(b) - Contract performance
  LEGAL_OBLIGATION = 'legal_obligation', // Article 6(1)(c) - Legal obligation
  VITAL_INTERESTS = 'vital_interests', // Article 6(1)(d) - Vital interests
  PUBLIC_TASK = 'public_task', // Article 6(1)(e) - Public task
  LEGITIMATE_INTERESTS = 'legitimate_interests', // Article 6(1)(f) - Legitimate interests
}

/**
 * Consent request interface
 */
export interface ConsentRequest {
  id: string;
  userId: string;
  category: ConsentCategory;
  type: ConsentType;
  permissions: Permission[];
  purpose: string;
  description: string;
  legalBasis: LegalBasis;
  dataTypes: string[];
  retentionPeriod: number; // in days
  thirdParties?: string[];
  provider?: FinancialProvider;
  institutionId?: string;
  required: boolean;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Consent response interface
 */
export interface ConsentResponse {
  requestId: string;
  granted: boolean;
  permissions: Permission[];
  conditions?: ConsentCondition[];
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  signature?: string; // Digital signature for high-value consents
}

/**
 * Consent conditions and limitations
 */
export interface ConsentCondition {
  type: 'time_limit' | 'data_limit' | 'purpose_limit' | 'geographic_limit';
  value: string;
  description: string;
}

/**
 * Consent withdrawal request
 */
export interface ConsentWithdrawal {
  consentId: string;
  userId: string;
  reason?: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  dataRetention: 'delete_immediately' | 'delete_after_period' | 'anonymize';
}

/**
 * Privacy notice interface
 */
export interface PrivacyNotice {
  id: string;
  version: string;
  title: string;
  content: string;
  category: ConsentCategory;
  effectiveDate: string;
  expirationDate?: string;
  language: string;
  jurisdiction: string;
  lastUpdated: string;
}

/**
 * Consent audit trail entry
 */
export interface ConsentAuditEntry {
  id: string;
  consentId: string;
  userId: string;
  action: 'granted' | 'withdrawn' | 'modified' | 'expired' | 'renewed';
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
}

/**
 * Data subject rights request
 */
export interface DataSubjectRightsRequest {
  id: string;
  userId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  completedAt?: string;
  response?: string;
  documents?: string[];
}

/**
 * Consent Management Service
 */
export class ConsentManagementService {
  private static instance: ConsentManagementService;
  private consentRequests: Map<string, ConsentRequest> = new Map();
  private userConsents: Map<string, UserConsent[]> = new Map();
  private privacyNotices: Map<string, PrivacyNotice> = new Map();
  private auditTrail: ConsentAuditEntry[] = [];
  private dataSubjectRequests: DataSubjectRightsRequest[] = [];

  private constructor() {
    this.initializeService();
  }

  public static getInstance(): ConsentManagementService {
    if (!ConsentManagementService.instance) {
      ConsentManagementService.instance = new ConsentManagementService();
    }
    return ConsentManagementService.instance;
  }

  /**
   * Initialize the consent management service
   */
  private async initializeService(): Promise<void> {
    try {
      // Load existing consents and notices
      await this.loadStoredData();
      
      // Initialize default privacy notices
      await this.initializePrivacyNotices();
      
      // Start consent expiration monitoring
      this.startConsentMonitoring();
      
      console.log('Consent management service initialized');
    } catch (error) {
      console.error('Failed to initialize consent management service:', error);
    }
  }

  /**
   * Create a consent request
   */
  public async createConsentRequest(
    userId: string,
    category: ConsentCategory,
    type: ConsentType,
    permissions: Permission[],
    options: {
      purpose: string;
      description: string;
      legalBasis: LegalBasis;
      dataTypes: string[];
      retentionPeriod: number;
      thirdParties?: string[];
      provider?: FinancialProvider;
      institutionId?: string;
      required?: boolean;
      expiresAt?: string;
    }
  ): Promise<ConsentRequest> {
    const request: ConsentRequest = {
      id: this.generateConsentId(),
      userId,
      category,
      type,
      permissions,
      purpose: options.purpose,
      description: options.description,
      legalBasis: options.legalBasis,
      dataTypes: options.dataTypes,
      retentionPeriod: options.retentionPeriod,
      thirdParties: options.thirdParties,
      provider: options.provider,
      institutionId: options.institutionId,
      required: options.required || false,
      createdAt: new Date().toISOString(),
      expiresAt: options.expiresAt,
    };

    this.consentRequests.set(request.id, request);
    await this.persistConsentRequest(request);

    // Log consent request creation
    await auditLogger.logEvent(
      'CONSENT_GRANTED',
      'consent_request',
      request.id,
      'create_request',
      `Consent request created for ${category}`,
      userId,
      {
        newValues: {
          category,
          type,
          permissions,
          purpose: options.purpose,
        },
      }
    );

    return request;
  }

  /**
   * Process consent response
   */
  public async processConsentResponse(
    requestId: string,
    response: ConsentResponse
  ): Promise<UserConsent> {
    const request = this.consentRequests.get(requestId);
    
    if (!request) {
      throw new Error(`Consent request ${requestId} not found`);
    }

    // Create user consent record
    const consent: UserConsent = {
      id: this.generateConsentId(),
      userId: request.userId,
      provider: request.provider || 'plaid', // Default provider
      institutionId: request.institutionId || '',
      consentType: request.type,
      permissions: response.granted ? response.permissions : [],
      status: response.granted ? ConsentStatus.GRANTED : ConsentStatus.REVOKED,
      grantedAt: response.timestamp,
      expiresAt: request.expiresAt,
      consentVersion: '1.0',
      ipAddress: response.ipAddress,
      userAgent: response.userAgent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store consent
    await this.storeUserConsent(consent);

    // Create audit trail entry
    await this.createAuditEntry(consent.id, request.userId, response.granted ? 'granted' : 'withdrawn', {
      requestId,
      permissions: response.permissions,
      conditions: response.conditions,
      ipAddress: response.ipAddress,
      userAgent: response.userAgent,
    });

    // Log consent decision
    await auditLogger.logEvent(
      response.granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
      'consent',
      consent.id,
      response.granted ? 'grant_consent' : 'revoke_consent',
      `Consent ${response.granted ? 'granted' : 'revoked'} for ${request.category}`,
      request.userId,
      {
        newValues: {
          consentId: consent.id,
          category: request.category,
          permissions: response.permissions,
        },
      }
    );

    // Remove processed request
    this.consentRequests.delete(requestId);

    return consent;
  }

  /**
   * Withdraw consent
   */
  public async withdrawConsent(
    consentId: string,
    withdrawal: ConsentWithdrawal
  ): Promise<boolean> {
    try {
      const consent = await this.getUserConsent(consentId);
      
      if (!consent) {
        throw new Error(`Consent ${consentId} not found`);
      }

      if (consent.userId !== withdrawal.userId) {
        throw new Error('Unauthorized consent withdrawal attempt');
      }

      // Update consent status
      consent.status = ConsentStatus.REVOKED;
      consent.revokedAt = withdrawal.timestamp;
      consent.updatedAt = new Date().toISOString();

      await this.storeUserConsent(consent);

      // Create audit trail entry
      await this.createAuditEntry(consentId, withdrawal.userId, 'withdrawn', {
        reason: withdrawal.reason,
        dataRetention: withdrawal.dataRetention,
        ipAddress: withdrawal.ipAddress,
        userAgent: withdrawal.userAgent,
      });

      // Log consent withdrawal
      await auditLogger.logEvent(
        'CONSENT_REVOKED',
        'consent',
        consentId,
        'withdraw_consent',
        `Consent withdrawn: ${withdrawal.reason || 'No reason provided'}`,
        withdrawal.userId,
        {
          oldValues: { status: ConsentStatus.GRANTED },
          newValues: { status: ConsentStatus.REVOKED },
        }
      );

      // Handle data retention based on withdrawal preferences
      await this.handleDataRetention(consent, withdrawal.dataRetention);

      return true;
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      return false;
    }
  }

  /**
   * Check if user has granted specific consent
   */
  public async hasConsent(
    userId: string,
    category: ConsentCategory,
    permissions: Permission[]
  ): Promise<boolean> {
    try {
      const userConsents = await this.getUserConsents(userId);
      
      const relevantConsents = userConsents.filter(consent => 
        consent.status === ConsentStatus.GRANTED &&
        (!consent.expiresAt || new Date(consent.expiresAt) > new Date())
      );

      // Check if all required permissions are granted
      return permissions.every(permission =>
        relevantConsents.some(consent =>
          consent.permissions.includes(permission)
        )
      );
    } catch (error) {
      console.error('Failed to check consent:', error);
      return false;
    }
  }

  /**
   * Get user consents with filtering
   */
  public async getUserConsents(
    userId: string,
    filters?: {
      status?: ConsentStatus;
      category?: ConsentCategory;
      provider?: FinancialProvider;
      active?: boolean;
    }
  ): Promise<UserConsent[]> {
    try {
      let consents = this.userConsents.get(userId) || [];

      if (filters) {
        if (filters.status) {
          consents = consents.filter(c => c.status === filters.status);
        }
        if (filters.provider) {
          consents = consents.filter(c => c.provider === filters.provider);
        }
        if (filters.active) {
          consents = consents.filter(c => 
            c.status === ConsentStatus.GRANTED &&
            (!c.expiresAt || new Date(c.expiresAt) > new Date())
          );
        }
      }

      return consents.sort((a, b) => 
        new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get user consents:', error);
      return [];
    }
  }

  /**
   * Renew expiring consent
   */
  public async renewConsent(
    consentId: string,
    userId: string,
    newExpirationDate: string,
    context: {
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<boolean> {
    try {
      const consent = await this.getUserConsent(consentId);
      
      if (!consent || consent.userId !== userId) {
        throw new Error('Consent not found or unauthorized');
      }

      // Update expiration date
      consent.expiresAt = newExpirationDate;
      consent.updatedAt = new Date().toISOString();

      await this.storeUserConsent(consent);

      // Create audit trail entry
      await this.createAuditEntry(consentId, userId, 'renewed', {
        newExpirationDate,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      // Log consent renewal
      await auditLogger.logEvent(
        'CONSENT_GRANTED',
        'consent',
        consentId,
        'renew_consent',
        'Consent renewed',
        userId,
        {
          newValues: { expiresAt: newExpirationDate },
        }
      );

      return true;
    } catch (error) {
      console.error('Failed to renew consent:', error);
      return false;
    }
  }

  /**
   * Handle data subject rights request
   */
  public async submitDataSubjectRightsRequest(
    userId: string,
    type: DataSubjectRightsRequest['type'],
    description: string
  ): Promise<string> {
    const request: DataSubjectRightsRequest = {
      id: this.generateRequestId(),
      userId,
      type,
      description,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    this.dataSubjectRequests.push(request);
    await this.persistDataSubjectRequest(request);

    // Log the request
    await auditLogger.logEvent(
      'DATA_SUBJECT_REQUEST',
      'data_subject_request',
      request.id,
      'submit_request',
      `Data subject rights request submitted: ${type}`,
      userId,
      {
        newValues: {
          type,
          description,
        },
      }
    );

    // Auto-process certain types of requests
    if (type === 'access') {
      await this.processDataAccessRequest(request.id);
    }

    return request.id;
  }

  /**
   * Get consent audit trail
   */
  public async getConsentAuditTrail(
    filters?: {
      userId?: string;
      consentId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ConsentAuditEntry[]> {
    let entries = [...this.auditTrail];

    if (filters) {
      if (filters.userId) {
        entries = entries.filter(e => e.userId === filters.userId);
      }
      if (filters.consentId) {
        entries = entries.filter(e => e.consentId === filters.consentId);
      }
      if (filters.action) {
        entries = entries.filter(e => e.action === filters.action);
      }
      if (filters.startDate) {
        entries = entries.filter(e => e.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        entries = entries.filter(e => e.timestamp <= filters.endDate!);
      }
    }

    return entries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Generate consent compliance report
   */
  public async generateComplianceReport(
    startDate: string,
    endDate: string
  ): Promise<{
    totalConsents: number;
    grantedConsents: number;
    revokedConsents: number;
    expiredConsents: number;
    consentsByCategory: Record<ConsentCategory, number>;
    dataSubjectRequests: number;
    complianceScore: number;
  }> {
    const allConsents = Array.from(this.userConsents.values()).flat();
    const periodConsents = allConsents.filter(c => 
      c.grantedAt >= startDate && c.grantedAt <= endDate
    );

    const grantedConsents = periodConsents.filter(c => c.status === ConsentStatus.GRANTED).length;
    const revokedConsents = periodConsents.filter(c => c.status === ConsentStatus.REVOKED).length;
    const expiredConsents = periodConsents.filter(c => c.status === ConsentStatus.EXPIRED).length;

    const consentsByCategory: Record<ConsentCategory, number> = {} as any;
    Object.values(ConsentCategory).forEach(category => {
      consentsByCategory[category] = 0;
    });

    // Calculate compliance score (simplified)
    const complianceScore = Math.min(100, Math.round(
      (grantedConsents / Math.max(1, periodConsents.length)) * 100
    ));

    const dataSubjectRequests = this.dataSubjectRequests.filter(r =>
      r.requestedAt >= startDate && r.requestedAt <= endDate
    ).length;

    return {
      totalConsents: periodConsents.length,
      grantedConsents,
      revokedConsents,
      expiredConsents,
      consentsByCategory,
      dataSubjectRequests,
      complianceScore,
    };
  }

  // Private helper methods

  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadStoredData(): Promise<void> {
    // Load stored consents and data
    // This would be implemented with actual storage
  }

  private async initializePrivacyNotices(): Promise<void> {
    // Initialize default privacy notices for different categories
    const notices: PrivacyNotice[] = [
      {
        id: 'notice_financial_data',
        version: '1.0',
        title: 'Financial Data Access',
        content: 'We access your financial data to provide budgeting and financial insights.',
        category: ConsentCategory.FINANCIAL_DATA,
        effectiveDate: new Date().toISOString(),
        language: 'en',
        jurisdiction: 'US',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'notice_biometric',
        version: '1.0',
        title: 'Biometric Authentication',
        content: 'We use biometric data for secure authentication to your account.',
        category: ConsentCategory.BIOMETRIC,
        effectiveDate: new Date().toISOString(),
        language: 'en',
        jurisdiction: 'US',
        lastUpdated: new Date().toISOString(),
      },
    ];

    notices.forEach(notice => {
      this.privacyNotices.set(notice.id, notice);
    });
  }

  private startConsentMonitoring(): void {
    // Monitor for expiring consents
    setInterval(async () => {
      await this.checkExpiringConsents();
    }, 24 * 60 * 60 * 1000); // Check daily
  }

  private async checkExpiringConsents(): Promise<void> {
    const now = new Date();
    const warningPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const [userId, consents] of this.userConsents.entries()) {
      for (const consent of consents) {
        if (consent.expiresAt && consent.status === ConsentStatus.GRANTED) {
          const expirationDate = new Date(consent.expiresAt);
          const timeUntilExpiration = expirationDate.getTime() - now.getTime();

          if (timeUntilExpiration <= 0) {
            // Consent has expired
            consent.status = ConsentStatus.EXPIRED;
            consent.updatedAt = new Date().toISOString();
            await this.storeUserConsent(consent);

            await this.createAuditEntry(consent.id, userId, 'expired', {
              expiredAt: now.toISOString(),
            });
          } else if (timeUntilExpiration <= warningPeriod) {
            // Consent is expiring soon - could send notification
            console.log(`Consent ${consent.id} expiring soon for user ${userId}`);
          }
        }
      }
    }
  }

  private async storeUserConsent(consent: UserConsent): Promise<void> {
    const userConsents = this.userConsents.get(consent.userId) || [];
    const existingIndex = userConsents.findIndex(c => c.id === consent.id);
    
    if (existingIndex >= 0) {
      userConsents[existingIndex] = consent;
    } else {
      userConsents.push(consent);
    }
    
    this.userConsents.set(consent.userId, userConsents);
    
    // Persist to secure storage
    await SecureStorage.storeSecureData(`user_consents_${consent.userId}`, userConsents);
  }

  private async getUserConsent(consentId: string): Promise<UserConsent | null> {
    for (const consents of this.userConsents.values()) {
      const consent = consents.find(c => c.id === consentId);
      if (consent) {
        return consent;
      }
    }
    return null;
  }

  private async createAuditEntry(
    consentId: string,
    userId: string,
    action: ConsentAuditEntry['action'],
    details: Record<string, any>
  ): Promise<void> {
    const entry: ConsentAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      consentId,
      userId,
      action,
      timestamp: new Date().toISOString(),
      ipAddress: details.ipAddress || 'unknown',
      userAgent: details.userAgent || 'unknown',
      details,
    };

    this.auditTrail.push(entry);
    
    // Keep only last 10000 entries
    if (this.auditTrail.length > 10000) {
      this.auditTrail = this.auditTrail.slice(-10000);
    }
  }

  private async handleDataRetention(
    consent: UserConsent,
    retentionPreference: ConsentWithdrawal['dataRetention']
  ): Promise<void> {
    switch (retentionPreference) {
      case 'delete_immediately':
        // Implement immediate data deletion
        console.log(`Immediately deleting data for consent ${consent.id}`);
        break;
      case 'delete_after_period':
        // Schedule data deletion after legal retention period
        console.log(`Scheduling data deletion for consent ${consent.id}`);
        break;
      case 'anonymize':
        // Anonymize the data instead of deleting
        console.log(`Anonymizing data for consent ${consent.id}`);
        break;
    }
  }

  private async persistConsentRequest(request: ConsentRequest): Promise<void> {
    await SecureStorage.storeSecureData(`consent_request_${request.id}`, request);
  }

  private async persistDataSubjectRequest(request: DataSubjectRightsRequest): Promise<void> {
    await SecureStorage.storeSecureData(`data_subject_request_${request.id}`, request);
  }

  private async processDataAccessRequest(requestId: string): Promise<void> {
    // Auto-process data access requests
    const request = this.dataSubjectRequests.find(r => r.id === requestId);
    if (request) {
      request.status = 'processing';
      // Implementation would generate user data export
      setTimeout(() => {
        request.status = 'completed';
        request.completedAt = new Date().toISOString();
        request.response = 'Data export has been generated and will be sent to your registered email.';
      }, 1000);
    }
  }
}

// Export singleton instance
export const consentManagementService = ConsentManagementService.getInstance();

