// Test color coding for query functions
// Each query function should get a different color

// Example 1: Complex query with XML filter
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

// Example 2: Multiple query functions
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

// Example 3: WeightedAverageQuery
block(
    qry = "<QUERY>",
    qry = qry + "<Node Parameter='Type' Op='EQ' Value='Product' />",
    qry = qry + "</QUERY>",
    weightedAvg = weightedAverageQuery(null, qry),
    weightedAvg
)
