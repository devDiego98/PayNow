"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseListMercadoPagoRecordsQuery = parseListMercadoPagoRecordsQuery;
exports.buildMercadoPagoRecordWhere = buildMercadoPagoRecordWhere;
exports.queryMercadoPagoPaymentRecords = queryMercadoPagoPaymentRecords;
exports.mapMercadoPagoRecordToListItem = mapMercadoPagoRecordToListItem;
const database_1 = require("../../config/database");
function parseListMercadoPagoRecordsQuery(query) {
    const limitRaw = query.limit;
    const offsetRaw = query.offset;
    const limit = Math.min(500, Math.max(1, parseInt(String(limitRaw ?? "100"), 10) || 100));
    const offset = Math.max(0, parseInt(String(offsetRaw ?? "0"), 10) || 0);
    const status = typeof query.status === "string" ? query.status : undefined;
    const externalReference = typeof query.externalReference === "string" ? query.externalReference : undefined;
    const mpPaymentId = typeof query.mpPaymentId === "string" ? query.mpPaymentId : undefined;
    return { limit, offset, status, externalReference, mpPaymentId };
}
function buildMercadoPagoRecordWhere(q) {
    const where = {};
    if (q.status)
        where.status = q.status;
    if (q.externalReference)
        where.externalReference = q.externalReference;
    if (q.mpPaymentId)
        where.mpPaymentId = q.mpPaymentId;
    return where;
}
async function queryMercadoPagoPaymentRecords(q) {
    const where = buildMercadoPagoRecordWhere(q);
    const [rows, total] = await Promise.all([
        database_1.prisma.mercadoPagoPaymentRecord.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            take: q.limit,
            skip: q.offset,
        }),
        database_1.prisma.mercadoPagoPaymentRecord.count({ where }),
    ]);
    return { rows, total };
}
/** Normalized row for `GET /api/v1/payments` (no large JSON blobs). */
function mapMercadoPagoRecordToListItem(r) {
    return {
        id: r.id,
        provider: "mercadopago",
        mpPaymentId: r.mpPaymentId,
        externalReference: r.externalReference,
        preferenceId: r.preferenceId,
        merchantOrderId: r.merchantOrderId,
        status: r.status,
        statusDetail: r.statusDetail,
        amount: r.transactionAmount != null ? r.transactionAmount.toString() : null,
        currency: r.currencyId,
        payerEmail: r.payerEmail,
        paymentMethodId: r.paymentMethodId,
        paymentTypeId: r.paymentTypeId,
        dateApproved: r.dateApproved?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
    };
}
//# sourceMappingURL=mercadopagoPaymentRecords.query.js.map