import swaggerJSDoc from 'swagger-jsdoc';
import { Request, Response } from 'express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Excel Context Engine API',
      version: '1.0.0',
      description: 'Intelligent system that analyzes user requests in spreadsheet environments and generates optimal context for LLM processing',
      contact: {
        name: 'Excel Context Engine Team',
        email: 'support@excelcontextengine.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.excelcontextengine.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        SpreadsheetData: {
          type: 'object',
          properties: {
            sheets: {
              type: 'array',
              items: { $ref: '#/components/schemas/Sheet' }
            },
            metadata: { $ref: '#/components/schemas/FileMetadata' },
            formulas: {
              type: 'array',
              items: { $ref: '#/components/schemas/Formula' }
            },
            namedRanges: {
              type: 'array',
              items: { $ref: '#/components/schemas/NamedRange' }
            }
          }
        },
        Sheet: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'array',
                items: { $ref: '#/components/schemas/Cell' }
              }
            },
            dimensions: {
              type: 'object',
              properties: {
                rows: { type: 'number' },
                cols: { type: 'number' }
              }
            }
          }
        },
        Cell: {
          type: 'object',
          properties: {
            value: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            formula: { type: 'string' },
            dataType: { 
              type: 'string',
              enum: ['text', 'number', 'date', 'boolean', 'formula', 'error']
            },
            formatting: { $ref: '#/components/schemas/CellFormat' },
            dependencies: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        Formula: {
          type: 'object',
          properties: {
            cell: { type: 'string' },
            formula: { type: 'string' },
            dependencies: {
              type: 'array',
              items: { type: 'string' }
            },
            precedents: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        ContextData: {
          type: 'object',
          properties: {
            immediate: { $ref: '#/components/schemas/ImmediateContext' },
            related: { $ref: '#/components/schemas/RelatedContext' },
            structural: { $ref: '#/components/schemas/StructuralContext' },
            historical: { $ref: '#/components/schemas/HistoricalContext' },
            patterns: { $ref: '#/components/schemas/PatternInsights' }
          }
        },
        ImmediateContext: {
          type: 'object',
          properties: {
            selectedData: {
              type: 'array',
              items: {
                type: 'array',
                items: { $ref: '#/components/schemas/Cell' }
              }
            },
            activeCell: { $ref: '#/components/schemas/Cell' },
            visibleData: {
              type: 'array',
              items: {
                type: 'array',
                items: { $ref: '#/components/schemas/Cell' }
              }
            },
            currentFormulas: {
              type: 'array',
              items: { $ref: '#/components/schemas/Formula' }
            }
          }
        },
        RelatedContext: {
          type: 'object',
          properties: {
            dependentCells: {
              type: 'array',
              items: { $ref: '#/components/schemas/Cell' }
            },
            precedentCells: {
              type: 'array',
              items: { $ref: '#/components/schemas/Cell' }
            },
            relatedFormulas: {
              type: 'array',
              items: { $ref: '#/components/schemas/Formula' }
            }
          }
        },
        PatternInsights: {
          type: 'object',
          properties: {
            dataPatterns: {
              type: 'array',
              items: { $ref: '#/components/schemas/DataPattern' }
            },
            relationships: {
              type: 'array',
              items: { $ref: '#/components/schemas/Relationship' }
            },
            anomalies: {
              type: 'array',
              items: { $ref: '#/components/schemas/Anomaly' }
            },
            insights: {
              type: 'array',
              items: { $ref: '#/components/schemas/Insight' }
            },
            confidence: { type: 'number', minimum: 0, maximum: 1 }
          }
        },
        AnalysisRequest: {
          type: 'object',
          required: ['request'],
          properties: {
            request: {
              type: 'string',
              description: 'Natural language request from the user'
            },
            spreadsheetId: {
              type: 'string',
              description: 'ID of previously uploaded spreadsheet'
            },
            currentSelection: {
              type: 'object',
              properties: {
                sheet: { type: 'string' },
                range: { type: 'string', example: 'A1:C10' },
                activeCell: { type: 'string', example: 'B5' }
              }
            },
            userContext: {
              type: 'object',
              properties: {
                sessionId: { type: 'string' },
                recentActions: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        },
        AnalysisResponse: {
          type: 'object',
          properties: {
            requestId: { type: 'string' },
            requestAnalysis: {
              type: 'object',
              properties: {
                intent: {
                  type: 'string',
                  enum: ['formula_assistance', 'data_analysis', 'formatting', 'troubleshooting', 'general_assistance']
                },
                scope: { type: 'string' },
                confidence: { type: 'number', minimum: 0, maximum: 1 }
              }
            },
            context: { $ref: '#/components/schemas/ContextData' },
            naturalLanguageDescription: { type: 'string' },
            actionableInfo: {
              type: 'object',
              properties: {
                targetCells: {
                  type: 'array',
                  items: { type: 'string' }
                },
                suggestedOperations: {
                  type: 'array',
                  items: { type: 'string' }
                },
                constraints: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
                suggestions: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            },
            requestId: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/docs/paths/*.yaml']
};

export const specs = swaggerJSDoc(options);

export const swaggerOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { background: #fafafa; padding: 20px; border-radius: 4px; }
  `,
  customSiteTitle: 'Excel Context Engine API Documentation'
};