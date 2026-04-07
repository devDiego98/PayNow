import type { ProviderName } from "../../types/provider.types";
import { IdempotencyService } from "./idempotency.service";
import { RetryService } from "./retry.service";
export interface CreatePaymentDto {
    provider: ProviderName;
    amount: number;
    currency: string;
    description: string;
    customer: {
        email: string;
        name: string;
    };
    /** Use a new token / pm id / tok_ (not needed if savedCardId is set). */
    paymentMethod?: {
        type: "card" | "bank_transfer" | "wallet";
        token: string;
    };
    /** Our DB id from POST /cards — charges that saved Stripe card (Stripe only). */
    savedCardId?: string;
    metadata?: Record<string, string>;
}
export interface PaymentResponse {
    id: string;
    provider: ProviderName;
    status: string;
    amount: number;
    currency: string;
    providerTransactionId: string;
    description: string;
    createdAt: string;
    metadata?: Record<string, string>;
}
export declare class PaymentService {
    private readonly idempotencyService;
    private readonly retryService;
    private readonly cardService;
    constructor(idempotencyService: IdempotencyService, retryService: RetryService);
    createPayment(dto: CreatePaymentDto, idempotencyKey: string): Promise<PaymentResponse>;
    getPayment(providerTransactionId: string, providerName: ProviderName): Promise<PaymentResponse>;
}
//# sourceMappingURL=payment.service.d.ts.map