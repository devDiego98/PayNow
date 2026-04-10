import { MercadoPagoConfig, MerchantOrder, Payment, PreApproval } from "mercadopago";
import type { PreApprovalResponse } from "mercadopago/dist/clients/preApproval/commonTypes";
import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import type { Request } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError, ProviderError } from "../../utils/errors";
import { mercadoPagoApiErrorCode, mercadoPagoApiErrorMessage } from "../../utils/mercadopagoErrors";
import { verifyMercadoPagoWebhookSignature } from "../../utils/mercadopagoSignature";

function getAccessToken(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!t) throw new AppError("MERCADOPAGO_ACCESS_TOKEN is not configured", 503);
  return t;
}

function parseWebhookBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  return body as Record<string, unknown>;
}

function logIncomingWebhook(req: Request): void {
  const body = parseWebhookBody(req.body);
  const type = body ? String(body.type ?? "") : "";
  const action = body && "action" in body ? String(body.action) : "";
  let dataId: string | undefined;
  if (body?.data && typeof body.data === "object" && body.data !== null && "id" in body.data) {
    dataId = String((body.data as { id: unknown }).id);
  }
  // eslint-disable-next-line no-console -- operator visibility when MP POSTs notifications
  console.log("[webhook:mercadopago] received", {
    query: req.query,
    type: type || undefined,
    action: action || undefined,
    dataId,
  });
}

function logStoredPayment(mpPaymentId: string, payment: PaymentResponse): void {
  // eslint-disable-next-line no-console -- operator visibility
  console.log("[webhook:mercadopago] stored", {
    mpPaymentId,
    status: payment.status,
    statusDetail: payment.status_detail,
    externalReference: payment.external_reference,
    amount: payment.transaction_amount,
    currency: payment.currency_id,
  });
}

/**
 * When Mercado Pago is configured to hit PayNow but orders live on Poneteweb, forward the same
 * notification after we load the payment (so we can attach commerce_id / order_id query params).
 */
function buildPonetewebForwardUrl(base: string): URL {
  return new URL("/api/mercadopago", base.endsWith("/") ? base : `${base}/`);
}

async function forwardPonetewebWebhookIfConfigured(
  req: Request,
  payment: PaymentResponse
): Promise<void> {
  const base = process.env.PONETEWEB_MP_WEBHOOK_FORWARD_URL?.trim();
  if (!base) return;

  const target = buildPonetewebForwardUrl(base);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) params.append(k, String(item));
    } else {
      params.set(k, String(v));
    }
  }
  const meta = payment.metadata;
  if (meta && typeof meta === "object" && meta !== null && "commerce_id" in meta) {
    params.set("commerce_id", String((meta as { commerce_id?: unknown }).commerce_id));
  }
  if (payment.external_reference != null && String(payment.external_reference).length > 0) {
    params.set("order_id", String(payment.external_reference));
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.PONETEWEB_MP_WEBHOOK_FORWARD_SECRET?.trim();
  if (secret) headers["X-Poneteweb-Webhook-Forward-Secret"] = secret;

  const res = await fetch(`${target.toString()}?${params.toString()}`, {
    method: "POST",
    headers,
    body: JSON.stringify(req.body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text();
    // eslint-disable-next-line no-console -- operator visibility
    console.warn("[webhook:mercadopago] forward to poneteweb failed", res.status, text);
  }
}

/**
 * Same as payment forward, but after loading a PreApproval — used for subscription_preapproval notifications.
 */
async function forwardPonetewebPreapprovalWebhookIfConfigured(
  req: Request,
  preapproval: PreApprovalResponse
): Promise<void> {
  const base = process.env.PONETEWEB_MP_WEBHOOK_FORWARD_URL?.trim();
  if (!base) return;

  const target = buildPonetewebForwardUrl(base);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) params.append(k, String(item));
    } else {
      params.set(k, String(v));
    }
  }
  const meta = (preapproval as PreApprovalResponse & { metadata?: Record<string, unknown> }).metadata;
  if (meta && typeof meta === "object" && meta !== null && "commerce_id" in meta) {
    params.set("commerce_id", String(meta.commerce_id));
  }
  if (preapproval.id != null && String(preapproval.id).length > 0) {
    params.set("preapproval_id", String(preapproval.id));
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.PONETEWEB_MP_WEBHOOK_FORWARD_SECRET?.trim();
  if (secret) headers["X-Poneteweb-Webhook-Forward-Secret"] = secret;

  const res = await fetch(`${target.toString()}?${params.toString()}`, {
    method: "POST",
    headers,
    body: JSON.stringify(req.body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text();
    // eslint-disable-next-line no-console -- operator visibility
    console.warn("[webhook:mercadopago] forward preapproval to poneteweb failed", res.status, text);
  }
}

/** Mercado Pago JSON webhook (payments, merchant orders, subscriptions) or legacy query IPN. */
function extractMercadoPagoWebhookResourceIds(req: Request): {
  paymentIds: string[];
  merchantOrderId?: string;
  preapprovalIds: string[];
} {
  const qTopic = req.query.topic;
  const qId = req.query.id;
  const qDataId = req.query["data.id"];

  if (
    (qTopic === "subscription_preapproval" || qTopic === "preapproval") &&
    qId != null &&
    String(qId).length > 0
  ) {
    return { paymentIds: [], preapprovalIds: [String(qId)] };
  }
  if (qTopic === "subscription_authorized_payment" && qId != null && String(qId).length > 0) {
    return { paymentIds: [String(qId)], preapprovalIds: [] };
  }

  if (req.query.type === "payment" && qDataId != null && String(qDataId).length > 0) {
    return { paymentIds: [String(qDataId)], preapprovalIds: [] };
  }
  if (qTopic === "payment" && qId != null && String(qId).length > 0) {
    return { paymentIds: [String(qId)], preapprovalIds: [] };
  }

  const body = parseWebhookBody(req.body);
  if (!body) return { paymentIds: [], preapprovalIds: [] };

  const type = String(body.type ?? "");
  const data = body.data as Record<string, unknown> | undefined;
  const dataId = data?.id;

  if (type === "subscription_authorized_payment" && dataId != null) {
    return { paymentIds: [String(dataId)], preapprovalIds: [] };
  }

  if (
    (type === "subscription_preapproval" || type === "preapproval") &&
    dataId != null
  ) {
    return { paymentIds: [], preapprovalIds: [String(dataId)] };
  }

  if (type === "payment" && dataId != null) {
    return { paymentIds: [String(dataId)], preapprovalIds: [] };
  }

  if ((type === "topic_merchant_order_wh" || type === "merchant_order") && dataId != null) {
    return { paymentIds: [], merchantOrderId: String(dataId), preapprovalIds: [] };
  }

  if (qTopic === "merchant_order" && qId != null) {
    return { paymentIds: [], merchantOrderId: String(qId), preapprovalIds: [] };
  }

  return { paymentIds: [], preapprovalIds: [] };
}

async function fetchPayment(client: MercadoPagoConfig, id: string): Promise<PaymentResponse> {
  const payment = new Payment(client);
  try {
    return await payment.get({ id });
  } catch (e) {
    throw new ProviderError(
      mercadoPagoApiErrorMessage(e),
      "mercadopago",
      mercadoPagoApiErrorCode(e)
    );
  }
}

async function fetchMerchantOrder(client: MercadoPagoConfig, merchantOrderId: string) {
  const mo = new MerchantOrder(client);
  try {
    return await mo.get({ merchantOrderId });
  } catch (e) {
    throw new ProviderError(
      mercadoPagoApiErrorMessage(e),
      "mercadopago",
      mercadoPagoApiErrorCode(e)
    );
  }
}

async function fetchPreapproval(client: MercadoPagoConfig, id: string): Promise<PreApprovalResponse> {
  const pa = new PreApproval(client);
  try {
    return (await pa.get({ id })) as PreApprovalResponse;
  } catch (e) {
    throw new ProviderError(
      mercadoPagoApiErrorMessage(e),
      "mercadopago",
      mercadoPagoApiErrorCode(e)
    );
  }
}

function snapshotJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function upsertPaymentRecord(
  payment: PaymentResponse,
  notificationJson: Prisma.InputJsonValue | typeof Prisma.JsonNull,
  preferenceId?: string | null,
  merchantOrderId?: string | null
): Promise<void> {
  const mpId = payment.id != null ? String(payment.id) : null;
  if (!mpId) return;

  const amount =
    payment.transaction_amount != null ? new Prisma.Decimal(payment.transaction_amount) : null;

  await prisma.mercadoPagoPaymentRecord.upsert({
    where: { mpPaymentId: mpId },
    create: {
      mpPaymentId: mpId,
      externalReference: payment.external_reference ?? null,
      preferenceId: preferenceId ?? null,
      merchantOrderId: merchantOrderId ?? null,
      status: payment.status ?? "unknown",
      statusDetail: payment.status_detail ?? null,
      transactionAmount: amount,
      currencyId: payment.currency_id ?? null,
      payerEmail: payment.payer?.email ?? null,
      paymentMethodId: payment.payment_method_id ?? null,
      paymentTypeId: payment.payment_type_id ?? null,
      dateApproved: payment.date_approved ? new Date(payment.date_approved) : null,
      notificationJson: notificationJson === Prisma.JsonNull ? Prisma.JsonNull : notificationJson,
      paymentSnapshot: snapshotJson(payment),
    },
    update: {
      externalReference: payment.external_reference ?? null,
      preferenceId: preferenceId ?? undefined,
      merchantOrderId: merchantOrderId ?? undefined,
      status: payment.status ?? "unknown",
      statusDetail: payment.status_detail ?? null,
      transactionAmount: amount,
      currencyId: payment.currency_id ?? null,
      payerEmail: payment.payer?.email ?? null,
      paymentMethodId: payment.payment_method_id ?? null,
      paymentTypeId: payment.payment_type_id ?? null,
      dateApproved: payment.date_approved ? new Date(payment.date_approved) : null,
      notificationJson: notificationJson === Prisma.JsonNull ? undefined : notificationJson,
      paymentSnapshot: snapshotJson(payment),
    },
  });
}

export class MercadoPagoWebhookService {
  /**
   * Validates signature (when secret is set), loads payment(s) and/or preapproval(s) from the Mercado Pago API,
   * persists payment rows, and forwards to Poneteweb when configured (same as payment flow).
   */
  async handleNotification(req: Request): Promise<{
    processed: boolean;
    mpPaymentIds: string[];
    mpPreapprovalIds?: string[];
  }> {
    logIncomingWebhook(req);

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
    if (secret) {
      const xSig = req.headers["x-signature"];
      if (typeof xSig !== "string") {
        throw new AppError(
          "Missing x-signature header (configure MERCADOPAGO_WEBHOOK_SECRET in Mercado Pago)",
          401
        );
      }
      if (!verifyMercadoPagoWebhookSignature(req, secret)) {
        throw new AppError("Invalid Mercado Pago webhook signature", 401);
      }
    }

    const accessToken = getAccessToken();
    const client = new MercadoPagoConfig({ accessToken });

    const body = parseWebhookBody(req.body);
    const notificationJson: Prisma.InputJsonValue | typeof Prisma.JsonNull = body
      ? (snapshotJson(body) as Prisma.InputJsonValue)
      : Prisma.JsonNull;

    const { paymentIds: directIds, merchantOrderId, preapprovalIds: directPreapprovalIds } =
      extractMercadoPagoWebhookResourceIds(req);

    let paymentIds = [...directIds];
    let orderPreferenceId: string | null = null;

    if (merchantOrderId) {
      const order = await fetchMerchantOrder(client, merchantOrderId);
      orderPreferenceId = order.preference_id ?? null;
      const fromOrder = (order.payments ?? [])
        .map((p) => p.id)
        .filter((id): id is number => id != null)
        .map((id) => String(id));
      paymentIds = [...new Set([...paymentIds, ...fromOrder])];
    }

    const mpPaymentIds: string[] = [];
    const mpPreapprovalIds: string[] = [];

    for (const pid of paymentIds) {
      const payment = await fetchPayment(client, pid);
      await upsertPaymentRecord(
        payment,
        notificationJson,
        orderPreferenceId,
        merchantOrderId ?? null
      );
      logStoredPayment(pid, payment);
      mpPaymentIds.push(pid);
      await forwardPonetewebWebhookIfConfigured(req, payment);
    }

    for (const preId of directPreapprovalIds) {
      const preapproval = await fetchPreapproval(client, preId);
      mpPreapprovalIds.push(preId);
      await forwardPonetewebPreapprovalWebhookIfConfigured(req, preapproval);
      // eslint-disable-next-line no-console -- operator visibility
      console.log("[webhook:mercadopago] preapproval loaded", {
        preapprovalId: preId,
        status: preapproval.status,
      });
    }

    const processed = mpPaymentIds.length > 0 || mpPreapprovalIds.length > 0;

    if (!processed) {
      // eslint-disable-next-line no-console -- operator visibility
      console.log("[webhook:mercadopago] no payment or preapproval id in notification — skipped fetch");
      return { processed: false, mpPaymentIds: [] };
    }

    // eslint-disable-next-line no-console -- operator visibility
    console.log("[webhook:mercadopago] done", { mpPaymentIds, mpPreapprovalIds });

    return {
      processed: true,
      mpPaymentIds,
      ...(mpPreapprovalIds.length > 0 ? { mpPreapprovalIds } : {}),
    };
  }
}
