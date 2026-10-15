const jwt = require("jsonwebtoken");

function generateToken(customerId) {
  return jwt.sign({ customerId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

module.exports = generateToken;
