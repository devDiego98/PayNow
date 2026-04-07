"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryService = void 0;
class RetryService {
    async execute(fn) {
        return fn();
    }
}
exports.RetryService = RetryService;
//# sourceMappingURL=retry.service.js.map