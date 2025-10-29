/*
 * FILE: dslRuleRegistry.js
 * VERSION: v1.03
 * LAST UPDATED: 2025-08-06
 * 
 * ARTIFACT INFO (for proper Claude artifact creation):
 * - ID: dslRuleRegistry.js
 * - Title: dslRuleRegistry
 * - Type: application/vnd.ant.code (language: javascript)
 * 
 * ARCHITECTURAL BOUNDARY: Suggestions
 * LOCATION: ../Rules/ (same directory as rule files)
 * AUTO-LOADED BY: dslSuggestionsEngine.js
 * PROVIDES: RULE_REGISTRY array
 * 
 * DESCRIPTION:
 * Central registry of all DSL suggestion rule files.
 * Lives in the Rules directory alongside the rule files it references.
 * Contains ONLY the list of rule filenames to be loaded.
 * To add a new rule: simply add its filename to the array below.
 */

// v1.03 - Added version property for popup detection compatibility
var RULE_REGISTRY = [
    'divisionOperationsRule.js',
    'queryFunctionsRule.js',
    'uniqueKeyRule.js',
    'variableNamingRule.js',
    'nonOptimalNodeAccessRule.js',
    'nullAccessProtectionRule.js',
    'mathOperationsParensRule.js',
    'extraneousBlocksRule.js'
];

// v1.03 - Add version property for popup detection (maintains array functionality)
RULE_REGISTRY.version = '1.03';
