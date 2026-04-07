"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMercadoPagoDataIdForSignature = getMercadoPagoDataIdForSignature;
exports.buildMercadoPagoSignatureManifest = buildMercadoPagoSignatureManifest;
exports.verifyMercadoPagoWebhookSignature = verifyMercadoPagoWebhookSignature;
const crypto_1 = __importDefault(require("crypto"));
function parseXSignature(header) {
    const parts = header.split(",");
    let ts;
    let v1;
    for (const part of parts) {
        const eq = part.indexOf("=");
        if (eq === -1)
            continue;
        const key = part.slice(0, eq).trim();
        const value = part.slice(eq + 1).trim();
        if (key === "ts")
            ts = value;
        if (key === "v1")
            v1 = value;
    }
    if (!ts || !v1)
        return null;
    return { ts, v1 };
}
/** `data.id` for manifest: query `data.id`, else JSON body `data.id` (lowercase if alphanumeric). */
function getMercadoPagoDataIdForSignature(req) {
    const q = req.query["data.id"];
    if (typeof q === "string" && q.length > 0) {
        return /^[a-z0-9]+$/i.test(q) ? q.toLowerCase() : q;
    }
    const body = req.body;
    const id = body?.data?.id;
    if (id == null)
        return "";
    const s = String(id);
    return /^[a-z0-9]+$/i.test(s) ? s.toLowerCase() : s;
}
/**
 * Manifest per Mercado Pago docs: omit `id:` if `data.id` is not present.
 * @see https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
 */
function buildMercadoPagoSignatureManifest(dataId, requestId, ts) {
    let m = "";
    if (dataId)
        m += `id:${dataId};`;
    m += `request-id:${requestId};`;
    m += `ts:${ts};`;
    return m;
}
function verifyMercadoPagoWebhookSignature(req, secret) {
    const xSignature = req.headers["x-signature"];
    const xRequestId = req.headers["x-request-id"];
    if (typeof xSignature !== "string")
        return false;
    if (typeof xRequestId !== "string")
        return false;
    const parsed = parseXSignature(xSignature);
    if (!parsed)
        return false;
    const dataId = getMercadoPagoDataIdForSignature(req);
    const manifest = buildMercadoPagoSignatureManifest(dataId, xRequestId.trim(), parsed.ts);
    const expected = crypto_1.default.createHmac("sha256", secret).update(manifest).digest("hex");
    return expected === parsed.v1;
}
//# sourceMappingURL=mercadopagoSignature.js.map