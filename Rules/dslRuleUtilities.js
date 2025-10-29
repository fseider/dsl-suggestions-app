/*
 * FILE: dslRuleUtilities.js
 * VERSION: v1.00
 * LAST UPDATED: 2025-07-28
 * 
 * ARTIFACT INFO (for proper Claude artifact creation):
 * - ID: dslRuleUtilities.js
 * - Title: dslRuleUtilities
 * - Type: application/vnd.ant.code (language: javascript)
 * 
 * ARCHITECTURAL BOUNDARY: Suggestions/Rules
 * AUTO-LOADED BY: dslSuggestionsEngine.js (must load BEFORE rule files)
 * PROVIDES: DSLRuleUtils global object with shared utility functions
 * 
 * DESCRIPTION:
 * Shared utility functions for DSL suggestion rule modules.
 * Provides common functionality for string handling, regex operations,
 * comment detection, pattern matching, and message formatting.
 * These utilities are used ONLY by rule modules, not by the engine.
 * 
 * LOADING ORDER:
 * 1. dslSuggestionsEngine.js
 * 2. dslSuggestionsConfig.js
 * 3. dslRuleUtilities.js (this file)
 * 4. Individual rule files
 */

var DSLRuleUtils = {
    // Version for compatibility checking if needed
    version: 'v1.00',
    
    // =========================================================================
    // STRING UTILITIES
    // =========================================================================
    String: {
        /**
         * Remove string literals from a line, replacing with spaces
         * Maintains character positions for accurate error reporting
         * @param {string} line - Line of code to process
         * @returns {string} Line with string contents replaced by spaces
         */
        removeStringLiterals: function(line) {
            var result = '';
            var inString = false;
            var stringChar = null;
            
            for (var i = 0; i < line.length; i++) {
                var char = line[i];
                
                // Check for string delimiters
                if ((char === '"' || char === "'") && (i === 0 || line[i-1] !== '\\')) {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                        result += ' '; // Replace string start with space
                    } else if (char === stringChar) {
                        inString = false;
                        stringChar = null;
                        result += ' '; // Replace string end with space
                    } else {
                        // Inside string, different quote type
                        result += ' ';
                    }
                } else if (inString) {
                    // Replace string content with spaces to maintain positions
                    result += ' ';
                } else {
                    // Outside string, keep the character
                    result += char;
                }
            }
            
            return result;
        },
        
        /**
         * Extract non-string portions of a line with their positions
         * @param {string} line - Line of code to process
         * @returns {array} Array of {text: string, offset: number} objects
         */
        extractNonStringPortions: function(line) {
            var portions = [];
            var currentPortion = '';
            var currentOffset = 0;
            var inString = false;
            var stringChar = null;
            
            for (var i = 0; i < line.length; i++) {
                var char = line[i];
                
                // Check for string delimiters
                if ((char === '"' || char === "'") && (i === 0 || line[i-1] !== '\\')) {
                    if (!inString) {
                        // Entering a string - save current portion if any
                        if (currentPortion.length > 0) {
                            portions.push({
                                text: currentPortion,
                                offset: currentOffset
                            });
                            currentPortion = '';
                        }
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        // Exiting a string
                        inString = false;
                        stringChar = null;
                        currentOffset = i + 1;
                    }
                } else if (!inString) {
                    currentPortion += char;
                }
            }
            
            // Add final portion if any
            if (currentPortion.length > 0) {
                portions.push({
                    text: currentPortion,
                    offset: currentOffset
                });
            }
            
            return portions;
        },
        
        /**
         * Check if a position in a line is inside a string literal
         * @param {string} line - Line of code
         * @param {number} position - Character position to check
         * @returns {boolean} True if position is inside a string
         */
        isInsideString: function(line, position) {
            var inString = false;
            var stringChar = null;
            
            for (var i = 0; i < position && i < line.length; i++) {
                var char = line[i];
                
                if ((char === '"' || char === "'") && (i === 0 || line[i-1] !== '\\')) {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                        stringChar = null;
                    }
                }
            }
            
            return inString;
        }
    },
    
    // =========================================================================
    // REGEX UTILITIES
    // =========================================================================
    Regex: {
        /**
         * Escape special regex characters in a string
         * @param {string} str - String to escape
         * @returns {string} Escaped string safe for use in regex
         */
        escape: function(str) {
            return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        },
        
        /**
         * Create a word boundary pattern for a given word
         * @param {string} word - Word to match with boundaries
         * @returns {RegExp} Regex pattern with word boundaries
         */
        wordBoundary: function(word) {
            return new RegExp('\\b' + this.escape(word) + '\\b', 'g');
        }
    },
    
    // =========================================================================
    // COMMENT UTILITIES
    // =========================================================================
    Comment: {
        /**
         * Check if a line is a comment
         * @param {string} line - Line to check
         * @returns {boolean} True if line is a comment
         */
        isComment: function(line) {
            var trimmed = line.trim();
            return trimmed.startsWith('//') || 
                   trimmed.startsWith('/*') || 
                   trimmed.startsWith('*');
        },
        
        /**
         * Remove comments from a line
         * @param {string} line - Line of code
         * @returns {string} Line with comments removed
         */
        removeComments: function(line) {
            // Remove single-line comments
            var commentIndex = line.indexOf('//');
            if (commentIndex !== -1) {
                // Check if // is inside a string
                if (!DSLRuleUtils.String.isInsideString(line, commentIndex)) {
                    return line.substring(0, commentIndex);
                }
            }
            return line;
        },
        
        /**
         * Check if a position is inside a comment
         * @param {string} line - Line of code
         * @param {number} position - Character position
         * @returns {boolean} True if position is inside a comment
         */
        isInsideComment: function(line, position) {
            // Check for single-line comment
            var commentIndex = line.indexOf('//');
            if (commentIndex !== -1 && commentIndex < position) {
                // Make sure the // isn't inside a string
                if (!DSLRuleUtils.String.isInsideString(line, commentIndex)) {
                    return true;
                }
            }
            
            // For multi-line comments, would need to track across lines
            // This is a simplified version for single-line analysis
            return false;
        }
    },
    
    // =========================================================================
    // MESSAGE UTILITIES
    // =========================================================================
    Message: {
        /**
         * Format a message with version prefix
         * @param {string} version - Version string
         * @param {string} message - Message text
         * @returns {string} Formatted message with version
         */
        formatVersioned: function(version, message) {
            return '[' + version + '] ' + message;
        },
        
        /**
         * Replace placeholders in a template string
         * @param {string} template - Template with {placeholder} markers
         * @param {object} values - Key-value pairs for replacement
         * @returns {string} Template with placeholders replaced
         */
        replacePlaceholders: function(template, values) {
            var result = template;
            for (var key in values) {
                if (values.hasOwnProperty(key)) {
                    var placeholder = '{' + key + '}';
                    // Use split/join instead of replace to handle all occurrences
                    result = result.split(placeholder).join(values[key]);
                }
            }
            return result;
        }
    },
    
    // =========================================================================
    // PATTERN UTILITIES
    // =========================================================================
    Pattern: {
        /**
         * Find all function calls in a line
         * @param {string} line - Line of code
         * @param {string} functionName - Function name to find
         * @returns {array} Array of match objects with position info
         */
        findFunctionCalls: function(line, functionName) {
            var matches = [];
            var pattern = new RegExp('\\b' + DSLRuleUtils.Regex.escape(functionName) + '\\s*\\(', 'g');
            var match;
            
            while ((match = pattern.exec(line)) !== null) {
                matches.push({
                    functionName: functionName,
                    index: match.index,
                    fullMatch: match[0]
                });
            }
            
            return matches;
        },
        
        /**
         * Extract a property chain starting at a position
         * @param {string} line - Line of code
         * @param {number} startPos - Starting position
         * @returns {string} Extracted property chain
         */
        extractPropertyChain: function(line, startPos) {
            // Find start of chain (work backwards)
            var chainStart = startPos;
            while (chainStart > 0 && /[a-zA-Z0-9_$.]/.test(line[chainStart - 1])) {
                chainStart--;
            }
            
            // Find end of chain (work forwards)
            var chainEnd = startPos;
            while (chainEnd < line.length && /[a-zA-Z0-9_$.]/.test(line[chainEnd])) {
                chainEnd++;
            }
            
            return line.substring(chainStart, chainEnd);
        },
        
        /**
         * Check if a pattern appears at a word boundary
         * @param {string} line - Line of code
         * @param {number} position - Position to check
         * @returns {boolean} True if at word boundary
         */
        isWordBoundary: function(line, position) {
            var before = position > 0 ? line[position - 1] : '';
            var after = position < line.length ? line[position] : '';
            
            var isStartBoundary = !before || !/[a-zA-Z0-9_$]/.test(before);
            var isEndBoundary = !after || !/[a-zA-Z0-9_$]/.test(after);
            
            return isStartBoundary || isEndBoundary;
        }
    },
    
    // =========================================================================
    // VALIDATION UTILITIES
    // =========================================================================
    Validation: {
        /**
         * Validate a required property exists
         * @param {object} obj - Object to check
         * @param {string} prop - Property name
         * @param {string} path - Path for error message
         * @returns {string|null} Error message or null if valid
         */
        validateRequiredProperty: function(obj, prop, path) {
            if (!obj || !obj.hasOwnProperty(prop)) {
                return path + '.' + prop + ' is required';
            }
            return null;
        },
        
        /**
         * Validate a boolean property
         * @param {*} value - Value to check
         * @param {string} path - Path for error message
         * @returns {string|null} Error message or null if valid
         */
        validateBoolean: function(value, path) {
            if (typeof value !== 'boolean') {
                return path + ' must be a boolean';
            }
            return null;
        },
        
        /**
         * Validate an enum property
         * @param {*} value - Value to check
         * @param {array} validValues - Array of valid values
         * @param {string} path - Path for error message
         * @returns {string|null} Error message or null if valid
         */
        validateEnum: function(value, validValues, path) {
            if (validValues.indexOf(value) === -1) {
                return path + ' must be one of: ' + validValues.join(', ');
            }
            return null;
        },
        
        /**
         * Validate a string property
         * @param {*} value - Value to check
         * @param {string} path - Path for error message
         * @returns {string|null} Error message or null if valid
         */
        validateString: function(value, path) {
            if (typeof value !== 'string') {
                return path + ' must be a string';
            }
            return null;
        },
        
        /**
         * Validate an array property
         * @param {*} value - Value to check
         * @param {string} path - Path for error message
         * @returns {string|null} Error message or null if valid
         */
        validateArray: function(value, path) {
            if (!Array.isArray(value)) {
                return path + ' must be an array';
            }
            return null;
        }
    },
    
    // =========================================================================
    // PERFORMANCE UTILITIES
    // =========================================================================
    Performance: {
        // Cache for compiled regex patterns
        _regexCache: {},
        
        /**
         * Get or create a cached regex pattern
         * @param {string} pattern - Regex pattern string
         * @param {string} flags - Regex flags
         * @returns {RegExp} Cached or new regex
         */
        getCachedRegex: function(pattern, flags) {
            var key = pattern + '::' + (flags || '');
            if (!this._regexCache[key]) {
                this._regexCache[key] = new RegExp(pattern, flags);
            }
            return this._regexCache[key];
        },
        
        /**
         * Clear the regex cache
         */
        clearRegexCache: function() {
            this._regexCache = {};
        }
    }
};

// Make available globally for rule modules
if (typeof window !== 'undefined') {
    window.DSLRuleUtils = DSLRuleUtils;
}

// Also set on module.exports for Node.js compatibility if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSLRuleUtils;
}