import { IdempotencyService } from "../core/idempotency.service";
export interface CreateMercadoPagoPaymentLinkDto {
    /** Amount in smallest currency unit (e.g. centavos for ARS), same convention as POST /payments. */
    amount: number;
    currency: string;
    title?: string;
    description?: string;
    /** Payee alias (e.g. CBU/CVU label) — stored in preference metadata; funds settle to the MP account for the access token. */
    alias?: string;
    cbu?: string;
    externalReference?: string;
    payerEmail?: string;
}
export interface MercadoPagoPaymentLinkResponse {
    preferenceId: string;
    initPoint: string;
    sandboxInitPoint: string | null;
    collectorId?: number;
    amount: number;
    currency: string;
    recipient: {
        alias?: string;
        cbu?: string;
    };
    externalReference?: string;
}
export declare class MercadoPagoPaymentLinkService {
    private readonly idempotencyService;
    constructor(idempotencyService: IdempotencyService);
    createPaymentLink(dto: CreateMercadoPagoPaymentLinkDto, idempotencyKey: string): Promise<MercadoPagoPaymentLinkResponse>;
}
//# sourceMappingURL=mercadopagoPaymentLink.service.d.ts.map