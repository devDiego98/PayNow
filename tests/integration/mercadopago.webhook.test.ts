import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";

jest.mock("../../src/config/database", () => ({
  prisma: {
    mercadoPagoPaymentRecord: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  },
}));

const mockPaymentGet = jest.fn().mockResolvedValue({
  id: 123456789,
  status: "approved",
  status_detail: "accredited",
  external_reference: "ext-ref-1",
  transaction_amount: 1000.5,
  currency_id: "ARS",
  date_approved: "2024-01-01T12:00:00.000-00:00",
  payer: { email: "payer@test.com" },
  payment_method_id: "account_money",
  payment_type_id: "account_money",
});

jest.mock("mercadopago", () => ({
  MercadoPagoConfig: jest.fn().mockImplementation(() => ({})),
  Payment: jest.fn().mockImplementation(() => ({
    get: mockPaymentGet,
  })),
  MerchantOrder: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
  })),
}));

describe("POST /api/v1/webhooks/mercadopago", () => {
  const prevToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const prevSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    mockPaymentGet.mockClear();
    jest.mocked(prisma.mercadoPagoPaymentRecord.upsert).mockClear();
  });

  afterEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = prevToken;
    process.env.MERCADOPAGO_WEBHOOK_SECRET = prevSecret;
  });

  it("loads payment from API and upserts a DB record (payment topic)", async () => {
    const res = await request(createApp())
      .post("/api/v1/webhooks/mercadopago")
      .send({
        type: "payment",
        data: { id: "123456789" },
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed).toBe(true);
    expect(res.body.mpPaymentIds).toEqual(["123456789"]);
    expect(mockPaymentGet).toHaveBeenCalledWith({ id: "123456789" });
    expect(prisma.mercadoPagoPaymentRecord.upsert).toHaveBeenCalled();
  });

  it("returns 401 when MERCADOPAGO_WEBHOOK_SECRET is set but x-signature is missing", async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "some-secret-from-mp-dashboard";

    const res = await request(createApp())
      .post("/api/v1/webhooks/mercadopago")
      .set("x-request-id", "req-1")
      .send({
        type: "payment",
        data: { id: "123456789" },
      });

    expect(res.status).toBe(401);
  });
});
