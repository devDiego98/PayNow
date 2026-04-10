import type { Request } from "express";
export declare class MercadoPagoWebhookService {
    /**
     * Validates signature (when secret is set), loads payment(s) and/or preapproval(s) from the Mercado Pago API,
     * persists payment rows, and forwards to Poneteweb when configured (same as payment flow).
     */
    handleNotification(req: Request): Promise<{
        processed: boolean;
        mpPaymentIds: string[];
        mpPreapprovalIds?: string[];
    }>;
}
//# sourceMappingURL=mercadopagoWebhook.service.d.ts.map