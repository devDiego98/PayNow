"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = exports.registerRoutes = exports.createApp = void 0;
var app_1 = require("./app");
Object.defineProperty(exports, "createApp", { enumerable: true, get: function () { return app_1.createApp; } });
var routes_1 = require("./routes");
Object.defineProperty(exports, "registerRoutes", { enumerable: true, get: function () { return routes_1.registerRoutes; } });
var config_1 = require("./config");
Object.defineProperty(exports, "loadEnv", { enumerable: true, get: function () { return config_1.loadEnv; } });
//# sourceMappingURL=index.js.map