/*
 * mathOperationsParensRule.js v2.00
 * Suggests parentheses for complex mathematical expressions for clarity
 * PHASE 3 SIMPLIFIED: Removed fallback code, streamlined validation, minimal headers
 */

var MathOperationsParensRule = {
    name: 'mathOperationsParens',
    version: 'v2.00',
    
    check: function(line, lineNumber, allLines, context, config) {
        var suggestions = [];
        
        // Skip if in comment
        if (context && context.isInComment) {
            return suggestions;
        }
        
        // Get config
        var ruleConfig = config.suggestionRules.mathOperationsParensRule;
        
        // Early exit if disabled
        if (!ruleConfig || !ruleConfig.enabled) {
            return suggestions;
        }
        
        // Remove string literals
        var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
        
        // Find complex math expressions (mixing operators)
        var complexMathPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([\+\-])\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([\*\/])\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        var match;
        
        while ((match = complexMathPattern.exec(lineWithoutStrings)) !== null) {
            var position = match.index;
            
            // Skip if inside string
            if (DSLRuleUtils.String.isInsideString(line, position)) {
                continue;
            }
            
            // Check if already has parentheses
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
        var ruleConfig = config.suggestionRules.mathOperationsParensRule;
        
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
};
