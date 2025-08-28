/**
 * Enhanced Data Parser - Advanced spreadsheet parsing with intelligent data type detection
 * 
 * This service extends the basic SpreadsheetParser with:
 * - Intelligent data type detection including financial and business types
 * - Multi-dimensional indexing for fast lookups
 * - Data quality assessment and anomaly detection
 * - Fuzzy search capabilities with synonym recognition
 * - Domain-specific pattern recognition
 */

import {
  IntelligentSpreadsheetData,
  IntelligentCell,
  EnhancedDataType,
  DomainType,
  PatternType,
  SearchIndex,
  FuzzySearchIndex,
  CompanyMatch,
  TermMatch,
  CellReference,
  ColumnInfo,
  DataPatterns,
  QualityAssessment,
  DomainContext,
  ColumnMapping,
  EntityIndex,
  SynonymIndex,
  EnhancedParseConfig,
  DataQualityIssue,
  QualityRecommendation,
  AnomalyFlag,
  BusinessRule,
  MetricDefinition
} from '../types/enhanced-intelligence';
import { SpreadsheetData, Sheet, Cell, DataType } from '../types/spreadsheet';
import { SpreadsheetParser } from './SpreadsheetParser';

export class EnhancedDataParser {
  private static readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
  private static readonly MAX_SYNONYMS = 10;
  
  // Financial terms and company name databases (in production, these would be loaded from external sources)
  private static readonly FINANCIAL_TERMS = new Map([
    ['revenue', ['sales', 'income', 'turnover', 'receipts']],
    ['profit', ['earnings', 'net income', 'surplus', 'gain']],
    ['loss', ['deficit', 'shortfall', 'negative earnings']],
    ['assets', ['holdings', 'property', 'resources', 'capital']],
    ['liabilities', ['debts', 'obligations', 'payables']],
    ['equity', ['ownership', 'shareholders equity', 'net worth']],
    ['cash flow', ['cash movement', 'liquidity', 'cash position']],
    ['roi', ['return on investment', 'profitability ratio']],
    ['ebitda', ['earnings before interest tax depreciation amortization']],
    ['market cap', ['market capitalization', 'market value']],
    ['pe ratio', ['price earnings ratio', 'price to earnings']],
    ['dividend', ['payout', 'distribution', 'yield']]
  ]);

  private static readonly COMPANY_SYNONYMS = new Map([
    ['apple inc', ['apple', 'aapl', 'apple computer', 'apple corporation']],
    ['microsoft corp', ['microsoft', 'msft', 'microsoft corporation']],
    ['amazon com inc', ['amazon', 'amzn', 'amazon.com']],
    ['alphabet inc', ['google', 'googl', 'alphabet', 'google inc']],
    ['tesla inc', ['tesla', 'tsla', 'tesla motors']],
    ['meta platforms', ['facebook', 'meta', 'fb', 'facebook inc']],
    ['berkshire hathaway', ['berkshire', 'brk.a', 'brk.b', 'berkshire hathaway inc']]
  ]);

  private static readonly BUSINESS_TERMS = new Map([
    ['customer', ['client', 'buyer', 'consumer', 'patron']],
    ['vendor', ['supplier', 'provider', 'contractor']],
    ['employee', ['staff', 'worker', 'personnel', 'team member']],
    ['department', ['division', 'unit', 'section', 'group']],
    ['project', ['initiative', 'program', 'task', 'assignment']],
    ['budget', ['allocation', 'funding', 'financial plan']],
    ['forecast', ['projection', 'prediction', 'estimate']],
    ['target', ['goal', 'objective', 'aim', 'milestone']]
  ]);

  /**
   * Enhanced parsing of spreadsheet data with intelligent analysis
   */
  public static async parseEnhanced(
    file: Buffer | string,
    filename: string,
    mimeType: string,
    config: EnhancedParseConfig = {}
  ): Promise<IntelligentSpreadsheetData> {
    // First, parse using the standard parser
    const basicData = await SpreadsheetParser.parseFile(file, filename, mimeType);
    
    // Apply enhanced intelligence
    return this.enhanceSpreadsheetData(basicData, config);
  }

  /**
   * Enhance existing spreadsheet data with intelligence
   */
  public static async enhanceSpreadsheetData(
    basicData: SpreadsheetData,
    config: EnhancedParseConfig = {}
  ): Promise<IntelligentSpreadsheetData> {
    const enhancedConfig = {
      enableDomainDetection: true,
      enableFuzzySearch: true,
      enableSynonymRecognition: true,
      enableQualityAssessment: true,
      enablePatternDetection: true,
      confidenceThreshold: this.DEFAULT_CONFIDENCE_THRESHOLD,
      maxSynonyms: this.MAX_SYNONYMS,
      ...config
    };

    // Enhance cells with intelligent data type detection
    const enhancedSheets = await Promise.all(
      basicData.sheets.map(sheet => this.enhanceSheet(sheet, enhancedConfig))
    );

    // Build search indices
    const searchIndex = this.buildSearchIndex(enhancedSheets, enhancedConfig);
    
    // Detect data patterns
    const dataPatterns = enhancedConfig.enablePatternDetection 
      ? this.detectDataPatterns(enhancedSheets)
      : this.createEmptyDataPatterns();

    // Assess data quality
    const qualityMetrics = enhancedConfig.enableQualityAssessment
      ? this.assessDataQuality(enhancedSheets, dataPatterns)
      : this.createEmptyQualityAssessment();

    // Detect domain context
    const domainContext = enhancedConfig.enableDomainDetection
      ? this.detectDomainContext(enhancedSheets, searchIndex)
      : this.createDefaultDomainContext();

    // Create column mappings
    const columnMappings = this.createColumnMappings(enhancedSheets, domainContext);

    // Build entity and synonym indices
    const entityIndex = this.buildEntityIndex(enhancedSheets, enhancedConfig);
    const synonymIndex = this.buildSynonymIndex(enhancedConfig);

    return {
      ...basicData,
      sheets: enhancedSheets,
      searchIndex,
      dataPatterns,
      qualityMetrics,
      domainContext,
      columnMappings,
      entityIndex,
      synonymIndex
    };
  }

  /**
   * Enhance a single sheet with intelligent analysis
   */
  private static async enhanceSheet(
    sheet: Sheet,
    config: EnhancedParseConfig
  ): Promise<Sheet> {
    const enhancedData: IntelligentCell[][] = [];

    for (let row = 0; row < sheet.data.length; row++) {
      const enhancedRow: IntelligentCell[] = [];
      const rowData = sheet.data[row];
      
      if (rowData) {
        for (let col = 0; col < rowData.length; col++) {
          const cell = rowData[col];
          if (cell) {
            const enhancedCell = await this.enhanceCell(cell, row, col, sheet, config);
            enhancedRow.push(enhancedCell);
          }
        }
      }
      
      enhancedData.push(enhancedRow);
    }

    return {
      ...sheet,
      data: enhancedData as Cell[][]
    };
  }

  /**
   * Enhance a single cell with intelligent data type detection
   */
  private static async enhanceCell(
    cell: Cell,
    row: number,
    col: number,
    sheet: Sheet,
    config: EnhancedParseConfig
  ): Promise<IntelligentCell> {
    const enhancedDataType = this.detectEnhancedDataType(cell, row, col, sheet);
    const confidence = this.calculateTypeConfidence(cell, enhancedDataType);
    const synonyms = config.enableSynonymRecognition 
      ? this.findSynonyms(cell.value, enhancedDataType)
      : undefined;
    const normalizedValue = this.normalizeValue(cell.value, enhancedDataType);
    const qualityScore = this.calculateCellQualityScore(cell, row, col, sheet);
    const anomalyFlags = this.detectCellAnomalies(cell, row, col, sheet);

    return {
      ...cell,
      enhancedDataType,
      confidence,
      synonyms,
      normalizedValue,
      qualityScore,
      anomalyFlags
    };
  }

  /**
   * Detect enhanced data type with domain-specific intelligence
   */
  private static detectEnhancedDataType(
    cell: Cell,
    row: number,
    col: number,
    sheet: Sheet
  ): EnhancedDataType {
    if (!cell.value || cell.dataType === DataType.EMPTY) {
      return EnhancedDataType.EMPTY;
    }

    const value = String(cell.value).trim();
    const lowerValue = value.toLowerCase();

    // Check for financial types
    if (this.isCurrency(value)) return EnhancedDataType.CURRENCY;
    if (this.isPercentage(value)) return EnhancedDataType.PERCENTAGE;
    if (this.isStockSymbol(value)) return EnhancedDataType.STOCK_SYMBOL;
    if (this.isCompanyName(value, row, col, sheet)) return EnhancedDataType.COMPANY_NAME;

    // Check for business types
    if (this.isEmail(value)) return EnhancedDataType.EMAIL;
    if (this.isPhone(value)) return EnhancedDataType.PHONE;
    if (this.isUrl(value)) return EnhancedDataType.URL;
    if (this.isIdNumber(value)) return EnhancedDataType.ID_NUMBER;

    // Check for temporal types
    if (this.isTime(value)) return EnhancedDataType.TIME;
    if (this.isDateTime(value)) return EnhancedDataType.DATETIME;
    if (this.isDuration(value)) return EnhancedDataType.DURATION;

    // Check for numeric subtypes
    if (cell.dataType === DataType.NUMBER) {
      if (this.isInteger(cell.value)) return EnhancedDataType.INTEGER;
      if (this.isScientific(value)) return EnhancedDataType.SCIENTIFIC;
      if (this.isRatio(value)) return EnhancedDataType.RATIO;
      return EnhancedDataType.DECIMAL;
    }

    // Map basic types to enhanced types
    switch (cell.dataType) {
      case DataType.TEXT: return EnhancedDataType.TEXT;
      case DataType.DATE: return EnhancedDataType.DATE;
      case DataType.BOOLEAN: return EnhancedDataType.BOOLEAN;
      case DataType.FORMULA: return EnhancedDataType.FORMULA;
      case DataType.ERROR: return EnhancedDataType.ERROR;
      default: 
        if (cell.dataType === DataType.NUMBER) {
          return EnhancedDataType.NUMBER;
        }
        return EnhancedDataType.TEXT;
    }
  }

  /**
   * Build comprehensive search index
   */
  private static buildSearchIndex(
    sheets: Sheet[],
    config: EnhancedParseConfig
  ): SearchIndex {
    const byContent = new Map<string, CellReference[]>();
    const byColumn = new Map<string, ColumnInfo>();
    const byDataType = new Map<EnhancedDataType, CellReference[]>();
    const byPattern = new Map<PatternType, any[]>();
    const byDomain = new Map<DomainType, CellReference[]>();
    const fuzzyIndex = config.enableFuzzySearch 
      ? this.buildFuzzySearchIndex(sheets)
      : this.createEmptyFuzzyIndex();

    sheets.forEach((sheet, sheetIndex) => {
      // Index by content
      sheet.data.forEach((row, rowIndex) => {
        if (row) {
          row.forEach((cell, colIndex) => {
            if (cell && cell.value) {
              const cellRef: CellReference = {
                sheet: sheet.name,
                row: rowIndex,
                col: colIndex,
                address: this.indexToAddress(rowIndex, colIndex),
                value: cell.value
              };

              // Content index
              const content = String(cell.value).toLowerCase();
              const words = content.split(/\s+/);
              words.forEach(word => {
                if (word.length > 2) {
                  if (!byContent.has(word)) {
                    byContent.set(word, []);
                  }
                  byContent.get(word)!.push(cellRef);
                }
              });

              // Data type index
              const enhancedCell = cell as IntelligentCell;
              if (enhancedCell.enhancedDataType) {
                if (!byDataType.has(enhancedCell.enhancedDataType)) {
                  byDataType.set(enhancedCell.enhancedDataType, []);
                }
                byDataType.get(enhancedCell.enhancedDataType)!.push(cellRef);
              }
            }
          });
        }
      });

      // Build column information
      if (sheet.data.length > 0 && sheet.data[0]) {
        for (let col = 0; col < sheet.data[0].length; col++) {
          const columnInfo = this.analyzeColumn(sheet, col);
          byColumn.set(`${sheet.name}:${col}`, columnInfo);
        }
      }
    });

    return {
      byContent,
      byColumn,
      byDataType,
      byPattern,
      byDomain,
      fuzzyIndex
    };
  }

  /**
   * Build fuzzy search index for intelligent matching
   */
  private static buildFuzzySearchIndex(sheets: Sheet[]): FuzzySearchIndex {
    const companyNames = new Map<string, CompanyMatch[]>();
    const financialTerms = new Map<string, TermMatch[]>();
    const generalTerms = new Map<string, TermMatch[]>();
    const phoneticIndex = new Map<string, string[]>();

    sheets.forEach(sheet => {
      sheet.data.forEach((row, rowIndex) => {
        if (row) {
          row.forEach((cell, colIndex) => {
            if (cell && cell.value) {
              const enhancedCell = cell as IntelligentCell;
              const cellRef: CellReference = {
                sheet: sheet.name,
                row: rowIndex,
                col: colIndex,
                address: this.indexToAddress(rowIndex, colIndex),
                value: cell.value
              };

              // Index company names
              if (enhancedCell.enhancedDataType === EnhancedDataType.COMPANY_NAME) {
                this.indexCompanyName(String(cell.value), cellRef, companyNames);
              }

              // Index financial terms
              if (this.isFinancialTerm(String(cell.value))) {
                this.indexFinancialTerm(String(cell.value), cellRef, financialTerms);
              }

              // Build phonetic index for fuzzy matching
              const phonetic = this.generatePhoneticKey(String(cell.value));
              if (!phoneticIndex.has(phonetic)) {
                phoneticIndex.set(phonetic, []);
              }
              phoneticIndex.get(phonetic)!.push(String(cell.value));
            }
          });
        }
      });
    });

    return {
      companyNames,
      financialTerms,
      generalTerms,
      phoneticIndex
    };
  }

  /**
   * Detect data patterns in the spreadsheet
   */
  private static detectDataPatterns(sheets: Sheet[]): DataPatterns {
    const headerPatterns: any[] = [];
    const dataBlocks: any[] = [];
    const relationships: any[] = [];
    const hierarchies: any[] = [];
    const timeSeriesPatterns: any[] = [];

    sheets.forEach(sheet => {
      // Detect header patterns
      const headers = this.detectHeaderPatterns(sheet);
      headerPatterns.push(...headers);

      // Detect data blocks
      const blocks = this.detectDataBlocks(sheet);
      dataBlocks.push(...blocks);

      // Detect time series patterns
      const timeSeries = this.detectTimeSeriesPatterns(sheet);
      timeSeriesPatterns.push(...timeSeries);
    });

    return {
      headerPatterns,
      dataBlocks,
      relationships,
      hierarchies,
      timeSeriesPatterns
    };
  }

  /**
   * Assess data quality across the spreadsheet
   */
  private static assessDataQuality(
    sheets: Sheet[],
    patterns: DataPatterns
  ): QualityAssessment {
    let totalCells = 0;
    let emptyCells = 0;
    let inconsistentCells = 0;
    let duplicateCells = 0;
    const issues: DataQualityIssue[] = [];
    const recommendations: QualityRecommendation[] = [];

    sheets.forEach(sheet => {
      sheet.data.forEach((row, rowIndex) => {
        if (row) {
          row.forEach((cell, colIndex) => {
            totalCells++;
            
            if (!cell || !cell.value) {
              emptyCells++;
            } else {
              const enhancedCell = cell as IntelligentCell;
              
              // Check for anomalies
              if (enhancedCell.anomalyFlags && enhancedCell.anomalyFlags.length > 0) {
                enhancedCell.anomalyFlags.forEach(flag => {
                  issues.push({
                    type: flag.type as any,
                    severity: flag.severity,
                    description: flag.description,
                    affectedCells: [{
                      sheet: sheet.name,
                      row: rowIndex,
                      col: colIndex,
                      address: this.indexToAddress(rowIndex, colIndex),
                      value: cell.value
                    }],
                    confidence: flag.confidence
                  });
                });
              }

              // Check for low quality scores
              if (enhancedCell.qualityScore && enhancedCell.qualityScore < 0.7) {
                inconsistentCells++;
              }
            }
          });
        }
      });
    });

    const completeness = totalCells > 0 ? (totalCells - emptyCells) / totalCells : 1;
    const consistency = totalCells > 0 ? (totalCells - inconsistentCells) / totalCells : 1;
    const uniqueness = totalCells > 0 ? (totalCells - duplicateCells) / totalCells : 1;

    // Generate recommendations based on issues
    if (completeness < 0.9) {
      recommendations.push({
        type: 'data_cleaning',
        priority: 'high',
        description: 'Address missing data to improve completeness',
        expectedImpact: 'Improved analysis accuracy and reliability',
        implementationSteps: [
          'Identify patterns in missing data',
          'Fill with appropriate defaults or interpolated values',
          'Consider data collection improvements'
        ]
      });
    }

    if (consistency < 0.8) {
      recommendations.push({
        type: 'format_standardization',
        priority: 'medium',
        description: 'Standardize data formats for consistency',
        expectedImpact: 'Better data processing and analysis',
        implementationSteps: [
          'Identify format inconsistencies',
          'Define standard formats',
          'Apply transformations to normalize data'
        ]
      });
    }

    const overallScore = (completeness + consistency + uniqueness) / 3;

    return {
      overallScore,
      completeness,
      consistency,
      accuracy: 0.85, // Placeholder - would need more sophisticated calculation
      validity: 0.9,   // Placeholder - would need validation rules
      uniqueness,
      issues,
      recommendations
    };
  }

  // Helper methods for data type detection

  private static isCurrency(value: string): boolean {
    return /^[\$€£¥₹]?\s*-?\d{1,3}(,\d{3})*(\.\d{2})?$/.test(value.trim()) ||
           /^-?\d{1,3}(,\d{3})*(\.\d{2})?\s*[\$€£¥₹]$/.test(value.trim());
  }

  private static isPercentage(value: string): boolean {
    return /^-?\d*\.?\d+\s*%$/.test(value.trim());
  }

  private static isStockSymbol(value: string): boolean {
    return /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(value.trim()) && value.length <= 6;
  }

  private static isCompanyName(value: string, row: number, col: number, sheet: Sheet): boolean {
    const lowerValue = value.toLowerCase();
    
    // Check against known company names
    for (const [company, synonyms] of this.COMPANY_SYNONYMS) {
      if (lowerValue.includes(company) || synonyms.some(syn => lowerValue.includes(syn))) {
        return true;
      }
    }

    // Heuristic: contains "inc", "corp", "ltd", etc.
    return /\b(inc|corp|corporation|ltd|limited|llc|co|company)\b/i.test(value);
  }

  private static isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private static isPhone(value: string): boolean {
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
    return /^\+?1?[0-9]{10,15}$/.test(cleaned);
  }

  private static isUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(value);
    }
  }

  private static isIdNumber(value: string): boolean {
    // Simple heuristic for ID numbers (alphanumeric, specific patterns)
    return /^[A-Z0-9]{5,20}$/.test(value.trim()) && /\d/.test(value) && /[A-Z]/.test(value);
  }

  private static isTime(value: string): boolean {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?(\s*(AM|PM))?$/i.test(value.trim());
  }

  private static isDateTime(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}\s+([01]?[0-9]|2[0-3]):[0-5][0-9]/.test(value.trim());
  }

  private static isDuration(value: string): boolean {
    return /^\d+:\d{2}(:\d{2})?$/.test(value.trim()) || /^\d+\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)$/i.test(value.trim());
  }

  private static isInteger(value: any): boolean {
    return Number.isInteger(value);
  }

  private static isScientific(value: string): boolean {
    return /^-?\d*\.?\d+[eE][+-]?\d+$/.test(value.trim());
  }

  private static isRatio(value: string): boolean {
    return /^\d+:\d+$/.test(value.trim()) || /^\d+\/\d+$/.test(value.trim());
  }

  private static isFinancialTerm(value: string): boolean {
    const lowerValue = value.toLowerCase();
    return this.FINANCIAL_TERMS.has(lowerValue) || 
           Array.from(this.FINANCIAL_TERMS.values()).some(synonyms => 
             synonyms.some(syn => lowerValue.includes(syn))
           );
  }

  // Additional helper methods

  private static calculateTypeConfidence(cell: Cell, enhancedType: EnhancedDataType): number {
    // Base confidence on data type detection accuracy
    if (!cell.value) return 1.0;
    
    const value = String(cell.value);
    
    // High confidence for specific patterns
    if (enhancedType === EnhancedDataType.EMAIL && this.isEmail(value)) return 0.95;
    if (enhancedType === EnhancedDataType.CURRENCY && this.isCurrency(value)) return 0.9;
    if (enhancedType === EnhancedDataType.PERCENTAGE && this.isPercentage(value)) return 0.9;
    
    // Medium confidence for heuristic matches
    if (enhancedType === EnhancedDataType.COMPANY_NAME) return 0.75;
    if (enhancedType === EnhancedDataType.STOCK_SYMBOL) return 0.8;
    
    // Default confidence
    return 0.7;
  }

  private static findSynonyms(value: any, dataType: EnhancedDataType): string[] | undefined {
    if (!value) return undefined;
    
    const lowerValue = String(value).toLowerCase();
    
    if (dataType === EnhancedDataType.COMPANY_NAME) {
      for (const [company, synonyms] of this.COMPANY_SYNONYMS) {
        if (lowerValue.includes(company) || synonyms.some(syn => lowerValue.includes(syn))) {
          return synonyms;
        }
      }
    }
    
    if (this.isFinancialTerm(lowerValue)) {
      return this.FINANCIAL_TERMS.get(lowerValue) || [];
    }
    
    return undefined;
  }

  private static normalizeValue(value: any, dataType: EnhancedDataType): any {
    if (!value) return value;
    
    const stringValue = String(value);
    
    switch (dataType) {
      case EnhancedDataType.CURRENCY:
        return parseFloat(stringValue.replace(/[\$€£¥₹,\s]/g, ''));
      case EnhancedDataType.PERCENTAGE:
        return parseFloat(stringValue.replace('%', '')) / 100;
      case EnhancedDataType.COMPANY_NAME:
        return stringValue.toLowerCase().replace(/\b(inc|corp|ltd|llc)\b/gi, '').trim();
      case EnhancedDataType.STOCK_SYMBOL:
        return stringValue.toUpperCase();
      default:
        return value;
    }
  }

  private static calculateCellQualityScore(cell: Cell, row: number, col: number, sheet: Sheet): number {
    let score = 1.0;
    
    if (!cell.value) return 0.0;
    
    const value = String(cell.value);
    
    // Penalize for suspicious patterns
    if (value.includes('???') || value.includes('###')) score -= 0.3;
    if (value.trim().length === 0) score -= 0.5;
    if (value.includes('ERROR') || value.includes('#REF!')) score -= 0.4;
    
    // Bonus for consistent formatting within column
    const columnConsistency = this.checkColumnConsistency(sheet, col, row);
    score += columnConsistency * 0.2;
    
    return Math.max(0, Math.min(1, score));
  }

  private static detectCellAnomalies(cell: Cell, row: number, col: number, sheet: Sheet): AnomalyFlag[] {
    const flags: AnomalyFlag[] = [];
    
    if (!cell.value) return flags;
    
    const value = String(cell.value);
    
    // Check for suspicious patterns
    if (value.includes('???') || value.includes('###')) {
      flags.push({
        type: 'suspicious',
        severity: 'medium',
        description: 'Cell contains suspicious characters that may indicate data corruption',
        confidence: 0.8
      });
    }
    
    // Check for outliers in numeric columns
    if (cell.dataType === DataType.NUMBER) {
      const isOutlier = this.isNumericOutlier(cell.value, sheet, col);
      if (isOutlier) {
        flags.push({
          type: 'outlier',
          severity: 'low',
          description: 'Value appears to be an outlier compared to other values in this column',
          confidence: 0.7
        });
      }
    }
    
    return flags;
  }

  // Utility methods

  private static indexToAddress(row: number, col: number): string {
    let columnStr = '';
    let tempCol = col;
    
    while (tempCol >= 0) {
      columnStr = String.fromCharCode('A'.charCodeAt(0) + (tempCol % 26)) + columnStr;
      tempCol = Math.floor(tempCol / 26) - 1;
    }
    
    return `${columnStr}${row + 1}`;
  }

  private static analyzeColumn(sheet: Sheet, col: number): ColumnInfo {
    const columnData = sheet.data.map(row => row && row[col]).filter(cell => cell && cell.value);
    
    if (columnData.length === 0) {
      return {
        index: col,
        enhancedDataType: EnhancedDataType.EMPTY,
        confidence: 1.0,
        patterns: [],
        qualityScore: 0.0,
        uniqueValues: 0,
        nullCount: sheet.data.length
      };
    }

    // Determine primary data type
    const typeCounts = new Map<EnhancedDataType, number>();
    columnData.forEach(cell => {
      const enhancedCell = cell as IntelligentCell;
      if (enhancedCell.enhancedDataType) {
        typeCounts.set(enhancedCell.enhancedDataType, (typeCounts.get(enhancedCell.enhancedDataType) || 0) + 1);
      }
    });

    const primaryType = Array.from(typeCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || EnhancedDataType.TEXT;

    const uniqueValues = new Set(columnData.map(cell => cell!.value)).size;
    const nullCount = sheet.data.length - columnData.length;
    const qualityScore = columnData.reduce((sum, cell) => {
      const enhancedCell = cell as IntelligentCell;
      return sum + (enhancedCell.qualityScore || 0.7);
    }, 0) / columnData.length;

    return {
      index: col,
      enhancedDataType: primaryType,
      confidence: 0.8,
      patterns: [],
      qualityScore,
      uniqueValues,
      nullCount
    };
  }

  private static checkColumnConsistency(sheet: Sheet, col: number, currentRow: number): number {
    const columnCells = sheet.data.map(row => row && row[col]).filter(cell => cell && cell.value);
    if (columnCells.length < 2) return 1.0;

    const currentCell = sheet.data[currentRow] && sheet.data[currentRow]![col];
    if (!currentCell) return 0.0;

    const currentType = (currentCell as IntelligentCell).enhancedDataType;
    const sameTypeCount = columnCells.filter(cell => {
      const enhancedCell = cell as IntelligentCell;
      return enhancedCell.enhancedDataType === currentType;
    }).length;

    return sameTypeCount / columnCells.length;
  }

  private static isNumericOutlier(value: any, sheet: Sheet, col: number): boolean {
    const numericValues = sheet.data
      .map(row => row && row[col])
      .filter(cell => cell && cell.dataType === DataType.NUMBER && typeof cell.value === 'number')
      .map(cell => cell!.value as number);

    if (numericValues.length < 4) return false;

    const sorted = [...numericValues].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)] || 0;
    const q3 = sorted[Math.floor(sorted.length * 0.75)] || 0;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return typeof value === 'number' && (value < lowerBound || value > upperBound);
  }

  private static generatePhoneticKey(value: string): string {
    // Simple phonetic key generation (Soundex-like)
    return value.toLowerCase()
      .replace(/[aeiou]/g, '')
      .replace(/[^a-z]/g, '')
      .substring(0, 4)
      .padEnd(4, '0');
  }

  private static indexCompanyName(name: string, cellRef: CellReference, index: Map<string, CompanyMatch[]>): void {
    const normalizedName = name.toLowerCase().trim();
    const key = normalizedName.substring(0, 3);
    
    if (!index.has(key)) {
      index.set(key, []);
    }
    
    const existing = index.get(key)!.find(match => match.normalizedName === normalizedName);
    if (existing) {
      existing.cellReferences.push(cellRef);
    } else {
      const aliases = this.COMPANY_SYNONYMS.get(normalizedName) || [];
      index.get(key)!.push({
        originalName: name,
        normalizedName,
        aliases,
        confidence: 0.8,
        cellReferences: [cellRef]
      });
    }
  }

  private static indexFinancialTerm(term: string, cellRef: CellReference, index: Map<string, TermMatch[]>): void {
    const normalizedTerm = term.toLowerCase().trim();
    const key = normalizedTerm.substring(0, 3);
    
    if (!index.has(key)) {
      index.set(key, []);
    }
    
    const synonyms = this.FINANCIAL_TERMS.get(normalizedTerm) || [];
    index.get(key)!.push({
      term: normalizedTerm,
      category: 'financial',
      synonyms,
      confidence: 0.8,
      cellReferences: [cellRef]
    });
  }

  // Pattern detection methods

  private static detectHeaderPatterns(sheet: Sheet): any[] {
    const patterns: any[] = [];
    
    // Simple heuristic: first row with mostly text is likely a header
    if (sheet.data.length > 0 && sheet.data[0]) {
      const firstRow = sheet.data[0];
      const textCells = firstRow.filter(cell => cell && cell.dataType === DataType.TEXT).length;
      
      if (textCells > firstRow.length * 0.7) {
        patterns.push({
          row: 0,
          columns: Array.from({ length: firstRow.length }, (_, i) => i),
          confidence: 0.8,
          type: 'main_header',
          content: firstRow.map(cell => cell ? String(cell.value) : '')
        });
      }
    }
    
    return patterns;
  }

  private static detectDataBlocks(sheet: Sheet): any[] {
    const blocks: any[] = [];
    
    // Simple heuristic: continuous non-empty data forms a block
    let blockStart = -1;
    
    for (let row = 0; row < sheet.data.length; row++) {
      const rowData = sheet.data[row];
      const hasData = rowData && rowData.some(cell => cell && cell.value);
      
      if (hasData && blockStart === -1) {
        blockStart = row;
      } else if (!hasData && blockStart !== -1) {
        blocks.push({
          startRow: blockStart,
          endRow: row - 1,
          startCol: 0,
          endCol: (sheet.data[blockStart] && sheet.data[blockStart]!.length - 1) || 0,
          type: PatternType.DATA_BLOCK,
          confidence: 0.7,
          description: `Data block from row ${blockStart + 1} to ${row}`
        });
        blockStart = -1;
      }
    }
    
    // Handle block that extends to end of sheet
    if (blockStart !== -1) {
      blocks.push({
        startRow: blockStart,
        endRow: sheet.data.length - 1,
        startCol: 0,
        endCol: (sheet.data[blockStart] && sheet.data[blockStart]!.length - 1) || 0,
        type: PatternType.DATA_BLOCK,
        confidence: 0.7,
        description: `Data block from row ${blockStart + 1} to end`
      });
    }
    
    return blocks;
  }

  private static detectTimeSeriesPatterns(sheet: Sheet): any[] {
    const patterns: any[] = [];
    
    // Look for date columns
    if (sheet.data.length > 1 && sheet.data[0]) {
      for (let col = 0; col < sheet.data[0].length; col++) {
        const columnData = sheet.data.map(row => row && row[col]).filter(cell => cell);
        const dateCells = columnData.filter(cell => 
          cell && (cell.dataType === DataType.DATE || 
                  (cell as IntelligentCell).enhancedDataType === EnhancedDataType.DATE)
        );
        
        if (dateCells.length > columnData.length * 0.7) {
          // Find associated value columns
          const valueColumns: number[] = [];
          for (let valueCol = 0; valueCol < sheet.data[0].length; valueCol++) {
            if (valueCol !== col) {
              const valueColumnData = sheet.data.map(row => row && row[valueCol]).filter(cell => cell);
              const numericCells = valueColumnData.filter(cell => 
                cell && cell.dataType === DataType.NUMBER
              );
              
              if (numericCells.length > valueColumnData.length * 0.7) {
                valueColumns.push(valueCol);
              }
            }
          }
          
          if (valueColumns.length > 0) {
            patterns.push({
              dateColumn: col,
              valueColumns,
              frequency: 'irregular', // Would need more analysis to determine
              trend: 'stable',        // Would need more analysis to determine
              confidence: 0.7
            });
          }
        }
      }
    }
    
    return patterns;
  }

  // Factory methods for empty objects

  private static createEmptyDataPatterns(): DataPatterns {
    return {
      headerPatterns: [],
      dataBlocks: [],
      relationships: [],
      hierarchies: [],
      timeSeriesPatterns: []
    };
  }

  private static createEmptyQualityAssessment(): QualityAssessment {
    return {
      overallScore: 0.5,
      completeness: 0.5,
      consistency: 0.5,
      accuracy: 0.5,
      validity: 0.5,
      uniqueness: 0.5,
      issues: [],
      recommendations: []
    };
  }

  private static createDefaultDomainContext(): DomainContext {
    return {
      domain: DomainType.GENERAL,
      confidence: 0.5
    };
  }

  private static createEmptyFuzzyIndex(): FuzzySearchIndex {
    return {
      companyNames: new Map(),
      financialTerms: new Map(),
      generalTerms: new Map(),
      phoneticIndex: new Map()
    };
  }

  private static detectDomainContext(sheets: Sheet[], searchIndex: SearchIndex): DomainContext {
    const domainScores = new Map<DomainType, number>();
    
    // Initialize scores
    Object.values(DomainType).forEach(domain => {
      domainScores.set(domain, 0);
    });

    // Analyze content for domain indicators
    searchIndex.byContent.forEach((cellRefs, term) => {
      const lowerTerm = term.toLowerCase();
      
      // Financial indicators
      if (this.FINANCIAL_TERMS.has(lowerTerm) || 
          ['revenue', 'profit', 'loss', 'assets', 'stock', 'investment'].some(t => lowerTerm.includes(t))) {
        domainScores.set(DomainType.FINANCIAL, domainScores.get(DomainType.FINANCIAL)! + cellRefs.length);
      }
      
      // Business indicators
      if (['customer', 'employee', 'department', 'project', 'budget'].some(t => lowerTerm.includes(t))) {
        domainScores.set(DomainType.BUSINESS, domainScores.get(DomainType.BUSINESS)! + cellRefs.length);
      }
      
      // Sales indicators
      if (['sales', 'revenue', 'customer', 'product', 'order'].some(t => lowerTerm.includes(t))) {
        domainScores.set(DomainType.SALES, domainScores.get(DomainType.SALES)! + cellRefs.length);
      }
    });

    // Find domain with highest score
    const [primaryDomain, score] = Array.from(domainScores.entries())
      .sort(([,a], [,b]) => b - a)[0] || [DomainType.GENERAL, 0];

    const totalCells = Array.from(searchIndex.byContent.values())
      .reduce((sum, refs) => sum + refs.length, 0);
    
    const confidence = totalCells > 0 ? Math.min(score / totalCells * 5, 1.0) : 0.5;

    return {
      domain: primaryDomain,
      confidence
    };
  }

  private static createColumnMappings(sheets: Sheet[], domainContext: DomainContext): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];
    
    sheets.forEach(sheet => {
      if (sheet.data.length > 0 && sheet.data[0]) {
        for (let col = 0; col < sheet.data[0].length; col++) {
          const columnInfo = this.analyzeColumn(sheet, col);
          
          mappings.push({
            sourceColumn: col,
            targetName: `column_${col}`,
            dataType: columnInfo.enhancedDataType,
            transformations: [],
            confidence: columnInfo.confidence
          });
        }
      }
    });
    
    return mappings;
  }

  private static buildEntityIndex(sheets: Sheet[], config: EnhancedParseConfig): EntityIndex {
    const companies = new Map<string, any[]>();
    const people = new Map<string, any[]>();
    const locations = new Map<string, any[]>();
    const products = new Map<string, any[]>();
    const financialInstruments = new Map<string, any[]>();

    // This would be populated with actual entity recognition logic
    // For now, return empty indices
    
    return {
      companies,
      people,
      locations,
      products,
      financialInstruments
    };
  }

  private static buildSynonymIndex(config: EnhancedParseConfig): SynonymIndex {
    return {
      companyNames: this.COMPANY_SYNONYMS,
      financialTerms: this.FINANCIAL_TERMS,
      businessTerms: this.BUSINESS_TERMS,
      technicalTerms: new Map(),
      abbreviations: new Map([
        ['roi', 'return on investment'],
        ['kpi', 'key performance indicator'],
        ['ceo', 'chief executive officer'],
        ['cfo', 'chief financial officer'],
        ['hr', 'human resources'],
        ['it', 'information technology']
      ])
    };
  }
}