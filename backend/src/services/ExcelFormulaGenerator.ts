/**
 * Excel Formula Generator
 * 
 * Generates Excel formulas with proper syntax, validation, and optimization.
 * Supports complex formula construction, error handling, and performance optimization.
 */

import {
  FormulaInstruction,
  FormulaParameter,
  FormulaValidation,
  AlternativeFormula,
  PerformanceMetrics
} from '../types/agent-prompt';
import { ComprehensiveContext } from '../types/context-synthesis';
import { IntelligentSpreadsheetData } from '../types/enhanced-intelligence';

export interface FormulaGenerationConfig {
  excelVersion: 'Excel2016' | 'Excel2019' | 'Excel365' | 'ExcelOnline';
  preferArrayFormulas: boolean;
  includeErrorHandling: boolean;
  optimizeForPerformance: boolean;
  includeComments: boolean;
}

export interface FormulaContext {
  dataRange: string;
  headerRow: number;
  dataStartRow: number;
  columnMappings: Map<string, string>;
  namedRanges: Map<string, string>;
}

export class ExcelFormulaGenerator {
  private readonly formulaLibrary: Map<string, FormulaTemplate>;
  private readonly functionCompatibility: Map<string, string[]>;

  constructor() {
    this.formulaLibrary = this.initializeFormulaLibrary();
    this.functionCompatibility = this.initializeFunctionCompatibility();
  }

  /**
   * Generate formula instruction for specific calculation
   */
  generateFormulaInstruction(
    purpose: string,
    context: ComprehensiveContext,
    formulaContext: FormulaContext,
    config: FormulaGenerationConfig = this.getDefaultConfig()
  ): FormulaInstruction {
    const template = this.selectFormulaTemplate(purpose, context);
    const formula = this.buildFormula(template, context, formulaContext, config);
    const validation = this.createValidation(formula, template, config);
    const alternatives = this.generateAlternatives(template, context, config);
    const performance = this.assessPerformance(formula, context, config);

    return {
      purpose,
      formula,
      syntax: template.syntax,
      parameters: this.buildParameters(template, formulaContext),
      cellReference: this.determineCellReference(purpose, formulaContext),
      dependencies: this.identifyDependencies(formula, formulaContext),
      validation,
      alternatives,
      performance
    };
  }

  /**
   * Generate lookup formulas (VLOOKUP, XLOOKUP, INDEX/MATCH)
   */
  generateLookupFormula(
    lookupValue: string,
    tableRange: string,
    returnColumn: string | number,
    exactMatch: boolean = true,
    config: FormulaGenerationConfig
  ): FormulaInstruction {
    let formula: string;
    let syntax: string;
    let alternatives: AlternativeFormula[] = [];

    // Use XLOOKUP if available (Excel 365)
    if (config.excelVersion === 'Excel365') {
      formula = `=XLOOKUP(${lookupValue}, ${this.getColumnRange(tableRange, 1)}, ${this.getColumnRange(tableRange, returnColumn)})`;
      syntax = 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])';
      
      alternatives.push({
        formula: `=VLOOKUP(${lookupValue}, ${tableRange}, ${returnColumn}, ${exactMatch ? 'FALSE' : 'TRUE'})`,
        description: 'Traditional VLOOKUP approach',
        advantages: ['Compatible with older Excel versions'],
        disadvantages: ['Less flexible', 'Cannot search right to left'],
        useCase: 'When XLOOKUP is not available',
        performance: 'slower'
      });
    } else {
      // Use VLOOKUP for older versions
      formula = `=VLOOKUP(${lookupValue}, ${tableRange}, ${returnColumn}, ${exactMatch ? 'FALSE' : 'TRUE'})`;
      syntax = 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])';
      
      alternatives.push({
        formula: `=INDEX(${this.getColumnRange(tableRange, returnColumn)}, MATCH(${lookupValue}, ${this.getColumnRange(tableRange, 1)}, 0))`,
        description: 'INDEX/MATCH combination',
        advantages: ['More flexible', 'Can search right to left', 'Better performance with large datasets'],
        disadvantages: ['More complex syntax'],
        useCase: 'When flexibility is needed or VLOOKUP limitations are encountered',
        performance: 'faster'
      });
    }

    // Add error handling if requested
    if (config.includeErrorHandling) {
      formula = `=IFERROR(${formula}, "Not Found")`;
    }

    return {
      purpose: 'Lookup value in table',
      formula,
      syntax,
      parameters: [
        {
          name: 'lookup_value',
          type: 'cell',
          description: 'Value to search for',
          example: lookupValue,
          validation: 'Must match data type in lookup column',
          required: true
        },
        {
          name: 'table_array',
          type: 'range',
          description: 'Table to search in',
          example: tableRange,
          validation: 'Must include lookup and return columns',
          required: true
        }
      ],
      cellReference: 'Dynamic',
      dependencies: [lookupValue, tableRange],
      validation: this.createLookupValidation(config),
      alternatives,
      performance: this.assessLookupPerformance(formula, config)
    };
  }

  /**
   * Generate aggregation formulas (SUM, AVERAGE, COUNT, etc.)
   */
  generateAggregationFormula(
    operation: 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN' | 'MEDIAN' | 'MODE',
    range: string,
    criteria?: string,
    config: FormulaGenerationConfig = this.getDefaultConfig()
  ): FormulaInstruction {
    let formula: string;
    let syntax: string;

    if (criteria) {
      // Use conditional aggregation functions
      switch (operation) {
        case 'SUM':
          formula = `=SUMIF(${this.getCriteriaRange(range)}, ${criteria}, ${range})`;
          syntax = 'SUMIF(range, criteria, [sum_range])';
          break;
        case 'AVERAGE':
          formula = `=AVERAGEIF(${this.getCriteriaRange(range)}, ${criteria}, ${range})`;
          syntax = 'AVERAGEIF(range, criteria, [average_range])';
          break;
        case 'COUNT':
          formula = `=COUNTIF(${range}, ${criteria})`;
          syntax = 'COUNTIF(range, criteria)';
          break;
        default:
          // Use array formula for other operations with criteria
          formula = `=${operation}(IF(${this.getCriteriaRange(range)}=${criteria}, ${range}))`;
          syntax = `${operation}(IF(criteria_range=criteria, value_range))`;
      }
    } else {
      // Simple aggregation
      formula = `=${operation}(${range})`;
      syntax = `${operation}(number1, [number2], ...)`;
    }

    // Add error handling
    if (config.includeErrorHandling) {
      formula = `=IFERROR(${formula}, 0)`;
    }

    const alternatives = this.generateAggregationAlternatives(operation, range, criteria, config);

    return {
      purpose: `Calculate ${operation.toLowerCase()} of range${criteria ? ' with criteria' : ''}`,
      formula,
      syntax,
      parameters: this.buildAggregationParameters(operation, range, criteria),
      cellReference: 'Dynamic',
      dependencies: [range],
      validation: this.createAggregationValidation(operation, config),
      alternatives,
      performance: this.assessAggregationPerformance(operation, range, config)
    };
  }

  /**
   * Generate conditional formulas (IF, IFS, SWITCH)
   */
  generateConditionalFormula(
    conditions: Array<{ condition: string; result: string }>,
    defaultResult: string,
    config: FormulaGenerationConfig = this.getDefaultConfig()
  ): FormulaInstruction {
    let formula: string;
    let syntax: string;

    if (conditions.length === 1) {
      // Simple IF
      formula = `=IF(${conditions[0].condition}, ${conditions[0].result}, ${defaultResult})`;
      syntax = 'IF(logical_test, value_if_true, value_if_false)';
    } else if (config.excelVersion === 'Excel365' || config.excelVersion === 'Excel2019') {
      // Use IFS for multiple conditions
      const conditionPairs = conditions.map(c => `${c.condition}, ${c.result}`).join(', ');
      formula = `=IFS(${conditionPairs}, TRUE, ${defaultResult})`;
      syntax = 'IFS(logical_test1, value_if_true1, [logical_test2, value_if_true2], ...)';
    } else {
      // Nested IF for older versions
      formula = this.buildNestedIF(conditions, defaultResult);
      syntax = 'Nested IF statements';
    }

    const alternatives = this.generateConditionalAlternatives(conditions, defaultResult, config);

    return {
      purpose: 'Conditional logic with multiple criteria',
      formula,
      syntax,
      parameters: this.buildConditionalParameters(conditions, defaultResult),
      cellReference: 'Dynamic',
      dependencies: conditions.map(c => c.condition),
      validation: this.createConditionalValidation(config),
      alternatives,
      performance: this.assessConditionalPerformance(conditions.length, config)
    };
  }

  /**
   * Generate array formulas for Excel 365
   */
  generateArrayFormula(
    operation: string,
    ranges: string[],
    config: FormulaGenerationConfig
  ): FormulaInstruction {
    if (config.excelVersion !== 'Excel365') {
      throw new Error('Array formulas require Excel 365');
    }

    let formula: string;
    let syntax: string;

    switch (operation.toUpperCase()) {
      case 'FILTER':
        formula = `=FILTER(${ranges[0]}, ${ranges[1]})`;
        syntax = 'FILTER(array, include, [if_empty])';
        break;
      case 'SORT':
        formula = `=SORT(${ranges[0]})`;
        syntax = 'SORT(array, [sort_index], [sort_order], [by_col])';
        break;
      case 'UNIQUE':
        formula = `=UNIQUE(${ranges[0]})`;
        syntax = 'UNIQUE(array, [by_col], [exactly_once])';
        break;
      case 'SEQUENCE':
        formula = `=SEQUENCE(${ranges[0]})`;
        syntax = 'SEQUENCE(rows, [columns], [start], [step])';
        break;
      default:
        throw new Error(`Unsupported array operation: ${operation}`);
    }

    return {
      purpose: `Dynamic array operation: ${operation}`,
      formula,
      syntax,
      parameters: this.buildArrayParameters(operation, ranges),
      cellReference: 'Dynamic (spills)',
      dependencies: ranges,
      validation: this.createArrayValidation(operation, config),
      alternatives: this.generateArrayAlternatives(operation, ranges, config),
      performance: this.assessArrayPerformance(operation, ranges, config)
    };
  }

  /**
   * Generate financial formulas
   */
  generateFinancialFormula(
    type: 'NPV' | 'IRR' | 'PMT' | 'FV' | 'PV' | 'RATE',
    parameters: Record<string, string>,
    config: FormulaGenerationConfig
  ): FormulaInstruction {
    let formula: string;
    let syntax: string;

    switch (type) {
      case 'NPV':
        formula = `=NPV(${parameters.rate}, ${parameters.values})`;
        syntax = 'NPV(rate, value1, [value2], ...)';
        break;
      case 'IRR':
        formula = `=IRR(${parameters.values}, ${parameters.guess || '0.1'})`;
        syntax = 'IRR(values, [guess])';
        break;
      case 'PMT':
        formula = `=PMT(${parameters.rate}, ${parameters.nper}, ${parameters.pv}, ${parameters.fv || '0'}, ${parameters.type || '0'})`;
        syntax = 'PMT(rate, nper, pv, [fv], [type])';
        break;
      case 'FV':
        formula = `=FV(${parameters.rate}, ${parameters.nper}, ${parameters.pmt}, ${parameters.pv || '0'}, ${parameters.type || '0'})`;
        syntax = 'FV(rate, nper, pmt, [pv], [type])';
        break;
      case 'PV':
        formula = `=PV(${parameters.rate}, ${parameters.nper}, ${parameters.pmt}, ${parameters.fv || '0'}, ${parameters.type || '0'})`;
        syntax = 'PV(rate, nper, pmt, [fv], [type])';
        break;
      case 'RATE':
        formula = `=RATE(${parameters.nper}, ${parameters.pmt}, ${parameters.pv}, ${parameters.fv || '0'}, ${parameters.type || '0'}, ${parameters.guess || '0.1'})`;
        syntax = 'RATE(nper, pmt, pv, [fv], [type], [guess])';
        break;
    }

    return {
      purpose: `Financial calculation: ${type}`,
      formula,
      syntax,
      parameters: this.buildFinancialParameters(type, parameters),
      cellReference: 'Dynamic',
      dependencies: Object.values(parameters),
      validation: this.createFinancialValidation(type, config),
      alternatives: this.generateFinancialAlternatives(type, parameters, config),
      performance: this.assessFinancialPerformance(type, config)
    };
  }

  // === HELPER METHODS ===

  private initializeFormulaLibrary(): Map<string, FormulaTemplate> {
    const library = new Map<string, FormulaTemplate>();
    
    // Basic aggregation templates
    library.set('sum', {
      name: 'SUM',
      syntax: 'SUM(number1, [number2], ...)',
      category: 'aggregation',
      description: 'Adds all numbers in a range',
      parameters: ['range'],
      excelVersions: ['all']
    });

    library.set('average', {
      name: 'AVERAGE',
      syntax: 'AVERAGE(number1, [number2], ...)',
      category: 'aggregation',
      description: 'Calculates the average of numbers',
      parameters: ['range'],
      excelVersions: ['all']
    });

    // Lookup templates
    library.set('vlookup', {
      name: 'VLOOKUP',
      syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])',
      category: 'lookup',
      description: 'Looks up a value in a table',
      parameters: ['lookup_value', 'table_array', 'col_index_num', 'range_lookup'],
      excelVersions: ['all']
    });

    library.set('xlookup', {
      name: 'XLOOKUP',
      syntax: 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])',
      category: 'lookup',
      description: 'Modern lookup function',
      parameters: ['lookup_value', 'lookup_array', 'return_array', 'if_not_found', 'match_mode', 'search_mode'],
      excelVersions: ['Excel365']
    });

    return library;
  }

  private initializeFunctionCompatibility(): Map<string, string[]> {
    const compatibility = new Map<string, string[]>();
    
    compatibility.set('XLOOKUP', ['Excel365']);
    compatibility.set('IFS', ['Excel2019', 'Excel365']);
    compatibility.set('SWITCH', ['Excel2019', 'Excel365']);
    compatibility.set('FILTER', ['Excel365']);
    compatibility.set('SORT', ['Excel365']);
    compatibility.set('UNIQUE', ['Excel365']);
    compatibility.set('SEQUENCE', ['Excel365']);
    
    return compatibility;
  }

  private selectFormulaTemplate(purpose: string, context: ComprehensiveContext): FormulaTemplate {
    // Logic to select appropriate template based on purpose and context
    const purposeLower = purpose.toLowerCase();
    
    if (purposeLower.includes('sum') || purposeLower.includes('total')) {
      return this.formulaLibrary.get('sum')!;
    }
    if (purposeLower.includes('average') || purposeLower.includes('mean')) {
      return this.formulaLibrary.get('average')!;
    }
    if (purposeLower.includes('lookup') || purposeLower.includes('find')) {
      return this.formulaLibrary.get('xlookup') || this.formulaLibrary.get('vlookup')!;
    }
    
    // Default to sum
    return this.formulaLibrary.get('sum')!;
  }

  private buildFormula(
    template: FormulaTemplate,
    context: ComprehensiveContext,
    formulaContext: FormulaContext,
    config: FormulaGenerationConfig
  ): string {
    // Build formula based on template and context
    let formula = `=${template.name}(`;
    
    // Add parameters based on template
    const params = template.parameters.map(param => {
      switch (param) {
        case 'range':
          return formulaContext.dataRange;
        case 'lookup_value':
          return 'A2'; // Default, would be determined by context
        case 'table_array':
          return formulaContext.dataRange;
        default:
          return param;
      }
    });
    
    formula += params.join(', ') + ')';
    
    // Add error handling if requested
    if (config.includeErrorHandling) {
      formula = `=IFERROR(${formula}, "Error")`;
    }
    
    return formula;
  }

  private getDefaultConfig(): FormulaGenerationConfig {
    return {
      excelVersion: 'Excel365',
      preferArrayFormulas: true,
      includeErrorHandling: true,
      optimizeForPerformance: true,
      includeComments: true
    };
  }

  // Additional helper methods (placeholder implementations)
  private createValidation(formula: string, template: FormulaTemplate, config: FormulaGenerationConfig): FormulaValidation {
    return {
      syntaxCheck: 'Validate formula syntax',
      logicCheck: 'Validate formula logic',
      dataTypeCheck: 'Validate input data types',
      rangeCheck: 'Validate range references',
      errorHandling: ['Check for #DIV/0!', 'Check for #N/A', 'Check for #VALUE!']
    };
  }

  private generateAlternatives(template: FormulaTemplate, context: ComprehensiveContext, config: FormulaGenerationConfig): AlternativeFormula[] {
    return [];
  }

  private assessPerformance(formula: string, context: ComprehensiveContext, config: FormulaGenerationConfig): PerformanceMetrics {
    return {
      estimatedExecutionTime: 100,
      memoryUsage: 'low',
      scalability: 'good',
      optimization: ['Use array formulas for better performance']
    };
  }

  private buildParameters(template: FormulaTemplate, formulaContext: FormulaContext): FormulaParameter[] {
    return template.parameters.map(param => ({
      name: param,
      type: 'range',
      description: `Parameter: ${param}`,
      example: 'A1:A10',
      validation: 'Valid range reference',
      required: true
    }));
  }

  private determineCellReference(purpose: string, formulaContext: FormulaContext): string {
    return 'A1'; // Placeholder
  }

  private identifyDependencies(formula: string, formulaContext: FormulaContext): string[] {
    return []; // Placeholder
  }

  // Additional placeholder methods
  private getColumnRange(tableRange: string, column: string | number): string { return 'A:A'; }
  private getCriteriaRange(range: string): string { return 'A:A'; }
  private createLookupValidation(config: FormulaGenerationConfig): FormulaValidation { return {} as FormulaValidation; }
  private assessLookupPerformance(formula: string, config: FormulaGenerationConfig): PerformanceMetrics { return {} as PerformanceMetrics; }
  private buildAggregationParameters(operation: string, range: string, criteria?: string): FormulaParameter[] { return []; }
  private createAggregationValidation(operation: string, config: FormulaGenerationConfig): FormulaValidation { return {} as FormulaValidation; }
  private generateAggregationAlternatives(operation: string, range: string, criteria: string | undefined, config: FormulaGenerationConfig): AlternativeFormula[] { return []; }
  private assessAggregationPerformance(operation: string, range: string, config: FormulaGenerationConfig): PerformanceMetrics { return {} as PerformanceMetrics; }
  private buildNestedIF(conditions: Array<{ condition: string; result: string }>, defaultResult: string): string { return ''; }
  private generateConditionalAlternatives(conditions: Array<{ condition: string; result: string }>, defaultResult: string, config: FormulaGenerationConfig): AlternativeFormula[] { return []; }
  private buildConditionalParameters(conditions: Array<{ condition: string; result: string }>, defaultResult: string): FormulaParameter[] { return []; }
  private createConditionalValidation(config: FormulaGenerationConfig): FormulaValidation { return {} as FormulaValidation; }
  private assessConditionalPerformance(conditionCount: number, config: FormulaGenerationConfig): PerformanceMetrics { return {} as PerformanceMetrics; }
  private buildArrayParameters(operation: string, ranges: string[]): FormulaParameter[] { return []; }
  private createArrayValidation(operation: string, config: FormulaGenerationConfig): FormulaValidation { return {} as FormulaValidation; }
  private generateArrayAlternatives(operation: string, ranges: string[], config: FormulaGenerationConfig): AlternativeFormula[] { return []; }
  private assessArrayPerformance(operation: string, ranges: string[], config: FormulaGenerationConfig): PerformanceMetrics { return {} as PerformanceMetrics; }
  private buildFinancialParameters(type: string, parameters: Record<string, string>): FormulaParameter[] { return []; }
  private createFinancialValidation(type: string, config: FormulaGenerationConfig): FormulaValidation { return {} as FormulaValidation; }
  private generateFinancialAlternatives(type: string, parameters: Record<string, string>, config: FormulaGenerationConfig): AlternativeFormula[] { return []; }
  private assessFinancialPerformance(type: string, config: FormulaGenerationConfig): PerformanceMetrics { return {} as PerformanceMetrics; }
}

interface FormulaTemplate {
  name: string;
  syntax: string;
  category: string;
  description: string;
  parameters: string[];
  excelVersions: string[];
}