# Production Deployment Guide

This guide covers the complete process for deploying the Excel Context Engine to production.

## Pre-Deployment Checklist

### 1. System Validation
Run the comprehensive system validation to ensure everything is working correctly:

```bash
npm run validate:system
```

This will:
- ✅ Test all components and integrations
- ✅ Run unit, integration, and E2E tests
- ✅ Validate API endpoints
- ✅ Test OpenAI integration
- ✅ Verify database connectivity
- ✅ Check error handling
- ✅ Validate security measures

### 2. Deployment Readiness Check
Run the deployment readiness check to ensure production requirements are met:

```bash
npm run validate:deployment
```

This will verify:
- ✅ Code quality and compilation
- ✅ Security configurations
- ✅ Performance optimizations
- ✅ Environment variables
- ✅ Database setup
- ✅ Documentation completeness
- ✅ Monitoring and logging

### 3. Load Testing
Perform load testing to ensure the system can handle production traffic:

```bash
npm run test:load
```

This will test:
- ✅ Concurrent user handling
- ✅ Large file processing
- ✅ Memory usage under stress
- ✅ API response times
- ✅ Database performance

## Environment Setup

### Required Environment Variables

Create a `.env` file in the backend directory with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_SSL=true
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.1

# Redis Cache
REDIS_URL=redis://username:password@host:port
REDIS_TTL=3600

# Security
JWT_SECRET=your-jwt-secret-key
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=50MB
UPLOAD_PATH=/tmp/uploads

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000

# External Services
SENTRY_DSN=your-sentry-dsn (optional)
NEW_RELIC_LICENSE_KEY=your-new-relic-key (optional)
```

### Database Setup

1. **Create Production Database**
   ```bash
   # Connect to your PostgreSQL instance
   psql -h your-host -U your-user -d postgres
   
   # Create database
   CREATE DATABASE excel_context_engine_prod;
   
   # Create user (if needed)
   CREATE USER app_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE excel_context_engine_prod TO app_user;
   ```

2. **Run Migrations**
   ```bash
   cd backend
   npm run db:migrate
   ```

3. **Verify Database Setup**
   ```bash
   npm run db:status
   ```

### Redis Setup

1. **Install Redis** (if not using managed service)
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install redis-server
   
   # macOS
   brew install redis
   
   # Start Redis
   redis-server
   ```

2. **Configure Redis** (optional, for custom settings)
   ```bash
   # Edit redis.conf
   sudo nano /etc/redis/redis.conf
   
   # Set password
   requirepass your-redis-password
   
   # Set memory policy
   maxmemory-policy allkeys-lru
   ```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

1. **Build Docker Images**
   ```bash
   # Build backend image
   docker build -t excel-context-engine-backend ./backend
   
   # Build frontend image
   docker build -t excel-context-engine-frontend ./frontend
   ```

2. **Create Docker Compose File**
   ```yaml
   version: '3.8'
   services:
     backend:
       image: excel-context-engine-backend
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=${DATABASE_URL}
         - OPENAI_API_KEY=${OPENAI_API_KEY}
         - REDIS_URL=${REDIS_URL}
       depends_on:
         - postgres
         - redis
       restart: unless-stopped
   
     frontend:
       image: excel-context-engine-frontend
       ports:
         - "80:80"
       depends_on:
         - backend
       restart: unless-stopped
   
     postgres:
       image: postgres:15
       environment:
         - POSTGRES_DB=excel_context_engine_prod
         - POSTGRES_USER=${DB_USER}
         - POSTGRES_PASSWORD=${DB_PASSWORD}
       volumes:
         - postgres_data:/var/lib/postgresql/data
       restart: unless-stopped
   
     redis:
       image: redis:7-alpine
       command: redis-server --requirepass ${REDIS_PASSWORD}
       volumes:
         - redis_data:/data
       restart: unless-stopped
   
   volumes:
     postgres_data:
     redis_data:
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Option 2: Cloud Platform Deployment

#### Heroku Deployment

1. **Install Heroku CLI**
   ```bash
   # Install Heroku CLI
   curl https://cli-assets.heroku.com/install.sh | sh
   
   # Login
   heroku login
   ```

2. **Create Heroku Apps**
   ```bash
   # Create backend app
   heroku create your-app-name-backend
   
   # Create frontend app
   heroku create your-app-name-frontend
   ```

3. **Configure Environment Variables**
   ```bash
   # Backend environment variables
   heroku config:set NODE_ENV=production -a your-app-name-backend
   heroku config:set OPENAI_API_KEY=your-key -a your-app-name-backend
   heroku config:set DATABASE_URL=your-db-url -a your-app-name-backend
   heroku config:set REDIS_URL=your-redis-url -a your-app-name-backend
   ```

4. **Add Heroku Addons**
   ```bash
   # PostgreSQL
   heroku addons:create heroku-postgresql:standard-0 -a your-app-name-backend
   
   # Redis
   heroku addons:create heroku-redis:premium-0 -a your-app-name-backend
   ```

5. **Deploy**
   ```bash
   # Deploy backend
   cd backend
   git push heroku main
   
   # Deploy frontend
   cd ../frontend
   git push heroku main
   ```

#### AWS Deployment

1. **Create EC2 Instance**
   - Launch Ubuntu 20.04 LTS instance
   - Configure security groups (ports 22, 80, 443, 3000)
   - Attach IAM role with necessary permissions

2. **Setup Server**
   ```bash
   # Connect to instance
   ssh -i your-key.pem ubuntu@your-instance-ip
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install nginx -y
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone https://github.com/your-repo/excel-context-engine.git
   cd excel-context-engine
   
   # Install dependencies and build
   npm install
   npm run build
   
   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
   
       location / {
           root /path/to/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
   
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 3: Kubernetes Deployment

1. **Create Kubernetes Manifests**
   ```yaml
   # backend-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: backend
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: backend
     template:
       metadata:
         labels:
           app: backend
       spec:
         containers:
         - name: backend
           image: excel-context-engine-backend:latest
           ports:
           - containerPort: 3000
           env:
           - name: NODE_ENV
             value: "production"
           - name: DATABASE_URL
             valueFrom:
               secretKeyRef:
                 name: app-secrets
                 key: database-url
           - name: OPENAI_API_KEY
             valueFrom:
               secretKeyRef:
                 name: app-secrets
                 key: openai-api-key
   ```

2. **Deploy to Kubernetes**
   ```bash
   kubectl apply -f k8s/
   ```

## SSL/TLS Configuration

### Using Let's Encrypt (Recommended)

1. **Install Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```

2. **Obtain SSL Certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-renewal**
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

## Monitoring and Logging

### Application Monitoring

1. **Health Checks**
   - Endpoint: `GET /api/v1/health`
   - Monitor: Response time, status, database connectivity
   - Frequency: Every 30 seconds

2. **Performance Metrics**
   - Response times
   - Request rates
   - Error rates
   - Memory usage
   - CPU usage

3. **Business Metrics**
   - File uploads per day
   - Context analysis requests
   - OpenAI API usage
   - User sessions

### Logging Configuration

1. **Log Levels**
   - Production: `info` and above
   - Staging: `debug` and above
   - Development: `silly` (all logs)

2. **Log Rotation**
   ```javascript
   // winston configuration
   new winston.transports.DailyRotateFile({
     filename: 'logs/application-%DATE%.log',
     datePattern: 'YYYY-MM-DD',
     maxSize: '20m',
     maxFiles: '14d'
   })
   ```

3. **Centralized Logging** (Optional)
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Splunk
   - DataDog
   - New Relic

## Security Hardening

### Server Security

1. **Firewall Configuration**
   ```bash
   # UFW (Ubuntu)
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

2. **SSH Hardening**
   ```bash
   # Disable root login
   sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
   
   # Disable password authentication
   sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
   
   # Restart SSH
   sudo systemctl restart ssh
   ```

3. **System Updates**
   ```bash
   # Enable automatic security updates
   sudo apt install unattended-upgrades -y
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

### Application Security

1. **Environment Variables**
   - Never commit secrets to version control
   - Use environment-specific configuration
   - Rotate secrets regularly

2. **Database Security**
   - Use connection pooling
   - Enable SSL connections
   - Regular backups
   - Access control

3. **API Security**
   - Rate limiting enabled
   - Input validation
   - CORS properly configured
   - Security headers (helmet.js)

## Backup and Recovery

### Database Backups

1. **Automated Backups**
   ```bash
   #!/bin/bash
   # backup-db.sh
   DATE=$(date +%Y%m%d_%H%M%S)
   pg_dump $DATABASE_URL > backups/db_backup_$DATE.sql
   
   # Keep only last 7 days
   find backups/ -name "db_backup_*.sql" -mtime +7 -delete
   ```

2. **Backup Schedule**
   ```bash
   # Add to crontab
   0 2 * * * /path/to/backup-db.sh
   ```

### File Backups

1. **Application Files**
   ```bash
   # Backup application directory
   tar -czf backups/app_backup_$(date +%Y%m%d).tar.gz /path/to/app
   ```

2. **User Uploads**
   ```bash
   # Sync to cloud storage
   aws s3 sync /path/to/uploads s3://your-backup-bucket/uploads
   ```

## Performance Optimization

### Database Optimization

1. **Indexes**
   - Ensure all frequently queried columns have indexes
   - Monitor slow queries
   - Regular VACUUM and ANALYZE

2. **Connection Pooling**
   ```javascript
   // knex configuration
   pool: {
     min: 2,
     max: 20,
     acquireTimeoutMillis: 30000,
     idleTimeoutMillis: 600000
   }
   ```

### Caching Strategy

1. **Redis Caching**
   - Cache frequently accessed data
   - Set appropriate TTL values
   - Monitor cache hit rates

2. **CDN Configuration**
   - Serve static assets from CDN
   - Configure proper cache headers
   - Enable gzip compression

### Application Optimization

1. **Node.js Optimization**
   ```bash
   # PM2 cluster mode
   pm2 start app.js -i max
   
   # Memory optimization
   node --max-old-space-size=4096 app.js
   ```

2. **Frontend Optimization**
   - Code splitting
   - Lazy loading
   - Asset optimization
   - Service worker caching

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   ```bash
   # Check memory usage
   free -h
   htop
   
   # Check Node.js memory
   pm2 monit
   ```

2. **Database Connection Issues**
   ```bash
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check connection pool
   # Monitor pool metrics in application logs
   ```

3. **OpenAI API Issues**
   ```bash
   # Check API key validity
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   
   # Monitor rate limits
   # Check application logs for API errors
   ```

### Log Analysis

1. **Application Logs**
   ```bash
   # View recent logs
   pm2 logs --lines 100
   
   # Search for errors
   grep -i error logs/application.log
   ```

2. **System Logs**
   ```bash
   # System logs
   sudo journalctl -u your-service -f
   
   # Nginx logs
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer Configuration**
   ```nginx
   upstream backend {
       server backend1:3000;
       server backend2:3000;
       server backend3:3000;
   }
   ```

2. **Database Scaling**
   - Read replicas for read-heavy workloads
   - Connection pooling
   - Query optimization

3. **Caching Layer**
   - Redis cluster for high availability
   - Application-level caching
   - CDN for static assets

### Vertical Scaling

1. **Resource Monitoring**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network I/O

2. **Scaling Triggers**
   - CPU > 80% for 5 minutes
   - Memory > 85% for 5 minutes
   - Response time > 2 seconds

## Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review application logs
   - Check system resources
   - Verify backups
   - Update dependencies (security patches)

2. **Monthly**
   - Performance review
   - Security audit
   - Database maintenance
   - Cost optimization review

3. **Quarterly**
   - Disaster recovery testing
   - Security penetration testing
   - Performance benchmarking
   - Architecture review

### Update Process

1. **Staging Deployment**
   ```bash
   # Deploy to staging
   git checkout main
   git pull origin main
   npm run build
   npm run test:all
   # Deploy to staging environment
   ```

2. **Production Deployment**
   ```bash
   # Zero-downtime deployment
   pm2 reload ecosystem.config.js
   
   # Or blue-green deployment
   # Switch traffic to new version
   ```

## Support and Documentation

### Runbooks

1. **Incident Response**
   - Escalation procedures
   - Contact information
   - Common fixes

2. **Deployment Procedures**
   - Step-by-step deployment guide
   - Rollback procedures
   - Verification steps

### Monitoring Dashboards

1. **Application Dashboard**
   - Request rates
   - Response times
   - Error rates
   - Business metrics

2. **Infrastructure Dashboard**
   - Server resources
   - Database performance
   - Network metrics
   - Security events

---

## Quick Start Checklist

- [ ] Environment variables configured
- [ ] Database setup and migrated
- [ ] Redis configured
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Security hardening applied
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Team trained on procedures

For additional support, refer to the troubleshooting guide or contact the development team.