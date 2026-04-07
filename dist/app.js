"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
require("./services/providers/register");
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = require("./routes");
const swagger_1 = require("./config/swagger");
const error_middleware_1 = require("./middleware/error.middleware");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, morgan_1.default)("combined"));
    (0, routes_1.registerRoutes)(app);
    (0, swagger_1.setupSwagger)(app);
    app.use(error_middleware_1.errorMiddleware);
    return app;
}
//# sourceMappingURL=app.js.map