/*
 * FILE: dslExamples.js
 * VERSION: v1.00
 * LAST UPDATED: 2025-11-04
 *
 * ARCHITECTURAL BOUNDARY: Suggestions
 * AUTO-LOADED BY: dslSuggestionsApp.html
 * PROVIDES: dslExamples global object
 *
 * DESCRIPTION:
 * DSL code examples for each suggestion rule.
 * Edit this file to update examples - changes automatically reflected in:
 * - Individual rule cards in "Show All Possible Suggestions" popup
 * - Aggregated output from "Copy All Examples" button
 *
 * STRUCTURE:
 * Each example should be a valid DSL block() expression.
 * All multi-statement expressions MUST be wrapped in block().
 *
 * CRITICAL: All multi-statement expressions MUST be wrapped in block()
 */

var dslExamples = {
    divisionOperations: `block(
    /* Division that could fail if denominator is zero */
    result1 = total / count,
    result2 = price / quantity
)`,

    queryFunctions: `block(
    /* Query functions impact performance */
    result = query(null, qry),
    total = sumQuery(null, qry),
    avg = averageQuery(null, qry)
)`,

    uniqueKey: `block(
    /* uniqueKey() Best Practices */
    recordKey = uniqueKey("xxColorRecord"),
    itemKey = uniqueKey("xxItemId")
)`,

    variableNaming: `block(
    /* Variables should use lowerCamelCase */
    user_name = "John",
    Product_ID = 123,
    MY_CONSTANT = "test"
)`,

    nonOptimalNodeAccess: `block(
    /* Hierarchy / Library Item node references in expressions */
    value = ParentSeason.Name,
    color = ColorSpecification.Code,
    size = ProductSize.Value
)`,

    nullAccessProtection: `block(
    /* Property access without null checks */
    userName = user.name,
    itemCode = product.code,
    totalPrice = order.total
)`,

    mathOperationsParens: `block(
    /* Complex math without parentheses */
    result = a + b * c,
    value = x - y / z
)`,

    extraneousBlocks: `block(
    /* Unnecessary block() for single statement */
    result = value
)`
};

// Make available globally
if (typeof window !== 'undefined') {
    window.dslExamples = dslExamples;
}
