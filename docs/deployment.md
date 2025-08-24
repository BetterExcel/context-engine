# Deployment Guide

This guide covers deploying the Excel Context Engine to various production environments.

## Table of Contents

- [Production Requirements](#production-requirements)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Considerations](#security-considerations)
- [Performance Optimization](#performance-optimization)
- [Backup and Recovery](#backup-and-recovery)

## Production Requirements

### System Requirements

**Minimum Requirements**:
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB
- Network: 100 Mbps

**Recommended Requirements**:
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 100GB+ SSD
- Network: 1 Gbps

### Software Dependencies

- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 12.0 or higher (optional)
- **Redis**: 6.0 or higher (for caching, optional)
- **Nginx**: 1.18+ (for reverse proxy)
- **SSL Certificate**: For HTTPS

## Environment Configuration

### Production Environment Variables

Create production environment files:

**Backend (.env.production)**:
```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://username:password@db-host:5432/excel_context_engine
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=20

# OpenAI Configuration
OPENAI_API_KEY=your_production_openai_key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000
OPENAI_TIMEOUT=30000

# Security
JWT_SECRET=your_secure_jwt_secret_here
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=100MB
UPLOAD_PATH=/app/uploads
ALLOWED_FILE_TYPES=.xlsx,.xls,.csv

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000

# External Services
REDIS_URL=redis://redis-host:6379
SENTRY_DSN=your_sentry_dsn_here
```

**Frontend (.env.production)**:
```env
VITE_API_BASE_URL=https://api.your-domain.com/api/v1
VITE_APP_NAME=Excel Context Engine
VITE_ENVIRONMENT=production
VITE_SENTRY_DSN=your_frontend_sentry_dsn
```

## Docker Deployment

### Docker Compose Setup

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: excel_context_engine
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/database/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis (optional, for caching)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/excel_context_engine
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped
    volumes:
      - ./ssl:/etc/nginx/ssl:ro

volumes:
  postgres_data:
  uploads:
  logs:
```

### Backend Dockerfile

Create `backend/Dockerfile.prod`:

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create directories
RUN mkdir -p /app/uploads /app/logs
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/index.js"]
```

### Frontend Dockerfile

Create `frontend/Dockerfile.prod`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx
RUN adduser -S nginx -u 1001

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

Create `frontend/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    upstream backend {
        server backend:3000;
    }

    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Frontend
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;

            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # API proxy
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;

            # File upload size
            client_max_body_size 100M;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### Deployment Commands

```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Update application
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

## Cloud Deployment

### AWS Deployment

#### Using AWS ECS

1. **Create ECR repositories**:
```bash
aws ecr create-repository --repository-name excel-context-engine/backend
aws ecr create-repository --repository-name excel-context-engine/frontend
```

2. **Build and push images**:
```bash
# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and tag images
docker build -t excel-context-engine/backend ./backend
docker tag excel-context-engine/backend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/excel-context-engine/backend:latest

# Push images
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/excel-context-engine/backend:latest
```

3. **Create ECS task definition** (`ecs-task-definition.json`):
```json
{
  "family": "excel-context-engine",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/excel-context-engine/backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:excel-context-engine/database-url"
        },
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:excel-context-engine/openai-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/excel-context-engine",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Using AWS Lambda (Serverless)

Create `serverless.yml`:
```yaml
service: excel-context-engine

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NODE_ENV: production
    DATABASE_URL: ${env:DATABASE_URL}
    OPENAI_API_KEY: ${env:OPENAI_API_KEY}

functions:
  api:
    handler: dist/lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
    timeout: 30
    memorySize: 1024

plugins:
  - serverless-offline
  - serverless-webpack

custom:
  webpack:
    webpackConfig: webpack.config.js
```

### Google Cloud Platform

#### Using Cloud Run

1. **Build and deploy**:
```bash
# Build image
gcloud builds submit --tag gcr.io/PROJECT_ID/excel-context-engine-backend ./backend

# Deploy to Cloud Run
gcloud run deploy excel-context-engine-backend \
  --image gcr.io/PROJECT_ID/excel-context-engine-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL=postgresql://... \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10
```

### Azure Deployment

#### Using Container Instances

```bash
# Create resource group
az group create --name excel-context-engine --location eastus

# Create container instance
az container create \
  --resource-group excel-context-engine \
  --name excel-context-engine-backend \
  --image your-registry/excel-context-engine-backend:latest \
  --cpu 2 \
  --memory 4 \
  --ports 3000 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables DATABASE_URL=postgresql://... OPENAI_API_KEY=...
```

## Monitoring and Logging

### Application Monitoring

1. **Health Checks**:
```bash
# Kubernetes health check
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: backend
    livenessProbe:
      httpGet:
        path: /api/v1/health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /api/v1/health
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
```

2. **Metrics Collection**:
```yaml
# Prometheus configuration
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'excel-context-engine'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/v1/metrics'
```

3. **Log Aggregation**:
```yaml
# Fluentd configuration
<source>
  @type tail
  path /app/logs/*.log
  pos_file /var/log/fluentd-excel-context-engine.log.pos
  tag excel-context-engine.*
  format json
</source>

<match excel-context-engine.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name excel-context-engine
</match>
```

### Error Tracking

Configure Sentry for error tracking:

```javascript
// backend/src/monitoring/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

export default Sentry;
```

## Security Considerations

### SSL/TLS Configuration

1. **Obtain SSL Certificate**:
```bash
# Using Let's Encrypt
certbot certonly --webroot -w /var/www/html -d your-domain.com
```

2. **Security Headers**:
```nginx
# Add to nginx configuration
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

### Environment Security

1. **Secrets Management**:
```bash
# Using Docker secrets
echo "your_database_password" | docker secret create db_password -
echo "your_openai_key" | docker secret create openai_key -
```

2. **Network Security**:
```yaml
# Docker network isolation
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

### Access Control

1. **Rate Limiting**:
```javascript
// Enhanced rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
```

2. **CORS Configuration**:
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
}));
```

## Performance Optimization

### Caching Strategy

1. **Redis Caching**:
```javascript
// Cache frequently accessed data
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache spreadsheet data
async function cacheSpreadsheet(id, data) {
  await client.setex(`spreadsheet:${id}`, 3600, JSON.stringify(data));
}
```

2. **CDN Configuration**:
```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
  add_header Vary Accept-Encoding;
}
```

### Database Optimization

1. **Connection Pooling**:
```javascript
// Knex configuration
const knex = require('knex')({
  client: 'postgresql',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  }
});
```

2. **Database Indexes**:
```sql
-- Add indexes for better performance
CREATE INDEX idx_contexts_request_id ON contexts(request_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);
```

## Backup and Recovery

### Database Backup

1. **Automated Backups**:
```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
rm backup_$DATE.sql
```

2. **Backup Cron Job**:
```bash
# Add to crontab
0 2 * * * /path/to/backup-db.sh
```

### Disaster Recovery

1. **Database Restore**:
```bash
# Restore from backup
psql $DATABASE_URL < backup_20240101_020000.sql
```

2. **Application Recovery**:
```bash
# Rolling update with zero downtime
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale backend=2 backend
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale backend=1 backend
```

### Monitoring Checklist

- [ ] Health checks configured
- [ ] Metrics collection enabled
- [ ] Log aggregation setup
- [ ] Error tracking configured
- [ ] Alerting rules defined
- [ ] Backup strategy implemented
- [ ] SSL certificates configured
- [ ] Security headers enabled
- [ ] Rate limiting active
- [ ] Performance monitoring in place