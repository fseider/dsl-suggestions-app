/*
 * nullAccessProtectionRule.js v2.00
 * Detects potentially unsafe null/undefined property access
 * PHASE 3 SIMPLIFIED: Removed fallback code, streamlined validation, minimal headers
 */

var NullAccessProtectionRule = {
    name: 'nullAccessProtection',
    version: 'v2.00',
    
    check: function(line, lineNumber, allLines, context, config) {
        var suggestions = [];
        
        // Skip if in comment
        if (context && context.isInComment) {
            return suggestions;
        }
        
        // Get config
        var ruleConfig = config.suggestionRules.nullAccessProtectionRule;
        
        // Early exit if disabled
        if (!ruleConfig || !ruleConfig.enabled) {
            return suggestions;
        }
        
        // Remove string literals
        var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
        
        // Find property access chains
        var propertyAccessPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        var match;
        
        while ((match = propertyAccessPattern.exec(lineWithoutStrings)) !== null) {
            var object = match[1];
            var property = match[2];
            var position = match.index;
            
            // Skip if inside string
            if (DSLRuleUtils.String.isInsideString(line, position)) {
                continue;
            }
            
            // Check if already protected with optional chaining or null checks
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
        var ruleConfig = config.suggestionRules.nullAccessProtectionRule;
        
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
