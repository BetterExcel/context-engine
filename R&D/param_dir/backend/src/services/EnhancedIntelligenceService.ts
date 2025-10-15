/**
 * Enhanced Intelligence Service - Main orchestrator for intelligent spreadsheet analysis
 * 
 * This service coordinates all enhanced intelligence components:
 * - Enhanced Data Parser for intelligent data type detection
 * - Intelligent Search Service for fast entity lookup
 * - Data Quality Analyzer for comprehensive quality assessment
 * - Synonym Recognition Service for company and financial term matching
 * 
 * Provides a unified interface for enhanced contextual understanding
 */

import {
  IntelligentSpreadsheetData,
  EnhancedParseConfig,
  EnhancedDataType
} from '../types/enhanced-intelligence';
import type {
  SearchQuery,
  SearchResult
} from './IntelligentSearchService';
import type {
  QualityProfile
} from './DataQualityAnalyzer';
import type {
  SynonymMatchResult,
  CompanyRecognitionResult,
  FinancialTermResult
} from './SynonymRecognitionService';
import { SpreadsheetData } from '../types/spreadsheet';
import { EnhancedDataParser } from './EnhancedDataParser';
import { IntelligentSearchService } from './IntelligentSearchService';
import { DataQualityAnalyzer, QualityAnalysisOptions } from './DataQualityAnalyzer';
import { SynonymRecognitionService, SynonymLearningOptions } from './SynonymRecognitionService';

export interface EnhancedAnalysisOptions {
  enableIntelligentParsing?: boolean;
  enableQualityAnalysis?: boolean;
  enableSynonymRecognition?: boolean;
  enableFuzzySearch?: boolean;
  parseConfig?: EnhancedParseConfig;
  qualityConfig?: QualityAnalysisOptions;
  synonymConfig?: SynonymLearningOptions;
}

export interface EnhancedAnalysisResult {
  intelligentData: IntelligentSpreadsheetData;
  qualityProfile?: QualityProfile;
  enhancementSummary: EnhancementSummary;
  recommendations: IntelligenceRecommendation[];
  performance: PerformanceMetrics;
}

export interface EnhancementSummary {
  totalCellsAnalyzed: number;
  enhancedDataTypes: Record<EnhancedDataType, number>;
  companiesRecognized: number;
  financialTermsFound: number;
  qualityScore: number;
  anomaliesDetected: number;
  synonymsIdentified: number;
  searchIndexSize: number;
}

export interface IntelligenceRecommendation {
  type: 'data_quality' | 'entity_recognition' | 'search_optimization' | 'synonym_learning';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface PerformanceMetrics {
  totalProcessingTime: number;
  parsingTime: number;
  qualityAnalysisTime: number;
  indexingTime: number;
  memoryUsage: number;
  cellsPerSecond: number;
}

export class EnhancedIntelligenceService {
  private static readonly DEFAULT_OPTIONS: EnhancedAnalysisOptions = {
    enableIntelligentParsing: true,
    enableQualityAnalysis: true,
    enableSynonymRecognition: true,
    enableFuzzySearch: true,
    parseConfig: {
      enableDomainDetection: true,
      enableFuzzySearch: true,
      enableSynonymRecognition: true,
      enableQualityAssessment: true,
      enablePatternDetection: true,
      confidenceThreshold: 0.7
    },
    qualityConfig: {
      enableStatisticalAnalysis: true,
      enablePatternAnalysis: true,
      enableBusinessRuleValidation: true,
      confidenceThreshold: 0.7,
      includeRecommendations: true
    },
    synonymConfig: {
      enableLearning: true,
      confidenceThreshold: 0.7,
      maxSuggestions: 10
    }
  };

  /**
   * Perform comprehensive enhanced analysis of spreadsheet data
   */
  public static async analyzeSpreadsheet(
    file: Buffer | string,
    filename: string,
    mimeType: string,
    options: EnhancedAnalysisOptions = {}
  ): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    console.log('Starting enhanced intelligence analysis for:', filename);

    // Step 1: Enhanced parsing with intelligent data type detection
    const parsingStartTime = Date.now();
    const intelligentData = await this.performEnhancedParsing(
      file, filename, mimeType, opts
    );
    const parsingTime = Date.now() - parsingStartTime;

    // Step 2: Quality analysis
    let qualityProfile: QualityProfile | undefined;
    const qualityStartTime = Date.now();
    if (opts.enableQualityAnalysis) {
      qualityProfile = await DataQualityAnalyzer.analyzeQuality(
        intelligentData,
        opts.qualityConfig
      );
    }
    const qualityAnalysisTime = Date.now() - qualityStartTime;

    // Step 3: Build search indices (already done in parsing, but measure time)
    const indexingStartTime = Date.now();
    // Search index is built during parsing, so this is just for timing
    const indexingTime = Date.now() - indexingStartTime;

    // Step 4: Generate enhancement summary
    const enhancementSummary = this.generateEnhancementSummary(
      intelligentData,
      qualityProfile
    );

    // Step 5: Generate recommendations
    const recommendations = this.generateIntelligenceRecommendations(
      intelligentData,
      qualityProfile,
      enhancementSummary
    );

    // Step 6: Calculate performance metrics
    const totalProcessingTime = Date.now() - startTime;
    const performance = this.calculatePerformanceMetrics(
      totalProcessingTime,
      parsingTime,
      qualityAnalysisTime,
      indexingTime,
      enhancementSummary.totalCellsAnalyzed
    );

    console.log(`Enhanced analysis completed in ${totalProcessingTime}ms`);
    console.log(`Quality score: ${enhancementSummary.qualityScore.toFixed(2)}`);
    console.log(`Companies recognized: ${enhancementSummary.companiesRecognized}`);
    console.log(`Financial terms found: ${enhancementSummary.financialTermsFound}`);

    return {
      intelligentData,
      qualityProfile,
      enhancementSummary,
      recommendations,
      performance
    };
  }

  /**
   * Enhance existing spreadsheet data with intelligence
   */
  public static async enhanceExistingData(
    basicData: SpreadsheetData,
    options: EnhancedAnalysisOptions = {}
  ): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    console.log('Enhancing existing spreadsheet data with intelligence');

    // Enhanced parsing of existing data
    const parsingStartTime = Date.now();
    const intelligentData = await EnhancedDataParser.enhanceSpreadsheetData(
      basicData,
      opts.parseConfig
    );
    const parsingTime = Date.now() - parsingStartTime;

    // Quality analysis
    let qualityProfile: QualityProfile | undefined;
    const qualityStartTime = Date.now();
    if (opts.enableQualityAnalysis) {
      qualityProfile = await DataQualityAnalyzer.analyzeQuality(
        intelligentData,
        opts.qualityConfig
      );
    }
    const qualityAnalysisTime = Date.now() - qualityStartTime;

    const indexingTime = 0; // Already done in parsing

    const enhancementSummary = this.generateEnhancementSummary(
      intelligentData,
      qualityProfile
    );

    const recommendations = this.generateIntelligenceRecommendations(
      intelligentData,
      qualityProfile,
      enhancementSummary
    );

    const totalProcessingTime = Date.now() - startTime;
    const performance = this.calculatePerformanceMetrics(
      totalProcessingTime,
      parsingTime,
      qualityAnalysisTime,
      indexingTime,
      enhancementSummary.totalCellsAnalyzed
    );

    return {
      intelligentData,
      qualityProfile,
      enhancementSummary,
      recommendations,
      performance
    };
  }

  /**
   * Perform intelligent search across enhanced data
   */
  public static async intelligentSearch(
    data: IntelligentSpreadsheetData,
    query: SearchQuery
  ): Promise<SearchResult> {
    return IntelligentSearchService.search(data, query);
  }

  /**
   * Find company information with synonym matching
   */
  public static recognizeCompany(
    companyName: string,
    options?: SynonymLearningOptions
  ): CompanyRecognitionResult | null {
    return SynonymRecognitionService.recognizeCompany(companyName, options);
  }

  /**
   * Find financial term information with synonyms
   */
  public static recognizeFinancialTerm(
    term: string,
    context?: string[],
    options?: SynonymLearningOptions
  ): FinancialTermResult | null {
    return SynonymRecognitionService.recognizeFinancialTerm(term, context, options);
  }

  /**
   * Find synonyms for any term
   */
  public static findSynonyms(
    term: string,
    dataType: EnhancedDataType,
    options?: SynonymLearningOptions
  ): SynonymMatchResult | null {
    return SynonymRecognitionService.findSynonyms(term, dataType, options);
  }

  /**
   * Get auto-complete suggestions for search
   */
  public static getSearchSuggestions(
    data: IntelligentSpreadsheetData,
    partialQuery: string,
    maxSuggestions: number = 10
  ): string[] {
    return IntelligentSearchService.getAutoCompleteSuggestions(
      data,
      partialQuery,
      maxSuggestions
    );
  }

  /**
   * Validate and optimize enhanced data for performance
   */
  public static async optimizeIntelligentData(
    data: IntelligentSpreadsheetData
  ): Promise<IntelligentSpreadsheetData> {
    console.log('Optimizing intelligent data for performance');

    // Optimize search indices
    const optimizedSearchIndex = this.optimizeSearchIndex(data.searchIndex);

    // Compress synonym index
    const optimizedSynonymIndex = this.optimizeSynonymIndex(data.synonymIndex);

    // Clean up entity index
    const optimizedEntityIndex = this.optimizeEntityIndex(data.entityIndex);

    return {
      ...data,
      searchIndex: optimizedSearchIndex,
      synonymIndex: optimizedSynonymIndex,
      entityIndex: optimizedEntityIndex
    };
  }

  // Private helper methods

  private static async performEnhancedParsing(
    file: Buffer | string,
    filename: string,
    mimeType: string,
    options: EnhancedAnalysisOptions
  ): Promise<IntelligentSpreadsheetData> {
    if (options.enableIntelligentParsing) {
      return EnhancedDataParser.parseEnhanced(
        file,
        filename,
        mimeType,
        options.parseConfig
      );
    } else {
      // Fallback to basic parsing and then enhance
      const { SpreadsheetParser } = await import('./SpreadsheetParser');
      const basicData = await SpreadsheetParser.parseFile(file, filename, mimeType);
      return EnhancedDataParser.enhanceSpreadsheetData(basicData, options.parseConfig);
    }
  }

  private static generateEnhancementSummary(
    data: IntelligentSpreadsheetData,
    qualityProfile?: QualityProfile
  ): EnhancementSummary {
    let totalCells = 0;
    const enhancedDataTypes: Record<EnhancedDataType, number> = {} as any;
    let companiesRecognized = 0;
    let financialTermsFound = 0;
    let synonymsIdentified = 0;

    // Count enhanced data types
    data.sheets.forEach(sheet => {
      sheet.data.forEach(row => {
        if (row) {
          row.forEach(cell => {
            if (cell) {
              totalCells++;
              const enhancedCell = cell as any;
              if (enhancedCell.enhancedDataType) {
                const type = enhancedCell.enhancedDataType;
                enhancedDataTypes[type] = (enhancedDataTypes[type] || 0) + 1;

                // Count specific types
                if (type === EnhancedDataType.COMPANY_NAME) {
                  companiesRecognized++;
                }
                if (this.isFinancialType(type)) {
                  financialTermsFound++;
                }
                if (enhancedCell.synonyms && enhancedCell.synonyms.length > 0) {
                  synonymsIdentified++;
                }
              }
            }
          });
        }
      });
    });

    // Count search index size
    const searchIndexSize = Array.from(data.searchIndex.byContent.values())
      .reduce((sum, refs) => sum + refs.length, 0);

    const qualityScore = qualityProfile?.overallMetrics 
      ? this.calculateOverallQualityScore(qualityProfile.overallMetrics)
      : 0.5;

    const anomaliesDetected = qualityProfile?.anomalies.length || 0;

    return {
      totalCellsAnalyzed: totalCells,
      enhancedDataTypes,
      companiesRecognized,
      financialTermsFound,
      qualityScore,
      anomaliesDetected,
      synonymsIdentified,
      searchIndexSize
    };
  }

  private static generateIntelligenceRecommendations(
    data: IntelligentSpreadsheetData,
    qualityProfile?: QualityProfile,
    summary?: EnhancementSummary
  ): IntelligenceRecommendation[] {
    const recommendations: IntelligenceRecommendation[] = [];

    // Data quality recommendations
    if (qualityProfile && summary) {
      if (summary.qualityScore < 0.7) {
        recommendations.push({
          type: 'data_quality',
          priority: summary.qualityScore < 0.5 ? 'critical' : 'high',
          title: 'Improve Data Quality',
          description: `Overall data quality score is ${(summary.qualityScore * 100).toFixed(1)}%`,
          impact: 'Better data quality will improve analysis accuracy and reliability',
          actionItems: [
            'Address missing data issues',
            'Standardize data formats',
            'Implement data validation rules',
            'Review and correct anomalies'
          ],
          estimatedEffort: 'medium'
        });
      }

      if (summary.anomaliesDetected > 10) {
        recommendations.push({
          type: 'data_quality',
          priority: 'medium',
          title: 'Address Data Anomalies',
          description: `${summary.anomaliesDetected} data anomalies detected`,
          impact: 'Resolving anomalies will improve data consistency and analysis results',
          actionItems: [
            'Review flagged anomalies',
            'Investigate root causes',
            'Implement preventive measures',
            'Set up monitoring for future anomalies'
          ],
          estimatedEffort: 'medium'
        });
      }
    }

    // Entity recognition recommendations
    if (summary) {
      const totalTextCells = summary.enhancedDataTypes[EnhancedDataType.TEXT] || 0;
      const recognitionRate = totalTextCells > 0 
        ? (summary.companiesRecognized + summary.financialTermsFound) / totalTextCells
        : 0;

      if (recognitionRate < 0.3 && totalTextCells > 50) {
        recommendations.push({
          type: 'entity_recognition',
          priority: 'medium',
          title: 'Enhance Entity Recognition',
          description: `Only ${(recognitionRate * 100).toFixed(1)}% of text cells were recognized as entities`,
          impact: 'Better entity recognition will improve search and analysis capabilities',
          actionItems: [
            'Review unrecognized text for potential entities',
            'Add custom entity definitions',
            'Improve domain-specific recognition rules',
            'Consider manual entity tagging for important terms'
          ],
          estimatedEffort: 'low'
        });
      }
    }

    // Search optimization recommendations
    if (summary && summary.searchIndexSize > 10000) {
      recommendations.push({
        type: 'search_optimization',
        priority: 'low',
        title: 'Optimize Search Performance',
        description: `Large search index (${summary.searchIndexSize} entries) may impact performance`,
        impact: 'Search optimization will improve query response times',
        actionItems: [
          'Implement search index compression',
          'Add search result caching',
          'Consider distributed search architecture',
          'Optimize frequently used queries'
        ],
        estimatedEffort: 'high'
      });
    }

    // Synonym learning recommendations
    if (summary && summary.synonymsIdentified < summary.totalCellsAnalyzed * 0.1) {
      recommendations.push({
        type: 'synonym_learning',
        priority: 'low',
        title: 'Expand Synonym Recognition',
        description: 'Low synonym identification rate suggests opportunities for improvement',
        impact: 'Better synonym recognition will improve search flexibility and user experience',
        actionItems: [
          'Enable automatic synonym learning',
          'Review and validate learned synonyms',
          'Add domain-specific synonym dictionaries',
          'Implement user feedback for synonym suggestions'
        ],
        estimatedEffort: 'medium'
      });
    }

    return recommendations;
  }

  private static calculatePerformanceMetrics(
    totalTime: number,
    parsingTime: number,
    qualityTime: number,
    indexingTime: number,
    totalCells: number
  ): PerformanceMetrics {
    const cellsPerSecond = totalCells > 0 && totalTime > 0 
      ? (totalCells / totalTime) * 1000 
      : 0;

    // Estimate memory usage (rough approximation)
    const estimatedMemoryUsage = totalCells * 0.5; // KB per cell (rough estimate)

    return {
      totalProcessingTime: totalTime,
      parsingTime,
      qualityAnalysisTime: qualityTime,
      indexingTime,
      memoryUsage: estimatedMemoryUsage,
      cellsPerSecond
    };
  }

  private static calculateOverallQualityScore(metrics: any): number {
    // Simple weighted average of quality metrics
    const weights = {
      completeness: 0.3,
      consistency: 0.25,
      accuracy: 0.25,
      validity: 0.2
    };

    return (
      (metrics.validCells / Math.max(metrics.totalCells, 1)) * weights.completeness +
      ((metrics.totalCells - metrics.inconsistentCells) / Math.max(metrics.totalCells, 1)) * weights.consistency +
      ((metrics.totalCells - metrics.errorCells) / Math.max(metrics.totalCells, 1)) * weights.accuracy +
      ((metrics.totalCells - metrics.outlierCells) / Math.max(metrics.totalCells, 1)) * weights.validity
    );
  }

  private static isFinancialType(type: EnhancedDataType): boolean {
    return [
      EnhancedDataType.CURRENCY,
      EnhancedDataType.PERCENTAGE,
      EnhancedDataType.STOCK_SYMBOL
    ].includes(type);
  }

  private static optimizeSearchIndex(searchIndex: any): any {
    // Implement search index optimization
    // For now, return as-is
    return searchIndex;
  }

  private static optimizeSynonymIndex(synonymIndex: any): any {
    // Implement synonym index optimization
    // For now, return as-is
    return synonymIndex;
  }

  private static optimizeEntityIndex(entityIndex: any): any {
    // Implement entity index optimization
    // For now, return as-is
    return entityIndex;
  }
}