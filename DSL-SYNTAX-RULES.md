# DSL Syntax Rules

**CRITICAL: Read this file before writing any DSL code examples or tests.**

---

## **RULE 1: Multi-Statement Expressions**

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
