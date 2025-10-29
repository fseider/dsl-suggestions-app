/*
 * divisionOperationsRule.js v2.00
 * Detects division operations that may cause division-by-zero errors
 * PHASE 3 SIMPLIFIED: Removed fallback code, streamlined validation, minimal headers
 */

var DivisionOperationsRule = {
    name: 'divisionOperations',
    version: 'v2.00',
    
    check: function(line, lineNumber, allLines, context, config) {
        var suggestions = [];
        
        // Skip if in comment
        if (context && context.isInComment) {
            return suggestions;
        }
        
        // Get config
        var ruleConfig = config.suggestionRules.divisionOperations;
        
        // Early exit if disabled
        if (!ruleConfig || !ruleConfig.enabled) {
            return suggestions;
        }
        
        // Remove string literals to avoid false positives
        var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
        
        // Find all division operations
        var divisionPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\/(?!=)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        var match;
        
        while ((match = divisionPattern.exec(lineWithoutStrings)) !== null) {
            var numerator = match[1];
            var denominator = match[2];
            var position = match.index;
            
            // Skip if inside string
            if (DSLRuleUtils.String.isInsideString(line, position)) {
                continue;
            }
            
            var suggestionMsg = ruleConfig.suggestion || 
                'Division operation detected. Consider using ifNaN({numerator} / {denominator}, 0) to prevent division by zero errors.';
            
            suggestionMsg = DSLRuleUtils.Message.replacePlaceholders(suggestionMsg, {
                numerator: numerator,
                denominator: denominator
            });
            
            suggestions.push({
                line: lineNumber,
                column: position,
                message: suggestionMsg,
                severity: ruleConfig.severity || 'warning',
                rule: this.name,
                fixable: ruleConfig.autoFixEnabled || false,
                original: numerator + ' / ' + denominator,
                fixed: 'ifNaN(' + numerator + ' / ' + denominator + ', 0)'
            });
        }
        
        return suggestions;
    },
    
    fix: function(code, suggestion, config) {
        var ruleConfig = config.suggestionRules.divisionOperations;
        
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
