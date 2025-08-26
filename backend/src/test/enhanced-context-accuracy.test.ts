/**
 * Enhanced Context API Accuracy Validation Tests
 * 
 * Domain-specific accuracy tests for enhanced contextual understanding
 */

import request from 'supertest';
import app from '../index';
import { spreadsheetStorage } from '../routes/upload';
import { SpreadsheetData, DataType } from '../types/spreadsheet';

describe('Enhanced Context API Accuracy Validation', () => {
  let financialDataId: string;
  let salesDataId: string;
  let inventoryDataId: string;

  beforeAll(() => {
    // Setup domain-specific test datasets
    financialDataId = 'sheet_financial_' + Date.now();
    salesDataId = 'sheet_sales_' + Date.now();
    inventoryDataId = 'sheet_inventory_' + Date.now();

    // Financial portfolio data
    const financialData = createFinancialPortfolioData();
    spreadsheetStorage.set(financialDataId, financialData);

    // Sales performance data
    const salesData = createSalesPerformanceData();
    spreadsheetStorage.set(salesDataId, salesData);

    // Inventory management data
    const inventoryData = createInventoryManagementData();
    spreadsheetStorage.set(inventoryDataId, inventoryData);
  });

  afterAll(() => {
    spreadsheetStorage.delete(financialDataId);
    spreadsheetStorage.delete(salesDataId);
    spreadsheetStorage.delete(inventoryDataId);
  });

  describe('Financial Domain Accuracy', () => {
    it('should correctly identify financial domain and metrics', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/domain-analysis')
        .send({
          spreadsheetId: financialDataId,
          analysisOptions: {
            includeFinancialMetrics: true,
            includeRiskAssessment: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const domainClassification = response.body.data.domainClassification;
      expect(domainClassification.primaryDomain).toBe('FINANCIAL');
      expect(domainClassification.confidence).toBeGreaterThan(0.8);
      
      const applicableMetrics = response.body.data.applicableMetrics;
      expect(applicableMetrics).toContainEqual(
        expect.objectContaining({
          type: expect.stringMatching(/portfolio|return|risk/i)
        })
      );
    });

    it('should provide accurate financial analysis for portfolio queries', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Calculate the total portfolio value and average return',
          spreadsheetId: financialDataId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:E10',
            activeCell: 'A1'
          },
          analysisOptions: {
            enableDomainIntelligence: true,
            analysisDepth: 'comprehensive'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const contextSynthesis = response.body.data.contextSynthesis;
      expect(contextSynthesis.insights).toContainEqual(
        expect.objectContaining({
          type: expect.stringMatching(/financial|portfolio|return/i)
        })
      );
      
      const agentPrompt = response.body.data.agentPrompt;
      if (agentPrompt) {
        expect(agentPrompt.excelFormulas).toContainEqual(
          expect.objectContaining({
            formula: expect.stringMatching(/SUM|AVERAGE/i)
          })
        );
      }
    });

    it('should identify financial risks accurately', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Assess the risk profile of this portfolio',
          spreadsheetId: financialDataId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:E10',
            activeCell: 'A1'
          },
          analysisOptions: {
            enableDomainIntelligence: true,
            analysisDepth: 'comprehensive'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const contextSynthesis = response.body.data.contextSynthesis;
      expect(contextSynthesis.risks).toBeDefined();
      expect(contextSynthesis.risks.length).toBeGreaterThan(0);
      
      const riskAssessment = contextSynthesis.risks.find(risk => 
        risk.type.toLowerCase().includes('financial') || 
        risk.type.toLowerCase().includes('market')
      );
      expect(riskAssessment).toBeDefined();
    });
  });

  describe('Sales Domain Accuracy', () => {
    it('should correctly identify sales domain and KPIs', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/domain-analysis')
        .send({
          spreadsheetId: salesDataId,
          analysisOptions: {
            includeBusinessKPIs: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const domainClassification = response.body.data.domainClassification;
      expect(['SALES', 'BUSINESS', 'MARKETING']).toContain(domainClassification.primaryDomain);
      
      const kpiRecommendations = response.body.data.kpiRecommendations;
      expect(kpiRecommendations).toContainEqual(
        expect.objectContaining({
          name: expect.stringMatching(/revenue|conversion|growth/i)
        })
      );
    });

    it('should provide accurate sales performance analysis', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'What is our best performing sales region and why?',
          spreadsheetId: salesDataId,
          currentSelection: {
            sheet: 'Sales',
            range: 'A1:F15',
            activeCell: 'A1'
          },
          analysisOptions: {
            enableDomainIntelligence: true,
            enableAutoSelection: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const intentAnalysis = response.body.data.intentAnalysis;
      expect(intentAnalysis.intent.primaryIntent).toMatch(/analysis|comparison/i);
      
      const autoSelection = response.body.data.autoSelection;
      if (autoSelection) {
        expect(autoSelection.explanation).toMatch(/region|performance|sales/i);
      }
    });
  });

  describe('Intent Classification Accuracy', () => {
    it('should accurately classify calculation intents', async () => {
      const testCases = [
        {
          query: 'Calculate the sum of all values in column B',
          expectedIntent: 'CALCULATION',
          spreadsheetId: financialDataId
        },
        {
          query: 'What is the average price across all items?',
          expectedIntent: 'CALCULATION',
          spreadsheetId: inventoryDataId
        },
        {
          query: 'Find the maximum revenue by region',
          expectedIntent: 'CALCULATION',
          spreadsheetId: salesDataId
        }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/v1/enhanced-context/analyze')
          .send({
            request: testCase.query,
            spreadsheetId: testCase.spreadsheetId,
            currentSelection: {
              sheet: 'Sheet1',
              range: 'A1:F10',
              activeCell: 'A1'
            }
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        
        const intentAnalysis = response.body.data.intentAnalysis;
        expect(intentAnalysis.intent.primaryIntent).toMatch(/calculation|formula|math/i);
        expect(intentAnalysis.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should accurately classify data analysis intents', async () => {
      const testCases = [
        {
          query: 'Show me trends in the data over time',
          expectedIntent: 'DATA_ANALYSIS'
        },
        {
          query: 'Find patterns and anomalies in sales performance',
          expectedIntent: 'DATA_ANALYSIS'
        },
        {
          query: 'Analyze the correlation between price and volume',
          expectedIntent: 'DATA_ANALYSIS'
        }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/v1/enhanced-context/analyze')
          .send({
            request: testCase.query,
            spreadsheetId: financialDataId,
            currentSelection: {
              sheet: 'Portfolio',
              range: 'A1:E10',
              activeCell: 'A1'
            }
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        
        const intentAnalysis = response.body.data.intentAnalysis;
        expect(intentAnalysis.intent.primaryIntent).toMatch(/analysis|data|pattern/i);
        expect(intentAnalysis.confidence).toBeGreaterThan(0.7);
      }
    });
  });

  describe('Auto-Selection Accuracy', () => {
    it('should accurately select relevant data for entity queries', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/auto-select')
        .send({
          query: 'Find information about Apple Inc',
          spreadsheetId: financialDataId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:E10',
            activeCell: 'A1'
          },
          selectionOptions: {
            expandRelated: true,
            includeHeaders: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const selections = response.body.data.selections;
      expect(selections.length).toBeGreaterThan(0);
      
      const bestSelection = response.body.data.recommendedSelection;
      expect(bestSelection).toBeDefined();
      expect(bestSelection.confidence).toBeGreaterThan(0.6);
      expect(bestSelection.explanation).toMatch(/apple/i);
    });

    it('should accurately select data ranges for calculations', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/auto-select')
        .send({
          query: 'Calculate total revenue for all regions',
          spreadsheetId: salesDataId,
          currentSelection: {
            sheet: 'Sales',
            range: 'A1:F15',
            activeCell: 'A1'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const recommendedSelection = response.body.data.recommendedSelection;
      expect(recommendedSelection).toBeDefined();
      expect(recommendedSelection.explanation).toMatch(/revenue|total|sum/i);
      expect(recommendedSelection.relevantColumns).toContainEqual(
        expect.objectContaining({
          name: expect.stringMatching(/revenue|sales|amount/i)
        })
      );
    });
  });

  describe('Agent Prompt Quality', () => {
    it('should generate executable Excel formulas', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Calculate the weighted average return of the portfolio',
          spreadsheetId: financialDataId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:E10',
            activeCell: 'A1'
          },
          analysisOptions: {
            enableAgentPrompts: true,
            enableDomainIntelligence: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const agentPrompt = response.body.data.agentPrompt;
      expect(agentPrompt).toBeDefined();
      expect(agentPrompt.excelFormulas).toBeDefined();
      expect(agentPrompt.excelFormulas.length).toBeGreaterThan(0);
      
      // Check formula syntax
      const formulas = agentPrompt.excelFormulas;
      formulas.forEach(formulaInstruction => {
        expect(formulaInstruction.formula).toMatch(/^=/); // Should start with =
        expect(formulaInstruction.formula).toMatch(/[A-Z]+\d+/); // Should contain cell references
      });
    });

    it('should provide comprehensive validation steps', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Analyze portfolio risk and provide recommendations',
          spreadsheetId: financialDataId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:E10',
            activeCell: 'A1'
          },
          analysisOptions: {
            enableAgentPrompts: true,
            analysisDepth: 'comprehensive'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const agentPrompt = response.body.data.agentPrompt;
      expect(agentPrompt).toBeDefined();
      expect(agentPrompt.validationSteps).toBeDefined();
      expect(agentPrompt.validationSteps.length).toBeGreaterThan(0);
      
      // Validation steps should be actionable
      agentPrompt.validationSteps.forEach(step => {
        expect(step.description).toBeDefined();
        expect(step.description.length).toBeGreaterThan(10);
        expect(step.expectedResult).toBeDefined();
      });
    });
  });

  describe('Confidence Scoring Accuracy', () => {
    it('should provide reliable confidence scores', async () => {
      const highConfidenceQuery = 'Calculate the sum of column B';
      const lowConfidenceQuery = 'What do you think about the market trends?';

      const highConfidenceResponse = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: highConfidenceQuery,
          spreadsheetId: financialDataId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:E10',
            activeCell: 'A1'
          }
        })
        .expect(200);

      const lowConfidenceResponse = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: lowConfidenceQuery,
          spreadsheetId: financialDataId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:E10',
            activeCell: 'A1'
          }
        })
        .expect(200);

      expect(highConfidenceResponse.body.success).toBe(true);
      expect(lowConfidenceResponse.body.success).toBe(true);

      const highConfidence = highConfidenceResponse.body.data.performance.metrics.confidenceScore;
      const lowConfidence = lowConfidenceResponse.body.data.performance.metrics.confidenceScore;

      expect(highConfidence).toBeGreaterThan(lowConfidence);
      expect(highConfidence).toBeGreaterThan(0.7);
      expect(lowConfidence).toBeLessThan(0.8);
    });
  });
});

// Helper functions to create domain-specific test data

function createFinancialPortfolioData(): SpreadsheetData {
  const rawData = [
    ['Symbol', 'Company', 'Shares', 'Price', 'Value', 'Return %'],
    ['AAPL', 'Apple Inc', '100', '150.00', '15000', '12.5'],
    ['MSFT', 'Microsoft', '50', '300.00', '15000', '8.3'],
    ['GOOGL', 'Alphabet', '10', '2500.00', '25000', '15.2'],
    ['TSLA', 'Tesla', '25', '800.00', '20000', '-5.1'],
    ['AMZN', 'Amazon', '20', '3200.00', '64000', '22.8'],
    ['META', 'Meta', '30', '250.00', '7500', '-12.3'],
    ['NVDA', 'NVIDIA', '15', '400.00', '6000', '45.7'],
    ['NFLX', 'Netflix', '40', '450.00', '18000', '18.9'],
    ['CRM', 'Salesforce', '35', '200.00', '7000', '6.2']
  ];

  const data = rawData.map((row, rowIndex) => 
    row.map((cell, colIndex) => {
      if (rowIndex === 0) {
        return { value: cell, dataType: DataType.TEXT };
      }
      if (colIndex === 0 || colIndex === 1) {
        return { value: cell, dataType: DataType.TEXT };
      }
      return { value: parseFloat(cell), dataType: DataType.NUMBER };
    })
  );

  return {
    id: 'portfolio_' + Date.now(),
    metadata: { filename: 'portfolio.csv', fileSize: 1024, mimeType: 'text/csv', uploadedAt: new Date() },
    sheets: [{
      name: 'Portfolio',
      data,
      dimensions: {
        rows: data.length,
        cols: data[0].length
      },
      formatting: [],
      namedRanges: []
    }],
    metadata: {
      filename: 'portfolio.csv',
      fileSize: 2048,
      mimeType: 'text/csv',
      uploadedAt: new Date()
    },
    formulas: [],
    namedRanges: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function createSalesPerformanceData(): SpreadsheetData {
  const rawData = [
    ['Region', 'Salesperson', 'Q1 Revenue', 'Q2 Revenue', 'Q3 Revenue', 'Q4 Revenue'],
    ['North', 'John Smith', '125000', '135000', '142000', '158000'],
    ['North', 'Jane Doe', '98000', '105000', '112000', '125000'],
    ['South', 'Bob Johnson', '87000', '92000', '98000', '105000'],
    ['South', 'Alice Brown', '156000', '162000', '175000', '189000'],
    ['East', 'Charlie Wilson', '134000', '128000', '145000', '152000'],
    ['East', 'Diana Lee', '112000', '118000', '125000', '132000'],
    ['West', 'Frank Miller', '178000', '185000', '192000', '205000'],
    ['West', 'Grace Taylor', '145000', '152000', '158000', '165000'],
    ['Central', 'Henry Davis', '98000', '102000', '108000', '115000'],
    ['Central', 'Ivy Chen', '167000', '172000', '178000', '185000'],
    ['North', 'Jack White', '89000', '94000', '98000', '102000'],
    ['South', 'Kelly Green', '134000', '139000', '145000', '152000'],
    ['East', 'Liam Black', '156000', '162000', '168000', '175000'],
    ['West', 'Mia Blue', '123000', '128000', '134000', '140000']
  ];

  const data = rawData.map((row, rowIndex) => 
    row.map((cell, colIndex) => {
      if (rowIndex === 0) {
        return { value: cell, dataType: DataType.TEXT };
      }
      if (colIndex === 0 || colIndex === 1) {
        return { value: cell, dataType: DataType.TEXT };
      }
      return { value: parseFloat(cell), dataType: DataType.NUMBER };
    })
  );

  return {
    id: 'sales_' + Date.now(),
    metadata: { filename: 'sales_performance.csv', fileSize: 1024, mimeType: 'text/csv', uploadedAt: new Date() },
    sheets: [{
      name: 'Sales',
      data,
      dimensions: {
        rows: data.length,
        cols: data[0].length
      },
      formatting: [],
      namedRanges: []
    }],
    metadata: {
      filename: 'sales_performance.csv',
      fileSize: 3072,
      mimeType: 'text/csv',
      uploadedAt: new Date()
    },
    formulas: [],
    namedRanges: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function createInventoryManagementData(): SpreadsheetData {
  const rawData = [
    ['SKU', 'Product Name', 'Category', 'Stock Level', 'Unit Price', 'Reorder Point'],
    ['SKU001', 'Wireless Headphones', 'Electronics', '45', '99.99', '20'],
    ['SKU002', 'Coffee Maker', 'Appliances', '23', '149.99', '15'],
    ['SKU003', 'Office Chair', 'Furniture', '12', '299.99', '8'],
    ['SKU004', 'Laptop Stand', 'Electronics', '67', '49.99', '25'],
    ['SKU005', 'Desk Lamp', 'Furniture', '34', '79.99', '18'],
    ['SKU006', 'Water Bottle', 'Accessories', '89', '24.99', '40'],
    ['SKU007', 'Keyboard', 'Electronics', '56', '129.99', '30'],
    ['SKU008', 'Monitor', 'Electronics', '18', '399.99', '10'],
    ['SKU009', 'Notebook', 'Stationery', '156', '12.99', '75']
  ];

  const data = rawData.map((row, rowIndex) => 
    row.map((cell, colIndex) => {
      if (rowIndex === 0) {
        return { value: cell, dataType: DataType.TEXT };
      }
      if (colIndex === 0 || colIndex === 1 || colIndex === 2) {
        return { value: cell, dataType: DataType.TEXT };
      }
      return { value: parseFloat(cell), dataType: DataType.NUMBER };
    })
  );

  return {
    id: 'inventory_' + Date.now(),
    metadata: { filename: 'inventory.csv', fileSize: 1024, mimeType: 'text/csv', uploadedAt: new Date() },
    sheets: [{
      name: 'Inventory',
      data,
      dimensions: {
        rows: data.length,
        cols: data[0].length
      },
      formatting: [],
      namedRanges: []
    }],
    metadata: {
      filename: 'inventory.csv',
      fileSize: 1536,
      mimeType: 'text/csv',
      uploadedAt: new Date()
    },
    formulas: [],
    namedRanges: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}