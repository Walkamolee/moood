 * Audit Logger for Money Mood
 * Provides comprehensive audit logging for compliance and security
 */

import { AuditLogEntry, AuditEventType } from '../types/financial';
import { encryptionService, SecureStorage, DataSanitizer } from './encryption';
import { config } from '../config/environment';

/**
 * Audit Logger Service
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private logQueue: AuditLogEntry[] = [];
  private isProcessing = false;
  private readonly maxQueueSize = 100;
  private readonly batchSize = 10;

  private constructor() {
    // Start processing queue
    this.startQueueProcessor();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }