import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SpreadsheetViewerProps, Cell, DataType } from '../types';

const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({
  data,
  selectedRange,
  onSelectionChange,
  onCellClick,
  defaultSelection,
  onSelectionTypeChange,
  onSheetChange
}) => {
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedCell, setSelectedCell] = useState<string>('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: number } | null>(null);
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [hasAppliedDefaultSelection, setHasAppliedDefaultSelection] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const currentSheet = data.sheets[activeSheet];

  // Apply default selection when spreadsheet data loads or changes
  useEffect(() => {
    if (defaultSelection && !hasAppliedDefaultSelection && !isManualSelection) {
      try {
        const { startRow, startCol, endRow, endCol } = parseRangeToCoordinates(defaultSelection);
        
        // Set selection state
        setSelectionStart({ row: startRow, col: startCol });
        setSelectionEnd({ row: endRow, col: endCol });
        setSelectedCell(getCellAddress(startRow, startCol));
        setIsManualSelection(false);
        setHasAppliedDefaultSelection(true);
        
        // Notify parent components
        onSelectionChange(defaultSelection);
        onSelectionTypeChange?.(false);
      } catch (error) {
        console.warn('Failed to apply default selection:', error);
        // Fallback to A1 if default selection is invalid
        setSelectionStart({ row: 0, col: 0 });
        setSelectionEnd({ row: 0, col: 0 });
        setSelectedCell('A1');
        setIsManualSelection(false);
        setHasAppliedDefaultSelection(true);
        onSelectionChange('A1');
        onSelectionTypeChange?.(false);
      }
    }
  }, [defaultSelection, hasAppliedDefaultSelection, isManualSelection, onSelectionChange, onSelectionTypeChange]);

  // Reset selection state when data changes (new file uploaded)
  useEffect(() => {
    setIsManualSelection(false);
    setHasAppliedDefaultSelection(false);
  }, [data.id]);

  // Reset selection state when switching sheets
  useEffect(() => {
    setIsManualSelection(false);
    setHasAppliedDefaultSelection(false);
  }, [activeSheet]);

  // Convert column index to letter (0 -> A, 1 -> B, etc.)
  const getColumnLetter = (index: number): string => {
    let result = '';
    let num = index;
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    }
    return result;
  };

  // Convert cell coordinates to address (row: 0, col: 0 -> A1)
  const getCellAddress = (row: number, col: number): string => {
    return `${getColumnLetter(col)}${row + 1}`;
  };

  // Parse cell address to coordinates (A1 -> {row: 0, col: 0})
  const parseCellAddress = (address: string): { row: number; col: number } => {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { row: 0, col: 0 };
    
    const colStr = match[1];
    const rowNum = parseInt(match[2]) - 1;
    
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    col -= 1;
    
    return { row: rowNum, col };
  };

  // Parse range string to coordinates (A1:B2 -> {startRow: 0, startCol: 0, endRow: 1, endCol: 1})
  const parseRangeToCoordinates = (range: string): { startRow: number; startCol: number; endRow: number; endCol: number } => {
    const rangeParts = range.split(':');
    if (rangeParts.length === 1) {
      // Single cell
      const { row, col } = parseCellAddress(rangeParts[0]);
      return { startRow: row, startCol: col, endRow: row, endCol: col };
    } else if (rangeParts.length === 2) {
      // Range
      const start = parseCellAddress(rangeParts[0]);
      const end = parseCellAddress(rangeParts[1]);
      return { 
        startRow: Math.min(start.row, end.row), 
        startCol: Math.min(start.col, end.col),
        endRow: Math.max(start.row, end.row), 
        endCol: Math.max(start.col, end.col)
      };
    }
    throw new Error('Invalid range format');
  };

  // Get range string from selection
  const getRangeString = (start: { row: number; col: number }, end: { row: number; col: number }): string => {
    const startAddr = getCellAddress(start.row, start.col);
    const endAddr = getCellAddress(end.row, end.col);
    return start.row === end.row && start.col === end.col ? startAddr : `${startAddr}:${endAddr}`;
  };

  // Handle cell click
  const handleCellClick = useCallback((row: number, col: number, event: React.MouseEvent) => {
    const cellAddress = getCellAddress(row, col);
    setSelectedCell(cellAddress);
    onCellClick(cellAddress);

    // Mark as manual selection
    setIsManualSelection(true);
    onSelectionTypeChange?.(true);

    if (event.shiftKey && selectionStart) {
      // Extend selection
      setSelectionEnd({ row, col });
      const range = getRangeString(selectionStart, { row, col });
      onSelectionChange(range);
    } else {
      // Start new selection
      setSelectionStart({ row, col });
      setSelectionEnd({ row, col });
      onSelectionChange(cellAddress);
    }
  }, [selectionStart, onCellClick, onSelectionChange, onSelectionTypeChange]);

  // Handle mouse down for drag selection
  const handleMouseDown = useCallback((row: number, col: number, event: React.MouseEvent) => {
    if (event.button !== 0) return; // Only left click
    
    setIsSelecting(true);
    setSelectionStart({ row, col });
    setSelectionEnd({ row, col });
    
    // Mark as manual selection
    setIsManualSelection(true);
    onSelectionTypeChange?.(true);
    
    const cellAddress = getCellAddress(row, col);
    setSelectedCell(cellAddress);
    onCellClick(cellAddress);
    onSelectionChange(cellAddress);
  }, [onCellClick, onSelectionChange, onSelectionTypeChange]);

  // Handle mouse enter for drag selection
  const handleMouseEnter = useCallback((row: number, col: number) => {
    if (!isSelecting || !selectionStart) return;
    
    setSelectionEnd({ row, col });
    const range = getRangeString(selectionStart, { row, col });
    onSelectionChange(range);
    
    // Ensure it's marked as manual selection during drag
    if (!isManualSelection) {
      setIsManualSelection(true);
      onSelectionTypeChange?.(true);
    }
  }, [isSelecting, selectionStart, onSelectionChange, isManualSelection, onSelectionTypeChange]);

  // Handle mouse up to end selection
  useEffect(() => {
    const handleMouseUp = () => {
      setIsSelecting(false);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Check if cell is in selection
  const isCellSelected = (row: number, col: number): boolean => {
    if (!selectionStart || !selectionEnd) return false;
    
    const minRow = Math.min(selectionStart.row, selectionEnd.row);
    const maxRow = Math.max(selectionStart.row, selectionEnd.row);
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);
    
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  // Get cell display value
  const getCellDisplayValue = (cell: Cell): string => {
    if (cell.formula) {
      return cell.value?.toString() || '';
    }
    
    switch (cell.dataType) {
      case DataType.EMPTY:
        return '';
      case DataType.ERROR:
        return '#ERROR';
      case DataType.BOOLEAN:
        return cell.value ? 'TRUE' : 'FALSE';
      case DataType.DATE:
        return cell.value instanceof Date ? cell.value.toLocaleDateString() : cell.value?.toString() || '';
      case DataType.NUMBER:
        return typeof cell.value === 'number' ? cell.value.toString() : cell.value?.toString() || '';
      default:
        return cell.value?.toString() || '';
    }
  };

  // Get cell CSS classes based on data type and formatting
  const getCellClasses = (cell: Cell, row: number, col: number): string => {
    const baseClasses = 'border border-gray-300 px-2 py-1 text-sm min-w-[80px] h-8 cursor-cell select-none';
    const isSelected = isCellSelected(row, col);
    const isActive = selectedCell === getCellAddress(row, col);
    
    let classes = baseClasses;
    
    // Selection styling
    if (isActive) {
      classes += ' ring-2 ring-blue-500 bg-blue-50';
    } else if (isSelected) {
      classes += ' bg-blue-100';
    } else {
      classes += ' hover:bg-gray-50';
    }
    
    // Data type styling
    switch (cell.dataType) {
      case DataType.NUMBER:
        classes += ' text-right text-blue-600';
        break;
      case DataType.DATE:
        classes += ' text-center text-green-600';
        break;
      case DataType.FORMULA:
        classes += ' text-purple-600';
        break;
      case DataType.ERROR:
        classes += ' text-red-600 bg-red-50';
        break;
      case DataType.BOOLEAN:
        classes += ' text-center text-orange-600';
        break;
      default:
        classes += ' text-gray-900';
    }
    
    // Custom formatting
    if (cell.formatting) {
      if (cell.formatting.bold) classes += ' font-bold';
      if (cell.formatting.italic) classes += ' italic';
      if (cell.formatting.underline) classes += ' underline';
      
      if (cell.formatting.alignment === 'center') classes += ' text-center';
      else if (cell.formatting.alignment === 'right') classes += ' text-right';
    }
    
    return classes;
  };

  // Get current cell for formula bar
  const getCurrentCell = (): Cell | null => {
    if (!selectedCell || !selectionStart || !currentSheet) return null;
    
    const { row, col } = selectionStart;
    if (row >= currentSheet.data.length || col >= (currentSheet.data[row]?.length || 0)) return null;
    
    return currentSheet.data[row]?.[col] || null;
  };

  const currentCell = getCurrentCell();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Sheet Tabs */}
      {data.sheets.length > 1 && (
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 p-2">
            {data.sheets.map((sheet, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveSheet(index);
                  // Reset selection state when switching sheets
                  setIsManualSelection(false);
                  setHasAppliedDefaultSelection(false);
                  // Notify parent component about sheet change
                  onSheetChange?.(index);
                }}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  index === activeSheet
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {sheet.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formula Bar */}
      <div className="border-b border-gray-200 p-3 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Cell:</span>
            <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
              {selectedCell || 'A1'}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Formula:</span>
              <div className="flex-1 bg-white border rounded px-3 py-1 text-sm font-mono">
                {currentCell?.formula || getCellDisplayValue(currentCell || { value: '', dataType: DataType.EMPTY })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="overflow-auto max-h-96" ref={gridRef} role="region" aria-label="Spreadsheet data">
        <table className="border-collapse" role="table" aria-label={`Spreadsheet: ${currentSheet?.name || 'Sheet'}`}>
          <thead>
            <tr role="row">
              {/* Empty corner cell */}
              <th 
                className="border border-gray-300 bg-gray-100 w-12 h-8 text-xs font-medium text-gray-600 sticky left-0 z-10"
                role="columnheader"
                aria-label="Row numbers"
              ></th>
              {/* Column headers */}
              {Array.from({ length: currentSheet?.dimensions.cols || 0 }, (_, col) => (
                <th
                  key={col}
                  className="border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 min-w-[80px] h-8"
                  role="columnheader"
                  aria-label={`Column ${getColumnLetter(col)}`}
                >
                  {getColumnLetter(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentSheet?.data.map((row, rowIndex) => (
              <tr key={rowIndex} role="row">
                {/* Row header */}
                <td 
                  className="border border-gray-300 bg-gray-100 text-center text-xs font-medium text-gray-600 w-12 h-8 sticky left-0 z-10"
                  role="rowheader"
                  aria-label={`Row ${rowIndex + 1}`}
                >
                  {rowIndex + 1}
                </td>
                {/* Data cells */}
                {Array.from({ length: currentSheet?.dimensions.cols || 0 }, (_, colIndex) => {
                  const cell = row[colIndex] || { value: '', dataType: DataType.EMPTY };
                  const cellAddress = getCellAddress(rowIndex, colIndex);
                  const isSelected = isCellSelected(rowIndex, colIndex);
                  const isActive = selectedCell === cellAddress;
                  
                  return (
                    <td
                      key={colIndex}
                      className={getCellClasses(cell, rowIndex, colIndex)}
                      onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                      onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
                      onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                      title={cell.formula ? `Formula: ${cell.formula}` : getCellDisplayValue(cell)}
                      role="cell"
                      tabIndex={0}
                      aria-label={`Cell ${cellAddress}: ${getCellDisplayValue(cell)}${cell.dataType !== DataType.EMPTY ? `, ${cell.dataType}` : ''}${isSelected ? ', selected' : ''}${isActive ? ', active' : ''}`}
                      aria-selected={isSelected}
                      data-cell-address={cellAddress}
                      data-cell-type={cell.dataType}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleCellClick(rowIndex, colIndex, e as any);
                        }
                      }}
                    >
                      {getCellDisplayValue(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Selection Info */}
      {selectedRange && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="space-y-2">
            {/* Primary Selection Info */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700">Selection:</span>
                <span className="font-mono text-gray-900 bg-white px-2 py-1 rounded border text-xs">
                  {selectedRange}
                </span>
                
                {/* Selection Type Indicator */}
                {!isManualSelection ? (
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Entire Data Range
                    </span>
                    <div className="ml-2 relative group">
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Automatically selected based on data boundaries
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-200">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 7l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Manual Selection
                  </span>
                )}
              </div>
              
              {/* Cell Count */}
              <div className="text-gray-600">
                {(() => {
                  try {
                    let cellCount;
                    if (selectionStart && selectionEnd) {
                      const rows = Math.abs(selectionEnd.row - selectionStart.row) + 1;
                      const cols = Math.abs(selectionEnd.col - selectionStart.col) + 1;
                      cellCount = rows * cols;
                      return `${rows} × ${cols} = ${cellCount.toLocaleString()} cells`;
                    } else if (selectedRange.includes(':')) {
                      const { startRow, startCol, endRow, endCol } = parseRangeToCoordinates(selectedRange);
                      const rows = Math.abs(endRow - startRow) + 1;
                      const cols = Math.abs(endCol - startCol) + 1;
                      cellCount = rows * cols;
                      return `${rows} × ${cols} = ${cellCount.toLocaleString()} cells`;
                    } else {
                      return '1 cell';
                    }
                  } catch {
                    return '1 cell';
                  }
                })()}
              </div>
            </div>

            {/* Selection Summary */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                {/* Data Types in Selection */}
                {currentSheet && (() => {
                  try {
                    const dataTypes = new Set<string>();
                    let hasFormulas = false;
                    let hasHeaders = false;
                    
                    if (selectionStart && selectionEnd) {
                      const minRow = Math.min(selectionStart.row, selectionEnd.row);
                      const maxRow = Math.max(selectionStart.row, selectionEnd.row);
                      const minCol = Math.min(selectionStart.col, selectionEnd.col);
                      const maxCol = Math.max(selectionStart.col, selectionEnd.col);
                      
                      // Check if selection includes first row (potential headers)
                      if (minRow === 0) hasHeaders = true;
                      
                      for (let row = minRow; row <= maxRow && row < currentSheet.data.length; row++) {
                        for (let col = minCol; col <= maxCol && col < (currentSheet.data[row]?.length || 0); col++) {
                          const cell = currentSheet.data[row]?.[col];
                          if (cell) {
                            dataTypes.add(cell.dataType);
                            if (cell.formula) hasFormulas = true;
                          }
                        }
                      }
                    }
                    
                    const typeArray = Array.from(dataTypes).filter(type => type !== 'empty');
                    
                    return (
                      <div className="flex items-center space-x-3">
                        {typeArray.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <span>Types:</span>
                            <div className="flex space-x-1">
                              {typeArray.map(type => (
                                <span key={type} className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-xs capitalize">
                                  {type}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {hasFormulas && (
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                            </svg>
                            Formulas
                          </span>
                        )}
                        {hasHeaders && (
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" clipRule="evenodd" />
                            </svg>
                            Headers
                          </span>
                        )}
                      </div>
                    );
                  } catch {
                    return null;
                  }
                })()}
              </div>
              
              {/* Selection Status */}
              <div className="text-right">
                {!isManualSelection && defaultSelection ? (
                  <span className="text-blue-600">
                    Smart selection active • Click any cell to customize
                  </span>
                ) : isManualSelection ? (
                  <span className="text-green-600">
                    Custom selection • Analysis will use selected range
                  </span>
                ) : (
                  <span>Ready for analysis</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpreadsheetViewer;