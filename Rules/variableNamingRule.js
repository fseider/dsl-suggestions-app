/*
 * variableNamingRule.js v2.00
 * Enforces camelCase naming convention for variables
 * PHASE 3 SIMPLIFIED: Removed fallback code, streamlined validation, minimal headers
 */

var VariableNamingRule = {
    name: 'variableNaming',
    version: 'v2.00',
    
    check: function(line, lineNumber, allLines, context, config) {
        var suggestions = [];
        
        // Skip if in comment
        if (context && context.isInComment) {
            return suggestions;
        }
        
        // Get config
        var ruleConfig = config.suggestionRules.variableNamingRule;
        
        // Early exit if disabled
        if (!ruleConfig || !ruleConfig.enabled) {
            return suggestions;
        }
        
        // Remove string literals
        var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
        
        // Find variable declarations
        var varPattern = /\b(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        var match;
        
        while ((match = varPattern.exec(lineWithoutStrings)) !== null) {
            var varName = match[2];
            var position = match.index;
            
            // Skip if inside string
            if (DSLRuleUtils.String.isInsideString(line, position)) {
                continue;
            }
            
            // Check for underscore or non-camelCase
            if (varName.indexOf('_') !== -1 || /^[A-Z]/.test(varName)) {
                var suggestionMsg = ruleConfig.suggestion || 
                    'Variable "{varName}" should use camelCase naming convention';
                
                suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
                    varName: varName
                });
                
                // Generate camelCase suggestion
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
        var ruleConfig = config.suggestionRules.variableNamingRule;
        
        if (!ruleConfig || !ruleConfig.autoFixEnabled) {
            return code;
        }
        
        if (!suggestion.original || !suggestion.fixed) {
            return code;
        }
        
        // Use word boundary to avoid partial replacements
        var originalPattern = new RegExp(
            DSLRuleUtils.Regex.wordBoundary(suggestion.original),
            'g'
        );
        
        return code.replace(originalPattern, suggestion.fixed);
    }
};
