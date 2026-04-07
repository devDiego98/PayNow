import Stripe from "stripe";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/errors";

export interface AddCardInput {
  email: string;
  name: string;
  /** Stripe PaymentMethod id (`pm_...`) from Stripe.js / Elements / Dashboard. */
  paymentMethodId: string;
}

function stripeErrMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function errCode(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    return String((err as { code?: string }).code ?? "");
  }
  return "";
}

export class CardService {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-06-20",
    });
  }

  async addCard(input: AddCardInput) {
    if (!input.paymentMethodId.startsWith("pm_")) {
      throw new AppError("paymentMethodId must be a Stripe PaymentMethod id (pm_...)", 400);
    }

    let customer = await prisma.customer.findUnique({ where: { email: input.email } });

    if (!customer) {
      try {
        const sc = await this.stripe.customers.create({
          email: input.email,
          name: input.name,
        });
        customer = await prisma.customer.create({
          data: {
            email: input.email,
            name: input.name,
            stripeCustomerId: sc.id,
          },
        });
      } catch (err: unknown) {
        throw new AppError(`Stripe customer error: ${stripeErrMessage(err)}`, 502);
      }
    } else if (customer.name !== input.name) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { name: input.name },
      });
      try {
        await this.stripe.customers.update(customer.stripeCustomerId, { name: input.name });
      } catch {
        /* ignore */
      }
    }

    const wrongOwner = await prisma.savedCard.findUnique({
      where: { stripePaymentMethodId: input.paymentMethodId },
    });
    if (wrongOwner && wrongOwner.customerId !== customer.id) {
      throw new AppError("This card is already saved to another account", 409);
    }

    try {
      await this.stripe.paymentMethods.attach(input.paymentMethodId, {
        customer: customer.stripeCustomerId,
      });
    } catch (err: unknown) {
      if (errCode(err) === "resource_already_exists") {
        const pm = await this.stripe.paymentMethods.retrieve(input.paymentMethodId);
        const custId =
          typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
        if (custId !== customer.stripeCustomerId) {
          throw new AppError("This payment method is attached to another Stripe customer", 409);
        }
      } else {
        throw new AppError(`Could not attach card: ${stripeErrMessage(err)}`, 400);
      }
    }

    const pm = await this.stripe.paymentMethods.retrieve(input.paymentMethodId);
    const existingRow = await prisma.savedCard.findUnique({
      where: { stripePaymentMethodId: pm.id },
    });
    if (existingRow) {
      return existingRow;
    }

    const c = pm.card;
    if (!c) {
      throw new AppError("Payment method is not a card", 400);
    }

    return prisma.savedCard.create({
      data: {
        customerId: customer.id,
        stripePaymentMethodId: pm.id,
        brand: c.brand ?? null,
        last4: c.last4 ?? null,
        expMonth: c.exp_month ?? null,
        expYear: c.exp_year ?? null,
      },
    });
  }

  async getCardsByEmail(email: string) {
    const dbCustomer = await prisma.customer.findUnique({ where: { email } });
    if (!dbCustomer) {
      return [];
    }
    return prisma.savedCard.findMany({
      where: { customerId: dbCustomer.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        brand: true,
        last4: true,
        expMonth: true,
        expYear: true,
        isDefault: true,
        createdAt: true,
      },
    });
  }

  async resolveSavedCardForCharge(email: string, savedCardId: string) {
    const dbCustomer = await prisma.customer.findUnique({ where: { email } });
    if (!dbCustomer) {
      throw new AppError("No saved customer for this email. Add a card first.", 404);
    }
    const card = await prisma.savedCard.findFirst({
      where: { id: savedCardId, customerId: dbCustomer.id },
    });
    if (!card) {
      throw new AppError("Saved card not found", 404);
    }
    return {
      stripePaymentMethodId: card.stripePaymentMethodId,
      stripeCustomerId: dbCustomer.stripeCustomerId,
    };
  }
}
