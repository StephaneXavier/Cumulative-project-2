"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");


/** Related functions for users. */

class User {
    /** authenticate user with username, password.
     *
     * Returns { username, first_name, last_name, email, is_admin }
     *
     * Throws UnauthorizedError is user not found or wrong password.
     **/

    static async authenticate(username, password) {
        // try to find the user first
        const result = await db.query(
            `SELECT username,
                  password,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
            [username],
        );

        const user = result.rows[0];

        if (user) {
            // compare hashed password to a new hash from password
            const isValid = await bcrypt.compare(password, user.password);
            if (isValid === true) {
                delete user.password;
                return user;
            }
        }

        throw new UnauthorizedError("Invalid username/password");
    }

    /** Register user with data.
     *
     * Returns { username, firstName, lastName, email, isAdmin }
     *
     * Throws BadRequestError on duplicates.
     **/

    static async register({ username, password, firstName, lastName, email, isAdmin }) {
        const duplicateCheck = await db.query(
            `SELECT username
           FROM users
           WHERE username = $1`,
            [username],
        );

        if (duplicateCheck.rows[0]) {
            throw new BadRequestError(`Duplicate username: ${username}`);
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

        const result = await db.query(
            `INSERT INTO users
           (username,
            password,
            first_name,
            last_name,
            email,
            is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
            [
                username,
                hashedPassword,
                firstName,
                lastName,
                email,
                isAdmin,
            ],
        );

        const user = result.rows[0];

        return user;
    }

    /** Find all users.
     *
     * Returns [{ username, first_name, last_name, email, is_admin, jobs }, ...] where jobs is
     * jobs:[job_id, job_id, job_id]
     * 
     * User.findAll() does a query of the DB for all users and the jobs they have applied to. 
     * However, this means for every job that a particular user has applied to, in the result.rows we will 
     * get that many of the same user.
     * So we use a .reduce() on the result.rows array to eliminate duplicate information. That way
     * we will have a result of unique users each with an array of multiple (or none) job_id for the jobs the user has applied to. 
     **/

    static async findAll() {
        const result = await db.query(
            `SELECT users.username AS "username",
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin",
                  job_id
            FROM users
            LEFT JOIN applications ON
            users.username = applications.username
            ORDER BY users.username`,
        );

        const jobs = result.rows.reduce(function (accum, nextValue, currentIndex) {
            if (accum.length === 0) {
                return accum = [({username: nextValue.username, 
                                    firstName:nextValue.firstName,
                                    lastName:nextValue.lastName,
                                    email:nextValue.email,
                                    isAdmin:nextValue.isAdmin,
                                    jobs: [nextValue.job_id] })]
            }

            else if (accum[accum.length - 1].username === nextValue.username) {
                accum[(accum.length - 1)].jobs.push(nextValue.job_id)
                return accum
            } else {
                accum.push({ username: nextValue.username, 
                            firstName:nextValue.firstName,
                            lastName:nextValue.lastName,
                            email:nextValue.email,
                            isAdmin:nextValue.isAdmin,
                            jobs: [nextValue.job_id] })
                return accum
            }
        }, []);

        return jobs;

    };



    /** Given a username, return data about user.
     *
     * Returns { username, first_name, last_name, is_admin, jobs }
     *   where jobs is { id, title, company_handle, company_name, state }
     *
     * Throws NotFoundError if user not found.
     **/

    static async get(username) {
        const userRes = await db.query(
            `SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
            [username],
        );

        const user = userRes.rows[0];

        if (!user) throw new NotFoundError(`No user: ${username}`);

        return user;
    }

    /** Update user data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain
     * all the fields; this only changes provided ones.
     *
     * Data can include:
     *   { firstName, lastName, password, email, isAdmin }
     *
     * Returns { username, firstName, lastName, email, isAdmin }
     *
     * Throws NotFoundError if not found.
     *
     * WARNING: this function can set a new password or make a user an admin.
     * Callers of this function must be certain they have validated inputs to this
     * or a serious security risks are opened.
     */

    static async update(username, data) {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
        }

        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                firstName: "first_name",
                lastName: "last_name",
                isAdmin: "is_admin",
            });
        const usernameVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE users 
                      SET ${setCols} 
                      WHERE username = ${usernameVarIdx} 
                      RETURNING username,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                email,
                                is_admin AS "isAdmin"`;
        const result = await db.query(querySql, [...values, username]);
        const user = result.rows[0];

        if (!user) throw new NotFoundError(`No user: ${username}`);

        delete user.password;
        return user;
    }

    /** Delete given user from database; returns undefined. */

    static async remove(username) {
        let result = await db.query(
            `DELETE
           FROM users
           WHERE username = $1
           RETURNING username`,
            [username],
        );
        const user = result.rows[0];

        if (!user) throw new NotFoundError(`No user: ${username}`);
    }



    /***
     * Attempts to insert the username and jobId into applications table.
     * Returns error if username doesn't exit, job id doesn't exist or 
     * if user has already applied for a particular job.
     * If data is valid, return {applied :jobId} 
     * */
    static async application(username, jobId) {
        if (Number.isNaN(+jobId)) {
            throw new BadRequestError('job id needs to be an integer')
        };

        try {
            const application = await db.query(`INSERT INTO applications 
                                        VALUES ($1,$2) 
                                        RETURNING username, job_id`,
                [username, jobId]);
        } catch (e) {
            throw new BadRequestError(e.detail)
        };

        return { applied: jobId }
    }

}


module.exports = User;
