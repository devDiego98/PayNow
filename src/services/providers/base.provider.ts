import type {
  ChargeRequest,
  ChargeResult,
  IPaymentProvider,
  NormalizedWebhookEvent,
  ProviderName,
  RefundRequest,
  RefundResult,
} from "../../types/provider.types";

export abstract class BaseProvider implements IPaymentProvider {
  abstract readonly name: ProviderName;

  abstract charge(request: ChargeRequest): Promise<ChargeResult>;

  abstract refund(request: RefundRequest): Promise<RefundResult>;

  abstract getTransaction(providerTransactionId: string): Promise<ChargeResult | null>;

  abstract verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;

  abstract normalizeWebhookEvent(rawEvent: unknown): NormalizedWebhookEvent;
}

export type { IPaymentProvider, ProviderName };
