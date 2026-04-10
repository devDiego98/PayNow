import { IdempotencyService } from "../core/idempotency.service";
export interface CreateMercadoPagoSubscriptionLinkDto {
    /** Amount in smallest currency unit (e.g. centavos for ARS); converted to `transaction_amount` for MP PreApproval. */
    amount: number;
    currency: string;
    /** Shown to the payer and in MP dashboard. */
    reason: string;
    payerEmail: string;
    /** Billing frequency (e.g. 1 monthly, 12 yearly). */
    frequency: number;
    /** Mercado Pago accepts `months` for SaaS-style plans. */
    frequencyType: "months";
    /** Redirect after the payer finishes the subscription checkout. */
    backUrl: string;
    /**
     * Mercado Pago `notification_url`. When omitted, uses `MERCADOPAGO_NOTIFICATION_URL` on this server
     * (e.g. `https://paynow.../api/v1/webhooks/mercadopago`) so PayNow receives webhooks and can forward to Poneteweb.
     */
    notificationUrl?: string;
    /** Stored in `metadata` for downstream routing (same idea as payment-link `commerceId`). */
    commerceId?: number;
    planId?: number;
    externalReference?: string;
}
export interface MercadoPagoSubscriptionLinkResponse {
    preapprovalId: string;
    initPoint: string;
    sandboxInitPoint: string | null;
    amount: number;
    currency: string;
    reason: string;
    externalReference?: string;
}
/** Body for updating recurring amount (same centavos convention as subscription-link). */
export interface UpdateMercadoPagoPreapprovalAmountDto {
    amount: number;
    /** ISO currency; defaults to existing preapproval `currency_id` or ARS. */
    currency?: string;
}
export interface MercadoPagoPreapprovalAmountUpdateResponse {
    preapprovalId: string;
    /** Echo: amount in smallest currency unit (e.g. centavos). */
    amount: number;
    currency: string;
    status?: string;
    autoRecurring?: {
        transaction_amount?: number;
        currency_id?: string;
        frequency?: number;
        frequency_type?: string;
    };
}
export declare class MercadoPagoSubscriptionLinkService {
    private readonly idempotencyService;
    constructor(idempotencyService: IdempotencyService);
    createSubscriptionLink(dto: CreateMercadoPagoSubscriptionLinkDto, idempotencyKey: string, accessTokenOverride?: string): Promise<MercadoPagoSubscriptionLinkResponse>;
    /**
     * Updates `auto_recurring.transaction_amount` for an existing PreApproval (authorized subscription).
     * Loads the current preapproval from Mercado Pago, merges `auto_recurring`, then calls the update API.
     */
    updatePreapprovalAmount(preapprovalId: string, dto: UpdateMercadoPagoPreapprovalAmountDto, idempotencyKey: string, accessTokenOverride?: string): Promise<MercadoPagoPreapprovalAmountUpdateResponse>;
}
//# sourceMappingURL=mercadopagoSubscriptionLink.service.d.ts.map