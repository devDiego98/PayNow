import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";

jest.mock("../../src/config/database", () => ({
  prisma: {
    mercadoPagoPaymentRecord: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

process.env.API_KEY_SECRET = "test-api-key";

describe("GET /api/v1/payments", () => {
  beforeEach(() => {
    jest.mocked(prisma.mercadoPagoPaymentRecord.findMany).mockResolvedValue([
      {
        id: "clx1",
        mpPaymentId: "123456789",
        externalReference: "ext-1",
        preferenceId: null,
        merchantOrderId: null,
        status: "approved",
        statusDetail: "accredited",
        transactionAmount: { toString: () => "100.50" } as never,
        currencyId: "ARS",
        payerEmail: "p@test.com",
        paymentMethodId: "account_money",
        paymentTypeId: "account_money",
        dateApproved: new Date("2024-06-01T12:00:00.000Z"),
        notificationJson: null,
        paymentSnapshot: null,
        createdAt: new Date("2024-06-01T12:00:00.000Z"),
        updatedAt: new Date("2024-06-01T12:00:00.000Z"),
      },
    ]);
    jest.mocked(prisma.mercadoPagoPaymentRecord.count).mockResolvedValue(1);
  });

  it("returns 200 with payments, total, limit, offset", async () => {
    const res = await request(createApp())
      .get("/api/v1/payments")
      .set("Authorization", "Bearer test-api-key");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.limit).toBe(100);
    expect(res.body.offset).toBe(0);
    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0].provider).toBe("mercadopago");
    expect(res.body.payments[0].status).toBe("approved");
    expect(res.body.payments[0].amount).toBe("100.50");
  });

  it("returns 401 without auth", async () => {
    const res = await request(createApp()).get("/api/v1/payments");
    expect(res.status).toBe(401);
  });
});
