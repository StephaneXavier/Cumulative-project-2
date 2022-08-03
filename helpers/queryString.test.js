const { query } = require('express')
const stringToPrimitiveTypes = require('./queryString')


describe ('function works', () => {
    test('keeps string as string, turns num string into num, turns boolean string into bool', () => {

        const test = {first:"text", second :"10000",  third:'true',fourth:"false"}
        const result = stringToPrimitiveTypes(test)

        expect(result).toEqual( {
            first:"text",
            second:10000,
            third:true,
            fourth:false
        })
    })
})