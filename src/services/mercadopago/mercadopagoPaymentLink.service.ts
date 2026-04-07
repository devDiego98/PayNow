import { MercadoPagoConfig, Preference } from "mercadopago";
import { v4 as uuidv4 } from "uuid";
import { IdempotencyService } from "../core/idempotency.service";
import { AppError, ProviderError } from "../../utils/errors";
import { mercadoPagoApiErrorCode, mercadoPagoApiErrorMessage } from "../../utils/mercadopagoErrors";

export interface CreateMercadoPagoPaymentLinkDto {
  /** Amount in smallest currency unit (e.g. centavos for ARS), same convention as POST /payments. */
  amount: number;
  currency: string;
  title?: string;
  description?: string;
  /** Payee alias (e.g. CBU/CVU label) — stored in preference metadata; funds settle to the MP account for the access token. */
  alias?: string;
  cbu?: string;
  externalReference?: string;
  payerEmail?: string;
  /**
   * Optional per-request override for Mercado Pago's `notification_url`.
   * Useful when the caller needs to route webhooks back to a specific commerce/order.
   */
  notificationUrl?: string;
  /**
   * Optional per-request override for Mercado Pago's `back_urls` (Checkout Pro redirect URLs).
   * If omitted, server env (`MERCADOPAGO_BACK_URL_*`) is used.
   */
  backUrls?: { success?: string; pending?: string; failure?: string };
}

export interface MercadoPagoPaymentLinkResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string | null;
  collectorId?: number;
  amount: number;
  currency: string;
  recipient: { alias?: string; cbu?: string };
  externalReference?: string;
}

function normalizeAlias(s: string): string {
  return s.trim().toLowerCase();
}

function normalizeCbu(s: string): string {
  return s.replace(/\s+/g, "");
}

function validateRecipientAgainstEnv(dto: CreateMercadoPagoPaymentLinkDto): void {
  const expectedAlias = process.env.MERCADOPAGO_RECIPIENT_ALIAS?.trim();
  const expectedCbu = process.env.MERCADOPAGO_RECIPIENT_CBU?.trim();

  if (expectedAlias) {
    if (!dto.alias?.trim()) {
      throw new AppError(
        "alias is required when MERCADOPAGO_RECIPIENT_ALIAS is configured on the server",
        400
      );
    }
    if (normalizeAlias(dto.alias) !== normalizeAlias(expectedAlias)) {
      throw new AppError("alias does not match the configured Mercado Pago recipient", 400);
    }
  }

  if (expectedCbu) {
    if (!dto.cbu?.trim()) {
      throw new AppError(
        "cbu is required when MERCADOPAGO_RECIPIENT_CBU is configured on the server",
        400
      );
    }
    if (normalizeCbu(dto.cbu) !== normalizeCbu(expectedCbu)) {
      throw new AppError("cbu does not match the configured Mercado Pago recipient", 400);
    }
  }
}

export class MercadoPagoPaymentLinkService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async createPaymentLink(
    dto: CreateMercadoPagoPaymentLinkDto,
    idempotencyKey: string,
    accessTokenOverride?: string
  ): Promise<MercadoPagoPaymentLinkResponse> {
    const cached = await this.idempotencyService.get(idempotencyKey);
    if (cached) return cached as MercadoPagoPaymentLinkResponse;

    const accessToken = accessTokenOverride?.trim() || process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    if (!accessToken) {
      throw new AppError("MERCADOPAGO_ACCESS_TOKEN is not configured", 503);
    }

    validateRecipientAgainstEnv(dto);

    const currency = dto.currency.toUpperCase();
    const unitPrice = Math.round(dto.amount) / 100;
    if (unitPrice <= 0) {
      throw new AppError("amount must be positive", 400);
    }

    const externalReference = dto.externalReference ?? uuidv4();
    const title = dto.title ?? dto.description ?? "Payment";
    const itemId = `item_${externalReference.slice(0, 32)}`;

    const metadata: Record<string, string> = {
      paygate: "1",
      external_reference: externalReference,
    };
    if (dto.alias?.trim()) metadata.recipient_alias = dto.alias.trim();
    if (dto.cbu?.trim()) metadata.recipient_cbu = normalizeCbu(dto.cbu);

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const notificationUrl =
      dto.notificationUrl?.trim() || process.env.MERCADOPAGO_NOTIFICATION_URL?.trim();

    const envBackSuccess = process.env.MERCADOPAGO_BACK_URL_SUCCESS?.trim();
    const envBackPending = process.env.MERCADOPAGO_BACK_URL_PENDING?.trim();
    const envBackFailure = process.env.MERCADOPAGO_BACK_URL_FAILURE?.trim();

    /** MP requires `back_urls.success` whenever `auto_return` is set; omit undefined keys so JSON is not missing `success`. */
    const back_urls: { success?: string; pending?: string; failure?: string } = {};
    const requestedBackUrls = dto.backUrls;
    if (requestedBackUrls?.success?.trim()) back_urls.success = requestedBackUrls.success.trim();
    else if (envBackSuccess) back_urls.success = envBackSuccess;
    if (requestedBackUrls?.pending?.trim()) back_urls.pending = requestedBackUrls.pending.trim();
    else if (envBackPending) back_urls.pending = envBackPending;
    if (requestedBackUrls?.failure?.trim()) back_urls.failure = requestedBackUrls.failure.trim();
    else if (envBackFailure) back_urls.failure = envBackFailure;
    const hasBackUrls = Object.keys(back_urls).length > 0;
    /**
     * We intentionally avoid `auto_return` to prevent Mercado Pago rejecting preferences when
     * `back_urls.success` is missing/empty/malformed in some environments. Redirects still work
     * via `back_urls` alone.
     */
    const auto_return = undefined;

    try {
      const body = await preference.create({
        body: {
          items: [
            {
              id: itemId,
              title,
              description: dto.description,
              quantity: 1,
              currency_id: currency,
              unit_price: unitPrice,
            },
          ],
          external_reference: externalReference,
          metadata,
          notification_url: notificationUrl || undefined,
          ...(hasBackUrls ? { back_urls } : {}),
          ...(auto_return ? { auto_return } : {}),
          payer: dto.payerEmail ? { email: dto.payerEmail } : undefined,
        },
      });

      const preferenceId = body.id;
      const initPoint = body.init_point;
      if (!preferenceId || !initPoint) {
        throw new ProviderError(
          "Mercado Pago preference response missing id or init_point",
          "mercadopago",
          "invalid_response"
        );
      }

      const response: MercadoPagoPaymentLinkResponse = {
        preferenceId,
        initPoint,
        sandboxInitPoint: body.sandbox_init_point ?? null,
        collectorId: body.collector_id,
        amount: dto.amount,
        currency,
        recipient: {
          ...(dto.alias?.trim() ? { alias: dto.alias.trim() } : {}),
          ...(dto.cbu?.trim() ? { cbu: normalizeCbu(dto.cbu) } : {}),
        },
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
