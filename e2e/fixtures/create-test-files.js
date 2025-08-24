const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Create simple spreadsheet
const simpleData = [
  ['Product', 'Quantity', 'Price', 'Total'],
  ['Apple', 10, 1.50, '=B2*C2'],
  ['Banana', 15, 0.80, '=B3*C3'],
  ['Orange', 8, 2.00, '=B4*C4'],
  ['Total', '', '', '=SUM(D2:D4)']
];

const simpleWs = XLSX.utils.aoa_to_sheet(simpleData);
const simpleWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(simpleWb, simpleWs, 'Sales');
XLSX.writeFile(simpleWb, path.join(__dirname, 'files', 'simple-spreadsheet.xlsx'));

// Create complex spreadsheet with multiple sheets
const salesData = [
  ['Date', 'Product', 'Region', 'Sales Rep', 'Quantity', 'Unit Price', 'Total'],
  ['2024-01-01', 'Laptop', 'North', 'John Doe', 5, 1200, '=E2*F2'],
  ['2024-01-02', 'Mouse', 'South', 'Jane Smith', 20, 25, '=E3*F3'],
  ['2024-01-03', 'Keyboard', 'East', 'Bob Johnson', 15, 75, '=E4*F4'],
  ['2024-01-04', 'Monitor', 'West', 'Alice Brown', 8, 300, '=E5*F5'],
];

const summaryData = [
  ['Region', 'Total Sales', 'Avg Sale'],
  ['North', '=SUMIF(Sales.C:C,"North",Sales.G:G)', '=AVERAGEIF(Sales.C:C,"North",Sales.G:G)'],
  ['South', '=SUMIF(Sales.C:C,"South",Sales.G:G)', '=AVERAGEIF(Sales.C:C,"South",Sales.G:G)'],
  ['East', '=SUMIF(Sales.C:C,"East",Sales.G:G)', '=AVERAGEIF(Sales.C:C,"East",Sales.G:G)'],
  ['West', '=SUMIF(Sales.C:C,"West",Sales.G:G)', '=AVERAGEIF(Sales.C:C,"West",Sales.G:G)'],
];

const salesWs = XLSX.utils.aoa_to_sheet(salesData);
const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
const complexWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(complexWb, salesWs, 'Sales');
XLSX.utils.book_append_sheet(complexWb, summaryWs, 'Summary');
XLSX.writeFile(complexWb, path.join(__dirname, 'files', 'complex-spreadsheet.xlsx'));

// Create CSV file
const csvData = [
  ['Name', 'Age', 'City', 'Salary'],
  ['John', '25', 'New York', '50000'],
  ['Jane', '30', 'Los Angeles', '60000'],
  ['Bob', '35', 'Chicago', '55000'],
  ['Alice', '28', 'Houston', '52000'],
];

const csvContent = csvData.map(row => row.join(',')).join('\n');
fs.writeFileSync(path.join(__dirname, 'files', 'sample-data.csv'), csvContent);

// Create large dataset
const largeData = [['ID', 'Name', 'Value', 'Category', 'Date']];
for (let i = 1; i <= 1000; i++) {
  largeData.push([
    i,
    `Item ${i}`,
    Math.floor(Math.random() * 1000),
    ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
    new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
  ]);
}

const largeWs = XLSX.utils.aoa_to_sheet(largeData);
const largeWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(largeWb, largeWs, 'Data');
XLSX.writeFile(largeWb, path.join(__dirname, 'files', 'large-dataset.xlsx'));

console.log('Test files created successfully!');