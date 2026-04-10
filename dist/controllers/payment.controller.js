"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMercadoPagoPaymentRecords = exports.updateMercadoPagoPreapprovalAmount = exports.createMercadoPagoSubscriptionLink = exports.createMercadoPagoPaymentLink = exports.listPayments = exports.getPaymentById = exports.createPayment = void 0;
const payment_service_1 = require("../services/core/payment.service");
const idempotency_service_1 = require("../services/core/idempotency.service");
const retry_service_1 = require("../services/core/retry.service");
const mercadopagoPaymentRecords_query_1 = require("../services/core/mercadopagoPaymentRecords.query");
const mercadopagoPaymentLink_service_1 = require("../services/mercadopago/mercadopagoPaymentLink.service");
const mercadopagoSubscriptionLink_service_1 = require("../services/mercadopago/mercadopagoSubscriptionLink.service");
const idempotencyService = new idempotency_service_1.IdempotencyService();
const paymentService = new payment_service_1.PaymentService(idempotencyService, new retry_service_1.RetryService());
const mercadopagoPaymentLinkService = new mercadopagoPaymentLink_service_1.MercadoPagoPaymentLinkService(idempotencyService);
const mercadopagoSubscriptionLinkService = new mercadopagoSubscriptionLink_service_1.MercadoPagoSubscriptionLinkService(idempotencyService);
const createPayment = async (req, res, next) => {
    try {
        const raw = req.headers["idempotency-key"];
        const idempotencyKey = (Array.isArray(raw) ? raw[0] : raw) ?? "";
        const result = await paymentService.createPayment(req.body, idempotencyKey);
        res.status(201).json(result);
    }
    catch (e) {
        next(e);
    }
};
exports.createPayment = createPayment;
const getPaymentById = (_req, res) => {
    res.status(501).json({ message: "Not implemented" });
};
exports.getPaymentById = getPaymentById;
const listPayments = async (req, res, next) => {
    try {
        const q = (0, mercadopagoPaymentRecords_query_1.parseListMercadoPagoRecordsQuery)(req.query);
        const { rows, total } = await (0, mercadopagoPaymentRecords_query_1.queryMercadoPagoPaymentRecords)(q);
        res.json({
            payments: rows.map(mercadopagoPaymentRecords_query_1.mapMercadoPagoRecordToListItem),
            total,
            limit: q.limit,
            offset: q.offset,
        });
    }
    catch (e) {
        next(e);
    }
};
exports.listPayments = listPayments;
const createMercadoPagoPaymentLink = async (req, res, next) => {
    try {
        const raw = req.headers["idempotency-key"];
        const idempotencyKey = (Array.isArray(raw) ? raw[0] : raw) ?? "";
        const tokenHeader = req.headers["x-mercadopago-access-token"];
        const accessTokenOverride = (Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader) ?? undefined;
        const result = await mercadopagoPaymentLinkService.createPaymentLink(req.body, idempotencyKey, accessTokenOverride);
        res.status(201).json(result);
    }
    catch (e) {
        next(e);
    }
};
exports.createMercadoPagoPaymentLink = createMercadoPagoPaymentLink;
const createMercadoPagoSubscriptionLink = async (req, res, next) => {
    try {
        const raw = req.headers["idempotency-key"];
        const idempotencyKey = (Array.isArray(raw) ? raw[0] : raw) ?? "";
        const tokenHeader = req.headers["x-mercadopago-access-token"];
        const accessTokenOverride = (Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader) ?? undefined;
        const result = await mercadopagoSubscriptionLinkService.createSubscriptionLink(req.body, idempotencyKey, accessTokenOverride);
        res.status(201).json(result);
    }
    catch (e) {
        next(e);
    }
};
exports.createMercadoPagoSubscriptionLink = createMercadoPagoSubscriptionLink;
const updateMercadoPagoPreapprovalAmount = async (req, res, next) => {
    try {
        const raw = req.headers["idempotency-key"];
        const idempotencyKey = (Array.isArray(raw) ? raw[0] : raw) ?? "";
        const tokenHeader = req.headers["x-mercadopago-access-token"];
        const accessTokenOverride = (Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader) ?? undefined;
        const preapprovalId = String(req.params.preapprovalId ?? "");
        const result = await mercadopagoSubscriptionLinkService.updatePreapprovalAmount(preapprovalId, req.body, idempotencyKey, accessTokenOverride);
        res.status(200).json(result);
    }
    catch (e) {
        next(e);
    }
};
exports.updateMercadoPagoPreapprovalAmount = updateMercadoPagoPreapprovalAmount;
/** Full DB rows (including JSON snapshots). Same filters/pagination as `GET /api/v1/payments`. */
const listMercadoPagoPaymentRecords = async (req, res, next) => {
    try {
        const q = (0, mercadopagoPaymentRecords_query_1.parseListMercadoPagoRecordsQuery)(req.query);
        const { rows, total } = await (0, mercadopagoPaymentRecords_query_1.queryMercadoPagoPaymentRecords)(q);
        res.json({ records: rows, total, limit: q.limit, offset: q.offset });
    }
    catch (e) {
        next(e);
    }
};
exports.listMercadoPagoPaymentRecords = listMercadoPagoPaymentRecords;
//# sourceMappingURL=payment.controller.js.map