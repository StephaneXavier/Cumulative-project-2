"use strict";

const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../expressError");
const {
    authenticateJWT,
    ensureLoggedIn,
    isAdmin,
    isCorrectUserOrAdmin
} = require("./auth");


const { SECRET_KEY } = require("../config");
const testJwt = jwt.sign({ username: "test", isAdmin: false }, SECRET_KEY);
const badJwt = jwt.sign({ username: "test", isAdmin: false }, "wrong");


describe("authenticateJWT", function () {
    test("works: via header", function () {
        expect.assertions(2);
        //there are multiple ways to pass an authorization token, this is how you pass it in the header.
        //this has been provided to show you another way to pass the token. you are only expected to read this code for this project.
        const req = { headers: { authorization: `Bearer ${testJwt}` } };
        const res = { locals: {} };
        const next = function (err) {
            expect(err).toBeFalsy();
        };
        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({
            user: {
                iat: expect.any(Number),
                username: "test",
                isAdmin: false,
            },
        });
    });

    test("works: no header", function () {
        expect.assertions(2);
        const req = {};
        const res = { locals: {} };
        const next = function (err) {
            expect(err).toBeFalsy();
        };
        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({});
    });

    test("works: invalid token", function () {
        expect.assertions(2);
        const req = { headers: { authorization: `Bearer ${badJwt}` } };
        const res = { locals: {} };
        const next = function (err) {
            expect(err).toBeFalsy();
        };
        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({});
    });
});


describe("ensureLoggedIn", function () {
    test("works", function () {
        expect.assertions(1);
        const req = {};
        const res = { locals: { user: { username: "test", is_admin: false } } };
        const next = function (err) {
            expect(err).toBeFalsy();
        };
        ensureLoggedIn(req, res, next);
    });

    test("unauth if no login", function () {
        expect.assertions(1);
        const req = {};
        const res = { locals: {} };
        const next = function (err) {
            expect(err instanceof UnauthorizedError).toBeTruthy();
        };
        ensureLoggedIn(req, res, next);
    });
});


describe("isAdmin", () => {
    test("throws error if not admin", () => {
        expect.assertions(1);
        const req = {};
        const res = { locals: { user: { isAdmin: false } } };
        const next = function (err) {
            expect(err instanceof UnauthorizedError).toBeTruthy();
        };
        isAdmin(req, res, next);
    });
    test("Works if user is admin", () => {
        expect.assertions(1)
        const req = {};
        const res = { locals: { user: { isAdmin: true } } };
        const next = function (err) { expect(err).toBeFalsy() };
        isAdmin(req, res, next);
    });
});

describe("isCorrectUserOrAdmin", () => {
    test("unauth if not user and not admin", () => {
        const req = { params: { username: 'baduser' } };
        const res = { locals: { user: { username: 'u1', isAdmin: false } } };
        const next = function (err) {
            expect(err instanceof UnauthorizedError).toBeTruthy();
        };
        isCorrectUserOrAdmin(req, res, next);
    });
    test("works if correct user but not admin", () => {
        expect.assertions(1);
        const req = { params: { username: 'gooduser' } };
        const res = { locals: { user: { username: 'gooduser', isAdmin: false } } };
        const next = function (err) {
            expect(err).toBeFalsy();
        };
        isCorrectUserOrAdmin(req, res, next);
    });
    test("works if if admin, not same user", () => {
        expect.assertions(1);
        const req = { params: { username: 'randomguy' } };
        const res = { locals: { user: { username: 'mradmin', isAdmin: true } } };
        const next = function (err) {
            expect(err).toBeFalsy();
        };
        isCorrectUserOrAdmin(req, res, next);
    })
})