/*
 * FILE: dslSuggestionsConfig.js
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
 * Version tracking: See dslSuggestionsApp.html for app version.
 */

var dslSuggestionsConfigData = {
  version: "3.00",
  specification: "DSL Code Suggestions Rules v1.1",
  lastUpdated: "2025-10-29",

  // Global styling configuration
  styling: {
    suggestionColor: "blue",
    suggestionBold: true
  },

  // Default settings inherited by all rules (can be overridden per-rule)
  defaults: {
    enabled: true,
    severity: "warning",
    autoFixEnabled: false,
    fixStyle: "traditional"
  },

  // Rule configurations (only specify what differs from defaults)
  suggestionRules: {
    divisionOperations: {
      enabled: true,
      label: "Div By 0",
      description: "Detect division operations that may need zero protection",
      suggestionType: "advisory",
      suggestion: "Division detected in expression. Wrap entire formula with ifNaN(**{expression}**, DEFAULT_VALUE) for Divide-By-Zero protection.",
      autoFixEnabled: false,
      fixTemplates: {
        traditional: "ifNaN({expression}, {defaultAltValue})",
        method: "({expression}).ifNaN({defaultAltValue})"
      },
      skipIfWrappedIn: ["ifNaN", "catch", "ifNull", "safeDivide"],
      errorOnZeroLiteral: true,
      errorMessage: "ERROR: Division by zero literal! {expression}",
      defaultAltValue: "0.0"
    },

    queryFunctions: {
      enabled: true,
      label: "Query",
      description: "Query based functions impact performance. Should be set as One-Time / No-Copy",
      severity: "info",
      suggestionType: "advisory",
      suggestion: "Ensure Attributes with query based Expressions are set as \"One-Time / No-Copy\", as per best practices.",
      functionNames: [
        "averageQuery",
        "countQuery",
        "maxQuery",
        "minQuery",
        "query",
        "sumQuery",
        "weightedAverageQuery"
      ]
    },

    uniqueKey: {
      enabled: true,
      label: "UniqueKey",
      description: "uniqueKey function has special configuration requirements",
      suggestionType: "advisory",
      suggestion: "Ensure uniqueKey() expression is set to \"One-Time\" and \"No-Copy\" flags.",
      function: "uniqueKey"
    },

    variableNaming: {
      enabled: true,
      label: "Var Naming",
      description: "Enforce lowerCamelCase naming convention",
      severity: "info",
      suggestionType: "advisory",
      suggestion: "Variable '{varName}' should use lowerCamelCase: '{correctedName}'.",
      autoFixEnabled: false,
      fixTemplates: {
        traditional: "{correctedName}",
        method: "{correctedName}"
      },
      separatorCharacters: ["_", "-"]
    },

    nonOptimalNodeAccess: {
      enabled: true,
      label: "Node Perf",
      description: "Hierarchy / Library node references that can impact continuous expression performance",
      severity: "info",
      suggestionType: "advisory",
      suggestion: "{library} node reference detected. Consider use of a One-Time Attribute Expression to store the target value.",
      libraryNodes: [
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

    nullAccessProtection: {
      enabled: true,
      label: "Null Safety",
      description: "Detect Node chains that may fail due to null/undefined values",
      suggestionType: "advisory",
      suggestion: "Add null protection for **{object}** when accessing .{property}",
      autoFixEnabled: false,
      fixStyle: "method",
      fixTemplates: {
        traditional: "ifNull({expression}, {defaultAltValue})",
        method: "({expression}).ifNull({defaultAltValue})"
      },
      defaultAltValue: "ref, string, etc."
    },

    mathOperationsParens: {
      enabled: true,
      label: "Math Clarity",
      description: "Detect math operations that may need parentheses for clarity",
      severity: "info",
      suggestionType: "advisory",
      suggestion: "Consider use of parens () to group math operations for clarity."
    },

    extraneousBlocks: {
      enabled: true,
      label: "Extraneous Block",
      description: "Detect unnecessary block statements with single content",
      severity: "info",
      suggestionType: "advisory",
      suggestion: "Remove unnecessary block() wrapper for single statement.",
      autoFixEnabled: true
    }
  },

  // Global library configuration (used by nonOptimalNodeAccess)
  libraries: ["Primary", "Secondary", "Tertiary"]
};
