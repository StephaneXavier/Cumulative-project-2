const { BadRequestError } = require("../expressError");

/**
* Returns an object with the following key-value pairs:
* 1) the columns to be updated (the SET  portion in the SQL query).
*    setCols is a string that has the the column name (dataToUpdate key)
*    and the $index appropriately formatted as a portion of an SQL query
* 2) the associated VALUES portion of the SQL query .
*
* Function parameters:
*  a) dataToUpdate: is an object containing key-value pairs of
*  column to be updated (key) and new information for update(value). 
*  This information is received by the req.body on the PATCH route
*  b) jsToSql: set the js key to be the psql column name (if they are
*   different) 
*
*ex: 
* 1) in PATCH /users/user1 send JSON {"first_name":"F1", "email":"e1@mail.com"}
* 2) through req.body get dataToUpdate as {first_name:"F1", email: "e1@mail.com" }
* 3) first_name in user table is firstName, which will be handled in const cols
* 4) the return will be  {setCols: `"firstName"=$1, "email"=$2`,
*                         values: ["F1", "e1@mail.com"]}
*
*
*
*
*
*/

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
