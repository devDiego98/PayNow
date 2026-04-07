/**
 * Whether POST /api/v1/cards may accept raw card fields (number, CVC, expiry).
 * Production is always off. In non-production, set ALLOW_RAW_CARD_IN_API=false to disable.
 * Stripe must also allow [raw card data APIs](https://support.stripe.com/questions/enabling-access-to-raw-card-data-apis) on your account.
 */
export declare function isRawCardEntryAllowed(): boolean;
//# sourceMappingURL=raw-card.d.ts.map