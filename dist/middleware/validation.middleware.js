"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
function validateBody(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation error",
                details: parsed.error.flatten(),
            });
        }
        req.body = parsed.data;
        next();
    };
}
function validateQuery(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation error",
                details: parsed.error.flatten(),
            });
        }
        res.locals.validatedQuery = parsed.data;
        next();
    };
}
//# sourceMappingURL=validation.middleware.js.map