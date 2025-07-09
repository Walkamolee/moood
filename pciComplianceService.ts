/**
 * PCI DSS Compliance Service for Money Mood
 * Implements Payment Card Industry Data Security Standard requirements
 */

import { encryptionService, SecureStorage, DataSanitizer } from '../utils/encryption';
import { auditLogger } from '../utils/auditLogger';
import { config } from '../config/environment';

/**
 * Data classification levels according to PCI DSS
 */
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted', // PCI data
}

/**
 * PCI DSS data types that require special handling
 */
export enum PCIDataType {
  PRIMARY_ACCOUNT_NUMBER = 'pan', // Credit card number
  CARDHOLDER_NAME = 'cardholder_name',
  EXPIRATION_DATE = 'expiration_date',
  SERVICE_CODE = 'service_code',
  AUTHENTICATION_DATA = 'authentication_data', // CVV, PIN
  MAGNETIC_STRIPE_DATA = 'magnetic_stripe_data',
  CHIP_DATA = 'chip_data',
}

/**
 * Access control levels for PCI data
 */
export enum AccessLevel {
  NO_ACCESS = 'no_access',
  READ_ONLY = 'read_only',
  READ_WRITE = 'read_write',
  ADMIN = 'admin',
}

/**
 * PCI DSS compliance requirements interface
 */
export interface PCIComplianceRequirement {
  id: string;
  category: string;
  requirement: string;
  description: string;
  implemented: boolean;
  lastVerified: string;
  evidence?: string[];
}

/**
 * Secure data handling protocols
 */
export interface SecureDataProtocol {
  dataType: PCIDataType;
  classification: DataClassification;
  encryptionRequired: boolean;
  accessLevel: AccessLevel;
  retentionPeriod: number; // in days
  auditRequired: boolean;
  maskingRules: MaskingRule[];
}

/**
 * Data masking rules
 */
export interface MaskingRule {
  field: string;
  maskType: 'partial' | 'full' | 'tokenize';
  visibleCharacters?: number;
  maskCharacter?: string;
}

/**
 * Security incident interface
 */
export interface SecurityIncident {
  id: string;
  type: SecurityIncidentType;
  severity: SecuritySeverity;
  description: string;
  affectedData: string[];
  detectedAt: string;
  resolvedAt?: string;
  status: IncidentStatus;
  responseActions: string[];
  userId?: string;
}

export enum SecurityIncidentType {
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH = 'data_breach',
  MALWARE_DETECTION = 'malware_detection',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  POLICY_VIOLATION = 'policy_violation',
  SYSTEM_COMPROMISE = 'system_compromise',
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum IncidentStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/**
 * PCI DSS Compliance Service
 */
export class PCIComplianceService {
  private static instance: PCIComplianceService;
  private dataProtocols: Map<PCIDataType, SecureDataProtocol>;
  private complianceRequirements: PCIComplianceRequirement[];
  private securityIncidents: SecurityIncident[] = [];

  private constructor() {
    this.dataProtocols = new Map();
    this.complianceRequirements = [];
    this.initializeDataProtocols();
    this.initializeComplianceRequirements();
  }

  public static getInstance(): PCIComplianceService {
    if (!PCIComplianceService.instance) {
      PCIComplianceService.instance = new PCIComplianceService();
    }
    return PCIComplianceService.instance;
  }

  /**
   * Initialize secure data handling protocols
   */
  private initializeDataProtocols(): void {
    // Primary Account Number (PAN) - Most sensitive
    this.dataProtocols.set(PCIDataType.PRIMARY_ACCOUNT_NUMBER, {
      dataType: PCIDataType.PRIMARY_ACCOUNT_NUMBER,
      classification: DataClassification.RESTRICTED,
      encryptionRequired: true,
      accessLevel: AccessLevel.ADMIN,
      retentionPeriod: 365, // 1 year
      auditRequired: true,
      maskingRules: [
        {
          field: 'cardNumber',
          maskType: 'partial',
          visibleCharacters: 4,
          maskCharacter: '*',
        },
      ],
    });

    // Cardholder Name
    this.dataProtocols.set(PCIDataType.CARDHOLDER_NAME, {
      dataType: PCIDataType.CARDHOLDER_NAME,
      classification: DataClassification.CONFIDENTIAL,
      encryptionRequired: true,
      accessLevel: AccessLevel.READ_ONLY,
      retentionPeriod: 365,
      auditRequired: true,
      maskingRules: [
        {
          field: 'cardholderName',
          maskType: 'partial',
          visibleCharacters: 2,
          maskCharacter: '*',
        },
      ],
    });

    // Authentication Data (CVV, PIN) - Never store
    this.dataProtocols.set(PCIDataType.AUTHENTICATION_DATA, {
      dataType: PCIDataType.AUTHENTICATION_DATA,
      classification: DataClassification.RESTRICTED,
      encryptionRequired: true,
      accessLevel: AccessLevel.NO_ACCESS, // Never store
      retentionPeriod: 0, // Never retain
      auditRequired: true,
      maskingRules: [
        {
          field: 'cvv',
          maskType: 'full',
          maskCharacter: '*',
        },
      ],
    });

    // Expiration Date
    this.dataProtocols.set(PCIDataType.EXPIRATION_DATE, {
      dataType: PCIDataType.EXPIRATION_DATE,
      classification: DataClassification.CONFIDENTIAL,
      encryptionRequired: true,
      accessLevel: AccessLevel.READ_ONLY,
      retentionPeriod: 365,
      auditRequired: true,
      maskingRules: [
        {
          field: 'expirationDate',
          maskType: 'partial',
          visibleCharacters: 2,
          maskCharacter: '*',
        },
      ],
    });
  }

  /**
   * Initialize PCI DSS compliance requirements
   */
  private initializeComplianceRequirements(): void {
    this.complianceRequirements = [
      {
        id: 'req_1',
        category: 'Network Security',
        requirement: '1.1 - Install and maintain firewall configuration',
        description: 'Establish firewall and router configuration standards',
        implemented: false,
        lastVerified: '',
      },
      {
        id: 'req_2',
        category: 'System Configuration',
        requirement: '2.1 - Change vendor-supplied defaults',
        description: 'Always change vendor-supplied defaults and remove unnecessary default accounts',
        implemented: false,
        lastVerified: '',
      },
      {
        id: 'req_3',
        category: 'Data Protection',
        requirement: '3.1 - Protect stored cardholder data',
        description: 'Keep cardholder data storage to a minimum',
        implemented: false,
        lastVerified: '',
      },
      {
        id: 'req_4',
        category: 'Encryption',
        requirement: '4.1 - Encrypt transmission of cardholder data',
        description: 'Encrypt transmission of cardholder data across open, public networks',
        implemented: false,
        lastVerified: '',
      },
      {
        id: 'req_5',
        category: 'Antivirus',
        requirement: '5.1 - Deploy anti-virus software',
        description: 'Protect all systems against malware',
        implemented: false,
        lastVerified: '',
      },
      {
        id: 'req_6',
        category: 'Secure Development',
        requirement: '6.1 - Develop secure systems and applications',
        description: 'Develop and maintain secure systems and applications',
        implemented: false,
        lastVerified: '',
      },
      {
        id: 'req_7',
        category: 'Access Control',
        requirement: '7.1 - Restrict access to cardholder data',
        description: 'Restrict access to cardholder data by business need to know',
        implemented: false,
        lastVerified: '',
      },
      {
        id: 'req_8',
        category: 'User Management',
        requirement: '8.1 - Identify and authenticate access',
        description: 'Identify and authenticate access to system components',
        implemented: false,
        lastVerified: '',
      },
      {
        id: 'req_9',
        category: 'Physical Access',
        requirement: '9.1 - Restrict physical access',
        description: 'Restrict physical access to cardholder data',
        implemented: false,
        lastVerified: '',
      },
      {
        id: 'req_10',
        category: 'Monitoring',
        requirement: '10.1 - Track and monitor access',
        description: 'Track and monitor all access to network resources and cardholder data',
        implemented: false,
        lastVerified: '',
      },
      {
        id: 'req_11',
        category: 'Security Testing',
        requirement: '11.1 - Test security systems',
        description: 'Regularly test security systems and processes',
        implemented: false,
        lastVerified: '',
      },
      {
        id: 'req_12',
        category: 'Information Security Policy',
        requirement: '12.1 - Maintain information security policy',
        description: 'Maintain a policy that addresses information security',
        implemented: false,
        lastVerified: '',
      },
    ];
  }

  /**
   * Classify data according to PCI DSS requirements
   */
  public classifyData(data: any, dataType: PCIDataType): DataClassification {
    const protocol = this.dataProtocols.get(dataType);
    return protocol?.classification || DataClassification.INTERNAL;
  }

  /**
   * Check if data requires encryption
   */
  public requiresEncryption(dataType: PCIDataType): boolean {
    const protocol = this.dataProtocols.get(dataType);
    return protocol?.encryptionRequired || false;
  }

  /**
   * Get access level for data type
   */
  public getAccessLevel(dataType: PCIDataType): AccessLevel {
    const protocol = this.dataProtocols.get(dataType);
    return protocol?.accessLevel || AccessLevel.NO_ACCESS;
  }

  /**
   * Securely handle PCI data according to protocols
   */
  public async handlePCIData(
    data: any,
    dataType: PCIDataType,
    operation: 'store' | 'retrieve' | 'transmit' | 'delete',
    userId: string
  ): Promise<any> {
    const protocol = this.dataProtocols.get(dataType);
    
    if (!protocol) {
      throw new Error(`No protocol defined for data type: ${dataType}`);
    }

    // Log the operation
    await auditLogger.logSecurityEvent(
      'pci_data_access',
      `PCI data ${operation} operation for ${dataType}`,
      userId,
      'high',
      {
        dataType,
        operation,
        classification: protocol.classification,
      }
    );

    switch (operation) {
      case 'store':
        return this.secureStore(data, protocol, userId);
      case 'retrieve':
        return this.secureRetrieve(data, protocol, userId);
      case 'transmit':
        return this.secureTransmit(data, protocol, userId);
      case 'delete':
        return this.secureDelete(data, protocol, userId);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Securely store PCI data
   */
  private async secureStore(data: any, protocol: SecureDataProtocol, userId: string): Promise<string> {
    // Check if data should be stored at all
    if (protocol.accessLevel === AccessLevel.NO_ACCESS) {
      throw new Error(`Data type ${protocol.dataType} should never be stored`);
    }

    // Encrypt if required
    let processedData = data;
    if (protocol.encryptionRequired) {
      processedData = encryptionService.encryptObject(data);
    }

    // Generate storage key
    const storageKey = `pci_${protocol.dataType}_${Date.now()}_${userId}`;

    // Store with expiration
    await SecureStorage.storeSecureData(storageKey, {
      data: processedData,
      dataType: protocol.dataType,
      classification: protocol.classification,
      storedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + protocol.retentionPeriod * 24 * 60 * 60 * 1000).toISOString(),
      userId,
    });

    return storageKey;
  }

  /**
   * Securely retrieve PCI data
   */
  private async secureRetrieve(storageKey: string, protocol: SecureDataProtocol, userId: string): Promise<any> {
    const storedData = await SecureStorage.retrieveSecureData(storageKey);
    
    if (!storedData) {
      return null;
    }

    // Check expiration
    if (new Date(storedData.expiresAt) < new Date()) {
      await SecureStorage.removeSecureData(storageKey);
      throw new Error('Data has expired and been automatically deleted');
    }

    // Decrypt if needed
    let data = storedData.data;
    if (protocol.encryptionRequired && typeof data === 'string') {
      data = encryptionService.decryptObject(data);
    }

    return data;
  }

  /**
   * Securely transmit PCI data
   */
  private async secureTransmit(data: any, protocol: SecureDataProtocol, userId: string): Promise<any> {
    // Always encrypt for transmission
    const encryptedData = encryptionService.encryptObject(data);
    
    // Add transmission metadata
    return {
      data: encryptedData,
      dataType: protocol.dataType,
      classification: protocol.classification,
      transmittedAt: new Date().toISOString(),
      transmittedBy: userId,
      integrity: encryptionService.generateHash(JSON.stringify(data)),
    };
  }

  /**
   * Securely delete PCI data
   */
  private async secureDelete(storageKey: string, protocol: SecureDataProtocol, userId: string): Promise<boolean> {
    try {
      // Overwrite data multiple times for secure deletion
      for (let i = 0; i < 3; i++) {
        await SecureStorage.storeSecureData(storageKey, {
          data: encryptionService.generateSecureToken(1024),
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        });
      }

      // Finally remove the key
      await SecureStorage.removeSecureData(storageKey);
      
      return true;
    } catch (error) {
      console.error('Secure deletion failed:', error);
      return false;
    }
  }

  /**
   * Apply data masking according to rules
   */
  public maskData(data: any, dataType: PCIDataType): any {
    const protocol = this.dataProtocols.get(dataType);
    
    if (!protocol || !protocol.maskingRules.length) {
      return data;
    }

    const maskedData = { ...data };

    protocol.maskingRules.forEach(rule => {
      if (maskedData[rule.field]) {
        maskedData[rule.field] = this.applyMaskingRule(maskedData[rule.field], rule);
      }
    });

    return maskedData;
  }

  /**
   * Apply individual masking rule
   */
  private applyMaskingRule(value: string, rule: MaskingRule): string {
    switch (rule.maskType) {
      case 'full':
        return rule.maskCharacter?.repeat(value.length) || '****';
      
      case 'partial':
        const visibleChars = rule.visibleCharacters || 4;
        const maskChar = rule.maskCharacter || '*';
        
        if (value.length <= visibleChars) {
          return maskChar.repeat(value.length);
        }
        
        const visiblePart = value.slice(-visibleChars);
        const maskedPart = maskChar.repeat(value.length - visibleChars);
        return maskedPart + visiblePart;
      
      case 'tokenize':
        // Generate a consistent token for the same value
        const token = encryptionService.generateHash(value).substring(0, 8);
        return `TOKEN_${token}`;
      
      default:
        return value;
    }
  }

  /**
   * Validate PCI DSS compliance
   */
  public async validateCompliance(): Promise<{
    compliant: boolean;
    score: number;
    failedRequirements: PCIComplianceRequirement[];
    recommendations: string[];
  }> {
    const implementedCount = this.complianceRequirements.filter(req => req.implemented).length;
    const totalCount = this.complianceRequirements.length;
    const score = Math.round((implementedCount / totalCount) * 100);
    const compliant = score >= 100; // Must implement all requirements

    const failedRequirements = this.complianceRequirements.filter(req => !req.implemented);
    
    const recommendations = [
      'Implement all failed PCI DSS requirements',
      'Conduct regular security assessments',
      'Maintain up-to-date security documentation',
      'Train staff on PCI DSS requirements',
      'Implement continuous monitoring',
    ];

    return {
      compliant,
      score,
      failedRequirements,
      recommendations,
    };
  }

  /**
   * Report security incident
   */
  public async reportSecurityIncident(
    type: SecurityIncidentType,
    severity: SecuritySeverity,
    description: string,
    affectedData: string[],
    userId?: string
  ): Promise<string> {
    const incident: SecurityIncident = {
      id: `incident_${Date.now()}`,
      type,
      severity,
      description,
      affectedData,
      detectedAt: new Date().toISOString(),
      status: IncidentStatus.DETECTED,
      responseActions: [],
      userId,
    };

    this.securityIncidents.push(incident);

    // Log the incident
    await auditLogger.logSecurityEvent(
      'security_incident',
      `Security incident reported: ${description}`,
      userId || 'system',
      severity,
      {
        incidentId: incident.id,
        type,
        affectedData,
      }
    );

    // Auto-respond based on severity
    if (severity === SecuritySeverity.CRITICAL) {
      await this.initiateIncidentResponse(incident.id);
    }

    return incident.id;
  }

  /**
   * Initiate incident response
   */
  private async initiateIncidentResponse(incidentId: string): Promise<void> {
    const incident = this.securityIncidents.find(i => i.id === incidentId);
    
    if (!incident) {
      return;
    }

    // Update incident status
    incident.status = IncidentStatus.INVESTIGATING;
    incident.responseActions.push('Automated incident response initiated');

    // Implement automated response actions
    const responseActions = [
      'Isolate affected systems',
      'Preserve evidence',
      'Notify security team',
      'Begin forensic analysis',
      'Implement containment measures',
    ];

    incident.responseActions.push(...responseActions);

    // Log response actions
    await auditLogger.logSecurityEvent(
      'incident_response',
      `Incident response initiated for ${incidentId}`,
      'system',
      'high',
      {
        incidentId,
        responseActions,
      }
    );
  }

  /**
   * Get compliance status
   */
  public getComplianceStatus(): {
    requirements: PCIComplianceRequirement[];
    implementedCount: number;
    totalCount: number;
    compliancePercentage: number;
  } {
    const implementedCount = this.complianceRequirements.filter(req => req.implemented).length;
    const totalCount = this.complianceRequirements.length;
    const compliancePercentage = Math.round((implementedCount / totalCount) * 100);

    return {
      requirements: this.complianceRequirements,
      implementedCount,
      totalCount,
      compliancePercentage,
    };
  }

  /**
   * Update compliance requirement status
   */
  public updateComplianceRequirement(
    requirementId: string,
    implemented: boolean,
    evidence?: string[]
  ): boolean {
    const requirement = this.complianceRequirements.find(req => req.id === requirementId);
    
    if (!requirement) {
      return false;
    }

    requirement.implemented = implemented;
    requirement.lastVerified = new Date().toISOString();
    
    if (evidence) {
      requirement.evidence = evidence;
    }

    return true;
  }

  /**
   * Get security incidents
   */
  public getSecurityIncidents(filters?: {
    severity?: SecuritySeverity;
    status?: IncidentStatus;
    type?: SecurityIncidentType;
    limit?: number;
  }): SecurityIncident[] {
    let incidents = [...this.securityIncidents];

    if (filters) {
      if (filters.severity) {
        incidents = incidents.filter(i => i.severity === filters.severity);
      }
      if (filters.status) {
        incidents = incidents.filter(i => i.status === filters.status);
      }
      if (filters.type) {
        incidents = incidents.filter(i => i.type === filters.type);
      }
      if (filters.limit) {
        incidents = incidents.slice(0, filters.limit);
      }
    }

    return incidents.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }
}

// Export singleton instance
export const pciComplianceService = PCIComplianceService.getInstance();

