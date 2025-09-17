import { DependencyParser } from '../DependencyParser';
import { Formula, NamedRange } from '../../types/spreadsheet';

describe('DependencyParser', () => {
  describe('parseFormula', () => {
    it('should parse simple cell references', () => {
      const formula = '=A1+B2';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.cellReferences).toHaveLength(2);
      expect(result.cellReferences[0]).toEqual({
        sheet: 'Sheet1',
        column: 'A',
        row: 1,
        isAbsolute: false,
        isRange: false
      });
      expect(result.cellReferences[1]).toEqual({
        sheet: 'Sheet1',
        column: 'B',
        row: 2,
        isAbsolute: false,
        isRange: false
      });
    });

    it('should parse absolute cell references', () => {
      const formula = '=$A$1+$B$2';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.cellReferences).toHaveLength(2);
      expect(result.cellReferences[0]).toEqual({
        sheet: 'Sheet1',
        column: 'A',
        row: 1,
        isAbsolute: true,
        isRange: false
      });
      expect(result.cellReferences[1]).toEqual({
        sheet: 'Sheet1',
        column: 'B',
        row: 2,
        isAbsolute: true,
        isRange: false
      });
    });

    it('should parse range references', () => {
      const formula = '=SUM(A1:C10)';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.cellReferences).toHaveLength(1);
      expect(result.cellReferences[0]).toEqual({
        sheet: 'Sheet1',
        column: 'A',
        row: 1,
        isAbsolute: false,
        isRange: true,
        endColumn: 'C',
        endRow: 10
      });
    });

    it('should parse cross-sheet references', () => {
      const formula = '=Sheet2!A1+\'Other Sheet\'!B2';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.cellReferences).toHaveLength(2);
      expect(result.cellReferences[0]).toEqual({
        sheet: 'Sheet2',
        column: 'A',
        row: 1,
        isAbsolute: false,
        isRange: false
      });
      expect(result.cellReferences[1]).toEqual({
        sheet: 'Other Sheet',
        column: 'B',
        row: 2,
        isAbsolute: false,
        isRange: false
      });
    });

    it('should extract function names', () => {
      const formula = '=SUM(A1:A10)+AVERAGE(B1:B10)*COUNT(C1:C10)';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.functions).toEqual(['SUM', 'AVERAGE', 'COUNT']);
    });

    it('should extract named ranges', () => {
      const formula = '=SUM(SalesData)+AVERAGE(Expenses)';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.namedRanges).toContain('SalesData');
      expect(result.namedRanges).toContain('Expenses');
    });

    it('should handle complex formulas', () => {
      const formula = '=IF(A1>0,SUM(B1:B10),VLOOKUP(A1,Sheet2!$A$1:$B$100,2,FALSE))';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.cellReferences.length).toBeGreaterThan(0);
      expect(result.functions).toContain('IF');
      expect(result.functions).toContain('SUM');
      expect(result.functions).toContain('VLOOKUP');
    });

    it('should handle empty or invalid formulas', () => {
      expect(() => DependencyParser.parseFormula('', 'Sheet1')).not.toThrow();
      expect(() => DependencyParser.parseFormula('not a formula', 'Sheet1')).not.toThrow();
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build a simple dependency graph', () => {
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'C1',
          sheet: 'Sheet1',
          formula: '=A1+B1',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'D1',
          sheet: 'Sheet1',
          formula: '=C1*2',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas);

      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges.length).toBeGreaterThan(0);
      
      // C1 should depend on A1 and B1
      const c1Node = graph.nodes.find(n => n.cell === 'C1');
      expect(c1Node).toBeDefined();
      expect(c1Node!.precedents.length).toBeGreaterThan(0);
      
      // D1 should depend on C1
      const d1Node = graph.nodes.find(n => n.cell === 'D1');
      expect(d1Node).toBeDefined();
      expect(d1Node!.precedents).toContain('Sheet1!C1');
    });

    it('should detect circular references', () => {
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=B1+1',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'B1',
          sheet: 'Sheet1',
          formula: '=A1+1',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas);

      expect(graph.circularReferences.length).toBeGreaterThan(0);
    });

    it('should calculate dependency levels', () => {
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=10',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'B1',
          sheet: 'Sheet1',
          formula: '=A1*2',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '3',
          cell: 'C1',
          sheet: 'Sheet1',
          formula: '=B1+5',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas);

      const a1Node = graph.nodes.find(n => n.cell === 'A1');
      const b1Node = graph.nodes.find(n => n.cell === 'B1');
      const c1Node = graph.nodes.find(n => n.cell === 'C1');

      expect(a1Node!.level).toBe(0);
      expect(b1Node!.level).toBe(1);
      expect(c1Node!.level).toBe(2);
    });

    it('should handle cross-sheet dependencies', () => {
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=Sheet2!B1+10',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'B1',
          sheet: 'Sheet2',
          formula: '=20',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas);

      const sheet1Node = graph.nodes.find(n => n.sheet === 'Sheet1' && n.cell === 'A1');
      const sheet2Node = graph.nodes.find(n => n.sheet === 'Sheet2' && n.cell === 'B1');

      expect(sheet1Node).toBeDefined();
      expect(sheet2Node).toBeDefined();
      expect(sheet1Node!.precedents).toContain('Sheet2!B1');
      expect(sheet2Node!.dependents).toContain('Sheet1!A1');
    });
  });

  describe('findPrecedents', () => {
    it('should find all precedent cells', () => {
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=10',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'B1',
          sheet: 'Sheet1',
          formula: '=A1*2',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '3',
          cell: 'C1',
          sheet: 'Sheet1',
          formula: '=B1+A1',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas);
      const precedents = DependencyParser.findPrecedents('Sheet1!C1', graph);

      expect(precedents.length).toBeGreaterThan(0);
      const precedentCells = precedents.map(p => p.cell);
      expect(precedentCells).toContain('A1');
      expect(precedentCells).toContain('B1');
    });

    it('should handle deep dependency chains', () => {
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=10',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'B1',
          sheet: 'Sheet1',
          formula: '=A1*2',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '3',
          cell: 'C1',
          sheet: 'Sheet1',
          formula: '=B1+5',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '4',
          cell: 'D1',
          sheet: 'Sheet1',
          formula: '=C1/2',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas);
      const precedents = DependencyParser.findPrecedents('Sheet1!D1', graph);

      const precedentCells = precedents.map(p => p.cell);
      expect(precedentCells).toContain('A1'); // Deep precedent
      expect(precedentCells).toContain('B1'); // Intermediate precedent
      expect(precedentCells).toContain('C1'); // Direct precedent
    });
  });

  describe('findDependents', () => {
    it('should find all dependent cells', () => {
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=10',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'B1',
          sheet: 'Sheet1',
          formula: '=A1*2',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '3',
          cell: 'C1',
          sheet: 'Sheet1',
          formula: '=A1+5',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '4',
          cell: 'D1',
          sheet: 'Sheet1',
          formula: '=B1+C1',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas);
      const dependents = DependencyParser.findDependents('Sheet1!A1', graph);

      const dependentCells = dependents.map(d => d.cell);
      expect(dependentCells).toContain('B1'); // Direct dependent
      expect(dependentCells).toContain('C1'); // Direct dependent
      expect(dependentCells).toContain('D1'); // Indirect dependent
    });
  });

  describe('edge cases', () => {
    it('should handle formulas with no references', () => {
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=42',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas);
      
      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0]?.precedents).toHaveLength(0);
      expect(graph.nodes[0]?.dependents).toHaveLength(0);
    });

    it('should handle invalid cell addresses gracefully', () => {
      expect(() => {
        DependencyParser.parseFormula('=INVALID!', 'Sheet1');
      }).not.toThrow();
    });

    it('should handle empty formula list', () => {
      const graph = DependencyParser.buildDependencyGraph([]);
      
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
      expect(graph.circularReferences).toHaveLength(0);
    });

    it('should handle named ranges in dependency graph', () => {
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=SUM(SalesData)',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const namedRanges: NamedRange[] = [
        {
          name: 'SalesData',
          range: 'B1:B10',
          sheetName: 'Sheet1'
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas, namedRanges);
      
      expect(graph.namedRanges).toHaveLength(1);
      expect(graph.namedRanges[0]?.name).toBe('SalesData');
    });

    it('should handle malformed cell references gracefully', () => {
      const formula = '=A1+INVALID_REF+B2';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      // Should still parse valid references
      expect(result.cellReferences.length).toBeGreaterThan(0);
      const cellAddresses = result.cellReferences.map(ref => `${ref.column}${ref.row}`);
      expect(cellAddresses).toContain('A1');
      expect(cellAddresses).toContain('B2');
    });

    it('should handle very large ranges efficiently', () => {
      const formula = '=SUM(A1:ZZ1000000)'; // Very large range
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.cellReferences).toHaveLength(1);
      expect(result.cellReferences[0]?.isRange).toBe(true);
      expect(result.cellReferences[0]?.column).toBe('A');
      expect(result.cellReferences[0]?.endColumn).toBe('ZZ');
    });

    it('should validate range order', () => {
      const formula1 = '=SUM(A1:C10)'; // Valid range
      const formula2 = '=SUM(C10:A1)'; // Invalid range order
      
      const result1 = DependencyParser.parseFormula(formula1, 'Sheet1');
      const result2 = DependencyParser.parseFormula(formula2, 'Sheet1');

      expect(result1.cellReferences).toHaveLength(1);
      expect(result2.cellReferences).toHaveLength(0); // Should be filtered out
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed absolute and relative references', () => {
      const formula = '=A1+$B$2+C3:$D$5';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.cellReferences).toHaveLength(3);
      
      // A1 - relative
      expect(result.cellReferences[0]?.isAbsolute).toBe(false);
      
      // $B$2 - absolute
      expect(result.cellReferences[1]?.isAbsolute).toBe(true);
      
      // C3:$D$5 - range with mixed references
      expect(result.cellReferences[2]?.isRange).toBe(true);
    });

    it('should handle nested functions with multiple references', () => {
      const formula = '=IF(A1>0,SUM(B1:B10),AVERAGE(C1:C10))';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.functions).toContain('IF');
      expect(result.functions).toContain('SUM');
      expect(result.functions).toContain('AVERAGE');
      
      expect(result.cellReferences.length).toBeGreaterThan(2);
    });

    it('should handle formulas with text and operators', () => {
      const formula = '=CONCATENATE("Total: ",SUM(A1:A10)," items")';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.functions).toContain('CONCATENATE');
      expect(result.functions).toContain('SUM');
      expect(result.cellReferences.some(ref => ref.isRange)).toBe(true);
    });

    it('should handle complex dependency chains with multiple sheets', () => {
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=Sheet2!B1+Sheet3!C1',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'B1',
          sheet: 'Sheet2',
          formula: '=Sheet3!D1*2',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '3',
          cell: 'C1',
          sheet: 'Sheet3',
          formula: '=10',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '4',
          cell: 'D1',
          sheet: 'Sheet3',
          formula: '=20',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas);

      // Verify cross-sheet dependencies
      const sheet1A1 = graph.nodes.find(n => n.sheet === 'Sheet1' && n.cell === 'A1');
      expect(sheet1A1).toBeDefined();
      expect(sheet1A1!.precedents).toContain('Sheet2!B1');
      expect(sheet1A1!.precedents).toContain('Sheet3!C1');

      const sheet2B1 = graph.nodes.find(n => n.sheet === 'Sheet2' && n.cell === 'B1');
      expect(sheet2B1).toBeDefined();
      expect(sheet2B1!.precedents).toContain('Sheet3!D1');
      expect(sheet2B1!.dependents).toContain('Sheet1!A1');
    });

    it('should handle named ranges in formulas', () => {
      const formula = '=SUM(SalesData)+AVERAGE(Expenses)-COUNT(Inventory)';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.namedRanges).toContain('SalesData');
      expect(result.namedRanges).toContain('Expenses');
      expect(result.namedRanges).toContain('Inventory');
      expect(result.functions).toContain('SUM');
      expect(result.functions).toContain('AVERAGE');
      expect(result.functions).toContain('COUNT');
    });

    it('should handle named ranges with string literals', () => {
      const formula = '=IF(SalesData>0,"Positive: "&SUM(SalesData),"Negative")';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.namedRanges).toContain('SalesData');
      expect(result.namedRanges).not.toContain('Positive');
      expect(result.namedRanges).not.toContain('Negative');
      expect(result.functions).toContain('IF');
      expect(result.functions).toContain('SUM');
    });

    it('should filter out Excel keywords from named ranges', () => {
      const formula = '=LET(x,SalesData,SUM(x))';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.namedRanges).toContain('SalesData');
      expect(result.namedRanges).toContain('x'); // Variable name in LET function
      expect(result.namedRanges).not.toContain('LET'); // Should be filtered as function
      expect(result.functions).toContain('LET');
      expect(result.functions).toContain('SUM');
    });

    it('should handle array formulas and complex ranges', () => {
      const formula = '=SUMPRODUCT((A1:A10>0)*(B1:B10<100)*C1:C10)';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.functions).toContain('SUMPRODUCT');
      expect(result.cellReferences).toHaveLength(3);
      expect(result.cellReferences.every(ref => ref.isRange)).toBe(true);
    });

    it('should detect and handle indirect references', () => {
      const formula = '=INDIRECT("A"&ROW())';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.functions).toContain('INDIRECT');
      expect(result.functions).toContain('ROW');
      // INDIRECT creates dynamic references that can't be statically analyzed
    });

    it('should handle volatile functions correctly', () => {
      const formula = '=NOW()+RAND()*TODAY()';
      const result = DependencyParser.parseFormula(formula, 'Sheet1');

      expect(result.functions).toContain('NOW');
      expect(result.functions).toContain('RAND');
      expect(result.functions).toContain('TODAY');
      expect(result.cellReferences).toHaveLength(0); // No cell references
    });
  });

  describe('dependency graph optimization', () => {
    it('should optimize dependency graph for large datasets', () => {
      // Create a large number of formulas with dependencies
      const formulas: Formula[] = [];
      for (let i = 1; i <= 100; i++) {
        formulas.push({
          id: i.toString(),
          cell: `A${i}`,
          sheet: 'Sheet1',
          formula: i === 1 ? '=10' : `=A${i-1}+1`,
          dependencies: [],
          precedents: [],
          isValid: true
        });
      }

      const startTime = Date.now();
      const graph = DependencyParser.buildDependencyGraph(formulas);
      const endTime = Date.now();

      expect(graph.nodes).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Verify the chain is correctly built
      const lastNode = graph.nodes.find(n => n.cell === 'A100');
      expect(lastNode).toBeDefined();
      expect(lastNode!.level).toBe(99); // Should be at the end of the chain
    });

    it('should handle multiple circular reference chains', () => {
      const formulas: Formula[] = [
        // First circular chain: A1 -> B1 -> C1 -> A1
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=B1+1',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '2',
          cell: 'B1',
          sheet: 'Sheet1',
          formula: '=C1+1',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '3',
          cell: 'C1',
          sheet: 'Sheet1',
          formula: '=A1+1',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        // Second circular chain: D1 -> E1 -> D1
        {
          id: '4',
          cell: 'D1',
          sheet: 'Sheet1',
          formula: '=E1*2',
          dependencies: [],
          precedents: [],
          isValid: true
        },
        {
          id: '5',
          cell: 'E1',
          sheet: 'Sheet1',
          formula: '=D1/2',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas);

      expect(graph.circularReferences.length).toBeGreaterThanOrEqual(2);
      
      // Should detect both circular reference chains
      const hasFirstChain = graph.circularReferences.some(chain => 
        chain.includes('Sheet1!A1') && chain.includes('Sheet1!B1') && chain.includes('Sheet1!C1')
      );
      const hasSecondChain = graph.circularReferences.some(chain => 
        chain.includes('Sheet1!D1') && chain.includes('Sheet1!E1')
      );
      
      expect(hasFirstChain).toBe(true);
      expect(hasSecondChain).toBe(true);
    });

    it('should handle named ranges with formulas', () => {
      const formulas: Formula[] = [
        {
          id: '1',
          cell: 'A1',
          sheet: 'Sheet1',
          formula: '=SUM(DynamicRange)',
          dependencies: [],
          precedents: [],
          isValid: true
        }
      ];

      const namedRanges: NamedRange[] = [
        {
          name: 'DynamicRange',
          range: 'B1:B10',
          sheetName: 'Sheet1',
          formula: '=OFFSET(B1,0,0,COUNT(B:B),1)' // Dynamic range formula
        }
      ];

      const graph = DependencyParser.buildDependencyGraph(formulas, namedRanges);
      
      expect(graph.namedRanges).toHaveLength(1);
      expect(graph.nodes.length).toBeGreaterThan(0);
      
      // Should create dependencies for the named range formula
      const a1Node = graph.nodes.find(n => n.cell === 'A1');
      expect(a1Node).toBeDefined();
      expect(a1Node!.precedents.some(p => p.includes('DynamicRange'))).toBe(true);
    });

    it('should handle performance with large dependency graphs', () => {
      // Create a complex dependency graph with multiple levels
      const formulas: Formula[] = [];
      
      // Create base data cells
      for (let i = 1; i <= 50; i++) {
        formulas.push({
          id: `base_${i}`,
          cell: `A${i}`,
          sheet: 'Sheet1',
          formula: `=${i * 10}`,
          dependencies: [],
          precedents: [],
          isValid: true
        });
      }
      
      // Create intermediate calculations
      for (let i = 1; i <= 50; i++) {
        formulas.push({
          id: `calc_${i}`,
          cell: `B${i}`,
          sheet: 'Sheet1',
          formula: `=A${i}*2`,
          dependencies: [],
          precedents: [],
          isValid: true
        });
      }
      
      // Create summary calculations
      formulas.push({
        id: 'summary',
        cell: 'C1',
        sheet: 'Sheet1',
        formula: '=SUM(B1:B50)',
        dependencies: [],
        precedents: [],
        isValid: true
      });

      const startTime = Date.now();
      const graph = DependencyParser.buildDependencyGraph(formulas);
      const endTime = Date.now();

      expect(graph.nodes.length).toBe(101); // 50 base + 50 calc + 1 summary
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      // Verify dependency levels are calculated correctly
      const summaryNode = graph.nodes.find(n => n.cell === 'C1');
      expect(summaryNode).toBeDefined();
      expect(summaryNode!.level).toBe(2); // Base(0) -> Calc(1) -> Summary(2)
    });
  });
});