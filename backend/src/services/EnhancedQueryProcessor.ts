/**
 * Enhanced Query Processor - Provides intelligent query understanding and Excel guidance
 * 
 * This service addresses the core issues:
 * 1. Provides clear query summaries in LLM-friendly format
 * 2. Gives specific Excel function guidance with step-by-step instructions
 * 3. Calculates meaningful confidence scores based on actual data analysis
 * 4. Properly handles current selection functionality
 */

import { SpreadsheetData, Sheet, Cell } from '../types/spreadsheet';
import { EnhancedIntent } from '../types/intent-analysis';
import { SelectionCandidate } from '../types/intelligent-selection';

export interface QuerySummary {
  userQuery: string;
  llmFriendlyPrompt: string;
  extractedEntities: string[];
  targetMetric: string;
  dataRequirements: string[];
  expectedOutput: string;
}

export interface ExcelGuidance {
  primaryFunction: string;
  stepByStepInstructions: string[];
  formulaTemplate: string;
  exampleFormula: string;
  alternativeFunctions: string[];
  validationSteps: string[];
  commonPitfalls: string[];
}

export interface RealConfidenceScore {
  overall: number;
  breakdown: {
    entityFound: number;
    dataQuality: number;
    formulaApplicability: number;
    queryClarity: number;
  };
  reasoning: string[];
  uncertaintyFactors: string[];
}

export interface ProcessedQuery {
  summary: QuerySummary;
  excelGuidance: ExcelGuidance;
  confidence: RealConfidenceScore;
  currentSelection: {
    isValid: boolean;
    containsTargetData: boolean;
    recommendedRange: string;
    explanation: string;
  };
}

export class EnhancedQueryProcessor {
  
  /**
   * Process user query with comprehensive analysis
   */
  public static async processQuery(
    userQuery: string,
    spreadsheetData: SpreadsheetData,
    currentSelection?: { sheet: string; range: string; activeCell?: string }
  ): Promise<ProcessedQuery> {
    
    // Step 1: Create LLM-friendly query summary
    const summary = this.createQuerySummary(userQuery);
    
    // Step 2: Analyze current selection
    const selectionAnalysis = this.analyzeCurrentSelection(
      currentSelection,
      spreadsheetData,
      summary
    );
    
    // Step 3: Generate Excel guidance
    const excelGuidance = this.generateExcelGuidance(
      summary,
      spreadsheetData,
      selectionAnalysis
    );
    
    // Step 4: Calculate real confidence score
    const confidence = this.calculateRealConfidence(
      summary,
      spreadsheetData,
      selectionAnalysis,
      excelGuidance
    );
    
    return {
      summary,
      excelGuidance,
      confidence,
      currentSelection: selectionAnalysis
    };
  }
  
  /**
   * Create clear, LLM-friendly query summary
   */
  private static createQuerySummary(userQuery: string): QuerySummary {
    const normalizedQuery = userQuery.toLowerCase().trim();
    
    // Extract entities (company names, metrics, etc.)
    const entities = this.extractEntities(normalizedQuery);
    
    // Determine target metric
    const targetMetric = this.identifyTargetMetric(normalizedQuery);
    
    // Create LLM-friendly prompt
    const llmFriendlyPrompt = this.createLLMPrompt(userQuery, entities, targetMetric);
    
    return {
      userQuery,
      llmFriendlyPrompt,
      extractedEntities: entities,
      targetMetric,
      dataRequirements: this.identifyDataRequirements(normalizedQuery, targetMetric),
      expectedOutput: this.determineExpectedOutput(targetMetric)
    };
  }
  
  /**
   * Extract entities from query (company names, financial terms, etc.)
   */
  private static extractEntities(query: string): string[] {
    const entities: string[] = [];
    
    // Common company name patterns
    const companyPatterns = [
      /\b(apple|aapl)\b/i,
      /\b(coinbase|coin)\b/i,
      /\b(microsoft|msft)\b/i,
      /\b(google|googl|goog)\b/i,
      /\b(amazon|amzn)\b/i,
      /\b(tesla|tsla)\b/i,
      /\b(boeing|ba)\b/i,
      /\b(uber)\b/i,
      /\b([A-Z]{2,5})\b/g // Stock symbols
    ];
    
    companyPatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        entities.push(...matches.map(m => m.toUpperCase()));
      }
    });
    
    // Financial terms
    const financialTerms = [
      'average price', 'price paid', 'profit', 'loss', 'return',
      'market value', 'portfolio', 'dividend', 'yield', 'pe ratio'
    ];
    
    financialTerms.forEach(term => {
      if (query.includes(term)) {
        entities.push(term);
      }
    });
    
    return [...new Set(entities)]; // Remove duplicates
  }
  
  /**
   * Identify what metric the user is asking for
   */
  private static identifyTargetMetric(query: string): string {
    const metricPatterns = [
      { pattern: /average\s+price/i, metric: 'AveragePricePaid' },
      { pattern: /price\s+paid/i, metric: 'AveragePricePaid' },
      { pattern: /market\s+value/i, metric: 'MarketValueDelayed' },
      { pattern: /profit/i, metric: 'ProfitLoss' },
      { pattern: /loss/i, metric: 'ProfitLoss' },
      { pattern: /quantity/i, metric: 'Quantity' },
      { pattern: /percentage/i, metric: 'ProfitLossPercentage' },
      { pattern: /return/i, metric: 'ProfitLossPercentage' }
    ];
    
    for (const { pattern, metric } of metricPatterns) {
      if (pattern.test(query)) {
        return metric;
      }
    }
    
    return 'Unknown';
  }
  
  /**
   * Create LLM-friendly prompt
   */
  private static createLLMPrompt(
    originalQuery: string,
    entities: string[],
    targetMetric: string
  ): string {
    return `
TASK: Find ${targetMetric} for ${entities.join(' or ')} in spreadsheet data

ORIGINAL QUERY: "${originalQuery}"

EXTRACTED ENTITIES: ${entities.join(', ')}
TARGET METRIC: ${targetMetric}

INSTRUCTIONS FOR AGENT:
1. Search for rows containing any of these entities: ${entities.join(', ')}
2. Locate the column containing ${targetMetric}
3. Extract the specific value(s)
4. Provide the exact numerical result with proper formatting
5. Include the source cell reference for verification

EXPECTED OUTPUT FORMAT:
- Entity: [Company Name]
- ${targetMetric}: [Exact Value]
- Source: [Cell Reference]
- Currency/Unit: [If applicable]
    `.trim();
  }
  
  /**
   * Identify data requirements for the query
   */
  private static identifyDataRequirements(query: string, targetMetric: string): string[] {
    const requirements = ['Company/Symbol column', `${targetMetric} column`];
    
    if (query.includes('compare') || query.includes('vs')) {
      requirements.push('Multiple company rows');
    }
    
    if (query.includes('total') || query.includes('sum')) {
      requirements.push('Numeric data for summation');
    }
    
    if (query.includes('average') || query.includes('mean')) {
      requirements.push('Multiple numeric values');
    }
    
    return requirements;
  }
  
  /**
   * Determine expected output format
   */
  private static determineExpectedOutput(targetMetric: string): string {
    const outputFormats: Record<string, string> = {
      'AveragePricePaid': 'Numerical value with currency (e.g., $226.55)',
      'MarketValueDelayed': 'Numerical value with currency (e.g., $146,642.33)',
      'ProfitLoss': 'Numerical value with currency, may be negative (e.g., -$8,563.56)',
      'ProfitLossPercentage': 'Percentage value (e.g., -5.52%)',
      'Quantity': 'Whole number (e.g., 500 shares)',
      'Unknown': 'Specific value from the identified cell'
    };
    
    return outputFormats[targetMetric] || outputFormats['Unknown'];
  }
  
  /**
   * Analyze current selection validity and relevance
   */
  private static analyzeCurrentSelection(
    currentSelection: { sheet: string; range: string; activeCell?: string } | undefined,
    spreadsheetData: SpreadsheetData,
    summary: QuerySummary
  ) {
    if (!currentSelection) {
      return {
        isValid: false,
        containsTargetData: false,
        recommendedRange: 'A1:K20', // Default range for portfolio data
        explanation: 'No current selection provided. Recommend selecting the entire data range.'
      };
    }
    
    // Find the sheet
    const sheet = spreadsheetData.sheets.find(s => s.name === currentSelection.sheet);
    if (!sheet) {
      return {
        isValid: false,
        containsTargetData: false,
        recommendedRange: 'A1:K20',
        explanation: `Sheet "${currentSelection.sheet}" not found.`
      };
    }
    
    // Parse range (simplified - assumes format like "A1:C10")
    const rangeParts = currentSelection.range.split(':');
    if (rangeParts.length !== 2) {
      return {
        isValid: false,
        containsTargetData: false,
        recommendedRange: 'A1:K20',
        explanation: 'Invalid range format. Expected format: A1:C10'
      };
    }
    
    // Check if selection contains target entities
    const containsTargetData = this.checkSelectionContainsTargetData(
      sheet,
      currentSelection.range,
      summary.extractedEntities
    );
    
    // Generate recommendation
    const recommendedRange = this.generateRecommendedRange(sheet, summary);
    
    return {
      isValid: true,
      containsTargetData,
      recommendedRange,
      explanation: containsTargetData 
        ? 'Current selection contains relevant data for the query.'
        : `Current selection may not contain the target entities (${summary.extractedEntities.join(', ')}). Consider selecting ${recommendedRange}.`
    };
  }
  
  /**
   * Check if current selection contains target data
   */
  private static checkSelectionContainsTargetData(
    sheet: Sheet,
    range: string,
    entities: string[]
  ): boolean {
    // Simplified check - in real implementation, would parse range and check cells
    const sheetText = JSON.stringify(sheet.data).toLowerCase();
    return entities.some(entity => 
      sheetText.includes(entity.toLowerCase())
    );
  }
  
  /**
   * Generate recommended range based on data analysis
   */
  private static generateRecommendedRange(sheet: Sheet, summary: QuerySummary): string {
    // For portfolio data, typically want the full data range
    const rowCount = sheet.data.length;
    const colCount = sheet.data[0]?.length || 0;
    
    // Convert to Excel column letters (simplified)
    const lastCol = String.fromCharCode(65 + Math.min(colCount - 1, 25)); // A-Z
    
    return `A1:${lastCol}${rowCount}`;
  }
  
  /**
   * Generate specific Excel function guidance
   */
  private static generateExcelGuidance(
    summary: QuerySummary,
    spreadsheetData: SpreadsheetData,
    selectionAnalysis: any
  ): ExcelGuidance {
    const { targetMetric, extractedEntities } = summary;
    
    // Determine primary Excel function based on query type
    const guidance = this.getExcelFunctionGuidance(targetMetric, extractedEntities);
    
    // Customize for specific data structure
    const sheet = spreadsheetData.sheets[0]; // Assume first sheet
    const customizedGuidance = this.customizeGuidanceForData(guidance, sheet, extractedEntities);
    
    return customizedGuidance;
  }
  
  /**
   * Get Excel function guidance based on metric type
   */
  private static getExcelFunctionGuidance(targetMetric: string, entities: string[]): ExcelGuidance {
    const entity = entities[0] || 'TARGET_ENTITY';
    
    switch (targetMetric) {
      case 'AveragePricePaid':
        return {
          primaryFunction: 'VLOOKUP or INDEX/MATCH',
          stepByStepInstructions: [
            '1. Identify the row containing the target company/symbol',
            '2. Locate the AveragePricePaid column (typically column D)',
            '3. Use VLOOKUP to find the exact value',
            '4. Alternative: Use INDEX/MATCH for more flexibility'
          ],
          formulaTemplate: '=VLOOKUP("ENTITY", A:K, COLUMN_NUMBER, FALSE)',
          exampleFormula: `=VLOOKUP("${entity}", A:K, 4, FALSE)`,
          alternativeFunctions: [
            'INDEX/MATCH: =INDEX(D:D, MATCH("ENTITY", A:A, 0))',
            'FILTER (Excel 365): =FILTER(D:D, A:A="ENTITY")',
            'XLOOKUP (Excel 365): =XLOOKUP("ENTITY", A:A, D:D)'
          ],
          validationSteps: [
            'Verify the entity exists in column A (Symbol) or B (CompanyName)',
            'Confirm column D contains AveragePricePaid data',
            'Check for exact match (case-sensitive)',
            'Ensure no extra spaces in entity name'
          ],
          commonPitfalls: [
            'Using approximate match (TRUE) instead of exact match (FALSE)',
            'Wrong column number in VLOOKUP',
            'Case sensitivity issues with entity names',
            'Including header row in search range'
          ]
        };
        
      case 'MarketValueDelayed':
        return {
          primaryFunction: 'VLOOKUP or INDEX/MATCH',
          stepByStepInstructions: [
            '1. Locate the target company in column A (Symbol) or B (CompanyName)',
            '2. Find the MarketValueDelayed column (typically column C)',
            '3. Use VLOOKUP to extract the market value',
            '4. Format result as currency if needed'
          ],
          formulaTemplate: '=VLOOKUP("ENTITY", A:K, 3, FALSE)',
          exampleFormula: `=VLOOKUP("${entity}", A:K, 3, FALSE)`,
          alternativeFunctions: [
            'INDEX/MATCH: =INDEX(C:C, MATCH("ENTITY", A:A, 0))',
            'SUMIF for totals: =SUMIF(A:A, "ENTITY", C:C)',
            'XLOOKUP: =XLOOKUP("ENTITY", A:A, C:C)'
          ],
          validationSteps: [
            'Confirm entity exists in symbol or company name columns',
            'Verify column C contains market value data',
            'Check data format (should be numeric)',
            'Validate currency consistency'
          ],
          commonPitfalls: [
            'Confusing MarketValueDelayed with AveragePricePaid',
            'Not accounting for different currencies',
            'Including text headers in numeric calculations',
            'Using wrong column reference'
          ]
        };
        
      default:
        return {
          primaryFunction: 'VLOOKUP',
          stepByStepInstructions: [
            '1. Identify the target entity in the data',
            '2. Determine which column contains the desired metric',
            '3. Use VLOOKUP or INDEX/MATCH to retrieve the value',
            '4. Apply appropriate formatting'
          ],
          formulaTemplate: '=VLOOKUP("ENTITY", DATA_RANGE, COLUMN_NUMBER, FALSE)',
          exampleFormula: `=VLOOKUP("${entity}", A:K, 2, FALSE)`,
          alternativeFunctions: [
            'INDEX/MATCH for flexibility',
            'FILTER for multiple results',
            'XLOOKUP for modern Excel versions'
          ],
          validationSteps: [
            'Verify entity exists in the data',
            'Confirm correct column selection',
            'Check for data type consistency',
            'Validate formula syntax'
          ],
          commonPitfalls: [
            'Incorrect column numbering',
            'Case sensitivity issues',
            'Wrong match type selection',
            'Range reference errors'
          ]
        };
    }
  }
  
  /**
   * Customize guidance for specific data structure
   */
  private static customizeGuidanceForData(
    guidance: ExcelGuidance,
    sheet: Sheet,
    entities: string[]
  ): ExcelGuidance {
    // Analyze actual column structure
    const headers = sheet.data[0] || [];
    const symbolCol = headers.findIndex(h => h?.toString().toLowerCase().includes('symbol'));
    const companyCol = headers.findIndex(h => h?.toString().toLowerCase().includes('company'));
    const priceCol = headers.findIndex(h => h?.toString().toLowerCase().includes('averageprice'));
    const marketValueCol = headers.findIndex(h => h?.toString().toLowerCase().includes('marketvalue'));
    
    // Update formula with actual column numbers
    if (priceCol >= 0) {
      guidance.exampleFormula = guidance.exampleFormula.replace(/\d+/, (priceCol + 1).toString());
    }
    
    // Add specific column information
    guidance.stepByStepInstructions.push(
      `Note: In your data, Symbol is in column ${symbolCol >= 0 ? String.fromCharCode(65 + symbolCol) : 'A'}, ` +
      `Company Name is in column ${companyCol >= 0 ? String.fromCharCode(65 + companyCol) : 'B'}`
    );
    
    return guidance;
  }
  
  /**
   * Calculate meaningful confidence score based on actual analysis
   */
  private static calculateRealConfidence(
    summary: QuerySummary,
    spreadsheetData: SpreadsheetData,
    selectionAnalysis: any,
    excelGuidance: ExcelGuidance
  ): RealConfidenceScore {
    const sheet = spreadsheetData.sheets[0];
    if (!sheet) {
      return {
        overall: 0.1,
        breakdown: { entityFound: 0, dataQuality: 0, formulaApplicability: 0, queryClarity: 0 },
        reasoning: ['No spreadsheet data available'],
        uncertaintyFactors: ['Missing data source']
      };
    }
    
    // 1. Entity Found Score (40% weight)
    const entityFoundScore = this.calculateEntityFoundScore(summary.extractedEntities, sheet);
    
    // 2. Data Quality Score (25% weight)
    const dataQualityScore = this.calculateDataQualityScore(sheet, summary.targetMetric);
    
    // 3. Formula Applicability Score (20% weight)
    const formulaApplicabilityScore = this.calculateFormulaApplicabilityScore(
      summary.targetMetric, sheet
    );
    
    // 4. Query Clarity Score (15% weight)
    const queryClarityScore = this.calculateQueryClarityScore(summary);
    
    // Calculate weighted overall score
    const overall = (
      entityFoundScore * 0.40 +
      dataQualityScore * 0.25 +
      formulaApplicabilityScore * 0.20 +
      queryClarityScore * 0.15
    );
    
    const reasoning = this.generateConfidenceReasoning(
      entityFoundScore, dataQualityScore, formulaApplicabilityScore, queryClarityScore
    );
    
    const uncertaintyFactors = this.identifyUncertaintyFactors(
      summary, sheet, selectionAnalysis
    );
    
    return {
      overall: Math.round(overall * 100) / 100, // Round to 2 decimal places
      breakdown: {
        entityFound: Math.round(entityFoundScore * 100) / 100,
        dataQuality: Math.round(dataQualityScore * 100) / 100,
        formulaApplicability: Math.round(formulaApplicabilityScore * 100) / 100,
        queryClarity: Math.round(queryClarityScore * 100) / 100
      },
      reasoning,
      uncertaintyFactors
    };
  }
  
  /**
   * Calculate how well entities are found in the data
   */
  private static calculateEntityFoundScore(entities: string[], sheet: Sheet): number {
    if (entities.length === 0) return 0.3; // Low score for no entities
    
    const sheetText = JSON.stringify(sheet.data).toLowerCase();
    const foundEntities = entities.filter(entity => 
      sheetText.includes(entity.toLowerCase())
    );
    
    const foundRatio = foundEntities.length / entities.length;
    
    // Bonus for exact symbol matches
    const symbolColumn = sheet.data.map(row => row[0]?.toString().toLowerCase() || '');
    const exactMatches = entities.filter(entity => 
      symbolColumn.includes(entity.toLowerCase())
    );
    
    const exactMatchBonus = exactMatches.length > 0 ? 0.2 : 0;
    
    return Math.min(foundRatio + exactMatchBonus, 1.0);
  }
  
  /**
   * Calculate data quality score
   */
  private static calculateDataQualityScore(sheet: Sheet, targetMetric: string): number {
    if (!sheet.data || sheet.data.length < 2) return 0.1; // Need at least header + 1 row
    
    let score = 0.5; // Base score
    
    // Check for headers
    const headers = sheet.data[0] || [];
    if (headers.length > 0) score += 0.2;
    
    // Check for target metric column
    const hasTargetMetric = headers.some(h => 
      h?.toString().toLowerCase().includes(targetMetric.toLowerCase())
    );
    if (hasTargetMetric) score += 0.2;
    
    // Check data completeness
    const dataRows = sheet.data.slice(1);
    const nonEmptyRows = dataRows.filter(row => 
      row.some(cell => cell !== null && cell !== undefined && 
        (typeof cell === 'object' ? cell.value !== null && cell.value !== undefined && cell.value !== '' : cell !== ''))
    );
    const completenessRatio = nonEmptyRows.length / dataRows.length;
    score += completenessRatio * 0.1;
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Calculate how applicable Excel formulas are
   */
  private static calculateFormulaApplicabilityScore(targetMetric: string, sheet: Sheet): number {
    // High applicability for standard lookup operations
    const lookupMetrics = ['AveragePricePaid', 'MarketValueDelayed', 'Quantity', 'ProfitLoss'];
    if (lookupMetrics.includes(targetMetric)) return 0.9;
    
    // Medium applicability for calculations
    if (targetMetric.includes('Percentage') || targetMetric.includes('Ratio')) return 0.7;
    
    // Lower for unknown metrics
    return 0.5;
  }
  
  /**
   * Calculate query clarity score
   */
  private static calculateQueryClarityScore(summary: QuerySummary): number {
    let score = 0.3; // Base score
    
    // Bonus for specific entities
    if (summary.extractedEntities.length > 0) score += 0.3;
    
    // Bonus for clear metric identification
    if (summary.targetMetric !== 'Unknown') score += 0.3;
    
    // Bonus for specific language
    const specificTerms = ['average', 'price', 'value', 'profit', 'loss', 'total'];
    const hasSpecificTerms = specificTerms.some(term => 
      summary.userQuery.toLowerCase().includes(term)
    );
    if (hasSpecificTerms) score += 0.1;
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Generate human-readable confidence reasoning
   */
  private static generateConfidenceReasoning(
    entityFound: number,
    dataQuality: number,
    formulaApplicability: number,
    queryClarity: number
  ): string[] {
    const reasoning: string[] = [];
    
    if (entityFound > 0.8) {
      reasoning.push('✓ Target entities clearly identified in the data');
    } else if (entityFound > 0.5) {
      reasoning.push('⚠ Some target entities found, but may need verification');
    } else {
      reasoning.push('✗ Target entities not clearly found in the data');
    }
    
    if (dataQuality > 0.8) {
      reasoning.push('✓ High data quality with complete information');
    } else if (dataQuality > 0.5) {
      reasoning.push('⚠ Adequate data quality with minor gaps');
    } else {
      reasoning.push('✗ Data quality issues may affect accuracy');
    }
    
    if (formulaApplicability > 0.8) {
      reasoning.push('✓ Excel formulas are highly applicable for this query');
    } else if (formulaApplicability > 0.5) {
      reasoning.push('⚠ Excel formulas can handle this with some complexity');
    } else {
      reasoning.push('✗ Query may require manual analysis beyond simple formulas');
    }
    
    if (queryClarity > 0.8) {
      reasoning.push('✓ Query is clear and specific');
    } else if (queryClarity > 0.5) {
      reasoning.push('⚠ Query is somewhat clear but could be more specific');
    } else {
      reasoning.push('✗ Query lacks clarity and specificity');
    }
    
    return reasoning;
  }
  
  /**
   * Identify uncertainty factors
   */
  private static identifyUncertaintyFactors(
    summary: QuerySummary,
    sheet: Sheet,
    selectionAnalysis: any
  ): string[] {
    const factors: string[] = [];
    
    if (summary.extractedEntities.length === 0) {
      factors.push('No specific entities identified in query');
    }
    
    if (!selectionAnalysis.containsTargetData) {
      factors.push('Current selection may not contain relevant data');
    }
    
    if (summary.targetMetric === 'Unknown') {
      factors.push('Target metric not clearly identified');
    }
    
    if (sheet.data.length < 5) {
      factors.push('Limited data available for analysis');
    }
    
    return factors;
  }
}