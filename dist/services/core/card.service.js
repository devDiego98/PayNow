"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const database_1 = require("../../config/database");
const errors_1 = require("../../utils/errors");
function stripeErrMessage(err) {
    if (err instanceof Error)
        return err.message;
    return String(err);
}
function errCode(err) {
    if (typeof err === "object" && err !== null && "code" in err) {
        return String(err.code ?? "");
    }
    return "";
}
class CardService {
    stripe;
    constructor() {
        this.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || "", {
            apiVersion: "2024-06-20",
        });
    }
    async addCard(input) {
        if (!input.paymentMethodId.startsWith("pm_")) {
            throw new errors_1.AppError("paymentMethodId must be a Stripe PaymentMethod id (pm_...)", 400);
        }
        let customer = await database_1.prisma.customer.findUnique({ where: { email: input.email } });
        if (!customer) {
            try {
                const sc = await this.stripe.customers.create({
                    email: input.email,
                    name: input.name,
                });
                customer = await database_1.prisma.customer.create({
                    data: {
                        email: input.email,
                        name: input.name,
                        stripeCustomerId: sc.id,
                    },
                });
            }
            catch (err) {
                throw new errors_1.AppError(`Stripe customer error: ${stripeErrMessage(err)}`, 502);
            }
        }
        else if (customer.name !== input.name) {
            await database_1.prisma.customer.update({
                where: { id: customer.id },
                data: { name: input.name },
            });
            try {
                await this.stripe.customers.update(customer.stripeCustomerId, { name: input.name });
            }
            catch {
                /* ignore */
            }
        }
        const wrongOwner = await database_1.prisma.savedCard.findUnique({
            where: { stripePaymentMethodId: input.paymentMethodId },
        });
        if (wrongOwner && wrongOwner.customerId !== customer.id) {
            throw new errors_1.AppError("This card is already saved to another account", 409);
        }
        try {
            await this.stripe.paymentMethods.attach(input.paymentMethodId, {
                customer: customer.stripeCustomerId,
            });
        }
        catch (err) {
            if (errCode(err) === "resource_already_exists") {
                const pm = await this.stripe.paymentMethods.retrieve(input.paymentMethodId);
                const custId = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
                if (custId !== customer.stripeCustomerId) {
                    throw new errors_1.AppError("This payment method is attached to another Stripe customer", 409);
                }
            }
            else {
                throw new errors_1.AppError(`Could not attach card: ${stripeErrMessage(err)}`, 400);
            }
        }
        const pm = await this.stripe.paymentMethods.retrieve(input.paymentMethodId);
        const existingRow = await database_1.prisma.savedCard.findUnique({
            where: { stripePaymentMethodId: pm.id },
        });
        if (existingRow) {
            return existingRow;
        }
        const c = pm.card;
        if (!c) {
            throw new errors_1.AppError("Payment method is not a card", 400);
        }
        return database_1.prisma.savedCard.create({
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
    async getCardsByEmail(email) {
        const dbCustomer = await database_1.prisma.customer.findUnique({ where: { email } });
        if (!dbCustomer) {
            return [];
        }
        return database_1.prisma.savedCard.findMany({
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
    async resolveSavedCardForCharge(email, savedCardId) {
        const dbCustomer = await database_1.prisma.customer.findUnique({ where: { email } });
        if (!dbCustomer) {
            throw new errors_1.AppError("No saved customer for this email. Add a card first.", 404);
        }
        const card = await database_1.prisma.savedCard.findFirst({
            where: { id: savedCardId, customerId: dbCustomer.id },
        });
        if (!card) {
            throw new errors_1.AppError("Saved card not found", 404);
        }
        return {
            stripePaymentMethodId: card.stripePaymentMethodId,
            stripeCustomerId: dbCustomer.stripeCustomerId,
        };
    }
}
exports.CardService = CardService;
//# sourceMappingURL=card.service.js.map