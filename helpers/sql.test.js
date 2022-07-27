
const {sqlForPartialUpdate} = require('./sql');
const {BadRequestError} = require('../expressError');
const goodData = {firstName: "Joe", lastName:"Monroe", email:"jm@mail.com"};
const jsToSql = {firstName:"first_name", lastName:"last_name"};


describe('sqlForPartialUpdate function', () => {
    test('throws error when no data given', () => {
        try{
            sqlForPartialUpdate({})
        }catch(e){
            expect(e).toBeInstanceOf(BadRequestError)
        }
    });
    test('returns valid data when fed good data', () => {
        const result = sqlForPartialUpdate(goodData,jsToSql);

        expect(result).toEqual({
           setCols: `"first_name"=$1, "last_name"=$2, "email"=$3`,
           values:["Joe","Monroe","jm@mail.com"] 
        })
    })
})