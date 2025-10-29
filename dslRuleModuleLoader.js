/*
 * FILE: dslRuleModuleLoader.js
 * VERSION: v1.08
 * LAST UPDATED: 2025-01-09
 * 
 * ARTIFACT INFO (for proper Claude artifact creation):
 * - ID: dslRuleModuleLoader.js
 * - Title: dslRuleModuleLoader
 * - Type: application/vnd.ant.code (language: javascript)
 * 
 * DESCRIPTION:
 * Specialized module loader for DSL rule modules with tracking and version management.
 * Provides centralized loading functionality for rule scripts with retry logic,
 * version detection, and comprehensive status tracking.
 * 
 * UPDATED v1.07: Renamed from dslModuleLoader to dslRuleModuleLoader to clarify purpose.
 *                 This loader is specifically for loading rule modules, not general files.
 * UPDATED v1.08: Fixed all paths - removed '../' prefixes after files moved to root level.
 */

var DSLRuleModuleLoader = (function() {
    'use strict';
    
    // Module version
    // v1.07 - var MODULE_VERSION = '1.07';
    // v1.08 - Updated for path fixes
    var MODULE_VERSION = '1.08';
    
    // Timing constants
    var SCRIPT_CHECK_DELAY = 50;        // Delay to check if script loaded successfully
    var RETRY_DELAY_SHORT = 100;        // Short retry delay for quick retries
    var RETRY_DELAY_MEDIUM = 200;       // Medium retry delay for fallback attempts
    var RETRY_DELAY_LONG = 1000;        // Long retry delay for major retries
    
    // File Loading Status Tracker
    var tracker = {
        trackerVersion: '1.0',
        moduleVersion: MODULE_VERSION,
        startTime: new Date().toISOString(),
        files: {
            // v1.07 - Self-register the rule module loader (updated name)
            // v1.08 - Fixed path (removed '../')
            'dslRuleModuleLoader.js': {
                // v1.07 - path: '../dslRuleModuleLoader.js',
                path: 'dslRuleModuleLoader.js',  // v1.08 - Fixed: now at root
                status: 'Loaded',
                version: MODULE_VERSION,
                attempts: 1,
                maxAttempts: 1,
                loadStartTime: new Date().toISOString(),
                loadEndTime: new Date().toISOString(),
                loadDuration: 0,
                globalVar: 'DSLRuleModuleLoader',
                errorDetails: null
            },
            // v1.02 - Pre-configured entries with corrected paths
            // v1.08 - Fixed paths for root level
            'dslSuggestionsConfig.js': {
                // v1.07 - path: '../dslSuggestionsConfig.js',  // v1.02 - Parent directory
                path: 'dslSuggestionsConfig.js',  // v1.08 - Fixed: now at root
                status: 'Not Attempted',
                version: null,
                attempts: 0,
                maxAttempts: 3,
                loadStartTime: null,
                loadEndTime: null,
                loadDuration: null,
                globalVar: 'dslSuggestionsConfigData',
                errorDetails: null
            },
            'dslRuleUtilities.js': {
                // v1.07 - path: '../Rules/dslRuleUtilities.js',  // Still in Rules subdirectory
                path: 'Rules/dslRuleUtilities.js',  // v1.08 - Fixed: Rules is under root
                status: 'Not Attempted',
                version: null,
                attempts: 0,
                maxAttempts: 1,
                loadStartTime: null,
                loadEndTime: null,
                loadDuration: null,
                globalVar: 'DSLRuleUtils',
                errorDetails: null
            }
        },
        summary: {
            totalFiles: 0,
            loaded: 0,
            failed: 0,
            notFound: 0,
            loading: 0,
            notAttempted: 0
        }
    };
    
    // v1.05 - Initialize self-tracking on startup
    updateTrackerSummary();
    
    // Helper function to update tracker summary
    function updateTrackerSummary() {
        var summary = tracker.summary;
        
        // Reset counters
        summary.totalFiles = 0;
        summary.loaded = 0;
        summary.failed = 0;
        summary.notFound = 0;
        summary.loading = 0;
        summary.notAttempted = 0;
        
        // Count each status
        for (var fileName in tracker.files) {
            summary.totalFiles++;
            var status = tracker.files[fileName].status;
            
            switch(status) {
                case 'Loaded':
                    summary.loaded++;
                    break;
                case 'Failed':
                    summary.failed++;
                    break;
                case 'Not Found':
                    summary.notFound++;
                    break;
                case 'Loading':
                    summary.loading++;
                    break;
                case 'Not Attempted':
                    summary.notAttempted++;
                    break;
            }
        }
    }
    
    // Helper function to get status icon
    function getStatusIcon(status) {
        switch(status) {
            case 'Loaded': return 'âœ…';
            case 'Failed': return 'âŒ';
            case 'Not Found': return 'âš ï¸';
            case 'Loading': return 'â³';
            case 'Not Attempted': return 'â­•';
            default: return 'â“';
        }
    }
    
    // Core script loading function with tracking
    function loadScript(options) {
        // Options: { src, successCheck, onSuccess, onError, retryDelay, debugName, globalVar, maxAttempts }
        
        // Extract filename for tracking
        var fileName = options.debugName || options.src.split('/').pop();
        var loadStartTime = Date.now();
        
        // Initialize tracking if not exists
        if (!tracker.files[fileName]) {
            tracker.files[fileName] = {
                path: options.src,
                status: 'Loading',
                version: null,
                attempts: 0,
                maxAttempts: options.maxAttempts || 3,
                loadStartTime: new Date().toISOString(),
                loadEndTime: null,
                loadDuration: null,
                globalVar: options.globalVar || null,
                errorDetails: null
            };
        }
        
        // Update tracking for this attempt
        var fileTracker = tracker.files[fileName];
        fileTracker.status = 'Loading';
        fileTracker.attempts++;
        fileTracker.loadStartTime = new Date().toISOString();
        updateTrackerSummary();
        
        var script = document.createElement('script');
        script.src = options.src;
        script.async = false;
        
        script.onload = function() {
            // Optional debug logging
            if (options.debugName && !options.silent) {
                console.log('âœ… ' + options.debugName + ' script loaded');
            }
            
            // Check if resource is available after a delay
            setTimeout(function() {
                if (!options.successCheck || options.successCheck()) {
                    // Mark as loaded and calculate duration
                    fileTracker.status = 'Loaded';
                    fileTracker.loadEndTime = new Date().toISOString();
                    fileTracker.loadDuration = Date.now() - loadStartTime;
                    
                    // Try to detect version
                    if (options.globalVar && window[options.globalVar]) {
                        detectFileVersion(fileName, options.globalVar);
                    }
                    
                    updateTrackerSummary();
                    
                    if (options.onSuccess) options.onSuccess();
                } else {
                    var errorMsg = options.debugName ? 
                        'âš ï¸ Script loaded but ' + options.debugName + ' still undefined' :
                        'âš ï¸ Script loaded but resource unavailable';
                    console.warn(errorMsg);
                    
                    // Update status for undefined resource
                    fileTracker.status = 'Failed';
                    fileTracker.errorDetails = 'Resource undefined after load';
                    fileTracker.loadEndTime = new Date().toISOString();
                    fileTracker.loadDuration = Date.now() - loadStartTime;
                    updateTrackerSummary();
                    
                    // Retry if specified
                    if (options.onRetry) {
                        setTimeout(options.onRetry, options.retryDelay || RETRY_DELAY_SHORT);
                    }
                }
            }, SCRIPT_CHECK_DELAY);
        };
        
        script.onerror = function() {
            // Track error status
            fileTracker.status = 'Not Found';
            fileTracker.errorDetails = 'Failed to load script';
            fileTracker.loadEndTime = new Date().toISOString();
            fileTracker.loadDuration = Date.now() - loadStartTime;
            updateTrackerSummary();
            
            if (options.onError) {
                options.onError();
            } else {
                console.error('âŒ Failed to load ' + (options.debugName || options.src));
                if (options.errorDetails !== false) {
                    console.log('ðŸ” Possible issues:');
                    console.log('   - File does not exist');
                    console.log('   - File path is incorrect');
                    console.log('   - Server not serving .js files correctly');
                    console.log('   - Network or CORS issues');
                }
            }
        };
        
        document.head.appendChild(script);
        return script;
    }
    
    // Function to detect file version from loaded module
    function detectFileVersion(fileName, globalVar) {
        var fileTracker = tracker.files[fileName];
        
        if (!fileTracker || !globalVar || !window[globalVar]) {
            return;
        }
        
        var obj = window[globalVar];
        
        // Try multiple version detection strategies
        
        // Strategy 1: Direct version property
        if (obj.version) {
            fileTracker.version = obj.version;
            return;
        }
        
        // Strategy 2: Module with getVersion function
        if (obj.getVersion && typeof obj.getVersion === 'function') {
            try {
                fileTracker.version = obj.getVersion();
                return;
            } catch(e) {
                // Continue to next strategy
            }
        }
        
        // Strategy 3: VERSION constant
        if (obj.VERSION) {
            fileTracker.version = obj.VERSION;
            return;
        }
        
        // Strategy 4: For rule modules, check standard properties
        if (obj.name && obj.name.includes('Rule')) {
            fileTracker.version = obj.version || 'Unknown';
            return;
        }
        
        // Default if no version found
        fileTracker.version = 'Unknown';
    }
    
    // Load suggestions-specific config
    function loadSuggestionsConfig(callback) {
        var configLoadAttempts = 0;
        var maxLoadAttempts = 3;
        
        function attemptLoad() {
            configLoadAttempts++;
            console.log('Config load attempt #' + configLoadAttempts);
            
            if (typeof dslSuggestionsConfigData !== 'undefined') {
                console.log('âœ… Config already loaded - dslSuggestionsConfigData available');
                if (callback) callback(true);
                return;
            }
            
            if (configLoadAttempts > maxLoadAttempts) {
                console.error('âŒ Maximum config load attempts exceeded');
                if (callback) callback(false);
                return;
            }
            
            console.log('ðŸ“¦ Loading dslSuggestionsConfig.js...');
            
            // v1.02 - Fixed path: config is in parent directory relative to HTML
            // v1.01 - Incorrect path (commented out)
            // loadScript({
            //     src: 'dslSuggestionsConfig.js',  // v1.01 - Wrong
            
            // v1.07 - loadScript({
            //     src: '../dslSuggestionsConfig.js',  // v1.02 - Correct: parent directory
            
            // v1.08 - Fixed for root level
            loadScript({
                src: 'dslSuggestionsConfig.js',  // v1.08 - Fixed: now at root
                debugName: 'dslSuggestionsConfig.js',
                globalVar: 'dslSuggestionsConfigData',
                maxAttempts: maxLoadAttempts,
                successCheck: function() {
                    return typeof dslSuggestionsConfigData !== 'undefined';
                },
                onSuccess: function() {
                    console.log('âœ… Config data successfully available:', dslSuggestionsConfigData.version || 'version unknown');
                    // Trigger a global event
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('dslSuggestionsConfigLoaded', { 
                            detail: dslSuggestionsConfigData 
                        }));
                    }
                    if (callback) callback(true);
                },
                onRetry: function() {
                    console.warn('âš ï¸ Script loaded but dslSuggestionsConfigData still undefined - retrying...');
                    setTimeout(attemptLoad, RETRY_DELAY_SHORT);
                },
                onError: function() {
                    console.error('âŒ Failed to load dslSuggestionsConfig.js');
                    // Retry with delay
                    if (configLoadAttempts < maxLoadAttempts) {
                        console.log('ðŸ”„ Retrying in 1 second... (attempt ' + (configLoadAttempts + 1) + '/' + maxLoadAttempts + ')');
                        setTimeout(attemptLoad, RETRY_DELAY_LONG);
                    } else {
                        if (callback) callback(false);
                    }
                }
            });
        }
        
        attemptLoad();
    }
    
    // Load rule utilities
    function loadRuleUtilities(callback) {
        console.log('ðŸ“¦ Loading dslRuleUtilities.js...');
        
        // v1.07 - loadScript({
        //     src: '../Rules/dslRuleUtilities.js',
        
        // v1.08 - Fixed for root level
        loadScript({
            src: 'Rules/dslRuleUtilities.js',  // v1.08 - Fixed: Rules is under root
            debugName: 'dslRuleUtilities.js',
            globalVar: 'DSLRuleUtils',
            maxAttempts: 1,
            successCheck: function() {
                return typeof window.DSLRuleUtils !== 'undefined';
            },
            onSuccess: function() {
                console.log('âœ… DSLRuleUtils successfully available');
                if (callback) callback(true);
            },
            onError: function() {
                console.error('âŒ Failed to load dslRuleUtilities.js');
                console.log('ðŸ” Possible issues:');
                // v1.08 - Updated error message
                console.log('   - File does not exist in Rules/ directory');
                console.log('   - Syntax error in dslRuleUtilities.js');
                // Continue anyway - rules have fallbacks
                if (callback) callback(false);
            }
        });
    }
    
    // Load individual rule module
    function loadRuleModule(fileName, globalVarName, callback) {
        console.log('ðŸ“¦ Loading ' + fileName + '...');
        
        var loadStartTime = Date.now();
        
        // Initialize tracking for this rule if not exists
        if (!tracker.files[fileName]) {
            tracker.files[fileName] = {
                // v1.07 - path: '../Rules/' + fileName,
                path: 'Rules/' + fileName,  // v1.08 - Fixed: Rules is under root
                status: 'Loading',
                version: null,
                attempts: 1,
                maxAttempts: 1,
                loadStartTime: new Date().toISOString(),
                loadEndTime: null,
                loadDuration: null,
                globalVar: globalVarName,
                errorDetails: null
            };
        } else {
            tracker.files[fileName].status = 'Loading';
            tracker.files[fileName].attempts++;
        }
        
        updateTrackerSummary();
        
        var script = document.createElement('script');
        // v1.07 - script.src = '../Rules/' + fileName;
        script.src = 'Rules/' + fileName;  // v1.08 - Fixed: Rules is under root
        script.async = false;
        
        script.onload = function() {
            console.log('âœ… ' + fileName + ' script loaded');
            
            setTimeout(function() {
                if (typeof window[globalVarName] !== 'undefined' && window[globalVarName] !== null) {
                    console.log('âœ… ' + globalVarName + ' successfully available:', 
                        window[globalVarName].version || 'version unknown');
                    
                    // Update tracking for successful load
                    var fileTracker = tracker.files[fileName];
                    fileTracker.status = 'Loaded';
                    fileTracker.loadEndTime = new Date().toISOString();
                    fileTracker.loadDuration = Date.now() - loadStartTime;
                    
                    // Detect version
                    detectFileVersion(fileName, globalVarName);
                    updateTrackerSummary();
                    
                    if (callback) callback(true);
                } else {
                    console.warn('âš ï¸ Script loaded but ' + globalVarName + ' still undefined');
                    
                    // Track failed load
                    var fileTracker = tracker.files[fileName];
                    fileTracker.status = 'Failed';
                    fileTracker.errorDetails = 'Global variable undefined after load';
                    fileTracker.loadEndTime = new Date().toISOString();
                    fileTracker.loadDuration = Date.now() - loadStartTime;
                    updateTrackerSummary();
                    
                    if (callback) callback(false);
                }
            }, 50);
        };
        
        script.onerror = function() {
            console.error('âŒ Failed to load ' + fileName);
            
            // Track error status
            var fileTracker = tracker.files[fileName];
            fileTracker.status = 'Not Found';
            fileTracker.errorDetails = 'Script load error';
            fileTracker.loadEndTime = new Date().toISOString();
            fileTracker.loadDuration = Date.now() - loadStartTime;
            updateTrackerSummary();
            
            if (callback) callback(false);
        };
        
        document.head.appendChild(script);
    }
    
    // v1.06 - Simplified: only loads dynamic rule files (registry and utilities loaded by engine)
    // Load all suggestion rules from the provided registry
    function loadSuggestionRules(ruleRegistry, callback) {
        console.log('ðŸš€ Loading suggestion rules...');
        
        // v1.06 - Registry and utilities are now loaded by engine
        // Just load the individual rule files from the registry
        
        if (!ruleRegistry || !Array.isArray(ruleRegistry)) {
            console.error('[Loader] Invalid or missing rule registry');
            if (callback) callback([]);
            return;
        }
        
        var rulesLoaded = 0;
        var totalRules = ruleRegistry.length;
        var loadedRules = [];
        
        // Helper to derive global var name
        function deriveGlobalVar(fileName) {
            var base = fileName.replace('.js', '');
            return base.charAt(0).toUpperCase() + base.slice(1);
        }
        
        console.log('[Loader] Loading ' + totalRules + ' rule files...');
        
        // Load each rule file
        for (var i = 0; i < ruleRegistry.length; i++) {
            var fileName = ruleRegistry[i];
            var globalVar = deriveGlobalVar(fileName);
            
            loadRuleModule(fileName, globalVar, function(success) {
                rulesLoaded++;
                
                if (success) {
                    loadedRules.push(fileName);
                }
                
                // Check if all rules processed
                if (rulesLoaded === totalRules) {
                    console.log('ðŸŽ‰ Rule loading complete. Loaded: ' + loadedRules.length + '/' + totalRules);
                    
                    // Fire event
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('dslRulesLoaded', { 
                            detail: { loaded: loadedRules, total: totalRules }
                        }));
                    }
                    
                    if (callback) callback(loadedRules);
                }
            });
        }
        
        // v1.04 - Old approach that loaded registry and utilities (commented out)
        // function loadRegistry(callback) {
        //     console.log('ðŸ“¦ Loading dslRuleRegistry.js...');
        //     loadRuleModule('dslRuleRegistry.js', 'RULE_REGISTRY', function(success) {
        //         if (success) {
        //             console.log('âœ… Rule registry loaded successfully');
        //         } else {
        //             console.warn('âš ï¸ Rule registry failed to load, continuing anyway');
        //         }
        //         if (callback) callback();
        //     });
        // }
        // 
        // loadRegistry(function() {
        //     loadRuleUtilities(function() {
        //         // Load each rule...
        //     });
        // });
    }
    
    // Public API functions
    
    // Get complete loading status
    function getStatus() {
        return JSON.parse(JSON.stringify(tracker));
    }
    
    // Get status for specific file
    function getFileStatus(fileName) {
        if (!fileName) return null;
        
        // Check with exact name first
        if (tracker.files[fileName]) {
            return JSON.parse(JSON.stringify(tracker.files[fileName]));
        }
        
        // Try with .js extension
        if (!fileName.endsWith('.js')) {
            var fileNameWithExt = fileName + '.js';
            if (tracker.files[fileNameWithExt]) {
                return JSON.parse(JSON.stringify(tracker.files[fileNameWithExt]));
            }
        }
        
        return null;
    }
    
    // Get summary statistics
    function getSummary() {
        updateTrackerSummary();
        return JSON.parse(JSON.stringify(tracker.summary));
    }
    
    // Get formatted report
    function getReport() {
        var report = [];
        report.push('=== DSL Rule Module Loader Status Report ===');
        report.push('Loader Version: v' + MODULE_VERSION);
        report.push('Report Time: ' + new Date().toISOString());
        report.push('');
        
        updateTrackerSummary();
        var summary = tracker.summary;
        report.push('Summary:');
        report.push('  Total Files: ' + summary.totalFiles);
        report.push('  âœ… Loaded: ' + summary.loaded);
        report.push('  âŒ Failed: ' + summary.failed);
        report.push('  âš ï¸ Not Found: ' + summary.notFound);
        report.push('  â³ Loading: ' + summary.loading);
        report.push('  â­• Not Attempted: ' + summary.notAttempted);
        report.push('');
        
        report.push('File Details:');
        for (var fileName in tracker.files) {
            var file = tracker.files[fileName];
            var statusIcon = getStatusIcon(file.status);
            
            report.push('  ' + statusIcon + ' ' + fileName);
            report.push('    Status: ' + file.status);
            report.push('    Version: ' + (file.version || 'N/A'));
            report.push('    Attempts: ' + file.attempts + '/' + file.maxAttempts);
            
            if (file.loadDuration !== null) {
                report.push('    Load Time: ' + file.loadDuration + 'ms');
            }
            
            if (file.errorDetails) {
                report.push('    Error: ' + file.errorDetails);
            }
        }
        
        return report.join('\n');
    }
    
    // Show console table
    function showTable() {
        var tableData = [];
        
        for (var fileName in tracker.files) {
            var file = tracker.files[fileName];
            tableData.push({
                'File': fileName,
                'Status': getStatusIcon(file.status) + ' ' + file.status,
                'Version': file.version || '-',
                'Attempts': file.attempts + '/' + file.maxAttempts,
                'Load Time': file.loadDuration !== null ? file.loadDuration + 'ms' : '-'
            });
        }
        
        if (tableData.length > 0) {
            console.table(tableData);
        } else {
            console.log('No files tracked yet');
        }
        
        console.log('Summary:', getSummary());
    }
    
    // Check if file is loaded
    function isLoaded(fileName) {
        var status = getFileStatus(fileName);
        return status && status.status === 'Loaded';
    }
    
    // Get file versions
    function getVersions() {
        var versions = {};
        for (var fileName in tracker.files) {
            var file = tracker.files[fileName];
            versions[fileName] = file.version || 'Unknown';
        }
        return versions;
    }
    
    // Return public API
    return {
        // Module info
        version: MODULE_VERSION,
        
        // Core loading functions
        loadScript: loadScript,
        loadSuggestionsConfig: loadSuggestionsConfig,
        loadSuggestionRules: loadSuggestionRules,
        
        // Tracking API
        getStatus: getStatus,
        getFileStatus: getFileStatus,
        getSummary: getSummary,
        getReport: getReport,
        showTable: showTable,
        
        // Query functions
        isLoaded: isLoaded,
        getVersions: getVersions,
        
        // Direct tracker access (for debugging)
        getTracker: function() { return tracker; }
    };
})();

// Export to window if available
if (typeof window !== 'undefined') {
    window.DSLRuleModuleLoader = DSLRuleModuleLoader;
}