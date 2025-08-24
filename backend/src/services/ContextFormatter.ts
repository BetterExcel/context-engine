/**
 * ContextFormatter - Formats extracted context for optimal LLM consumption
 * 
 * This service takes structured context data and formats it into both
 * structured JSON and natural language descriptions that are optimized
 * for LLM processing. It includes relevance scoring, filtering, and
 * intelligent narrative generation.
 */

import { OpenAIService } from './OpenAIService';
import {
  ContextData,
  IntentType,
  RequestAnalysis
} from '../types/context';
import {
  SelectionInfo,
  DataType
} from '../types/spreadsheet';

export interface FormattingOptions {
  includeStructuredData?: boolean;
  includeNaturalLanguage?: boolean;
  maxContextLength?: number;
  relevanceThreshold?: number;
  enableAIGeneration?: boolean;
  optimizeForLLM?: boolean;
}

export interface ContextRelevanceScore {
  immediate: number;
  related: number;
  structural: number;
  historical: number;
  patterns: number;
  overall: number;
}

export interface FormattedContext {
  structured: StructuredContextFormat;
  naturalLanguage: string;
  relevanceScore: ContextRelevanceScore;
  filteredData: ContextData;
  llmOptimized: LLMOptimizedFormat;
  confidence: number;
  generatedAt: Date;
}

export interface StructuredContextFormat {
  requestAnalysis: {
    intent: IntentType;
    scope: string;
    confidence: number;
    keywords: string[];
  };
  spreadsheetContext: {
    currentSelection: {
      range: string;
      data: any[][];
      dataTypes: string[];
      cellCount: number;
    };
    relatedFormulas: Array<{
      cell: string;
      formula: string;
      dependencies: string[];
    }>;
    dependencies: {
      precedents: string[];
      dependents: string[];
    };
    dataSummary: {
      rowCount: number;
      columnCount: number;
      patterns: string[];
      statistics: Record<string, any>;
    };
  };
  actionableInfo: {
    targetCells: string[];
    suggestedOperations: string[];
    constraints: string[];
    expectedOutcome?: string;
  };
}

export interface LLMOptimizedFormat {
  context: string;
  instructions: string;
  constraints: string[];
  examples?: string[];
  expectedFormat?: string;
}

export class ContextFormatter {
  private openAIService: OpenAIService | undefined;
  private static readonly DEFAULT_MAX_LENGTH = 4000;
  private static readonly DEFAULT_RELEVANCE_THRESHOLD = 0.3;

  constructor(openAIService?: OpenAIService) {
    this.openAIService = openAIService;
  }

  /**
   * Formats context data for optimal LLM consumption
   */
  async formatContext(
    contextData: ContextData,
    requestAnalysis: RequestAnalysis,
    selectionInfo: SelectionInfo,
    options: FormattingOptions = {}
  ): Promise<FormattedContext> {
    // Set default options
    const opts = {
      includeStructuredData: true,
      includeNaturalLanguage: true,
      maxContextLength: ContextFormatter.DEFAULT_MAX_LENGTH,
      relevanceThreshold: ContextFormatter.DEFAULT_RELEVANCE_THRESHOLD,
      enableAIGeneration: true,
      optimizeForLLM: true,
      ...options
    };

    // Step 1: Calculate relevance scores
    const relevanceScore = this.calculateRelevanceScores(
      contextData,
      requestAnalysis,
      selectionInfo
    );

    // Step 2: Filter context based on relevance
    const filteredData = this.filterContextByRelevance(
      contextData,
      relevanceScore,
      opts.relevanceThreshold
    );

    // Step 3: Generate structured format
    const structured = opts.includeStructuredData
      ? this.generateStructuredFormat(filteredData, requestAnalysis, selectionInfo)
      : {} as StructuredContextFormat;

    // Step 4: Generate natural language description
    let naturalLanguage = '';
    if (opts.includeNaturalLanguage) {
      if (opts.enableAIGeneration && this.openAIService) {
        try {
          naturalLanguage = await this.generateAINaturalLanguage(
            filteredData,
            requestAnalysis,
            selectionInfo,
            opts.maxContextLength
          );
        } catch (error) {
          console.warn('AI natural language generation failed, falling back to rule-based:', error);
          naturalLanguage = this.generateRuleBasedNaturalLanguage(
            filteredData,
            requestAnalysis,
            selectionInfo
          );
        }
      } else {
        naturalLanguage = this.generateRuleBasedNaturalLanguage(
          filteredData,
          requestAnalysis,
          selectionInfo
        );
      }
    }

    // Step 5: Generate LLM-optimized format
    const llmOptimized = opts.optimizeForLLM
      ? this.generateLLMOptimizedFormat(
          filteredData,
          requestAnalysis,
          naturalLanguage,
          opts.maxContextLength
        )
      : {} as LLMOptimizedFormat;

    // Step 6: Calculate overall confidence
    const confidence = this.calculateFormattingConfidence(
      relevanceScore,
      contextData.confidence,
      naturalLanguage.length > 0
    );

    return {
      structured,
      naturalLanguage,
      relevanceScore,
      filteredData,
      llmOptimized,
      confidence,
      generatedAt: new Date()
    };
  }

  /**
   * Calculates relevance scores for different context components
   */
  private calculateRelevanceScores(
    contextData: ContextData,
    requestAnalysis: RequestAnalysis,
    _selectionInfo: SelectionInfo
  ): ContextRelevanceScore {
    // Base scores
    let immediateScore = 0.9; // Always highly relevant
    let relatedScore = 0.5;
    let structuralScore = 0.6;
    let historicalScore = 0.3;
    let patternsScore = 0.4;

    // Adjust based on intent
    switch (requestAnalysis.intent) {
      case IntentType.FORMULA_ASSISTANCE:
        relatedScore += 0.3; // Dependencies are crucial
        structuralScore += 0.2; // Data types matter
        patternsScore += 0.1;
        break;

      case IntentType.DATA_ANALYSIS:
        patternsScore += 0.4; // Patterns are key
        structuralScore += 0.3; // Structure is important
        historicalScore += 0.2; // History can provide context
        break;

      case IntentType.FORMATTING:
        structuralScore += 0.2; // Current structure matters
        relatedScore += 0.1;
        break;

      case IntentType.DATA_MANIPULATION:
        relatedScore += 0.2; // Dependencies matter for safety
        structuralScore += 0.3; // Need to understand structure
        break;

      case IntentType.TROUBLESHOOTING:
        relatedScore += 0.4; // Dependencies crucial for debugging
        historicalScore += 0.3; // Recent actions matter
        patternsScore += 0.2; // Anomalies are relevant
        break;
    }

    // Adjust based on data characteristics
    if (contextData.summary.formulaCount > 0) {
      relatedScore += 0.1;
    }

    if (contextData.patterns.anomalies.length > 0) {
      patternsScore += 0.2;
    }

    if (contextData.historical.recentActions.length > 0) {
      historicalScore += 0.2;
    }

    // Normalize scores to [0, 1]
    immediateScore = Math.min(immediateScore, 1.0);
    relatedScore = Math.min(relatedScore, 1.0);
    structuralScore = Math.min(structuralScore, 1.0);
    historicalScore = Math.min(historicalScore, 1.0);
    patternsScore = Math.min(patternsScore, 1.0);

    // Calculate overall score
    const overall = (
      immediateScore * 0.4 +
      relatedScore * 0.2 +
      structuralScore * 0.2 +
      historicalScore * 0.1 +
      patternsScore * 0.1
    );

    return {
      immediate: immediateScore,
      related: relatedScore,
      structural: structuralScore,
      historical: historicalScore,
      patterns: patternsScore,
      overall
    };
  }

  /**
   * Filters context data based on relevance scores
   */
  private filterContextByRelevance(
    contextData: ContextData,
    relevanceScore: ContextRelevanceScore,
    threshold: number
  ): ContextData {
    const filtered = { ...contextData };

    // Filter related context if relevance is low
    if (relevanceScore.related < threshold) {
      filtered.related = {
        dependentCells: [],
        precedentCells: [],
        relatedFormulas: [],
        namedRanges: contextData.related.namedRanges, // Keep named ranges
        crossSheetReferences: []
      };
    } else {
      // Limit the number of related items to keep context manageable
      filtered.related = {
        ...contextData.related,
        dependentCells: contextData.related.dependentCells.slice(0, 10),
        precedentCells: contextData.related.precedentCells.slice(0, 10),
        relatedFormulas: contextData.related.relatedFormulas.slice(0, 5)
      };
    }

    // Filter historical context if relevance is low
    if (relevanceScore.historical < threshold) {
      filtered.historical = {
        recentActions: [],
        previousRequests: [],
        sessionDuration: contextData.historical.sessionDuration,
        interactionCount: contextData.historical.interactionCount
      };
    } else {
      // Limit historical data
      filtered.historical = {
        ...contextData.historical,
        recentActions: contextData.historical.recentActions.slice(0, 5),
        previousRequests: contextData.historical.previousRequests.slice(0, 3)
      };
    }

    // Filter patterns based on confidence and relevance
    if (relevanceScore.patterns < threshold) {
      filtered.patterns = {
        dataPatterns: [],
        relationships: [],
        anomalies: contextData.patterns.anomalies.filter(a => a.severity === 'high'),
        insights: [],
        confidence: contextData.patterns.confidence
      };
    } else {
      // Keep high-confidence patterns
      filtered.patterns = {
        ...contextData.patterns,
        dataPatterns: contextData.patterns.dataPatterns.filter(p => p.confidence > 0.6),
        relationships: contextData.patterns.relationships.filter(r => r.strength > 0.6),
        anomalies: contextData.patterns.anomalies.filter(a => a.severity !== 'low'),
        insights: contextData.patterns.insights.filter(i => i.priority !== 'low')
      };
    }

    return filtered;
  }

  /**
   * Generates structured JSON format for API consumption
   */
  private generateStructuredFormat(
    contextData: ContextData,
    requestAnalysis: RequestAnalysis,
    selectionInfo: SelectionInfo
  ): StructuredContextFormat {
    // Extract data from selection
    const selectedData = contextData.immediate.selectedData.map(row =>
      row.map(cell => cell.value)
    );

    const dataTypes = [...new Set(
      contextData.immediate.selectedData.flat().map(cell => cell.dataType)
    )];

    // Format formulas
    const relatedFormulas = contextData.related.relatedFormulas.map(formula => ({
      cell: formula.cell,
      formula: formula.formula,
      dependencies: formula.dependencies || []
    }));

    // Extract dependencies
    const precedents = contextData.related.precedentCells.map(cell => cell.address || '');
    const dependents = contextData.related.dependentCells.map(cell => cell.address || '');

    return {
      requestAnalysis: {
        intent: requestAnalysis.intent,
        scope: requestAnalysis.scope,
        confidence: requestAnalysis.confidence,
        keywords: requestAnalysis.keywords
      },
      spreadsheetContext: {
        currentSelection: {
          range: selectionInfo.range,
          data: selectedData,
          dataTypes,
          cellCount: contextData.summary.cellCount
        },
        relatedFormulas,
        dependencies: {
          precedents,
          dependents
        },
        dataSummary: {
          rowCount: contextData.structural.rowCount,
          columnCount: contextData.structural.columnCount,
          patterns: contextData.summary.patterns,
          statistics: contextData.summary.statistics || {}
        }
      },
      actionableInfo: {
        targetCells: [selectionInfo.activeCell],
        suggestedOperations: this.getSuggestedOperations(requestAnalysis.intent, contextData),
        constraints: this.getConstraints(contextData),
        expectedOutcome: this.getExpectedOutcome(requestAnalysis.intent)
      }
    };
  }

  /**
   * Generates AI-powered natural language description
   */
  private async generateAINaturalLanguage(
    contextData: ContextData,
    requestAnalysis: RequestAnalysis,
    selectionInfo: SelectionInfo,
    maxLength: number
  ): Promise<string> {
    if (!this.openAIService) {
      throw new Error('OpenAI service not available');
    }

    const prompt = this.buildNaturalLanguagePrompt(
      contextData,
      requestAnalysis,
      selectionInfo,
      maxLength
    );

    try {
      const response = await this.openAIService.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating clear, concise context descriptions for spreadsheet analysis. 
            
Your task is to generate a natural language description that:
1. Explains what the user is trying to accomplish
2. Describes the current spreadsheet context
3. Highlights relevant data patterns and relationships
4. Provides actionable insights for an LLM to help the user

Keep the description under ${maxLength} characters and focus on the most relevant information.
Write in a clear, professional tone that would help another AI understand the context.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: Math.floor(maxLength / 3) // Rough estimate for token limit
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return content.trim();
    } catch (error) {
      console.error('AI natural language generation error:', error);
      throw error;
    }
  }

  /**
   * Generates rule-based natural language description (fallback)
   */
  private generateRuleBasedNaturalLanguage(
    contextData: ContextData,
    requestAnalysis: RequestAnalysis,
    selectionInfo: SelectionInfo
  ): string {
    const parts: string[] = [];

    // Describe the user's intent
    const intentDescriptions = {
      [IntentType.FORMULA_ASSISTANCE]: 'create or modify formulas',
      [IntentType.DATA_ANALYSIS]: 'analyze data patterns and insights',
      [IntentType.FORMATTING]: 'format cells and improve appearance',
      [IntentType.DATA_MANIPULATION]: 'manipulate and organize data',
      [IntentType.TROUBLESHOOTING]: 'troubleshoot issues or errors',
      [IntentType.GENERAL_ASSISTANCE]: 'get general help and guidance'
    };

    parts.push(`The user wants to ${intentDescriptions[requestAnalysis.intent] || 'get assistance'}.`);

    // Describe the current selection
    const cellCount = contextData.immediate.selectedData.flat().length;
    
    if (cellCount === 1) {
      parts.push(`They have selected cell ${selectionInfo.activeCell} on sheet "${selectionInfo.sheet}".`);
    } else {
      parts.push(`They have selected range ${selectionInfo.range} (${cellCount} cells) on sheet "${selectionInfo.sheet}".`);
    }

    // Describe the data structure
    if (contextData.structural.rowCount > 0 && contextData.structural.columnCount > 0) {
      const dataDescription = [];
      
      if (contextData.structural.headers.length > 0) {
        dataDescription.push(`with headers: ${contextData.structural.headers.slice(0, 3).join(', ')}${contextData.structural.headers.length > 3 ? '...' : ''}`);
      }
      
      if (contextData.summary.formulaCount > 0) {
        dataDescription.push(`containing ${contextData.summary.formulaCount} formula${contextData.summary.formulaCount > 1 ? 's' : ''}`);
      }

      const nonEmptyCount = contextData.summary.cellCount - contextData.summary.emptyCount;
      if (nonEmptyCount > 0) {
        dataDescription.push(`with ${nonEmptyCount} cells containing data`);
      }

      if (dataDescription.length > 0) {
        parts.push(`The selection contains ${contextData.structural.rowCount} row${contextData.structural.rowCount > 1 ? 's' : ''} and ${contextData.structural.columnCount} column${contextData.structural.columnCount > 1 ? 's' : ''} ${dataDescription.join(', ')}.`);
      }
    }

    // Describe data types
    const dataTypes = Object.keys(contextData.summary.dataTypes).filter(type => type !== DataType.EMPTY);
    if (dataTypes.length > 0) {
      parts.push(`The data includes: ${dataTypes.join(', ')}.`);
    }

    // Describe relationships and dependencies
    if (contextData.related.dependentCells.length > 0 || contextData.related.precedentCells.length > 0) {
      const relationshipParts = [];
      if (contextData.related.precedentCells.length > 0) {
        relationshipParts.push(`${contextData.related.precedentCells.length} precedent cell${contextData.related.precedentCells.length > 1 ? 's' : ''}`);
      }
      if (contextData.related.dependentCells.length > 0) {
        relationshipParts.push(`${contextData.related.dependentCells.length} dependent cell${contextData.related.dependentCells.length > 1 ? 's' : ''}`);
      }
      parts.push(`The selection has ${relationshipParts.join(' and ')}.`);
    }

    // Describe patterns and anomalies
    if (contextData.patterns.anomalies.length > 0) {
      const highSeverityAnomalies = contextData.patterns.anomalies.filter(a => a.severity === 'high');
      if (highSeverityAnomalies.length > 0) {
        parts.push(`Important: ${highSeverityAnomalies.length} high-priority issue${highSeverityAnomalies.length > 1 ? 's' : ''} detected.`);
      }
    }

    // Add insights
    if (contextData.patterns.insights.length > 0) {
      const highPriorityInsights = contextData.patterns.insights.filter(i => i.priority === 'high');
      if (highPriorityInsights.length > 0 && highPriorityInsights[0]) {
        parts.push(`Key insight: ${highPriorityInsights[0].description}`);
      }
    }

    // Add confidence note if low
    if (requestAnalysis.confidence < 0.6) {
      parts.push(`Note: The intent analysis has moderate confidence (${Math.round(requestAnalysis.confidence * 100)}%), so clarification may be helpful.`);
    }

    return parts.join(' ');
  }

  /**
   * Generates LLM-optimized format with instructions and constraints
   */
  private generateLLMOptimizedFormat(
    contextData: ContextData,
    requestAnalysis: RequestAnalysis,
    _naturalLanguage: string,
    maxLength: number
  ): LLMOptimizedFormat {
    // Create concise context summary
    const contextSummary = this.createContextSummary(contextData, maxLength * 0.6);

    // Generate specific instructions based on intent
    const instructions = this.generateInstructions(requestAnalysis.intent, contextData);

    // Compile constraints
    const constraints = this.getConstraints(contextData);

    // Add examples if relevant
    const examples = this.getExamples(requestAnalysis.intent, contextData);

    // Define expected format
    const expectedFormat = this.getExpectedFormat(requestAnalysis.intent);

    const result: LLMOptimizedFormat = {
      context: contextSummary,
      instructions,
      constraints,
      expectedFormat
    };

    if (examples.length > 0) {
      result.examples = examples;
    }

    return result;
  }

  /**
   * Creates a concise context summary for LLM consumption
   */
  private createContextSummary(contextData: ContextData, maxLength: number): string {
    const parts: string[] = [];
    let currentLength = 0;

    // Add immediate context (highest priority)
    const immediateInfo = `Selection: ${contextData.immediate.selectionInfo.range} (${contextData.summary.cellCount} cells)`;
    parts.push(immediateInfo);
    currentLength += immediateInfo.length;

    // Add data types
    const dataTypes = Object.keys(contextData.summary.dataTypes).filter(type => type !== DataType.EMPTY);
    if (dataTypes.length > 0 && currentLength < maxLength * 0.5) {
      const dataTypeInfo = `Data types: ${dataTypes.join(', ')}`;
      parts.push(dataTypeInfo);
      currentLength += dataTypeInfo.length;
    }

    // Add formulas if present
    if (contextData.summary.formulaCount > 0 && currentLength < maxLength * 0.7) {
      const formulaInfo = `Contains ${contextData.summary.formulaCount} formula${contextData.summary.formulaCount > 1 ? 's' : ''}`;
      parts.push(formulaInfo);
      currentLength += formulaInfo.length;
    }

    // Add key patterns
    if (contextData.summary.patterns.length > 0 && currentLength < maxLength * 0.8) {
      const patternInfo = `Patterns: ${contextData.summary.patterns.slice(0, 3).join(', ')}`;
      parts.push(patternInfo);
      currentLength += patternInfo.length;
    }

    // Add critical anomalies
    const criticalAnomalies = contextData.patterns.anomalies.filter(a => a.severity === 'high');
    if (criticalAnomalies.length > 0 && currentLength < maxLength * 0.9) {
      const anomalyInfo = `Issues: ${criticalAnomalies.length} high-priority`;
      parts.push(anomalyInfo);
      currentLength += anomalyInfo.length;
    }

    return parts.join('. ') + '.';
  }

  /**
   * Generates specific instructions based on intent
   */
  private generateInstructions(intent: IntentType, contextData: ContextData): string {
    const baseInstructions = {
      [IntentType.FORMULA_ASSISTANCE]: 'Create or modify formulas based on the user\'s request. Ensure formulas are syntactically correct and reference the appropriate cells.',
      [IntentType.DATA_ANALYSIS]: 'Analyze the data to identify patterns, trends, and insights. Provide statistical summaries and actionable recommendations.',
      [IntentType.FORMATTING]: 'Apply appropriate formatting to improve data presentation and readability. Consider conditional formatting for dynamic styling.',
      [IntentType.DATA_MANIPULATION]: 'Organize, sort, filter, or transform the data as requested. Preserve data integrity and existing relationships.',
      [IntentType.TROUBLESHOOTING]: 'Identify and resolve issues in the spreadsheet. Check for formula errors, circular references, and data inconsistencies.',
      [IntentType.GENERAL_ASSISTANCE]: 'Provide helpful guidance and explanations based on the user\'s request and current context.'
    };

    let instructions = baseInstructions[intent] || baseInstructions[IntentType.GENERAL_ASSISTANCE];

    // Add context-specific instructions
    if (contextData.summary.formulaCount > 0) {
      instructions += ' Be careful to preserve existing formula relationships.';
    }

    if (contextData.patterns.anomalies.length > 0) {
      instructions += ' Address any data quality issues identified.';
    }

    return instructions;
  }

  /**
   * Gets suggested operations based on intent and context
   */
  private getSuggestedOperations(intent: IntentType, contextData: ContextData): string[] {
    const operations: string[] = [];

    switch (intent) {
      case IntentType.FORMULA_ASSISTANCE:
        if ((contextData.summary.dataTypes[DataType.NUMBER] || 0) > 0) {
          operations.push('SUM', 'AVERAGE', 'COUNT');
        }
        if (contextData.structural.headers.length > 0) {
          operations.push('VLOOKUP', 'INDEX', 'MATCH');
        }
        operations.push('IF', 'CONCATENATE');
        break;

      case IntentType.DATA_ANALYSIS:
        operations.push('ANALYZE', 'SUMMARIZE', 'PIVOT_TABLE', 'CHART');
        break;

      case IntentType.FORMATTING:
        operations.push('FORMAT_CELLS', 'CONDITIONAL_FORMAT', 'STYLE');
        break;

      case IntentType.DATA_MANIPULATION:
        operations.push('SORT', 'FILTER', 'REMOVE_DUPLICATES', 'TRANSPOSE');
        break;

      case IntentType.TROUBLESHOOTING:
        operations.push('VALIDATE', 'DEBUG', 'FIX_ERRORS', 'CHECK_REFERENCES');
        break;

      default:
        operations.push('ASSIST', 'EXPLAIN', 'GUIDE');
    }

    return operations;
  }

  /**
   * Gets constraints based on context data
   */
  private getConstraints(contextData: ContextData): string[] {
    const constraints: string[] = [];

    if (contextData.summary.emptyCount > 0) {
      constraints.push('Handle empty cells appropriately');
    }

    if (contextData.summary.formulaCount > 0) {
      constraints.push('Preserve existing formulas unless modification is requested');
    }

    if (contextData.structural.hasNamedRanges) {
      constraints.push('Consider using named ranges where appropriate');
    }

    if (contextData.related.dependentCells.length > 0) {
      constraints.push('Be aware of dependent cells that may be affected');
    }

    if (contextData.patterns.anomalies.some(a => a.severity === 'high')) {
      constraints.push('Address high-priority data quality issues');
    }

    constraints.push('Maintain data integrity and consistency');

    return constraints;
  }

  /**
   * Gets expected outcome based on intent
   */
  private getExpectedOutcome(intent: IntentType): string {
    const outcomes = {
      [IntentType.FORMULA_ASSISTANCE]: 'A working formula that performs the requested calculation',
      [IntentType.DATA_ANALYSIS]: 'Insights and analysis of the selected data with actionable recommendations',
      [IntentType.FORMATTING]: 'Improved visual presentation of the data',
      [IntentType.DATA_MANIPULATION]: 'Properly organized or transformed data',
      [IntentType.TROUBLESHOOTING]: 'Resolution of identified issues and errors',
      [IntentType.GENERAL_ASSISTANCE]: 'Clear guidance and helpful information'
    };

    return outcomes[intent] || outcomes[IntentType.GENERAL_ASSISTANCE];
  }

  /**
   * Gets relevant examples based on intent and context
   */
  private getExamples(intent: IntentType, contextData: ContextData): string[] {
    const examples: string[] = [];

    if (intent === IntentType.FORMULA_ASSISTANCE) {
      if ((contextData.summary.dataTypes[DataType.NUMBER] || 0) > 0) {
        examples.push('=SUM(A1:A10) - Sum values in range A1 to A10');
        examples.push('=AVERAGE(B:B) - Calculate average of column B');
      }
      if (contextData.structural.headers.length > 0) {
        examples.push('=VLOOKUP(D2,A:B,2,FALSE) - Look up value in table');
      }
    }

    return examples;
  }

  /**
   * Gets expected response format based on intent
   */
  private getExpectedFormat(intent: IntentType): string {
    const formats = {
      [IntentType.FORMULA_ASSISTANCE]: 'Provide the formula with explanation of its components and usage',
      [IntentType.DATA_ANALYSIS]: 'Provide analysis results with key findings, statistics, and recommendations',
      [IntentType.FORMATTING]: 'Provide step-by-step formatting instructions or conditional formatting rules',
      [IntentType.DATA_MANIPULATION]: 'Provide clear steps to achieve the desired data organization',
      [IntentType.TROUBLESHOOTING]: 'Identify the issue and provide specific steps to resolve it',
      [IntentType.GENERAL_ASSISTANCE]: 'Provide clear, helpful guidance relevant to the user\'s question'
    };

    return formats[intent] || formats[IntentType.GENERAL_ASSISTANCE];
  }

  /**
   * Builds the prompt for AI natural language generation
   */
  private buildNaturalLanguagePrompt(
    contextData: ContextData,
    requestAnalysis: RequestAnalysis,
    selectionInfo: SelectionInfo,
    maxLength: number
  ): string {
    let prompt = `Generate a natural language description for this spreadsheet context:\n\n`;

    // Add intent information
    prompt += `User Intent: ${requestAnalysis.intent} (confidence: ${Math.round(requestAnalysis.confidence * 100)}%)\n`;
    prompt += `Scope: ${requestAnalysis.scope}\n\n`;

    // Add selection information
    prompt += `Current Selection: ${selectionInfo.range} on sheet "${selectionInfo.sheet}"\n`;
    prompt += `Active Cell: ${selectionInfo.activeCell}\n\n`;

    // Add data summary
    prompt += `Data Summary:\n`;
    prompt += `- ${contextData.summary.cellCount} cells (${contextData.summary.emptyCount} empty)\n`;
    prompt += `- ${contextData.summary.formulaCount} formulas\n`;
    prompt += `- Data types: ${Object.keys(contextData.summary.dataTypes).join(', ')}\n`;

    if (contextData.structural.headers.length > 0) {
      prompt += `- Headers: ${contextData.structural.headers.slice(0, 5).join(', ')}\n`;
    }

    // Add patterns and insights
    if (contextData.patterns.insights.length > 0) {
      prompt += `\nKey Insights:\n`;
      contextData.patterns.insights.slice(0, 3).forEach(insight => {
        prompt += `- ${insight.description}\n`;
      });
    }

    // Add anomalies if present
    if (contextData.patterns.anomalies.length > 0) {
      prompt += `\nIssues Detected:\n`;
      contextData.patterns.anomalies.slice(0, 3).forEach(anomaly => {
        prompt += `- ${anomaly.description} (${anomaly.severity})\n`;
      });
    }

    prompt += `\nGenerate a clear, concise description (max ${maxLength} characters) that explains the context and helps an LLM understand what the user is trying to accomplish.`;

    return prompt;
  }

  /**
   * Calculates overall formatting confidence
   */
  private calculateFormattingConfidence(
    relevanceScore: ContextRelevanceScore,
    contextConfidence: number,
    hasNaturalLanguage: boolean
  ): number {
    let confidence = relevanceScore.overall * 0.4 + contextConfidence * 0.4;

    if (hasNaturalLanguage) {
      confidence += 0.1;
    }

    if (relevanceScore.immediate > 0.8) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}

export class ContextFormattingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ContextFormattingError';
  }
}