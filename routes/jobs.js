"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError, UnauthorizedError } = require("../expressError");
const { ensureLoggedIn, isAdmin, isCorrectUserOrAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobFilterSchema = require('../schemas/jobFilter.json');
const jobUpdateSchema = require ('../schemas/jobUpdateSchema.json')
const stringToPrimitiveTypes = require('../helpers/queryString')
const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, company_handle }
 *
 * Returns { id, title, salary, equity, company_handle }
 *
 * Authorization required: login and admin
 */

router.post("/", ensureLoggedIn, isAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.create(req.body);
        return res.status(201).json({ job });
    } catch (err) {
        return next(err);
    }
});

/** GET /  =>
 *   { jobs: [ { title, salary, equity, company_handle }, ...] }
 *
 * Can filter on provided search filters:
 * - minSalary
 * - title
 * - hasEquity
 *  
 * 
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
    try {
        const filters = stringToPrimitiveTypes(req.query);
        
        if (Object.keys(filters).length !== 0) {
            const validator = jsonschema.validate(filters, jobFilterSchema);
            if(!validator.valid){
                const errs = validator.errors.map(e=>e.stack);
                throw new BadRequestError(errs);
            };

            const jobs = await Job.findFilteredJobs(filters);
            return res.json({ jobs })
        };

        const job = await Job.findAll();
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});

/** GET /[id]  =>  { job }
 *
 *  job is { title, salary, equity , company }
 *   where company is { name, description, numEmployees, logoUrl }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
    try {
        const job = await Job.get(req.params.id);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, equity, salary }
 *
 * Returns { id, title, equity, salary}
 *
 * Authorization required: login and admin
 */

router.patch("/:id", ensureLoggedIn, isAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.update(req.params.id, req.body);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: login and admin
 */

router.delete("/:id", ensureLoggedIn, isAdmin, async function (req, res, next) {
    try {
        await Job.remove(req.params.id);
        return res.json({ deleted: req.params.id });
    } catch (err) {
        return next(err);
    }
});


module.exports = router;
