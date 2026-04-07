import request from "supertest";
import { createApp } from "../../src/app";
import { ProviderFactory } from "../../src/services/providers/provider.factory";

jest.mock("../../src/services/providers/provider.factory");

jest.mock("mercadopago", () => ({
  MercadoPagoConfig: jest.fn().mockImplementation(() => ({})),
  Preference: jest.fn().mockImplementation(() => ({
    create: jest.fn().mockResolvedValue({
      id: "pref-test-1",
      init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-test-1",
      sandbox_init_point: "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-test-1",
      collector_id: 999,
    }),
  })),
}));

process.env.API_KEY_SECRET = "test-api-key";

const mockCharge = jest.fn();
(ProviderFactory.get as jest.Mock).mockReturnValue({
  name: "stripe",
  charge: mockCharge,
});

describe("POST /api/v1/payments", () => {
  const validPayload = {
    provider: "stripe",
    amount: 2000,
    currency: "USD",
    description: "Test order",
    customer: { email: "user@test.com", name: "Test User" },
    paymentMethod: { type: "card" as const, token: "tok_visa" },
  };

  beforeEach(() => {
    mockCharge.mockResolvedValue({
      providerTransactionId: "pi_123",
      status: "succeeded",
      amount: 2000,
      currency: "USD",
    });
  });

  it("should return 201 with valid request", async () => {
    const res = await request(createApp())
      .post("/api/v1/payments")
      .set("Authorization", "Bearer test-api-key")
      .set("Idempotency-Key", "unique-key-1")
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("succeeded");
    expect(res.body.provider).toBe("stripe");
  });

  it("should return 401 without auth header", async () => {
    const res = await request(createApp())
      .post("/api/v1/payments")
      .set("Idempotency-Key", "unique-key-2")
      .send(validPayload);
    expect(res.status).toBe(401);
  });

  it("should return 400 without Idempotency-Key header", async () => {
    const res = await request(createApp())
      .post("/api/v1/payments")
      .set("Authorization", "Bearer test-api-key")
      .send(validPayload);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Idempotency-Key/);
  });

  it("should return 400 with invalid payload", async () => {
    const res = await request(createApp())
      .post("/api/v1/payments")
      .set("Authorization", "Bearer test-api-key")
      .set("Idempotency-Key", "unique-key-3")
      .send({ provider: "invalid_provider", amount: -100 });
    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });
});

describe("GET /health", () => {
  it("returns 200", async () => {
    const res = await request(createApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("POST /api/v1/payments/mercadopago/payment-link", () => {
  const prevToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const prevAlias = process.env.MERCADOPAGO_RECIPIENT_ALIAS;
  const prevCbu = process.env.MERCADOPAGO_RECIPIENT_CBU;

  afterEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = prevToken;
    process.env.MERCADOPAGO_RECIPIENT_ALIAS = prevAlias;
    process.env.MERCADOPAGO_RECIPIENT_CBU = prevCbu;
  });

  it("returns 201 with initPoint when token is set", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    delete process.env.MERCADOPAGO_RECIPIENT_ALIAS;
    delete process.env.MERCADOPAGO_RECIPIENT_CBU;

    const res = await request(createApp())
      .post("/api/v1/payments/mercadopago/payment-link")
      .set("Authorization", "Bearer test-api-key")
      .set("Idempotency-Key", "mp-link-1")
      .send({
        amount: 10000,
        currency: "ARS",
        title: "Test",
        alias: "alias.test",
      });

    expect(res.status).toBe(201);
    expect(res.body.preferenceId).toBe("pref-test-1");
    expect(res.body.initPoint).toContain("mercadopago");
    expect(res.body.recipient.alias).toBe("alias.test");
  });

  it("accepts X-MercadoPago-Access-Token override when env token is unset", async () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    delete process.env.MERCADOPAGO_RECIPIENT_ALIAS;
    delete process.env.MERCADOPAGO_RECIPIENT_CBU;

    const res = await request(createApp())
      .post("/api/v1/payments/mercadopago/payment-link")
      .set("Authorization", "Bearer test-api-key")
      .set("Idempotency-Key", "mp-link-override-1")
      .set("X-MercadoPago-Access-Token", "APP_USR-override-token")
      .send({
        amount: 2500,
        currency: "ARS",
        title: "Override Token Test",
        notificationUrl: "https://example.com/webhooks/mercadopago?commerce_id=1&order_id=2",
        backUrls: { success: "https://example.com/success" },
      });

    expect(res.status).toBe(201);
    expect(res.body.preferenceId).toBe("pref-test-1");
  });

  it("returns 503 when MERCADOPAGO_ACCESS_TOKEN is unset", async () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;

    const res = await request(createApp())
      .post("/api/v1/payments/mercadopago/payment-link")
      .set("Authorization", "Bearer test-api-key")
      .set("Idempotency-Key", "mp-link-2")
      .send({ amount: 1000, currency: "ARS" });

    expect(res.status).toBe(503);
  });
});
