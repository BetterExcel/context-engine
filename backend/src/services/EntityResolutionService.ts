/**
 * Entity Resolution Service
 * 
 * Provides intelligent entity extraction and resolution with business context,
 * including company name matching, financial term recognition, and data mapping.
 */

import {
  ExtractedEntity,
  EntityType,
  EntityPosition,
  ResolvedEntity,
  EntityMetadata,
  EntityRelationship,
  RelationshipType,
  EntityAlternative,
  EntityBusinessContext,
  DataReference,
  IntentCellReference,
  MatchType,
  DataMatch,
  MatchContext,
  EntityResolutionResult,
  EntityResolution,
  EntityAmbiguity,
  EntityCandidate,
  DisambiguationStrategy,
  ResolutionSuggestion,
  SuggestionType,
  QueryToken,
  TokenType,
  ConfidenceScore,
  ConfidenceComponent,
  ConfidenceFactor,
  FactorType,
  ReliabilityLevel
} from '../types/intent-analysis';
import { 
  IntelligentSpreadsheetData, 
  DomainType, 
  EnhancedDataType,
  CompanyMatch,
  TermMatch,
  CellReference as EnhancedCellReference
} from '../types/enhanced-intelligence';

export interface EntityResolutionOptions {
  enableFuzzyMatching?: boolean;
  enableSemanticMatching?: boolean;
  confidenceThreshold?: number;
  maxAlternatives?: number;
  includeBusinessContext?: boolean;
  enableSynonymExpansion?: boolean;
}

export interface EntityResolutionConfig {
  companyDatabase: CompanyDatabase;
  financialTerms: FinancialTermDatabase;
  synonymMappings: SynonymMappings;
  domainRules: DomainEntityRules;
}

export interface CompanyDatabase {
  companies: Map<string, CompanyInfo>;
  aliases: Map<string, string[]>;
  stockSymbols: Map<string, string>;
  industries: Map<string, string[]>;
}

export interface CompanyInfo {
  name: string;
  aliases: string[];
  stockSymbol?: string;
  industry?: string;
  sector?: string;
  marketCap?: string;
  exchange?: string;
  description?: string;
}

export interface FinancialTermDatabase {
  metrics: Map<string, MetricInfo>;
  ratios: Map<string, RatioInfo>;
  statements: Map<string, StatementInfo>;
  categories: Map<string, string[]>;
}

export interface MetricInfo {
  name: string;
  aliases: string[];
  category: string;
  formula?: string;
  description: string;
  units?: string;
}

export interface RatioInfo {
  name: string;
  aliases: string[];
  numerator: string;
  denominator: string;
  interpretation: string;
}

export interface StatementInfo {
  name: string;
  aliases: string[];
  type: 'income' | 'balance' | 'cash_flow';
  lineItems: string[];
}

export interface SynonymMappings {
  companies: Map<string, string[]>;
  metrics: Map<string, string[]>;
  general: Map<string, string[]>;
}

export interface DomainEntityRules {
  [domain: string]: EntityRule[];
}

export interface EntityRule {
  pattern: RegExp;
  entityType: EntityType;
  confidence: number;
  contextRequired?: boolean;
}

export class EntityResolutionService {
  private readonly config: EntityResolutionConfig;
  private readonly phoneticMatcher: PhoneticMatcher;
  private readonly semanticMatcher: SemanticMatcher;

  constructor(config?: Partial<EntityResolutionConfig>) {
    this.config = this.initializeConfig(config);
    this.phoneticMatcher = new PhoneticMatcher();
    this.semanticMatcher = new SemanticMatcher();
  }

  /**
   * Resolves entities from query tokens with comprehensive analysis
   */
  public async resolveEntities(
    query: string,
    tokens: QueryToken[],
    dataContext?: IntelligentSpreadsheetData,
    options: EntityResolutionOptions = {}
  ): Promise<EntityResolutionResult> {
    try {
      // Step 1: Extract entities from tokens
      const extractedEntities = await this.extractEntities(tokens, dataContext, options);

      // Step 2: Resolve each entity with data context
      const resolutions = await Promise.all(
        extractedEntities.map(entity => this.resolveEntity(entity, dataContext, options))
      );

      // Step 3: Detect ambiguities
      const ambiguities = await this.detectEntityAmbiguities(extractedEntities, resolutions, dataContext);

      // Step 4: Calculate overall confidence
      const confidence = this.calculateResolutionConfidence(resolutions, ambiguities);

      // Step 5: Generate suggestions for improvement
      const suggestions = await this.generateResolutionSuggestions(resolutions, ambiguities, dataContext);

      return {
        query,
        entities: extractedEntities,
        resolutions: resolutions.filter(r => r !== null) as EntityResolution[],
        ambiguities,
        confidence,
        suggestions
      };

    } catch (error) {
      throw new EntityResolutionError(
        `Entity resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RESOLUTION_FAILED'
      );
    }
  }

  /**
   * Extracts entities from query tokens
   */
  private async extractEntities(
    tokens: QueryToken[],
    dataContext?: IntelligentSpreadsheetData,
    options: EntityResolutionOptions = {}
  ): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];

    // Extract entities from individual tokens
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (token.type === TokenType.ENTITY || this.isPotentialEntity(token)) {
        const entity = await this.extractEntityFromToken(token, i, tokens, dataContext, options);
        if (entity) {
          entities.push(entity);
        }
      }
    }

    // Extract multi-token entities (company names, etc.)
    const multiTokenEntities = await this.extractMultiTokenEntities(tokens, dataContext, options);
    entities.push(...multiTokenEntities);

    // Extract entities using domain-specific rules
    if (dataContext?.domainContext) {
      const domainEntities = await this.extractDomainSpecificEntities(
        tokens, 
        dataContext.domainContext.domain, 
        options
      );
      entities.push(...domainEntities);
    }

    return this.deduplicateEntities(entities);
  }

  /**
   * Extracts entity from a single token
   */
  private async extractEntityFromToken(
    token: QueryToken,
    position: number,
    allTokens: QueryToken[],
    dataContext?: IntelligentSpreadsheetData,
    options: EntityResolutionOptions = {}
  ): Promise<ExtractedEntity | null> {
    const entityType = this.classifyEntityType(token.text, dataContext);
    
    if (!entityType) return null;

    const alternatives = await this.findEntityAlternatives(token.text, entityType, options);
    
    const businessContext = options.includeBusinessContext 
      ? await this.extractBusinessContext(token.text, entityType, dataContext)
      : undefined;

    return {
      text: token.text,
      type: entityType,
      confidence: this.calculateEntityConfidence(token, entityType, alternatives),
      position: {
        start: position,
        end: position + 1,
        tokenIndex: position
      },
      alternatives,
      businessContext
    };
  }

  /**
   * Extracts multi-token entities (e.g., "Apple Inc.", "Gross Profit Margin")
   */
  private async extractMultiTokenEntities(
    tokens: QueryToken[],
    dataContext?: IntelligentSpreadsheetData,
    options: EntityResolutionOptions = {}
  ): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    
    // Look for company name patterns
    const companyPatterns = [
      /(\w+)\s+(inc|corp|ltd|llc|company)/i,
      /(\w+\s+\w+)\s+(inc|corp|ltd|llc)/i
    ];

    const text = tokens.map(t => t.text).join(' ');
    
    for (const pattern of companyPatterns) {
      const matches = text.matchAll(new RegExp(pattern, 'gi'));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          const companyName = match[0];
          const startToken = this.findTokenPosition(tokens, match.index);
          const endToken = this.findTokenPosition(tokens, match.index + companyName.length);
          
          if (startToken !== -1 && endToken !== -1) {
            const alternatives = await this.findEntityAlternatives(companyName, EntityType.COMPANY, options);
            
            entities.push({
              text: companyName,
              type: EntityType.COMPANY,
              confidence: 0.8,
              position: {
                start: startToken,
                end: endToken,
                tokenIndex: startToken
              },
              alternatives
            });
          }
        }
      }
    }

    return entities;
  }

  /**
   * Extracts domain-specific entities
   */
  private async extractDomainSpecificEntities(
    tokens: QueryToken[],
    domain: DomainType,
    options: EntityResolutionOptions = {}
  ): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    const rules = this.config.domainRules[domain] || [];
    
    const text = tokens.map(t => t.text).join(' ');
    
    for (const rule of rules) {
      const matches = text.matchAll(new RegExp(rule.pattern, 'gi'));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          const entityText = match[0];
          const startToken = this.findTokenPosition(tokens, match.index);
          
          if (startToken !== -1) {
            const alternatives = await this.findEntityAlternatives(entityText, rule.entityType, options);
            
            entities.push({
              text: entityText,
              type: rule.entityType,
              confidence: rule.confidence,
              position: {
                start: startToken,
                end: startToken + 1,
                tokenIndex: startToken
              },
              alternatives
            });
          }
        }
      }
    }

    return entities;
  }

  /**
   * Resolves a single entity with data context
   */
  private async resolveEntity(
    entity: ExtractedEntity,
    dataContext?: IntelligentSpreadsheetData,
    options: EntityResolutionOptions = {}
  ): Promise<EntityResolution | null> {
    try {
      // Find resolved entity information
      const resolvedEntity = await this.findResolvedEntity(entity, options);
      
      if (!resolvedEntity) return null;

      // Find data matches in spreadsheet
      const dataMatches = dataContext 
        ? await this.findDataMatches(entity, resolvedEntity, dataContext, options)
        : [];

      // Calculate resolution confidence
      const confidence = this.calculateResolutionConfidence([{ 
        entity, 
        resolved: resolvedEntity, 
        dataMatches, 
        confidence: 0, 
        reasoning: [] 
      }], []).overall;

      // Generate reasoning
      const reasoning = this.generateResolutionReasoning(entity, resolvedEntity, dataMatches);

      return {
        entity,
        resolved: resolvedEntity,
        dataMatches,
        confidence,
        reasoning
      };

    } catch (error) {
      console.warn(`Failed to resolve entity "${entity.text}":`, error);
      return null;
    }
  }

  /**
   * Finds resolved entity information from databases
   */
  private async findResolvedEntity(
    entity: ExtractedEntity,
    options: EntityResolutionOptions = {}
  ): Promise<ResolvedEntity | null> {
    switch (entity.type) {
      case EntityType.COMPANY:
        return this.resolveCompanyEntity(entity, options);
      
      case EntityType.METRIC:
      case EntityType.FINANCIAL_INSTRUMENT:
        return this.resolveFinancialEntity(entity, options);
      
      default:
        return this.resolveGenericEntity(entity, options);
    }
  }

  /**
   * Resolves company entities
   */
  private async resolveCompanyEntity(
    entity: ExtractedEntity,
    options: EntityResolutionOptions = {}
  ): Promise<ResolvedEntity | null> {
    const companyName = entity.text.toLowerCase();
    
    // Direct lookup
    let companyInfo = this.config.companyDatabase.companies.get(companyName);
    
    // Fuzzy matching if enabled
    if (!companyInfo && options.enableFuzzyMatching) {
      companyInfo = await this.findFuzzyCompanyMatch(companyName);
    }

    // Stock symbol lookup
    if (!companyInfo) {
      const symbol = this.config.companyDatabase.stockSymbols.get(companyName.toUpperCase());
      if (symbol) {
        companyInfo = this.config.companyDatabase.companies.get(symbol);
      }
    }

    if (!companyInfo) return null;

    return {
      canonicalName: companyInfo.name,
      aliases: companyInfo.aliases,
      metadata: {
        type: EntityType.COMPANY,
        domain: DomainType.FINANCIAL,
        attributes: {
          stockSymbol: companyInfo.stockSymbol,
          industry: companyInfo.industry,
          sector: companyInfo.sector,
          marketCap: companyInfo.marketCap,
          exchange: companyInfo.exchange
        },
        relationships: this.buildCompanyRelationships(companyInfo)
      },
      confidence: 0.9,
      dataReferences: []
    };
  }

  /**
   * Resolves financial entities (metrics, ratios, etc.)
   */
  private async resolveFinancialEntity(
    entity: ExtractedEntity,
    options: EntityResolutionOptions = {}
  ): Promise<ResolvedEntity | null> {
    const termName = entity.text.toLowerCase();
    
    // Check metrics database
    let metricInfo = this.config.financialTerms.metrics.get(termName);
    
    // Check with aliases
    if (!metricInfo) {
      for (const [metric, info] of this.config.financialTerms.metrics) {
        if (info.aliases.some(alias => alias.toLowerCase() === termName)) {
          metricInfo = info;
          break;
        }
      }
    }

    if (!metricInfo) return null;

    return {
      canonicalName: metricInfo.name,
      aliases: metricInfo.aliases,
      metadata: {
        type: EntityType.METRIC,
        domain: DomainType.FINANCIAL,
        attributes: {
          category: metricInfo.category,
          formula: metricInfo.formula,
          units: metricInfo.units,
          description: metricInfo.description
        },
        relationships: []
      },
      confidence: 0.85,
      dataReferences: []
    };
  }

  /**
   * Resolves generic entities
   */
  private async resolveGenericEntity(
    entity: ExtractedEntity,
    options: EntityResolutionOptions = {}
  ): Promise<ResolvedEntity | null> {
    // Basic resolution for other entity types
    return {
      canonicalName: entity.text,
      aliases: [entity.text],
      metadata: {
        type: entity.type,
        domain: DomainType.GENERAL,
        attributes: {},
        relationships: []
      },
      confidence: 0.6,
      dataReferences: []
    };
  }

  /**
   * Finds data matches in spreadsheet for resolved entity
   */
  private async findDataMatches(
    entity: ExtractedEntity,
    resolvedEntity: ResolvedEntity,
    dataContext: IntelligentSpreadsheetData,
    options: EntityResolutionOptions = {}
  ): Promise<DataMatch[]> {
    const matches: DataMatch[] = [];
    
    // Search for exact matches
    const exactMatches = this.findExactMatches(resolvedEntity, dataContext);
    matches.push(...exactMatches);

    // Search for fuzzy matches if enabled
    if (options.enableFuzzyMatching) {
      const fuzzyMatches = this.findFuzzyMatches(resolvedEntity, dataContext);
      matches.push(...fuzzyMatches);
    }

    // Search for semantic matches if enabled
    if (options.enableSemanticMatching) {
      const semanticMatches = await this.findSemanticMatches(resolvedEntity, dataContext);
      matches.push(...semanticMatches);
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Finds exact matches in spreadsheet data
   */
  private findExactMatches(
    resolvedEntity: ResolvedEntity,
    dataContext: IntelligentSpreadsheetData
  ): DataMatch[] {
    const matches: DataMatch[] = [];
    const searchTerms = [resolvedEntity.canonicalName, ...resolvedEntity.aliases];
    
    for (const term of searchTerms) {
      const cellRefs = dataContext.searchIndex.byContent.get(term.toLowerCase()) || [];
      
      for (const cellRef of cellRefs) {
        const intentCellRef: IntentCellReference = {
          sheet: cellRef.sheet,
          row: cellRef.row,
          col: cellRef.col,
          address: cellRef.address,
          value: cellRef.value,
          dataType: cellRef.dataType || EnhancedDataType.TEXT
        };
        
        matches.push({
          sheet: cellRef.sheet,
          range: cellRef.address,
          cells: [intentCellRef],
          matchType: MatchType.EXACT,
          confidence: 0.95,
          context: this.buildMatchContext(cellRef, dataContext)
        });
      }
    }

    return matches;
  }

  /**
   * Finds fuzzy matches in spreadsheet data
   */
  private findFuzzyMatches(
    resolvedEntity: ResolvedEntity,
    dataContext: IntelligentSpreadsheetData
  ): DataMatch[] {
    const matches: DataMatch[] = [];
    
    // Use fuzzy search index if available
    if (dataContext.searchIndex.fuzzyIndex) {
      const companyMatches = dataContext.searchIndex.fuzzyIndex.companyNames.get(
        resolvedEntity.canonicalName.toLowerCase()
      ) || [];
      
      for (const companyMatch of companyMatches) {
        for (const cellRef of companyMatch.cellReferences) {
          const intentCellRef: IntentCellReference = {
            sheet: cellRef.sheet,
            row: cellRef.row,
            col: cellRef.col,
            address: cellRef.address,
            value: cellRef.value,
            dataType: cellRef.dataType || EnhancedDataType.TEXT
          };
          
          matches.push({
            sheet: cellRef.sheet,
            range: cellRef.address,
            cells: [intentCellRef],
            matchType: MatchType.FUZZY,
            confidence: companyMatch.confidence,
            context: this.buildMatchContext(cellRef, dataContext)
          });
        }
      }
    }

    return matches;
  }

  /**
   * Finds semantic matches using AI/ML techniques
   */
  private async findSemanticMatches(
    resolvedEntity: ResolvedEntity,
    dataContext: IntelligentSpreadsheetData
  ): Promise<DataMatch[]> {
    // Placeholder for semantic matching implementation
    // Would use embeddings, similarity search, etc.
    return [];
  }

  /**
   * Builds match context for a cell reference
   */
  private buildMatchContext(
    cellRef: EnhancedCellReference,
    dataContext: IntelligentSpreadsheetData
  ): MatchContext {
    return {
      surroundingData: [], // Would extract surrounding cell values
      columnHeaders: [], // Would extract column headers
      rowContext: [], // Would extract row context
      dataType: EnhancedDataType.TEXT, // Would determine actual data type
      businessContext: dataContext.domainContext?.domain
    };
  }

  // Helper methods

  private initializeConfig(config?: Partial<EntityResolutionConfig>): EntityResolutionConfig {
    return {
      companyDatabase: config?.companyDatabase || this.createDefaultCompanyDatabase(),
      financialTerms: config?.financialTerms || this.createDefaultFinancialTerms(),
      synonymMappings: config?.synonymMappings || this.createDefaultSynonymMappings(),
      domainRules: config?.domainRules || this.createDefaultDomainRules()
    };
  }

  private createDefaultCompanyDatabase(): CompanyDatabase {
    const companies = new Map<string, CompanyInfo>();
    const aliases = new Map<string, string[]>();
    const stockSymbols = new Map<string, string>();
    const industries = new Map<string, string[]>();

    // Add some common companies
    companies.set('apple inc', {
      name: 'Apple Inc.',
      aliases: ['apple', 'aapl'],
      stockSymbol: 'AAPL',
      industry: 'Technology',
      sector: 'Consumer Electronics'
    });

    companies.set('microsoft corporation', {
      name: 'Microsoft Corporation',
      aliases: ['microsoft', 'msft'],
      stockSymbol: 'MSFT',
      industry: 'Technology',
      sector: 'Software'
    });

    stockSymbols.set('AAPL', 'apple inc');
    stockSymbols.set('MSFT', 'microsoft corporation');

    return { companies, aliases, stockSymbols, industries };
  }

  private createDefaultFinancialTerms(): FinancialTermDatabase {
    const metrics = new Map<string, MetricInfo>();
    const ratios = new Map<string, RatioInfo>();
    const statements = new Map<string, StatementInfo>();
    const categories = new Map<string, string[]>();

    // Add common financial metrics
    metrics.set('revenue', {
      name: 'Revenue',
      aliases: ['sales', 'income', 'turnover'],
      category: 'Income Statement',
      description: 'Total income generated from business operations'
    });

    metrics.set('profit', {
      name: 'Profit',
      aliases: ['net income', 'earnings', 'net profit'],
      category: 'Income Statement',
      description: 'Total earnings after all expenses'
    });

    return { metrics, ratios, statements, categories };
  }

  private createDefaultSynonymMappings(): SynonymMappings {
    return {
      companies: new Map(),
      metrics: new Map(),
      general: new Map()
    };
  }

  private createDefaultDomainRules(): DomainEntityRules {
    return {
      [DomainType.FINANCIAL]: [
        {
          pattern: /\b(revenue|profit|loss|ebitda|roi)\b/i,
          entityType: EntityType.METRIC,
          confidence: 0.8
        },
        {
          pattern: /\b[A-Z]{2,5}\b/,
          entityType: EntityType.FINANCIAL_INSTRUMENT,
          confidence: 0.7
        }
      ]
    };
  }

  private isPotentialEntity(token: QueryToken): boolean {
    return token.entityType !== undefined || 
           /^[A-Z][a-z]+/.test(token.text) || // Capitalized words
           /^[A-Z]{2,5}$/.test(token.text); // Stock symbols
  }

  private classifyEntityType(text: string, dataContext?: IntelligentSpreadsheetData): EntityType | null {
    // Company patterns
    if (/\b(inc|corp|ltd|llc|company)\b/i.test(text) || 
        /^[A-Z]{2,5}$/.test(text)) {
      return EntityType.COMPANY;
    }

    // Financial metric patterns
    if (/\b(revenue|profit|sales|price|volume|margin)\b/i.test(text)) {
      return EntityType.METRIC;
    }

    // Person patterns
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(text)) {
      return EntityType.PERSON;
    }

    return null;
  }

  private async findEntityAlternatives(
    text: string,
    entityType: EntityType,
    options: EntityResolutionOptions = {}
  ): Promise<EntityAlternative[]> {
    const alternatives: EntityAlternative[] = [];

    // Add phonetic alternatives
    if (options.enableFuzzyMatching) {
      const phoneticAlts = this.phoneticMatcher.findAlternatives(text);
      alternatives.push(...phoneticAlts.map(alt => ({
        text: alt,
        confidence: 0.7,
        reasoning: 'Phonetic similarity'
      })));
    }

    // Add synonym alternatives
    if (options.enableSynonymExpansion) {
      const synonyms = this.findSynonyms(text, entityType);
      alternatives.push(...synonyms.map(syn => ({
        text: syn,
        confidence: 0.8,
        reasoning: 'Synonym match'
      })));
    }

    return alternatives.slice(0, options.maxAlternatives || 3);
  }

  private calculateEntityConfidence(
    token: QueryToken,
    entityType: EntityType,
    alternatives: EntityAlternative[]
  ): number {
    let confidence = token.confidence || 0.5;

    // Boost confidence based on entity type certainty
    if (entityType === EntityType.COMPANY && /\b(inc|corp|ltd)\b/i.test(token.text)) {
      confidence += 0.3;
    }

    // Reduce confidence if many alternatives exist
    if (alternatives.length > 2) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private async extractBusinessContext(
    text: string,
    entityType: EntityType,
    dataContext?: IntelligentSpreadsheetData
  ): Promise<EntityBusinessContext | undefined> {
    if (entityType === EntityType.COMPANY && dataContext?.domainContext?.domain === DomainType.FINANCIAL) {
      return {
        industry: 'Technology', // Would be looked up from database
        sector: 'Software',
        reportingCurrency: 'USD'
      };
    }
    return undefined;
  }

  private findTokenPosition(tokens: QueryToken[], charPosition: number): number {
    // Simplified - would need proper character to token mapping
    return Math.floor(charPosition / 10); // Rough approximation
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Set<string>();
    return entities.filter(entity => {
      const key = `${entity.text}-${entity.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async findFuzzyCompanyMatch(companyName: string): Promise<CompanyInfo | null> {
    // Implement fuzzy matching logic
    return null;
  }

  private buildCompanyRelationships(companyInfo: CompanyInfo): EntityRelationship[] {
    const relationships: EntityRelationship[] = [];
    
    if (companyInfo.aliases) {
      companyInfo.aliases.forEach(alias => {
        relationships.push({
          type: RelationshipType.SYNONYM,
          target: alias,
          strength: 0.9
        });
      });
    }

    return relationships;
  }

  private async detectEntityAmbiguities(
    entities: ExtractedEntity[],
    resolutions: (EntityResolution | null)[],
    dataContext?: IntelligentSpreadsheetData
  ): Promise<EntityAmbiguity[]> {
    // Simplified ambiguity detection
    return [];
  }

  private calculateResolutionConfidence(
    resolutions: EntityResolution[],
    ambiguities: EntityAmbiguity[]
  ): ConfidenceScore {
    const avgConfidence = resolutions.length > 0 
      ? resolutions.reduce((sum, r) => sum + r.confidence, 0) / resolutions.length 
      : 0.5;

    return {
      overall: Math.max(0, avgConfidence - (ambiguities.length * 0.1)),
      components: [
        {
          name: 'Entity Resolution',
          score: avgConfidence,
          weight: 0.8,
          description: 'Average confidence of entity resolutions'
        }
      ],
      factors: [
        {
          type: ambiguities.length > 0 ? FactorType.NEGATIVE : FactorType.POSITIVE,
          impact: ambiguities.length * -0.1,
          description: `${ambiguities.length} ambiguities detected`,
          evidence: []
        }
      ],
      explanation: `Resolution confidence based on ${resolutions.length} entities`,
      reliability: ReliabilityLevel.MEDIUM
    };
  }

  private async generateResolutionSuggestions(
    resolutions: EntityResolution[],
    ambiguities: EntityAmbiguity[],
    dataContext?: IntelligentSpreadsheetData
  ): Promise<ResolutionSuggestion[]> {
    const suggestions: ResolutionSuggestion[] = [];

    if (ambiguities.length > 0) {
      suggestions.push({
        type: SuggestionType.ENTITY_CLARIFICATION,
        description: 'Clarify ambiguous entity references',
        action: 'Ask user to specify which entity they mean',
        priority: 1,
        expectedImprovement: 0.3
      });
    }

    return suggestions;
  }

  private generateResolutionReasoning(
    entity: ExtractedEntity,
    resolvedEntity: ResolvedEntity,
    dataMatches: DataMatch[]
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Resolved "${entity.text}" to "${resolvedEntity.canonicalName}"`);
    
    if (dataMatches.length > 0) {
      reasoning.push(`Found ${dataMatches.length} data matches in spreadsheet`);
    }

    if (resolvedEntity.aliases.length > 0) {
      reasoning.push(`Known aliases: ${resolvedEntity.aliases.join(', ')}`);
    }

    return reasoning;
  }

  private findSynonyms(text: string, entityType: EntityType): string[] {
    // Simplified synonym lookup
    const synonymMap = this.config.synonymMappings;
    
    switch (entityType) {
      case EntityType.COMPANY:
        return synonymMap.companies.get(text.toLowerCase()) || [];
      case EntityType.METRIC:
        return synonymMap.metrics.get(text.toLowerCase()) || [];
      default:
        return synonymMap.general.get(text.toLowerCase()) || [];
    }
  }
}

// Supporting classes
class PhoneticMatcher {
  findAlternatives(text: string): string[] {
    // Simplified phonetic matching
    return [];
  }
}

class SemanticMatcher {
  async findSimilar(text: string): Promise<string[]> {
    // Placeholder for semantic matching
    return [];
  }
}

export class EntityResolutionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'EntityResolutionError';
  }
}