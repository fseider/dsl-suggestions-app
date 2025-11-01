// ================================================================
// RULE 3 TEST: UniqueKey Function Detection
// ================================================================
// PURPOSE: Verify Rule 3 detects uniqueKey() function usage
//          and suggests One-Time / No-Copy configuration
//
// EXPECTED: Suggestions for uniqueKey() usage
// ================================================================

// Test 1: Basic uniqueKey usage
block(
    key1 = uniqueKey(),
    result = key1
)

// Test 2: uniqueKey with parameters
block(
    recordKey = uniqueKey("Record"),
    itemKey = uniqueKey("Item"),
    vector(recordKey, itemKey)
)

// Test 3: Multiple uniqueKey calls in one block
block(
    id1 = uniqueKey(),
    id2 = uniqueKey(),
    id3 = uniqueKey(),
    vector(id1, id2, id3)
)

// Test 4: uniqueKey in nested expression
block(
    result = someFunction(uniqueKey()),
    result
)

// ================================================================
// EXPECTED RESULTS
// ================================================================
// Each uniqueKey() should trigger suggestion:
// "Ensure uniqueKey() expression is set to One-Time and No-Copy flags."
//
// Rule: uniqueKey
// Label: UniqueKey
// Type: advisory
// ================================================================
