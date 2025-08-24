/**
 * Example demonstrating enhanced dependency analysis capabilities
 */

import { DependencyParser } from '../services/DependencyParser';
import { Formula, NamedRange } from '../types/spreadsheet';

// Example formulas with various dependency types
const exampleFormulas: Formula[] = [
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
    formula: '=SUM(SalesData)',
    dependencies: [],
    precedents: [],
    isValid: true
  },
  {
    id: '4',
    cell: 'D1',
    sheet: 'Sheet1',
    formula: '=IF(B1>0,C1*0.1,0)',
    dependencies: [],
    precedents: [],
    isValid: true
  },
  {
    id: '5',
    cell: 'A1',
    sheet: 'Sheet2',
    formula: '=Sheet1!D1+Expenses',
    dependencies: [],
    precedents: [],
    isValid: true
  }
];

// Example named ranges
const exampleNamedRanges: NamedRange[] = [
  {
    name: 'SalesData',
    range: 'E1:E10',
    sheetName: 'Sheet1'
  },
  {
    name: 'Expenses',
    range: 'F1:F5',
    sheetName: 'Sheet2',
    formula: '=SUM(Sheet2!G1:G5)' // Dynamic named range
  }
];

export function demonstrateDependencyAnalysis(): void {
  console.log('=== Enhanced Dependency Analysis Demo ===\n');

  // 1. Parse individual formulas
  console.log('1. Formula Parsing Examples:');
  console.log('----------------------------');
  
  const complexFormula = '=IF(Sheet2!A1>0,SUM(SalesData)+AVERAGE(B1:B10),"No data")';
  const analysis = DependencyParser.parseFormula(complexFormula, 'Sheet1');
  
  console.log(`Formula: ${complexFormula}`);
  console.log(`Cell References: ${JSON.stringify(analysis.cellReferences, null, 2)}`);
  console.log(`Named Ranges: ${analysis.namedRanges.join(', ')}`);
  console.log(`Functions: ${analysis.functions.join(', ')}`);
  console.log();

  // 2. Build dependency graph
  console.log('2. Dependency Graph Analysis:');
  console.log('------------------------------');
  
  const graph = DependencyParser.buildDependencyGraph(exampleFormulas, exampleNamedRanges);
  
  console.log(`Total nodes: ${graph.nodes.length}`);
  console.log(`Total edges: ${graph.edges.length}`);
  console.log(`Circular references: ${graph.circularReferences.length}`);
  console.log();

  // 3. Find precedents and dependents
  console.log('3. Precedent/Dependent Analysis:');
  console.log('--------------------------------');
  
  const targetCell = 'Sheet1!D1';
  const precedents = DependencyParser.findPrecedents(targetCell, graph);
  const dependents = DependencyParser.findDependents(targetCell, graph);
  
  console.log(`Cell: ${targetCell}`);
  console.log(`Precedents: ${precedents.map(p => p.id).join(', ')}`);
  console.log(`Dependents: ${dependents.map(d => d.id).join(', ')}`);
  console.log();

  // 4. Cross-sheet dependencies
  console.log('4. Cross-Sheet Dependencies:');
  console.log('----------------------------');
  
  graph.nodes.forEach(node => {
    const crossSheetPrecedents = node.precedents.filter(p => !p.startsWith(node.sheet + '!'));
    if (crossSheetPrecedents.length > 0) {
      console.log(`${node.id} depends on: ${crossSheetPrecedents.join(', ')}`);
    }
  });
  console.log();

  // 5. Dependency levels
  console.log('5. Dependency Levels (Calculation Order):');
  console.log('------------------------------------------');
  
  const nodesByLevel = graph.nodes.reduce((acc, node) => {
    if (!acc[node.level]) acc[node.level] = [];
    acc[node.level]!.push(node.id);
    return acc;
  }, {} as Record<number, string[]>);
  
  Object.entries(nodesByLevel).forEach(([level, nodes]) => {
    console.log(`Level ${level}: ${nodes.join(', ')}`);
  });
  console.log();

  // 6. Named range analysis
  console.log('6. Named Range Dependencies:');
  console.log('----------------------------');
  
  graph.namedRanges.forEach(namedRange => {
    console.log(`${namedRange.name}: ${namedRange.range} (${namedRange.sheetName})`);
    if (namedRange.formula) {
      console.log(`  Formula: ${namedRange.formula}`);
    }
  });
  console.log();

  // 7. Error handling demonstration
  console.log('7. Error Handling:');
  console.log('------------------');
  
  const invalidFormula = '=A1+INVALID_REF!B2+C3';
  const errorAnalysis = DependencyParser.parseFormula(invalidFormula, 'Sheet1');
  
  console.log(`Formula with errors: ${invalidFormula}`);
  console.log(`Valid references found: ${errorAnalysis.cellReferences.length}`);
  console.log(`Functions found: ${errorAnalysis.functions.length}`);
  console.log();

  console.log('=== Demo Complete ===');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateDependencyAnalysis();
}