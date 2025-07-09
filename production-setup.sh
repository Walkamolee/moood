#!/bin/bash

# Money Mood Production Setup Script
# This script sets up the production environment for Money Mood

set -e  # Exit on any error

echo "🚀 Money Mood Production Setup Starting..."
echo "=================================================="

# Configuration
ENVIRONMENT="production"
APP_NAME="money-mood"
DOMAIN="moneymood.app"
DATABASE_NAME="moneymood_production"
REDIS_DB="0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE_VERSION="18.0.0"
    
    if ! npx semver -r ">=$REQUIRED_NODE_VERSION" "$NODE_VERSION" &> /dev/null; then
        error "Node.js version $NODE_VERSION is not supported. Required: >=$REQUIRED_NODE_VERSION"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        warn "PostgreSQL client is not installed. Database operations may fail."
    fi
    
    # Check Redis client
    if ! command -v redis-cli &> /dev/null; then
        warn "Redis client is not installed. Cache operations may fail."
    fi
    
    log "Prerequisites check completed ✅"
}

# Setup environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    if [[ ! -f .env.production ]]; then
        log "Creating .env.production from template..."
        cp .env.example .env.production
        
        warn "Please update .env.production with your production values before continuing"
        warn "Required variables: DATABASE_URL, REDIS_URL, PLAID_CLIENT_ID, PLAID_SECRET, etc."
        
        read -p "Have you updated .env.production? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Please update .env.production and run the script again"
        fi
    fi
    
    # Load environment variables
    set -a
    source .env.production
    set +a
    
    # Validate required environment variables
    REQUIRED_VARS=(
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
        "PLAID_CLIENT_ID"
        "PLAID_SECRET"
        "PLAID_ENVIRONMENT"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    log "Environment variables configured ✅"
}

# Install dependencies
install_dependencies() {
    log "Installing production dependencies..."
    
    # Clean install
    rm -rf node_modules package-lock.json
    npm ci --only=production
    
    # Install global dependencies
    npm install -g pm2
    
    log "Dependencies installed ✅"
}

# Build application
build_application() {
    log "Building application for production..."
    
    # Set production environment
    export NODE_ENV=production
    
    # Build the application
    npm run build
    
    # Verify build output
    if [[ ! -d "dist" && ! -d "build" ]]; then
        error "Build output directory not found"
    fi
    
    log "Application built successfully ✅"
}

# Setup database
setup_database() {
    log "Setting up production database..."
    
    # Test database connection
    if ! psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to database. Please check DATABASE_URL"
    fi
    
    # Run database migrations
    npm run db:migrate
    
    # Seed initial data if needed
    if [[ -f "scripts/seed-production.js" ]]; then
        log "Seeding initial production data..."
        npm run db:seed:production
    fi
    
    log "Database setup completed ✅"
}

# Setup Redis
setup_redis() {
    log "Setting up Redis cache..."
    
    # Test Redis connection
    if ! redis-cli -u "$REDIS_URL" ping &> /dev/null; then
        error "Cannot connect to Redis. Please check REDIS_URL"
    fi
    
    # Clear cache for fresh start
    redis-cli -u "$REDIS_URL" FLUSHDB
    
    log "Redis setup completed ✅"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    SSL_DIR="/etc/ssl/moneymood"
    
    # Create SSL directory
    sudo mkdir -p "$SSL_DIR"
    
    # Check if certificates exist
    if [[ ! -f "$SSL_DIR/cert.pem" || ! -f "$SSL_DIR/key.pem" ]]; then
        warn "SSL certificates not found in $SSL_DIR"
        warn "Please install your SSL certificates before starting the application"
        
        # Generate self-signed certificates for testing (NOT for production)
        read -p "Generate self-signed certificates for testing? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "$SSL_DIR/key.pem" \
                -out "$SSL_DIR/cert.pem" \
                -subj "/C=US/ST=CA/L=San Francisco/O=Money Mood/CN=$DOMAIN"
            
            warn "Self-signed certificates generated. Replace with proper certificates for production!"
        fi
    fi
    
    # Set proper permissions
    sudo chmod 600 "$SSL_DIR/key.pem"
    sudo chmod 644 "$SSL_DIR/cert.pem"
    
    log "SSL setup completed ✅"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring and logging..."
    
    # Create log directories
    sudo mkdir -p /var/log/moneymood
    sudo chown $USER:$USER /var/log/moneymood
    
    # Setup log rotation
    sudo tee /etc/logrotate.d/moneymood > /dev/null <<EOF
/var/log/moneymood/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reload all
    endscript
}
EOF
    
    # Setup PM2 monitoring
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 100M
    pm2 set pm2-logrotate:retain 30
    pm2 set pm2-logrotate:compress true
    
    log "Monitoring setup completed ✅"
}

# Setup security
setup_security() {
    log "Configuring security settings..."
    
    # Setup firewall rules
    if command -v ufw &> /dev/null; then
        sudo ufw --force enable
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw allow ssh
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw reload
    fi
    
    # Setup fail2ban for SSH protection
    if command -v fail2ban-client &> /dev/null; then
        sudo systemctl enable fail2ban
        sudo systemctl start fail2ban
    fi
    
    # Set secure file permissions
    chmod 600 .env.production
    chmod 700 scripts/
    
    log "Security configuration completed ✅"
}

# Setup PM2 ecosystem
setup_pm2() {
    log "Setting up PM2 process manager..."
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/moneymood/error.log',
    out_file: '/var/log/moneymood/out.log',
    log_file: '/var/log/moneymood/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
EOF
    
    log "PM2 ecosystem configured ✅"
}

# Setup reverse proxy (Nginx)
setup_nginx() {
    log "Setting up Nginx reverse proxy..."
    
    # Check if Nginx is installed
    if ! command -v nginx &> /dev/null; then
        warn "Nginx is not installed. Installing..."
        sudo apt update
        sudo apt install -y nginx
    fi
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
# Money Mood Nginx Configuration
upstream moneymood_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/ssl/moneymood/cert.pem;
    ssl_certificate_key /etc/ssl/moneymood/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'none'; object-src 'none';" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Client settings
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://moneymood_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Authentication endpoints with stricter rate limiting
    location ~ ^/api/(auth|login|register) {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://moneymood_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files
    location /static/ {
        alias /var/www/moneymood/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        proxy_pass http://moneymood_backend;
        access_log off;
    }

    # Default location
    location / {
        proxy_pass http://moneymood_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
EOF
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    sudo systemctl enable nginx
    
    log "Nginx configuration completed ✅"
}

# Setup backup system
setup_backup() {
    log "Setting up backup system..."
    
    # Create backup directory
    sudo mkdir -p /var/backups/moneymood
    sudo chown $USER:$USER /var/backups/moneymood
    
    # Create backup script
    cat > scripts/backup.sh <<'EOF'
#!/bin/bash

# Money Mood Backup Script
BACKUP_DIR="/var/backups/moneymood"
DATE=$(date +%Y%m%d_%H%M%S)
DATABASE_BACKUP="$BACKUP_DIR/database_$DATE.sql"
FILES_BACKUP="$BACKUP_DIR/files_$DATE.tar.gz"

# Load environment variables
source .env.production

echo "Starting backup at $(date)"

# Database backup
echo "Backing up database..."
pg_dump "$DATABASE_URL" > "$DATABASE_BACKUP"
gzip "$DATABASE_BACKUP"

# Files backup
echo "Backing up application files..."
tar -czf "$FILES_BACKUP" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=tmp \
    .

# Upload to S3 (if configured)
if [[ -n "$AWS_S3_BACKUP_BUCKET" ]]; then
    echo "Uploading to S3..."
    aws s3 cp "$DATABASE_BACKUP.gz" "s3://$AWS_S3_BACKUP_BUCKET/database/"
    aws s3 cp "$FILES_BACKUP" "s3://$AWS_S3_BACKUP_BUCKET/files/"
fi

# Cleanup old local backups (keep 7 days)
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "Backup completed at $(date)"
EOF
    
    chmod +x scripts/backup.sh
    
    # Setup cron job for daily backups
    (crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && ./scripts/backup.sh >> /var/log/moneymood/backup.log 2>&1") | crontab -
    
    log "Backup system configured ✅"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Stop existing application
    pm2 stop $APP_NAME 2>/dev/null || true
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Start application with PM2
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup | tail -1 | sudo bash
    
    # Wait for application to start
    sleep 10
    
    # Health check
    if curl -f http://localhost:3000/health &> /dev/null; then
        log "Application is running and healthy ✅"
    else
        error "Application health check failed"
    fi
    
    log "Application deployed successfully ✅"
}

# Setup monitoring and alerting
setup_alerting() {
    log "Setting up monitoring and alerting..."
    
    # Install monitoring tools
    npm install -g pm2-logrotate
    
    # Setup PM2 monitoring
    pm2 install pm2-server-monit
    
    # Create monitoring script
    cat > scripts/monitor.sh <<'EOF'
#!/bin/bash

# Money Mood Monitoring Script
LOG_FILE="/var/log/moneymood/monitor.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@moneymood.app}"

# Check application health
check_health() {
    if ! curl -f http://localhost:3000/health &> /dev/null; then
        echo "$(date): Application health check failed" >> "$LOG_FILE"
        # Send alert email (requires mail command)
        if command -v mail &> /dev/null; then
            echo "Money Mood application health check failed at $(date)" | mail -s "Money Mood Alert" "$ALERT_EMAIL"
        fi
        return 1
    fi
    return 0
}

# Check database connectivity
check_database() {
    source .env.production
    if ! psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        echo "$(date): Database connectivity check failed" >> "$LOG_FILE"
        return 1
    fi
    return 0
}

# Check Redis connectivity
check_redis() {
    source .env.production
    if ! redis-cli -u "$REDIS_URL" ping &> /dev/null; then
        echo "$(date): Redis connectivity check failed" >> "$LOG_FILE"
        return 1
    fi
    return 0
}

# Run all checks
check_health && check_database && check_redis
EOF
    
    chmod +x scripts/monitor.sh
    
    # Setup monitoring cron job (every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * cd $(pwd) && ./scripts/monitor.sh") | crontab -
    
    log "Monitoring and alerting configured ✅"
}

# Main deployment function
main() {
    log "Starting Money Mood production deployment..."
    
    check_root
    check_prerequisites
    setup_environment
    install_dependencies
    build_application
    setup_database
    setup_redis
    setup_ssl
    setup_monitoring
    setup_security
    setup_pm2
    setup_nginx
    setup_backup
    deploy_application
    setup_alerting
    
    echo
    echo "🎉 Money Mood Production Deployment Complete!"
    echo "=================================================="
    echo
    echo "Application Status:"
    pm2 status
    echo
    echo "Application URL: https://$DOMAIN"
    echo "Health Check: https://$DOMAIN/health"
    echo "API Endpoint: https://$DOMAIN/api"
    echo
    echo "Important Files:"
    echo "- Configuration: .env.production"
    echo "- PM2 Config: ecosystem.config.js"
    echo "- Nginx Config: /etc/nginx/sites-available/$APP_NAME"
    echo "- Logs: /var/log/moneymood/"
    echo "- Backups: /var/backups/moneymood/"
    echo
    echo "Management Commands:"
    echo "- View logs: pm2 logs $APP_NAME"
    echo "- Restart app: pm2 restart $APP_NAME"
    echo "- Monitor app: pm2 monit"
    echo "- Backup data: ./scripts/backup.sh"
    echo "- Check health: ./scripts/monitor.sh"
    echo
    echo "Next Steps:"
    echo "1. Update DNS records to point to this server"
    echo "2. Install proper SSL certificates"
    echo "3. Configure monitoring and alerting"
    echo "4. Set up automated backups to cloud storage"
    echo "5. Configure log aggregation and analysis"
    echo
    warn "Remember to:"
    warn "- Regularly update dependencies and security patches"
    warn "- Monitor application performance and logs"
    warn "- Test backup and recovery procedures"
    warn "- Review and update security configurations"
    echo
    log "Production deployment completed successfully! 🚀"
}

# Run main function
main "$@"

