const test = require("node:test");
const assert = require("node:assert");
const Order = require("../models/order.model");

test("Order schema includes paymentMethod enum options", () => {
  const schema = Order.schema.paths["paymentMethod"];
  assert.ok(schema);
  assert.deepStrictEqual(schema.enumValues, ["RAZORPAY", "COD", "UPI", "CARD", "DEMO"]);
  assert.strictEqual(schema.defaultValue, "RAZORPAY");
});

test("Order schema includes paymentDetails with upiId and cardLast4", () => {
  assert.ok(Order.schema.paths["paymentDetails.upiId"]);
  assert.ok(Order.schema.paths["paymentDetails.transactionId"]);
  assert.ok(Order.schema.paths["paymentDetails.cardLast4"]);
});
