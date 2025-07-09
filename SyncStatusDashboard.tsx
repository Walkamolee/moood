/**
 * Sync Status Dashboard for Money Mood
 * Real-time display of financial data synchronization status
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { dataSynchronizationService, SyncFrequency } from '../services/dataSynchronizationService';
import { 
  SyncJob, 
  SyncJobStatus, 
  SyncStatistics, 
  DataConflict,
  FinancialProvider 
} from '../types/financial';

/**
 * Sync Status Dashboard Props
 */
interface SyncStatusDashboardProps {
  userId: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sync status indicator component
 */
const SyncStatusIndicator: React.FC<{ status: SyncJobStatus }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case SyncJobStatus.COMPLETED:
        return '#4CAF50';
      case SyncJobStatus.RUNNING:
        return '#FF9800';
      case SyncJobStatus.FAILED:
        return '#F44336';
      case SyncJobStatus.PENDING:
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case SyncJobStatus.COMPLETED:
        return '✓';
      case SyncJobStatus.RUNNING:
        return '⟳';
      case SyncJobStatus.FAILED:
        return '✗';
      case SyncJobStatus.PENDING:
        return '⏳';
      default:
        return '?';
    }
  };

  return (
    <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
      <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
    </View>
  );
};

/**
 * Sync progress bar component
 */
const SyncProgressBar: React.FC<{ 
  progress: number; 
  status: SyncJobStatus;
  animated?: boolean;
}> = ({ progress, status, animated = true }) => {
  const getProgressColor = () => {
    switch (status) {
      case SyncJobStatus.COMPLETED:
        return '#4CAF50';
      case SyncJobStatus.RUNNING:
        return '#FF9800';
      case SyncJobStatus.FAILED:
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  return (
    <View style={styles.progressBarContainer}>
      <View 
        style={[
          styles.progressBar,
          { 
            width: `${Math.min(progress, 100)}%`,
            backgroundColor: getProgressColor(),
          }
        ]}
      />
    </View>
  );
};

/**
 * Sync job card component
 */
const SyncJobCard: React.FC<{ job: SyncJob; onRetry?: () => void }> = ({ job, onRetry }) => {
  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return 'Not started';
    if (!endTime && job.status === SyncJobStatus.RUNNING) return 'In progress...';
    if (!endTime) return 'Unknown';
    
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    return `${Math.round(duration / 1000)}s`;
  };

  const getProgress = () => {
    if (job.status === SyncJobStatus.COMPLETED) return 100;
    if (job.status === SyncJobStatus.RUNNING) return 50; // Estimate
    if (job.status === SyncJobStatus.FAILED) return 0;
    return 0;
  };

  return (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobTitleContainer}>
          <SyncStatusIndicator status={job.status} />
          <View style={styles.jobTitleText}>
            <Text style={styles.jobTitle}>{job.type.replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.jobProvider}>{job.provider}</Text>
          </View>
        </View>
        <Text style={styles.jobTime}>
          {formatDuration(job.startedAt, job.completedAt)}
        </Text>
      </View>

      <SyncProgressBar 
        progress={getProgress()} 
        status={job.status}
      />

      <View style={styles.jobDetails}>
        <Text style={styles.jobDetailText}>
          Created: {new Date(job.createdAt).toLocaleString()}
        </Text>
        {job.error && (
          <Text style={styles.errorText}>Error: {job.error}</Text>
        )}
      </View>

      {job.status === SyncJobStatus.FAILED && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Sync statistics component
 */
const SyncStatisticsCard: React.FC<{ statistics: SyncStatistics }> = ({ statistics }) => {
  const successRate = statistics.totalSyncs > 0 
    ? Math.round((statistics.successfulSyncs / statistics.totalSyncs) * 100)
    : 0;

  return (
    <View style={styles.statisticsCard}>
      <Text style={styles.statisticsTitle}>Sync Statistics</Text>
      
      <View style={styles.statisticsGrid}>
        <View style={styles.statisticsItem}>
          <Text style={styles.statisticsValue}>{statistics.totalSyncs}</Text>
          <Text style={styles.statisticsLabel}>Total Syncs</Text>
        </View>
        
        <View style={styles.statisticsItem}>
          <Text style={[styles.statisticsValue, { color: '#4CAF50' }]}>
            {successRate}%
          </Text>
          <Text style={styles.statisticsLabel}>Success Rate</Text>
        </View>
        
        <View style={styles.statisticsItem}>
          <Text style={styles.statisticsValue}>
            {Math.round(statistics.averageDuration / 1000)}s
          </Text>
          <Text style={styles.statisticsLabel}>Avg Duration</Text>
        </View>
        
        <View style={styles.statisticsItem}>
          <Text style={styles.statisticsValue}>{statistics.totalRecordsProcessed}</Text>
          <Text style={styles.statisticsLabel}>Records Processed</Text>
        </View>
      </View>

      {statistics.lastSuccessfulSync && (
        <Text style={styles.lastSyncText}>
          Last successful sync: {new Date(statistics.lastSuccessfulSync).toLocaleString()}
        </Text>
      )}
    </View>
  );
};

/**
 * Data conflicts component
 */
const DataConflictsCard: React.FC<{ 
  conflicts: DataConflict[]; 
  onResolveConflict?: (conflictId: string) => void;
}> = ({ conflicts, onResolveConflict }) => {
  if (conflicts.length === 0) {
    return (
      <View style={styles.conflictsCard}>
        <Text style={styles.conflictsTitle}>Data Conflicts</Text>
        <Text style={styles.noConflictsText}>No data conflicts detected</Text>
      </View>
    );
  }

  return (
    <View style={styles.conflictsCard}>
      <Text style={styles.conflictsTitle}>
        Data Conflicts ({conflicts.length})
      </Text>
      
      {conflicts.slice(0, 3).map((conflict) => (
        <View key={conflict.id} style={styles.conflictItem}>
          <View style={styles.conflictHeader}>
            <Text style={styles.conflictType}>{conflict.type.toUpperCase()}</Text>
            <Text style={styles.conflictDate}>
              {new Date(conflict.createdAt).toLocaleDateString()}
            </Text>
          </View>
          
          <Text style={styles.conflictDescription}>
            Conflict in {conflict.conflictFields.join(', ')} for record {conflict.recordId}
          </Text>
          
          {onResolveConflict && (
            <TouchableOpacity 
              style={styles.resolveButton}
              onPress={() => onResolveConflict(conflict.id)}
            >
              <Text style={styles.resolveButtonText}>Resolve</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      
      {conflicts.length > 3 && (
        <Text style={styles.moreConflictsText}>
          +{conflicts.length - 3} more conflicts
        </Text>
      )}
    </View>
  );
};

/**
 * Main Sync Status Dashboard Component
 */
export const SyncStatusDashboard: React.FC<SyncStatusDashboardProps> = ({ 
  userId, 
  style 
}) => {
  const [syncStatus, setSyncStatus] = useState<{
    configuration: SyncConfiguration;
    activeJobs: SyncJob[];
    recentJobs: SyncJob[];
    statistics: SyncStatistics | null;
    conflicts: DataConflict[];
  } | null>(null);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  /**
   * Load sync status data
   */
  const loadSyncStatus = async () => {
    try {
      const status = await dataSynchronizationService.getSyncStatus(userId);
      setSyncStatus(status);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSyncStatus();
    setIsRefreshing(false);
  };

  /**
   * Start manual sync
   */
  const startManualSync = async () => {
    try {
      await dataSynchronizationService.startSyncJob(userId, {
        priority: SyncPriority.HIGH,
      });
      await loadSyncStatus();
    } catch (error) {
      console.error('Failed to start manual sync:', error);
    }
  };

  /**
   * Retry failed job
   */
  const retryJob = async (jobId: string) => {
    try {
      // Implementation would retry the specific job
      await loadSyncStatus();
    } catch (error) {
      console.error('Failed to retry job:', error);
    }
  };

  /**
   * Resolve data conflict
   */
  const resolveConflict = async (conflictId: string) => {
    try {
      // Implementation would show conflict resolution UI
      console.log('Resolving conflict:', conflictId);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadSyncStatus();
    
    // Set up periodic refresh
    const interval = setInterval(loadSyncStatus, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [userId]);

  if (!syncStatus) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading sync status...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, style]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={['#2196F3']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sync Status</Text>
        <TouchableOpacity style={styles.syncButton} onPress={startManualSync}>
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      </View>

      {/* Last updated */}
      <Text style={styles.lastUpdatedText}>
        Last updated: {lastUpdated.toLocaleTimeString()}
      </Text>

      {/* Active Jobs */}
      {syncStatus.activeJobs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Syncs</Text>
          {syncStatus.activeJobs.map((job) => (
            <SyncJobCard 
              key={job.id} 
              job={job} 
              onRetry={() => retryJob(job.id)}
            />
          ))}
        </View>
      )}

      {/* Statistics */}
      {syncStatus.statistics && (
        <View style={styles.section}>
          <SyncStatisticsCard statistics={syncStatus.statistics} />
        </View>
      )}

      {/* Data Conflicts */}
      <View style={styles.section}>
        <DataConflictsCard 
          conflicts={syncStatus.conflicts}
          onResolveConflict={resolveConflict}
        />
      </View>

      {/* Recent Jobs */}
      {syncStatus.recentJobs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Syncs</Text>
          {syncStatus.recentJobs.slice(0, 5).map((job) => (
            <SyncJobCard 
              key={job.id} 
              job={job} 
              onRetry={() => retryJob(job.id)}
            />
          ))}
        </View>
      )}

      {/* Sync Configuration */}
      {syncStatus.configuration && (
        <View style={styles.section}>
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>Sync Configuration</Text>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Frequency:</Text>
              <Text style={styles.configValue}>
                {syncStatus.configuration.frequency.replace('_', ' ')}
              </Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Providers:</Text>
              <Text style={styles.configValue}>
                {syncStatus.configuration.providers.join(', ')}
              </Text>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Status:</Text>
              <Text style={[
                styles.configValue,
                { color: syncStatus.configuration.enabled ? '#4CAF50' : '#F44336' }
              ]}>
                {syncStatus.configuration.enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  syncButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  lastUpdatedText: {
    textAlign: 'center',
    padding: 8,
    fontSize: 12,
    color: '#666666',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobTitleText: {
    marginLeft: 12,
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  jobProvider: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  jobTime: {
    fontSize: 12,
    color: '#666666',
  },
  jobDetails: {
    marginTop: 8,
  },
  jobDetailText: {
    fontSize: 12,
    color: '#666666',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2196F3',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginVertical: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  statisticsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statisticsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  statisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statisticsItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statisticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  statisticsLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  conflictsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  conflictsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  noConflictsText: {
    textAlign: 'center',
    color: '#666666',
    fontStyle: 'italic',
  },
  conflictItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 12,
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conflictType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
  conflictDate: {
    fontSize: 12,
    color: '#666666',
  },
  conflictDescription: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  resolveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  moreConflictsText: {
    textAlign: 'center',
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  configCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  configLabel: {
    fontSize: 14,
    color: '#666666',
  },
  configValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
});

export default SyncStatusDashboard;

