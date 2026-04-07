import type { IPaymentProvider, ProviderName } from "../../types/provider.types";
export declare function registerProvider(name: ProviderName, factory: () => IPaymentProvider): void;
export declare function getProvider(name: ProviderName): IPaymentProvider;
/** @deprecated Prefer named imports; kept for tests that mock `ProviderFactory.get`. */
export declare class ProviderFactory {
    static get(name: ProviderName): IPaymentProvider;
}
//# sourceMappingURL=provider.factory.d.ts.map