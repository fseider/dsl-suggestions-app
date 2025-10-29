/*
 * extraneousBlocksRule.js v2.00
 * Detects unnecessary block structures that can be simplified
 * PHASE 3 SIMPLIFIED: Removed fallback code, streamlined validation, minimal headers
 */

var ExtraneousBlocksRule = {
    name: 'extraneousBlocks',
    version: 'v2.00',
    
    check: function(line, lineNumber, allLines, context, config) {
        var suggestions = [];
        
        // Skip if in comment
        if (context && context.isInComment) {
            return suggestions;
        }
        
        // Get config
        var ruleConfig = config.suggestionRules.extraneousBlocksRule;
        
        // Early exit if disabled
        if (!ruleConfig || !ruleConfig.enabled) {
            return suggestions;
        }
        
        // Remove string literals
        var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
        var trimmedLine = lineWithoutStrings.trim();
        
        // Check for single-statement blocks
        if (trimmedLine === '{' && lineNumber < allLines.length - 1) {
            var nextLine = allLines[lineNumber].trim();
            var lineAfterNext = lineNumber < allLines.length - 2 ? allLines[lineNumber + 1].trim() : '';
            
            // Pattern: { single_statement }
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
        
        // Check for empty blocks
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
        // Block simplification requires structural changes
        return code;
    }
};
