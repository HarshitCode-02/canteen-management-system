import assert from "node:assert/strict";
import test from "node:test";
import { errorMessage, errorMessages } from "../src/apiErrors.js";

test("connection and timeout failures use friendly, context-aware messages", () => {
  assert.equal(errorMessage({ isAxiosError: true }), "Unable to connect right now. Please try again in a moment.");
  assert.equal(errorMessage({ code: "ECONNABORTED" }, errorMessages.login), "Login is taking longer than expected. Please try again.");
  assert.equal(errorMessage({ response: { status: 504 } }), "This request is taking longer than expected. Please try again.");
});

test("authentication and authorization failures do not expose implementation details", () => {
  assert.equal(
    errorMessage({ response: { status: 401, data: { message: "Invalid email or password" } } }),
    "Incorrect email or password. Please check your details and try again."
  );
  assert.equal(errorMessage({ response: { status: 401, data: { message: "Not authorized, token missing" } } }), "Your session may have expired. Please sign in again.");
  assert.equal(errorMessage({ response: { status: 403, data: { message: "Internal permission check failed" } } }), "You don't have permission to perform this action.");
});

test("server and malformed-response errors are replaced with safe user messages", () => {
  assert.equal(errorMessage({ response: { status: 500, data: { message: "MongoServerError: secret" } } }), "Something went wrong while loading this page. Please try again.");
  assert.equal(errorMessage({ response: { status: 400, data: { message: "TypeError: Cannot read properties of undefined" } } }), "Something went wrong while loading this page. Please try again.");
  assert.equal(errorMessage(new Error("Unexpected response")), "Something went wrong while loading this page. Please try again.");
});

test("safe request validation details remain available", () => {
  assert.equal(
    errorMessage({ response: { status: 400, data: { message: "Budget must be a positive amount up to ₹5000" } } }),
    "Budget must be a positive amount up to ₹5000"
  );
});
