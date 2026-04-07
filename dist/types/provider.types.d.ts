export type ProviderName = "stripe" | "paypal" | "mercadopago";
export type PaymentStatus = "succeeded" | "pending" | "failed" | "cancelled" | "processing";
export interface ChargeRequest {
    amount: number;
    currency: string;
    description: string;
    customer: {
        email: string;
        name: string;
    };
    paymentMethod: {
        type: "card" | "bank_transfer" | "wallet";
        token: string;
    };
    /** When charging a saved Stripe card, set to the Stripe Customer id (`cus_...`). */
    stripeCustomerId?: string;
    metadata?: Record<string, string>;
}
export interface ChargeResult {
    providerTransactionId: string;
    status: PaymentStatus;
    amount: number;
    currency: string;
    providerRawResponse?: Record<string, unknown>;
}
export interface RefundRequest {
    providerTransactionId: string;
    amount?: number;
    reason?: string;
}
export interface RefundResult {
    providerRefundId: string;
    status: "succeeded" | "pending" | "failed";
    amount: number;
}
export interface NormalizedWebhookEvent {
    eventId: string;
    eventType: string;
    providerTransactionId: string;
    provider: ProviderName;
    amount?: number;
    currency?: string;
    rawEvent: unknown;
}
export interface IPaymentProvider {
    readonly name: ProviderName;
    charge(request: ChargeRequest): Promise<ChargeResult>;
    refund(request: RefundRequest): Promise<RefundResult>;
    getTransaction(providerTransactionId: string): Promise<ChargeResult | null>;
    verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
    normalizeWebhookEvent(rawEvent: unknown): NormalizedWebhookEvent;
}
//# sourceMappingURL=provider.types.d.ts.map