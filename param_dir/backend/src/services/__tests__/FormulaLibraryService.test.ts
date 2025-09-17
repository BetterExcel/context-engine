/**
 * Formula Library Service Tests
 * Tests for financial and business formula library functionality
 */

import { FormulaLibraryService } from '../FormulaLibraryService';
import { FinancialFormulaCategory } from '../../types/domain-intelligence';

describe('FormulaLibraryService', () => {
  let service: FormulaLibraryService;

  beforeEach(() => {
    service = new FormulaLibraryService();
  });

  describe('getAllFormulas', () => {
    it('should return all available formulas', () => {
      const formulas = service.getAllFormulas();
      
      expect(formulas.length).toBeGreaterThan(0);
      expect(formulas.some(f => f.id === 'portfolio_return')).toBe(true);
      expect(formulas.some(f => f.id === 'sharpe_ratio')).toBe(true);
      expect(formulas.some(f => f.id === 'roi')).toBe(true);
    });
  });

  describe('getFormulasByCategory', () => {
    it('should return portfolio analysis formulas', () => {
      const portfolioFormulas = service.getFormulasByCategory(FinancialFormulaCategory.PORTFOLIO_ANALYSIS);
      
      expect(portfolioFormulas.length).toBeGreaterThan(0);
      expect(portfolioFormulas.every(f => f.category === FinancialFormulaCategory.PORTFOLIO_ANALYSIS)).toBe(true);
      expect(portfolioFormulas.some(f => f.id === 'portfolio_return')).toBe(true);
      expect(portfolioFormulas.some(f => f.id === 'portfolio_weight')).toBe(true);
    });

    it('should return risk management formulas', () => {
      const riskFormulas = service.getFormulasByCategory(FinancialFormulaCategory.RISK_MANAGEMENT);
      
      expect(riskFormulas.length).toBeGreaterThan(0);
      expect(riskFormulas.every(f => f.category === FinancialFormulaCategory.RISK_MANAGEMENT)).toBe(true);
      expect(riskFormulas.some(f => f.id === 'sharpe_ratio')).toBe(true);
      expect(riskFormulas.some(f => f.id === 'value_at_risk')).toBe(true);
    });

    it('should return performance formulas', () => {
      const performanceFormulas = service.getFormulasByCategory(FinancialFormulaCategory.PERFORMANCE);
      
      expect(performanceFormulas.length).toBeGreaterThan(0);
      expect(performanceFormulas.every(f => f.category === FinancialFormulaCategory.PERFORMANCE)).toBe(true);
      expect(performanceFormulas.some(f => f.id === 'annualized_return')).toBe(true);
      expect(performanceFormulas.some(f => f.id === 'roi')).toBe(true);
    });
  });

  describe('getFormula', () => {
    it('should return specific formula by ID', () => {
      const formula = service.getFormula('portfolio_return');
      
      expect(formula).toBeDefined();
      expect(formula!.id).toBe('portfolio_return');
      expect(formula!.name).toBe('Portfolio Return');
      expect(formula!.category).toBe(FinancialFormulaCategory.PORTFOLIO_ANALYSIS);
    });

    it('should return undefined for non-existent formula', () => {
      const formula = service.getFormula('non_existent_formula');
      
      expect(formula).toBeUndefined();
    });
  });

  describe('searchFormulas', () => {
    it('should find formulas by name', () => {
      const results = service.searchFormulas('portfolio');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(f => f.name.toLowerCase().includes('portfolio'))).toBe(true);
    });

    it('should find formulas by description', () => {
      const results = service.searchFormulas('risk');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(f => f.description.toLowerCase().includes('risk'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const lowerResults = service.searchFormulas('sharpe');
      const upperResults = service.searchFormulas('SHARPE');
      
      expect(lowerResults).toEqual(upperResults);
      expect(lowerResults.length).toBeGreaterThan(0);
    });
  });

  describe('getApplicableFormulas', () => {
    it('should return formulas applicable to portfolio columns', () => {
      const columnNames = ['Symbol', 'Quantity', 'Current_Value', 'Initial_Value'];
      const applicableFormulas = service.getApplicableFormulas(columnNames);
      
      expect(applicableFormulas.length).toBeGreaterThan(0);
      expect(applicableFormulas.some(f => f.id === 'portfolio_return')).toBe(true);
    });

    it('should return formulas for stock analysis columns', () => {
      const columnNames = ['Stock_Price', 'Earnings_Per_Share', 'Annual_Dividend'];
      const applicableFormulas = service.getApplicableFormulas(columnNames);
      
      expect(applicableFormulas.length).toBeGreaterThan(0);
      expect(applicableFormulas.some(f => f.id === 'pe_ratio')).toBe(true);
      expect(applicableFormulas.some(f => f.id === 'dividend_yield')).toBe(true);
    });

    it('should handle empty column list', () => {
      const applicableFormulas = service.getApplicableFormulas([]);
      
      // Should return formulas with no required parameters
      expect(applicableFormulas.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateExcelFormula', () => {
    it('should generate Excel formula with cell references', () => {
      const cellMappings = {
        'current_value': 'C2',
        'initial_value': 'B2'
      };
      
      const excelFormula = service.generateExcelFormula('portfolio_return', cellMappings);
      
      expect(excelFormula).toBe('=(C2-B2)/B2');
    });

    it('should handle multiple parameter mappings', () => {
      const cellMappings = {
        'portfolio_return': 'D2',
        'risk_free_rate': 'E2',
        'portfolio_std': 'F2'
      };
      
      const excelFormula = service.generateExcelFormula('sharpe_ratio', cellMappings);
      
      expect(excelFormula).toBe('=(D2-E2)/F2');
    });

    it('should return null for non-existent formula', () => {
      const excelFormula = service.generateExcelFormula('non_existent', {});
      
      expect(excelFormula).toBeNull();
    });
  });

  describe('validateFormulaParameters', () => {
    it('should validate required parameters', () => {
      const parameters = {
        current_value: 110000,
        initial_value: 100000
      };
      
      const validation = service.validateFormulaParameters('portfolio_return', parameters);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required parameters', () => {
      const parameters = {
        current_value: 110000
        // missing initial_value
      };
      
      const validation = service.validateFormulaParameters('portfolio_return', parameters);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Required parameter 'initial_value' is missing");
    });

    it('should validate parameter types', () => {
      const parameters = {
        current_value: 'not_a_number',
        initial_value: 100000
      };
      
      const validation = service.validateFormulaParameters('portfolio_return', parameters);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('must be a valid number'))).toBe(true);
    });

    it('should validate business rules', () => {
      const parameters = {
        current_value: 110000,
        initial_value: -100000 // Invalid negative value
      };
      
      const validation = service.validateFormulaParameters('portfolio_return', parameters);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('must be greater than 0'))).toBe(true);
    });

    it('should handle optional parameters', () => {
      const parameters = {
        portfolio_value: 1000000,
        mean_return: 0.001,
        std_deviation: 0.02
        // confidence_level is optional
      };
      
      const validation = service.validateFormulaParameters('value_at_risk', parameters);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return error for non-existent formula', () => {
      const validation = service.validateFormulaParameters('non_existent', {});
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Formula not found');
    });
  });

  describe('formula examples', () => {
    it('should have valid examples for portfolio return', () => {
      const formula = service.getFormula('portfolio_return');
      
      expect(formula).toBeDefined();
      expect(formula!.examples).toBeDefined();
      expect(formula!.examples!.length).toBeGreaterThan(0);
      
      const example = formula!.examples![0];
      expect(example.input).toBeDefined();
      expect(example.expectedOutput).toBeDefined();
      expect(example.excelFormula).toBeDefined();
    });

    it('should have valid examples for Sharpe ratio', () => {
      const formula = service.getFormula('sharpe_ratio');
      
      expect(formula).toBeDefined();
      expect(formula!.examples).toBeDefined();
      expect(formula!.examples!.length).toBeGreaterThan(0);
      
      const example = formula!.examples![0];
      expect(example.input).toBeDefined();
      expect(example.expectedOutput).toBeDefined();
      expect(example.excelFormula).toBeDefined();
    });
  });

  describe('formula validation rules', () => {
    it('should have validation rules for formulas with constraints', () => {
      const portfolioReturnFormula = service.getFormula('portfolio_return');
      
      expect(portfolioReturnFormula).toBeDefined();
      expect(portfolioReturnFormula!.validation).toBeDefined();
      expect(portfolioReturnFormula!.validation!.length).toBeGreaterThan(0);
      
      const rule = portfolioReturnFormula!.validation![0];
      expect(rule.condition).toBeDefined();
      expect(rule.message).toBeDefined();
      expect(rule.severity).toBeDefined();
    });
  });
});