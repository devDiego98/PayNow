import { z } from "zod";
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production", "staging"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    /** Comma-separated browser origins (e.g. http://localhost:5173). If unset, any Origin is allowed (reflect). */
    CORS_ORIGIN: z.ZodOptional<z.ZodString>;
    DATABASE_URL: z.ZodOptional<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    API_KEY_SECRET: z.ZodOptional<z.ZodString>;
    /** Where Stripe may send the customer after redirect-based payment steps (3DS, wallets, etc.). */
    STRIPE_PAYMENT_RETURN_URL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "test" | "production" | "staging";
    PORT: number;
    STRIPE_PAYMENT_RETURN_URL?: string | undefined;
    CORS_ORIGIN?: string | undefined;
    DATABASE_URL?: string | undefined;
    REDIS_URL?: string | undefined;
    API_KEY_SECRET?: string | undefined;
}, {
    STRIPE_PAYMENT_RETURN_URL?: string | undefined;
    NODE_ENV?: "development" | "test" | "production" | "staging" | undefined;
    PORT?: number | undefined;
    CORS_ORIGIN?: string | undefined;
    DATABASE_URL?: string | undefined;
    REDIS_URL?: string | undefined;
    API_KEY_SECRET?: string | undefined;
}>;
export type Env = z.infer<typeof envSchema>;
export declare function loadEnv(): Env;
export {};
//# sourceMappingURL=index.d.ts.map