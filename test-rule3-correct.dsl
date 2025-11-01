// ================================================================
// RULE 3 TEST: UniqueKey Field Naming Convention
// ================================================================
// Rule 3 checks UniqueKey FIELD DECLARATIONS, not function calls
// Pattern: UniqueKey: FieldName
// Requires: Field must match pattern [A-Z][a-zA-Z0-9]*ID
// Examples: RecordID, ItemID, CustomerID (valid)
//           key, myKey, Record (invalid - trigger suggestion)
// ================================================================

// THESE SHOULD TRIGGER SUGGESTIONS (bad naming):
block(
    UniqueKey: key,
    UniqueKey: myKey,
    UniqueKey: RecordKey,
    UniqueKey: record
)

// THESE SHOULD NOT TRIGGER (good naming):
block(
    UniqueKey: RecordID,
    UniqueKey: ItemID,
    UniqueKey: CustomerID
)

// ================================================================
// EXPECTED RESULTS
// ================================================================
// First block: 4 suggestions (all have bad naming)
// Second block: 0 suggestions (all follow convention)
// ================================================================
