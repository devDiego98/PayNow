import { BaseProvider } from "./base.provider";
import type {
  ChargeRequest,
  ChargeResult,
  NormalizedWebhookEvent,
  ProviderName,
  RefundRequest,
  RefundResult,
} from "../../types/provider.types";

export class PayPalProvider extends BaseProvider {
  readonly name: ProviderName = "paypal";

  charge(_request: ChargeRequest): Promise<ChargeResult> {
    return Promise.reject(new Error("PayPal provider not implemented"));
  }

  refund(_request: RefundRequest): Promise<RefundResult> {
    return Promise.reject(new Error("PayPal provider not implemented"));
  }

  getTransaction(_providerTransactionId: string): Promise<ChargeResult | null> {
    return Promise.resolve(null);
  }

  verifyWebhookSignature(_payload: string | Buffer, _signature: string): boolean {
    return false;
  }

  normalizeWebhookEvent(_rawEvent: unknown): NormalizedWebhookEvent {
    throw new Error("PayPal provider not implemented");
  }
}
