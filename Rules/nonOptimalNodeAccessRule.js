/*
 * nonOptimalNodeAccessRule.js v2.00
 * Detects non-optimal library node access patterns that create unnecessary instances
 * PHASE 3 SIMPLIFIED: Removed fallback code, streamlined validation, minimal headers
 */

var NonOptimalNodeAccessRule = {
    name: 'nonOptimalNodeAccess',
    version: 'v2.00',
    
    check: function(line, lineNumber, allLines, context, config) {
        var suggestions = [];
        
        // Skip if in comment
        if (context && context.isInComment) {
            return suggestions;
        }
        
        // Get config
        var ruleConfig = config.suggestionRules.nonOptimalNodeAccessRule;
        
        // Early exit if disabled
        if (!ruleConfig || !ruleConfig.enabled) {
            return suggestions;
        }
        
        // Remove string literals
        var lineWithoutStrings = DSLRuleUtils.String.removeStringLiterals(line);
        
        // Find library node accesses
        var foundNodes = this._findNodeAccess(lineWithoutStrings, config);
        
        // Generate suggestions for each found node
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
        // Node access optimization requires structural changes
        return code;
    }
};
