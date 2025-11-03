/* Test file for Rule 3: UniqueKey function usage */

/* Example 1: Basic uniqueKey calls */
block(
	recordKey = uniqueKey("xxColorRecord"),
	itemKey = format("{0,number,0000}", uniqueKey("xxItemId"))
)

/* Example 2: Multiple uniqueKey calls in one block */
block(
	productKey = uniqueKey("xxProductID"),
	seasonKey = uniqueKey("xxSeasonID"),
	categoryKey = uniqueKey("xxCategory")
)

/* Example 3: UniqueKey in various contexts */
myRecord = uniqueKey("xxRecordID")
customKey = uniqueKey("xxCustomKey")
entityKey = uniqueKey("xxEntityID")

/* Example 4: Nested in expressions */
result = block(
	key1 = uniqueKey("xxFirstKey"),
	key2 = uniqueKey("xxSecondID"),
	combined = key1 + key2
)
