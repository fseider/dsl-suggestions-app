/*
 * FILE: dslSuggestionsApp.js
 * VERSION: v2.10
 * LAST UPDATED: 2025-01-09
 * 
 * ARTIFACT INFO (for proper Claude artifact creation):
 * - ID: dslSuggestionsApp.js
 * - Title: dslSuggestionsApp
 * - Type: application/vnd.ant.code (language: javascript)
 * 
 * ARCHITECTURAL BOUNDARY: Suggestions
 * AUTO-LOADED BY: dslSuggestionsApp.html
 * PROVIDES: getSuggestions(), showAllPossibleSuggestions(), debugExtraneousBlock(), clearSuggestionInput(), copyToClipboard(), dslSuggestionsAppVersion(), showVersionPopup(), closeVersionPopup(), updateSuggestionDisplay()
 * 
 * DESCRIPTION:
 * JavaScript logic for standalone DSL Suggestions application.
 * Handles user interactions, suggestion generation, and clipboard operations.
 * Provides clean interface for testing DSL code suggestions functionality.
 * Added debugging function for extraneousBlock rule troubleshooting.
 * v2.02: Added version popup display functionality.
 * v2.07: Updated functions to work with HTML divs instead of textareas for red SUGGESTION text support.
 * v2.08: Removed app interference - now displays engine output directly without modification.
 * v2.09: Added updateSuggestionDisplay function to control which suggestion forms are shown.
 * v2.10: Fixed critical bug - moved global function exposure out of catch block to proper location.
 */

// App version
// v2.09 - Added suggestion display control
// var DSL_SUGGESTIONS_APP_VERSION = '2.09';

// v2.10 - Fixed function exposure bug
var DSL_SUGGESTIONS_APP_VERSION = '2.10';

function dslSuggestionsAppVersion() {
    return 'v' + DSL_SUGGESTIONS_APP_VERSION;
}

// v2.09 - Store original suggestions for filtering
var originalSuggestions = '';

// v3.03 - Store original input code for reapplying with different forms
var originalInputCode = '';

// v2.13 - Store last valid checkbox state
var lastCheckboxState = {
    traditional: true,
    method: true
};

// v2.13 - Validate checkbox before change
function validateCheckbox(checkboxId) {
    var traditionalCheckbox = document.getElementById('showTraditionalForm');
    var methodCheckbox = document.getElementById('showMethodForm');
    
    // Determine which checkbox is being changed
    var isTraditional = (checkboxId === 'showTraditionalForm');
    var otherCheckbox = isTraditional ? methodCheckbox : traditionalCheckbox;
    var thisCheckbox = isTraditional ? traditionalCheckbox : methodCheckbox;
    
    // If the other checkbox is unchecked and this one is being unchecked, prevent it
    if (!otherCheckbox.checked && !thisCheckbox.checked) {
        // Revert this checkbox to checked
        thisCheckbox.checked = true;
        // Optionally show a message
        // alert('At least one display form must be selected');
        return false;
    }
    
    // Update last valid state
    lastCheckboxState.traditional = traditionalCheckbox.checked;
    lastCheckboxState.method = methodCheckbox.checked;
    
    return true;
}

// v2.13 - Simplified update function
function updateSuggestionDisplay(checkboxId) {
    // Validate the change
    if (!validateCheckbox(checkboxId)) {
        return; // Change was rejected
    }
    
    var traditionalCheckbox = document.getElementById('showTraditionalForm');
    var methodCheckbox = document.getElementById('showMethodForm');
    
    var showTraditional = traditionalCheckbox.checked;
    var showMethod = methodCheckbox.checked;
    
    // If we don't have original suggestions, get current content
    if (!originalSuggestions) {
        var outputElement = document.getElementById('suggestionOutput');
        if (outputElement) {
            originalSuggestions = outputElement.innerHTML;
        }
    }
    
    if (!originalSuggestions) return;
    
    // Filter suggestions based on selection
    var filteredContent = filterSuggestionForms(originalSuggestions, showTraditional, showMethod);
    setElementContent('suggestionOutput', filteredContent);
}

// v2.11 - Simplified and fixed filtering function
function filterSuggestionForms(content, showTraditional, showMethod) {
    // If both are selected, return original
    if (showTraditional && showMethod) {
        return content;
    }
    
    // Split content into lines
    var lines = content.split('\n');
    var filteredLines = [];
    var inSuggestion = false;
    var suggestionLines = [];
    var suggestionIndent = '';
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        
        // Check if starting a SUGGESTION comment
        if (line.includes('/* ') && line.includes('SUGGESTION')) {
            inSuggestion = true;
            suggestionLines = [line];
            // Capture indent for this suggestion
            suggestionIndent = line.match(/^(\s*)/)[1] || '';
            
            // Check if it's a single-line suggestion
            if (line.includes('*/')) {
                // Single line suggestion - process it
                inSuggestion = false;
                var processed = processSuggestionBlock(suggestionLines, showTraditional, showMethod, suggestionIndent);
                filteredLines = filteredLines.concat(processed);
                suggestionLines = [];
            }
        } else if (inSuggestion) {
            // Collecting multi-line suggestion
            suggestionLines.push(line);
            
            // Check if this ends the suggestion
            if (line.includes('*/')) {
                inSuggestion = false;
                // Process the complete suggestion block
                var processed = processSuggestionBlock(suggestionLines, showTraditional, showMethod, suggestionIndent);
                filteredLines = filteredLines.concat(processed);
                suggestionLines = [];
            }
        } else {
            // Not in a suggestion, keep the line
            filteredLines.push(line);
        }
    }
    
    return filteredLines.join('\n');
}

// v2.11 - Process a complete suggestion block
function processSuggestionBlock(lines, showTraditional, showMethod, baseIndent) {
    // If showing both, return as-is
    if (showTraditional && showMethod) {
        return lines;
    }
    
    var result = [];
    var hasDescription = false;
    var traditionalLine = null;
    var methodLine = null;
    var orLine = null;
    
    // Analyze the lines
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmed = line.trim();
        
        // First line with SUGGESTION is always kept (it's the description)
        if (line.includes('SUGGESTION')) {
            result.push(line);
            hasDescription = true;
        } else if (trimmed === 'OR') {
            orLine = i;
        } else if (trimmed.startsWith('ifNaN(') || trimmed.startsWith('ifNull(')) {
            // Traditional form
            traditionalLine = line;
        } else if (trimmed.startsWith('(') && (trimmed.includes(').ifNaN(') || trimmed.includes(').ifNull('))) {
            // Method form
            methodLine = line;
        } else if (trimmed === '*/') {
            // Closing line - will add at end
        } else if (trimmed !== '') {
            // Other content (might be part of description or traditional form)
            // Check if it's before OR - likely traditional
            if (orLine === null || i < orLine) {
                if (!traditionalLine && (line.includes('ifNaN(') || line.includes('ifNull('))) {
                    traditionalLine = line;
                }
            }
        }
    }
    
    // Build the filtered result
    if (showTraditional && !showMethod) {
        // Show only traditional
        if (traditionalLine) {
            result.push(traditionalLine);
        }
    } else if (!showTraditional && showMethod) {
        // Show only method
        if (methodLine) {
            result.push(methodLine);
        }
    }
    
    // Add closing */ if needed
    var lastLine = lines[lines.length - 1];
    if (lastLine.includes('*/')) {
        result.push(lastLine);
    }
    
    return result;
}

// v2.07 - Helper function to set content (detects div vs textarea)
function setElementContent(elementId, content) {
    var element = document.getElementById(elementId);
    if (!element) {
        console.error('Element not found:', elementId);
        return;
    }
    
    // Check if element is a div (supports HTML) or textarea (plain text only)
    if (element.tagName.toLowerCase() === 'div') {
        element.innerHTML = content;
    } else {
        element.value = content;
    }
}

// v2.07 - Helper function to get content (detects div vs textarea)
function getElementContent(elementId) {
    var element = document.getElementById(elementId);
    if (!element) {
        console.error('Element not found:', elementId);
        return '';
    }
    
    // Check if element is a div or textarea
    if (element.tagName.toLowerCase() === 'div') {
        return element.innerHTML;
    } else {
        return element.value;
    }
}

// Handle script loading errors
function handleScriptError(scriptName) {
    console.error('Failed to load script:', scriptName);
    alert('Failed to load ' + scriptName + '. Please check that the file exists.');
}

// Main function to get suggestions and populate outputs
function getSuggestions() {
    var code = document.getElementById('suggestionInput').value;

    if (!code.trim()) {
        alert('Please enter some code to analyze.');
        return;
    }

    // v3.03 - Store original input code for reapplying with different forms
    originalInputCode = code;

    try {
        // Generate suggestions showing BOTH forms
        if (typeof generateCodeSuggestions === 'function') {
            var suggestions = generateSuggestionsWithBothForms(code);
            setElementContent('suggestionOutput', suggestions);
        } else {
            setElementContent('suggestionOutput', 'Suggestions functionality not loaded.');
        }

        // Generate applied suggestions with selected form
        updateAppliedSuggestions();

    } catch (error) {
        console.error('Error in getSuggestions:', error);
        alert('Error generating suggestions: ' + error.message);
    }
}

// v3.03 - Generate suggestions showing both Traditional and Method forms
function generateSuggestionsWithBothForms(code) {
    if (!code || typeof analyzeDSL !== 'function') {
        return 'Analysis functionality not loaded.';
    }

    // Get raw analysis results
    var analysis = analyzeDSL(code);
    if (!analysis || !analysis.suggestions || analysis.suggestions.length === 0) {
        return 'No suggestions found. Code looks good!';
    }

    // Build output showing both forms
    var lines = code.split('\n');
    var result = [];

    for (var i = 0; i < lines.length; i++) {
        result.push(lines[i]);

        // Find suggestions for this line
        var lineSuggestions = analysis.suggestions.filter(function(s) {
            return s.line === i + 1;
        });

        // For each suggestion, show based on whether it's fixable and has different forms
        for (var j = 0; j < lineSuggestions.length; j++) {
            var suggestion = lineSuggestions[j];
            var indent = getIndent(lines[i]);
            var label = suggestion.label || suggestion.rule || 'General';

            if (suggestion.fixable && suggestion.hasDifferentForms) {
                // Fixable rules with different Traditional/Method forms
                result.push(indent + '/* SUGGESTION - ' + label + ' (Traditional): ' + suggestion.message + ' */');
                result.push(indent + '/* SUGGESTION - ' + label + ' (Method): ' + suggestion.message + ' */');
            } else {
                // Advisory rules OR fixable rules with single form
                result.push(indent + '/* SUGGESTION - ' + label + ': ' + suggestion.message + ' */');
            }
        }
    }

    return result.join('\n');
}

// v3.03 - Update applied suggestions based on selected form
function updateAppliedSuggestions() {
    if (!originalInputCode) {
        return;
    }

    try {
        // Get selected form
        var traditionalRadio = document.getElementById('showTraditionalForm');
        var selectedForm = (traditionalRadio && traditionalRadio.checked) ? 'traditional' : 'method';

        // Set form selection for engine to use
        if (typeof window !== 'undefined') {
            window.__forceFormSelection = selectedForm;
        }

        // Apply auto-fixes with selected form
        if (typeof applyCodeSuggestions === 'function') {
            var appliedSuggestions = applyCodeSuggestions(originalInputCode);
            setElementContent('suggestionsApplied', appliedSuggestions);
        } else {
            setElementContent('suggestionsApplied', 'Auto-apply functionality not loaded.');
        }

        // Clear form selection override
        if (typeof window !== 'undefined') {
            delete window.__forceFormSelection;
        }

    } catch (error) {
        console.error('Error updating applied suggestions:', error);
    }
}

// Helper function to get line indentation
function getIndent(line) {
    var match = line.match(/^(\s*)/);
    return match ? match[1] : '';
}

// Debug function to test extraneousBlock detection specifically
function debugExtraneousBlock() {
    var code = document.getElementById('suggestionInput').value;
    
    if (!code.trim()) {
        alert('Please enter some code to debug.');
        return;
    }
    
    console.log('Debugging extraneousBlock rule with code:', code);
    
    try {
        // Check if suggestions engine is loaded
        if (typeof dslSuggestionsConfigData === 'undefined') {
            alert('DSL Suggestions Config not loaded');
            return;
        }
        
        // Look for the extraneousBlock rule
        var extraneousBlockRule = dslSuggestionsConfigData.suggestionRules.extraneousBlocks;
        if (!extraneousBlockRule) {
            alert('extraneousBlocks rule not found in config');
            return;
        }
        
        console.log('extraneousBlocks rule:', extraneousBlockRule);
        
        // Test the pattern manually
        if (extraneousBlockRule.pattern) {
            var regex = new RegExp(extraneousBlockRule.pattern, 'gm');
            var matches = code.match(regex);
            console.log('Pattern matches:', matches);
            
            if (matches) {
                alert('Debug: Found ' + matches.length + ' potential extraneousBlocks matches:\n' + matches.join('\n'));
            } else {
                alert('Debug: No extraneousBlocks pattern matches found');
            }
        } else {
            alert('extraneousBlocks rule has no pattern defined');
        }
        
    } catch (error) {
        console.error('Debug error:', error);
        alert('Debug error: ' + error.message);
    }
}

// Demo functions for testing specific scenarios
function demonstrateContinuousExpressions() {
    var demoCode = 'var result = value1 * value2 + value3 * value4;\n' +
                   'var calculation = (a + b) * (c + d);\n' +
                   'return complexFunction(param1, param2, param3);';
    
    document.getElementById('suggestionInput').value = demoCode;
    getSuggestions();
}

function demonstrateNullProtection() {
    var demoCode = 'var data = userInput.data;\n' +
                   'var result = data.property * 2;\n' +
                   'return result + otherValue;';
    
    document.getElementById('suggestionInput').value = demoCode;
    getSuggestions();
}

function demonstrateMathOperations() {
    var demoCode = 'var result = value / divisor;\n' +
                   'var calculation = a + b * c;\n' +
                   'return (x + y) / (z - w);';
    
    document.getElementById('suggestionInput').value = demoCode;
    getSuggestions();
}

// Show all possible suggestions from the config
function showAllPossibleSuggestions() {
    // v2.09 - Reset original suggestions when showing all
    originalSuggestions = '';
    
    if (typeof dslSuggestionsConfigData === 'undefined') {
        // v2.07: Use helper function for div/textarea compatibility
        setElementContent('suggestionOutput', 'DSL Suggestions Config not loaded.');
        return;
    }
    
    var rules = dslSuggestionsConfigData.suggestionRules;
    var output = 'DSL SUGGESTIONS REFERENCE - All Possible Suggestions:\n';
    output += '================================================================\n\n';
    
    var ruleIndex = 1;
    for (var ruleName in rules) {
        if (rules.hasOwnProperty(ruleName)) {
            var rule = rules[ruleName];
            
            output += ruleIndex + '. ' + ruleName.toUpperCase() + ' (' + (rule.suggestionType || 'unknown') + ')\n';
            output += '   Description: ' + (rule.description || 'No description available') + '\n';
            output += '   Suggestion: ' + (rule.suggestion || 'No suggestion message defined') + '\n';
            output += '   Status: ' + (rule.enabled ? 'ENABLED' : 'DISABLED') + '\n';
            
            // Add pattern/function info if available
            if (rule.pattern) {
                output += '   Detects: Code matching pattern /' + rule.pattern + '/\n';
            } else if (rule.patterns && rule.patterns.length > 0) {
                output += '   Detects: ' + rule.patterns.join(', ') + '\n';
            } else if (rule.functions && rule.functions.length > 0) {
                output += '   Detects: Functions: ' + rule.functions.join(', ') + '\n';
            }
            
            // Add auto-fix info if available
            if (rule.autoFix) {
                output += '   Auto-Fix: ' + (rule.autoFixEnabled !== false ? 'AVAILABLE' : 'DISABLED') + '\n';
                if (rule.replacement) {
                    output += '   Fix Template: ' + rule.replacement + '\n';
                }
            }
            
            output += '\n';
            ruleIndex++;
        }
    }
    
    output += '================================================================\n';
    output += 'Total Rules: ' + (ruleIndex - 1) + '\n';
    output += 'Config Version: ' + dslSuggestionsConfigData.version + '\n';
    output += 'Last Updated: ' + dslSuggestionsConfigData.lastUpdated + '\n\n';
    
    output += 'USAGE:\n';
    output += '- Enter DSL code in the input area above\n';
    output += '- Click "Get Suggestions" to analyze your code\n';
    output += '- Review suggestions for optimization opportunities\n';
    output += '- Check "Suggestions Applied" for auto-fixed code\n';
    
    // v2.07: Use helper function for div/textarea compatibility
    setElementContent('suggestionOutput', output);
    setElementContent('suggestionsApplied', '');
    
    // v2.09 - Store as original
    originalSuggestions = output;
}

// Clear the suggestion input and outputs
function clearSuggestionInput() {
    document.getElementById('suggestionInput').value = '';
    // v2.07: Use helper function for div/textarea compatibility
    setElementContent('suggestionOutput', '');
    setElementContent('suggestionsApplied', '');
    
    // v2.09 - Clear original suggestions
    originalSuggestions = '';
    // v2.14 - Clear original applied suggestions
    originalAppliedSuggestions = '';
    // v2.16 - Clear stored input code
    lastInputCode = '';
}

// Copy content to clipboard
function copyToClipboard(elementId) {
    var element = document.getElementById(elementId);
    if (!element) {
        console.error('Element not found for copy:', elementId);
        return;
    }
    
    try {
        var textToCopy = '';
        
        // v2.07: Handle both div and textarea elements
        if (element.tagName.toLowerCase() === 'div') {
            // For divs, get text content (strips HTML)
            textToCopy = element.textContent || element.innerText;
        } else {
            // For textareas, use value
            textToCopy = element.value;
        }
        
        // Use modern clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(function() {
                showCopyFeedback(element);
            }).catch(function(err) {
                console.error('Failed to copy with clipboard API: ', err);
                fallbackCopy(element, textToCopy);
            });
        } else {
            fallbackCopy(element, textToCopy);
        }
        
    } catch (err) {
        console.error('Failed to copy: ', err);
        alert('Copy to clipboard failed: ' + err.message);
    }
}

// v2.07: Fallback copy method for older browsers
function fallbackCopy(element, textToCopy) {
    // Create a temporary textarea for copying
    var tempTextarea = document.createElement('textarea');
    tempTextarea.value = textToCopy;
    tempTextarea.style.position = 'fixed';
    tempTextarea.style.opacity = '0';
    document.body.appendChild(tempTextarea);
    
    try {
        tempTextarea.select();
        tempTextarea.setSelectionRange(0, 99999); // For mobile devices
        
        var success = document.execCommand('copy');
        if (success) {
            showCopyFeedback(element);
        } else {
            alert('Copy to clipboard not supported in this browser');
        }
    } catch (err) {
        console.error('Fallback copy failed: ', err);
        alert('Copy to clipboard failed');
    } finally {
        document.body.removeChild(tempTextarea);
    }
}

// v2.07: Visual feedback for copy operation
function showCopyFeedback(element) {
    var originalBg = element.style.backgroundColor;
    element.style.backgroundColor = '#e8f5e8';
    setTimeout(function() {
        element.style.backgroundColor = originalBg;
    }, 200);
}

// Initialize version display when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Update version displays
    if (document.getElementById('appJsVersion')) {
        document.getElementById('appJsVersion').textContent = dslSuggestionsAppVersion();
    }
    
    // Display other versions if functions are available
    setTimeout(function() {
        if (typeof dslSuggestionsVersion === 'function' && document.getElementById('suggestionsEngineVersion')) {
            document.getElementById('suggestionsEngineVersion').textContent = dslSuggestionsVersion();
        }
        
        if (typeof getSuggestionsConfigVersion === 'function' && document.getElementById('suggestionsConfigVersion')) {
            document.getElementById('suggestionsConfigVersion').textContent = getSuggestionsConfigVersion();
        }
        
        // CSS version (if available)
        if (document.getElementById('appCssVersion')) {
            document.getElementById('appCssVersion').textContent = 'v2.01';
        }
    }, 100);
    
    // v2.02 - Added keyboard support for popup
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            var popup = document.getElementById('versionPopup');
            if (popup && popup.style.display === 'flex') {
                closeVersionPopup();
            }
        }
    });
});

// v2.10 - CRITICAL FIX: Properly expose functions to global scope
// v2.11 - Added regenerateAppliedSuggestions to exports
// This MUST be at the file's top level, not inside any function
if (typeof window !== 'undefined') {
    window.updateSuggestionDisplay = updateSuggestionDisplay;
    window.regenerateAppliedSuggestions = regenerateAppliedSuggestions;
    window.updateAppliedSuggestions = updateAppliedSuggestions;  // v3.03 - New function for radio control
    window.getSuggestions = getSuggestions;
    window.clearSuggestionInput = clearSuggestionInput;
    window.copyToClipboard = copyToClipboard;
    window.showAllPossibleSuggestions = showAllPossibleSuggestions;
    window.dslSuggestionsAppVersion = dslSuggestionsAppVersion;
    window.debugExtraneousBlock = debugExtraneousBlock;
    window.handleScriptError = handleScriptError;
    
    // Demo functions
    window.demonstrateContinuousExpressions = demonstrateContinuousExpressions;
    window.demonstrateNullProtection = demonstrateNullProtection;
    window.demonstrateMathOperations = demonstrateMathOperations;
    
    console.log('[App v2.12] Functions exposed to global scope - persistent form selection enabled');
}