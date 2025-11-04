/*
 * FILE: appVersion.js
 * VERSION: v3.52
 * LAST UPDATED: 2025-11-04
 *
 * ARCHITECTURAL BOUNDARY: Suggestions
 * AUTO-LOADED BY: dslSuggestionsApp.html
 * PROVIDES: APP_VERSION global object
 *
 * DESCRIPTION:
 * Single source of truth for DSL Suggestions App version number.
 * This file MUST be updated whenever ANY app file changes.
 *
 * ⚠️ VERSION BUMPING POLICY:
 *
 * WHEN TO BUMP:
 * - ANY change to HTML, JS, CSS, or configuration files
 * - Bug fixes, new features, refactoring, or improvements
 * - Changes to rules, utilities, engine, or examples
 * - Documentation updates that affect user experience
 *
 * HOW TO BUMP:
 * 1. Increment version number (v3.52 → v3.53)
 * 2. Update LAST UPDATED date
 * 3. Update cache-busting in dslSuggestionsApp.html (all <script> tags)
 * 4. Update cache-busting in dslSuggestionsEngine.js (loadConfig, loadUtilities, loadRules)
 *
 * VERSION FORMAT:
 * - v3.XX for minor updates (bug fixes, improvements)
 * - v4.00 for major architectural changes
 */

var APP_VERSION = {
    version: 'v3.52',
    lastUpdated: '2025-11-04',
    description: 'DSL Suggestions App',

    // Get full version string
    getFullVersion: function() {
        return this.version + ' (' + this.lastUpdated + ')';
    },

    // Get just version number
    getVersion: function() {
        return this.version;
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.APP_VERSION = APP_VERSION;
}

// Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_VERSION;
}
