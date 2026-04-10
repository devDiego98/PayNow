import { MercadoPagoConfig, PreApproval } from "mercadopago";
import type { PreApprovalResponse } from "mercadopago/dist/clients/preApproval/commonTypes";
import { IdempotencyService } from "../core/idempotency.service";
import { AppError, ProviderError } from "../../utils/errors";
import { mercadoPagoApiErrorCode, mercadoPagoApiErrorMessage } from "../../utils/mercadopagoErrors";

export interface CreateMercadoPagoSubscriptionLinkDto {
  /** Amount in smallest currency unit (e.g. centavos for ARS); converted to `transaction_amount` for MP PreApproval. */
  amount: number;
  currency: string;
  /** Shown to the payer and in MP dashboard. */
  reason: string;
  payerEmail: string;
  /** Billing frequency (e.g. 1 monthly, 12 yearly). */
  frequency: number;
  /** Mercado Pago accepts `months` for SaaS-style plans. */
  frequencyType: "months";
  /** Redirect after the payer finishes the subscription checkout. */
  backUrl: string;
  /**
   * Mercado Pago `notification_url`. When omitted, uses `MERCADOPAGO_NOTIFICATION_URL` on this server
   * (e.g. `https://paynow.../api/v1/webhooks/mercadopago`) so PayNow receives webhooks and can forward to Poneteweb.
   */
  notificationUrl?: string;
  /** Stored in `metadata` for downstream routing (same idea as payment-link `commerceId`). */
  commerceId?: number;
  planId?: number;
  externalReference?: string;
}

export interface MercadoPagoSubscriptionLinkResponse {
  preapprovalId: string;
  initPoint: string;
  sandboxInitPoint: string | null;
  amount: number;
  currency: string;
  reason: string;
  externalReference?: string;
}

type PreApprovalCreateBody = {
  back_url: string;
  reason: string;
  auto_recurring: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
  };
  payer_email: string;
  notification_url?: string;
  external_reference?: string;
  metadata?: Record<string, string>;
};

export class MercadoPagoSubscriptionLinkService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async createSubscriptionLink(
    dto: CreateMercadoPagoSubscriptionLinkDto,
    idempotencyKey: string,
    accessTokenOverride?: string
  ): Promise<MercadoPagoSubscriptionLinkResponse> {
    const cached = await this.idempotencyService.get(idempotencyKey);
    if (cached) return cached as MercadoPagoSubscriptionLinkResponse;

    const accessToken = accessTokenOverride?.trim() || process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    if (!accessToken) {
      throw new AppError("MERCADOPAGO_ACCESS_TOKEN is not configured", 503);
    }

    const currency = dto.currency.toUpperCase();
    const unitAmount = Math.round(dto.amount) / 100;
    if (unitAmount <= 0) {
      throw new AppError("amount must be positive", 400);
    }

    const frequency = Math.max(1, Math.trunc(dto.frequency));
    const externalReference =
      dto.externalReference?.trim() ||
      `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

    const metadata: Record<string, string> = {
      paygate: "1",
      external_reference: externalReference,
    };
    if (dto.commerceId != null && Number.isFinite(dto.commerceId)) {
      metadata.commerce_id = String(Math.trunc(dto.commerceId));
    }
    if (dto.planId != null && Number.isFinite(dto.planId)) {
      metadata.plan_id = String(Math.trunc(dto.planId));
    }

    const notificationUrl =
      dto.notificationUrl?.trim() || process.env.MERCADOPAGO_NOTIFICATION_URL?.trim();

    const client = new MercadoPagoConfig({ accessToken });
    const preapprovalApi = new PreApproval(client);

    const body: PreApprovalCreateBody = {
      back_url: dto.backUrl.trim(),
      reason: dto.reason.trim(),
      auto_recurring: {
        frequency,
        frequency_type: dto.frequencyType,
        transaction_amount: unitAmount,
        currency_id: currency,
      },
      payer_email: dto.payerEmail.trim(),
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      external_reference: externalReference,
      metadata,
    };

    try {
      const mpResponse = await preapprovalApi.create({
        body: body as import("mercadopago/dist/clients/preApproval/commonTypes").PreApprovalRequest,
      });
      const mp: PreApprovalResponse = mpResponse as PreApprovalResponse;

      const preapprovalId = mp.id != null ? String(mp.id) : null;
      let initPoint =
        mp.init_point ??
        (mp as { init_point_url?: string }).init_point_url ??
        (mp as { sandbox_init_point?: string }).sandbox_init_point ??
        null;

      if (preapprovalId && !initPoint) {
        initPoint = `https://www.mercadopago.com.ar/subscriptions/checkout/v2?preapproval_id=${preapprovalId}`;
      }
      if (initPoint && !initPoint.startsWith("http")) {
        initPoint = `https://www.mercadopago.com.ar${initPoint.startsWith("/") ? "" : "/"}${initPoint}`;
      }

      if (!preapprovalId || !initPoint) {
        throw new ProviderError(
          "Mercado Pago preapproval response missing id or init_point",
          "mercadopago",
          "invalid_response"
        );
      }

      const sandboxInitPoint = (mp as { sandbox_init_point?: string | null }).sandbox_init_point ?? null;

      const response: MercadoPagoSubscriptionLinkResponse = {
        preapprovalId,
        initPoint,
        sandboxInitPoint,
        amount: dto.amount,
        currency,
        reason: dto.reason.trim(),
        externalReference,
      };

      await this.idempotencyService.set(idempotencyKey, response);
      return response;
    } catch (e) {
      if (e instanceof AppError || e instanceof ProviderError) throw e;
      const msg = mercadoPagoApiErrorMessage(e);
      const code = mercadoPagoApiErrorCode(e);
      throw new ProviderError(msg, "mercadopago", code);
    }
  }
}
