import fs from "fs";
import path from "path";
import type { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { SwaggerUiOptions } from "swagger-ui-express";

function getSwaggerJSDocOptions(): swaggerJsdoc.Options {
  const projectRoot = path.join(__dirname, "..", "..");
  return {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PayGate Aggregator API",
      version: "1.0.0",
      description:
        "Unified Payment Gateway Aggregation API. Integrate Stripe, PayPal, and Mercado Pago through a single normalized interface.",
      contact: { name: "API Support", email: "support@paygate.io" },
    },
    servers: [
      { url: "http://localhost:3000", description: "Development" },
      { url: "https://api.paygate.io", description: "Production" },
      { url: "/", description: "Same origin (use with Try it out)" },
    ],
    tags: [
      { name: "Payments", description: "Create and list payments (Stripe, PayPal, Mercado Pago)" },
      { name: "Refunds", description: "Refunds (provider-specific; some routes not implemented yet)" },
      { name: "Webhooks", description: "Provider callbacks (Mercado Pago notifications)" },
      { name: "System", description: "Health and diagnostics" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "API key as Bearer token",
        },
      },
      schemas: {
        CreatePaymentRequest: {
          type: "object",
          required: ["provider", "amount", "currency", "description", "customer"],
          description:
            "Provide exactly one of paymentMethod (new token/pm/tok) or savedCardId (from GET /api/v1/cards).",
          properties: {
            provider: {
              type: "string",
              enum: ["stripe", "paypal", "mercadopago"],
            },
            amount: {
              type: "integer",
              description: "Amount in smallest currency unit (cents/centavos)",
              example: 1500,
            },
            currency: {
              type: "string",
              example: "ARS",
              description: "ISO 4217 currency code",
            },
            description: { type: "string", example: "Order #8821" },
            customer: {
              type: "object",
              required: ["email", "name"],
              properties: {
                email: { type: "string", format: "email" },
                name: { type: "string" },
              },
            },
            paymentMethod: {
              type: "object",
              required: ["type", "token"],
              properties: {
                type: {
                  type: "string",
                  enum: ["card", "bank_transfer", "wallet"],
                },
                token: {
                  type: "string",
                  description: "pm_..., tok_visa, etc.",
                },
              },
            },
            savedCardId: {
              type: "string",
              description:
                "Id from POST /api/v1/cards — pay with that saved card (Stripe only; customer.email must match).",
            },
            metadata: {
              type: "object",
              additionalProperties: { type: "string" },
            },
          },
        },
        PaymentResponse: {
          type: "object",
          properties: {
            id: { type: "string", example: "pay_01J3X8K9MABCDEF12345" },
            provider: {
              type: "string",
              enum: ["stripe", "paypal", "mercadopago"],
            },
            status: {
              type: "string",
              enum: [
                "pending",
                "processing",
                "succeeded",
                "failed",
                "cancelled",
              ],
            },
            amount: { type: "integer" },
            currency: { type: "string" },
            providerTransactionId: { type: "string" },
            description: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            metadata: { type: "object" },
          },
        },
        PaymentListItem: {
          type: "object",
          properties: {
            id: { type: "string" },
            provider: { type: "string", enum: ["mercadopago"] },
            mpPaymentId: { type: "string" },
            externalReference: { type: "string", nullable: true },
            preferenceId: { type: "string", nullable: true },
            merchantOrderId: { type: "string", nullable: true },
            status: { type: "string" },
            statusDetail: { type: "string", nullable: true },
            amount: {
              type: "string",
              nullable: true,
              description: "Transaction amount as decimal string (Mercado Pago)",
            },
            currency: { type: "string", nullable: true },
            payerEmail: { type: "string", nullable: true },
            paymentMethodId: { type: "string", nullable: true },
            paymentTypeId: { type: "string", nullable: true },
            dateApproved: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        PaymentListResponse: {
          type: "object",
          properties: {
            payments: {
              type: "array",
              items: { $ref: "#/components/schemas/PaymentListItem" },
            },
            total: { type: "integer" },
            limit: { type: "integer" },
            offset: { type: "integer" },
          },
        },
        CreateRefundRequest: {
          type: "object",
          required: ["provider", "providerTransactionId"],
          properties: {
            provider: {
              type: "string",
              enum: ["stripe", "paypal", "mercadopago"],
            },
            providerTransactionId: { type: "string" },
            amount: {
              type: "integer",
              description: "Partial refund amount. Omit for full refund.",
            },
            reason: { type: "string" },
          },
        },
        RefundResponse: {
          type: "object",
          properties: {
            id: { type: "string" },
            provider: { type: "string" },
            providerRefundId: { type: "string" },
            status: {
              type: "string",
              enum: ["pending", "succeeded", "failed"],
            },
            amount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        MercadoPagoPaymentLinkRequest: {
          type: "object",
          required: ["amount"],
          properties: {
            amount: {
              type: "integer",
              description:
                "Amount in smallest currency unit (e.g. centavos for ARS), same as POST /api/v1/payments",
              example: 100050,
            },
            currency: {
              type: "string",
              example: "ARS",
              description: "ISO 4217 (Mercado Pago site, e.g. ARS for Argentina)",
            },
            title: { type: "string", description: "Line item title shown in checkout" },
            description: { type: "string" },
            alias: {
              type: "string",
              description: "Optional payee alias for metadata (and validation if server env is set)",
            },
            cbu: {
              type: "string",
              description: "Optional CBU/CVU for metadata (digits; spaces stripped)",
            },
            externalReference: {
              type: "string",
              description: "Your reference id; generated if omitted",
            },
            payerEmail: { type: "string", format: "email" },
            maxInstallments: {
              type: "integer",
              minimum: 1,
              maximum: 36,
              description:
                "Maximum card installments for Checkout Pro (Mercado Pago `payment_methods.installments`). Omit to use MP defaults.",
            },
            defaultInstallments: {
              type: "integer",
              minimum: 1,
              maximum: 36,
              description:
                "Preselected installment count (`payment_methods.default_installments`). Must be ≤ maxInstallments.",
            },
          },
        },
        MercadoPagoPaymentLinkResponse: {
          type: "object",
          properties: {
            preferenceId: { type: "string" },
            initPoint: {
              type: "string",
              format: "uri",
              description: "Open in browser or app to complete payment",
            },
            sandboxInitPoint: { type: "string", nullable: true, format: "uri" },
            collectorId: { type: "integer" },
            amount: { type: "integer" },
            currency: { type: "string" },
            recipient: {
              type: "object",
              properties: {
                alias: { type: "string" },
                cbu: { type: "string" },
              },
            },
            externalReference: { type: "string" },
          },
        },
        MercadoPagoSubscriptionLinkRequest: {
          type: "object",
          required: ["amount", "reason", "payerEmail", "frequency", "frequencyType", "backUrl"],
          properties: {
            amount: {
              type: "integer",
              description:
                "Amount in smallest currency unit (e.g. ARS centavos), converted to Mercado Pago `transaction_amount`",
              example: 999900,
            },
            currency: { type: "string", example: "ARS" },
            reason: { type: "string", description: "Plan or product name shown to the payer" },
            payerEmail: { type: "string", format: "email" },
            frequency: {
              type: "integer",
              minimum: 1,
              description: "Billing every N months (e.g. 1 monthly, 12 yearly)",
            },
            frequencyType: { type: "string", enum: ["months"] },
            backUrl: { type: "string", format: "uri", description: "Redirect after subscription checkout" },
            commerceId: { type: "integer", description: "Stored in metadata for webhook routing" },
            planId: { type: "integer", description: "Stored in metadata for webhook routing" },
            notificationUrl: {
              type: "string",
              format: "uri",
              description: "Mercado Pago `notification_url` (defaults to MERCADOPAGO_NOTIFICATION_URL on PayNow)",
            },
            externalReference: { type: "string" },
          },
        },
        MercadoPagoSubscriptionLinkResponse: {
          type: "object",
          properties: {
            preapprovalId: { type: "string" },
            initPoint: { type: "string", format: "uri" },
            sandboxInitPoint: { type: "string", nullable: true, format: "uri" },
            amount: { type: "integer" },
            currency: { type: "string" },
            reason: { type: "string" },
            externalReference: { type: "string" },
          },
        },
      },
      responses: {
        ValidationError: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string" },
                  details: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        Unauthorized: {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { error: { type: "string" } },
              },
            },
          },
        },
        NotFound: {
          description: "Not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { error: { type: "string" } },
              },
            },
          },
        },
        ProviderError: {
          description: "Payment provider error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string" },
                  code: { type: "string" },
                  provider: { type: "string", example: "stripe" },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [
    path.join(projectRoot, "src", "controllers", "**", "*.ts"),
    path.join(projectRoot, "src", "routes", "**", "*.ts"),
  ],
  };
}

/**
 * Prefer `dist/openapi.json` when present (generated by `npm run build`) so production images
 * that omit source files still expose full OpenAPI paths. Otherwise swagger-jsdoc scans `src` routes.
 */
function loadSwaggerSpec(): Record<string, unknown> {
  const snapshotPath = path.join(__dirname, "..", "openapi.json");
  if (fs.existsSync(snapshotPath)) {
    try {
      const raw = fs.readFileSync(snapshotPath, "utf8");
      const parsed = JSON.parse(raw) as { paths?: Record<string, unknown> };
      if (parsed?.paths && Object.keys(parsed.paths).length > 0) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* fall through to JSDoc */
    }
  }
  return swaggerJsdoc(getSwaggerJSDocOptions()) as Record<string, unknown>;
}

export const swaggerSpec = loadSwaggerSpec();

export { getSwaggerJSDocOptions };

/**
 * Runs in the browser after Swagger UI loads (swagger-ui-express embeds this via JSON.stringify + function placeholders).
 * Swagger uses React-controlled inputs; direct .value assignment is cleared on re-render. We use the native value
 * setter plus input/change events so Redux state updates.
 */
function swaggerUiOnComplete(): void {
  /* eslint-disable @typescript-eslint/no-explicit-any -- DOM / browser-only; TS lib is ES2022 without DOM */
  const w = globalThis as any;

  const sessionKey =
    typeof globalThis.crypto !== "undefined" && globalThis.crypto.randomUUID
      ? globalThis.crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

  function setReactFriendlyValue(el: any, value: string): void {
    const proto =
      el.tagName === "TEXTAREA"
        ? w.HTMLTextAreaElement.prototype
        : w.HTMLInputElement.prototype;
    try {
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc?.set) {
        desc.set.call(el, value);
      } else {
        el.value = value;
      }
    } catch {
      el.value = value;
    }
    el.dispatchEvent(new w.Event("input", { bubbles: true }));
    el.dispatchEvent(new w.Event("change", { bubbles: true }));
  }

  function isIdempotencyField(inp: any): boolean {
    const ph = inp.getAttribute("placeholder") ?? "";
    const nm = inp.getAttribute("name") ?? "";
    if (/idempotency/i.test(ph) || /idempotency/i.test(nm)) return true;
    const row = inp.closest("tr") ?? inp.closest("[class*='parameter']") ?? inp.closest(".opblock");
    if (row && /idempotency/i.test(row.textContent ?? "")) return true;
    return false;
  }

  function fill(): void {
    const root = w.document.getElementById("swagger-ui");
    if (!root) return;
    const inputs = root.querySelectorAll("input, textarea");
    for (let i = 0; i < inputs.length; i++) {
      const el = inputs[i];
      const tag = el.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA") continue;
      const inp = el;
      if (tag === "INPUT") {
        const t = inp.type;
        if (t !== "text" && t !== "search" && t !== "") continue;
      }
      if (!isIdempotencyField(inp)) continue;
      if (inp.dataset.paygateIdempotency === sessionKey) continue;
      setReactFriendlyValue(inp, sessionKey);
      inp.dataset.paygateIdempotency = sessionKey;
    }
  }

  const root = w.document.getElementById("swagger-ui");
  if (root) {
    new w.MutationObserver(() => fill()).observe(root, { childList: true, subtree: true });
  }
  fill();
  setTimeout(fill, 100);
  setTimeout(fill, 400);
  setTimeout(fill, 1200);
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** Swagger UI runs this in the browser when "Execute" is clicked (see swagger-ui-express stringify). */
function swaggerRequestInterceptor(request: {
  headers: Headers | Record<string, string | undefined>;
  url: string;
}): typeof request {
  let existing: string | undefined;
  if (typeof Headers !== "undefined" && request.headers instanceof Headers) {
    existing =
      request.headers.get("Idempotency-Key") ??
      request.headers.get("idempotency-key") ??
      undefined;
  } else {
    const h = request.headers as Record<string, string | undefined>;
    existing = h["Idempotency-Key"] ?? h["idempotency-key"];
  }
  if (existing?.trim()) return request;

  const id =
    typeof globalThis.crypto !== "undefined" && globalThis.crypto.randomUUID
      ? globalThis.crypto.randomUUID()
      : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

  if (typeof Headers !== "undefined" && request.headers instanceof Headers) {
    request.headers.set("Idempotency-Key", id);
  } else {
    (request.headers as Record<string, string>)["Idempotency-Key"] = id;
  }
  return request;
}

const swaggerUiOpts: SwaggerUiOptions = {
  swaggerOptions: {
    requestInterceptor: swaggerRequestInterceptor,
    onComplete: swaggerUiOnComplete,
  },
};

export function setupSwagger(app: Express): void {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOpts));
}
