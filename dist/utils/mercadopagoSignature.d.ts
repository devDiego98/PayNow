import type { Request } from "express";
/** `data.id` for manifest: query `data.id`, else JSON body `data.id` (lowercase if alphanumeric). */
export declare function getMercadoPagoDataIdForSignature(req: Request): string;
/**
 * Manifest per Mercado Pago docs: omit `id:` if `data.id` is not present.
 * @see https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
 */
export declare function buildMercadoPagoSignatureManifest(dataId: string, requestId: string, ts: string): string;
export declare function verifyMercadoPagoWebhookSignature(req: Request, secret: string): boolean;
//# sourceMappingURL=mercadopagoSignature.d.ts.map