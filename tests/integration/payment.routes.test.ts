import request from "supertest";
import { Preference, PreApproval } from "mercadopago";
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
      payment_methods: { installments: 12 },
    }),
  })),
  PreApproval: jest.fn().mockImplementation(() => ({
    create: jest.fn().mockResolvedValue({
      id: "preapproval-test-1",
      init_point: "https://www.mercadopago.com.ar/subscriptions/checkout/v2?preapproval_id=preapproval-test-1",
      sandbox_init_point: null,
    }),
    get: jest.fn().mockResolvedValue({
      id: "preapproval-test-1",
      status: "authorized",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 9999,
        currency_id: "ARS",
      },
    }),
    update: jest.fn().mockResolvedValue({
      id: "preapproval-test-1",
      status: "authorized",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 10000,
        currency_id: "ARS",
      },
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

  it("passes default_installments when maxInstallments and defaultInstallments are set", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    delete process.env.MERCADOPAGO_RECIPIENT_ALIAS;
    delete process.env.MERCADOPAGO_RECIPIENT_CBU;

    const res = await request(createApp())
      .post("/api/v1/payments/mercadopago/payment-link")
      .set("Authorization", "Bearer test-api-key")
      .set("Idempotency-Key", "mp-link-default-inst-1")
      .send({
        amount: 10000,
        currency: "ARS",
        title: "Test",
        alias: "alias.test",
        maxInstallments: 12,
        defaultInstallments: 3,
      });

    expect(res.status).toBe(201);
    const PreferenceMock = Preference as unknown as jest.Mock;
    const last = PreferenceMock.mock.results[PreferenceMock.mock.results.length - 1]?.value;
    expect(last?.create).toHaveBeenCalledWith({
      body: expect.objectContaining({
        payment_methods: { installments: 12, default_installments: 3 },
      }),
    });
  });

  it("passes payment_methods.installments when maxInstallments is set", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    delete process.env.MERCADOPAGO_RECIPIENT_ALIAS;
    delete process.env.MERCADOPAGO_RECIPIENT_CBU;

    const res = await request(createApp())
      .post("/api/v1/payments/mercadopago/payment-link")
      .set("Authorization", "Bearer test-api-key")
      .set("Idempotency-Key", "mp-link-installments-1")
      .send({
        amount: 10000,
        currency: "ARS",
        title: "Test",
        alias: "alias.test",
        maxInstallments: 12,
      });

    expect(res.status).toBe(201);
    const PreferenceMock = Preference as unknown as jest.Mock;
    const last = PreferenceMock.mock.results[PreferenceMock.mock.results.length - 1]?.value;
    expect(last?.create).toHaveBeenCalledWith({
      body: expect.objectContaining({
        payment_methods: { installments: 12 },
      }),
    });
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

describe("POST /api/v1/payments/mercadopago/subscription-link", () => {
  const prevToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  afterEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = prevToken;
  });

  it("returns 201 with preapprovalId and initPoint when token is set", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";

    const res = await request(createApp())
      .post("/api/v1/payments/mercadopago/subscription-link")
      .set("Authorization", "Bearer test-api-key")
      .set("Idempotency-Key", "mp-sub-1")
      .send({
        amount: 999900,
        currency: "ARS",
        reason: "Plan Pro",
        payerEmail: "payer@test.com",
        frequency: 1,
        frequencyType: "months",
        backUrl: "https://example.com/admin?subscription=success",
        commerceId: 42,
        planId: 7,
      });

    expect(res.status).toBe(201);
    expect(res.body.preapprovalId).toBe("preapproval-test-1");
    expect(res.body.initPoint).toContain("mercadopago");
    const PreApprovalMock = PreApproval as unknown as jest.Mock;
    const last = PreApprovalMock.mock.results[PreApprovalMock.mock.results.length - 1]?.value;
    expect(last?.create).toHaveBeenCalledWith({
      body: expect.objectContaining({
        reason: "Plan Pro",
        payer_email: "payer@test.com",
        metadata: expect.objectContaining({ commerce_id: "42", plan_id: "7" }),
      }),
    });
  });
});

describe("PATCH /api/v1/payments/mercadopago/preapprovals/:preapprovalId", () => {
  const prevToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  afterEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = prevToken;
  });

  it("returns 200 with updated amount when token is set", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";

    const res = await request(createApp())
      .patch("/api/v1/payments/mercadopago/preapprovals/preapproval-test-1")
      .set("Authorization", "Bearer test-api-key")
      .set("Idempotency-Key", "mp-preapproval-amt-1")
      .send({ amount: 1_000_000, currency: "ARS" });

    expect(res.status).toBe(200);
    expect(res.body.preapprovalId).toBe("preapproval-test-1");
    expect(res.body.amount).toBe(1_000_000);
    expect(res.body.currency).toBe("ARS");

    const PreApprovalMock = PreApproval as unknown as jest.Mock;
    const last = PreApprovalMock.mock.results[PreApprovalMock.mock.results.length - 1]?.value;
    expect(last?.get).toHaveBeenCalledWith({ id: "preapproval-test-1" });
    expect(last?.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "preapproval-test-1",
        body: expect.objectContaining({
          auto_recurring: expect.objectContaining({
            transaction_amount: 10000,
            currency_id: "ARS",
          }),
        }),
      })
    );
  });

  it("returns 503 when MERCADOPAGO_ACCESS_TOKEN is unset", async () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;

    const res = await request(createApp())
      .patch("/api/v1/payments/mercadopago/preapprovals/preapproval-test-1")
      .set("Authorization", "Bearer test-api-key")
      .set("Idempotency-Key", "mp-preapproval-amt-2")
      .send({ amount: 500000 });

    expect(res.status).toBe(503);
  });
});
