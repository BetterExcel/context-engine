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
      // Check if we can answer directly without AI
      const contextData = request.contextAnalysis.spreadsheetContext || request.contextAnalysis.context;
      const userRequest = request.userRequest.toLowerCase();
      
      if (this.canAnswerDirectly(userRequest, contextData)) {
        const directAnswer = this.generateDirectAnswer(userRequest, contextData, request.contextAnalysis);
        if (directAnswer) {
          return {
            response: directAnswer,
            responseType: request.responseType || 'analysis',
            confidence: 0.95,
            suggestions: [
              'Ask for more detailed analysis',
              'Request specific calculations or formulas',
              'Explore data patterns and trends'
            ]
          };
        }
      }

      // Build the system prompt based on the context
      const systemPrompt = this.buildSystemPrompt(request.contextAnalysis, request.responseType);
      
      // Build the user prompt
      let userPrompt = this.buildUserPrompt(request);
      
      // Check token count and truncate if necessary
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt }
      ];
      
      // Rough token estimation (1 token ≈ 4 characters)
      const estimatedTokens = (systemPrompt.length + userPrompt.length) / 4;
      const maxContextTokens = parseInt(process.env.MAX_CONTEXT_TOKENS || '4000'); // Reduced further
      
      if (estimatedTokens > maxContextTokens) {
        console.log(`Context too large (${Math.round(estimatedTokens)} tokens), truncating...`);
        userPrompt = this.truncateUserPrompt(userPrompt, maxContextTokens - systemPrompt.length / 4);
        messages[1].content = userPrompt;
      }

      // Call OpenAI
      const response = await this.openAIService.generateCompletion(messages, {
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1500'), // Reduced
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.1')
      });

      // Parse the response (response is already the content string)
      return this.parseResponse(response, request.responseType || 'general');

    } catch (error) {
      console.error('Error generating LLM response:', error);
      
      // Try direct answer as fallback
      const contextData = request.contextAnalysis.spreadsheetContext || request.contextAnalysis.context;
      const directAnswer = this.generateDirectAnswer(request.userRequest.toLowerCase(), contextData, request.contextAnalysis);
      
      if (directAnswer) {
        return {
          response: directAnswer + "\n\n(Note: AI analysis temporarily unavailable, showing direct calculation)",
          responseType: request.responseType || 'general',
          confidence: 0.8,
          suggestions: ['Try a simpler query', 'Check your data selection', 'Refresh and try again']
        };
      }
      
      // Final fallback response
      return {
        response: this.generateFallbackResponse(request),
        responseType: request.responseType || 'general',
        confidence: 0.3,
        suggestions: ['Try rephrasing your request', 'Provide more specific details about what you want to accomplish']
      };
    }
  }

  private truncateUserPrompt(prompt: string, maxTokens: number): string {
    const maxChars = maxTokens * 4; // Rough estimation
    
    if (prompt.length <= maxChars) {
      return prompt;
    }
    
    // Try to truncate intelligently by keeping the most important parts
    const sections = prompt.split('\n\n');
    let truncated = '';
    
    // Always keep the user request
    const userRequestSection = sections.find(s => s.startsWith('USER REQUEST:'));
    if (userRequestSection) {
      truncated += userRequestSection + '\n\n';
    }
    
    // Add other sections until we hit the limit
    for (const section of sections) {
      if (section === userRequestSection) continue;
      
      if ((truncated + section).length < maxChars) {
        truncated += section + '\n\n';
      } else {
        // Add a truncation notice
        truncated += '[Context truncated for length]';
        break;
      }
    }
    
    return truncated.trim();
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
    
    // Create a truncated, intelligent summary of the context instead of full JSON
    const contextSummary = this.createIntelligentContextSummary(contextData, request.contextAnalysis);
    
    let prompt = `USER REQUEST: "${request.userRequest}"

SPREADSHEET CONTEXT SUMMARY:
${contextSummary}

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

  private createIntelligentContextSummary(contextData: any, fullAnalysis: any): string {
    // For simple queries, provide direct answers without AI
    const userRequest = fullAnalysis?.userRequest?.toLowerCase() || '';
    
    if (this.canAnswerDirectly(userRequest, contextData)) {
      return this.generateDirectAnswer(userRequest, contextData, fullAnalysis);
    }
    
    // Create minimal context summary for AI processing
    const summary: string[] = [];
    
    // Essential info only
    if (contextData?.currentSelection) {
      summary.push(`Range: ${contextData.currentSelection.range || 'N/A'}`);
    }
    
    // Minimal data info
    if (contextData?.dataSummary) {
      summary.push(`${contextData.dataSummary.rowCount || 0} rows, ${contextData.dataSummary.columnCount || 0} cols`);
    }
    
    // Only first row of data for context
    if (contextData?.immediate?.selectedData && contextData.immediate.selectedData.length > 0) {
      const firstRow = contextData.immediate.selectedData[0];
      if (firstRow && firstRow.length > 0) {
        const headers = firstRow.slice(0, 3).map((cell: any) => 
          typeof cell === 'object' ? cell.value : cell
        ).join(' | ');
        summary.push(`Headers: ${headers}...`);
      }
      
      // Add one data row
      if (contextData.immediate.selectedData.length > 1) {
        const dataRow = contextData.immediate.selectedData[1];
        if (dataRow && dataRow.length > 0) {
          const values = dataRow.slice(0, 3).map((cell: any) => 
            typeof cell === 'object' ? cell.value : cell
          ).join(' | ');
          summary.push(`Sample: ${values}...`);
        }
      }
    }
    
    return summary.join('\n');
  }

  private canAnswerDirectly(userRequest: string, contextData: any): boolean {
    // Check if this is a simple query we can answer without AI
    const simpleQueries = [
      'highest', 'lowest', 'maximum', 'minimum', 'max', 'min',
      'largest', 'smallest', 'biggest', 'total', 'sum', 'count',
      'average', 'mean', 'what is', 'show me', 'find'
    ];
    
    return simpleQueries.some(query => userRequest.includes(query)) && 
           contextData?.immediate?.selectedData?.length > 0;
  }

  private generateDirectAnswer(userRequest: string, contextData: any, fullAnalysis: any): string {
    // Generate direct answers for simple queries
    const data = contextData?.immediate?.selectedData || [];
    
    if (data.length === 0) {
      return "No data available in the selected range.";
    }
    
    // Extract numeric values from the data
    const numericValues: number[] = [];
    const allValues: any[] = [];
    
    data.forEach((row: any[]) => {
      row.forEach((cell: any) => {
        const value = typeof cell === 'object' ? cell.value : cell;
        allValues.push(value);
        if (typeof value === 'number' && !isNaN(value)) {
          numericValues.push(value);
        }
      });
    });
    
    // Answer based on the query type
    if (userRequest.includes('highest') || userRequest.includes('maximum') || userRequest.includes('max') || userRequest.includes('largest') || userRequest.includes('biggest')) {
      if (numericValues.length > 0) {
        const max = Math.max(...numericValues);
        return `The highest value in the selected data is ${max.toLocaleString()}.`;
      }
    }
    
    if (userRequest.includes('lowest') || userRequest.includes('minimum') || userRequest.includes('min') || userRequest.includes('smallest')) {
      if (numericValues.length > 0) {
        const min = Math.min(...numericValues);
        return `The lowest value in the selected data is ${min.toLocaleString()}.`;
      }
    }
    
    if (userRequest.includes('total') || userRequest.includes('sum')) {
      if (numericValues.length > 0) {
        const sum = numericValues.reduce((a, b) => a + b, 0);
        return `The total sum of numeric values in the selected data is ${sum.toLocaleString()}.`;
      }
    }
    
    if (userRequest.includes('count')) {
      return `The selected data contains ${allValues.length} total values, with ${numericValues.length} numeric values.`;
    }
    
    if (userRequest.includes('average') || userRequest.includes('mean')) {
      if (numericValues.length > 0) {
        // Don't give generic averages - this should be handled by enhanced query processing
        console.warn('LLMResponseService: Generic average calculation detected. This should use EnhancedQueryProcessor instead.');
        return `I found ${numericValues.length} numeric values in the selected data. For specific analysis, please use the enhanced context analysis endpoint which provides targeted Excel formulas and step-by-step guidance.`;
      }
    }
    
    // Check for specific queries that should use enhanced processing
    const specificQueries = [
      'what is', 'show me', 'find', 'get', 'average price', 'market value', 
      'profit', 'loss', 'return', 'coinbase', 'apple', 'aapl', 'coin'
    ];
    
    if (specificQueries.some(query => userRequest.toLowerCase().includes(query))) {
      return `For specific data queries like "${userRequest}", I recommend using the enhanced context analysis which provides:

• Exact Excel formulas (e.g., =VLOOKUP("AAPL", A:K, 4, FALSE))
• Step-by-step instructions
• Confidence analysis based on your actual data
• Validation steps to ensure accuracy

This gives you precise, actionable guidance instead of generic responses.`;
    }

    // Default description for general queries
    if (userRequest.includes('selected data')) {
      const headers = data[0]?.map((cell: any) => typeof cell === 'object' ? cell.value : cell) || [];
      const rowCount = data.length;
      const colCount = headers.length;
      
      let description = `This appears to be a ${rowCount} x ${colCount} dataset`;
      
      // Detect if it's financial data
      const headerStr = headers.join(' ').toLowerCase();
      if (headerStr.includes('symbol') || headerStr.includes('price') || headerStr.includes('market') || headerStr.includes('profit')) {
        description += ' containing financial/portfolio information';
      }
      
      if (headers.length > 0) {
        description += ` with columns: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}`;
      }
      
      if (numericValues.length > 0) {
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const avg = sum / numericValues.length;
        const max = Math.max(...numericValues);
        const min = Math.min(...numericValues);
        
        description += `\n\nKey statistics:
- Total numeric values: ${numericValues.length}
- Sum: ${sum.toLocaleString()}
- Average: ${avg.toLocaleString()}
- Range: ${min.toLocaleString()} to ${max.toLocaleString()}`;
      }
      
      return description;
    }
    
    // Fallback - let AI handle it with minimal context
    return '';
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