import { z } from "zod";
export declare const createPaymentBodySchema: z.ZodEffects<z.ZodObject<{
    provider: z.ZodEnum<["stripe", "paypal", "mercadopago"]>;
    amount: z.ZodNumber;
    currency: z.ZodString;
    description: z.ZodString;
    customer: z.ZodObject<{
        email: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name: string;
    }, {
        email: string;
        name: string;
    }>;
    paymentMethod: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["card", "bank_transfer", "wallet"]>;
        token: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "card" | "bank_transfer" | "wallet";
        token: string;
    }, {
        type: "card" | "bank_transfer" | "wallet";
        token: string;
    }>>;
    /** Id from GET /cards — pay with that saved card (Stripe only; must match customer.email). */
    savedCardId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    currency: string;
    customer: {
        email: string;
        name: string;
    };
    description: string;
    provider: "stripe" | "paypal" | "mercadopago";
    metadata?: Record<string, string> | undefined;
    paymentMethod?: {
        type: "card" | "bank_transfer" | "wallet";
        token: string;
    } | undefined;
    savedCardId?: string | undefined;
}, {
    amount: number;
    currency: string;
    customer: {
        email: string;
        name: string;
    };
    description: string;
    provider: "stripe" | "paypal" | "mercadopago";
    metadata?: Record<string, string> | undefined;
    paymentMethod?: {
        type: "card" | "bank_transfer" | "wallet";
        token: string;
    } | undefined;
    savedCardId?: string | undefined;
}>, {
    amount: number;
    currency: string;
    customer: {
        email: string;
        name: string;
    };
    description: string;
    provider: "stripe" | "paypal" | "mercadopago";
    metadata?: Record<string, string> | undefined;
    paymentMethod?: {
        type: "card" | "bank_transfer" | "wallet";
        token: string;
    } | undefined;
    savedCardId?: string | undefined;
}, {
    amount: number;
    currency: string;
    customer: {
        email: string;
        name: string;
    };
    description: string;
    provider: "stripe" | "paypal" | "mercadopago";
    metadata?: Record<string, string> | undefined;
    paymentMethod?: {
        type: "card" | "bank_transfer" | "wallet";
        token: string;
    } | undefined;
    savedCardId?: string | undefined;
}>;
export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;
export declare const addCardBodySchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    /** Stripe PaymentMethod id from Elements / `stripe.paymentMethods.create` (`pm_...`). */
    paymentMethodId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    paymentMethodId: string;
}, {
    email: string;
    name: string;
    paymentMethodId: string;
}>;
export type AddCardBody = z.infer<typeof addCardBodySchema>;
export declare const getCardsQuerySchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
/** Checkout Pro link — `amount` is smallest currency unit (e.g. ARS centavos), same as POST /payments. */
export declare const createMercadoPagoPaymentLinkBodySchema: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    alias: z.ZodOptional<z.ZodString>;
    cbu: z.ZodOptional<z.ZodString>;
    externalReference: z.ZodOptional<z.ZodString>;
    payerEmail: z.ZodOptional<z.ZodString>;
    /** Passed through to preference metadata for downstream webhook routing (e.g. Poneteweb). */
    commerceId: z.ZodOptional<z.ZodNumber>;
    notificationUrl: z.ZodOptional<z.ZodString>;
    backUrls: z.ZodOptional<z.ZodObject<{
        success: z.ZodOptional<z.ZodString>;
        pending: z.ZodOptional<z.ZodString>;
        failure: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pending?: string | undefined;
        success?: string | undefined;
        failure?: string | undefined;
    }, {
        pending?: string | undefined;
        success?: string | undefined;
        failure?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    currency: string;
    description?: string | undefined;
    title?: string | undefined;
    alias?: string | undefined;
    cbu?: string | undefined;
    externalReference?: string | undefined;
    payerEmail?: string | undefined;
    commerceId?: number | undefined;
    notificationUrl?: string | undefined;
    backUrls?: {
        pending?: string | undefined;
        success?: string | undefined;
        failure?: string | undefined;
    } | undefined;
}, {
    amount: number;
    currency?: string | undefined;
    description?: string | undefined;
    title?: string | undefined;
    alias?: string | undefined;
    cbu?: string | undefined;
    externalReference?: string | undefined;
    payerEmail?: string | undefined;
    commerceId?: number | undefined;
    notificationUrl?: string | undefined;
    backUrls?: {
        pending?: string | undefined;
        success?: string | undefined;
        failure?: string | undefined;
    } | undefined;
}>;
export type CreateMercadoPagoPaymentLinkBody = z.infer<typeof createMercadoPagoPaymentLinkBodySchema>;
//# sourceMappingURL=validator.d.ts.map