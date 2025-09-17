/**
 * Intelligent Search Service - Fast entity lookup and fuzzy search capabilities
 * 
 * This service provides:
 * - Multi-dimensional search across content, data types, and patterns
 * - Fuzzy matching with phonetic and semantic similarity
 * - Entity-aware search with synonym recognition
 * - Performance-optimized indexing and retrieval
 */

import {
  IntelligentSpreadsheetData,
  SearchIndex,
  FuzzySearchIndex,
  CellReference,
  CompanyMatch,
  TermMatch,
  EntityMatch,
  EnhancedDataType,
  DomainType,
  PatternType
} from '../types/enhanced-intelligence';

export interface SearchQuery {
  term: string;
  type?: 'exact' | 'fuzzy' | 'semantic' | 'phonetic';
  dataTypes?: EnhancedDataType[];
  domains?: DomainType[];
  patterns?: PatternType[];
  maxResults?: number;
  confidenceThreshold?: number;
  includeContext?: boolean;
}

export interface SearchResult {
  cellReferences: CellReference[];
  matches: SearchMatch[];
  totalResults: number;
  searchTime: number;
  confidence: number;
  suggestions?: string[];
}

export interface SearchMatch {
  cellRef: CellReference;
  matchType: 'exact' | 'fuzzy' | 'synonym' | 'phonetic' | 'semantic';
  confidence: number;
  highlightedText?: string;
  context?: SearchContext;
}

export interface SearchContext {
  surroundingCells: CellReference[];
  columnHeader?: string;
  rowContext?: string;
  dataPattern?: PatternType;
}

export interface EntitySearchResult {
  entities: EntityMatch[];
  totalResults: number;
  searchTime: number;
  confidence: number;
}

export class IntelligentSearchService {
  private static readonly DEFAULT_MAX_RESULTS = 100;
  private static readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.5;
  private static readonly FUZZY_SIMILARITY_THRESHOLD = 0.7;

  /**
   * Perform intelligent search across spreadsheet data
   */
  public static async search(
    data: IntelligentSpreadsheetData,
    query: SearchQuery
  ): Promise<SearchResult> {
    const startTime = Date.now();
    const maxResults = query.maxResults || this.DEFAULT_MAX_RESULTS;
    const confidenceThreshold = query.confidenceThreshold || this.DEFAULT_CONFIDENCE_THRESHOLD;

    let matches: SearchMatch[] = [];

    // Perform different types of searches based on query type
    switch (query.type || 'fuzzy') {
      case 'exact':
        matches = this.performExactSearch(data.searchIndex, query);
        break;
      case 'fuzzy':
        matches = this.performFuzzySearch(data.searchIndex, query);
        break;
      case 'semantic':
        matches = this.performSemanticSearch(data, query);
        break;
      case 'phonetic':
        matches = this.performPhoneticSearch(data.searchIndex, query);
        break;
    }

    // Filter by confidence threshold
    matches = matches.filter(match => match.confidence >= confidenceThreshold);

    // Apply additional filters
    if (query.dataTypes && query.dataTypes.length > 0) {
      matches = this.filterByDataTypes(matches, query.dataTypes, data);
    }

    if (query.domains && query.domains.length > 0) {
      matches = this.filterByDomains(matches, query.domains, data);
    }

    if (query.patterns && query.patterns.length > 0) {
      matches = this.filterByPatterns(matches, query.patterns, data);
    }

    // Sort by confidence and limit results
    matches.sort((a, b) => b.confidence - a.confidence);
    matches = matches.slice(0, maxResults);

    // Add context if requested
    if (query.includeContext) {
      matches = matches.map(match => ({
        ...match,
        context: this.getSearchContext(match.cellRef, data)
      }));
    }

    const searchTime = Date.now() - startTime;
    const cellReferences = matches.map(match => match.cellRef);
    const overallConfidence = matches.length > 0 
      ? matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length
      : 0;

    // Generate search suggestions
    const suggestions = this.generateSearchSuggestions(query, data);

    return {
      cellReferences,
      matches,
      totalResults: matches.length,
      searchTime,
      confidence: overallConfidence,
      suggestions
    };
  }

  /**
   * Search for specific entities (companies, people, etc.)
   */
  public static async searchEntities(
    data: IntelligentSpreadsheetData,
    entityType: 'company' | 'person' | 'location' | 'product' | 'financial_instrument',
    query: string,
    options: { maxResults?: number; confidenceThreshold?: number } = {}
  ): Promise<EntitySearchResult> {
    const startTime = Date.now();
    const maxResults = options.maxResults || this.DEFAULT_MAX_RESULTS;
    const confidenceThreshold = options.confidenceThreshold || this.DEFAULT_CONFIDENCE_THRESHOLD;

    const entities: EntityMatch[] = [];
    const entityIndex = data.entityIndex[entityType === 'company' ? 'companies' : 
                                        entityType === 'person' ? 'people' :
                                        entityType === 'location' ? 'locations' :
                                        entityType === 'product' ? 'products' : 'financialInstruments'];

    // Search through entity index
    const lowerQuery = query.toLowerCase();
    entityIndex.forEach((matches, key) => {
      if (key.includes(lowerQuery) || lowerQuery.includes(key)) {
        matches.forEach(match => {
          if (match.confidence >= confidenceThreshold) {
            entities.push(match);
          }
        });
      }
    });

    // Sort by confidence and limit results
    entities.sort((a, b) => b.confidence - a.confidence);
    const limitedEntities = entities.slice(0, maxResults);

    const searchTime = Date.now() - startTime;
    const overallConfidence = limitedEntities.length > 0
      ? limitedEntities.reduce((sum, entity) => sum + entity.confidence, 0) / limitedEntities.length
      : 0;

    return {
      entities: limitedEntities,
      totalResults: limitedEntities.length,
      searchTime,
      confidence: overallConfidence
    };
  }

  /**
   * Find similar companies using fuzzy matching and synonyms
   */
  public static findSimilarCompanies(
    data: IntelligentSpreadsheetData,
    companyName: string,
    options: { maxResults?: number; similarityThreshold?: number } = {}
  ): Promise<CompanyMatch[]> {
    const maxResults = options.maxResults || 10;
    const similarityThreshold = options.similarityThreshold || this.FUZZY_SIMILARITY_THRESHOLD;

    const matches: CompanyMatch[] = [];
    const lowerQuery = companyName.toLowerCase();

    // Search through company fuzzy index
    data.searchIndex.fuzzyIndex.companyNames.forEach((companyMatches, key) => {
      companyMatches.forEach(match => {
        const similarity = this.calculateStringSimilarity(lowerQuery, match.normalizedName);
        if (similarity >= similarityThreshold) {
          matches.push({
            ...match,
            confidence: similarity
          });
        }

        // Check aliases
        match.aliases.forEach(alias => {
          const aliasSimilarity = this.calculateStringSimilarity(lowerQuery, alias.toLowerCase());
          if (aliasSimilarity >= similarityThreshold) {
            matches.push({
              ...match,
              confidence: aliasSimilarity
            });
          }
        });
      });
    });

    // Remove duplicates and sort by confidence
    const uniqueMatches = this.removeDuplicateCompanies(matches);
    uniqueMatches.sort((a, b) => b.confidence - a.confidence);

    return Promise.resolve(uniqueMatches.slice(0, maxResults));
  }

  /**
   * Find financial terms and their synonyms
   */
  public static findFinancialTerms(
    data: IntelligentSpreadsheetData,
    term: string,
    options: { includeDefinitions?: boolean; maxResults?: number } = {}
  ): Promise<TermMatch[]> {
    const maxResults = options.maxResults || 20;
    const matches: TermMatch[] = [];
    const lowerTerm = term.toLowerCase();

    // Search through financial terms index
    data.searchIndex.fuzzyIndex.financialTerms.forEach((termMatches, key) => {
      termMatches.forEach(match => {
        if (match.term.includes(lowerTerm) || 
            match.synonyms.some(syn => syn.includes(lowerTerm)) ||
            lowerTerm.includes(match.term)) {
          matches.push(match);
        }
      });
    });

    // Check synonym index
    data.synonymIndex.financialTerms.forEach((synonyms, mainTerm) => {
      if (mainTerm.includes(lowerTerm) || synonyms.some(syn => syn.includes(lowerTerm))) {
        matches.push({
          term: mainTerm,
          category: 'financial',
          synonyms,
          confidence: 0.8,
          cellReferences: []
        });
      }
    });

    // Remove duplicates and sort
    const uniqueMatches = this.removeDuplicateTerms(matches);
    uniqueMatches.sort((a, b) => b.confidence - a.confidence);

    return Promise.resolve(uniqueMatches.slice(0, maxResults));
  }

  /**
   * Auto-complete search suggestions
   */
  public static getAutoCompleteSuggestions(
    data: IntelligentSpreadsheetData,
    partialQuery: string,
    maxSuggestions: number = 10
  ): string[] {
    const suggestions = new Set<string>();
    const lowerQuery = partialQuery.toLowerCase();

    // Search through content index
    data.searchIndex.byContent.forEach((cellRefs, term) => {
      if (term.startsWith(lowerQuery) && suggestions.size < maxSuggestions) {
        suggestions.add(term);
      }
    });

    // Add company names
    data.searchIndex.fuzzyIndex.companyNames.forEach((matches) => {
      matches.forEach(match => {
        if (match.normalizedName.startsWith(lowerQuery) && suggestions.size < maxSuggestions) {
          suggestions.add(match.originalName);
        }
        match.aliases.forEach(alias => {
          if (alias.toLowerCase().startsWith(lowerQuery) && suggestions.size < maxSuggestions) {
            suggestions.add(alias);
          }
        });
      });
    });

    // Add financial terms
    data.synonymIndex.financialTerms.forEach((synonyms, term) => {
      if (term.startsWith(lowerQuery) && suggestions.size < maxSuggestions) {
        suggestions.add(term);
      }
      synonyms.forEach(synonym => {
        if (synonym.toLowerCase().startsWith(lowerQuery) && suggestions.size < maxSuggestions) {
          suggestions.add(synonym);
        }
      });
    });

    return Array.from(suggestions).slice(0, maxSuggestions);
  }

  // Private search implementation methods

  private static performExactSearch(searchIndex: SearchIndex, query: SearchQuery): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const lowerTerm = query.term.toLowerCase();

    const cellRefs = searchIndex.byContent.get(lowerTerm) || [];
    cellRefs.forEach(cellRef => {
      matches.push({
        cellRef,
        matchType: 'exact',
        confidence: 1.0,
        highlightedText: query.term
      });
    });

    return matches;
  }

  private static performFuzzySearch(searchIndex: SearchIndex, query: SearchQuery): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const lowerTerm = query.term.toLowerCase();

    // Search through content index with fuzzy matching
    searchIndex.byContent.forEach((cellRefs, term) => {
      const similarity = this.calculateStringSimilarity(lowerTerm, term);
      if (similarity >= this.FUZZY_SIMILARITY_THRESHOLD) {
        cellRefs.forEach(cellRef => {
          matches.push({
            cellRef,
            matchType: 'fuzzy',
            confidence: similarity,
            highlightedText: term
          });
        });
      }
    });

    // Search through company names
    searchIndex.fuzzyIndex.companyNames.forEach((companyMatches) => {
      companyMatches.forEach(companyMatch => {
        const similarity = this.calculateStringSimilarity(lowerTerm, companyMatch.normalizedName);
        if (similarity >= this.FUZZY_SIMILARITY_THRESHOLD) {
          companyMatch.cellReferences.forEach(cellRef => {
            matches.push({
              cellRef,
              matchType: 'fuzzy',
              confidence: similarity,
              highlightedText: companyMatch.originalName
            });
          });
        }

        // Check aliases
        companyMatch.aliases.forEach(alias => {
          const aliasSimilarity = this.calculateStringSimilarity(lowerTerm, alias.toLowerCase());
          if (aliasSimilarity >= this.FUZZY_SIMILARITY_THRESHOLD) {
            companyMatch.cellReferences.forEach(cellRef => {
              matches.push({
                cellRef,
                matchType: 'synonym',
                confidence: aliasSimilarity,
                highlightedText: alias
              });
            });
          }
        });
      });
    });

    return matches;
  }

  private static performSemanticSearch(
    data: IntelligentSpreadsheetData,
    query: SearchQuery
  ): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const lowerTerm = query.term.toLowerCase();

    // Search through synonym indices for semantic matches
    data.synonymIndex.financialTerms.forEach((synonyms, mainTerm) => {
      if (synonyms.some(syn => syn.includes(lowerTerm)) || mainTerm.includes(lowerTerm)) {
        // Find cells containing this term or its synonyms
        const allTerms = [mainTerm, ...synonyms];
        allTerms.forEach(term => {
          const cellRefs = data.searchIndex.byContent.get(term) || [];
          cellRefs.forEach(cellRef => {
            matches.push({
              cellRef,
              matchType: 'semantic',
              confidence: 0.8,
              highlightedText: term
            });
          });
        });
      }
    });

    data.synonymIndex.businessTerms.forEach((synonyms, mainTerm) => {
      if (synonyms.some(syn => syn.includes(lowerTerm)) || mainTerm.includes(lowerTerm)) {
        const allTerms = [mainTerm, ...synonyms];
        allTerms.forEach(term => {
          const cellRefs = data.searchIndex.byContent.get(term) || [];
          cellRefs.forEach(cellRef => {
            matches.push({
              cellRef,
              matchType: 'semantic',
              confidence: 0.75,
              highlightedText: term
            });
          });
        });
      }
    });

    return matches;
  }

  private static performPhoneticSearch(searchIndex: SearchIndex, query: SearchQuery): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const phoneticKey = this.generatePhoneticKey(query.term);

    const similarTerms = searchIndex.fuzzyIndex.phoneticIndex.get(phoneticKey) || [];
    similarTerms.forEach(term => {
      const cellRefs = searchIndex.byContent.get(term.toLowerCase()) || [];
      cellRefs.forEach(cellRef => {
        matches.push({
          cellRef,
          matchType: 'phonetic',
          confidence: 0.7,
          highlightedText: term
        });
      });
    });

    return matches;
  }

  // Filter methods

  private static filterByDataTypes(
    matches: SearchMatch[],
    dataTypes: EnhancedDataType[],
    data: IntelligentSpreadsheetData
  ): SearchMatch[] {
    return matches.filter(match => {
      const sheet = data.sheets.find(s => s.name === match.cellRef.sheet);
      if (!sheet) return false;

      const cell = sheet.data[match.cellRef.row]?.[match.cellRef.col];
      if (!cell) return false;

      const enhancedCell = cell as any;
      return dataTypes.includes(enhancedCell.enhancedDataType);
    });
  }

  private static filterByDomains(
    matches: SearchMatch[],
    domains: DomainType[],
    data: IntelligentSpreadsheetData
  ): SearchMatch[] {
    // For now, use the overall domain context
    // In a more sophisticated implementation, we'd have per-cell domain classification
    return domains.includes(data.domainContext.domain) ? matches : [];
  }

  private static filterByPatterns(
    matches: SearchMatch[],
    patterns: PatternType[],
    data: IntelligentSpreadsheetData
  ): SearchMatch[] {
    return matches.filter(match => {
      // Check if the cell is within any of the specified patterns
      return data.dataPatterns.dataBlocks.some(block => {
        return match.cellRef.row >= block.startRow &&
               match.cellRef.row <= block.endRow &&
               match.cellRef.col >= block.startCol &&
               match.cellRef.col <= block.endCol &&
               patterns.includes(block.type);
      });
    });
  }

  // Utility methods

  private static getSearchContext(cellRef: CellReference, data: IntelligentSpreadsheetData): SearchContext {
    const sheet = data.sheets.find(s => s.name === cellRef.sheet);
    if (!sheet) return { surroundingCells: [] };

    const surroundingCells: CellReference[] = [];
    const contextRadius = 2;

    // Get surrounding cells
    for (let row = Math.max(0, cellRef.row - contextRadius); 
         row <= Math.min(sheet.data.length - 1, cellRef.row + contextRadius); 
         row++) {
      for (let col = Math.max(0, cellRef.col - contextRadius);
           col <= Math.min((sheet.data[row]?.length || 0) - 1, cellRef.col + contextRadius);
           col++) {
        if (row !== cellRef.row || col !== cellRef.col) {
          const cell = sheet.data[row]?.[col];
          if (cell && cell.value) {
            surroundingCells.push({
              sheet: cellRef.sheet,
              row,
              col,
              address: this.indexToAddress(row, col),
              value: cell.value
            });
          }
        }
      }
    }

    // Get column header if available
    let columnHeader: string | undefined;
    const headerPatterns = data.dataPatterns.headerPatterns.filter(p => p.type === 'main_header');
    if (headerPatterns.length > 0) {
      const headerPattern = headerPatterns[0];
      if (headerPattern && headerPattern.content[cellRef.col]) {
        columnHeader = headerPattern.content[cellRef.col];
      }
    }

    return {
      surroundingCells,
      columnHeader
    };
  }

  private static generateSearchSuggestions(
    query: SearchQuery,
    data: IntelligentSpreadsheetData
  ): string[] {
    const suggestions: string[] = [];
    const lowerTerm = query.term.toLowerCase();

    // Suggest similar terms from content index
    data.searchIndex.byContent.forEach((cellRefs, term) => {
      if (term !== lowerTerm && this.calculateStringSimilarity(lowerTerm, term) > 0.6) {
        suggestions.push(term);
      }
    });

    // Suggest synonyms
    data.synonymIndex.financialTerms.forEach((synonyms, mainTerm) => {
      if (mainTerm.includes(lowerTerm) || synonyms.some(syn => syn.includes(lowerTerm))) {
        synonyms.forEach(synonym => {
          if (synonym !== query.term && !suggestions.includes(synonym)) {
            suggestions.push(synonym);
          }
        });
      }
    });

    return suggestions.slice(0, 5);
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein distance-based similarity
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }

  private static generatePhoneticKey(value: string): string {
    // Simple phonetic key generation (Soundex-like)
    return value.toLowerCase()
      .replace(/[aeiou]/g, '')
      .replace(/[^a-z]/g, '')
      .substring(0, 4)
      .padEnd(4, '0');
  }

  private static indexToAddress(row: number, col: number): string {
    let columnStr = '';
    let tempCol = col;
    
    while (tempCol >= 0) {
      columnStr = String.fromCharCode('A'.charCodeAt(0) + (tempCol % 26)) + columnStr;
      tempCol = Math.floor(tempCol / 26) - 1;
    }
    
    return `${columnStr}${row + 1}`;
  }

  private static removeDuplicateCompanies(matches: CompanyMatch[]): CompanyMatch[] {
    const seen = new Set<string>();
    return matches.filter(match => {
      const key = match.normalizedName;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private static removeDuplicateTerms(matches: TermMatch[]): TermMatch[] {
    const seen = new Set<string>();
    return matches.filter(match => {
      const key = match.term;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}