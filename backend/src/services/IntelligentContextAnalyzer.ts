/**
 * IntelligentContextAnalyzer - Advanced Context Understanding System
 * 
 * This is a sophisticated context analysis system similar to Cursor IDE or GitHub Copilot
 * but specifically designed for spreadsheets. It provides deep context understanding,
 * intent classification, and generates comprehensive prompts for LLM agents.
 * 
 * Key Features:
 * - Deep semantic analysis of spreadsheet data
 * - Intelligent intent classification and scope determination
 * - Context-aware action suggestions
 * - Excel formula generation instructions
 * - Comprehensive agent prompt generation
 */

import { OpenAIService } from './OpenAIService';
import { ContextData } from '../types/context';
import { SelectionInfo } from '../types/spreadsheet';

export interface SpreadsheetSemantics {
  dataType: 'financial' | 'inventory' | 'personnel' | 'sales' | 'analytics' | 'mixed' | 'unknown';
  confidence: number;
  keyEntities: string[];
  relationships: DataRelationship[];
  patterns: DataPattern[];
  structure: StructuralAnalysis;
}

export interface DataRelationship {
  type: 'one-to-many' | 'many-to-many' | 'hierarchical' | 'temporal' | 'categorical';
  columns: string[];
  strength: number;
  description: string;
}

export interface DataPattern {
  type: 'trend' | 'outlier' | 'grouping' | 'calculation' | 'lookup' | 'aggregation';
  location: string;
  description: string;
  significance: number;
}

export interface StructuralAnalysis {
  headers: HeaderAnalysis[];
  dataRegions: DataRegion[];
  calculatedFields: CalculatedField[];
  summaryAreas: SummaryArea[];
  pivot: boolean;
  hasFormulas: boolean;
}

export interface HeaderAnalysis {
  column: string;
  name: string;
  dataType: string;
  semanticType: 'identifier' | 'name' | 'quantity' | 'price' | 'date' | 'category' | 'metric' | 'description';
  examples: any[];
  nullPercentage: number;
  uniqueness: number;
}

export interface DataRegion {
  range: string;
  type: 'header' | 'data' | 'summary' | 'calculation' | 'metadata';
  importance: number;
  description: string;
}

export interface CalculatedField {
  column: string;
  formula: string;
  purpose: string;
  dependencies: string[];
}

export interface SummaryArea {
  range: string;
  type: 'total' | 'average' | 'count' | 'subtotal' | 'pivot';
  relatedColumns: string[];
}

export interface UserIntent {
  primary: 'analyze' | 'find' | 'calculate' | 'compare' | 'summarize' | 'filter' | 'format' | 'create' | 'update';
  secondary: string[];
  confidence: number;
  scope: 'current_cell' | 'current_selection' | 'current_row' | 'current_column' | 'related_data' | 'entire_sheet' | 'cross_sheet';
  specificity: 'general' | 'specific_item' | 'specific_calculation' | 'specific_comparison';
  entities: ExtractedEntity[];
  temporal: TemporalContext;
}

export interface ExtractedEntity {
  text: string;
  type: 'product' | 'person' | 'date' | 'amount' | 'category' | 'metric' | 'location' | 'identifier';
  column: string | null;
  confidence: number;
  variations: string[];
}

export interface TemporalContext {
  hasTimeElement: boolean;
  timeframe: 'current' | 'historical' | 'future' | 'range';
  specificDates: string[];
  relativeDates: string[];
}

export interface SuggestedAction {
  type: 'formula' | 'filter' | 'pivot' | 'chart' | 'format' | 'lookup' | 'analysis';
  priority: number;
  description: string;
  excelFormula?: string;
  steps: string[];
  expectedResult: string;
  confidence: number;
}

export interface AgentPrompt {
  systemContext: string;
  userContext: string;
  dataContext: string;
  taskInstructions: string;
  constraintsAndGuidelines: string;
  excelFormulasAndMethods: string;
  expectedOutputFormat: string;
  fallbackStrategies: string[];
}

export interface IntelligentAnalysisResult {
  semantics: SpreadsheetSemantics;
  userIntent: UserIntent;
  suggestedActions: SuggestedAction[];
  agentPrompt: AgentPrompt;
  contextualResponse: string;
  confidence: number;
  processingTime: number;
}

export class IntelligentContextAnalyzer {
  private openaiService: OpenAIService;

  constructor(openaiService: OpenAIService) {
    this.openaiService = openaiService;
  }

  /**
   * Main analysis method that orchestrates the entire intelligent analysis process
   */
  async analyzeContext(
    contextData: ContextData,
    userQuery: string,
    selectionInfo: SelectionInfo,
    spreadsheetMetadata?: any
  ): Promise<IntelligentAnalysisResult> {
    const startTime = Date.now();

    // Step 1: Deep semantic analysis of the spreadsheet
    const semantics = await this.analyzeSpreadsheetSemantics(contextData);

    // Step 2: Advanced intent classification
    const userIntent = await this.classifyUserIntent(userQuery, semantics, selectionInfo);

    // Step 3: Generate contextual action suggestions
    const suggestedActions = await this.generateSuggestedActions(semantics, userIntent, selectionInfo);

    // Step 4: Create comprehensive agent prompt
    const agentPrompt = await this.generateAgentPrompt(
      semantics, 
      userIntent, 
      suggestedActions, 
      contextData, 
      userQuery, 
      selectionInfo
    );

    // Step 5: Generate intelligent contextual response
    const contextualResponse = await this.generateContextualResponse(agentPrompt);

    const confidence = this.calculateOverallConfidence(semantics, userIntent, suggestedActions);
    const processingTime = Date.now() - startTime;

    return {
      semantics,
      userIntent,
      suggestedActions,
      agentPrompt,
      contextualResponse,
      confidence,
      processingTime
    };
  }

  /**
   * Performs deep semantic analysis of spreadsheet data
   */
  private async analyzeSpreadsheetSemantics(contextData: ContextData): Promise<SpreadsheetSemantics> {
    const headers = this.extractHeaders(contextData);
    const dataAnalysis = this.analyzeDataCharacteristics(contextData);
    const relationships = this.identifyDataRelationships(headers, contextData);
    const patterns = this.detectDataPatterns(contextData);

    // Determine overall data type using ML-like classification
    const dataType = this.classifyDataType(headers, dataAnalysis);
    const keyEntities = this.extractKeyEntities(headers, contextData);

    const structure: StructuralAnalysis = {
      headers: headers,
      dataRegions: this.identifyDataRegions(contextData),
      calculatedFields: this.identifyCalculatedFields(contextData),
      summaryAreas: this.identifySummaryAreas(contextData),
      pivot: this.detectPivotStructure(contextData),
      hasFormulas: this.hasFormulas(contextData)
    };

    return {
      dataType,
      confidence: this.calculateSemanticConfidence(dataType, headers, patterns),
      keyEntities,
      relationships,
      patterns,
      structure
    };
  }

  /**
   * Advanced intent classification using context-aware analysis
   */
  private async classifyUserIntent(
    userQuery: string, 
    semantics: SpreadsheetSemantics, 
    selectionInfo: SelectionInfo
  ): Promise<UserIntent> {
    
    // Extract entities from user query
    const entities = await this.extractEntitiesFromQuery(userQuery, semantics);
    
    // Determine primary intent
    const primary = this.determinePrimaryIntent(userQuery);
    const secondary = this.determineSecondaryIntents(userQuery, primary);
    
    // Determine scope based on selection and query context
    const scope = this.determineQueryScope(userQuery, selectionInfo, semantics);
    const specificity = this.determineSpecificity(userQuery, entities);
    
    // Analyze temporal context
    const temporal = this.analyzeTemporalContext(userQuery, semantics);
    
    const confidence = this.calculateIntentConfidence(primary, entities, scope);

    return {
      primary,
      secondary,
      confidence,
      scope,
      specificity,
      entities,
      temporal
    };
  }

  /**
   * Generates intelligent action suggestions based on context and intent
   */
  private async generateSuggestedActions(
    semantics: SpreadsheetSemantics, 
    userIntent: UserIntent, 
    selectionInfo: SelectionInfo
  ): Promise<SuggestedAction[]> {
    
    const actions: SuggestedAction[] = [];

    // Generate actions based on intent and data type
    switch (userIntent.primary) {
      case 'find':
        actions.push(...this.generateFindActions(userIntent, semantics, selectionInfo));
        break;
      case 'calculate':
        actions.push(...this.generateCalculateActions(userIntent, semantics, selectionInfo));
        break;
      case 'analyze':
        actions.push(...this.generateAnalyzeActions(userIntent, semantics, selectionInfo));
        break;
      case 'compare':
        actions.push(...this.generateCompareActions(userIntent, semantics, selectionInfo));
        break;
      case 'summarize':
        actions.push(...this.generateSummarizeActions(userIntent, semantics, selectionInfo));
        break;
      default:
        actions.push(...this.generateGeneralActions(userIntent, semantics, selectionInfo));
    }

    // Sort by priority and confidence
    return actions.sort((a, b) => (b.priority * b.confidence) - (a.priority * a.confidence));
  }

  /**
   * Generates comprehensive agent prompt for LLM
   */
  private async generateAgentPrompt(
    semantics: SpreadsheetSemantics,
    userIntent: UserIntent,
    suggestedActions: SuggestedAction[],
    contextData: ContextData,
    userQuery: string,
    selectionInfo: SelectionInfo
  ): Promise<AgentPrompt> {

    const systemContext = this.buildSystemContext(semantics);
    const userContext = this.buildUserContext(userIntent, userQuery, selectionInfo);
    const dataContext = this.buildDataContext(contextData, semantics);
    const taskInstructions = this.buildTaskInstructions(userIntent, suggestedActions);
    const constraintsAndGuidelines = this.buildConstraintsAndGuidelines(semantics, userIntent);
    const excelFormulasAndMethods = this.buildExcelFormulasAndMethods(suggestedActions, semantics);
    const expectedOutputFormat = this.buildExpectedOutputFormat(userIntent);
    const fallbackStrategies = this.buildFallbackStrategies(userIntent, semantics);

    return {
      systemContext,
      userContext,
      dataContext,
      taskInstructions,
      constraintsAndGuidelines,
      excelFormulasAndMethods,
      expectedOutputFormat,
      fallbackStrategies
    };
  }

  /**
   * Generate final contextual response using the agent prompt
   */
  private async generateContextualResponse(agentPrompt: AgentPrompt): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: `${agentPrompt.systemContext}\n\n${agentPrompt.constraintsAndGuidelines}`
      },
      {
        role: 'user' as const,
        content: `${agentPrompt.userContext}\n\nDATA CONTEXT:\n${agentPrompt.dataContext}\n\nTASK:\n${agentPrompt.taskInstructions}\n\nEXCEL METHODS AVAILABLE:\n${agentPrompt.excelFormulasAndMethods}\n\nEXPECTED OUTPUT:\n${agentPrompt.expectedOutputFormat}`
      }
    ];

    return await this.openaiService.generateCompletion(messages, {
      temperature: 0.3, // Lower temperature for more focused responses
      maxTokens: 2000
    });
  }

  // === HELPER METHODS FOR SEMANTIC ANALYSIS ===

  private extractHeaders(contextData: ContextData): HeaderAnalysis[] {
    // Implementation for extracting and analyzing headers
    const headers: HeaderAnalysis[] = [];
    
    if (contextData.structural?.headers) {
      contextData.structural.headers.forEach((header, index) => {
        const columnData = this.getColumnData(contextData, index);
        headers.push({
          column: this.indexToColumn(index),
          name: header,
          dataType: this.inferDataType(columnData),
          semanticType: this.inferSemanticType(header, columnData),
          examples: columnData.slice(0, 3),
          nullPercentage: this.calculateNullPercentage(columnData),
          uniqueness: this.calculateUniqueness(columnData)
        });
      });
    }
    
    return headers;
  }

  private getColumnData(contextData: ContextData, columnIndex: number): any[] {
    const data: any[] = [];
    
    if (contextData.immediate?.selectedData) {
      contextData.immediate.selectedData.forEach(row => {
        if (Array.isArray(row) && row[columnIndex]) {
          data.push(row[columnIndex].value);
        }
      });
    }
    
    return data;
  }

  private inferDataType(columnData: any[]): string {
    const types = columnData.map(value => typeof value);
    const numberCount = types.filter(t => t === 'number').length;
    const stringCount = types.filter(t => t === 'string').length;
    
    if (numberCount > stringCount) return 'number';
    if (stringCount > 0) return 'string';
    return 'mixed';
  }

  private inferSemanticType(header: string, columnData: any[]): HeaderAnalysis['semanticType'] {
    const headerLower = header.toLowerCase();
    
    if (headerLower.includes('id') || headerLower.includes('key')) return 'identifier';
    if (headerLower.includes('name') || headerLower.includes('title')) return 'name';
    if (headerLower.includes('price') || headerLower.includes('cost') || headerLower.includes('amount')) return 'price';
    if (headerLower.includes('date') || headerLower.includes('time')) return 'date';
    if (headerLower.includes('category') || headerLower.includes('type') || headerLower.includes('group')) return 'category';
    if (headerLower.includes('quantity') || headerLower.includes('count') || headerLower.includes('number')) return 'quantity';
    if (headerLower.includes('description') || headerLower.includes('comment') || headerLower.includes('note')) return 'description';
    
    // Analyze data patterns
    const numericData = columnData.filter(v => typeof v === 'number');
    if (numericData.length > columnData.length * 0.8) return 'metric';
    
    return 'description';
  }

  private classifyDataType(headers: HeaderAnalysis[], dataAnalysis: any): SpreadsheetSemantics['dataType'] {
    const semanticTypes = headers.map(h => h.semanticType);
    
    if (semanticTypes.includes('price') && semanticTypes.includes('quantity')) {
      if (semanticTypes.includes('name') || semanticTypes.includes('identifier')) {
        return 'inventory';
      }
      return 'sales';
    }
    
    if (semanticTypes.includes('price') || semanticTypes.includes('metric')) {
      return 'financial';
    }
    
    if (semanticTypes.includes('name') && semanticTypes.includes('identifier')) {
      return 'personnel';
    }
    
    return 'mixed';
  }

  // === HELPER METHODS FOR INTENT CLASSIFICATION ===

  private determinePrimaryIntent(userQuery: string): UserIntent['primary'] {
    const query = userQuery.toLowerCase();
    
    if (query.includes('what is') || query.includes('show me') || query.includes('find')) return 'find';
    if (query.includes('calculate') || query.includes('sum') || query.includes('total')) return 'calculate';
    if (query.includes('analyze') || query.includes('explain') || query.includes('understand')) return 'analyze';
    if (query.includes('compare') || query.includes('versus') || query.includes('difference')) return 'compare';
    if (query.includes('summary') || query.includes('overview') || query.includes('summarize')) return 'summarize';
    
    return 'analyze'; // Default
  }

  private async extractEntitiesFromQuery(userQuery: string, semantics: SpreadsheetSemantics): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    const words = userQuery.toLowerCase().split(/\s+/);
    
    // Look for entities that match data in the spreadsheet
    semantics.keyEntities.forEach(entity => {
      words.forEach(word => {
        if (entity.toLowerCase().includes(word) || word.includes(entity.toLowerCase())) {
          entities.push({
            text: entity,
            type: this.inferEntityType(entity, semantics),
            column: this.findEntityColumn(entity, semantics),
            confidence: 0.8,
            variations: [word, entity]
          });
        }
      });
    });
    
    return entities;
  }

  // === HELPER METHODS FOR ACTION GENERATION ===

  private generateFindActions(userIntent: UserIntent, semantics: SpreadsheetSemantics, selectionInfo: SelectionInfo): SuggestedAction[] {
    const actions: SuggestedAction[] = [];
    
    if (userIntent.entities.length > 0) {
      const entity = userIntent.entities[0];
      if (entity.column) {
        actions.push({
          type: 'filter',
          priority: 10,
          description: `Find rows containing "${entity.text}"`,
          excelFormula: `=FILTER(A:Z, ${entity.column}:${entity.column}="${entity.text}")`,
          steps: [
            `Select the data range`,
            `Use the filter formula to find matching rows`,
            `Review the filtered results`
          ],
          expectedResult: `All rows where ${entity.column} contains "${entity.text}"`,
          confidence: 0.9
        });
      }
    }
    
    return actions;
  }

  private generateCalculateActions(userIntent: UserIntent, semantics: SpreadsheetSemantics, selectionInfo: SelectionInfo): SuggestedAction[] {
    const actions: SuggestedAction[] = [];
    
    const numericColumns = semantics.structure.headers.filter(h => h.dataType === 'number');
    
    numericColumns.forEach(column => {
      actions.push({
        type: 'formula',
        priority: 8,
        description: `Calculate sum of ${column.name}`,
        excelFormula: `=SUM(${column.column}:${column.column})`,
        steps: [
          `Select a cell for the result`,
          `Enter the SUM formula`,
          `Press Enter to calculate`
        ],
        expectedResult: `Total sum of all values in ${column.name}`,
        confidence: 0.8
      });
    });
    
    return actions;
  }

  // === HELPER METHODS FOR PROMPT GENERATION ===

  private buildSystemContext(semantics: SpreadsheetSemantics): string {
    return `You are an advanced Excel AI assistant with deep understanding of spreadsheet data analysis. 

SPREADSHEET ANALYSIS:
- Data Type: ${semantics.dataType} (confidence: ${(semantics.confidence * 100).toFixed(1)}%)
- Structure: ${semantics.structure.headers.length} columns, ${semantics.structure.hasFormulas ? 'contains formulas' : 'no formulas'}
- Key Entities: ${semantics.keyEntities.join(', ')}
- Identified Patterns: ${semantics.patterns.map(p => p.description).join('; ')}

You excel at:
1. Understanding complex data relationships and patterns
2. Generating precise Excel formulas and functions
3. Providing actionable insights and recommendations
4. Explaining concepts in clear, user-friendly language
5. Adapting responses to user expertise level`;
  }

  private buildUserContext(userIntent: UserIntent, userQuery: string, selectionInfo: SelectionInfo): string {
    return `USER CONTEXT:
- Original Query: "${userQuery}"
- Primary Intent: ${userIntent.primary} (confidence: ${(userIntent.confidence * 100).toFixed(1)}%)
- Scope: ${userIntent.scope}
- Current Selection: ${selectionInfo.range} in sheet "${selectionInfo.sheet}"
- Extracted Entities: ${userIntent.entities.map(e => `${e.text} (${e.type})`).join(', ')}
- Specificity Level: ${userIntent.specificity}`;
  }

  private buildDataContext(contextData: ContextData, semantics: SpreadsheetSemantics): string {
    const sample = contextData.immediate?.selectedData?.slice(0, 5) || [];
    
    return `DATA CONTEXT:
Headers: ${semantics.structure.headers.map(h => `${h.name} (${h.semanticType})`).join(', ')}

Sample Data:
${sample.map((row, i) => `Row ${i + 1}: ${Array.isArray(row) ? row.map(cell => cell?.value || '').join(' | ') : row}`).join('\n')}

Data Characteristics:
${semantics.structure.headers.map(h => `- ${h.name}: ${h.dataType}, ${(h.nullPercentage * 100).toFixed(1)}% null, ${(h.uniqueness * 100).toFixed(1)}% unique`).join('\n')}`;
  }

  private buildTaskInstructions(userIntent: UserIntent, suggestedActions: SuggestedAction[]): string {
    return `TASK INSTRUCTIONS:
Primary Objective: ${userIntent.primary}
Scope: ${userIntent.scope}

Top Recommended Actions:
${suggestedActions.slice(0, 3).map((action, i) => 
  `${i + 1}. ${action.description}
   Formula: ${action.excelFormula || 'N/A'}
   Expected Result: ${action.expectedResult}`
).join('\n\n')}

Provide a comprehensive response that:
1. Directly addresses the user's query
2. Explains the relevant data and relationships
3. Provides specific Excel formulas when applicable
4. Offers additional insights or recommendations
5. Suggests next steps or related analyses`;
  }

  private buildExcelFormulasAndMethods(suggestedActions: SuggestedAction[], semantics: SpreadsheetSemantics): string {
    const formulas = suggestedActions
      .filter(action => action.excelFormula)
      .map(action => `${action.description}: ${action.excelFormula}`)
      .join('\n');

    return `EXCEL FORMULAS AND METHODS:
${formulas}

Available Functions for ${semantics.dataType} data:
- FILTER, SORT, UNIQUE for data manipulation
- VLOOKUP, XLOOKUP, INDEX/MATCH for lookups
- SUM, AVERAGE, COUNT, COUNTIF for aggregations
- IF, IFS, SWITCH for conditional logic
- CONCATENATE, TEXT, LEFT, RIGHT, MID for text manipulation
- TODAY, DATE, DATEDIF for date calculations
- PIVOT tables for complex analysis`;
  }

  // === UTILITY METHODS ===

  private calculateOverallConfidence(semantics: SpreadsheetSemantics, userIntent: UserIntent, actions: SuggestedAction[]): number {
    const semanticWeight = 0.3;
    const intentWeight = 0.4;
    const actionWeight = 0.3;
    
    const actionConfidence = actions.length > 0 ? 
      actions.reduce((sum, action) => sum + action.confidence, 0) / actions.length : 0.5;
    
    return semanticWeight * semantics.confidence + 
           intentWeight * userIntent.confidence + 
           actionWeight * actionConfidence;
  }

  private indexToColumn(index: number): string {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  }

  private calculateNullPercentage(data: any[]): number {
    const nullCount = data.filter(v => v === null || v === undefined || v === '').length;
    return data.length > 0 ? nullCount / data.length : 0;
  }

  private calculateUniqueness(data: any[]): number {
    const uniqueCount = new Set(data).size;
    return data.length > 0 ? uniqueCount / data.length : 0;
  }

  // Additional helper methods would be implemented here...
  // (Keeping the file manageable, but these would include all the missing implementations)

  private extractKeyEntities(headers: HeaderAnalysis[], contextData: ContextData): string[] {
    // Extract key entities from the data
    return [];
  }

  private identifyDataRelationships(headers: HeaderAnalysis[], contextData: ContextData): DataRelationship[] {
    return [];
  }

  private detectDataPatterns(contextData: ContextData): DataPattern[] {
    return [];
  }

  private calculateSemanticConfidence(dataType: string, headers: HeaderAnalysis[], patterns: DataPattern[]): number {
    return 0.8; // Placeholder
  }

  private identifyDataRegions(contextData: ContextData): DataRegion[] {
    return [];
  }

  private identifyCalculatedFields(contextData: ContextData): CalculatedField[] {
    return [];
  }

  private identifySummaryAreas(contextData: ContextData): SummaryArea[] {
    return [];
  }

  private detectPivotStructure(contextData: ContextData): boolean {
    return false;
  }

  private hasFormulas(contextData: ContextData): boolean {
    return false;
  }

  private analyzeDataCharacteristics(contextData: ContextData): any {
    return {};
  }

  private determineSecondaryIntents(userQuery: string, primary: UserIntent['primary']): string[] {
    return [];
  }

  private determineQueryScope(userQuery: string, selectionInfo: SelectionInfo, semantics: SpreadsheetSemantics): UserIntent['scope'] {
    return 'current_selection';
  }

  private determineSpecificity(userQuery: string, entities: ExtractedEntity[]): UserIntent['specificity'] {
    return entities.length > 0 ? 'specific_item' : 'general';
  }

  private analyzeTemporalContext(userQuery: string, semantics: SpreadsheetSemantics): TemporalContext {
    return {
      hasTimeElement: false,
      timeframe: 'current',
      specificDates: [],
      relativeDates: []
    };
  }

  private calculateIntentConfidence(primary: UserIntent['primary'], entities: ExtractedEntity[], scope: UserIntent['scope']): number {
    return 0.8;
  }

  private inferEntityType(entity: string, semantics: SpreadsheetSemantics): ExtractedEntity['type'] {
    return 'identifier';
  }

  private findEntityColumn(entity: string, semantics: SpreadsheetSemantics): string | null {
    return null;
  }

  private generateAnalyzeActions(userIntent: UserIntent, semantics: SpreadsheetSemantics, selectionInfo: SelectionInfo): SuggestedAction[] {
    return [];
  }

  private generateCompareActions(userIntent: UserIntent, semantics: SpreadsheetSemantics, selectionInfo: SelectionInfo): SuggestedAction[] {
    return [];
  }

  private generateSummarizeActions(userIntent: UserIntent, semantics: SpreadsheetSemantics, selectionInfo: SelectionInfo): SuggestedAction[] {
    return [];
  }

  private generateGeneralActions(userIntent: UserIntent, semantics: SpreadsheetSemantics, selectionInfo: SelectionInfo): SuggestedAction[] {
    return [];
  }

  private buildConstraintsAndGuidelines(semantics: SpreadsheetSemantics, userIntent: UserIntent): string {
    return `CONSTRAINTS AND GUIDELINES:
- Provide accurate, data-driven responses
- Use precise Excel formulas with correct syntax
- Explain technical concepts in accessible language
- Focus on actionable insights and recommendations
- Maintain consistency with the identified data type (${semantics.dataType})`;
  }

  private buildExpectedOutputFormat(userIntent: UserIntent): string {
    return `EXPECTED OUTPUT FORMAT:
1. Direct answer to the user's question
2. Relevant data insights and context
3. Specific Excel formulas (if applicable)
4. Step-by-step instructions (if needed)
5. Additional recommendations or next steps
6. Clear, professional, and helpful tone throughout`;
  }

  private buildFallbackStrategies(userIntent: UserIntent, semantics: SpreadsheetSemantics): string[] {
    return [
      "If data is insufficient, explain what additional data would be helpful",
      "If formulas are complex, break them down into simpler steps",
      "If multiple interpretations exist, present the most likely options",
      "Always provide educational value even if the exact answer isn't available"
    ];
  }
}
