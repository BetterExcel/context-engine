/**
 * Simplified Domain Intelligence Engine Tests
 * Basic tests for domain-specific analysis capabilities
 */

import { DomainIntelligenceEngine } from '../DomainIntelligenceEngine';
import { FinancialDomainService } from '../FinancialDomainService';
import { BusinessIntelligenceService } from '../BusinessIntelligenceService';
import { FormulaLibraryService } from '../FormulaLibraryService';

describe('DomainIntelligenceEngine - Basic Tests', () => {
  let engine: DomainIntelligenceEngine;

  beforeEach(() => {
    engine = new DomainIntelligenceEngine();
  });

  it('should create domain intelligence engine', () => {
    expect(engine).toBeDefined();
    expect(engine).toBeInstanceOf(DomainIntelligenceEngine);
  });

  it('should have access to financial domain service', () => {
    const financialService = new FinancialDomainService();
    expect(financialService).toBeDefined();
    expect(financialService).toBeInstanceOf(FinancialDomainService);
  });

  it('should have access to business intelligence service', () => {
    const businessService = new BusinessIntelligenceService();
    expect(businessService).toBeDefined();
    expect(businessService).toBeInstanceOf(BusinessIntelligenceService);
  });

  it('should have access to formula library service', () => {
    const formulaService = new FormulaLibraryService();
    expect(formulaService).toBeDefined();
    expect(formulaService).toBeInstanceOf(FormulaLibraryService);
  });
});

describe('FinancialDomainService - Basic Tests', () => {
  let service: FinancialDomainService;

  beforeEach(() => {
    service = new FinancialDomainService();
  });

  it('should create financial domain service', () => {
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(FinancialDomainService);
  });

  it('should detect financial patterns', () => {
    const mockData = {
      sheets: [{
        data: [
          [
            { value: 'Symbol' },
            { value: 'Quantity' },
            { value: 'Price' },
            { value: 'Value' }
          ],
          [
            { value: 'AAPL' },
            { value: 100 },
            { value: 150.00 },
            { value: 15000 }
          ]
        ]
      }]
    } as any;

    const patterns = service.detectFinancialPatterns(mockData);
    expect(patterns).toBeDefined();
    expect(Array.isArray(patterns)).toBe(true);
  });

  it('should get applicable formulas', () => {
    const patterns = [{
      type: 'portfolio_holdings',
      confidence: 0.8,
      location: { startRow: 0, endRow: 2, startCol: 0, endCol: 3 },
      keyColumns: ['symbol', 'quantity', 'price'],
      metadata: {}
    }] as any;

    const columnNames = ['Symbol', 'Quantity', 'Price', 'Value'];
    const formulas = service.getApplicableFormulas(patterns, columnNames);
    
    expect(formulas).toBeDefined();
    expect(Array.isArray(formulas)).toBe(true);
  });

  it('should generate financial insights', () => {
    const mockData = {
      sheets: [{
        data: [
          [{ value: 'Symbol' }, { value: 'Quantity' }, { value: 'Price' }]
        ]
      }]
    } as any;
    
    const patterns = [{
      type: 'portfolio_holdings',
      confidence: 0.8,
      location: { startRow: 0, endRow: 2, startCol: 0, endCol: 3 },
      keyColumns: ['symbol', 'quantity', 'price'],
      metadata: {}
    }] as any;

    const insights = service.generateFinancialInsights(mockData, patterns);
    expect(insights).toBeDefined();
    expect(Array.isArray(insights)).toBe(true);
  });

  it('should assess financial risk', () => {
    const mockData = {
      sheets: [{
        data: [
          [{ value: 'Symbol' }, { value: 'Quantity' }, { value: 'Price' }]
        ]
      }]
    } as any;
    
    const patterns = [{
      type: 'portfolio_holdings',
      confidence: 0.8,
      location: { startRow: 0, endRow: 2, startCol: 0, endCol: 3 },
      keyColumns: ['symbol', 'quantity', 'price'],
      metadata: {}
    }] as any;

    const riskAssessment = service.assessFinancialRisk(mockData, patterns);
    expect(riskAssessment).toBeDefined();
    if (riskAssessment) {
      expect(riskAssessment.overallRisk).toBeDefined();
      expect(riskAssessment.riskFactors).toBeDefined();
      expect(Array.isArray(riskAssessment.riskFactors)).toBe(true);
    }
  });
});

describe('BusinessIntelligenceService - Basic Tests', () => {
  let service: BusinessIntelligenceService;

  beforeEach(() => {
    service = new BusinessIntelligenceService();
  });

  it('should create business intelligence service', () => {
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(BusinessIntelligenceService);
  });

  it('should detect business patterns', () => {
    const mockData = {
      sheets: [{
        data: [
          [
            { value: 'Product' },
            { value: 'Revenue' },
            { value: 'Sales' },
            { value: 'Customer' }
          ],
          [
            { value: 'Product A' },
            { value: 10000 },
            { value: 150 },
            { value: 'Customer 1' }
          ]
        ]
      }]
    } as any;

    const patterns = service.detectBusinessPatterns(mockData);
    expect(patterns).toBeDefined();
    expect(Array.isArray(patterns)).toBe(true);
  });

  it('should get applicable KPIs', () => {
    const patterns = [{
      type: 'sales_data',
      confidence: 0.8,
      location: { startRow: 0, endRow: 2, startCol: 0, endCol: 3 },
      keyColumns: ['product', 'revenue', 'sales'],
      metadata: {}
    }] as any;

    const kpis = service.getApplicableKPIs(patterns);
    expect(kpis).toBeDefined();
    expect(Array.isArray(kpis)).toBe(true);
  });

  it('should generate business insights', () => {
    const mockData = {
      sheets: [{
        data: [
          [{ value: 'Product' }, { value: 'Revenue' }, { value: 'Sales' }]
        ]
      }]
    } as any;
    
    const patterns = [{
      type: 'sales_data',
      confidence: 0.8,
      location: { startRow: 0, endRow: 2, startCol: 0, endCol: 3 },
      keyColumns: ['product', 'revenue', 'sales'],
      metadata: {}
    }] as any;

    const insights = service.generateBusinessInsights(mockData, patterns);
    expect(insights).toBeDefined();
    expect(Array.isArray(insights)).toBe(true);
  });

  it('should get business recommendations', () => {
    const patterns = [{
      type: 'sales_data',
      confidence: 0.8,
      location: { startRow: 0, endRow: 2, startCol: 0, endCol: 3 },
      keyColumns: ['product', 'revenue', 'sales'],
      metadata: {}
    }] as any;

    const insights = [{
      type: 'trend',
      title: 'Sales Analysis',
      description: 'Sales trend analysis',
      confidence: 0.8,
      impact: 'high',
      actionable: true,
      suggestedActions: ['Analyze trends', 'Review performance'],
      supportingData: []
    }] as any;

    const recommendations = service.getBusinessRecommendations(patterns, insights);
    expect(recommendations).toBeDefined();
    expect(Array.isArray(recommendations)).toBe(true);
  });
});