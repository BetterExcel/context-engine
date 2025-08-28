#!/bin/bash

# Simple test script that runs in current terminal
# Assumes servers are already running in background

echo "🧪 Quick API Test"
echo "================"

# Test context analysis endpoint 
echo "Testing context analysis endpoint..."
echo ""

response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST http://localhost:3003/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "What data is in this spreadsheet?",
    "spreadsheetData": {
      "sheets": [
        {
          "name": "TestData",
          "cells": [
            [
              {"value": "Symbol", "dataType": "text", "address": "A1"},
              {"value": "Company", "dataType": "text", "address": "B1"},
              {"value": "Price", "dataType": "text", "address": "C1"}
            ],
            [
              {"value": "AAPL", "dataType": "text", "address": "A2"},
              {"value": "Apple Inc", "dataType": "text", "address": "B2"},
              {"value": 150.25, "dataType": "number", "address": "C2"}
            ],
            [
              {"value": "GOOGL", "dataType": "text", "address": "A3"},
              {"value": "Alphabet Inc", "dataType": "text", "address": "B3"},
              {"value": 142.56, "dataType": "number", "address": "C3"}
            ]
          ]
        }
      ]
    },
    "currentSelection": {
      "sheet": "TestData",
      "range": "A1:C3",
      "activeCell": "A1"
    },
    "userContext": {
      "sessionId": "test_session_quick",
      "recentActions": [],
      "preferences": {},
      "interactionHistory": []
    }
  }')

# Extract HTTP status
http_status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "HTTP Status: $http_status"
echo ""

if [ "$http_status" = "200" ]; then
    echo "✅ SUCCESS! Context analysis endpoint is working"
    echo ""
    echo "Response (first 500 chars):"
    echo "$response_body" | head -c 500
    echo ""
    echo "..."
else
    echo "❌ FAILED! HTTP Status: $http_status"
    echo ""
    echo "Response:"
    echo "$response_body"
fi

echo ""
echo "🔍 Check server logs for detailed processing information"
