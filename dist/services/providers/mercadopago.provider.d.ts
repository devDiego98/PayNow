import { BaseProvider } from "./base.provider";
import type { ChargeRequest, ChargeResult, NormalizedWebhookEvent, ProviderName, RefundRequest, RefundResult } from "../../types/provider.types";
export declare class MercadoPagoProvider extends BaseProvider {
    readonly name: ProviderName;
    charge(_request: ChargeRequest): Promise<ChargeResult>;
    refund(_request: RefundRequest): Promise<RefundResult>;
    getTransaction(_providerTransactionId: string): Promise<ChargeResult | null>;
    verifyWebhookSignature(_payload: string | Buffer, _signature: string): boolean;
    normalizeWebhookEvent(_rawEvent: unknown): NormalizedWebhookEvent;
}
//# sourceMappingURL=mercadopago.provider.d.ts.map