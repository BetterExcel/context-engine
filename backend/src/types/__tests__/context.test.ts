/**
 * Unit tests for context data models
 */

import { IntentType } from '../context';

describe('Context Data Models', () => {
  describe('IntentType enum', () => {
    it('should have all expected intent types', () => {
      expect(IntentType.FORMULA_ASSISTANCE).toBe('formula_assistance');
      expect(IntentType.DATA_ANALYSIS).toBe('data_analysis');
      expect(IntentType.FORMATTING).toBe('formatting');
      expect(IntentType.DATA_MANIPULATION).toBe('data_manipulation');
      expect(IntentType.TROUBLESHOOTING).toBe('troubleshooting');
      expect(IntentType.GENERAL_ASSISTANCE).toBe('general_assistance');
    });

    it('should have exactly 6 intent types', () => {
      const intentTypes = Object.values(IntentType);
      expect(intentTypes).toHaveLength(6);
    });
  });

  describe('RequestAnalysis interface validation', () => {
    it('should accept valid request analysis', () => {
      const analysis = {
        intent: IntentType.FORMULA_ASSISTANCE,
        scope: 'current_selection',
        confidence: 0.95,
        keywords: ['sum', 'formula', 'calculate'],
        clarificationNeeded: false
      };

      expect(analysis.intent).toBe(IntentType.FORMULA_ASSISTANCE);
      expect(analysis.confidence).toBe(0.95);
      expect(analysis.keywords).toHaveLength(3);
      expect(analysis.clarificationNeeded).toBe(false);
    });

    it('should accept analysis with suggested questions', () => {
      const analysis = {
        intent: IntentType.DATA_ANALYSIS,
        scope: 'sheet',
        confidence: 0.7,
        keywords: ['analyze', 'data'],
        clarificationNeeded: true,
        suggestedQuestions: [
          'What type of analysis do you need?',
          'Which columns should be included?'
        ]
      };

      expect(analysis.clarificationNeeded).toBe(true);
      expect(analysis.suggestedQuestions).toHaveLength(2);
    });
  });

  describe('ScopeInfo interface validation', () => {
    it('should accept current selection scope', () => {
      const scope = {
        type: 'current_selection' as const,
        includeRelated: true,
        includeHistory: false
      };

      expect(scope.type).toBe('current_selection');
      expect(scope.includeRelated).toBe(true);
      expect(scope.includeHistory).toBe(false);
    });

    it('should accept custom range scope', () => {
      const scope = {
        type: 'custom_range' as const,
        range: 'A1:Z100',
        includeRelated: true,
        includeHistory: true,
        maxCells: 1000
      };

      expect(scope.type).toBe('custom_range');
      expect(scope.range).toBe('A1:Z100');
      expect(scope.maxCells).toBe(1000);
    });
  });

  describe('UserAction interface validation', () => {
    it('should accept cell edit action', () => {
      const action = {
        type: 'cell_edit' as const,
        timestamp: new Date(),
        cellAddress: 'A1',
        oldValue: 'old',
        newValue: 'new'
      };

      expect(action.type).toBe('cell_edit');
      expect(action.cellAddress).toBe('A1');
      expect(action.oldValue).toBe('old');
      expect(action.newValue).toBe('new');
    });

    it('should accept formula create action', () => {
      const action = {
        type: 'formula_create' as const,
        timestamp: new Date(),
        cellAddress: 'B1',
        newValue: '=SUM(A1:A10)',
        details: {
          formulaType: 'SUM',
          references: ['A1:A10']
        }
      };

      expect(action.type).toBe('formula_create');
      expect(action.details?.formulaType).toBe('SUM');
    });
  });

  describe('DataPattern interface validation', () => {
    it('should accept trend pattern', () => {
      const pattern = {
        type: 'trend' as const,
        description: 'Increasing trend in sales data',
        confidence: 0.85,
        affectedRange: 'B1:B12',
        severity: 'medium' as const
      };

      expect(pattern.type).toBe('trend');
      expect(pattern.confidence).toBe(0.85);
      expect(pattern.severity).toBe('medium');
    });

    it('should accept outlier pattern', () => {
      const pattern = {
        type: 'outlier' as const,
        description: 'Unusual value detected',
        confidence: 0.92,
        affectedRange: 'C5',
        severity: 'high' as const
      };

      expect(pattern.type).toBe('outlier');
      expect(pattern.severity).toBe('high');
    });
  });

  describe('Anomaly interface validation', () => {
    it('should accept missing value anomaly', () => {
      const anomaly = {
        type: 'missing_value' as const,
        cellAddress: 'D10',
        description: 'Expected value is missing',
        severity: 'medium' as const,
        suggestedFix: 'Fill with average of surrounding values'
      };

      expect(anomaly.type).toBe('missing_value');
      expect(anomaly.cellAddress).toBe('D10');
      expect(anomaly.suggestedFix).toBe('Fill with average of surrounding values');
    });

    it('should accept circular reference anomaly', () => {
      const anomaly = {
        type: 'circular_reference' as const,
        cellAddress: 'E5',
        description: 'Formula references itself',
        severity: 'high' as const
      };

      expect(anomaly.type).toBe('circular_reference');
      expect(anomaly.severity).toBe('high');
    });
  });

  describe('Insight interface validation', () => {
    it('should accept suggestion insight', () => {
      const insight = {
        type: 'suggestion' as const,
        title: 'Use SUMIF for conditional sum',
        description: 'Consider using SUMIF instead of multiple SUM formulas',
        actionable: true,
        priority: 'medium' as const,
        suggestedActions: [
          'Replace SUM formulas with SUMIF',
          'Add criteria column'
        ]
      };

      expect(insight.type).toBe('suggestion');
      expect(insight.actionable).toBe(true);
      expect(insight.suggestedActions).toHaveLength(2);
    });

    it('should accept warning insight', () => {
      const insight = {
        type: 'warning' as const,
        title: 'Potential data loss',
        description: 'Some cells may be overwritten',
        actionable: false,
        priority: 'high' as const
      };

      expect(insight.type).toBe('warning');
      expect(insight.priority).toBe('high');
      expect(insight.actionable).toBe(false);
    });
  });

  describe('UserPreferences interface validation', () => {
    it('should accept complete user preferences', () => {
      const preferences = {
        preferredFormats: ['xlsx', 'csv'],
        defaultScope: {
          type: 'current_selection' as const,
          includeRelated: true,
          includeHistory: false
        },
        aiAssistanceLevel: 'moderate' as const,
        privacySettings: {
          allowDataStorage: true,
          allowLearning: true,
          anonymizeData: false,
          retentionDays: 30
        }
      };

      expect(preferences.preferredFormats).toHaveLength(2);
      expect(preferences.aiAssistanceLevel).toBe('moderate');
      expect(preferences.privacySettings.retentionDays).toBe(30);
    });
  });
});