"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderError = exports.AppError = void 0;
class AppError extends Error {
    status;
    code;
    constructor(message, status = 500, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = "AppError";
    }
}
exports.AppError = AppError;
class ProviderError extends Error {
    provider;
    code;
    constructor(message, provider, code) {
        super(message);
        this.provider = provider;
        this.code = code;
        this.name = "ProviderError";
    }
}
exports.ProviderError = ProviderError;
//# sourceMappingURL=errors.js.map