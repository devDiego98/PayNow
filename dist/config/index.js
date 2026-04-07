"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = loadEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(3000),
    DATABASE_URL: zod_1.z.string().url().optional(),
    REDIS_URL: zod_1.z.string().optional(),
    API_KEY_SECRET: zod_1.z.string().optional(),
    /** Where Stripe may send the customer after redirect-based payment steps (3DS, wallets, etc.). */
    STRIPE_PAYMENT_RETURN_URL: zod_1.z.string().url().optional(),
});
function loadEnv() {
    return envSchema.parse(process.env);
}
//# sourceMappingURL=index.js.map