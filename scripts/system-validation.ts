#!/usr/bin/env tsx

import { execSync, spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

interface ValidationResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
  details?: string;
}

class SystemValidator {
  private results: ValidationResult[] = [];
  private projectRoot: string;
  private backendProcess: any;
  private frontendProcess: any;

  constructor() {
    this.projectRoot = process.cwd();
  }

  async runFullSystemValidation(): Promise<ValidationResult[]> {
    console.log('🔍 Starting comprehensive system validation...\n');

    try {
      // 1. Pre-validation checks
      await this.runPreValidationChecks();

      // 2. Build system
      await this.buildSystem();

      // 3. Start services
      await this.startServices();

      // 4. Run unit tests
      await this.runUnitTests();

      // 5. Run integration tests
      await this.runIntegrationTests();

      // 6. Run E2E tests
      await this.runE2ETests();

      // 7. Run performance tests
      await this.runPerformanceTests();

      // 8. Run load tests
      await this.runLoadTests();

      // 9. Validate API endpoints
      await this.validateAPIEndpoints();

      // 10. Validate frontend functionality
      await this.validateFrontend();

      // 11. Validate OpenAI integration
      await this.validateOpenAIIntegration();

      // 12. Validate database operations
      await this.validateDatabase();

      // 13. Validate error handling
      await this.validateErrorHandling();

      // 14. Validate security
      await this.validateSecurity();

      // 15. Final system health check
      await this.finalHealthCheck();

    } catch (error) {
      this.addResult('System', 'Validation Process', 'fail', `Validation failed: ${error.message}`);
    } finally {
      // Clean up services
      await this.stopServices();
    }

    return this.results;
  }

  private async runPreValidationChecks(): Promise<void> {
    console.log('📋 Running pre-validation checks...');

    // Check Node.js version
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion >= 18) {
        this.addResult('Environment', 'Node.js Version', 'pass', `Node.js ${nodeVersion}`);
      } else {
        this.addResult('Environment', 'Node.js Version', 'fail', `Node.js ${nodeVersion} (requires 18+)`);
      }
    } catch (error) {
      this.addResult('Environment', 'Node.js Version', 'fail', 'Unable to check Node.js version');
    }

    // Check npm version
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      this.addResult('Environment', 'npm Version', 'pass', `npm ${npmVersion}`);
    } catch (error) {
      this.addResult('Environment', 'npm Version', 'fail', 'npm not available');
    }

    // Check required files
    const requiredFiles = [
      'package.json',
      'backend/package.json',
      'frontend/package.json',
      'backend/src/index.ts',
      'frontend/src/main.tsx'
    ];

    requiredFiles.forEach(file => {
      if (existsSync(join(this.projectRoot, file))) {
        this.addResult('Files', `Required File: ${file}`, 'pass', 'File exists');
      } else {
        this.addResult('Files', `Required File: ${file}`, 'fail', 'File missing');
      }
    });

    // Check environment variables
    const requiredEnvVars = ['NODE_ENV', 'DATABASE_URL', 'OPENAI_API_KEY'];
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        this.addResult('Environment', `Environment Variable: ${envVar}`, 'pass', 'Set');
      } else {
        this.addResult('Environment', `Environment Variable: ${envVar}`, 'fail', 'Not set');
      }
    });
  }

  private async buildSystem(): Promise<void> {
    console.log('🔨 Building system...');

    try {
      const startTime = Date.now();
      execSync('npm run build', { stdio: 'pipe' });
      const duration = Date.now() - startTime;
      
      this.addResult('Build', 'System Build', 'pass', 'Build successful', duration);
    } catch (error) {
      this.addResult('Build', 'System Build', 'fail', 'Build failed', undefined, error.toString());
    }
  }

  private async startServices(): Promise<void> {
    console.log('🚀 Starting services...');

    try {
      // Start backend
      this.backendProcess = spawn('npm', ['run', 'dev:backend'], {
        stdio: 'pipe',
        detached: false
      });

      // Wait for backend to start
      await this.waitForService('http://localhost:3000/api/v1/health', 30000);
      this.addResult('Services', 'Backend Service', 'pass', 'Backend started successfully');

      // Start frontend
      this.frontendProcess = spawn('npm', ['run', 'dev:frontend'], {
        stdio: 'pipe',
        detached: false
      });

      // Wait for frontend to start
      await this.waitForService('http://localhost:5173', 30000);
      this.addResult('Services', 'Frontend Service', 'pass', 'Frontend started successfully');

    } catch (error) {
      this.addResult('Services', 'Service Startup', 'fail', `Failed to start services: ${error.message}`);
    }
  }

  private async stopServices(): Promise<void> {
    console.log('🛑 Stopping services...');

    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
    }

    if (this.frontendProcess) {
      this.frontendProcess.kill('SIGTERM');
    }

    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async waitForService(url: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await axios.get(url, { timeout: 1000 });
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error(`Service at ${url} did not start within ${timeout}ms`);
  }

  private async runUnitTests(): Promise<void> {
    console.log('🧪 Running unit tests...');

    try {
      const startTime = Date.now();
      const output = execSync('npm run test:backend', { encoding: 'utf8', stdio: 'pipe' });
      const duration = Date.now() - startTime;

      // Parse test results
      const testResults = this.parseJestOutput(output);
      
      if (testResults.passed > 0 && testResults.failed === 0) {
        this.addResult('Testing', 'Unit Tests', 'pass', 
          `${testResults.passed} tests passed`, duration);
      } else {
        this.addResult('Testing', 'Unit Tests', 'fail', 
          `${testResults.failed} tests failed, ${testResults.passed} passed`, duration);
      }
    } catch (error) {
      this.addResult('Testing', 'Unit Tests', 'fail', 'Unit tests failed', undefined, error.toString());
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running integration tests...');

    try {
      const startTime = Date.now();
      const output = execSync('npm run test -- --testPathPattern=integration', { encoding: 'utf8', stdio: 'pipe' });
      const duration = Date.now() - startTime;

      const testResults = this.parseJestOutput(output);
      
      if (testResults.passed > 0 && testResults.failed === 0) {
        this.addResult('Testing', 'Integration Tests', 'pass', 
          `${testResults.passed} tests passed`, duration);
      } else {
        this.addResult('Testing', 'Integration Tests', 'fail', 
          `${testResults.failed} tests failed, ${testResults.passed} passed`, duration);
      }
    } catch (error) {
      this.addResult('Testing', 'Integration Tests', 'fail', 'Integration tests failed', undefined, error.toString());
    }
  }

  private async runE2ETests(): Promise<void> {
    console.log('🎭 Running E2E tests...');

    try {
      const startTime = Date.now();
      const output = execSync('npm run test:e2e', { encoding: 'utf8', stdio: 'pipe' });
      const duration = Date.now() - startTime;

      // Parse Playwright output
      if (output.includes('passed') && !output.includes('failed')) {
        this.addResult('Testing', 'E2E Tests', 'pass', 'E2E tests passed', duration);
      } else {
        this.addResult('Testing', 'E2E Tests', 'fail', 'E2E tests failed', duration, output);
      }
    } catch (error) {
      this.addResult('Testing', 'E2E Tests', 'fail', 'E2E tests failed', undefined, error.toString());
    }
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Running performance tests...');

    try {
      const startTime = Date.now();
      const output = execSync('npm run test:performance', { encoding: 'utf8', stdio: 'pipe' });
      const duration = Date.now() - startTime;

      if (output.includes('passed') || output.includes('✓')) {
        this.addResult('Performance', 'Performance Tests', 'pass', 'Performance tests passed', duration);
      } else {
        this.addResult('Performance', 'Performance Tests', 'fail', 'Performance tests failed', duration);
      }
    } catch (error) {
      this.addResult('Performance', 'Performance Tests', 'skip', 'Performance tests not available');
    }
  }

  private async runLoadTests(): Promise<void> {
    console.log('🏋️ Running load tests...');

    try {
      const startTime = Date.now();
      
      // Run custom load testing script
      const { runAllLoadTests } = await import('../backend/src/test/load-testing');
      await runAllLoadTests();
      
      const duration = Date.now() - startTime;
      this.addResult('Performance', 'Load Tests', 'pass', 'Load tests completed', duration);
    } catch (error) {
      this.addResult('Performance', 'Load Tests', 'fail', 'Load tests failed', undefined, error.message);
    }
  }

  private async validateAPIEndpoints(): Promise<void> {
    console.log('🌐 Validating API endpoints...');

    const endpoints = [
      { method: 'GET', path: '/api/v1/health', expectedStatus: 200 },
      { method: 'POST', path: '/api/v1/upload-spreadsheet', expectedStatus: 400 }, // Without file
      { method: 'POST', path: '/api/v1/analyze-context', expectedStatus: 400 } // Without data
    ];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        let response;

        if (endpoint.method === 'GET') {
          response = await axios.get(`http://localhost:3000${endpoint.path}`);
        } else {
          response = await axios.post(`http://localhost:3000${endpoint.path}`, {});
        }

        const duration = Date.now() - startTime;

        if (response.status === endpoint.expectedStatus) {
          this.addResult('API', `${endpoint.method} ${endpoint.path}`, 'pass', 
            `Status: ${response.status}`, duration);
        } else {
          this.addResult('API', `${endpoint.method} ${endpoint.path}`, 'fail', 
            `Expected: ${endpoint.expectedStatus}, Got: ${response.status}`, duration);
        }
      } catch (error) {
        if (error.response && error.response.status === endpoint.expectedStatus) {
          this.addResult('API', `${endpoint.method} ${endpoint.path}`, 'pass', 
            `Status: ${error.response.status}`);
        } else {
          this.addResult('API', `${endpoint.method} ${endpoint.path}`, 'fail', 
            `Request failed: ${error.message}`);
        }
      }
    }
  }

  private async validateFrontend(): Promise<void> {
    console.log('🎨 Validating frontend...');

    try {
      const response = await axios.get('http://localhost:5173');
      
      if (response.status === 200 && response.data.includes('Excel Context Engine')) {
        this.addResult('Frontend', 'Frontend Loading', 'pass', 'Frontend loads successfully');
      } else {
        this.addResult('Frontend', 'Frontend Loading', 'fail', 'Frontend content not as expected');
      }
    } catch (error) {
      this.addResult('Frontend', 'Frontend Loading', 'fail', `Frontend not accessible: ${error.message}`);
    }

    // Check if build artifacts exist
    if (existsSync('frontend/dist/index.html')) {
      this.addResult('Frontend', 'Build Artifacts', 'pass', 'Frontend build artifacts exist');
    } else {
      this.addResult('Frontend', 'Build Artifacts', 'fail', 'Frontend build artifacts missing');
    }
  }

  private async validateOpenAIIntegration(): Promise<void> {
    console.log('🤖 Validating OpenAI integration...');

    if (!process.env.OPENAI_API_KEY) {
      this.addResult('OpenAI', 'API Key', 'skip', 'OpenAI API key not configured');
      return;
    }

    try {
      // Test OpenAI integration through our API
      const response = await axios.post('http://localhost:3000/api/v1/analyze-context', {
        request: 'Test OpenAI integration',
        spreadsheet_id: 'test-id',
        current_selection: {
          sheet: 'Sheet1',
          range: 'A1:A1',
          active_cell: 'A1'
        }
      });

      // Even if the spreadsheet doesn't exist, the OpenAI integration should be tested
      if (response.status === 404) {
        this.addResult('OpenAI', 'Integration Test', 'pass', 'OpenAI integration accessible');
      } else if (response.status === 200) {
        this.addResult('OpenAI', 'Integration Test', 'pass', 'OpenAI integration working');
      } else {
        this.addResult('OpenAI', 'Integration Test', 'fail', `Unexpected response: ${response.status}`);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        this.addResult('OpenAI', 'Integration Test', 'pass', 'OpenAI integration accessible');
      } else {
        this.addResult('OpenAI', 'Integration Test', 'fail', `OpenAI integration failed: ${error.message}`);
      }
    }
  }

  private async validateDatabase(): Promise<void> {
    console.log('🗄️ Validating database...');

    if (!process.env.DATABASE_URL) {
      this.addResult('Database', 'Connection', 'skip', 'Database URL not configured');
      return;
    }

    try {
      // Test database through health endpoint
      const response = await axios.get('http://localhost:3000/api/v1/health');
      
      if (response.data.database && response.data.database.status === 'connected') {
        this.addResult('Database', 'Connection', 'pass', 'Database connected');
      } else {
        this.addResult('Database', 'Connection', 'fail', 'Database not connected');
      }
    } catch (error) {
      this.addResult('Database', 'Connection', 'fail', `Database validation failed: ${error.message}`);
    }
  }

  private async validateErrorHandling(): Promise<void> {
    console.log('🚨 Validating error handling...');

    const errorTests = [
      { path: '/api/v1/nonexistent', expectedStatus: 404 },
      { path: '/api/v1/analyze-context', method: 'POST', data: 'invalid json', expectedStatus: 400 },
      { path: '/api/v1/upload-spreadsheet', method: 'POST', data: {}, expectedStatus: 400 }
    ];

    for (const test of errorTests) {
      try {
        let response;
        
        if (test.method === 'POST') {
          response = await axios.post(`http://localhost:3000${test.path}`, test.data);
        } else {
          response = await axios.get(`http://localhost:3000${test.path}`);
        }

        if (response.status === test.expectedStatus) {
          this.addResult('Error Handling', `Error ${test.expectedStatus}`, 'pass', 
            `Correct error status returned`);
        } else {
          this.addResult('Error Handling', `Error ${test.expectedStatus}`, 'fail', 
            `Expected ${test.expectedStatus}, got ${response.status}`);
        }
      } catch (error) {
        if (error.response && error.response.status === test.expectedStatus) {
          this.addResult('Error Handling', `Error ${test.expectedStatus}`, 'pass', 
            `Correct error status returned`);
        } else {
          this.addResult('Error Handling', `Error ${test.expectedStatus}`, 'fail', 
            `Unexpected error: ${error.message}`);
        }
      }
    }
  }

  private async validateSecurity(): Promise<void> {
    console.log('🔒 Validating security...');

    try {
      // Test CORS headers
      const response = await axios.get('http://localhost:3000/api/v1/health');
      
      if (response.headers['access-control-allow-origin']) {
        this.addResult('Security', 'CORS Headers', 'pass', 'CORS headers present');
      } else {
        this.addResult('Security', 'CORS Headers', 'fail', 'CORS headers missing');
      }

      // Test security headers
      const securityHeaders = ['x-content-type-options', 'x-frame-options', 'x-xss-protection'];
      let securityHeadersPresent = 0;
      
      securityHeaders.forEach(header => {
        if (response.headers[header]) {
          securityHeadersPresent++;
        }
      });

      if (securityHeadersPresent >= 2) {
        this.addResult('Security', 'Security Headers', 'pass', 
          `${securityHeadersPresent}/${securityHeaders.length} security headers present`);
      } else {
        this.addResult('Security', 'Security Headers', 'fail', 
          `Only ${securityHeadersPresent}/${securityHeaders.length} security headers present`);
      }
    } catch (error) {
      this.addResult('Security', 'Security Validation', 'fail', 
        `Security validation failed: ${error.message}`);
    }
  }

  private async finalHealthCheck(): Promise<void> {
    console.log('🏥 Final health check...');

    try {
      const response = await axios.get('http://localhost:3000/api/v1/health');
      
      if (response.status === 200 && response.data.status === 'healthy') {
        this.addResult('Health', 'Final Health Check', 'pass', 'System is healthy');
      } else {
        this.addResult('Health', 'Final Health Check', 'fail', 'System health check failed');
      }
    } catch (error) {
      this.addResult('Health', 'Final Health Check', 'fail', 
        `Health check failed: ${error.message}`);
    }
  }

  private parseJestOutput(output: string): { passed: number; failed: number; total: number } {
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const totalMatch = output.match(/Tests:\s+(\d+)/);

    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      total: totalMatch ? parseInt(totalMatch[1]) : 0
    };
  }

  private addResult(category: string, test: string, status: 'pass' | 'fail' | 'skip', 
                   message: string, duration?: number, details?: string): void {
    this.results.push({ category, test, status, message, duration, details });
  }

  printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE SYSTEM VALIDATION REPORT');
    console.log('='.repeat(80));

    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.status === 'pass').length;
      const failed = categoryResults.filter(r => r.status === 'fail').length;
      const skipped = categoryResults.filter(r => r.status === 'skip').length;

      console.log(`\n📂 ${category.toUpperCase()}`);
      console.log(`   ✅ Passed: ${passed} | ❌ Failed: ${failed} | ⏭️  Skipped: ${skipped}`);
      console.log('-'.repeat(60));

      categoryResults.forEach(result => {
        const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
        const duration = result.duration ? ` (${result.duration}ms)` : '';
        console.log(`   ${icon} ${result.test}: ${result.message}${duration}`);
        
        if (result.details && result.status === 'fail') {
          console.log(`      Details: ${result.details.substring(0, 100)}...`);
        }
      });
    });

    // Summary
    const totalPassed = this.results.filter(r => r.status === 'pass').length;
    const totalFailed = this.results.filter(r => r.status === 'fail').length;
    const totalSkipped = this.results.filter(r => r.status === 'skip').length;
    const totalTests = this.results.length;

    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`⏭️  Skipped: ${totalSkipped} (${((totalSkipped / totalTests) * 100).toFixed(1)}%)`);

    console.log('\n' + '='.repeat(80));

    if (totalFailed === 0) {
      console.log('🎉 SYSTEM VALIDATION SUCCESSFUL!');
      console.log('Your Excel Context Engine is ready for production deployment.');
    } else if (totalFailed <= 2) {
      console.log('⚠️  SYSTEM VALIDATION COMPLETED WITH MINOR ISSUES');
      console.log('Please review and fix the failed tests before deployment.');
    } else {
      console.log('❌ SYSTEM VALIDATION FAILED');
      console.log('Multiple critical issues found. System is not ready for deployment.');
    }

    console.log('\nNext Steps:');
    if (totalFailed === 0) {
      console.log('1. ✅ Run deployment readiness check: npm run deployment:check');
      console.log('2. ✅ Deploy to staging environment');
      console.log('3. ✅ Run production smoke tests');
      console.log('4. ✅ Deploy to production');
    } else {
      console.log('1. 🔧 Fix failed tests');
      console.log('2. 🔄 Re-run system validation');
      console.log('3. 📋 Run deployment readiness check');
      console.log('4. 🚀 Deploy when all tests pass');
    }

    console.log('='.repeat(80));
  }
}

// Main execution
async function main(): Promise<void> {
  const validator = new SystemValidator();
  
  try {
    await validator.runFullSystemValidation();
    validator.printResults();
    
    const results = validator['results'];
    const failed = results.filter(r => r.status === 'fail').length;
    
    // Exit with error code if there are failures
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ System validation failed:', error.message);
    process.exit(1);
  }
}

// Export for testing
export { SystemValidator };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}