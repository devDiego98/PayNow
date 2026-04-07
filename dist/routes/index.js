"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const express_1 = __importDefault(require("express"));
const card_routes_1 = __importDefault(require("./card.routes"));
const payment_routes_1 = __importDefault(require("./payment.routes"));
const refund_routes_1 = __importDefault(require("./refund.routes"));
const webhook_routes_1 = __importDefault(require("./webhook.routes"));
const health_routes_1 = __importDefault(require("./health.routes"));
function registerRoutes(app) {
    app.use("/health", health_routes_1.default);
    app.use("/api/v1/cards", express_1.default.json(), card_routes_1.default);
    app.use("/api/v1/payments", express_1.default.json(), payment_routes_1.default);
    app.use("/api/v1/refunds", express_1.default.json(), refund_routes_1.default);
    app.use("/api/v1/webhooks", express_1.default.json(), webhook_routes_1.default);
}
//# sourceMappingURL=index.js.map