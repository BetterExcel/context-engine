/**
 * Tests for Entity Resolution Service
 */

import { EntityResolutionService } from '../EntityResolutionService';
import { EntityType, QueryToken, TokenType, MatchType, IntentCellReference } from '../../types/intent-analysis';
import { DomainType, IntelligentSpreadsheetData, EnhancedDataType } from '../../types/enhanced-intelligence';

describe('EntityResolutionService', () => {
  let service: EntityResolutionService;

  beforeEach(() => {
    service = new EntityResolutionService();
  });

  describe('resolveEntities', () => {
    it('should resolve company entities', async () => {
      const query = 'What is Apple Inc revenue?';
      const tokens: QueryToken[] = [
        { text: 'what', type: TokenType.NOISE, position: 0, confidence: 0.8 },
        { text: 'is', type: TokenType.CONNECTOR, position: 1, confidence: 0.8 },
        { text: 'apple', type: TokenType.ENTITY, position: 2, confidence: 0.9, entityType: EntityType.COMPANY },
        { text: 'inc', type: TokenType.ENTITY, position: 3, confidence: 0.9, entityType: EntityType.COMPANY },
        { text: 'revenue', type: TokenType.ENTITY, position: 4, confidence: 0.8, entityType: EntityType.METRIC }
      ];

      const result = await service.resolveEntities(query, tokens);

      expect(result.entities).toHaveLength(3); // apple, inc, revenue
      expect(result.resolutions.length).toBeGreaterThan(0);
      
      const appleEntity = result.entities.find(e => e.text === 'apple');
      expect(appleEntity?.type).toBe(EntityType.COMPANY);
      expect(appleEntity?.confidence).toBeGreaterThan(0.5);
    });

    it('should resolve financial metric entities', async () => {
      const query = 'Calculate profit margin and ROI';
      const tokens: QueryToken[] = [
        { text: 'calculate', type: TokenType.ACTION, position: 0, confidence: 0.9 },
        { text: 'profit', type: TokenType.ENTITY, position: 1, confidence: 0.8, entityType: EntityType.METRIC },
        { text: 'margin', type: TokenType.ENTITY, position: 2, confidence: 0.8, entityType: EntityType.METRIC },
        { text: 'and', type: TokenType.CONNECTOR, position: 3, confidence: 0.8 },
        { text: 'roi', type: TokenType.ENTITY, position: 4, confidence: 0.9, entityType: EntityType.METRIC }
      ];

      const result = await service.resolveEntities(query, tokens);

      expect(result.entities).toHaveLength(3); // profit, margin, roi
      
      const roiEntity = result.entities.find(e => e.text === 'roi');
      expect(roiEntity?.type).toBe(EntityType.METRIC);
      
      const profitEntity = result.entities.find(e => e.text === 'profit');
      expect(profitEntity?.type).toBe(EntityType.METRIC);
    });

    it('should find data matches in spreadsheet context', async () => {
      const mockDataContext: Partial<IntelligentSpreadsheetData> = {
        searchIndex: {
          byContent: new Map([
            ['apple', [
              { sheet: 'Sheet1', row: 1, col: 0, address: 'A1', value: 'Apple Inc.' }
            ]],
            ['revenue', [
              { sheet: 'Sheet1', row: 0, col: 1, address: 'B1', value: 'Revenue' }
            ]]
          ]),
          byColumn: new Map(),
          byDataType: new Map(),
          byPattern: new Map(),
          byDomain: new Map(),
          fuzzyIndex: {
            companyNames: new Map([
              ['apple', [{
                originalName: 'Apple Inc.',
                normalizedName: 'apple inc',
                aliases: ['apple', 'aapl'],
                stockSymbol: 'AAPL',
                confidence: 0.95,
                cellReferences: [
                  { sheet: 'Sheet1', row: 1, col: 0, address: 'A1', value: 'Apple Inc.' }
                ]
              }]]
            ]),
            financialTerms: new Map(),
            generalTerms: new Map(),
            phoneticIndex: new Map()
          }
        },
        domainContext: {
          domain: DomainType.FINANCIAL,
          confidence: 0.9,
          businessRules: [],
          suggestedMetrics: []
        }
      };

      const query = 'Apple revenue';
      const tokens: QueryToken[] = [
        { text: 'apple', type: TokenType.ENTITY, position: 0, confidence: 0.9, entityType: EntityType.COMPANY },
        { text: 'revenue', type: TokenType.ENTITY, position: 1, confidence: 0.8, entityType: EntityType.METRIC }
      ];

      const result = await service.resolveEntities(
        query, 
        tokens, 
        mockDataContext as IntelligentSpreadsheetData,
        { enableFuzzyMatching: true }
      );

      expect(result.resolutions.length).toBeGreaterThan(0);
      
      const appleResolution = result.resolutions.find(r => r.entity.text === 'apple');
      expect(appleResolution?.dataMatches.length).toBeGreaterThan(0);
      expect(appleResolution?.dataMatches[0].matchType).toBe(MatchType.FUZZY);
    });

    it('should detect entity ambiguities', async () => {
      const query = 'Show me Apple data'; // Could refer to multiple Apple entities
      const tokens: QueryToken[] = [
        { text: 'show', type: TokenType.ACTION, position: 0, confidence: 0.8 },
        { text: 'me', type: TokenType.NOISE, position: 1, confidence: 0.5 },
        { text: 'apple', type: TokenType.ENTITY, position: 2, confidence: 0.7, entityType: EntityType.COMPANY },
        { text: 'data', type: TokenType.SCOPE, position: 3, confidence: 0.6 }
      ];

      const result = await service.resolveEntities(query, tokens);

      // Should detect potential ambiguity in "apple" (could be company, product, etc.)
      expect(result.entities).toHaveLength(2); // apple, data
      expect(result.confidence.overall).toBeLessThan(1.0);
    });

    it('should provide entity alternatives', async () => {
      const query = 'Microsoft profit';
      const tokens: QueryToken[] = [
        { text: 'microsoft', type: TokenType.ENTITY, position: 0, confidence: 0.9, entityType: EntityType.COMPANY },
        { text: 'profit', type: TokenType.ENTITY, position: 1, confidence: 0.8, entityType: EntityType.METRIC }
      ];

      const result = await service.resolveEntities(
        query, 
        tokens, 
        undefined,
        { enableSynonymExpansion: true, maxAlternatives: 3 }
      );

      const microsoftEntity = result.entities.find(e => e.text === 'microsoft');
      expect(microsoftEntity?.alternatives.length).toBeGreaterThan(0);
      
      const profitEntity = result.entities.find(e => e.text === 'profit');
      expect(profitEntity?.alternatives.length).toBeGreaterThan(0);
    });

    it('should extract business context for entities', async () => {
      const mockDataContext: Partial<IntelligentSpreadsheetData> = {
        domainContext: {
          domain: DomainType.FINANCIAL,
          confidence: 0.9,
          businessRules: [],
          suggestedMetrics: []
        }
      };

      const query = 'Google stock price';
      const tokens: QueryToken[] = [
        { text: 'google', type: TokenType.ENTITY, position: 0, confidence: 0.9, entityType: EntityType.COMPANY },
        { text: 'stock', type: TokenType.ENTITY, position: 1, confidence: 0.8, entityType: EntityType.FINANCIAL_INSTRUMENT },
        { text: 'price', type: TokenType.ENTITY, position: 2, confidence: 0.8, entityType: EntityType.METRIC }
      ];

      const result = await service.resolveEntities(
        query, 
        tokens, 
        mockDataContext as IntelligentSpreadsheetData,
        { includeBusinessContext: true }
      );

      const googleEntity = result.entities.find(e => e.text === 'google');
      expect(googleEntity?.businessContext).toBeDefined();
      expect(googleEntity?.businessContext?.industry).toBeDefined();
    });

    it('should handle multi-token entities', async () => {
      const query = 'Apple Inc and Microsoft Corporation revenue';
      const tokens: QueryToken[] = [
        { text: 'apple', type: TokenType.ENTITY, position: 0, confidence: 0.9 },
        { text: 'inc', type: TokenType.ENTITY, position: 1, confidence: 0.8 },
        { text: 'and', type: TokenType.CONNECTOR, position: 2, confidence: 0.8 },
        { text: 'microsoft', type: TokenType.ENTITY, position: 3, confidence: 0.9 },
        { text: 'corporation', type: TokenType.ENTITY, position: 4, confidence: 0.8 },
        { text: 'revenue', type: TokenType.ENTITY, position: 5, confidence: 0.8, entityType: EntityType.METRIC }
      ];

      const result = await service.resolveEntities(query, tokens);

      // Should detect "Apple Inc" and "Microsoft Corporation" as single entities
      expect(result.entities.length).toBeGreaterThan(3);
      
      const companyEntities = result.entities.filter(e => e.type === EntityType.COMPANY);
      expect(companyEntities.length).toBeGreaterThan(0);
    });
  });

  describe('confidence scoring', () => {
    it('should provide detailed confidence breakdown', async () => {
      const query = 'Calculate Apple revenue growth';
      const tokens: QueryToken[] = [
        { text: 'calculate', type: TokenType.ACTION, position: 0, confidence: 0.9 },
        { text: 'apple', type: TokenType.ENTITY, position: 1, confidence: 0.9, entityType: EntityType.COMPANY },
        { text: 'revenue', type: TokenType.ENTITY, position: 2, confidence: 0.8, entityType: EntityType.METRIC },
        { text: 'growth', type: TokenType.ENTITY, position: 3, confidence: 0.7, entityType: EntityType.METRIC }
      ];

      const result = await service.resolveEntities(query, tokens);

      expect(result.confidence.overall).toBeGreaterThan(0);
      expect(result.confidence.components.length).toBeGreaterThan(0);
      expect(result.confidence.explanation).toBeDefined();
      expect(result.confidence.reliability).toBeDefined();
    });

    it('should adjust confidence based on data matches', async () => {
      const mockDataContext: Partial<IntelligentSpreadsheetData> = {
        searchIndex: {
          byContent: new Map([
            ['apple', [
              { sheet: 'Sheet1', row: 1, col: 0, address: 'A1', value: 'Apple Inc.' }
            ]]
          ]),
          byColumn: new Map(),
          byDataType: new Map(),
          byPattern: new Map(),
          byDomain: new Map(),
          fuzzyIndex: {
            companyNames: new Map(),
            financialTerms: new Map(),
            generalTerms: new Map(),
            phoneticIndex: new Map()
          }
        }
      };

      const query = 'Apple revenue';
      const tokens: QueryToken[] = [
        { text: 'apple', type: TokenType.ENTITY, position: 0, confidence: 0.8, entityType: EntityType.COMPANY },
        { text: 'revenue', type: TokenType.ENTITY, position: 1, confidence: 0.7, entityType: EntityType.METRIC }
      ];

      const withDataResult = await service.resolveEntities(
        query, 
        tokens, 
        mockDataContext as IntelligentSpreadsheetData
      );
      
      const withoutDataResult = await service.resolveEntities(query, tokens);

      // Should have higher confidence when data matches are found
      expect(withDataResult.confidence.overall).toBeGreaterThanOrEqual(withoutDataResult.confidence.overall);
    });
  });

  describe('suggestions and recommendations', () => {
    it('should provide resolution suggestions', async () => {
      const query = 'Unknown company revenue';
      const tokens: QueryToken[] = [
        { text: 'unknown', type: TokenType.ENTITY, position: 0, confidence: 0.3, entityType: EntityType.COMPANY },
        { text: 'company', type: TokenType.ENTITY, position: 1, confidence: 0.5, entityType: EntityType.COMPANY },
        { text: 'revenue', type: TokenType.ENTITY, position: 2, confidence: 0.8, entityType: EntityType.METRIC }
      ];

      const result = await service.resolveEntities(query, tokens);

      expect(result.suggestions.length).toBeGreaterThan(0);
      
      const clarificationSuggestion = result.suggestions.find(s => s.type === 'entity_clarification');
      expect(clarificationSuggestion).toBeDefined();
    });

    it('should suggest data enrichment when no matches found', async () => {
      const query = 'XYZ Corp revenue'; // Non-existent company
      const tokens: QueryToken[] = [
        { text: 'xyz', type: TokenType.ENTITY, position: 0, confidence: 0.6, entityType: EntityType.COMPANY },
        { text: 'corp', type: TokenType.ENTITY, position: 1, confidence: 0.7, entityType: EntityType.COMPANY },
        { text: 'revenue', type: TokenType.ENTITY, position: 2, confidence: 0.8, entityType: EntityType.METRIC }
      ];

      const result = await service.resolveEntities(query, tokens);

      const enrichmentSuggestion = result.suggestions.find(s => s.type === 'data_enrichment');
      expect(enrichmentSuggestion).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle empty token arrays', async () => {
      const result = await service.resolveEntities('', []);

      expect(result.entities).toHaveLength(0);
      expect(result.resolutions).toHaveLength(0);
      expect(result.confidence.overall).toBeDefined();
    });

    it('should handle malformed tokens gracefully', async () => {
      const malformedTokens: QueryToken[] = [
        { text: '', type: TokenType.NOISE, position: 0, confidence: 0 }
      ];

      const result = await service.resolveEntities('test', malformedTokens);

      expect(result).toBeDefined();
      expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
    });

    it('should handle resolution errors gracefully', async () => {
      const tokens: QueryToken[] = [
        { text: 'test', type: TokenType.ENTITY, position: 0, confidence: 0.8, entityType: EntityType.COMPANY }
      ];

      // Should not throw even with invalid data context
      await expect(service.resolveEntities('test', tokens, {} as IntelligentSpreadsheetData)).resolves.toBeDefined();
    });
  });

  describe('performance', () => {
    it('should resolve entities within reasonable time', async () => {
      const query = 'Apple Microsoft Google Amazon revenue profit margin ROI EBITDA';
      const tokens: QueryToken[] = query.split(' ').map((word, index) => ({
        text: word.toLowerCase(),
        type: TokenType.ENTITY,
        position: index,
        confidence: 0.8,
        entityType: index < 4 ? EntityType.COMPANY : EntityType.METRIC
      }));

      const startTime = Date.now();
      const result = await service.resolveEntities(query, tokens, undefined, {
        enableFuzzyMatching: true,
        enableSemanticMatching: true,
        maxAlternatives: 5
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
      expect(result.entities.length).toBeGreaterThan(0);
    });
  });
});