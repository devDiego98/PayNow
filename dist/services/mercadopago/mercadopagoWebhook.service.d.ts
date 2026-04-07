import type { Request } from "express";
export declare class MercadoPagoWebhookService {
    /**
     * Validates signature (when secret is set), loads payment(s) from the Mercado Pago API, persists rows.
     * Always use API response as source of truth — never trust the webhook body alone.
     */
    handleNotification(req: Request): Promise<{
        processed: boolean;
        mpPaymentIds: string[];
    }>;
}
//# sourceMappingURL=mercadopagoWebhook.service.d.ts.map