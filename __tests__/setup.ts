// This file runs before any module is loaded — safe to set env vars here
process.env.TOKEN_PEPPER = "test-pepper-for-unit-tests";
process.env.ENCRYPTION_KEY = "0".repeat(64);
process.env.ADMIN_SECRET = "test-admin-secret-32-chars-long!!";
process.env.PAYMOB_HMAC_SECRET = "test-paymob-hmac-secret";
