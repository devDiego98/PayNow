import { MercadoPagoConfig, PreApproval } from "mercadopago";
import type {
  AutoRecurringResponse,
  PreApprovalResponse,
} from "mercadopago/dist/clients/preApproval/commonTypes";
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

/** Body for updating recurring amount (same centavos convention as subscription-link). */
export interface UpdateMercadoPagoPreapprovalAmountDto {
  amount: number;
  /** ISO currency; defaults to existing preapproval `currency_id` or ARS. */
  currency?: string;
}

export interface MercadoPagoPreapprovalAmountUpdateResponse {
  preapprovalId: string;
  /** Echo: amount in smallest currency unit (e.g. centavos). */
  amount: number;
  currency: string;
  status?: string;
  autoRecurring?: {
    transaction_amount?: number;
    currency_id?: string;
    frequency?: number;
    frequency_type?: string;
  };
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

  /**
   * Updates `auto_recurring.transaction_amount` for an existing PreApproval (authorized subscription).
   * Loads the current preapproval from Mercado Pago, merges `auto_recurring`, then calls the update API.
   */
  async updatePreapprovalAmount(
    preapprovalId: string,
    dto: UpdateMercadoPagoPreapprovalAmountDto,
    idempotencyKey: string,
    accessTokenOverride?: string
  ): Promise<MercadoPagoPreapprovalAmountUpdateResponse> {
    const id = preapprovalId?.trim();
    if (!id) {
      throw new AppError("preapprovalId is required", 400);
    }

    const cached = await this.idempotencyService.get(idempotencyKey);
    if (cached) return cached as MercadoPagoPreapprovalAmountUpdateResponse;

    const accessToken = accessTokenOverride?.trim() || process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    if (!accessToken) {
      throw new AppError("MERCADOPAGO_ACCESS_TOKEN is not configured", 503);
    }

    const unitAmount = Math.round(dto.amount) / 100;
    if (unitAmount <= 0) {
      throw new AppError("amount must be positive", 400);
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preapprovalApi = new PreApproval(client);

    try {
      const getRes = await preapprovalApi.get({ id });
      const current = (getRes as { body?: PreApprovalResponse }).body ?? (getRes as PreApprovalResponse);
      const ar: Partial<AutoRecurringResponse> = current.auto_recurring ?? {};

      const currency = (dto.currency ?? ar.currency_id ?? "ARS").toUpperCase();

      const updateBody = {
        auto_recurring: {
          frequency: ar.frequency != null ? Number(ar.frequency) : 1,
          frequency_type: ar.frequency_type ?? "months",
          transaction_amount: unitAmount,
          currency_id: currency,
        },
      };

      const updateRes = await preapprovalApi.update({
        id,
        // SDK update types are narrower than GET merge; MP accepts full auto_recurring.
        body: updateBody as Parameters<InstanceType<typeof PreApproval>["update"]>[0]["body"],
      });
      const updated = (updateRes as { body?: PreApprovalResponse }).body ?? (updateRes as PreApprovalResponse);

      const response: MercadoPagoPreapprovalAmountUpdateResponse = {
        preapprovalId: String(updated.id ?? id),
        amount: dto.amount,
        currency,
        status: updated.status,
        autoRecurring: updated.auto_recurring
          ? {
              transaction_amount: updated.auto_recurring.transaction_amount,
              currency_id: updated.auto_recurring.currency_id,
              frequency: updated.auto_recurring.frequency,
              frequency_type: updated.auto_recurring.frequency_type,
            }
          : {
              transaction_amount: unitAmount,
              currency_id: currency,
              frequency: updateBody.auto_recurring.frequency,
              frequency_type: updateBody.auto_recurring.frequency_type,
            },
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
