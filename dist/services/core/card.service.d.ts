export interface AddCardInput {
    email: string;
    name: string;
    /** Stripe PaymentMethod id (`pm_...`) from Stripe.js / Elements / Dashboard. */
    paymentMethodId: string;
}
export declare class CardService {
    private readonly stripe;
    constructor();
    addCard(input: AddCardInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        stripePaymentMethodId: string;
        customerId: string;
        brand: string | null;
        last4: string | null;
        expMonth: number | null;
        expYear: number | null;
        isDefault: boolean;
    }>;
    getCardsByEmail(email: string): Promise<{
        id: string;
        createdAt: Date;
        brand: string | null;
        last4: string | null;
        expMonth: number | null;
        expYear: number | null;
        isDefault: boolean;
    }[]>;
    resolveSavedCardForCharge(email: string, savedCardId: string): Promise<{
        stripePaymentMethodId: string;
        stripeCustomerId: string;
    }>;
}
//# sourceMappingURL=card.service.d.ts.map