/**
 * LLMResponseService - Generates responses using OpenAI based on context and user requests
 */

import { OpenAIService } from './OpenAIService';
import { ContextAnalysisResult } from '../types/api';

export interface LLMResponseRequest {
  userRequest: string;
  contextAnalysis: any; // The context analysis result
  responseType?: 'explanation' | 'formula' | 'steps' | 'analysis' | 'general';
  includeCode?: boolean;
  includeExamples?: boolean;
}

export interface LLMResponse {
  response: string;
  responseType: string;
  confidence: number;
  suggestions?: string[];
  codeExamples?: Array<{
    language: string;
    code: string;
    description: string;
  }>;
  followUpQuestions?: string[];
}

export class LLMResponseService {
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.openAIService = openAIService;
  }

  async generateResponse(request: LLMResponseRequest): Promise<LLMResponse> {
    try {
      // Build the system prompt based on the context
      const systemPrompt = this.buildSystemPrompt(request.contextAnalysis, request.responseType);
      
      // Build the user prompt
      const userPrompt = this.buildUserPrompt(request);

      // Call OpenAI
      const response = await this.openAIService.generateCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.1')
      });

      // Parse the response (response is already the content string)
      return this.parseResponse(response, request.responseType || 'general');

    } catch (error) {
      console.error('Error generating LLM response:', error);
      
      // Fallback response
      return {
        response: this.generateFallbackResponse(request),
        responseType: request.responseType || 'general',
        confidence: 0.3,
        suggestions: ['Try rephrasing your request', 'Provide more specific details about what you want to accomplish']
      };
    }
  }

  private buildSystemPrompt(contextAnalysis: any, responseType?: string): string {
    const basePrompt = `You are an expert Excel assistant helping users with spreadsheet tasks. You have been provided with detailed context about the user's spreadsheet and their current selection.

CONTEXT INFORMATION:
- User's Intent: ${contextAnalysis.requestAnalysis?.intent || 'general assistance'}
- Selected Range: ${contextAnalysis.spreadsheetContext?.currentSelection?.range || 'N/A'}
- Data Types: ${contextAnalysis.spreadsheetContext?.currentSelection?.dataTypes?.join(', ') || 'N/A'}
- Row Count: ${contextAnalysis.spreadsheetContext?.dataSummary?.rowCount || 0}
- Available Operations: ${contextAnalysis.actionableInfo?.suggestedOperations?.join(', ') || 'N/A'}
- Target Cells: ${contextAnalysis.actionableInfo?.targetCells?.join(', ') || 'N/A'}

INSTRUCTIONS:
- Provide clear, actionable advice based on the context
- Include specific Excel formulas when relevant
- Explain step-by-step instructions when needed
- Be concise but comprehensive
- Focus on practical solutions`;

    // Add response-type specific instructions
    switch (responseType) {
      case 'formula':
        return basePrompt + `\n\nFORMULA FOCUS:
- Provide the exact Excel formula needed
- Explain what each part of the formula does
- Include alternative formulas if applicable
- Mention any prerequisites or limitations`;

      case 'steps':
        return basePrompt + `\n\nSTEP-BY-STEP FOCUS:
- Break down the solution into clear, numbered steps
- Include specific cell references and actions
- Mention keyboard shortcuts where helpful
- Provide tips for efficiency`;

      case 'analysis':
        return basePrompt + `\n\nANALYSIS FOCUS:
- Analyze the data patterns and trends
- Provide insights about the data
- Suggest visualizations or further analysis
- Identify potential issues or opportunities`;

      case 'explanation':
        return basePrompt + `\n\nEXPLANATION FOCUS:
- Explain concepts clearly and simply
- Use analogies when helpful
- Provide context for why something works
- Include best practices and tips`;

      default:
        return basePrompt + `\n\nGENERAL ASSISTANCE:
- Provide helpful, relevant advice
- Include formulas, steps, or explanations as needed
- Be comprehensive but not overwhelming
- Focus on solving the user's specific problem`;
    }
  }

  private buildUserPrompt(request: LLMResponseRequest): string {
    // Handle both old and new context structures
    const contextData = request.contextAnalysis.spreadsheetContext || request.contextAnalysis.context;
    
    let prompt = `USER REQUEST: "${request.userRequest}"

SPREADSHEET CONTEXT:
${JSON.stringify(contextData, null, 2)}

NATURAL LANGUAGE CONTEXT:
${request.contextAnalysis.naturalLanguageDescription}

Please provide a helpful response based on this context and the user's request.`;

    if (request.includeCode) {
      prompt += `\n\nPlease include relevant code examples (Excel formulas, VBA, etc.) where applicable.`;
    }

    if (request.includeExamples) {
      prompt += `\n\nPlease include practical examples to illustrate your points.`;
    }

    return prompt;
  }

  private parseResponse(content: string, responseType: string): LLMResponse {
    // Extract code examples if present
    const codeExamples: Array<{ language: string; code: string; description: string }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeExamples.push({
        language: match[1] || 'excel',
        code: match[2].trim(),
        description: 'Code example'
      });
    }

    // Extract follow-up questions if present
    const followUpQuestions: string[] = [];
    const questionRegex = /(?:Follow-up questions?|You might also want to|Consider also):\s*\n((?:[-*]\s*.+\n?)+)/gi;
    const questionMatch = questionRegex.exec(content);
    
    if (questionMatch) {
      const questions = questionMatch[1].split('\n')
        .map(q => q.replace(/^[-*]\s*/, '').trim())
        .filter(q => q.length > 0);
      followUpQuestions.push(...questions);
    }

    // Calculate confidence based on response quality
    let confidence = 0.8;
    if (codeExamples.length > 0) confidence += 0.1;
    if (content.length > 200) confidence += 0.05;
    if (content.includes('formula') || content.includes('=')) confidence += 0.05;

    return {
      response: content,
      responseType,
      confidence: Math.min(confidence, 1.0),
      codeExamples: codeExamples.length > 0 ? codeExamples : undefined,
      followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : undefined,
      suggestions: this.extractSuggestions(content)
    };
  }

  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    
    // Look for common suggestion patterns
    const suggestionPatterns = [
      /(?:You could also|Consider|Try|Alternative)/gi,
      /(?:Tip|Pro tip|Note):/gi,
      /(?:For better results|To improve)/gi
    ];

    suggestionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        // Extract the sentence containing the suggestion
        matches.forEach(match => {
          const index = content.indexOf(match);
          const sentence = this.extractSentence(content, index);
          if (sentence && sentence.length > 10) {
            suggestions.push(sentence);
          }
        });
      }
    });

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private extractSentence(text: string, startIndex: number): string {
    // Find the start of the sentence
    let start = startIndex;
    while (start > 0 && text[start - 1] !== '.' && text[start - 1] !== '\n') {
      start--;
    }

    // Find the end of the sentence
    let end = startIndex;
    while (end < text.length && text[end] !== '.' && text[end] !== '\n') {
      end++;
    }

    return text.substring(start, end + 1).trim();
  }

  private generateFallbackResponse(request: LLMResponseRequest): string {
    const intent = request.contextAnalysis.requestAnalysis?.intent || 'general';
    const range = request.contextAnalysis.spreadsheetContext?.currentSelection?.range || 'your selection';

    switch (intent) {
      case 'formula_assistance':
        return `I can help you create a formula for ${range}. Based on your request "${request.userRequest}", you might want to use functions like SUM, AVERAGE, or COUNT. Could you provide more specific details about what calculation you need?`;

      case 'data_analysis':
        return `I can help analyze the data in ${range}. For your request "${request.userRequest}", I'd recommend looking at patterns, trends, and summary statistics. What specific insights are you looking for?`;

      case 'formatting':
        return `I can help format the cells in ${range}. For "${request.userRequest}", you can use Excel's formatting options to change appearance, apply conditional formatting, or adjust data types.`;

      case 'data_manipulation':
        return `I can help manipulate the data in ${range}. For "${request.userRequest}", consider using Excel's sort, filter, or data transformation features.`;

      default:
        return `I understand you want help with "${request.userRequest}" for ${range}. While I'm having trouble accessing my full capabilities right now, I can suggest exploring Excel's built-in features or providing more specific details about what you're trying to accomplish.`;
    }
  }
}