"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const config_1 = require("./config");
const env = (0, config_1.loadEnv)();
const app = (0, app_1.createApp)();
app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console -- startup log
    console.log(`PayGate listening on port ${env.PORT}`);
});
//# sourceMappingURL=server.js.map