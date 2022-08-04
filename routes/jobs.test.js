const request = require("supertest");

const db = require("../db");
const app = require("../app");

const Job = require('../models/job')

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    u1Token,
    u2Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);



/***************POST*****************/

describe('POST /jobs', () => {
    test('works with valid data and admin', async () => {
        const newJob = { title: 'newJob', salary: 9000, equity: '0', company_handle: 'c1' };;

        const result = await request(app)
            .post('/jobs')
            .send(newJob)
            .set("authorization", `Bearer ${u1Token}`);

        const job = await Job.get(result.body.job.id);

        expect(result.statusCode).toBe(201);
        expect(job).toEqual(
            {
                title: 'newJob',
                salary: 9000,
                equity: '0',
                company: {
                    name: 'C1',
                    description: 'Desc1',
                    numEmployees: 1,
                    logoUrl: 'http://c1.img'
                }
            });
    });

    test('Does not work if not admin', async () => {

        const newJob = { title: 'newJob', salary: 9000, equity: '0', company_handle: 'c1' };

        const result = await request(app)
            .post('/jobs')
            .send(newJob)
            .set("authorization", `Bearer ${u2Token}`);

        expect(result.body).toEqual({
            error: { message: 'Unauthorized', status: 401 }
        });

        const jobs = await Job.findAll();
        expect(jobs.length).toBe(3)
    });

    test('does not work with bad data', async () => {
        const bj1 = {
            title: 'newJob',
            salary: '9000',
            equity: '0',
            company_handle: 'c1'
        };
        const bj2 = {
            title: 'newJob',
            salary: 9000,
            equity: '0',
        };

        const result1 = await request(app)
            .post('/jobs')
            .send(bj1)
            .set("authorization", `Bearer ${u1Token}`);

        const result2 = await request(app)
            .post('/jobs')
            .send(bj2)
            .set("authorization", `Bearer ${u1Token}`);

        expect(result1.body).toEqual(
            {
                error: {
                    message: ['instance.salary is not of a type(s) integer'],
                    status: 400
                }
            }
        );

        expect(result2.body).toEqual(
            {
                error: {
                    message: [
                        'instance requires property "company_handle"'],
                    status: 400
                }
            }
        )

        const jobs = await Job.findAll();
        expect(jobs.length).toBe(3)
    });

})


/***********GET /jobs****************/
describe("GET /jobs/:id", function () {
    test("works for anon", async function () {
        const j1 = await db.query("SELECT * FROM jobs WHERE title ='j1'")
        const resp = await request(app).get(`/jobs/${j1.rows[0].id}`);

        expect(resp.body).toEqual({
            job: {
                title: "j1",
                salary: 1,
                equity: "0",
                company: {
                    name: "C1",
                    description: "Desc1",
                    numEmployees: 1,
                    logoUrl: "http://c1.img"
                }
            },
        });
    });

    test("not found for no such job", async function () {
        const resp = await request(app).get(`/jobs/0`);
        expect(resp.statusCode).toEqual(404);
    });
});

/************PATCH /jobs/:id*********/

describe("PATCH /jobs/:id", function () {

    test("works for admin", async function () {
        const j1 = await db.query(`SELECT * FROM jobs WHERE title ='j1'`)
        const id = j1.rows[0].id;

        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                title: "j1 new title",
            })
            .set("authorization", `Bearer ${u1Token}`);
        
        expect(resp.body).toMatchObject({
            job: {
                title: "j1 new title",
                salary: 1,
                equity: '0',
                company_handle: "c1",

            },
        });
    });

    test("unauth for users", async function () {
        const j1 = await db.query(`SELECT * FROM jobs WHERE title ='j1'`)
        const id = j1.rows[0].id;

        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                name: "C1-new",
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("unauth for anon", async function () {
        const j1 = await db.query(`SELECT * FROM jobs WHERE title ='j1'`)
        const id = j1.rows[0].id
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                name: "C1-new",
            });
        expect(resp.statusCode).toEqual(401);
    });

    test("not found on no such job", async function () {
        const resp = await request(app)
            .patch(`/jobs/0`)
            .send({
                title: "new nope",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(404);
    });

    test("bad request on company_handle change attempt", async function () {
        const j1 = await db.query(`SELECT * FROM jobs WHERE title ='j1'`)
        const id = j1.rows[0].id
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                company_handle: "c1-new",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request on invalid data", async function () {
        const j1 = await db.query(`SELECT * FROM jobs WHERE title ='j1'`);
        const id = j1.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                salary: "not a salary",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });
});



/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
    test("works for admin", async function () {
        const j1 = await db.query(`SELECT * FROM jobs WHERE title ='j1'`);
        const id = j1.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/${id}`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.body).toEqual({ deleted: `${id}` });
    });

    test("unauth for users", async function () {
        const j1 = await db.query(`SELECT * FROM jobs WHERE title ='j1'`);
        const id = j1.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/${id}`)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("unauth for anon", async function () {
        const j1 = await db.query(`SELECT * FROM jobs WHERE title ='j1'`);
        const id = j1.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/${id}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such job", async function () {
        const j1 = await db.query(`SELECT * FROM jobs WHERE title ='j1'`);
        const id = j1.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/0`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(404);
    });
});
