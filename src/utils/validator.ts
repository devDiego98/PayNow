import { z } from "zod";

export const createPaymentBodySchema = z
  .object({
    provider: z.enum(["stripe", "paypal", "mercadopago"]),
    amount: z.number().positive(),
    currency: z.string().min(3).max(3),
    description: z.string().min(1),
    customer: z.object({
      email: z.string().email(),
      name: z.string().min(1),
    }),
    paymentMethod: z
      .object({
        type: z.enum(["card", "bank_transfer", "wallet"]),
        token: z.string().min(1),
      })
      .optional(),
    /** Id from GET /cards — pay with that saved card (Stripe only; must match customer.email). */
    savedCardId: z.string().min(1).optional(),
    metadata: z.record(z.string()).optional(),
  })
  .refine((d) => Boolean(d.paymentMethod) !== Boolean(d.savedCardId), {
    message: "Provide exactly one of paymentMethod or savedCardId",
    path: ["paymentMethod"],
  });

export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;

export const addCardBodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  /** Stripe PaymentMethod id from Elements / `stripe.paymentMethods.create` (`pm_...`). */
  paymentMethodId: z.string().min(1),
});

export type AddCardBody = z.infer<typeof addCardBodySchema>;

export const getCardsQuerySchema = z.object({
  email: z.string().email(),
});

/** Checkout Pro link — `amount` is smallest currency unit (e.g. ARS centavos), same as POST /payments. */
export const createMercadoPagoPaymentLinkBodySchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().min(3).max(3).default("ARS"),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  alias: z.string().min(1).optional(),
  cbu: z.string().min(1).optional(),
  externalReference: z.string().min(1).optional(),
  payerEmail: z.string().email().optional(),
  /** Passed through to preference metadata for downstream webhook routing (e.g. Poneteweb). */
  commerceId: z.number().int().positive().optional(),
  notificationUrl: z.string().url().optional(),
  backUrls: z
    .object({
      success: z.string().url().optional(),
      pending: z.string().url().optional(),
      failure: z.string().url().optional(),
    })
    .optional(),
});

export type CreateMercadoPagoPaymentLinkBody = z.infer<typeof createMercadoPagoPaymentLinkBodySchema>;
