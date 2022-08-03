"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const jsonschema = require('jsonschema')
const jobNewSchema = require('../schemas/jobNew.json');
const { json } = require("body-parser");

/** Related functions for jobs. */

class Job {
    /** Create a job (from data), update db, return new job data.
     *
     * data should be { title, salary, equity, company_handle }
     *
     * Returns { id, title, salary, equity, company_handle }
     *
     * Throws BadRequestError if job already in database.
     * */

    static async create({ title, salary, equity, company_handle }) {

        const duplicateCheck = await db.query(
            `SELECT title
           FROM jobs
           WHERE title = $1`,
            [title]);

        if (duplicateCheck.rows[0])
            throw new BadRequestError(`Duplicate job: ${title}`);

        const result = await db.query(
            `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [
                title,
                salary,
                equity,
                company_handle,
            ],
        );
        const job = result.rows[0];

        return job;
    }

    /** Find all jobs.
     *
     * Returns [{ title, salary, equity, company_handle }, ...]
     * */

    static async findAll() {
        const jobsRes = await db.query(
            `SELECT title, salary, equity, company_handle
             FROM jobs
             ORDER BY title`);
        return jobsRes.rows;
    }

    /** Given a job id, return data about job.
     *
     * Returns { title, salary, equity, company }
     *   where company is { handle, name, description, numEmployees, logoUrl }
     *
     * Throws NotFoundError if not found.
     **/

    static async get(id) {
        const jobRes = await db.query(
            `SELECT title,
                  salary,
                  equity,
                  handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url as "logoUrl"
           FROM jobs
           JOIN companies ON jobs.company_handle = handle
           WHERE id = $1`,
            [id]);

        const jobResInfo = jobRes.rows[0];

        if (!jobResInfo) throw new NotFoundError(`No job: ${id}`);

        const job = {
            title: jobResInfo.title,
            salary: jobResInfo.salary,
            equity: jobResInfo.equity,
            company: {
                name: jobResInfo.name,
                description: jobResInfo.description,
                numEmployees: jobResInfo.numEmployees,
                logoUrl: jobResInfo.logoUrl
            }
        }

        return job;
    }

    /** Update job data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     *
     * Data can include: { title, salary, equity}
     *
     * Returns { title, salary, equity, companyHandle }
     *
     * Throws NotFoundError if not found.
     */

    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                companyHandle: "company_handle"
            });
        const handleVarIdx = "$" + (values.length);
        const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${id} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "company_handle"`;
        const result = await db.query(querySql, [...values]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);

        return job;
    }

    /** Delete given job from database; returns undefined.
     *
     * Throws NotFoundError if job not found.
     **/

    static async remove(id) {
        const result = await db.query(
            `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
            [id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);
    }

    // writes the "hasEquity" portion of the sql query
    static hasEquityToSqlQuery(equity, salary, title) {
        let result = ``
        if ((salary != undefined || title != undefined) && equity === true) {
            result += ` AND `
        }
        if (equity === true) {
            result += `equity != '0' `
        };
        if (equity === false) {
            result += ` `
        };

        return result
    };

    // handles the SQL query of the GET /jobs based on query string passed by user.
    static async findFilteredJobs(filters) {

        let { title, minSalary, hasEquity } = filters;

        let result;

        if (title === undefined && minSalary === undefined && hasEquity == false) {

            result = await db.query(
                `SELECT title, equity, salary, company_handle 
                FROM jobs`
            )
        } else {
            result = await db.query(
                `SELECT title, equity, salary, company_handle 
                 FROM jobs
                 WHERE ${title ? `LOWER(title) LIKE '%${title.toLowerCase()}%'` : ''} 
                 ${title && minSalary ? ' AND ' : ''}
                 ${minSalary ? ` salary >= ${minSalary} ` : ' '}
                 
                 ${Job.hasEquityToSqlQuery(hasEquity, minSalary, title)}`
            )
        };

        if (result.rows.length === 0) {
            throw new NotFoundError('No job fitting query parameters found')
        }

        return result.rows
    }


}


module.exports = Job;



























// code that didn't make the cut:
// in static async findFiltered(filters), the query
// const result = await db.query(
        //     `SELECT handle, name, description, num_employees, logo_url
        //      FROM companies
        //      WHERE ${name ? `LOWER(name) LIKE '%${name.toLowerCase()}%' AND` : null}
        //      num_employees >= $1 AND
        //      num_employees <= $2`, [minEmployees, maxEmployees]
        // );