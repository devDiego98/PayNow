import type { RequestHandler } from "express";
export declare const createPayment: RequestHandler;
export declare const getPaymentById: RequestHandler;
export declare const listPayments: RequestHandler;
export declare const createMercadoPagoPaymentLink: RequestHandler;
/** Full DB rows (including JSON snapshots). Same filters/pagination as `GET /api/v1/payments`. */
export declare const listMercadoPagoPaymentRecords: RequestHandler;
//# sourceMappingURL=payment.controller.d.ts.map