/*
 * FILE: dslSuggestionsApp.js
 * VERSION: v2.11
 * LAST UPDATED: 2025-11-04
 * 
 * ARTIFACT INFO (for proper Claude artifact creation):
 * - ID: dslSuggestionsApp.js
 * - Title: dslSuggestionsApp
 * - Type: application/vnd.ant.code (language: javascript)
 * 
 * ARCHITECTURAL BOUNDARY: Suggestions
 * AUTO-LOADED BY: dslSuggestionsApp.html
 * PROVIDES: getSuggestions(), showAllPossibleSuggestions(), closeRulesPopup(), copyRuleExample(), debugExtraneousBlock(), clearSuggestionInput(), copyToClipboard(), dslSuggestionsAppVersion(), updateDisplayForm(), updateAppliedSuggestions()
 * 
 * DESCRIPTION:
 * JavaScript logic for standalone DSL Suggestions application.
 * Handles user interactions, suggestion generation, and clipboard operations.
 * Provides clean interface for testing DSL code suggestions functionality.
 * Added debugging function for extraneousBlock rule troubleshooting.
 * v2.02: Added version popup display functionality.
 * v2.07: Updated functions to work with HTML divs instead of textareas for red SUGGESTION text support.
 * v2.08: Removed app interference - now displays engine output directly without modification.
 * v2.10: Fixed critical bug - moved global function exposure out of catch block to proper location.
 * v2.11: Code cleanup - removed unused checkbox validation code (v3.41+ uses radio buttons)
 */

// App version v2.10 - Fixed function exposure bug
var DSL_SUGGESTIONS_APP_VERSION = '2.10';

function dslSuggestionsAppVersion() {
    return 'v' + DSL_SUGGESTIONS_APP_VERSION;
}

// v3.03 - Store original input code for reapplying with different forms
var originalInputCode = '';

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
        // Generate suggestions with color coding and applied suggestions
        if (typeof generateCodeSuggestions === 'function') {
            // Generate HTML version with color coding using selected form
            updateHtmlOutput();
        } else {
            document.getElementById('htmlOutput').innerHTML = 'Suggestions functionality not loaded.';
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

// v3.20 - Generate suggestions with HTML color coding and distinct colors per rule instance
function generateSuggestionsWithColorCoding(code, selectedForm) {
    if (!code || typeof analyzeDSL !== 'function') {
        return 'Analysis functionality not loaded.';
    }

    // Default to traditional if not specified
    selectedForm = selectedForm || 'traditional';

    // Get raw analysis results
    var analysis = analyzeDSL(code);
    if (!analysis || !analysis.suggestions || analysis.suggestions.length === 0) {
        return 'No suggestions found. Code looks good!';
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // Helper function to convert **text** to colored spans with specific color
    function highlightObjects(text, colorIndex) {
        return text.replace(/\*\*([^*]+)\*\*/g, '<span class="highlight-object-' + colorIndex + '">$1</span>');
    }

    // Helper function to extract objects from **markers** in text
    function extractHighlightedObjects(text) {
        var objects = [];
        var regex = /\*\*([^*]+)\*\*/g;
        var match;
        while ((match = regex.exec(text)) !== null) {
            objects.push(match[1]);
        }
        return objects;
    }

    // Helper function to colorize code line with object->color mapping
    function colorizeCodeLine(line, objectColorMap) {
        var escapedLine = escapeHtml(line);

        // Sort objects by length (longest first) to avoid partial replacements
        var objectsToReplace = Object.keys(objectColorMap).sort(function(a, b) {
            return b.length - a.length;
        });

        for (var i = 0; i < objectsToReplace.length; i++) {
            var obj = objectsToReplace[i];
            var colorIndex = objectColorMap[obj];

            // Create a regex that matches the object as a whole word (with word boundaries)
            var regex = new RegExp('\\b' + obj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
            escapedLine = escapedLine.replace(regex, '<span class="highlight-object-' + colorIndex + '">' + obj + '</span>');
        }

        return escapedLine;
    }

    // Track rule instance counts for color cycling
    var ruleInstanceCount = {};

    // Build output showing both forms with color coding
    var lines = code.split('\n');
    var result = [];

    for (var i = 0; i < lines.length; i++) {
        // Find suggestions for this line
        var lineSuggestions = analysis.suggestions.filter(function(s) {
            return s.line === i + 1;
        });

        // Build object -> color mapping for this line
        var objectColorMap = {};
        var suggestionData = [];

        for (var j = 0; j < lineSuggestions.length; j++) {
            var suggestion = lineSuggestions[j];
            var ruleName = suggestion.rule || 'unknown';

            // Track instance count for this rule
            if (!ruleInstanceCount[ruleName]) {
                ruleInstanceCount[ruleName] = 0;
            }
            ruleInstanceCount[ruleName]++;

            // Calculate color index (cycle through 6 colors: 1-6)
            var colorIndex = ((ruleInstanceCount[ruleName] - 1) % 6) + 1;

            // Extract highlighted objects from the message
            var highlightedObjects = extractHighlightedObjects(suggestion.message);
            for (var k = 0; k < highlightedObjects.length; k++) {
                objectColorMap[highlightedObjects[k]] = colorIndex;
            }

            // Store suggestion data for later output
            suggestionData.push({
                suggestion: suggestion,
                colorIndex: colorIndex
            });
        }

        // Output the code line with color coding
        result.push(colorizeCodeLine(lines[i], objectColorMap));

        // Output the suggestions
        for (var j = 0; j < suggestionData.length; j++) {
            var data = suggestionData[j];
            var suggestion = data.suggestion;
            var colorIndex = data.colorIndex;
            var indent = getIndent(lines[i]);
            var label = suggestion.label || suggestion.rule || 'General';

            // Escape HTML but preserve ** markers for highlighting
            var message = escapeHtml(suggestion.message);
            message = highlightObjects(message, colorIndex);

            if (suggestion.fixable && suggestion.hasDifferentForms) {
                // Fixable rules with different Traditional/Method forms - show only selected form
                var formLabel = selectedForm === 'traditional' ? 'Traditional' : 'Method';
                result.push(indent + '/* SUGGESTION - ' + label + ' (' + formLabel + '): ' + message + ' */');
            } else {
                // Advisory rules OR fixable rules with single form
                result.push(indent + '/* SUGGESTION - ' + label + ': ' + message + ' */');
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

// Update HTML output with color coding based on selected form
function updateHtmlOutput() {
    if (!originalInputCode) {
        return;
    }

    try {
        // Get selected form
        var traditionalRadio = document.getElementById('showTraditionalForm');
        var selectedForm = (traditionalRadio && traditionalRadio.checked) ? 'traditional' : 'method';

        // Generate HTML version with color coding
        var htmlSuggestions = generateSuggestionsWithColorCoding(originalInputCode, selectedForm);
        document.getElementById('htmlOutput').innerHTML = htmlSuggestions;

    } catch (error) {
        console.error('Error updating HTML output:', error);
    }
}

// Update both HTML and applied suggestions when form selection changes
function updateDisplayForm() {
    updateHtmlOutput();
    updateAppliedSuggestions();
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
    if (typeof dslSuggestionsConfigData === 'undefined') {
        alert('DSL Suggestions Config not loaded.');
        return;
    }

    var rules = dslSuggestionsConfigData.suggestionRules;

    // Use examples from dslExamples.js (loaded separately for easy editing)
    var ruleExamples = window.dslExamples || {};

    var popupBody = document.getElementById('rulesPopupBody');
    popupBody.innerHTML = '';

    var ruleIndex = 1;
    var ruleOrder = ['divisionOperations', 'queryFunctions', 'uniqueKey', 'variableNaming',
                     'nonOptimalNodeAccess', 'nullAccessProtection', 'mathOperationsParens', 'extraneousBlocks'];

    for (var i = 0; i < ruleOrder.length; i++) {
        var ruleName = ruleOrder[i];
        if (!rules.hasOwnProperty(ruleName)) continue;

        var rule = rules[ruleName];
        var example = ruleExamples[ruleName] || '// No example available';

        var ruleCard = document.createElement('div');
        ruleCard.className = 'rule-card';

        var statusClass = rule.enabled ? 'enabled' : 'disabled';
        var statusText = rule.enabled ? 'ENABLED' : 'DISABLED';

        // Remove **markers** from suggestion message for display
        var displayMessage = (rule.suggestion || 'No suggestion message defined').replace(/\*\*/g, '');

        ruleCard.innerHTML = `
            <div class="rule-header">
                <div class="rule-title">${ruleIndex}. ${rule.label || ruleName}</div>
                <div class="rule-status ${statusClass}">${statusText}</div>
            </div>
            <div class="rule-description">${rule.description || 'No description available'}</div>
            <div class="rule-message"><strong>Suggestion:</strong> ${displayMessage}</div>
            <div class="rule-example-section">
                <div class="rule-example-header">
                    <span>Example Code:</span>
                    <button class="copy-example-btn" onclick="copyRuleExample('${ruleName}')">Copy Example</button>
                </div>
                <div class="rule-example-code" id="example-${ruleName}">${example}</div>
            </div>
        `;

        popupBody.appendChild(ruleCard);
        ruleIndex++;
    }

    // Show the popup
    document.getElementById('rulesPopup').style.display = 'flex';

    // Store examples for copying (use dslExamples directly)
    window.ruleExamplesData = window.dslExamples || ruleExamples;
}

function closeRulesPopup() {
    document.getElementById('rulesPopup').style.display = 'none';
}

function copyRuleExample(ruleName) {
    if (!window.ruleExamplesData || !window.ruleExamplesData[ruleName]) {
        alert('Example not found');
        return;
    }

    var exampleText = window.ruleExamplesData[ruleName];

    // Create temporary textarea to copy text
    var tempTextarea = document.createElement('textarea');
    tempTextarea.value = exampleText;
    tempTextarea.style.position = 'fixed';
    tempTextarea.style.opacity = '0';
    document.body.appendChild(tempTextarea);
    tempTextarea.select();

    try {
        document.execCommand('copy');

        // Visual feedback
        var btn = event.target;
        var originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#28a745';

        // Close popup after brief delay
        setTimeout(function() {
            closeRulesPopup();
        }, 500);
    } catch (err) {
        alert('Failed to copy example');
    }

    document.body.removeChild(tempTextarea);
}

// Copy all rule examples aggregated together
function copyAllExamples() {
    // Get examples from dslExamples.js (loaded separately for easy editing)
    if (typeof window.dslExamples === 'undefined') {
        alert('Examples not loaded. Please refresh the page.');
        return;
    }

    var ruleExamples = window.dslExamples;

    // Aggregate all examples in order
    var ruleOrder = ['divisionOperations', 'queryFunctions', 'uniqueKey', 'variableNaming',
                     'nonOptimalNodeAccess', 'nullAccessProtection', 'mathOperationsParens', 'extraneousBlocks'];

    // Start with outer block and header
    var allExamples = 'block(\n';
    allExamples += '    /* ========================================\n';
    allExamples += '     * ALL RULE EXAMPLES - AGGREGATED\n';
    allExamples += '     * Each rule example in separate block()\n';
    allExamples += '     * ======================================== */\n';

    // Add each rule example with proper indentation
    for (var i = 0; i < ruleOrder.length; i++) {
        var ruleName = ruleOrder[i];
        var example = ruleExamples[ruleName];

        if (!example) {
            console.warn('Example not found for rule:', ruleName);
            continue;
        }

        // Add blank line before each example
        allExamples += '\n';

        // Indent each line of the example by 4 spaces
        var lines = example.split('\n');
        for (var j = 0; j < lines.length; j++) {
            allExamples += '    ' + lines[j];
            if (j < lines.length - 1) {
                allExamples += '\n';
            }
        }

        // Add comma after block (except for last one)
        if (i < ruleOrder.length - 1) {
            allExamples += ',';
        }

        // Add blank line after each example (except the last one)
        if (i < ruleOrder.length - 1) {
            allExamples += '\n';
        }
    }

    // Close outer block
    allExamples += '\n)';

    // Copy to clipboard
    var tempTextarea = document.createElement('textarea');
    tempTextarea.value = allExamples;
    tempTextarea.style.position = 'fixed';
    tempTextarea.style.opacity = '0';
    document.body.appendChild(tempTextarea);
    tempTextarea.select();

    try {
        document.execCommand('copy');

        // Visual feedback - change button
        var buttons = document.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent.includes('Copy All Examples')) {
                var btn = buttons[i];
                var originalText = btn.innerHTML;
                btn.innerHTML = '✅ Copied!';
                btn.style.background = '#218838';

                setTimeout(function() {
                    btn.innerHTML = originalText;
                    btn.style.background = '#28a745';
                }, 2000);
                break;
            }
        }

        // Close the popup after copying
        closeRulesPopup();
    } catch (err) {
        alert('Failed to copy examples');
    }

    document.body.removeChild(tempTextarea);
}

// Clear the suggestion input and outputs
function clearSuggestionInput() {
    document.getElementById('suggestionInput').value = '';
    setElementContent('suggestionsApplied', '');
    document.getElementById('htmlOutput').innerHTML = '';

    // Clear stored input code
    originalInputCode = '';
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
// This MUST be at the file's top level, not inside any function
if (typeof window !== 'undefined') {
    window.updateAppliedSuggestions = updateAppliedSuggestions;  // v3.03 - New function for radio control
    window.updateDisplayForm = updateDisplayForm;  // v3.41 - Update both HTML and applied suggestions
    window.getSuggestions = getSuggestions;
    window.clearSuggestionInput = clearSuggestionInput;
    window.copyToClipboard = copyToClipboard;
    window.showAllPossibleSuggestions = showAllPossibleSuggestions;
    window.closeRulesPopup = closeRulesPopup;  // v3.39 - Close rules popup
    window.copyRuleExample = copyRuleExample;  // v3.39 - Copy rule example
    window.dslSuggestionsAppVersion = dslSuggestionsAppVersion;
    window.debugExtraneousBlock = debugExtraneousBlock;
    window.handleScriptError = handleScriptError;
    
    // Demo functions
    window.demonstrateContinuousExpressions = demonstrateContinuousExpressions;
    window.demonstrateNullProtection = demonstrateNullProtection;
    window.demonstrateMathOperations = demonstrateMathOperations;

    // Copy all examples
    window.copyAllExamples = copyAllExamples;

    console.log('[App v2.12] Functions exposed to global scope - persistent form selection enabled');
}