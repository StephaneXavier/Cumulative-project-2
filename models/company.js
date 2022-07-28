"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const jsonschema = require('jsonschema')
const filterSchema = require('../schemas/companyFilter.json')

/** Related functions for companies. */

class Company {
    /** Create a company (from data), update db, return new company data.
     *
     * data should be { handle, name, description, numEmployees, logoUrl }
     *
     * Returns { handle, name, description, numEmployees, logoUrl }
     *
     * Throws BadRequestError if company already in database.
     * */

    static async create({ handle, name, description, numEmployees, logoUrl }) {
        const duplicateCheck = await db.query(
            `SELECT handle
           FROM companies
           WHERE handle = $1`,
            [handle]);

        if (duplicateCheck.rows[0])
            throw new BadRequestError(`Duplicate company: ${handle}`);

        const result = await db.query(
            `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
            [
                handle,
                name,
                description,
                numEmployees,
                logoUrl,
            ],
        );
        const company = result.rows[0];

        return company;
    }

    /** Find all companies.
     *
     * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
     * */

    static async findAll() {
        const companiesRes = await db.query(
            `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
        return companiesRes.rows;
    }

    /** Given a company handle, return data about company.
     *
     * Returns { handle, name, description, numEmployees, logoUrl, jobs }
     *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
     *
     * Throws NotFoundError if not found.
     **/

    static async get(handle) {
        const companyRes = await db.query(
            `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
            [handle]);

        const company = companyRes.rows[0];

        if (!company) throw new NotFoundError(`No company: ${handle}`);

        return company;
    }

    /** Update company data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     *
     * Data can include: {name, description, numEmployees, logoUrl}
     *
     * Returns {handle, name, description, numEmployees, logoUrl}
     *
     * Throws NotFoundError if not found.
     */

    static async update(handle, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                numEmployees: "num_employees",
                logoUrl: "logo_url",
            });
        const handleVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
        const result = await db.query(querySql, [...values, handle]);
        const company = result.rows[0];

        if (!company) throw new NotFoundError(`No company: ${handle}`);

        return company;
    }

    /** Delete given company from database; returns undefined.
     *
     * Throws NotFoundError if company not found.
     **/

    static async remove(handle) {
        const result = await db.query(
            `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
            [handle]);
        const company = result.rows[0];

        if (!company) throw new NotFoundError(`No company: ${handle}`);
    }

    // takes the min/maxEmployees values from findFiltered function and returns an SQL query
    // string based on those values.
    static minMaxEmployeesFilterToSqlQuery(minEmployees, maxEmployees) {
        let result = ``;

        if (+minEmployees) {
            result += ` num_employees >= ${+minEmployees} `
        };
        if (+minEmployees && +maxEmployees) {
            result += ` AND `
        };
        if (+maxEmployees) {
            result += ` num_employees <= ${+maxEmployees} `
        };

        return result
    }

    // Takes in the "filters" object, which is an object containing the user's GET /companies parameters.
    // Based off the parameters provided, this function will construct an SQL query. Will throw error if extra or incorrect paramters passed.
    // A user can use any combination of the 3 correct filters.
    // Returns the companies that match the constructed query
    // ex: {name:'ander', minEmployee:100 } => [{name:"Ingram, Ferguson ..."", num_employees:753}, {name:"Graham ...", num_employees: 188} ]
    static async findFilteredCompanies(filters) {
        // Get all the keys from the filter object. If any keys are not 'name', 'minEmployees' or 'maxEmployees'
        // throw an error. Invalid filters is true if there's an prohibited filter key in filters.
        let filtersKeys = Object.keys(filters);
        let invalidFilters = filtersKeys.some(v => v != 'name' && v != 'minEmployees' && v != 'maxEmployees')
        if (invalidFilters) {
            throw new BadRequestError('can only have name and/or minEmployees and/or maxEmployees as query parameters ')
        };

        let { name, minEmployees, maxEmployees } = filters;
        let numEmployeesFilter = Company.minMaxEmployeesFilterToSqlQuery(minEmployees, maxEmployees);

        if (+minEmployees > +maxEmployees) {
            throw new BadRequestError('minEmployees cannot be more than maxEmployees')
        };

        const result = await db.query(
            `SELECT handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"
             FROM companies
             WHERE ${name ? `LOWER(name) LIKE '%${name.toLowerCase()}%'` : ''} 
             ${name && numEmployeesFilter ? ' AND ' : ''}
             ${numEmployeesFilter ? numEmployeesFilter : ''}`
        );

        return result.rows
    }


}


module.exports = Company;



























// code that didn't make the cut:
// in static async findFiltered(filters), the query
// const result = await db.query(
        //     `SELECT handle, name, description, num_employees, logo_url
        //      FROM companies
        //      WHERE ${name ? `LOWER(name) LIKE '%${name.toLowerCase()}%' AND` : null}
        //      num_employees >= $1 AND
        //      num_employees <= $2`, [minEmployees, maxEmployees]
        // );