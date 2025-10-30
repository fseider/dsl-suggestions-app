/*
 * FILE: dslSuggestionsEngine.js
 * VERSION: v3.00
 * LAST UPDATED: 2025-10-29
 *
 * ARTIFACT INFO (for proper Claude artifact creation):
 * - ID: dslSuggestionsEngine.js
 * - Title: dslSuggestionsEngine
 * - Type: application/vnd.ant.code (language: javascript)
 *
 * ARCHITECTURAL BOUNDARY: Suggestions
 * PROVIDES: analyzeDSL(), formatSuggestionsOutput(), dslSuggestionsVersion(),
 *           getSuggestionsConfigVersion(), generateCodeSuggestions(), applyCodeSuggestions()
 *
 * DESCRIPTION:
 * Core DSL suggestions engine for analyzing code and providing improvement suggestions.
 *
 * OPTIMIZATION v3.00:
 * - Removed all dynamic loading logic (~500 lines removed)
 * - Works directly with consolidated DSL_RULES array
 * - No longer depends on RULE_REGISTRY, DSLRuleModuleLoader, or individual rule files
 * - Simplified initialization (3 files instead of 10+)
 * - Applies config defaults to rules automatically
 * - Much faster page load (3 HTTP requests instead of 10+)
 */

var DSL_SUGGESTIONS_ENGINE_VERSION = '3.00';

// Version information
function dslSuggestionsVersion() {
    return 'v' + DSL_SUGGESTIONS_ENGINE_VERSION;
}

// Get the version of the Suggestions Configuration
function getSuggestionsConfigVersion() {
    if (typeof dslSuggestionsConfigData !== 'undefined' && dslSuggestionsConfigData.version) {
        return dslSuggestionsConfigData.version;
    }
    return 'Not Found';
}

// Get current form selection (Traditional vs Method)
function getCurrentFormSelection() {
    // Check for force flag from app
    if (typeof window !== 'undefined' && window.__forceFormSelection) {
        return window.__forceFormSelection;
    }

    // Check for explicit window marker set by the app
    if (typeof window !== 'undefined' && window.__currentFormSelection) {
        return window.__currentFormSelection;
    }

    // Check if we're in a browser with the form selection radio buttons
    if (typeof document !== 'undefined') {
        var selectedRadio = document.querySelector('input[name="suggestionForm"]:checked');
        if (selectedRadio) {
            return selectedRadio.value; // 'traditional' or 'method'
        }
    }

    // Default to traditional if no selection found
    return 'traditional';
}

// Apply config defaults to a rule config
function applyConfigDefaults(ruleConfig, defaults) {
    if (!ruleConfig || !defaults) {
        return ruleConfig;
    }

    var merged = {};

    // Copy defaults first
    for (var key in defaults) {
        if (defaults.hasOwnProperty(key)) {
            merged[key] = defaults[key];
        }
    }

    // Override with rule-specific values
    for (var key in ruleConfig) {
        if (ruleConfig.hasOwnProperty(key)) {
            merged[key] = ruleConfig[key];
        }
    }

    return merged;
}

// Main analysis function
function analyzeDSL(code, options) {
    options = options || {};

    // Get config (either passed in or global)
    var config = options.config || window.dslSuggestionsConfigData || {};

    // Initialize results
    var results = {
        suggestions: [],
        summary: {
            total: 0,
            byType: {},
            bySeverity: {}
        }
    };

    // Split code into lines
    var lines = code.split('\n');

    // Build context object
    var context = {
        lines: lines,
        totalLines: lines.length,
        options: options
    };

    // Use DSL_RULES array directly (no dynamic loading needed!)
    var ruleModules = window.DSL_RULES || [];

    for (var i = 0; i < ruleModules.length; i++) {
        var rule = ruleModules[i];

        // Check if rule is loaded
        if (!rule) {
            console.warn('[Engine] Rule module not loaded at index:', i);
            continue;
        }

        // Get rule config with defaults applied
        var ruleConfig = config.suggestionRules && config.suggestionRules[rule.name];
        if (ruleConfig && config.defaults) {
            ruleConfig = applyConfigDefaults(ruleConfig, config.defaults);
        }

        // Check each line with this rule
        for (var lineNum = 0; lineNum < lines.length; lineNum++) {
            var line = lines[lineNum];

            var lineSuggestions = rule.check(line, lineNum + 1, lines, context, config);

            // Add suggestions to results
            if (lineSuggestions && lineSuggestions.length > 0) {
                results.suggestions = results.suggestions.concat(lineSuggestions);
            }
        }
    }

    // Calculate summary
    results.summary.total = results.suggestions.length;

    // Group by type and severity
    for (var j = 0; j < results.suggestions.length; j++) {
        var suggestion = results.suggestions[j];

        // Extract type from message (e.g., "[v1.14]" -> "v1.14")
        var typeMatch = suggestion.message.match(/\[([^\]]+)\]/);
        var type = typeMatch ? typeMatch[1] : 'unknown';

        results.summary.byType[type] = (results.summary.byType[type] || 0) + 1;
        results.summary.bySeverity[suggestion.severity] =
            (results.summary.bySeverity[suggestion.severity] || 0) + 1;
    }

    return results;
}

// Helper function to build suggestion styling from config
function buildSuggestionStyle(config) {
    var styling = config && config.styling;
    if (!styling) {
        // Default styling if no config
        return 'color: red;';
    }

    var color = styling.suggestionColor || 'red';
    var bold = styling.suggestionBold || false;

    var style = 'color: ' + color + ';';
    if (bold) {
        style += ' font-weight: bold;';
    }

    return style;
}

// Format suggestions for output display
function formatSuggestionsOutput(code, suggestions) {
    var lines = code.split('\n');
    var result = [];

    // Get styling configuration
    var config = window.dslSuggestionsConfigData || {};
    var suggestionStyle = buildSuggestionStyle(config);

    // Add each line with its suggestions
    for (var i = 0; i < lines.length; i++) {
        result.push(lines[i]);

        // Find suggestions for this line
        var lineSuggestions = suggestions.filter(function(s) {
            return s.line === i + 1;
        });

        // Add suggestion comments
        for (var j = 0; j < lineSuggestions.length; j++) {
            var suggestion = lineSuggestions[j];
            var indent = getIndent(lines[i]);

            // Check if this is a multi-line suggestion
            if (suggestion.message.indexOf('\n') > -1) {
                // Split the message into lines
                var messageLines = suggestion.message.split('\n');

                result.push(indent + '/* <span style="' + suggestionStyle + '">SUGGESTION:</span> ' + messageLines[0]);

                // Add remaining lines with extra indentation
                for (var k = 1; k < messageLines.length; k++) {
                    result.push(indent + messageLines[k]);
                }

                result.push(indent + '*/');
            } else {
                result.push(indent + '/* <span style="' + suggestionStyle + '">SUGGESTION:</span> ' + suggestion.message + ' */');
            }
        }
    }

    return result.join('\n');
}

// Helper function to get line indentation
function getIndent(line) {
    var match = line.match(/^(\s*)/);
    return match ? match[1] : '';
}

// Generate code suggestions - wrapper for analyzeDSL + formatSuggestionsOutput
function generateCodeSuggestions(code) {
    if (!code || code.trim() === '') {
        return 'No code provided for analysis.';
    }

    try {
        // Analyze the code
        var analysisResults = analyzeDSL(code);

        if (analysisResults.suggestions.length === 0) {
            return 'No suggestions found. Code looks good!';
        }

        // Format the suggestions for display
        return formatSuggestionsOutput(code, analysisResults.suggestions);
    } catch (error) {
        console.error('Error generating suggestions:', error);
        return 'Error analyzing code: ' + error.message;
    }
}

// Apply code suggestions - auto-fix functionality
function applyCodeSuggestions(code) {
    if (!code || code.trim() === '') {
        return code;
    }

    try {
        // Get config
        var config = window.dslSuggestionsConfigData || {};

        // Get current form selection
        var formSelection = getCurrentFormSelection();
        console.log('[Engine] Applying fixes with form selection:', formSelection);

        // Build rules to apply from DSL_RULES
        var rulesToApply = window.DSL_RULES || [];

        console.log('[Engine] Rules available:', rulesToApply.length);

        var modifiedCode = code;
        var anyChanges = false;
        var appliedRules = [];
        var skippedRules = [];

        // Apply each rule's fix method
        for (var i = 0; i < rulesToApply.length; i++) {
            var rule = rulesToApply[i];

            // Skip if rule not loaded
            if (!rule || !rule.fix || typeof rule.fix !== 'function') {
                continue;
            }

            // Get rule config with defaults applied
            var ruleConfig = config.suggestionRules && config.suggestionRules[rule.name];
            if (ruleConfig && config.defaults) {
                ruleConfig = applyConfigDefaults(ruleConfig, config.defaults);
            }

            // Check if rule should be applied
            if (!ruleConfig) {
                skippedRules.push(rule.name + ' (no config)');
                continue;
            }

            if (!ruleConfig.enabled) {
                skippedRules.push(rule.name + ' (disabled)');
                continue;
            }

            if (!ruleConfig.autoFixEnabled) {
                skippedRules.push(rule.name + ' (auto-fix disabled)');
                continue;
            }

            // Override fixStyle based on form selection
            var modifiedRuleConfig = {};
            for (var key in ruleConfig) {
                if (ruleConfig.hasOwnProperty(key)) {
                    modifiedRuleConfig[key] = ruleConfig[key];
                }
            }
            modifiedRuleConfig.fixStyle = formSelection;

            console.log('[Engine] Applying fixes from', rule.name, 'v' + (rule.version || 'unknown'), 'with style:', modifiedRuleConfig.fixStyle);

            // For rules that need the full config structure, create it
            var fullConfig = {
                suggestionRules: {}
            };
            fullConfig.suggestionRules[rule.name] = modifiedRuleConfig;

            // Try to find all suggestions for this rule first
            var analysisResults = analyzeDSL(modifiedCode);
            var ruleSuggestions = analysisResults.suggestions.filter(function(s) {
                return s.rule === rule.name;
            });

            // Apply fixes for each suggestion
            for (var j = 0; j < ruleSuggestions.length; j++) {
                var suggestion = ruleSuggestions[j];
                var fixedCode = rule.fix(modifiedCode, suggestion, fullConfig);

                if (fixedCode !== modifiedCode) {
                    modifiedCode = fixedCode;
                    anyChanges = true;
                }
            }

            if (anyChanges && appliedRules.indexOf(rule.name) === -1) {
                appliedRules.push(rule.name);
            }
        }

        // Summary logging
        if (anyChanges) {
            console.log('[Engine] Auto-fixes applied from:', appliedRules.join(', '));
        } else {
            console.log('[Engine] No auto-fixes were applied');
        }

        if (skippedRules.length > 0) {
            console.log('[Engine] Rules skipped:', skippedRules.join(', '));
        }

        return modifiedCode;

    } catch (error) {
        console.error('Error applying suggestions:', error);
        return code; // Return original on error
    }
}

// Export functions for use
if (typeof window !== 'undefined') {
    window.analyzeDSL = analyzeDSL;
    window.formatSuggestionsOutput = formatSuggestionsOutput;
    window.dslSuggestionsVersion = dslSuggestionsVersion;
    window.getSuggestionsConfigVersion = getSuggestionsConfigVersion;
    window.generateCodeSuggestions = generateCodeSuggestions;
    window.applyCodeSuggestions = applyCodeSuggestions;
}

// SIMPLIFIED AUTO-LOAD - Just load config, utilities, and consolidated rules
(function() {
    console.log('[Engine] Initializing DSL Suggestions Engine v' + DSL_SUGGESTIONS_ENGINE_VERSION);
    console.log('[Engine] Optimized architecture: 3 files instead of 10+');

    // Step 1: Load Config
    loadSuggestionsConfig(function(configSuccess) {
        if (!configSuccess) {
            console.error('[Engine] Config failed to load - engine may not function correctly');
        } else {
            console.log('[Engine] âœ… Config loaded successfully');
        }

        // Step 2: Load Rule Utilities
        loadRuleUtilities(function(utilitiesSuccess) {
            if (!utilitiesSuccess) {
                console.warn('[Engine] Rule utilities failed, continuing anyway');
            } else {
                console.log('[Engine] âœ… Rule utilities loaded successfully');
            }

            // Step 3: Load Consolidated Rules
            loadConsolidatedRules(function(rulesSuccess) {
                if (!rulesSuccess) {
                    console.error('[Engine] Rules failed to load');
                } else {
                    console.log('[Engine] âœ… Consolidated rules loaded successfully');
                }

                completeInitialization();
            });
        });
    });

    function loadSuggestionsConfig(callback) {
        console.log('[Engine] Loading dslSuggestionsConfig.js...');

        var script = document.createElement('script');
        script.src = 'dslSuggestionsConfig.js?v=3.24';
        script.async = false;

        script.onload = function() {
            setTimeout(function() {
                if (typeof dslSuggestionsConfigData !== 'undefined') {
                    console.log('[Engine] Config version:', dslSuggestionsConfigData.version || 'unknown');
                    if (callback) callback(true);
                } else {
                    console.error('[Engine] Config script loaded but dslSuggestionsConfigData undefined');
                    if (callback) callback(false);
                }
            }, 50);
        };

        script.onerror = function() {
            console.error('[Engine] Failed to load dslSuggestionsConfig.js');
            if (callback) callback(false);
        };

        document.head.appendChild(script);
    }

    function loadRuleUtilities(callback) {
        console.log('[Engine] Loading dslRuleUtilities.js...');

        var script = document.createElement('script');
        script.src = 'dslRuleUtilities.js?v=3.24';
        script.async = false;

        script.onload = function() {
            setTimeout(function() {
                if (typeof DSLRuleUtils !== 'undefined') {
                    console.log('[Engine] Utilities version:', DSLRuleUtils.version || 'unknown');
                    if (callback) callback(true);
                } else {
                    console.warn('[Engine] Utilities script loaded but DSLRuleUtils undefined');
                    if (callback) callback(false);
                }
            }, 50);
        };

        script.onerror = function() {
            console.error('[Engine] Failed to load dslRuleUtilities.js');
            if (callback) callback(false);
        };

        document.head.appendChild(script);
    }

    function loadConsolidatedRules(callback) {
        console.log('[Engine] Loading dslRules.js (all 8 rules)...');

        var script = document.createElement('script');
        script.src = 'dslRules.js?v=3.24';
        script.async = false;

        script.onload = function() {
            setTimeout(function() {
                if (typeof DSL_RULES !== 'undefined' && Array.isArray(DSL_RULES)) {
                    console.log('[Engine] Loaded', DSL_RULES.length, 'rules from consolidated file');
                    if (callback) callback(true);
                } else {
                    console.error('[Engine] Rules script loaded but DSL_RULES undefined');
                    if (callback) callback(false);
                }
            }, 50);
        };

        script.onerror = function() {
            console.error('[Engine] Failed to load dslRules.js');
            if (callback) callback(false);
        };

        document.head.appendChild(script);
    }

    function completeInitialization() {
        var rulesCount = (typeof DSL_RULES !== 'undefined' && DSL_RULES) ? DSL_RULES.length : 0;

        console.log('[Engine] âœ… DSL Suggestions Engine v' + DSL_SUGGESTIONS_ENGINE_VERSION + ' initialized');
        console.log('[Engine] Loaded: Config v' + getSuggestionsConfigVersion() + ', Utilities, ' + rulesCount + ' rules');

        // Fire initialization complete event
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dslSuggestionsEngineReady', {
                detail: {
                    version: DSL_SUGGESTIONS_ENGINE_VERSION,
                    configVersion: getSuggestionsConfigVersion(),
                    rulesLoaded: rulesCount
                }
            }));
        }
    }
})();
