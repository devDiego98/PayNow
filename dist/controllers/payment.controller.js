"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMercadoPagoPaymentRecords = exports.createMercadoPagoPaymentLink = exports.listPayments = exports.getPaymentById = exports.createPayment = void 0;
const payment_service_1 = require("../services/core/payment.service");
const idempotency_service_1 = require("../services/core/idempotency.service");
const retry_service_1 = require("../services/core/retry.service");
const mercadopagoPaymentRecords_query_1 = require("../services/core/mercadopagoPaymentRecords.query");
const mercadopagoPaymentLink_service_1 = require("../services/mercadopago/mercadopagoPaymentLink.service");
const idempotencyService = new idempotency_service_1.IdempotencyService();
const paymentService = new payment_service_1.PaymentService(idempotencyService, new retry_service_1.RetryService());
const mercadopagoPaymentLinkService = new mercadopagoPaymentLink_service_1.MercadoPagoPaymentLinkService(idempotencyService);
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
        const result = await mercadopagoPaymentLinkService.createPaymentLink(req.body, idempotencyKey);
        res.status(201).json(result);
    }
    catch (e) {
        next(e);
    }
};
exports.createMercadoPagoPaymentLink = createMercadoPagoPaymentLink;
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