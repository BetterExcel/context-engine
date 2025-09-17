/**
 * RequestAnalyzer - Analyzes user requests to determine intent and scope
 * 
 * This service implements rule-based intent classification using keyword matching
 * and provides confidence scoring for intent predictions. It can optionally use
 * OpenAI for enhanced analysis when available.
 */

import { IntentType, ScopeInfo } from '../types/context';
import { OpenAIService, IntentClassificationResult as OpenAIIntentResult } from './OpenAIService';

export interface IntentKeywords {
  [key: string]: {
    primary: string[];
    secondary: string[];
    weight: number;
  };
}

export interface IntentClassificationResult {
  intent: IntentType;
  confidence: number;
  alternativeIntents: Array<{ intent: IntentType; confidence: number }>;
  matchedKeywords: string[];
  clarificationNeeded: boolean;
  suggestedQuestions: string[] | undefined;
}

export class RequestAnalyzer {
  private readonly intentKeywords: IntentKeywords;
  private readonly confidenceThreshold = 0.4;
  private readonly ambiguityThreshold = 0.2;
  private openAIService: OpenAIService | undefined;

  constructor(openAIService?: OpenAIService) {
    this.openAIService = openAIService;
    this.intentKeywords = {
      [IntentType.FORMULA_ASSISTANCE]: {
        primary: [
          'formula', 'function', 'calculate', 'sum', 'average', 'count', 'vlookup', 
          'if', 'concatenate', 'index', 'match', 'pivot', 'subtotal', 'countif',
          'sumif', 'averageif', 'max', 'min', 'round', 'abs', 'sqrt', 'power'
        ],
        secondary: [
          'create', 'build', 'make', 'write', 'add', 'insert', 'compute',
          'total', 'percentage', 'ratio', 'lookup', 'search', 'find',
          'conditional', 'nested', 'complex', 'advanced'
        ],
        weight: 1.0
      },
      [IntentType.DATA_ANALYSIS]: {
        primary: [
          'analyze', 'analysis', 'trend', 'pattern', 'correlation', 'statistics',
          'insights', 'summary', 'report', 'dashboard', 'chart', 'graph',
          'visualization', 'compare', 'comparison', 'performance', 'metrics'
        ],
        secondary: [
          'data', 'numbers', 'values', 'results', 'findings', 'discover',
          'explore', 'investigate', 'examine', 'review', 'study', 'research',
          'understand', 'interpret', 'explain', 'meaning', 'significance'
        ],
        weight: 1.0
      },
      [IntentType.FORMATTING]: {
        primary: [
          'format', 'formatting', 'style', 'styling', 'color', 'font', 'bold',
          'italic', 'underline', 'border', 'alignment', 'merge', 'conditional formatting',
          'highlight', 'background', 'cell format', 'number format', 'date format'
        ],
        secondary: [
          'appearance', 'look', 'visual', 'design', 'layout', 'presentation',
          'pretty', 'beautiful', 'clean', 'organize', 'structure', 'arrange',
          'currency', 'percentage', 'decimal', 'thousands', 'separator'
        ],
        weight: 1.0
      },
      [IntentType.DATA_MANIPULATION]: {
        primary: [
          'sort', 'filter', 'group', 'pivot', 'transform', 'convert', 'split',
          'merge', 'combine', 'join', 'concatenate', 'separate', 'extract',
          'remove', 'delete', 'insert', 'add', 'move', 'copy', 'paste'
        ],
        secondary: [
          'data', 'rows', 'columns', 'cells', 'range', 'selection', 'organize',
          'arrange', 'restructure', 'modify', 'change', 'update', 'edit',
          'clean', 'prepare', 'process', 'manipulate', 'handle'
        ],
        weight: 1.0
      },
      [IntentType.TROUBLESHOOTING]: {
        primary: [
          'error', 'problem', 'issue', 'bug', 'fix', 'repair', 'solve', 'debug',
          'troubleshoot', 'broken', 'not working', 'wrong', 'incorrect', 'failed',
          'circular reference', '#ref!', '#value!', '#name?', '#div/0!', '#n/a'
        ],
        secondary: [
          'help', 'assistance', 'support', 'resolve', 'solution', 'answer',
          'why', 'how', 'what', 'when', 'where', 'explain', 'understand',
          'figure out', 'diagnose', 'identify', 'locate', 'find'
        ],
        weight: 1.2
      },
      [IntentType.GENERAL_ASSISTANCE]: {
        primary: [
          'help', 'how to', 'tutorial', 'guide', 'explain', 'show', 'teach',
          'learn', 'understand', 'what is', 'what does', 'how do', 'can you',
          'please', 'assistance', 'support', 'advice', 'recommendation'
        ],
        secondary: [
          'beginner', 'new', 'start', 'basic', 'simple', 'easy', 'quick',
          'step by step', 'walkthrough', 'example', 'sample', 'demo',
          'best practice', 'tip', 'trick', 'suggestion', 'idea'
        ],
        weight: 0.8
      }
    };
  }

  /**
   * Classifies the intent of a user request using AI enhancement when available
   */
  public async classifyIntent(request: string, context?: any): Promise<IntentClassificationResult> {
    // Try OpenAI first if available and service is working
    if (this.openAIService) {
      try {
        const isAvailable = await this.openAIService.isAvailable();
        if (isAvailable) {
          const aiResult = await this.openAIService.classifyIntent(request, context);
          return this.convertOpenAIResult(aiResult);
        }
      } catch (error) {
        console.warn('OpenAI classification failed, falling back to rule-based:', error);
      }
    }

    // Fallback to rule-based classification
    return await this.classifyIntentRuleBased(request);
  }

  /**
   * Rule-based intent classification (original implementation)
   */
  private async classifyIntentRuleBased(request: string): Promise<IntentClassificationResult> {
    const normalizedRequest = this.normalizeRequest(request);
    const intentScores = this.calculateIntentScores(normalizedRequest);
    
    // Sort intents by confidence score
    const sortedIntents = Object.entries(intentScores)
      .map(([intent, score]) => ({ intent: intent as IntentType, confidence: score }))
      .sort((a, b) => b.confidence - a.confidence);

    const primaryIntent = sortedIntents[0];
    if (!primaryIntent) {
      // Fallback for empty results
      return {
        intent: IntentType.GENERAL_ASSISTANCE,
        confidence: 0.1,
        alternativeIntents: [],
        matchedKeywords: [],
        clarificationNeeded: true,
        suggestedQuestions: ['Could you provide more details about what you\'re trying to accomplish?']
      };
    }

    const alternativeIntents = sortedIntents.slice(1, 3); // Top 2 alternatives

    // Determine if clarification is needed
    const clarificationNeeded = this.needsClarification(sortedIntents);
    
    // Get matched keywords for the primary intent
    const matchedKeywords = this.getMatchedKeywords(normalizedRequest, primaryIntent.intent);

    // Generate clarification questions if needed
    const suggestedQuestions = clarificationNeeded 
      ? await this.generateClarificationQuestions(request, sortedIntents.slice(0, 3))
      : undefined;

    return {
      intent: primaryIntent.intent,
      confidence: primaryIntent.confidence,
      alternativeIntents,
      matchedKeywords,
      clarificationNeeded,
      suggestedQuestions
    };
  }

  /**
   * Detects the scope of the request based on keywords and context
   */
  public detectScope(request: string, hasSelection: boolean = false): ScopeInfo {
    const normalizedRequest = this.normalizeRequest(request);
    
    // Keywords that indicate different scopes
    const scopeKeywords = {
      workbook: ['workbook', 'entire workbook', 'all sheets', 'all worksheets', 'entire file', 'everything', 'across all'],
      sheet: ['sheet', 'worksheet', 'tab', 'entire sheet', 'whole sheet', 'all data'],
      current_selection: ['selected', 'selection', 'highlighted', 'chosen', 'current', 'this', 'these'],
      custom_range: ['range', 'from', 'to', 'between', 'column', 'row', 'cells']
    };

    let detectedScope: ScopeInfo['type'] = 'current_selection';
    let includeRelated = false;
    let includeHistory = false;

    // Check for scope indicators
    for (const [scope, keywords] of Object.entries(scopeKeywords)) {
      if (keywords.some(keyword => normalizedRequest.includes(keyword))) {
        detectedScope = scope as ScopeInfo['type'];
        break;
      }
    }

    // If no selection exists, default to sheet scope
    if (!hasSelection && detectedScope === 'current_selection') {
      detectedScope = 'sheet';
    }

    // Check for related data indicators
    const relatedKeywords = ['related', 'connected', 'dependent', 'linked', 'associated', 'referenced'];
    includeRelated = relatedKeywords.some(keyword => normalizedRequest.includes(keyword));

    // Check for historical context indicators
    const historyKeywords = ['previous', 'before', 'earlier', 'last', 'recent', 'history', 'changed'];
    includeHistory = historyKeywords.some(keyword => normalizedRequest.includes(keyword));

    return {
      type: detectedScope,
      includeRelated,
      includeHistory,
      maxCells: this.getMaxCellsForScope(detectedScope)
    };
  }

  /**
   * Generates clarification questions for ambiguous requests
   */
  public async generateClarificationQuestions(
    request: string, 
    intents: Array<{ intent: IntentType; confidence: number }>,
    context?: any
  ): Promise<string[]> {
    // Try OpenAI first if available
    if (this.openAIService) {
      try {
        const isAvailable = await this.openAIService.isAvailable();
        if (isAvailable) {
          return await this.openAIService.generateClarificationQuestions(request, context);
        }
      } catch (error) {
        console.warn('OpenAI clarification failed, falling back to rule-based:', error);
      }
    }

    // Fallback to rule-based questions
    return this.generateClarificationQuestionsRuleBased(intents);
  }

  /**
   * Rule-based clarification questions (original implementation)
   */
  private generateClarificationQuestionsRuleBased(intents: Array<{ intent: IntentType; confidence: number }>): string[] {
    const questions: string[] = [];
    
    if (intents.length < 2) return questions;

    const topIntents = intents.slice(0, 2);
    
    // Generate questions based on the top competing intents
    if (topIntents.some(i => i.intent === IntentType.FORMULA_ASSISTANCE) && 
        topIntents.some(i => i.intent === IntentType.DATA_ANALYSIS)) {
      questions.push("Are you looking to create a formula or analyze existing data?");
    }
    
    if (topIntents.some(i => i.intent === IntentType.FORMATTING) && 
        topIntents.some(i => i.intent === IntentType.DATA_MANIPULATION)) {
      questions.push("Do you want to change how the data looks (formatting) or modify the data itself?");
    }
    
    if (topIntents.some(i => i.intent === IntentType.TROUBLESHOOTING)) {
      questions.push("Are you experiencing an error or unexpected behavior?");
    }

    // Generic clarification questions
    if (questions.length === 0) {
      questions.push("Could you provide more details about what you're trying to accomplish?");
      questions.push("Are you working with a specific range of cells or the entire sheet?");
    }

    return questions;
  }

  /**
   * Normalizes the request text for analysis
   */
  private normalizeRequest(request: string): string {
    if (!request || typeof request !== 'string') {
      return '';
    }
    
    return request
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculates confidence scores for each intent type
   */
  private calculateIntentScores(normalizedRequest: string): Record<IntentType, number> {
    const scores: Record<IntentType, number> = {} as Record<IntentType, number>;
    const words = normalizedRequest.split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) {
      // Return low scores for empty requests
      Object.values(IntentType).forEach(intent => {
        scores[intent] = 0.1;
      });
      return scores;
    }

    for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
      let score = 0;
      let matchCount = 0;
      let primaryMatches = 0;

      // Check primary keywords (higher weight)
      for (const keyword of keywords.primary) {
        if (normalizedRequest.includes(keyword)) {
          score += keywords.weight * 3; // Increased weight for primary keywords
          matchCount++;
          primaryMatches++;
        }
      }

      // Check secondary keywords (lower weight)
      for (const keyword of keywords.secondary) {
        if (normalizedRequest.includes(keyword)) {
          score += keywords.weight * 0.5; // Reduced weight for secondary keywords
          matchCount++;
        }
      }

      // Boost score if we have primary keyword matches
      if (primaryMatches > 0) {
        score *= 1.5;
      }

      // Normalize score based on keyword density and request length
      // Use a more generous scoring approach
      const density = matchCount / Math.max(words.length, 1);
      let normalizedScore = score * density * 0.5;
      
      // Boost score for having any matches
      if (matchCount > 0) {
        normalizedScore = Math.max(normalizedScore, 0.3);
      }
      
      // Additional boost for multiple matches
      if (matchCount > 1) {
        normalizedScore *= 1.5;
      }
      
      // Cap the score at 1.0
      normalizedScore = Math.min(normalizedScore, 1.0);
      
      scores[intent as IntentType] = normalizedScore;
    }

    return scores;
  }

  /**
   * Determines if clarification is needed based on intent scores
   */
  private needsClarification(sortedIntents: Array<{ intent: IntentType; confidence: number }>): boolean {
    if (sortedIntents.length < 2) return false;
    
    const topScore = sortedIntents[0]?.confidence ?? 0;
    const secondScore = sortedIntents[1]?.confidence ?? 0;
    
    // Need clarification if:
    // 1. Top confidence is below threshold
    // 2. Multiple intents are very close in confidence
    return topScore < this.confidenceThreshold || 
           (topScore - secondScore) < this.ambiguityThreshold;
  }

  /**
   * Gets the keywords that matched for a specific intent
   */
  private getMatchedKeywords(normalizedRequest: string, intent: IntentType): string[] {
    const keywords = this.intentKeywords[intent];
    if (!keywords) return [];
    
    const matched: string[] = [];

    for (const keyword of [...keywords.primary, ...keywords.secondary]) {
      if (normalizedRequest.includes(keyword)) {
        matched.push(keyword);
      }
    }

    return matched;
  }

  /**
   * Determines maximum cells to include based on scope type
   */
  private getMaxCellsForScope(scope: ScopeInfo['type']): number {
    switch (scope) {
      case 'current_selection':
        return 1000;
      case 'sheet':
        return 10000;
      case 'workbook':
        return 50000;
      case 'custom_range':
        return 5000;
      default:
        return 1000;
    }
  }

  /**
   * Converts OpenAI result to our internal format
   */
  private convertOpenAIResult(aiResult: OpenAIIntentResult): IntentClassificationResult {
    return {
      intent: aiResult.intent,
      confidence: aiResult.confidence,
      alternativeIntents: [], // OpenAI doesn't provide alternatives in current implementation
      matchedKeywords: [], // Not applicable for AI classification
      clarificationNeeded: aiResult.confidence < this.confidenceThreshold,
      suggestedQuestions: aiResult.confidence < this.confidenceThreshold ? 
        ['Could you provide more details about what you\'re trying to accomplish?'] : undefined
    };
  }
}

export class RequestAnalyzerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'RequestAnalyzerError';
  }
}