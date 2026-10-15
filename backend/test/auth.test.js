const test = require("node:test");
const assert = require("node:assert");
const generateToken = require("../utils/generateToken");
const { customerResponse } = require("../controllers/customer.controller");

test("generateToken produces a valid JWT string", () => {
  process.env.JWT_SECRET = "test_secret_key_at_least_32_characters_long";
  process.env.JWT_EXPIRES_IN = "1d";
  const token = generateToken("670c5e3d1234567890abcdef");
  assert.ok(typeof token === "string");
  assert.strictEqual(token.split(".").length, 3);
});

test("customerResponse filters out sensitive properties", () => {
  const customer = {
    _id: "670c5e3d1234567890abcdef",
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "9876543210",
    password: "hashedpassword123",
    __v: 0,
  };
  const sanitized = customerResponse(customer);
  assert.deepStrictEqual(sanitized, {
    _id: "670c5e3d1234567890abcdef",
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "9876543210",
  });
  assert.strictEqual(sanitized.password, undefined);
});
