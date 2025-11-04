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
        _instanceCounter: 0,

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            // Reset counter at start of new analysis
            if (lineNumber === 1) {
                this._instanceCounter = 0;
            }

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.divisionOperations;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            // Skip lines that contain block comments /* */
            if (line.indexOf('/*') !== -1 && line.indexOf('*/') !== -1) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);

            // Find all division operators (skip /=)
            var divisionPattern = /\/(?!=)/g;  // Match / but not /=
            var match;
            var processedExpressions = {};  // Track already processed expressions

            while ((match = divisionPattern.exec(lineWithoutStrings)) !== null) {
                var divPosition = match.index;

                if (DSLRuleUtils.String.isInsideString(line, divPosition)) {
                    continue;
                }

                // Extract the full expression containing this division
                var expression = this._extractExpression(lineWithoutStrings, divPosition);

                if (!expression || expression.trim() === '') {
                    continue;
                }

                // Skip if we've already processed this expression
                if (processedExpressions[expression]) {
                    continue;
                }
                processedExpressions[expression] = true;

                // Check if expression is already wrapped
                if (this._isAlreadyWrapped(lineWithoutStrings, expression, ruleConfig)) {
                    continue;
                }

                var suggestionMsg = ruleConfig.suggestion ||
                    'Division operation detected. Consider using ifNaN({expression}, 0) to prevent division by zero errors.';

                suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
                    expression: expression
                });

                // Increment instance counter
                this._instanceCounter++;

                // Check if this rule has different forms (Traditional vs Method)
                var hasDifferentForms = ruleConfig.fixTemplates &&
                                       ruleConfig.fixTemplates.traditional !== ruleConfig.fixTemplates.method;

                suggestions.push({
                    line: lineNumber,
                    column: divPosition,
                    message: suggestionMsg,
                    severity: ruleConfig.severity || 'warning',
                    rule: this.name,
                    label: ruleConfig.label || this.name,
                    fixable: true,  // Show as fixable for display purposes (shows both forms)
                    hasDifferentForms: hasDifferentForms,
                    original: expression,
                    instanceNumber: this._instanceCounter
                });
            }

            return suggestions;
        },

        _extractExpression: function(line, divPosition) {
            // Delimiters that mark expression boundaries
            var startDelimiters = ['=', ',', '('];
            var endDelimiters = [',', ')'];

            // Find start of expression (go backwards from division)
            var start = 0;
            for (var i = divPosition - 1; i >= 0; i--) {
                var char = line.charAt(i);
                if (startDelimiters.indexOf(char) !== -1) {
                    start = i + 1;
                    break;
                }
            }

            // Find end of expression (go forwards from division)
            var end = line.length;
            for (var i = divPosition + 1; i < line.length; i++) {
                var char = line.charAt(i);
                if (endDelimiters.indexOf(char) !== -1) {
                    end = i;
                    break;
                }
            }

            // Extract and trim the expression
            var expression = line.substring(start, end).trim();
            return expression;
        },

        _isAlreadyWrapped: function(line, expression, ruleConfig) {
            var skipFunctions = ruleConfig.skipIfWrappedIn || [];
            if (skipFunctions.length === 0) {
                return false;
            }

            for (var i = 0; i < skipFunctions.length; i++) {
                var funcName = skipFunctions[i];

                // Check if expression is wrapped: ifNaN(expression, ...)
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

            // Generate fixed code based on template with sequenced placeholder
            var instanceNum = suggestion.instanceNumber || 1;
            var defaultValue = 'DEF_VAL_DIV_BY_ZERO_' + instanceNum;
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
        _instanceCounter: 0,

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            // Reset counter at start of new analysis
            if (lineNumber === 1) {
                this._instanceCounter = 0;
            }

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.queryFunctions;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);

            // Check for query function names
            var functionNames = ruleConfig.functionNames || [];
            if (functionNames.length > 0) {
                // Build regex pattern: \b(func1|func2|func3)\s*\(
                var funcPattern = '\\b(' + functionNames.join('|') + ')\\s*\\(';
                var functionRegex = new RegExp(funcPattern, 'g');
                var match;

                while ((match = functionRegex.exec(lineWithoutStrings)) !== null) {
                    var functionName = match[1];
                    var position = match.index;

                    if (DSLRuleUtils.String.isInsideString(line, position)) {
                        continue;
                    }

                    var suggestionMsg = ruleConfig.suggestion ||
                        'Consider setting {function}() as "One-Time" for better performance.';

                    suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
                        function: functionName
                    });

                    // Increment instance counter
                    this._instanceCounter++;

                    suggestions.push({
                        line: lineNumber,
                        column: position,
                        message: suggestionMsg,
                        severity: ruleConfig.severity || 'info',
                        rule: this.name,
                        label: ruleConfig.label || this.name,
                        fixable: false,
                        original: functionName + '(',
                        instanceNumber: this._instanceCounter
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
        _instanceCounter: 0,

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            // Reset counter at start of new analysis
            if (lineNumber === 1) {
                this._instanceCounter = 0;
            }

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.uniqueKey;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            // Pattern to detect uniqueKey() function calls
            var uniqueKeyPattern = /uniqueKey\s*\(/gi;
            var match;

            while ((match = uniqueKeyPattern.exec(line)) !== null) {
                var position = match.index;

                if (DSLRuleUtils.String.isInsideString(line, position)) {
                    continue;
                }

                var suggestionMsg = ruleConfig.suggestion ||
                    'Ensure Attribute with uniqueKey Expression is set as "One-Time / No-Copy" as per best practices.';

                // Increment instance counter
                this._instanceCounter++;

                suggestions.push({
                    line: lineNumber,
                    column: position,
                    message: suggestionMsg,
                    severity: ruleConfig.severity || 'warning',
                    rule: this.name,
                    label: ruleConfig.label || this.name,
                    fixable: false,
                    original: 'uniqueKey',
                    instanceNumber: this._instanceCounter
                });
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
        _instanceCounter: 0,

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            // Reset counter at start of new analysis
            if (lineNumber === 1) {
                this._instanceCounter = 0;
            }

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.variableNaming;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
            // Match both JavaScript declarations (var/let/const) and DSL assignments
            var varPattern = /\b(?:(?:var|let|const)\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
            var match;

            while ((match = varPattern.exec(lineWithoutStrings)) !== null) {
                var varName = match[1];
                var position = match.index;

                if (DSLRuleUtils.String.isInsideString(line, position)) {
                    continue;
                }

                if (varName.indexOf('_') !== -1 || /^[A-Z]/.test(varName)) {
                    var camelCaseName = varName
                        .split('_')
                        .map(function(part, index) {
                            if (index === 0) {
                                return part.charAt(0).toLowerCase() + part.slice(1);
                            }
                            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                        })
                        .join('');

                    var suggestionMsg = ruleConfig.suggestion ||
                        'Variable "{varName}" should use camelCase naming convention';

                    suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
                        varName: varName,
                        correctedName: camelCaseName
                    });

                    // Increment instance counter
                    this._instanceCounter++;

                    // Check if this rule has different forms (Traditional vs Method)
                    var hasDifferentForms = ruleConfig.fixTemplates &&
                                           ruleConfig.fixTemplates.traditional !== ruleConfig.fixTemplates.method;

                    suggestions.push({
                        line: lineNumber,
                        column: position,
                        message: suggestionMsg,
                        severity: ruleConfig.severity || 'info',
                        rule: this.name,
                        label: ruleConfig.label || this.name,
                        fixable: true,  // Show as fixable for display purposes (shows both forms)
                        hasDifferentForms: hasDifferentForms,
                        original: varName,
                        instanceNumber: this._instanceCounter
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
        _instanceCounter: 0,

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            // Reset counter at start of new analysis
            if (lineNumber === 1) {
                this._instanceCounter = 0;
            }

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

                // Increment instance counter
                this._instanceCounter++;

                suggestions.push({
                    line: lineNumber,
                    column: node.position,
                    message: suggestionMsg,
                    severity: ruleConfig.severity || 'info',
                    rule: this.name,
                    label: ruleConfig.label || this.name,
                    fixable: false,
                    original: node.fullMatch,
                    instanceNumber: this._instanceCounter
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
        _instanceCounter: 0,

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            // Reset counter at start of new analysis
            if (lineNumber === 1) {
                this._instanceCounter = 0;
            }

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

                // Skip if this is a function call (property followed by opening parenthesis)
                var matchEnd = position + match[0].length;
                var nextChar = lineWithoutStrings.charAt(matchEnd);
                if (nextChar === '(') {
                    continue; // This is a function call, not a property access concern
                }

                var hasOptionalChaining = lineWithoutStrings.indexOf(object + '?.') !== -1;
                var hasNullCheck = this._hasNullCheck(lineWithoutStrings, object);

                if (!hasOptionalChaining && !hasNullCheck) {
                    var suggestionMsg = ruleConfig.suggestion ||
                        'Property access on "{object}" may fail if null/undefined. Consider using optional chaining ({object}?.{property}) or null check.';

                    var expression = object + '.' + property;

                    suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
                        object: object,
                        property: property,
                        expression: expression
                    });

                    // Increment instance counter for this suggestion
                    this._instanceCounter++;

                    // Check if this rule has different forms (Traditional vs Method)
                    var hasDifferentForms = ruleConfig.fixTemplates &&
                                           ruleConfig.fixTemplates.traditional !== ruleConfig.fixTemplates.method;

                    suggestions.push({
                        line: lineNumber,
                        column: position,
                        message: suggestionMsg,
                        severity: ruleConfig.severity || 'warning',
                        rule: this.name,
                        label: ruleConfig.label || this.name,
                        fixable: true,  // Show as fixable for display purposes (shows both forms)
                        hasDifferentForms: hasDifferentForms,
                        original: expression,
                        instanceNumber: this._instanceCounter
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

        _getSmartDefaultValue: function(property) {
            // Smart default value detection based on property name patterns
            var propertyLower = property.toLowerCase();

            // String patterns
            var stringPatterns = ['name', 'label', 'title', 'text', 'description', 'message', 'content', 'string', 'str'];
            for (var i = 0; i < stringPatterns.length; i++) {
                if (propertyLower.indexOf(stringPatterns[i]) !== -1) {
                    return '""';
                }
            }

            // Numeric patterns
            var numericPatterns = ['count', 'number', 'index', 'size', 'length', 'id', 'quantity', 'total'];
            for (var i = 0; i < numericPatterns.length; i++) {
                if (propertyLower.indexOf(numericPatterns[i]) !== -1) {
                    return '0';
                }
            }

            // Array patterns
            var arrayPatterns = ['list', 'array', 'items', 'elements', 'collection'];
            for (var i = 0; i < arrayPatterns.length; i++) {
                if (propertyLower.indexOf(arrayPatterns[i]) !== -1) {
                    return '[]';
                }
            }

            // Object patterns
            var objectPatterns = ['map', 'dict', 'object', 'data', 'config', 'settings'];
            for (var i = 0; i < objectPatterns.length; i++) {
                if (propertyLower.indexOf(objectPatterns[i]) !== -1) {
                    return '{}';
                }
            }

            // Boolean patterns
            var booleanPatterns = ['flag', 'is', 'has', 'should', 'can', 'enabled', 'active'];
            for (var i = 0; i < booleanPatterns.length; i++) {
                if (propertyLower.indexOf(booleanPatterns[i]) !== -1) {
                    return 'false';
                }
            }

            // Date/Time patterns - return null
            var nullPatterns = ['date', 'time', 'timestamp'];
            for (var i = 0; i < nullPatterns.length; i++) {
                if (propertyLower.indexOf(nullPatterns[i]) !== -1) {
                    return 'null';
                }
            }

            // Default fallback
            return 'null';
        },

        fix: function(code, suggestion, config) {
            var ruleConfig = config.suggestionRules.nullAccessProtection;

            if (!ruleConfig || !ruleConfig.autoFixEnabled) {
                return code;
            }

            if (!suggestion.original) {
                return code;
            }

            // Get fixStyle (traditional or method)
            // Check for forced form selection from UI
            var fixStyle = (typeof window !== 'undefined' && window.__forceFormSelection) ||
                          ruleConfig.fixStyle || 'traditional';
            var template = ruleConfig.fixTemplates && ruleConfig.fixTemplates[fixStyle];

            if (!template) {
                // Fallback to traditional if template not found
                template = 'ifNull({expression})';
            }

            // Extract object and property from original expression (object.property)
            var parts = suggestion.original.split('.');
            if (parts.length !== 2) {
                return code; // Can't parse, return unchanged
            }

            var object = parts[0];
            var property = parts[1];

            // Use rule-specific sequenced placeholder
            var instanceNum = suggestion.instanceNumber || 1;
            var defaultAltValue = 'DEF_VAL_NULL_SAFETY_' + instanceNum;

            // Replace placeholders in template
            var fixed = DSLRuleUtils.Message.replacePlaceholders(template, {
                object: object,
                property: property,
                expression: suggestion.original,
                defaultAltValue: defaultAltValue
            });

            var originalPattern = new RegExp(
                DSLRuleUtils.Regex.escape(suggestion.original),
                'g'
            );

            return code.replace(originalPattern, fixed);
        }
    },

    // Rule 7: Math Operations Parens
    {
        name: 'mathOperationsParens',
        version: 'v2.00',
        _instanceCounter: 0,

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            // Reset counter at start of new analysis
            if (lineNumber === 1) {
                this._instanceCounter = 0;
            }

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
                    var original = match[0];
                    var fixed = match[1] + ' ' + match[2] + ' (' + match[3] + ' ' + match[4] + ' ' + match[5] + ')';

                    var suggestionMsg = ruleConfig.suggestion ||
                        'Complex math expression detected. Consider adding parentheses for clarity.';

                    // Add **markers** around the expression for color highlighting
                    suggestionMsg = suggestionMsg + ' **' + original + '**';

                    // Increment instance counter
                    this._instanceCounter++;

                    suggestions.push({
                        line: lineNumber,
                        column: position,
                        message: suggestionMsg,
                        severity: ruleConfig.severity || 'info',
                        rule: this.name,
                        label: ruleConfig.label || this.name,
                        fixable: ruleConfig.autoFixEnabled || false,
                        original: original,
                        instanceNumber: this._instanceCounter
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
        _instanceCounter: 0,

        check: function(line, lineNumber, allLines, context, config) {
            var suggestions = [];

            // Reset counter at start of new analysis
            if (lineNumber === 1) {
                this._instanceCounter = 0;
            }

            if (context && context.isInComment) {
                return suggestions;
            }

            var ruleConfig = config.suggestionRules.extraneousBlocks;

            if (!ruleConfig || !ruleConfig.enabled) {
                return suggestions;
            }

            var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
            var trimmedLine = lineWithoutStrings.trim();

            // Check for unnecessary block() wrapper with single statement
            if (trimmedLine.indexOf('block(') !== -1) {
                var blockResult = this._checkBlockFunction(lineNumber, allLines, ruleConfig);
                if (blockResult) {
                    suggestions.push(blockResult);
                }
            }

            // Check for unnecessary curly braces with single statement
            if (trimmedLine === '{' && lineNumber < allLines.length - 1) {
                var nextLine = allLines[lineNumber].trim();
                var lineAfterNext = lineNumber < allLines.length - 2 ? allLines[lineNumber + 1].trim() : '';

                if (nextLine && nextLine !== '}' && lineAfterNext === '}') {
                    var suggestionMsg = ruleConfig.suggestion ||
                        'Unnecessary block detected. Single statement does not require braces.';

                    // Increment instance counter
                    this._instanceCounter++;

                    // Check if this rule has different forms (Traditional vs Method)
                    var hasDifferentForms = ruleConfig.fixTemplates &&
                                           ruleConfig.fixTemplates.traditional !== ruleConfig.fixTemplates.method;

                    suggestions.push({
                        line: lineNumber,
                        column: 0,
                        message: suggestionMsg,
                        severity: ruleConfig.severity || 'info',
                        rule: this.name,
                        label: ruleConfig.label || this.name,
                        fixable: true,  // Show as fixable for display purposes (shows both forms)
                        hasDifferentForms: hasDifferentForms,
                        instanceNumber: this._instanceCounter
                    });
                }
            }

            // Check for empty blocks
            if (trimmedLine === '{}' || (trimmedLine === '{' && lineNumber < allLines.length && allLines[lineNumber].trim() === '}')) {
                var suggestionMsg = ruleConfig.suggestion || 'Empty block detected. Consider removing or adding implementation.';

                // Increment instance counter
                this._instanceCounter++;

                // Check if this rule has different forms (Traditional vs Method)
                var hasDifferentForms = ruleConfig.fixTemplates &&
                                       ruleConfig.fixTemplates.traditional !== ruleConfig.fixTemplates.method;

                suggestions.push({
                    line: lineNumber,
                    column: 0,
                    message: suggestionMsg,
                    severity: ruleConfig.severity || 'warning',
                    rule: this.name,
                    label: ruleConfig.label || this.name,
                    fixable: true,  // Show as fixable for display purposes (shows both forms)
                    hasDifferentForms: hasDifferentForms,
                    instanceNumber: this._instanceCounter
                });
            }

            return suggestions;
        },

        _checkBlockFunction: function(startLine, allLines, ruleConfig) {
            // Extract the entire block() content across multiple lines
            var blockContent = '';
            var currentLine = startLine - 1; // Convert to 0-indexed
            var parenDepth = 0;
            var foundBlock = false;
            var blockStartCol = -1;

            // Find and extract the complete block() expression
            for (var i = currentLine; i < allLines.length; i++) {
                var line = allLines[i];
                var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);

                for (var j = 0; j < lineWithoutStrings.length; j++) {
                    var char = lineWithoutStrings[j];

                    // Check if we're at the start of block(
                    if (!foundBlock && lineWithoutStrings.substr(j, 6) === 'block(') {
                        foundBlock = true;
                        blockStartCol = j;
                        parenDepth = 1;
                        j += 5; // Skip past "block"
                        continue;
                    }

                    if (foundBlock) {
                        if (char === '(') {
                            parenDepth++;
                        } else if (char === ')') {
                            parenDepth--;
                            if (parenDepth === 0) {
                                // Found the end of block()
                                // Now analyze what's inside
                                var statementCount = this._countStatements(blockContent);

                                if (statementCount === 1) {
                                    // Unnecessary block() wrapper
                                    this._instanceCounter++;

                                    var suggestionMsg = ruleConfig.suggestion ||
                                        'Remove unnecessary block() wrapper for single statement.';

                                    var hasDifferentForms = ruleConfig.fixTemplates &&
                                                           ruleConfig.fixTemplates.traditional !== ruleConfig.fixTemplates.method;

                                    return {
                                        line: startLine,
                                        column: blockStartCol,
                                        message: suggestionMsg,
                                        severity: ruleConfig.severity || 'info',
                                        rule: this.name,
                                        label: ruleConfig.label || this.name,
                                        fixable: true,
                                        hasDifferentForms: hasDifferentForms,
                                        instanceNumber: this._instanceCounter
                                    };
                                }

                                return null;
                            }
                        }

                        // Accumulate content inside block()
                        blockContent += char;
                    }
                }

                if (foundBlock && parenDepth > 0) {
                    blockContent += '\n';
                }

                if (foundBlock && parenDepth === 0) {
                    break;
                }
            }

            return null;
        },

        _countStatements: function(content) {
            // Remove comments
            var contentNoComments = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

            // Trim whitespace
            var trimmed = contentNoComments.trim();

            // Empty block
            if (trimmed === '') {
                return 0;
            }

            // Count commas at depth 0 (not inside nested parentheses/brackets)
            var depth = 0;
            var commaCount = 0;

            for (var i = 0; i < trimmed.length; i++) {
                var char = trimmed[i];

                if (char === '(' || char === '[' || char === '{') {
                    depth++;
                } else if (char === ')' || char === ']' || char === '}') {
                    depth--;
                } else if (char === ',' && depth === 0) {
                    commaCount++;
                }
            }

            // Number of statements = comma count + 1 (if there's any content)
            return trimmed.length > 0 ? commaCount + 1 : 0;
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
