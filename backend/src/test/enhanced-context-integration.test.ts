/**
 * Enhanced Context API Integration Tests
 * 
 * End-to-end integration tests validating all enhanced intelligence components
 * working together seamlessly
 */

import request from 'supertest';
import app from '../index';
import { spreadsheetStorage } from '../routes/upload';
import { SpreadsheetData, DataType } from '../types/spreadsheet';

describe('Enhanced Context API Integration Tests', () => {
  let testSpreadsheetId: string;
  let complexSpreadsheetId: string;

  beforeAll(() => {
    testSpreadsheetId = 'sheet_integration_' + Date.now();
    complexSpreadsheetId = 'sheet_complex_' + Date.now();

    // Create comprehensive test dataset
    const testData = createComprehensiveTestData();
    spreadsheetStorage.set(testSpreadsheetId, testData);

    // Create complex multi-domain dataset
    const complexData = createComplexMultiDomainData();
    spreadsheetStorage.set(complexSpreadsheetId, complexData);
  });

  afterAll(() => {
    spreadsheetStorage.delete(testSpreadsheetId);
    spreadsheetStorage.delete(complexSpreadsheetId);
  });

  describe('End-to-End Enhanced Analysis Workflow', () => {
    it('should perform complete enhanced analysis workflow', async () => {
      // Step 1: Domain Analysis
      const domainResponse = await request(app)
        .post('/api/v1/enhanced-context/domain-analysis')
        .send({
          spreadsheetId: testSpreadsheetId,
          analysisOptions: {
            includeFinancialMetrics: true,
            includeBusinessKPIs: true,
            includeRiskAssessment: true
          }
        })
        .expect(200);

      expect(domainResponse.body.success).toBe(true);
      const domainClassification = domainResponse.body.data.domainClassification;
      
      // Step 2: Auto-Selection based on domain
      const selectionResponse = await request(app)
        .post('/api/v1/enhanced-context/auto-select')
        .send({
          query: 'Find the best performing investments',
          spreadsheetId: testSpreadsheetId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:F20',
            activeCell: 'A1'
          },
          selectionOptions: {
            expandRelated: true,
            includeHeaders: true,
            maxSelections: 3
          }
        })
        .expect(200);

      expect(selectionResponse.body.success).toBe(true);
      const recommendedSelection = selectionResponse.body.data.recommendedSelection;
      
      // Step 3: Comprehensive Enhanced Analysis
      const analysisResponse = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Provide comprehensive analysis of portfolio performance with risk assessment',
          spreadsheetId: testSpreadsheetId,
          currentSelection: {
            sheet: 'Portfolio',
            range: recommendedSelection?.range || 'A1:F20',
            activeCell: 'A1'
          },
          analysisOptions: {
            enableDomainIntelligence: true,
            enableAutoSelection: true,
            enableAgentPrompts: true,
            enablePerformanceOptimization: true,
            analysisDepth: 'comprehensive',
            confidenceThreshold: 0.7,
            includeExplanations: true
          }
        })
        .expect(200);

      expect(analysisResponse.body.success).toBe(true);
      
      // Validate complete workflow results
      const analysisData = analysisResponse.body.data;
      
      // Intelligence Analysis
      expect(analysisData.intelligenceAnalysis).toBeDefined();
      expect(analysisData.intelligenceAnalysis.enhancementSummary).toBeDefined();
      expect(analysisData.intelligenceAnalysis.recommendations).toBeDefined();
      
      // Domain Intelligence
      expect(analysisData.domainIntelligence).toBeDefined();
      expect(analysisData.domainIntelligence.classification.primaryDomain).toBe(domainClassification.primaryDomain);
      
      // Intent Analysis
      expect(analysisData.intentAnalysis).toBeDefined();
      expect(analysisData.intentAnalysis.confidence).toBeGreaterThan(0.6);
      
      // Context Synthesis
      expect(analysisData.contextSynthesis).toBeDefined();
      expect(analysisData.contextSynthesis.insights).toBeDefined();
      expect(analysisData.contextSynthesis.risks).toBeDefined();
      expect(analysisData.contextSynthesis.opportunities).toBeDefined();
      
      // Agent Prompt
      expect(analysisData.agentPrompt).toBeDefined();
      expect(analysisData.agentPrompt.stepByStepActions).toBeDefined();
      expect(analysisData.agentPrompt.excelFormulas).toBeDefined();
      
      // Performance Metrics
      expect(analysisData.performance).toBeDefined();
      expect(analysisData.performance.processingTime).toBeGreaterThan(0);
      expect(analysisData.performance.metrics).toBeDefined();
    });

    it('should handle complex multi-domain analysis', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Analyze the relationship between sales performance and financial metrics',
          spreadsheetId: complexSpreadsheetId,
          currentSelection: {
            sheet: 'Combined',
            range: 'A1:J25',
            activeCell: 'A1'
          },
          analysisOptions: {
            enableDomainIntelligence: true,
            enableAutoSelection: true,
            enableAgentPrompts: true,
            analysisDepth: 'comprehensive'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const data = response.body.data;
      
      // Should detect multiple domains or hybrid domain
      const domainClassification = data.domainIntelligence.classification;
      expect(domainClassification.primaryDomain).toBeDefined();
      expect(domainClassification.subDomains?.length || 0).toBeGreaterThan(0);
      
      // Should provide cross-domain insights
      const insights = data.contextSynthesis.insights;
      expect(insights.length).toBeGreaterThan(0);
      
      const crossDomainInsight = insights.find(insight => 
        insight.description.toLowerCase().includes('relationship') ||
        insight.description.toLowerCase().includes('correlation')
      );
      expect(crossDomainInsight).toBeDefined();
    });
  });

  describe('Service Integration Validation', () => {
    it('should demonstrate enhanced intelligence service integration', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'What companies have the highest risk-adjusted returns?',
          spreadsheetId: testSpreadsheetId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:F20',
            activeCell: 'A1'
          },
          analysisOptions: {
            enableDomainIntelligence: true,
            enableAutoSelection: true,
            analysisDepth: 'detailed'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const data = response.body.data;
      
      // Enhanced Intelligence Service results
      const enhancementSummary = data.intelligenceAnalysis.enhancementSummary;
      expect(enhancementSummary.totalCellsAnalyzed).toBeGreaterThan(0);
      expect(enhancementSummary.companiesRecognized).toBeGreaterThan(0);
      expect(enhancementSummary.qualityScore).toBeGreaterThan(0);
      
      // Domain Intelligence Engine results
      const domainAnalysis = data.domainIntelligence.analysis;
      expect(domainAnalysis.applicableMetrics).toBeDefined();
      expect(domainAnalysis.suggestedFormulas).toBeDefined();
      
      // Intent Analysis results
      const intentAnalysis = data.intentAnalysis;
      expect(intentAnalysis.intent.primaryIntent).toMatch(/analysis|calculation|comparison/i);
      
      // Auto-selection results (if enabled)
      if (data.autoSelection) {
        expect(data.autoSelection.confidence).toBeGreaterThan(0.5);
        expect(data.autoSelection.explanation).toMatch(/risk|return|company/i);
      }
    });

    it('should validate context synthesis engine integration', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Identify investment opportunities and risks in this portfolio',
          spreadsheetId: testSpreadsheetId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:F20',
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
      
      // Should identify opportunities
      expect(contextSynthesis.opportunities).toBeDefined();
      expect(contextSynthesis.opportunities.length).toBeGreaterThan(0);
      
      const opportunity = contextSynthesis.opportunities[0];
      expect(opportunity.type).toBeDefined();
      expect(opportunity.description).toBeDefined();
      expect(opportunity.impact).toBeDefined();
      expect(opportunity.confidence).toBeGreaterThan(0);
      
      // Should identify risks
      expect(contextSynthesis.risks).toBeDefined();
      expect(contextSynthesis.risks.length).toBeGreaterThan(0);
      
      const risk = contextSynthesis.risks[0];
      expect(risk.type).toBeDefined();
      expect(risk.description).toBeDefined();
      expect(risk.severity).toBeDefined();
      expect(risk.likelihood).toBeGreaterThan(0);
      
      // Should provide actionable next steps
      expect(contextSynthesis.nextSteps).toBeDefined();
      expect(contextSynthesis.nextSteps.length).toBeGreaterThan(0);
      
      const nextStep = contextSynthesis.nextSteps[0];
      expect(nextStep.action).toBeDefined();
      expect(nextStep.priority).toBeDefined();
      expect(nextStep.estimatedEffort).toBeDefined();
    });

    it('should validate agent prompt generator integration', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Create a portfolio rebalancing strategy based on risk tolerance',
          spreadsheetId: testSpreadsheetId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:F20',
            activeCell: 'A1'
          },
          analysisOptions: {
            enableAgentPrompts: true,
            enableDomainIntelligence: true,
            analysisDepth: 'comprehensive'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const agentPrompt = response.body.data.agentPrompt;
      expect(agentPrompt).toBeDefined();
      
      // Should provide comprehensive instructions
      expect(agentPrompt.summary).toBeDefined();
      expect(agentPrompt.detailedInstructions).toBeDefined();
      expect(agentPrompt.stepByStepActions).toBeDefined();
      expect(agentPrompt.stepByStepActions.length).toBeGreaterThan(0);
      
      // Should include Excel formulas
      expect(agentPrompt.excelFormulas).toBeDefined();
      expect(agentPrompt.excelFormulas.length).toBeGreaterThan(0);
      
      const formula = agentPrompt.excelFormulas[0];
      expect(formula.formula).toMatch(/^=/);
      expect(formula.description).toBeDefined();
      expect(formula.cellReference).toBeDefined();
      
      // Should include validation steps
      expect(agentPrompt.validationSteps).toBeDefined();
      expect(agentPrompt.validationSteps.length).toBeGreaterThan(0);
      
      const validationStep = agentPrompt.validationSteps[0];
      expect(validationStep.description).toBeDefined();
      expect(validationStep.expectedResult).toBeDefined();
      
      // Should define expected outcome
      expect(agentPrompt.expectedOutcome).toBeDefined();
      expect(agentPrompt.expectedOutcome.description).toBeDefined();
      expect(agentPrompt.expectedOutcome.successCriteria).toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    it('should demonstrate performance optimization integration', async () => {
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Perform comprehensive analysis with all optimizations enabled',
          spreadsheetId: complexSpreadsheetId,
          currentSelection: {
            sheet: 'Combined',
            range: 'A1:J25',
            activeCell: 'A1'
          },
          analysisOptions: {
            enableDomainIntelligence: true,
            enableAutoSelection: true,
            enableAgentPrompts: true,
            enablePerformanceOptimization: true,
            analysisDepth: 'comprehensive'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const performance = response.body.data.performance;
      expect(performance).toBeDefined();
      
      // Should include optimization results
      expect(performance.optimization).toBeDefined();
      
      // Should provide detailed metrics
      expect(performance.metrics).toBeDefined();
      expect(performance.metrics.cellsAnalyzed).toBeGreaterThan(0);
      expect(performance.metrics.qualityScore).toBeGreaterThanOrEqual(0);
      expect(performance.metrics.confidenceScore).toBeGreaterThanOrEqual(0);
      
      // Processing time should be reasonable
      expect(performance.processingTime).toBeLessThan(15000); // Less than 15 seconds
    });
  });

  describe('Error Handling Integration', () => {
    it('should gracefully handle service failures', async () => {
      // Test with invalid spreadsheet ID
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Analyze non-existent data',
          spreadsheetId: 'sheet_invalid_123',
          currentSelection: {
            sheet: 'Sheet1',
            range: 'A1:C10',
            activeCell: 'A1'
          }
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SPREADSHEET_NOT_FOUND');
      expect(response.body.error.suggestions).toBeDefined();
    });

    it('should handle partial service failures gracefully', async () => {
      // This test would require mocking specific services to fail
      // For now, we'll test with edge case data that might cause issues
      const response = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Analyze this data with special characters: @#$%^&*()',
          spreadsheetId: testSpreadsheetId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:F20',
            activeCell: 'A1'
          },
          analysisOptions: {
            enableDomainIntelligence: true,
            enableAutoSelection: true,
            analysisDepth: 'basic'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should still provide some analysis even with challenging input
      expect(response.body.data.intelligenceAnalysis).toBeDefined();
    });
  });

  describe('Backward Compatibility Integration', () => {
    it('should maintain compatibility while providing enhanced features', async () => {
      // Test legacy endpoint with enhanced features enabled
      const legacyResponse = await request(app)
        .post('/api/v1/analyze-context')
        .send({
          request: 'Analyze this portfolio data',
          spreadsheetId: testSpreadsheetId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:F20',
            activeCell: 'A1'
          },
          userContext: {
            preferences: {
              enableEnhancedAnalysis: true,
              analysisDepth: 'detailed'
            }
          }
        })
        .expect(200);

      expect(legacyResponse.body.success).toBe(true);
      expect(legacyResponse.body.data.context).toBeDefined();
      expect(legacyResponse.body.data.naturalLanguageDescription).toBeDefined();
      
      // Should include enhanced analysis indicators
      expect(legacyResponse.body.data.requestAnalysis.enhanced).toBe(true);
      
      // Test new endpoint for comparison
      const enhancedResponse = await request(app)
        .post('/api/v1/enhanced-context/analyze')
        .send({
          request: 'Analyze this portfolio data',
          spreadsheetId: testSpreadsheetId,
          currentSelection: {
            sheet: 'Portfolio',
            range: 'A1:F20',
            activeCell: 'A1'
          },
          analysisOptions: {
            analysisDepth: 'detailed'
          }
        })
        .expect(200);

      expect(enhancedResponse.body.success).toBe(true);
      
      // Enhanced endpoint should provide more comprehensive data
      expect(Object.keys(enhancedResponse.body.data).length).toBeGreaterThan(
        Object.keys(legacyResponse.body.data).length
      );
    });
  });
});

// Helper functions to create test data

function createComprehensiveTestData(): SpreadsheetData {
  const rawData = [
    ['Symbol', 'Company', 'Sector', 'Shares', 'Price', 'Value', 'Return %', 'Beta', 'P/E Ratio', 'Dividend Yield'],
    ['AAPL', 'Apple Inc', 'Technology', '100', '150.00', '15000', '12.5', '1.2', '28.5', '0.66'],
    ['MSFT', 'Microsoft Corp', 'Technology', '50', '300.00', '15000', '8.3', '0.9', '32.1', '0.73'],
    ['GOOGL', 'Alphabet Inc', 'Technology', '10', '2500.00', '25000', '15.2', '1.1', '25.8', '0.00'],
    ['TSLA', 'Tesla Inc', 'Automotive', '25', '800.00', '20000', '-5.1', '2.0', '95.2', '0.00'],
    ['AMZN', 'Amazon.com Inc', 'Consumer Discretionary', '20', '3200.00', '64000', '22.8', '1.3', '58.7', '0.00'],
    ['META', 'Meta Platforms', 'Technology', '30', '250.00', '7500', '-12.3', '1.4', '15.2', '0.00'],
    ['NVDA', 'NVIDIA Corp', 'Technology', '15', '400.00', '6000', '45.7', '1.8', '65.3', '0.16'],
    ['NFLX', 'Netflix Inc', 'Communication Services', '40', '450.00', '18000', '18.9', '1.2', '35.4', '0.00'],
    ['JPM', 'JPMorgan Chase', 'Financial Services', '60', '140.00', '8400', '5.2', '1.1', '12.8', '2.45'],
    ['JNJ', 'Johnson & Johnson', 'Healthcare', '80', '165.00', '13200', '3.8', '0.7', '16.2', '2.68'],
    ['PG', 'Procter & Gamble', 'Consumer Staples', '45', '155.00', '6975', '7.1', '0.5', '24.3', '2.41'],
    ['KO', 'Coca-Cola Co', 'Consumer Staples', '120', '58.00', '6960', '4.2', '0.6', '26.1', '3.07'],
    ['DIS', 'Walt Disney Co', 'Communication Services', '70', '95.00', '6650', '-8.5', '1.3', '68.2', '0.00'],
    ['BA', 'Boeing Co', 'Industrials', '35', '210.00', '7350', '-15.2', '1.9', '-12.5', '0.00'],
    ['XOM', 'Exxon Mobil Corp', 'Energy', '90', '105.00', '9450', '65.3', '1.7', '14.8', '5.89'],
    ['WMT', 'Walmart Inc', 'Consumer Staples', '55', '145.00', '7975', '2.1', '0.5', '26.8', '1.71'],
    ['V', 'Visa Inc', 'Financial Services', '25', '220.00', '5500', '11.8', '1.0', '32.4', '0.69'],
    ['HD', 'Home Depot Inc', 'Consumer Discretionary', '30', '315.00', '9450', '9.3', '1.0', '19.7', '2.53'],
    ['UNH', 'UnitedHealth Group', 'Healthcare', '20', '485.00', '9700', '13.7', '0.8', '22.1', '1.35']
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
    id: 'comprehensive_' + Date.now(),
    metadata: { filename: 'comprehensive_portfolio.csv', fileSize: 1024, mimeType: 'text/csv', uploadedAt: new Date() },
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
      filename: 'comprehensive_portfolio.csv',
      fileSize: 4096,
      mimeType: 'text/csv',
      uploadedAt: new Date()
    },
    formulas: [],
    namedRanges: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function createComplexMultiDomainData(): SpreadsheetData {
  const rawData = [
    ['Company', 'Sector', 'Stock Price', 'Market Cap', 'Q1 Revenue', 'Q2 Revenue', 'Q3 Revenue', 'Q4 Revenue', 'Employees', 'Region'],
    ['Apple Inc', 'Technology', '150.00', '2400000', '89584', '97278', '90146', '117154', '154000', 'Americas'],
    ['Microsoft', 'Technology', '300.00', '2200000', '41706', '46152', '45317', '51728', '181000', 'Americas'],
    ['Alphabet', 'Technology', '2500.00', '1600000', '55314', '61880', '69092', '75325', '139995', 'Americas'],
    ['Tesla', 'Automotive', '800.00', '800000', '10389', '11958', '13757', '17719', '99290', 'Americas'],
    ['Amazon', 'E-commerce', '3200.00', '1300000', '108518', '113080', '110812', '137412', '1541000', 'Americas'],
    ['Meta', 'Technology', '250.00', '650000', '27908', '28822', '27714', '32165', '77805', 'Americas'],
    ['NVIDIA', 'Technology', '400.00', '1000000', '5661', '6704', '5931', '6051', '22473', 'Americas'],
    ['Netflix', 'Media', '450.00', '200000', '7163', '7970', '7926', '7709', '11300', 'Americas'],
    ['JPMorgan', 'Financial', '140.00', '420000', '30728', '31630', '32722', '31394', '271025', 'Americas'],
    ['Johnson & Johnson', 'Healthcare', '165.00', '435000', '22320', '24020', '23340', '20940', '141700', 'Americas'],
    ['Procter & Gamble', 'Consumer Goods', '155.00', '370000', '18109', '19516', '20006', '20773', '101000', 'Americas'],
    ['Coca-Cola', 'Beverages', '58.00', '250000', '9077', '10130', '10042', '9504', '79200', 'Global'],
    ['Disney', 'Media', '95.00', '175000', '15613', '17022', '18534', '21819', '190000', 'Americas'],
    ['Boeing', 'Aerospace', '210.00', '125000', '15217', '16998', '15956', '14795', '142000', 'Americas'],
    ['Exxon Mobil', 'Energy', '105.00', '440000', '59149', '90500', '95103', '84345', '63000', 'Global'],
    ['Walmart', 'Retail', '145.00', '400000', '138309', '141568', '152819', '164048', '2300000', 'Global'],
    ['Visa', 'Financial', '220.00', '480000', '5729', '6095', '6559', '7060', '21500', 'Global'],
    ['Home Depot', 'Retail', '315.00', '330000', '37098', '43792', '38873', '35720', '504000', 'Americas'],
    ['UnitedHealth', 'Healthcare', '485.00', '460000', '70199', '71316', '72340', '73741', '350000', 'Americas'],
    ['Salesforce', 'Software', '200.00', '200000', '5964', '6340', '6473', '7333', '73541', 'Global'],
    ['Adobe', 'Software', '380.00', '180000', '3913', '4390', '4453', '4534', '25988', 'Global'],
    ['Intel', 'Technology', '45.00', '185000', '18353', '15321', '14160', '18895', '121100', 'Global'],
    ['Cisco', 'Technology', '55.00', '230000', '12800', '13100', '13200', '12700', '79500', 'Global'],
    ['Oracle', 'Software', '85.00', '240000', '10090', '11840', '11450', '12280', '143000', 'Global']
  ];

  const data = rawData.map((row, rowIndex) => 
    row.map((cell, colIndex) => {
      if (rowIndex === 0) {
        return { value: cell, dataType: DataType.TEXT };
      }
      if (colIndex === 0 || colIndex === 1 || colIndex === 9) {
        return { value: cell, dataType: DataType.TEXT };
      }
      return { value: parseFloat(cell), dataType: DataType.NUMBER };
    })
  );

  return {
    id: 'complex_' + Date.now(),
    metadata: { filename: 'complex_multi_domain.csv', fileSize: 1024, mimeType: 'text/csv', uploadedAt: new Date() },
    sheets: [{
      name: 'Combined',
      data,
      dimensions: {
        rows: data.length,
        cols: data[0].length
      },
      formatting: [],
      namedRanges: []
    }],
    metadata: {
      filename: 'complex_multi_domain.csv',
      fileSize: 6144,
      mimeType: 'text/csv',
      uploadedAt: new Date()
    },
    formulas: [],
    namedRanges: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}