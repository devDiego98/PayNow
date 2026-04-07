"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeProvider = void 0;
const stripe_1 = __importDefault(require("stripe"));
const errors_1 = require("../../utils/errors");
const base_provider_1 = require("./base.provider");
function toStripeErr(err) {
    if (err instanceof Error) {
        const code = typeof err.code === "string"
            ? err.code
            : undefined;
        return { message: err.message, code };
    }
    return { message: String(err) };
}
const stripeStatusMap = {
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
function isTestCardToken(token) {
    return token.startsWith("tok_");
}
/** Keeps card / server flows off redirect-based methods unless you set a return URL. */
function stripePaymentIntentExtras() {
    const returnUrl = process.env.STRIPE_PAYMENT_RETURN_URL;
    return {
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        ...(returnUrl ? { return_url: returnUrl } : {}),
    };
}
class StripeProvider extends base_provider_1.BaseProvider {
    name = "stripe";
    client;
    constructor() {
        super();
        this.client = new stripe_1.default(process.env.STRIPE_SECRET_KEY || "", {
            apiVersion: "2024-06-20",
        });
    }
    async charge(request) {
        const token = request.paymentMethod.token;
        const common = {
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
                })
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
                providerRawResponse: paymentIntent,
            };
        }
        catch (err) {
            const { message, code } = toStripeErr(err);
            throw new errors_1.ProviderError(message, "stripe", code);
        }
    }
    async refund(request) {
        try {
            const refund = await this.client.refunds.create({
                payment_intent: request.providerTransactionId,
                ...(request.amount !== undefined && { amount: request.amount }),
                reason: request.reason || "requested_by_customer",
            });
            return {
                providerRefundId: refund.id,
                status: refund.status === "succeeded" ? "succeeded" : "pending",
                amount: refund.amount,
            };
        }
        catch (err) {
            const { message, code } = toStripeErr(err);
            throw new errors_1.ProviderError(message, "stripe", code);
        }
    }
    async getTransaction(providerTransactionId) {
        const paymentIntent = await this.client.paymentIntents.retrieve(providerTransactionId);
        return {
            providerTransactionId: paymentIntent.id,
            status: stripeStatusMap[paymentIntent.status] ?? "failed",
            amount: paymentIntent.amount,
            currency: paymentIntent.currency.toUpperCase(),
        };
    }
    verifyWebhookSignature(payload, signature) {
        try {
            this.client.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET || "");
            return true;
        }
        catch {
            return false;
        }
    }
    normalizeWebhookEvent(rawEvent) {
        const event = rawEvent;
        const obj = event.data.object;
        const typeMap = {
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
exports.StripeProvider = StripeProvider;
//# sourceMappingURL=stripe.provider.js.map