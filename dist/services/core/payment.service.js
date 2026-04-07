"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const uuid_1 = require("uuid");
const provider_factory_1 = require("../providers/provider.factory");
const errors_1 = require("../../utils/errors");
const card_service_1 = require("./card.service");
class PaymentService {
    idempotencyService;
    retryService;
    cardService = new card_service_1.CardService();
    constructor(idempotencyService, retryService) {
        this.idempotencyService = idempotencyService;
        this.retryService = retryService;
    }
    async createPayment(dto, idempotencyKey) {
        const cached = await this.idempotencyService.get(idempotencyKey);
        if (cached)
            return cached;
        const hasPm = Boolean(dto.paymentMethod);
        const hasSaved = Boolean(dto.savedCardId);
        if (hasPm === hasSaved) {
            throw new errors_1.AppError("Provide exactly one of paymentMethod or savedCardId", 400);
        }
        let paymentMethod = dto.paymentMethod;
        let stripeCustomerId;
        if (dto.savedCardId) {
            if (dto.provider !== "stripe") {
                throw new errors_1.AppError("savedCardId is only supported when provider is stripe", 400);
            }
            const resolved = await this.cardService.resolveSavedCardForCharge(dto.customer.email, dto.savedCardId);
            paymentMethod = { type: "card", token: resolved.stripePaymentMethodId };
            stripeCustomerId = resolved.stripeCustomerId;
        }
        if (!paymentMethod) {
            throw new errors_1.AppError("paymentMethod or savedCardId is required", 400);
        }
        const provider = provider_factory_1.ProviderFactory.get(dto.provider);
        const chargeRequest = {
            amount: dto.amount,
            currency: dto.currency,
            description: dto.description,
            customer: dto.customer,
            paymentMethod,
            stripeCustomerId,
            metadata: dto.metadata,
        };
        const result = await this.retryService.execute(() => provider.charge(chargeRequest));
        const response = {
            id: `pay_${(0, uuid_1.v4)().replace(/-/g, "").slice(0, 20)}`,
            provider: dto.provider,
            status: result.status,
            amount: result.amount,
            currency: result.currency,
            providerTransactionId: result.providerTransactionId,
            description: dto.description,
            createdAt: new Date().toISOString(),
            metadata: dto.metadata,
        };
        await this.idempotencyService.set(idempotencyKey, response);
        return response;
    }
    async getPayment(providerTransactionId, providerName) {
        const provider = provider_factory_1.ProviderFactory.get(providerName);
        const result = await provider.getTransaction(providerTransactionId);
        if (!result)
            throw new errors_1.AppError("Payment not found", 404);
        return {
            id: providerTransactionId,
            provider: providerName,
            status: result.status,
            amount: result.amount,
            currency: result.currency,
            providerTransactionId: result.providerTransactionId,
            description: "",
            createdAt: new Date().toISOString(),
        };
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=payment.service.js.map