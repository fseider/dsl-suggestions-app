/*
 * queryFunctionsRule.js v2.00
 * Detects inefficient query functions that should use optimized alternatives
 * PHASE 3 SIMPLIFIED: Removed fallback code, streamlined validation, minimal headers
 */

var QueryFunctionsRule = {
    name: 'queryFunctions',
    version: 'v2.00',
    
    check: function(line, lineNumber, allLines, context, config) {
        var suggestions = [];
        
        // Skip if in comment
        if (context && context.isInComment) {
            return suggestions;
        }
        
        // Get config
        var ruleConfig = config.suggestionRules.queryFunctionsRule;
        
        // Early exit if disabled
        if (!ruleConfig || !ruleConfig.enabled) {
            return suggestions;
        }
        
        // Remove string literals
        var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
        
        // Check for inefficient query patterns
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
                
                // Skip if inside string
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
        // Query function optimizations typically require manual intervention
        return code;
    }
};
