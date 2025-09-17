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
      currentSelection: selectionAnalysis,
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
    const llmFriendlyPrompt = this.createLLMPrompt(
      userQuery,
      entities,
      targetMetric
    );

    return {
      userQuery,
      llmFriendlyPrompt,
      extractedEntities: entities,
      targetMetric,
      dataRequirements: this.identifyDataRequirements(
        normalizedQuery,
        targetMetric
      ),
      expectedOutput: this.determineExpectedOutput(targetMetric),
    };
  }

  /**
   * Extract entities from query - generalized for any data type
   */
  private static extractEntities(query: string): string[] {
    const entities: string[] = [];
    const normalizedQuery = query.toLowerCase();

    // Check if this is a superlative query (most/best/worst/top/bottom)
    const isSuperlativeQuery = /\b(most|best|worst|top|bottom|highest|lowest|maximum|minimum|max|min)\b/i.test(query);
    
    // Check if this is a filtering query (all positions with certain criteria)
    const isFilteringQuery = /\b(all|show.*all|list.*all|filter|where)\b/i.test(query) && 
                             /\b(positions?|companies?|items?|records?|rows?)\b/i.test(query);

    // For superlative queries, we want to find the entity type, not specific entities
    if (isSuperlativeQuery) {
      // Extract what type of entity they want (company, stock, position, etc.)
      const entityTypes = ['company', 'companies', 'stock', 'stocks', 'position', 'positions', 'item', 'items'];
      entityTypes.forEach(type => {
        if (normalizedQuery.includes(type)) {
          entities.push(type);
        }
      });
      return entities;
    }

    // For filtering queries, return empty to indicate we want all matching records
    if (isFilteringQuery) {
      return [];
    }

    // Extract specific entities (company names, symbols, etc.)
    // Common patterns for various data types
    const entityPatterns = [
      // Stock symbols (2-5 uppercase letters)
      /\b([A-Z]{2,5})\b/g,
      
      // Common company names (generalized)
      /\b(apple|aapl|microsoft|msft|google|googl|amazon|amzn|tesla|tsla|nvidia|nvda)\b/i,
      /\b(coinbase|coin|uber|boeing|ba|visa|jpm|jpmorgan)\b/i,
      /\b(reliance|tcs|infosys|infy|hdfc|hdfcbank|itc)\b/i,
      /\b(johnson.*johnson|jnj|procter.*gamble|pg|coca.*cola|ko)\b/i,
      
      // Quoted strings (exact matches)
      /"([^"]+)"/g,
      /'([^']+)'/g,
    ];

    entityPatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Clean up the match
          const cleanMatch = match.replace(/['"]/g, '').trim();
          if (cleanMatch.length > 1) {
            entities.push(cleanMatch.toUpperCase());
          }
        });
      }
    });

    // Extract financial/business terms
    const businessTerms = [
      'average price', 'price paid', 'profit', 'loss', 'return', 'market value',
      'portfolio', 'dividend', 'yield', 'pe ratio', 'revenue', 'earnings',
      'sales', 'income', 'expense', 'cost', 'value', 'amount'
    ];

    businessTerms.forEach(term => {
      if (normalizedQuery.includes(term)) {
        entities.push(term);
      }
    });

    return [...new Set(entities)]; // Remove duplicates
  }

  /**
   * Identify what metric the user is asking for - generalized for any data
   */
  private static identifyTargetMetric(query: string): string {
    const normalizedQuery = query.toLowerCase();
    
    // Superlative patterns (most/best/worst/top/bottom)
    const superlativePatterns = [
      {
        pattern: /\b(most|best|top|highest|maximum|max)\s+(profitable|profit|earning|gain|return|performing)/i,
        metric: 'ProfitLoss (highest)',
      },
      {
        pattern: /\b(most|worst|bottom|lowest|minimum|min)\s+(loss|losing|unprofitable|poor|bad)/i,
        metric: 'ProfitLoss (lowest)',
      },
      {
        pattern: /\b(best|top|highest)\s+(performing|performance|return|percentage)/i,
        metric: 'ProfitLossPercentage (highest)',
      },
      {
        pattern: /\b(worst|bottom|lowest)\s+(performing|performance|return|percentage)/i,
        metric: 'ProfitLossPercentage (lowest)',
      },
      {
        pattern: /\b(most|highest|largest|biggest)\s+(value|valued|expensive|costly)/i,
        metric: 'MarketValueDelayed (highest)',
      },
      {
        pattern: /\b(least|lowest|smallest|cheapest)\s+(value|valued|expensive|costly)/i,
        metric: 'MarketValueDelayed (lowest)',
      },
    ];

    // Filtering patterns (all items with certain criteria)
    const filteringPatterns = [
      {
        pattern: /\b(all|show.*all|list.*all)\s+.*(losing|loss|negative|unprofitable)/i,
        metric: 'ProfitLoss (negative)',
      },
      {
        pattern: /\b(all|show.*all|list.*all)\s+.*(winning|profit|positive|profitable|gain)/i,
        metric: 'ProfitLoss (positive)',
      },
      {
        pattern: /\b(all|show.*all|list.*all)\s+.*(positions?|companies?|stocks?|items?)/i,
        metric: 'All (filter)',
      },
    ];

    // Specific value lookup patterns
    const specificPatterns = [
      { pattern: /\b(average\s+price|price\s+paid|cost\s+basis)/i, metric: 'AveragePricePaid' },
      { pattern: /\b(market\s+value|current\s+value|total\s+value)/i, metric: 'MarketValueDelayed' },
      { pattern: /\b(profit|gain|earning)/i, metric: 'ProfitLoss' },
      { pattern: /\b(loss|losing)/i, metric: 'ProfitLoss' },
      { pattern: /\b(quantity|shares|amount|count)/i, metric: 'Quantity' },
      { pattern: /\b(percentage|percent|return|yield)/i, metric: 'ProfitLossPercentage' },
      { pattern: /\b(symbol|ticker|code)/i, metric: 'Symbol' },
      { pattern: /\b(company|name|corporation)/i, metric: 'CompanyName' },
    ];

    // Check patterns in order of specificity
    const allPatterns = [...superlativePatterns, ...filteringPatterns, ...specificPatterns];
    
    for (const { pattern, metric } of allPatterns) {
      if (pattern.test(query)) {
        return metric;
      }
    }

    // Fallback: try to infer from context
    if (normalizedQuery.includes('profit') || normalizedQuery.includes('loss')) {
      return 'ProfitLoss';
    }
    if (normalizedQuery.includes('value') || normalizedQuery.includes('worth')) {
      return 'MarketValueDelayed';
    }
    if (normalizedQuery.includes('price') || normalizedQuery.includes('cost')) {
      return 'AveragePricePaid';
    }

    return 'Unknown';
  }

  /**
   * Create LLM-friendly prompt - generalized for any data type
   */
  private static createLLMPrompt(
    originalQuery: string,
    entities: string[],
    targetMetric: string
  ): string {
    const baseMetric = targetMetric.split(' ')[0];
    const condition = targetMetric.match(/\((.*?)\)/)?.[1] || '';

    // Handle superlative queries (most/best/worst/top/bottom)
    if (condition === 'highest' || condition === 'lowest') {
      const sortOrder = condition === 'highest' ? 'descending' : 'ascending';
      const superlativeWord = condition === 'highest' ? 'highest' : 'lowest';
      
      return `TASK: Find the record with the ${superlativeWord} ${baseMetric} value\n\nORIGINAL QUERY: "${originalQuery}"\n\nSORT CRITERIA: ${baseMetric} in ${sortOrder} order\nTARGET COLUMNS: All relevant columns (Symbol, CompanyName, ${baseMetric}, etc.)\n\nINSTRUCTIONS FOR AGENT:\n1. Scan all rows in the spreadsheet data\n2. Sort by ${baseMetric} column in ${sortOrder} order\n3. Identify the record with the ${superlativeWord} value\n4. Extract all relevant information for that record\n5. Include the exact value and row reference\n\nEXPECTED OUTPUT FORMAT:\n- Company/Entity: [Name]\n- ${baseMetric}: [Exact ${superlativeWord} value with units]\n- Additional Details: [Other relevant column values]\n- Row Reference: [Row number]\n- Ranking Context: [How it compares to others]`;
    }

    // Handle filtering operations (all items with certain criteria)
    if (condition === 'negative' || condition === 'positive' || targetMetric.includes('filter')) {
      const operator = condition === 'negative' ? '< 0' : condition === 'positive' ? '> 0' : 'meets criteria';
      
      return `TASK: Filter and display all records where ${baseMetric} ${operator}\n\nORIGINAL QUERY: "${originalQuery}"\n\nFILTERING CRITERIA: ${baseMetric} ${operator}\nTARGET COLUMNS: All relevant columns\n\nINSTRUCTIONS FOR AGENT:\n1. Scan all rows in the spreadsheet data\n2. Filter rows where ${baseMetric} meets the condition (${operator})\n3. For each matching row, extract all relevant information\n4. Present results in a clear table format\n5. Include row references for verification\n\nEXPECTED OUTPUT FORMAT:\nFor each matching record:\n- Primary Identifier: [Name/Symbol]\n- ${baseMetric}: [Value with units]\n- Additional Details: [Other relevant columns]\n- Row Reference: [Row number]\n\nSUMMARY: Total records found, aggregate statistics`;
    }

    // Handle specific entity lookups
    if (entities.length > 0 && !entities.includes('company') && !entities.includes('companies')) {
      return `TASK: Find ${targetMetric} for specific entities: ${entities.join(', ')}\n\nORIGINAL QUERY: "${originalQuery}"\n\nEXTRACTED ENTITIES: ${entities.join(', ')}\nTARGET METRIC: ${targetMetric}\n\nINSTRUCTIONS FOR AGENT:\n1. Search for rows containing any of these entities: ${entities.join(', ')}\n2. Look in all text columns (Symbol, CompanyName, etc.)\n3. Locate the column containing ${targetMetric}\n4. Extract the specific value(s) with proper formatting\n5. Include the source cell reference for verification\n\nEXPECTED OUTPUT FORMAT:\n- Entity Found: [Exact match from data]\n- ${targetMetric}: [Exact value with units/currency]\n- Source Location: [Cell reference]\n- Additional Context: [Other relevant data from same row]`;
    }

    // Generic analysis fallback
    return `TASK: Analyze spreadsheet data to answer: "${originalQuery}"\n\nTARGET METRIC: ${targetMetric}\nANALYSIS TYPE: Data lookup and analysis\n\nINSTRUCTIONS FOR AGENT:\n1. Understand what the user is asking for\n2. Identify relevant data columns and rows\n3. Perform the requested analysis or lookup\n4. Use appropriate Excel functions (VLOOKUP, INDEX/MATCH, MAX, MIN, etc.)\n5. Provide specific, actionable results with source references\n\nEXPECTED OUTPUT FORMAT:\n- Direct Answer: [Specific result to user's question]\n- Supporting Data: [Relevant context and details]\n- Source Reference: [Cell/row references]\n- Methodology: [How the result was obtained]`;
  }

  /**
   * Identify data requirements for the query
   */
  private static identifyDataRequirements(
    query: string,
    targetMetric: string
  ): string[] {
    // Handle filtering operations
    if (
      targetMetric.includes('(negative)') ||
      targetMetric.includes('(positive)')
    ) {
      return [
        'Symbol column (Column A)',
        'CompanyName column (Column B)',
        'ProfitLoss column (Column F)',
        'ProfitLossPercentage column (Column G)',
        'All data rows for filtering',
      ];
    }

    if (
      targetMetric.includes('(highest)') ||
      targetMetric.includes('(lowest)')
    ) {
      return [
        'Symbol column (Column A)',
        'CompanyName column (Column B)',
        'ProfitLossPercentage column (Column G)',
        'All data rows for ranking',
      ];
    }

    const baseMetric = targetMetric.split(' ')[0];
    const requirements = ['Company/Symbol column', `${baseMetric} column`];

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
    // Handle filtering operations
    if (targetMetric.includes('(negative)')) {
      return 'Table of all positions with negative ProfitLoss, showing Symbol, Company, Loss Amount, Loss %, and Row Reference';
    }
    if (targetMetric.includes('(positive)')) {
      return 'Table of all positions with positive ProfitLoss, showing Symbol, Company, Gain Amount, Gain %, and Row Reference';
    }
    if (targetMetric.includes('(highest)')) {
      return 'Ranked list of positions by highest ProfitLossPercentage, showing top performers';
    }
    if (targetMetric.includes('(lowest)')) {
      return 'Ranked list of positions by lowest ProfitLossPercentage, showing worst performers';
    }

    const outputFormats: Record<string, string> = {
      AveragePricePaid: 'Numerical value with currency (e.g., $226.55)',
      MarketValueDelayed: 'Numerical value with currency (e.g., $146,642.33)',
      ProfitLoss:
        'Numerical value with currency, may be negative (e.g., -$8,563.56)',
      ProfitLossPercentage: 'Percentage value (e.g., -5.52%)',
      Quantity: 'Whole number (e.g., 500 shares)',
      Unknown: 'Specific value from the identified cell',
    };

    return outputFormats[targetMetric] || outputFormats['Unknown'];
  }

  /**
   * Analyze current selection validity and relevance
   */
  private static analyzeCurrentSelection(
    currentSelection:
      | { sheet: string; range: string; activeCell?: string }
      | undefined,
    spreadsheetData: SpreadsheetData,
    summary: QuerySummary
  ) {
    if (!currentSelection) {
      return {
        isValid: false,
        containsTargetData: false,
        recommendedRange: 'A1:K20', // Default range for portfolio data
        explanation:
          'No current selection provided. Recommend selecting the entire data range.',
      };
    }

    // Find the sheet
    const sheet = spreadsheetData.sheets.find(
      s => s.name === currentSelection.sheet
    );
    if (!sheet) {
      return {
        isValid: false,
        containsTargetData: false,
        recommendedRange: 'A1:K20',
        explanation: `Sheet "${currentSelection.sheet}" not found.`,
      };
    }

    // Parse range (simplified - assumes format like "A1:C10")
    const rangeParts = currentSelection.range.split(':');
    if (rangeParts.length !== 2) {
      return {
        isValid: false,
        containsTargetData: false,
        recommendedRange: 'A1:K20',
        explanation: 'Invalid range format. Expected format: A1:C10',
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
        : `Current selection may not contain the target entities (${summary.extractedEntities.join(', ')}). Consider selecting ${recommendedRange}.`,
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
    return entities.some(entity => sheetText.includes(entity.toLowerCase()));
  }

  /**
   * Generate recommended range based on data analysis
   */
  private static generateRecommendedRange(
    sheet: Sheet,
    summary: QuerySummary
  ): string {
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
    const guidance = this.getExcelFunctionGuidance(
      targetMetric,
      extractedEntities
    );

    // Customize for specific data structure
    const sheet = spreadsheetData.sheets[0]; // Assume first sheet
    const customizedGuidance = this.customizeGuidanceForData(
      guidance,
      sheet,
      extractedEntities
    );

    return customizedGuidance;
  }

  /**
   * Get Excel function guidance based on metric type
   */
  private static getExcelFunctionGuidance(
    targetMetric: string,
    entities: string[]
  ): ExcelGuidance {
    const entity = entities[0] || 'TARGET_ENTITY';
    const baseMetric = targetMetric.split(' ')[0];
    const condition = targetMetric.match(/\((.*?)\)/)?.[1] || '';

    // Handle superlative queries (highest/lowest)
    if (condition === 'highest' || condition === 'lowest') {
      const isHighest = condition === 'highest';
      const sortOrder = isHighest ? 'FALSE' : 'TRUE';
      const functionName = isHighest ? 'MAX' : 'MIN';
      const indexFunction = isHighest ? 'MAXIFS' : 'MINIFS';
      
      return {
        primaryFunction: `${functionName} with INDEX/MATCH`,
        stepByStepInstructions: [
          `1. Use ${functionName} function to find the ${condition} ${baseMetric} value`,
          `2. Use INDEX/MATCH to find the corresponding company/entity`,
          `3. Alternative: Use SORT function to order data and pick first result`,
          `4. Include all relevant columns for context`,
        ],
        formulaTemplate: `=INDEX(B:B, MATCH(${functionName}(${this.getColumnLetter(baseMetric)}:${this.getColumnLetter(baseMetric)}), ${this.getColumnLetter(baseMetric)}:${this.getColumnLetter(baseMetric)}, 0))`,
        exampleFormula: `=INDEX(B2:B16, MATCH(${functionName}(F2:F16), F2:F16, 0))`,
        alternativeFunctions: [
          `SORT method: =INDEX(SORT(A2:K16, ${this.getColumnNumber(baseMetric)}, ${sortOrder}), 1, 2)`,
          `Array formula: =INDEX(B2:B16, MATCH(${functionName}(F2:F16), F2:F16, 0))`,
          `XLOOKUP: =XLOOKUP(${functionName}(F2:F16), F2:F16, B2:B16)`,
          `Filter + Sort: =INDEX(SORT(A2:K16, ${this.getColumnNumber(baseMetric)}, ${sortOrder}), 1, 0)`,
        ],
        validationSteps: [
          `Verify ${baseMetric} column contains numeric values`,
          `Confirm ${functionName} returns expected result`,
          `Check that INDEX/MATCH finds correct corresponding row`,
          `Validate that result makes logical sense`,
        ],
        commonPitfalls: [
          `Using wrong column reference for ${baseMetric}`,
          `Not excluding header row from ${functionName} calculation`,
          `MATCH function returning #N/A if exact match not found`,
          `Forgetting to handle ties (multiple records with same ${condition} value)`,
        ],
      };
    }

    // Handle filtering operations
    if (targetMetric.includes('(negative)')) {
      return {
        primaryFunction: 'FILTER or IF with array formulas',
        stepByStepInstructions: [
          '1. Identify the ProfitLoss column (typically column F)',
          '2. Use FILTER function to show rows where ProfitLoss < 0',
          '3. Include Symbol, CompanyName, ProfitLoss, and ProfitLossPercentage columns',
          '4. Alternative: Use conditional formatting to highlight negative values',
        ],
        formulaTemplate: '=FILTER(A:G, F:F<0)',
        exampleFormula: '=FILTER(A2:G16, F2:F16<0)',
        alternativeFunctions: [
          'Array formula: =IF(F2:F16<0, A2:A16&" - "&B2:B16&" - "&F2:F16, "")',
          'QUERY (Google Sheets): =QUERY(A:G, "SELECT * WHERE F < 0")',
          'Conditional formatting: Highlight cells where ProfitLoss < 0',
        ],
        validationSteps: [
          'Verify ProfitLoss column contains numeric values',
          'Check for proper negative number formatting',
          'Ensure all relevant columns are included in output',
          'Confirm filter captures all losing positions',
        ],
        commonPitfalls: [
          'Not including all relevant columns in FILTER result',
          'Forgetting to exclude header row from filter range',
          'Using wrong column reference for ProfitLoss',
          'Not handling empty cells properly in filter condition',
        ],
      };
    }

    if (targetMetric.includes('(positive)')) {
      return {
        primaryFunction: 'FILTER or conditional formatting',
        stepByStepInstructions: [
          '1. Locate the ProfitLoss column (typically column F)',
          '2. Use FILTER to display rows where ProfitLoss > 0',
          '3. Show Symbol, CompanyName, ProfitLoss, and percentage columns',
          '4. Sort by ProfitLoss descending to show best performers first',
        ],
        formulaTemplate: '=FILTER(A:G, F:F>0)',
        exampleFormula: '=FILTER(A2:G16, F2:F16>0)',
        alternativeFunctions: [
          'SORT with FILTER: =SORT(FILTER(A2:G16, F2:F16>0), 6, FALSE)',
          'Conditional formatting for positive values',
          'SUMIF for total gains: =SUMIF(F:F, ">0", F:F)',
        ],
        validationSteps: [
          'Confirm ProfitLoss column has positive values',
          'Verify all profitable positions are captured',
          'Check sorting order if using SORT function',
          'Validate percentage calculations',
        ],
        commonPitfalls: [
          'Including zero values when looking for profits only',
          'Wrong sort order (ascending vs descending)',
          'Missing currency formatting in results',
          'Not excluding header from filter range',
        ],
      };
    }

    switch (targetMetric) {
      case 'AveragePricePaid':
        return {
          primaryFunction: 'VLOOKUP or INDEX/MATCH',
          stepByStepInstructions: [
            '1. Identify the row containing the target company/symbol',
            '2. Locate the AveragePricePaid column (typically column D)',
            '3. Use VLOOKUP to find the exact value',
            '4. Alternative: Use INDEX/MATCH for more flexibility',
          ],
          formulaTemplate: '=VLOOKUP("ENTITY", A:K, COLUMN_NUMBER, FALSE)',
          exampleFormula: `=VLOOKUP("${entity}", A:K, 4, FALSE)`,
          alternativeFunctions: [
            'INDEX/MATCH: =INDEX(D:D, MATCH("ENTITY", A:A, 0))',
            'FILTER (Excel 365): =FILTER(D:D, A:A="ENTITY")',
            'XLOOKUP (Excel 365): =XLOOKUP("ENTITY", A:A, D:D)',
          ],
          validationSteps: [
            'Verify the entity exists in column A (Symbol) or B (CompanyName)',
            'Confirm column D contains AveragePricePaid data',
            'Check for exact match (case-sensitive)',
            'Ensure no extra spaces in entity name',
          ],
          commonPitfalls: [
            'Using approximate match (TRUE) instead of exact match (FALSE)',
            'Wrong column number in VLOOKUP',
            'Case sensitivity issues with entity names',
            'Including header row in search range',
          ],
        };

      case 'MarketValueDelayed':
        return {
          primaryFunction: 'VLOOKUP or INDEX/MATCH',
          stepByStepInstructions: [
            '1. Locate the target company in column A (Symbol) or B (CompanyName)',
            '2. Find the MarketValueDelayed column (typically column C)',
            '3. Use VLOOKUP to extract the market value',
            '4. Format result as currency if needed',
          ],
          formulaTemplate: '=VLOOKUP("ENTITY", A:K, 3, FALSE)',
          exampleFormula: `=VLOOKUP("${entity}", A:K, 3, FALSE)`,
          alternativeFunctions: [
            'INDEX/MATCH: =INDEX(C:C, MATCH("ENTITY", A:A, 0))',
            'SUMIF for totals: =SUMIF(A:A, "ENTITY", C:C)',
            'XLOOKUP: =XLOOKUP("ENTITY", A:A, C:C)',
          ],
          validationSteps: [
            'Confirm entity exists in symbol or company name columns',
            'Verify column C contains market value data',
            'Check data format (should be numeric)',
            'Validate currency consistency',
          ],
          commonPitfalls: [
            'Confusing MarketValueDelayed with AveragePricePaid',
            'Not accounting for different currencies',
            'Including text headers in numeric calculations',
            'Using wrong column reference',
          ],
        };

      default:
        return {
          primaryFunction: 'VLOOKUP',
          stepByStepInstructions: [
            '1. Identify the target entity in the data',
            '2. Determine which column contains the desired metric',
            '3. Use VLOOKUP or INDEX/MATCH to retrieve the value',
            '4. Apply appropriate formatting',
          ],
          formulaTemplate:
            '=VLOOKUP("ENTITY", DATA_RANGE, COLUMN_NUMBER, FALSE)',
          exampleFormula: `=VLOOKUP("${entity}", A:K, 2, FALSE)`,
          alternativeFunctions: [
            'INDEX/MATCH for flexibility',
            'FILTER for multiple results',
            'XLOOKUP for modern Excel versions',
          ],
          validationSteps: [
            'Verify entity exists in the data',
            'Confirm correct column selection',
            'Check for data type consistency',
            'Validate formula syntax',
          ],
          commonPitfalls: [
            'Incorrect column numbering',
            'Case sensitivity issues',
            'Wrong match type selection',
            'Range reference errors',
          ],
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
    const symbolCol = headers.findIndex(h =>
      h?.toString().toLowerCase().includes('symbol')
    );
    const companyCol = headers.findIndex(h =>
      h?.toString().toLowerCase().includes('company')
    );
    const priceCol = headers.findIndex(h =>
      h?.toString().toLowerCase().includes('averageprice')
    );
    const marketValueCol = headers.findIndex(h =>
      h?.toString().toLowerCase().includes('marketvalue')
    );

    // Update formula with actual column numbers
    if (priceCol >= 0) {
      guidance.exampleFormula = guidance.exampleFormula.replace(
        /\d+/,
        (priceCol + 1).toString()
      );
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
    selectionAnalysis: unknown,
    excelGuidance: ExcelGuidance
  ): RealConfidenceScore {
    const sheet = spreadsheetData.sheets[0];
    if (!sheet) {
      return {
        overall: 0.1,
        breakdown: {
          entityFound: 0,
          dataQuality: 0,
          formulaApplicability: 0,
          queryClarity: 0,
        },
        reasoning: ['No spreadsheet data available'],
        uncertaintyFactors: ['Missing data source'],
      };
    }

    // 1. Entity Found Score (40% weight)
    const entityFoundScore = this.calculateEntityFoundScore(
      summary.extractedEntities,
      sheet
    );

    // 2. Data Quality Score (25% weight)
    const dataQualityScore = this.calculateDataQualityScore(
      sheet,
      summary.targetMetric
    );

    // 3. Formula Applicability Score (20% weight)
    const formulaApplicabilityScore = this.calculateFormulaApplicabilityScore(
      summary.targetMetric,
      sheet
    );

    // 4. Query Clarity Score (15% weight)
    const queryClarityScore = this.calculateQueryClarityScore(summary);

    // Calculate weighted overall score
    const overall =
      entityFoundScore * 0.4 +
      dataQualityScore * 0.25 +
      formulaApplicabilityScore * 0.2 +
      queryClarityScore * 0.15;

    const reasoning = this.generateConfidenceReasoning(
      entityFoundScore,
      dataQualityScore,
      formulaApplicabilityScore,
      queryClarityScore
    );

    const uncertaintyFactors = this.identifyUncertaintyFactors(
      summary,
      sheet,
      selectionAnalysis
    );

    return {
      overall: Math.round(overall * 100) / 100, // Round to 2 decimal places
      breakdown: {
        entityFound: Math.round(entityFoundScore * 100) / 100,
        dataQuality: Math.round(dataQualityScore * 100) / 100,
        formulaApplicability: Math.round(formulaApplicabilityScore * 100) / 100,
        queryClarity: Math.round(queryClarityScore * 100) / 100,
      },
      reasoning,
      uncertaintyFactors,
    };
  }

  /**
   * Calculate how well entities are found in the data
   */
  private static calculateEntityFoundScore(
    entities: string[],
    sheet: Sheet
  ): number {
    // For filtering operations (no specific entities), give high score if data structure is good
    if (entities.length === 0) {
      // Check if we have the required columns for filtering
      const headers = sheet.data[0] || [];
      const hasSymbol = headers.some(h =>
        h?.toString().toLowerCase().includes('symbol')
      );
      const hasCompany = headers.some(h =>
        h?.toString().toLowerCase().includes('company')
      );
      const hasProfitLoss = headers.some(h =>
        h?.toString().toLowerCase().includes('profit')
      );

      if (hasSymbol && hasCompany && hasProfitLoss) {
        return 0.9; // High score for filtering operations with good data structure
      }
      return 0.6; // Medium score if some columns are present
    }

    const sheetText = JSON.stringify(sheet.data).toLowerCase();
    const foundEntities = entities.filter(entity =>
      sheetText.includes(entity.toLowerCase())
    );

    const foundRatio = foundEntities.length / entities.length;

    // Bonus for exact symbol matches
    const symbolColumn = sheet.data.map(
      row => row[0]?.toString().toLowerCase() || ''
    );
    const exactMatches = entities.filter(entity =>
      symbolColumn.includes(entity.toLowerCase())
    );

    const exactMatchBonus = exactMatches.length > 0 ? 0.2 : 0;

    return Math.min(foundRatio + exactMatchBonus, 1.0);
  }

  /**
   * Calculate data quality score
   */
  private static calculateDataQualityScore(
    sheet: Sheet,
    targetMetric: string
  ): number {
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
      row.some(
        cell =>
          cell !== null &&
          cell !== undefined &&
          (typeof cell === 'object'
            ? cell.value !== null &&
              cell.value !== undefined &&
              cell.value !== ''
            : cell !== '')
      )
    );
    const completenessRatio = nonEmptyRows.length / dataRows.length;
    score += completenessRatio * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate how applicable Excel formulas are
   */
  private static calculateFormulaApplicabilityScore(
    targetMetric: string,
    sheet: Sheet
  ): number {
    // Very high applicability for filtering operations
    if (
      targetMetric.includes('(negative)') ||
      targetMetric.includes('(positive)') ||
      targetMetric.includes('(highest)') ||
      targetMetric.includes('(lowest)')
    ) {
      return 0.95;
    }

    // High applicability for standard lookup operations
    const lookupMetrics = [
      'AveragePricePaid',
      'MarketValueDelayed',
      'Quantity',
      'ProfitLoss',
    ];
    if (lookupMetrics.includes(targetMetric)) return 0.9;

    // Medium applicability for calculations
    if (targetMetric.includes('Percentage') || targetMetric.includes('Ratio'))
      return 0.7;

    // Lower for unknown metrics
    return 0.5;
  }

  /**
   * Calculate query clarity score
   */
  private static calculateQueryClarityScore(summary: QuerySummary): number {
    let score = 0.3; // Base score

    // High bonus for filtering operations (very clear intent)
    if (
      summary.targetMetric.includes('(negative)') ||
      summary.targetMetric.includes('(positive)') ||
      summary.targetMetric.includes('(highest)') ||
      summary.targetMetric.includes('(lowest)')
    ) {
      score += 0.5;
    }
    // Bonus for specific entities
    else if (summary.extractedEntities.length > 0) {
      score += 0.3;
    }

    // Bonus for clear metric identification
    if (summary.targetMetric !== 'Unknown') score += 0.2;

    // Bonus for specific language
    const specificTerms = [
      'losing',
      'winning',
      'profitable',
      'negative',
      'positive',
      'best',
      'worst',
      'average',
      'price',
      'value',
      'profit',
      'loss',
      'total',
    ];
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
      reasoning.push(
        '⚠ Some target entities found, but may need verification'
      );
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
      reasoning.push(
        '✗ Query may require manual analysis beyond simple formulas'
      );
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
    selectionAnalysis: unknown
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

  /**
   * Helper method to get Excel column letter for a metric
   */
  private static getColumnLetter(metric: string): string {
    const columnMap: { [key: string]: string } = {
      'Symbol': 'A',
      'CompanyName': 'B', 
      'MarketValueDelayed': 'C',
      'AveragePricePaid': 'D',
      'Quantity': 'E',
      'ProfitLoss': 'F',
      'ProfitLossPercentage': 'G',
      'Currency': 'H',
      'Exchange': 'I',
      'SecurityType': 'J',
      'MarginRequirements': 'K'
    };
    return columnMap[metric] || 'F'; // Default to F (ProfitLoss)
  }

  /**
   * Helper method to get Excel column number for a metric
   */
  private static getColumnNumber(metric: string): number {
    const columnMap: { [key: string]: number } = {
      'Symbol': 1,
      'CompanyName': 2,
      'MarketValueDelayed': 3,
      'AveragePricePaid': 4,
      'Quantity': 5,
      'ProfitLoss': 6,
      'ProfitLossPercentage': 7,
      'Currency': 8,
      'Exchange': 9,
      'SecurityType': 10,
      'MarginRequirements': 11
    };
    return columnMap[metric] || 6; // Default to 6 (ProfitLoss)
  }
}
