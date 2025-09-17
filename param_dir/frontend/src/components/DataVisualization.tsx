import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import { SpreadsheetData, Cell as SpreadsheetCell, DataType } from '../types';

interface DataVisualizationProps {
  data: SpreadsheetData;
  selectedRange: string;
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'auto';
  className?: string;
}

interface ChartDataPoint {
  name: string;
  value: number;
  category?: string;
  x?: number;
  y?: number;
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const DataVisualization: React.FC<DataVisualizationProps> = ({
  data,
  selectedRange,
  chartType = 'auto',
  className = ''
}) => {
  const chartData = useMemo(() => {
    if (!data.sheets.length) return [];

    const sheet = data.sheets[0];
    const range = parseRange(selectedRange);
    
    if (!range) return [];

    const extractedData: ChartDataPoint[] = [];
    
    // Extract data from the selected range
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        const cell = sheet.data[row]?.[col];
        if (cell && isNumericCell(cell)) {
          const name = getColumnLetter(col) + (row + 1);
          const value = parseFloat(cell.value?.toString() || '0');
          
          // Try to get a label from adjacent cells
          const label = getLabelForCell(sheet.data, row, col, range);
          
          extractedData.push({
            name: label || name,
            value: value,
            category: getColumnLetter(col),
            x: col,
            y: value
          });
        }
      }
    }

    return extractedData;
  }, [data, selectedRange]);

  const detectedChartType = useMemo(() => {
    if (chartType !== 'auto') return chartType;
    
    if (chartData.length === 0) return 'bar';
    
    // Auto-detect best chart type based on data characteristics
    const uniqueCategories = new Set(chartData.map(d => d.category)).size;
    const hasTimeSeriesPattern = chartData.length > 2 && 
      chartData.every((d, i) => i === 0 || d.value !== chartData[i - 1].value);
    
    if (chartData.length <= 10 && uniqueCategories <= 5) return 'pie';
    if (hasTimeSeriesPattern) return 'line';
    if (chartData.length > 20) return 'scatter';
    
    return 'bar';
  }, [chartData, chartType]);

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey="name" 
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
        />
        <YAxis 
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={COLORS[0]} 
          strokeWidth={2}
          dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: COLORS[0], strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey="name" 
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
        <Bar 
          dataKey="value" 
          fill={COLORS[0]}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderScatterChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          type="number"
          dataKey="x"
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
        />
        <YAxis 
          type="number"
          dataKey="y"
          stroke="#6B7280"
          fontSize={12}
          tick={{ fill: '#6B7280' }}
        />
        <Tooltip 
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Scatter dataKey="y" fill={COLORS[0]} />
      </ScatterChart>
    </ResponsiveContainer>
  );

  const renderChart = () => {
    switch (detectedChartType) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'scatter':
        return renderScatterChart();
      default:
        return renderBarChart();
    }
  };

  if (chartData.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data to Visualize</h3>
          <p className="text-gray-600">
            Select a range with numeric data to see visualizations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Data Visualization</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Chart Type:</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full capitalize">
            {detectedChartType}
          </span>
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {chartData.length} data points from range {selectedRange}
        </p>
      </div>

      {renderChart()}
    </div>
  );
};

// Helper functions
function parseRange(range: string): { startRow: number; endRow: number; startCol: number; endCol: number } | null {
  const match = range.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
  if (!match) return null;

  const startCol = columnLetterToIndex(match[1]);
  const startRow = parseInt(match[2]) - 1;
  
  if (match[3] && match[4]) {
    const endCol = columnLetterToIndex(match[3]);
    const endRow = parseInt(match[4]) - 1;
    return { startRow, endRow, startCol, endCol };
  }
  
  return { startRow, endRow: startRow, startCol, endCol: startCol };
}

function columnLetterToIndex(letter: string): number {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64);
  }
  return result - 1;
}

function getColumnLetter(index: number): string {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

function isNumericCell(cell: SpreadsheetCell): boolean {
  return cell.dataType === DataType.NUMBER || 
         (cell.dataType === DataType.TEXT && !isNaN(parseFloat(cell.value?.toString() || '')));
}

function getLabelForCell(
  data: SpreadsheetCell[][], 
  row: number, 
  col: number, 
  range: { startRow: number; endRow: number; startCol: number; endCol: number }
): string | null {
  // Try to get label from header row (first row of range)
  if (row > range.startRow) {
    const headerCell = data[range.startRow]?.[col];
    if (headerCell && headerCell.dataType === DataType.TEXT) {
      return headerCell.value?.toString() || null;
    }
  }
  
  // Try to get label from first column
  if (col > range.startCol) {
    const labelCell = data[row]?.[range.startCol];
    if (labelCell && labelCell.dataType === DataType.TEXT) {
      return labelCell.value?.toString() || null;
    }
  }
  
  return null;
}

export default DataVisualization;