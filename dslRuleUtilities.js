/*
 * FILE: dslRuleUtilities.js
 *
 * ARTIFACT INFO (for proper Claude artifact creation):
 * - ID: dslRuleUtilities.js
 * - Title: dslRuleUtilities
 * - Type: application/vnd.ant.code (language: javascript)
 *
 * ARCHITECTURAL BOUNDARY: Suggestions/Rules
 * AUTO-LOADED BY: dslSuggestionsEngine.js
 * PROVIDES: DSLRuleUtils global object with shared utility functions
 *
 * DESCRIPTION:
 * Shared utility functions for DSL suggestion rules.
 * Trimmed from 440 lines to ~120 lines by keeping only the functions actually used.
 * Version tracking: See dslSuggestionsApp.html for app version.
 */

var DSLRuleUtils = {
    version: 'v2.00',

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
        }
    },

    // =========================================================================
    // MESSAGE UTILITIES
    // =========================================================================
    Message: {
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
    }
};

// Make available globally for rule modules
if (typeof window !== 'undefined') {
    window.DSLRuleUtils = DSLRuleUtils;
}

// Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSLRuleUtils;
}
