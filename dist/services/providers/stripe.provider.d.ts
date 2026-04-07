import type { ChargeRequest, ChargeResult, NormalizedWebhookEvent, RefundRequest, RefundResult } from "../../types/provider.types";
import { BaseProvider } from "./base.provider";
export declare class StripeProvider extends BaseProvider {
    readonly name: "stripe";
    private readonly client;
    constructor();
    charge(request: ChargeRequest): Promise<ChargeResult>;
    refund(request: RefundRequest): Promise<RefundResult>;
    getTransaction(providerTransactionId: string): Promise<ChargeResult | null>;
    verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
    normalizeWebhookEvent(rawEvent: unknown): NormalizedWebhookEvent;
}
//# sourceMappingURL=stripe.provider.d.ts.map