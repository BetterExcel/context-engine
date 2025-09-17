#!/bin/bash

# Test Runner Script
# This script runs tests in a separate terminal/process to avoid interfering with running servers

echo "🧪 Context Engine Test Runner"
echo "=============================="

# Function to run API tests
run_api_tests() {
    echo "🔗 Testing API endpoints..."
    
    # Test backend health
    echo "Testing backend health..."
    curl -s http://localhost:3003/api/health | head -5
    echo ""
    
    # Test frontend availability
    echo "Testing frontend availability..."
    curl -s -I http://localhost:3000 | grep HTTP
    echo ""
    
    # Test context analysis endpoint
    echo "Testing context analysis endpoint..."
    curl -s -X POST http://localhost:3003/api/v1/context/analyze-context \
      -H "Content-Type: application/json" \
      -d '{
        "request": "What data is this?",
        "spreadsheetId": "sheet_test_123",
        "spreadsheetData": {
          "sheets": [
            {
              "name": "TestData",
              "cells": [
                [
                  {"value": "Symbol", "dataType": "text", "address": "A1"},
                  {"value": "Price", "dataType": "text", "address": "B1"}
                ],
                [
                  {"value": "AAPL", "dataType": "text", "address": "A2"},
                  {"value": 150.25, "dataType": "number", "address": "B2"}
                ]
              ]
            }
          ]
        },
        "currentSelection": {
          "sheet": "TestData",
          "range": "A1:B2",
          "activeCell": "A1"
        },
        "userContext": {
          "sessionId": "test_session_api",
          "recentActions": [],
          "preferences": {},
          "interactionHistory": []
        }
      }' | head -10
    echo ""
}

# Function to run E2E tests
run_e2e_tests() {
    echo "🎭 Running E2E tests..."
    cd /Users/jineshshah/Desktop/Context_Enginer_prototype/e2e
    npx playwright test spreadsheet-interaction.spec.ts:13 --reporter=line
    cd ..
}

# Function to run unit tests
run_unit_tests() {
    echo "🔧 Running unit tests..."
    cd /Users/jineshshah/Desktop/Context_Enginer_prototype
    npm test
    cd ..
}

# Check if servers are running
check_servers() {
    echo "🔍 Checking if servers are running..."
    
    # Check backend
    if curl -s http://localhost:3003/api/health > /dev/null; then
        echo "✅ Backend server is running on port 3003"
    else
        echo "❌ Backend server is NOT running on port 3003"
        echo "   Please start with: npm run dev:backend"
        return 1
    fi
    
    # Check frontend
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ Frontend server is running on port 3000"
    else
        echo "❌ Frontend server is NOT running on port 3000"
        echo "   Please start with: npm run dev:frontend"
        return 1
    fi
    
    echo ""
}

# Main execution
main() {
    # Change to project directory
    cd /Users/jineshshah/Desktop/Context_Enginer_prototype
    
    # Check servers first
    if ! check_servers; then
        echo "⚠️  Cannot run tests - servers are not running"
        exit 1
    fi
    
    # Run tests based on argument
    case "${1:-api}" in
        "api")
            run_api_tests
            ;;
        "e2e")
            run_e2e_tests
            ;;
        "unit")
            run_unit_tests
            ;;
        "all")
            run_api_tests
            echo ""
            run_e2e_tests
            echo ""
            run_unit_tests
            ;;
        *)
            echo "Usage: $0 [api|e2e|unit|all]"
            echo "  api  - Test API endpoints (default)"
            echo "  e2e  - Run E2E tests"
            echo "  unit - Run unit tests"
            echo "  all  - Run all tests"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
