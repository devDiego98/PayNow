import { v4 as uuidv4 } from "uuid";
import { ProviderFactory } from "../providers/provider.factory";
import type { ProviderName } from "../../types/provider.types";
import type { ChargeRequest } from "../../types/provider.types";
import { AppError } from "../../utils/errors";
import { CardService } from "./card.service";
import { IdempotencyService } from "./idempotency.service";
import { RetryService } from "./retry.service";

export interface CreatePaymentDto {
  provider: ProviderName;
  amount: number;
  currency: string;
  description: string;
  customer: { email: string; name: string };
  /** Use a new token / pm id / tok_ (not needed if savedCardId is set). */
  paymentMethod?: { type: "card" | "bank_transfer" | "wallet"; token: string };
  /** Our DB id from POST /cards — charges that saved Stripe card (Stripe only). */
  savedCardId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResponse {
  id: string;
  provider: ProviderName;
  status: string;
  amount: number;
  currency: string;
  providerTransactionId: string;
  description: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export class PaymentService {
  private readonly cardService = new CardService();

  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly retryService: RetryService
  ) {}

  async createPayment(dto: CreatePaymentDto, idempotencyKey: string): Promise<PaymentResponse> {
    const cached = await this.idempotencyService.get(idempotencyKey);
    if (cached) return cached as PaymentResponse;

    const hasPm = Boolean(dto.paymentMethod);
    const hasSaved = Boolean(dto.savedCardId);
    if (hasPm === hasSaved) {
      throw new AppError("Provide exactly one of paymentMethod or savedCardId", 400);
    }

    let paymentMethod = dto.paymentMethod;
    let stripeCustomerId: string | undefined;

    if (dto.savedCardId) {
      if (dto.provider !== "stripe") {
        throw new AppError("savedCardId is only supported when provider is stripe", 400);
      }
      const resolved = await this.cardService.resolveSavedCardForCharge(
        dto.customer.email,
        dto.savedCardId
      );
      paymentMethod = { type: "card", token: resolved.stripePaymentMethodId };
      stripeCustomerId = resolved.stripeCustomerId;
    }

    if (!paymentMethod) {
      throw new AppError("paymentMethod or savedCardId is required", 400);
    }

    const provider = ProviderFactory.get(dto.provider);
    const chargeRequest: ChargeRequest = {
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description,
      customer: dto.customer,
      paymentMethod,
      stripeCustomerId,
      metadata: dto.metadata,
    };

    const result = await this.retryService.execute(() => provider.charge(chargeRequest));

    const response: PaymentResponse = {
      id: `pay_${uuidv4().replace(/-/g, "").slice(0, 20)}`,
      provider: dto.provider,
      status: result.status,
      amount: result.amount,
      currency: result.currency,
      providerTransactionId: result.providerTransactionId,
      description: dto.description,
      createdAt: new Date().toISOString(),
      metadata: dto.metadata,
    };

    await this.idempotencyService.set(idempotencyKey, response);
    return response;
  }

  async getPayment(
    providerTransactionId: string,
    providerName: ProviderName
  ): Promise<PaymentResponse> {
    const provider = ProviderFactory.get(providerName);
    const result = await provider.getTransaction(providerTransactionId);
    if (!result) throw new AppError("Payment not found", 404);
    return {
      id: providerTransactionId,
      provider: providerName,
      status: result.status,
      amount: result.amount,
      currency: result.currency,
      providerTransactionId: result.providerTransactionId,
      description: "",
      createdAt: new Date().toISOString(),
    };
  }
}
