import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";
export declare function validateBody<T>(schema: ZodSchema<T>): RequestHandler;
export declare function validateQuery<T>(schema: ZodSchema<T>): RequestHandler;
//# sourceMappingURL=validation.middleware.d.ts.map