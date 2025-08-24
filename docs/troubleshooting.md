# Troubleshooting Guide

Common issues and solutions for the Excel Context Engine.

## Installation Issues

### Node.js Version Conflicts

**Problem**: Error about Node.js version compatibility
```
error excel-context-engine@1.0.0: The engine "node" is incompatible with this module
```

**Solution**:
1. Check your Node.js version: `node --version`
2. Install Node.js 18.0.0 or higher
3. Use nvm to manage versions: `nvm install 18 && nvm use 18`

### npm Install Failures

**Problem**: Dependencies fail to install
```
npm ERR! peer dep missing
```

**Solution**:
1. Clear npm cache: `npm cache clean --force`
2. Delete node_modules: `rm -rf node_modules package-lock.json`
3. Reinstall: `npm install`

## Database Issues

### Connection Failures

**Problem**: Cannot connect to PostgreSQL
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions**:
1. **Check if PostgreSQL is running**:
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. **Verify connection settings**:
   ```bash
   # Test connection
   psql -h localhost -p 5432 -U username -d database_name
   ```

3. **Check environment variables**:
   ```bash
   echo $DATABASE_URL
   ```

### Migration Errors

**Problem**: Database migrations fail
```
Error: relation "contexts" does not exist
```

**Solution**:
1. Run migrations manually:
   ```bash
   npm run db:migrate --workspace=backend
   ```

2. Check migration status:
   ```bash
   npx knex migrate:status --workspace=backend
   ```

3. Reset database if needed:
   ```bash
   npm run db:migrate:rollback --workspace=backend
   npm run db:migrate --workspace=backend
   ```

## File Upload Issues

### File Size Limits

**Problem**: Large files fail to upload
```
Error: File too large
```

**Solutions**:
1. **Check file size limit** in `.env`:
   ```env
   MAX_FILE_SIZE=100MB
   ```

2. **Increase nginx limits** (if using nginx):
   ```nginx
   client_max_body_size 100M;
   ```

3. **Optimize file size**:
   - Remove unnecessary sheets
   - Compress images in Excel files
   - Save as .xlsx instead of .xls

### Unsupported File Formats

**Problem**: File format not supported
```
Error: INVALID_FILE_FORMAT
```

**Solution**:
1. **Check supported formats**: .xlsx, .xls, .csv
2. **Convert file format**:
   - Save Excel file as .xlsx
   - Export as CSV for simple data
3. **Check file extension** matches content

### Corrupted Files

**Problem**: File parsing fails
```
Error: File appears to be corrupted
```

**Solutions**:
1. **Try opening file in Excel** to verify it's not corrupted
2. **Re-save the file** in Excel
3. **Check file permissions** and accessibility
4. **Try a different file** to isolate the issue

## API Issues

### Rate Limiting

**Problem**: Too many requests error
```
Error: Rate limit exceeded
```

**Solutions**:
1. **Wait for rate limit reset** (15 minutes by default)
2. **Implement request throttling** in your client
3. **Increase rate limits** in production:
   ```env
   RATE_LIMIT_MAX_REQUESTS=200
   RATE_LIMIT_WINDOW_MS=900000
   ```

### OpenAI API Errors

**Problem**: AI analysis fails
```
Error: OpenAI API request failed
```

**Solutions**:
1. **Check API key**:
   ```bash
   echo $OPENAI_API_KEY
   ```

2. **Verify API key validity**:
   ```bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```

3. **Check API quota and billing**
4. **System falls back to rule-based analysis** if OpenAI fails

### CORS Errors

**Problem**: Cross-origin requests blocked
```
Error: CORS policy blocked
```

**Solutions**:
1. **Check CORS configuration**:
   ```env
   CORS_ORIGIN=http://localhost:5173,https://your-domain.com
   ```

2. **Update frontend API URL**:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api/v1
   ```

## Performance Issues

### Slow File Processing

**Problem**: Large files take too long to process

**Solutions**:
1. **Check system resources**:
   ```bash
   # Memory usage
   free -h
   
   # CPU usage
   top
   ```

2. **Optimize file size**:
   - Remove unnecessary data
   - Use CSV for simple datasets
   - Split large files into smaller chunks

3. **Increase timeout limits**:
   ```env
   REQUEST_TIMEOUT=60000
   ```

### Memory Issues

**Problem**: Out of memory errors
```
Error: JavaScript heap out of memory
```

**Solutions**:
1. **Increase Node.js memory limit**:
   ```bash
   node --max-old-space-size=4096 dist/index.js
   ```

2. **Monitor memory usage**:
   ```bash
   # Check metrics endpoint
   curl http://localhost:3000/api/v1/metrics | grep memory
   ```

3. **Implement file streaming** for very large files

### Slow API Responses

**Problem**: API responses are slow

**Diagnostics**:
1. **Check health endpoint**:
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

2. **Monitor response times**:
   ```bash
   curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/health
   ```

**Solutions**:
1. **Enable caching** with Redis
2. **Optimize database queries**
3. **Use CDN** for static assets
4. **Scale horizontally** with load balancer

## Frontend Issues

### Build Failures

**Problem**: Frontend build fails
```
Error: Build failed with errors
```

**Solutions**:
1. **Check Node.js version** (18.0.0+)
2. **Clear build cache**:
   ```bash
   rm -rf frontend/dist frontend/node_modules/.vite
   npm run build --workspace=frontend
   ```

3. **Check TypeScript errors**:
   ```bash
   npm run type-check --workspace=frontend
   ```

### Runtime Errors

**Problem**: JavaScript errors in browser

**Diagnostics**:
1. **Open browser console** (F12)
2. **Check network tab** for failed requests
3. **Look for error messages** in console

**Solutions**:
1. **Clear browser cache**
2. **Check API connectivity**:
   ```javascript
   fetch('http://localhost:3000/api/v1/health')
     .then(r => r.json())
     .then(console.log)
   ```

3. **Verify environment variables**

## Testing Issues

### E2E Test Failures

**Problem**: Playwright tests fail
```
Error: Test timeout exceeded
```

**Solutions**:
1. **Ensure services are running**:
   ```bash
   npm run dev
   ```

2. **Check test file paths**:
   ```bash
   ls e2e/fixtures/files/
   ```

3. **Run tests in headed mode**:
   ```bash
   npm run test:e2e:headed
   ```

4. **Increase timeouts** in `playwright.config.ts`

### Unit Test Failures

**Problem**: Jest tests fail

**Solutions**:
1. **Run tests with verbose output**:
   ```bash
   npm run test -- --verbose
   ```

2. **Check test database** connection
3. **Mock external services** properly
4. **Update test snapshots**:
   ```bash
   npm run test -- --updateSnapshot
   ```

## Monitoring Issues

### Missing Logs

**Problem**: No log files generated

**Solutions**:
1. **Check log directory permissions**:
   ```bash
   mkdir -p backend/logs
   chmod 755 backend/logs
   ```

2. **Verify log level**:
   ```env
   LOG_LEVEL=info
   ```

3. **Check Winston configuration**

### Metrics Not Available

**Problem**: Metrics endpoint returns errors

**Solutions**:
1. **Check metrics endpoint**:
   ```bash
   curl http://localhost:3000/api/v1/metrics
   ```

2. **Verify Prometheus client** is properly configured
3. **Check for metric registration** errors in logs

## Production Issues

### SSL Certificate Errors

**Problem**: HTTPS not working
```
Error: SSL certificate verification failed
```

**Solutions**:
1. **Check certificate validity**:
   ```bash
   openssl x509 -in cert.pem -text -noout
   ```

2. **Verify certificate chain**
3. **Update certificate** if expired
4. **Check nginx SSL configuration**

### Load Balancer Issues

**Problem**: Requests not reaching backend

**Solutions**:
1. **Check health checks** are passing
2. **Verify load balancer configuration**
3. **Check backend service** is running
4. **Review load balancer logs**

## Getting Help

### Debug Information

When reporting issues, include:

1. **System information**:
   ```bash
   node --version
   npm --version
   uname -a
   ```

2. **Error logs**:
   ```bash
   tail -n 50 backend/logs/error-$(date +%Y-%m-%d).log
   ```

3. **Configuration** (without secrets):
   ```bash
   env | grep -E "(NODE_ENV|PORT|DATABASE_URL)" | sed 's/=.*/=***/'
   ```

### Log Collection

**Collect comprehensive logs**:
```bash
#!/bin/bash
# collect-logs.sh
mkdir -p debug-info
cp backend/logs/*.log debug-info/
docker-compose logs > debug-info/docker-logs.txt
npm run test 2>&1 | tee debug-info/test-output.txt
curl -s http://localhost:3000/api/v1/health > debug-info/health-check.json
tar -czf debug-info.tar.gz debug-info/
```

### Support Channels

1. **GitHub Issues**: Report bugs and feature requests
2. **Documentation**: Check comprehensive guides
3. **Health Check**: Use `/api/v1/health` for system status
4. **Logs**: Check application logs for detailed errors

### Common Commands

**Quick diagnostics**:
```bash
# Check all services
npm run dev &
sleep 10
curl http://localhost:3000/api/v1/health
curl http://localhost:5173

# Test file upload
curl -X POST http://localhost:3000/api/v1/upload-spreadsheet \
  -F "file=@test.csv"

# Run all tests
npm run test:all
```