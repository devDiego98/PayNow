"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoPagoSubscriptionLinkService = void 0;
const mercadopago_1 = require("mercadopago");
const errors_1 = require("../../utils/errors");
const mercadopagoErrors_1 = require("../../utils/mercadopagoErrors");
class MercadoPagoSubscriptionLinkService {
    idempotencyService;
    constructor(idempotencyService) {
        this.idempotencyService = idempotencyService;
    }
    async createSubscriptionLink(dto, idempotencyKey, accessTokenOverride) {
        const cached = await this.idempotencyService.get(idempotencyKey);
        if (cached)
            return cached;
        const accessToken = accessTokenOverride?.trim() || process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
        if (!accessToken) {
            throw new errors_1.AppError("MERCADOPAGO_ACCESS_TOKEN is not configured", 503);
        }
        const currency = dto.currency.toUpperCase();
        const unitAmount = Math.round(dto.amount) / 100;
        if (unitAmount <= 0) {
            throw new errors_1.AppError("amount must be positive", 400);
        }
        const frequency = Math.max(1, Math.trunc(dto.frequency));
        const externalReference = dto.externalReference?.trim() ||
            `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        const metadata = {
            paygate: "1",
            external_reference: externalReference,
        };
        if (dto.commerceId != null && Number.isFinite(dto.commerceId)) {
            metadata.commerce_id = String(Math.trunc(dto.commerceId));
        }
        if (dto.planId != null && Number.isFinite(dto.planId)) {
            metadata.plan_id = String(Math.trunc(dto.planId));
        }
        const notificationUrl = dto.notificationUrl?.trim() || process.env.MERCADOPAGO_NOTIFICATION_URL?.trim();
        const client = new mercadopago_1.MercadoPagoConfig({ accessToken });
        const preapprovalApi = new mercadopago_1.PreApproval(client);
        const body = {
            back_url: dto.backUrl.trim(),
            reason: dto.reason.trim(),
            auto_recurring: {
                frequency,
                frequency_type: dto.frequencyType,
                transaction_amount: unitAmount,
                currency_id: currency,
            },
            payer_email: dto.payerEmail.trim(),
            ...(notificationUrl ? { notification_url: notificationUrl } : {}),
            external_reference: externalReference,
            metadata,
        };
        try {
            const mpResponse = await preapprovalApi.create({
                body: body,
            });
            const mp = mpResponse;
            const preapprovalId = mp.id != null ? String(mp.id) : null;
            let initPoint = mp.init_point ??
                mp.init_point_url ??
                mp.sandbox_init_point ??
                null;
            if (preapprovalId && !initPoint) {
                initPoint = `https://www.mercadopago.com.ar/subscriptions/checkout/v2?preapproval_id=${preapprovalId}`;
            }
            if (initPoint && !initPoint.startsWith("http")) {
                initPoint = `https://www.mercadopago.com.ar${initPoint.startsWith("/") ? "" : "/"}${initPoint}`;
            }
            if (!preapprovalId || !initPoint) {
                throw new errors_1.ProviderError("Mercado Pago preapproval response missing id or init_point", "mercadopago", "invalid_response");
            }
            const sandboxInitPoint = mp.sandbox_init_point ?? null;
            const response = {
                preapprovalId,
                initPoint,
                sandboxInitPoint,
                amount: dto.amount,
                currency,
                reason: dto.reason.trim(),
                externalReference,
            };
            await this.idempotencyService.set(idempotencyKey, response);
            return response;
        }
        catch (e) {
            if (e instanceof errors_1.AppError || e instanceof errors_1.ProviderError)
                throw e;
            const msg = (0, mercadopagoErrors_1.mercadoPagoApiErrorMessage)(e);
            const code = (0, mercadopagoErrors_1.mercadoPagoApiErrorCode)(e);
            throw new errors_1.ProviderError(msg, "mercadopago", code);
        }
    }
}
exports.MercadoPagoSubscriptionLinkService = MercadoPagoSubscriptionLinkService;
//# sourceMappingURL=mercadopagoSubscriptionLink.service.js.map