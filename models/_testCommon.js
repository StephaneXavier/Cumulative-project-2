const bcrypt = require("bcrypt");

const db = require("../db.js");
const { BCRYPT_WORK_FACTOR } = require("../config");

async function commonBeforeAll() {
    await db.query("DELETE FROM applications");

    await db.query("DELETE FROM jobs");

    // noinspection SqlWithoutWhere
    await db.query("DELETE FROM companies");
    // noinspection SqlWithoutWhere
    await db.query("DELETE FROM users");

    await db.query(`
    INSERT INTO companies(handle, name, num_employees, description, logo_url)
    VALUES ('c1', 'C1', 1, 'Desc1', 'http://c1.img'),
           ('c2', 'C2', 2, 'Desc2', 'http://c2.img'),
           ('c3', 'C3', 3, 'Desc3', 'http://c3.img')`);

    await db.query(`
        INSERT INTO users(username,
                          password,
                          first_name,
                          last_name,
                          email)
        VALUES ('u1', $1, 'U1F', 'U1L', 'u1@email.com'),
               ('u2', $2, 'U2F', 'U2L', 'u2@email.com')
        RETURNING username`,
        [
            await bcrypt.hash("password1", BCRYPT_WORK_FACTOR),
            await bcrypt.hash("password2", BCRYPT_WORK_FACTOR),
        ]);

    await db.query(`
    INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ('j1', 1,'0' , 'c1'),
           ('j2', 2, '0.2', 'c2'),
           ('j3', 3, '0.3', 'c3')`);

    const j1 = await db.query(`SELECT id FROM jobs WHERE title='j1'`)
    const j2 = await db.query(`SELECT id FROM jobs WHERE title='j2'`)

    await db.query(`
    INSERT INTO applications (username, job_id)
    VALUES ('u1', ${j1.rows[0].id}),
            ('u1', ${j2.rows[0].id})`)
}

// Start the transaction (only valid for INSERT, DELETE or UPDATE) before each test
async function commonBeforeEach() {
    await db.query("BEGIN");

}

// At the end of every test, rollback aka undo all of the changes made at the BEGIN
async function commonAfterEach() {
    await db.query("ROLLBACK");
}

async function commonAfterAll() {
    await db.query("DELETE FROM applications");

    await db.query("DELETE FROM jobs");

    // noinspection SqlWithoutWhere
    await db.query("DELETE FROM companies");
    // noinspection SqlWithoutWhere
    await db.query("DELETE FROM users");
    await db.end();
}


module.exports = {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
};