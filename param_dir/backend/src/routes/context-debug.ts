import * as express from 'express';
import { spreadsheetStorage } from './upload';

const router = express.Router();

/**
 * Debug version of analyze-context endpoint
 */
router.post('/analyze-context-debug', async (req, res) => {
  try {
    console.log('Debug: Starting context analysis');
    console.log('Debug: Request body:', JSON.stringify(req.body, null, 2));

    const { request, spreadsheetId, currentSelection, userContext } = req.body;

    // Step 1: Basic validation
    if (!request) {
      return res.status(400).json({
        success: false,
        error: { message: 'Request is required' }
      });
    }

    console.log('Debug: Basic validation passed');

    // Step 2: Get spreadsheet data
    let spreadsheetData;
    if (spreadsheetId) {
      spreadsheetData = spreadsheetStorage.get(spreadsheetId);
      if (!spreadsheetData) {
        return res.status(404).json({
          success: false,
          error: { message: 'Spreadsheet not found' }
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Spreadsheet ID is required' }
      });
    }

    console.log('Debug: Spreadsheet data retrieved');

    // Step 3: Simple response
    const response = {
      success: true,
      data: {
        requestAnalysis: {
          intent: 'formula_assistance',
          scope: 'current_selection',
          confidence: 0.8
        },
        spreadsheetContext: {
          currentSelection: {
            range: currentSelection.range,
            activeCell: currentSelection.activeCell,
            dataTypes: ['text', 'number']
          },
          dataSummary: {
            rowCount: spreadsheetData.sheets[0]?.data?.length || 0,
            columnCount: spreadsheetData.sheets[0]?.dimensions?.cols || 0,
            patterns: []
          }
        },
        naturalLanguageDescription: `The user wants to ${request}. They have selected ${currentSelection.range} on sheet "${currentSelection.sheet}".`,
        actionableInfo: {
          targetCells: [currentSelection.activeCell],
          suggestedOperations: ['SUM', 'AVERAGE'],
          constraints: [],
          expectedOutcome: 'A formula that performs the requested calculation',
          riskLevel: 'low'
        },
        suggestions: ['Consider using SUM() for numeric calculations'],
        confidence: 0.8
      },
      requestId: `debug_${Date.now()}`,
      processingTime: 100
    };

    console.log('Debug: Sending response');
    return res.status(200).json(response);

  } catch (error) {
    console.error('Debug: Error in context analysis:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        details: error.message
      }
    });
  }
});

export default router;