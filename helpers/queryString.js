
// Takes a query string object (req.query) and returns the same object but
// with the primitive data types instead of strings
// ex: {title: "accountant", salary:"1000", hasEquity: "true"} =>
// {title:"accountant", salary : 1000, hasEquity: true}
function stringToPrimitiveTypes(queryStringObj) {
    for (let elem in queryStringObj) {
        if (queryStringObj[elem] === "true") {
            queryStringObj[elem] = true
        }
        else if (queryStringObj[elem] === "false") {
            queryStringObj[elem] = false
        }
        else if (!Number.isNaN(+queryStringObj[elem])) {
            queryStringObj[elem] = +queryStringObj[elem]
        }
    }

    return queryStringObj
}


module.exports = stringToPrimitiveTypes