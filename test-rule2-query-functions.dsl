// ================================================================
// RULE 2 TEST: Query Functions Detection
// ================================================================
// PURPOSE: Verify Rule 2 detects query-based functions and suggests
//          setting them as "One-Time / No-Copy" for performance
//
// EXPECTED: 14 suggestions total (see breakdown below)
// ================================================================


// ----------------------------------------------------------------
// GROUP 1: All 7 Query Functions (SHOULD TRIGGER - 7 suggestions)
// ----------------------------------------------------------------
total = sumQuery(Orders, Orders.amount)
avg = averageQuery(Items, Items.price)
cnt = countQuery(Sales, Sales.id)
maximum = maxQuery(Scores, Scores.value)
minimum = minQuery(Scores, Scores.value)
filtered = query(Data, Data.status == "active")
wavg = weightedAverageQuery(Prices, Prices.value, Prices.weight)


// ----------------------------------------------------------------
// GROUP 2: Multiple Per Line (SHOULD TRIGGER - 2 suggestions)
// ----------------------------------------------------------------
block(revenue = sumQuery(Orders, Orders.total), itemCount = countQuery(Orders, Orders.id))


// ----------------------------------------------------------------
// GROUP 3: Nested in Expressions (SHOULD TRIGGER - 2 suggestions)
// ----------------------------------------------------------------
ratio = (sumQuery(Sales, Sales.revenue) / countQuery(Sales, Sales.id)) * 100


// ----------------------------------------------------------------
// GROUP 4: Whitespace Variations (SHOULD TRIGGER - 3 suggestions)
// ----------------------------------------------------------------
result1 = sumQuery  (data, data.value)
result2 = countQuery( data, data.id )
result3 = maxQuery (data,data.score)


// ----------------------------------------------------------------
// GROUP 5: In Strings (SHOULD NOT TRIGGER - 0 suggestions)
// ----------------------------------------------------------------
description = "Use sumQuery(data, field) for calculations"
message = 'The averageQuery function is helpful'


// ----------------------------------------------------------------
// GROUP 6: In Comments (SHOULD NOT TRIGGER - 0 suggestions)
// ----------------------------------------------------------------
// sumQuery is a query function
/* averageQuery calculates averages */


// ----------------------------------------------------------------
// GROUP 7: Similar Names (SHOULD NOT TRIGGER - 0 suggestions)
// ----------------------------------------------------------------
customSumQuery(data)
executeQuery(sql)
queryBuilder(table)
runQuery(params)


// ----------------------------------------------------------------
// GROUP 8: Variables Not Functions (SHOULD NOT TRIGGER - 0 suggestions)
// ----------------------------------------------------------------
var sumQuery = 100
obj.countQuery = value
result = data.maxQuery


// ================================================================
// EXPECTED RESULTS SUMMARY
// ================================================================
// Total Suggestions: 14
//
// Breakdown:
// - GROUP 1: 7 suggestions (sumQuery, averageQuery, countQuery, maxQuery, minQuery, query, weightedAverageQuery)
// - GROUP 2: 2 suggestions (sumQuery, countQuery)
// - GROUP 3: 2 suggestions (sumQuery, countQuery)
// - GROUP 4: 3 suggestions (sumQuery, countQuery, maxQuery)
// - GROUPS 5-8: 0 suggestions (correctly ignored)
//
// All suggestions should say:
// "Ensure setting {function}() as 'One-Time / No-Copy' for better performance."
//
// Rule: queryFunctions
// Label: Query
// Severity: info
// ================================================================
