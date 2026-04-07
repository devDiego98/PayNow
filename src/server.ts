import "dotenv/config";
import { createApp } from "./app";
import { loadEnv } from "./config";

const env = loadEnv();
const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console -- startup log
  console.log(`PayGate listening on port ${env.PORT}`);
});
