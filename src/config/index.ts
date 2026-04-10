import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  /** Comma-separated browser origins (e.g. http://localhost:5173). If unset, any Origin is allowed (reflect). */
  CORS_ORIGIN: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().optional(),
  API_KEY_SECRET: z.string().optional(),
  /** Where Stripe may send the customer after redirect-based payment steps (3DS, wallets, etc.). */
  STRIPE_PAYMENT_RETURN_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
