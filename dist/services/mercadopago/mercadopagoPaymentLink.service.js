"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoPagoPaymentLinkService = void 0;
const mercadopago_1 = require("mercadopago");
const uuid_1 = require("uuid");
const errors_1 = require("../../utils/errors");
const mercadopagoErrors_1 = require("../../utils/mercadopagoErrors");
function normalizeAlias(s) {
    return s.trim().toLowerCase();
}
function normalizeCbu(s) {
    return s.replace(/\s+/g, "");
}
function validateRecipientAgainstEnv(dto) {
    const expectedAlias = process.env.MERCADOPAGO_RECIPIENT_ALIAS?.trim();
    const expectedCbu = process.env.MERCADOPAGO_RECIPIENT_CBU?.trim();
    if (expectedAlias) {
        if (!dto.alias?.trim()) {
            throw new errors_1.AppError("alias is required when MERCADOPAGO_RECIPIENT_ALIAS is configured on the server", 400);
        }
        if (normalizeAlias(dto.alias) !== normalizeAlias(expectedAlias)) {
            throw new errors_1.AppError("alias does not match the configured Mercado Pago recipient", 400);
        }
    }
    if (expectedCbu) {
        if (!dto.cbu?.trim()) {
            throw new errors_1.AppError("cbu is required when MERCADOPAGO_RECIPIENT_CBU is configured on the server", 400);
        }
        if (normalizeCbu(dto.cbu) !== normalizeCbu(expectedCbu)) {
            throw new errors_1.AppError("cbu does not match the configured Mercado Pago recipient", 400);
        }
    }
}
class MercadoPagoPaymentLinkService {
    idempotencyService;
    constructor(idempotencyService) {
        this.idempotencyService = idempotencyService;
    }
    async createPaymentLink(dto, idempotencyKey, accessTokenOverride) {
        const cached = await this.idempotencyService.get(idempotencyKey);
        if (cached)
            return cached;
        const accessToken = accessTokenOverride?.trim() || process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
        if (!accessToken) {
            throw new errors_1.AppError("MERCADOPAGO_ACCESS_TOKEN is not configured", 503);
        }
        validateRecipientAgainstEnv(dto);
        const currency = dto.currency.toUpperCase();
        const unitPrice = Math.round(dto.amount) / 100;
        if (unitPrice <= 0) {
            throw new errors_1.AppError("amount must be positive", 400);
        }
        const externalReference = dto.externalReference ?? (0, uuid_1.v4)();
        const title = dto.title ?? dto.description ?? "Payment";
        const itemId = `item_${externalReference.slice(0, 32)}`;
        const metadata = {
            paygate: "1",
            external_reference: externalReference,
        };
        if (dto.alias?.trim())
            metadata.recipient_alias = dto.alias.trim();
        if (dto.cbu?.trim())
            metadata.recipient_cbu = normalizeCbu(dto.cbu);
        if (dto.commerceId != null && Number.isFinite(dto.commerceId)) {
            metadata.commerce_id = String(Math.trunc(dto.commerceId));
        }
        const client = new mercadopago_1.MercadoPagoConfig({ accessToken });
        const preference = new mercadopago_1.Preference(client);
        const notificationUrl = dto.notificationUrl?.trim() || process.env.MERCADOPAGO_NOTIFICATION_URL?.trim();
        const envBackSuccess = process.env.MERCADOPAGO_BACK_URL_SUCCESS?.trim();
        const envBackPending = process.env.MERCADOPAGO_BACK_URL_PENDING?.trim();
        const envBackFailure = process.env.MERCADOPAGO_BACK_URL_FAILURE?.trim();
        /** MP requires `back_urls.success` whenever `auto_return` is set; omit undefined keys so JSON is not missing `success`. */
        const back_urls = {};
        const requestedBackUrls = dto.backUrls;
        if (requestedBackUrls?.success?.trim())
            back_urls.success = requestedBackUrls.success.trim();
        else if (envBackSuccess)
            back_urls.success = envBackSuccess;
        if (requestedBackUrls?.pending?.trim())
            back_urls.pending = requestedBackUrls.pending.trim();
        else if (envBackPending)
            back_urls.pending = envBackPending;
        if (requestedBackUrls?.failure?.trim())
            back_urls.failure = requestedBackUrls.failure.trim();
        else if (envBackFailure)
            back_urls.failure = envBackFailure;
        const hasBackUrls = Object.keys(back_urls).length > 0;
        /**
         * We intentionally avoid `auto_return` to prevent Mercado Pago rejecting preferences when
         * `back_urls.success` is missing/empty/malformed in some environments. Redirects still work
         * via `back_urls` alone.
         */
        const auto_return = undefined;
        const maxInstallments = dto.maxInstallments != null && Number.isFinite(dto.maxInstallments)
            ? Math.min(36, Math.max(1, Math.trunc(dto.maxInstallments)))
            : undefined;
        try {
            const body = await preference.create({
                body: {
                    items: [
                        {
                            id: itemId,
                            title,
                            description: dto.description,
                            quantity: 1,
                            currency_id: currency,
                            unit_price: unitPrice,
                        },
                    ],
                    external_reference: externalReference,
                    metadata,
                    notification_url: notificationUrl || undefined,
                    ...(hasBackUrls ? { back_urls } : {}),
                    ...(auto_return ? { auto_return } : {}),
                    payer: dto.payerEmail ? { email: dto.payerEmail } : undefined,
                    ...(maxInstallments != null
                        ? { payment_methods: { installments: maxInstallments } }
                        : {}),
                },
            });
            const preferenceId = body.id;
            const initPoint = body.init_point;
            if (!preferenceId || !initPoint) {
                throw new errors_1.ProviderError("Mercado Pago preference response missing id or init_point", "mercadopago", "invalid_response");
            }
            const response = {
                preferenceId,
                initPoint,
                sandboxInitPoint: body.sandbox_init_point ?? null,
                collectorId: body.collector_id,
                amount: dto.amount,
                currency,
                recipient: {
                    ...(dto.alias?.trim() ? { alias: dto.alias.trim() } : {}),
                    ...(dto.cbu?.trim() ? { cbu: normalizeCbu(dto.cbu) } : {}),
                },
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
exports.MercadoPagoPaymentLinkService = MercadoPagoPaymentLinkService;
//# sourceMappingURL=mercadopagoPaymentLink.service.js.map