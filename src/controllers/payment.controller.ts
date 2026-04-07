import type { RequestHandler } from "express";
import { PaymentService } from "../services/core/payment.service";
import { IdempotencyService } from "../services/core/idempotency.service";
import { RetryService } from "../services/core/retry.service";
import {
  mapMercadoPagoRecordToListItem,
  parseListMercadoPagoRecordsQuery,
  queryMercadoPagoPaymentRecords,
} from "../services/core/mercadopagoPaymentRecords.query";
import { MercadoPagoPaymentLinkService } from "../services/mercadopago/mercadopagoPaymentLink.service";

const idempotencyService = new IdempotencyService();
const paymentService = new PaymentService(idempotencyService, new RetryService());
const mercadopagoPaymentLinkService = new MercadoPagoPaymentLinkService(idempotencyService);

export const createPayment: RequestHandler = async (req, res, next) => {
  try {
    const raw = req.headers["idempotency-key"];
    const idempotencyKey = (Array.isArray(raw) ? raw[0] : raw) ?? "";
    const result = await paymentService.createPayment(req.body, idempotencyKey);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

export const getPaymentById: RequestHandler = (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
};

export const listPayments: RequestHandler = async (req, res, next) => {
  try {
    const q = parseListMercadoPagoRecordsQuery(req.query as Record<string, unknown>);
    const { rows, total } = await queryMercadoPagoPaymentRecords(q);
    res.json({
      payments: rows.map(mapMercadoPagoRecordToListItem),
      total,
      limit: q.limit,
      offset: q.offset,
    });
  } catch (e) {
    next(e);
  }
};

export const createMercadoPagoPaymentLink: RequestHandler = async (req, res, next) => {
  try {
    const raw = req.headers["idempotency-key"];
    const idempotencyKey = (Array.isArray(raw) ? raw[0] : raw) ?? "";
    const result = await mercadopagoPaymentLinkService.createPaymentLink(req.body, idempotencyKey);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

/** Full DB rows (including JSON snapshots). Same filters/pagination as `GET /api/v1/payments`. */
export const listMercadoPagoPaymentRecords: RequestHandler = async (req, res, next) => {
  try {
    const q = parseListMercadoPagoRecordsQuery(req.query as Record<string, unknown>);
    const { rows, total } = await queryMercadoPagoPaymentRecords(q);
    res.json({ records: rows, total, limit: q.limit, offset: q.offset });
  } catch (e) {
    next(e);
  }
};
