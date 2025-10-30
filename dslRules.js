/*
 * FILE: dslRules.js
 * VERSION: v1.01
 * LAST UPDATED: 2025-10-29
 *
 * ARTIFACT INFO (for proper Claude artifact creation):
 * - ID: dslRules.js
 * - Title: dslRules
 * - Type: application/vnd.ant.code (language: javascript)
 *
 * ARCHITECTURAL BOUNDARY: Suggestions
 * AUTO-LOADED BY: dslSuggestionsEngine.js
 * PROVIDES: DSL_RULES array with all rule definitions
 *
 * DESCRIPTION:
 * Consolidated DSL suggestion rules - all 8 rules in a single file.
 * Replaces the previous architecture of 8 separate files + registry + loader.
 *
 * OPTIMIZATION BENEFITS:
 * - Single HTTP request instead of 8
 * - No dynamic loader needed (~700 lines removed)
 * - No registry file needed
 * - Simpler debugging and maintenance
 * - Faster page load
 */

var DSL_RULES = [
    // Rule 1: Division Operations
    {
        name: 'divisionOperations',
        version: 'v2.00',

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.divisionOperations;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
            var divisionPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\/(?!=)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
            var match;

            while ((match = divisionPattern.exec(lineWithoutStrings)) !== null) {
                var numerator = match[1];
                var denominator = match[2];
                var position = match.index;

                if (DSLRuleUtils.String.isInsideString(line, position)) {
                    continue;
                }

                // Check if division is already wrapped in a protection function
                if (this._isAlreadyWrapped(lineWithoutStrings, match, ruleConfig)) {
                    continue;
                }

                var suggestionMsg = ruleConfig.suggestion ||
                    'Division operation detected. Consider using ifNaN({numerator} / {denominator}, 0) to prevent division by zero errors.';

                var expression = numerator + ' / ' + denominator;

                suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
                    numerator: numerator,
                    denominator: denominator,
                    expression: expression
                });

                suggestions.push({
                    line: lineNumber,
                    column: position,
                    message: suggestionMsg,
                    severity: ruleConfig.severity || 'warning',
                    rule: this.name,
                    fixable: ruleConfig.autoFixEnabled || false,
                    original: expression
                });
            }

            return suggestions;
        },

        _isAlreadyWrapped: function(line, match, ruleConfig) {
            var skipFunctions = ruleConfig.skipIfWrappedIn || [];
            if (skipFunctions.length === 0) {
                return false;
            }

            var position = match.index;
            var matchEnd = position + match[0].length;

            // Check for traditional form: functionName(...division...)
            // Look backward from the division to see if it's inside one of the wrapper functions
            for (var i = 0; i < skipFunctions.length; i++) {
                var funcName = skipFunctions[i];

                // Check for traditional form: ifNaN(x / y, 0)
                var traditionalPattern = new RegExp(funcName + '\\s*\\([^)]*' + DSLRuleUtils.Regex.escape(match[0]));
                if (traditionalPattern.test(line)) {
                    return true;
                }

                // Check for method form: (x / y).ifNaN(0)
                // Look ahead from the division match to see if .funcName appears
                var afterMatch = line.substring(matchEnd);
                var methodPattern = new RegExp('^[^;\\n]*\\)\\s*\\.\\s*' + funcName + '\\s*\\(');
                if (methodPattern.test(afterMatch)) {
                    // Also verify we're inside parentheses before the division
                    var beforeMatch = line.substring(0, position);
                    if (/\(\s*$/.test(beforeMatch)) {
                        return true;
                    }
                }
            }

            return false;
        },

        fix: function(code, suggestion, config) {
            var ruleConfig = config.suggestionRules.divisionOperations;

            if (!ruleConfig || !ruleConfig.autoFixEnabled) {
                return code;
            }

            if (!suggestion.original) {
                return code;
            }

            // Get fixStyle (traditional or method)
            var fixStyle = ruleConfig.fixStyle || 'traditional';
            var template = ruleConfig.fixTemplates && ruleConfig.fixTemplates[fixStyle];

            if (!template) {
                // Fallback to traditional if template not found
                template = 'ifNaN({expression}, {defaultAltValue})';
            }

            // Generate fixed code based on template
            var defaultValue = ruleConfig.defaultAltValue;
            var fixedCode = template
                .replace('{expression}', suggestion.original)
                .replace('{defaultAltValue}', defaultValue);

            // Process line by line to avoid double-wrapping when multiple identical expressions exist
            var lines = code.split('\n');
            var modified = false;

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var pattern = new RegExp(DSLRuleUtils.Regex.escape(suggestion.original), 'g');
                var match;
                var newLine = '';
                var lastIndex = 0;

                while ((match = pattern.exec(line)) !== null) {
                    // Check if this specific occurrence is already wrapped
                    if (!this._isAlreadyWrapped(line, match, ruleConfig)) {
                        // Replace this occurrence
                        newLine += line.substring(lastIndex, match.index) + fixedCode;
                        lastIndex = match.index + match[0].length;
                        modified = true;
                    } else {
                        // Keep the original (it's already wrapped)
                        newLine += line.substring(lastIndex, match.index + match[0].length);
                        lastIndex = match.index + match[0].length;
                    }
                }

                // Add the rest of the line
                newLine += line.substring(lastIndex);
                lines[i] = newLine;
            }

            return lines.join('\n');
        }
    },

    // Rule 2: Query Functions
    {
        name: 'queryFunctions',
        version: 'v2.00',

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.queryFunctions;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);

            var inefficientPatterns = ruleConfig.inefficientPatterns || [
                { pattern: /\.filter\([^)]+\)\.first\(\)/g, suggestion: 'Use .findFirst() instead of .filter().first()' },
                { pattern: /\.filter\([^)]+\)\.count\(\)/g, suggestion: 'Use .count() with condition instead of .filter().count()' },
                { pattern: /\.map\([^)]+\)\.filter\([^)]+\)/g, suggestion: 'Consider combining or reordering .map() and .filter()' }
            ];

            for (var i = 0; i < inefficientPatterns.length; i++) {
                var patternConfig = inefficientPatterns[i];
                var match;

                while ((match = patternConfig.pattern.exec(lineWithoutStrings)) !== null) {
                    var position = match.index;

                    if (DSLRuleUtils.String.isInsideString(line, position)) {
                        continue;
                    }

                    suggestions.push({
                        line: lineNumber,
                        column: position,
                        message: patternConfig.suggestion,
                        severity: ruleConfig.severity || 'info',
                        rule: this.name,
                        fixable: false,
                        original: match[0]
                    });
                }
            }

            return suggestions;
        },

        fix: function(code, suggestion, config) {
            return code;
        }
    },

    // Rule 3: Unique Key
    {
        name: 'uniqueKey',
        version: 'v2.00',

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.uniqueKey;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
            var uniqueKeyPattern = /UniqueKey\s*:\s*(\w+)/gi;
            var match;

            while ((match = uniqueKeyPattern.exec(lineWithoutStrings)) !== null) {
                var keyField = match[1];
                var position = match.index;

                if (DSLRuleUtils.String.isInsideString(line, position)) {
                    continue;
                }

                var validKeyPattern = /^[A-Z][a-zA-Z0-9]*ID$/;
                if (!validKeyPattern.test(keyField)) {
                    var suggestionMsg = ruleConfig.suggestion ||
                        'UniqueKey field "{field}" should follow naming convention (e.g., "RecordID", "ItemID")';

                    suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
                        field: keyField
                    });

                    suggestions.push({
                        line: lineNumber,
                        column: position,
                        message: suggestionMsg,
                        severity: ruleConfig.severity || 'warning',
                        rule: this.name,
                        fixable: false,
                        original: 'UniqueKey: ' + keyField
                    });
                }
            }

            return suggestions;
        },

        fix: function(code, suggestion, config) {
            return code;
        }
    },

    // Rule 4: Variable Naming
    {
        name: 'variableNaming',
        version: 'v2.00',

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.variableNaming;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
            var varPattern = /\b(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
            var match;

            while ((match = varPattern.exec(lineWithoutStrings)) !== null) {
                var varName = match[2];
                var position = match.index;

                if (DSLRuleUtils.String.isInsideString(line, position)) {
                    continue;
                }

                if (varName.indexOf('_') !== -1 || /^[A-Z]/.test(varName)) {
                    var suggestionMsg = ruleConfig.suggestion ||
                        'Variable "{varName}" should use camelCase naming convention';

                    suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
                        varName: varName
                    });

                    var camelCaseName = varName
                        .split('_')
                        .map(function(part, index) {
                            if (index === 0) {
                                return part.charAt(0).toLowerCase() + part.slice(1);
                            }
                            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                        })
                        .join('');

                    suggestions.push({
                        line: lineNumber,
                        column: position,
                        message: suggestionMsg,
                        severity: ruleConfig.severity || 'info',
                        rule: this.name,
                        fixable: ruleConfig.autoFixEnabled || false,
                        original: varName,
                        fixed: camelCaseName
                    });
                }
            }

            return suggestions;
        },

        fix: function(code, suggestion, config) {
            var ruleConfig = config.suggestionRules.variableNaming;

            if (!ruleConfig || !ruleConfig.autoFixEnabled) {
                return code;
            }

            if (!suggestion.original || !suggestion.fixed) {
                return code;
            }

            var originalPattern = new RegExp(
                '\\b' + DSLRuleUtils.Regex.escape(suggestion.original) + '\\b',
                'g'
            );

            return code.replace(originalPattern, suggestion.fixed);
        }
    },

    // Rule 5: Non-Optimal Node Access
    {
        name: 'nonOptimalNodeAccess',
        version: 'v2.00',

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.nonOptimalNodeAccess;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
            var foundNodes = this._findNodeAccess(lineWithoutStrings, config);

            for (var i = 0; i < foundNodes.length; i++) {
                var node = foundNodes[i];
                var suggestionMsg = ruleConfig.suggestion ||
                    '{library} node reference detected. Consider storing in variable if used multiple times.';

                suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
                    library: node.library,
                    node: node.name
                });

                suggestions.push({
                    line: lineNumber,
                    column: node.position,
                    message: suggestionMsg,
                    severity: ruleConfig.severity || 'info',
                    rule: this.name,
                    fixable: false,
                    original: node.fullMatch
                });
            }

            return suggestions;
        },

        _findNodeAccess: function(line, config) {
            var nodes = [];
            var libraries = config.libraries || ['Primary', 'Secondary', 'Tertiary'];

            for (var i = 0; i < libraries.length; i++) {
                var library = libraries[i];
                var pattern = new RegExp(library + '\\.(\\w+)(?!\\s*:)', 'g');
                var match;

                while ((match = pattern.exec(line)) !== null) {
                    nodes.push({
                        library: library,
                        name: match[1],
                        position: match.index,
                        fullMatch: match[0]
                    });
                }
            }

            return nodes;
        },

        fix: function(code, suggestion, config) {
            return code;
        }
    },

    // Rule 6: Null Access Protection
    {
        name: 'nullAccessProtection',
        version: 'v2.00',

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.nullAccessProtection;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
            var propertyAccessPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
            var match;

            while ((match = propertyAccessPattern.exec(lineWithoutStrings)) !== null) {
                var object = match[1];
                var property = match[2];
                var position = match.index;

                if (DSLRuleUtils.String.isInsideString(line, position)) {
                    continue;
                }

                var hasOptionalChaining = lineWithoutStrings.indexOf(object + '?.') !== -1;
                var hasNullCheck = this._hasNullCheck(lineWithoutStrings, object);

                if (!hasOptionalChaining && !hasNullCheck) {
                    var suggestionMsg = ruleConfig.suggestion ||
                        'Property access on "{object}" may fail if null/undefined. Consider using optional chaining ({object}?.{property}) or null check.';

                    suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
                        object: object,
                        property: property
                    });

                    suggestions.push({
                        line: lineNumber,
                        column: position,
                        message: suggestionMsg,
                        severity: ruleConfig.severity || 'warning',
                        rule: this.name,
                        fixable: ruleConfig.autoFixEnabled || false,
                        original: object + '.' + property,
                        fixed: object + '?.' + property
                    });
                }
            }

            return suggestions;
        },

        _hasNullCheck: function(line, varName) {
            var nullCheckPatterns = [
                new RegExp('if\\s*\\(\\s*' + varName + '\\s*[!=]='),
                new RegExp(varName + '\\s*[!=]=\\s*null'),
                new RegExp(varName + '\\s*[!=]=\\s*undefined'),
                new RegExp('typeof\\s+' + varName + '\\s*[!=]=')
            ];

            for (var i = 0; i < nullCheckPatterns.length; i++) {
                if (nullCheckPatterns[i].test(line)) {
                    return true;
                }
            }

            return false;
        },

        fix: function(code, suggestion, config) {
            var ruleConfig = config.suggestionRules.nullAccessProtection;

            if (!ruleConfig || !ruleConfig.autoFixEnabled) {
                return code;
            }

            if (!suggestion.original || !suggestion.fixed) {
                return code;
            }

            var originalPattern = new RegExp(
                DSLRuleUtils.Regex.escape(suggestion.original),
                'g'
            );

            return code.replace(originalPattern, suggestion.fixed);
        }
    },

    // Rule 7: Math Operations Parens
    {
        name: 'mathOperationsParens',
        version: 'v2.00',

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.mathOperationsParens;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
            var complexMathPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([\+\-])\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([\*\/])\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
            var match;

            while ((match = complexMathPattern.exec(lineWithoutStrings)) !== null) {
                var position = match.index;

                if (DSLRuleUtils.String.isInsideString(line, position)) {
                    continue;
                }

                var hasParens = this._hasParentheses(lineWithoutStrings, position, match[0].length);

                if (!hasParens) {
                    var suggestionMsg = ruleConfig.suggestion ||
                        'Complex math expression detected. Consider adding parentheses for clarity.';

                    var original = match[0];
                    var fixed = match[1] + ' ' + match[2] + ' (' + match[3] + ' ' + match[4] + ' ' + match[5] + ')';

                    suggestions.push({
                        line: lineNumber,
                        column: position,
                        message: suggestionMsg,
                        severity: ruleConfig.severity || 'info',
                        rule: this.name,
                        fixable: ruleConfig.autoFixEnabled || false,
                        original: original,
                        fixed: fixed
                    });
                }
            }

            return suggestions;
        },

        _hasParentheses: function(line, startPos, length) {
            var before = line.substring(Math.max(0, startPos - 1), startPos);
            var after = line.substring(startPos + length, startPos + length + 1);

            return before === '(' || after === ')';
        },

        fix: function(code, suggestion, config) {
            var ruleConfig = config.suggestionRules.mathOperationsParens;

            if (!ruleConfig || !ruleConfig.autoFixEnabled) {
                return code;
            }

            if (!suggestion.original || !suggestion.fixed) {
                return code;
            }

            var originalPattern = new RegExp(
                DSLRuleUtils.Regex.escape(suggestion.original),
                'g'
            );

            return code.replace(originalPattern, suggestion.fixed);
        }
    },

    // Rule 8: Extraneous Blocks
    {
        name: 'extraneousBlocks',
        version: 'v2.00',

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.extraneousBlocks;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
            var trimmedLine = lineWithoutStrings.trim();

            if (trimmedLine === '{' && lineNumber < allLines.length - 1) {
                var nextLine = allLines[lineNumber].trim();
                var lineAfterNext = lineNumber < allLines.length - 2 ? allLines[lineNumber + 1].trim() : '';

                if (nextLine && nextLine !== '}' && lineAfterNext === '}') {
                    var suggestionMsg = ruleConfig.suggestion ||
                        'Unnecessary block detected. Single statement does not require braces.';

                    suggestions.push({
                        line: lineNumber,
                        column: 0,
                        message: suggestionMsg,
                        severity: ruleConfig.severity || 'info',
                        rule: this.name,
                        fixable: false
                    });
                }
            }

            if (trimmedLine === '{}' || (trimmedLine === '{' && lineNumber < allLines.length && allLines[lineNumber].trim() === '}')) {
                var suggestionMsg = ruleConfig.suggestion || 'Empty block detected. Consider removing or adding implementation.';

                suggestions.push({
                    line: lineNumber,
                    column: 0,
                    message: suggestionMsg,
                    severity: ruleConfig.severity || 'warning',
                    rule: this.name,
                    fixable: false
                });
            }

            return suggestions;
        },

        fix: function(code, suggestion, config) {
            return code;
        }
    }
];

// Export version info
DSL_RULES.version = 'v1.00';

// Make available globally
if (typeof window !== 'undefined') {
    window.DSL_RULES = DSL_RULES;
}

// Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSL_RULES;
}
