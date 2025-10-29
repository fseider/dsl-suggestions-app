/*
 * FILE: dslSuggestionsEngine.js
 * VERSION: v2.77
 * LAST UPDATED: 2025-01-09
 * 
 * ARTIFACT INFO (for proper Claude artifact creation):
 * - ID: dslSuggestionsEngine.js
 * - Title: dslSuggestionsEngine
 * - Type: application/vnd.ant.code (language: javascript)
 * 
 * ARCHITECTURAL BOUNDARY: Suggestions
 * AUTO-LOADED BY: Never (this is the engine)
 * PROVIDES: analyzeDSL(), formatSuggestionsOutput(), dslSuggestionsVersion(), 
 *           getSuggestionsConfigVersion(), generateCodeSuggestions(), applyCodeSuggestions()
 * 
 * DESCRIPTION:
 * Core DSL suggestions engine for analyzing code and providing improvement suggestions.
 * Auto-loads dslSuggestionsConfig.js on initialization.
 * 
 * RECENT UPDATES:
 * v2.71: Removed all old commented code for cleaner maintainability
 * v2.70: Fixed syntax error in IIFE initialization that prevented engine from running
 * v2.69: Simplified auto-load - Engine loads all core files directly
 * v2.72: Added HTML span wrapping to "SUGGESTION:" text for red coloring support.
 * v2.73: Updated to use configurable styling options (color and bold) from config.
 * v2.74: Fixed single-line suggestion formatting to use configurable styling consistently.
 * v2.75: Updated to use renamed DSLRuleModuleLoader instead of DSLModuleLoader.
 * v2.76: Enhanced auto-fix to properly honor config file settings with better logging.
 * v2.77: Added form selection awareness - fixes now respect Traditional vs Method radio button.
 */

// v2.76 - Enhanced config-based auto-fix
// var DSL_SUGGESTIONS_ENGINE_VERSION = '2.76';

// v2.77 - Added form selection awareness
var DSL_SUGGESTIONS_ENGINE_VERSION = '2.77';

// Version information - returns version from single source
function dslSuggestionsVersion() {
    return 'v' + DSL_SUGGESTIONS_ENGINE_VERSION;
}

// Get the version of the Suggestions Configuration
function getSuggestionsConfigVersion() {
    console.log('[getSuggestionsConfigVersion] Called. dslSuggestionsConfigData exists?', typeof dslSuggestionsConfigData !== 'undefined');
    if (typeof dslSuggestionsConfigData !== 'undefined') {
        console.log('[getSuggestionsConfigVersion] Config data:', dslSuggestionsConfigData);
        console.log('[getSuggestionsConfigVersion] Config version:', dslSuggestionsConfigData.version);
    }
    
    if (typeof dslSuggestionsConfigData !== 'undefined' && dslSuggestionsConfigData.version) {
        return dslSuggestionsConfigData.version;
    }
    return 'Not Found';
}

// v2.77 - Function to get current form selection
function getCurrentFormSelection() {
    // v2.77c - First check for force flag from app
    if (typeof window !== 'undefined' && window.__forceFormSelection) {
        console.log('[Engine] Using forced form selection:', window.__forceFormSelection);
        return window.__forceFormSelection;
    }
    
    // v2.77b - Check for explicit window marker set by the app
    if (typeof window !== 'undefined' && window.__currentFormSelection) {
        console.log('[Engine v2.77] Using window.__currentFormSelection:', window.__currentFormSelection);
        return window.__currentFormSelection;
    }
    
    // Check if we're in a browser with the form selection radio buttons
    if (typeof document !== 'undefined') {
        var selectedRadio = document.querySelector('input[name="suggestionForm"]:checked');
        if (selectedRadio) {
            var value = selectedRadio.value;
            console.log('[Engine v2.77] Form selection detected from radio:', value);
            return value; // 'traditional' or 'method'
        }
    }
    
    // Default to traditional if no selection found
    console.log('[Engine v2.77] No form selection found, defaulting to traditional');
    return 'traditional';
}

// Helper function to derive global variable name from filename by convention
function deriveGlobalVar(fileName) {
    // Convert 'divisionOperationsRule.js' to 'DivisionOperationsRule'
    var base = fileName.replace('.js', '');
    return base.charAt(0).toUpperCase() + base.slice(1);
}

// Initialize rule module placeholders only after RULE_REGISTRY is loaded
function initializeRulePlaceholders() {
    if (typeof RULE_REGISTRY !== 'undefined' && Array.isArray(RULE_REGISTRY)) {
        RULE_REGISTRY.forEach(function(fileName) {
            var globalVar = deriveGlobalVar(fileName);
            window[globalVar] = null;
        });
    }
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
    
    // Build rule modules array using derived global vars
    var ruleModules = [];
    if (typeof RULE_REGISTRY !== 'undefined' && Array.isArray(RULE_REGISTRY)) {
        for (var regIdx = 0; regIdx < RULE_REGISTRY.length; regIdx++) {
            var globalVar = deriveGlobalVar(RULE_REGISTRY[regIdx]);
            var ruleVar = window[globalVar];
            if (ruleVar) {
                ruleModules.push(ruleVar);
            }
        }
    }
    
    for (var i = 0; i < ruleModules.length; i++) {
        var rule = ruleModules[i];
        
        // Check if rule is loaded
        if (!rule) {
            // Get rule name using derived global var
            var ruleName = 'Unknown';
            if (typeof RULE_REGISTRY !== 'undefined' && Array.isArray(RULE_REGISTRY)) {
                for (var regIdx = 0; regIdx < RULE_REGISTRY.length; regIdx++) {
                    var globalVar = deriveGlobalVar(RULE_REGISTRY[regIdx]);
                    if (ruleModules[i] === window[globalVar]) {
                        ruleName = globalVar;
                        break;
                    }
                }
            }
            console.warn('[Engine] Rule module not loaded:', ruleName);
            continue;
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

// v2.73 - Helper function to build suggestion styling from config
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
    
    // v2.73: Get styling configuration
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
                
                // v2.72: HTML span wrapping for red "SUGGESTION:" text
                // result.push(indent + '/* <span style="color: red;">SUGGESTION:</span> ' + messageLines[0]);
                
                // v2.73: Use configurable styling for "SUGGESTION:" text
                result.push(indent + '/* <span style="' + suggestionStyle + '">SUGGESTION:</span> ' + messageLines[0]);
                
                // Add remaining lines with extra indentation
                for (var k = 1; k < messageLines.length; k++) {
                    result.push(indent + messageLines[k]);
                }
                
                result.push(indent + '*/');
            } else {
                // v2.73: Original single-line handling with hardcoded red
                // result.push(indent + '/* <span style="color: red;">SUGGESTION:</span> ' + suggestion.message + ' */');
                
                // v2.74: Use configurable styling for "SUGGESTION:" text (fixed for consistency)
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

// Helper to detect indent character type and add one level
function addOneIndentLevel(existingIndent) {
    // Detect what kind of indent is being used
    if (existingIndent.indexOf('\t') !== -1) {
        // Using tabs
        return existingIndent + '\t';
    } else if (existingIndent.length > 0) {
        // Using spaces - detect the pattern
        // Count leading spaces
        var spaceCount = 0;
        for (var i = 0; i < existingIndent.length; i++) {
            if (existingIndent[i] === ' ') spaceCount++;
            else break;
        }
        // Common indent sizes are 2 or 4 spaces
        if (spaceCount >= 4) {
            return existingIndent + '    '; // Add 4 spaces
        } else if (spaceCount >= 2) {
            return existingIndent + '  '; // Add 2 spaces
        }
    }
    // Default to tab if no indent detected
    return existingIndent + '\t';
}

// Wrapper functions for backward compatibility with DSLRuleModuleLoader

// Get complete loading status
function getFileLoadStatus() {
    if (typeof DSLRuleModuleLoader !== 'undefined') {
        return DSLRuleModuleLoader.getStatus();
    }
    console.warn('DSLRuleModuleLoader not loaded');
    return null;
}

// Get status for specific file
function getFileStatus(fileName) {
    if (typeof DSLRuleModuleLoader !== 'undefined') {
        return DSLRuleModuleLoader.getFileStatus(fileName);
    }
    console.warn('DSLRuleModuleLoader not loaded');
    return null;
}

// Get summary statistics
function getLoadingSummary() {
    if (typeof DSLRuleModuleLoader !== 'undefined') {
        return DSLRuleModuleLoader.getSummary();
    }
    console.warn('DSLRuleModuleLoader not loaded');
    return null;
}

// Get formatted loading report
function getLoadingReport() {
    if (typeof DSLRuleModuleLoader !== 'undefined') {
        return DSLRuleModuleLoader.getReport();
    }
    console.warn('DSLRuleModuleLoader not loaded');
    return 'Rule module loader not available';
}

// Display loading status in console table
function showLoadingTable() {
    if (typeof DSLRuleModuleLoader !== 'undefined') {
        DSLRuleModuleLoader.showTable();
    } else {
        console.warn('DSLRuleModuleLoader not loaded');
    }
}

// Check if a specific file is loaded
function isFileLoaded(fileName) {
    if (typeof DSLRuleModuleLoader !== 'undefined') {
        return DSLRuleModuleLoader.isLoaded(fileName);
    }
    console.warn('DSLRuleModuleLoader not loaded');
    return false;
}

// Get all failed files
function getFailedFiles() {
    if (typeof DSLRuleModuleLoader !== 'undefined') {
        var status = DSLRuleModuleLoader.getStatus();
        var failed = [];
        for (var fileName in status.files) {
            var file = status.files[fileName];
            if (file.status === 'Failed' || file.status === 'Not Found') {
                failed.push({
                    name: fileName,
                    ...file
                });
            }
        }
        return failed;
    }
    console.warn('DSLRuleModuleLoader not loaded');
    return [];
}

// Get all loaded files
function getLoadedFiles() {
    if (typeof DSLRuleModuleLoader !== 'undefined') {
        var status = DSLRuleModuleLoader.getStatus();
        var loaded = [];
        for (var fileName in status.files) {
            var file = status.files[fileName];
            if (file.status === 'Loaded') {
                loaded.push({
                    name: fileName,
                    ...file
                });
            }
        }
        return loaded;
    }
    console.warn('DSLRuleModuleLoader not loaded');
    return [];
}

// Get file versions mapping
function getFileVersions() {
    if (typeof DSLRuleModuleLoader !== 'undefined') {
        return DSLRuleModuleLoader.getVersions();
    }
    console.warn('DSLRuleModuleLoader not loaded');
    return {};
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
// v2.77 - Enhanced to respect form selection (Traditional vs Method)
function applyCodeSuggestions(code) {
    if (!code || code.trim() === '') {
        return code;
    }
    
    try {
        // Get config
        var config = window.dslSuggestionsConfigData || {};
        
        // v2.77 - Get current form selection and update configs
        var formSelection = getCurrentFormSelection();
        console.log('[Engine] Applying fixes with form selection:', formSelection);
        
        // v2.76 - Log config check
        console.log('[Engine] Checking auto-fix configuration...');
        console.log('[Engine] Config available:', config.suggestionRules ? Object.keys(config.suggestionRules) : 'none');
        
        // Build rules to apply using derived global vars
        var rulesToApply = [];
        if (typeof RULE_REGISTRY !== 'undefined' && Array.isArray(RULE_REGISTRY)) {
            console.log('[Engine] RULE_REGISTRY has', RULE_REGISTRY.length, 'rules');
            for (var regIdx = 0; regIdx < RULE_REGISTRY.length; regIdx++) {
                var globalVar = deriveGlobalVar(RULE_REGISTRY[regIdx]);
                var rule = window[globalVar];
                
                console.log('[Engine] Checking rule:', globalVar, '- exists:', !!rule, '- has fix:', rule && typeof rule.fix === 'function');
                
                // Only include rules that have a fix method (capability check)
                if (rule && typeof rule.fix === 'function') {
                    rulesToApply.push(rule);
                }
            }
        }
        
        console.log('[Engine] Rules with fix methods:', rulesToApply.length);
        
        var modifiedCode = code;
        var anyChanges = false;
        var appliedRules = [];
        var skippedRules = [];
        
        // Apply each rule's fix method
        for (var i = 0; i < rulesToApply.length; i++) {
            var rule = rulesToApply[i];
            
            // Skip if rule not loaded
            if (!rule) {
                continue;
            }
            
            // Use rule.name for config key
            // v2.76 - Handle naming mismatch: strip "Rule" suffix if present
            var configKey = rule.name;
            console.log('[Engine] Rule name:', configKey);
            
            if (configKey && configKey.endsWith('Rule')) {
                // Strip "Rule" suffix to match config keys
                configKey = configKey.substring(0, configKey.length - 4);
                console.log('[Engine] Stripped to:', configKey);
            }
            
            // Get rule config
            var ruleConfig = config.suggestionRules && config.suggestionRules[configKey];
            
            // v2.76 - Enhanced logging to show WHY rules are skipped
            if (!ruleConfig) {
                console.log('[Engine] Skipping', configKey, '- no config found');
                skippedRules.push(configKey + ' (no config)');
                continue;
            }
            
            if (!ruleConfig.enabled) {
                console.log('[Engine] Skipping', configKey, '- rule disabled');
                skippedRules.push(configKey + ' (disabled)');
                continue;
            }
            
            if (!ruleConfig.autoFixEnabled) {
                console.log('[Engine] Skipping', configKey, '- auto-fix disabled');
                skippedRules.push(configKey + ' (auto-fix disabled)');
                continue;
            }
            
            // v2.77 - Override fixStyle based on form selection
            var modifiedRuleConfig = Object.assign({}, ruleConfig);
            if (formSelection === 'method') {
                modifiedRuleConfig.fixStyle = 'method';
                console.log('[Engine] Overriding fixStyle to method for', configKey);
                if (window.__debugFormChange) {
                    console.log('ENGINE DEBUG: Original fixStyle:', ruleConfig.fixStyle);
                    console.log('ENGINE DEBUG: Modified fixStyle:', modifiedRuleConfig.fixStyle);
                }
            } else {
                modifiedRuleConfig.fixStyle = 'traditional';
                console.log('[Engine] Using traditional fixStyle for', configKey);
                if (window.__debugFormChange) {
                    console.log('ENGINE DEBUG: Original fixStyle:', ruleConfig.fixStyle);
                    console.log('ENGINE DEBUG: Modified fixStyle:', modifiedRuleConfig.fixStyle);
                }
            }
            
            // v2.75 - Original logging
            console.log('[Engine] Applying fixes from', rule.name || 'unknown', 'v' + (rule.version || 'unknown'), 'with style:', modifiedRuleConfig.fixStyle);
            
            // Apply the rule's fix method with modified config
            var fixedCode = rule.fix(modifiedCode, modifiedRuleConfig);
            
            if (window.__debugFormChange) {
                // Check if the fix actually changed based on style
                var hasTraditional = fixedCode.includes('ifNaN(') || fixedCode.includes('ifNull(');
                var hasMethod = fixedCode.includes(').ifNaN(') || fixedCode.includes(').ifNull(');
                console.log('ENGINE DEBUG: After', configKey, 'fix - hasTraditional:', hasTraditional, 'hasMethod:', hasMethod);
            }
            
            // Check if code was modified
            if (fixedCode !== modifiedCode) {
                console.log('[Engine] âœ…', rule.name || 'unknown', 'applied fixes');
                modifiedCode = fixedCode;
                anyChanges = true;
                appliedRules.push(configKey);
            } else {
                console.log('[Engine]', configKey, 'checked but no changes needed');
            }
        }
        
        // v2.76 - Summary logging
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
    
    // Export wrapper functions that use DSLModuleLoader
    window.getFileLoadStatus = getFileLoadStatus;
    window.getFileStatus = getFileStatus;
    window.getLoadingSummary = getLoadingSummary;
    window.getLoadingReport = getLoadingReport;
    window.showLoadingTable = showLoadingTable;
    window.isFileLoaded = isFileLoaded;
    window.getFailedFiles = getFailedFiles;
    window.getLoadedFiles = getLoadedFiles;
    window.getFileVersions = getFileVersions;
}

// SIMPLIFIED AUTO-LOAD - Engine loads all core files directly
(function() {
    console.log('[Engine] Initializing DSL Suggestions Engine v' + DSL_SUGGESTIONS_ENGINE_VERSION);
    
    // Simple sequential loading of all core files
    
    // Step 1: Load Rule Module Loader (for potential use with rules later)
    loadRuleModuleLoader(function(loaderSuccess) {
        if (loaderSuccess) {
            console.log('[Engine] Rule module loader ready');
        } else {
            console.log('[Engine] Rule module loader failed, continuing without it');
        }
        
        // Step 2: Load Config
        loadSuggestionsConfig(function(configSuccess) {
            if (!configSuccess) {
                console.error('[Engine] Config failed to load - engine may not function correctly');
            } else {
                console.log('[Engine] Config loaded successfully');
            }
            
            // Step 3: Load Rule Utilities
            loadRuleUtilities(function(utilitiesSuccess) {
                if (!utilitiesSuccess) {
                    console.warn('[Engine] Rule utilities failed, continuing anyway');
                } else {
                    console.log('[Engine] Rule utilities loaded successfully');
                }
                
                // Step 4: Load Rule Registry
                loadRuleRegistry(function(registrySuccess) {
                    if (!registrySuccess) {
                        console.error('[Engine] Rule registry failed to load');
                        return;
                    }
                    console.log('[Engine] Rule registry loaded successfully');
                    
                    // Initialize rule placeholders after registry is loaded
                    initializeRulePlaceholders();
                    
                    // Step 5: Load individual rules
                    loadRules();
                });
            });
        });
    });
    
    // Direct load functions for each core file
    
    function loadRuleModuleLoader(callback) {
        console.log('[Engine] Loading dslRuleModuleLoader.js...');
        
        var script = document.createElement('script');
        script.src = 'dslRuleModuleLoader.js';
        script.async = false;
        
        script.onload = function() {
            setTimeout(function() {
                if (typeof DSLRuleModuleLoader !== 'undefined') {
                    console.log('[Engine] âœ… DSLRuleModuleLoader loaded');
                    if (callback) callback(true);
                } else {
                    console.warn('[Engine] âš ï¸ Rule module loader script loaded but DSLRuleModuleLoader undefined');
                    if (callback) callback(false);
                }
            }, 50);
        };
        
        script.onerror = function() {
            console.error('[Engine] âŒ Failed to load dslRuleModuleLoader.js');
            if (callback) callback(false);
        };
        
        document.head.appendChild(script);
    }
    
    function loadSuggestionsConfig(callback) {
        console.log('[Engine] Loading dslSuggestionsConfig.js...');
        
        var script = document.createElement('script');
        script.src = 'dslSuggestionsConfig.js';
        script.async = false;
        
        script.onload = function() {
            setTimeout(function() {
                if (typeof dslSuggestionsConfigData !== 'undefined') {
                    console.log('[Engine] âœ… Config loaded, version:', dslSuggestionsConfigData.version || 'unknown');
                    
                    // Track in module loader if available
                    trackFileInLoader('dslSuggestionsConfig.js', 'dslSuggestionsConfig.js', 
                                     'dslSuggestionsConfigData', dslSuggestionsConfigData.version);
                    
                    if (callback) callback(true);
                } else {
                    console.error('[Engine] âŒ Config script loaded but dslSuggestionsConfigData undefined');
                    if (callback) callback(false);
                }
            }, 50);
        };
        
        script.onerror = function() {
            console.error('[Engine] âŒ Failed to load dslSuggestionsConfig.js');
            if (callback) callback(false);
        };
        
        document.head.appendChild(script);
    }
    
    function loadRuleUtilities(callback) {
        console.log('[Engine] Loading dslRuleUtilities.js...');
        
        var script = document.createElement('script');
        script.src = 'Rules/dslRuleUtilities.js';
        script.async = false;
        
        script.onload = function() {
            setTimeout(function() {
                if (typeof DSLRuleUtils !== 'undefined') {
                    console.log('[Engine] âœ… DSLRuleUtils loaded, version:', DSLRuleUtils.version || 'unknown');
                    
                    // Track in module loader if available
                    trackFileInLoader('dslRuleUtilities.js', 'Rules/dslRuleUtilities.js', 
                                     'DSLRuleUtils', DSLRuleUtils.version);
                    
                    if (callback) callback(true);
                } else {
                    console.warn('[Engine] âš ï¸ Utilities script loaded but DSLRuleUtils undefined');
                    if (callback) callback(false);
                }
            }, 50);
        };
        
        script.onerror = function() {
            console.error('[Engine] âŒ Failed to load dslRuleUtilities.js');
            if (callback) callback(false);
        };
        
        document.head.appendChild(script);
    }
    
    function loadRuleRegistry(callback) {
        console.log('[Engine] Loading dslRuleRegistry.js...');
        
        var script = document.createElement('script');
        script.src = 'Rules/dslRuleRegistry.js';
        script.async = false;
        
        script.onload = function() {
            setTimeout(function() {
                if (typeof RULE_REGISTRY !== 'undefined') {
                    console.log('[Engine] âœ… RULE_REGISTRY loaded, version:', RULE_REGISTRY.version || 'unknown');
                    console.log('[Engine] Registry contains ' + RULE_REGISTRY.length + ' rules');
                    
                    // Track in module loader if available
                    trackFileInLoader('dslRuleRegistry.js', 'Rules/dslRuleRegistry.js', 
                                     'RULE_REGISTRY', RULE_REGISTRY.version);
                    
                    if (callback) callback(true);
                } else {
                    console.error('[Engine] âŒ Registry script loaded but RULE_REGISTRY undefined');
                    if (callback) callback(false);
                }
            }, 50);
        };
        
        script.onerror = function() {
            console.error('[Engine] âŒ Failed to load dslRuleRegistry.js');
            if (callback) callback(false);
        };
        
        document.head.appendChild(script);
    }
    
    function loadRules() {
        console.log('[Engine] Loading individual rule modules...');
        
        // Check if we have the registry
        if (typeof RULE_REGISTRY === 'undefined' || !Array.isArray(RULE_REGISTRY)) {
            console.error('[Engine] Cannot load rules - RULE_REGISTRY not available');
            return;
        }
        
        // Option 1: Use rule module loader if available
        if (typeof DSLRuleModuleLoader !== 'undefined' && DSLRuleModuleLoader.loadSuggestionRules) {
            console.log('[Engine] Using rule module loader for rules...');
            DSLRuleModuleLoader.loadSuggestionRules(RULE_REGISTRY, function(loadedRules) {
                console.log('[Engine] Rules loaded via rule module loader: ' + loadedRules.length + '/' + RULE_REGISTRY.length);
                completeInitialization(loadedRules.length);
            });
        } else {
            // Option 2: Load rules directly
            console.log('[Engine] Loading rules directly...');
            loadRulesDirectly();
        }
    }
    
    function loadRulesDirectly() {
        var rulesLoaded = 0;
        var totalRules = RULE_REGISTRY.length;
        
        // Handle empty registry case
        if (totalRules === 0) {
            console.log('[Engine] No rules to load');
            completeInitialization(0);
            return;
        }
        
        for (var i = 0; i < RULE_REGISTRY.length; i++) {
            loadRuleModule(RULE_REGISTRY[i], function(success) {
                rulesLoaded++;
                if (rulesLoaded === totalRules) {
                    console.log('[Engine] All rules processed');
                    completeInitialization(rulesLoaded);
                }
            });
        }
    }
    
    function loadRuleModule(fileName, callback) {
        var script = document.createElement('script');
        script.src = 'Rules/' + fileName;
        script.async = false;
        
        script.onload = function() {
            console.log('[Engine] âœ… Loaded ' + fileName);
            
            // Derive global var name
            var globalVar = fileName.replace('.js', '');
            globalVar = globalVar.charAt(0).toUpperCase() + globalVar.slice(1);
            
            // Track in module loader if available
            if (typeof window[globalVar] !== 'undefined') {
                trackFileInLoader(fileName, 'Rules/' + fileName, globalVar, window[globalVar].version);
            }
            
            if (callback) callback(true);
        };
        
        script.onerror = function() {
            console.error('[Engine] âŒ Failed to load ' + fileName);
            if (callback) callback(false);
        };
        
        document.head.appendChild(script);
    }
    
    function trackFileInLoader(fileName, path, globalVar, version) {
        // If rule module loader is available, track the file
        if (typeof DSLRuleModuleLoader !== 'undefined' && DSLRuleModuleLoader.getTracker) {
            try {
                var tracker = DSLRuleModuleLoader.getTracker();
                tracker.files[fileName] = {
                    path: path,
                    status: 'Loaded',
                    version: version || 'Unknown',
                    attempts: 1,
                    maxAttempts: 1,
                    loadStartTime: new Date().toISOString(),
                    loadEndTime: new Date().toISOString(),
                    loadDuration: 0,
                    globalVar: globalVar,
                    errorDetails: null
                };
            } catch (e) {
                // Tracking failed, not critical
            }
        }
    }
    
    function completeInitialization(rulesLoaded) {
        console.log('[Engine] âœ… DSL Suggestions Engine v' + DSL_SUGGESTIONS_ENGINE_VERSION + ' initialized');
        console.log('[Engine] Loaded: Config, Utilities, Registry, ' + rulesLoaded + ' rules');
        
        // Fire initialization complete event
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dslSuggestionsEngineReady', {
                detail: {
                    version: DSL_SUGGESTIONS_ENGINE_VERSION,
                    configVersion: getSuggestionsConfigVersion(),
                    rulesLoaded: rulesLoaded
                }
            }));
        }
    }
})();