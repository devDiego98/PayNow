#!/usr/bin/env node
/**
 * Starts ngrok (http → PORT), logs the public HTTPS URL and Mercado Pago webhook URL,
 * then runs `dist/server.js`. Use SKIP_NGROK=1 for production or when tunneling manually.
 */
"use strict";

const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");

const root = path.join(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env") });
const serverEntry = path.join(root, "dist", "server.js");
const port = String(process.env.PORT || 3000);

const WEBHOOK_PATH = "/api/v1/webhooks/mercadopago";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Terminate every local ngrok agent so port 4040 and tunnel names are free. */
function stopAllNgrokProcesses() {
  try {
    if (process.platform === "win32") {
      try {
        execSync("taskkill /IM ngrok.exe /F", { stdio: "ignore" });
      } catch {
        /* no ngrok.exe */
      }
    } else {
      execSync("pkill ngrok || true", { stdio: "ignore", shell: "/bin/sh" });
    }
  } catch {
    /* ignore */
  }
}

/** Wait until nothing answers the local ngrok inspector (old agent exited). */
async function waitUntilNgrokInspectorGone(maxMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      await getNgrokTunnelsJson();
      await sleep(200);
    } catch {
      return;
    }
  }
}

function skipNgrok() {
  const s = process.env.SKIP_NGROK;
  return s === "1" || s === "true" || s === "yes";
}

function getNgrokTunnelsJson() {
  return new Promise((resolve, reject) => {
    const req = http.get("http://127.0.0.1:4040/api/tunnels", (res) => {
      let data = "";
      res.on("data", (c) => {
        data += c;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(2000, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

/** Match ngrok tunnel `config.addr` to our local port (e.g. http://localhost:3000). */
function tunnelAddrMatchesPort(tunnel, port) {
  const addr = String(tunnel.config?.addr ?? "");
  const p = String(port);
  return (
    addr.includes(`localhost:${p}`) ||
    addr.includes(`127.0.0.1:${p}`) ||
    addr.endsWith(`:${p}`) ||
    addr === p
  );
}

function pickPublicHttpsUrlForPort(tunnelsPayload, port) {
  const list = tunnelsPayload.tunnels || [];
  const t = list.find((x) => x.proto === "https" && tunnelAddrMatchesPort(x, port));
  return t?.public_url || null;
}

async function waitForNgrokUrlForPort(port, maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const json = await getNgrokTunnelsJson();
      const url = pickPublicHttpsUrlForPort(json, port);
      if (url) return url.replace(/\/$/, "");
    } catch {
      // ngrok API not ready yet
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  return null;
}

function logTunnelBanner(publicUrl) {
  const webhookUrl = `${publicUrl}${WEBHOOK_PATH}`;
  // eslint-disable-next-line no-console -- startup script
  console.log("");
  // eslint-disable-next-line no-console -- startup script
  console.log("  ngrok public URL:", publicUrl);
  // eslint-disable-next-line no-console -- startup script
  console.log("  Mercado Pago webhook URL:", webhookUrl);
  // eslint-disable-next-line no-console -- startup script
  console.log("  (set MERCADOPAGO_NOTIFICATION_URL to the webhook URL in .env if you use Checkout Pro)");
  // eslint-disable-next-line no-console -- startup script
  console.log("");
}

let ngrokChild = null;
let serverChild = null;

function shutdown(code = 0) {
  if (serverChild && !serverChild.killed) {
    serverChild.kill("SIGTERM");
  }
  if (ngrokChild && !ngrokChild.killed) {
    ngrokChild.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 200);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  if (skipNgrok()) {
    // eslint-disable-next-line no-console -- startup script
    console.log("SKIP_NGROK set — starting server without ngrok.");
    require(serverEntry);
    return;
  }

  // eslint-disable-next-line no-console -- startup script
  console.log("Stopping any existing ngrok processes…");
  stopAllNgrokProcesses();
  await waitUntilNgrokInspectorGone();
  await sleep(500);

  ngrokChild = spawn("ngrok", ["http", port], {
    cwd: root,
    stdio: ["ignore", "ignore", "pipe"],
    env: process.env,
  });

  ngrokChild.stderr.on("data", (buf) => process.stderr.write(buf));

  ngrokChild.on("error", (err) => {
    // eslint-disable-next-line no-console -- startup script
    console.error(
      "Failed to start ngrok. Is it installed and on PATH? https://ngrok.com/download\n",
      err.message || err
    );
    process.exit(1);
  });

  const publicUrl = await waitForNgrokUrlForPort(port);
  if (!publicUrl) {
    // eslint-disable-next-line no-console -- startup script
    console.error("ngrok started but public URL was not available (timeout). Check ngrok auth: ngrok config add-authtoken …");
    if (ngrokChild && !ngrokChild.killed) ngrokChild.kill("SIGTERM");
    process.exit(1);
  }

  logTunnelBanner(publicUrl);

  startServerChild();
}

function startServerChild() {
  serverChild = spawn(process.execPath, [serverEntry], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  serverChild.on("exit", (code, signal) => {
    if (ngrokChild && !ngrokChild.killed) ngrokChild.kill("SIGTERM");
    process.exit(code == null ? (signal ? 1 : 0) : code);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console -- startup script
  console.error(e);
  process.exit(1);
});
