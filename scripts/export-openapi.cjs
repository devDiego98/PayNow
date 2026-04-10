#!/usr/bin/env node
/**
 * Writes `dist/openapi.json` from the same swagger-jsdoc options as runtime, so deployments
 * without `src/` still serve complete OpenAPI at `/api/docs`.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const swaggerModulePath = path.join(__dirname, "..", "dist", "config", "swagger.js");
const { getSwaggerJSDocOptions } = require(swaggerModulePath);

const spec = swaggerJsdoc(getSwaggerJSDocOptions());
const outPath = path.join(__dirname, "..", "dist", "openapi.json");
fs.writeFileSync(outPath, JSON.stringify(spec, null, 2), "utf8");
// eslint-disable-next-line no-console -- build script
console.log("Wrote", outPath);
