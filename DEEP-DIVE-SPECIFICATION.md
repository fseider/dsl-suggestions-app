# DSL Suggestions App - Deep Dive Technical Specification

**Version:** 3.50
**Last Updated:** 2025-11-03
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Overall Architecture](#overall-architecture)
3. [Core Components](#core-components)
4. [DSL Analysis Engine](#dsl-analysis-engine)
5. [Rule System](#rule-system)
6. [Configuration System](#configuration-system)
7. [Auto-Fix Engine](#auto-fix-engine)
8. [Data Structures](#data-structures)
9. [UI/UX Layer](#uiux-layer)
10. [Performance Optimizations](#performance-optimizations)
11. [Extension Points](#extension-points)

---

## Executive Summary

The DSL Suggestions App is a browser-based static code analysis tool that provides intelligent suggestions for Domain-Specific Language (DSL) code. It analyzes code line-by-line using a pluggable rule system, detects potential issues, and can automatically apply fixes.

**Key Architectural Decisions:**
- **Zero Dependencies:** Runs entirely in the browser with vanilla JavaScript
- **Modular Design:** Consolidated rule system with 8 specialized rules
- **Line-by-Line Analysis:** Processes code sequentially for accurate context
- **Configurable Rules:** JSON-based configuration with inheritance
- **Dual Output Forms:** Supports Traditional and Method syntax styles

**Performance Metrics:**
- 4 HTTP requests (down from 10+ in v2.x)
- 65% code reduction from original
- ~500 lines removed from engine by consolidating rules
- Real-time analysis for typical DSL code blocks

---

## Overall Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                           │
│  (dslSuggestionsApp.html + dslSuggestionsApp.js)           │
│  - Input/Output textareas                                   │
│  - Form selection (Traditional/Method)                      │
│  - Color-coded HTML output                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              SUGGESTIONS ENGINE                             │
│            (dslSuggestionsEngine.js)                        │
│  - analyzeDSL()                                            │
│  - formatSuggestionsOutput()                                │
│  - applyCodeSuggestions()                                   │
│  - Auto-loads dependencies                                  │
└──────┬─────────────┬──────────────────┬────────────────────┘
       │             │                  │
       ▼             ▼                  ▼
┌──────────┐  ┌─────────────┐  ┌──────────────────┐
│ CONFIG   │  │ UTILITIES   │  │ CONSOLIDATED     │
│          │  │             │  │ RULES            │
│ Config   │  │ String      │  │ - Division Ops   │
│ Defaults │  │ Regex       │  │ - Query Funcs    │
│ Rule     │  │ Message     │  │ - Unique Key     │
│ Settings │  │ Utils       │  │ - Var Naming     │
└──────────┘  └─────────────┘  │ - Node Access    │
                                │ - Null Safety    │
                                │ - Math Parens    │
                                │ - Extraneous     │
                                │   Blocks         │
                                └──────────────────┘
```

### Initialization Flow

```
Page Load
    │
    ▼
Load dslSuggestionsEngine.js
    │
    ▼
Engine Auto-Initialization:
    │
    ├─► Load dslSuggestionsConfig.js
    │   └─► dslSuggestionsConfigData global
    │
    ├─► Load dslRuleUtilities.js
    │   └─► DSLRuleUtils global
    │
    └─► Load dslRules.js
        └─► DSL_RULES array global (8 rules)
    │
    ▼
Fire 'dslSuggestionsEngineReady' event
    │
    ▼
Load dslSuggestionsApp.js
    │
    ▼
App Ready (UI interactive)
```

---

## Core Components

### 1. Suggestions Engine (dslSuggestionsEngine.js)

**Version:** 3.00
**Purpose:** Core analysis and suggestion generation engine

#### Key Functions:

##### `analyzeDSL(code, options)`
Main analysis function that processes DSL code and returns suggestions.

**Algorithm:**
```javascript
1. Split code into lines
2. Build context object (lines, totalLines, options)
3. For each rule in DSL_RULES:
   a. Get rule configuration with defaults applied
   b. For each line in code:
      - Call rule.check(line, lineNum, allLines, context, config)
      - Collect suggestions returned
4. Calculate summary statistics (total, byType, bySeverity)
5. Return results object
```

**Input:**
- `code` (string): DSL code to analyze
- `options` (object, optional): Analysis options
  - `config` (object): Override default configuration

**Output:**
```javascript
{
  suggestions: [
    {
      line: number,           // Line number (1-indexed)
      column: number,         // Character position
      message: string,        // Suggestion message
      severity: string,       // 'warning' | 'info' | 'error'
      rule: string,          // Rule name
      label: string,         // Display label
      fixable: boolean,      // Can be auto-fixed
      hasDifferentForms: boolean, // Traditional vs Method differ
      original: string,      // Original code fragment
      instanceNumber: number // Instance count for color coding
    }
  ],
  summary: {
    total: number,
    byType: { 'v1.14': 2, 'v1.15': 3, ... },
    bySeverity: { 'warning': 5, 'info': 8, ... }
  }
}
```

##### `formatSuggestionsOutput(code, suggestions)`
Formats code with inline suggestion comments.

**Algorithm:**
```javascript
1. Split code into lines
2. Build suggestion style from config (color, bold)
3. For each line:
   a. Add the code line
   b. Find suggestions for this line
   c. For each suggestion:
      - Get indentation from code line
      - Format as /* SUGGESTION: message */
      - Handle multi-line suggestions
4. Join lines with newlines
```

##### `applyCodeSuggestions(code)`
Auto-fixes code by applying all enabled rules with auto-fix.

**Algorithm:**
```javascript
1. Get current form selection (Traditional vs Method)
2. For each rule in DSL_RULES:
   a. Check if rule has fix() and is auto-fix enabled
   b. Override rule's fixStyle with current form selection
   c. Analyze code to find suggestions for this rule
   d. For each suggestion:
      - Call rule.fix(modifiedCode, suggestion, config)
      - Update modifiedCode if changed
3. Return modified code
```

**Key Feature:** Form selection (Traditional/Method) is dynamically injected into rule config, overriding the configured fixStyle.

---

### 2. Configuration System (dslSuggestionsConfig.js)

**Purpose:** Centralized configuration with defaults and rule-specific settings.

#### Configuration Structure:

```javascript
dslSuggestionsConfigData = {
  version: "3.00",
  specification: "DSL Code Suggestions Rules v1.1",

  // Global styling
  styling: {
    suggestionColor: "blue",
    suggestionBold: true
  },

  // Defaults inherited by all rules
  defaults: {
    enabled: true,
    severity: "warning",
    autoFixEnabled: false,
    fixStyle: "traditional"
  },

  // Rule-specific configs (override defaults)
  suggestionRules: {
    divisionOperations: {
      enabled: true,
      label: "Div By 0",
      description: "...",
      suggestion: "...",
      autoFixEnabled: false,
      fixTemplates: {
        traditional: "ifNaN({expression}, {defaultAltValue})",
        method: "({expression}).ifNaN({defaultAltValue})"
      },
      skipIfWrappedIn: ["ifNaN", "catch", "ifNull"],
      defaultAltValue: "0.0"
    },
    // ... 7 more rules
  }
}
```

#### Configuration Inheritance:

The `applyConfigDefaults()` function merges defaults with rule-specific config:

```javascript
function applyConfigDefaults(ruleConfig, defaults) {
  var merged = {};

  // Copy defaults first
  for (var key in defaults) {
    merged[key] = defaults[key];
  }

  // Override with rule-specific values
  for (var key in ruleConfig) {
    merged[key] = ruleConfig[key];
  }

  return merged;
}
```

This allows rules to specify only what differs from defaults, reducing configuration verbosity.

---

### 3. Utilities (dslRuleUtilities.js)

**Version:** 2.00
**Purpose:** Shared utility functions for rules
**Size:** Trimmed from 440 lines to ~120 lines (only used functions kept)

#### Utility Modules:

##### `DSLRuleUtils.String`

**`removeStringLiterals(line)`**
- Replaces string contents with spaces while maintaining character positions
- Prevents false positives from patterns inside strings
- Handles both single and double quotes
- Preserves escape sequences

**Algorithm:**
```javascript
1. Iterate through each character
2. Track if inside string (inString flag, stringChar tracker)
3. If character is quote and not escaped:
   - Toggle inString state
   - Replace with space
4. If inside string:
   - Replace with space
5. If outside string:
   - Keep character
6. Return processed line
```

**`isInsideString(line, position)`**
- Checks if a character position is inside a string literal
- Used to skip false matches in string contents

##### `DSLRuleUtils.Regex`

**`escape(str)`**
- Escapes special regex characters for safe use in patterns
- Pattern: `/[.*+?^${}()|[\]\\]/g` → `\\$&`

##### `DSLRuleUtils.Message`

**`replacePlaceholders(template, values)`**
- Replaces {placeholder} markers in templates
- Uses split/join instead of replace for all occurrences
- Powers dynamic message generation

---

### 4. Consolidated Rules (dslRules.js)

**Version:** 1.01
**Purpose:** All 8 rules in a single file (optimization from v2.x's 8 separate files)

#### Rule Array Structure:

```javascript
var DSL_RULES = [
  {
    name: 'ruleName',
    version: 'v2.00',
    _instanceCounter: 0,  // For color coding

    check: function(line, lineNumber, allLines, context, config) {
      // Returns array of suggestions
    },

    fix: function(code, suggestion, config) {
      // Returns modified code
    }
  },
  // ... 7 more rules
];
```

---

## DSL Analysis Engine

### Analysis Pipeline

```
Input Code
    │
    ▼
Split into Lines
    │
    ▼
Build Context {
  lines: string[],
  totalLines: number,
  options: object
}
    │
    ▼
For Each Rule:
    │
    ├─► Get Config (with defaults)
    │
    └─► For Each Line:
            │
            ├─► Remove String Literals
            │
            ├─► Apply Rule Pattern Matching
            │
            ├─► Check for False Positives
            │
            ├─► Generate Suggestions
            │
            └─► Track Instance Numbers
    │
    ▼
Aggregate Suggestions
    │
    ▼
Calculate Summary Statistics
    │
    ▼
Return Results
```

### Context Object

The context object provides rules with additional information:

```javascript
{
  lines: ['line1', 'line2', ...],  // All code lines
  totalLines: 42,                   // Total line count
  options: {                        // User options
    config: {...}                   // Override config
  },
  isInComment: false                // Future: multi-line comment tracking
}
```

### Line-by-Line Processing

Each rule processes one line at a time for several reasons:

1. **Simplicity:** Easy to implement and debug
2. **Position Accuracy:** Line and column numbers are straightforward
3. **Memory Efficiency:** No need to build AST
4. **Contextual Access:** Rules can look at surrounding lines via `allLines` parameter
5. **Incremental:** Future could support real-time editor integration

---

## Rule System

### Rule Lifecycle

```
Rule Initialization (lineNumber === 1)
    │
    └─► Reset _instanceCounter = 0
    │
    ▼
For Each Line:
    │
    ├─► Check if in comment (skip if true)
    │
    ├─► Get rule config
    │
    ├─► Check if enabled
    │
    ├─► Process line with removeStringLiterals()
    │
    ├─► Apply regex patterns
    │
    ├─► For each match:
    │       │
    │       ├─► Check if inside string (skip)
    │       │
    │       ├─► Check skip conditions (e.g., already wrapped)
    │       │
    │       ├─► Increment _instanceCounter
    │       │
    │       └─► Create suggestion object
    │
    └─► Return suggestions array
```

### Rule Anatomy

Let's examine the Division Operations rule as a comprehensive example:

```javascript
{
  name: 'divisionOperations',
  version: 'v2.00',
  _instanceCounter: 0,

  check: function(line, lineNumber, allLines, context, config) {
    var suggestions = [];

    // Reset counter at start
    if (lineNumber === 1) {
      this._instanceCounter = 0;
    }

    // Skip comments
    if (context && context.isInComment) {
      return suggestions;
    }

    // Get rule config
    var ruleConfig = config.suggestionRules.divisionOperations;
    if (!ruleConfig || !ruleConfig.enabled) {
      return suggestions;
    }

    // Skip block comments
    if (line.indexOf('/*') !== -1 && line.indexOf('*/') !== -1) {
      return suggestions;
    }

    // Remove strings for accurate matching
    var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);

    // Find divisions (skip /=)
    var divisionPattern = /\/(?!=)/g;
    var match;
    var processedExpressions = {};

    while ((match = divisionPattern.exec(lineWithoutStrings)) !== null) {
      var divPosition = match.index;

      // Skip if inside string (double-check)
      if (DSLRuleUtils.String.isInsideString(line, divPosition)) {
        continue;
      }

      // Extract full expression containing division
      var expression = this._extractExpression(lineWithoutStrings, divPosition);

      if (!expression || expression.trim() === '') {
        continue;
      }

      // Skip duplicates
      if (processedExpressions[expression]) {
        continue;
      }
      processedExpressions[expression] = true;

      // Skip if already wrapped
      if (this._isAlreadyWrapped(lineWithoutStrings, expression, ruleConfig)) {
        continue;
      }

      // Build suggestion message
      var suggestionMsg = ruleConfig.suggestion;
      suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
        expression: expression
      });

      // Increment instance
      this._instanceCounter++;

      // Check if Traditional/Method differ
      var hasDifferentForms = ruleConfig.fixTemplates &&
        ruleConfig.fixTemplates.traditional !== ruleConfig.fixTemplates.method;

      // Create suggestion
      suggestions.push({
        line: lineNumber,
        column: divPosition,
        message: suggestionMsg,
        severity: ruleConfig.severity || 'warning',
        rule: this.name,
        label: ruleConfig.label || this.name,
        fixable: true,
        hasDifferentForms: hasDifferentForms,
        original: expression,
        instanceNumber: this._instanceCounter
      });
    }

    return suggestions;
  },

  _extractExpression: function(line, divPosition) {
    // Finds expression boundaries (delimiters: =, comma, parens)
    var startDelimiters = ['=', ',', '('];
    var endDelimiters = [',', ')'];

    // Backward scan for start
    var start = 0;
    for (var i = divPosition - 1; i >= 0; i--) {
      if (startDelimiters.indexOf(line.charAt(i)) !== -1) {
        start = i + 1;
        break;
      }
    }

    // Forward scan for end
    var end = line.length;
    for (var i = divPosition + 1; i < line.length; i++) {
      if (endDelimiters.indexOf(line.charAt(i)) !== -1) {
        end = i;
        break;
      }
    }

    return line.substring(start, end).trim();
  },

  _isAlreadyWrapped: function(line, expression, ruleConfig) {
    var skipFunctions = ruleConfig.skipIfWrappedIn || [];

    for (var i = 0; i < skipFunctions.length; i++) {
      var funcName = skipFunctions[i];
      var escapedExpression = DSLRuleUtils.Regex.escape(expression);
      var wrappedPattern = new RegExp(funcName + '\\s*\\(\\s*' + escapedExpression);

      if (wrappedPattern.test(line)) {
        return true;
      }
    }

    return false;
  },

  fix: function(code, suggestion, config) {
    var ruleConfig = config.suggestionRules.divisionOperations;

    if (!ruleConfig || !ruleConfig.autoFixEnabled) {
      return code;
    }

    // Get fix style (Traditional vs Method)
    var fixStyle = ruleConfig.fixStyle || 'traditional';
    var template = ruleConfig.fixTemplates && ruleConfig.fixTemplates[fixStyle];

    if (!template) {
      template = 'ifNaN({expression}, {defaultAltValue})';
    }

    // Generate sequenced placeholder
    var instanceNum = suggestion.instanceNumber || 1;
    var defaultValue = 'DEF_VAL_DIV_BY_ZERO_' + instanceNum;

    // Apply template
    var fixedCode = template
      .replace('{expression}', suggestion.original)
      .replace('{defaultAltValue}', defaultValue);

    // Replace line-by-line to avoid double-wrapping
    var lines = code.split('\n');
    var modified = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var pattern = new RegExp(DSLRuleUtils.Regex.escape(suggestion.original), 'g');
      var match;
      var newLine = '';
      var lastIndex = 0;

      while ((match = pattern.exec(line)) !== null) {
        // Check if already wrapped
        if (!this._isAlreadyWrapped(line, match[0], ruleConfig)) {
          newLine += line.substring(lastIndex, match.index) + fixedCode;
          lastIndex = match.index + match[0].length;
          modified = true;
        } else {
          newLine += line.substring(lastIndex, match.index + match[0].length);
          lastIndex = match.index + match[0].length;
        }
      }

      newLine += line.substring(lastIndex);
      lines[i] = newLine;
    }

    return lines.join('\n');
  }
}
```

### Rule Categories

#### 1. Safety Rules (Prevent Runtime Errors)

**Division Operations (divisionOperations)**
- Detects: `/` operator
- Suggests: Wrap in `ifNaN()` or `.ifNaN()` for divide-by-zero protection
- Auto-fix: Yes (both forms)
- Placeholder: `DEF_VAL_DIV_BY_ZERO_N`

**Null Access Protection (nullAccessProtection)**
- Detects: `object.property` without null check
- Suggests: Add null protection with `ifNull()` or `.ifNull()`
- Auto-fix: Yes (both forms)
- Placeholder: `DEF_VAL_NULL_SAFETY_N`

#### 2. Performance Rules

**Query Functions (queryFunctions)**
- Detects: `query()`, `sumQuery()`, `averageQuery()`, etc.
- Suggests: Set as "One-Time / No-Copy"
- Auto-fix: No (manual configuration)

**Unique Key (uniqueKey)**
- Detects: `uniqueKey()` calls
- Suggests: Set as "One-Time / No-Copy"
- Auto-fix: No (manual configuration)

**Non-Optimal Node Access (nonOptimalNodeAccess)**
- Detects: `ParentSeason.`, `Collection.`, `Category1.`, etc.
- Suggests: Store in variable if reused
- Auto-fix: No (requires semantic understanding)

#### 3. Code Quality Rules

**Variable Naming (variableNaming)**
- Detects: `snake_case` or `PascalCase` variables
- Suggests: Use `camelCase`
- Auto-fix: Yes (rename, both forms identical)

**Math Operations Parens (mathOperationsParens)**
- Detects: Mixed `+/-` and `*//` without parentheses
- Suggests: Add parens for clarity
- Auto-fix: No (multiple valid interpretations)
- Color Coding: Highlights expression in suggestion

**Extraneous Blocks (extraneousBlocks)**
- Detects: Unnecessary `block()` wrappers
- Suggests: Remove wrapper
- Auto-fix: Yes

---

## Configuration System

### Configuration Flow

```
Engine Loads Config
    │
    ▼
Parse dslSuggestionsConfigData
    │
    ├─► Extract defaults
    │
    └─► Extract suggestionRules
    │
    ▼
For Each Rule Execution:
    │
    ├─► Get rule-specific config
    │
    ├─► Merge with defaults (applyConfigDefaults)
    │
    └─► Pass merged config to rule
```

### Config Merging Example

**Config:**
```javascript
{
  defaults: {
    enabled: true,
    severity: "warning",
    autoFixEnabled: false,
    fixStyle: "traditional"
  },
  suggestionRules: {
    divisionOperations: {
      label: "Div By 0",
      severity: "error",  // Override
      autoFixEnabled: true  // Override
      // enabled, fixStyle inherited from defaults
    }
  }
}
```

**Merged Result:**
```javascript
{
  enabled: true,           // from defaults
  severity: "error",       // from rule (override)
  autoFixEnabled: true,    // from rule (override)
  fixStyle: "traditional", // from defaults
  label: "Div By 0"        // from rule (new)
}
```

---

## Auto-Fix Engine

### Fix Application Flow

```
User Clicks "Apply Suggestions"
    │
    ▼
Get Current Form Selection (Traditional/Method)
    │
    ▼
For Each Rule in DSL_RULES:
    │
    ├─► Check rule.fix exists
    │
    ├─► Get rule config
    │
    ├─► Check enabled && autoFixEnabled
    │
    ├─► Override fixStyle with form selection
    │
    ├─► Analyze code to find suggestions
    │
    └─► For Each Suggestion:
            │
            ├─► Call rule.fix(code, suggestion, config)
            │
            ├─► Update code if changed
            │
            └─► Track applied rules
    │
    ▼
Return Modified Code
```

### Fix Template System

Templates use placeholder replacement:

```javascript
fixTemplates: {
  traditional: "ifNaN({expression}, {defaultAltValue})",
  method: "({expression}).ifNaN({defaultAltValue})"
}
```

**Example Fix:**
- Original: `revenue / quantity`
- Suggestion: `{expression: "revenue / quantity"}`
- Instance: 1
- Traditional: `ifNaN(revenue / quantity, DEF_VAL_DIV_BY_ZERO_1)`
- Method: `(revenue / quantity).ifNaN(DEF_VAL_DIV_BY_ZERO_1)`

### Sequenced Placeholders

Each rule instance gets a unique placeholder:

```
First division:  DEF_VAL_DIV_BY_ZERO_1
Second division: DEF_VAL_DIV_BY_ZERO_2
Third division:  DEF_VAL_DIV_BY_ZERO_3

First null check:  DEF_VAL_NULL_SAFETY_1
Second null check: DEF_VAL_NULL_SAFETY_2
```

This allows users to replace each with appropriate values.

### Double-Wrapping Prevention

Rules check if code is already wrapped before applying fix:

```javascript
// Before fix, check:
if (this._isAlreadyWrapped(line, expression, config)) {
  return code;  // Skip, already fixed
}
```

This prevents:
- `ifNaN(x / y, 0)` → `ifNaN(ifNaN(x / y, 0), 0)`

---

## Data Structures

### Suggestion Object

```typescript
interface Suggestion {
  line: number;              // 1-indexed line number
  column: number;            // 0-indexed character position
  message: string;           // Formatted message with placeholders replaced
  severity: 'warning' | 'info' | 'error';
  rule: string;             // Rule name (e.g., 'divisionOperations')
  label: string;            // Display label (e.g., 'Div By 0')
  fixable: boolean;         // Can be auto-fixed
  hasDifferentForms: boolean; // Traditional vs Method differ
  original: string;         // Original code fragment
  instanceNumber: number;   // Instance count for color coding
}
```

### Analysis Results

```typescript
interface AnalysisResults {
  suggestions: Suggestion[];
  summary: {
    total: number;
    byType: { [key: string]: number };     // e.g., {'v1.14': 2}
    bySeverity: { [key: string]: number }; // e.g., {'warning': 5}
  };
}
```

### Rule Object

```typescript
interface Rule {
  name: string;
  version: string;
  _instanceCounter: number;

  check(
    line: string,
    lineNumber: number,
    allLines: string[],
    context: Context,
    config: Config
  ): Suggestion[];

  fix(
    code: string,
    suggestion: Suggestion,
    config: Config
  ): string;

  // Optional helper functions
  _extractExpression?(line: string, position: number): string;
  _isAlreadyWrapped?(line: string, expression: string, config: any): boolean;
  // ... other helpers
}
```

### Config Object

```typescript
interface Config {
  version: string;
  specification: string;
  lastUpdated: string;

  styling: {
    suggestionColor: string;
    suggestionBold: boolean;
  };

  defaults: {
    enabled: boolean;
    severity: 'warning' | 'info' | 'error';
    autoFixEnabled: boolean;
    fixStyle: 'traditional' | 'method';
  };

  suggestionRules: {
    [ruleName: string]: RuleConfig;
  };

  libraries?: string[]; // For nonOptimalNodeAccess
}

interface RuleConfig {
  enabled?: boolean;
  label?: string;
  description?: string;
  severity?: string;
  suggestionType?: 'advisory' | 'fixable';
  suggestion?: string;
  autoFixEnabled?: boolean;
  fixStyle?: 'traditional' | 'method';
  fixTemplates?: {
    traditional?: string;
    method?: string;
  };
  // Rule-specific properties
  [key: string]: any;
}
```

---

## UI/UX Layer

### UI Components

```
┌──────────────────────────────────────────┐
│  DSL Suggestions App                     │
│  Standalone Suggestions Application      │
│  Version: v3.50                          │
├──────────────────────────────────────────┤
│  Enter DSL Code to Analyze:              │
│  ┌────────────────────────────────────┐  │
│  │ [Input Textarea]                   │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│  [Get Suggestions] [Show All] [Clear]   │
├──────────────────────────────────────────┤
│  Display Form: ○ Traditional ● Method   │
├──────────────────────────────────────────┤
│  Suggestions (HTML with Color Coding):   │
│  ┌────────────────────────────────────┐  │
│  │ [Color-coded HTML Output]          │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│  Suggestions Applied:                    │
│  ┌────────────────────────────────────┐  │
│  │ [Applied Code Output]              │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│  [Copy Suggestions Applied]              │
└──────────────────────────────────────────┘
```

### Color Coding System

The app uses a 6-color palette for highlighting multiple instances:

```javascript
Color Palette:
1. #d32f2f (Red)
2. #1976d2 (Blue)
3. #388e3c (Green)
4. #f57c00 (Orange)
5. #7b1fa2 (Purple)
6. #c2185b (Pink)
```

**Color Assignment:**
- Each rule instance gets the next color in sequence
- Colors cycle when > 6 instances
- Same object highlighted in both code line and suggestion

**Example:**
```
Code: xxDefQuote.imageList.add(xxAltQuote.someString)

Suggestions:
/* SUGGESTION: Add null protection for xxDefQuote ... */  ← Red
/* SUGGESTION: Add null protection for xxAltQuote ... */  ← Blue

Highlighted Code:
xxDefQuote.imageList.add(xxAltQuote.someString)
^red^                    ^blue^
```

### Form Selection (Traditional vs Method)

Radio buttons control the output format:

**Traditional Form:**
```javascript
ifNaN(revenue / quantity, DEF_VAL_DIV_BY_ZERO_1)
ifNull(xxDefQuote.imageList, DEF_VAL_NULL_SAFETY_1)
```

**Method Form:**
```javascript
(revenue / quantity).ifNaN(DEF_VAL_DIV_BY_ZERO_1)
(xxDefQuote.imageList).ifNull(DEF_VAL_NULL_SAFETY_1)
```

**Implementation:**
```javascript
function getCurrentFormSelection() {
  // Check for force flag
  if (window.__forceFormSelection) {
    return window.__forceFormSelection;
  }

  // Check window marker
  if (window.__currentFormSelection) {
    return window.__currentFormSelection;
  }

  // Check radio buttons
  var selectedRadio = document.querySelector('input[name="suggestionForm"]:checked');
  if (selectedRadio) {
    return selectedRadio.value;
  }

  // Default
  return 'traditional';
}
```

### Rules Reference Popup

Clicking "Show All Possible Suggestions" displays a modal with:

- All 8 rules
- Enabled/disabled status badge
- Description
- Suggestion message
- Example code
- "Copy Example" button

**Popup Structure:**
```html
<div class="rules-popup">
  <div class="rules-popup-content">
    <div class="rules-popup-header">
      <h2>DSL Suggestions - All Rules Reference</h2>
      <button class="close-button">×</button>
    </div>
    <div class="rules-popup-body">
      <!-- Rule Cards -->
      <div class="rule-card">
        <div class="rule-header">
          <span class="rule-title">Division Operations</span>
          <span class="rule-status enabled">ENABLED</span>
        </div>
        <div class="rule-description">...</div>
        <div class="rule-message">...</div>
        <div class="rule-example-section">
          <div class="rule-example-code">block(result = total / count)</div>
          <button class="copy-example-btn">Copy Example</button>
        </div>
      </div>
      <!-- ... 7 more cards -->
    </div>
  </div>
</div>
```

---

## Performance Optimizations

### v3.00 Architecture Improvements

**Before (v2.x):**
- 8 separate rule files
- 1 rule registry file
- 1 rule loader file (~700 lines)
- 10+ HTTP requests on page load
- Dynamic module loading with callbacks

**After (v3.00):**
- 1 consolidated rules file (dslRules.js)
- No registry needed
- No dynamic loader needed
- 4 HTTP requests total
- Simple sequential loading

**Benefits:**
- 65% code reduction
- ~500 lines removed from engine
- Faster page load
- Simpler debugging
- Easier maintenance

### Optimization Techniques

1. **Consolidated Rules:** Single file reduces HTTP overhead
2. **Minimal Utilities:** Trimmed from 440 to 120 lines
3. **Cache Busting:** Version query params force reload when needed
4. **String Literal Removal:** Prevents false matches efficiently
5. **Instance Tracking:** Enables duplicate prevention
6. **Lazy Comment Skipping:** Simple indexOf check vs complex regex

### Loading Performance

```
Timeline:
0ms     - Page load starts
50ms    - HTML parsed
100ms   - dslSuggestionsEngine.js loaded
150ms   - Config loaded
200ms   - Utilities loaded
250ms   - Rules loaded
300ms   - Engine ready event fired
350ms   - App.js loaded
400ms   - UI interactive

Total: ~400ms on typical connection
```

---

## Extension Points

### Adding a New Rule

**Step 1:** Add rule object to `DSL_RULES` array in `dslRules.js`:

```javascript
{
  name: 'myNewRule',
  version: 'v1.00',
  _instanceCounter: 0,

  check: function(line, lineNumber, allLines, context, config) {
    var suggestions = [];

    // Reset counter
    if (lineNumber === 1) {
      this._instanceCounter = 0;
    }

    // Get config
    var ruleConfig = config.suggestionRules.myNewRule;
    if (!ruleConfig || !ruleConfig.enabled) {
      return suggestions;
    }

    // Your detection logic here
    var pattern = /your-pattern/g;
    var match;

    while ((match = pattern.exec(line)) !== null) {
      this._instanceCounter++;

      suggestions.push({
        line: lineNumber,
        column: match.index,
        message: ruleConfig.suggestion,
        severity: ruleConfig.severity || 'info',
        rule: this.name,
        label: ruleConfig.label || this.name,
        fixable: !!ruleConfig.autoFixEnabled,
        instanceNumber: this._instanceCounter
      });
    }

    return suggestions;
  },

  fix: function(code, suggestion, config) {
    var ruleConfig = config.suggestionRules.myNewRule;

    if (!ruleConfig || !ruleConfig.autoFixEnabled) {
      return code;
    }

    // Your fix logic here
    return code;
  }
}
```

**Step 2:** Add configuration to `dslSuggestionsConfig.js`:

```javascript
suggestionRules: {
  // ... existing rules

  myNewRule: {
    enabled: true,
    label: "My Rule",
    description: "What this rule checks",
    suggestion: "Suggestion message with **{placeholder}**",
    autoFixEnabled: false,
    fixTemplates: {
      traditional: "fix({expression})",
      method: "({expression}).fix()"
    }
  }
}
```

**Step 3:** Add example to rules popup in `dslSuggestionsApp.js`:

```javascript
var rulesExamples = {
  // ... existing examples

  myNewRule: "example code that triggers the rule"
};
```

### Extending Configuration

To add global settings:

```javascript
dslSuggestionsConfigData = {
  // ... existing

  myGlobalSetting: {
    option1: "value1",
    option2: "value2"
  }
}
```

Access in rules:
```javascript
var mySetting = config.myGlobalSetting.option1;
```

### Custom UI Integration

The engine can be integrated into other UIs:

```javascript
// Load the engine
<script src="dslSuggestionsEngine.js"></script>

// Wait for ready
window.addEventListener('dslSuggestionsEngineReady', function(e) {
  console.log('Engine ready:', e.detail);

  // Use the API
  var code = "revenue / quantity";
  var results = analyzeDSL(code);

  console.log('Suggestions:', results.suggestions);
  console.log('Summary:', results.summary);
});
```

---

## Appendix: Version History

### v3.50 (2025-11-03)
- Fixed math operations color highlighting implementation
- Removed placeholder approach from v3.49
- Expression directly appended with markers to suggestion

### v3.49 (2025-11-03)
- Added color coding to math operations rule
- Updated node access example comment

### v3.48 (Prior)
- Changed uniqueKey rule to best practice reminder
- Simplified from validation to advisory

### v3.00 (2025-10-29)
- Major architectural optimization
- Consolidated 8 rules into single file
- Removed dynamic loader (~500 lines)
- Trimmed utilities (440 → 120 lines)
- 4 HTTP requests instead of 10+

### v2.00 (Prior)
- Separate rule files
- Dynamic loading system
- Full utilities library

---

## Appendix: File Reference

| File | Purpose | Size | Version |
|------|---------|------|---------|
| dslSuggestionsApp.html | Main UI | ~900 lines | v3.50 |
| dslSuggestionsEngine.js | Core engine | ~515 lines | v3.00 |
| dslSuggestionsApp.js | UI logic | ~450 lines | - |
| dslSuggestionsConfig.js | Configuration | ~160 lines | v3.00 |
| dslRules.js | All 8 rules | ~950 lines | v1.01 |
| dslRuleUtilities.js | Utilities | ~140 lines | v2.00 |
| dslAppStyles.css | Styles | ~200 lines | - |
| index.html | Redirect | ~45 lines | - |

**Total:** ~3,300 lines (down from ~5,000+ in v2.x)

---

**End of Deep Dive Specification**
