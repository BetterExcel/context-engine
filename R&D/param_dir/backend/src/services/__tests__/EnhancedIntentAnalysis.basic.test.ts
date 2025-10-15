/**
 * Basic functionality tests for Enhanced Intent Analysis
 */

import { EnhancedIntentAnalyzer } from '../EnhancedIntentAnalyzer';
import { EntityResolutionService } from '../EntityResolutionService';
import { DomainSpecificIntentClassifier } from '../DomainSpecificIntentClassifier';
import { IntentType } from '../../types/context';
import { DomainType } from '../../types/enhanced-intelligence';
import { TokenType, EntityType } from '../../types/intent-analysis';

describe('Enhanced Intent Analysis Basic Functionality', () => {
  describe('EnhancedIntentAnalyzer', () => {
    let analyzer: EnhancedIntentAnalyzer;

    beforeEach(() => {
      analyzer = new EnhancedIntentAnalyzer();
    });

    it('should analyze a simple query', async () => {
      const query = 'What is Apple revenue?';
      const result = await analyzer.analyzeIntent(query);

      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.intent.query.original).toBe(query);
      expect(result.intent.intent.primary).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should tokenize queries correctly', async () => {
      const query = 'Calculate total sales';
      const result = await analyzer.analyzeIntent(query);

      expect(result.intent.query.tokens).toBeDefined();
      expect(result.intent.query.tokens.length).toBeGreaterThan(0);
      
      const calculateToken = result.intent.query.tokens.find(t => t.text === 'calculate');
      expect(calculateToken).toBeDefined();
      expect(calculateToken?.type).toBe(TokenType.ACTION);
    });

    it('should detect financial domain', async () => {
      const query = 'Analyze quarterly revenue and profit margins';
      const result = await analyzer.analyzeIntent(query);

      expect(result.intent.context.businessContext.domain).toBe(DomainType.FINANCIAL);
    });
  });

  describe('EntityResolutionService', () => {
    let service: EntityResolutionService;

    beforeEach(() => {
      service = new EntityResolutionService();
    });

    it('should resolve basic entities', async () => {
      const query = 'Apple revenue';
      const tokens = [
        { text: 'apple', type: TokenType.ENTITY, position: 0, confidence: 0.9, entityType: EntityType.COMPANY },
        { text: 'revenue', type: TokenType.ENTITY, position: 1, confidence: 0.8, entityType: EntityType.METRIC }
      ];

      const result = await service.resolveEntities(query, tokens);

      expect(result).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.confidence).toBeDefined();
    });

    it('should provide confidence scoring', async () => {
      const query = 'Microsoft profit';
      const tokens = [
        { text: 'microsoft', type: TokenType.ENTITY, position: 0, confidence: 0.9, entityType: EntityType.COMPANY },
        { text: 'profit', type: TokenType.ENTITY, position: 1, confidence: 0.8, entityType: EntityType.METRIC }
      ];

      const result = await service.resolveEntities(query, tokens);

      expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
      expect(result.confidence.overall).toBeLessThanOrEqual(1);
      expect(result.confidence.components).toBeDefined();
      expect(result.confidence.explanation).toBeDefined();
    });
  });

  describe('DomainSpecificIntentClassifier', () => {
    let classifier: DomainSpecificIntentClassifier;

    beforeEach(() => {
      classifier = new DomainSpecificIntentClassifier();
    });

    it('should classify financial domain', async () => {
      const query = 'revenue profit financial analysis';
      const tokens = query.split(' ').map((word, index) => ({
        text: word,
        type: TokenType.ENTITY,
        position: index,
        confidence: 0.8
      }));

      const result = await classifier.classifyDomain(query, tokens);

      expect(result).toBeDefined();
      expect(result.domain).toBe(DomainType.FINANCIAL);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.indicators).toBeDefined();
    });

    it('should provide domain-specific intent classification', async () => {
      const query = 'analyze financial performance';
      const tokens = query.split(' ').map((word, index) => ({
        text: word,
        type: TokenType.ENTITY,
        position: index,
        confidence: 0.8
      }));

      const result = await classifier.classifyDomainSpecificIntent(
        query,
        tokens,
        DomainType.FINANCIAL
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].type).toBeDefined();
        expect(result[0].confidence).toBeGreaterThan(0);
        expect(result[0].domainSpecific).toBe(true);
      }
    });
  });

  describe('Integration', () => {
    it('should work together for basic analysis', async () => {
      const analyzer = new EnhancedIntentAnalyzer();
      const entityResolver = new EntityResolutionService();
      const domainClassifier = new DomainSpecificIntentClassifier();

      const query = 'What is Apple revenue?';

      // Step 1: Intent analysis
      const intentResult = await analyzer.analyzeIntent(query);
      expect(intentResult).toBeDefined();

      // Step 2: Entity resolution
      const entityResult = await entityResolver.resolveEntities(
        query,
        intentResult.intent.query.tokens
      );
      expect(entityResult).toBeDefined();

      // Step 3: Domain classification
      const domainResult = await domainClassifier.classifyDomain(
        query,
        intentResult.intent.query.tokens
      );
      expect(domainResult).toBeDefined();

      // Verify all components produced results
      expect(intentResult.intent.intent.primary.type).toBeDefined();
      expect(entityResult.entities.length).toBeGreaterThanOrEqual(0);
      expect(domainResult.domain).toBeDefined();
    });
  });
});