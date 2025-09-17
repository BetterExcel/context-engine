import axios from 'axios';
import FormData from 'form-data';
import { readFileSync } from 'fs';
import { join } from 'path';

interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  requestsPerUser: number;
  testDuration: number; // in seconds
  rampUpTime: number; // in seconds
}

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

class LoadTester {
  private config: LoadTestConfig;
  private results: TestResult;
  private responseTimes: number[] = [];
  private errors: string[] = [];

  constructor(config: LoadTestConfig) {
    this.config = config;
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errors: []
    };
  }

  async runLoadTest(): Promise<TestResult> {
    console.log('Starting load test with configuration:', this.config);
    
    const startTime = Date.now();
    const promises: Promise<void>[] = [];

    // Create concurrent users
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      const userDelay = (this.config.rampUpTime * 1000 * i) / this.config.concurrentUsers;
      promises.push(this.simulateUser(i, userDelay));
    }

    // Wait for all users to complete
    await Promise.all(promises);

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;

    // Calculate results
    this.results.totalRequests = this.responseTimes.length;
    this.results.successfulRequests = this.responseTimes.length;
    this.results.failedRequests = this.errors.length;
    this.results.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    this.results.minResponseTime = Math.min(...this.responseTimes);
    this.results.maxResponseTime = Math.max(...this.responseTimes);
    this.results.requestsPerSecond = this.results.totalRequests / totalTime;
    this.results.errors = this.errors;

    return this.results;
  }

  private async simulateUser(userId: number, delay: number): Promise<void> {
    // Wait for ramp-up delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log(`User ${userId} starting...`);

    try {
      // Upload a file first
      const spreadsheetId = await this.uploadFile(userId);
      
      // Make multiple requests
      for (let i = 0; i < this.config.requestsPerUser; i++) {
        await this.makeAnalysisRequest(userId, spreadsheetId, i);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      this.errors.push(`User ${userId}: ${error.message}`);
    }

    console.log(`User ${userId} completed`);
  }

  private async uploadFile(userId: number): Promise<string> {
    const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
    const fileBuffer = readFileSync(testFile);
    
    const formData = new FormData();
    formData.append('file', fileBuffer, 'test-spreadsheet.xlsx');

    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/v1/upload-spreadsheet`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000
        }
      );

      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);

      return response.data.spreadsheet_id;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.errors.push(`Upload error for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  private async makeAnalysisRequest(userId: number, spreadsheetId: string, requestIndex: number): Promise<void> {
    const requests = [
      'Calculate the sum of column A',
      'Find the average of column B',
      'Count non-empty cells in the range',
      'Identify data types in this spreadsheet',
      'Show me formulas in this sheet',
      'Analyze patterns in the data',
      'Format cells as currency',
      'Sort data by first column'
    ];

    const request = requests[requestIndex % requests.length];
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/v1/analyze-context`,
        {
          request: `${request} (User ${userId}, Request ${requestIndex})`,
          spreadsheet_id: spreadsheetId,
          current_selection: {
            sheet: 'Sheet1',
            range: 'A1:C10',
            active_cell: 'A1'
          },
          user_context: {
            session_id: `load-test-user-${userId}`
          }
        },
        {
          timeout: 30000
        }
      );

      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);

      if (!response.data.success) {
        this.errors.push(`Analysis failed for user ${userId}, request ${requestIndex}: ${response.data.error?.message}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.errors.push(`Analysis error for user ${userId}, request ${requestIndex}: ${error.message}`);
    }
  }

  printResults(): void {
    console.log('\n=== LOAD TEST RESULTS ===');
    console.log(`Total Requests: ${this.results.totalRequests}`);
    console.log(`Successful Requests: ${this.results.successfulRequests}`);
    console.log(`Failed Requests: ${this.results.failedRequests}`);
    console.log(`Success Rate: ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`);
    console.log(`Average Response Time: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`Min Response Time: ${this.results.minResponseTime}ms`);
    console.log(`Max Response Time: ${this.results.maxResponseTime}ms`);
    console.log(`Requests Per Second: ${this.results.requestsPerSecond.toFixed(2)}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n=== ERRORS ===');
      this.results.errors.forEach(error => console.log(error));
    }

    // Performance thresholds
    console.log('\n=== PERFORMANCE ANALYSIS ===');
    console.log(`Average response time ${this.results.averageResponseTime < 3000 ? '✓' : '✗'} (< 3000ms)`);
    console.log(`Success rate ${this.results.successfulRequests / this.results.totalRequests >= 0.95 ? '✓' : '✗'} (>= 95%)`);
    console.log(`Requests per second ${this.results.requestsPerSecond >= 10 ? '✓' : '✗'} (>= 10 RPS)`);
  }
}

// Large file load testing
class LargeFileLoadTester {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async testLargeFileProcessing(): Promise<void> {
    console.log('Testing large file processing...');

    const testFiles = [
      'e2e/fixtures/files/large-dataset.xlsx',
      'e2e/fixtures/files/complex-spreadsheet.xlsx'
    ];

    for (const filePath of testFiles) {
      console.log(`\nTesting file: ${filePath}`);
      
      try {
        const fileBuffer = readFileSync(join(__dirname, '../../', filePath));
        console.log(`File size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`);

        // Upload test
        const uploadStartTime = Date.now();
        const formData = new FormData();
        formData.append('file', fileBuffer, 'large-test-file.xlsx');

        const uploadResponse = await axios.post(
          `${this.baseUrl}/api/v1/upload-spreadsheet`,
          formData,
          {
            headers: formData.getHeaders(),
            timeout: 60000 // 1 minute timeout for large files
          }
        );

        const uploadTime = Date.now() - uploadStartTime;
        console.log(`Upload time: ${uploadTime}ms`);

        if (!uploadResponse.data.success) {
          console.log('Upload failed:', uploadResponse.data.error);
          continue;
        }

        const spreadsheetId = uploadResponse.data.spreadsheet_id;

        // Analysis test
        const analysisStartTime = Date.now();
        const analysisResponse = await axios.post(
          `${this.baseUrl}/api/v1/analyze-context`,
          {
            request: 'Analyze patterns in this large dataset',
            spreadsheet_id: spreadsheetId,
            current_selection: {
              sheet: 'Sheet1',
              range: 'A1:Z1000',
              active_cell: 'A1'
            }
          },
          {
            timeout: 60000
          }
        );

        const analysisTime = Date.now() - analysisStartTime;
        console.log(`Analysis time: ${analysisTime}ms`);

        if (analysisResponse.data.success) {
          console.log('✓ Large file processing successful');
        } else {
          console.log('✗ Large file analysis failed:', analysisResponse.data.error);
        }

      } catch (error) {
        console.log(`✗ Error processing ${filePath}:`, error.message);
      }
    }
  }
}

// Memory stress testing
class MemoryStressTester {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async testMemoryUsage(): Promise<void> {
    console.log('Testing memory usage under stress...');

    const testFile = join(__dirname, '../../e2e/fixtures/files/simple-spreadsheet.xlsx');
    const fileBuffer = readFileSync(testFile);

    // Upload multiple files
    const spreadsheetIds: string[] = [];
    
    for (let i = 0; i < 20; i++) {
      const formData = new FormData();
      formData.append('file', fileBuffer, `stress-test-${i}.xlsx`);

      try {
        const response = await axios.post(
          `${this.baseUrl}/api/v1/upload-spreadsheet`,
          formData,
          {
            headers: formData.getHeaders(),
            timeout: 30000
          }
        );

        if (response.data.success) {
          spreadsheetIds.push(response.data.spreadsheet_id);
        }
      } catch (error) {
        console.log(`Upload ${i} failed:`, error.message);
      }
    }

    console.log(`Uploaded ${spreadsheetIds.length} files`);

    // Make many analysis requests
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < 100; i++) {
      const spreadsheetId = spreadsheetIds[i % spreadsheetIds.length];
      
      promises.push(
        axios.post(
          `${this.baseUrl}/api/v1/analyze-context`,
          {
            request: `Memory stress test request ${i}`,
            spreadsheet_id: spreadsheetId,
            current_selection: {
              sheet: 'Sheet1',
              range: 'A1:C10',
              active_cell: 'A1'
            }
          },
          {
            timeout: 30000
          }
        ).then(() => {
          if (i % 10 === 0) {
            console.log(`Completed ${i + 1}/100 requests`);
          }
        }).catch(error => {
          console.log(`Request ${i} failed:`, error.message);
        })
      );
    }

    await Promise.all(promises);
    console.log('Memory stress test completed');
  }
}

// Main execution
async function runAllLoadTests(): Promise<void> {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  
  console.log(`Running load tests against: ${baseUrl}`);

  // Test 1: Basic load test
  console.log('\n=== BASIC LOAD TEST ===');
  const basicConfig: LoadTestConfig = {
    baseUrl,
    concurrentUsers: 10,
    requestsPerUser: 5,
    testDuration: 60,
    rampUpTime: 10
  };

  const basicTester = new LoadTester(basicConfig);
  await basicTester.runLoadTest();
  basicTester.printResults();

  // Test 2: High concurrency test
  console.log('\n=== HIGH CONCURRENCY TEST ===');
  const highConcurrencyConfig: LoadTestConfig = {
    baseUrl,
    concurrentUsers: 50,
    requestsPerUser: 3,
    testDuration: 120,
    rampUpTime: 20
  };

  const highConcurrencyTester = new LoadTester(highConcurrencyConfig);
  await highConcurrencyTester.runLoadTest();
  highConcurrencyTester.printResults();

  // Test 3: Large file processing
  console.log('\n=== LARGE FILE PROCESSING TEST ===');
  const largeFileTester = new LargeFileLoadTester(baseUrl);
  await largeFileTester.testLargeFileProcessing();

  // Test 4: Memory stress test
  console.log('\n=== MEMORY STRESS TEST ===');
  const memoryTester = new MemoryStressTester(baseUrl);
  await memoryTester.testMemoryUsage();

  console.log('\n=== ALL LOAD TESTS COMPLETED ===');
}

// Export for use in tests
export { LoadTester, LargeFileLoadTester, MemoryStressTester, runAllLoadTests };

// Run if called directly
if (require.main === module) {
  runAllLoadTests().catch(console.error);
}