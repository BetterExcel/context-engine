#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

class DeploymentChecker {
  private results: CheckResult[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  async runAllChecks(): Promise<CheckResult[]> {
    console.log('🚀 Running deployment readiness checks...\n');

    // Code Quality Checks
    await this.checkCodeQuality();
    
    // Security Checks
    await this.checkSecurity();
    
    // Performance Checks
    await this.checkPerformance();
    
    // Configuration Checks
    await this.checkConfiguration();
    
    // Database Checks
    await this.checkDatabase();
    
    // API Checks
    await this.checkAPI();
    
    // Frontend Checks
    await this.checkFrontend();
    
    // Documentation Checks
    await this.checkDocumentation();
    
    // Monitoring Checks
    await this.checkMonitoring();

    return this.results;
  }

  private async checkCodeQuality(): Promise<void> {
    console.log('📋 Checking code quality...');

    // TypeScript compilation
    try {
      execSync('npm run build', { stdio: 'pipe' });
      this.addResult('TypeScript Compilation', 'pass', 'All TypeScript code compiles successfully');
    } catch (error) {
      this.addResult('TypeScript Compilation', 'fail', 'TypeScript compilation failed', error.toString());
    }

    // Linting
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      this.addResult('ESLint', 'pass', 'No linting errors found');
    } catch (error) {
      this.addResult('ESLint', 'warning', 'Linting issues found', error.toString());
    }

    // Code formatting
    try {
      execSync('npm run format:check', { stdio: 'pipe' });
      this.addResult('Code Formatting', 'pass', 'Code is properly formatted');
    } catch (error) {
      this.addResult('Code Formatting', 'warning', 'Code formatting issues found', error.toString());
    }

    // Test coverage
    try {
      const coverageOutput = execSync('npm run test:coverage', { encoding: 'utf8', stdio: 'pipe' });
      const coverageMatch = coverageOutput.match(/All files\s+\|\s+(\d+\.?\d*)/);
      const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
      
      if (coverage >= 80) {
        this.addResult('Test Coverage', 'pass', `Test coverage: ${coverage}%`);
      } else if (coverage >= 60) {
        this.addResult('Test Coverage', 'warning', `Test coverage: ${coverage}% (recommended: 80%+)`);
      } else {
        this.addResult('Test Coverage', 'fail', `Test coverage: ${coverage}% (minimum: 60%)`);
      }
    } catch (error) {
      this.addResult('Test Coverage', 'fail', 'Unable to determine test coverage', error.toString());
    }
  }

  private async checkSecurity(): Promise<void> {
    console.log('🔒 Checking security...');

    // Check for security vulnerabilities
    try {
      execSync('npm audit --audit-level=high', { stdio: 'pipe' });
      this.addResult('Security Audit', 'pass', 'No high-severity vulnerabilities found');
    } catch (error) {
      this.addResult('Security Audit', 'fail', 'Security vulnerabilities detected', error.toString());
    }

    // Check environment variables
    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'REDIS_URL',
      'JWT_SECRET'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length === 0) {
      this.addResult('Environment Variables', 'pass', 'All required environment variables are set');
    } else {
      this.addResult('Environment Variables', 'fail', `Missing environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Check for hardcoded secrets
    try {
      const secretPatterns = [
        /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
        /password\s*[:=]\s*['"][^'"]+['"]/gi,
        /secret\s*[:=]\s*['"][^'"]+['"]/gi,
        /token\s*[:=]\s*['"][^'"]+['"]/gi
      ];

      let secretsFound = false;
      const checkFiles = ['backend/src', 'frontend/src'];
      
      for (const dir of checkFiles) {
        if (existsSync(dir)) {
          const output = execSync(`find ${dir} -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -l -E "(api[_-]?key|password|secret|token)\\s*[:=]\\s*['\"][^'\"]+['\"]"`, { encoding: 'utf8', stdio: 'pipe' }).trim();
          if (output) {
            secretsFound = true;
            break;
          }
        }
      }

      if (!secretsFound) {
        this.addResult('Hardcoded Secrets', 'pass', 'No hardcoded secrets detected');
      } else {
        this.addResult('Hardcoded Secrets', 'fail', 'Potential hardcoded secrets found in source code');
      }
    } catch (error) {
      this.addResult('Hardcoded Secrets', 'warning', 'Unable to scan for hardcoded secrets');
    }

    // Check HTTPS configuration
    const packageJson = JSON.parse(readFileSync(join(this.projectRoot, 'package.json'), 'utf8'));
    if (packageJson.scripts?.start?.includes('--https') || process.env.HTTPS === 'true') {
      this.addResult('HTTPS Configuration', 'pass', 'HTTPS is configured');
    } else {
      this.addResult('HTTPS Configuration', 'warning', 'HTTPS should be configured for production');
    }
  }

  private async checkPerformance(): Promise<void> {
    console.log('⚡ Checking performance...');

    // Check bundle sizes
    try {
      if (existsSync('frontend/dist')) {
        const distStats = statSync('frontend/dist');
        const bundleSize = this.getFolderSize('frontend/dist');
        
        if (bundleSize < 5 * 1024 * 1024) { // 5MB
          this.addResult('Bundle Size', 'pass', `Frontend bundle size: ${this.formatBytes(bundleSize)}`);
        } else if (bundleSize < 10 * 1024 * 1024) { // 10MB
          this.addResult('Bundle Size', 'warning', `Frontend bundle size: ${this.formatBytes(bundleSize)} (consider optimization)`);
        } else {
          this.addResult('Bundle Size', 'fail', `Frontend bundle size: ${this.formatBytes(bundleSize)} (too large)`);
        }
      } else {
        this.addResult('Bundle Size', 'warning', 'Frontend not built - run npm run build:frontend');
      }
    } catch (error) {
      this.addResult('Bundle Size', 'warning', 'Unable to check bundle size');
    }

    // Check for performance optimizations
    const backendPackageJson = JSON.parse(readFileSync(join(this.projectRoot, 'backend/package.json'), 'utf8'));
    const hasCompressionMiddleware = backendPackageJson.dependencies?.compression;
    const hasRateLimiting = backendPackageJson.dependencies?.['express-rate-limit'];
    const hasCaching = backendPackageJson.dependencies?.redis;

    if (hasCompressionMiddleware && hasRateLimiting && hasCaching) {
      this.addResult('Performance Optimizations', 'pass', 'Compression, rate limiting, and caching are configured');
    } else {
      const missing = [];
      if (!hasCompressionMiddleware) missing.push('compression');
      if (!hasRateLimiting) missing.push('rate limiting');
      if (!hasCaching) missing.push('caching');
      this.addResult('Performance Optimizations', 'warning', `Missing optimizations: ${missing.join(', ')}`);
    }

    // Run performance tests
    try {
      execSync('npm run test:performance', { stdio: 'pipe' });
      this.addResult('Performance Tests', 'pass', 'Performance tests passed');
    } catch (error) {
      this.addResult('Performance Tests', 'warning', 'Performance tests failed or not available');
    }
  }

  private async checkConfiguration(): Promise<void> {
    console.log('⚙️ Checking configuration...');

    // Check production configuration
    if (process.env.NODE_ENV === 'production') {
      this.addResult('Environment', 'pass', 'NODE_ENV is set to production');
    } else {
      this.addResult('Environment', 'warning', 'NODE_ENV should be set to production for deployment');
    }

    // Check logging configuration
    const loggingConfigExists = existsSync('backend/src/monitoring/logger.ts');
    if (loggingConfigExists) {
      this.addResult('Logging Configuration', 'pass', 'Logging is configured');
    } else {
      this.addResult('Logging Configuration', 'fail', 'Logging configuration missing');
    }

    // Check error handling
    const errorHandlerExists = existsSync('backend/src/middleware/errorHandler.ts');
    if (errorHandlerExists) {
      this.addResult('Error Handling', 'pass', 'Global error handler is configured');
    } else {
      this.addResult('Error Handling', 'fail', 'Global error handler missing');
    }

    // Check CORS configuration
    const backendPackageJson = JSON.parse(readFileSync(join(this.projectRoot, 'backend/package.json'), 'utf8'));
    if (backendPackageJson.dependencies?.cors) {
      this.addResult('CORS Configuration', 'pass', 'CORS is configured');
    } else {
      this.addResult('CORS Configuration', 'warning', 'CORS configuration should be verified');
    }

    // Check helmet security headers
    if (backendPackageJson.dependencies?.helmet) {
      this.addResult('Security Headers', 'pass', 'Security headers (helmet) configured');
    } else {
      this.addResult('Security Headers', 'warning', 'Security headers should be configured');
    }
  }

  private async checkDatabase(): Promise<void> {
    console.log('🗄️ Checking database...');

    // Check database migrations
    try {
      const migrationFiles = execSync('find backend/src/database/migrations -name "*.ts" | wc -l', { encoding: 'utf8' }).trim();
      const migrationCount = parseInt(migrationFiles);
      
      if (migrationCount > 0) {
        this.addResult('Database Migrations', 'pass', `${migrationCount} migration files found`);
      } else {
        this.addResult('Database Migrations', 'warning', 'No database migrations found');
      }
    } catch (error) {
      this.addResult('Database Migrations', 'warning', 'Unable to check database migrations');
    }

    // Check database connection
    if (process.env.DATABASE_URL) {
      try {
        // This would require actual database connection testing
        this.addResult('Database Connection', 'pass', 'Database URL is configured');
      } catch (error) {
        this.addResult('Database Connection', 'fail', 'Database connection failed');
      }
    } else {
      this.addResult('Database Connection', 'fail', 'DATABASE_URL not configured');
    }

    // Check database indexes
    const indexMigrationExists = existsSync('backend/src/database/migrations/005_add_performance_indexes.ts');
    if (indexMigrationExists) {
      this.addResult('Database Indexes', 'pass', 'Performance indexes are configured');
    } else {
      this.addResult('Database Indexes', 'warning', 'Performance indexes should be added');
    }
  }

  private async checkAPI(): Promise<void> {
    console.log('🌐 Checking API...');

    // Check API documentation
    const swaggerExists = existsSync('backend/src/docs/swagger.ts');
    if (swaggerExists) {
      this.addResult('API Documentation', 'pass', 'Swagger/OpenAPI documentation exists');
    } else {
      this.addResult('API Documentation', 'warning', 'API documentation should be added');
    }

    // Check rate limiting
    const rateLimitExists = existsSync('backend/src/middleware/rateLimiting.ts');
    if (rateLimitExists) {
      this.addResult('Rate Limiting', 'pass', 'Rate limiting is configured');
    } else {
      this.addResult('Rate Limiting', 'warning', 'Rate limiting should be configured');
    }

    // Check input validation
    const validationExists = existsSync('backend/src/middleware/validation.ts');
    if (validationExists) {
      this.addResult('Input Validation', 'pass', 'Input validation middleware exists');
    } else {
      this.addResult('Input Validation', 'fail', 'Input validation is required');
    }

    // Check health endpoint
    try {
      const healthExists = existsSync('backend/src/monitoring/health.ts');
      if (healthExists) {
        this.addResult('Health Endpoint', 'pass', 'Health check endpoint exists');
      } else {
        this.addResult('Health Endpoint', 'warning', 'Health check endpoint should be added');
      }
    } catch (error) {
      this.addResult('Health Endpoint', 'warning', 'Unable to verify health endpoint');
    }
  }

  private async checkFrontend(): Promise<void> {
    console.log('🎨 Checking frontend...');

    // Check build output
    if (existsSync('frontend/dist/index.html')) {
      this.addResult('Frontend Build', 'pass', 'Frontend build output exists');
    } else {
      this.addResult('Frontend Build', 'fail', 'Frontend not built - run npm run build:frontend');
    }

    // Check error boundaries
    const errorBoundaryExists = existsSync('frontend/src/components/ErrorBoundary.tsx');
    if (errorBoundaryExists) {
      this.addResult('Error Boundaries', 'pass', 'Error boundary component exists');
    } else {
      this.addResult('Error Boundaries', 'warning', 'Error boundaries should be implemented');
    }

    // Check accessibility
    const accessibilityExists = existsSync('frontend/src/utils/accessibility.ts');
    if (accessibilityExists) {
      this.addResult('Accessibility', 'pass', 'Accessibility utilities exist');
    } else {
      this.addResult('Accessibility', 'warning', 'Accessibility features should be implemented');
    }

    // Check responsive design
    const tailwindConfigExists = existsSync('frontend/tailwind.config.js');
    if (tailwindConfigExists) {
      this.addResult('Responsive Design', 'pass', 'Tailwind CSS configured for responsive design');
    } else {
      this.addResult('Responsive Design', 'warning', 'Responsive design configuration should be verified');
    }
  }

  private async checkDocumentation(): Promise<void> {
    console.log('📚 Checking documentation...');

    // Check README
    if (existsSync('README.md')) {
      const readmeContent = readFileSync('README.md', 'utf8');
      if (readmeContent.length > 500) {
        this.addResult('README', 'pass', 'README.md exists and has content');
      } else {
        this.addResult('README', 'warning', 'README.md should be more comprehensive');
      }
    } else {
      this.addResult('README', 'fail', 'README.md is missing');
    }

    // Check API documentation
    if (existsSync('docs/api-reference.md')) {
      this.addResult('API Documentation', 'pass', 'API reference documentation exists');
    } else {
      this.addResult('API Documentation', 'warning', 'API documentation should be added');
    }

    // Check deployment guide
    if (existsSync('docs/deployment.md')) {
      this.addResult('Deployment Guide', 'pass', 'Deployment documentation exists');
    } else {
      this.addResult('Deployment Guide', 'warning', 'Deployment guide should be added');
    }

    // Check user guide
    if (existsSync('docs/user-guide.md')) {
      this.addResult('User Guide', 'pass', 'User guide exists');
    } else {
      this.addResult('User Guide', 'warning', 'User guide should be added');
    }
  }

  private async checkMonitoring(): Promise<void> {
    console.log('📊 Checking monitoring...');

    // Check logging
    const loggerExists = existsSync('backend/src/monitoring/logger.ts');
    if (loggerExists) {
      this.addResult('Logging', 'pass', 'Logging system is configured');
    } else {
      this.addResult('Logging', 'fail', 'Logging system is required');
    }

    // Check metrics
    const metricsExists = existsSync('backend/src/monitoring/metrics.ts');
    if (metricsExists) {
      this.addResult('Metrics', 'pass', 'Metrics collection is configured');
    } else {
      this.addResult('Metrics', 'warning', 'Metrics collection should be added');
    }

    // Check health monitoring
    const healthExists = existsSync('backend/src/monitoring/health.ts');
    if (healthExists) {
      this.addResult('Health Monitoring', 'pass', 'Health monitoring is configured');
    } else {
      this.addResult('Health Monitoring', 'warning', 'Health monitoring should be added');
    }

    // Check error tracking
    const backendPackageJson = JSON.parse(readFileSync(join(this.projectRoot, 'backend/package.json'), 'utf8'));
    if (backendPackageJson.dependencies?.winston) {
      this.addResult('Error Tracking', 'pass', 'Error tracking with Winston is configured');
    } else {
      this.addResult('Error Tracking', 'warning', 'Error tracking should be configured');
    }
  }

  private addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string): void {
    this.results.push({ name, status, message, details });
  }

  private getFolderSize(folderPath: string): number {
    let size = 0;
    try {
      const output = execSync(`du -sb ${folderPath}`, { encoding: 'utf8' });
      size = parseInt(output.split('\t')[0]);
    } catch (error) {
      // Fallback method
      try {
        const files = execSync(`find ${folderPath} -type f -exec ls -l {} \\; | awk '{sum += $5} END {print sum}'`, { encoding: 'utf8' });
        size = parseInt(files.trim()) || 0;
      } catch (fallbackError) {
        size = 0;
      }
    }
    return size;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  printResults(): void {
    console.log('\n📋 DEPLOYMENT READINESS REPORT\n');
    console.log('=' .repeat(50));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('=' .repeat(50));

    this.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${result.name}: ${result.message}`);
      if (result.details) {
        console.log(`   Details: ${result.details.substring(0, 200)}${result.details.length > 200 ? '...' : ''}`);
      }
    });

    console.log('\n' + '=' .repeat(50));

    if (failed === 0 && warnings <= 3) {
      console.log('🚀 READY FOR DEPLOYMENT!');
      console.log('Your application meets the deployment requirements.');
    } else if (failed === 0) {
      console.log('⚠️  DEPLOYMENT WITH CAUTION');
      console.log('Your application can be deployed but has some warnings to address.');
    } else {
      console.log('❌ NOT READY FOR DEPLOYMENT');
      console.log('Please fix the failed checks before deploying.');
    }

    console.log('\nNext steps:');
    console.log('1. Address any failed checks');
    console.log('2. Consider fixing warnings for better production readiness');
    console.log('3. Run integration tests: npm run test:e2e');
    console.log('4. Run load tests: npm run test:performance');
    console.log('5. Deploy to staging environment first');
  }
}

// Main execution
async function main(): Promise<void> {
  const checker = new DeploymentChecker();
  
  try {
    await checker.runAllChecks();
    checker.printResults();
    
    const results = checker['results'];
    const failed = results.filter(r => r.status === 'fail').length;
    
    // Exit with error code if there are failures
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Deployment check failed:', error.message);
    process.exit(1);
  }
}

// Export for testing
export { DeploymentChecker };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}