# Money Mood Deployment Guide

> **Complete guide for deploying Money Mood to production environments with enterprise-grade security and scalability**

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Infrastructure Requirements](#infrastructure-requirements)
3. [Environment Setup](#environment-setup)
4. [Database Configuration](#database-configuration)
5. [Security Configuration](#security-configuration)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Deployment Process](#deployment-process)
8. [Post-Deployment Validation](#post-deployment-validation)
9. [Scaling and Performance](#scaling-and-performance)
10. [Disaster Recovery](#disaster-recovery)

## Deployment Overview

Money Mood is designed for cloud-native deployment with support for multiple environments and automatic scaling. The application follows a microservices architecture with containerized components.

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (ALB)                     │
├─────────────────────────────────────────────────────────────┤
│  CDN (CloudFront)  │  WAF Protection  │  SSL Termination  │
├─────────────────────────────────────────────────────────────┤
│                   Application Tier                          │
├─────────────────────────────────────────────────────────────┤
│  React Native App │  API Gateway     │  Webhook Handler   │
├─────────────────────────────────────────────────────────────┤
│                    Service Tier                             │
├─────────────────────────────────────────────────────────────┤
│  Auth Service     │  Sync Service    │  Security Service  │
├─────────────────────────────────────────────────────────────┤
│                     Data Tier                               │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL RDS   │  Redis Cache     │  S3 Storage        │
└─────────────────────────────────────────────────────────────┘
```

### Supported Platforms

- **Cloud Providers**: AWS, Azure, Google Cloud Platform
- **Container Orchestration**: Kubernetes, Docker Swarm, ECS
- **Mobile Platforms**: iOS, Android
- **Web Platforms**: Progressive Web App (PWA)

## Infrastructure Requirements

### Minimum Requirements

#### Production Environment
- **CPU**: 8 vCPUs per service instance
- **Memory**: 16 GB RAM per service instance
- **Storage**: 500 GB SSD for database, 1 TB for file storage
- **Network**: 10 Gbps bandwidth
- **Availability**: 99.9% uptime SLA

#### Database Requirements
- **PostgreSQL**: Version 14+ with encryption at rest
- **Redis**: Version 6+ for caching and session management
- **Backup Storage**: 3x database size for backups and point-in-time recovery

#### Security Requirements
- **SSL/TLS**: TLS 1.3 certificates from trusted CA
- **HSM**: Hardware Security Module for key management
- **WAF**: Web Application Firewall with DDoS protection
- **VPN**: Site-to-site VPN for secure access

### Recommended AWS Architecture

```yaml
# AWS Infrastructure as Code (CloudFormation/Terraform)
infrastructure:
  vpc:
    cidr: "10.0.0.0/16"
    availability_zones: 3
    public_subnets: ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
    private_subnets: ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]
    database_subnets: ["10.0.7.0/24", "10.0.8.0/24", "10.0.9.0/24"]
  
  compute:
    application_servers:
      instance_type: "c5.2xlarge"
      min_capacity: 2
      max_capacity: 10
      auto_scaling: true
    
  database:
    rds:
      engine: "postgres"
      version: "14.9"
      instance_class: "db.r5.xlarge"
      multi_az: true
      encrypted: true
      backup_retention: 30
    
    redis:
      node_type: "cache.r6g.large"
      num_cache_nodes: 3
      engine_version: "6.2"
  
  storage:
    s3_buckets:
      - name: "moneymood-app-assets"
        encryption: "AES256"
        versioning: true
      - name: "moneymood-backups"
        encryption: "aws:kms"
        lifecycle_policy: true
  
  security:
    waf: true
    shield_advanced: true
    cloudtrail: true
    config: true
    guardduty: true
```

## Environment Setup

### Environment Variables

Create environment-specific configuration files:

#### Production Environment (.env.production)
```bash
# Application Configuration
NODE_ENV=production
APP_VERSION=2.0.0
API_BASE_URL=https://api.moneymood.app
WEB_BASE_URL=https://app.moneymood.app

# Database Configuration
DATABASE_URL=postgresql://username:password@prod-db.moneymood.app:5432/moneymood
DATABASE_SSL=true
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Redis Configuration
REDIS_URL=redis://prod-cache.moneymood.app:6379
REDIS_PASSWORD=secure_redis_password
REDIS_TLS=true

# Plaid Configuration
PLAID_CLIENT_ID=your_production_client_id
PLAID_SECRET=your_production_secret
PLAID_ENV=production
PLAID_WEBHOOK_URL=https://api.moneymood.app/webhooks/plaid

# Yodlee Configuration
YODLEE_CLIENT_ID=your_production_client_id
YODLEE_SECRET=your_production_secret
YODLEE_ENV=production

# Security Configuration
JWT_SECRET=your_super_secure_jwt_secret_256_bits_long
ENCRYPTION_KEY=your_aes_256_encryption_key_here
BIOMETRIC_SECRET=your_biometric_encryption_secret

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET=moneymood-app-assets
KMS_KEY_ID=arn:aws:kms:us-east-1:account:key/key-id

# Monitoring Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
DATADOG_API_KEY=your_datadog_api_key
NEW_RELIC_LICENSE_KEY=your_newrelic_license_key

# Feature Flags
ENABLE_BIOMETRIC_AUTH=true
ENABLE_MULTI_PROVIDER=true
ENABLE_REAL_TIME_SYNC=true
ENABLE_ADVANCED_ANALYTICS=true
```

#### Staging Environment (.env.staging)
```bash
# Application Configuration
NODE_ENV=staging
APP_VERSION=2.0.0-staging
API_BASE_URL=https://staging-api.moneymood.app
WEB_BASE_URL=https://staging.moneymood.app

# Database Configuration
DATABASE_URL=postgresql://username:password@staging-db.moneymood.app:5432/moneymood_staging
DATABASE_SSL=true
DATABASE_POOL_SIZE=10

# Plaid Configuration (Sandbox)
PLAID_CLIENT_ID=your_sandbox_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox
PLAID_WEBHOOK_URL=https://staging-api.moneymood.app/webhooks/plaid

# Security Configuration
JWT_SECRET=staging_jwt_secret_for_testing_only
ENCRYPTION_KEY=staging_encryption_key_for_testing

# Feature Flags
ENABLE_DEBUG_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true
```

### Container Configuration

#### Dockerfile
```dockerfile
# Multi-stage build for React Native Web
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build:web

# Production image
FROM nginx:alpine AS production

# Install security updates
RUN apk update && apk upgrade

# Copy built application
COPY --from=builder /app/web-build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Add security headers
COPY security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose (docker-compose.prod.yml)
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - database
      - redis
    restart: unless-stopped
    
  database:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: moneymood
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    
  redis:
    image: redis:6-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Database Configuration

### PostgreSQL Setup

#### Database Schema Migration
```sql
-- Create production database
CREATE DATABASE moneymood_production;

-- Create application user
CREATE USER moneymood_app WITH PASSWORD 'secure_password_here';

-- Grant permissions
GRANT CONNECT ON DATABASE moneymood_production TO moneymood_app;
GRANT USAGE ON SCHEMA public TO moneymood_app;
GRANT CREATE ON SCHEMA public TO moneymood_app;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

#### Performance Optimization
```sql
-- PostgreSQL configuration for production
-- postgresql.conf settings

# Memory settings
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 256MB
maintenance_work_mem = 1GB

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 64MB
default_statistics_target = 100

# Connection settings
max_connections = 200
max_prepared_transactions = 200

# Logging settings
log_statement = 'mod'
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
```

#### Backup Configuration
```bash
#!/bin/bash
# backup-database.sh

# Database backup script
DB_NAME="moneymood_production"
DB_USER="moneymood_app"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/moneymood_backup_$DATE.dump"

# Upload to S3
aws s3 cp "$BACKUP_DIR/moneymood_backup_$DATE.dump" \
  s3://moneymood-backups/database/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "moneymood_backup_*.dump" -mtime +30 -delete
```

### Redis Configuration

#### Redis Configuration (redis.conf)
```conf
# Network settings
bind 0.0.0.0
port 6379
protected-mode yes
requirepass your_secure_redis_password

# Memory settings
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence settings
save 900 1
save 300 10
save 60 10000

# Security settings
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

## Security Configuration

### SSL/TLS Configuration

#### Nginx SSL Configuration
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name app.moneymood.app;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/moneymood.crt;
    ssl_certificate_key /etc/ssl/private/moneymood.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.moneymood.app;" always;
    
    # Application proxy
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name app.moneymood.app;
    return 301 https://$server_name$request_uri;
}
```

### Firewall Configuration

#### AWS Security Groups
```yaml
# Security Group for Application Servers
ApplicationSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Security group for Money Mood application servers
    VpcId: !Ref VPC
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 443
        ToPort: 443
        SourceSecurityGroupId: !Ref LoadBalancerSecurityGroup
      - IpProtocol: tcp
        FromPort: 80
        ToPort: 80
        SourceSecurityGroupId: !Ref LoadBalancerSecurityGroup
    SecurityGroupEgress:
      - IpProtocol: tcp
        FromPort: 443
        ToPort: 443
        CidrIp: 0.0.0.0/0
      - IpProtocol: tcp
        FromPort: 5432
        ToPort: 5432
        DestinationSecurityGroupId: !Ref DatabaseSecurityGroup

# Security Group for Database
DatabaseSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Security group for Money Mood database
    VpcId: !Ref VPC
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 5432
        ToPort: 5432
        SourceSecurityGroupId: !Ref ApplicationSecurityGroup
```

## Monitoring and Logging

### Application Monitoring

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "money_mood_rules.yml"

scrape_configs:
  - job_name: 'money-mood-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
    
  - job_name: 'money-mood-database'
    static_configs:
      - targets: ['postgres-exporter:9187']
    
  - job_name: 'money-mood-redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

#### Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "Money Mood Production Dashboard",
    "panels": [
      {
        "title": "Application Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "Active connections"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

### Centralized Logging

#### ELK Stack Configuration
```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
      
  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch
      
  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

## Deployment Process

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run security:scan
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: |
          docker build -t moneymood:${{ github.sha }} .
          docker tag moneymood:${{ github.sha }} moneymood:latest
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push moneymood:${{ github.sha }}
          docker push moneymood:latest
          
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: |
          # Update Kubernetes deployment
          kubectl set image deployment/moneymood-app app=moneymood:${{ github.sha }}
          kubectl rollout status deployment/moneymood-app
          
      - name: Run health checks
        run: |
          # Wait for deployment to be ready
          sleep 30
          # Run health checks
          curl -f https://api.moneymood.app/health || exit 1
```

### Blue-Green Deployment

#### Deployment Script
```bash
#!/bin/bash
# deploy-blue-green.sh

set -e

# Configuration
BLUE_ENV="moneymood-blue"
GREEN_ENV="moneymood-green"
CURRENT_ENV=$(kubectl get service moneymood-service -o jsonpath='{.spec.selector.version}')
NEW_ENV=""

# Determine target environment
if [ "$CURRENT_ENV" = "blue" ]; then
    NEW_ENV="green"
else
    NEW_ENV="blue"
fi

echo "Current environment: $CURRENT_ENV"
echo "Deploying to: $NEW_ENV"

# Deploy to target environment
kubectl set image deployment/moneymood-$NEW_ENV app=moneymood:$1
kubectl rollout status deployment/moneymood-$NEW_ENV

# Run health checks
echo "Running health checks..."
kubectl port-forward service/moneymood-$NEW_ENV-service 8080:80 &
PF_PID=$!
sleep 10

# Health check
if curl -f http://localhost:8080/health; then
    echo "Health check passed"
    kill $PF_PID
else
    echo "Health check failed"
    kill $PF_PID
    exit 1
fi

# Switch traffic
echo "Switching traffic to $NEW_ENV"
kubectl patch service moneymood-service -p '{"spec":{"selector":{"version":"'$NEW_ENV'"}}}'

echo "Deployment completed successfully"
```

## Post-Deployment Validation

### Health Check Endpoints

```typescript
// Health check implementation
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      plaid: await checkPlaidConnection(),
      yodlee: await checkYodleeConnection()
    }
  };
  
  const isHealthy = Object.values(healthStatus.checks).every(check => check.status === 'healthy');
  
  res.status(isHealthy ? 200 : 503).json(healthStatus);
});

// Readiness check
app.get('/ready', async (req, res) => {
  const readinessStatus = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      migrations: await checkMigrations(),
      configuration: await checkConfiguration(),
      dependencies: await checkDependencies()
    }
  };
  
  const isReady = Object.values(readinessStatus.checks).every(check => check.status === 'ready');
  
  res.status(isReady ? 200 : 503).json(readinessStatus);
});
```

### Smoke Tests

```bash
#!/bin/bash
# smoke-tests.sh

API_BASE_URL="https://api.moneymood.app"
WEB_BASE_URL="https://app.moneymood.app"

echo "Running smoke tests..."

# Test API health
echo "Testing API health..."
curl -f "$API_BASE_URL/health" || exit 1

# Test web application
echo "Testing web application..."
curl -f "$WEB_BASE_URL" || exit 1

# Test authentication endpoint
echo "Testing authentication..."
curl -f "$API_BASE_URL/auth/status" || exit 1

# Test Plaid integration
echo "Testing Plaid integration..."
curl -f "$API_BASE_URL/plaid/health" || exit 1

echo "All smoke tests passed!"
```

## Scaling and Performance

### Auto Scaling Configuration

#### Kubernetes HPA
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: moneymood-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: moneymood-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Performance Optimization

#### Database Connection Pooling
```typescript
// Database connection pool configuration
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: process.env.DATABASE_SSL === 'true',
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### Redis Caching Strategy
```typescript
// Caching implementation
const cacheService = {
  async get(key: string) {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  },
  
  async set(key: string, value: any, ttl: number = 3600) {
    await redis.setex(key, ttl, JSON.stringify(value));
  },
  
  async invalidate(pattern: string) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
};
```

## Disaster Recovery

### Backup Strategy

#### Automated Backup Script
```bash
#!/bin/bash
# disaster-recovery-backup.sh

# Configuration
BACKUP_DIR="/backups"
S3_BUCKET="moneymood-disaster-recovery"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
echo "Creating database backup..."
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --format=custom --compress=9 \
  --file="$BACKUP_DIR/db_backup_$DATE.dump"

# Application data backup
echo "Creating application data backup..."
tar -czf "$BACKUP_DIR/app_data_$DATE.tar.gz" /app/data

# Configuration backup
echo "Creating configuration backup..."
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" /app/config

# Upload to S3
echo "Uploading backups to S3..."
aws s3 sync $BACKUP_DIR s3://$S3_BUCKET/backups/$DATE/

# Cleanup old backups
find $BACKUP_DIR -name "*_backup_*" -mtime +7 -delete

echo "Backup completed successfully"
```

### Recovery Procedures

#### Database Recovery
```bash
#!/bin/bash
# recover-database.sh

BACKUP_FILE=$1
DB_NAME="moneymood_production"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Stop application
kubectl scale deployment moneymood-app --replicas=0

# Restore database
echo "Restoring database from $BACKUP_FILE..."
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --clean --if-exists --verbose $BACKUP_FILE

# Start application
kubectl scale deployment moneymood-app --replicas=3

echo "Database recovery completed"
```

---

## Support and Maintenance

### Deployment Support
- **DevOps Team**: devops@moneymood.app
- **Infrastructure Support**: infrastructure@moneymood.app
- **Emergency Hotline**: +1-555-MONEY-911

### Maintenance Windows
- **Regular Maintenance**: Sundays 2:00-4:00 AM UTC
- **Emergency Maintenance**: As needed with 1-hour notice
- **Major Updates**: Quarterly with 2-week notice

---

*Money Mood Deployment Guide - Version 1.0*
*Last Updated: January 15, 2024*
*Classification: Internal Use Only*

