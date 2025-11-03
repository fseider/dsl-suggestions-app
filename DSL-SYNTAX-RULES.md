# DSL Syntax Rules

```
═══════════════════════════════════════════════════════════════════
  ⚠️  CRITICAL - READ BEFORE WRITING ANY DSL CODE  ⚠️
═══════════════════════════════════════════════════════════════════
```

**This file contains MANDATORY syntax rules that must NEVER be violated.**

**If you write DSL code without following these rules, it will be INVALID.**

---

## **RULE 1: Multi-Statement Expressions (MOST IMPORTANT)**

**IF YOU HAVE 2 OR MORE STATEMENTS, YOU MUST USE block()**

Count your statements:
- 1 statement → No block() needed
- 2+ statements → **MUST USE block()** with comma separators

### ✅ CORRECT - All multi-statement expressions MUST be within block()

```dsl
block(
    result1 = query(null, qry),
    result2 = sumQuery(null, qry),
    result3 = countQuery(null, qry)
)
```

### ❌ INCORRECT - Never write multiple statements without block()

```dsl
result1 = query(null, qry)
result2 = sumQuery(null, qry)
result3 = countQuery(null, qry)
```

---

## **Key Points:**

1. **block()** is REQUIRED for multiple statements
2. Statements are separated by **commas**
3. Last statement is the return value
4. Single statements don't need block()

---

## **Examples:**

### Query Functions
```dsl
block(
    qry = "<QUERY>",
    qry = qry + "<Node Parameter='Type' Op='EQ' Value='Image' />",
    qry = qry + "<Attribute Id='Node Name' Op='RE' SValue='TC1%P.png' />",
    qry = qry + "</QUERY>",
    images = query(null, qry),
    imageList = vector(string_type),
    foreach(image,
        images,
        imageList.add(image.attr("Node Name")),
        imageList.add(image.string())
    ),
    imageList
)
```

### Multiple Query Functions
```dsl
block(
    qry = "<QUERY>",
    qry = qry + "<Node Parameter='Department' Op='EQ' Value='Sales' />",
    qry = qry + "</QUERY>",
    total = sumQuery(null, qry),
    count = countQuery(null, qry),
    average = averageQuery(null, qry),
    maximum = maxQuery(null, qry),
    minimum = minQuery(null, qry),
    vector(total, count, average, maximum, minimum)
)
```

### Division Operations
```dsl
block(
    ratio = revenue / quantity,
    safeRatio = ifNaN(ratio, 0.0),
    safeRatio
)
```

---

**ALWAYS reference this file when creating DSL code examples or test files.**
