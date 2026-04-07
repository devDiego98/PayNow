import type { MercadoPagoPaymentRecord, Prisma } from "@prisma/client";
export type ListMercadoPagoRecordsQuery = {
    limit: number;
    offset: number;
    status?: string;
    externalReference?: string;
    mpPaymentId?: string;
};
export declare function parseListMercadoPagoRecordsQuery(query: Record<string, unknown>): ListMercadoPagoRecordsQuery;
export declare function buildMercadoPagoRecordWhere(q: ListMercadoPagoRecordsQuery): Prisma.MercadoPagoPaymentRecordWhereInput;
export declare function queryMercadoPagoPaymentRecords(q: ListMercadoPagoRecordsQuery): Promise<{
    rows: {
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentMethodId: string | null;
        externalReference: string | null;
        payerEmail: string | null;
        mpPaymentId: string;
        preferenceId: string | null;
        merchantOrderId: string | null;
        statusDetail: string | null;
        transactionAmount: Prisma.Decimal | null;
        currencyId: string | null;
        paymentTypeId: string | null;
        dateApproved: Date | null;
        notificationJson: Prisma.JsonValue | null;
        paymentSnapshot: Prisma.JsonValue | null;
    }[];
    total: number;
}>;
/** Normalized row for `GET /api/v1/payments` (no large JSON blobs). */
export declare function mapMercadoPagoRecordToListItem(r: MercadoPagoPaymentRecord): {
    id: string;
    provider: "mercadopago";
    mpPaymentId: string;
    externalReference: string | null;
    preferenceId: string | null;
    merchantOrderId: string | null;
    status: string;
    statusDetail: string | null;
    amount: string | null;
    currency: string | null;
    payerEmail: string | null;
    paymentMethodId: string | null;
    paymentTypeId: string | null;
    dateApproved: string | null;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=mercadopagoPaymentRecords.query.d.ts.map