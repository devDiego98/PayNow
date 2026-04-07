import Stripe from "stripe";
import type {
  ChargeRequest,
  ChargeResult,
  NormalizedWebhookEvent,
  PaymentStatus,
  RefundRequest,
  RefundResult,
} from "../../types/provider.types";
import { ProviderError } from "../../utils/errors";
import { BaseProvider } from "./base.provider";

function toStripeErr(err: unknown): { message: string; code?: string } {
  if (err instanceof Error) {
    const code =
      typeof (err as { code?: string }).code === "string"
        ? (err as { code?: string }).code
        : undefined;
    return { message: err.message, code };
  }
  return { message: String(err) };
}

const stripeStatusMap: Record<string, PaymentStatus> = {
  succeeded: "succeeded",
  pending: "pending",
  processing: "processing",
  failed: "failed",
  canceled: "cancelled",
};

/**
 * - `pm_…` — PaymentMethod id (from Elements, mobile SDK, or Dashboard).
 * - `tok_…` — Stripe **test** card tokens only (e.g. `tok_visa`). Use in test mode
 *   when you cannot create PMs from raw card numbers (Dashboard “raw card data” off).
 * @see https://stripe.com/docs/testing#cards
 */
function isTestCardToken(token: string): boolean {
  return token.startsWith("tok_");
}

/** Keeps card / server flows off redirect-based methods unless you set a return URL. */
function stripePaymentIntentExtras(): Pick<
  Stripe.PaymentIntentCreateParams,
  "automatic_payment_methods" | "return_url"
> {
  const returnUrl = process.env.STRIPE_PAYMENT_RETURN_URL;
  return {
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    ...(returnUrl ? { return_url: returnUrl } : {}),
  };
}

export class StripeProvider extends BaseProvider {
  readonly name = "stripe" as const;
  private readonly client: Stripe;

  constructor() {
    super();
    this.client = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-06-20",
    });
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const token = request.paymentMethod.token;

    const common: Stripe.PaymentIntentCreateParams = {
      amount: request.amount,
      currency: request.currency.toLowerCase(),
      description: request.description,
      confirm: true,
      receipt_email: request.customer.email,
      metadata: request.metadata || {},
    };

    const extras = stripePaymentIntentExtras();
    const customerOpt = request.stripeCustomerId
      ? { customer: request.stripeCustomerId }
      : {};

    try {
      // Test tokens (`tok_…`) must use `payment_method_data`; Stripe’s TS types omit `card`
      // here for PCI reasons, but test-mode tokens are documented:
      // https://stripe.com/docs/testing#cards
      const paymentIntent = isTestCardToken(token)
        ? await this.client.paymentIntents.create({
            ...common,
            ...extras,
            ...customerOpt,
            payment_method_data: {
              type: "card",
              card: { token },
            },
          } as unknown as Stripe.PaymentIntentCreateParams)
        : await this.client.paymentIntents.create({
            ...common,
            ...extras,
            ...customerOpt,
            payment_method: token,
          });

      return {
        providerTransactionId: paymentIntent.id,
        status: stripeStatusMap[paymentIntent.status] ?? "failed",
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        providerRawResponse: paymentIntent as unknown as Record<string, unknown>,
      };
    } catch (err: unknown) {
      const { message, code } = toStripeErr(err);
      throw new ProviderError(message, "stripe", code);
    }
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    try {
      const refund = await this.client.refunds.create({
        payment_intent: request.providerTransactionId,
        ...(request.amount !== undefined && { amount: request.amount }),
        reason:
          (request.reason as Stripe.RefundCreateParams.Reason) || "requested_by_customer",
      });
      return {
        providerRefundId: refund.id,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        amount: refund.amount,
      };
    } catch (err: unknown) {
      const { message, code } = toStripeErr(err);
      throw new ProviderError(message, "stripe", code);
    }
  }

  async getTransaction(providerTransactionId: string): Promise<ChargeResult | null> {
    const paymentIntent = await this.client.paymentIntents.retrieve(providerTransactionId);
    return {
      providerTransactionId: paymentIntent.id,
      status: stripeStatusMap[paymentIntent.status] ?? "failed",
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
    };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    try {
      this.client.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
      return true;
    } catch {
      return false;
    }
  }

  normalizeWebhookEvent(rawEvent: unknown): NormalizedWebhookEvent {
    const event = rawEvent as Stripe.Event;
    const obj = event.data.object as Stripe.PaymentIntent;
    const typeMap: Record<string, string> = {
      "payment_intent.succeeded": "payment.succeeded",
      "payment_intent.payment_failed": "payment.failed",
      "charge.refunded": "payment.refunded",
      "charge.dispute.created": "payment.disputed",
    };
    return {
      eventId: event.id,
      eventType: typeMap[event.type] || event.type,
      providerTransactionId: obj.id,
      provider: "stripe",
      amount: obj.amount,
      currency: obj.currency?.toUpperCase(),
      rawEvent,
    };
  }
}
