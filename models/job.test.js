const Job = require('./job')
const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/******************create()***********/


console.log('in job.test.js JOB MODEL')

describe('Job.create()', () => {
    test('create new job', async () => {
        const newJob = { title: 'newJob', salary: 9000, equity: '0', company_handle: "c1" };
        await Job.create(newJob)

        const newJobQuery = await db.query(`SELECT title, salary, equity, company_handle
                                             FROM jobs 
                                             WHERE title = 'newJob'`)


        expect(newJobQuery.rows.length).toBe(1);
        expect(newJobQuery.rows[0]).toEqual({
            title: "newJob",
            salary: 9000,
            equity: '0',
            company_handle: "c1"
        })
    })
    test("won't create job if it already exists", async () => {
        try {
            const dupJob = { title: 'j1', salary: 1, equity: '0', company_handle: 'c1' };
            await Job.create(dupJob);
        } catch (e) {
            expect(e instanceof BadRequestError).toBeTruthy()
        }
    });
});

/**********findAll()**********/

describe('Job.findAll()', () => {
    test('finds all jobs', async () => {
        const jobs = await Job.findAll();
        expect(jobs.length).toBe(3);
        expect(jobs).toMatchObject(
            [
                { title: 'j1', salary: 1, equity: '0', company_handle: 'c1' },
                { title: 'j2', salary: 2, equity: '0.2', company_handle: 'c2' },
                { title: 'j3', salary: 3, equity: '0.3', company_handle: 'c3' }
            ]
        )
    })

});

// *************get()***************/

describe('Job.get(id)', () => {
    test("succesful get", async () => {
        const jobQuery = await db.query(`SELECT * FROM jobs WHERE title='j1'`);
        const jobId = jobQuery.rows[0].id;

        const result = await Job.get(jobId);
        console.log(result)
        expect(result).toEqual(
            {
                title: 'j1',
                salary: 1,
                equity: '0',
                company: {
                    name: 'C1',
                    description: 'Desc1',
                    numEmployees: 1,
                    logoUrl: 'http://c1.img'
                }
            });
    });

    test('error if job not does not exist', async () => {
        try {
            const badJob = await Job.get(0);
        } catch (e) {
            expect(e instanceof NotFoundError).toBeTruthy()
        }
    });
});

/****************Job.update(id, data)****************/

describe('Job.update()', () => {
    test('succesful update', async () => {
        const updateData = { title: 'test1', salary: 9000 };
        const jobQuery = await db.query(`SELECT * FROM jobs WHERE title='j1'`);
        const J1Id = jobQuery.rows[0].id;
        const updateJob = await Job.update(J1Id, updateData);

        const queryUpdatedJob = await Job.get(J1Id);

        expect(queryUpdatedJob).toEqual({
            title: 'test1',
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

})


/***********************Job.remove*****************************/

describe('Job.remove()', () => {
    test('succesful remove', async() => {
        const jobQuery = await db.query(`SELECT * FROM jobs WHERE title='j1'`);
        const J1Id = jobQuery.rows[0].id;
        await Job.remove(J1Id);
        const jobs = await Job.findAll();

        expect(jobs.length).toBe(2);

        try{
            const missJob = await Job.get(J1Id)
        }catch(e){
            expect(e instanceof NotFoundError).toBeTruthy()
        }
    });  
})

