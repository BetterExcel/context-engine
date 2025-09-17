import path from 'path';

export const testFiles = {
  simpleExcel: path.join(__dirname, 'files', 'simple-spreadsheet.xlsx'),
  complexExcel: path.join(__dirname, 'files', 'complex-spreadsheet.xlsx'),
  csvFile: path.join(__dirname, 'files', 'sample-data.csv'),
  largeFile: path.join(__dirname, 'files', 'large-dataset.xlsx'),
};

export const testRequests = {
  formulaAssistance: 'Help me create a SUM formula for column C',
  dataAnalysis: 'What patterns do you see in this sales data?',
  formatting: 'How can I format these cells as currency?',
  troubleshooting: 'Why is my VLOOKUP formula returning #N/A?',
  general: 'Explain what this spreadsheet contains',
};

export const expectedContextTypes = [
  'immediate',
  'related', 
  'structural',
  'historical',
  'patterns'
];

export const expectedIntents = [
  'formula_assistance',
  'data_analysis', 
  'formatting',
  'troubleshooting',
  'general_assistance'
];