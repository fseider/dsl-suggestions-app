/*
 * FILE: dslSuggestionsConfig.js
 * VERSION: v2.36
 * LAST UPDATED: 2025-08-07
 * 
 * ARTIFACT INFO (for proper Claude artifact creation):
 * - ID: dslSuggestionsConfig.js
 * - Title: dslSuggestionsConfig
 * - Type: application/vnd.ant.code (language: javascript)
 * 
 * ARCHITECTURAL BOUNDARY: Suggestions
 * AUTO-LOADED BY: dslSuggestionsEngine.js
 * PROVIDES: dslSuggestionsConfigData global object
 * 
 * DESCRIPTION:
 * Configuration data for DSL suggestions engine including rule definitions,
 * patterns, and fix strategies for code analysis and improvement.
 * Contains ONLY configuration data per RULE #4 CONFIG FILE CODE PROHIBITION.
 * All validation functions moved to dslSuggestionsEngine.js.
 * UPDATED v2.27: Added configurable libraryNodes for nonOptimalNodeAccessRule.
 * UPDATED v2.28: Added Actual, ProductSize, ActualSizeRange, WBS to libraryNodes.
 * UPDATED v2.29: Added trailing dots to all libraryNodes for proper pattern matching.
 * UPDATED v2.30: Added configurable functionNames for queryFunctions rule.
 * UPDATED v2.31: Added uniqueKey rule configuration.
 * UPDATED v2.32: Removed old commented code blocks, keeping version history at top.
 * UPDATED v2.33: Removed detailed version history comments from data object.
 * UPDATED v2.34: Updated nonOptimalNodeAccessRule suggestion message.
 * UPDATED v2.35: Added configurable suggestionColor for SUGGESTION text styling.
 * UPDATED v2.36: Changed suggestionColor to blue and added suggestionBold option.
 */

var dslSuggestionsConfigData = {
  // v2.36: Changed color to blue and added bold option
  "version": "2.36",
  "specification": "DSL Code Suggestions Rules v1.1",
  "lastUpdated": "2025-08-07",
  
  // v2.35: Global styling configuration for suggestion display
  // v2.36: Updated styling options
  "styling": {
    // v2.35: Original red color
    // "suggestionColor": "red"  // Color for "SUGGESTION:" text in comments
    // v2.36: Changed to blue and added bold option
    "suggestionColor": "blue",   // Color for "SUGGESTION:" text in comments
    "suggestionBold": true       // Make "SUGGESTION:" text bold
  },
  
  "suggestionRules": {
    "divisionOperations": {
      "description": "Detect division operations that may need zero protection",
      "enabled": true,
      "suggestionType": "fixable",
      "suggestion": "Use ifNaN({expression}, 0.0) for Divide-By-Zero protection.",
      "autoFixEnabled": true,
      "fixStyle": "traditional",
      "fixTemplates": {
        "traditional": "ifNaN({expression}, {defaultAltValue})",
        "method": "({expression}).ifNaN({defaultAltValue})"
      },
      "skipIfWrappedIn": ["ifNaN", "catch", "ifNull", "safeDivide"],
      "errorOnZeroLiteral": true,
      "errorMessage": "ERROR: Division by zero literal! {expression}",
      "defaultAltValue": 0.0
    },
    
    "queryFunctions": {
      "description": "Query based functions impact performance. Should be set as One-Time / No-Copy",
      "enabled": true,
      "suggestionType": "advisory",
      "suggestion": "Ensure setting {function}() as \"One-Time / No-Copy\" for better performance.",
      "functionNames": [
        "averageQuery",
        "countQuery",
        "maxQuery",
        "minQuery",
        "query",
        "sumQuery",
        "weightedAverageQuery"
      ]
    },
    
    "uniqueKey": {
      "description": "uniqueKey function has special configuration requirements",
      "enabled": true,
      "suggestionType": "advisory",
      "suggestion": "Ensure uniqueKey() expression is set to \"One-Time\" and \"No-Copy\" flags.",
      "function": "uniqueKey"
    },
    
    "variableNaming": {
      "description": "Enforce lowerCamelCase naming convention",
      "enabled": true,
      "suggestionType": "fixable",
      "suggestion": "Use lowerCamelCase: {correctedNames}.",
      "autoFixEnabled": true,
      "fixStyle": "traditional",
      "fixTemplates": {
        "traditional": "{correctedName}",
        "method": "{correctedName}"
      },
      "separatorCharacters": ["_", "-"]
    },
    
    "nonOptimalNodeAccessRule": {
      "description": "Hierarchy / Library node references that can impact continuous expression performance",
      "enabled": true,
      "suggestionType": "advisory",
      // v2.33: Original suggestion message
      // "suggestion": "{library} node reference detected. Each reference creates a new instance.",
      // v2.34: Updated suggestion message with actionable advice
      "suggestion": "{library} node reference detected. Consider use of a One-Time Attribute Expression to store the target value.",
      "libraryNodes": [
        "ParentSeason.",
        "Collection.",
        "Category1.",
        "Category2.",
        "ColorSpecification.",
        "Shape.",
        "Theme.",
        "Actual.",
        "ProductSize.",
        "ActualSizeRange.",
        "WBS."
      ]
    },
    
    "nullAccessProtection": {
      "description": "Detect Node chains that may fail due to null/undefined values",
      "enabled": true,
      "suggestionType": "fixable",
      "suggestion": "Add null protection using ifNull({expression}) for safe property access.",
      "autoFixEnabled": true,
      "fixStyle": "method",
      "fixTemplates": {
        "traditional": "ifNull({expression}, {defaultAltValue})",
        "method": "({expression}).ifNull({defaultAltValue})"
      },
      "defaultAltValue": "ref, string, etc."
    },
    
    "mathOperationsParens": {
      "description": "Detect math operations that may need parentheses for clarity",
      "enabled": true,
      "suggestionType": "advisory",
      "suggestion": "Consider use of parens () to group math operations for clarity."
    },
    
    "extraneousBlocks": {
      "description": "Detect unnecessary block statements with single content",
      "enabled": true,
      "suggestionType": "fixable",
      "suggestion": "Remove unnecessary block() wrapper for single statement.",
      "autoFixEnabled": true
    }
  }
};