import { BaseProvider } from "./base.provider";
import type {
  ChargeRequest,
  ChargeResult,
  NormalizedWebhookEvent,
  ProviderName,
  RefundRequest,
  RefundResult,
} from "../../types/provider.types";

export class MercadoPagoProvider extends BaseProvider {
  readonly name: ProviderName = "mercadopago";

  charge(_request: ChargeRequest): Promise<ChargeResult> {
    return Promise.reject(new Error("Mercado Pago provider not implemented"));
  }

  refund(_request: RefundRequest): Promise<RefundResult> {
    return Promise.reject(new Error("Mercado Pago provider not implemented"));
  }

  getTransaction(_providerTransactionId: string): Promise<ChargeResult | null> {
    return Promise.resolve(null);
  }

  verifyWebhookSignature(_payload: string | Buffer, _signature: string): boolean {
    return false;
  }

  normalizeWebhookEvent(_rawEvent: unknown): NormalizedWebhookEvent {
    throw new Error("Mercado Pago provider not implemented");
  }
}
