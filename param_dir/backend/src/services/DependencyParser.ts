import { Formula, DependencyGraph, DependencyNode, NamedRange } from '../types';

export interface CellReference {
  sheet?: string;
  column: string;
  row: number;
  isAbsolute: boolean;
  isRange: boolean;
  endColumn?: string;
  endRow?: number;
}

export interface FormulaAnalysis {
  cellReferences: CellReference[];
  namedRanges: string[];
  functions: string[];
  hasCircularReference: boolean;
}

export class DependencyParser {
  private static readonly CELL_REFERENCE_REGEX = /(?:([A-Za-z_][A-Za-z0-9_]*|'[^']*')!)?(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)/g;
  private static readonly FUNCTION_REGEX = /\b([A-Z][A-Z0-9_]*)\s*\(/g;

  /**
   * Parse a formula to extract all dependencies
   */
  static parseFormula(formula: string, currentSheet?: string): FormulaAnalysis {
    const cellReferences = this.extractCellReferences(formula, currentSheet);
    const namedRanges = this.extractNamedRanges(formula);
    const functions = this.extractFunctions(formula);

    return {
      cellReferences,
      namedRanges,
      functions,
      hasCircularReference: false, // Will be determined by dependency graph analysis
    };
  }

  /**
   * Build a complete dependency graph for all formulas in a spreadsheet
   */
  static buildDependencyGraph(formulas: Formula[], namedRanges: NamedRange[] = []): DependencyGraph {
    const nodes = new Map<string, DependencyNode>();
    const edges = new Map<string, Set<string>>();

    // Initialize nodes for all formulas
    formulas.forEach(formula => {
      const nodeId = this.getCellId(formula.sheet, formula.cell);
      nodes.set(nodeId, {
        id: nodeId,
        cell: formula.cell,
        sheet: formula.sheet,
        formula: formula.formula,
        precedents: [],
        dependents: [],
        level: 0,
      });
      edges.set(nodeId, new Set());
    });

    // Build edges based on formula dependencies
    formulas.forEach(formula => {
      const nodeId = this.getCellId(formula.sheet, formula.cell);
      const analysis = this.parseFormula(formula.formula, formula.sheet);
      
      // Process cell references
      analysis.cellReferences.forEach(ref => {
        if (ref.isRange && ref.endColumn && ref.endRow) {
          // Expand range into individual cells (limit to reasonable size)
          const startCol = this.columnToIndex(ref.column);
          const endCol = this.columnToIndex(ref.endColumn);
          const startRow = ref.row;
          const endRow = ref.endRow;
          
          // Limit range expansion to prevent performance issues
          const maxCells = 10000; // Configurable limit
          const totalCells = (endCol - startCol + 1) * (endRow - startRow + 1);
          
          if (totalCells <= maxCells) {
            for (let row = startRow; row <= endRow; row++) {
              for (let col = startCol; col <= endCol; col++) {
                const cellAddress = this.indexToColumnName(col) + row;
                const refId = this.getCellId(ref.sheet || formula.sheet, cellAddress);
                
                this.addDependencyEdge(nodes, edges, refId, nodeId);
              }
            }
          } else {
            // For very large ranges, just add the range as a dependency without expanding
            const rangeId = this.getCellId(ref.sheet || formula.sheet, 
              `${ref.column}${ref.row}:${ref.endColumn}${ref.endRow}`);
            this.addDependencyEdge(nodes, edges, rangeId, nodeId);
          }
        } else {
          // Single cell reference
          const refId = this.getCellId(ref.sheet || formula.sheet, this.formatCellReference(ref));
          this.addDependencyEdge(nodes, edges, refId, nodeId);
        }
      });

      // Process named ranges
      analysis.namedRanges.forEach(namedRangeName => {
        const namedRange = namedRanges.find(nr => nr.name === namedRangeName);
        if (namedRange) {
          // Create a dependency on the named range
          const namedRangeId = `${namedRange.sheetName}!${namedRangeName}`;
          this.addDependencyEdge(nodes, edges, namedRangeId, nodeId);
          
          // If the named range has a formula, parse it too
          if (namedRange.formula) {
            const namedRangeAnalysis = this.parseFormula(namedRange.formula, namedRange.sheetName);
            namedRangeAnalysis.cellReferences.forEach(ref => {
              const refId = this.getCellId(ref.sheet || namedRange.sheetName, this.formatCellReference(ref));
              this.addDependencyEdge(nodes, edges, refId, namedRangeId);
            });
          }
        }
      });
    });

    // Calculate dependency levels and detect circular references
    const circularReferences = this.detectCircularReferences(nodes, edges);
    this.calculateDependencyLevels(nodes, edges);

    return {
      nodes: Array.from(nodes.values()),
      edges: this.convertEdgesToArray(edges),
      circularReferences,
      namedRanges,
    };
  }

  /**
   * Find all precedent cells for a given cell
   */
  static findPrecedents(cellId: string, graph: DependencyGraph): DependencyNode[] {
    const visited = new Set<string>();
    const precedents: DependencyNode[] = [];

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = graph.nodes.find(n => n.id === nodeId);
      if (node) {
        node.precedents.forEach(precId => {
          const precNode = graph.nodes.find(n => n.id === precId);
          if (precNode && !precedents.find(p => p.id === precId)) {
            precedents.push(precNode);
            traverse(precId);
          }
        });
      }
    };

    traverse(cellId);
    return precedents;
  }

  /**
   * Find all dependent cells for a given cell
   */
  static findDependents(cellId: string, graph: DependencyGraph): DependencyNode[] {
    const visited = new Set<string>();
    const dependents: DependencyNode[] = [];

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = graph.nodes.find(n => n.id === nodeId);
      if (node) {
        node.dependents.forEach(depId => {
          const depNode = graph.nodes.find(n => n.id === depId);
          if (depNode && !dependents.find(d => d.id === depId)) {
            dependents.push(depNode);
            traverse(depId);
          }
        });
      }
    };

    traverse(cellId);
    return dependents;
  }

  /**
   * Extract cell references from a formula
   */
  private static extractCellReferences(formula: string, currentSheet?: string): CellReference[] {
    const references: CellReference[] = [];
    let match;

    // Reset regex lastIndex
    this.CELL_REFERENCE_REGEX.lastIndex = 0;

    while ((match = this.CELL_REFERENCE_REGEX.exec(formula)) !== null) {
      const [, sheetPart, cellPart] = match;
      const sheet = sheetPart ? sheetPart.replace(/'/g, '') : currentSheet;
      
      if (!cellPart) continue;
      
      try {
        if (cellPart.includes(':')) {
          // Range reference
          const [start, end] = cellPart.split(':');
          if (!start || !end) continue;
          
          const startRef = this.parseCellAddress(start);
          const endRef = this.parseCellAddress(end);
          
          // Validate range order (start should be before end)
          const startColIndex = this.columnToIndex(startRef.column);
          const endColIndex = this.columnToIndex(endRef.column);
          
          if (startColIndex <= endColIndex && startRef.row <= endRef.row) {
            references.push({
              sheet: sheet || currentSheet || '',
              column: startRef.column,
              row: startRef.row,
              isAbsolute: startRef.isAbsolute || endRef.isAbsolute,
              isRange: true,
              endColumn: endRef.column,
              endRow: endRef.row,
            });
          }
        } else {
          // Single cell reference
          const cellRef = this.parseCellAddress(cellPart);
          references.push({
            sheet: sheet || currentSheet || '',
            column: cellRef.column,
            row: cellRef.row,
            isAbsolute: cellRef.isAbsolute,
            isRange: false,
          });
        }
      } catch (error) {
        // Skip invalid cell references but log for debugging
        console.warn(`Invalid cell reference in formula "${formula}": ${cellPart}`, error);
        continue;
      }
    }

    return references;
  }

  /**
   * Extract named ranges from a formula
   */
  private static extractNamedRanges(formula: string): string[] {
    const namedRanges: string[] = [];
    
    // Create a copy of the formula for processing
    let processedFormula = formula;
    
    // Remove string literals (text in quotes) to avoid false positives
    processedFormula = processedFormula.replace(/"[^"]*"/g, '');
    processedFormula = processedFormula.replace(/'[^']*'/g, '');
    
    // Remove cell references
    const cellRefs = processedFormula.match(this.CELL_REFERENCE_REGEX) || [];
    cellRefs.forEach(ref => {
      processedFormula = processedFormula.replace(ref, ' ');
    });
    
    // Remove function calls (but keep the content inside parentheses)
    const functions = processedFormula.match(this.FUNCTION_REGEX) || [];
    functions.forEach(func => {
      processedFormula = processedFormula.replace(func, '(');
    });

    // Remove operators and special characters, keeping only potential identifiers
    processedFormula = processedFormula.replace(/[+\-*/=<>!&%^()[\]{},;:]/g, ' ');
    
    // Split by whitespace and filter potential named ranges
    const tokens = processedFormula.split(/\s+/).filter(token => token.trim().length > 0);
    
    tokens.forEach(token => {
      // Check if token looks like a named range (starts with letter or underscore)
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
        // Filter out common Excel functions, operators, and keywords
        if (!this.isExcelFunction(token) && !this.isOperator(token) && !this.isExcelKeyword(token)) {
          namedRanges.push(token);
        }
      }
    });

    return [...new Set(namedRanges)]; // Remove duplicates
  }

  /**
   * Extract function names from a formula
   */
  private static extractFunctions(formula: string): string[] {
    const functions: string[] = [];
    let match;

    this.FUNCTION_REGEX.lastIndex = 0;
    
    while ((match = this.FUNCTION_REGEX.exec(formula)) !== null) {
      const [, funcName] = match;
      if (funcName) {
        functions.push(funcName);
      }
    }

    return [...new Set(functions)]; // Remove duplicates
  }

  /**
   * Parse a cell address (e.g., "$A$1", "B2", "C:C")
   */
  private static parseCellAddress(address: string): { column: string; row: number; isAbsolute: boolean } {
    const match = address.match(/(\$?)([A-Z]+)(\$?)(\d+)/);
    if (!match) {
      throw new Error(`Invalid cell address: ${address}`);
    }

    const [, colAbs, column, rowAbs, rowStr] = match;
    if (!column || !rowStr) {
      throw new Error(`Invalid cell address: ${address}`);
    }
    const row = parseInt(rowStr, 10);
    const isAbsolute = !!(colAbs || rowAbs);

    return { column, row, isAbsolute };
  }

  /**
   * Format a cell reference back to string
   */
  private static formatCellReference(ref: CellReference): string {
    const colPrefix = ref.isAbsolute ? '$' : '';
    const rowPrefix = ref.isAbsolute ? '$' : '';
    
    if (ref.isRange && ref.endColumn && ref.endRow) {
      return `${colPrefix}${ref.column}${rowPrefix}${ref.row}:${colPrefix}${ref.endColumn}${rowPrefix}${ref.endRow}`;
    }
    
    return `${colPrefix}${ref.column}${rowPrefix}${ref.row}`;
  }

  /**
   * Generate a unique cell ID
   */
  private static getCellId(sheet: string, cell: string): string {
    return `${sheet}!${cell}`;
  }

  /**
   * Detect circular references in the dependency graph
   */
  private static detectCircularReferences(
    nodes: Map<string, DependencyNode>,
    edges: Map<string, Set<string>>
  ): string[][] {
    const circularReferences: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // Found circular reference
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          circularReferences.push(path.slice(cycleStart).concat(nodeId));
        }
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const dependents = edges.get(nodeId) || new Set();
      dependents.forEach(depId => {
        dfs(depId, [...path]);
      });

      recursionStack.delete(nodeId);
    };

    nodes.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    });

    return circularReferences;
  }

  /**
   * Calculate dependency levels for topological ordering
   */
  private static calculateDependencyLevels(
    nodes: Map<string, DependencyNode>,
    edges: Map<string, Set<string>>
  ): void {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];

    // Initialize in-degrees
    nodes.forEach((_, nodeId) => {
      inDegree.set(nodeId, 0);
    });

    // Calculate in-degrees
    edges.forEach(dependents => {
      dependents.forEach(depId => {
        inDegree.set(depId, (inDegree.get(depId) || 0) + 1);
      });
    });

    // Find nodes with no dependencies (level 0)
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
        const node = nodes.get(nodeId);
        if (node) node.level = 0;
      }
    });

    // Process nodes level by level
    let currentLevel = 0;
    while (queue.length > 0) {
      const levelSize = queue.length;
      
      for (let i = 0; i < levelSize; i++) {
        const nodeId = queue.shift()!;
        const dependents = edges.get(nodeId) || new Set();
        
        dependents.forEach(depId => {
          const newInDegree = (inDegree.get(depId) || 0) - 1;
          inDegree.set(depId, newInDegree);
          
          if (newInDegree === 0) {
            queue.push(depId);
            const node = nodes.get(depId);
            if (node) node.level = currentLevel + 1;
          }
        });
      }
      
      currentLevel++;
    }
  }

  /**
   * Convert edges map to array format
   */
  private static convertEdgesToArray(edges: Map<string, Set<string>>): Array<{ from: string; to: string }> {
    const edgeArray: Array<{ from: string; to: string }> = [];
    
    edges.forEach((dependents, from) => {
      dependents.forEach(to => {
        edgeArray.push({ from, to });
      });
    });
    
    return edgeArray;
  }

  /**
   * Check if a name is a known Excel function
   */
  private static isExcelFunction(name: string): boolean {
    const commonFunctions = [
      'SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'IF', 'VLOOKUP', 'HLOOKUP',
      'INDEX', 'MATCH', 'CONCATENATE', 'LEFT', 'RIGHT', 'MID', 'LEN',
      'UPPER', 'LOWER', 'TRIM', 'SUBSTITUTE', 'FIND', 'SEARCH', 'TODAY',
      'NOW', 'DATE', 'TIME', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE',
      'SECOND', 'WEEKDAY', 'NETWORKDAYS', 'DATEDIF', 'PMT', 'PV', 'FV',
      'RATE', 'NPER', 'IRR', 'NPV', 'AND', 'OR', 'NOT', 'TRUE', 'FALSE'
    ];
    
    return commonFunctions.includes(name.toUpperCase());
  }

  /**
   * Check if a name is an operator or keyword
   */
  private static isOperator(name: string): boolean {
    const operators = ['AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'NULL', 'ERROR'];
    return operators.includes(name.toUpperCase());
  }

  /**
   * Check if a name is an Excel keyword or reserved word
   */
  private static isExcelKeyword(name: string): boolean {
    const keywords = [
      'DIV', 'MOD', 'REF', 'VALUE', 'NAME', 'NUM', 'NA', 'GETTING_DATA',
      'SPILL', 'CALC', 'CONNECT', 'BLOCKED', 'UNKNOWN', 'FIELD', 'SYNTAX',
      'PYTHON', 'LAMBDA', 'LET', 'BYROW', 'BYCOL', 'MAKEARRAY', 'REDUCE',
      'SCAN', 'MAP', 'FILTER', 'SORT', 'SORTBY', 'UNIQUE', 'SEQUENCE',
      'RANDARRAY', 'XLOOKUP', 'XMATCH', 'SWITCH', 'IFS', 'MAXIFS', 'MINIFS'
    ];
    return keywords.includes(name.toUpperCase());
  }

  /**
   * Convert column name to index (A=0, B=1, etc.)
   */
  private static columnToIndex(column: string): number {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return result - 1;
  }

  /**
   * Convert column index to name (0=A, 1=B, etc.)
   */
  private static indexToColumnName(index: number): string {
    let result = '';
    let temp = index + 1;
    
    while (temp > 0) {
      temp--;
      result = String.fromCharCode('A'.charCodeAt(0) + (temp % 26)) + result;
      temp = Math.floor(temp / 26);
    }
    
    return result;
  }

  /**
   * Add a dependency edge between two nodes
   */
  private static addDependencyEdge(
    nodes: Map<string, DependencyNode>,
    edges: Map<string, Set<string>>,
    fromId: string,
    toId: string
  ): void {
    // Add edge from dependency to current cell
    if (!edges.has(fromId)) {
      edges.set(fromId, new Set());
    }
    edges.get(fromId)!.add(toId);
    
    // Update node relationships
    const currentNode = nodes.get(toId);
    const refNode = nodes.get(fromId);
    
    if (currentNode) {
      if (!currentNode.precedents.includes(fromId)) {
        currentNode.precedents.push(fromId);
      }
    }
    
    if (refNode) {
      if (!refNode.dependents.includes(toId)) {
        refNode.dependents.push(toId);
      }
    }
  }
}