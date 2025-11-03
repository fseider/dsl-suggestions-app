# Rule Consistency Check Report
**Date:** 2025-10-31
**Version:** v3.34

---

## Summary

| Rule # | Name | Color Coding | Config Match | Issues |
|--------|------|--------------|--------------|---------|
| 1 | divisionOperations | ✅ Yes | ✅ Yes | None |
| 2 | queryFunctions | ✅ Yes | ✅ Yes | None |
| 3 | uniqueKey | ❌ No | ❌ **NO** | **Config mismatch** |
| 4 | variableNaming | ❌ No | ? | Missing color coding |
| 5 | nonOptimalNodeAccess | ❌ No | ? | Missing color coding |
| 6 | nullAccessProtection | ✅ Yes | ✅ Yes | None |
| 7 | mathOperationsParens | ❌ No | ? | Missing color coding |
| 8 | extraneousBlocks | ? | ? | Need to verify |

---

## Rule 1: Division Operations ✅
**Status:** GOOD

**Config:** "Division detected in expression. Wrap entire formula with ifNaN(**{expression}**, DEFAULT_VALUE)"
**Implementation:** Detects `/` operators and suggests ifNaN wrapping
**Color Coding:** ✅ Has _instanceCounter
**Match:** ✅ Config message matches implementation

---

## Rule 2: Query Functions ✅
**Status:** GOOD

**Config:** "Ensure Attributes with query based Expressions **{function}()** are set as One-Time / No-Copy"
**Implementation:** Detects query functions (query, sumQuery, countQuery, etc.)
**Color Coding:** ✅ Has _instanceCounter
**Match:** ✅ Config message matches implementation

---

## Rule 3: UniqueKey ❌
**Status:** **BROKEN - CONFIG MISMATCH**

**Config Message:** "Ensure uniqueKey() expression is set to One-Time and No-Copy flags."
**Actual Implementation:**
- Pattern: `/UniqueKey\s*:\s*(\w+)/gi`
- Detects: `UniqueKey: FieldName` (field declaration)
- Validates: Field must match pattern `[A-Z][a-zA-Z0-9]*ID` (e.g., RecordID, ItemID)
- Does NOT detect: `uniqueKey()` function calls

**Color Coding:** ❌ Missing _instanceCounter
**Match:** ❌ **CONFIG DOES NOT MATCH IMPLEMENTATION**

**What it actually does:**
```dsl
UniqueKey: myKey      // ❌ Triggers suggestion (doesn't end with "ID")
UniqueKey: RecordID   // ✅ Valid (matches pattern)
```

**Fix Needed:**
1. Update config message to: "UniqueKey field **{field}** should follow naming convention (e.g., RecordID, ItemID)"
2. Add _instanceCounter for color coding
3. Add **markers** around {field} placeholder

---

## Rule 4: Variable Naming
**Status:** NEEDS COLOR CODING

**Config:** "Variable '{varName}' should use lowerCamelCase: '{correctedName}'."
**Implementation:** TBD (need to check)
**Color Coding:** ❌ Missing _instanceCounter
**Match:** TBD

**Fix Needed:**
- Add _instanceCounter
- Verify config message has **markers** for color coding

---

## Rule 5: Non-Optimal Node Access
**Status:** NEEDS COLOR CODING

**Config:** "{library} node reference detected. Consider use of a One-Time Attribute Expression"
**Implementation:** TBD (need to check)
**Color Coding:** ❌ Missing _instanceCounter
**Match:** TBD

**Fix Needed:**
- Add _instanceCounter
- Verify config message has **markers** for color coding

---

## Rule 6: Null Access Protection ✅
**Status:** GOOD

**Config:** "Add null protection for **{object}** when accessing .{property}"
**Implementation:** Detects object property access that may fail
**Color Coding:** ✅ Has _instanceCounter
**Match:** ✅ Config message matches implementation (has **markers**)

---

## Rule 7: Math Operations Parens
**Status:** NEEDS COLOR CODING

**Config:** "Consider use of parens () to group math operations for clarity."
**Implementation:** TBD (need to check)
**Color Coding:** ❌ Missing _instanceCounter
**Match:** TBD

**Fix Needed:**
- Add _instanceCounter
- Verify what it detects

---

## Rule 8: Extraneous Blocks
**Status:** NEEDS VERIFICATION

**Config:** "Remove unnecessary block() wrapper for single statement."
**Implementation:** TBD (need to check)
**Color Coding:** ? (need to check)
**Match:** TBD

---

## Priority Fixes

### HIGH PRIORITY:
1. **Rule 3 (uniqueKey)** - Fix config mismatch

### MEDIUM PRIORITY:
2. Rules 4, 5, 7, 8 - Add color coding (instance counters)
3. Verify all config messages have **markers** for color highlighting

---

## Recommendations

1. **Standardize color coding:** All rules should have `_instanceCounter` for consistent UX
2. **Config accuracy:** All config messages must match what the rule actually detects
3. **Use **markers**:** All placeholder values should be wrapped in `**` for color highlighting
4. **Testing:** Create test files for each rule to verify functionality

