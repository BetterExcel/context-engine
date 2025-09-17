import OpenAI from 'openai';
import { ContextData, IntentType, Relationship, DataPattern, Anomaly, Insight } from '../types';

export interface OpenAIConfig {
  apiKey: string;
  maxRetries?: number;
  timeout?: number;
  model?: string;
}

export interface IntentClassificationResult {
  intent: IntentType;
  confidence: number;
  reasoning: string;
}

export interface PatternAnalysisResult {
  patterns: DataPattern[];
  relationships: Relationship[];
  anomalies: Anomaly[];
  insights: Insight[];
  confidence: number;
}

export class OpenAIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'OpenAIServiceError';
  }
}

export class OpenAIService {
  public client: OpenAI; // Made public for testing
  private model: string;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    });
    this.model = config.model || 'gpt-4';
  }

  /**
   * Enhanced intent classification using GPT-4
   */
  async classifyIntent(request: string, context?: any): Promise<IntentClassificationResult> {
    const prompt = this.buildIntentClassificationPrompt(request, context);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing spreadsheet user requests. Classify the user's intent and provide confidence score.
            
Available intent types:
- formula_assistance: Help with creating, debugging, or optimizing formulas
- data_analysis: Statistical analysis, trends, insights from data
- formatting: Styling, conditional formatting, cell appearance
- data_manipulation: Sorting, filtering, transforming data
- troubleshooting: Error resolution, validation issues
- general_assistance: Explanations, tutorials, general help

Respond with JSON in this exact format:
{
  "intent": "intent_type",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this intent was chosen"
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('OpenAI intent classification error:', error);
      throw new Error(`Intent classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * AI-powered pattern analysis for complex data relationships
   */
  async analyzePatterns(contextData: ContextData): Promise<PatternAnalysisResult> {
    const prompt = this.buildPatternAnalysisPrompt(contextData);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert data analyst specializing in spreadsheet data patterns. Analyze the provided data and identify:
1. Data patterns (trends, seasonality, distributions)
2. Relationships between columns/variables
3. Anomalies or outliers
4. Actionable insights

Respond with JSON in this exact format:
{
  "patterns": [
    {
      "type": "trend|seasonal|distribution|correlation",
      "description": "Description of the pattern",
      "strength": 0.85,
      "columns": ["A", "B"]
    }
  ],
  "relationships": [
    {
      "type": "correlation|causation|dependency",
      "source": "column_A",
      "target": "column_B",
      "strength": 0.92,
      "description": "Description of relationship"
    }
  ],
  "anomalies": [
    {
      "type": "outlier|missing|inconsistent",
      "location": "B5",
      "description": "Description of anomaly",
      "severity": "high|medium|low"
    }
  ],
  "insights": [
    {
      "type": "recommendation|observation|warning",
      "description": "Actionable insight",
      "priority": "high|medium|low"
    }
  ],
  "confidence": 0.88
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('OpenAI pattern analysis error:', error);
      throw new Error(`Pattern analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate clarifying questions for ambiguous requests
   */
  async generateClarificationQuestions(request: string, context?: any): Promise<string[]> {
    const prompt = this.buildClarificationPrompt(request, context);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are helping users clarify ambiguous spreadsheet requests. Generate 2-3 specific questions that would help understand what the user wants to accomplish.

Respond with JSON array of questions:
["Question 1?", "Question 2?", "Question 3?"]`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('OpenAI clarification error:', error);
      throw new Error(`Clarification generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate completion using OpenAI API
   */
  async generateCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI completion error:', error);
      throw new OpenAIServiceError(
        'Failed to generate completion',
        'COMPLETION_ERROR',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Check if OpenAI service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      return true;
    } catch (error) {
      console.warn('OpenAI service unavailable:', error);
      return false;
    }
  }

  private buildIntentClassificationPrompt(request: string, context?: any): string {
    let prompt = `User request: "${request}"`;
    
    if (context) {
      prompt += `\n\nSpreadsheet context:`;
      if (context.currentSelection) {
        prompt += `\n- Current selection: ${context.currentSelection}`;
      }
      if (context.activeCell) {
        prompt += `\n- Active cell: ${context.activeCell}`;
      }
      if (context.dataTypes) {
        prompt += `\n- Data types present: ${context.dataTypes.join(', ')}`;
      }
      if (context.hasFormulas) {
        prompt += `\n- Contains formulas: ${context.hasFormulas}`;
      }
    }
    
    return prompt;
  }

  private buildPatternAnalysisPrompt(contextData: ContextData): string {
    let prompt = `Analyze the following spreadsheet data for patterns and relationships:\n\n`;
    
    // Add immediate context data
    if (contextData.immediate?.selectedData) {
      prompt += `Selected data sample:\n`;
      const sampleData = contextData.immediate.selectedData.slice(0, 10); // First 10 rows
      sampleData.forEach((row, i) => {
        prompt += `Row ${i + 1}: ${row.map(cell => cell.value).join(' | ')}\n`;
      });
      prompt += `\n`;
    }
    
    // Add structural context
    if (contextData.structural) {
      prompt += `Data structure:\n`;
      prompt += `- Headers: ${contextData.structural.headers?.join(', ') || 'Not specified'}\n`;
      prompt += `- Data types: ${contextData.structural.dataTypes?.join(', ') || 'Not specified'}\n`;
      prompt += `- Row count: ${contextData.structural.rowCount || 'Unknown'}\n`;
      prompt += `- Column count: ${contextData.structural.columnCount || 'Unknown'}\n\n`;
    }
    
    // Add any existing formulas
    if (contextData.related?.relatedFormulas?.length) {
      prompt += `Existing formulas:\n`;
      contextData.related.relatedFormulas.forEach(formula => {
        prompt += `- ${formula.cell}: ${formula.formula}\n`;
      });
      prompt += `\n`;
    }
    
    return prompt;
  }

  private buildClarificationPrompt(request: string, context?: any): string {
    let prompt = `The user made this request: "${request}"`;
    
    if (context) {
      prompt += `\n\nContext available:`;
      if (context.currentSelection) {
        prompt += `\n- Current selection: ${context.currentSelection}`;
      }
      if (context.dataTypes) {
        prompt += `\n- Data types: ${context.dataTypes.join(', ')}`;
      }
    }
    
    prompt += `\n\nThe request seems ambiguous. What questions would help clarify the user's intent?`;
    
    return prompt;
  }
}