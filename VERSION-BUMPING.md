# Version Bumping Policy

## Overview

The DSL Suggestions App uses a **single source of truth** for version management: `appVersion.js`

This file MUST be updated whenever ANY app file changes to ensure proper cache-busting and version tracking.

---

## When to Bump Version

**ALWAYS bump the version when:**
- ✅ ANY change to HTML, JS, CSS files
- ✅ Bug fixes or improvements
- ✅ New features or refactoring
- ✅ Changes to rules, utilities, engine, config, or examples
- ✅ Documentation updates that affect user experience
- ✅ Any code change, no matter how small

**Version never stays the same across commits with code changes.**

---

## How to Bump Version

### Step 1: Update `appVersion.js`

```javascript
var APP_VERSION = {
    version: 'v3.52',        // ← INCREMENT THIS (v3.52 → v3.53)
    lastUpdated: '2025-11-04', // ← UPDATE DATE
    description: 'DSL Suggestions App',
    // ...
};
```

### Step 2: Update Cache-Busting in `dslSuggestionsApp.html`

Update all `<script>` tag version parameters:

```html
<script src="appVersion.js?v=3.52&t=1762264000"></script>
<script src="dslSuggestionsEngine.js?v=3.52&t=1762264000"></script>
<script src="dslExamples.js?v=3.52&t=1762264000"></script>
<script src="dslSuggestionsApp.js?v=3.52&t=1762264000"></script>
```

Also update the file header:
```html
<!--
 * FILE: dslSuggestionsApp.html
 * VERSION: v3.52  ← UPDATE THIS
 * LAST UPDATED: 2025-11-04  ← UPDATE DATE
```

### Step 3: Update Cache-Busting in `dslSuggestionsEngine.js`

Update all dynamic script loading:

```javascript
script.src = 'dslSuggestionsConfig.js?v=3.52';  // ← UPDATE
script.src = 'dslRuleUtilities.js?v=3.52';     // ← UPDATE
script.src = 'dslRules.js?v=3.52';             // ← UPDATE
```

### Step 4: Optional - Update Individual File Versions

If you changed a specific file, update its header version:

```javascript
/*
 * FILE: dslRules.js
 * VERSION: v1.03  ← Bump component version
 * LAST UPDATED: 2025-11-04
```

---

## Quick Command Reference

```bash
# Update all v=3.52 to v=3.53 in one command
sed -i 's/v=3\.52/v=3.53/g' dslSuggestionsEngine.js dslSuggestionsApp.html

# Verify all cache-busting parameters
grep "v=3\." dslSuggestionsEngine.js dslSuggestionsApp.html
```

---

## Version Format

- **v3.XX** - Minor updates (bug fixes, improvements, new features)
- **v4.00** - Major architectural changes or breaking changes

---

## Files That Need Updates

### Primary (Always Update):
1. `appVersion.js` - Version and date
2. `dslSuggestionsApp.html` - Header version, all script cache-busting
3. `dslSuggestionsEngine.js` - All script cache-busting

### Secondary (Update if Changed):
4. Individual file headers (`dslRules.js`, `dslSuggestionsApp.js`, etc.)

---

## Validation Checklist

Before committing:
- [ ] `appVersion.js` version incremented
- [ ] `appVersion.js` lastUpdated date updated
- [ ] `dslSuggestionsApp.html` header version updated
- [ ] `dslSuggestionsApp.html` all script tags have new version
- [ ] `dslSuggestionsEngine.js` all script.src have new version
- [ ] Browser hard refresh shows new version number
- [ ] Changed files have updated header versions

---

## Why This Matters

**Cache-busting is critical!** Without proper version bumping:
- Browsers load old cached JavaScript
- Bug fixes don't take effect
- Users see "fixed" features that still have bugs
- Debugging becomes impossible

**Always bump the version. Always.**
