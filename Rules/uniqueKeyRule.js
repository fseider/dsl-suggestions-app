/*
 * uniqueKeyRule.js v2.00
 * Validates UniqueKey configuration in library declarations
 * PHASE 3 SIMPLIFIED: Removed fallback code, streamlined validation, minimal headers
 */

var UniqueKeyRule = {
    name: 'uniqueKey',
    version: 'v2.00',
    
    check: function(line, lineNumber, allLines, context, config) {
        var suggestions = [];
        
        // Skip if in comment
        if (context && context.isInComment) {
            return suggestions;
        }
        
        // Get config
        var ruleConfig = config.suggestionRules.uniqueKeyRule;
        
        // Early exit if disabled
        if (!ruleConfig || !ruleConfig.enabled) {
            return suggestions;
        }
        
        // Remove string literals
        var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
        
        // Check for UniqueKey configuration
        var uniqueKeyPattern = /UniqueKey\s*:\s*(\w+)/gi;
        var match;
        
        while ((match = uniqueKeyPattern.exec(lineWithoutStrings)) !== null) {
            var keyField = match[1];
            var position = match.index;
            
            // Skip if inside string
            if (DSLRuleUtils.String.isInsideString(line, position)) {
                continue;
            }
            
            // Check if the key field follows naming conventions
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
        // UniqueKey naming requires manual decision
        return code;
    }
};
