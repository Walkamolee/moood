# Money Mood Operations Guide

> **Complete guide for system administrators and operations teams managing Money Mood in production**

## Table of Contents

1. [Operations Overview](#operations-overview)
2. [System Administration](#system-administration)
3. [Monitoring and Alerting](#monitoring-and-alerting)
4. [Incident Response](#incident-response)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Performance Monitoring](#performance-monitoring)
7. [Capacity Planning](#capacity-planning)
8. [Disaster Recovery Operations](#disaster-recovery-operations)

## Operations Overview

### Operational Responsibilities

#### System Operations Team
- **Infrastructure Management**: Server provisioning, scaling, maintenance
- **Monitoring**: 24/7 system monitoring and alerting
- **Incident Response**: First-line response to system issues
- **Performance Optimization**: System tuning and optimization
- **Backup Management**: Data backup and recovery operations

#### Security Operations Team
- **Security Monitoring**: 24/7 security event monitoring
- **Incident Response**: Security incident investigation and response
- **Compliance Monitoring**: PCI DSS, GDPR, CCPA compliance verification
- **Access Management**: User access provisioning and deprovisioning
- **Vulnerability Management**: Security scanning and patch management

#### Development Operations Team
- **Deployment Management**: Code deployment and rollback procedures
- **Environment Management**: Development, staging, production environments
- **CI/CD Pipeline**: Build and deployment automation
- **Configuration Management**: Application and infrastructure configuration
- **Database Operations**: Schema changes and data migrations

### Service Level Objectives (SLOs)

#### Availability Targets
- **Application Uptime**: 99.9% (8.77 hours downtime/year)
- **API Response Time**: 95th percentile < 500ms
- **Database Query Time**: 95th percentile < 100ms
- **Sync Success Rate**: 99.5% of sync operations successful
- **Authentication Success**: 99.9% of valid authentication attempts

#### Performance Targets
- **Page Load Time**: < 2 seconds for 95% of requests
- **Transaction Sync**: < 5 minutes for 95% of transactions
- **Mobile App Launch**: < 3 seconds cold start
- **Search Response**: < 1 second for transaction searches
- **Report Generation**: < 10 seconds for standard reports

#### Security Targets
- **Incident Response**: < 15 minutes for critical security incidents
- **Vulnerability Patching**: < 24 hours for critical vulnerabilities
- **Access Provisioning**: < 2 hours for standard access requests
- **Compliance Reporting**: 100% compliance with regulatory requirements
- **Audit Log Retention**: 7 years for financial transaction logs

## System Administration

### Server Management

#### Production Environment Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (ALB)                     │
│                     Health Checks                          │
├─────────────────────────────────────────────────────────────┤
│  Web Tier (3 instances)  │  API Tier (5 instances)        │
│  - React Native Web      │  - Node.js API servers         │
│  - Static assets         │  - Authentication services     │
│  - CDN integration       │  - Financial data processing   │
├─────────────────────────────────────────────────────────────┤
│  Service Tier (Auto-scaling 2-10 instances)               │
│  - Plaid integration     │  - Data synchronization        │
│  - Security services     │  - Background job processing   │
├─────────────────────────────────────────────────────────────┤
│  Data Tier                                                 │
│  - PostgreSQL (Primary + 2 Read Replicas)                 │
│  - Redis Cluster (3 nodes)                                │
│  - S3 Storage (Encrypted)                                 │
└─────────────────────────────────────────────────────────────┘
```

#### Server Specifications

**Web Tier Servers**
```yaml
Instance Type: c5.large
CPU: 2 vCPUs
Memory: 4 GB RAM
Storage: 20 GB SSD
Network: Up to 10 Gbps
Auto Scaling: 3-6 instances
```

**API Tier Servers**
```yaml
Instance Type: c5.xlarge
CPU: 4 vCPUs
Memory: 8 GB RAM
Storage: 50 GB SSD
Network: Up to 10 Gbps
Auto Scaling: 5-15 instances
```

**Database Servers**
```yaml
Instance Type: r5.2xlarge
CPU: 8 vCPUs
Memory: 64 GB RAM
Storage: 1 TB SSD (gp3)
IOPS: 10,000 provisioned
Network: Up to 10 Gbps
```

### User Management

#### Access Control Matrix
```
Role                | System Access | Database | Deployment | Monitoring
--------------------|---------------|----------|------------|------------
System Admin       | Full          | Full     | Full       | Full
DevOps Engineer     | Limited       | Read     | Full       | Full
Developer           | None          | Dev Only | Dev/Stage  | Read
Security Analyst    | Audit         | Audit    | None       | Security
Support Agent       | Support Tools | None     | None       | Limited
```

#### Account Provisioning Process
1. **Access Request**
   - Submit request through ServiceNow
   - Manager approval required
   - Security team review for sensitive access

2. **Account Creation**
   ```bash
   # Create user account
   sudo useradd -m -s /bin/bash -G moneymood-ops username
   
   # Set up SSH key authentication
   sudo mkdir /home/username/.ssh
   sudo cp public_key /home/username/.ssh/authorized_keys
   sudo chown -R username:username /home/username/.ssh
   sudo chmod 700 /home/username/.ssh
   sudo chmod 600 /home/username/.ssh/authorized_keys
   ```

3. **Application Access**
   ```bash
   # Add to application groups
   sudo usermod -a -G docker username
   sudo usermod -a -G moneymood-deploy username
   
   # Configure kubectl access
   kubectl create clusterrolebinding username-binding \
     --clusterrole=view --user=username
   ```

4. **Database Access**
   ```sql
   -- Create database user
   CREATE USER username WITH PASSWORD 'secure_password';
   
   -- Grant appropriate permissions
   GRANT CONNECT ON DATABASE moneymood_production TO username;
   GRANT USAGE ON SCHEMA public TO username;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO username;
   ```

### Configuration Management

#### Environment Configuration
```bash
# Production environment variables
export NODE_ENV=production
export LOG_LEVEL=info
export DATABASE_POOL_SIZE=20
export REDIS_POOL_SIZE=10
export API_RATE_LIMIT=1000
export SESSION_TIMEOUT=3600
export ENCRYPTION_KEY_ROTATION=true
export AUDIT_LOGGING=enabled
export PERFORMANCE_MONITORING=enabled
```

#### Application Configuration
```yaml
# config/production.yml
server:
  port: 3000
  host: 0.0.0.0
  timeout: 30000
  keepAlive: true

database:
  host: prod-db.moneymood.internal
  port: 5432
  database: moneymood_production
  pool:
    min: 5
    max: 20
    idle: 10000
    acquire: 30000

redis:
  host: prod-cache.moneymood.internal
  port: 6379
  password: ${REDIS_PASSWORD}
  db: 0
  keyPrefix: "moneymood:"

logging:
  level: info
  format: json
  destination: /var/log/moneymood/app.log
  rotation:
    maxSize: 100MB
    maxFiles: 10
    compress: true
```

## Monitoring and Alerting

### Monitoring Stack

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'moneymood-production'
    region: 'us-east-1'

rule_files:
  - "/etc/prometheus/rules/*.yml"

scrape_configs:
  - job_name: 'moneymood-api'
    static_configs:
      - targets: 
        - 'api-1.moneymood.internal:3000'
        - 'api-2.moneymood.internal:3000'
        - 'api-3.moneymood.internal:3000'
    metrics_path: '/metrics'
    scrape_interval: 10s
    
  - job_name: 'moneymood-web'
    static_configs:
      - targets:
        - 'web-1.moneymood.internal:80'
        - 'web-2.moneymood.internal:80'
        - 'web-3.moneymood.internal:80'
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    
  - job_name: 'node-exporter'
    static_configs:
      - targets:
        - 'node-1:9100'
        - 'node-2:9100'
        - 'node-3:9100'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Alert Rules
```yaml
# alerts/application.yml
groups:
  - name: moneymood-application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
          
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }} seconds"
          
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends > 80
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "Database has {{ $value }} active connections"
          
      - alert: SyncJobFailures
        expr: increase(sync_job_failures_total[10m]) > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Multiple sync job failures"
          description: "{{ $value }} sync jobs have failed in the last 10 minutes"
```

## Incident Response

### Incident Classification

#### Severity Levels
**P0 - Critical (Response: Immediate)**
- Complete service outage
- Security breach or data leak
- Payment processing failure
- Database corruption

**P1 - High (Response: < 15 minutes)**
- Partial service outage
- Significant performance degradation
- Authentication system failure
- Sync service failure affecting >50% of users

**P2 - Medium (Response: < 1 hour)**
- Minor feature outage
- Performance issues affecting <25% of users
- Non-critical third-party service failure
- Monitoring system alerts

**P3 - Low (Response: < 4 hours)**
- Cosmetic issues
- Documentation problems
- Non-urgent feature requests
- Scheduled maintenance

### Incident Response Procedures

#### P0/P1 Incident Response
1. **Detection and Alert**
   ```bash
   # Automated alert triggers
   - Monitoring system alerts
   - User reports through support
   - Third-party service notifications
   - Security system alerts
   ```

2. **Initial Response (0-5 minutes)**
   ```bash
   # Incident commander actions
   1. Acknowledge the incident
   2. Assess severity and impact
   3. Activate incident response team
   4. Create incident channel (#incident-YYYY-MM-DD-001)
   5. Begin status page updates
   ```

3. **Investigation (5-15 minutes)**
   ```bash
   # Technical investigation
   1. Check system health dashboards
   2. Review recent deployments
   3. Analyze error logs and metrics
   4. Identify root cause hypothesis
   5. Implement immediate mitigation
   ```

4. **Resolution (15+ minutes)**
   ```bash
   # Resolution actions
   1. Apply permanent fix
   2. Verify system recovery
   3. Monitor for regression
   4. Update status page
   5. Communicate resolution
   ```

## Maintenance Procedures

### Scheduled Maintenance

#### Weekly Maintenance Window
**Time**: Sundays 2:00-4:00 AM UTC
**Duration**: 2 hours maximum
**Frequency**: Weekly

**Standard Maintenance Tasks**
```bash
#!/bin/bash
# Weekly maintenance script

echo "=== Weekly Maintenance - $(date) ==="

# 1. Database maintenance
echo "1. Running database maintenance..."
psql -h prod-db.moneymood.internal -U admin -d moneymood_production -c "
VACUUM ANALYZE;
REINDEX DATABASE moneymood_production;
"

# 2. Log rotation and cleanup
echo "2. Cleaning up logs..."
find /var/log/moneymood -name "*.log" -mtime +7 -delete
find /var/log/moneymood -name "*.gz" -mtime +30 -delete

# 3. Clear Redis cache
echo "3. Clearing expired Redis keys..."
redis-cli -h prod-cache.moneymood.internal FLUSHDB

# 4. Update SSL certificates
echo "4. Checking SSL certificate expiration..."
openssl x509 -in /etc/ssl/certs/moneymood.crt -noout -dates

# 5. Security updates
echo "5. Installing security updates..."
sudo apt update && sudo apt upgrade -y

# 6. Backup verification
echo "6. Verifying recent backups..."
aws s3 ls s3://moneymood-backups/database/ --recursive | tail -5

echo "=== Weekly maintenance complete ==="
```

## Performance Monitoring

### Key Performance Indicators (KPIs)

#### Application Performance
```yaml
Response Time Metrics:
  - API Response Time (P95): < 500ms
  - Database Query Time (P95): < 100ms
  - Page Load Time (P95): < 2s
  - Mobile App Launch: < 3s

Throughput Metrics:
  - Requests per Second: Monitor baseline and peaks
  - Transactions per Second: Track sync performance
  - Concurrent Users: Monitor active user count
  - Data Transfer: Monitor bandwidth usage

Error Metrics:
  - Error Rate: < 0.1% for 5xx errors
  - Sync Failure Rate: < 0.5%
  - Authentication Failure Rate: < 0.1%
  - Timeout Rate: < 0.05%
```

#### Infrastructure Performance
```yaml
Server Metrics:
  - CPU Utilization: < 70% average
  - Memory Utilization: < 80% average
  - Disk I/O: Monitor IOPS and latency
  - Network I/O: Monitor bandwidth usage

Database Metrics:
  - Connection Pool Usage: < 80%
  - Query Performance: Monitor slow queries
  - Lock Contention: Monitor blocking queries
  - Replication Lag: < 1 second

Cache Metrics:
  - Redis Hit Rate: > 95%
  - Cache Memory Usage: < 80%
  - Eviction Rate: Monitor key evictions
  - Connection Count: Monitor active connections
```

## Capacity Planning

### Resource Forecasting

#### Traffic Growth Projections
```yaml
Current Baseline (January 2024):
  - Daily Active Users: 50,000
  - API Requests/Day: 2,000,000
  - Database Queries/Day: 5,000,000
  - Data Storage: 500 GB
  - Bandwidth: 100 GB/day

6-Month Projection (July 2024):
  - Daily Active Users: 100,000 (+100%)
  - API Requests/Day: 4,500,000 (+125%)
  - Database Queries/Day: 12,000,000 (+140%)
  - Data Storage: 1.2 TB (+140%)
  - Bandwidth: 250 GB/day (+150%)

12-Month Projection (January 2025):
  - Daily Active Users: 200,000 (+300%)
  - API Requests/Day: 10,000,000 (+400%)
  - Database Queries/Day: 30,000,000 (+500%)
  - Data Storage: 3 TB (+500%)
  - Bandwidth: 600 GB/day (+500%)
```

## Disaster Recovery Operations

### Recovery Procedures

#### Database Recovery
```bash
#!/bin/bash
# Database disaster recovery script

echo "=== Database Disaster Recovery ==="

# 1. Assess damage
echo "1. Assessing database status..."
pg_isready -h prod-db.moneymood.internal -p 5432
DB_STATUS=$?

if [ $DB_STATUS -eq 0 ]; then
    echo "✅ Database is responding"
    echo "Checking data integrity..."
    psql -h prod-db.moneymood.internal -U admin -d moneymood_production -c "SELECT COUNT(*) FROM users;"
else
    echo "❌ Database is not responding - initiating recovery"
    
    # 2. Stop application traffic
    echo "2. Stopping application traffic..."
    kubectl scale deployment moneymood-api --replicas=0
    
    # 3. Restore from backup
    echo "3. Restoring from latest backup..."
    LATEST_BACKUP=$(aws s3 ls s3://moneymood-backups/database/ | sort | tail -n 1 | awk '{print $4}')
    echo "Restoring from: $LATEST_BACKUP"
    
    aws s3 cp s3://moneymood-backups/database/$LATEST_BACKUP /tmp/restore.dump
    pg_restore -h prod-db.moneymood.internal -U admin -d moneymood_production \
      --clean --if-exists --verbose /tmp/restore.dump
    
    # 4. Verify restoration
    echo "4. Verifying restoration..."
    psql -h prod-db.moneymood.internal -U admin -d moneymood_production -c "
    SELECT 'users' as table_name, COUNT(*) as row_count FROM users
    UNION ALL
    SELECT 'accounts', COUNT(*) FROM accounts
    UNION ALL
    SELECT 'transactions', COUNT(*) FROM transactions;
    "
    
    # 5. Restart application
    echo "5. Restarting application..."
    kubectl scale deployment moneymood-api --replicas=5
    kubectl rollout status deployment moneymood-api
fi

echo "=== Database recovery complete ==="
```

---

## Operations Support

### Contact Information
- **Operations Team**: ops@moneymood.app
- **Emergency Hotline**: +1-555-MONEY-OPS
- **Security Team**: security@moneymood.app
- **Development Team**: dev@moneymood.app

### Escalation Matrix
1. **Level 1**: Operations Engineer (0-15 minutes)
2. **Level 2**: Senior Operations Engineer (15-30 minutes)
3. **Level 3**: Operations Manager (30-60 minutes)
4. **Level 4**: CTO/VP Engineering (60+ minutes)

---

*Money Mood Operations Guide - Version 1.0*
*Last Updated: January 15, 2024*
*Classification: Internal Use Only*

