"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMercadoPagoPaymentLinkBodySchema = exports.getCardsQuerySchema = exports.addCardBodySchema = exports.createPaymentBodySchema = void 0;
const zod_1 = require("zod");
exports.createPaymentBodySchema = zod_1.z
    .object({
    provider: zod_1.z.enum(["stripe", "paypal", "mercadopago"]),
    amount: zod_1.z.number().positive(),
    currency: zod_1.z.string().min(3).max(3),
    description: zod_1.z.string().min(1),
    customer: zod_1.z.object({
        email: zod_1.z.string().email(),
        name: zod_1.z.string().min(1),
    }),
    paymentMethod: zod_1.z
        .object({
        type: zod_1.z.enum(["card", "bank_transfer", "wallet"]),
        token: zod_1.z.string().min(1),
    })
        .optional(),
    /** Id from GET /cards — pay with that saved card (Stripe only; must match customer.email). */
    savedCardId: zod_1.z.string().min(1).optional(),
    metadata: zod_1.z.record(zod_1.z.string()).optional(),
})
    .refine((d) => Boolean(d.paymentMethod) !== Boolean(d.savedCardId), {
    message: "Provide exactly one of paymentMethod or savedCardId",
    path: ["paymentMethod"],
});
exports.addCardBodySchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(1),
    /** Stripe PaymentMethod id from Elements / `stripe.paymentMethods.create` (`pm_...`). */
    paymentMethodId: zod_1.z.string().min(1),
});
exports.getCardsQuerySchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
/** Checkout Pro link — `amount` is smallest currency unit (e.g. ARS centavos), same as POST /payments. */
exports.createMercadoPagoPaymentLinkBodySchema = zod_1.z.object({
    amount: zod_1.z.number().int().positive(),
    currency: zod_1.z.string().min(3).max(3).default("ARS"),
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    alias: zod_1.z.string().min(1).optional(),
    cbu: zod_1.z.string().min(1).optional(),
    externalReference: zod_1.z.string().min(1).optional(),
    payerEmail: zod_1.z.string().email().optional(),
    /** Passed through to preference metadata for downstream webhook routing (e.g. Poneteweb). */
    commerceId: zod_1.z.number().int().positive().optional(),
    notificationUrl: zod_1.z.string().url().optional(),
    backUrls: zod_1.z
        .object({
        success: zod_1.z.string().url().optional(),
        pending: zod_1.z.string().url().optional(),
        failure: zod_1.z.string().url().optional(),
    })
        .optional(),
    /** Maps to Mercado Pago `payment_methods.installments` (max card installments in Checkout Pro). */
    maxInstallments: zod_1.z.number().int().min(1).max(36).optional(),
    /** Maps to Mercado Pago `payment_methods.default_installments` (preselected installment count; ≤ maxInstallments). */
    defaultInstallments: zod_1.z.number().int().min(1).max(36).optional(),
});
//# sourceMappingURL=validator.js.map